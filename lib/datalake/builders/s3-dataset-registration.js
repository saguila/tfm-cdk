"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3DatasetRegistration = void 0;
const iam = require("@aws-cdk/aws-iam");
const data_lake_conf_registration_1 = require("./data-lake-conf-registration");
const lakeformation = require("@aws-cdk/aws-lakeformation");
const dataset_glue_registration_1 = require("./dataset-glue-registration");
/**
 * Gestor de los permisos de S3 para el dataset
 */
class S3DatasetRegistration extends data_lake_conf_registration_1.DataLakeConfRegistration {
    constructor(scope, id, props) {
        super(scope, id, props);
        /* The dataset name must be match with the root location in s3 */
        const dataSetName = props.dataSetName;
        /* Access Policy with permissions list & get for attach to Glue Role (Crawlers)*/
        const s3AccessPolicy = new iam.Policy(this, 'dataSourceAccessPolicy');
        let s3TargetPaths = new Array();
        let s3DataLakeStagingPaths = new Array();
        let s3DataLakeGoldPaths = new Array();
        /* Add permission for list the target bucket */
        const bucketListPolicy = new iam.PolicyStatement({
            actions: ["s3:ListBucket"],
            effect: iam.Effect.ALLOW,
            resources: [`arn:aws:s3:::${props.sourceBucket.bucketName}`]
        });
        /* Deploy the policy to list the target bucket */
        s3AccessPolicy.addStatements(bucketListPolicy);
        /* Add permissions for get objects in all locations of target Bucket  */
        const prefixAccessPolicy = new iam.PolicyStatement({
            actions: ["s3:GetObject"],
            effect: iam.Effect.ALLOW,
            resources: [`arn:aws:s3:::${props.sourceBucket.bucketName}/*`]
        });
        /* Deploy the policy for get objects in the target Bucket*/
        s3AccessPolicy.addStatements(prefixAccessPolicy);
        /* Obtain all origin path for needed as input for Glue ETL & Crawlers */
        for (let bucketPrefix of props.sourceBucketDataPrefixes) {
            s3TargetPaths.push({
                path: `s3://${props.sourceBucket.bucketName}${bucketPrefix}`
            });
            var prefixFolders = bucketPrefix.split('/');
            var tableFolderName = prefixFolders[prefixFolders.length - 2];
            var tableFolderName = tableFolderName.toLowerCase().replace(/\//g, "_").replace(/-/g, "_");
            /* If has more child folders into input folder */
            if (props.sourceBucketDataPrefixes.length > 1) {
                /* Path for Staging database Datasets */
                s3DataLakeStagingPaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.databaseStagingName}/${tableFolderName}/`
                });
                /* Path for Gold database Datasets */
                s3DataLakeGoldPaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.databaseGoldName}/${tableFolderName}/`
                });
            }
            else {
                /* Paths for Staging database Datasets */
                s3DataLakeStagingPaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.databaseStagingName}/`
                });
                /* Paths for Gold database Datasets */
                s3DataLakeGoldPaths.push({
                    path: `s3://${props.dataLakeBucket.bucketName}/${props.databaseGoldName}/`
                });
            }
        }
        this.DataRegistration = new dataset_glue_registration_1.DatasetGlueRegistration(this, `${props.dataSetName}-s3Enrollment`, {
            dataSetName: props.dataSetName,
            dataLakeBucket: props.dataLakeBucket,
            goldDatabaseName: props.databaseGoldName,
            stagingDatabaseName: props.databaseStagingName,
            landingDatabaseName: props.databaseLandingName,
            sourceAccessPolicy: s3AccessPolicy,
            dataLakeLandingTargets: {
                s3Targets: s3TargetPaths,
            },
            maxDPUs: props.maxDPUs,
            glueStagingScriptPath: props.glueStagingScriptPath,
            dataLakeStagingTargets: {
                s3Targets: s3DataLakeStagingPaths
            },
            dataLakeGoldTargets: {
                s3Targets: s3DataLakeGoldPaths
            },
            glueStagingScriptArguments: props.glueStagingScriptArguments,
            glueGoldScriptPath: props.glueGoldScriptPath,
            glueGoldScriptArguments: props.glueGoldScriptArguments,
            workflowCronScheduleExpression: props.workflowCronScheduleExpression
        });
        this.createCoarseIamPolicy();
        //this.setupGlueRoleLakeFormationPermissions(this.DataEnrollment.DataSetGlueRole, props.dataSetName, props.sourceBucket);
        this.grantCoarseIamRead(this.DataRegistration.DataSetGlueRole);
    }
    /**
     * Gives permissions to a Glue IAM Role for work with dataset in the target Bucket
     * @param DataSetGlueRole
     * @param DataSetName
     * @param sourceDataBucket
     */
    setupGlueRoleLakeFormationPermissions(DataSetGlueRole, DataSetName, sourceDataBucket) {
        /* Attach Glue Role to use a S3 Bucket managed by Lake Formation */
        const sourceLakeFormationLocation = new lakeformation.CfnResource(this, "sourceLakeFormationLocation", {
            resourceArn: sourceDataBucket.bucketArn,
            roleArn: this.DataRegistration.DataSetGlueRole.roleArn,
            useServiceLinkedRole: true,
        });
        //TODO: Review it
        //super.grantGlueRoleLakeFormationPermissions(DataSetGlueRole, DataSetName);
        /* Add Lake Formation root Location s3 location & Glue permissions */
        this.grantDataLocationPermissions(this.DataRegistration.DataSetGlueRole, {
            Grantable: true,
            GrantResourcePrefix: `${DataSetName}SourcelocationGrant`,
            Location: sourceDataBucket.bucketName,
            LocationPrefix: "/"
        }, sourceLakeFormationLocation);
    }
}
exports.S3DatasetRegistration = S3DatasetRegistration;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiczMtZGF0YXNldC1yZWdpc3RyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzMy1kYXRhc2V0LXJlZ2lzdHJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx3Q0FBeUM7QUFJekMsK0VBQXlFO0FBQ3pFLDREQUE2RDtBQUM3RCwyRUFBc0U7QUFZdEU7O0dBRUc7QUFDSCxNQUFhLHFCQUFzQixTQUFRLHNEQUF3QjtJQUkvRCxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQStCO1FBQ3pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLGlFQUFpRTtRQUNqRSxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDO1FBRXRDLGlGQUFpRjtRQUNqRixNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFFdEUsSUFBSSxhQUFhLEdBQUcsSUFBSSxLQUFLLEVBQW9DLENBQUM7UUFDbEUsSUFBSSxzQkFBc0IsR0FBRyxJQUFJLEtBQUssRUFBb0MsQ0FBQztRQUMzRSxJQUFJLG1CQUFtQixHQUFHLElBQUksS0FBSyxFQUFvQyxDQUFDO1FBRXhFLCtDQUErQztRQUMvQyxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUM3QyxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUM7WUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixTQUFTLEVBQUUsQ0FBQyxnQkFBZ0IsS0FBSyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUMvRCxDQUFDLENBQUM7UUFFSCxpREFBaUQ7UUFDakQsY0FBYyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRS9DLHdFQUF3RTtRQUN4RSxNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxDQUFD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a0JBQWtCO1lBQzVDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyx1QkFBdUI7WUFDdEQsOEJBQThCLEVBQUUsS0FBSyxDQUFDLDhCQUE4QjtTQUN2RSxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUU3Qix5SEFBeUg7UUFFekgsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxxQ0FBcUMsQ0FBQyxlQUF5QixFQUFFLFdBQW1CLEVBQUUsZ0JBQTRCO1FBQzlHLG1FQUFtRTtRQUNuRSxNQUFNLDJCQUEyQixHQUFHLElBQUksYUFBYSxDQUFDLFdBQVcsQ0FDN0QsSUFBSSxFQUNKLDZCQUE2QixFQUM3QjtZQUNJLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTO1lBQ3ZDLE9BQU8sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLE9BQU87WUFDdEQsb0JBQW9CLEVBQUUsSUFBSTtTQUM3QixDQUNKLENBQUM7UUFFRixpQkFBaUI7UUFDakIsNEVBQTRFO1FBRTVFLHFFQUFxRTtRQUNyRSxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsRUFBRTtZQUNyRSxTQUFTLEVBQUUsSUFBSTtZQUNmLG1CQUFtQixFQUFFLEdBQUcsV0FBVyxxQkFBcUI7WUFDeEQsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFVBQVU7WUFDckMsY0FBYyxFQUFFLEdBQUc7U0FDdEIsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0lBRXBDLENBQUM7Q0FDSjtBQWpJRCxzREFpSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgaWFtID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWlhbScpO1xuaW1wb3J0IGdsdWUgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtZ2x1ZScpO1xuaW1wb3J0IHMzID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLXMzJyk7XG5cbmltcG9ydCB7IERhdGFMYWtlQ29uZlJlZ2lzdHJhdGlvbiB9IGZyb20gJy4vZGF0YS1sYWtlLWNvbmYtcmVnaXN0cmF0aW9uJztcbmltcG9ydCBsYWtlZm9ybWF0aW9uID0gcmVxdWlyZShcIkBhd3MtY2RrL2F3cy1sYWtlZm9ybWF0aW9uXCIpO1xuaW1wb3J0IHsgRGF0YXNldEdsdWVSZWdpc3RyYXRpb24gfSBmcm9tICcuL2RhdGFzZXQtZ2x1ZS1yZWdpc3RyYXRpb24nO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgUzNkYXRhU2V0RW5yb2xsbWVudFByb3BzIGV4dGVuZHMgRGF0YUxha2VDb25mUmVnaXN0cmF0aW9uLkRhdGFMYWtlQ29uZlByb3BzIHtcbiAgICBzb3VyY2VCdWNrZXQ6IHMzLklCdWNrZXQ7XG4gICAgc291cmNlQnVja2V0RGF0YVByZWZpeGVzOiBzdHJpbmdbXTtcbiAgICBtYXhEUFVzOiBudW1iZXI7XG4gICAgZGF0YWJhc2VMYW5kaW5nTmFtZTogc3RyaW5nO1xuICAgIGRhdGFiYXNlU3RhZ2luZ05hbWU6IHN0cmluZztcbiAgICBkYXRhYmFzZUdvbGROYW1lOiBzdHJpbmc7XG59XG5cbi8qKlxuICogR2VzdG9yIGRlIGxvcyBwZXJtaXNvcyBkZSBTMyBwYXJhIGVsIGRhdGFzZXRcbiAqL1xuZXhwb3J0IGNsYXNzIFMzRGF0YXNldFJlZ2lzdHJhdGlvbiBleHRlbmRzIERhdGFMYWtlQ29uZlJlZ2lzdHJhdGlvbiB7XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IHNvdXJjZUJ1Y2tldDogczMuSUJ1Y2tldDtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUzNkYXRhU2V0RW5yb2xsbWVudFByb3BzKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgICAgIC8qIFRoZSBkYXRhc2V0IG5hbWUgbXVzdCBiZSBtYXRjaCB3aXRoIHRoZSByb290IGxvY2F0aW9uIGluIHMzICovXG4gICAgICAgIGNvbnN0IGRhdGFTZXROYW1lID0gcHJvcHMuZGF0YVNldE5hbWU7XG5cbiAgICAgICAgLyogQWNjZXNzIFBvbGljeSB3aXRoIHBlcm1pc3Npb25zIGxpc3QgJiBnZXQgZm9yIGF0dGFjaCB0byBHbHVlIFJvbGUgKENyYXdsZXJzKSovXG4gICAgICAgIGNvbnN0IHMzQWNjZXNzUG9saWN5ID0gbmV3IGlhbS5Qb2xpY3kodGhpcywgJ2RhdGFTb3VyY2VBY2Nlc3NQb2xpY3knKTtcblxuICAgICAgICBsZXQgczNUYXJnZXRQYXRocyA9IG5ldyBBcnJheTxnbHVlLkNmbkNyYXdsZXIuUzNUYXJnZXRQcm9wZXJ0eT4oKTtcbiAgICAgICAgbGV0IHMzRGF0YUxha2VTdGFnaW5nUGF0aHMgPSBuZXcgQXJyYXk8Z2x1ZS5DZm5DcmF3bGVyLlMzVGFyZ2V0UHJvcGVydHk+KCk7XG4gICAgICAgIGxldCBzM0RhdGFMYWtlR29sZFBhdGhzID0gbmV3IEFycmF5PGdsdWUuQ2ZuQ3Jhd2xlci5TM1RhcmdldFByb3BlcnR5PigpO1xuXG4gICAgICAgIC8qIEFkZCBwZXJtaXNzaW9uIGZvciBsaXN0IHRoZSB0YXJnZXQgYnVja2V0ICovXG4gICAgICAgIGNvbnN0IGJ1Y2tldExpc3RQb2xpY3kgPSBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBhY3Rpb25zOiBbXCJzMzpMaXN0QnVja2V0XCJdLFxuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6czM6Ojoke3Byb3BzLnNvdXJjZUJ1Y2tldC5idWNrZXROYW1lfWBdXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qIERlcGxveSB0aGUgcG9saWN5IHRvIGxpc3QgdGhlIHRhcmdldCBidWNrZXQgKi9cbiAgICAgICAgczNBY2Nlc3NQb2xpY3kuYWRkU3RhdGVtZW50cyhidWNrZXRMaXN0UG9saWN5KTtcblxuICAgICAgICAvKiBBZGQgcGVybWlzc2lvbnMgZm9yIGdldCBvYmplY3RzIGluIGFsbCBsb2NhdGlvbnMgb2YgdGFyZ2V0IEJ1Y2tldCAgKi9cbiAgICAgICAgY29uc3QgcHJlZml4QWNjZXNzUG9saWN5ID0gbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgYWN0aW9uczogW1wiczM6R2V0T2JqZWN0XCJdLFxuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6czM6Ojoke3Byb3BzLnNvdXJjZUJ1Y2tldC5idWNrZXROYW1lfS8qYF1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyogRGVwbG95IHRoZSBwb2xpY3kgZm9yIGdldCBvYmplY3RzIGluIHRoZSB0YXJnZXQgQnVja2V0Ki9cbiAgICAgICAgczNBY2Nlc3NQb2xpY3kuYWRkU3RhdGVtZW50cyhwcmVmaXhBY2Nlc3NQb2xpY3kpO1xuXG4gICAgICAgIC8qIE9idGFpbiBhbGwgb3JpZ2luIHBhdGggZm9yIG5lZWRlZCBhcyBpbnB1dCBmb3IgR2x1ZSBFVEwgJiBDcmF3bGVycyAqL1xuICAgICAgICBmb3IobGV0IGJ1Y2tldFByZWZpeCBvZiBwcm9wcy5zb3VyY2VCdWNrZXREYXRhUHJlZml4ZXMpe1xuICAgICAgICAgICAgczNUYXJnZXRQYXRocy5wdXNoKHtcbiAgICAgICAgICAgICAgICBwYXRoOiBgczM6Ly8ke3Byb3BzLnNvdXJjZUJ1Y2tldC5idWNrZXROYW1lfSR7YnVja2V0UHJlZml4fWBcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgcHJlZml4Rm9sZGVycyA9IGJ1Y2tldFByZWZpeC5zcGxpdCgnLycpXG4gICAgICAgICAgICB2YXIgdGFibGVGb2xkZXJOYW1lID0gcHJlZml4Rm9sZGVyc1twcmVmaXhGb2xkZXJzLmxlbmd0aC0yXVxuICAgICAgICAgICAgdmFyIHRhYmxlRm9sZGVyTmFtZSA9IHRhYmxlRm9sZGVyTmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1xcLy9nLFwiX1wiKS5yZXBsYWNlKC8tL2csXCJfXCIpO1xuICAgICAgICAgICAgLyogSWYgaGFzIG1vcmUgY2hpbGQgZm9sZGVycyBpbnRvIGlucHV0IGZvbGRlciAqL1xuICAgICAgICAgICAgaWYocHJvcHMuc291cmNlQnVja2V0RGF0YVByZWZpeGVzLmxlbmd0aCA+IDEpe1xuICAgICAgICAgICAgICAgIC8qIFBhdGggZm9yIFN0YWdpbmcgZGF0YWJhc2UgRGF0YXNldHMgKi9cbiAgICAgICAgICAgICAgICBzM0RhdGFMYWtlU3RhZ2luZ1BhdGhzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiBgczM6Ly8ke3Byb3BzLmRhdGFMYWtlQnVja2V0LmJ1Y2tldE5hbWV9LyR7cHJvcHMuZGF0YWJhc2VTdGFnaW5nTmFtZX0vJHt0YWJsZUZvbGRlck5hbWV9L2BcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvKiBQYXRoIGZvciBHb2xkIGRhdGFiYXNlIERhdGFzZXRzICovXG4gICAgICAgICAgICAgICAgczNEYXRhTGFrZUdvbGRQYXRocy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogYHMzOi8vJHtwcm9wcy5kYXRhTGFrZUJ1Y2tldC5idWNrZXROYW1lfS8ke3Byb3BzLmRhdGFiYXNlR29sZE5hbWV9LyR7dGFibGVGb2xkZXJOYW1lfS9gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAvKiBQYXRocyBmb3IgU3RhZ2luZyBkYXRhYmFzZSBEYXRhc2V0cyAqL1xuICAgICAgICAgICAgICAgIHMzRGF0YUxha2VTdGFnaW5nUGF0aHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGBzMzovLyR7cHJvcHMuZGF0YUxha2VCdWNrZXQuYnVja2V0TmFtZX0vJHtwcm9wcy5kYXRhYmFzZVN0YWdpbmdOYW1lfS9gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLyogUGF0aHMgZm9yIEdvbGQgZGF0YWJhc2UgRGF0YXNldHMgKi9cbiAgICAgICAgICAgICAgICBzM0RhdGFMYWtlR29sZFBhdGhzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiBgczM6Ly8ke3Byb3BzLmRhdGFMYWtlQnVja2V0LmJ1Y2tldE5hbWV9LyR7cHJvcHMuZGF0YWJhc2VHb2xkTmFtZX0vYFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5EYXRhUmVnaXN0cmF0aW9uID0gbmV3IERhdGFzZXRHbHVlUmVnaXN0cmF0aW9uKHRoaXMsIGAke3Byb3BzLmRhdGFTZXROYW1lfS1zM0Vucm9sbG1lbnRgLCB7XG4gICAgICAgICAgICBkYXRhU2V0TmFtZTogcHJvcHMuZGF0YVNldE5hbWUsXG4gICAgICAgICAgICBkYXRhTGFrZUJ1Y2tldDogcHJvcHMuZGF0YUxha2VCdWNrZXQsXG4gICAgICAgICAgICBnb2xkRGF0YWJhc2VOYW1lOiBwcm9wcy5kYXRhYmFzZUdvbGROYW1lLFxuICAgICAgICAgICAgc3RhZ2luZ0RhdGFiYXNlTmFtZTogcHJvcHMuZGF0YWJhc2VTdGFnaW5nTmFtZSxcbiAgICAgICAgICAgIGxhbmRpbmdEYXRhYmFzZU5hbWU6IHByb3BzLmRhdGFiYXNlTGFuZGluZ05hbWUsXG4gICAgICAgICAgICBzb3VyY2VBY2Nlc3NQb2xpY3k6IHMzQWNjZXNzUG9saWN5LFxuICAgICAgICAgICAgZGF0YUxha2VMYW5kaW5nVGFyZ2V0czoge1xuICAgICAgICAgICAgICAgIHMzVGFyZ2V0czogczNUYXJnZXRQYXRocyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtYXhEUFVzOiBwcm9wcy5tYXhEUFVzLFxuICAgICAgICAgICAgZ2x1ZVN0YWdpbmdTY3JpcHRQYXRoOiBwcm9wcy5nbHVlU3RhZ2luZ1NjcmlwdFBhdGgsXG4gICAgICAgICAgICBkYXRhTGFrZVN0YWdpbmdUYXJnZXRzOiB7XG4gICAgICAgICAgICAgICAgczNUYXJnZXRzOiBzM0RhdGFMYWtlU3RhZ2luZ1BhdGhzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGF0YUxha2VHb2xkVGFyZ2V0czoge1xuICAgICAgICAgICAgICAgIHMzVGFyZ2V0czogczNEYXRhTGFrZUdvbGRQYXRoc1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdsdWVTdGFnaW5nU2NyaXB0QXJndW1lbnRzOiBwcm9wcy5nbHVlU3RhZ2luZ1NjcmlwdEFyZ3VtZW50cyxcbiAgICAgICAgICAgIGdsdWVHb2xkU2NyaXB0UGF0aDogcHJvcHMuZ2x1ZUdvbGRTY3JpcHRQYXRoLFxuICAgICAgICAgICAgZ2x1ZUdvbGRTY3JpcHRBcmd1bWVudHM6IHByb3BzLmdsdWVHb2xkU2NyaXB0QXJndW1lbnRzLFxuICAgICAgICAgICAgd29ya2Zsb3dDcm9uU2NoZWR1bGVFeHByZXNzaW9uOiBwcm9wcy53b3JrZmxvd0Nyb25TY2hlZHVsZUV4cHJlc3Npb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5jcmVhdGVDb2Fyc2VJYW1Qb2xpY3koKTtcblxuICAgICAgICAvL3RoaXMuc2V0dXBHbHVlUm9sZUxha2VGb3JtYXRpb25QZXJtaXNzaW9ucyh0aGlzLkRhdGFFbnJvbGxtZW50LkRhdGFTZXRHbHVlUm9sZSwgcHJvcHMuZGF0YVNldE5hbWUsIHByb3BzLnNvdXJjZUJ1Y2tldCk7XG5cbiAgICAgICAgdGhpcy5ncmFudENvYXJzZUlhbVJlYWQodGhpcy5EYXRhUmVnaXN0cmF0aW9uLkRhdGFTZXRHbHVlUm9sZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2l2ZXMgcGVybWlzc2lvbnMgdG8gYSBHbHVlIElBTSBSb2xlIGZvciB3b3JrIHdpdGggZGF0YXNldCBpbiB0aGUgdGFyZ2V0IEJ1Y2tldFxuICAgICAqIEBwYXJhbSBEYXRhU2V0R2x1ZVJvbGVcbiAgICAgKiBAcGFyYW0gRGF0YVNldE5hbWVcbiAgICAgKiBAcGFyYW0gc291cmNlRGF0YUJ1Y2tldFxuICAgICAqL1xuICAgIHNldHVwR2x1ZVJvbGVMYWtlRm9ybWF0aW9uUGVybWlzc2lvbnMoRGF0YVNldEdsdWVSb2xlOiBpYW0uUm9sZSwgRGF0YVNldE5hbWU6IHN0cmluZywgc291cmNlRGF0YUJ1Y2tldDogczMuSUJ1Y2tldCkge1xuICAgICAgICAvKiBBdHRhY2ggR2x1ZSBSb2xlIHRvIHVzZSBhIFMzIEJ1Y2tldCBtYW5hZ2VkIGJ5IExha2UgRm9ybWF0aW9uICovXG4gICAgICAgIGNvbnN0IHNvdXJjZUxha2VGb3JtYXRpb25Mb2NhdGlvbiA9IG5ldyBsYWtlZm9ybWF0aW9uLkNmblJlc291cmNlKFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIFwic291cmNlTGFrZUZvcm1hdGlvbkxvY2F0aW9uXCIsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmVzb3VyY2VBcm46IHNvdXJjZURhdGFCdWNrZXQuYnVja2V0QXJuLFxuICAgICAgICAgICAgICAgIHJvbGVBcm46IHRoaXMuRGF0YVJlZ2lzdHJhdGlvbi5EYXRhU2V0R2x1ZVJvbGUucm9sZUFybixcbiAgICAgICAgICAgICAgICB1c2VTZXJ2aWNlTGlua2VkUm9sZTogdHJ1ZSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAvL1RPRE86IFJldmlldyBpdFxuICAgICAgICAvL3N1cGVyLmdyYW50R2x1ZVJvbGVMYWtlRm9ybWF0aW9uUGVybWlzc2lvbnMoRGF0YVNldEdsdWVSb2xlLCBEYXRhU2V0TmFtZSk7XG5cbiAgICAgICAgLyogQWRkIExha2UgRm9ybWF0aW9uIHJvb3QgTG9jYXRpb24gczMgbG9jYXRpb24gJiBHbHVlIHBlcm1pc3Npb25zICovXG4gICAgICAgIHRoaXMuZ3JhbnREYXRhTG9jYXRpb25QZXJtaXNzaW9ucyh0aGlzLkRhdGFSZWdpc3RyYXRpb24uRGF0YVNldEdsdWVSb2xlLCB7XG4gICAgICAgICAgICBHcmFudGFibGU6IHRydWUsXG4gICAgICAgICAgICBHcmFudFJlc291cmNlUHJlZml4OiBgJHtEYXRhU2V0TmFtZX1Tb3VyY2Vsb2NhdGlvbkdyYW50YCxcbiAgICAgICAgICAgIExvY2F0aW9uOiBzb3VyY2VEYXRhQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgICAgICBMb2NhdGlvblByZWZpeDogXCIvXCJcbiAgICAgICAgfSwgc291cmNlTGFrZUZvcm1hdGlvbkxvY2F0aW9uKTtcblxuICAgIH1cbn0iXX0=