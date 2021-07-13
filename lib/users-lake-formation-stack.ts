import { Construct, Stack, StackProps, SecretValue } from "@aws-cdk/core";
import {
    AccountPrincipal,
    ArnPrincipal,
    Effect,
    Group,
    ManagedPolicy,
    PolicyStatement,
    Role,
    User
} from "@aws-cdk/aws-iam";
import {KaggleCycleShareDataset} from "./kaggle-cycle-share-dataset";
import {DataLakeConfRegistration} from "./datalake/builders/data-lake-conf-registration";

export interface ContextUsersLakeFormationProps extends StackProps {
    dataset: KaggleCycleShareDataset
    awsAccount: string;
}


export class UsersLakeFormationStack extends Stack {

    readonly dataset: KaggleCycleShareDataset;
    readonly admin: Role;
    readonly scientist: Role;
    readonly user: Role;

    constructor(scope: Construct, id: string, props?: ContextUsersLakeFormationProps) {
        super(scope, id, props);

        // @ts-ignore
        this.dataset = props.dataset;

        this.admin = new Role(this,'adminRole',{
            description: "Administradores: que requieren el acceso completo a las tablas.",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });

        this.scientist = new Role(this,'scientistRole',{
            description: "",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });

        this.user = new Role(this,'userRole',{
            description: "",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });
    }
}
