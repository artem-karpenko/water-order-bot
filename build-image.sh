#!/bin/bash

# Build Docker image locally without pushing to registry
# Usage: ./build-image.sh [tag]
# Example: ./build-image.sh v1.0.0

IMAGE_NAME="water-order-bot"
TAG=${1:-"latest"}

echo "========================================="
echo "Building Docker Image Locally"
echo "========================================="
echo "Image: ${IMAGE_NAME}"
echo "Tag: ${TAG}"
echo "========================================="
echo ""

# Build the Docker image
echo "Building Docker image..."
docker build -t ${IMAGE_NAME}:${TAG} .

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ Build complete!"
echo "========================================="
echo ""
echo "Image built: ${IMAGE_NAME}:${TAG}"
echo ""
echo "To run the image locally:"
echo "  docker run --env-file .env -p 3000:3000 ${IMAGE_NAME}:${TAG}"
echo ""
echo "To view images:"
echo "  docker images ${IMAGE_NAME}"
echo ""
