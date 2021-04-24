#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';

import { IngestStack } from '../lib/ingest-stack';


const app = new cdk.App();

new IngestStack(app,'tfm-ingest-stack',{
    kaggleUser: app.node.tryGetContext('kaggleUser'),
    kaggleKey: app.node.tryGetContext('kaggleKey'),
    kaggleCompetition:app.node.tryGetContext('kaggleCompetition')
});
