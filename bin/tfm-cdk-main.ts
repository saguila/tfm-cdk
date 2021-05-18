#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';

import { IngestStackFargate } from '../lib/ingest-stack-fargate'
import {KaggleCycleShareDataset} from "../lib/datalake/datasets/kaggle-cycle-share-dataset";
import {LakeFormationStack} from "../lib/lake-formation-stack";
import {UsersLakeFormationStack} from "../lib/users-lake-formation-stack";


const app = new cdk.App();

const datalakeStack = new LakeFormationStack(app, 'lake-formation-stack', {});

new IngestStackFargate(app,'tfm-ingest-fargate-stack',{
    kaggleUser: app.node.tryGetContext('kaggleUser'),
    kaggleKey: app.node.tryGetContext('kaggleKey')
});

const kaggleDatasetStack = new KaggleCycleShareDataset(app,'kaggle-datalake-register-stack',{
    datasetName: app.node.tryGetContext('datasetName'),
    datalake: datalakeStack
});

const usersLakeFormation = new UsersLakeFormationStack(app,'users-lake-formation-stack',{
    dataset: kaggleDatasetStack,
    initPasswd: app.node.tryGetContext('initPasswd')
});








