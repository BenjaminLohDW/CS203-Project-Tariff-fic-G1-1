#!/bin/bash
set -e

echo "========================================="
echo "Building service: ${SERVICE}"
echo "========================================="

if [ ! -d "./${SERVICE}" ]; then
echo "ERROR: Directory ./${SERVICE} not found!"
ls -la ./
exit 1
fi

if [ ! -f "./${SERVICE}/Dockerfile" ]; then
echo "ERROR: Dockerfile not found in ./${SERVICE}/"
exit 1
fi

echo "Building Docker image: $ECR_REPO:${SERVICE}-${IMAGE_TAG}"
docker build -t $ECR_REPO:${SERVICE}-${IMAGE_TAG} ./${SERVICE}

echo "Pushing image to ECR..."
docker push $ECR_REPO:${SERVICE}-${IMAGE_TAG}

echo "Successfully built and pushed ${SERVICE}"
