import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { IngestStackLambdas } from '../lib/ingest-stack-lambdas';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new IngestStackLambdas(app, 'testStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
