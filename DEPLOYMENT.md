# Azure Deployment Guide

This guide explains how to deploy the Water Order Bot to Azure using the included build scripts.

## Prerequisites

1. **Azure CLI** - Install from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
2. **Docker Desktop** - Make sure it's running
3. **Azure Container Registry Access** - You need access to `yozhdev.azurecr.io`

## First-Time Setup

### 1. Login to Azure

```bash
az login
```

### 2. Login to Azure Container Registry

```bash
az acr login --name yozhdev
```

You should see: `Login Succeeded`

## Building and Pushing Images

### Using Bash (Linux/Mac/Git Bash)

```bash
# Build and push with a specific version tag
./build-and-push.sh v1.0.0

# Build and push as 'latest' (default)
./build-and-push.sh
```

### Using PowerShell (Windows)

```powershell
# Build and push with a specific version tag
.\build-and-push.ps1 v1.0.0

# Build and push as 'latest' (default)
.\build-and-push.ps1
```

## What the Scripts Do

1. **Build** - Compiles TypeScript and creates a Docker image
2. **Tag** - Tags the image with your Azure Container Registry URL
3. **Push** - Uploads the image to `yozhdev.azurecr.io/water-order-bot`

## Versioning Strategy

Use semantic versioning for your releases:

- `v1.0.0` - Major release
- `v1.1.0` - Minor release (new features)
- `v1.0.1` - Patch release (bug fixes)
- `latest` - Always points to the most recent build

## Deploying to Azure Container Instances

Once your image is pushed, you can deploy it:

```bash
# Create a container instance
az container create \
  --resource-group your-resource-group \
  --name water-order-bot \
  --image yozhdev.azurecr.io/water-order-bot:latest \
  --registry-login-server yozhdev.azurecr.io \
  --registry-username yozhdev \
  --registry-password <your-password> \
  --dns-name-label water-order-bot \
  --ports 3000 \
  --environment-variables TELEGRAM_BOT_TOKEN=your_token_here PORT=3000
```

## Deploying to Azure App Service

```bash
# Create App Service plan
az appservice plan create \
  --name water-order-bot-plan \
  --resource-group your-resource-group \
  --is-linux \
  --sku B1

# Create web app
az webapp create \
  --resource-group your-resource-group \
  --plan water-order-bot-plan \
  --name water-order-bot \
  --deployment-container-image-name yozhdev.azurecr.io/water-order-bot:latest

# Configure container registry credentials
az webapp config container set \
  --name water-order-bot \
  --resource-group your-resource-group \
  --docker-custom-image-name yozhdev.azurecr.io/water-order-bot:latest \
  --docker-registry-server-url https://yozhdev.azurecr.io \
  --docker-registry-server-user yozhdev \
  --docker-registry-server-password <your-password>

# Set environment variables
az webapp config appsettings set \
  --resource-group your-resource-group \
  --name water-order-bot \
  --settings TELEGRAM_BOT_TOKEN=your_token_here PORT=3000
```

## Troubleshooting

### "Login Failed" Error

Make sure you're logged into Azure:
```bash
az login
az acr login --name yozhdev
```

### "Docker daemon not running" Error

Start Docker Desktop and wait for it to fully initialize.

### "Permission denied" Error (Linux/Mac)

Make the script executable:
```bash
chmod +x build-and-push.sh
```

## Environment Variables

The application requires these environment variables:

- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token (required)
- `PORT` - Port number (default: 3000)

Configure these in your Azure deployment settings.
