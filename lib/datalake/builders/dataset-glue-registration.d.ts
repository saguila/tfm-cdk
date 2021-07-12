import * as cdk from '@aws-cdk/core';
import s3 = require('@aws-cdk/aws-s3');
import glue = require('@aws-cdk/aws-glue');
import iam = require('@aws-cdk/aws-iam');
export interface DataSetEnrollmentProps extends cdk.StackProps {
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
export declare class DatasetGlueRegistration extends cdk.Construct {
    readonly LandingGlueDatabase: glue.Database;
    readonly StagingGlueDatabase: glue.Database;
    readonly GoldGlueDatabase: glue.Database;
    readonly Workflow: DataLakeEnrollmentWorkflow;
    readonly SrcCrawlerCompleteTrigger: glue.CfnTrigger;
    readonly ETLCompleteTrigger: glue.CfnTrigger;
    readonly SourceConnection?: glue.CfnConnection;
    readonly DataLakeConnection: glue.CfnConnection;
    readonly DataSetGlueRole: iam.Role;
    readonly DataLakeBucketName: string;
    readonly DataLakePrefix: string;
    readonly DataLakeStagingTargets: glue.CfnCrawler.TargetsProperty;
    readonly DataLakeGoldTargets: glue.CfnCrawler.TargetsProperty;
    private setupCrawler;
    constructor(scope: cdk.Construct, id: string, props: DataSetEnrollmentProps);
}
export interface DataLakeWorkflowContext {
    workFlowName: string;
    landingCrawler: glue.CfnCrawler;
    landingToStagingGlueJob: glue.CfnJob;
    stagingToGoldGlueJob: glue.CfnJob;
    stagingCrawler: glue.CfnCrawler;
    goldCrawler: glue.CfnCrawler;
    WorkflowCronScheduleExpression?: string;
}
export declare class DataLakeEnrollmentWorkflow extends cdk.Construct {
    StartTrigger: glue.CfnTrigger;
    readonly SrcCrawlerCompleteTrigger: glue.CfnTrigger;
    readonly ETLCompleteTrigger: glue.CfnTrigger;
    readonly StagingCrawlerCompleteTrigger: glue.CfnTrigger;
    readonly StagingToGoldEtlCompleteTrigger: glue.CfnTrigger;
    readonly Workflow: glue.CfnWorkflow;
    constructor(scope: cdk.Construct, id: string, props: DataLakeWorkflowContext);
}
