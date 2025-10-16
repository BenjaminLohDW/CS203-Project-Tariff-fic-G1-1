#!/bin/bash
set -e


echo "Creating imagedefinitions-${SERVICE}.json"
printf '[{"name":"%s","imageUri":"%s"}]\n' "$SERVICE" "$ECR_REPO:${SERVICE}-${IMAGE_TAG}" > imagedefinitions-${SERVICE}.json
cat imagedefinitions-${SERVICE}.json

echo "Build completed"