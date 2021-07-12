#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';

import { IngestStackFargate } from '../lib/ingest-stack-fargate'
import { KaggleCycleShareDataset } from "../lib/kaggle-cycle-share-dataset";
import { LakeFormationStack } from "../lib/lake-formation-stack";
import { UsersLakeFormationStack } from "../lib/users-lake-formation-stack";

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
kaggleDatasetStack.grantIamRead(usersLakeFormation.admin);
kaggleDatasetStack.grantIamRead(usersLakeFormation.user);
kaggleDatasetStack.grantIamRead(usersLakeFormation.scientist);

const tripScientistGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
    table: "trip",
    database: "gold",
    columns: ['usertype_ano','gender_ano','birthyear_ano'],
    DatabasePermissions: [],
    GrantableDatabasePermissions: [],
    TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
    GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
};

kaggleDatasetStack.grantTableWithColumnPermissions(usersLakeFormation.scientist, tripScientistGrant);

const tripAdminGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
    table: "trip",
    database: "gold",
    columns: ['usertype','gender','birthyear','trip_id'],
    DatabasePermissions: [],
    GrantableDatabasePermissions: [],
    TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
    GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
};

kaggleDatasetStack.grantTableWithColumnPermissions(usersLakeFormation.admin, tripAdminGrant);

const stationAdminGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
    table: "station",
    database: "gold",
    columns: ['station_id','name','lat','long','install_date','install_dockcount','modification_date','current_dockcount','decommission_date'],
    DatabasePermissions: [],
    GrantableDatabasePermissions: [],
    TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
    GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
};


kaggleDatasetStack.grantTableWithColumnPermissions(usersLakeFormation.admin, stationAdminGrant);

const stationUserGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
    table: "station",
    database: "gold",
    columns: ['name','lat','long','current_dockcount'],
    DatabasePermissions: [],
    GrantableDatabasePermissions: [],
    TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
    GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
};


kaggleDatasetStack.grantTableWithColumnPermissions(usersLakeFormation.user, stationUserGrant);

const weatherUserGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
    table: "weather",
    database: "gold",
    columns: ['date','max_temperature_f','mean_temperature_f','min_temperaturef','max_dew_point_f',
        'meandew_point_f','min_dewpoint_f','max_humidity','mean_humidity','min_humidity','max_sea_level_pressure_in',
        'mean_sea_level_pressure_in','min_sea_level_pressure_in','max_visibility_miles','mean_visibility_miles',
        'min_visibility_miles','max_wind_speed_mph','mean_wind_speed_mph','max_gust_speed_mph','precipitation_in','events'],
    DatabasePermissions: [],
    GrantableDatabasePermissions: [],
    TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
    GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
};


kaggleDatasetStack.grantTableWithColumnPermissions(usersLakeFormation.user, weatherUserGrant);

const weatherAdminGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
    table: "weather",
    database: "gold",
    columns: ['date','max_temperature_f','mean_temperature_f','min_temperaturef','max_dew_point_f',
        'meandew_point_f','min_dewpoint_f','max_humidity','mean_humidity','min_humidity','max_sea_level_pressure_in',
        'mean_sea_level_pressure_in','min_sea_level_pressure_in','max_visibility_miles','mean_visibility_miles',
        'min_visibility_miles','max_wind_speed_mph','mean_wind_speed_mph','max_gust_speed_mph','precipitation_in','events'],
    DatabasePermissions: [],
    GrantableDatabasePermissions: [],
    TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
    GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
};

kaggleDatasetStack.grantTableWithColumnPermissions(usersLakeFormation.admin, weatherAdminGrant);

*/