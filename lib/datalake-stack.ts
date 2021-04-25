import * as cdk from "@aws-cdk/core";

import { CfnParameter } from "@aws-cdk/core";
import {Role, ServicePrincipal} from "@aws-cdk/aws-iam"
import {Bucket} from "@aws-cdk/aws-s3";
import {CfnDataLakeSettings, CfnResource} from "@aws-cdk/aws-lakeformation";


export interface ContextLakeFormationProps extends cdk.StackProps {
    readonly lakeFormationAdminArn?: string;
}

/*arn:aws:iam::...:user/sebastian.aguila@...*/

// https://github.com/aws-samples/data-lake-as-code
export class DataLakeStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: ContextLakeFormationProps) {

        super(scope, id, props);

        /* Getting template parameters */
        const s3Bucket = new CfnParameter(this, "s3BucketOuput", {
            type: "String",
            default:"",
            description: "S3 Bucket ingest destination."});


        /* Creating resources */
        const dataLakeSettings = new CfnDataLakeSettings(this,'',{
            admins:[
                {
                    dataLakePrincipalIdentifier: props?.lakeFormationAdminArn
                }
            ]
        });

        const lakeFormationS3Role = new Role(this,"lakeFormationS3Role",{
            description: "Role for Lake Formation for access S3 resources",
            roleName: "lakeFormationS3Role",
            assumedBy: new ServicePrincipal("lakeformation.amazonaws.com")
        });

        const dataLakeBucket = new Bucket(this, 'dataLakeBucket',{
            bucketName: s3Bucket.valueAsString
        });

        // Giving r/w permission for use s3 bucket to lake formation Role
        dataLakeBucket.grantReadWrite(lakeFormationS3Role);

        // Creating Lake Formation
        const lakeFormationResource = new CfnResource(this,"lakeFormationResource",{
           useServiceLinkedRole: true,
           resourceArn: dataLakeBucket.bucketArn,
           roleArn: lakeFormationS3Role.roleArn
        });

    }
}