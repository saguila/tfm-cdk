import { Construct, Stack, StackProps } from "@aws-cdk/core";
export interface ContextIngestionProps extends StackProps {
    readonly kaggleUser?: string;
    readonly kaggleKey?: string;
}
/**
 * This class creates
 */
export declare class IngestStackFargate extends Stack {
    constructor(scope: Construct, id: string, props?: ContextIngestionProps);
}
