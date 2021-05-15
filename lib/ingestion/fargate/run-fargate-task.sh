#!/bin/bash
# Example of execution bash run-fargate-task.sh tfm-ingest-fargate-stack-Fargate001516A4-OJPUndHoNZri tfmingestfargatestackkaggleIngestTaskDefE4A66CC5:6 "awsvpcConfiguration={subnets=[subnet-084b9227cbce89689],securityGroups=[sg-0d7570c1fc2b457ec],assignPublicIp=ENABLED}"

if [ "$#" -ne 3 ]; then
        echo "Usage: $0 <ecs-cluster> <ecs-task-definition> <ecs-network-configuration = awsvpcConfiguration={subnets=[string,string],securityGroups=[string,string],assignPublicIp=DISABLED/ENABLED}>"
        exit 1
fi

ECS_CLUSTER=$1
TASK_DEFINITION=$2
NET_CONF=$3

echo Launching task "$TASK_DEFINITION" in ECS Cluster "$ECS_CLUSTER" with network configuration "$NET_CONF"
if ! aws ecs run-task \
 --capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=1 \
 --cluster "$ECS_CLUSTER" \
 --task-definition "$TASK_DEFINITION" \
 --network-configuration "$NET_CONF"
then
  echo "Launch Fail"
  exit 1
fi
 echo "Done"