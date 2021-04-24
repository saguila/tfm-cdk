#!/bin/bash
# Example of execution sh create-python-layer.sh ./kaggle/ 3.8 kaggle-layer

if [ "$#" -ne 3 ]; then
        echo "Usage: $0 <path-to-install> <python-version | 3.8 3.7 3.6 ..> <zip output name>"
        exit 1
fi

INSTALLATION_DIR=$1
PYTHON_VER=$2
LAYER_ZIP_NAME=$3
ORIGIN_DIR=$PWD

cd $INSTALLATION_DIR
#https://aws.amazon.com/es/premiumsupport/knowledge-center/lambda-layer-simulated-docker/
docker run -v "$PWD":/var/task "public.ecr.aws/sam/build-python${PYTHON_VER}" /bin/sh -c "pip install -r requirements.txt -t python/lib/python${PYTHON_VER}/site-packages/; exit"
zip -r ${LAYER_ZIP_NAME}.zip python > /dev/null
sudo rm -rf python #Is necessary root permissions.
cd $ORIGIN_DIR
