"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KaggleCycleShareDataset = void 0;
const s3_dataset_registration_1 = require("./datalake/builders/s3-dataset-registration");
const dataset_manager_1 = require("./datalake/dataset-manager");
const aws_s3_1 = require("@aws-cdk/aws-s3");
const core_1 = require("@aws-cdk/core");
class KaggleCycleShareDataset extends dataset_manager_1.DatasetManager {
    constructor(scope, id, props) {
        super(scope, id, props);
        const dataLakeBucketName = props === null || props === void 0 ? void 0 : props.dataLakeBucketName;
        const dataSetName = props === null || props === void 0 ? void 0 : props.dataSetName;
        const landingDatabaseName = props === null || props === void 0 ? void 0 : props.landingDatabaseName;
        const stagingDatabaseName = props === null || props === void 0 ? void 0 : props.stagingDatabaseName;
        const goldDatabaseName = props === null || props === void 0 ? void 0 : props.goldDatabaseName;
        const dataLakeBucket = aws_s3_1.Bucket.fromBucketName(this, 'dataLakeBucket', dataLakeBucketName);
        this.Enrollments.push(new s3_dataset_registration_1.S3DatasetRegistration(this, `${dataLakeBucketName}Enrollment`, {
            dataSetName: dataSetName,
            databaseLandingName: landingDatabaseName,
            databaseStagingName: stagingDatabaseName,
            databaseGoldName: goldDatabaseName,
            sourceBucket: dataLakeBucket,
            maxDPUs: 2,
            sourceBucketDataPrefixes: [
                `/${landingDatabaseName}/station/`,
                `/${landingDatabaseName}/trip/`,
                `/${landingDatabaseName}/weather/`
            ],
            dataLakeBucket: props.dataLake.dataLakeBucket,
            glueStagingScriptPath: "lib/datalake/datasets/glue-scripts/landing_to_staging.py",
            glueStagingScriptArguments: {
                "--job-language": "python",
                "--job-bookmark-option": "job-bookmark-disable",
                "--enable-metrics": "",
                "--DL_BUCKET": props.dataLake.dataLakeBucket.bucketName,
                "--DL_REGION": core_1.Stack.of(this).region,
                "--DL_PREFIX": `/${stagingDatabaseName}/`,
                "--GLUE_SRC_DATABASE": landingDatabaseName
            },
            glueGoldScriptPath: "lib/datalake/datasets/glue-scripts/staging_to_gold.py",
            glueGoldScriptArguments: {
                "--job-language": "python",
                "--job-bookmark-option": "job-bookmark-disable",
                "--enable-metrics": "",
                "--DL_BUCKET": props.dataLake.dataLakeBucket.bucketName,
                "--DL_REGION": core_1.Stack.of(this).region,
                "--DL_PREFIX": `/${goldDatabaseName}/`,
                "--GLUE_SRC_DATABASE": stagingDatabaseName,
                "--ANONYMIZATION_CONF": "{\"datasets\": [{\"table\":\"trip\", \"anonymization\":\"mondrian-k-anonymization\", \"feature_columns\":[\"usertype\",\"gender\",\"birthyear\"],\"categorical\":[\"usertype\",\"gender\"] ,\"k_value\":\"2\", \"sensitive_column\": \"trip_id\"}] }",
                "--additional-python-modules": "spark_privacy_preserver==0.3.1 pyspark==2.4.5 pyarrow==0.14.1 diffprivlib==0.2.1 mypy==0.770 tabulate==0.8.7 numpy==1.15.4 pandas==1.1.5 faker==8.8.1",
            }
        }));
    }
}
exports.KaggleCycleShareDataset = KaggleCycleShareDataset;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2FnZ2xlLWN5Y2xlLXNoYXJlLWRhdGFzZXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJrYWdnbGUtY3ljbGUtc2hhcmUtZGF0YXNldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx5RkFBb0Y7QUFDcEYsZ0VBQWdGO0FBQ2hGLDRDQUFpRDtBQUNqRCx3Q0FBaUQ7QUFVakQsTUFBYSx1QkFBd0IsU0FBUSxnQ0FBYztJQUV2RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTVCLE1BQU0sa0JBQWtCLEdBQVcsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLGtCQUFrQixDQUFDO1FBQzdELE1BQU0sV0FBVyxHQUFZLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxXQUFXLENBQUM7UUFDaEQsTUFBTSxtQkFBbUIsR0FBWSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsbUJBQW1CLENBQUM7UUFDaEUsTUFBTSxtQkFBbUIsR0FBWSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsbUJBQW1CLENBQUM7UUFDaEUsTUFBTSxnQkFBZ0IsR0FBWSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsZ0JBQWdCLENBQUM7UUFDMUQsTUFBTSxjQUFjLEdBQWEsZUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUMsZ0JBQWdCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUVsRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLCtDQUFxQixDQUFDLElBQUksRUFBRSxHQUFHLGtCQUFrQixZQUFZLEVBQUU7WUFDakYsV0FBVyxFQUFFLFdBQVc7WUFDeEIsbUJBQW1CLEVBQUUsbUJBQW1CO1lBQ3hDLG1CQUFtQixFQUFFLG1CQUFtQjtZQUN4QyxnQkFBZ0IsRUFBRSxnQkFBZ0I7WUFDbEMsWUFBWSxFQUFFLGNBQWM7WUFDNUIsT0FBTyxFQUFFLENBQUM7WUFDVix3QkFBd0IsRUFBRTtnQkFDdEIsSUFBSSxtQkFBbUIsV0FBVztnQkFDbEMsSUFBSSxtQkFBbUIsUUFBUTtnQkFDL0IsSUFBSSxtQkFBbUIsV0FBVzthQUNyQztZQUNELGNBQWMsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLGNBQWM7WUFDN0MscUJBQXFCLEVBQUUsMERBQTBEO1lBQ2pGLDBCQUEwQixFQUFFO2dCQUN4QixnQkFBZ0IsRUFBRSxRQUFRO2dCQUMxQix1QkFBdUIsRUFBRSxzQkFBc0I7Z0JBQy9DLGtCQUFrQixFQUFFLEVBQUU7Z0JBQ3RCLGFBQWEsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxVQUFVO2dCQUN2RCxhQUFhLEVBQUUsWUFBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNO2dCQUNwQyxhQUFhLEVBQUUsSUFBSSxtQkFBbUIsR0FBRztnQkFDekMscUJBQXFCLEVBQUUsbUJBQW1CO2FBQzdDO1lBQ0Qsa0JBQWtCLEVBQUUsdURBQXVEO1lBQzNFLHVCQUF1QixFQUFFO2dCQUNyQixnQkFBZ0IsRUFBRSxRQUFRO2dCQUMxQix1QkFBdUIsRUFBRSxzQkFBc0I7Z0JBQy9DLGtCQUFrQixFQUFFLEVBQUU7Z0JBQ3RCLGFBQWEsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxVQUFVO2dCQUN2RCxhQUFhLEVBQUUsWUFBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNO2dCQUNwQyxhQUFhLEVBQUUsSUFBSSxnQkFBZ0IsR0FBRztnQkFDdEMscUJBQXFCLEVBQUUsbUJBQW1CO2dCQUMxQyxzQkFBc0IsRUFBRSxzUEFBc1A7Z0JBQzlRLDZCQUE2QixFQUFFLHVKQUF1SjthQUV6TDtTQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ1IsQ0FBQztDQUNKO0FBbERELDBEQWtEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFMzRGF0YXNldFJlZ2lzdHJhdGlvbiB9IGZyb20gJy4vZGF0YWxha2UvYnVpbGRlcnMvczMtZGF0YXNldC1yZWdpc3RyYXRpb24nO1xuaW1wb3J0IHsgRGF0YXNldE1hbmFnZXIsIERhdGFzZXRNYW5hZ2VyUHJvcHN9IGZyb20gJy4vZGF0YWxha2UvZGF0YXNldC1tYW5hZ2VyJztcbmltcG9ydCB7IEJ1Y2tldCwgSUJ1Y2tldH0gZnJvbSBcIkBhd3MtY2RrL2F3cy1zM1wiO1xuaW1wb3J0IHsgQ29uc3RydWN0LCBTdGFjayB9IGZyb20gXCJAYXdzLWNkay9jb3JlXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29udGV4dERhdGFzZXRQcm9wcyBleHRlbmRzIERhdGFzZXRNYW5hZ2VyUHJvcHMge1xuICAgIHJlYWRvbmx5IGRhdGFMYWtlQnVja2V0TmFtZTogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGRhdGFTZXROYW1lOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgbGFuZGluZ0RhdGFiYXNlTmFtZTogc3RyaW5nO1xuICAgIHJlYWRvbmx5IHN0YWdpbmdEYXRhYmFzZU5hbWU6IHN0cmluZztcbiAgICByZWFkb25seSBnb2xkRGF0YWJhc2VOYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBLYWdnbGVDeWNsZVNoYXJlRGF0YXNldCBleHRlbmRzIERhdGFzZXRNYW5hZ2VyIHtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDb250ZXh0RGF0YXNldFByb3BzKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgZGF0YUxha2VCdWNrZXROYW1lOiBzdHJpbmcgPSBwcm9wcz8uZGF0YUxha2VCdWNrZXROYW1lO1xuICAgIGNvbnN0IGRhdGFTZXROYW1lIDogc3RyaW5nID0gcHJvcHM/LmRhdGFTZXROYW1lO1xuICAgIGNvbnN0IGxhbmRpbmdEYXRhYmFzZU5hbWUgOiBzdHJpbmcgPSBwcm9wcz8ubGFuZGluZ0RhdGFiYXNlTmFtZTtcbiAgICBjb25zdCBzdGFnaW5nRGF0YWJhc2VOYW1lIDogc3RyaW5nID0gcHJvcHM/LnN0YWdpbmdEYXRhYmFzZU5hbWU7XG4gICAgY29uc3QgZ29sZERhdGFiYXNlTmFtZSA6IHN0cmluZyA9IHByb3BzPy5nb2xkRGF0YWJhc2VOYW1lO1xuICAgIGNvbnN0IGRhdGFMYWtlQnVja2V0IDogSUJ1Y2tldCA9IEJ1Y2tldC5mcm9tQnVja2V0TmFtZSh0aGlzLCdkYXRhTGFrZUJ1Y2tldCcsIGRhdGFMYWtlQnVja2V0TmFtZSk7XG5cbiAgICB0aGlzLkVucm9sbG1lbnRzLnB1c2gobmV3IFMzRGF0YXNldFJlZ2lzdHJhdGlvbih0aGlzLCBgJHtkYXRhTGFrZUJ1Y2tldE5hbWV9RW5yb2xsbWVudGAsIHtcbiAgICAgICAgICAgIGRhdGFTZXROYW1lOiBkYXRhU2V0TmFtZSxcbiAgICAgICAgICAgIGRhdGFiYXNlTGFuZGluZ05hbWU6IGxhbmRpbmdEYXRhYmFzZU5hbWUsXG4gICAgICAgICAgICBkYXRhYmFzZVN0YWdpbmdOYW1lOiBzdGFnaW5nRGF0YWJhc2VOYW1lLFxuICAgICAgICAgICAgZGF0YWJhc2VHb2xkTmFtZTogZ29sZERhdGFiYXNlTmFtZSxcbiAgICAgICAgICAgIHNvdXJjZUJ1Y2tldDogZGF0YUxha2VCdWNrZXQsXG4gICAgICAgICAgICBtYXhEUFVzOiAyLFxuICAgICAgICAgICAgc291cmNlQnVja2V0RGF0YVByZWZpeGVzOiBbXG4gICAgICAgICAgICAgICAgYC8ke2xhbmRpbmdEYXRhYmFzZU5hbWV9L3N0YXRpb24vYCxcbiAgICAgICAgICAgICAgICBgLyR7bGFuZGluZ0RhdGFiYXNlTmFtZX0vdHJpcC9gLFxuICAgICAgICAgICAgICAgIGAvJHtsYW5kaW5nRGF0YWJhc2VOYW1lfS93ZWF0aGVyL2BcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBkYXRhTGFrZUJ1Y2tldDogcHJvcHMuZGF0YUxha2UuZGF0YUxha2VCdWNrZXQsXG4gICAgICAgICAgICBnbHVlU3RhZ2luZ1NjcmlwdFBhdGg6IFwibGliL2RhdGFsYWtlL2RhdGFzZXRzL2dsdWUtc2NyaXB0cy9sYW5kaW5nX3RvX3N0YWdpbmcucHlcIixcbiAgICAgICAgICAgIGdsdWVTdGFnaW5nU2NyaXB0QXJndW1lbnRzOiB7XG4gICAgICAgICAgICAgICAgXCItLWpvYi1sYW5ndWFnZVwiOiBcInB5dGhvblwiLFxuICAgICAgICAgICAgICAgIFwiLS1qb2ItYm9va21hcmstb3B0aW9uXCI6IFwiam9iLWJvb2ttYXJrLWRpc2FibGVcIixcbiAgICAgICAgICAgICAgICBcIi0tZW5hYmxlLW1ldHJpY3NcIjogXCJcIixcbiAgICAgICAgICAgICAgICBcIi0tRExfQlVDS0VUXCI6IHByb3BzLmRhdGFMYWtlLmRhdGFMYWtlQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgICAgICAgICAgXCItLURMX1JFR0lPTlwiOiBTdGFjay5vZih0aGlzKS5yZWdpb24sXG4gICAgICAgICAgICAgICAgXCItLURMX1BSRUZJWFwiOiBgLyR7c3RhZ2luZ0RhdGFiYXNlTmFtZX0vYCxcbiAgICAgICAgICAgICAgICBcIi0tR0xVRV9TUkNfREFUQUJBU0VcIjogbGFuZGluZ0RhdGFiYXNlTmFtZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdsdWVHb2xkU2NyaXB0UGF0aDogXCJsaWIvZGF0YWxha2UvZGF0YXNldHMvZ2x1ZS1zY3JpcHRzL3N0YWdpbmdfdG9fZ29sZC5weVwiLFxuICAgICAgICAgICAgZ2x1ZUdvbGRTY3JpcHRBcmd1bWVudHM6IHtcbiAgICAgICAgICAgICAgICBcIi0tam9iLWxhbmd1YWdlXCI6IFwicHl0aG9uXCIsXG4gICAgICAgICAgICAgICAgXCItLWpvYi1ib29rbWFyay1vcHRpb25cIjogXCJqb2ItYm9va21hcmstZGlzYWJsZVwiLFxuICAgICAgICAgICAgICAgIFwiLS1lbmFibGUtbWV0cmljc1wiOiBcIlwiLFxuICAgICAgICAgICAgICAgIFwiLS1ETF9CVUNLRVRcIjogcHJvcHMuZGF0YUxha2UuZGF0YUxha2VCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgICAgICAgICBcIi0tRExfUkVHSU9OXCI6IFN0YWNrLm9mKHRoaXMpLnJlZ2lvbixcbiAgICAgICAgICAgICAgICBcIi0tRExfUFJFRklYXCI6IGAvJHtnb2xkRGF0YWJhc2VOYW1lfS9gLFxuICAgICAgICAgICAgICAgIFwiLS1HTFVFX1NSQ19EQVRBQkFTRVwiOiBzdGFnaW5nRGF0YWJhc2VOYW1lLFxuICAgICAgICAgICAgICAgIFwiLS1BTk9OWU1JWkFUSU9OX0NPTkZcIjogXCJ7XFxcImRhdGFzZXRzXFxcIjogW3tcXFwidGFibGVcXFwiOlxcXCJ0cmlwXFxcIiwgXFxcImFub255bWl6YXRpb25cXFwiOlxcXCJtb25kcmlhbi1rLWFub255bWl6YXRpb25cXFwiLCBcXFwiZmVhdHVyZV9jb2x1bW5zXFxcIjpbXFxcInVzZXJ0eXBlXFxcIixcXFwiZ2VuZGVyXFxcIixcXFwiYmlydGh5ZWFyXFxcIl0sXFxcImNhdGVnb3JpY2FsXFxcIjpbXFxcInVzZXJ0eXBlXFxcIixcXFwiZ2VuZGVyXFxcIl0gLFxcXCJrX3ZhbHVlXFxcIjpcXFwiMlxcXCIsIFxcXCJzZW5zaXRpdmVfY29sdW1uXFxcIjogXFxcInRyaXBfaWRcXFwifV0gfVwiLFxuICAgICAgICAgICAgICAgIFwiLS1hZGRpdGlvbmFsLXB5dGhvbi1tb2R1bGVzXCI6IFwic3BhcmtfcHJpdmFjeV9wcmVzZXJ2ZXI9PTAuMy4xIHB5c3Bhcms9PTIuNC41IHB5YXJyb3c9PTAuMTQuMSBkaWZmcHJpdmxpYj09MC4yLjEgbXlweT09MC43NzAgdGFidWxhdGU9PTAuOC43IG51bXB5PT0xLjE1LjQgcGFuZGFzPT0xLjEuNSBmYWtlcj09OC44LjFcIixcbiAgICAgICAgICAgICAgICAvL1wiLS1weXRob24tbW9kdWxlcy1pbnN0YWxsZXItb3B0aW9uXCI6IFwiLS11cGdyYWRlXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH1cbn0iXX0=