import { S3DatasetRegister } from './datalake/constructs/s3-dataset-register';
import { DataSetStack, DataSetStackProps} from './datalake/dataset-stack';
import { Bucket, IBucket} from "@aws-cdk/aws-s3";
import { Construct, Stack } from "@aws-cdk/core";

export interface ContextDatasetProps extends DataSetStackProps {
    readonly dataLakeBucketName: string;
    readonly dataSetName: string;
    readonly landingDatabaseName: string;
    readonly stagingDatabaseName: string;
    readonly goldDatabaseName: string;
}

export class KaggleCycleShareDataset extends DataSetStack {

    constructor(scope: Construct, id: string, props: ContextDatasetProps) {
        super(scope, id, props);

    const dataLakeBucketName: string = props?.dataLakeBucketName;
    const dataSetName : string = props?.dataSetName;
    const landingDatabaseName : string = props?.landingDatabaseName;
    const stagingDatabaseName : string = props?.stagingDatabaseName;
    const goldDatabaseName : string = props?.goldDatabaseName;
    const dataLakeBucket : IBucket = Bucket.fromBucketName(this,'dataLakeBucket', dataLakeBucketName);

    this.Enrollments.push(new S3DatasetRegister(this, `${dataLakeBucketName}Enrollment`, {
            dataSetName: dataSetName,
            databaseLandingName: landingDatabaseName,
            databaseStagingName: stagingDatabaseName,
            databaseGoldName: goldDatabaseName,
            sourceBucket: dataLakeBucket,
            maxDPUs: 2,
            sourceBucketDataPrefixes: [
                `/${landingDatabaseName}/station/`,
                `/${landingDatabaseName}/trip/`,
                `/${landingDatabaseName}/weather/`,
            ],
            dataLakeBucket: props.dataLake.dataLakeBucket,
            glueStagingScriptPath: "lib/datalake/datasets/glue-scripts/landing_to_staging.py",
            glueStagingScriptArguments: {
                "--job-language": "python",
                "--job-bookmark-option": "job-bookmark-disable",
                "--enable-metrics": "",
                "--DL_BUCKET": props.dataLake.dataLakeBucket.bucketName,
                "--DL_REGION": Stack.of(this).region,
                "--DL_PREFIX": `/${stagingDatabaseName}/`,
                "--GLUE_SRC_DATABASE": landingDatabaseName
            },
            glueGoldScriptPath: "lib/datalake/datasets/glue-scripts/staging_to_gold.py",
            glueGoldScriptArguments: {
                "--job-language": "python",
                "--job-bookmark-option": "job-bookmark-disable",
                "--enable-metrics": "",
                "--DL_BUCKET": props.dataLake.dataLakeBucket.bucketName,
                "--DL_REGION": Stack.of(this).region,
                "--DL_PREFIX": `/${goldDatabaseName}/`,
                "--GLUE_SRC_DATABASE": stagingDatabaseName,
                "--ANONYMIZATION_CONF": "{\"datasets\": [{\"table\":\"trip\", \"anonymization\":\"mondrian-k-anonymization\",\"feature_columns\":[\"usertype\",\"gender\",\"birthyear\"],\"categorical\":[\"usertype\",\"gender\"] ,\"k_value\":\"2\", \"sensitive_column\": \"trip_id\"}] }",
                "--additional-python-modules": "spark_privacy_preserver==0.3.1",
                "--python-modules-installer-option": "--upgrade"
            }
        }));
    }
}