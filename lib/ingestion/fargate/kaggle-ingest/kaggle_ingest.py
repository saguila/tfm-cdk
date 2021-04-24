from kaggle.api.kaggle_api_extended import KaggleApi
import boto3
import os
import shutil

#Initialize s3 client
s3 = boto3.client('s3')
# Initialize API
api = KaggleApi()
# USES ENV 'KAGGLE_USERNAME' & 'KAGGLE_KEY'
api.authenticate()

# Getting variables
temp_path = "./tmp_dir"
dataset = os.environ['KAGGLE_DATASET'] #"pronto/cycle-share-dataset"
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

