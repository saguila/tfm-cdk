import { Construct, Stack, StackProps, SecretValue } from "@aws-cdk/core";
import {AccountPrincipal, Effect, Group, ManagedPolicy, PolicyStatement, Role, User} from "@aws-cdk/aws-iam";
import {KaggleCycleShareDataset} from "./datalake/datasets/kaggle-cycle-share-dataset";
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

    readonly admin: Role;
    readonly scientist: User;
    readonly staff: User;
    readonly user: User;
    readonly analyst: User;
    readonly group: Group;

    constructor(scope: Construct, id: string, props?: ContextUsersLakeFormationProps) {
        super(scope, id, props);


        this.admin = new Role(this,'adminRole',{
            description: "Administradores: que requieren el acceso completo a las tablas.",
            assumedBy: new AccountPrincipal(props?.awsAccount)
        });

        /*        const permissionsS3 = new iam.ManagedPolicy(this,'permissionsS3Lake',
            {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "s3:GetObject",
                            "s3:ListBucket"
                        ],
                        resources: [
                            "arn:aws:s3:::tfm-ingest",
                            "arn:aws:s3:::tfm-ingest/!*"
                        ],
                    }),
                ],
            },
        );*/


        const permissionsGlue = new ManagedPolicy(this,'permissionsGlueDataAccess',
            {
                statements: [
                    new PolicyStatement({
                        effect: Effect.ALLOW,
                        actions: [
                            "lakeformation:GetDataAccess",
                            "glue:GetTable",
                            "glue:GetTables",
                            "glue:SearchTables",
                            "glue:GetDatabase",
                            "glue:GetDatabases",
                            "glue:GetPartitions"
                        ],
                        resources: ['*'],
                    }),
                ],
            },
        );

        this.admin.addManagedPolicy(permissionsGlue);

/*        this.group = new Group(this, 'lake-formation-tfm-group', {
            groupName: 'datalake-group',
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('AmazonAthenaFullAccess'),
            ],
        });

        this.admin  = new User(this,'datalake-administrator',{
            userName: 'datalake-administrator',
            groups: [this.group],
            password: SecretValue.plainText(props?.initPasswd || ""),
            permissionsBoundary: permissionsGlue
        });

        this.scientist  = new User(this,'datalake-scientist',{
            userName: 'datalake-scientist',
            groups: [this.group],
            password: SecretValue.plainText(props?.initPasswd || ""),
            permissionsBoundary: permissionsGlue
        });

        this.staff  = new User(this,'datalake-staff',{
            userName: 'datalake-staff',
            groups: [this.group],
            password: SecretValue.plainText(props?.initPasswd || ""),
            permissionsBoundary: permissionsGlue
        });

        this.user  = new User(this,'scientist-user',{
            userName: 'datalake-user',
            groups: [this.group],
            password: SecretValue.plainText(props?.initPasswd || ""),
            permissionsBoundary: permissionsGlue
        });

        this.analyst  = new User(this,'datalake-analyst',{
                userName: 'datalake-analyst',
            groups: [this.group],
            password: SecretValue.plainText(props?.initPasswd || ""),
            permissionsBoundary: permissionsGlue
        });*/


        var exampleTableWithColumnsGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
            table: "trip",
            database: "staging",
            columns: ['trip_id','bikeid'],
            DatabasePermissions: [],
            GrantableDatabasePermissions: [],
            TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
            GrantableTableColumnPermissions: []
        };

        props?.dataset.grantTableWithColumnPermissions(this.admin, exampleTableWithColumnsGrant);

    }
}