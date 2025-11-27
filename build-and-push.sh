#!/bin/bash

# Azure Container Registry configuration
REGISTRY="yozhdev.azurecr.io"
IMAGE_NAME="water-order-bot"

# Get version from argument or use 'latest'
VERSION=${1:-latest}

# Full image name with registry
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${VERSION}"

echo "========================================="
echo "Building and pushing Docker image"
echo "========================================="
echo "Registry: ${REGISTRY}"
echo "Image: ${IMAGE_NAME}"
echo "Version: ${VERSION}"
echo "Full name: ${FULL_IMAGE_NAME}"
echo "========================================="

# Build the Docker image
echo ""
echo "Step 1: Building Docker image..."
docker build -t ${IMAGE_NAME}:${VERSION} .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker build successful!"

# Tag the image for Azure Container Registry
echo ""
echo "Step 2: Tagging image for Azure Container Registry..."
docker tag ${IMAGE_NAME}:${VERSION} ${FULL_IMAGE_NAME}

if [ $? -ne 0 ]; then
    echo "❌ Docker tag failed!"
    exit 1
fi

echo "✅ Image tagged successfully!"

# Push to Azure Container Registry
echo ""
echo "Step 3: Pushing image to Azure Container Registry..."
echo "Note: Make sure you're logged in with 'az acr login --name yozhdev'"
docker push ${FULL_IMAGE_NAME}

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed!"
    echo "💡 Make sure you're logged in: az acr login --name yozhdev"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ Successfully pushed image!"
echo "Image: ${FULL_IMAGE_NAME}"
echo "========================================="
echo ""
echo "To deploy this image, use:"
echo "  ${FULL_IMAGE_NAME}"
