import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { IngestStack } from '../lib/ingest-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new IngestStack(app, 'testStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
