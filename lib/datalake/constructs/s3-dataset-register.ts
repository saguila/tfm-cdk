import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import glue = require('@aws-cdk/aws-glue');
import s3 = require('@aws-cdk/aws-s3');

import { DataLakeEnrollment } from './data-lake-enrollment';
import lakeformation = require("@aws-cdk/aws-lakeformation");
import { DatasetGlueRegistration } from './dataset-glue-registration';


export interface S3dataSetEnrollmentProps extends DataLakeEnrollment.DataLakeEnrollmentProps {
    sourceBucket: s3.IBucket;
    sourceBucketDataPrefixes: string[];
    MaxDPUs: number;
    databaseDestination: string;
    DatabaseGold: string;
}

/**
 * Gestor de los permisos de S3 para el dataset
 */
export class S3DatasetRegister extends DataLakeEnrollment {

    private readonly sourceBucket: s3.IBucket;

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
                roleArn: this.DataEnrollment.DataSetGlueRole.roleArn,
                useServiceLinkedRole: true,
            }
        );

        //TODO: Review it
        //super.grantGlueRoleLakeFormationPermissions(DataSetGlueRole, DataSetName);

        /* Add Lake Formation root Location s3 location & Glue permissions */
        this.grantDataLocationPermissions(this.DataEnrollment.DataSetGlueRole, {
            Grantable: true,
            GrantResourcePrefix: `${DataSetName}SourcelocationGrant`,
            Location: sourceDataBucket.bucketName,
            LocationPrefix: "/"
        }, sourceLakeFormationLocation);

    }

    constructor(scope: cdk.Construct, id: string, props: S3dataSetEnrollmentProps) {
        super(scope, id, props);

        /* The dataset name must be match with the root location in s3 */
        const dataSetName = props.DataSetName;

        /* Access Policy with permissions list & get for attach to Glue Role (Crawlers)*/
        const s3AccessPolicy = new iam.Policy(this, 'dataSourceAccessPolicy');

        let s3TargetPaths = new Array<glue.CfnCrawler.S3TargetProperty>();
        let s3DataLakePaths = new Array<glue.CfnCrawler.S3TargetProperty>();
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
                /* Path for Stagging database Datasets */
                s3DataLakePaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.databaseDestination}/${tableFolderName}/`
                });
                /* Path for Gold database Datasets */
                s3DataLakeGoldPaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.DatabaseGold}/${tableFolderName}/`
                });
            }else{
                /* Paths for Stagging database Datasets */
                s3DataLakePaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.databaseDestination}/`
                });
                /* Paths for Gold database Datasets */
                s3DataLakeGoldPaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.DatabaseGold}/`
                });
            }
        }

        this.DataEnrollment = new DatasetGlueRegistration(this, `${props.DataSetName}-s3Enrollment`, {
            dataLakeBucket: props.dataLakeBucket,
            DatabaseGold: props.DatabaseGold,
            databaseDestination: props.databaseDestination,
            dataSetName: dataSetName,
            SourceAccessPolicy: s3AccessPolicy,
            SourceTargets: {
                s3Targets: s3TargetPaths,
            },
            MaxDPUs: props.MaxDPUs,
            GlueScriptPath: props.GlueScriptPath,
            DataLakeTargets: {
                s3Targets: s3DataLakePaths
            },
            DataLakeGoldTargets: {
                s3Targets: s3DataLakeGoldPaths
            },
            GlueScriptArguments: props.GlueScriptArguments,
            GlueScriptPathGold: props.GlueScriptPathGold,
            GlueScriptArgumentsGold: props.GlueScriptArgumentsGold,
            WorkflowCronScheduleExpression: props.WorkflowCronScheduleExpression
        });

        this.createCoarseIamPolicy();

        this.setupGlueRoleLakeFormationPermissions(this.DataEnrollment.DataSetGlueRole, props.DataSetName, props.sourceBucket);

        this.grantCoarseIamRead(this.DataEnrollment.DataSetGlueRole);
    }
}