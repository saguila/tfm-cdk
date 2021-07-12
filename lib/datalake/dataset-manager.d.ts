import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import { DataLakeConfRegistration } from './builders/data-lake-conf-registration';
import { LakeFormationStack } from '../lake-formation-stack';
export interface DatasetManagerProps extends cdk.StackProps {
    dataLake: LakeFormationStack;
}
/**
 * Gestion de los permisos del data lake sobre las tablas
 */
export declare class DatasetManager extends cdk.Stack {
    Enrollments: Array<DataLakeConfRegistration>;
    DataLake: LakeFormationStack;
    constructor(scope: cdk.Construct, id: string, props: DatasetManagerProps);
    grantDatabasePermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.DatabasePermissionGrant): void;
    grantTablePermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.TablePermissionGrant): void;
    grantTableWithColumnPermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.TableWithColumnPermissionGrant): void;
    grantIamRead(principal: iam.IPrincipal): void;
}
