#!/bin/bash

# Docker Push Script for CMMS
# Usage: ./scripts/docker-push.sh [registry_url] [tag]
# Example: ./scripts/docker-push.sh registry.example.com/cmms v1.0.0

set -e

REGISTRY=${1:-""}
TAG=${2:-"latest"}

if [ -z "$REGISTRY" ]; then
  echo "Error: Registry URL is required"
  echo "Usage: $0 <registry_url> [tag]"
  echo "Example: $0 registry.example.com/cmms v1.0.0"
  exit 1
fi

echo "========================================="
echo "Pushing CMMS Docker Images"
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo "========================================="

# Login to registry (if needed)
echo ""
read -p "Have you already logged in to the Docker registry? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Please login first: docker login $REGISTRY"
  exit 1
fi

# Push API image
echo ""
echo "Pushing API image..."
docker push $REGISTRY/cmms-api:$TAG
docker push $REGISTRY/cmms-api:latest

# Push Worker image
echo ""
echo "Pushing Worker image..."
docker push $REGISTRY/cmms-worker:$TAG
docker push $REGISTRY/cmms-worker:latest

# Push Web image
echo ""
echo "Pushing Web image..."
docker push $REGISTRY/cmms-web:$TAG
docker push $REGISTRY/cmms-web:latest

echo ""
echo "========================================="
echo "Push completed successfully!"
echo "========================================="
echo ""
echo "Images pushed:"
echo "  - $REGISTRY/cmms-api:$TAG"
echo "  - $REGISTRY/cmms-worker:$TAG"
echo "  - $REGISTRY/cmms-web:$TAG"
