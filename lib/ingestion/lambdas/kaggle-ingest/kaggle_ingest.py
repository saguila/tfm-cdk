import json
from kaggle.api.kaggle_api_extended import KaggleApi

#https://technowhisp.com/kaggle-api-python-documentation/
#https://github.com/Kaggle/kaggle-api/blob/master/KaggleSwagger.yaml
api = KaggleApi()
api.authenticate()

def handler_request(event, context):

    return {"statusCode": 200,"body": json.dumps({"status": 200, "output": "okay"})}

