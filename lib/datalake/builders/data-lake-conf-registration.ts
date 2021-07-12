import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import lakeformation = require('@aws-cdk/aws-lakeformation');
import { DatasetGlueRegistration } from './dataset-glue-registration';

export class DataLakeConfRegistration extends cdk.Construct {

    public DataRegistration: DatasetGlueRegistration;
    public DataSetName: string;
    public CoarseAthenaAccessPolicy: iam.ManagedPolicy;
    private CoarseResourceAccessPolicy: iam.ManagedPolicy;
    private CoarseIamPoliciesApplied: boolean;
    private WorkflowCronScheduleExpression?: string;

    constructor(scope: cdk.Construct, id: string, props: DataLakeConfRegistration.DataLakeConfProps) {
        super(scope, id);

        this.DataSetName = props.dataSetName;
        this.CoarseIamPoliciesApplied = false;
        this.WorkflowCronScheduleExpression = props.workflowCronScheduleExpression;

    }

    grantGlueRoleLakeFormationPermissions(dataSetGlueRole: iam.Role, dataSetName: string) {
        //TODO: Permissions for database destination
        //Landing
        this.grantDataLocationPermissions(dataSetGlueRole, {
            Grantable: true,
            GrantResourcePrefix: `${dataSetName}locationGrant`,
            Location: this.DataRegistration.DataLakeBucketName,
            LocationPrefix: `/${this.DataRegistration.LandingGlueDatabase}/`
        });

        this.grantDatabasePermission(dataSetGlueRole,  {
            DatabasePermissions: [DataLakeConfRegistration.DatabasePermission.All],
            GrantableDatabasePermissions: [DataLakeConfRegistration.DatabasePermission.All],
            GrantResourcePrefix: `${dataSetName}RoleGrant`
        }, true);
    }


    public createCoarseIamPolicy(){

        const s3Policy = {
            "Action": [
                "s3:GetObject*",
                "s3:GetBucket*",
                "s3:List*"
            ],
            "Resource": [
                `arn:aws:s3:::${this.DataRegistration.DataLakeBucketName}`,
                `arn:aws:s3:::${this.DataRegistration.DataLakeBucketName}/${this.DataRegistration.LandingGlueDatabase.databaseName}/*`, //(R)Added
                `arn:aws:s3:::${this.DataRegistration.DataLakeBucketName}/${this.DataRegistration.StagingGlueDatabase.databaseName}/*`, //(R)Changed
                `arn:aws:s3:::${this.DataRegistration.DataLakeBucketName}/${this.DataRegistration.GoldGlueDatabase.databaseName}/*`//(R)Changed
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
                `arn:aws:glue:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${this.DataRegistration.StagingGlueDatabase.databaseName}/*`, //(R)added
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
            statements: [s3PolicyStatement,gluePolicyStatement, athenaPolicyStatement, coarseLakeFormationPolicy]
        };

        this.CoarseResourceAccessPolicy = new iam.ManagedPolicy(this, `${this.DataSetName}-coarseIamDataLakeAccessPolicy`, policyParams );


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
    public grantDataLocationPermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.DataLocationGrant , sourceLakeFormationLocation?: lakeformation.CfnResource ){

        let grantIdPrefix = "";
        let dataLakePrincipal : lakeformation.CfnPermissions.DataLakePrincipalProperty = {
            dataLakePrincipalIdentifier: ""
        };

        const s3Arn = `arn:aws:s3:::${permissionGrant.Location}${permissionGrant.LocationPrefix}` ;

        let dataLocationProperty : lakeformation.CfnPermissions.ResourceProperty = {
            dataLocationResource: {
                s3Resource: s3Arn
            }
        };

        const resolvedPrincipalType = this.determinePrincipalType(principal);

        if(resolvedPrincipalType === iam.Role) {
            const resolvedPrincipal = principal as  iam.Role;

            if(permissionGrant.GrantResourcePrefix){
                grantIdPrefix = `${permissionGrant.GrantResourcePrefix}-${this.DataSetName}`//`${permissionGrant.GrantResourcePrefix}-${this.DataSetName}`
            }else{
                grantIdPrefix = `${resolvedPrincipal.roleName}-${this.DataSetName}`
            }
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.roleArn };
        }

        if(resolvedPrincipalType === iam.User){
            const resolvedPrincipal = principal as  iam.User;
            grantIdPrefix = `${resolvedPrincipal.userName}-${this.DataSetName}`
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.userArn };
        }


        if(permissionGrant.Grantable){
            const locationPermission = this.createLakeFormationPermission(`${grantIdPrefix}-locationGrant`,dataLakePrincipal , dataLocationProperty, ['DATA_LOCATION_ACCESS'], ['DATA_LOCATION_ACCESS']);

            if (sourceLakeFormationLocation != null ) {
                locationPermission.addDependsOn(sourceLakeFormationLocation);
            }

        }else {
            const locationPermission = this.createLakeFormationPermission(`${grantIdPrefix}-locationGrant`,dataLakePrincipal , dataLocationProperty, ['DATA_LOCATION_ACCESS'], ['']);
            if (sourceLakeFormationLocation != null ) {
                locationPermission.addDependsOn(sourceLakeFormationLocation);
            }
        }
    }

    public grantTableWithColumnPermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.TableWithColumnPermissionGrant){

        const coreGrant = this.setupIamAndLakeFormationDatabasePermissionForPrincipal(principal, permissionGrant.DatabasePermissions, permissionGrant.GrantableDatabasePermissions);
        const timeInMilisStr :string = (new Date().getTime() / Math.floor(Math.random() * 100)).toString();


        const wildcardProperty: lakeformation.CfnPermissions.ColumnWildcardProperty = {
            excludedColumnNames: permissionGrant.columns
        };

        let tableWithColumnsProperty : lakeformation.CfnPermissions.TableWithColumnsResourceProperty = {
            columnNames: permissionGrant.columns,
            databaseName: permissionGrant.database,
            name: permissionGrant.table
        };

        if(permissionGrant.wildCardFilter === null){
            tableWithColumnsProperty = {
                columnNames: permissionGrant.columns,
                databaseName: permissionGrant.database,
                name: permissionGrant.table
            };
        }else{

            if(permissionGrant.wildCardFilter == DataLakeConfRegistration.TableWithColumnFilter.Include){
                tableWithColumnsProperty = {
                    columnNames: permissionGrant.columns,
                    databaseName: permissionGrant.database,
                    name: permissionGrant.table
                };
            }

            if(permissionGrant.wildCardFilter == DataLakeConfRegistration.TableWithColumnFilter.Exclude){
                tableWithColumnsProperty = {
                    databaseName: permissionGrant.database,
                    name: permissionGrant.table,
                    columnWildcard: {
                        excludedColumnNames: permissionGrant.columns
                    }
                };
            }

        }

        const tableWithColumnResourceProperty : lakeformation.CfnPermissions.ResourceProperty = {
            tableWithColumnsResource: tableWithColumnsProperty
        };

        // this.createLakeFormationPermission(`${coreGrant.grantIdPrefix}-${permissionGrant.table}-databaseTableWithColumnGrant`,coreGrant.dataLakePrincipal , tableWithColumnResourceProperty, permissionGrant.TableColumnPermissions, permissionGrant.GrantableTableColumnPermissions)

        this.createLakeFormationPermission(`${permissionGrant.table}-${timeInMilisStr}-databaseTableWithColumnGrant`,coreGrant.dataLakePrincipal , tableWithColumnResourceProperty, permissionGrant.TableColumnPermissions, permissionGrant.GrantableTableColumnPermissions)


    }

    public grantDatabasePermission(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.DatabasePermissionGrant, includeSourceDb: boolean = false){
        const timeInMilisStr :string = (new Date().getTime() / Math.floor(Math.random() * 100)).toString();
        let grantIdPrefix = "";
        let dataLakePrincipal : lakeformation.CfnPermissions.DataLakePrincipalProperty = {
            dataLakePrincipalIdentifier: ""
        };
        let databaseResourceProperty : lakeformation.CfnPermissions.ResourceProperty = {
            databaseResource: {name: this.DataRegistration.StagingGlueDatabase.databaseName}
        };

        const resolvedPrincipalType = this.determinePrincipalType(principal);

        if(resolvedPrincipalType === iam.Role) {
            const resolvedPrincipal = principal as iam.Role;

            if(permissionGrant.GrantResourcePrefix){
                grantIdPrefix = `${permissionGrant.GrantResourcePrefix}-${this.DataSetName}`
            }else{
                grantIdPrefix = `${this.DataSetName}-${timeInMilisStr}`//`${resolvedPrincipal.roleName}-${this.DataSetName}` //(R)
            }
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.roleArn };
        }

        if(resolvedPrincipalType === iam.User){
            const resolvedPrincipal = principal as iam.User;
            grantIdPrefix = `${this.DataSetName}-${timeInMilisStr}` //`${resolvedPrincipal.userName}-${this.DataSetName}` //(R)
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.userArn };
        }

        this.createLakeFormationPermission(`${grantIdPrefix}-databaseGrant`, dataLakePrincipal , databaseResourceProperty, permissionGrant.DatabasePermissions, permissionGrant.GrantableDatabasePermissions)

        if(includeSourceDb){

            databaseResourceProperty = {
                //dataLocationResource: {resourceArn: this.DataEnrollment.DataLakeBucketName},
                databaseResource: {name: this.DataRegistration.LandingGlueDatabase.databaseName}
            };

            this.createLakeFormationPermission(`${grantIdPrefix}-databaseSrcGrant`,dataLakePrincipal , databaseResourceProperty, permissionGrant.DatabasePermissions, permissionGrant.GrantableDatabasePermissions)

        }


    }


    public grantTablePermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.TablePermissionGrant){

        const coreGrant = this.setupIamAndLakeFormationDatabasePermissionForPrincipal(principal, permissionGrant.DatabasePermissions, permissionGrant.GrantableDatabasePermissions);

        permissionGrant.tables.forEach(table => {
            var tableResourceProperty : lakeformation.CfnPermissions.ResourceProperty = {
                tableResource:{
                    name: table,
                    databaseName: this.DataRegistration.StagingGlueDatabase.databaseName
                }
            };
            this.createLakeFormationPermission(`${coreGrant.grantIdPrefix}-${table}-databaseTableGrant`,coreGrant.dataLakePrincipal , tableResourceProperty, permissionGrant.TablePermissions, permissionGrant.GrantableTablePermissions)
        });

    }


    public grantCoarseIamRead(principal: iam.IPrincipal){


        const resolvedPrincipalType = this.determinePrincipalType(principal);

        if(resolvedPrincipalType === iam.Role){
            this.CoarseAthenaAccessPolicy.attachToRole(principal as iam.Role);
            this.CoarseResourceAccessPolicy.attachToRole(principal as iam.Role);
            this.CoarseIamPoliciesApplied = true;
            return;
        }

        if(resolvedPrincipalType === iam.User){
            this.CoarseAthenaAccessPolicy.attachToUser(principal as iam.User);
            this.CoarseResourceAccessPolicy.attachToUser(principal as iam.User);
            this.CoarseIamPoliciesApplied = true;
            return;
        }
    }

    private createLakeFormationPermission(resourceId: string, dataLakePrincipal: lakeformation.CfnPermissions.DataLakePrincipalProperty, resource: lakeformation.CfnPermissions.ResourceProperty, permissions: string[], grantablePremissions: string[] ){
        return new lakeformation.CfnPermissions(this, resourceId, {
            dataLakePrincipal: dataLakePrincipal,
            resource: resource,
            permissions: permissions,
            permissionsWithGrantOption: grantablePremissions
        });
    }
    private determinePrincipalType(principal: iam.IPrincipal){

        if(principal instanceof iam.Role){
            //return principal as iam.Role;
            return iam.Role;
        }

        if(principal instanceof iam.User){
            //return principal as iam.User;
            return iam.User;
        }

        if(principal instanceof cdk.Resource){

            try{
                const user = principal as iam.User;
                return iam.User;
            } catch(exception) {
                console.log(exception);
            }
            try{
                const role = principal as iam.Role;
                return iam.Role;
            } catch(exception) {
                console.log(exception);
            }
        }

        throw("Unable to deterimine principal type...");

    }
    private setupIamAndLakeFormationDatabasePermissionForPrincipal(principal: iam.IPrincipal, databasePermissions: Array<DataLakeConfRegistration.DatabasePermission>, grantableDatabasePermissions: Array<DataLakeConfRegistration.DatabasePermission> ){

        this.grantCoarseIamRead(principal);

        var grantIdPrefix = "";
        var dataLakePrincipal : lakeformation.CfnPermissions.DataLakePrincipalProperty = {
            dataLakePrincipalIdentifier: ""
        };
        var databaseResourceProperty : lakeformation.CfnPermissions.ResourceProperty = {
            //dataLocationResource: {resourceArn: this.DataEnrollment.DataLakeBucketName},
            databaseResource: {name: this.DataRegistration.StagingGlueDatabase.databaseName}
        };

        const resolvedPrincipalType = this.determinePrincipalType(principal);

        if(resolvedPrincipalType === iam.Role) {
            const resolvedPrincipal = principal as  iam.Role;
            grantIdPrefix = `${resolvedPrincipal.roleArn}-${this.DataSetName}`;
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.roleArn };
        }

        if(resolvedPrincipalType === iam.User){
            const resolvedPrincipal = principal as  iam.User;
            grantIdPrefix = `${resolvedPrincipal.userName}-${this.DataSetName}`;
            dataLakePrincipal = { dataLakePrincipalIdentifier: resolvedPrincipal.userArn };
        }

        this.grantDatabasePermission(principal, { DatabasePermissions: databasePermissions, GrantableDatabasePermissions: grantableDatabasePermissions  });

        return { grantIdPrefix: grantIdPrefix, dataLakePrincipal: dataLakePrincipal };
    }

}

export namespace DataLakeConfRegistration
{
    export enum DatabasePermission {
        All = 'ALL',
        Alter = 'ALTER',
        Drop = 'DROP',
        CreateTable = 'CREATE_TABLE',
        //DataLocationAccess= 'DATA_LOCATION_ACCESS'
    }

    export enum TablePermission {
        All = 'ALL',
        Select = 'SELECT',
        Alter = 'ALTER',
        Drop = 'DROP',
        Delete = 'DELETE',
        Insert = 'INSERT',
    }

    export enum TableWithColumnFilter {
        Include = "Include",
        Exclude = "Exclude"
    }

    export interface DataLakeConfProps extends cdk.StackProps {
        dataLakeBucket: s3.Bucket;
        dataSetName: string;
        glueStagingScriptPath: string;
        glueStagingScriptArguments: any;
        glueGoldScriptPath: string;
        glueGoldScriptArguments: any;
        workflowCronScheduleExpression?: string;
    }

    export interface DatabasePermissionGrant {
        DatabasePermissions: Array<DatabasePermission>;
        GrantableDatabasePermissions: Array<DatabasePermission>;
        GrantResourcePrefix?: string;
    }

    export interface DataLocationGrant{
        Grantable: boolean;
        GrantResourcePrefix?: string;
        Location: string;
        LocationPrefix: string;
    }

    export interface TablePermissionGrant {
        tables: Array<string>;
        DatabasePermissions: Array<DatabasePermission>;
        GrantableDatabasePermissions: Array<DatabasePermission>;
        TablePermissions: Array<TablePermission>;
        GrantableTablePermissions: Array<TablePermission>;
    }

    export interface TableWithColumnPermissionGrant {
        table: string;
        database: string;
        columns: Array<string>;
        wildCardFilter?: TableWithColumnFilter;
        DatabasePermissions: Array<DatabasePermission>;
        GrantableDatabasePermissions: Array<DatabasePermission>;
        TableColumnPermissions: Array<TablePermission>;
        GrantableTableColumnPermissions: Array<TablePermission>;
    }
}