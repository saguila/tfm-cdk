import { S3DatasetRegister } from '../constructs/s3-dataset-register';
import { DataSetStack, DataSetStackProps} from '../dataset-stack';
import {Bucket, IBucket} from "@aws-cdk/aws-s3";
import {CfnParameter, Construct, Stack} from "@aws-cdk/core";

export interface ContextDatasetProps extends DataSetStackProps {
    readonly datasetName: string;
}

export class KaggleCycleShareDataset extends DataSetStack {

    constructor(scope: Construct, id: string, props: ContextDatasetProps) {
        super(scope, id, props);

    const s3BucketOuput = new CfnParameter(this, "s3BucketOuput", {
        type: "String",
        default:"",
        description: "S3 Bucket ingest destination."});

    const s3IngestDir = new CfnParameter(this, "s3IngestDir", {
        type: "String",
        default:"",
        description: "Path inside S3 Bucket for ingestion."});

    const glueDatabaseDestination = new CfnParameter(this, "glueDatabaseDestination", {
        type: "String",
        default:"",
        description: "Glue Database Name Destination"});

        const datasetName = props?.datasetName;

        this.Enrollments.push(new S3DatasetRegister(this, `${datasetName}Enrollment`, {
            DataSetName: datasetName,
            databaseDestination: glueDatabaseDestination.valueAsString,
            sourceBucket: Bucket.fromBucketName(this,'datalakeBucket', s3BucketOuput.valueAsString),
            MaxDPUs: 2,
            sourceBucketDataPrefixes: [
                `/${datasetName}/station/`,
                `/${datasetName}/trip/`,
                `/${datasetName}/weather/`,
            ],
            dataLakeBucket: props.datalake.datalakeBucket,
            GlueScriptPath: "lib/datalake/datasets/glue-scripts/raw_to_stagging.py",
            GlueScriptArguments: {
                "--job-language": "python",
                "--job-bookmark-option": "job-bookmark-disable",
                "--enable-metrics": "",
                "--DL_BUCKET": props.datalake.datalakeBucket.bucketName,
                "--DL_REGION": Stack.of(this).region,
                "--DL_PREFIX": `/${glueDatabaseDestination.valueAsString}/`,
                "--GLUE_SRC_DATABASE": datasetName
            }
        }));
    }
}