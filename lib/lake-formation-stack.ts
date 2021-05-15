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

export interface DataLakeStackProps extends cdk.StackProps {
    starterLakeFormationAdminPrincipalArn: string;
}

/***
 * This class creates a Datalake composed by two buckets, one to store the data that will be the main bucket and another
 * one to store the results of the queries with athena, besides creating these components it manages all the
 * configuration and permissions to work with AWS LakeFormation.
 */

export class LakeFormationStack extends cdk.Stack {
    public readonly datalakeBucket: s3.Bucket;
    public readonly athenaResultsBucket: s3.Bucket;
    public readonly AthenaResultsBucketAccessPolicy: ManagedPolicy;
    public readonly LakeFormationResource: lakeformation.CfnResource;
    public readonly PrimaryAthenaWorkgroup: athena.CfnWorkGroup;
    private readonly bucketRole: Role;
    private readonly starterAdminArn: string;

    public grantAthenaResultsBucketPermission(principal: IPrincipal) {
        if (principal instanceof Role) {
            this.AthenaResultsBucketAccessPolicy.attachToRole(principal);
            return;
        }

        if (principal instanceof User) {
            this.AthenaResultsBucketAccessPolicy.attachToUser(principal);
            return;
        }

        if (principal instanceof cdk.Resource) {
            try {
                const user = principal as User;
                this.AthenaResultsBucketAccessPolicy.attachToUser(user);
                return;
            } catch (exception) {
                console.log(exception);
            }
            try {
                const role = principal as Role;
                this.AthenaResultsBucketAccessPolicy.attachToRole(role);
                return;
            } catch (exception) {
                console.log(exception);
            }
        }
    }

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

        // Creates the bucket for datalake
        this.datalakeBucket = new s3.Bucket(this, 'datalakeBucket', {
            bucketName: s3BucketName.valueAsString,
            encryption: BucketEncryption.S3_MANAGED
        });

        this.athenaResultsBucket = new s3.Bucket(this, "athenaResultsBucket",{
            bucketName: `${s3BucketName.valueAsString}-athena-results`,
            encryption: BucketEncryption.S3_MANAGED
        });

        new lakeformation.CfnDataLakeSettings(this, "starterAdminPermission", {
            admins: [
                {
                    dataLakePrincipalIdentifier: lakeFormationPrincipalArn.valueAsString
                },
            ],
        });

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

        const coarseAthenaResultBucketAccessPolicyDoc = PolicyDocument.fromJson(
            coarseAthenaResultBucketAccess
        );

        this.AthenaResultsBucketAccessPolicy = new ManagedPolicy(
            this,
            `athenaResultBucketAccessPolicy`,
            {
                document: coarseAthenaResultBucketAccessPolicyDoc,
                description: `AthenaResultBucketAccessPolicy`,
            }
        );

        this.bucketRole = new Role(this, "datalakebucketRole", {
            assumedBy: new ServicePrincipal("lakeformation.amazonaws.com"),
            description: "Role used by lakeformation to access resources.",
            roleName: "LakeFormationServiceAccessRole",
        });

        this.datalakeBucket.grantReadWrite(this.bucketRole);

        this.LakeFormationResource = new lakeformation.CfnResource(
            this,
            "dataLakeBucketLakeFormationResource",
            {
                resourceArn: this.datalakeBucket.bucketArn,
                roleArn: this.bucketRole.roleArn,
                useServiceLinkedRole: true,
            }
        );

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
}