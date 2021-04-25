#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';

import { IngestStackLambdas } from '../lib/ingest-stack-lambdas';
import { IngestStackFargate } from '../lib/ingest-stack-fargate'


const app = new cdk.App();
/*
new IngestStackLambdas(app,'tfm-ingest-lambdas-stack',{
    kaggleUser: app.node.tryGetContext('kaggleUser'),
    kaggleKey: app.node.tryGetContext('kaggleKey'),
    kaggleCompetition:app.node.tryGetContext('kaggleCompetition')
});
*/
new IngestStackFargate(app,'tfm-ingest-fargate-stack',{
    kaggleUser: app.node.tryGetContext('kaggleUser'),
    kaggleKey: app.node.tryGetContext('kaggleKey')
});


