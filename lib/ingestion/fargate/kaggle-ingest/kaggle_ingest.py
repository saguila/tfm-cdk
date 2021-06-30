import boto3
import os
import shutil

#Initialize AWS Clients
s3 = boto3.client('s3')
ssm = boto3.client('ssm')

#Getting secrets needed for initialize API
os.environ['KAGGLE_USERNAME'] = ssm.get_parameter(Name=os.environ['SSM_REF_KAGGLE_USER'], WithDecryption=True)['Parameter']['Value']
os.environ['KAGGLE_KEY'] = ssm.get_parameter(Name=os.environ['SSM_REF_KAGGLE_KEY'], WithDecryption=True)['Parameter']['Value']

# Initialize API
from kaggle.api.kaggle_api_extended import KaggleApi
api = KaggleApi()
api.authenticate()yarn cdk deploy tfm-ingest-fargate-stack -c kaggleUser=sebastial -c datasetName=cycle_share_dataset -c kaggleKey=fa9b62c6513da5754f1c238dc465fb9 -c awsAccount=arn:aws:iam::394341365917:user/sebas -c dataSetName=cycle -c landingDatabaseName=landing -c stagingDatabaseName=staging -c goldDatabaseName=gold -c dataLakeBucketName=tfm-data-lake

# Getting variables
temp_path = "./tmp_dir"
dataset = os.environ['KAGGLE_DATASET']
bucket_name = os.environ['S3_BUCKET']
s3_output_path = os.environ['S3_INGEST_DIR']

def main():
    try:
        if os.path.exists(temp_path):
            delete_temp_dir()
        os.mkdir(temp_path)
    except OSError:
        print ("Creation of the directory %s failed" % temp_path)
    else:
        print ("Successfully created the directory %s " % temp_path)
        print ("Downloading dataset %s ..." % dataset)
        api.dataset_download_files(dataset, unzip=True, path=temp_path)
        for filename in os.listdir(temp_path):
            local_file = "%s/%s" % (temp_path , filename)
            filename_without_extension = filename.rsplit('.', 1)[0]
            s3_output_file = "%s/%s/%s" % (s3_output_path , filename_without_extension,filename)
            print("Uploading %s in s3://%s/%s" % (local_file,bucket_name,s3_output_file))
            s3.upload_file(local_file,bucket_name,s3_output_file)
        delete_temp_dir()


def delete_temp_dir():
    try:
        shutil.rmtree(temp_path)
    except OSError:
        print ("Deletion of the directory %s failed" % temp_path)
    else:
        print ("Successfully deleted the directory %s" % temp_path)

main()

