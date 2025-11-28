#!/bin/bash

# Complete deployment script: build, push, and redeploy
# Usage: ./deploy.sh [version-tag] [resource-group]

VERSION=${1:-latest}
RESOURCE_GROUP=${2:-yozh}

echo "========================================"
echo "Complete Deployment Pipeline"
echo "========================================"
echo "Version: $VERSION"
echo "Resource Group: $RESOURCE_GROUP"
echo "========================================"
echo ""

# Step 1: Build and push Docker image
echo "Step 1: Building and pushing Docker image..."
./build-and-push.sh $VERSION

if [ $? -ne 0 ]; then
    echo "❌ Build and push failed!"
    exit 1
fi

echo ""
echo "Step 2: Redeploying to Azure..."
./azure-redeploy.sh $RESOURCE_GROUP

if [ $? -ne 0 ]; then
    echo "❌ Redeploy failed!"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ Deployment completed successfully!"
echo "========================================"
