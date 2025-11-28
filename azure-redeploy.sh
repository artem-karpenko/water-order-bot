#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Loaded environment variables from .env"
else
    echo "⚠️  Warning: .env file not found"
fi

# Azure Container Instance configuration
CONTAINER_NAME="water-order-bot"
RESOURCE_GROUP=${1:-"yozh"}
REGISTRY="yozhdev.azurecr.io"
REGISTRY_USERNAME="yozhdev"

# Check for required environment variables
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN not set in .env file"
    exit 1
fi

if [ -z "$AZURE_REGISTRY_PASSWORD" ]; then
    echo "❌ Error: AZURE_REGISTRY_PASSWORD not set in .env file"
    exit 1
fi

echo "========================================="
echo "Azure Container Instance Redeployment"
echo "========================================="
echo "Container: ${CONTAINER_NAME}"
echo "Resource Group: ${RESOURCE_GROUP}"
echo "Registry: ${REGISTRY}"
echo "========================================="

# Check if container exists
echo ""
echo "Step 1: Checking if container exists..."
if az container show --name ${CONTAINER_NAME} --resource-group ${RESOURCE_GROUP} &> /dev/null; then
    echo "✅ Container found"

    # Delete existing container
    echo ""
    echo "Step 2: Deleting existing container..."
    az container delete \
        --name ${CONTAINER_NAME} \
        --resource-group ${RESOURCE_GROUP} \
        --yes

    if [ $? -ne 0 ]; then
        echo "❌ Failed to delete container!"
        exit 1
    fi

    echo "✅ Container deleted successfully"

    # Wait a moment for Azure to clean up
    echo ""
    echo "Waiting for cleanup..."
    sleep 5
else
    echo "ℹ️  Container does not exist, will create new one"
fi

# Create new container
echo ""
echo "Step 3: Creating new container instance..."

# Set default values for optional environment variables
WHITELISTED_USER_IDS=${WHITELISTED_USER_IDS:-""}

# Create temporary YAML with substituted values
TEMP_YAML="azure-deploy.temp.yaml"
sed -e "s/REGISTRY_PASSWORD_PLACEHOLDER/${AZURE_REGISTRY_PASSWORD}/g" \
    -e "s/BOT_TOKEN_PLACEHOLDER/${TELEGRAM_BOT_TOKEN}/g" \
    -e "s/WHITELISTED_USER_IDS_PLACEHOLDER/${WHITELISTED_USER_IDS}/g" \
    azure-deploy.yaml > ${TEMP_YAML}

echo "Running: az container create --resource-group ${RESOURCE_GROUP} --file ${TEMP_YAML}"
az container create \
    --resource-group ${RESOURCE_GROUP} \
    --file ${TEMP_YAML}

# Clean up temp file
rm -f ${TEMP_YAML}

if [ $? -ne 0 ]; then
    echo "❌ Failed to create container!"
    exit 1
fi

echo "✅ Container created successfully"

# Get container details
echo ""
echo "Step 4: Getting container details..."
az container show \
    --name ${CONTAINER_NAME} \
    --resource-group ${RESOURCE_GROUP} \
    --query "{FQDN:ipAddress.fqdn,IP:ipAddress.ip,State:instanceView.state,CPU:containers[0].resources.requests.cpu,Memory:containers[0].resources.requests.memoryInGb}" \
    --output table

echo ""
echo "========================================="
echo "✅ Redeployment complete!"
echo "========================================="

# Show how to view logs
echo ""
echo "To view logs, run:"
echo "  az container logs --name ${CONTAINER_NAME} --resource-group ${RESOURCE_GROUP}"
echo ""
echo "To follow logs, run:"
echo "  az container logs --name ${CONTAINER_NAME} --resource-group ${RESOURCE_GROUP} --follow"
echo ""
echo "To check status, run:"
echo "  az container show --name ${CONTAINER_NAME} --resource-group ${RESOURCE_GROUP}"
