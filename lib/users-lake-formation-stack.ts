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
import {DataLakeEnrollment} from "./datalake/constructs/data-lake-enrollment";

export interface ContextUsersLakeFormationProps extends StackProps {
    dataset: KaggleCycleShareDataset
    awsAccount: string;
}

/*
    Administradores: que requieren el acceso completo a las tablas.
    Científico de Datos: requiere acceso completo a los datos pero ciertas columnas tienen que sufrir una ofuscación, como por ejemplo la latitud y la longitud.
    Mantenimiento: acceden a la tabla de estaciones y a la de viajes menos a la información "sensible" que seria el tipo de usuario, sexo y su año de nacimiento.
    Usuarios: que acceden a la información generada por ellos exclusivamente en la tabla Viajes y a la información meteorológica.
    Analista de negocio: ver dato agrupado, a una agregación sin ofuscar datos, consulta una vista agregada.
 */
export class UsersLakeFormationStack extends Stack {

    readonly dataset: KaggleCycleShareDataset;
    readonly admin: Role;
    readonly scientist: Role;
    readonly staff: Role;
    readonly user: Role;
    readonly analyst: Role;

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
        this.staff = new Role(this,'staffRole',{
            description: "",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });
        this.user = new Role(this,'userRole',{
            description: "",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });
        this.analyst = new Role(this,'analystRole',{
            description: "",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });

/*
        const exampleTableWithColumnsGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
            table: "trip",
            database: "staging",
            columns: ['trip_id','bikeid'],
            DatabasePermissions: [],
            GrantableDatabasePermissions: [],
            TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
            GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
        };

        this.dataset.grantIamRead(this.admin);
        this.dataset.grantTableWithColumnPermissions(this.admin, exampleTableWithColumnsGrant);*/
    }


}