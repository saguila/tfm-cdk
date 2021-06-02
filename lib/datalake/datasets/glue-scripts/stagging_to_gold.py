import sys
import json

from pyspark.sql.types import *
from spark_privacy_preserver.mondrian_preserver import Preserver

from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame

import boto3


# Needed to generate the schema that uses anonimization all features need be string format the sensible column in the origin format
def getAnonimizedSchema(original_table_schema, sensitive_column, output_columns):
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


def mondrian_k_anonimization(k, input_dataframe, categorical_list, feature_columns, sensitive_column):
    # create a list with columns needed
    output_columns = feature_columns.copy()
    output_columns.append(sensitive_column)

    df = input_dataframe.fillna(0).select(*output_columns).toDF(*output_columns)
    schema = getAnonimizedSchema(df.schema, sensitive_column, output_columns)
    categorical = set(categorical_list)
    df_ano = Preserver.k_anonymize_w_user(
        df,
        k,
        feature_columns,
        sensitive_column,
        categorical,
        schema).toDF(*(column_name + "_ano" for column_name in output_columns))
    return df.join(df_ano, df[sensitive_column] == df_ano[sensitive_column + '_ano'], "left")


## @params: [JOB_NAME]
args = getResolvedOptions(sys.argv, ['JOB_NAME', 'DL_BUCKET', 'DL_PREFIX', 'DL_REGION', 'GLUE_SRC_DATABASE'])

sc = SparkContext()
# avoiding spark creates $folders$ in S3
hadoop_conf = sc._jsc.hadoopConfiguration()
hadoop_conf.set("fs.s3.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
hadoop_conf.set("mapreduce.fileoutputcommitter.marksuccessfuljobs", "false")
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

input_conf_str_json = '"' + args["ANONIMIZATION_CONF"] + '"'
print('input_conf_str_json:', input_conf_str_json)
anonimization_conf_dict = json.loads(input_conf_str_json)
print('anonimization_conf_dict:', anonimization_conf_dict)

position_references_in_conf = {}
for i in range(len(anonimization_conf_dict['datasets'])):
    position_references_in_conf[anonimization_conf_dict['datasets'][i]['table']] = i
print('position_references_in_conf:', position_references_in_conf)

dataLakeBucket = args["DL_BUCKET"];
dataLakePrefix = args["DL_PREFIX"];
aws_region = args["DL_REGION"];
glue_database = args["GLUE_SRC_DATABASE"];

target_format = "parquet"

client = boto3.client(service_name='glue', region_name=aws_region)

tables = []
keepPullingTables = True
nextToken = ''

while keepPullingTables:
    responseGetTables = client.get_tables(DatabaseName=glue_database, NextToken=nextToken)
    tableList = responseGetTables['TableList']
    for tableDict in tableList:
        tables.append(tableDict['Name'])

    if 'NextToken' in responseGetTables:
        nextToken = responseGetTables['NextToken']
    else:
        nextToken = ''

    keepPullingTables = True if nextToken != '' else False

for table in tables:
    datasource = glueContext.create_dynamic_frame.from_catalog(database=glue_database, table_name=table,
                                                               transformation_ctx="datasource")

    if table in position_references_in_conf:
        print('Anonimization for table ', table)
        input_dataframe = datasource.toDF()
        table_ano_conf = anonimization_conf_dict['datasets'][position_references_in_conf[table]]
        k = int(table_ano_conf['k_value'])
        categorical_list = table_ano_conf['categorical']
        feature_columns = table_ano_conf['feature_columns']
        sensitive_column = table_ano_conf['sensitive_column']
        df_anonimized = mondrian_k_anonimization(k, input_dataframe, categorical_list, feature_columns,
                                                 sensitive_column)
        dynamic_frame_anonimized = DynamicFrame.fromDF(df_anonimized, glueContext, table + "_ano")
    else:
        dynamic_frame_anonimized = datasource
    try:
        datasink = glueContext.write_dynamic_frame.from_options(frame=dynamic_frame_anonimized, connection_type="s3a",
                                                                connection_options={
                                                                    "path": "s3://" + dataLakeBucket + dataLakePrefix + table},
                                                                format=target_format, transformation_ctx="datasink")
    except:
        print("Unable to write" + table)

job.commit()
