import * as cdk from '@aws-cdk/core';
import s3 = require('@aws-cdk/aws-s3');
import glue = require('@aws-cdk/aws-glue');
import lambda = require('@aws-cdk/aws-lambda');
import iam = require('@aws-cdk/aws-iam');
import cfn = require("@aws-cdk/aws-cloudformation");
import fs = require('fs');
import s3assets = require('@aws-cdk/aws-s3-assets');

export interface DataSetEnrollmentProps extends cdk.StackProps {
    dataLakeBucket: s3.Bucket;
    dataSetName: string;
    databaseDestination: string;
    DatabaseGold: string;
    SourceConnectionInput?: glue.CfnConnection.ConnectionInputProperty;
    SourceTargets: glue.CfnCrawler.TargetsProperty;
    DataLakeTargets: glue.CfnCrawler.TargetsProperty;
    DataLakeGoldTargets: glue.CfnCrawler.TargetsProperty;
    GlueScriptPath: string;
    GlueScriptArguments: any;
    GlueScriptPathGold: string;
    GlueScriptArgumentsGold: any;
    SourceAccessPolicy?: iam.Policy;
    MaxDPUs: number;
    WorkflowCronScheduleExpression?: string;
}

/**
 * Registro de los Jobs en Glue
 */
export class DatasetGlueRegistration extends cdk.Construct {

    public readonly Workflow: DataLakeEnrollmentWorkflow;
    public readonly SrcCrawlerCompleteTrigger: glue.CfnTrigger;
    public readonly ETLCompleteTrigger: glue.CfnTrigger;
    public readonly SourceConnection?: glue.CfnConnection;
    public readonly DataLakeConnection: glue.CfnConnection;
    public readonly LandingDatabase: string;
    public readonly DataSetGlueRole: iam.Role;
    public readonly Dataset_Source: glue.Database;
    public readonly Dataset_Datalake: glue.Database;
    public readonly GoldGlueDatabase: glue.Database;
    public readonly StaggingDatabase: string;
    public readonly DataLakeBucketName: string;
    public readonly DataLakePrefix: string;
    public readonly DataLakeTargets: glue.CfnCrawler.TargetsProperty;
    public readonly DataLakeGoldTargets : glue.CfnCrawler.TargetsProperty;


    /* Creates a Glue Crawler bassed in */
    private setupCrawler(targetGlueDatabase: glue.Database, targets: glue.CfnCrawler.TargetsProperty, crawlerName :string) {//isSourceCrawler: boolean){

        //TODO: Fix this.DataSetName : this.DatabaseDestination;
        //const sourceCrawler  = isSourceCrawler ? "raw" : "stagging";

        return new glue.CfnCrawler(this,  `${crawlerName}-crawler`,{
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

    constructor(scope: cdk.Construct, id: string, props: DataSetEnrollmentProps) {
        super(scope, id);

        this.DataLakeGoldTargets = props.DataLakeGoldTargets;
        this.DataLakeTargets = props.DataLakeTargets;
        this.DataLakeBucketName	= props.GlueScriptArguments['--DL_BUCKET'];

        this.DataLakePrefix = props.GlueScriptArguments['--DL_PREFIX'];
        this.StaggingDatabase = props.databaseDestination;
        this.LandingDatabase = props.dataSetName;

        this.Dataset_Source = new glue.Database(this, `${props.dataSetName}_origin`, {
            databaseName: props.dataSetName,
            locationUri: `s3://${props.dataLakeBucket.bucketName}/${props.dataSetName}/`
        });

        this.Dataset_Datalake = new glue.Database(this, `${props.dataSetName}_destination`, {
            databaseName: props.databaseDestination,
            locationUri: `s3://${props.dataLakeBucket.bucketName}/${props.databaseDestination}/`
        });

        this.GoldGlueDatabase = new glue.Database(this, `${props.dataSetName}_${props.DatabaseGold}`, {
            databaseName: props.DatabaseGold,
            locationUri: `s3://${props.dataLakeBucket.bucketName}/${props.DatabaseGold}/`
        });


        let connectionArray = [];


        if(props.SourceConnectionInput){
            this.SourceConnection = new glue.CfnConnection(this, `${props.dataSetName}-src-deonnection`, {
                catalogId: this.Dataset_Source.catalogId,
                connectionInput: props.SourceConnectionInput
            });
            if(props.SourceConnectionInput.name){
                connectionArray.push(props.SourceConnectionInput.name);
            }
        }


        this.DataSetGlueRole = new iam.Role(this, `${props.dataSetName}-GlueRole`, {
            assumedBy: new iam.ServicePrincipal('glue.amazonaws.com')
        });

        this.DataSetGlueRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'));
        this.DataSetGlueRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
        props.dataLakeBucket.grantReadWrite(this.DataSetGlueRole);


        if(typeof props.SourceAccessPolicy !== 'undefined'){
            props.SourceAccessPolicy.attachToRole(this.DataSetGlueRole);
        }

        const landingCrawler = this.setupCrawler(this.Dataset_Source, props.SourceTargets, props.dataSetName);

        const glueScript = new s3assets.Asset(this, `${props.dataSetName}-GlueScript`, {
            path: props.GlueScriptPath
        });

        glueScript.grantRead(this.DataSetGlueRole);

        const glueScriptGold = new s3assets.Asset(this, `${props.dataSetName}-Glue-Script-Gold`, {
            path: props.GlueScriptPathGold
        });

        glueScriptGold.grantRead(this.DataSetGlueRole);

        /// The spread operator below (...) makes the connections property conditional. Its only used for JDBC sources at the moment.
        const jobParams = {
            executionProperty: {
                maxConcurrentRuns: 1
            },
            name: `${props.dataSetName}_to_${props.databaseDestination}_etl`, //TODO:Change name
            timeout: 2880,
            glueVersion: "2.0",
            maxCapacity: props.MaxDPUs,
            command: {
                scriptLocation: `s3://${glueScript.s3BucketName}/${glueScript.s3ObjectKey}`,
                name: "glueetl",
                pythonVersion: "3"
            },
            role: this.DataSetGlueRole.roleArn,
            maxRetries: 0,
            defaultArguments: props.GlueScriptArguments,
            ...(typeof props.SourceConnectionInput !== "undefined" && {
                connections: {
                    connections: connectionArray
                }
            })
        };

        const landingToStaggingJob = new glue.CfnJob(this, `${props.dataSetName}-EtlJob`, jobParams );

        const staggingGlueCrawler = this.setupCrawler(this.Dataset_Datalake, this.DataLakeTargets, this.StaggingDatabase);

        const jobParams2 = {
            executionProperty: {
                maxConcurrentRuns: 1
            },
            name: "stagging_to_gold_etl",
            timeout: 2880,
            glueVersion: "2.0",
            maxCapacity: props.MaxDPUs,
            command: {
                scriptLocation: `s3://${glueScriptGold.s3BucketName}/${glueScriptGold.s3ObjectKey}`,
                name: "glue-etl-stagging-to-gold",
                pythonVersion: "3"
            },
            role: this.DataSetGlueRole.roleArn,
            maxRetries: 0,
            defaultArguments: props.GlueScriptArgumentsGold,
            ...(typeof props.SourceConnectionInput !== "undefined" && {
                connections: {
                    connections: connectionArray
                }
            })
        };

        const staggingToGoldJob = new glue.CfnJob(this, `${props.dataSetName}-EtlJob2`, jobParams2 );

        const goldGlueCrawler = this.setupCrawler(this.GoldGlueDatabase, this.DataLakeGoldTargets, props.DatabaseGold);

        const datalakeEnrollmentWorkflow = new DataLakeEnrollmentWorkflow(this,`${props.dataSetName}DataLakeWorkflow`,{
            WorkFlowName: `${props.dataSetName}_DataLakeEnrollmentWorkflow`,
            LandingCrawler: landingCrawler,
            LandingToStaggingGlueJob: landingToStaggingJob,
            StaggingCrawler: staggingGlueCrawler,
            StaggingToGoldGlueJob: staggingToGoldJob,
            GoldCrawler: goldGlueCrawler,
            WorkflowCronScheduleExpression: props.WorkflowCronScheduleExpression
        });
    }
}

export interface DataLakeEnrollmentWorkflowProps {
    WorkFlowName: string;
    LandingCrawler: glue.CfnCrawler,
    LandingToStaggingGlueJob: glue.CfnJob,
    StaggingToGoldGlueJob: glue.CfnJob,
    StaggingCrawler: glue.CfnCrawler
    GoldCrawler: glue.CfnCrawler,
    WorkflowCronScheduleExpression?: string;
}

export class DataLakeEnrollmentWorkflow extends cdk.Construct {

    public StartTrigger: glue.CfnTrigger;
    public readonly SrcCrawlerCompleteTrigger: glue.CfnTrigger;
    public readonly ETLCompleteTrigger: glue.CfnTrigger;
    public readonly StaggingCrawlerCompleteTrigger: glue.CfnTrigger;
    public readonly StaggingToGoldEtlCompleteTrigger: glue.CfnTrigger;
    public readonly Workflow: glue.CfnWorkflow;

    constructor(scope: cdk.Construct, id: string, props: DataLakeEnrollmentWorkflowProps) {
        super(scope, id);

        this.Workflow = new glue.CfnWorkflow(this, "etlWorkflow", {
            name: props.WorkFlowName
        });

        /* Landing Crawler Trigger */
        if(props.WorkflowCronScheduleExpression == null){
            this.StartTrigger = new glue.CfnTrigger(this,"startTrigger",{
                actions: [
                    {
                        crawlerName: props.LandingCrawler.name
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
                        crawlerName: props.LandingCrawler.name
                    }
                ],
                type: "SCHEDULED",
                schedule: props.WorkflowCronScheduleExpression,
                name: `startWorkflow-${this.Workflow.name}`,
                workflowName: this.Workflow.name
            });
        }

        /* ETL Landing to Stagging */
        this.SrcCrawlerCompleteTrigger = new glue.CfnTrigger(this,"srcCrawlerCompleteTrigger",{
            predicate: {
                conditions: [
                    {
                        crawlerName: props.LandingCrawler.name,
                        crawlState: "SUCCEEDED",
                        logicalOperator: "EQUALS"
                    }
                ],
                logical: "ANY"
            },
            name: `sourceDataCrawled-${this.Workflow.name}`,
            actions: [
                {
                    jobName: props.LandingToStaggingGlueJob.name
                }
            ],
            workflowName: this.Workflow.name,
            type: "CONDITIONAL",
            startOnCreation: true
        });

        /* Crawler for Stagging new files */
        this.ETLCompleteTrigger = new glue.CfnTrigger(this,"etlCompleteTrigger",{
            predicate: {
                conditions: [
                    {
                        state: "SUCCEEDED",
                        logicalOperator: "EQUALS",
                        jobName: props.LandingToStaggingGlueJob.name
                    }
                ],
                logical: "ANY"
            },
            name: `EtlComplete-${this.Workflow.name}`,
            actions: [
                {
                    crawlerName: props.StaggingCrawler.name
                }
            ],
            workflowName: this.Workflow.name,
            type: "CONDITIONAL"
        });

        /* ETL Stagging to Gold */
        this.StaggingCrawlerCompleteTrigger = new glue.CfnTrigger(this,"staggingCrawlerCompleteTrigger",{
            predicate: {
                conditions: [
                    {
                        crawlerName: props.StaggingCrawler.name,
                        crawlState: "SUCCEEDED",
                        logicalOperator: "EQUALS"
                    }
                ],
                logical: "ANY"
            },
            name: `staggingDataCrawled-${this.Workflow.name}`,
            actions: [
                {
                    jobName: props.StaggingToGoldGlueJob.name
                }
            ],
            workflowName: this.Workflow.name,
            type: "CONDITIONAL",
            startOnCreation: true
        });

        /* Crawler for Gold new files */
        this.StaggingToGoldEtlCompleteTrigger = new glue.CfnTrigger(this,"staggingToGoldCompleteTrigger",{
            predicate: {
                conditions: [
                    {
                        state: "SUCCEEDED",
                        logicalOperator: "EQUALS",
                        jobName: props.StaggingToGoldGlueJob.name
                    }
                ],
                logical: "ANY"
            },
            name: `StaggingToGoldEtlCompleteTrigger-${this.Workflow.name}`,
            actions: [
                {
                    crawlerName: props.GoldCrawler.name
                }
            ],
            workflowName: this.Workflow.name,
            type: "CONDITIONAL"
        });


        /* Set dependencies for wait the workflow resource creation used in steps definition */
        this.StartTrigger.node.addDependency(this.Workflow);
        this.SrcCrawlerCompleteTrigger.node.addDependency(this.Workflow);
        this.ETLCompleteTrigger.node.addDependency(this.Workflow);
        this.StaggingCrawlerCompleteTrigger.node.addDependency(this.Workflow);
        this.StaggingToGoldEtlCompleteTrigger.node.addDependency(this.Workflow);


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