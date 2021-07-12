"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersLakeFormationStack = void 0;
const core_1 = require("@aws-cdk/core");
const aws_iam_1 = require("@aws-cdk/aws-iam");
/*
    Administradores: que requieren el acceso completo a las tablas.
    Científico de Datos: requiere acceso completo a los datos pero ciertas columnas tienen que sufrir una ofuscación, como por ejemplo la latitud y la longitud.
    Mantenimiento: acceden a la tabla de estaciones y a la de viajes menos a la información "sensible" que seria el tipo de usuario, sexo y su año de nacimiento.
    Usuarios: que acceden a la información generada por ellos exclusivamente en la tabla Viajes y a la información meteorológica.
    Analista de negocio: ver dato agrupado, a una agregación sin ofuscar datos, consulta una vista agregada.
 */
class UsersLakeFormationStack extends core_1.Stack {
    // readonly analyst: Role;
    constructor(scope, id, props) {
        super(scope, id, props);
        // @ts-ignore
        this.dataset = props.dataset;
        this.admin = new aws_iam_1.Role(this, 'adminRole', {
            description: "Administradores: que requieren el acceso completo a las tablas.",
            assumedBy: new aws_iam_1.ArnPrincipal((props === null || props === void 0 ? void 0 : props.awsAccount) || "")
        });
        this.scientist = new aws_iam_1.Role(this, 'scientistRole', {
            description: "",
            assumedBy: new aws_iam_1.ArnPrincipal((props === null || props === void 0 ? void 0 : props.awsAccount) || "")
        });
        /*
        this.staff = new Role(this,'staffRole',{
            description: "",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });
        */
        this.user = new aws_iam_1.Role(this, 'userRole', {
            description: "",
            assumedBy: new aws_iam_1.ArnPrincipal((props === null || props === void 0 ? void 0 : props.awsAccount) || "")
        });
        /*
        this.analyst = new Role(this,'analystRole',{
            description: "",
            assumedBy: new ArnPrincipal(props?.awsAccount || "")
        });
        */
    }
}
exports.UsersLakeFormationStack = UsersLakeFormationStack;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlcnMtbGFrZS1mb3JtYXRpb24tc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1c2Vycy1sYWtlLWZvcm1hdGlvbi1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3Q0FBMEU7QUFDMUUsOENBUzBCO0FBUzFCOzs7Ozs7R0FNRztBQUNILE1BQWEsdUJBQXdCLFNBQVEsWUFBSztJQU85QywwQkFBMEI7SUFFMUIsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQztRQUM1RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixhQUFhO1FBQ2IsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO1FBRTdCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxjQUFJLENBQUMsSUFBSSxFQUFDLFdBQVcsRUFBQztZQUNuQyxXQUFXLEVBQUUsaUVBQWlFO1lBQzlFLFNBQVMsRUFBRSxJQUFJLHNCQUFZLENBQUMsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsVUFBVSxLQUFJLEVBQUUsQ0FBQztTQUN2RCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBQyxlQUFlLEVBQUM7WUFDM0MsV0FBVyxFQUFFLEVBQUU7WUFDZixTQUFTLEVBQUUsSUFBSSxzQkFBWSxDQUFDLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFVBQVUsS0FBSSxFQUFFLENBQUM7U0FDdkQsQ0FBQyxDQUFDO1FBQ0g7Ozs7O1VBS0U7UUFDRixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBQyxVQUFVLEVBQUM7WUFDakMsV0FBVyxFQUFFLEVBQUU7WUFDZixTQUFTLEVBQUUsSUFBSSxzQkFBWSxDQUFDLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFVBQVUsS0FBSSxFQUFFLENBQUM7U0FDdkQsQ0FBQyxDQUFDO1FBQ0g7Ozs7O1VBS0U7SUFFTixDQUFDO0NBQ0o7QUExQ0QsMERBMENDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9GRyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnN0cnVjdCwgU3RhY2ssIFN0YWNrUHJvcHMsIFNlY3JldFZhbHVlIH0gZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcbmltcG9ydCB7XG4gICAgQWNjb3VudFByaW5jaXBhbCxcbiAgICBBcm5QcmluY2lwYWwsXG4gICAgRWZmZWN0LFxuICAgIEdyb3VwLFxuICAgIE1hbmFnZWRQb2xpY3ksXG4gICAgUG9saWN5U3RhdGVtZW50LFxuICAgIFJvbGUsXG4gICAgVXNlclxufSBmcm9tIFwiQGF3cy1jZGsvYXdzLWlhbVwiO1xuaW1wb3J0IHtLYWdnbGVDeWNsZVNoYXJlRGF0YXNldH0gZnJvbSBcIi4va2FnZ2xlLWN5Y2xlLXNoYXJlLWRhdGFzZXRcIjtcbmltcG9ydCB7RGF0YUxha2VDb25mUmVnaXN0cmF0aW9ufSBmcm9tIFwiLi9kYXRhbGFrZS9idWlsZGVycy9kYXRhLWxha2UtY29uZi1yZWdpc3RyYXRpb25cIjtcblxuZXhwb3J0IGludGVyZmFjZSBDb250ZXh0VXNlcnNMYWtlRm9ybWF0aW9uUHJvcHMgZXh0ZW5kcyBTdGFja1Byb3BzIHtcbiAgICBkYXRhc2V0OiBLYWdnbGVDeWNsZVNoYXJlRGF0YXNldFxuICAgIGF3c0FjY291bnQ6IHN0cmluZztcbn1cblxuLypcbiAgICBBZG1pbmlzdHJhZG9yZXM6IHF1ZSByZXF1aWVyZW4gZWwgYWNjZXNvIGNvbXBsZXRvIGEgbGFzIHRhYmxhcy5cbiAgICBDaWVudMOtZmljbyBkZSBEYXRvczogcmVxdWllcmUgYWNjZXNvIGNvbXBsZXRvIGEgbG9zIGRhdG9zIHBlcm8gY2llcnRhcyBjb2x1bW5hcyB0aWVuZW4gcXVlIHN1ZnJpciB1bmEgb2Z1c2NhY2nDs24sIGNvbW8gcG9yIGVqZW1wbG8gbGEgbGF0aXR1ZCB5IGxhIGxvbmdpdHVkLlxuICAgIE1hbnRlbmltaWVudG86IGFjY2VkZW4gYSBsYSB0YWJsYSBkZSBlc3RhY2lvbmVzIHkgYSBsYSBkZSB2aWFqZXMgbWVub3MgYSBsYSBpbmZvcm1hY2nDs24gXCJzZW5zaWJsZVwiIHF1ZSBzZXJpYSBlbCB0aXBvIGRlIHVzdWFyaW8sIHNleG8geSBzdSBhw7FvIGRlIG5hY2ltaWVudG8uXG4gICAgVXN1YXJpb3M6IHF1ZSBhY2NlZGVuIGEgbGEgaW5mb3JtYWNpw7NuIGdlbmVyYWRhIHBvciBlbGxvcyBleGNsdXNpdmFtZW50ZSBlbiBsYSB0YWJsYSBWaWFqZXMgeSBhIGxhIGluZm9ybWFjacOzbiBtZXRlb3JvbMOzZ2ljYS5cbiAgICBBbmFsaXN0YSBkZSBuZWdvY2lvOiB2ZXIgZGF0byBhZ3J1cGFkbywgYSB1bmEgYWdyZWdhY2nDs24gc2luIG9mdXNjYXIgZGF0b3MsIGNvbnN1bHRhIHVuYSB2aXN0YSBhZ3JlZ2FkYS5cbiAqL1xuZXhwb3J0IGNsYXNzIFVzZXJzTGFrZUZvcm1hdGlvblN0YWNrIGV4dGVuZHMgU3RhY2sge1xuXG4gICAgcmVhZG9ubHkgZGF0YXNldDogS2FnZ2xlQ3ljbGVTaGFyZURhdGFzZXQ7XG4gICAgcmVhZG9ubHkgYWRtaW46IFJvbGU7XG4gICAgcmVhZG9ubHkgc2NpZW50aXN0OiBSb2xlO1xuICAgIC8vIHJlYWRvbmx5IHN0YWZmOiBSb2xlO1xuICAgIHJlYWRvbmx5IHVzZXI6IFJvbGU7XG4gICAgLy8gcmVhZG9ubHkgYW5hbHlzdDogUm9sZTtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogQ29udGV4dFVzZXJzTGFrZUZvcm1hdGlvblByb3BzKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgdGhpcy5kYXRhc2V0ID0gcHJvcHMuZGF0YXNldDtcblxuICAgICAgICB0aGlzLmFkbWluID0gbmV3IFJvbGUodGhpcywnYWRtaW5Sb2xlJyx7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJBZG1pbmlzdHJhZG9yZXM6IHF1ZSByZXF1aWVyZW4gZWwgYWNjZXNvIGNvbXBsZXRvIGEgbGFzIHRhYmxhcy5cIixcbiAgICAgICAgICAgIGFzc3VtZWRCeTogbmV3IEFyblByaW5jaXBhbChwcm9wcz8uYXdzQWNjb3VudCB8fCBcIlwiKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnNjaWVudGlzdCA9IG5ldyBSb2xlKHRoaXMsJ3NjaWVudGlzdFJvbGUnLHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxuICAgICAgICAgICAgYXNzdW1lZEJ5OiBuZXcgQXJuUHJpbmNpcGFsKHByb3BzPy5hd3NBY2NvdW50IHx8IFwiXCIpXG4gICAgICAgIH0pO1xuICAgICAgICAvKlxuICAgICAgICB0aGlzLnN0YWZmID0gbmV3IFJvbGUodGhpcywnc3RhZmZSb2xlJyx7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcbiAgICAgICAgICAgIGFzc3VtZWRCeTogbmV3IEFyblByaW5jaXBhbChwcm9wcz8uYXdzQWNjb3VudCB8fCBcIlwiKVxuICAgICAgICB9KTtcbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy51c2VyID0gbmV3IFJvbGUodGhpcywndXNlclJvbGUnLHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxuICAgICAgICAgICAgYXNzdW1lZEJ5OiBuZXcgQXJuUHJpbmNpcGFsKHByb3BzPy5hd3NBY2NvdW50IHx8IFwiXCIpXG4gICAgICAgIH0pO1xuICAgICAgICAvKlxuICAgICAgICB0aGlzLmFuYWx5c3QgPSBuZXcgUm9sZSh0aGlzLCdhbmFseXN0Um9sZScse1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXG4gICAgICAgICAgICBhc3N1bWVkQnk6IG5ldyBBcm5QcmluY2lwYWwocHJvcHM/LmF3c0FjY291bnQgfHwgXCJcIilcbiAgICAgICAgfSk7XG4gICAgICAgICovXG5cbiAgICB9XG59XG5cbi8qXG4gICAgICAgIGNvbnN0IHRyaXBTY2llbnRpc3RHcmFudDogRGF0YUxha2VFbnJvbGxtZW50LlRhYmxlV2l0aENvbHVtblBlcm1pc3Npb25HcmFudCA9IHtcbiAgICAgICAgICAgIHRhYmxlOiBcInRyaXBcIixcbiAgICAgICAgICAgIGRhdGFiYXNlOiBcImdvbGRcIixcbiAgICAgICAgICAgIGNvbHVtbnM6IFsndXNlcnR5cGVfYW5vJywnZ2VuZGVyX2FubycsJ2JpcnRoeWVhcl9hbm8nXSxcbiAgICAgICAgICAgIERhdGFiYXNlUGVybWlzc2lvbnM6IFtdLFxuICAgICAgICAgICAgR3JhbnRhYmxlRGF0YWJhc2VQZXJtaXNzaW9uczogW10sXG4gICAgICAgICAgICBUYWJsZUNvbHVtblBlcm1pc3Npb25zOiBbRGF0YUxha2VFbnJvbGxtZW50LlRhYmxlUGVybWlzc2lvbi5TZWxlY3RdLFxuICAgICAgICAgICAgR3JhbnRhYmxlVGFibGVDb2x1bW5QZXJtaXNzaW9uczogW0RhdGFMYWtlRW5yb2xsbWVudC5UYWJsZVBlcm1pc3Npb24uU2VsZWN0XVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGF0YXNldC5ncmFudElhbVJlYWQodGhpcy5zY2llbnRpc3QpO1xuICAgICAgICB0aGlzLmRhdGFzZXQuZ3JhbnRUYWJsZVdpdGhDb2x1bW5QZXJtaXNzaW9ucyh0aGlzLnNjaWVudGlzdCwgdHJpcFNjaWVudGlzdEdyYW50KTtcblxuICAgICAgICBjb25zdCB0cmlwQWRtaW5HcmFudDogRGF0YUxha2VFbnJvbGxtZW50LlRhYmxlV2l0aENvbHVtblBlcm1pc3Npb25HcmFudCA9IHtcbiAgICAgICAgICAgIHRhYmxlOiBcInRyaXBcIixcbiAgICAgICAgICAgIGRhdGFiYXNlOiBcImdvbGRcIixcbiAgICAgICAgICAgIGNvbHVtbnM6IFsndXNlcnR5cGUnLCdnZW5kZXInLCdiaXJ0aHllYXInLCd0cmlwX2lkJ10sXG4gICAgICAgICAgICBEYXRhYmFzZVBlcm1pc3Npb25zOiBbXSxcbiAgICAgICAgICAgIEdyYW50YWJsZURhdGFiYXNlUGVybWlzc2lvbnM6IFtdLFxuICAgICAgICAgICAgVGFibGVDb2x1bW5QZXJtaXNzaW9uczogW0RhdGFMYWtlRW5yb2xsbWVudC5UYWJsZVBlcm1pc3Npb24uU2VsZWN0XSxcbiAgICAgICAgICAgIEdyYW50YWJsZVRhYmxlQ29sdW1uUGVybWlzc2lvbnM6IFtEYXRhTGFrZUVucm9sbG1lbnQuVGFibGVQZXJtaXNzaW9uLlNlbGVjdF1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRhdGFzZXQuZ3JhbnRJYW1SZWFkKHRoaXMuYWRtaW4pO1xuICAgICAgICB0aGlzLmRhdGFzZXQuZ3JhbnRUYWJsZVdpdGhDb2x1bW5QZXJtaXNzaW9ucyh0aGlzLmFkbWluLCB0cmlwQWRtaW5HcmFudCk7XG5cbiAgICAgICAgY29uc3Qgc3RhdGlvbkFkbWluR3JhbnQ6IERhdGFMYWtlRW5yb2xsbWVudC5UYWJsZVdpdGhDb2x1bW5QZXJtaXNzaW9uR3JhbnQgPSB7XG4gICAgICAgICAgICB0YWJsZTogXCJzdGF0aW9uXCIsXG4gICAgICAgICAgICBkYXRhYmFzZTogXCJnb2xkXCIsXG4gICAgICAgICAgICBjb2x1bW5zOiBbJ3N0YXRpb25faWQnLCduYW1lJywnbGF0JywnbG9uZycsJ2luc3RhbGxfZGF0ZScsJ2luc3RhbGxfZG9ja2NvdW50JywnbW9kaWZpY2F0aW9uX2RhdGUnLCdjdXJyZW50X2RvY2tjb3VudCcsJ2RlY29tbWlzc2lvbl9kYXRlJ10sXG4gICAgICAgICAgICBEYXRhYmFzZVBlcm1pc3Npb25zOiBbXSxcbiAgICAgICAgICAgIEdyYW50YWJsZURhdGFiYXNlUGVybWlzc2lvbnM6IFtdLFxuICAgICAgICAgICAgVGFibGVDb2x1bW5QZXJtaXNzaW9uczogW0RhdGFMYWtlRW5yb2xsbWVudC5UYWJsZVBlcm1pc3Npb24uU2VsZWN0XSxcbiAgICAgICAgICAgIEdyYW50YWJsZVRhYmxlQ29sdW1uUGVybWlzc2lvbnM6IFtEYXRhTGFrZUVucm9sbG1lbnQuVGFibGVQZXJtaXNzaW9uLlNlbGVjdF1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRhdGFzZXQuZ3JhbnRJYW1SZWFkKHRoaXMuYWRtaW4pO1xuICAgICAgICB0aGlzLmRhdGFzZXQuZ3JhbnRUYWJsZVdpdGhDb2x1bW5QZXJtaXNzaW9ucyh0aGlzLmFkbWluLCBzdGF0aW9uQWRtaW5HcmFudCk7XG5cbiAgICAgICAgY29uc3Qgc3RhdGlvblVzZXJHcmFudDogRGF0YUxha2VFbnJvbGxtZW50LlRhYmxlV2l0aENvbHVtblBlcm1pc3Npb25HcmFudCA9IHtcbiAgICAgICAgICAgIHRhYmxlOiBcInN0YXRpb25cIixcbiAgICAgICAgICAgIGRhdGFiYXNlOiBcImdvbGRcIixcbiAgICAgICAgICAgIGNvbHVtbnM6IFsnbmFtZScsJ2xhdCcsJ2xvbmcnLCdjdXJyZW50X2RvY2tjb3VudCddLFxuICAgICAgICAgICAgRGF0YWJhc2VQZXJtaXNzaW9uczogW10sXG4gICAgICAgICAgICBHcmFudGFibGVEYXRhYmFzZVBlcm1pc3Npb25zOiBbXSxcbiAgICAgICAgICAgIFRhYmxlQ29sdW1uUGVybWlzc2lvbnM6IFtEYXRhTGFrZUVucm9sbG1lbnQuVGFibGVQZXJtaXNzaW9uLlNlbGVjdF0sXG4gICAgICAgICAgICBHcmFudGFibGVUYWJsZUNvbHVtblBlcm1pc3Npb25zOiBbRGF0YUxha2VFbnJvbGxtZW50LlRhYmxlUGVybWlzc2lvbi5TZWxlY3RdXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kYXRhc2V0LmdyYW50SWFtUmVhZCh0aGlzLnVzZXIpO1xuICAgICAgICB0aGlzLmRhdGFzZXQuZ3JhbnRUYWJsZVdpdGhDb2x1bW5QZXJtaXNzaW9ucyh0aGlzLnVzZXIsIHN0YXRpb25Vc2VyR3JhbnQpO1xuXG4gICAgICAgIGNvbnN0IHdlYXRoZXJVc2VyR3JhbnQ6IERhdGFMYWtlRW5yb2xsbWVudC5UYWJsZVdpdGhDb2x1bW5QZXJtaXNzaW9uR3JhbnQgPSB7XG4gICAgICAgICAgICB0YWJsZTogXCJ3ZWF0aGVyXCIsXG4gICAgICAgICAgICBkYXRhYmFzZTogXCJnb2xkXCIsXG4gICAgICAgICAgICBjb2x1bW5zOiBbJ2RhdGUnLCdtYXhfdGVtcGVyYXR1cmVfZicsJ21lYW5fdGVtcGVyYXR1cmVfZicsJ21pbl90ZW1wZXJhdHVyZWYnLCdtYXhfZGV3X3BvaW50X2YnLFxuICAgICAgICAgICAgICAgICdtZWFuZGV3X3BvaW50X2YnLCdtaW5fZGV3cG9pbnRfZicsJ21heF9odW1pZGl0eScsJ21lYW5faHVtaWRpdHknLCdtaW5faHVtaWRpdHknLCdtYXhfc2VhX2xldmVsX3ByZXNzdXJlX2luJyxcbiAgICAgICAgICAgICAgICAnbWVhbl9zZWFfbGV2ZWxfcHJlc3N1cmVfaW4nLCdtaW5fc2VhX2xldmVsX3ByZXNzdXJlX2luJywnbWF4X3Zpc2liaWxpdHlfbWlsZXMnLCdtZWFuX3Zpc2liaWxpdHlfbWlsZXMnLFxuICAgICAgICAgICAgICAgICdtaW5fdmlzaWJpbGl0eV9taWxlcycsJ21heF93aW5kX3NwZWVkX21waCcsJ21lYW5fd2luZF9zcGVlZF9tcGgnLCdtYXhfZ3VzdF9zcGVlZF9tcGgnLCdwcmVjaXBpdGF0aW9uX2luJywnZXZlbnRzJ10sXG4gICAgICAgICAgICBEYXRhYmFzZVBlcm1pc3Npb25zOiBbXSxcbiAgICAgICAgICAgIEdyYW50YWJsZURhdGFiYXNlUGVybWlzc2lvbnM6IFtdLFxuICAgICAgICAgICAgVGFibGVDb2x1bW5QZXJtaXNzaW9uczogW0RhdGFMYWtlRW5yb2xsbWVudC5UYWJsZVBlcm1pc3Npb24uU2VsZWN0XSxcbiAgICAgICAgICAgIEdyYW50YWJsZVRhYmxlQ29sdW1uUGVybWlzc2lvbnM6IFtEYXRhTGFrZUVucm9sbG1lbnQuVGFibGVQZXJtaXNzaW9uLlNlbGVjdF1cbiAgICAgICAgfTtcblxuXG4gICAgICAgIHRoaXMuZGF0YXNldC5ncmFudFRhYmxlV2l0aENvbHVtblBlcm1pc3Npb25zKHRoaXMudXNlciwgd2VhdGhlclVzZXJHcmFudCk7XG5cbiAgICAgICAgY29uc3Qgd2VhdGhlckFkbWluR3JhbnQ6IERhdGFMYWtlRW5yb2xsbWVudC5UYWJsZVdpdGhDb2x1bW5QZXJtaXNzaW9uR3JhbnQgPSB7XG4gICAgICAgICAgICB0YWJsZTogXCJ3ZWF0aGVyXCIsXG4gICAgICAgICAgICBkYXRhYmFzZTogXCJnb2xkXCIsXG4gICAgICAgICAgICBjb2x1bW5zOiBbJ2RhdGUnLCdtYXhfdGVtcGVyYXR1cmVfZicsJ21lYW5fdGVtcGVyYXR1cmVfZicsJ21pbl90ZW1wZXJhdHVyZWYnLCdtYXhfZGV3X3BvaW50X2YnLFxuICAgICAgICAgICAgICAgICdtZWFuZGV3X3BvaW50X2YnLCdtaW5fZGV3cG9pbnRfZicsJ21heF9odW1pZGl0eScsJ21lYW5faHVtaWRpdHknLCdtaW5faHVtaWRpdHknLCdtYXhfc2VhX2xldmVsX3ByZXNzdXJlX2luJyxcbiAgICAgICAgICAgICAgICAnbWVhbl9zZWFfbGV2ZWxfcHJlc3N1cmVfaW4nLCdtaW5fc2VhX2xldmVsX3ByZXNzdXJlX2luJywnbWF4X3Zpc2liaWxpdHlfbWlsZXMnLCdtZWFuX3Zpc2liaWxpdHlfbWlsZXMnLFxuICAgICAgICAgICAgICAgICdtaW5fdmlzaWJpbGl0eV9taWxlcycsJ21heF93aW5kX3NwZWVkX21waCcsJ21lYW5fd2luZF9zcGVlZF9tcGgnLCdtYXhfZ3VzdF9zcGVlZF9tcGgnLCdwcmVjaXBpdGF0aW9uX2luJywnZXZlbnRzJ10sXG4gICAgICAgICAgICBEYXRhYmFzZVBlcm1pc3Npb25zOiBbXSxcbiAgICAgICAgICAgIEdyYW50YWJsZURhdGFiYXNlUGVybWlzc2lvbnM6IFtdLFxuICAgICAgICAgICAgVGFibGVDb2x1bW5QZXJtaXNzaW9uczogW0RhdGFMYWtlRW5yb2xsbWVudC5UYWJsZVBlcm1pc3Npb24uU2VsZWN0XSxcbiAgICAgICAgICAgIEdyYW50YWJsZVRhYmxlQ29sdW1uUGVybWlzc2lvbnM6IFtEYXRhTGFrZUVucm9sbG1lbnQuVGFibGVQZXJtaXNzaW9uLlNlbGVjdF1cbiAgICAgICAgfTtcblxuXG4gICAgICAgIHRoaXMuZGF0YXNldC5ncmFudFRhYmxlV2l0aENvbHVtblBlcm1pc3Npb25zKHRoaXMuYWRtaW4sIHdlYXRoZXJBZG1pbkdyYW50KTtcbiAqLyJdfQ==