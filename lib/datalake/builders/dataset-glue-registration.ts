import * as cdk from '@aws-cdk/core';
// import kms = require('@aws-cdk/aws-kms');
import s3 = require('@aws-cdk/aws-s3');
import glue = require('@aws-cdk/aws-glue');
import lambda = require('@aws-cdk/aws-lambda');
import iam = require('@aws-cdk/aws-iam');
import cfn = require("@aws-cdk/aws-cloudformation");
import fs = require('fs');
import s3assets = require('@aws-cdk/aws-s3-assets');
// import {CfnDataCatalogEncryptionSettings} from "@aws-cdk/aws-glue";

export interface DataSetRegistrationProps extends cdk.StackProps {
    dataLakeBucket: s3.Bucket;
    dataSetName: string;
    landingDatabaseName: string;
    stagingDatabaseName: string;
    goldDatabaseName: string;
    sourceConnectionInput?: glue.CfnConnection.ConnectionInputProperty;
    dataLakeLandingTargets: glue.CfnCrawler.TargetsProperty;
    dataLakeStagingTargets: glue.CfnCrawler.TargetsProperty;
    dataLakeGoldTargets: glue.CfnCrawler.TargetsProperty;
    glueStagingScriptPath: string;
    glueStagingScriptArguments: any;
    glueGoldScriptPath: string;
    glueGoldScriptArguments: any;
    sourceAccessPolicy?: iam.Policy;
    maxDPUs: number;
    workflowCronScheduleExpression?: string;
}

/**
 * Registro de los Jobs en Glue
 */
export class DatasetGlueRegistration extends cdk.Construct {

    public readonly LandingGlueDatabase: glue.Database;
    public readonly StagingGlueDatabase: glue.Database;
    public readonly GoldGlueDatabase: glue.Database;

    public readonly Workflow: DataLakeEnrollmentWorkflow;
    public readonly SrcCrawlerCompleteTrigger: glue.CfnTrigger;
    public readonly ETLCompleteTrigger: glue.CfnTrigger;
    public readonly SourceConnection?: glue.CfnConnection;
    public readonly DataLakeConnection: glue.CfnConnection;

    public readonly DataSetGlueRole: iam.Role;

    public readonly DataLakeBucketName: string;
    public readonly DataLakePrefix: string;
    public readonly DataLakeStagingTargets: glue.CfnCrawler.TargetsProperty;
    public readonly DataLakeGoldTargets : glue.CfnCrawler.TargetsProperty;


    /* Creates a Glue Crawler bassed in */
    private setupCrawler(targetGlueDatabase: glue.Database, targets: glue.CfnCrawler.TargetsProperty, crawlerName :string) {

        return new glue.CfnCrawler(this,`${crawlerName}-crawler`,{
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

    constructor(scope: cdk.Construct, id: string, props: DataSetRegistrationProps) {
        super(scope, id);

        this.DataLakeGoldTargets = props.dataLakeGoldTargets;
        this.DataLakeStagingTargets = props.dataLakeStagingTargets;
        this.DataLakeBucketName	= props.glueStagingScriptArguments['--DL_BUCKET'];

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
        if(props.sourceConnectionInput){
            this.SourceConnection = new glue.CfnConnection(this, `${props.dataSetName}-src-deonnection`, {
                catalogId: this.LandingGlueDatabase.catalogId,
                connectionInput: props.sourceConnectionInput
            });
            if(props.sourceConnectionInput.name){
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


        if(typeof props.sourceAccessPolicy !== 'undefined'){
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

        const landingToStagingJob = new glue.CfnJob(this, `${props.landingDatabaseName}-EtlJob`, jobParams );

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

        const stagingToGoldJob = new glue.CfnJob(this, `${props.landingDatabaseName}-EtlJob2`, jobParams2 );

        const goldGlueCrawler = this.setupCrawler(this.GoldGlueDatabase, this.DataLakeGoldTargets, props.goldDatabaseName || "gold");

        const dataLakeWorkflow = new DataLakeEnrollmentWorkflow(this,`${props.dataSetName}DataLakeWorkflow`,{
            workFlowName: `${props.dataSetName}_DataLakeWorkflow`,
            landingCrawler: landingCrawler,
            landingToStagingGlueJob: landingToStagingJob,
            stagingCrawler: stagingGlueCrawler,
            stagingToGoldGlueJob: stagingToGoldJob,
            goldCrawler: goldGlueCrawler,
            WorkflowCronScheduleExpression: props.workflowCronScheduleExpression
        });
    }
}

export interface DataLakeWorkflowContext {
    workFlowName: string;
    landingCrawler: glue.CfnCrawler,
    landingToStagingGlueJob: glue.CfnJob,
    stagingToGoldGlueJob: glue.CfnJob,
    stagingCrawler: glue.CfnCrawler
    goldCrawler: glue.CfnCrawler,
    WorkflowCronScheduleExpression?: string;
}

export class DataLakeEnrollmentWorkflow extends cdk.Construct {

    public StartTrigger: glue.CfnTrigger;
    public readonly SrcCrawlerCompleteTrigger: glue.CfnTrigger;
    public readonly ETLCompleteTrigger: glue.CfnTrigger;
    public readonly StagingCrawlerCompleteTrigger: glue.CfnTrigger;
    public readonly StagingToGoldEtlCompleteTrigger: glue.CfnTrigger;
    public readonly Workflow: glue.CfnWorkflow;

    constructor(scope: cdk.Construct, id: string, props: DataLakeWorkflowContext) {
        super(scope, id);

        this.Workflow = new glue.CfnWorkflow(this, "etlWorkflow", {
            name: props.workFlowName
        });

        /* Landing Crawler Trigger */
        if(props.WorkflowCronScheduleExpression == null){
            this.StartTrigger = new glue.CfnTrigger(this,"startTrigger",{
                actions: [
                    {
                        crawlerName: props.landingCrawler.name
                    }
                ],
                type: "ON_DEMAND",
                name: `startWorkflow-${this.Workflow.name}`,
                workflowName: this.Workflow.name
            });
        }else{
            this.StartTrigger = new glue.CfnTrigger(this,"startTrigger",{
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
        this.SrcCrawlerCompleteTrigger = new glue.CfnTrigger(this,"srcCrawlerCompleteTrigger",{
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
        this.ETLCompleteTrigger = new glue.CfnTrigger(this,"etlCompleteTrigger",{
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
        this.StagingCrawlerCompleteTrigger = new glue.CfnTrigger(this,"stagingCrawlerCompleteTrigger",{
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
        this.StagingToGoldEtlCompleteTrigger = new glue.CfnTrigger(this,"stagingToGoldCompleteTrigger",{
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

        if(props.WorkflowCronScheduleExpression != null){
            const CronTrigger_triggerActivation = new cfn.CustomResource(this, 'CronTrigger-triggerActivation',  {
                provider: cfn.CustomResourceProvider.lambda(activateTriggerFunction),
                properties: {
                    triggerId: this.StartTrigger.name
                }
            });
        }

        const srcCrawlerCompleteTrigger_triggerActivation = new cfn.CustomResource(this, 'srcCrawlerCompleteTrigger-triggerActivation',  {
            provider: cfn.CustomResourceProvider.lambda(activateTriggerFunction),
            properties: {
                triggerId: this.SrcCrawlerCompleteTrigger.name
            }
        });

        const etlTrigger_triggerActivation = new cfn.CustomResource(this, 'etlTrigger-triggerActivation',  {
            provider: cfn.CustomResourceProvider.lambda(activateTriggerFunction),
            properties: {
                triggerId: this.ETLCompleteTrigger.name
            }
        });
    }
}