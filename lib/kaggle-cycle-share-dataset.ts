import { S3DatasetRegistration } from './datalake/builders/s3-dataset-registration';
import { DatasetManager, DatasetManagerProps} from './datalake/dataset-manager';
import { Bucket, IBucket} from "@aws-cdk/aws-s3";
import { Construct, Stack } from "@aws-cdk/core";

export interface ContextDatasetProps extends DatasetManagerProps {
    readonly dataLakeBucketName: string;
    readonly dataSetName: string;
    readonly landingDatabaseName: string;
    readonly stagingDatabaseName: string;
    readonly goldDatabaseName: string;
}

export class KaggleCycleShareDataset extends DatasetManager {

    constructor(scope: Construct, id: string, props: ContextDatasetProps) {
        super(scope, id, props);

    const dataLakeBucketName: string = props?.dataLakeBucketName;
    const dataSetName : string = props?.dataSetName;
    const landingDatabaseName : string = props?.landingDatabaseName;
    const stagingDatabaseName : string = props?.stagingDatabaseName;
    const goldDatabaseName : string = props?.goldDatabaseName;
    const dataLakeBucket : IBucket = Bucket.fromBucketName(this,'dataLakeBucket', dataLakeBucketName);

    this.Enrollments.push(new S3DatasetRegistration(this, `${dataLakeBucketName}Enrollment`, {
            dataSetName: dataSetName,
            databaseLandingName: landingDatabaseName,
            databaseStagingName: stagingDatabaseName,
            databaseGoldName: goldDatabaseName,
            sourceBucket: dataLakeBucket,
            maxDPUs: 2,
            sourceBucketDataPrefixes: [
                `/${landingDatabaseName}/station/`,
                `/${landingDatabaseName}/trip/`,
                `/${landingDatabaseName}/weather/`
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
                "--ANONYMIZATION_CONF": "{\"datasets\": [{\"table\":\"trip\", \"anonymization\":\"mondrian-k-anonymization\", \"feature_columns\":[\"usertype\",\"gender\",\"birthyear\"],\"categorical\":[\"usertype\",\"gender\"] ,\"k_value\":\"2\", \"sensitive_column\": \"trip_id\"}] }",
                "--additional-python-modules": "spark_privacy_preserver==0.3.1 pyarrow==0.14.1 diffprivlib==0.2.1 mypy==0.770 tabulate==0.8.7 numpy==1.15.4 pandas==1.1.5 faker==8.8.1",
                //"--python-modules-installer-option": "--upgrade"
            }
        }));
    }
}