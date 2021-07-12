import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import { DataLakeConfRegistration } from './data-lake-conf-registration';
export interface S3dataSetEnrollmentProps extends DataLakeConfRegistration.DataLakeConfProps {
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
export declare class S3DatasetRegistration extends DataLakeConfRegistration {
    private readonly sourceBucket;
    constructor(scope: cdk.Construct, id: string, props: S3dataSetEnrollmentProps);
    /**
     * Gives permissions to a Glue IAM Role for work with dataset in the target Bucket
     * @param DataSetGlueRole
     * @param DataSetName
     * @param sourceDataBucket
     */
    setupGlueRoleLakeFormationPermissions(DataSetGlueRole: iam.Role, DataSetName: string, sourceDataBucket: s3.IBucket): void;
}
