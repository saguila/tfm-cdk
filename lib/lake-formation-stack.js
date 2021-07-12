"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LakeFormationStack = void 0;
const cdk = require("@aws-cdk/core");
const core_1 = require("@aws-cdk/core");
const aws_iam_1 = require("@aws-cdk/aws-iam");
const aws_s3_1 = require("@aws-cdk/aws-s3");
// import kms = require('@aws-cdk/aws-kms');
const glue = require("@aws-cdk/aws-glue");
const cfn = require("@aws-cdk/aws-cloudformation");
const s3 = require("@aws-cdk/aws-s3");
const lakeformation = require("@aws-cdk/aws-lakeformation");
const lambda = require("@aws-cdk/aws-lambda");
const fs = require("fs");
/***
 * This class creates a Datalake composed by two buckets, one to store the data that will be the main bucket and another
 * one to store the results of the queries with athena, besides creating these components it manages all the
 * configuration and permissions to work with AWS LakeFormation.
 */
class LakeFormationStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const lakeFormationPrincipalArn = new core_1.CfnParameter(this, "principalArn", {
            type: "String",
            default: "",
            description: "Lake Formation principal Arn Admin"
        });
        this.dataLakeAdminArn = lakeFormationPrincipalArn.valueAsString;
        const s3BucketName = new core_1.CfnParameter(this, "s3BucketOuput", {
            type: "String",
            default: "",
            description: "S3 Bucket ingest destination."
        });
        /* Creates the main bucket of data lake*/
        this.dataLakeBucket = new s3.Bucket(this, 'datalakeBucket', {
            bucketName: s3BucketName.valueAsString,
            encryption: aws_s3_1.BucketEncryption.S3_MANAGED
        });
        /* Creates the athena results bucket for queries */
        this.athenaResultsBucket = new s3.Bucket(this, "athenaResultsBucket", {
            bucketName: `${s3BucketName.valueAsString}-athena-results`,
            encryption: aws_s3_1.BucketEncryption.S3_MANAGED
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
        const coarseAthenaResultBucketAccessPolicyDoc = aws_iam_1.PolicyDocument.fromJson(coarseAthenaResultBucketAccess);
        /* Managed policy for access to athena results s3 bucket */
        this.athenaResultsBucketAccessPolicy = new aws_iam_1.ManagedPolicy(this, `athenaResultBucketAccessPolicy`, {
            document: coarseAthenaResultBucketAccessPolicyDoc,
            description: `AthenaResultBucketAccessPolicy`,
        });
        /* Creates the bucket role needed for Lake Formation to access in the data lake bucket */
        this.bucketRole = new aws_iam_1.Role(this, "datalakebucketRole", {
            assumedBy: new aws_iam_1.ServicePrincipal("lakeformation.amazonaws.com"),
            description: "Role used by lakeformation to access resources.",
            roleName: "LakeFormationServiceAccessRole",
        });
        /* Gives permissions to Lake Formation Role for access to data lake bucket */
        this.dataLakeBucket.grantReadWrite(this.bucketRole);
        /* Creates the Lake Formation service using the role configured previously & the data lake bucket */
        this.lakeFormationResource = new lakeformation.CfnResource(this, "dataLakeBucketLakeFormationResource", {
            resourceArn: this.dataLakeBucket.bucketArn,
            roleArn: this.bucketRole.roleArn,
            useServiceLinkedRole: true,
        });
        /* Configure the workgroup needed for athena queries*/
        const workGroupConfigCustResourceRole = new aws_iam_1.Role(this, "workGroupConfigCustResourceRole", {
            assumedBy: new aws_iam_1.ServicePrincipal("lambda.amazonaws.com"),
        });
        workGroupConfigCustResourceRole.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
        workGroupConfigCustResourceRole.addToPolicy(new aws_iam_1.PolicyStatement({
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
            effect: aws_iam_1.Effect.ALLOW,
        }));
        const workGroupConfigCustResource = new cfn.CustomResource(this, "workGroupConfigCustResource", {
            provider: cfn.CustomResourceProvider.lambda(new lambda.SingletonFunction(this, "Singleton", {
                role: workGroupConfigCustResourceRole,
                uuid: "f7d4f730-PPPP-11e8-9c2d-fa7ae01bbebc",
                code: new lambda.InlineCode(fs.readFileSync("lib/datalake/scripts/lambda.updateprimaryworkgroup.py", {
                    encoding: "utf-8",
                })),
                handler: "index.main",
                timeout: cdk.Duration.seconds(60),
                runtime: lambda.Runtime.PYTHON_3_8,
            })),
            properties: {
                WorkGroupName: "primary",
                TargetOutputLocationS3Url: `s3://${this.athenaResultsBucket.bucketName}/`,
            },
        });
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
    grantAthenaResultsBucketPermission(principal) {
        if (principal instanceof aws_iam_1.Role) {
            this.athenaResultsBucketAccessPolicy.attachToRole(principal);
            return;
        }
        if (principal instanceof aws_iam_1.User) {
            this.athenaResultsBucketAccessPolicy.attachToUser(principal);
            return;
        }
        if (principal instanceof cdk.Resource) {
            try {
                const user = principal;
                this.athenaResultsBucketAccessPolicy.attachToUser(user);
                return;
            }
            catch (exception) {
                console.log(exception);
            }
            try {
                const role = principal;
                this.athenaResultsBucketAccessPolicy.attachToRole(role);
                return;
            }
            catch (exception) {
                console.log(exception);
            }
        }
    }
}
exports.LakeFormationStack = LakeFormationStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFrZS1mb3JtYXRpb24tc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsYWtlLWZvcm1hdGlvbi1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsd0NBQXVEO0FBQ3ZELDhDQVUwQjtBQUMxQiw0Q0FBaUQ7QUFDakQsNENBQTRDO0FBQzVDLDBDQUEyQztBQUUzQyxtREFBb0Q7QUFDcEQsc0NBQXVDO0FBQ3ZDLDREQUE2RDtBQUM3RCw4Q0FBK0M7QUFDL0MseUJBQTBCO0FBTTFCOzs7O0dBSUc7QUFFSCxNQUFhLGtCQUFtQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBYTdDLFlBQVksS0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBaUI7UUFFM0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLG1CQUFZLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUNyRSxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBQyxFQUFFO1lBQ1YsV0FBVyxFQUFFLG9DQUFvQztTQUFDLENBQUMsQ0FBQztRQUV4RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcseUJBQXlCLENBQUMsYUFBYSxDQUFDO1FBRWhFLE1BQU0sWUFBWSxHQUFHLElBQUksbUJBQVksQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3pELElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFDLEVBQUU7WUFDVixXQUFXLEVBQUUsK0JBQStCO1NBQUMsQ0FBQyxDQUFDO1FBRW5ELHlDQUF5QztRQUN6QyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEQsVUFBVSxFQUFFLFlBQVksQ0FBQyxhQUFhO1lBQ3RDLFVBQVUsRUFBRSx5QkFBZ0IsQ0FBQyxVQUFVO1NBQzFDLENBQUMsQ0FBQztRQUVI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QzVFO1NBQ0osQ0FDSixDQUFDO0lBQ04sQ0FBQztJQUVEOzs7T0FHRztJQUNIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQTZCRTtJQUVGOzs7T0FHRztJQUNIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQTZCRTtJQUVGOzs7T0FHRztJQUNJLGtDQUFrQyxDQUFDLFNBQXFCO1FBQzNELElBQUksU0FBUyxZQUFZLGNBQUksRUFBRTtZQUMzQixJQUFJLENBQUMsK0JBQStCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzdELE9BQU87U0FDVjtRQUVELElBQUksU0FBUyxZQUFZLGNBQUksRUFBRTtZQUMzQixJQUFJLENBQUMsK0JBQStCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzdELE9BQU87U0FDVjtRQUVELElBQUksU0FBUyxZQUFZLEdBQUcsQ0FBQyxRQUFRLEVBQUU7WUFDbkMsSUFBSTtnQkFDQSxNQUFNLElBQUksR0FBRyxTQUFpQixDQUFDO2dCQUMvQixJQUFJLENBQUMsK0JBQStCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4RCxPQUFPO2FBQ1Y7WUFBQyxPQUFPLFNBQVMsRUFBRTtnQkFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUMxQjtZQUNELElBQUk7Z0JBQ0EsTUFBTSxJQUFJLEdBQUcsU0FBaUIsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLCtCQUErQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDeEQsT0FBTzthQUNWO1lBQUMsT0FBTyxTQUFTLEVBQUU7Z0JBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDMUI7U0FDSjtJQUNMLENBQUM7Q0FDSjtBQXhXRCxnREF3V0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcbmltcG9ydCB7Q2ZuUGFyYW1ldGVyLCBTdGFja1Byb3BzfSBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xuaW1wb3J0IHtcbiAgICBFZmZlY3QsXG4gICAgSVByaW5jaXBhbCxcbiAgICBNYW5hZ2VkUG9saWN5LFxuICAgIC8vIFBvbGljeSxcbiAgICBQb2xpY3lEb2N1bWVudCxcbiAgICBQb2xpY3lTdGF0ZW1lbnQsXG4gICAgUm9sZSxcbiAgICBTZXJ2aWNlUHJpbmNpcGFsLFxuICAgIFVzZXJcbn0gZnJvbSBcIkBhd3MtY2RrL2F3cy1pYW1cIjtcbmltcG9ydCB7QnVja2V0RW5jcnlwdGlvbn0gZnJvbSBcIkBhd3MtY2RrL2F3cy1zM1wiO1xuLy8gaW1wb3J0IGttcyA9IHJlcXVpcmUoJ0Bhd3MtY2RrL2F3cy1rbXMnKTtcbmltcG9ydCBnbHVlID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWdsdWUnKTtcbmltcG9ydCBhdGhlbmEgPSByZXF1aXJlKFwiQGF3cy1jZGsvYXdzLWF0aGVuYVwiKTtcbmltcG9ydCBjZm4gPSByZXF1aXJlKFwiQGF3cy1jZGsvYXdzLWNsb3VkZm9ybWF0aW9uXCIpO1xuaW1wb3J0IHMzID0gcmVxdWlyZShcIkBhd3MtY2RrL2F3cy1zM1wiKTtcbmltcG9ydCBsYWtlZm9ybWF0aW9uID0gcmVxdWlyZShcIkBhd3MtY2RrL2F3cy1sYWtlZm9ybWF0aW9uXCIpO1xuaW1wb3J0IGxhbWJkYSA9IHJlcXVpcmUoXCJAYXdzLWNkay9hd3MtbGFtYmRhXCIpO1xuaW1wb3J0IGZzID0gcmVxdWlyZShcImZzXCIpO1xuXG5leHBvcnQgaW50ZXJmYWNlIERhdGFMYWtlU3RhY2tDb250ZXh0IGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICAgIHN0YXJ0ZXJMYWtlRm9ybWF0aW9uQWRtaW5QcmluY2lwYWxBcm46IHN0cmluZztcbn1cblxuLyoqKlxuICogVGhpcyBjbGFzcyBjcmVhdGVzIGEgRGF0YWxha2UgY29tcG9zZWQgYnkgdHdvIGJ1Y2tldHMsIG9uZSB0byBzdG9yZSB0aGUgZGF0YSB0aGF0IHdpbGwgYmUgdGhlIG1haW4gYnVja2V0IGFuZCBhbm90aGVyXG4gKiBvbmUgdG8gc3RvcmUgdGhlIHJlc3VsdHMgb2YgdGhlIHF1ZXJpZXMgd2l0aCBhdGhlbmEsIGJlc2lkZXMgY3JlYXRpbmcgdGhlc2UgY29tcG9uZW50cyBpdCBtYW5hZ2VzIGFsbCB0aGVcbiAqIGNvbmZpZ3VyYXRpb24gYW5kIHBlcm1pc3Npb25zIHRvIHdvcmsgd2l0aCBBV1MgTGFrZUZvcm1hdGlvbi5cbiAqL1xuXG5leHBvcnQgY2xhc3MgTGFrZUZvcm1hdGlvblN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcblxuICAgIC8vIHB1YmxpYyByZWFkb25seSBFbmNyeXB0aW9uS2V5OiBrbXMuS2V5O1xuICAgIHB1YmxpYyByZWFkb25seSBkYXRhTGFrZUJ1Y2tldDogczMuQnVja2V0O1xuICAgIHB1YmxpYyByZWFkb25seSBhdGhlbmFSZXN1bHRzQnVja2V0OiBzMy5CdWNrZXQ7XG4gICAgcHVibGljIHJlYWRvbmx5IGF0aGVuYVJlc3VsdHNCdWNrZXRBY2Nlc3NQb2xpY3k6IE1hbmFnZWRQb2xpY3k7XG4gICAgLy8gcHVibGljIHJlYWRvbmx5IGdsdWVFbmNyeXB0aW9uQWNjZXNzUG9saWN5OiBNYW5hZ2VkUG9saWN5O1xuICAgIC8vIHB1YmxpYyByZWFkb25seSBsb2dzRW5jcnlwdGlvblBlcm1pc3Npb25zUG9saWN5OiBQb2xpY3k7XG4gICAgcHVibGljIHJlYWRvbmx5IGxha2VGb3JtYXRpb25SZXNvdXJjZTogbGFrZWZvcm1hdGlvbi5DZm5SZXNvdXJjZTtcbiAgICBwdWJsaWMgcmVhZG9ubHkgcHJpbWFyeUF0aGVuYVdvcmtncm91cDogYXRoZW5hLkNmbldvcmtHcm91cDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJ1Y2tldFJvbGU6IFJvbGU7XG4gICAgcHJpdmF0ZSByZWFkb25seSBkYXRhTGFrZUFkbWluQXJuOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkNvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFN0YWNrUHJvcHMpIHtcblxuICAgICAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgICAgICBjb25zdCBsYWtlRm9ybWF0aW9uUHJpbmNpcGFsQXJuID0gbmV3IENmblBhcmFtZXRlcih0aGlzLCBcInByaW5jaXBhbEFyblwiLCB7XG4gICAgICAgICAgICB0eXBlOiBcIlN0cmluZ1wiLFxuICAgICAgICAgICAgZGVmYXVsdDpcIlwiLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTGFrZSBGb3JtYXRpb24gcHJpbmNpcGFsIEFybiBBZG1pblwifSk7XG5cbiAgICAgICAgdGhpcy5kYXRhTGFrZUFkbWluQXJuID0gbGFrZUZvcm1hdGlvblByaW5jaXBhbEFybi52YWx1ZUFzU3RyaW5nO1xuXG4gICAgICAgIGNvbnN0IHMzQnVja2V0TmFtZSA9IG5ldyBDZm5QYXJhbWV0ZXIodGhpcywgXCJzM0J1Y2tldE91cHV0XCIsIHtcbiAgICAgICAgICAgIHR5cGU6IFwiU3RyaW5nXCIsXG4gICAgICAgICAgICBkZWZhdWx0OlwiXCIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTMyBCdWNrZXQgaW5nZXN0IGRlc3RpbmF0aW9uLlwifSk7XG5cbiAgICAgICAgLyogQ3JlYXRlcyB0aGUgbWFpbiBidWNrZXQgb2YgZGF0YSBsYWtlKi9cbiAgICAgICAgdGhpcy5kYXRhTGFrZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ2RhdGFsYWtlQnVja2V0Jywge1xuICAgICAgICAgICAgYnVja2V0TmFtZTogczNCdWNrZXROYW1lLnZhbHVlQXNTdHJpbmcsXG4gICAgICAgICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRURcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyogQ3JlYXRlcyB0aGUgYXRoZW5hIHJlc3VsdHMgYnVja2V0IGZvciBxdWVyaWVzICovXG4gICAgICAgIHRoaXMuYXRoZW5hUmVzdWx0c0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgXCJhdGhlbmFSZXN1bHRzQnVja2V0XCIse1xuICAgICAgICAgICAgYnVja2V0TmFtZTogYCR7czNCdWNrZXROYW1lLnZhbHVlQXNTdHJpbmd9LWF0aGVuYS1yZXN1bHRzYCxcbiAgICAgICAgICAgIGVuY3J5cHRpb246IEJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRFxuICAgICAgICB9KTtcblxuICAgICAgICAvKiBTdGFiaWxpc2UgdGhlIGZpcnN0IGFkbWluIGlkZW50aXR5IGZvciBBV1MgTGFrZSBGb3JtYXRpb24gKi9cbiAgICAgICAgbmV3IGxha2Vmb3JtYXRpb24uQ2ZuRGF0YUxha2VTZXR0aW5ncyh0aGlzLCBcInN0YXJ0ZXJBZG1pblBlcm1pc3Npb25cIiwge1xuICAgICAgICAgICAgYWRtaW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhTGFrZVByaW5jaXBhbElkZW50aWZpZXI6IGxha2VGb3JtYXRpb25QcmluY2lwYWxBcm4udmFsdWVBc1N0cmluZ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9KTtcblxuICAgICAgICAvKlxuICAgICAgICB0aGlzLkVuY3J5cHRpb25LZXkgPSBuZXcga21zLktleSh0aGlzLCdkYXRhLWxha2Uta21zJyx7XG4gICAgICAgICAgICBhbGlhczogXCJkYXRhLWxha2Uta21zXCJcbiAgICAgICAgfSk7XG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qIEdsdWUgY29uZmlndXJhdGlvbiBlbmNyeXB0aW9uIGF0IHJlc3QgKi9cbiAgICAgICAgbmV3IGdsdWUuU2VjdXJpdHlDb25maWd1cmF0aW9uKHRoaXMsICdEYXRhTGFrZUdsdWVTZWN1cml0eScsIHtcbiAgICAgICAgICAgIHNlY3VyaXR5Q29uZmlndXJhdGlvbk5hbWU6ICdkYXRhLWxha2UtZ2x1ZS1zZWN1cml0eScsXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgam9iQm9va21hcmtzRW5jcnlwdGlvbjoge1xuICAgICAgICAgICAgICAgIG1vZGU6IGdsdWUuSm9iQm9va21hcmtzRW5jcnlwdGlvbk1vZGUuQ0xJRU5UX1NJREVfS01TLFxuICAgICAgICAgICAgICAgIGttc0tleTogdGhpcy5FbmNyeXB0aW9uS2V5LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hFbmNyeXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgbW9kZTogZ2x1ZS5DbG91ZFdhdGNoRW5jcnlwdGlvbk1vZGUuS01TLFxuICAgICAgICAgICAgICAgIGttc0tleTogdGhpcy5FbmNyeXB0aW9uS2V5LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBzM0VuY3J5cHRpb246IHtcbiAgICAgICAgICAgICAgICBtb2RlOiBnbHVlLlMzRW5jcnlwdGlvbk1vZGUuUzNfTUFOQUdFRFxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKiBBbnkgY2xpZW50IHRoYXQgYWNjZXNzZXMgb3Igd3JpdGVzIHRvIGFuIGVuY3J5cHRlZCBjYXRhbG9n4oCUdGhhdCBpcywgYW55IGNvbnNvbGUgdXNlciwgY3Jhd2xlciwgam9iLCBvciBkZXZlbG9wbWVudCBlbmRwb2ludOKAlG5lZWRzIHRoZSBmb2xsb3dpbmcgcGVybWlzc2lvbnMgKi9cbiAgICAgICAgLypcbiAgICAgICAgY29uc3QgZ2x1ZUVuY3J5cHRpb25BY2Nlc3MgPSB7XG4gICAgICAgICAgICBWZXJzaW9uOiBcIjIwMTItMTAtMTdcIixcbiAgICAgICAgICAgIFN0YXRlbWVudDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgRWZmZWN0OiBcIkFsbG93XCIsXG4gICAgICAgICAgICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJrbXM6R2VuZXJhdGVEYXRhS2V5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImttczpEZWNyeXB0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImttczpFbmNyeXB0XCJcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgUmVzb3VyY2U6IHRoaXMuRW5jcnlwdGlvbktleS5rZXlBcm5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZ2x1ZUVuY3J5cHRpb25BY2Nlc3NQb2xpY3lEb2MgPSBQb2xpY3lEb2N1bWVudC5mcm9tSnNvbihcbiAgICAgICAgICAgIGdsdWVFbmNyeXB0aW9uQWNjZXNzXG4gICAgICAgICk7XG5cbiAgICAgICAgLypcbiAgICAgICAgdGhpcy5nbHVlRW5jcnlwdGlvbkFjY2Vzc1BvbGljeSA9IG5ldyBNYW5hZ2VkUG9saWN5KFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIGBnbHVlRW5jcnlwdGlvbkFjY2Vzc1BvbGljeWAsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQ6IGdsdWVFbmNyeXB0aW9uQWNjZXNzUG9saWN5RG9jLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBgQXRoZW5hUmVzdWx0QnVja2V0QWNjZXNzUG9saWN5YCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgKi9cblxuICAgICAgICAvLyBodHRwczovL2RvY3MuYW1hem9uYXdzLmNuL2VuX3VzL2dsdWUvbGF0ZXN0L2RnL3NldC11cC1lbmNyeXB0aW9uLmh0bWxcbiAgICAgICAgLyogQW55IEVUTCBqb2Igb3IgY3Jhd2xlciB0aGF0IHdyaXRlcyBlbmNyeXB0ZWQgQW1hem9uIENsb3VkV2F0Y2ggTG9ncyByZXF1aXJlcyB0aGUgZm9sbG93aW5nIHBlcm1pc3Npb25zIGluIHRoZSBrZXkgcG9saWN5IChub3QgdGhlIElBTSBwb2xpY3kpLiAgKi9cbi8qICAgICAgICBjb25zdCBsb2dzRW5jcnlwdGlvblBlcm1pc3Npb25zID0ge1xuICAgICAgICAgICAgVmVyc2lvbjogXCIyMDEyLTEwLTE3XCIsXG4gICAgICAgICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIEVmZmVjdDogXCJBbGxvd1wiLFxuICAgICAgICAgICAgICAgICAgICBQcmluY2lwYWw6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFNlcnZpY2U6IFwibG9ncy5yZWdpb24uYW1hem9uYXdzLmNvbVwiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJrbXM6RW5jcnlwdCpcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwia21zOkRlY3J5cHQqXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImttczpSZUVuY3J5cHQqXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImttczpHZW5lcmF0ZURhdGFLZXkqXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImttczpEZXNjcmliZSpcIlxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICBSZXNvdXJjZTogdGhpcy5FbmNyeXB0aW9uS2V5LmtleUFyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBsb2dzRW5jcnlwdGlvblBlcm1pc3Npb25zUG9saWN5RG9jID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgIHRoaXMuRW5jcnlwdGlvbktleS5rZXlBcm5cbiAgICAgICAgICAgXSxcbiAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgXCJrbXM6RW5jcnlwdCpcIixcbiAgICAgICAgICAgICAgIFwia21zOkRlY3J5cHQqXCIsXG4gICAgICAgICAgICAgICBcImttczpSZUVuY3J5cHQqXCIsXG4gICAgICAgICAgICAgICBcImttczpHZW5lcmF0ZURhdGFLZXkqXCIsXG4gICAgICAgICAgICAgICBcImttczpEZXNjcmliZSpcIlxuICAgICAgICAgICBdLFxuICAgICAgICAgICBwcmluY2lwYWxzOiBbXG4gICAgICAgICAgICAgICBuZXcgU2VydmljZVByaW5jaXBhbChcImxvZ3MucmVnaW9uLmFtYXpvbmF3cy5jb21cIilcbiAgICAgICAgICAgXVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmxvZ3NFbmNyeXB0aW9uUGVybWlzc2lvbnNQb2xpY3kgPSBuZXcgUG9saWN5KHRoaXMsJ2xvZ3NFbmNyeXB0aW9uUGVybWlzc2lvbnNQb2xpY3knLHtcbiAgICAgICAgICAgIHN0YXRlbWVudHM6W2xvZ3NFbmNyeXB0aW9uUGVybWlzc2lvbnNQb2xpY3lEb2NdXG4gICAgICAgIH0pOyovXG5cbiAgICAgICAgLyogU3RyaW5nIHdpdGggcG9saWN5IGZvciBhY2Nlc3MgdG8gYXRoZW5hIHJlc3VsdHMgczMgYnVja2V0ICovXG4gICAgICAgIGNvbnN0IGNvYXJzZUF0aGVuYVJlc3VsdEJ1Y2tldEFjY2VzcyA9IHtcbiAgICAgICAgICAgIFZlcnNpb246IFwiMjAxMi0xMC0xN1wiLFxuICAgICAgICAgICAgU3RhdGVtZW50OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBFZmZlY3Q6IFwiQWxsb3dcIixcbiAgICAgICAgICAgICAgICAgICAgQWN0aW9uOiBbXCJzMzoqXCJdLFxuICAgICAgICAgICAgICAgICAgICBSZXNvdXJjZTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hdGhlbmFSZXN1bHRzQnVja2V0LmJ1Y2tldEFybixcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXRoZW5hUmVzdWx0c0J1Y2tldC5idWNrZXRBcm4gKyBcIi8qXCIsXG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cblxuICAgICAgICAvKiBDcmVhdGVzIGEgcG9saWN5IGRvY3VtZW50IGZyb20gcHJldmlvdXMgc3RyaW5nIHBvbGljeSAqL1xuICAgICAgICBjb25zdCBjb2Fyc2VBdGhlbmFSZXN1bHRCdWNrZXRBY2Nlc3NQb2xpY3lEb2MgPSBQb2xpY3lEb2N1bWVudC5mcm9tSnNvbihcbiAgICAgICAgICAgIGNvYXJzZUF0aGVuYVJlc3VsdEJ1Y2tldEFjY2Vzc1xuICAgICAgICApO1xuXG4gICAgICAgIC8qIE1hbmFnZWQgcG9saWN5IGZvciBhY2Nlc3MgdG8gYXRoZW5hIHJlc3VsdHMgczMgYnVja2V0ICovXG4gICAgICAgIHRoaXMuYXRoZW5hUmVzdWx0c0J1Y2tldEFjY2Vzc1BvbGljeSA9IG5ldyBNYW5hZ2VkUG9saWN5KFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIGBhdGhlbmFSZXN1bHRCdWNrZXRBY2Nlc3NQb2xpY3lgLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50OiBjb2Fyc2VBdGhlbmFSZXN1bHRCdWNrZXRBY2Nlc3NQb2xpY3lEb2MsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGBBdGhlbmFSZXN1bHRCdWNrZXRBY2Nlc3NQb2xpY3lgLFxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIC8qIENyZWF0ZXMgdGhlIGJ1Y2tldCByb2xlIG5lZWRlZCBmb3IgTGFrZSBGb3JtYXRpb24gdG8gYWNjZXNzIGluIHRoZSBkYXRhIGxha2UgYnVja2V0ICovXG4gICAgICAgIHRoaXMuYnVja2V0Um9sZSA9IG5ldyBSb2xlKHRoaXMsIFwiZGF0YWxha2VidWNrZXRSb2xlXCIsIHtcbiAgICAgICAgICAgIGFzc3VtZWRCeTogbmV3IFNlcnZpY2VQcmluY2lwYWwoXCJsYWtlZm9ybWF0aW9uLmFtYXpvbmF3cy5jb21cIiksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJSb2xlIHVzZWQgYnkgbGFrZWZvcm1hdGlvbiB0byBhY2Nlc3MgcmVzb3VyY2VzLlwiLFxuICAgICAgICAgICAgcm9sZU5hbWU6IFwiTGFrZUZvcm1hdGlvblNlcnZpY2VBY2Nlc3NSb2xlXCIsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qIEdpdmVzIHBlcm1pc3Npb25zIHRvIExha2UgRm9ybWF0aW9uIFJvbGUgZm9yIGFjY2VzcyB0byBkYXRhIGxha2UgYnVja2V0ICovXG4gICAgICAgIHRoaXMuZGF0YUxha2VCdWNrZXQuZ3JhbnRSZWFkV3JpdGUodGhpcy5idWNrZXRSb2xlKTtcblxuICAgICAgICAvKiBDcmVhdGVzIHRoZSBMYWtlIEZvcm1hdGlvbiBzZXJ2aWNlIHVzaW5nIHRoZSByb2xlIGNvbmZpZ3VyZWQgcHJldmlvdXNseSAmIHRoZSBkYXRhIGxha2UgYnVja2V0ICovXG4gICAgICAgIHRoaXMubGFrZUZvcm1hdGlvblJlc291cmNlID0gbmV3IGxha2Vmb3JtYXRpb24uQ2ZuUmVzb3VyY2UoXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgXCJkYXRhTGFrZUJ1Y2tldExha2VGb3JtYXRpb25SZXNvdXJjZVwiLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJlc291cmNlQXJuOiB0aGlzLmRhdGFMYWtlQnVja2V0LmJ1Y2tldEFybixcbiAgICAgICAgICAgICAgICByb2xlQXJuOiB0aGlzLmJ1Y2tldFJvbGUucm9sZUFybixcbiAgICAgICAgICAgICAgICB1c2VTZXJ2aWNlTGlua2VkUm9sZTogdHJ1ZSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAvKiBDb25maWd1cmUgdGhlIHdvcmtncm91cCBuZWVkZWQgZm9yIGF0aGVuYSBxdWVyaWVzKi9cbiAgICAgICAgY29uc3Qgd29ya0dyb3VwQ29uZmlnQ3VzdFJlc291cmNlUm9sZSA9IG5ldyBSb2xlKFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIFwid29ya0dyb3VwQ29uZmlnQ3VzdFJlc291cmNlUm9sZVwiLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGFzc3VtZWRCeTogbmV3IFNlcnZpY2VQcmluY2lwYWwoXCJsYW1iZGEuYW1hem9uYXdzLmNvbVwiKSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICB3b3JrR3JvdXBDb25maWdDdXN0UmVzb3VyY2VSb2xlLmFkZE1hbmFnZWRQb2xpY3koXG4gICAgICAgICAgICBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcbiAgICAgICAgICAgICAgICBcInNlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGVcIlxuICAgICAgICAgICAgKVxuICAgICAgICApO1xuXG4gICAgICAgIHdvcmtHcm91cENvbmZpZ0N1c3RSZXNvdXJjZVJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JtYXRBcm4oe1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjb3VudDogY2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlOiBcImF0aGVuYVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VwOiBcIi9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiBcIndvcmtncm91cFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VOYW1lOiBcInByaW1hcnlcIixcbiAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXCJhdGhlbmE6VXBkYXRlV29ya0dyb3VwXCJdLFxuICAgICAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCB3b3JrR3JvdXBDb25maWdDdXN0UmVzb3VyY2UgPSBuZXcgY2ZuLkN1c3RvbVJlc291cmNlKFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIFwid29ya0dyb3VwQ29uZmlnQ3VzdFJlc291cmNlXCIsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXI6IGNmbi5DdXN0b21SZXNvdXJjZVByb3ZpZGVyLmxhbWJkYShcbiAgICAgICAgICAgICAgICAgICAgbmV3IGxhbWJkYS5TaW5nbGV0b25GdW5jdGlvbih0aGlzLCBcIlNpbmdsZXRvblwiLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICByb2xlOiB3b3JrR3JvdXBDb25maWdDdXN0UmVzb3VyY2VSb2xlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogXCJmN2Q0ZjczMC1QUFBQLTExZTgtOWMyZC1mYTdhZTAxYmJlYmNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IG5ldyBsYW1iZGEuSW5saW5lQ29kZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcy5yZWFkRmlsZVN5bmMoXCJsaWIvZGF0YWxha2Uvc2NyaXB0cy9sYW1iZGEudXBkYXRlcHJpbWFyeXdvcmtncm91cC5weVwiLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuY29kaW5nOiBcInV0Zi04XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyOiBcImluZGV4Lm1haW5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzgsXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgIFdvcmtHcm91cE5hbWU6IFwicHJpbWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICBUYXJnZXRPdXRwdXRMb2NhdGlvblMzVXJsOiBgczM6Ly8ke3RoaXMuYXRoZW5hUmVzdWx0c0J1Y2tldC5idWNrZXROYW1lfS9gLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqKlxuICAgICAqIEdpdmVuIGEgSUFNIHByaW5jaXBhbCBnaXZlciBwZXJtaXNzaW9ucyB0byBnZW5lcmF0ZSBlbmNyeXB0ZWQgZ2x1ZSBsb2dzXG4gICAgICogQHBhcmFtIHByaW5jaXBhbCBJQU0gaWRlbnRpdHlcbiAgICAgKi9cbiAgICAvKlxuICAgIHB1YmxpYyBncmFudExvZ3NFbmNyeXB0aW9uUGVybWlzc2lvbnMocHJpbmNpcGFsOiBJUHJpbmNpcGFsKSB7XG4gICAgICAgIGlmIChwcmluY2lwYWwgaW5zdGFuY2VvZiBSb2xlKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ3NFbmNyeXB0aW9uUGVybWlzc2lvbnNQb2xpY3kuYXR0YWNoVG9Sb2xlKHByaW5jaXBhbCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJpbmNpcGFsIGluc3RhbmNlb2YgVXNlcikge1xuICAgICAgICAgICAgdGhpcy5sb2dzRW5jcnlwdGlvblBlcm1pc3Npb25zUG9saWN5LmF0dGFjaFRvVXNlcihwcmluY2lwYWwpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByaW5jaXBhbCBpbnN0YW5jZW9mIGNkay5SZXNvdXJjZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCB1c2VyID0gcHJpbmNpcGFsIGFzIFVzZXI7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dzRW5jcnlwdGlvblBlcm1pc3Npb25zUG9saWN5LmF0dGFjaFRvVXNlcih1c2VyKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhleGNlcHRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb2xlID0gcHJpbmNpcGFsIGFzIFJvbGU7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dzRW5jcnlwdGlvblBlcm1pc3Npb25zUG9saWN5LmF0dGFjaFRvUm9sZShyb2xlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhleGNlcHRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgICovXG5cbiAgICAvKioqXG4gICAgICogR2l2ZW4gYSBJQU0gcHJpbmNpcGFsIGdpdmVyIHBlcm1pc3Npb25zIHRvIGFjY2VzcyBlbmNyeXB0ZWQgZ2x1ZSBtZXRhZGF0YVxuICAgICAqIEBwYXJhbSBwcmluY2lwYWwgSUFNIGlkZW50aXR5XG4gICAgICovXG4gICAgLypcbiAgICBwdWJsaWMgZ3JhbnRHbHVlRW5jcnlwdGlvbkFjY2VzcyhwcmluY2lwYWw6IElQcmluY2lwYWwpIHtcbiAgICAgICAgaWYgKHByaW5jaXBhbCBpbnN0YW5jZW9mIFJvbGUpIHtcbiAgICAgICAgICAgIHRoaXMuZ2x1ZUVuY3J5cHRpb25BY2Nlc3NQb2xpY3kuYXR0YWNoVG9Sb2xlKHByaW5jaXBhbCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJpbmNpcGFsIGluc3RhbmNlb2YgVXNlcikge1xuICAgICAgICAgICAgdGhpcy5nbHVlRW5jcnlwdGlvbkFjY2Vzc1BvbGljeS5hdHRhY2hUb1VzZXIocHJpbmNpcGFsKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcmluY2lwYWwgaW5zdGFuY2VvZiBjZGsuUmVzb3VyY2UpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXNlciA9IHByaW5jaXBhbCBhcyBVc2VyO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2x1ZUVuY3J5cHRpb25BY2Nlc3NQb2xpY3kuYXR0YWNoVG9Vc2VyKHVzZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGV4Y2VwdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvbGUgPSBwcmluY2lwYWwgYXMgUm9sZTtcbiAgICAgICAgICAgICAgICB0aGlzLmdsdWVFbmNyeXB0aW9uQWNjZXNzUG9saWN5LmF0dGFjaFRvUm9sZShyb2xlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhleGNlcHRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgICovXG5cbiAgICAvKioqXG4gICAgICogR2l2ZW4gYSBJQU0gcHJpbmNpcGFsIGdpdmVyIHBlcm1pc3Npb25zIHRvIGFjY2VzcyBpbnRvIGEgYXRoZW5hIHJlc3VsdHMgYnVja2V0XG4gICAgICogQHBhcmFtIHByaW5jaXBhbCBJQU0gaWRlbnRpdHlcbiAgICAgKi9cbiAgICBwdWJsaWMgZ3JhbnRBdGhlbmFSZXN1bHRzQnVja2V0UGVybWlzc2lvbihwcmluY2lwYWw6IElQcmluY2lwYWwpIHtcbiAgICAgICAgaWYgKHByaW5jaXBhbCBpbnN0YW5jZW9mIFJvbGUpIHtcbiAgICAgICAgICAgIHRoaXMuYXRoZW5hUmVzdWx0c0J1Y2tldEFjY2Vzc1BvbGljeS5hdHRhY2hUb1JvbGUocHJpbmNpcGFsKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcmluY2lwYWwgaW5zdGFuY2VvZiBVc2VyKSB7XG4gICAgICAgICAgICB0aGlzLmF0aGVuYVJlc3VsdHNCdWNrZXRBY2Nlc3NQb2xpY3kuYXR0YWNoVG9Vc2VyKHByaW5jaXBhbCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJpbmNpcGFsIGluc3RhbmNlb2YgY2RrLlJlc291cmNlKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXIgPSBwcmluY2lwYWwgYXMgVXNlcjtcbiAgICAgICAgICAgICAgICB0aGlzLmF0aGVuYVJlc3VsdHNCdWNrZXRBY2Nlc3NQb2xpY3kuYXR0YWNoVG9Vc2VyKHVzZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGV4Y2VwdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvbGUgPSBwcmluY2lwYWwgYXMgUm9sZTtcbiAgICAgICAgICAgICAgICB0aGlzLmF0aGVuYVJlc3VsdHNCdWNrZXRBY2Nlc3NQb2xpY3kuYXR0YWNoVG9Sb2xlKHJvbGUpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGV4Y2VwdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59Il19