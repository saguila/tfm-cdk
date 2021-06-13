#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';

import { IngestStackFargate } from '../lib/ingest-stack-fargate'
import {KaggleCycleShareDataset} from "../lib/kaggle-cycle-share-dataset";
import {LakeFormationStack} from "../lib/lake-formation-stack";
import {UsersLakeFormationStack} from "../lib/users-lake-formation-stack";
import {DataLakeEnrollment} from "../lib/datalake/constructs/data-lake-enrollment";

const app = new cdk.App();

const dataLakeStack = new LakeFormationStack(app, 'lake-formation-stack', {});

new IngestStackFargate(app,'tfm-ingest-fargate-stack',{
    kaggleUser: app.node.tryGetContext('kaggleUser'),
    kaggleKey: app.node.tryGetContext('kaggleKey')
});

const kaggleDatasetStack = new KaggleCycleShareDataset(app,'kaggle-datalake-register-stack',{
    dataLakeBucketName :app.node.tryGetContext('dataLakeBucketName'),
    dataSetName: app.node.tryGetContext('dataSetName'),
    landingDatabaseName: app.node.tryGetContext('landingDatabaseName'),
    stagingDatabaseName: app.node.tryGetContext('stagingDatabaseName'),
    goldDatabaseName: app.node.tryGetContext('goldDatabaseName'),
    dataLake: dataLakeStack
});

const usersLakeFormation = new UsersLakeFormationStack(app,'users-lake-formation-stack',{
    dataset: kaggleDatasetStack,
    awsAccount: app.node.tryGetContext('awsAccount')
});

/*
const exampleTableWithColumnsGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
    table: "trip",
    database: "staging",
    columns: ['trip_id','bikeid'],
    DatabasePermissions: [],
    GrantableDatabasePermissions: [],
    TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
    GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
};

kaggleDatasetStack.grantIamRead(usersLakeFormation.admin);
kaggleDatasetStack.grantTableWithColumnPermissions(usersLakeFormation.admin, exampleTableWithColumnsGrant);
*/








