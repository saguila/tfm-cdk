"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLakeConfRegistration = void 0;
const cdk = require("@aws-cdk/core");
const iam = require("@aws-cdk/aws-iam");
const lakeformation = require("@aws-cdk/aws-lakeformation");
class DataLakeConfRegistration extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.DataSetName = props.dataSetName;
        this.CoarseIamPoliciesApplied = false;
        this.WorkflowCronScheduleExpression = props.workflowCronScheduleExpression;
    }
    grantGlueRoleLakeFormationPermissions(dataSetGlueRole, dataSetName) {
        //TODO: Permissions for database destination
        //Landing
        this.grantDataLocationPermissions(dataSetGlueRole, {
            Grantable: true,
            GrantResourcePrefix: `${dataSetName}locationGrant`,
            Location: this.DataRegistration.DataLakeBucketName,
            LocationPrefix: `/${this.DataRegistration.LandingGlueDatabase}/`
        });
        this.grantDatabasePermission(dataSetGlueRole, {
            DatabasePermissions: [DataLakeConfRegistration.DatabasePermission.All],
            GrantableDatabasePermissions: [DataLakeConfRegistration.DatabasePermission.All],
            GrantResourcePrefix: `${dataSetName}RoleGrant`
        }, true);
    }
    createCoarseIamPolicy() {
        const s3Policy = {
            "Action": [
                "s3:GetObject*",
                "s3:GetBucket*",
                "s3:List*"
            ],
            "Resource": [
                `arn:aws:s3:::${this.DataRegistration.DataLakeBucketName}`,
                `arn:aws:s3:::${this.DataRegistration.DataLakeBucketName}/${this.DataRegistration.LandingGlueDatabase.databaseName}/*`,
                `arn:aws:s3:::${this.DataRegistration.DataLakeBucketName}/${this.DataRegistration.StagingGlueDatabase.databaseName}/*`,
                `arn:aws:s3:::${this.DataRegistration.DataLakeBucketName}/${this.DataRegistration.GoldGlueDatabase.databaseName}/*` //(R)Changed
            ],
            "Effect": "Allow"
        };
        const s3PolicyStatement = iam.PolicyStatement.fromJson(s3Policy);
        const gluePolicy = {
            "Action": [
                "glue:GetDatabase",
                "glue:GetTable",
            ],
            "Resource": [
                `arn:aws:glue:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:catalog`,
                `arn:aws:glue:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:database/default`,
                this.DataRegistration.LandingGlueDatabase.databaseArn,
                this.DataRegistration.StagingGlueDatabase.databaseArn,
                this.DataRegistration.GoldGlueDatabase.databaseArn,
                `arn:aws:glue:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${this.DataRegistration.LandingGlueDatabase.databaseName}/*`,
                `arn:aws:glue:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${this.DataRegistration.StagingGlueDatabase.databaseName}/*`,
                `arn:aws:glue:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${this.DataRegistration.GoldGlueDatabase.databaseName}/*` //(R)added
            ],
            "Effect": "Allow"
        };
        const gluePolicyStatement = iam.PolicyStatement.fromJson(gluePolicy);
        const athenaPolicy = {
            "Action": [
                "athena:BatchGetNamedQuery",
                "athena:BatchGetQueryExecution",
                "athena:GetQueryExecution",
                "athena:GetQueryResults",
                "athena:GetQueryResultsStream",
                "athena:GetWorkGroup",
                "athena:ListTagsForResource",
                "athena:StartQueryExecution"
            ],
            "Resource": [
                `arn:aws:athena:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:*`
            ],
            "Effect": "Allow"
        };
        const athenaPolicyStatement = iam.PolicyStatement.fromJson(athenaPolicy);
        //https://docs.aws.amazon.com/lake-formation/latest/dg/cloudtrail-tut-create-lf-user.html
        const lakeFormationPolicy = {
            "Effect": "Allow",
            "Action": [
                "lakeformation:GetDataAccess",
                "glue:GetTable",
                "glue:GetTables",
                "glue:SearchTables",
                "glue:GetDatabase",
                "glue:GetDatabases",
                "glue:GetPartitions"
            ],
            "Resource": "*"
        };
        const coarseLakeFormationPolicy = iam.PolicyStatement.fromJson(lakeFormationPolicy);
        const policyParams = {
            policyName: `${this.DataSetName}-coarseIamDataLakeAccessPolicy`,
            statements: [s3PolicyStatement, gluePolicyStatement, athenaPolicyStatement, coarseLakeFormationPolicy]
        };
        this.CoarseResourceAccessPolicy = new iam.ManagedPolicy(this, `${this.DataSetName}-coarseIamDataLakeAccessPolicy`, policyParams);
        // This is effectively the same as the AWS Managed Policy AthenaFullAccess
        const coarseAthenaAccess = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "athena:*"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "glue:CreateDatabase",
                        "glue:DeleteDatabase",
                        "glue:GetDatabase",
                        "glue:GetDatabases",
                        "glue:UpdateDatabase",
                        "glue:CreateTable",
                        "glue:DeleteTable",
                        "glue:BatchDeleteTable",
                        "glue:UpdateTable",
                        "glue:GetTable",
                        "glue:GetTables",
                        "glue:BatchCreatePartition",
                        "glue:CreatePartition",
                        "glue:DeletePartition",
                        "glue:BatchDeletePartition",
                        "glue:UpdatePartition",
                        "glue:GetPartition",
                        "glue:GetPartitions",
                        "glue:BatchGetPartition"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetBucketLocation",
                        "s3:GetObject",
                        "s3:ListBucket",
                        "s3:ListBucketMultipartUploads",
                        "s3:ListMultipartUploadParts",
                        "s3:AbortMultipartUpload",
                        "s3:CreateBucket",
                        "s3:PutObject"
                    ],
                    "Resource": [
                        "arn:aws:s3:::aws-athena-query-results-*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetObject",
                        "s3:ListBucket"
                    ],
                    "Resource": [
                        "arn:aws:s3:::athena-examples*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:ListBucket",
                        "s3:GetBucketLocation",
                        "s3:ListAllMyBuckets"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "sns:ListTopics",
                        "sns:GetTopicAttributes"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "cloudwatch:PutMetricAlarm",
                        "cloudwatch:DescribeAlarms",
                        "cloudwatch:DeleteAlarms"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "lakeformation:GetDataAccess"
                    ],
                    "Resource": [
                        "*"
                    ]
                }
            ]
        };
        const coarseAthenaAccessPolicyDoc = iam.PolicyDocument.fromJson(coarseAthenaAccess);
        this.CoarseAthenaAccessPolicy = new iam.ManagedPolicy(this, `${this.DataSetName}-coarseIamAthenaAccessPolicy`, {
            document: coarseAthenaAccessPolicyDoc,
            description: `${this.DataSetName}-coarseIamAthenaAccessPolicy`,
        });
    }
    /* Attach S3 location and permissions to Lake Formation */
    grantDataLocationPermissions(principal, permissionGrant, sourceLakeFormationLocation) {
        let grantIdPrefix = "";
        let dataLakePrincipal = {
            dataLakePrincipalIdentifier: ""
        };
        const s3Arn = `arn:aws:s3:::${permissionGrant.Location}${permissionGrant.LocationPrefix}`;
        let dataLocationProperty = {
            dataLocationResource: {
                s3Resource: s3Arn
            }
        };
        const resolvedPrincipalType = this.determinePrincipalType(principal);
        if (resolvedPrincipalType === iam.Role) {
            const resolvedPrincipal = principal;
            if (permissionGrant.GrantResourcePrefix) {
                grantIdPrefix = `${permissionGrant.GrantResourcePrefix}-${this.DataSetName}`; //`${permissionGrant.GrantResourcePrefix}-${this.DataSetName}`
            }
            else {
                grantIdPrefix = `${resolvedPrincipal.roleName}-${this.DataSetName}`;
            }
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.roleArn };
        }
        if (resolvedPrincipalType === iam.User) {
            const resolvedPrincipal = principal;
            grantIdPrefix = `${resolvedPrincipal.userName}-${this.DataSetName}`;
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.userArn };
        }
        if (permissionGrant.Grantable) {
            const locationPermission = this.createLakeFormationPermission(`${grantIdPrefix}-locationGrant`, dataLakePrincipal, dataLocationProperty, ['DATA_LOCATION_ACCESS'], ['DATA_LOCATION_ACCESS']);
            if (sourceLakeFormationLocation != null) {
                locationPermission.addDependsOn(sourceLakeFormationLocation);
            }
        }
        else {
            const locationPermission = this.createLakeFormationPermission(`${grantIdPrefix}-locationGrant`, dataLakePrincipal, dataLocationProperty, ['DATA_LOCATION_ACCESS'], ['']);
            if (sourceLakeFormationLocation != null) {
                locationPermission.addDependsOn(sourceLakeFormationLocation);
            }
        }
    }
    grantTableWithColumnPermissions(principal, permissionGrant) {
        const coreGrant = this.setupIamAndLakeFormationDatabasePermissionForPrincipal(principal, permissionGrant.DatabasePermissions, permissionGrant.GrantableDatabasePermissions);
        const timeInMilisStr = (new Date().getTime() / Math.floor(Math.random() * 100)).toString();
        const wildcardProperty = {
            excludedColumnNames: permissionGrant.columns
        };
        let tableWithColumnsProperty = {
            columnNames: permissionGrant.columns,
            databaseName: permissionGrant.database,
            name: permissionGrant.table
        };
        if (permissionGrant.wildCardFilter === null) {
            tableWithColumnsProperty = {
                columnNames: permissionGrant.columns,
                databaseName: permissionGrant.database,
                name: permissionGrant.table
            };
        }
        else {
            if (permissionGrant.wildCardFilter == DataLakeConfRegistration.TableWithColumnFilter.Include) {
                tableWithColumnsProperty = {
                    columnNames: permissionGrant.columns,
                    databaseName: permissionGrant.database,
                    name: permissionGrant.table
                };
            }
            if (permissionGrant.wildCardFilter == DataLakeConfRegistration.TableWithColumnFilter.Exclude) {
                tableWithColumnsProperty = {
                    databaseName: permissionGrant.database,
                    name: permissionGrant.table,
                    columnWildcard: {
                        excludedColumnNames: permissionGrant.columns
                    }
                };
            }
        }
        const tableWithColumnResourceProperty = {
            tableWithColumnsResource: tableWithColumnsProperty
        };
        // this.createLakeFormationPermission(`${coreGrant.grantIdPrefix}-${permissionGrant.table}-databaseTableWithColumnGrant`,coreGrant.dataLakePrincipal , tableWithColumnResourceProperty, permissionGrant.TableColumnPermissions, permissionGrant.GrantableTableColumnPermissions)
        this.createLakeFormationPermission(`${permissionGrant.table}-${timeInMilisStr}-databaseTableWithColumnGrant`, coreGrant.dataLakePrincipal, tableWithColumnResourceProperty, permissionGrant.TableColumnPermissions, permissionGrant.GrantableTableColumnPermissions);
    }
    grantDatabasePermission(principal, permissionGrant, includeSourceDb = false) {
        const timeInMilisStr = (new Date().getTime() / Math.floor(Math.random() * 100)).toString();
        let grantIdPrefix = "";
        let dataLakePrincipal = {
            dataLakePrincipalIdentifier: ""
        };
        let databaseResourceProperty = {
            databaseResource: { name: this.DataRegistration.StagingGlueDatabase.databaseName }
        };
        const resolvedPrincipalType = this.determinePrincipalType(principal);
        if (resolvedPrincipalType === iam.Role) {
            const resolvedPrincipal = principal;
            if (permissionGrant.GrantResourcePrefix) {
                grantIdPrefix = `${permissionGrant.GrantResourcePrefix}-${this.DataSetName}`;
            }
            else {
                grantIdPrefix = `${this.DataSetName}-${timeInMilisStr}`; //`${resolvedPrincipal.roleName}-${this.DataSetName}` //(R)
            }
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.roleArn };
        }
        if (resolvedPrincipalType === iam.User) {
            const resolvedPrincipal = principal;
            grantIdPrefix = `${this.DataSetName}-${timeInMilisStr}`; //`${resolvedPrincipal.userName}-${this.DataSetName}` //(R)
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.userArn };
        }
        this.createLakeFormationPermission(`${grantIdPrefix}-databaseGrant`, dataLakePrincipal, databaseResourceProperty, permissionGrant.DatabasePermissions, permissionGrant.GrantableDatabasePermissions);
        if (includeSourceDb) {
            databaseResourceProperty = {
                //dataLocationResource: {resourceArn: this.DataEnrollment.DataLakeBucketName},
                databaseResource: { name: this.DataRegistration.LandingGlueDatabase.databaseName }
            };
            this.createLakeFormationPermission(`${grantIdPrefix}-databaseSrcGrant`, dataLakePrincipal, databaseResourceProperty, permissionGrant.DatabasePermissions, permissionGrant.GrantableDatabasePermissions);
        }
    }
    grantTablePermissions(principal, permissionGrant) {
        const coreGrant = this.setupIamAndLakeFormationDatabasePermissionForPrincipal(principal, permissionGrant.DatabasePermissions, permissionGrant.GrantableDatabasePermissions);
        permissionGrant.tables.forEach(table => {
            var tableResourceProperty = {
                tableResource: {
                    name: table,
                    databaseName: this.DataRegistration.StagingGlueDatabase.databaseName
                }
            };
            this.createLakeFormationPermission(`${coreGrant.grantIdPrefix}-${table}-databaseTableGrant`, coreGrant.dataLakePrincipal, tableResourceProperty, permissionGrant.TablePermissions, permissionGrant.GrantableTablePermissions);
        });
    }
    grantCoarseIamRead(principal) {
        const resolvedPrincipalType = this.determinePrincipalType(principal);
        if (resolvedPrincipalType === iam.Role) {
            this.CoarseAthenaAccessPolicy.attachToRole(principal);
            this.CoarseResourceAccessPolicy.attachToRole(principal);
            this.CoarseIamPoliciesApplied = true;
            return;
        }
        if (resolvedPrincipalType === iam.User) {
            this.CoarseAthenaAccessPolicy.attachToUser(principal);
            this.CoarseResourceAccessPolicy.attachToUser(principal);
            this.CoarseIamPoliciesApplied = true;
            return;
        }
    }
    createLakeFormationPermission(resourceId, dataLakePrincipal, resource, permissions, grantablePremissions) {
        return new lakeformation.CfnPermissions(this, resourceId, {
            dataLakePrincipal: dataLakePrincipal,
            resource: resource,
            permissions: permissions,
            permissionsWithGrantOption: grantablePremissions
        });
    }
    determinePrincipalType(principal) {
        if (principal instanceof iam.Role) {
            //return principal as iam.Role;
            return iam.Role;
        }
        if (principal instanceof iam.User) {
            //return principal as iam.User;
            return iam.User;
        }
        if (principal instanceof cdk.Resource) {
            try {
                const user = principal;
                return iam.User;
            }
            catch (exception) {
                console.log(exception);
            }
            try {
                const role = principal;
                return iam.Role;
            }
            catch (exception) {
                console.log(exception);
            }
        }
        throw ("Unable to deterimine principal type...");
    }
    setupIamAndLakeFormationDatabasePermissionForPrincipal(principal, databasePermissions, grantableDatabasePermissions) {
        this.grantCoarseIamRead(principal);
        var grantIdPrefix = "";
        var dataLakePrincipal = {
            dataLakePrincipalIdentifier: ""
        };
        var databaseResourceProperty = {
            //dataLocationResource: {resourceArn: this.DataEnrollment.DataLakeBucketName},
            databaseResource: { name: this.DataRegistration.StagingGlueDatabase.databaseName }
        };
        const resolvedPrincipalType = this.determinePrincipalType(principal);
        if (resolvedPrincipalType === iam.Role) {
            const resolvedPrincipal = principal;
            grantIdPrefix = `${resolvedPrincipal.roleArn}-${this.DataSetName}`;
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.roleArn };
        }
        if (resolvedPrincipalType === iam.User) {
            const resolvedPrincipal = principal;
            grantIdPrefix = `${resolvedPrincipal.userName}-${this.DataSetName}`;
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.userArn };
        }
        this.grantDatabasePermission(principal, { DatabasePermissions: databasePermissions, GrantableDatabasePermissions: grantableDatabasePermissions });
        return { grantIdPrefix: grantIdPrefix, dataLakePrincipal: dataLakePrincipal };
    }
}
exports.DataLakeConfRegistration = DataLakeConfRegistration;
(function (DataLakeConfRegistration) {
    let DatabasePermission;
    (function (DatabasePermission) {
        DatabasePermission["All"] = "ALL";
        DatabasePermission["Alter"] = "ALTER";
        DatabasePermission["Drop"] = "DROP";
        DatabasePermission["CreateTable"] = "CREATE_TABLE";
        //DataLocationAccess= 'DATA_LOCATION_ACCESS'
    })(DatabasePermission = DataLakeConfRegistration.DatabasePermission || (DataLakeConfRegistration.DatabasePermission = {}));
    let TablePermission;
    (function (TablePermission) {
        TablePermission["All"] = "ALL";
        TablePermission["Select"] = "SELECT";
        TablePermission["Alter"] = "ALTER";
        TablePermission["Drop"] = "DROP";
        TablePermission["Delete"] = "DELETE";
        TablePermission["Insert"] = "INSERT";
    })(TablePermission = DataLakeConfRegistration.TablePermission || (DataLakeConfRegistration.TablePermission = {}));
    let TableWithColumnFilter;
    (function (TableWithColumnFilter) {
        TableWithColumnFilter["Include"] = "Include";
        TableWithColumnFilter["Exclude"] = "Exclude";
    })(TableWithColumnFilter = DataLakeConfRegistration.TableWithColumnFilter || (DataLakeConfRegistration.TableWithColumnFilter = {}));
})(DataLakeConfRegistration = exports.DataLakeConfRegistration || (exports.DataLakeConfRegistration = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1sYWtlLWNvbmYtcmVnaXN0cmF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGF0YS1sYWtlLWNvbmYtcmVnaXN0cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFDQUFxQztBQUNyQyx3Q0FBeUM7QUFFekMsNERBQTZEO0FBRzdELE1BQWEsd0JBQXlCLFNBQVEsR0FBRyxDQUFDLFNBQVM7SUFTdkQsWUFBWSxLQUFvQixFQUFFLEVBQVUsRUFBRSxLQUFpRDtRQUMzRixLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztRQUNyQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsS0FBSyxDQUFDO1FBQ3RDLElBQUksQ0FBQyw4QkFBOEIsR0FBRyxLQUFLLENBQUMsOEJBQThCLENBQUM7SUFFL0UsQ0FBQztJQUVELHFDQUFxQyxDQUFDLGVBQXlCLEVBQUUsV0FBbUI7UUFDaEYsNENBQTRDO1FBQzVDLFNBQVM7UUFDVCxJQUFJLENBQUMsNEJBQTRCLENBQUMsZUFBZSxFQUFFO1lBQy9DLFNBQVMsRUFBRSxJQUFJO1lBQ2YsbUJBQW1CLEVBQUUsR0FBRyxXQUFXLGVBQWU7WUFDbEQsUUFBUSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0I7WUFDbEQsY0FBYyxFQUFFLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixHQUFHO1NBQ25FLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLEVBQUc7WUFDM0MsbUJBQW1CLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUM7WUFDdEUsNEJBQTRCLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUM7WUFDL0UsbUJBQW1CLEVBQUUsR0FBRyxXQUFXLFdBQVc7U0FDakQsRUFBRSxJ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cG9ydCBpYW0gPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtaWFtJyk7XG5pbXBvcnQgczMgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtczMnKTtcbmltcG9ydCBsYWtlZm9ybWF0aW9uID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWxha2Vmb3JtYXRpb24nKTtcbmltcG9ydCB7IERhdGFzZXRHbHVlUmVnaXN0cmF0aW9uIH0gZnJvbSAnLi9kYXRhc2V0LWdsdWUtcmVnaXN0cmF0aW9uJztcblxuZXhwb3J0IGNsYXNzIERhdGFMYWtlQ29uZlJlZ2lzdHJhdGlvbiBleHRlbmRzIGNkay5Db25zdHJ1Y3Qge1xuXG4gICAgcHVibGljIERhdGFSZWdpc3RyYXRpb246IERhdGFzZXRHbHVlUmVnaXN0cmF0aW9uO1xuICAgIHB1YmxpYyBEYXRhU2V0TmFtZTogc3RyaW5nO1xuICAgIHB1YmxpYyBDb2Fyc2VBdGhlbmFBY2Nlc3NQb2xpY3k6IGlhbS5NYW5hZ2VkUG9saWN5O1xuICAgIHByaXZhdGUgQ29hcnNlUmVzb3VyY2VBY2Nlc3NQb2xpY3k6IGlhbS5NYW5hZ2VkUG9saWN5O1xuICAgIHByaXZhdGUgQ29hcnNlSWFtUG9saWNpZXNBcHBsaWVkOiBib29sZWFuO1xuICAgIHByaXZhdGUgV29ya2Zsb3dDcm9uU2NoZWR1bGVFeHByZXNzaW9uPzogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5Db25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBEYXRhTGFrZUNvbmZSZWdpc3RyYXRpb24uRGF0YUxha2VDb25mUHJvcHMpIHtcbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgICAgICB0aGlzLkRhdGFTZXROYW1lID0gcHJvcHMuZGF0YVNldE5hbWU7XG4gICAgICAgIHRoaXMuQ29hcnNlSWFtUG9saWNpZXNBcHBsaWVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuV29ya2Zsb3dDcm9uU2NoZWR1bGVFeHByZXNzaW9uID0gcHJvcHMud29ya2Zsb3dDcm9uU2NoZWR1bGVFeHByZXNzaW9uO1xuXG4gICAgfVxuXG4gICAgZ3JhbnRHbHVlUm9sZUxha2VGb3JtYXRpb25QZXJtaXNzaW9ucyhkYXRhU2V0R2x1ZVJvbGU6IGlhbS5Sb2xlLCBkYXRhU2V0TmFtZTogc3RyaW5nKSB7XG4gICAgICAgIC8vVE9ETzogUGVybWlzc2lvbnMgZm9yIGRhdGFiYXNlIGRlc3RpbmF0aW9uXG4gICAgICAgIC8vTGFuZGluZ1xuICAgICAgICB0aGlzLmdyYW50RGF0YUxvY2F0aW9uUGVybWlzc2lvbnMoZGF0YVNldEdsdWVSb2xlLCB7XG4gICAgICAgICAgICBHcmFudGFibGU6IHRydWUsXG4gICAgICAgICAgICBHcmFudFJlc291cmNlUHJlZml4OiBgJHtkYXRhU2V0TmFtZX1sb2NhdGlvbkdyYW50YCxcbiAgICAgICAgICAgIExvY2F0aW9uOiB0aGlzLkRhdGFSZWdpc3RyYXRpb24uRGF0YUxha2VCdWNrZXROYW1lLFxuICAgICAgICAgICAgTG9jYXRpb25QcmVmaXg6IGAvJHt0aGlzLkRhdGFSZWdpc3RyYXRpb24uTGFuZGluZ0dsdWVEYXRhYmFzZX0vYFxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmdyYW50RGF0YWJhc2VQZXJtaXNzaW9uKGRhdGFTZXRHbHVlUm9sZSwgIHtcbiAgICAgICAgICAgIERhdGFiYXNlUGVybWlzc2lvbnM6IFtEYXRhTGFrZUNvbmZSZWdpc3RyYXRpb24uRGF0YWJhc2VQZXJtaXNzaW9uLkFsbF0sXG4gICAgICAgICAgICBHcmFudGFibGVEYXRhYmFzZVBlcm1pc3Npb25zOiBbRGF0YUxha2VDb25mUmVnaXN0cmF0aW9uLkRhdGFiYXNlUGVybWlzc2lvbi5BbGxdLFxuICAgICAgICAgICAgR3JhbnRSZXNvdXJjZVByZWZpeDogYCR7ZGF0YVNldE5hbWV9Um9sZUdyYW50YFxuICAgICAgICB9LCB0cnVlKTtcbiAgICB9XG5cblxuICAgIHB1YmxpYyBjcmVhdGVDb2Fyc2VJYW1Qb2xpY3koKXtcblxuICAgICAgICBjb25zdCBzM1BvbGljeSA9IHtcbiAgICAgICAgICAgIFwiQWN0aW9uXCI6IFtcbiAgICAgICAgICAgICAgICBcInMzOkdldE9iamVjdCpcIixcbiAgICAgICAgICAgICAgICBcInMzOkdldEJ1Y2tldCpcIixcbiAgICAgICAgICAgICAgICBcInMzOkxpc3QqXCJcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBcIlJlc291cmNlXCI6IFtcbiAgICAgICAgICAgICAgICBgYXJuOmF3czpzMzo6OiR7dGhpcy5EYXRhUmVnaXN0cmF0aW9uLkRhdGFMYWtlQnVja2V0TmFtZX1gLFxuICAgICAgICAgICAgICAgIGBhcm46YXdzOnMzOjo6JHt0aGlzLkRhdGFSZWdpc3RyYXRpb24uRGF0YUxha2VCdWNrZXROYW1lfS8ke3RoaXMuRGF0YVJlZ2lzdHJhdGlvbi5MYW5kaW5nR2x1ZURhdGFiYXNlLmRhdGFiYXNlTmFtZX0vKmAsIC8vKFIpQWRkZWRcbiAgICAgICAgICAgICAgICBgYXJuOmF3czpzMzo6OiR7dGhpcy5EYXRhUmVnaXN0cmF0aW9uLkRhdGFMYWtlQnVja2V0TmFtZX0vJHt0aGlzLkRhdGFSZWdpc3RyYXRpb24uU3RhZ2luZ0dsdWVEYXRhYmFzZS5kYXRhYmFzZU5hbWV9LypgLCAvLyhSKUNoYW5nZWRcbiAgICAgICAgICAgICAgICBgYXJuOmF3czpzMzo6OiR7dGhpcy5EYXRhUmVnaXN0cmF0aW9uLkRhdGFMYWtlQnVja2V0TmFtZX0vJHt0aGlzLkRhdGFSZWdpc3RyYXRpb24uR29sZEdsdWVEYXRhYmFzZS5kYXRhYmFzZU5hbWV9LypgLy8oUilDaGFuZ2VkXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiXG4gICAgICAgIH07XG5cblxuICAgICAgICBjb25zdCBzM1BvbGljeVN0YXRlbWVudCA9IGlhbS5Qb2xpY3lTdGF0ZW1lbnQuZnJvbUpzb24oczNQb2xpY3kpO1xuXG4gICAgICAgIGNvbnN0IGdsdWVQb2xpY3kgPSB7XG4gICAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICAgICAgXCJnbHVlOkdldERhdGFiYXNlXCIsXG4gICAgICAgICAgICAgICAgXCJnbHVlOkdldFRhYmxlXCIsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXCJSZXNvdXJjZVwiOiBbXG4gICAgICAgICAgICAgICAgYGFybjphd3M6Z2x1ZToke2Nkay5TdGFjay5vZih0aGlzKS5yZWdpb259OiR7Y2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnR9OmNhdGFsb2dgLFxuICAgICAgICAgICAgICAgIGBhcm46YXdzOmdsdWU6JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufToke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fTpkYXRhYmFzZS9kZWZhdWx0YCxcbiAgICAgICAgICAgICAgICB0aGlzLkRhdGFSZWdpc3RyYXRpb24uTGFuZGluZ0dsdWVEYXRhYmFzZS5kYXRhYmFzZUFybixcbiAgICAgICAgICAgICAgICB0aGlzLkRhdGFSZWdpc3RyYXRpb24uU3RhZ2luZ0dsdWVEYXRhYmFzZS5kYXRhYmFzZUFybixcbiAgICAgICAgICAgICAgICB0aGlzLkRhdGFSZWdpc3RyYXRpb24uR29sZEdsdWVEYXRhYmFzZS5kYXRhYmFzZUFybixcbiAgICAgICAgICAgICAgICBgYXJuOmF3czpnbHVlOiR7Y2RrLlN0YWNrLm9mKHRoaXMpLnJlZ2lvbn06JHtjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudH06dGFibGUvJHt0aGlzLkRhdGFSZWdpc3RyYXRpb24uTGFuZGluZ0dsdWVEYXRhYmFzZS5kYXRhYmFzZU5hbWV9LypgLFxuICAgICAgICAgICAgICAgIGBhcm46YXdzOmdsdWU6JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufToke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fTp0YWJsZS8ke3RoaXMuRGF0YVJlZ2lzdHJhdGlvbi5TdGFnaW5nR2x1ZURhdGFiYXNlLmRhdGFiYXNlTmFtZX0vKmAsIC8vKFIpYWRkZWRcbiAgICAgICAgICAgICAgICBgYXJuOmF3czpnbHVlOiR7Y2RrLlN0YWNrLm9mKHRoaXMpLnJlZ2lvbn06JHtjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudH06dGFibGUvJHt0aGlzLkRhdGFSZWdpc3RyYXRpb24uR29sZEdsdWVEYXRhYmFzZS5kYXRhYmFzZU5hbWV9LypgIC8vKFIpYWRkZWRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCJcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgZ2x1ZVBvbGljeVN0YXRlbWVudCA9IGlhbS5Qb2xpY3lTdGF0ZW1lbnQuZnJvbUpzb24oZ2x1ZVBvbGljeSk7XG5cbiAgICAgICAgY29uc3QgYXRoZW5hUG9saWN5ID0ge1xuICAgICAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgICAgICAgIFwiYXRoZW5hOkJhdGNoR2V0TmFtZWRRdWVyeVwiLFxuICAgICAgICAgICAgICAgIFwiYXRoZW5hOkJhdGNoR2V0UXVlcnlFeGVjdXRpb25cIixcbiAgICAgICAgICAgICAgICBcImF0aGVuYTpHZXRRdWVyeUV4ZWN1dGlvblwiLFxuICAgICAgICAgICAgICAgIFwiYXRoZW5hOkdldFF1ZXJ5UmVzdWx0c1wiLFxuICAgICAgICAgICAgICAgIFwiYXRoZW5hOkdldFF1ZXJ5UmVzdWx0c1N0cmVhbVwiLFxuICAgICAgICAgICAgICAgIFwiYXRoZW5hOkdldFdvcmtHcm91cFwiLFxuICAgICAgICAgICAgICAgIFwiYXRoZW5hOkxpc3RUYWdzRm9yUmVzb3VyY2VcIixcbiAgICAgICAgICAgICAgICBcImF0aGVuYTpTdGFydFF1ZXJ5RXhlY3V0aW9uXCJcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBcIlJlc291cmNlXCI6IFtcbiAgICAgICAgICAgICAgICBgYXJuOmF3czphdGhlbmE6JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufToke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fToqYFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIlxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGF0aGVuYVBvbGljeVN0YXRlbWVudCA9IGlhbS5Qb2xpY3lTdGF0ZW1lbnQuZnJvbUpzb24oYXRoZW5hUG9saWN5KTtcblxuICAgICAgICAvL2h0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9sYWtlLWZvcm1hdGlvbi9sYXRlc3QvZGcvY2xvdWR0cmFpbC10dXQtY3JlYXRlLWxmLXVzZXIuaHRtbFxuICAgICAgICBjb25zdCBsYWtlRm9ybWF0aW9uUG9saWN5ID0ge1xuICAgICAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiLFxuICAgICAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgICAgICAgIFwibGFrZWZvcm1hdGlvbjpHZXREYXRhQWNjZXNzXCIsXG4gICAgICAgICAgICAgICAgXCJnbHVlOkdldFRhYmxlXCIsXG4gICAgICAgICAgICAgICAgXCJnbHVlOkdldFRhYmxlc1wiLFxuICAgICAgICAgICAgICAgIFwiZ2x1ZTpTZWFyY2hUYWJsZXNcIixcbiAgICAgICAgICAgICAgICBcImdsdWU6R2V0RGF0YWJhc2VcIixcbiAgICAgICAgICAgICAgICBcImdsdWU6R2V0RGF0YWJhc2VzXCIsXG4gICAgICAgICAgICAgICAgXCJnbHVlOkdldFBhcnRpdGlvbnNcIlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFwiUmVzb3VyY2VcIjogXCIqXCJcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBjb2Fyc2VMYWtlRm9ybWF0aW9uUG9saWN5ID0gaWFtLlBvbGljeVN0YXRlbWVudC5mcm9tSnNvbihsYWtlRm9ybWF0aW9uUG9saWN5KTtcblxuICAgICAgICBjb25zdCBwb2xpY3lQYXJhbXMgPSB7XG4gICAgICAgICAgICBwb2xpY3lOYW1lOiBgJHt0aGlzLkRhdGFTZXROYW1lfS1jb2Fyc2VJYW1EYXRhTGFrZUFjY2Vzc1BvbGljeWAsXG4gICAgICAgICAgICBzdGF0ZW1lbnRzOiBbczNQb2xpY3lTdGF0ZW1lbnQsZ2x1ZVBvbGljeVN0YXRlbWVudCwgYXRoZW5hUG9saWN5U3RhdGVtZW50LCBjb2Fyc2VMYWtlRm9ybWF0aW9uUG9saWN5XVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuQ29hcnNlUmVzb3VyY2VBY2Nlc3NQb2xpY3kgPSBuZXcgaWFtLk1hbmFnZWRQb2xpY3kodGhpcywgYCR7dGhpcy5EYXRhU2V0TmFtZX0tY29hcnNlSWFtRGF0YUxha2VBY2Nlc3NQb2xpY3lgLCBwb2xpY3lQYXJhbXMgKTtcblxuXG4gICAgICAgIC8vIFRoaXMgaXMgZWZmZWN0aXZlbHkgdGhlIHNhbWUgYXMgdGhlIEFXUyBNYW5hZ2VkIFBvbGljeSBBdGhlbmFGdWxsQWNjZXNzXG4gICAgICAgIGNvbnN0IGNvYXJzZUF0aGVuYUFjY2VzcyA9IHtcbiAgICAgICAgICAgIFwiVmVyc2lvblwiOiBcIjIwMTItMTAtMTdcIixcbiAgICAgICAgICAgIFwiU3RhdGVtZW50XCI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgICAgICAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJhdGhlbmE6KlwiXG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzb3VyY2VcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgXCIqXCJcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiQWN0aW9uXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2x1ZTpDcmVhdGVEYXRhYmFzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJnbHVlOkRlbGV0ZURhdGFiYXNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImdsdWU6R2V0RGF0YWJhc2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2x1ZTpHZXREYXRhYmFzZXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2x1ZTpVcGRhdGVEYXRhYmFzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJnbHVlOkNyZWF0ZVRhYmxlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImdsdWU6RGVsZXRlVGFibGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2x1ZTpCYXRjaERlbGV0ZVRhYmxlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImdsdWU6VXBkYXRlVGFibGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2x1ZTpHZXRUYWJsZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJnbHVlOkdldFRhYmxlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJnbHVlOkJhdGNoQ3JlYXRlUGFydGl0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImdsdWU6Q3JlYXRlUGFydGl0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImdsdWU6RGVsZXRlUGFydGl0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImdsdWU6QmF0Y2hEZWxldGVQYXJ0aXRpb25cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2x1ZTpVcGRhdGVQYXJ0aXRpb25cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2x1ZTpHZXRQYXJ0aXRpb25cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZ2x1ZTpHZXRQYXJ0aXRpb25zXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImdsdWU6QmF0Y2hHZXRQYXJ0aXRpb25cIlxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICBcIlJlc291cmNlXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiKlwiXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiLFxuICAgICAgICAgICAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcInMzOkdldEJ1Y2tldExvY2F0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInMzOkdldE9iamVjdFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzMzpMaXN0QnVja2V0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInMzOkxpc3RCdWNrZXRNdWx0aXBhcnRVcGxvYWRzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInMzOkxpc3RNdWx0aXBhcnRVcGxvYWRQYXJ0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzMzpBYm9ydE11bHRpcGFydFVwbG9hZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzMzpDcmVhdGVCdWNrZXRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiczM6UHV0T2JqZWN0XCJcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNvdXJjZVwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFybjphd3M6czM6Ojphd3MtYXRoZW5hLXF1ZXJ5LXJlc3VsdHMtKlwiXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiLFxuICAgICAgICAgICAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcInMzOkdldE9iamVjdFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzMzpMaXN0QnVja2V0XCJcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNvdXJjZVwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFybjphd3M6czM6OjphdGhlbmEtZXhhbXBsZXMqXCJcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIkVmZmVjdFwiOiBcIkFsbG93XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiQWN0aW9uXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiczM6TGlzdEJ1Y2tldFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzMzpHZXRCdWNrZXRMb2NhdGlvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzMzpMaXN0QWxsTXlCdWNrZXRzXCJcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNvdXJjZVwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcIipcIlxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgICAgICAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJzbnM6TGlzdFRvcGljc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzbnM6R2V0VG9waWNBdHRyaWJ1dGVzXCJcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgXCJSZXNvdXJjZVwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcIipcIlxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiRWZmZWN0XCI6IFwiQWxsb3dcIixcbiAgICAgICAgICAgICAgICAgICAgXCJBY3Rpb25cIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJjbG91ZHdhdGNoOlB1dE1ldHJpY0FsYXJtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNsb3Vkd2F0Y2g6RGVzY3JpYmVBbGFybXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiY2xvdWR3YXRjaDpEZWxldGVBbGFybXNcIlxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICBcIlJlc291cmNlXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiKlwiXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiLFxuICAgICAgICAgICAgICAgICAgICBcIkFjdGlvblwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcImxha2Vmb3JtYXRpb246R2V0RGF0YUFjY2Vzc1wiXG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIFwiUmVzb3VyY2VcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgXCIqXCJcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBjb2Fyc2VBdGhlbmFBY2Nlc3NQb2xpY3lEb2MgPSBpYW0uUG9saWN5RG9jdW1lbnQuZnJvbUpzb24oY29hcnNlQXRoZW5hQWNjZXNzKTtcblxuICAgICAgICB0aGlzLkNvYXJzZUF0aGVuYUFjY2Vzc1BvbGljeSA9IG5ldyBpYW0uTWFuYWdlZFBvbGljeSh0aGlzLCBgJHt0aGlzLkRhdGFTZXROYW1lfS1jb2Fyc2VJYW1BdGhlbmFBY2Nlc3NQb2xpY3lgLCB7XG4gICAgICAgICAgICBkb2N1bWVudDogY29hcnNlQXRoZW5hQWNjZXNzUG9saWN5RG9jLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGAke3RoaXMuRGF0YVNldE5hbWV9LWNvYXJzZUlhbUF0aGVuYUFjY2Vzc1BvbGljeWAsXG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgLyogQXR0YWNoIFMzIGxvY2F0aW9uIGFuZCBwZXJtaXNzaW9ucyB0byBMYWtlIEZvcm1hdGlvbiAqL1xuICAgIHB1YmxpYyBncmFudERhdGFMb2NhdGlvblBlcm1pc3Npb25zKHByaW5jaXBhbDogaWFtLklQcmluY2lwYWwsIHBlcm1pc3Npb25HcmFudDogRGF0YUxha2VDb25mUmVnaXN0cmF0aW9uLkRhdGFMb2NhdGlvbkdyYW50ICwgc291cmNlTGFrZUZvcm1hdGlvbkxvY2F0aW9uPzogbGFrZWZvcm1hdGlvbi5DZm5SZXNvdXJjZSApe1xuXG4gICAgICAgIGxldCBncmFudElkUHJlZml4ID0gXCJcIjtcbiAgICAgICAgbGV0IGRhdGFMYWtlUHJpbmNpcGFsIDogbGFrZWZvcm1hdGlvbi5DZm5QZXJtaXNzaW9ucy5EYXRhTGFrZVByaW5jaXBhbFByb3BlcnR5ID0ge1xuICAgICAgICAgICAgZGF0YUxha2VQcmluY2lwYWxJZGVudGlmaWVyOiBcIlwiXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgczNBcm4gPSBgYXJuOmF3czpzMzo6OiR7cGVybWlzc2lvbkdyYW50LkxvY2F0aW9ufSR7cGVybWlzc2lvbkdyYW50LkxvY2F0aW9uUHJlZml4fWAgO1xuXG4gICAgICAgIGxldCBkYXRhTG9jYXRpb25Qcm9wZXJ0eSA6IGxha2Vmb3JtYXRpb24uQ2ZuUGVybWlzc2lvbnMuUmVzb3VyY2VQcm9wZXJ0eSA9IHtcbiAgICAgICAgICAgIGRhdGFMb2NhdGlvblJlc291cmNlOiB7XG4gICAgICAgICAgICAgICAgczNSZXNvdXJjZTogczNBcm5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZXNvbHZlZFByaW5jaXBhbFR5cGUgPSB0aGlzLmRldGVybWluZVByaW5jaXBhbFR5cGUocHJpbmNpcGFsKTtcblxuICAgICAgICBpZihyZXNvbHZlZFByaW5jaXBhbFR5cGUgPT09IGlhbS5Sb2xlKSB7XG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZFByaW5jaXBhbCA9IHByaW5jaXBhbCBhcyAgaWFtLlJvbGU7XG5cbiAgICAgICAgICAgIGlmKHBlcm1pc3Npb25HcmFudC5HcmFudFJlc291cmNlUHJlZml4KXtcbiAgICAgICAgICAgICAgICBncmFudElkUHJlZml4ID0gYCR7cGVybWlzc2lvbkdyYW50LkdyYW50UmVzb3VyY2VQcmVmaXh9LSR7dGhpcy5EYXRhU2V0TmFtZX1gLy9gJHtwZXJtaXNzaW9uR3JhbnQuR3JhbnRSZXNvdXJjZVByZWZpeH0tJHt0aGlzLkRhdGFTZXROYW1lfWBcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGdyYW50SWRQcmVmaXggPSBgJHtyZXNvbHZlZFByaW5jaXBhbC5yb2xlTmFtZX0tJHt0aGlzLkRhdGFTZXROYW1lfWBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRhdGFMYWtlUHJpbmNpcGFsID0geyBkYXRhTGFrZVByaW5jaXBhbElkZW50aWZpZXI6IHJlc29sdmVkUHJpbmNpcGFsLnJvbGVBcm4gfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHJlc29sdmVkUHJpbmNpcGFsVHlwZSA9PT0gaWFtLlVzZXIpe1xuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQcmluY2lwYWwgPSBwcmluY2lwYWwgYXMgIGlhbS5Vc2VyO1xuICAgICAgICAgICAgZ3JhbnRJZFByZWZpeCA9IGAke3Jlc29sdmVkUHJpbmNpcGFsLnVzZXJOYW1lfS0ke3RoaXMuRGF0YVNldE5hbWV9YFxuICAgICAgICAgICAgZGF0YUxha2VQcmluY2lwYWwgPSB7IGRhdGFMYWtlUHJpbmNpcGFsSWRlbnRpZmllcjogcmVzb2x2ZWRQcmluY2lwYWwudXNlckFybiB9O1xuICAgICAgICB9XG5cblxuICAgICAgICBpZihwZXJtaXNzaW9uR3JhbnQuR3JhbnRhYmxlKXtcbiAgICAgICAgICAgIGNvbnN0IGxvY2F0aW9uUGVybWlzc2lvbiA9IHRoaXMuY3JlYXRlTGFrZUZvcm1hdGlvblBlcm1pc3Npb24oYCR7Z3JhbnRJZFByZWZpeH0tbG9jYXRpb25HcmFudGAsZGF0YUxha2VQcmluY2lwYWwgLCBkYXRhTG9jYXRpb25Qcm9wZXJ0eSwgWydEQVRBX0xPQ0FUSU9OX0FDQ0VTUyddLCBbJ0RBVEFfTE9DQVRJT05fQUNDRVNTJ10pO1xuXG4gICAgICAgICAgICBpZiAoc291cmNlTGFrZUZvcm1hdGlvbkxvY2F0aW9uICE9IG51bGwgKSB7XG4gICAgICAgICAgICAgICAgbG9jYXRpb25QZXJtaXNzaW9uLmFkZERlcGVuZHNPbihzb3VyY2VMYWtlRm9ybWF0aW9uTG9jYXRpb24pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1lbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxvY2F0aW9uUGVybWlzc2lvbiA9IHRoaXMuY3JlYXRlTGFrZUZvcm1hdGlvblBlcm1pc3Npb24oYCR7Z3JhbnRJZFByZWZpeH0tbG9jYXRpb25HcmFudGAsZGF0YUxha2VQcmluY2lwYWwgLCBkYXRhTG9jYXRpb25Qcm9wZXJ0eSwgWydEQVRBX0xPQ0FUSU9OX0FDQ0VTUyddLCBbJyddKTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VMYWtlRm9ybWF0aW9uTG9jYXRpb24gIT0gbnVsbCApIHtcbiAgICAgICAgICAgICAgICBsb2NhdGlvblBlcm1pc3Npb24uYWRkRGVwZW5kc09uKHNvdXJjZUxha2VGb3JtYXRpb25Mb2NhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgZ3JhbnRUYWJsZVdpdGhDb2x1bW5QZXJtaXNzaW9ucyhwcmluY2lwYWw6IGlhbS5JUHJpbmNpcGFsLCBwZXJtaXNzaW9uR3JhbnQ6IERhdGFMYWtlQ29uZlJlZ2lzdHJhdGlvbi5UYWJsZVdpdGhDb2x1bW5QZXJtaXNzaW9uR3JhbnQpe1xuXG4gICAgICAgIGNvbnN0IGNvcmVHcmFudCA9IHRoaXMuc2V0dXBJYW1BbmRMYWtlRm9ybWF0aW9uRGF0YWJhc2VQZXJtaXNzaW9uRm9yUHJpbmNpcGFsKHByaW5jaXBhbCwgcGVybWlzc2lvbkdyYW50LkRhdGFiYXNlUGVybWlzc2lvbnMsIHBlcm1pc3Npb25HcmFudC5HcmFudGFibGVEYXRhYmFzZVBlcm1pc3Npb25zKTtcbiAgICAgICAgY29uc3QgdGltZUluTWlsaXNTdHIgOnN0cmluZyA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSAvIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMCkpLnRvU3RyaW5nKCk7XG5cblxuICAgICAgICBjb25zdCB3aWxkY2FyZFByb3BlcnR5OiBsYWtlZm9ybWF0aW9uLkNmblBlcm1pc3Npb25zLkNvbHVtbldpbGRjYXJkUHJvcGVydHkgPSB7XG4gICAgICAgICAgICBleGNsdWRlZENvbHVtbk5hbWVzOiBwZXJtaXNzaW9uR3JhbnQuY29sdW1uc1xuICAgICAgICB9O1xuXG4gICAgICAgIGxldCB0YWJsZVdpdGhDb2x1bW5zUHJvcGVydHkgOiBsYWtlZm9ybWF0aW9uLkNmblBlcm1pc3Npb25zLlRhYmxlV2l0aENvbHVtbnNSZXNvdXJjZVByb3BlcnR5ID0ge1xuICAgICAgICAgICAgY29sdW1uTmFtZXM6IHBlcm1pc3Npb25HcmFudC5jb2x1bW5zLFxuICAgICAgICAgICAgZGF0YWJhc2VOYW1lOiBwZXJtaXNzaW9uR3JhbnQuZGF0YWJhc2UsXG4gICAgICAgICAgICBuYW1lOiBwZXJtaXNzaW9uR3JhbnQudGFibGVcbiAgICAgICAgfTtcblxuICAgICAgICBpZihwZXJtaXNzaW9uR3JhbnQud2lsZENhcmRGaWx0ZXIgPT09IG51bGwpe1xuICAgICAgICAgICAgdGFibGVXaXRoQ29sdW1uc1Byb3BlcnR5ID0ge1xuICAgICAgICAgICAgICAgIGNvbHVtbk5hbWVzOiBwZXJtaXNzaW9uR3JhbnQuY29sdW1ucyxcbiAgICAgICAgICAgICAgICBkYXRhYmFzZU5hbWU6IHBlcm1pc3Npb25HcmFudC5kYXRhYmFzZSxcbiAgICAgICAgICAgICAgICBuYW1lOiBwZXJtaXNzaW9uR3JhbnQudGFibGVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1lbHNle1xuXG4gICAgICAgICAgICBpZihwZXJtaXNzaW9uR3JhbnQud2lsZENhcmRGaWx0ZXIgPT0gRGF0YUxha2VDb25mUmVnaXN0cmF0aW9uLlRhYmxlV2l0aENvbHVtbkZpbHRlci5JbmNsdWRlKXtcbiAgICAgICAgICAgICAgICB0YWJsZVdpdGhDb2x1bW5zUHJvcGVydHkgPSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbk5hbWVzOiBwZXJtaXNzaW9uR3JhbnQuY29sdW1ucyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YWJhc2VOYW1lOiBwZXJtaXNzaW9uR3JhbnQuZGF0YWJhc2UsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHBlcm1pc3Npb25HcmFudC50YWJsZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHBlcm1pc3Npb25HcmFudC53aWxkQ2FyZEZpbHRlciA9PSBEYXRhTGFrZUNvbmZSZWdpc3RyYXRpb24uVGFibGVXaXRoQ29sdW1uRmlsdGVyLkV4Y2x1ZGUpe1xuICAgICAgICAgICAgICAgIHRhYmxlV2l0aENvbHVtbnNQcm9wZXJ0eSA9IHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YWJhc2VOYW1lOiBwZXJtaXNzaW9uR3JhbnQuZGF0YWJhc2UsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHBlcm1pc3Npb25HcmFudC50YWJsZSxcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uV2lsZGNhcmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVkQ29sdW1uTmFtZXM6IHBlcm1pc3Npb25HcmFudC5jb2x1bW5zXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0YWJsZVdpdGhDb2x1bW5SZXNvdXJjZVByb3BlcnR5IDogbGFrZWZvcm1hdGlvbi5DZm5QZXJtaXNzaW9ucy5SZXNvdXJjZVByb3BlcnR5ID0ge1xuICAgICAgICAgICAgdGFibGVXaXRoQ29sdW1uc1Jlc291cmNlOiB0YWJsZVdpdGhDb2x1bW5zUHJvcGVydHlcbiAgICAgICAgfTtcblxuICAgICAgICAvLyB0aGlzLmNyZWF0ZUxha2VGb3JtYXRpb25QZXJtaXNzaW9uKGAke2NvcmVHcmFudC5ncmFudElkUHJlZml4fS0ke3Blcm1pc3Npb25HcmFudC50YWJsZX0tZGF0YWJhc2VUYWJsZVdpdGhDb2x1bW5HcmFudGAsY29yZUdyYW50LmRhdGFMYWtlUHJpbmNpcGFsICwgdGFibGVXaXRoQ29sdW1uUmVzb3VyY2VQcm9wZXJ0eSwgcGVybWlzc2lvbkdyYW50LlRhYmxlQ29sdW1uUGVybWlzc2lvbnMsIHBlcm1pc3Npb25HcmFudC5HcmFudGFibGVUYWJsZUNvbHVtblBlcm1pc3Npb25zKVxuXG4gICAgICAgIHRoaXMuY3JlYXRlTGFrZUZvcm1hdGlvblBlcm1pc3Npb24oYCR7cGVybWlzc2lvbkdyYW50LnRhYmxlfS0ke3RpbWVJbk1pbGlzU3RyfS1kYXRhYmFzZVRhYmxlV2l0aENvbHVtbkdyYW50YCxjb3JlR3JhbnQuZGF0YUxha2VQcmluY2lwYWwgLCB0YWJsZVdpdGhDb2x1bW5SZXNvdXJjZVByb3BlcnR5LCBwZXJtaXNzaW9uR3JhbnQuVGFibGVDb2x1bW5QZXJtaXNzaW9ucywgcGVybWlzc2lvbkdyYW50LkdyYW50YWJsZVRhYmxlQ29sdW1uUGVybWlzc2lvbnMpXG5cblxuICAgIH1cblxuICAgIHB1YmxpYyBncmFudERhdGFiYXNlUGVybWlzc2lvbihwcmluY2lwYWw6IGlhbS5JUHJpbmNpcGFsLCBwZXJtaXNzaW9uR3JhbnQ6IERhdGFMYWtlQ29uZlJlZ2lzdHJhdGlvbi5EYXRhYmFzZVBlcm1pc3Npb25HcmFudCwgaW5jbHVkZVNvdXJjZURiOiBib29sZWFuID0gZmFsc2Upe1xuICAgICAgICBjb25zdCB0aW1lSW5NaWxpc1N0ciA6c3RyaW5nID0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwKSkudG9TdHJpbmcoKTtcbiAgICAgICAgbGV0IGdyYW50SWRQcmVmaXggPSBcIlwiO1xuICAgICAgICBsZXQgZGF0YUxha2VQcmluY2lwYWwgOiBsYWtlZm9ybWF0aW9uLkNmblBlcm1pc3Npb25zLkRhdGFMYWtlUHJpbmNpcGFsUHJvcGVydHkgPSB7XG4gICAgICAgICAgICBkYXRhTGFrZVByaW5jaXBhbElkZW50aWZpZXI6IFwiXCJcbiAgICAgICAgfTtcbiAgICAgICAgbGV0IGRhdGFiYXNlUmVzb3VyY2VQcm9wZXJ0eSA6IGxha2Vmb3JtYXRpb24uQ2ZuUGVybWlzc2lvbnMuUmVzb3VyY2VQcm9wZXJ0eSA9IHtcbiAgICAgICAgICAgIGRhdGFiYXNlUmVzb3VyY2U6IHtuYW1lOiB0aGlzLkRhdGFSZWdpc3RyYXRpb24uU3RhZ2luZ0dsdWVEYXRhYmFzZS5kYXRhYmFzZU5hbWV9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcmVzb2x2ZWRQcmluY2lwYWxUeXBlID0gdGhpcy5kZXRlcm1pbmVQcmluY2lwYWxUeXBlKHByaW5jaXBhbCk7XG5cbiAgICAgICAgaWYocmVzb2x2ZWRQcmluY2lwYWxUeXBlID09PSBpYW0uUm9sZSkge1xuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQcmluY2lwYWwgPSBwcmluY2lwYWwgYXMgaWFtLlJvbGU7XG5cbiAgICAgICAgICAgIGlmKHBlcm1pc3Npb25HcmFudC5HcmFudFJlc291cmNlUHJlZml4KXtcbiAgICAgICAgICAgICAgICBncmFudElkUHJlZml4ID0gYCR7cGVybWlzc2lvbkdyYW50LkdyYW50UmVzb3VyY2VQcmVmaXh9LSR7dGhpcy5EYXRhU2V0TmFtZX1gXG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBncmFudElkUHJlZml4ID0gYCR7dGhpcy5EYXRhU2V0TmFtZX0tJHt0aW1lSW5NaWxpc1N0cn1gLy9gJHtyZXNvbHZlZFByaW5jaXBhbC5yb2xlTmFtZX0tJHt0aGlzLkRhdGFTZXROYW1lfWAgLy8oUilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRhdGFMYWtlUHJpbmNpcGFsID0geyBkYXRhTGFrZVByaW5jaXBhbElkZW50aWZpZXI6IHJlc29sdmVkUHJpbmNpcGFsLnJvbGVBcm4gfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHJlc29sdmVkUHJpbmNpcGFsVHlwZSA9PT0gaWFtLlVzZXIpe1xuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQcmluY2lwYWwgPSBwcmluY2lwYWwgYXMgaWFtLlVzZXI7XG4gICAgICAgICAgICBncmFudElkUHJlZml4ID0gYCR7dGhpcy5EYXRhU2V0TmFtZX0tJHt0aW1lSW5NaWxpc1N0cn1gIC8vYCR7cmVzb2x2ZWRQcmluY2lwYWwudXNlck5hbWV9LSR7dGhpcy5EYXRhU2V0TmFtZX1gIC8vKFIpXG4gICAgICAgICAgICBkYXRhTGFrZVByaW5jaXBhbCA9IHsgZGF0YUxha2VQcmluY2lwYWxJZGVudGlmaWVyOiByZXNvbHZlZFByaW5jaXBhbC51c2VyQXJuIH07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNyZWF0ZUxha2VGb3JtYXRpb25QZXJtaXNzaW9uKGAke2dyYW50SWRQcmVmaXh9LWRhdGFiYXNlR3JhbnRgLCBkYXRhTGFrZVByaW5jaXBhbCAsIGRhdGFiYXNlUmVzb3VyY2VQcm9wZXJ0eSwgcGVybWlzc2lvbkdyYW50LkRhdGFiYXNlUGVybWlzc2lvbnMsIHBlcm1pc3Npb25HcmFudC5HcmFudGFibGVEYXRhYmFzZVBlcm1pc3Npb25zKVxuXG4gICAgICAgIGlmKGluY2x1ZGVTb3VyY2VEYil7XG5cbiAgICAgICAgICAgIGRhdGFiYXNlUmVzb3VyY2VQcm9wZXJ0eSA9IHtcbiAgICAgICAgICAgICAgICAvL2RhdGFMb2NhdGlvblJlc291cmNlOiB7cmVzb3VyY2VBcm46IHRoaXMuRGF0YUVucm9sbG1lbnQuRGF0YUxha2VCdWNrZXROYW1lfSxcbiAgICAgICAgICAgICAgICBkYXRhYmFzZVJlc291cmNlOiB7bmFtZTogdGhpcy5EYXRhUmVnaXN0cmF0aW9uLkxhbmRpbmdHbHVlRGF0YWJhc2UuZGF0YWJhc2VOYW1lfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5jcmVhdGVMYWtlRm9ybWF0aW9uUGVybWlzc2lvbihgJHtncmFudElkUHJlZml4fS1kYXRhYmFzZVNyY0dyYW50YCxkYXRhTGFrZVByaW5jaXBhbCAsIGRhdGFiYXNlUmVzb3VyY2VQcm9wZXJ0eSwgcGVybWlzc2lvbkdyYW50LkRhdGFiYXNlUGVybWlzc2lvbnMsIHBlcm1pc3Npb25HcmFudC5HcmFudGFibGVEYXRhYmFzZVBlcm1pc3Npb25zKVxuXG4gICAgICAgIH1cblxuXG4gICAgfVxuXG5cbiAgICBwdWJsaWMgZ3JhbnRUYWJsZVBlcm1pc3Npb25zKHByaW5jaXBhbDogaWFtLklQcmluY2lwYWwsIHBlcm1pc3Npb25HcmFudDogRGF0YUxha2VDb25mUmVnaXN0cmF0aW9uLlRhYmxlUGVybWlzc2lvbkdyYW50KXtcblxuICAgICAgICBjb25zdCBjb3JlR3JhbnQgPSB0aGlzLnNldHVwSWFtQW5kTGFrZUZvcm1hdGlvbkRhdGFiYXNlUGVybWlzc2lvbkZvclByaW5jaXBhbChwcmluY2lwYWwsIHBlcm1pc3Npb25HcmFudC5EYXRhYmFzZVBlcm1pc3Npb25zLCBwZXJtaXNzaW9uR3JhbnQuR3JhbnRhYmxlRGF0YWJhc2VQZXJtaXNzaW9ucyk7XG5cbiAgICAgICAgcGVybWlzc2lvbkdyYW50LnRhYmxlcy5mb3JFYWNoKHRhYmxlID0+IHtcbiAgICAgICAgICAgIHZhciB0YWJsZVJlc291cmNlUHJvcGVydHkgOiBsYWtlZm9ybWF0aW9uLkNmblBlcm1pc3Npb25zLlJlc291cmNlUHJvcGVydHkgPSB7XG4gICAgICAgICAgICAgICAgdGFibGVSZXNvdXJjZTp7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRhYmxlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhYmFzZU5hbWU6IHRoaXMuRGF0YVJlZ2lzdHJhdGlvbi5TdGFnaW5nR2x1ZURhdGFiYXNlLmRhdGFiYXNlTmFtZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUxha2VGb3JtYXRpb25QZXJtaXNzaW9uKGAke2NvcmVHcmFudC5ncmFudElkUHJlZml4fS0ke3RhYmxlfS1kYXRhYmFzZVRhYmxlR3JhbnRgLGNvcmVHcmFudC5kYXRhTGFrZVByaW5jaXBhbCAsIHRhYmxlUmVzb3VyY2VQcm9wZXJ0eSwgcGVybWlzc2lvbkdyYW50LlRhYmxlUGVybWlzc2lvbnMsIHBlcm1pc3Npb25HcmFudC5HcmFudGFibGVUYWJsZVBlcm1pc3Npb25zKVxuICAgICAgICB9KTtcblxuICAgIH1cblxuXG4gICAgcHVibGljIGdyYW50Q29hcnNlSWFtUmVhZChwcmluY2lwYWw6IGlhbS5JUHJpbmNpcGFsKXtcblxuXG4gICAgICAgIGNvbnN0IHJlc29sdmVkUHJpbmNpcGFsVHlwZSA9IHRoaXMuZGV0ZXJtaW5lUHJpbmNpcGFsVHlwZShwcmluY2lwYWwpO1xuXG4gICAgICAgIGlmKHJlc29sdmVkUHJpbmNpcGFsVHlwZSA9PT0gaWFtLlJvbGUpe1xuICAgICAgICAgICAgdGhpcy5Db2Fyc2VBdGhlbmFBY2Nlc3NQb2xpY3kuYXR0YWNoVG9Sb2xlKHByaW5jaXBhbCBhcyBpYW0uUm9sZSk7XG4gICAgICAgICAgICB0aGlzLkNvYXJzZVJlc291cmNlQWNjZXNzUG9saWN5LmF0dGFjaFRvUm9sZShwcmluY2lwYWwgYXMgaWFtLlJvbGUpO1xuICAgICAgICAgICAgdGhpcy5Db2Fyc2VJYW1Qb2xpY2llc0FwcGxpZWQgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYocmVzb2x2ZWRQcmluY2lwYWxUeXBlID09PSBpYW0uVXNlcil7XG4gICAgICAgICAgICB0aGlzLkNvYXJzZUF0aGVuYUFjY2Vzc1BvbGljeS5hdHRhY2hUb1VzZXIocHJpbmNpcGFsIGFzIGlhbS5Vc2VyKTtcbiAgICAgICAgICAgIHRoaXMuQ29hcnNlUmVzb3VyY2VBY2Nlc3NQb2xpY3kuYXR0YWNoVG9Vc2VyKHByaW5jaXBhbCBhcyBpYW0uVXNlcik7XG4gICAgICAgICAgICB0aGlzLkNvYXJzZUlhbVBvbGljaWVzQXBwbGllZCA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGNyZWF0ZUxha2VGb3JtYXRpb25QZXJtaXNzaW9uKHJlc291cmNlSWQ6IHN0cmluZywgZGF0YUxha2VQcmluY2lwYWw6IGxha2Vmb3JtYXRpb24uQ2ZuUGVybWlzc2lvbnMuRGF0YUxha2VQcmluY2lwYWxQcm9wZXJ0eSwgcmVzb3VyY2U6IGxha2Vmb3JtYXRpb24uQ2ZuUGVybWlzc2lvbnMuUmVzb3VyY2VQcm9wZXJ0eSwgcGVybWlzc2lvbnM6IHN0cmluZ1tdLCBncmFudGFibGVQcmVtaXNzaW9uczogc3RyaW5nW10gKXtcbiAgICAgICAgcmV0dXJuIG5ldyBsYWtlZm9ybWF0aW9uLkNmblBlcm1pc3Npb25zKHRoaXMsIHJlc291cmNlSWQsIHtcbiAgICAgICAgICAgIGRhdGFMYWtlUHJpbmNpcGFsOiBkYXRhTGFrZVByaW5jaXBhbCxcbiAgICAgICAgICAgIHJlc291cmNlOiByZXNvdXJjZSxcbiAgICAgICAgICAgIHBlcm1pc3Npb25zOiBwZXJtaXNzaW9ucyxcbiAgICAgICAgICAgIHBlcm1pc3Npb25zV2l0aEdyYW50T3B0aW9uOiBncmFudGFibGVQcmVtaXNzaW9uc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcHJpdmF0ZSBkZXRlcm1pbmVQcmluY2lwYWxUeXBlKHByaW5jaXBhbDogaWFtLklQcmluY2lwYWwpe1xuXG4gICAgICAgIGlmKHByaW5jaXBhbCBpbnN0YW5jZW9mIGlhbS5Sb2xlKXtcbiAgICAgICAgICAgIC8vcmV0dXJuIHByaW5jaXBhbCBhcyBpYW0uUm9sZTtcbiAgICAgICAgICAgIHJldHVybiBpYW0uUm9sZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHByaW5jaXBhbCBpbnN0YW5jZW9mIGlhbS5Vc2VyKXtcbiAgICAgICAgICAgIC8vcmV0dXJuIHByaW5jaXBhbCBhcyBpYW0uVXNlcjtcbiAgICAgICAgICAgIHJldHVybiBpYW0uVXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHByaW5jaXBhbCBpbnN0YW5jZW9mIGNkay5SZXNvdXJjZSl7XG5cbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBjb25zdCB1c2VyID0gcHJpbmNpcGFsIGFzIGlhbS5Vc2VyO1xuICAgICAgICAgICAgICAgIHJldHVybiBpYW0uVXNlcjtcbiAgICAgICAgICAgIH0gY2F0Y2goZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXhjZXB0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBjb25zdCByb2xlID0gcHJpbmNpcGFsIGFzIGlhbS5Sb2xlO1xuICAgICAgICAgICAgICAgIHJldHVybiBpYW0uUm9sZTtcbiAgICAgICAgICAgIH0gY2F0Y2goZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXhjZXB0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93KFwiVW5hYmxlIHRvIGRldGVyaW1pbmUgcHJpbmNpcGFsIHR5cGUuLi5cIik7XG5cbiAgICB9XG4gICAgcHJpdmF0ZSBzZXR1cElhbUFuZExha2VGb3JtYXRpb25EYXRhYmFzZVBlcm1pc3Npb25Gb3JQcmluY2lwYWwocHJpbmNpcGFsOiBpYW0uSVByaW5jaXBhbCwgZGF0YWJhc2VQZXJtaXNzaW9uczogQXJyYXk8RGF0YUxha2VDb25mUmVnaXN0cmF0aW9uLkRhdGFiYXNlUGVybWlzc2lvbj4sIGdyYW50YWJsZURhdGFiYXNlUGVybWlzc2lvbnM6IEFycmF5PERhdGFMYWtlQ29uZlJlZ2lzdHJhdGlvbi5EYXRhYmFzZVBlcm1pc3Npb24+ICl7XG5cbiAgICAgICAgdGhpcy5ncmFudENvYXJzZUlhbVJlYWQocHJpbmNpcGFsKTtcblxuICAgICAgICB2YXIgZ3JhbnRJZFByZWZpeCA9IFwiXCI7XG4gICAgICAgIHZhciBkYXRhTGFrZVByaW5jaXBhbCA6IGxha2Vmb3JtYXRpb24uQ2ZuUGVybWlzc2lvbnMuRGF0YUxha2VQcmluY2lwYWxQcm9wZXJ0eSA9IHtcbiAgICAgICAgICAgIGRhdGFMYWtlUHJpbmNpcGFsSWRlbnRpZmllcjogXCJcIlxuICAgICAgICB9O1xuICAgICAgICB2YXIgZGF0YWJhc2VSZXNvdXJjZVByb3BlcnR5IDogbGFrZWZvcm1hdGlvbi5DZm5QZXJtaXNzaW9ucy5SZXNvdXJjZVByb3BlcnR5ID0ge1xuICAgICAgICAgICAgLy9kYXRhTG9jYXRpb25SZXNvdXJjZToge3Jlc291cmNlQXJuOiB0aGlzLkRhdGFFbnJvbGxtZW50LkRhdGFMYWtlQnVja2V0TmFtZX0sXG4gICAgICAgICAgICBkYXRhYmFzZVJlc291cmNlOiB7bmFtZTogdGhpcy5EYXRhUmVnaXN0cmF0aW9uLlN0YWdpbmdHbHVlRGF0YWJhc2UuZGF0YWJhc2VOYW1lfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHJlc29sdmVkUHJpbmNpcGFsVHlwZSA9IHRoaXMuZGV0ZXJtaW5lUHJpbmNpcGFsVHlwZShwcmluY2lwYWwpO1xuXG4gICAgICAgIGlmKHJlc29sdmVkUHJpbmNpcGFsVHlwZSA9PT0gaWFtLlJvbGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkUHJpbmNpcGFsID0gcHJpbmNpcGFsIGFzICBpYW0uUm9sZTtcbiAgICAgICAgICAgIGdyYW50SWRQcmVmaXggPSBgJHtyZXNvbHZlZFByaW5jaXBhbC5yb2xlQXJufS0ke3RoaXMuRGF0YVNldE5hbWV9YDtcbiAgICAgICAgICAgIGRhdGFMYWtlUHJpbmNpcGFsID0geyBkYXRhTGFrZVByaW5jaXBhbElkZW50aWZpZXI6IHJlc29sdmVkUHJpbmNpcGFsLnJvbGVBcm4gfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHJlc29sdmVkUHJpbmNpcGFsVHlwZSA9PT0gaWFtLlVzZXIpe1xuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQcmluY2lwYWwgPSBwcmluY2lwYWwgYXMgIGlhbS5Vc2VyO1xuICAgICAgICAgICAgZ3JhbnRJZFByZWZpeCA9IGAke3Jlc29sdmVkUHJpbmNpcGFsLnVzZXJOYW1lfS0ke3RoaXMuRGF0YVNldE5hbWV9YDtcbiAgICAgICAgICAgIGRhdGFMYWtlUHJpbmNpcGFsID0geyBkYXRhTGFrZVByaW5jaXBhbElkZW50aWZpZXI6IHJlc29sdmVkUHJpbmNpcGFsLnVzZXJBcm4gfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZ3JhbnREYXRhYmFzZVBlcm1pc3Npb24ocHJpbmNpcGFsLCB7IERhdGFiYXNlUGVybWlzc2lvbnM6IGRhdGFiYXNlUGVybWlzc2lvbnMsIEdyYW50YWJsZURhdGFiYXNlUGVybWlzc2lvbnM6IGdyYW50YWJsZURhdGFiYXNlUGVybWlzc2lvbnMgIH0pO1xuXG4gICAgICAgIHJldHVybiB7IGdyYW50SWRQcmVmaXg6IGdyYW50SWRQcmVmaXgsIGRhdGFMYWtlUHJpbmNpcGFsOiBkYXRhTGFrZVByaW5jaXBhbCB9O1xuICAgIH1cblxufVxuXG5leHBvcnQgbmFtZXNwYWNlIERhdGFMYWtlQ29uZlJlZ2lzdHJhdGlvblxue1xuICAgIGV4cG9ydCBlbnVtIERhdGFiYXNlUGVybWlzc2lvbiB7XG4gICAgICAgIEFsbCA9ICdBTEwnLFxuICAgICAgICBBbHRlciA9ICdBTFRFUicsXG4gICAgICAgIERyb3AgPSAnRFJPUCcsXG4gICAgICAgIENyZWF0ZVRhYmxlID0gJ0NSRUFURV9UQUJMRScsXG4gICAgICAgIC8vRGF0YUxvY2F0aW9uQWNjZXNzPSAnREFUQV9MT0NBVElPTl9BQ0NFU1MnXG4gICAgfVxuXG4gICAgZXhwb3J0IGVudW0gVGFibGVQZXJtaXNzaW9uIHtcbiAgICAgICAgQWxsID0gJ0FMTCcsXG4gICAgICAgIFNlbGVjdCA9ICdTRUxFQ1QnLFxuICAgICAgICBBbHRlciA9ICdBTFRFUicsXG4gICAgICAgIERyb3AgPSAnRFJPUCcsXG4gICAgICAgIERlbGV0ZSA9ICdERUxFVEUnLFxuICAgICAgICBJbnNlcnQgPSAnSU5TRVJUJyxcbiAgICB9XG5cbiAgICBleHBvcnQgZW51bSBUYWJsZVdpdGhDb2x1bW5GaWx0ZXIge1xuICAgICAgICBJbmNsdWRlID0gXCJJbmNsdWRlXCIsXG4gICAgICAgIEV4Y2x1ZGUgPSBcIkV4Y2x1ZGVcIlxuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgRGF0YUxha2VDb25mUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gICAgICAgIGRhdGFMYWtlQnVja2V0OiBzMy5CdWNrZXQ7XG4gICAgICAgIGRhdGFTZXROYW1lOiBzdHJpbmc7XG4gICAgICAgIGdsdWVTdGFnaW5nU2NyaXB0UGF0aDogc3RyaW5nO1xuICAgICAgICBnbHVlU3RhZ2luZ1NjcmlwdEFyZ3VtZW50czogYW55O1xuICAgICAgICBnbHVlR29sZFNjcmlwdFBhdGg6IHN0cmluZztcbiAgICAgICAgZ2x1ZUdvbGRTY3JpcHRBcmd1bWVudHM6IGFueTtcbiAgICAgICAgd29ya2Zsb3dDcm9uU2NoZWR1bGVFeHByZXNzaW9uPzogc3RyaW5nO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgRGF0YWJhc2VQZXJtaXNzaW9uR3JhbnQge1xuICAgICAgICBEYXRhYmFzZVBlcm1pc3Npb25zOiBBcnJheTxEYXRhYmFzZVBlcm1pc3Npb24+O1xuICAgICAgICBHcmFudGFibGVEYXRhYmFzZVBlcm1pc3Npb25zOiBBcnJheTxEYXRhYmFzZVBlcm1pc3Npb24+O1xuICAgICAgICBHcmFudFJlc291cmNlUHJlZml4Pzogc3RyaW5nO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgRGF0YUxvY2F0aW9uR3JhbnR7XG4gICAgICAgIEdyYW50YWJsZTogYm9vbGVhbjtcbiAgICAgICAgR3JhbnRSZXNvdXJjZVByZWZpeD86IHN0cmluZztcbiAgICAgICAgTG9jYXRpb246IHN0cmluZztcbiAgICAgICAgTG9jYXRpb25QcmVmaXg6IHN0cmluZztcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIFRhYmxlUGVybWlzc2lvbkdyYW50IHtcbiAgICAgICAgdGFibGVzOiBBcnJheTxzdHJpbmc+O1xuICAgICAgICBEYXRhYmFzZVBlcm1pc3Npb25zOiBBcnJheTxEYXRhYmFzZVBlcm1pc3Npb24+O1xuICAgICAgICBHcmFudGFibGVEYXRhYmFzZVBlcm1pc3Npb25zOiBBcnJheTxEYXRhYmFzZVBlcm1pc3Npb24+O1xuICAgICAgICBUYWJsZVBlcm1pc3Npb25zOiBBcnJheTxUYWJsZVBlcm1pc3Npb24+O1xuICAgICAgICBHcmFudGFibGVUYWJsZVBlcm1pc3Npb25zOiBBcnJheTxUYWJsZVBlcm1pc3Npb24+O1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGFibGVXaXRoQ29sdW1uUGVybWlzc2lvbkdyYW50IHtcbiAgICAgICAgdGFibGU6IHN0cmluZztcbiAgICAgICAgZGF0YWJhc2U6IHN0cmluZztcbiAgICAgICAgY29sdW1uczogQXJyYXk8c3RyaW5nPjtcbiAgICAgICAgd2lsZENhcmRGaWx0ZXI/OiBUYWJsZVdpdGhDb2x1bW5GaWx0ZXI7XG4gICAgICAgIERhdGFiYXNlUGVybWlzc2lvbnM6IEFycmF5PERhdGFiYXNlUGVybWlzc2lvbj47XG4gICAgICAgIEdyYW50YWJsZURhdGFiYXNlUGVybWlzc2lvbnM6IEFycmF5PERhdGFiYXNlUGVybWlzc2lvbj47XG4gICAgICAgIFRhYmxlQ29sdW1uUGVybWlzc2lvbnM6IEFycmF5PFRhYmxlUGVybWlzc2lvbj47XG4gICAgICAgIEdyYW50YWJsZVRhYmxlQ29sdW1uUGVybWlzc2lvbnM6IEFycmF5PFRhYmxlUGVybWlzc2lvbj47XG4gICAgfVxufSJdfQ==