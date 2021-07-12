#!/bin/bash
# Example execution bash deploy.sh sebastial e4f95465846ef916b2d97bef6992790\tres\ cycle arn:aws:iam::3/nueve/4341365917:user/sebas landing staging gold tfm-data-lake pronto/cycle-share-dataset

if [ "$#" -ne 9 ]; then
        echo "Usage: $0 <kaggleUser> <kaggleKey> <dataSetName> <awsPrincipal> <landingDatabase> <stagingDatabase> <goldDatabase> <s3Bucket> <kaggleDataset>"
        exit 1
fi

KAGGLE_USER=$1
KAGGLE_KEY=$2
DATASET_NAME=$3
AWS_ACCOUNT_PRINCIPAL=$4
LANDING_DATABASE=$5
STAGING_DATABASE=$6
GOLD_DATABASE=$7
S3_BUCKET_NAME=$8
KAGGLE_DATASET=$9


cdk bootstrap -c kaggleUser="$KAGGLE_USER" -c kaggleKey="$KAGGLE_KEY" -c awsAccount="$AWS_ACCOUNT_PRINCIPAL" -c dataSetName="$DATASET_NAME" -c landingDatabaseName="$LANDING_DATABASE" -c stagingDatabaseName="$STAGING_DATABASE" -c goldDatabaseName="$GOLD_DATABASE" -c dataLakeBucketName="$S3_BUCKET_NAME"
yarn cdk deploy tfm-ingest-fargate-stack -c kaggleUser="$KAGGLE_USER" -c kaggleKey="$KAGGLE_KEY" -c awsAccount="$AWS_ACCOUNT_PRINCIPAL" -c dataSetName="$DATASET_NAME" -c landingDatabaseName="$LANDING_DATABASE" -c stagingDatabaseName="$STAGING_DATABASE" -c goldDatabaseName="$GOLD_DATABASE" -c dataLakeBucketName="$S3_BUCKET_NAME" --parameters kaggleDataset="$KAGGLE_DATASET" --parameters tfm-ingest-fargate-stack:s3BucketOuput="$S3_BUCKET_NAME" --parameters tfm-ingest-fargate-stack:s3IngestDir="$LANDING_DATABASE" --require-approval never
yarn cdk deploy lake-formation-stack -c kaggleUser="$KAGGLE_USER" -c kaggleKey="$KAGGLE_KEY" -c awsAccount="$AWS_ACCOUNT_PRINCIPAL" -c dataSetName="$DATASET_NAME" -c landingDatabaseName="$LANDING_DATABASE" -c stagingDatabaseName="$STAGING_DATABASE" -c goldDatabaseName="$GOLD_DATABASE" -c dataLakeBucketName="$S3_BUCKET_NAME" --parameters lake-formation-stack:principalArn="$AWS_ACCOUNT_PRINCIPAL" --parameters lake-formation-stack:s3BucketOuput="$S3_BUCKET_NAME" --require-approval never
yarn cdk deploy kaggle-datalake-register-stack -c kaggleUser="$KAGGLE_USER" -c kaggleKey="$KAGGLE_KEY" -c awsAccount="$AWS_ACCOUNT_PRINCIPAL" -c dataSetName="$DATASET_NAME" -c landingDatabaseName="$LANDING_DATABASE" -c stagingDatabaseName="$STAGING_DATABASE" -c goldDatabaseName="$GOLD_DATABASE" -c dataLakeBucketName="$S3_BUCKET_NAME" --require-approval never
yarn cdk deploy users-lake-formation-stack -c kaggleUser="$KAGGLE_USER" -c kaggleKey="$KAGGLE_KEY" -c awsAccount="$AWS_ACCOUNT_PRINCIPAL" -c dataSetName="$DATASET_NAME" -c landingDatabaseName="$LANDING_DATABASE" -c stagingDatabaseName="$STAGING_DATABASE" -c goldDatabaseName="$GOLD_DATABASE" -c dataLakeBucketName="$S3_BUCKET_NAME" --require-approval never