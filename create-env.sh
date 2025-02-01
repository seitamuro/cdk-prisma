#!/bin/bash

set -eu

STACK_NAME="CdkPrismaStack"

function extract_value {
  echo $1 | jq -r ".Stacks[0].Outputs[] | select(.OutputKey==\"$2\") | .OutputValue"
}

stack_output=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --output json)

SECRET_NAME=`extract_value "$stack_output" "SecretName"`
DATABASE_IP=`extract_value "$stack_output" "DbPublicIp"`

SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id $SECRET_NAME --output json)
USERNAME=`echo $SECRET_VALUE | jq -r ".SecretString | fromjson | .username"`
PASSWORD=`echo $SECRET_VALUE | jq -r ".SecretString | fromjson | .password"`

echo "DATABASE_URL=postgresql://$USERNAME:$PASSWORD@$DATABASE_IP:5432/mydb?schema=public" > .env