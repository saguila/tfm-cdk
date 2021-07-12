import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Role } from "@aws-cdk/aws-iam";
import { KaggleCycleShareDataset } from "./kaggle-cycle-share-dataset";
export interface ContextUsersLakeFormationProps extends StackProps {
    dataset: KaggleCycleShareDataset;
    awsAccount: string;
}
export declare class UsersLakeFormationStack extends Stack {
    readonly dataset: KaggleCycleShareDataset;
    readonly admin: Role;
    readonly scientist: Role;
    readonly user: Role;
    constructor(scope: Construct, id: string, props?: ContextUsersLakeFormationProps);
}
