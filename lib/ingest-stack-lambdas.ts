import * as cdk from "@aws-cdk/core";

import { LayerVersion, AssetCode, Runtime, Function } from "@aws-cdk/aws-lambda"
import { CfnParameter } from "@aws-cdk/core";
import * as path from "path";


export interface ContextIngestionProps extends cdk.StackProps {
    readonly kaggleUser?: string;
    readonly kaggleKey?: string;
    readonly kaggleCompetition?: string;
}

export class IngestStackLambdas extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: /*cdk.StackProps*/ ContextIngestionProps) {

        super(scope, id, props);

        // -c environment=prod
        // https://docs.aws.amazon.com/cdk/latest/guide/parameters.html
        // cdk deploy MyStack YourStack --parameters MyStack:uploadBucketName=UploadBucket --parameters YourStack:uploadBucketName=UpBucket

        const kaggleUser = new CfnParameter(this, "kaggleUser", {
            type: "String",
            default:"",
            description: "The username of Kaggle."});

        const kaggleKey = new CfnParameter(this, "kaggleKey", {
            type: "String",
            default:"",
            description: "The API key of Kaggle."});

        const kaggleDataset = new CfnParameter(this, "kaggleDataset", {
            type: "String",
            default:"",
            description: "Kaggle competition name."});


        const kagglePythonLayer = new LayerVersion(this, 'kaggle-layer', {
            code: new AssetCode(path.join('lib', 'ingestion', 'lambda-layers', 'kaggle','kaggle-layer.zip')),
            compatibleRuntimes: [Runtime.PYTHON_3_8]
        });

        const lambdaIngest = new Function(this, 'seed', {
            code: new AssetCode(path.join('lib', 'ingestion', 'lambdas', 'kaggle-ingest')),
            handler: 'kaggle_ingest.handler_request',
            runtime: Runtime.PYTHON_3_8,
            layers: [kagglePythonLayer],
            environment: {
                KAGGLE_USERNAME: kaggleUser.valueAsString, //props?.kaggleUser || "" ,
                KAGGLE_KEY: kaggleKey.valueAsString, //props?.kaggleKey || "" ,
                KAGGLE_DATASET: kaggleDataset.valueAsString // props?.kaggleDataset || ""
            },
            timeout: cdk.Duration.seconds(200)
        });
    }
}