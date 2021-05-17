#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';

import { IngestStackFargate } from '../lib/ingest-stack-fargate'
import {KaggleCycleShareDataset} from "../lib/datalake/datasets/kaggle-cycle-share-dataset";
import {LakeFormationStack} from "../lib/lake-formation-stack";
import {UsersLakeFormationStack} from "../lib/users-lake-formation-stack";


const app = new cdk.App();
/*
new IngestStackLambdas(app,'tfm-ingest-lambdas-stack',{
    kaggleUser: app.node.tryGetContext('kaggleUser'),
    kaggleKey: app.node.tryGetContext('kaggleKey'),
    kaggleCompetition:app.node.tryGetContext('kaggleCompetition')
});
*/

const usersLakeFormation = new UsersLakeFormationStack(app,'users-lake-formation-stack',{});

const datalakeStack = new LakeFormationStack(app, 'lake-formation-stack', {});

new IngestStackFargate(app,'tfm-ingest-fargate-stack',{
    kaggleUser: app.node.tryGetContext('kaggleUser'),
    kaggleKey: app.node.tryGetContext('kaggleKey')
});

//yarn cdk deploy kaggle-datalake-register-stack -c datasetName=raw --parameters s3BucketOuput=tfm-ingest
const kaggleDatasetStack = new KaggleCycleShareDataset(app,'kaggle-datalake-register-stack',{
    datasetName: app.node.tryGetContext('datasetName'),
    datalake: datalakeStack
});





