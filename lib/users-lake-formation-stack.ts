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
    // readonly staff: Role;
    readonly user: Role;
    // readonly analyst: Role;

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
        /*
        this.staff = new Role(this,'staffRole',{
            description: "",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });
        */
        this.user = new Role(this,'userRole',{
            description: "",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });
        /*
        this.analyst = new Role(this,'analystRole',{
            description: "",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });
        */

    }
}

/*
        const tripScientistGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
            table: "trip",
            database: "gold",
            columns: ['usertype_ano','gender_ano','birthyear_ano'],
            DatabasePermissions: [],
            GrantableDatabasePermissions: [],
            TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
            GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
        };

        this.dataset.grantIamRead(this.scientist);
        this.dataset.grantTableWithColumnPermissions(this.scientist, tripScientistGrant);

        const tripAdminGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
            table: "trip",
            database: "gold",
            columns: ['usertype','gender','birthyear','trip_id'],
            DatabasePermissions: [],
            GrantableDatabasePermissions: [],
            TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
            GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
        };

        this.dataset.grantIamRead(this.admin);
        this.dataset.grantTableWithColumnPermissions(this.admin, tripAdminGrant);

        const stationAdminGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
            table: "station",
            database: "gold",
            columns: ['station_id','name','lat','long','install_date','install_dockcount','modification_date','current_dockcount','decommission_date'],
            DatabasePermissions: [],
            GrantableDatabasePermissions: [],
            TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
            GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
        };

        this.dataset.grantIamRead(this.admin);
        this.dataset.grantTableWithColumnPermissions(this.admin, stationAdminGrant);

        const stationUserGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
            table: "station",
            database: "gold",
            columns: ['name','lat','long','current_dockcount'],
            DatabasePermissions: [],
            GrantableDatabasePermissions: [],
            TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
            GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
        };

        this.dataset.grantIamRead(this.user);
        this.dataset.grantTableWithColumnPermissions(this.user, stationUserGrant);

        const weatherUserGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
            table: "weather",
            database: "gold",
            columns: ['date','max_temperature_f','mean_temperature_f','min_temperaturef','max_dew_point_f',
                'meandew_point_f','min_dewpoint_f','max_humidity','mean_humidity','min_humidity','max_sea_level_pressure_in',
                'mean_sea_level_pressure_in','min_sea_level_pressure_in','max_visibility_miles','mean_visibility_miles',
                'min_visibility_miles','max_wind_speed_mph','mean_wind_speed_mph','max_gust_speed_mph','precipitation_in','events'],
            DatabasePermissions: [],
            GrantableDatabasePermissions: [],
            TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
            GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
        };


        this.dataset.grantTableWithColumnPermissions(this.user, weatherUserGrant);

        const weatherAdminGrant: DataLakeEnrollment.TableWithColumnPermissionGrant = {
            table: "weather",
            database: "gold",
            columns: ['date','max_temperature_f','mean_temperature_f','min_temperaturef','max_dew_point_f',
                'meandew_point_f','min_dewpoint_f','max_humidity','mean_humidity','min_humidity','max_sea_level_pressure_in',
                'mean_sea_level_pressure_in','min_sea_level_pressure_in','max_visibility_miles','mean_visibility_miles',
                'min_visibility_miles','max_wind_speed_mph','mean_wind_speed_mph','max_gust_speed_mph','precipitation_in','events'],
            DatabasePermissions: [],
            GrantableDatabasePermissions: [],
            TableColumnPermissions: [DataLakeEnrollment.TablePermission.Select],
            GrantableTableColumnPermissions: [DataLakeEnrollment.TablePermission.Select]
        };


        this.dataset.grantTableWithColumnPermissions(this.admin, weatherAdminGrant);
 */