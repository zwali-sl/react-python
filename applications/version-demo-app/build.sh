#!/bin/bash -e

# Script to build and push docker image to ECR

ENV="${environment:-dev}"
NAME=version-demo-app-${ENV}
VERSION=latest
AWS_ACCOUNT=355210632881
REGION=eu-west-2
ECR_HOSTNAME="${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_HOSTNAME

cd ../ && docker build -t ${NAME} -f ./version-demo-app/Dockerfile ./ 
docker tag ${NAME}:${VERSION} ${ECR_HOSTNAME}/${NAME}:${VERSION}
docker push ${ECR_HOSTNAME}/${NAME}:${VERSION}