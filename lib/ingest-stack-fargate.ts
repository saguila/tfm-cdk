import * as cdk from "@aws-cdk/core";

import { LayerVersion, AssetCode, Runtime, Function } from "@aws-cdk/aws-lambda"
import { ManagedPolicy, Role, ServicePrincipal } from "@aws-cdk/aws-iam"
import {AwsLogDriver, Cluster, ContainerImage, FargateService, FargateTaskDefinition} from "@aws-cdk/aws-ecs"
import { Vpc } from "@aws-cdk/aws-ec2"
import { CfnParameter } from "@aws-cdk/core";
import * as path from "path";
import {ApplicationLoadBalancedFargateService} from "@aws-cdk/aws-ecs-patterns";
import {LogGroup} from "@aws-cdk/aws-logs";


export interface ContextIngestionProps extends cdk.StackProps {
    readonly kaggleUser?: string;
    readonly kaggleKey?: string;
    readonly kaggleCompetition?: string;
}

export class IngestStackFargate extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: /*cdk.StackProps*/ ContextIngestionProps) {

        super(scope, id, props);

        const vpc = new Vpc(this, "IngestionVpc", {
            maxAzs: 3 // Default is all AZs in region
        });

        const cluster = new Cluster(this, "Fargate", {
            vpc: vpc
        });

        // Create a load-balanced Fargate service and make it public
        new ApplicationLoadBalancedFargateService(this, "MyFargateService", {
            cluster: cluster,
            cpu: 256,
            desiredCount: 1,
            taskImageOptions: { image: ContainerImage.fromAsset(path.join('lib', 'ingestion', 'fargate', 'kaggle-ingest')), environment: { s:"ewr",we:"sds" } },
            memoryLimitMiB: 512,
            publicLoadBalancer: false
        });

        /*
        // Task Role
        const taskrole = new Role(this, "ecsTaskExecutionRole", {
            assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
        });

        taskrole.addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName(
                "service-role/AmazonECSTaskExecutionRolePolicy"
            )
        );

        // @ts-ignore
        const ingestKaggleTaskDefinition = new FargateTaskDefinition(this,
            "kaggleIngestTaskDef",
            {
                memoryLimitMiB: 512,
                cpu: 256,
                taskRole: taskrole,
            }
        );


        // @ts-ignore
        const ingestKaggleLogGroup = new LogGroup(this, "bookServiceLogGroup", {
            logGroupName: "/ecs/ingest",
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const ingestKaggleLogDriver = new AwsLogDriver({
            logGroup: ingestKaggleLogGroup,
            streamPrefix: "ingestKaggle",
        });

        // Task Containers
        const ingestKaggleContainer = ingestKaggleTaskDefinition.addContainer(
            "ingestKaggleContainer",
            {
                image: ContainerImage.fromAsset(path.join('lib', 'ingestion', 'fargate', 'kaggle-ingest')),
                logging: ingestKaggleLogDriver
            }
        );

        // @ts-ignore
        const ingestKaggleService = new FargateService(this, "ingestKaggleService", {
            cluster: cluster,
            taskDefinition: ingestKaggleTaskDefinition,
            assignPublicIp: false,
            desiredCount: 2,
            securityGroup: bookServiceSecGrp,
            cloudMapOptions: {
                name: "bookService",
                cloudMapNamespace: dnsNamespace,
            },
        });

        */
    }
}