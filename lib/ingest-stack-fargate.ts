import { CfnParameter, Construct, RemovalPolicy, Stack, StackProps } from "@aws-cdk/core";
import { Effect, ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from "@aws-cdk/aws-iam"
import { AwsLogDriver, Cluster, ContainerImage, FargateTaskDefinition } from "@aws-cdk/aws-ecs"
import * as path from "path";
import { LogGroup, RetentionDays } from "@aws-cdk/aws-logs";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { SubnetType, Vpc } from "@aws-cdk/aws-ec2";

//  yarn cdk deploy -c kaggleUser=sebastial -c datasetName=cycle_share_dataset -c kaggleKey=fa9b62c6513da5754f1c238dc465fb94 --parameters kaggleDataset=pronto/cycle-share-dataset --parameters s3BucketOuput=tfm-ingest-datalake --parameters s3IngestDir=stagging
export interface ContextIngestionProps extends StackProps {
    readonly kaggleUser?: string;
    readonly kaggleKey?: string;
}

/**
 * This class creates
 */
export class IngestStackFargate extends Stack {
    constructor(scope: Construct, id: string, props?: ContextIngestionProps) {

        super(scope, id, props);

        const kaggleDataset = new CfnParameter(this, "kaggleDataset", {
            type: "String",
            default:"",
            description: "Kaggle competition dataset."});

        const s3BucketOuput = new CfnParameter(this, "s3BucketOuput", {
            type: "String",
            default:"",
            description: "S3 Bucket ingest destination."});

        const s3IngestDir = new CfnParameter(this, "s3IngestDir", {
            type: "String",
            default:"",
            description: "Path inside S3 Bucket for ingestion."});

        /* Establish SSM Parameter Store secret variables */
        const kaggleUsernameSSM = new StringParameter(this,"kaggleUser",{
            description: "Kaggle username needed for auth in API",
            stringValue: props?.kaggleUser || ""
        });

        const kaggleKeySSM = new StringParameter(this,"kaggleKeySecret",{
            description: "Kaggle Secret Key for auth in AP",
            stringValue: props?.kaggleKey || ""
        });

        const ingestVPC = new Vpc(this, "ingestVPC", {
            cidr: "10.0.0.0/16",
            natGateways: 0,
            subnetConfiguration: [{
                cidrMask: 24,
                name: 'mySubnet1',
                subnetType: SubnetType.PUBLIC,
            }]
        });

        const cluster = new Cluster(this, "Fargate", {
            vpc: ingestVPC,
            capacityProviders: ["FARGATE_SPOT"]
        });

        // Task Role
        const fargateIngestRole = new Role(this, "ecsTaskExecutionRole", {
            assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
        });

        fargateIngestRole.addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName(
                "service-role/AmazonECSTaskExecutionRolePolicy"
            )
        );

        const ingestKaggleTaskDefinition = new FargateTaskDefinition(this,
            "kaggleIngestTaskDef",
            {
                memoryLimitMiB: 512,
                cpu: 256,
                taskRole: fargateIngestRole,
            }
        );

        const ingestKaggleLogGroup = new LogGroup(this, "ingestKaggleLogGroup", {
            logGroupName: "/ecs/ingest",
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.THREE_DAYS // destroy logs after 3 days
        });

        const ingestKaggleLogDriver = new AwsLogDriver({
            logGroup: ingestKaggleLogGroup,
            streamPrefix: "ingestKaggle"
        });

        fargateIngestRole.attachInlinePolicy(new Policy(this, 'allowWriteLogs', {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        "logs:CreateLogStream",
                        "logs:PutLogEvents"
                    ],
                    resources: [ ingestKaggleLogGroup.logGroupArn ]
                })
            ]
        }));

        fargateIngestRole.attachInlinePolicy(new Policy(this, 'fullS3', {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        "s3:*"
                    ],
                    resources: [ "*" ]
                })
            ]
        }));

        fargateIngestRole.attachInlinePolicy(new Policy(this, 'ssm', {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        "ssm:*"
                    ],
                    resources: [ "*" ]
                })
            ]
        }));

        // Task Containers
        const ingestKaggleContainer = ingestKaggleTaskDefinition.addContainer(
            "ingestKaggleContainer",
            {
                image: ContainerImage.fromAsset(path.join('lib', 'ingestion', 'fargate', 'kaggle-ingest')),
                logging: ingestKaggleLogDriver,
                environment: {
                    KAGGLE_DATASET: kaggleDataset.valueAsString,
                    S3_BUCKET: s3BucketOuput.valueAsString,
                    S3_INGEST_DIR: s3IngestDir.valueAsString,
                    SSM_REF_KAGGLE_USER: kaggleUsernameSSM.parameterName,
                    SSM_REF_KAGGLE_KEY: kaggleKeySSM.parameterName
                }
            }
        );
    }
}