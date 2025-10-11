#!/bin/bash
set -e

for svc in $SERVICES; do
  echo "========================================="
  echo "Building service: $svc"
  echo "========================================="
  
  if [ ! -d "./$svc" ]; then
    echo "ERROR: Directory ./$svc not found!"
    ls -la ./
    exit 1
  fi
  
  if [ ! -f "./$svc/Dockerfile" ]; then
    echo "ERROR: Dockerfile not found in ./$svc/"
    exit 1
  fi
  
  echo "Building Docker image: $ECR_REPO:${svc}-${IMAGE_TAG}"
  docker build -t $ECR_REPO:${svc}-${IMAGE_TAG} ./${svc}
  
  echo "Pushing image to ECR..."
  docker push $ECR_REPO:${svc}-${IMAGE_TAG}
  
  echo "Successfully built and pushed $svc"
done