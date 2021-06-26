import * as cdk from "@aws-cdk/core";
import {CfnParameter, StackProps} from "@aws-cdk/core";
import {
    Effect,
    IPrincipal,
    ManagedPolicy,
    // Policy,
    PolicyDocument,
    PolicyStatement,
    Role,
    ServicePrincipal,
    User
} from "@aws-cdk/aws-iam";
import {BucketEncryption} from "@aws-cdk/aws-s3";
// import kms = require('@aws-cdk/aws-kms');
import glue = require('@aws-cdk/aws-glue');
import athena = require("@aws-cdk/aws-athena");
import cfn = require("@aws-cdk/aws-cloudformation");
import s3 = require("@aws-cdk/aws-s3");
import lakeformation = require("@aws-cdk/aws-lakeformation");
import lambda = require("@aws-cdk/aws-lambda");
import fs = require("fs");

export interface DataLakeStackContext extends cdk.StackProps {
    starterLakeFormationAdminPrincipalArn: string;
}

/***
 * This class creates a Datalake composed by two buckets, one to store the data that will be the main bucket and another
 * one to store the results of the queries with athena, besides creating these components it manages all the
 * configuration and permissions to work with AWS LakeFormation.
 */

export class LakeFormationStack extends cdk.Stack {

    // public readonly EncryptionKey: kms.Key;
    public readonly dataLakeBucket: s3.Bucket;
    public readonly athenaResultsBucket: s3.Bucket;
    public readonly athenaResultsBucketAccessPolicy: ManagedPolicy;
    // public readonly glueEncryptionAccessPolicy: ManagedPolicy;
    // public readonly logsEncryptionPermissionsPolicy: Policy;
    public readonly lakeFormationResource: lakeformation.CfnResource;
    public readonly primaryAthenaWorkgroup: athena.CfnWorkGroup;
    private readonly bucketRole: Role;
    private readonly dataLakeAdminArn: string;

    constructor(scope: cdk.Construct, id: string, props: StackProps) {

        super(scope, id, props);

        const lakeFormationPrincipalArn = new CfnParameter(this, "principalArn", {
            type: "String",
            default:"",
            description: "Lake Formation principal Arn Admin"});

        this.dataLakeAdminArn = lakeFormationPrincipalArn.valueAsString;

        const s3BucketName = new CfnParameter(this, "s3BucketOuput", {
            type: "String",
            default:"",
            description: "S3 Bucket ingest destination."});

        /* Creates the main bucket of data lake*/
        this.dataLakeBucket = new s3.Bucket(this, 'datalakeBucket', {
            bucketName: s3BucketName.valueAsString,
            encryption: BucketEncryption.S3_MANAGED
        });

        /* Creates the athena results bucket for queries */
        this.athenaResultsBucket = new s3.Bucket(this, "athenaResultsBucket",{
            bucketName: `${s3BucketName.valueAsString}-athena-results`,
            encryption: BucketEncryption.S3_MANAGED
        });

        /* Stabilise the first admin identity for AWS Lake Formation */
        new lakeformation.CfnDataLakeSettings(this, "starterAdminPermission", {
            admins: [
                {
                    dataLakePrincipalIdentifier: lakeFormationPrincipalArn.valueAsString
                },
            ],
        });

        /*
        this.EncryptionKey = new kms.Key(this,'data-lake-kms',{
            alias: "data-lake-kms"
        });
         */

        /* Glue configuration encryption at rest */
        new glue.SecurityConfiguration(this, 'DataLakeGlueSecurity', {
            securityConfigurationName: 'data-lake-glue-security',
            /*
            jobBookmarksEncryption: {
                mode: glue.JobBookmarksEncryptionMode.CLIENT_SIDE_KMS,
                kmsKey: this.EncryptionKey,
            },
            cloudWatchEncryption: {
                mode: glue.CloudWatchEncryptionMode.KMS,
                kmsKey: this.EncryptionKey,
            },
            */
            s3Encryption: {
                mode: glue.S3EncryptionMode.S3_MANAGED
            }
        });

        /* Any client that accesses or writes to an encrypted catalog—that is, any console user, crawler, job, or development endpoint—needs the following permissions */
        /*
        const glueEncryptionAccess = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: [
                        "kms:GenerateDataKey",
                        "kms:Decrypt",
                        "kms:Encrypt"
                    ],
                    Resource: this.EncryptionKey.keyArn
                }
            ]
        };

        const glueEncryptionAccessPolicyDoc = PolicyDocument.fromJson(
            glueEncryptionAccess
        );

        /*
        this.glueEncryptionAccessPolicy = new ManagedPolicy(
            this,
            `glueEncryptionAccessPolicy`,
            {
                document: glueEncryptionAccessPolicyDoc,
                description: `AthenaResultBucketAccessPolicy`,
            }
        );
        */

        // https://docs.amazonaws.cn/en_us/glue/latest/dg/set-up-encryption.html
        /* Any ETL job or crawler that writes encrypted Amazon CloudWatch Logs requires the following permissions in the key policy (not the IAM policy).  */
/*        const logsEncryptionPermissions = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: {
                        Service: "logs.region.amazonaws.com"
                    },
                    Action: [
                        "kms:Encrypt*",
                        "kms:Decrypt*",
                        "kms:ReEncrypt*",
                        "kms:GenerateDataKey*",
                        "kms:Describe*"
                    ],
                    Resource: this.EncryptionKey.keyArn
                }
            ]
        };

        const logsEncryptionPermissionsPolicyDoc = new PolicyStatement({
           effect: Effect.ALLOW,
           resources: [
               this.EncryptionKey.keyArn
           ],
           actions: [
               "kms:Encrypt*",
               "kms:Decrypt*",
               "kms:ReEncrypt*",
               "kms:GenerateDataKey*",
               "kms:Describe*"
           ],
           principals: [
               new ServicePrincipal("logs.region.amazonaws.com")
           ]
        });

        this.logsEncryptionPermissionsPolicy = new Policy(this,'logsEncryptionPermissionsPolicy',{
            statements:[logsEncryptionPermissionsPolicyDoc]
        });*/

        /* String with policy for access to athena results s3 bucket */
        const coarseAthenaResultBucketAccess = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: ["s3:*"],
                    Resource: [
                        this.athenaResultsBucket.bucketArn,
                        this.athenaResultsBucket.bucketArn + "/*",
                    ],
                },
            ],
        };


        /* Creates a policy document from previous string policy */
        const coarseAthenaResultBucketAccessPolicyDoc = PolicyDocument.fromJson(
            coarseAthenaResultBucketAccess
        );

        /* Managed policy for access to athena results s3 bucket */
        this.athenaResultsBucketAccessPolicy = new ManagedPolicy(
            this,
            `athenaResultBucketAccessPolicy`,
            {
                document: coarseAthenaResultBucketAccessPolicyDoc,
                description: `AthenaResultBucketAccessPolicy`,
            }
        );

        /* Creates the bucket role needed for Lake Formation to access in the data lake bucket */
        this.bucketRole = new Role(this, "datalakebucketRole", {
            assumedBy: new ServicePrincipal("lakeformation.amazonaws.com"),
            description: "Role used by lakeformation to access resources.",
            roleName: "LakeFormationServiceAccessRole",
        });

        /* Gives permissions to Lake Formation Role for access to data lake bucket */
        this.dataLakeBucket.grantReadWrite(this.bucketRole);

        /* Creates the Lake Formation service using the role configured previously & the data lake bucket */
        this.lakeFormationResource = new lakeformation.CfnResource(
            this,
            "dataLakeBucketLakeFormationResource",
            {
                resourceArn: this.dataLakeBucket.bucketArn,
                roleArn: this.bucketRole.roleArn,
                useServiceLinkedRole: true,
            }
        );

        /* Configure the workgroup needed for athena queries*/
        const workGroupConfigCustResourceRole = new Role(
            this,
            "workGroupConfigCustResourceRole",
            {
                assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
            }
        );

        workGroupConfigCustResourceRole.addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName(
                "service-role/AWSLambdaBasicExecutionRole"
            )
        );

        workGroupConfigCustResourceRole.addToPolicy(
            new PolicyStatement({
                resources: [
                    this.formatArn({
                        account: cdk.Stack.of(this).account,
                        service: "athena",
                        sep: "/",
                        resource: "workgroup",
                        resourceName: "primary",
                    }),
                ],
                actions: ["athena:UpdateWorkGroup"],
                effect: Effect.ALLOW,
            })
        );

        const workGroupConfigCustResource = new cfn.CustomResource(
            this,
            "workGroupConfigCustResource",
            {
                provider: cfn.CustomResourceProvider.lambda(
                    new lambda.SingletonFunction(this, "Singleton", {
                        role: workGroupConfigCustResourceRole,
                        uuid: "f7d4f730-PPPP-11e8-9c2d-fa7ae01bbebc",
                        code: new lambda.InlineCode(
                            fs.readFileSync("lib/datalake/scripts/lambda.updateprimaryworkgroup.py", {
                                encoding: "utf-8",
                            })
                        ),
                        handler: "index.main",
                        timeout: cdk.Duration.seconds(60),
                        runtime: lambda.Runtime.PYTHON_3_8,
                    })
                ),
                properties: {
                    WorkGroupName: "primary",
                    TargetOutputLocationS3Url: `s3://${this.athenaResultsBucket.bucketName}/`,
                },
            }
        );
    }

    /***
     * Given a IAM principal giver permissions to generate encrypted glue logs
     * @param principal IAM identity
     */
    /*
    public grantLogsEncryptionPermissions(principal: IPrincipal) {
        if (principal instanceof Role) {
            this.logsEncryptionPermissionsPolicy.attachToRole(principal);
            return;
        }

        if (principal instanceof User) {
            this.logsEncryptionPermissionsPolicy.attachToUser(principal);
            return;
        }

        if (principal instanceof cdk.Resource) {
            try {
                const user = principal as User;
                this.logsEncryptionPermissionsPolicy.attachToUser(user);
                return;
            } catch (exception) {
                console.log(exception);
            }
            try {
                const role = principal as Role;
                this.logsEncryptionPermissionsPolicy.attachToRole(role);
                return;
            } catch (exception) {
                console.log(exception);
            }
        }
    }
    */

    /***
     * Given a IAM principal giver permissions to access encrypted glue metadata
     * @param principal IAM identity
     */
    /*
    public grantGlueEncryptionAccess(principal: IPrincipal) {
        if (principal instanceof Role) {
            this.glueEncryptionAccessPolicy.attachToRole(principal);
            return;
        }

        if (principal instanceof User) {
            this.glueEncryptionAccessPolicy.attachToUser(principal);
            return;
        }

        if (principal instanceof cdk.Resource) {
            try {
                const user = principal as User;
                this.glueEncryptionAccessPolicy.attachToUser(user);
                return;
            } catch (exception) {
                console.log(exception);
            }
            try {
                const role = principal as Role;
                this.glueEncryptionAccessPolicy.attachToRole(role);
                return;
            } catch (exception) {
                console.log(exception);
            }
        }
    }
    */

    /***
     * Given a IAM principal giver permissions to access into a athena results bucket
     * @param principal IAM identity
     */
    public grantAthenaResultsBucketPermission(principal: IPrincipal) {
        if (principal instanceof Role) {
            this.athenaResultsBucketAccessPolicy.attachToRole(principal);
            return;
        }

        if (principal instanceof User) {
            this.athenaResultsBucketAccessPolicy.attachToUser(principal);
            return;
        }

        if (principal instanceof cdk.Resource) {
            try {
                const user = principal as User;
                this.athenaResultsBucketAccessPolicy.attachToUser(user);
                return;
            } catch (exception) {
                console.log(exception);
            }
            try {
                const role = principal as Role;
                this.athenaResultsBucketAccessPolicy.attachToRole(role);
                return;
            } catch (exception) {
                console.log(exception);
            }
        }
    }
}