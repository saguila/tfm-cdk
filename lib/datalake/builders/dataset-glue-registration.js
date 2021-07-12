"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLakeEnrollmentWorkflow = exports.DatasetGlueRegistration = void 0;
const cdk = require("@aws-cdk/core");
const glue = require("@aws-cdk/aws-glue");
const lambda = require("@aws-cdk/aws-lambda");
const iam = require("@aws-cdk/aws-iam");
const cfn = require("@aws-cdk/aws-cloudformation");
const fs = require("fs");
const s3assets = require("@aws-cdk/aws-s3-assets");
/**
 * Registro de los Jobs en Glue
 */
class DatasetGlueRegistration extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.DataLakeGoldTargets = props.dataLakeGoldTargets;
        this.DataLakeStagingTargets = props.dataLakeStagingTargets;
        this.DataLakeBucketName = props.glueStagingScriptArguments['--DL_BUCKET'];
        this.DataLakePrefix = props.glueStagingScriptArguments['--DL_PREFIX'];
        this.LandingGlueDatabase = new glue.Database(this, `${props.landingDatabaseName}`, {
            databaseName: props.landingDatabaseName,
            locationUri: `s3://${props.dataLakeBucket.bucketName}/${props.landingDatabaseName}/`
        });
        // Metadata encryption at rest in landing database
        /*
        new CfnDataCatalogEncryptionSettings(this, `${props.landingDatabaseName}DBEncryption`, {
            catalogId:  this.LandingGlueDatabase.catalogId,
            dataCatalogEncryptionSettings: {
                encryptionAtRest: {
                    catalogEncryptionMode: 'SSE-KMS',
                    sseAwsKmsKeyId: 'data-lake-kms'
                },
            }
        });
        */
        this.StagingGlueDatabase = new glue.Database(this, `${props.stagingDatabaseName}`, {
            databaseName: props.stagingDatabaseName,
            locationUri: `s3://${props.dataLakeBucket.bucketName}/${props.stagingDatabaseName}/`
        });
        this.GoldGlueDatabase = new glue.Database(this, `${props.goldDatabaseName}`, {
            databaseName: props.goldDatabaseName,
            locationUri: `s3://${props.dataLakeBucket.bucketName}/${props.goldDatabaseName}/`
        });
        //TODO: Delete
        let connectionArray = [];
        //TODO: Delete
        if (props.sourceConnectionInput) {
            this.SourceConnection = new glue.CfnConnection(this, `${props.dataSetName}-src-deonnection`, {
                catalogId: this.LandingGlueDatabase.catalogId,
                connectionInput: props.sourceConnectionInput
            });
            if (props.sourceConnectionInput.name) {
                connectionArray.push(props.sourceConnectionInput.name);
            }
        }
        //
        this.DataSetGlueRole = new iam.Role(this, `${props.dataSetName}-GlueRole`, {
            assumedBy: new iam.ServicePrincipal('glue.amazonaws.com')
        });
        this.DataSetGlueRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'));
        this.DataSetGlueRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
        props.dataLakeBucket.grantReadWrite(this.DataSetGlueRole);
        if (typeof props.sourceAccessPolicy !== 'undefined') {
            props.sourceAccessPolicy.attachToRole(this.DataSetGlueRole);
        }
        const landingCrawler = this.setupCrawler(this.LandingGlueDatabase, props.dataLakeLandingTargets, props.landingDatabaseName || "landing");
        const glueScript = new s3assets.Asset(this, `${props.landingDatabaseName}-GlueScript`, {
            path: props.glueStagingScriptPath
        });
        glueScript.grantRead(this.DataSetGlueRole);
        const glueScriptGold = new s3assets.Asset(this, `${props.landingDatabaseName}-Glue-Script-Gold`, {
            path: props.glueGoldScriptPath
        });
        glueScriptGold.grantRead(this.DataSetGlueRole);
        /// The spread operator below (...) makes the connections property conditional. Its only used for JDBC sources at the moment.
        const jobParams = {
            executionProperty: {
                maxConcurrentRuns: 1
            },
            name: `${props.landingDatabaseName}_to_${props.stagingDatabaseName}_etl`,
            timeout: 2880,
            glueVersion: "2.0",
            maxCapacity: props.maxDPUs,
            command: {
                scriptLocation: `s3://${glueScript.s3BucketName}/${glueScript.s3ObjectKey}`,
                name: "glueetl",
                pythonVersion: "3"
            },
            role: this.DataSetGlueRole.roleArn,
            maxRetries: 0,
            defaultArguments: props.glueStagingScriptArguments,
            ...(typeof props.sourceConnectionInput !== "undefined" && {
                connections: {
                    connections: connectionArray
                }
            })
        };
        const landingToStagingJob = new glue.CfnJob(this, `${props.landingDatabaseName}-EtlJob`, jobParams);
        const stagingGlueCrawler = this.setupCrawler(this.StagingGlueDatabase, this.DataLakeStagingTargets, props.stagingDatabaseName || "staging");
        const jobParams2 = {
            executionProperty: {
                maxConcurrentRuns: 1
            },
            name: "staging_to_gold_etl",
            timeout: 2880,
            glueVersion: "2.0",
            maxCapacity: props.maxDPUs,
            command: {
                scriptLocation: `s3://${glueScriptGold.s3BucketName}/${glueScriptGold.s3ObjectKey}`,
                name: "glueetl",
                pythonVersion: "3"
            },
            role: this.DataSetGlueRole.roleArn,
            maxRetries: 0,
            defaultArguments: props.glueGoldScriptArguments,
            ...(typeof props.sourceConnectionInput !== "undefined" && {
                connections: {
                    connections: connectionArray
                }
            })
        };
        const stagingToGoldJob = new glue.CfnJob(this, `${props.landingDatabaseName}-EtlJob2`, jobParams2);
        const goldGlueCrawler = this.setupCrawler(this.GoldGlueDatabase, this.DataLakeGoldTargets, props.goldDatabaseName || "gold");
        const dataLakeWorkflow = new DataLakeEnrollmentWorkflow(this, `${props.dataSetName}DataLakeWorkflow`, {
            workFlowName: `${props.dataSetName}_DataLakeWorkflow`,
            landingCrawler: landingCrawler,
            landingToStagingGlueJob: landingToStagingJob,
            stagingCrawler: stagingGlueCrawler,
            stagingToGoldGlueJob: stagingToGoldJob,
            goldCrawler: goldGlueCrawler,
            WorkflowCronScheduleExpression: props.workflowCronScheduleExpression
        });
    }
    /* Creates a Glue Crawler bassed in */
    setupCrawler(targetGlueDatabase, targets, crawlerName) {
        return new glue.CfnCrawler(this, `${crawlerName}-crawler`, {
            name: `${crawlerName}_crawler`,
            targets: targets,
            role: this.DataSetGlueRole.roleName,
            databaseName: targetGlueDatabase.databaseName,
            schemaChangePolicy: {
                deleteBehavior: "DEPRECATE_IN_DATABASE",
                updateBehavior: "UPDATE_IN_DATABASE",
            },
            tablePrefix: "",
            classifiers: []
        });
    }
}
exports.DatasetGlueRegistration = DatasetGlueRegistration;
class DataLakeEnrollmentWorkflow extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.Workflow = new glue.CfnWorkflow(this, "etlWorkflow", {
            name: props.workFlowName
        });
        /* Landing Crawler Trigger */
        if (props.WorkflowCronScheduleExpression == null) {
            this.StartTrigger = new glue.CfnTrigger(this, "startTrigger", {
                actions: [
                    {
                        crawlerName: props.landingCrawler.name
                    }
                ],
                type: "ON_DEMAND",
                name: `startWorkflow-${this.Workflow.name}`,
                workflowName: this.Workflow.name
            });
        }
        else {
            this.StartTrigger = new glue.CfnTrigger(this, "startTrigger", {
                actions: [
                    {
                        crawlerName: props.landingCrawler.name
                    }
                ],
                type: "SCHEDULED",
                schedule: props.WorkflowCronScheduleExpression,
                name: `startWorkflow-${this.Workflow.name}`,
                workflowName: this.Workflow.name
            });
        }
        /* ETL Landing to Staging */
        this.SrcCrawlerCompleteTrigger = new glue.CfnTrigger(this, "srcCrawlerCompleteTrigger", {
            predicate: {
                conditions: [
                    {
                        crawlerName: props.landingCrawler.name,
                        crawlState: "SUCCEEDED",
                        logicalOperator: "EQUALS"
                    }
                ],
                logical: "ANY"
            },
            name: `sourceDataCrawled-${this.Workflow.name}`,
            actions: [
                {
                    jobName: props.landingToStagingGlueJob.name
                }
            ],
            workflowName: this.Workflow.name,
            type: "CONDITIONAL",
            startOnCreation: true
        });
        /* Crawler for Staging new files */
        this.ETLCompleteTrigger = new glue.CfnTrigger(this, "etlCompleteTrigger", {
            predicate: {
                conditions: [
                    {
                        state: "SUCCEEDED",
                        logicalOperator: "EQUALS",
                        jobName: props.landingToStagingGlueJob.name
                    }
                ],
                logical: "ANY"
            },
            name: `EtlComplete-${this.Workflow.name}`,
            actions: [
                {
                    crawlerName: props.stagingCrawler.name
                }
            ],
            workflowName: this.Workflow.name,
            type: "CONDITIONAL"
        });
        /* ETL Staging to Gold */
        this.StagingCrawlerCompleteTrigger = new glue.CfnTrigger(this, "stagingCrawlerCompleteTrigger", {
            predicate: {
                conditions: [
                    {
                        crawlerName: props.stagingCrawler.name,
                        crawlState: "SUCCEEDED",
                        logicalOperator: "EQUALS"
                    }
                ],
                logical: "ANY"
            },
            name: `stagingDataCrawled-${this.Workflow.name}`,
            actions: [
                {
                    jobName: props.stagingToGoldGlueJob.name
                }
            ],
            workflowName: this.Workflow.name,
            type: "CONDITIONAL",
            startOnCreation: true
        });
        /* Crawler for Gold new files */
        this.StagingToGoldEtlCompleteTrigger = new glue.CfnTrigger(this, "stagingToGoldCompleteTrigger", {
            predicate: {
                conditions: [
                    {
                        state: "SUCCEEDED",
                        logicalOperator: "EQUALS",
                        jobName: props.stagingToGoldGlueJob.name
                    }
                ],
                logical: "ANY"
            },
            name: `StagingToGoldEtlCompleteTrigger-${this.Workflow.name}`,
            actions: [
                {
                    crawlerName: props.goldCrawler.name
                }
            ],
            workflowName: this.Workflow.name,
            type: "CONDITIONAL"
        });
        /* Set dependencies for wait the workflow resource creation used in steps definition */
        this.StartTrigger.node.addDependency(this.Workflow);
        this.SrcCrawlerCompleteTrigger.node.addDependency(this.Workflow);
        this.ETLCompleteTrigger.node.addDependency(this.Workflow);
        this.StagingCrawlerCompleteTrigger.node.addDependency(this.Workflow);
        this.StagingToGoldEtlCompleteTrigger.node.addDependency(this.Workflow);
        const activateTriggerRole = new iam.Role(this, 'activateTriggerRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
        });
        activateTriggerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
        activateTriggerRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            actions: ['glue:StartTrigger']
        }));
        const activateTriggerFunction = new lambda.SingletonFunction(this, 'activateTriggerSingleton', {
            role: activateTriggerRole,
            uuid: "ActivateGlueTriggerFunction",
            code: new lambda.InlineCode(fs.readFileSync('./lib/datalake/scripts/lambda.activategluetigger.py', { encoding: 'utf-8' })),
            handler: 'index.main',
            timeout: cdk.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_3_7,
            memorySize: 1024
        });
        if (props.WorkflowCronScheduleExpression != null) {
            const CronTrigger_triggerActivation = new cfn.CustomResource(this, 'CronTrigger-triggerActivation', {
                provider: cfn.CustomResourceProvider.lambda(activateTriggerFunction),
                properties: {
                    triggerId: this.StartTrigger.name
                }
            });
        }
        const srcCrawlerCompleteTrigger_triggerActivation = new cfn.CustomResource(this, 'srcCrawlerCompleteTrigger-triggerActivation', {
            provider: cfn.CustomResourceProvider.lambda(activateTriggerFunction),
            properties: {
                triggerId: this.SrcCrawlerCompleteTrigger.name
            }
        });
        const etlTrigger_triggerActivation = new cfn.CustomResource(this, 'etlTrigger-triggerActivation', {
            provider: cfn.CustomResourceProvider.lambda(activateTriggerFunction),
            properties: {
                triggerId: this.ETLCompleteTrigger.name
            }
        });
    }
}
exports.DataLakeEnrollmentWorkflow = DataLakeEnrollmentWorkflow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YXNldC1nbHVlLXJlZ2lzdHJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGFzZXQtZ2x1ZS1yZWdpc3RyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUNBQXFDO0FBR3JDLDBDQUEyQztBQUMzQyw4Q0FBK0M7QUFDL0Msd0NBQXlDO0FBQ3pDLG1EQUFvRDtBQUNwRCx5QkFBMEI7QUFDMUIsbURBQW9EO0FBc0JwRDs7R0FFRztBQUNILE1BQWEsdUJBQXdCLFNBQVEsR0FBRyxDQUFDLFNBQVM7SUFxQ3RELFlBQVksS0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBNkI7UUFDdkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsS0FBSyxDQUFDLG1CQUFtQixDQUFDO1FBQ3JELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUM7UUFDM0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUUxRSxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUV0RSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxFQUFFO1lBQy9FLFlBQVksRUFBRSxLQUFLLENBQUMsbUJBQW1CO1lBQ3ZDLFdBQVcsRUFBRSxRQUFRLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsR0FBRztTQUN2RixDQUFDLENBQUM7UUFFSCxrREFBa0Q7UUFDbEQ7Ozs7Ozs7Ozs7VUFVRTtRQUNGLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcs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LFVBQVUsRUFBRTtvQkFDUixTQUFTLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJO2lCQUNwQzthQUNKLENBQUMsQ0FBQztTQUNOO1FBRUQsTUFBTSwyQ0FBMkMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLDZDQUE2QyxFQUFHO1lBQzdILFFBQVEsRUFBRSxHQUFHLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDO1lBQ3BFLFVBQVUsRUFBRTtnQkFDUixTQUFTLEVBQUUsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUk7YUFDakQ7U0FDSixDQUFDLENBQUM7UUFFSCxNQUFNLDRCQUE0QixHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUc7WUFDL0YsUUFBUSxFQUFFLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUM7WUFDcEUsVUFBVSxFQUFFO2dCQUNSLFNBQVMsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSTthQUMxQztTQUNKLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQTFMRCxnRUEwTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG4vLyBpbXBvcnQga21zID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWttcycpO1xuaW1wb3J0IHMzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXMzJyk7XG5pbXBvcnQgZ2x1ZSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1nbHVlJyk7XG5pbXBvcnQgbGFtYmRhID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxhbWJkYScpO1xuaW1wb3J0IGlhbSA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1pYW0nKTtcbmltcG9ydCBjZm4gPSByZXF1aXJlKFwiQGF3cy1jZGsvYXdzLWNsb3VkZm9ybWF0aW9uXCIpO1xuaW1wb3J0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmltcG9ydCBzM2Fzc2V0cyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1zMy1hc3NldHMnKTtcbi8vIGltcG9ydCB7Q2ZuRGF0YUNhdGFsb2dFbmNyeXB0aW9uU2V0dGluZ3N9IGZyb20gXCJAYXdzLWNkay9hd3MtZ2x1ZVwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIERhdGFTZXRFbnJvbGxtZW50UHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gICAgZGF0YUxha2VCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgICBkYXRhU2V0TmFtZTogc3RyaW5nO1xuICAgIGxhbmRpbmdEYXRhYmFzZU5hbWU6IHN0cmluZztcbiAgICBzdGFnaW5nRGF0YWJhc2VOYW1lOiBzdHJpbmc7XG4gICAgZ29sZERhdGFiYXNlTmFtZTogc3RyaW5nO1xuICAgIHNvdXJjZUNvbm5lY3Rpb25JbnB1dD86IGdsdWUuQ2ZuQ29ubmVjdGlvbi5Db25uZWN0aW9uSW5wdXRQcm9wZXJ0eTtcbiAgICBkYXRhTGFrZUxhbmRpbmdUYXJnZXRzOiBnbHVlLkNmbkNyYXdsZXIuVGFyZ2V0c1Byb3BlcnR5O1xuICAgIGRhdGFMYWtlU3RhZ2luZ1RhcmdldHM6IGdsdWUuQ2ZuQ3Jhd2xlci5UYXJnZXRzUHJvcGVydHk7XG4gICAgZGF0YUxha2VHb2xkVGFyZ2V0czogZ2x1ZS5DZm5DcmF3bGVyLlRhcmdldHNQcm9wZXJ0eTtcbiAgICBnbHVlU3RhZ2luZ1NjcmlwdFBhdGg6IHN0cmluZztcbiAgICBnbHVlU3RhZ2luZ1NjcmlwdEFyZ3VtZW50czogYW55O1xuICAgIGdsdWVHb2xkU2NyaXB0UGF0aDogc3RyaW5nO1xuICAgIGdsdWVHb2xkU2NyaXB0QXJndW1lbnRzOiBhbnk7XG4gICAgc291cmNlQWNjZXNzUG9saWN5PzogaWFtLlBvbGljeTtcbiAgICBtYXhEUFVzOiBudW1iZXI7XG4gICAgd29ya2Zsb3dDcm9uU2NoZWR1bGVFeHByZXNzaW9uPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlZ2lzdHJvIGRlIGxvcyBKb2JzIGVuIEdsdWVcbiAqL1xuZXhwb3J0IGNsYXNzIERhdGFzZXRHbHVlUmVnaXN0cmF0aW9uIGV4dGVuZHMgY2RrLkNvbnN0cnVjdCB7XG5cbiAgICBwdWJsaWMgcmVhZG9ubHkgTGFuZGluZ0dsdWVEYXRhYmFzZTogZ2x1ZS5EYXRhYmFzZTtcbiAgICBwdWJsaWMgcmVhZG9ubHkgU3RhZ2luZ0dsdWVEYXRhYmFzZTogZ2x1ZS5EYXRhYmFzZTtcbiAgICBwdWJsaWMgcmVhZG9ubHkgR29sZEdsdWVEYXRhYmFzZTogZ2x1ZS5EYXRhYmFzZTtcblxuICAgIHB1YmxpYyByZWFkb25seSBXb3JrZmxvdzogRGF0YUxha2VFbnJvbGxtZW50V29ya2Zsb3c7XG4gICAgcHVibGljIHJlYWRvbmx5IFNyY0NyYXdsZXJDb21wbGV0ZVRyaWdnZXI6IGdsdWUuQ2ZuVHJpZ2dlcjtcbiAgICBwdWJsaWMgcmVhZG9ubHkgRVRMQ29tcGxldGVUcmlnZ2VyOiBnbHVlLkNmblRyaWdnZXI7XG4gICAgcHVibGljIHJlYWRvbmx5IFNvdXJjZUNvbm5lY3Rpb24/OiBnbHVlLkNmbkNvbm5lY3Rpb247XG4gICAgcHVibGljIHJlYWRvbmx5IERhdGFMYWtlQ29ubmVjdGlvbjogZ2x1ZS5DZm5Db25uZWN0aW9uO1xuXG4gICAgcHVibGljIHJlYWRvbmx5IERhdGFTZXRHbHVlUm9sZTogaWFtLlJvbGU7XG5cbiAgICBwdWJsaWMgcmVhZG9ubHkgRGF0YUxha2VCdWNrZXROYW1lOiBzdHJpbmc7XG4gICAgcHVibGljIHJlYWRvbmx5IERhdGFMYWtlUHJlZml4OiBzdHJpbmc7XG4gICAgcHVibGljIHJlYWRvbmx5IERhdGFMYWtlU3RhZ2luZ1RhcmdldHM6IGdsdWUuQ2ZuQ3Jhd2xlci5UYXJnZXRzUHJvcGVydHk7XG4gICAgcHVibGljIHJlYWRvbmx5IERhdGFMYWtlR29sZFRhcmdldHMgOiBnbHVlLkNmbkNyYXdsZXIuVGFyZ2V0c1Byb3BlcnR5O1xuXG5cbiAgICAvKiBDcmVhdGVzIGEgR2x1ZSBDcmF3bGVyIGJhc3NlZCBpbiAqL1xuICAgIHByaXZhdGUgc2V0dXBDcmF3bGVyKHRhcmdldEdsdWVEYXRhYmFzZTogZ2x1ZS5EYXRhYmFzZSwgdGFyZ2V0czogZ2x1ZS5DZm5DcmF3bGVyLlRhcmdldHNQcm9wZXJ0eSwgY3Jhd2xlck5hbWUgOnN0cmluZykge1xuXG4gICAgICAgIHJldHVybiBuZXcgZ2x1ZS5DZm5DcmF3bGVyKHRoaXMsYCR7Y3Jhd2xlck5hbWV9LWNyYXdsZXJgLHtcbiAgICAgICAgICAgIG5hbWU6IGAke2NyYXdsZXJOYW1lfV9jcmF3bGVyYCxcbiAgICAgICAgICAgIHRhcmdldHM6IHRhcmdldHMsXG4gICAgICAgICAgICByb2xlOiB0aGlzLkRhdGFTZXRHbHVlUm9sZS5yb2xlTmFtZSxcbiAgICAgICAgICAgIGRhdGFiYXNlTmFtZTogdGFyZ2V0R2x1ZURhdGFiYXNlLmRhdGFiYXNlTmFtZSxcbiAgICAgICAgICAgIHNjaGVtYUNoYW5nZVBvbGljeToge1xuICAgICAgICAgICAgICAgIGRlbGV0ZUJlaGF2aW9yOiBcIkRFUFJFQ0FURV9JTl9EQVRBQkFTRVwiLFxuICAgICAgICAgICAgICAgIHVwZGF0ZUJlaGF2aW9yOiBcIlVQREFURV9JTl9EQVRBQkFTRVwiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRhYmxlUHJlZml4OiBcIlwiLFxuICAgICAgICAgICAgY2xhc3NpZmllcnM6IFtdXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRGF0YVNldEVucm9sbG1lbnRQcm9wcykge1xuICAgICAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgICAgIHRoaXMuRGF0YUxha2VHb2xkVGFyZ2V0cyA9IHByb3BzLmRhdGFMYWtlR29sZFRhcmdldHM7XG4gICAgICAgIHRoaXMuRGF0YUxha2VTdGFnaW5nVGFyZ2V0cyA9IHByb3BzLmRhdGFMYWtlU3RhZ2luZ1RhcmdldHM7XG4gICAgICAgIHRoaXMuRGF0YUxha2VCdWNrZXROYW1lXHQ9IHByb3BzLmdsdWVTdGFnaW5nU2NyaXB0QXJndW1lbnRzWyctLURMX0JVQ0tFVCddO1xuXG4gICAgICAgIHRoaXMuRGF0YUxha2VQcmVmaXggPSBwcm9wcy5nbHVlU3RhZ2luZ1NjcmlwdEFyZ3VtZW50c1snLS1ETF9QUkVGSVgnXTtcblxuICAgICAgICB0aGlzLkxhbmRpbmdHbHVlRGF0YWJhc2UgPSBuZXcgZ2x1ZS5EYXRhYmFzZSh0aGlzLCBgJHtwcm9wcy5sYW5kaW5nRGF0YWJhc2VOYW1lfWAsIHtcbiAgICAgICAgICAgIGRhdGFiYXNlTmFtZTogcHJvcHMubGFuZGluZ0RhdGFiYXNlTmFtZSxcbiAgICAgICAgICAgIGxvY2F0aW9uVXJpOiBgczM6Ly8ke3Byb3BzLmRhdGFMYWtlQnVja2V0LmJ1Y2tldE5hbWV9LyR7cHJvcHMubGFuZGluZ0RhdGFiYXNlTmFtZX0vYFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBNZXRhZGF0YSBlbmNyeXB0aW9uIGF0IHJlc3QgaW4gbGFuZGluZyBkYXRhYmFzZVxuICAgICAgICAvKlxuICAgICAgICBuZXcgQ2ZuRGF0YUNhdGFsb2dFbmNyeXB0aW9uU2V0dGluZ3ModGhpcywgYCR7cHJvcHMubGFuZGluZ0RhdGFiYXNlTmFtZX1EQkVuY3J5cHRpb25gLCB7XG4gICAgICAgICAgICBjYXRhbG9nSWQ6ICB0aGlzLkxhbmRpbmdHbHVlRGF0YWJhc2UuY2F0YWxvZ0lkLFxuICAgICAgICAgICAgZGF0YUNhdGFsb2dFbmNyeXB0aW9uU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICBlbmNyeXB0aW9uQXRSZXN0OiB7XG4gICAgICAgICAgICAgICAgICAgIGNhdGFsb2dFbmNyeXB0aW9uTW9kZTogJ1NTRS1LTVMnLFxuICAgICAgICAgICAgICAgICAgICBzc2VBd3NLbXNLZXlJZDogJ2RhdGEtbGFrZS1rbXMnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgICovXG4gICAgICAgIHRoaXMuU3RhZ2luZ0dsdWVEYXRhYmFzZSA9IG5ldyBnbHVlLkRhdGFiYXNlKHRoaXMsIGAke3Byb3BzLnN0YWdpbmdEYXRhYmFzZU5hbWV9YCwge1xuICAgICAgICAgICAgZGF0YWJhc2VOYW1lOiBwcm9wcy5zdGFnaW5nRGF0YWJhc2VOYW1lLFxuICAgICAgICAgICAgbG9jYXRpb25Vcmk6IGBzMzovLyR7cHJvcHMuZGF0YUxha2VCdWNrZXQuYnVja2V0TmFtZX0vJHtwcm9wcy5zdGFnaW5nRGF0YWJhc2VOYW1lfS9gXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuR29sZEdsdWVEYXRhYmFzZSA9IG5ldyBnbHVlLkRhdGFiYXNlKHRoaXMsIGAke3Byb3BzLmdvbGREYXRhYmFzZU5hbWV9YCwge1xuICAgICAgICAgICAgZGF0YWJhc2VOYW1lOiBwcm9wcy5nb2xkRGF0YWJhc2VOYW1lLFxuICAgICAgICAgICAgbG9jYXRpb25Vcmk6IGBzMzovLyR7cHJvcHMuZGF0YUxha2VCdWNrZXQuYnVja2V0TmFtZX0vJHtwcm9wcy5nb2xkRGF0YWJhc2VOYW1lfS9gXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vVE9ETzogRGVsZXRlXG4gICAgICAgIGxldCBjb25uZWN0aW9uQXJyYXkgPSBbXTtcblxuXG4gICAgICAgIC8vVE9ETzogRGVsZXRlXG4gICAgICAgIGlmKHByb3BzLnNvdXJjZUNvbm5lY3Rpb25JbnB1dCl7XG4gICAgICAgICAgICB0aGlzLlNvdXJjZUNvbm5lY3Rpb24gPSBuZXcgZ2x1ZS5DZm5Db25uZWN0aW9uKHRoaXMsIGAke3Byb3BzLmRhdGFTZXROYW1lfS1zcmMtZGVvbm5lY3Rpb25gLCB7XG4gICAgICAgICAgICAgICAgY2F0YWxvZ0lkOiB0aGlzLkxhbmRpbmdHbHVlRGF0YWJhc2UuY2F0YWxvZ0lkLFxuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25JbnB1dDogcHJvcHMuc291cmNlQ29ubmVjdGlvbklucHV0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmKHByb3BzLnNvdXJjZUNvbm5lY3Rpb25JbnB1dC5uYW1lKXtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uQXJyYXkucHVzaChwcm9wcy5zb3VyY2VDb25uZWN0aW9uSW5wdXQubmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy9cblxuICAgICAgICB0aGlzLkRhdGFTZXRHbHVlUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCBgJHtwcm9wcy5kYXRhU2V0TmFtZX0tR2x1ZVJvbGVgLCB7XG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZ2x1ZS5hbWF6b25hd3MuY29tJylcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5EYXRhU2V0R2x1ZVJvbGUuYWRkTWFuYWdlZFBvbGljeShpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NHbHVlU2VydmljZVJvbGUnKSk7XG4gICAgICAgIHRoaXMuRGF0YVNldEdsdWVSb2xlLmFkZE1hbmFnZWRQb2xpY3koaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdDbG91ZFdhdGNoQWdlbnRTZXJ2ZXJQb2xpY3knKSk7XG4gICAgICAgIHByb3BzLmRhdGFMYWtlQnVja2V0LmdyYW50UmVhZFdyaXRlKHRoaXMuRGF0YVNldEdsdWVSb2xlKTtcblxuXG4gICAgICAgIGlmKHR5cGVvZiBwcm9wcy5zb3VyY2VBY2Nlc3NQb2xpY3kgIT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgICAgIHByb3BzLnNvdXJjZUFjY2Vzc1BvbGljeS5hdHRhY2hUb1JvbGUodGhpcy5EYXRhU2V0R2x1ZVJvbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbGFuZGluZ0NyYXdsZXIgPSB0aGlzLnNldHVwQ3Jhd2xlcih0aGlzLkxhbmRpbmdHbHVlRGF0YWJhc2UsIHByb3BzLmRhdGFMYWtlTGFuZGluZ1RhcmdldHMsIHByb3BzLmxhbmRpbmdEYXRhYmFzZU5hbWUgfHwgXCJsYW5kaW5nXCIpO1xuXG4gICAgICAgIGNvbnN0IGdsdWVTY3JpcHQgPSBuZXcgczNhc3NldHMuQXNzZXQodGhpcywgYCR7cHJvcHMubGFuZGluZ0RhdGFiYXNlTmFtZX0tR2x1ZVNjcmlwdGAsIHtcbiAgICAgICAgICAgIHBhdGg6IHByb3BzLmdsdWVTdGFnaW5nU2NyaXB0UGF0aFxuICAgICAgICB9KTtcblxuICAgICAgICBnbHVlU2NyaXB0LmdyYW50UmVhZCh0aGlzLkRhdGFTZXRHbHVlUm9sZSk7XG5cbiAgICAgICAgY29uc3QgZ2x1ZVNjcmlwdEdvbGQgPSBuZXcgczNhc3NldHMuQXNzZXQodGhpcywgYCR7cHJvcHMubGFuZGluZ0RhdGFiYXNlTmFtZX0tR2x1ZS1TY3JpcHQtR29sZGAsIHtcbiAgICAgICAgICAgIHBhdGg6IHByb3BzLmdsdWVHb2xkU2NyaXB0UGF0aFxuICAgICAgICB9KTtcblxuICAgICAgICBnbHVlU2NyaXB0R29sZC5ncmFudFJlYWQodGhpcy5EYXRhU2V0R2x1ZVJvbGUpO1xuXG4gICAgICAgIC8vLyBUaGUgc3ByZWFkIG9wZXJhdG9yIGJlbG93ICguLi4pIG1ha2VzIHRoZSBjb25uZWN0aW9ucyBwcm9wZXJ0eSBjb25kaXRpb25hbC4gSXRzIG9ubHkgdXNlZCBmb3IgSkRCQyBzb3VyY2VzIGF0IHRoZSBtb21lbnQuXG4gICAgICAgIGNvbnN0IGpvYlBhcmFtcyA9IHtcbiAgICAgICAgICAgIGV4ZWN1dGlvblByb3BlcnR5OiB7XG4gICAgICAgICAgICAgICAgbWF4Q29uY3VycmVudFJ1bnM6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBuYW1lOiBgJHtwcm9wcy5sYW5kaW5nRGF0YWJhc2VOYW1lfV90b18ke3Byb3BzLnN0YWdpbmdEYXRhYmFzZU5hbWV9X2V0bGAsXG4gICAgICAgICAgICB0aW1lb3V0OiAyODgwLFxuICAgICAgICAgICAgZ2x1ZVZlcnNpb246IFwiMi4wXCIsXG4gICAgICAgICAgICBtYXhDYXBhY2l0eTogcHJvcHMubWF4RFBVcyxcbiAgICAgICAgICAgIGNvbW1hbmQ6IHtcbiAgICAgICAgICAgICAgICBzY3JpcHRMb2NhdGlvbjogYHMzOi8vJHtnbHVlU2NyaXB0LnMzQnVja2V0TmFtZX0vJHtnbHVlU2NyaXB0LnMzT2JqZWN0S2V5fWAsXG4gICAgICAgICAgICAgICAgbmFtZTogXCJnbHVlZXRsXCIsXG4gICAgICAgICAgICAgICAgcHl0aG9uVmVyc2lvbjogXCIzXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByb2xlOiB0aGlzLkRhdGFTZXRHbHVlUm9sZS5yb2xlQXJuLFxuICAgICAgICAgICAgbWF4UmV0cmllczogMCxcbiAgICAgICAgICAgIGRlZmF1bHRBcmd1bWVudHM6IHByb3BzLmdsdWVTdGFnaW5nU2NyaXB0QXJndW1lbnRzLFxuICAgICAgICAgICAgLi4uKHR5cGVvZiBwcm9wcy5zb3VyY2VDb25uZWN0aW9uSW5wdXQgIT09IFwidW5kZWZpbmVkXCIgJiYge1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25zOiBjb25uZWN0aW9uQXJyYXlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGxhbmRpbmdUb1N0YWdpbmdKb2IgPSBuZXcgZ2x1ZS5DZm5Kb2IodGhpcywgYCR7cHJvcHMubGFuZGluZ0RhdGFiYXNlTmFtZX0tRXRsSm9iYCwgam9iUGFyYW1zICk7XG5cbiAgICAgICAgY29uc3Qgc3RhZ2luZ0dsdWVDcmF3bGVyID0gdGhpcy5zZXR1cENyYXdsZXIodGhpcy5TdGFnaW5nR2x1ZURhdGFiYXNlLCB0aGlzLkRhdGFMYWtlU3RhZ2luZ1RhcmdldHMsIHByb3BzLnN0YWdpbmdEYXRhYmFzZU5hbWUgfHwgXCJzdGFnaW5nXCIpO1xuXG4gICAgICAgIGNvbnN0IGpvYlBhcmFtczIgPSB7XG4gICAgICAgICAgICBleGVjdXRpb25Qcm9wZXJ0eToge1xuICAgICAgICAgICAgICAgIG1heENvbmN1cnJlbnRSdW5zOiAxXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbmFtZTogXCJzdGFnaW5nX3RvX2dvbGRfZXRsXCIsXG4gICAgICAgICAgICB0aW1lb3V0OiAyODgwLFxuICAgICAgICAgICAgZ2x1ZVZlcnNpb246IFwiMi4wXCIsXG4gICAgICAgICAgICBtYXhDYXBhY2l0eTogcHJvcHMubWF4RFBVcyxcbiAgICAgICAgICAgIGNvbW1hbmQ6IHtcbiAgICAgICAgICAgICAgICBzY3JpcHRMb2NhdGlvbjogYHMzOi8vJHtnbHVlU2NyaXB0R29sZC5zM0J1Y2tldE5hbWV9LyR7Z2x1ZVNjcmlwdEdvbGQuczNPYmplY3RLZXl9YCxcbiAgICAgICAgICAgICAgICBuYW1lOiBcImdsdWVldGxcIixcbiAgICAgICAgICAgICAgICBweXRob25WZXJzaW9uOiBcIjNcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJvbGU6IHRoaXMuRGF0YVNldEdsdWVSb2xlLnJvbGVBcm4sXG4gICAgICAgICAgICBtYXhSZXRyaWVzOiAwLFxuICAgICAgICAgICAgZGVmYXVsdEFyZ3VtZW50czogcHJvcHMuZ2x1ZUdvbGRTY3JpcHRBcmd1bWVudHMsXG4gICAgICAgICAgICAuLi4odHlwZW9mIHByb3BzLnNvdXJjZUNvbm5lY3Rpb25JbnB1dCAhPT0gXCJ1bmRlZmluZWRcIiAmJiB7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbnM6IGNvbm5lY3Rpb25BcnJheVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgc3RhZ2luZ1RvR29sZEpvYiA9IG5ldyBnbHVlLkNmbkpvYih0aGlzLCBgJHtwcm9wcy5sYW5kaW5nRGF0YWJhc2VOYW1lfS1FdGxKb2IyYCwgam9iUGFyYW1zMiApO1xuXG4gICAgICAgIGNvbnN0IGdvbGRHbHVlQ3Jhd2xlciA9IHRoaXMuc2V0dXBDcmF3bGVyKHRoaXMuR29sZEdsdWVEYXRhYmFzZSwgdGhpcy5EYXRhTGFrZUdvbGRUYXJnZXRzLCBwcm9wcy5nb2xkRGF0YWJhc2VOYW1lIHx8IFwiZ29sZFwiKTtcblxuICAgICAgICBjb25zdCBkYXRhTGFrZVdvcmtmbG93ID0gbmV3IERhdGFMYWtlRW5yb2xsbWVudFdvcmtmbG93KHRoaXMsYCR7cHJvcHMuZGF0YVNldE5hbWV9RGF0YUxha2VXb3JrZmxvd2Ase1xuICAgICAgICAgICAgd29ya0Zsb3dOYW1lOiBgJHtwcm9wcy5kYXRhU2V0TmFtZX1fRGF0YUxha2VXb3JrZmxvd2AsXG4gICAgICAgICAgICBsYW5kaW5nQ3Jhd2xlcjogbGFuZGluZ0NyYXdsZXIsXG4gICAgICAgICAgICBsYW5kaW5nVG9TdGFnaW5nR2x1ZUpvYjogbGFuZGluZ1RvU3RhZ2luZ0pvYixcbiAgICAgICAgICAgIHN0YWdpbmdDcmF3bGVyOiBzdGFnaW5nR2x1ZUNyYXdsZXIsXG4gICAgICAgICAgICBzdGFnaW5nVG9Hb2xkR2x1ZUpvYjogc3RhZ2luZ1RvR29sZEpvYixcbiAgICAgICAgICAgIGdvbGRDcmF3bGVyOiBnb2xkR2x1ZUNyYXdsZXIsXG4gICAgICAgICAgICBXb3JrZmxvd0Nyb25TY2hlZHVsZUV4cHJlc3Npb246IHByb3BzLndvcmtmbG93Q3JvblNjaGVkdWxlRXhwcmVzc2lvblxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGF0YUxha2VXb3JrZmxvd0NvbnRleHQge1xuICAgIHdvcmtGbG93TmFtZTogc3RyaW5nO1xuICAgIGxhbmRpbmdDcmF3bGVyOiBnbHVlLkNmbkNyYXdsZXIsXG4gICAgbGFuZGluZ1RvU3RhZ2luZ0dsdWVKb2I6IGdsdWUuQ2ZuSm9iLFxuICAgIHN0YWdpbmdUb0dvbGRHbHVlSm9iOiBnbHVlLkNmbkpvYixcbiAgICBzdGFnaW5nQ3Jhd2xlcjogZ2x1ZS5DZm5DcmF3bGVyXG4gICAgZ29sZENyYXdsZXI6IGdsdWUuQ2ZuQ3Jhd2xlcixcbiAgICBXb3JrZmxvd0Nyb25TY2hlZHVsZUV4cHJlc3Npb24/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBEYXRhTGFrZUVucm9sbG1lbnRXb3JrZmxvdyBleHRlbmRzIGNkay5Db25zdHJ1Y3Qge1xuXG4gICAgcHVibGljIFN0YXJ0VHJpZ2dlcjogZ2x1ZS5DZm5UcmlnZ2VyO1xuICAgIHB1YmxpYyByZWFkb25seSBTcmNDcmF3bGVyQ29tcGxldGVUcmlnZ2VyOiBnbHVlLkNmblRyaWdnZXI7XG4gICAgcHVibGljIHJlYWRvbmx5IEVUTENvbXBsZXRlVHJpZ2dlcjogZ2x1ZS5DZm5UcmlnZ2VyO1xuICAgIHB1YmxpYyByZWFkb25seSBTdGFnaW5nQ3Jhd2xlckNvbXBsZXRlVHJpZ2dlcjogZ2x1ZS5DZm5UcmlnZ2VyO1xuICAgIHB1YmxpYyByZWFkb25seSBTdGFnaW5nVG9Hb2xkRXRsQ29tcGxldGVUcmlnZ2VyOiBnbHVlLkNmblRyaWdnZXI7XG4gICAgcHVibGljIHJlYWRvbmx5IFdvcmtmbG93OiBnbHVlLkNmbldvcmtmbG93O1xuXG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5Db25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBEYXRhTGFrZVdvcmtmbG93Q29udGV4dCkge1xuICAgICAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgICAgIHRoaXMuV29ya2Zsb3cgPSBuZXcgZ2x1ZS5DZm5Xb3JrZmxvdyh0aGlzLCBcImV0bFdvcmtmbG93XCIsIHtcbiAgICAgICAgICAgIG5hbWU6IHByb3BzLndvcmtGbG93TmFtZVxuICAgICAgICB9KTtcblxuICAgICAgICAvKiBMYW5kaW5nIENyYXdsZXIgVHJpZ2dlciAqL1xuICAgICAgICBpZihwcm9wcy5Xb3JrZmxvd0Nyb25TY2hlZHVsZUV4cHJlc3Npb24gPT0gbnVsbCl7XG4gICAgICAgICAgICB0aGlzLlN0YXJ0VHJpZ2dlciA9IG5ldyBnbHVlLkNmblRyaWdnZXIodGhpcyxcInN0YXJ0VHJpZ2dlclwiLHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyYXdsZXJOYW1lOiBwcm9wcy5sYW5kaW5nQ3Jhd2xlci5uYW1lXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwiT05fREVNQU5EXCIsXG4gICAgICAgICAgICAgICAgbmFtZTogYHN0YXJ0V29ya2Zsb3ctJHt0aGlzLldvcmtmbG93Lm5hbWV9YCxcbiAgICAgICAgICAgICAgICB3b3JrZmxvd05hbWU6IHRoaXMuV29ya2Zsb3cubmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgdGhpcy5TdGFydFRyaWdnZXIgPSBuZXcgZ2x1ZS5DZm5UcmlnZ2VyKHRoaXMsXCJzdGFydFRyaWdnZXJcIix7XG4gICAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjcmF3bGVyTmFtZTogcHJvcHMubGFuZGluZ0NyYXdsZXIubmFtZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB0eXBlOiBcIlNDSEVEVUxFRFwiLFxuICAgICAgICAgICAgICAgIHNjaGVkdWxlOiBwcm9wcy5Xb3JrZmxvd0Nyb25TY2hlZHVsZUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgbmFtZTogYHN0YXJ0V29ya2Zsb3ctJHt0aGlzLldvcmtmbG93Lm5hbWV9YCxcbiAgICAgICAgICAgICAgICB3b3JrZmxvd05hbWU6IHRoaXMuV29ya2Zsb3cubmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKiBFVEwgTGFuZGluZyB0byBTdGFnaW5nICovXG4gICAgICAgIHRoaXMuU3JjQ3Jhd2xlckNvbXBsZXRlVHJpZ2dlciA9IG5ldyBnbHVlLkNmblRyaWdnZXIodGhpcyxcInNyY0NyYXdsZXJDb21wbGV0ZVRyaWdnZXJcIix7XG4gICAgICAgICAgICBwcmVkaWNhdGU6IHtcbiAgICAgICAgICAgICAgICBjb25kaXRpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyYXdsZXJOYW1lOiBwcm9wcy5sYW5kaW5nQ3Jhd2xlci5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3Jhd2xTdGF0ZTogXCJTVUNDRUVERURcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljYWxPcGVyYXRvcjogXCJFUVVBTFNcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsb2dpY2FsOiBcIkFOWVwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbmFtZTogYHNvdXJjZURhdGFDcmF3bGVkLSR7dGhpcy5Xb3JrZmxvdy5uYW1lfWAsXG4gICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBqb2JOYW1lOiBwcm9wcy5sYW5kaW5nVG9TdGFnaW5nR2x1ZUpvYi5uYW1lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdvcmtmbG93TmFtZTogdGhpcy5Xb3JrZmxvdy5uYW1lLFxuICAgICAgICAgICAgdHlwZTogXCJDT05ESVRJT05BTFwiLFxuICAgICAgICAgICAgc3RhcnRPbkNyZWF0aW9uOiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qIENyYXdsZXIgZm9yIFN0YWdpbmcgbmV3IGZpbGVzICovXG4gICAgICAgIHRoaXMuRVRMQ29tcGxldGVUcmlnZ2VyID0gbmV3IGdsdWUuQ2ZuVHJpZ2dlcih0aGlzLFwiZXRsQ29tcGxldGVUcmlnZ2VyXCIse1xuICAgICAgICAgICAgcHJlZGljYXRlOiB7XG4gICAgICAgICAgICAgICAgY29uZGl0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZTogXCJTVUNDRUVERURcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljYWxPcGVyYXRvcjogXCJFUVVBTFNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGpvYk5hbWU6IHByb3BzLmxhbmRpbmdUb1N0YWdpbmdHbHVlSm9iLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbG9naWNhbDogXCJBTllcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5hbWU6IGBFdGxDb21wbGV0ZS0ke3RoaXMuV29ya2Zsb3cubmFtZX1gLFxuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY3Jhd2xlck5hbWU6IHByb3BzLnN0YWdpbmdDcmF3bGVyLm5hbWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd29ya2Zsb3dOYW1lOiB0aGlzLldvcmtmbG93Lm5hbWUsXG4gICAgICAgICAgICB0eXBlOiBcIkNPTkRJVElPTkFMXCJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyogRVRMIFN0YWdpbmcgdG8gR29sZCAqL1xuICAgICAgICB0aGlzLlN0YWdpbmdDcmF3bGVyQ29tcGxldGVUcmlnZ2VyID0gbmV3IGdsdWUuQ2ZuVHJpZ2dlcih0aGlzLFwic3RhZ2luZ0NyYXdsZXJDb21wbGV0ZVRyaWdnZXJcIix7XG4gICAgICAgICAgICBwcmVkaWNhdGU6IHtcbiAgICAgICAgICAgICAgICBjb25kaXRpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyYXdsZXJOYW1lOiBwcm9wcy5zdGFnaW5nQ3Jhd2xlci5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3Jhd2xTdGF0ZTogXCJTVUNDRUVERURcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljYWxPcGVyYXRvcjogXCJFUVVBTFNcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsb2dpY2FsOiBcIkFOWVwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbmFtZTogYHN0YWdpbmdEYXRhQ3Jhd2xlZC0ke3RoaXMuV29ya2Zsb3cubmFtZX1gLFxuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgam9iTmFtZTogcHJvcHMuc3RhZ2luZ1RvR29sZEdsdWVKb2IubmFtZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3b3JrZmxvd05hbWU6IHRoaXMuV29ya2Zsb3cubmFtZSxcbiAgICAgICAgICAgIHR5cGU6IFwiQ09ORElUSU9OQUxcIixcbiAgICAgICAgICAgIHN0YXJ0T25DcmVhdGlvbjogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICAvKiBDcmF3bGVyIGZvciBHb2xkIG5ldyBmaWxlcyAqL1xuICAgICAgICB0aGlzLlN0YWdpbmdUb0dvbGRFdGxDb21wbGV0ZVRyaWdnZXIgPSBuZXcgZ2x1ZS5DZm5UcmlnZ2VyKHRoaXMsXCJzdGFnaW5nVG9Hb2xkQ29tcGxldGVUcmlnZ2VyXCIse1xuICAgICAgICAgICAgcHJlZGljYXRlOiB7XG4gICAgICAgICAgICAgICAgY29uZGl0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZTogXCJTVUNDRUVERURcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljYWxPcGVyYXRvcjogXCJFUVVBTFNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGpvYk5hbWU6IHByb3BzLnN0YWdpbmdUb0dvbGRHbHVlSm9iLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbG9naWNhbDogXCJBTllcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5hbWU6IGBTdGFnaW5nVG9Hb2xkRXRsQ29tcGxldGVUcmlnZ2VyLSR7dGhpcy5Xb3JrZmxvdy5uYW1lfWAsXG4gICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjcmF3bGVyTmFtZTogcHJvcHMuZ29sZENyYXdsZXIubmFtZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3b3JrZmxvd05hbWU6IHRoaXMuV29ya2Zsb3cubmFtZSxcbiAgICAgICAgICAgIHR5cGU6IFwiQ09ORElUSU9OQUxcIlxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8qIFNldCBkZXBlbmRlbmNpZXMgZm9yIHdhaXQgdGhlIHdvcmtmbG93IHJlc291cmNlIGNyZWF0aW9uIHVzZWQgaW4gc3RlcHMgZGVmaW5pdGlvbiAqL1xuICAgICAgICB0aGlzLlN0YXJ0VHJpZ2dlci5ub2RlLmFkZERlcGVuZGVuY3kodGhpcy5Xb3JrZmxvdyk7XG4gICAgICAgIHRoaXMuU3JjQ3Jhd2xlckNvbXBsZXRlVHJpZ2dlci5ub2RlLmFkZERlcGVuZGVuY3kodGhpcy5Xb3JrZmxvdyk7XG4gICAgICAgIHRoaXMuRVRMQ29tcGxldGVUcmlnZ2VyLm5vZGUuYWRkRGVwZW5kZW5jeSh0aGlzLldvcmtmbG93KTtcbiAgICAgICAgdGhpcy5TdGFnaW5nQ3Jhd2xlckNvbXBsZXRlVHJpZ2dlci5ub2RlLmFkZERlcGVuZGVuY3kodGhpcy5Xb3JrZmxvdyk7XG4gICAgICAgIHRoaXMuU3RhZ2luZ1RvR29sZEV0bENvbXBsZXRlVHJpZ2dlci5ub2RlLmFkZERlcGVuZGVuY3kodGhpcy5Xb3JrZmxvdyk7XG5cbiAgICAgICAgY29uc3QgYWN0aXZhdGVUcmlnZ2VyUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnYWN0aXZhdGVUcmlnZ2VyUm9sZScsIHtcbiAgICAgICAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFjdGl2YXRlVHJpZ2dlclJvbGUuYWRkTWFuYWdlZFBvbGljeShpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKSk7XG5cbiAgICAgICAgYWN0aXZhdGVUcmlnZ2VyUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgICAgICAgYWN0aW9uczogWydnbHVlOlN0YXJ0VHJpZ2dlciddXG4gICAgICAgIH0pKTtcblxuXG4gICAgICAgIGNvbnN0IGFjdGl2YXRlVHJpZ2dlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5TaW5nbGV0b25GdW5jdGlvbih0aGlzLCAnYWN0aXZhdGVUcmlnZ2VyU2luZ2xldG9uJywge1xuICAgICAgICAgICAgcm9sZTogYWN0aXZhdGVUcmlnZ2VyUm9sZSxcbiAgICAgICAgICAgIHV1aWQ6IFwiQWN0aXZhdGVHbHVlVHJpZ2dlckZ1bmN0aW9uXCIsXG4gICAgICAgICAgICBjb2RlOiBuZXcgbGFtYmRhLklubGluZUNvZGUoZnMucmVhZEZpbGVTeW5jKCcuL2xpYi9kYXRhbGFrZS9zY3JpcHRzL2xhbWJkYS5hY3RpdmF0ZWdsdWV0aWdnZXIucHknLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pKSxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5tYWluJyxcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM183LFxuICAgICAgICAgICAgbWVtb3J5U2l6ZTogMTAyNFxuICAgICAgICB9KTtcblxuICAgICAgICBpZihwcm9wcy5Xb3JrZmxvd0Nyb25TY2hlZHVsZUV4cHJlc3Npb24gIT0gbnVsbCl7XG4gICAgICAgICAgICBjb25zdCBDcm9uVHJpZ2dlcl90cmlnZ2VyQWN0aXZhdGlvbiA9IG5ldyBjZm4uQ3VzdG9tUmVzb3VyY2UodGhpcywgJ0Nyb25UcmlnZ2VyLXRyaWdnZXJBY3RpdmF0aW9uJywgIHtcbiAgICAgICAgICAgICAgICBwcm92aWRlcjogY2ZuLkN1c3RvbVJlc291cmNlUHJvdmlkZXIubGFtYmRhKGFjdGl2YXRlVHJpZ2dlckZ1bmN0aW9uKSxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgIHRyaWdnZXJJZDogdGhpcy5TdGFydFRyaWdnZXIubmFtZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3JjQ3Jhd2xlckNvbXBsZXRlVHJpZ2dlcl90cmlnZ2VyQWN0aXZhdGlvbiA9IG5ldyBjZm4uQ3VzdG9tUmVzb3VyY2UodGhpcywgJ3NyY0NyYXdsZXJDb21wbGV0ZVRyaWdnZXItdHJpZ2dlckFjdGl2YXRpb24nLCAge1xuICAgICAgICAgICAgcHJvdmlkZXI6IGNmbi5DdXN0b21SZXNvdXJjZVByb3ZpZGVyLmxhbWJkYShhY3RpdmF0ZVRyaWdnZXJGdW5jdGlvbiksXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgdHJpZ2dlcklkOiB0aGlzLlNyY0NyYXdsZXJDb21wbGV0ZVRyaWdnZXIubmFtZVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBldGxUcmlnZ2VyX3RyaWdnZXJBY3RpdmF0aW9uID0gbmV3IGNmbi5DdXN0b21SZXNvdXJjZSh0aGlzLCAnZXRsVHJpZ2dlci10cmlnZ2VyQWN0aXZhdGlvbicsICB7XG4gICAgICAgICAgICBwcm92aWRlcjogY2ZuLkN1c3RvbVJlc291cmNlUHJvdmlkZXIubGFtYmRhKGFjdGl2YXRlVHJpZ2dlckZ1bmN0aW9uKSxcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICB0cmlnZ2VySWQ6IHRoaXMuRVRMQ29tcGxldGVUcmlnZ2VyLm5hbWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufSJdfQ==