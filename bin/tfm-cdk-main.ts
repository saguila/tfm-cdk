#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';

import { IngestStackFargate } from '../lib/ingest-stack-fargate'
import {KaggleCycleShareDataset} from "../lib/datalake/datasets/kaggle-cycle-share-dataset";
import {LakeFormationStack} from "../lib/lake-formation-stack";
import {UsersLakeFormationStack} from "../lib/users-lake-formation-stack";

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








