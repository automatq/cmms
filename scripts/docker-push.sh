#!/bin/bash

# Docker Push Script for Nexly
# Usage: ./scripts/docker-push.sh [registry_url] [tag]
# Example: ./scripts/docker-push.sh registry.example.com/nexly v1.0.0

set -e

REGISTRY=${1:-""}
TAG=${2:-"latest"}

if [ -z "$REGISTRY" ]; then
  echo "Error: Registry URL is required"
  echo "Usage: $0 <registry_url> [tag]"
  echo "Example: $0 registry.example.com/nexly v1.0.0"
  exit 1
fi

echo "========================================="
echo "Pushing Nexly Docker Images"
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
docker push $REGISTRY/nexly-api:$TAG
docker push $REGISTRY/nexly-api:latest

# Push Worker image
echo ""
echo "Pushing Worker image..."
docker push $REGISTRY/nexly-worker:$TAG
docker push $REGISTRY/nexly-worker:latest

# Push Web image
echo ""
echo "Pushing Web image..."
docker push $REGISTRY/nexly-web:$TAG
docker push $REGISTRY/nexly-web:latest

echo ""
echo "========================================="
echo "Push completed successfully!"
echo "========================================="
echo ""
echo "Images pushed:"
echo "  - $REGISTRY/nexly-api:$TAG"
echo "  - $REGISTRY/nexly-worker:$TAG"
echo "  - $REGISTRY/nexly-web:$TAG"
