import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import glue = require('@aws-cdk/aws-glue');
import s3 = require('@aws-cdk/aws-s3');

import { DataLakeConfRegistration } from './data-lake-conf-registration';
import lakeformation = require("@aws-cdk/aws-lakeformation");
import { DatasetGlueRegistration } from './dataset-glue-registration';


export interface S3dataSetProps extends DataLakeConfRegistration.DataLakeConfProps {
    sourceBucket: s3.IBucket;
    sourceBucketDataPrefixes: string[];
    maxDPUs: number;
    databaseLandingName: string;
    databaseStagingName: string;
    databaseGoldName: string;
}

/**
 * Gestor de los permisos de S3 para el dataset
 */
export class S3DatasetRegistration extends DataLakeConfRegistration {

    private readonly sourceBucket: s3.IBucket;

    constructor(scope: cdk.Construct, id: string, props: S3dataSetProps) {
        super(scope, id, props);

        /* The dataset name must be match with the root location in s3 */
        const dataSetName = props.dataSetName;

        /* Access Policy with permissions list & get for attach to Glue Role (Crawlers)*/
        const s3AccessPolicy = new iam.Policy(this, 'dataSourceAccessPolicy');

        let s3TargetPaths = new Array<glue.CfnCrawler.S3TargetProperty>();
        let s3DataLakeStagingPaths = new Array<glue.CfnCrawler.S3TargetProperty>();
        let s3DataLakeGoldPaths = new Array<glue.CfnCrawler.S3TargetProperty>();

        /* Add permission for list the target bucket */
        const bucketListPolicy = new iam.PolicyStatement({
            actions: ["s3:ListBucket"],
            effect: iam.Effect.ALLOW,
            resources: [`arn:aws:s3:::${props.sourceBucket.bucketName}`]
        });

        /* Deploy the policy to list the target bucket */
        s3AccessPolicy.addStatements(bucketListPolicy);

        /* Add permissions for get objects in all locations of target Bucket  */
        const prefixAccessPolicy = new iam.PolicyStatement({
            actions: ["s3:GetObject"],
            effect: iam.Effect.ALLOW,
            resources: [`arn:aws:s3:::${props.sourceBucket.bucketName}/*`]
        });

        /* Deploy the policy for get objects in the target Bucket*/
        s3AccessPolicy.addStatements(prefixAccessPolicy);

        /* Obtain all origin path for needed as input for Glue ETL & Crawlers */
        for(let bucketPrefix of props.sourceBucketDataPrefixes){
            s3TargetPaths.push({
                path: `s3://${props.sourceBucket.bucketName}${bucketPrefix}`
            });

            var prefixFolders = bucketPrefix.split('/')
            var tableFolderName = prefixFolders[prefixFolders.length-2]
            var tableFolderName = tableFolderName.toLowerCase().replace(/\//g,"_").replace(/-/g,"_");
            /* If has more child folders into input folder */
            if(props.sourceBucketDataPrefixes.length > 1){
                /* Path for Staging database Datasets */
                s3DataLakeStagingPaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.databaseStagingName}/${tableFolderName}/`
                });
                /* Path for Gold database Datasets */
                s3DataLakeGoldPaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.databaseGoldName}/${tableFolderName}/`
                });
            }else{
                /* Paths for Staging database Datasets */
                s3DataLakeStagingPaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.databaseStagingName}/`
                });
                /* Paths for Gold database Datasets */
                s3DataLakeGoldPaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.databaseGoldName}/`
                });
            }
        }

        this.DataRegistration = new DatasetGlueRegistration(this, `${props.dataSetName}-s3Enrollment`, {
            dataSetName: props.dataSetName,
            dataLakeBucket: props.dataLakeBucket,
            goldDatabaseName: props.databaseGoldName,
            stagingDatabaseName: props.databaseStagingName,
            landingDatabaseName: props.databaseLandingName,
            sourceAccessPolicy: s3AccessPolicy,
            dataLakeLandingTargets: {
                s3Targets: s3TargetPaths,
            },
            maxDPUs: props.maxDPUs,
            glueStagingScriptPath: props.glueStagingScriptPath,
            dataLakeStagingTargets: {
                s3Targets: s3DataLakeStagingPaths
            },
            dataLakeGoldTargets: {
                s3Targets: s3DataLakeGoldPaths
            },
            glueStagingScriptArguments: props.glueStagingScriptArguments,
            glueGoldScriptPath: props.glueGoldScriptPath,
            glueGoldScriptArguments: props.glueGoldScriptArguments,
            workflowCronScheduleExpression: props.workflowCronScheduleExpression
        });

        this.createCoarseIamPolicy();

        //this.setupGlueRoleLakeFormationPermissions(this.DataEnrollment.DataSetGlueRole, props.dataSetName, props.sourceBucket);

        this.grantCoarseIamRead(this.DataRegistration.DataSetGlueRole);
    }

    /**
     * Gives permissions to a Glue IAM Role for work with dataset in the target Bucket
     * @param DataSetGlueRole
     * @param DataSetName
     * @param sourceDataBucket
     */
    setupGlueRoleLakeFormationPermissions(DataSetGlueRole: iam.Role, DataSetName: string, sourceDataBucket: s3.IBucket) {
        /* Attach Glue Role to use a S3 Bucket managed by Lake Formation */
        const sourceLakeFormationLocation = new lakeformation.CfnResource(
            this,
            "sourceLakeFormationLocation",
            {
                resourceArn: sourceDataBucket.bucketArn,
                roleArn: this.DataRegistration.DataSetGlueRole.roleArn,
                useServiceLinkedRole: true,
            }
        );

        //TODO: Review it
        //super.grantGlueRoleLakeFormationPermissions(DataSetGlueRole, DataSetName);

        /* Add Lake Formation root Location s3 location & Glue permissions */
        this.grantDataLocationPermissions(this.DataRegistration.DataSetGlueRole, {
            Grantable: true,
            GrantResourcePrefix: `${DataSetName}SourcelocationGrant`,
            Location: sourceDataBucket.bucketName,
            LocationPrefix: "/"
        }, sourceLakeFormationLocation);

    }
}