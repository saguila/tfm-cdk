import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import { DataLakeEnrollment } from './constructs/data-lake-enrollment';
import { LakeFormationStack } from '../lake-formation-stack';


export interface DataSetTemplateStackProps extends cdk.StackProps {
    DatabaseDescriptionPath: string;
    DescribeTablesPath: string;
    DataSetName: string;
}

export interface DataSetStackProps extends cdk.StackProps {
    datalake: LakeFormationStack;
}

export class DataSetStack extends cdk.Stack {

    public Enrollments: Array<DataLakeEnrollment> = [];
    public DataLake: LakeFormationStack;

    constructor(scope: cdk.Construct, id: string, props: DataSetStackProps) {
        super(scope, id, props);
        this.DataLake = props.datalake;
    }


    public grantDatabasePermissions( principal: iam.IPrincipal, permissionGrant: DataLakeEnrollment.DatabasePermissionGrant){
        for(let enrollment of this.Enrollments){
            enrollment.grantDatabasePermission(principal, permissionGrant);
        }
    }

    public grantTablePermissions(principal: iam.IPrincipal, permissionGrant: DataLakeEnrollment.TablePermissionGrant){

        this.DataLake.grantAthenaResultsBucketPermission(principal);

        for(let enrollment of this.Enrollments){
            enrollment.grantTablePermissions(principal, permissionGrant);
        }
    }

    public grantTableWithColumnPermissions(principal: iam.IPrincipal, permissionGrant: DataLakeEnrollment.TableWithColumnPermissionGrant){

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