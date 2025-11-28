# Azure Deployment Guide

This guide explains how to deploy the Water Order Bot to Azure. There are two deployment methods:

1. **Automated Deployment** (Recommended) - GitHub Actions CI/CD pipeline
2. **Manual Deployment** - Local build and push scripts

## Method 1: Automated Deployment with GitHub Actions

### One-Time Setup

1. **Configure GitHub Secrets** - See [GITHUB_SECRETS.md](GITHUB_SECRETS.md) for detailed instructions

   Required secrets:
   - `AZURE_REGISTRY_USERNAME`
   - `AZURE_REGISTRY_PASSWORD`
   - `AZURE_CREDENTIALS`
   - `AZURE_RESOURCE_GROUP`

2. **Update azure-deploy.yaml** - Set your TELEGRAM_BOT_TOKEN

### Deploy

Once configured, deployment happens automatically:

```bash
# Deploy by pushing to main
git push origin main

# Or create a version tag
git tag v1.0.0
git push origin v1.0.0

# Or manually trigger from GitHub Actions UI
```

The workflow will:
1. Build the Docker image
2. Push to Azure Container Registry
3. Deploy to Azure Container Instances
4. Output the deployment URL

### Monitor Deployment

Check the deployment status:
- GitHub Actions tab in your repository
- View logs and deployment details

## Method 2: Manual Deployment

### Quick Deploy (One Command)

Build, push, and deploy in a single command:

```bash
# Bash (Linux/Mac/Git Bash)
./deploy.sh

# With custom version
./deploy.sh v1.0.1

# PowerShell (Windows)
.\deploy.ps1

# With custom version and resource group
.\deploy.ps1 v1.0.1 yozh
```

This script automatically:
1. Builds the Docker image
2. Pushes to Azure Container Registry
3. Redeploys the container

### Prerequisites

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

### Option A: Using YAML Configuration (Recommended)

The repository includes `azure-deploy.yaml` with pre-configured settings:

```bash
# Update azure-deploy.yaml with your TELEGRAM_BOT_TOKEN first
# Then deploy:
az container create \
  --resource-group your-resource-group \
  --file azure-deploy.yaml
```

### Option B: Using CLI Command

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

## Redeploying an Existing Container

To update a running container with a new image or configuration, use the redeploy scripts:

### Using Bash (Linux/Mac/Git Bash)

```bash
# Delete old container and create new one
./azure-redeploy.sh your-resource-group
```

### Using PowerShell (Windows)

```powershell
# Delete old container and create new one
.\azure-redeploy.ps1 your-resource-group
```

The scripts will:
1. Check if the container exists
2. Delete the existing container (if found)
3. Wait for cleanup
4. Create a new container using `azure-deploy.yaml`
5. Display container details and status

### Manual Redeployment

```bash
# Delete existing container
az container delete \
  --name water-order-bot \
  --resource-group your-resource-group \
  --yes

# Create new container
az container create \
  --resource-group your-resource-group \
  --file azure-deploy.yaml
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
