#!/bin/bash
set -e

for svc in $SERVICES; do
  echo "Creating imagedefinitions-${svc}.json"
  printf '[{"name":"%s","imageUri":"%s"}]\n' "$svc" "$ECR_REPO:${svc}-${IMAGE_TAG}" > imagedefinitions-${svc}.json
  cat imagedefinitions-${svc}.json
done

echo "Build completed"