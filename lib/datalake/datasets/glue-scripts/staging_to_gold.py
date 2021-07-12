import os
import sys
import json

from pyspark.sql.types import *
from pyspark.sql import DataFrame
from spark_privacy_preserver.mondrian_preserver import Preserver

from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from faker import Factory
from pyspark.sql.functions import udf, col, lit
from awsglue.dynamicframe import DynamicFrame

import boto3

def fake_data(kind):
    if kind == 'lat':
        return str(fake.latitude())
    elif kind == 'long':
        return str(fake.longitude())
    elif kind == 'street':
        return str(fake.street_address())
    else:
        return 'None'


locale = 'es_ES'
fake = Factory.create(locale)
faker_udf = udf(fake_data, StringType())


def faker_anonymization(input_df, conf):
    output_df = input_df
    for column in conf:
        print(column, '->', conf[column])
        kind = conf[column]
        output_df = output_df.withColumn(column + '_ano', faker_udf(lit(kind)))
    return output_df


def hash_pseudo_anonymization(inputDF: DataFrame, columns: list) -> DataFrame:
    from pyspark.sql import functions
    outputDataFrame: DataFrame = inputDF
    for column in columns:
        outputDataFrame = outputDataFrame.withColumn(column + '_ano',
                                                     functions.md5(functions.col(column).cast('String')))
    return outputDataFrame


# # Needed to generate the schema that uses anonimization all features need be string format the sensible column in the origin format
def get_anonymized_schema(original_table_schema, sensitive_column, output_columns):
    struct_fields_list = []
    for column_definition in original_table_schema:
        if column_definition.name == sensitive_column:
            struct_fields_list.append(
                StructField(column_definition.name, column_definition.dataType, column_definition.nullable))
        else:
            if column_definition.name in output_columns:
                struct_fields_list.append(
                    StructField(column_definition.name, StringType(), column_definition.nullable))
    return StructType(struct_fields_list)


def mondrian_k_anonymization(k, input_dataframe, categorical_list, feature_columns, sensitive_column):
    # create a list with columns needed
    output_columns = feature_columns.copy()
    output_columns.append(sensitive_column)

    df = input_dataframe.fillna(0).select(*output_columns).toDF(*output_columns)
    schema = get_anonymized_schema(df.schema, sensitive_column, output_columns)
    categorical = set(categorical_list)
    df_ano = Preserver.k_anonymize_w_user(
        df,
        k,
        feature_columns,
        sensitive_column,
        categorical,
        schema).toDF(*(column_name + "_ano" for column_name in output_columns))
    return df.join(df_ano, df[sensitive_column] == df_ano[sensitive_column + '_ano'], "left")


def anonymize(input_df, table_ano_conf):
    anonymization_method = table_ano_conf['anonymization']
    output_df: DataFrame
    if anonymization_method == 'mondrian-k-anonymization':
        k = int(table_ano_conf['k_value'])
        categorical_list = table_ano_conf['categorical']
        print('categorical_list -> ', categorical_list)
        feature_columns = table_ano_conf['feature_columns']
        print('feature_columns -> ', feature_columns)
        sensitive_column = table_ano_conf['sensitive_column']
        print('sensitive_column -> ', sensitive_column)
        output_df = mondrian_k_anonymization(k, input_dataframe, categorical_list, feature_columns,
                                             sensitive_column)
    elif anonymization_method == 'pseudo-hash':
        hash_columns = table_ano_conf['hash_columns']
        print('hash_columns -> ', hash_columns)
        output_df = hash_pseudo_anonymization(input_dataframe, hash_columns)
    elif anonymization_method == 'faker-anonymization':
        columns = table_ano_conf['columns']
        print('columns -> ', columns)
        output_df = faker_anonymization(input_dataframe, columns)
    else:
        output_df = input_df
    return output_df

#TODO: agrupar en main

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'DL_BUCKET', 'DL_PREFIX', 'DL_REGION', 'GLUE_SRC_DATABASE',
                                     'ANONYMIZATION_CONF'])
sc = SparkContext()

os.environ["ARROW_PRE_0_15_IPC_FORMAT"] = "1"

# avoiding spark creates $folders$ in S3
hadoop_conf = sc._jsc.hadoopConfiguration()
hadoop_conf.set("fs.s3.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
hadoop_conf.set("mapreduce.fileoutputcommitter.marksuccessfuljobs", "false")
glueContext = GlueContext(sc)
spark = glueContext.spark_session

# Needed to reliably work between parquet, spark, and pandas dataframes.
spark.conf.set("spark.executorEnv.ARROW_PRE_0_15_IPC_FORMAT", "1")
spark.conf.set("spark.yarn.appMasterEnv.ARROW_PRE_0_15_IPC_FORMAT", "1")

job = Job(glueContext)
job.init(args['JOB_NAME'], args)

input_conf_str_json = args["ANONYMIZATION_CONF"]

print('input_conf_str_json:', input_conf_str_json)
anonymization_conf_dict = json.loads(input_conf_str_json)
print('anonimization_conf_dict:', anonymization_conf_dict)
position_references_in_conf = {}
for i in range(len(anonymization_conf_dict['datasets'])):
    position_references_in_conf[anonymization_conf_dict['datasets'][i]['table']] = i
print('position_references_in_conf:', position_references_in_conf)

dataLakeBucket = args["DL_BUCKET"]
dataLakePrefix = args["DL_PREFIX"]
aws_region = args["DL_REGION"]

glue_database = args["GLUE_SRC_DATABASE"]
print('glue_database:', glue_database)
target_format = "parquet"

client = boto3.client(service_name='glue', region_name=aws_region)

tables = []
keepPullingTables = True
nextToken = ''

print(dataLakeBucket)

while keepPullingTables:
    responseGetTables = client.get_tables(DatabaseName=glue_database, NextToken=nextToken)
    tableList = responseGetTables['TableList']
    print('tableList:', tableList)
    for tableDict in tableList:
        tables.append(tableDict['Name'])
    print('tables:', tables)
    if 'NextToken' in responseGetTables:
        nextToken = responseGetTables['NextToken']
    else:
        nextToken = ''

    keepPullingTables = True if nextToken != '' else False

for table in tables:
    print('table:', table)
    datasource = glueContext.create_dynamic_frame.from_catalog(database=glue_database, table_name=table,
                                                               transformation_ctx="datasource")
    dropnullfields = DropNullFields.apply(frame=datasource, transformation_ctx="dropnullfields")
    if table in position_references_in_conf:
        print('Anonimization for table ', table)
        input_dataframe: DataFrame = datasource.toDF()
        table_ano_conf = anonymization_conf_dict['datasets'][position_references_in_conf[table]]
        df_anonimized = anonymize(input_dataframe, table_ano_conf)
        # df_anonimized.show()
        dynamic_frame_anonimized = DynamicFrame.fromDF(df_anonimized, glueContext, table + "_ano")
    else:
        dynamic_frame_anonimized = datasource

    try:
        datasink = glueContext.write_dynamic_frame.from_options(frame=dynamic_frame_anonimized, connection_type="s3a",
                                                                connection_options={
                                                                    "path": "s3://" + dataLakeBucket + dataLakePrefix + table},
                                                                format=target_format, transformation_ctx="datasink")
    except Exception as e:
        print("Unable to write" + table)
        print(str(e))

job.commit()