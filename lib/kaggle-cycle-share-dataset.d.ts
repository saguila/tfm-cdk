import { DatasetManager, DatasetManagerProps } from './datalake/dataset-manager';
import { Construct } from "@aws-cdk/core";
export interface ContextDatasetProps extends DatasetManagerProps {
    readonly dataLakeBucketName: string;
    readonly dataSetName: string;
    readonly landingDatabaseName: string;
    readonly stagingDatabaseName: string;
    readonly goldDatabaseName: string;
}
export declare class KaggleCycleShareDataset extends DatasetManager {
    constructor(scope: Construct, id: string, props: ContextDatasetProps);
}
