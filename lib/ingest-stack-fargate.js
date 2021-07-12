"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestStackFargate = void 0;
const core_1 = require("@aws-cdk/core");
const aws_iam_1 = require("@aws-cdk/aws-iam");
const aws_ecs_1 = require("@aws-cdk/aws-ecs");
const path = require("path");
const aws_logs_1 = require("@aws-cdk/aws-logs");
const aws_ssm_1 = require("@aws-cdk/aws-ssm");
const aws_ec2_1 = require("@aws-cdk/aws-ec2");
/**
 * This class creates
 */
class IngestStackFargate extends core_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const kaggleDataset = new core_1.CfnParameter(this, "kaggleDataset", {
            type: "String",
            default: "",
            description: "Kaggle competition dataset."
        });
        const s3BucketOuput = new core_1.CfnParameter(this, "s3BucketOuput", {
            type: "String",
            default: "",
            description: "S3 Bucket ingest destination."
        });
        const s3IngestDir = new core_1.CfnParameter(this, "s3IngestDir", {
            type: "String",
            default: "",
            description: "Path inside S3 Bucket for ingestion."
        });
        /* Establish SSM Parameter Store secret variables */
        const kaggleUsernameSSM = new aws_ssm_1.StringParameter(this, "kaggleUser", {
            description: "Kaggle username needed for auth in API",
            stringValue: (props === null || props === void 0 ? void 0 : props.kaggleUser) || ""
        });
        const kaggleKeySSM = new aws_ssm_1.StringParameter(this, "kaggleKeySecret", {
            description: "Kaggle Secret Key for auth in AP",
            stringValue: (props === null || props === void 0 ? void 0 : props.kaggleKey) || ""
        });
        const ingestVPC = new aws_ec2_1.Vpc(this, "ingestVPC", {
            cidr: "10.0.0.0/16",
            natGateways: 0,
            subnetConfiguration: [{
                    cidrMask: 24,
                    name: 'mySubnet1',
                    subnetType: aws_ec2_1.SubnetType.PUBLIC,
                }]
        });
        const cluster = new aws_ecs_1.Cluster(this, "Fargate", {
            vpc: ingestVPC,
            capacityProviders: ["FARGATE_SPOT"]
        });
        // Task Role
        const fargateIngestRole = new aws_iam_1.Role(this, "ecsTaskExecutionRole", {
            assumedBy: new aws_iam_1.ServicePrincipal("ecs-tasks.amazonaws.com"),
        });
        fargateIngestRole.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"));
        const ingestKaggleTaskDefinition = new aws_ecs_1.FargateTaskDefinition(this, "kaggleIngestTaskDef", {
            memoryLimitMiB: 512,
            cpu: 256,
            taskRole: fargateIngestRole,
        });
        const ingestKaggleLogGroup = new aws_logs_1.LogGroup(this, "ingestKaggleLogGroup", {
            logGroupName: "/ecs/ingest",
            removalPolicy: core_1.RemovalPolicy.DESTROY,
            retention: aws_logs_1.RetentionDays.THREE_DAYS // destroy logs after 3 days
        });
        const ingestKaggleLogDriver = new aws_ecs_1.AwsLogDriver({
            logGroup: ingestKaggleLogGroup,
            streamPrefix: "ingestKaggle"
        });
        fargateIngestRole.attachInlinePolicy(new aws_iam_1.Policy(this, 'allowWriteLogs', {
            statements: [
                new aws_iam_1.PolicyStatement({
                    effect: aws_iam_1.Effect.ALLOW,
                    actions: [
                        "logs:CreateLogStream",
                        "logs:PutLogEvents"
                    ],
                    resources: [ingestKaggleLogGroup.logGroupArn]
                })
            ]
        }));
        fargateIngestRole.attachInlinePolicy(new aws_iam_1.Policy(this, 'fullS3', {
            statements: [
                new aws_iam_1.PolicyStatement({
                    effect: aws_iam_1.Effect.ALLOW,
                    actions: [
                        "s3:*"
                    ],
                    resources: ["*"]
                })
            ]
        }));
        fargateIngestRole.attachInlinePolicy(new aws_iam_1.Policy(this, 'ssm', {
            statements: [
                new aws_iam_1.PolicyStatement({
                    effect: aws_iam_1.Effect.ALLOW,
                    actions: [
                        "ssm:*"
                    ],
                    resources: ["*"]
                })
            ]
        }));
        // Task Containers
        const ingestKaggleContainer = ingestKaggleTaskDefinition.addContainer("ingestKaggleContainer", {
            image: aws_ecs_1.ContainerImage.fromAsset(path.join('lib', 'ingestion', 'fargate', 'kaggle-ingest')),
            logging: ingestKaggleLogDriver,
            environment: {
                KAGGLE_DATASET: kaggleDataset.valueAsString,
                S3_BUCKET: s3BucketOuput.valueAsString,
                S3_INGEST_DIR: s3IngestDir.valueAsString,
                SSM_REF_KAGGLE_USER: kaggleUsernameSSM.parameterName,
                SSM_REF_KAGGLE_KEY: kaggleKeySSM.parameterName
            }
        });
    }
}
exports.IngestStackFargate = IngestStackFargate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5nZXN0LXN0YWNrLWZhcmdhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmdlc3Qtc3RhY2stZmFyZ2F0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3Q0FBMEY7QUFDMUYsOENBQXlHO0FBQ3pHLDhDQUErRjtBQUMvRiw2QkFBNkI7QUFDN0IsZ0RBQTREO0FBQzVELDhDQUFtRDtBQUNuRCw4Q0FBbUQ7QUFRbkQ7O0dBRUc7QUFDSCxNQUFhLGtCQUFtQixTQUFRLFlBQUs7SUFDekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE2QjtRQUVuRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLGFBQWEsR0FBRyxJQUFJLG1CQUFZLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUMxRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBQyxFQUFFO1lBQ1YsV0FBVyxFQUFFLDZCQUE2QjtTQUFDLENBQUMsQ0FBQztRQUVqRCxNQUFNLGFBQWEsR0FBRyxJQUFJLG1CQUFZLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUMxRCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBQyxFQUFFO1lBQ1YsV0FBVyxFQUFFLCtCQUErQjtTQUFDLENBQUMsQ0FBQztRQUVuRCxNQUFNLFdBQVcsR0FBRyxJQUFJLG1CQUFZLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUN0RCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBQyxFQUFFO1lBQ1YsV0FBVyxFQUFFLHNDQUFzQztTQUFDLENBQUMsQ0FBQztRQUUxRCxvREFBb0Q7UUFDcEQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHlCQUFlLENBQUMsSUFBSSxFQUFDLFlBQVksRUFBQztZQUM1RCxXQUFXLEVBQUUsd0NBQXdDO1lBQ3JELFdBQVcsRUFBRSxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxVQUFV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O29CQUNwQixPQUFPLEVBQUU7d0JBQ0wsT0FBTztxQkFDVjtvQkFDRCxTQUFTLEVBQUUsQ0FBRSxHQUFHLENBQUU7aUJBQ3JCLENBQUM7YUFDTDtTQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUosa0JBQWtCO1FBQ2xCLE1BQU0scUJBQXFCLEdBQUcsMEJBQTBCLENBQUMsWUFBWSxDQUNqRSx1QkFBdUIsRUFDdkI7WUFDSSxLQUFLLEVBQUUsd0JBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUMxRixPQUFPLEVBQUUscUJBQXFCO1lBQzlCLFdBQVcsRUFBRTtnQkFDVCxjQUFjLEVBQUUsYUFBYSxDQUFDLGFBQWE7Z0JBQzNDLFNBQVMsRUFBRSxhQUFhLENBQUMsYUFBYTtnQkFDdEMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxhQUFhO2dCQUN4QyxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQyxhQUFhO2dCQUNwRCxrQkFBa0IsRUFBRSxZQUFZLENBQUMsYUFBYTthQUNqRDtTQUNKLENBQ0osQ0FBQztJQUNOLENBQUM7Q0FDSjtBQWxJRCxnREFrSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDZm5QYXJhbWV0ZXIsIENvbnN0cnVjdCwgUmVtb3ZhbFBvbGljeSwgU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xuaW1wb3J0IHsgRWZmZWN0LCBNYW5hZ2VkUG9saWN5LCBQb2xpY3ksIFBvbGljeVN0YXRlbWVudCwgUm9sZSwgU2VydmljZVByaW5jaXBhbCB9IGZyb20gXCJAYXdzLWNkay9hd3MtaWFtXCJcbmltcG9ydCB7IEF3c0xvZ0RyaXZlciwgQ2x1c3RlciwgQ29udGFpbmVySW1hZ2UsIEZhcmdhdGVUYXNrRGVmaW5pdGlvbiB9IGZyb20gXCJAYXdzLWNkay9hd3MtZWNzXCJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IExvZ0dyb3VwLCBSZXRlbnRpb25EYXlzIH0gZnJvbSBcIkBhd3MtY2RrL2F3cy1sb2dzXCI7XG5pbXBvcnQgeyBTdHJpbmdQYXJhbWV0ZXIgfSBmcm9tIFwiQGF3cy1jZGsvYXdzLXNzbVwiO1xuaW1wb3J0IHsgU3VibmV0VHlwZSwgVnBjIH0gZnJvbSBcIkBhd3MtY2RrL2F3cy1lYzJcIjtcblxuLy8gwqB5YXJuIGNkayBkZXBsb3kgLWMga2FnZ2xlVXNlcj1zZWJhc3RpYWwgLWMgZGF0YXNldE5hbWU9Y3ljbGVfc2hhcmVfZGF0YXNldCAtYyBrYWdnbGVLZXk9ZmE5YjYyYzY1MTNkYTU3NTRmMWMyMzhkYzQ2NWZiOTQgLS1wYXJhbWV0ZXJzIGthZ2dsZURhdGFzZXQ9cHJvbnRvL2N5Y2xlLXNoYXJlLWRhdGFzZXQgLS1wYXJhbWV0ZXJzIHMzQnVja2V0T3VwdXQ9dGZtLWluZ2VzdC1kYXRhbGFrZSAtLXBhcmFtZXRlcnMgczNJbmdlc3REaXI9c3RhZ2dpbmdcbmV4cG9ydCBpbnRlcmZhY2UgQ29udGV4dEluZ2VzdGlvblByb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gICAgcmVhZG9ubHkga2FnZ2xlVXNlcj86IHN0cmluZztcbiAgICByZWFkb25seSBrYWdnbGVLZXk/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogVGhpcyBjbGFzcyBjcmVhdGVzXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmdlc3RTdGFja0ZhcmdhdGUgZXh0ZW5kcyBTdGFjayB7XG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBDb250ZXh0SW5nZXN0aW9uUHJvcHMpIHtcblxuICAgICAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgICAgICBjb25zdCBrYWdnbGVEYXRhc2V0ID0gbmV3IENmblBhcmFtZXRlcih0aGlzLCBcImthZ2dsZURhdGFzZXRcIiwge1xuICAgICAgICAgICAgdHlwZTogXCJTdHJpbmdcIixcbiAgICAgICAgICAgIGRlZmF1bHQ6XCJcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkthZ2dsZSBjb21wZXRpdGlvbiBkYXRhc2V0LlwifSk7XG5cbiAgICAgICAgY29uc3QgczNCdWNrZXRPdXB1dCA9IG5ldyBDZm5QYXJhbWV0ZXIodGhpcywgXCJzM0J1Y2tldE91cHV0XCIsIHtcbiAgICAgICAgICAgIHR5cGU6IFwiU3RyaW5nXCIsXG4gICAgICAgICAgICBkZWZhdWx0OlwiXCIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTMyBCdWNrZXQgaW5nZXN0IGRlc3RpbmF0aW9uLlwifSk7XG5cbiAgICAgICAgY29uc3QgczNJbmdlc3REaXIgPSBuZXcgQ2ZuUGFyYW1ldGVyKHRoaXMsIFwiczNJbmdlc3REaXJcIiwge1xuICAgICAgICAgICAgdHlwZTogXCJTdHJpbmdcIixcbiAgICAgICAgICAgIGRlZmF1bHQ6XCJcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlBhdGggaW5zaWRlIFMzIEJ1Y2tldCBmb3IgaW5nZXN0aW9uLlwifSk7XG5cbiAgICAgICAgLyogRXN0YWJsaXNoIFNTTSBQYXJhbWV0ZXIgU3RvcmUgc2VjcmV0IHZhcmlhYmxlcyAqL1xuICAgICAgICBjb25zdCBrYWdnbGVVc2VybmFtZVNTTSA9IG5ldyBTdHJpbmdQYXJhbWV0ZXIodGhpcyxcImthZ2dsZVVzZXJcIix7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJLYWdnbGUgdXNlcm5hbWUgbmVlZGVkIGZvciBhdXRoIGluIEFQSVwiLFxuICAgICAgICAgICAgc3RyaW5nVmFsdWU6IHByb3BzPy5rYWdnbGVVc2VyIHx8IFwiXCJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3Qga2FnZ2xlS2V5U1NNID0gbmV3IFN0cmluZ1BhcmFtZXRlcih0aGlzLFwia2FnZ2xlS2V5U2VjcmV0XCIse1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiS2FnZ2xlIFNlY3JldCBLZXkgZm9yIGF1dGggaW4gQVBcIixcbiAgICAgICAgICAgIHN0cmluZ1ZhbHVlOiBwcm9wcz8ua2FnZ2xlS2V5IHx8IFwiXCJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgaW5nZXN0VlBDID0gbmV3IFZwYyh0aGlzLCBcImluZ2VzdFZQQ1wiLCB7XG4gICAgICAgICAgICBjaWRyOiBcIjEwLjAuMC4wLzE2XCIsXG4gICAgICAgICAgICBuYXRHYXRld2F5czogMCxcbiAgICAgICAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb246IFt7XG4gICAgICAgICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgICAgICAgIG5hbWU6ICdteVN1Ym5ldDEnLFxuICAgICAgICAgICAgICAgIHN1Ym5ldFR5cGU6IFN1Ym5ldFR5cGUuUFVCTElDLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgY2x1c3RlciA9IG5ldyBDbHVzdGVyKHRoaXMsIFwiRmFyZ2F0ZVwiLCB7XG4gICAgICAgICAgICB2cGM6IGluZ2VzdFZQQyxcbiAgICAgICAgICAgIGNhcGFjaXR5UHJvdmlkZXJzOiBbXCJGQVJHQVRFX1NQT1RcIl1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVGFzayBSb2xlXG4gICAgICAgIGNvbnN0IGZhcmdhdGVJbmdlc3RSb2xlID0gbmV3IFJvbGUodGhpcywgXCJlY3NUYXNrRXhlY3V0aW9uUm9sZVwiLCB7XG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBTZXJ2aWNlUHJpbmNpcGFsKFwiZWNzLXRhc2tzLmFtYXpvbmF3cy5jb21cIiksXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhcmdhdGVJbmdlc3RSb2xlLmFkZE1hbmFnZWRQb2xpY3koXG4gICAgICAgICAgICBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcbiAgICAgICAgICAgICAgICBcInNlcnZpY2Utcm9sZS9BbWF6b25FQ1NUYXNrRXhlY3V0aW9uUm9sZVBvbGljeVwiXG4gICAgICAgICAgICApXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgaW5nZXN0S2FnZ2xlVGFza0RlZmluaXRpb24gPSBuZXcgRmFyZ2F0ZVRhc2tEZWZpbml0aW9uKHRoaXMsXG4gICAgICAgICAgICBcImthZ2dsZUluZ2VzdFRhc2tEZWZcIixcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBtZW1vcnlMaW1pdE1pQjogNTEyLFxuICAgICAgICAgICAgICAgIGNwdTogMjU2LFxuICAgICAgICAgICAgICAgIHRhc2tSb2xlOiBmYXJnYXRlSW5nZXN0Um9sZSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBpbmdlc3RLYWdnbGVMb2dHcm91cCA9IG5ldyBMb2dHcm91cCh0aGlzLCBcImluZ2VzdEthZ2dsZUxvZ0dyb3VwXCIsIHtcbiAgICAgICAgICAgIGxvZ0dyb3VwTmFtZTogXCIvZWNzL2luZ2VzdFwiLFxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICAgICAgcmV0ZW50aW9uOiBSZXRlbnRpb25EYXlzLlRIUkVFX0RBWVMgLy8gZGVzdHJveSBsb2dzIGFmdGVyIDMgZGF5c1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBpbmdlc3RLYWdnbGVMb2dEcml2ZXIgPSBuZXcgQXdzTG9nRHJpdmVyKHtcbiAgICAgICAgICAgIGxvZ0dyb3VwOiBpbmdlc3RLYWdnbGVMb2dHcm91cCxcbiAgICAgICAgICAgIHN0cmVhbVByZWZpeDogXCJpbmdlc3RLYWdnbGVcIlxuICAgICAgICB9KTtcblxuICAgICAgICBmYXJnYXRlSW5nZXN0Um9sZS5hdHRhY2hJbmxpbmVQb2xpY3kobmV3IFBvbGljeSh0aGlzLCAnYWxsb3dXcml0ZUxvZ3MnLCB7XG4gICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvZ3M6Q3JlYXRlTG9nU3RyZWFtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvZ3M6UHV0TG9nRXZlbnRzXCJcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbIGluZ2VzdEthZ2dsZUxvZ0dyb3VwLmxvZ0dyb3VwQXJuIF1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXVxuICAgICAgICB9KSk7XG5cbiAgICAgICAgZmFyZ2F0ZUluZ2VzdFJvbGUuYXR0YWNoSW5saW5lUG9saWN5KG5ldyBQb2xpY3kodGhpcywgJ2Z1bGxTMycsIHtcbiAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiczM6KlwiXG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogWyBcIipcIiBdXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSkpO1xuXG4gICAgICAgIGZhcmdhdGVJbmdlc3RSb2xlLmF0dGFjaElubGluZVBvbGljeShuZXcgUG9saWN5KHRoaXMsICdzc20nLCB7XG4gICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcInNzbToqXCJcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbIFwiKlwiIF1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXVxuICAgICAgICB9KSk7XG5cbiAgICAgICAgLy8gVGFzayBDb250YWluZXJzXG4gICAgICAgIGNvbnN0IGluZ2VzdEthZ2dsZUNvbnRhaW5lciA9IGluZ2VzdEthZ2dsZVRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcihcbiAgICAgICAgICAgIFwiaW5nZXN0S2FnZ2xlQ29udGFpbmVyXCIsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaW1hZ2U6IENvbnRhaW5lckltYWdlLmZyb21Bc3NldChwYXRoLmpvaW4oJ2xpYicsICdpbmdlc3Rpb24nLCAnZmFyZ2F0ZScsICdrYWdnbGUtaW5nZXN0JykpLFxuICAgICAgICAgICAgICAgIGxvZ2dpbmc6IGluZ2VzdEthZ2dsZUxvZ0RyaXZlcixcbiAgICAgICAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgICAgICAgICBLQUdHTEVfREFUQVNFVDoga2FnZ2xlRGF0YXNldC52YWx1ZUFzU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBTM19CVUNLRVQ6IHMzQnVja2V0T3VwdXQudmFsdWVBc1N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgUzNfSU5HRVNUX0RJUjogczNJbmdlc3REaXIudmFsdWVBc1N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgU1NNX1JFRl9LQUdHTEVfVVNFUjoga2FnZ2xlVXNlcm5hbWVTU00ucGFyYW1ldGVyTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgU1NNX1JFRl9LQUdHTEVfS0VZOiBrYWdnbGVLZXlTU00ucGFyYW1ldGVyTmFtZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG59Il19