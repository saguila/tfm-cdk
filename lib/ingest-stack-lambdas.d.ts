import * as cdk from "@aws-cdk/core";
export interface ContextIngestionProps extends cdk.StackProps {
    readonly kaggleUser?: string;
    readonly kaggleKey?: string;
    readonly kaggleCompetition?: string;
}
export declare class IngestStackLambdas extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: ContextIngestionProps);
}
