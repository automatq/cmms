#!/bin/bash

# Docker Build and Push Script for CMMS
# Usage: ./scripts/docker-build.sh [registry_url] [tag]
# Example: ./scripts/docker-build.sh registry.example.com/cmms v1.0.0

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
echo "Building CMMS Docker Images"
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo "========================================="

# Build API image
echo ""
echo "Building API image..."
docker build -t $REGISTRY/cmms-api:$TAG -f apps/api/Dockerfile apps/api/
docker tag $REGISTRY/cmms-api:$TAG $REGISTRY/cmms-api:latest

# Build Worker image
echo ""
echo "Building Worker image..."
docker build -t $REGISTRY/cmms-worker:$TAG -f apps/api/Dockerfile.worker apps/api/
docker tag $REGISTRY/cmms-worker:$TAG $REGISTRY/cmms-worker:latest

# Build Web image
echo ""
echo "Building Web image..."
docker build -t $REGISTRY/cmms-web:$TAG -f apps/web/Dockerfile apps/web/
docker tag $REGISTRY/cmms-web:$TAG $REGISTRY/cmms-web:latest

echo ""
echo "========================================="
echo "Build completed successfully!"
echo "========================================="
echo ""
echo "Images built:"
echo "  - $REGISTRY/cmms-api:$TAG"
echo "  - $REGISTRY/cmms-worker:$TAG"
echo "  - $REGISTRY/cmms-web:$TAG"
echo ""
echo "To push images to registry, run:"
echo "  ./scripts/docker-push.sh $REGISTRY $TAG"
