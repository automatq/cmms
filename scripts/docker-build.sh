#!/bin/bash

# Docker Build and Push Script for Nexly
# Usage: ./scripts/docker-build.sh [registry_url] [tag]
# Example: ./scripts/docker-build.sh registry.example.com/nexly v1.0.0

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
echo "Building Nexly Docker Images"
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo "========================================="

# Build API image
echo ""
echo "Building API image..."
docker build -t $REGISTRY/nexly-api:$TAG -f apps/api/Dockerfile apps/api/
docker tag $REGISTRY/nexly-api:$TAG $REGISTRY/nexly-api:latest

# Build Worker image
echo ""
echo "Building Worker image..."
docker build -t $REGISTRY/nexly-worker:$TAG -f apps/api/Dockerfile.worker apps/api/
docker tag $REGISTRY/nexly-worker:$TAG $REGISTRY/nexly-worker:latest

# Build Web image
echo ""
echo "Building Web image..."
docker build -t $REGISTRY/nexly-web:$TAG -f apps/web/Dockerfile apps/web/
docker tag $REGISTRY/nexly-web:$TAG $REGISTRY/nexly-web:latest

echo ""
echo "========================================="
echo "Build completed successfully!"
echo "========================================="
echo ""
echo "Images built:"
echo "  - $REGISTRY/nexly-api:$TAG"
echo "  - $REGISTRY/nexly-worker:$TAG"
echo "  - $REGISTRY/nexly-web:$TAG"
echo ""
echo "To push images to registry, run:"
echo "  ./scripts/docker-push.sh $REGISTRY $TAG"
