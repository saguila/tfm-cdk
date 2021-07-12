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
export class DatasetManager extends cdk.Stack {

    /*Array with dataset configuration */
    public Enrollments: Array<DataLakeConfRegistration> = [];
    /* Data Lake */
    public DataLake: LakeFormationStack;

    constructor(scope: cdk.Construct, id: string, props: DatasetManagerProps) {
        super(scope, id, props);
        this.DataLake = props.dataLake;
    }

    public grantDatabasePermissions( principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.DatabasePermissionGrant){
        for(let enrollment of this.Enrollments){
            enrollment.grantDatabasePermission(principal, permissionGrant);
        }
    }

    public grantTablePermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.TablePermissionGrant){

        this.DataLake.grantAthenaResultsBucketPermission(principal);

        for(let enrollment of this.Enrollments){
            enrollment.grantTablePermissions(principal, permissionGrant);
        }
    }

    public grantTableWithColumnPermissions(principal: iam.IPrincipal, permissionGrant: DataLakeConfRegistration.TableWithColumnPermissionGrant){

        this.DataLake.grantAthenaResultsBucketPermission(principal);

        for(let enrollment of this.Enrollments){
            enrollment.grantTableWithColumnPermissions(principal, permissionGrant);
        }
    }

    public grantIamRead(principal: iam.IPrincipal){
        this.DataLake.grantAthenaResultsBucketPermission(principal);
        for(let enrollment of this.Enrollments){
            enrollment.grantCoarseIamRead(principal);
        }
    }
}