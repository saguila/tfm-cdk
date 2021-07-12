import * as cdk from "@aws-cdk/core";
import { StackProps } from "@aws-cdk/core";
import { IPrincipal, ManagedPolicy } from "@aws-cdk/aws-iam";
import athena = require("@aws-cdk/aws-athena");
import s3 = require("@aws-cdk/aws-s3");
import lakeformation = require("@aws-cdk/aws-lakeformation");
export interface DataLakeStackContext extends cdk.StackProps {
    starterLakeFormationAdminPrincipalArn: string;
}
/***
 * This class creates a Datalake composed by two buckets, one to store the data that will be the main bucket and another
 * one to store the results of the queries with athena, besides creating these components it manages all the
 * configuration and permissions to work with AWS LakeFormation.
 */
export declare class LakeFormationStack extends cdk.Stack {
    readonly dataLakeBucket: s3.Bucket;
    readonly athenaResultsBucket: s3.Bucket;
    readonly athenaResultsBucketAccessPolicy: ManagedPolicy;
    readonly lakeFormationResource: lakeformation.CfnResource;
    readonly primaryAthenaWorkgroup: athena.CfnWorkGroup;
    private readonly bucketRole;
    private readonly dataLakeAdminArn;
    constructor(scope: cdk.Construct, id: string, props: StackProps);
    /***
     * Given a IAM principal giver permissions to generate encrypted glue logs
     * @param principal IAM identity
     */
    /***
     * Given a IAM principal giver permissions to access encrypted glue metadata
     * @param principal IAM identity
     */
    /***
     * Given a IAM principal giver permissions to access into a athena results bucket
     * @param principal IAM identity
     */
    grantAthenaResultsBucketPermission(principal: IPrincipal): void;
}
