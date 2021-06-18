if [ "$#" -ne 2 ]; then
        echo "Usage: $0 <role> <region>"
        exit 1
fi

#Default Variables
AWS_CREDENTIAL_PATH=~/.aws_glue

#Parameters
ASSUME_ROLE_ARN=$1
REGION=$2

OUT=`aws sts assume-role --role-arn $ASSUME_ROLE_ARN --role-session-name glue_role_temp --duration-seconds 3600 --query Credentials --profile mios`
export AWS_ACCESS_KEY_ID=`awk '/AccessKeyId/ {gsub("\"", "", $2); print $2}' <<< "$OUT" | sed -e 's/,//g'`
export AWS_SECRET_ACCESS_KEY=`awk '/SecretAccessKey/ {gsub("\"", "", $2); print $2}' <<< "$OUT" | sed -e 's/,//g'`
export AWS_SESSION_TOKEN=`awk '/SessionToken/ {gsub("\"", "", $2); print $2}' <<< "$OUT" | sed -e 's/,//g'`
  
mkdir $AWS_CREDENTIAL_PATH
echo -e "[default]\noutput = json\nregion = ${REGION}" > $AWS_CREDENTIAL_PATH/config
echo -e "[default]\naws_access_key_id = ${AWS_ACCESS_KEY_ID}\naws_secret_access_key = ${AWS_SECRET_ACCESS_KEY}\naws_session_token = ${AWS_SESSION_TOKEN}" > $AWS_CREDENTIAL_PATH/credentials
