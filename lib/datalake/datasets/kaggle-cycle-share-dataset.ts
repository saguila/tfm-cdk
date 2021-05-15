import { S3DatasetRegister } from '../constructs/s3-dataset-register';
import { DataSetStack, DataSetStackProps} from '../dataset-stack';
import {Bucket, IBucket} from "@aws-cdk/aws-s3";
import {CfnParameter, Construct, Stack} from "@aws-cdk/core";

export interface ContextDatasetProps extends DataSetStackProps {
    //readonly sourceBucket: IBucket;
    //readonly sourceBucketDataPrefix: string;
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

    const s3StaggingDir = new CfnParameter(this, "s3StaggingDir", {
        type: "String",
        default:"",
        description: "Path inside S3 Bucket for stagging files."});

        const datasetName = props?.datasetName;

        this.Enrollments.push(new S3DatasetRegister(this, `${datasetName}Enrollment`, {
            DataSetName: datasetName,
            sourceBucket: Bucket.fromBucketName(this,'datalakeBucket', s3BucketOuput.valueAsString),
            MaxDPUs: 2,
            sourceBucketDataPrefixes: [
                `${s3IngestDir.valueAsString}station/`,
                `${s3IngestDir.valueAsString}trip/`,
                `${s3IngestDir.valueAsString}weather/`
            ],
            dataLakeBucket: props.datalake.datalakeBucket,
            GlueScriptPath: "lib/datalake/datasets/glue-scripts/raw_to_stagging.py",
            GlueScriptArguments: {
                "--job-language": "python",
                "--job-bookmark-option": "job-bookmark-disable",
                "--enable-metrics": "",
                "--DL_BUCKET": props.datalake.datalakeBucket.bucketName,
                "--DL_REGION": Stack.of(this).region,
                "--DL_PREFIX": s3StaggingDir.valueAsString, //`/${datasetName}/`,
                "--GLUE_SRC_DATABASE": `${datasetName}_src`
            }
        }));
    }
}