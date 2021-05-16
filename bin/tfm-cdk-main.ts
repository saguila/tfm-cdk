#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';

import { IngestStackLambdas } from '../lib/ingest-stack-lambdas';
import { IngestStackFargate } from '../lib/ingest-stack-fargate'
import {KaggleCycleShareDataset} from "../lib/datalake/datasets/kaggle-cycle-share-dataset";
import {LakeFormationStack} from "../lib/lake-formation-stack";
import {Bucket} from "@aws-cdk/aws-s3";
import {CfnParameter} from "@aws-cdk/core";


const app = new cdk.App();
/*
new IngestStackLambdas(app,'tfm-ingest-lambdas-stack',{
    kaggleUser: app.node.tryGetContext('kaggleUser'),
    kaggleKey: app.node.tryGetContext('kaggleKey'),
    kaggleCompetition:app.node.tryGetContext('kaggleCompetition')
});
*/

//yarn cdk deploy lake-formation-stack --parameters s3BucketOuput=tfm-ingest --parameters principalArn=arn:aws:iam::${AWSACCOUNT}:user/sebastian.aguila@${DOMAIN}--require-approval-never --require-approval-never
const datalakeStack = new LakeFormationStack(app, 'lake-formation-stack', {});

new IngestStackFargate(app,'tfm-ingest-fargate-stack',{
    kaggleUser: app.node.tryGetContext('kaggleUser'),
    kaggleKey: app.node.tryGetContext('kaggleKey')
});

//yarn cdk deploy kaggle-datalake-register-stack -c datasetName=raw  --parameters s3BucketOuput=tfm-ingest
const kaggleDatasetStack = new KaggleCycleShareDataset(app,'kaggle-datalake-register-stack',{
    datasetName: app.node.tryGetContext('datasetName'),
    datalake: datalakeStack
});



