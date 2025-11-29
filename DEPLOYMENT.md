# Azure Functions Deployment Guide

This guide explains how to deploy the Water Order Bot to Azure Functions in serverless mode.

## Overview

The bot runs on Azure Functions with two functions:
- **telegramWebhook** - HTTP trigger that handles Telegram updates
- **replyMonitor** - Timer trigger (runs every 2 minutes) that checks for email replies

This serverless architecture costs ~$1-2/month compared to ~$60-70/month with Container Instances.

## Prerequisites

1. **Azure CLI** - Install from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
2. **Azure Functions Core Tools** - Install from https://learn.microsoft.com/azure/azure-functions/functions-run-local
3. **Node.js 20 or higher**
4. **Azure Account** with active subscription

## First-Time Setup

### 1. Login to Azure

```bash
az login
```

### 2. Create Resource Group (if needed)

```bash
az group create --name water-order-bot-rg --location eastus
```

### 3. Create Storage Account

Azure Functions requires a storage account:

```bash
az storage account create \
  --name waterorderbotstore \
  --resource-group water-order-bot-rg \
  --location eastus \
  --sku Standard_LRS
```

### 4. Create Function App

```bash
az functionapp create \
  --resource-group water-order-bot-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name water-order-bot-func \
  --storage-account waterorderbotstore
```

### 5. Create Azure Table Storage for Order Tracking

```bash
# Get storage connection string
az storage account show-connection-string \
  --name waterorderbotstore \
  --resource-group water-order-bot-rg \
  --query connectionString \
  --output tsv
```

Copy this connection string - you'll need it for environment variables.

### 6. Configure Environment Variables

Set all required environment variables in Azure:

```bash
# Set Telegram bot token
az functionapp config appsettings set \
  --name water-order-bot-func \
  --resource-group water-order-bot-rg \
  --settings TELEGRAM_BOT_TOKEN=your_bot_token_here

# Set whitelisted user IDs
az functionapp config appsettings set \
  --name water-order-bot-func \
  --resource-group water-order-bot-rg \
  --settings WHITELISTED_USER_IDS=123456789,987654321

# Set Gmail API credentials
az functionapp config appsettings set \
  --name water-order-bot-func \
  --resource-group water-order-bot-rg \
  --settings \
    GMAIL_CLIENT_ID=your_client_id \
    GMAIL_CLIENT_SECRET=your_client_secret \
    GMAIL_REFRESH_TOKEN=your_refresh_token

# Set email configuration
az functionapp config appsettings set \
  --name water-order-bot-func \
  --resource-group water-order-bot-rg \
  --settings \
    EMAIL_SENDER_FILTER=supplier@example.com \
    EMAIL_ORDER_SUBJECT="Water Order" \
    EMAIL_ORDER_BODY="Please deliver water"

# Set Azure Storage connection string (from step 5)
az functionapp config appsettings set \
  --name water-order-bot-func \
  --resource-group water-order-bot-rg \
  --settings AZURE_STORAGE_CONNECTION_STRING="your_connection_string"
```

Or set all at once:

```bash
az functionapp config appsettings set \
  --name water-order-bot-func \
  --resource-group water-order-bot-rg \
  --settings \
    TELEGRAM_BOT_TOKEN=your_token \
    WHITELISTED_USER_IDS=123456789 \
    GMAIL_CLIENT_ID=your_id \
    GMAIL_CLIENT_SECRET=your_secret \
    GMAIL_REFRESH_TOKEN=your_token \
    EMAIL_SENDER_FILTER=supplier@example.com \
    EMAIL_ORDER_SUBJECT="Water Order" \
    EMAIL_ORDER_BODY="Please deliver water" \
    AZURE_STORAGE_CONNECTION_STRING="your_connection_string"
```

See [GMAIL_SETUP.md](GMAIL_SETUP.md) for Gmail API setup instructions.

## Deployment

### Quick Deploy (Recommended)

```bash
# Build and deploy in one command
npm run deploy
```

This script automatically:
1. Builds TypeScript to JavaScript
2. Deploys to Azure Functions
3. Skips uploading node_modules (reduces upload time)

### Manual Deployment

```bash
# Build TypeScript
npm run build

# Deploy to Azure
func azure functionapp publish water-order-bot-func --no-build
```

The `--no-build` flag tells Azure to use the pre-built `dist/` folder instead of building remotely.

## Setting Up Telegram Webhook

After deployment, configure Telegram to send updates to your webhook:

```bash
# Get your Function App URL
az functionapp show \
  --name water-order-bot-func \
  --resource-group water-order-bot-rg \
  --query defaultHostName \
  --output tsv
```

Then set the webhook using Telegram's API:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://water-order-bot-func.azurewebsites.net/api/telegram-webhook"}'
```

Verify webhook is set:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## Local Development

### Running Locally

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start Azure Functions locally
npm start
```

The functions will be available at:
- HTTP trigger: `http://localhost:7071/api/telegram-webhook`
- Timer trigger: Runs every 2 minutes automatically

### Local Configuration

Copy `local.settings.json.example` to `local.settings.json` and add your environment variables:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "TELEGRAM_BOT_TOKEN": "your_token_here",
    "WHITELISTED_USER_IDS": "123456789",
    "GMAIL_CLIENT_ID": "your_client_id",
    "GMAIL_CLIENT_SECRET": "your_client_secret",
    "GMAIL_REFRESH_TOKEN": "your_refresh_token",
    "EMAIL_SENDER_FILTER": "supplier@example.com",
    "EMAIL_ORDER_SUBJECT": "Water Order",
    "EMAIL_ORDER_BODY": "Please deliver water",
    "AZURE_STORAGE_CONNECTION_STRING": "your_connection_string"
  }
}
```

### Testing Locally with Telegram

For local testing, you can use polling instead of webhooks:

1. Remove the webhook: `curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"`
2. Use a local polling script (not included in this serverless version)
3. Or use ngrok to expose local webhook: `ngrok http 7071`

## Monitoring and Troubleshooting

### View Logs

```bash
# Stream live logs
func azure functionapp logstream water-order-bot-func

# Or use Azure CLI
az webapp log tail \
  --name water-order-bot-func \
  --resource-group water-order-bot-rg
```

### View Function Status

```bash
# Check if functions are running
az functionapp show \
  --name water-order-bot-func \
  --resource-group water-order-bot-rg
```

### Check Configuration

```bash
# View all app settings
az functionapp config appsettings list \
  --name water-order-bot-func \
  --resource-group water-order-bot-rg
```

### Common Issues

**Issue: "Cannot find module" error**
- Solution: Make sure you ran `npm run build` before deploying
- The deployment uses the compiled `dist/` folder

**Issue: Timer trigger not running**
- Check logs: `func azure functionapp logstream water-order-bot-func`
- Verify the function is enabled in Azure Portal
- Timer triggers may take a few minutes to start after deployment

**Issue: Webhook not receiving updates**
- Verify webhook URL: `curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"`
- Check the URL matches your Function App URL
- Ensure bot token is correct in app settings

**Issue: "Storage account not found" error**
- Verify `AZURE_STORAGE_CONNECTION_STRING` is set correctly
- Check storage account exists: `az storage account list --resource-group water-order-bot-rg`

## Updating an Existing Deployment

To update your bot with new code:

```bash
# Build and deploy
npm run deploy

# Or manually
npm run build
func azure functionapp publish water-order-bot-func --no-build
```

No need to recreate resources or reconfigure settings - they persist across deployments.

## Cost Optimization

### Current Costs (~$1-2/month)

The Consumption plan charges based on:
- **Executions**: First 1 million/month free, then $0.20 per million
- **Execution time**: First 400,000 GB-s free, then $0.000016 per GB-s
- **Storage**: ~$0.03/month for Azure Table Storage

Typical monthly usage:
- ~86,400 timer executions (every 2 minutes)
- ~100-1,000 webhook executions (user interactions)
- Total: Well within free tier limits

### Optimization Tips

1. **Timer frequency**: Currently 2 minutes - adjust in `replyMonitor.ts` if needed
2. **Dependencies**: Already optimized to 40MB (97% reduction from 1.5GB)
3. **Cold starts**: First request may take 1-2 seconds - acceptable for a bot
4. **Logs**: Azure keeps logs for 30 days - disable if not needed

## Comparison: Before vs After

| Aspect | Container Instances | Azure Functions |
|--------|-------------------|-----------------|
| **Cost** | ~$60-70/month | ~$1-2/month |
| **Scaling** | Fixed (always-on) | Auto (pay per use) |
| **Cold starts** | None | 1-2 seconds |
| **Dependencies** | 1.5GB | 40MB |
| **Deployment** | Docker build/push | `npm run deploy` |
| **Complexity** | High (Docker, registry) | Low (native Node.js) |

## Alternative Deployment Methods

### Using Azure Portal

1. Go to Azure Portal → Function Apps
2. Click "Create"
3. Fill in details matching the CLI commands above
4. After creation, upload code via "Deployment Center" or use VS Code Azure Functions extension

### Using VS Code

1. Install Azure Functions extension
2. Open project in VS Code
3. Click Azure icon → Function App → Deploy to Function App
4. Select your subscription and function app

## Environment Variables Reference

Required variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | `123456:ABC-DEF...` |
| `WHITELISTED_USER_IDS` | Allowed user IDs | `123456789,987654321` |
| `GMAIL_CLIENT_ID` | Gmail OAuth client ID | `abc123.apps.googleusercontent.com` |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth secret | `GOCSPX-...` |
| `GMAIL_REFRESH_TOKEN` | Gmail refresh token | `1//abc...` |
| `EMAIL_SENDER_FILTER` | Email address to monitor | `supplier@example.com` |
| `EMAIL_ORDER_SUBJECT` | Order email subject | `Water Order` |
| `EMAIL_ORDER_BODY` | Order email body | `Please deliver water` |
| `AZURE_STORAGE_CONNECTION_STRING` | Storage for order tracking | `DefaultEndpointsProtocol=https;...` |

## Security Best Practices

1. **Never commit** `local.settings.json` - it's in `.gitignore`
2. **Use Key Vault** for production secrets (optional upgrade)
3. **Rotate tokens** periodically (Gmail refresh tokens, bot token)
4. **Restrict access** via CORS settings in Azure Portal if needed
5. **Monitor logs** for unauthorized access attempts

## Rollback

If deployment fails or has issues:

```bash
# Deploy previous version
git checkout <previous-commit>
npm run deploy
git checkout -

# Or redeploy from Azure Portal using deployment slots
```

## Further Reading

- [Azure Functions Documentation](https://learn.microsoft.com/azure/azure-functions/)
- [Telegram Bot API - Webhooks](https://core.telegram.org/bots/api#setwebhook)
- [Azure Table Storage](https://learn.microsoft.com/azure/storage/tables/)
- [Gmail API Setup](GMAIL_SETUP.md)
