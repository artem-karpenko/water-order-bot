# GitHub Secrets Configuration

**Note**: This file is currently **not in use** as the project has migrated from Docker Container deployment to Azure Functions serverless deployment.

## Migration Update

The Water Order Bot previously used GitHub Actions to automatically build Docker images and deploy to Azure Container Instances. This required several GitHub secrets for authentication.

**The project now uses Azure Functions** and deployment is done via:
```bash
npm run deploy
```

No GitHub Actions or secrets are currently needed for deployment.

## Historical Reference (Container Deployment)

This section is kept for historical reference in case you need to set up container-based deployment in the future.

### Previous GitHub Secrets

The following secrets were used for automated Docker deployment:

#### 1. AZURE_REGISTRY_USERNAME
Azure Container Registry username (usually the registry name).

**How to get it:**
```bash
# Registry name (e.g., yozhdev)
az acr show --name yozhdev --query name -o tsv
```

#### 2. AZURE_REGISTRY_PASSWORD
Azure Container Registry password.

**How to get it:**
```bash
az acr credential show --name yozhdev --query "passwords[0].value" -o tsv
```

Or in Azure Portal:
- Go to Container Registry (e.g., yozhdev)
- Navigate to **Access keys**
- Copy one of the passwords

#### 3. AZURE_CREDENTIALS
Azure service principal credentials for deployment.

**How to create it:**
```bash
# Create a service principal
az ad sp create-for-rbac \
  --name "water-order-bot-github" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
  --sdk-auth
```

This outputs JSON like:
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  ...
}
```

Copy the entire JSON output as the secret value.

#### 4. AZURE_RESOURCE_GROUP
The Azure resource group name.

**Example:**
```
Value: yozh
```

### Previous GitHub Actions Workflow

The workflow file `.github/workflows/azure-deploy.yml` handled:
1. Building Docker image
2. Pushing to Azure Container Registry
3. Deploying to Azure Container Instances

This workflow is no longer in use.

## Current Deployment Method

### Azure Functions Deployment

Deployment is now manual via Azure Functions Core Tools:

```bash
# One-command deployment
npm run deploy

# Or manually
npm run build
func azure functionapp publish water-order-bot-func --no-build
```

### Required Azure Configuration

Instead of GitHub secrets, you now configure environment variables directly in Azure Function App:

```bash
az functionapp config appsettings set \
  --name water-order-bot-func \
  --resource-group yozh \
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

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions.

## Future: GitHub Actions for Functions

If you want to set up automated deployment via GitHub Actions for Azure Functions, you would need:

### Option 1: Publish Profile (Recommended)

1. Download publish profile from Azure Portal:
   - Go to Function App → Overview
   - Click "Get publish profile"
   - Download the file

2. Add as GitHub secret:
   - Name: `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
   - Value: Entire contents of the downloaded file

3. Create workflow:
```yaml
name: Deploy to Azure Functions

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install and build
        run: |
          npm install
          npm run build

      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: water-order-bot-func
          package: .
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

### Option 2: Service Principal

1. Create service principal:
```bash
az ad sp create-for-rbac \
  --name "water-order-bot-github-functions" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/yozh \
  --sdk-auth
```

2. Add as GitHub secret:
   - Name: `AZURE_CREDENTIALS`
   - Value: JSON output from above

3. Use Azure Login action in workflow

## Security Best Practices

- ✅ Never commit secrets to the repository
- ✅ Use GitHub Secrets for all sensitive values
- ✅ Rotate credentials regularly
- ✅ Use service principals with minimal required permissions
- ✅ Consider Azure Key Vault for production secrets

## References

- [Azure Functions GitHub Actions](https://learn.microsoft.com/azure/azure-functions/functions-how-to-github-actions)
- [DEPLOYMENT.md](DEPLOYMENT.md) - Current deployment guide
