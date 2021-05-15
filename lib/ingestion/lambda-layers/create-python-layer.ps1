if( !($args.Count -eq 3) )
{
   Write-Host "Usage: $0 <path-to-install> <python-version | 3.8 3.7 3.6 ..> <zip output name>"
   exit 1
}

$INSTALLATION_DIR=$args[0]
$PYTHON_VER=$args[1]
$LAYER_ZIP_NAME=$args[2]
$ORIGIN_DIR=Get-Location

# Example of execution sh create-python-layer.sh ./kaggle/ 3.8 kaggle-layer


Set-Location $INSTALLATION_DIR
#https://aws.amazon.com/es/premiumsupport/knowledge-center/lambda-layer-simulated-docker/
docker run -v ${pwd}:/var/task "public.ecr.aws/sam/build-python$PYTHON_VER" /bin/sh -c "pip install -r requirements.txt -t python/lib/python$PYTHON_VER/site-packages/; exit"
Compress-Archive -Path python -DestinationPath ${LAYER_ZIP_NAME}.zip
Remove-Item python -Recurse -Force
Set-Location $ORIGIN_DIR
