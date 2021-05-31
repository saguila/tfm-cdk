import { S3DatasetRegister } from '../constructs/s3-dataset-register';
import { DataSetStack, DataSetStackProps} from '../dataset-stack';
import {Bucket, IBucket} from "@aws-cdk/aws-s3";
import {CfnParameter, Construct, Stack} from "@aws-cdk/core";

export interface ContextDatasetProps extends DataSetStackProps {
    readonly landingDatabaseName: string;
    readonly staggingDatabaseName: string;
    readonly goldDatabaseName: string;
}

export class KaggleCycleShareDataset extends DataSetStack {

    constructor(scope: Construct, id: string, props: ContextDatasetProps) {
        super(scope, id, props);

    const s3BucketOuput = new CfnParameter(this, "s3BucketOuput", {
        type: "String",
        default:"",
        description: "S3 Bucket ingest destination."});

        const staggingDatabaseName = props?.staggingDatabaseName;

        const landingDatabaseName = props?.landingDatabaseName;

        const goldDatabaseName = props?.goldDatabaseName;

        this.Enrollments.push(new S3DatasetRegister(this, `${landingDatabaseName}Enrollment`, {
            DataSetName: landingDatabaseName,
            databaseDestination: staggingDatabaseName,
            DatabaseGold: goldDatabaseName,
            sourceBucket: Bucket.fromBucketName(this,'datalakeBucket', s3BucketOuput.valueAsString),
            MaxDPUs: 2,
            sourceBucketDataPrefixes: [
                `/${landingDatabaseName}/station/`,
                `/${landingDatabaseName}/trip/`,
                `/${landingDatabaseName}/weather/`,
            ],
            dataLakeBucket: props.datalake.datalakeBucket,
            GlueScriptPath: "lib/datalake/datasets/glue-scripts/raw_to_stagging.py",
            GlueScriptArguments: {
                "--job-language": "python",
                "--job-bookmark-option": "job-bookmark-disable",
                "--enable-metrics": "",
                "--DL_BUCKET": props.datalake.datalakeBucket.bucketName,
                "--DL_REGION": Stack.of(this).region,
                "--DL_PREFIX": `/${staggingDatabaseName}/`,
                "--GLUE_SRC_DATABASE": landingDatabaseName
            },
            GlueScriptPathGold: "lib/datalake/datasets/glue-scripts/stagging_to_gold.py",
            GlueScriptArgumentsGold: {
                "--job-language": "python",
                "--job-bookmark-option": "job-bookmark-disable",
                "--enable-metrics": "",
                "--DL_BUCKET": props.datalake.datalakeBucket.bucketName,
                "--DL_REGION": Stack.of(this).region,
                "--DL_PREFIX": `/${staggingDatabaseName}/`,
                "--GLUE_SRC_DATABASE": landingDatabaseName,
                "--additional-python-modules": "spark-nlp==2.6.2"
            },
        }));
    }
}