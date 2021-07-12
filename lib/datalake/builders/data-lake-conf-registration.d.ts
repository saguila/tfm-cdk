import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import lakeformation = require('@aws-cdk/aws-lakeformation');
import { DatasetGlueRegistration } from './dataset-glue-registration';
export declare class DataLakeConfRegistration extends cdk.Construct {
    DataRegistration: DatasetGlueRegistration;
    DataSetName: string;
    CoarseAthenaAccessPolicy: iam.ManagedPolicy;
    private CoarseResourceAccessPolicy;
    private CoarseIamPoliciesApplied;
    private WorkflowCronScheduleExpression?;
    constructor(scope: cdk.Construct, id: string, props: DataLakeConfRegistration.DataLakeConfProps);
    grantGlueRoleLakeFormationPermissions(dataSetGlueRole: iam.Role, dataSetName: string): void;
    createCoarseIamPolicy(): void;
    grantDataLocationPermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.DataLocationGrant, sourceLakeFormationLocation?: lakeformation.CfnResource): void;
    grantTableWithColumnPermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.TableWithColumnPermissionGrant): void;
    grantDatabasePermission(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.DatabasePermissionGrant, includeSourceDb?: boolean): void;
    grantTablePermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.TablePermissionGrant): void;
    grantCoarseIamRead(principal: iam.IPrincipal): void;
    private createLakeFormationPermission;
    private determinePrincipalType;
    private setupIamAndLakeFormationDatabasePermissionForPrincipal;
}
export declare namespace DataLakeConfRegistration {
    enum DatabasePermission {
        All = "ALL",
        Alter = "ALTER",
        Drop = "DROP",
        CreateTable = "CREATE_TABLE"
    }
    enum TablePermission {
        All = "ALL",
        Select = "SELECT",
        Alter = "ALTER",
        Drop = "DROP",
        Delete = "DELETE",
        Insert = "INSERT"
    }
    enum TableWithColumnFilter {
        Include = "Include",
        Exclude = "Exclude"
    }
    interface DataLakeConfProps extends cdk.StackProps {
        dataLakeBucket: s3.Bucket;
        dataSetName: string;
        glueStagingScriptPath: string;
        glueStagingScriptArguments: any;
        glueGoldScriptPath: string;
        glueGoldScriptArguments: any;
        workflowCronScheduleExpression?: string;
    }
    interface DatabasePermissionGrant {
        DatabasePermissions: Array<DatabasePermission>;
        GrantableDatabasePermissions: Array<DatabasePermission>;
        GrantResourcePrefix?: string;
    }
    interface DataLocationGrant {
        Grantable: boolean;
        GrantResourcePrefix?: string;
        Location: string;
        LocationPrefix: string;
    }
    interface TablePermissionGrant {
        tables: Array<string>;
        DatabasePermissions: Array<DatabasePermission>;
        GrantableDatabasePermissions: Array<DatabasePermission>;
        TablePermissions: Array<TablePermission>;
        GrantableTablePermissions: Array<TablePermission>;
    }
    interface TableWithColumnPermissionGrant {
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
