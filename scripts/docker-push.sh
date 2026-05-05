#!/bin/bash

# Docker Push Script for MainTek
# Usage: ./scripts/docker-push.sh [registry_url] [tag]
# Example: ./scripts/docker-push.sh registry.example.com/maintek v1.0.0

set -e

REGISTRY=${1:-""}
TAG=${2:-"latest"}

if [ -z "$REGISTRY" ]; then
  echo "Error: Registry URL is required"
  echo "Usage: $0 <registry_url> [tag]"
  echo "Example: $0 registry.example.com/maintek v1.0.0"
  exit 1
fi

echo "========================================="
echo "Pushing MainTek Docker Images"
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
docker push $REGISTRY/maintek-api:$TAG
docker push $REGISTRY/maintek-api:latest

# Push Worker image
echo ""
echo "Pushing Worker image..."
docker push $REGISTRY/maintek-worker:$TAG
docker push $REGISTRY/maintek-worker:latest

# Push Web image
echo ""
echo "Pushing Web image..."
docker push $REGISTRY/maintek-web:$TAG
docker push $REGISTRY/maintek-web:latest

echo ""
echo "========================================="
echo "Push completed successfully!"
echo "========================================="
echo ""
echo "Images pushed:"
echo "  - $REGISTRY/maintek-api:$TAG"
echo "  - $REGISTRY/maintek-worker:$TAG"
echo "  - $REGISTRY/maintek-web:$TAG"
