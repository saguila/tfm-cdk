import * as cdk from "@aws-cdk/core";
import {CfnParameter, StackProps} from "@aws-cdk/core";
import {
    Effect,
    IPrincipal,
    ManagedPolicy,
    PolicyDocument,
    PolicyStatement,
    Role,
    ServicePrincipal,
    User
} from "@aws-cdk/aws-iam";
import {BucketEncryption} from "@aws-cdk/aws-s3";
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
    public readonly dataLakeBucket: s3.Bucket;
    public readonly athenaResultsBucket: s3.Bucket;
    public readonly athenaResultsBucketAccessPolicy: ManagedPolicy;
    public readonly lakeFormationResource: lakeformation.CfnResource;
    public readonly PrimaryAthenaWorkgroup: athena.CfnWorkGroup;
    private readonly bucketRole: Role;
    private readonly starterAdminArn: string;

    constructor(scope: cdk.Construct, id: string, props: StackProps) {

        super(scope, id, props);

        const lakeFormationPrincipalArn = new CfnParameter(this, "principalArn", {
            type: "String",
            default:"",
            description: "Lake Formation principal Arn Admin"});

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