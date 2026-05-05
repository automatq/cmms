#!/bin/bash

# Docker Build and Push Script for MainTek
# Usage: ./scripts/docker-build.sh [registry_url] [tag]
# Example: ./scripts/docker-build.sh registry.example.com/maintek v1.0.0

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
echo "Building MainTek Docker Images"
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo "========================================="

# Build API image
echo ""
echo "Building API image..."
docker build -t $REGISTRY/maintek-api:$TAG -f apps/api/Dockerfile apps/api/
docker tag $REGISTRY/maintek-api:$TAG $REGISTRY/maintek-api:latest

# Build Worker image
echo ""
echo "Building Worker image..."
docker build -t $REGISTRY/maintek-worker:$TAG -f apps/api/Dockerfile.worker apps/api/
docker tag $REGISTRY/maintek-worker:$TAG $REGISTRY/maintek-worker:latest

# Build Web image
echo ""
echo "Building Web image..."
docker build -t $REGISTRY/maintek-web:$TAG -f apps/web/Dockerfile apps/web/
docker tag $REGISTRY/maintek-web:$TAG $REGISTRY/maintek-web:latest

echo ""
echo "========================================="
echo "Build completed successfully!"
echo "========================================="
echo ""
echo "Images built:"
echo "  - $REGISTRY/maintek-api:$TAG"
echo "  - $REGISTRY/maintek-worker:$TAG"
echo "  - $REGISTRY/maintek-web:$TAG"
echo ""
echo "To push images to registry, run:"
echo "  ./scripts/docker-push.sh $REGISTRY $TAG"
