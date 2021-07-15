#!/bin/bash
# Example execution bash start-glue-workflow.sh cycle_Workflow us-east-1

if [ "$#" -ne 2 ]; then
        echo "Usage: $0 <worflow-name> <region>"
        exit 1
fi

#Parameters
WORKFLOW_NAME=$1
REGION=$2

aws glue start-workflow-run --name "$WORKFLOW_NAME" --region "$REGION"