# GitHub Secrets Configuration

To enable automated deployment via GitHub Actions, you need to configure the following secrets in your GitHub repository.

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

## Required Secrets

### 1. AZURE_REGISTRY_USERNAME

Your Azure Container Registry username (usually the registry name).

```
Value: yozhdev
```

### 2. AZURE_REGISTRY_PASSWORD

Your Azure Container Registry password.

**How to get it:**
```bash
az acr credential show --name yozhdev --query "passwords[0].value" -o tsv
```

Or find it in Azure Portal:
- Go to your Container Registry (yozhdev)
- Navigate to **Access keys**
- Copy one of the passwords

### 3. AZURE_CREDENTIALS

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

This will output JSON like:
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

**Copy the entire JSON output** and paste it as the secret value.

### 4. AZURE_RESOURCE_GROUP

The name of your Azure resource group where the container will be deployed.

```
Value: your-resource-group-name
```

## Optional: Update azure-deploy.yaml

Before deploying, update `azure-deploy.yaml` with your actual values:

1. **TELEGRAM_BOT_TOKEN**: Replace with your bot token (or use a secret)
2. **ACR Password**: This will be injected by the workflow
3. **Location**: Change if you want a different Azure region (default: eastus)

## Testing the Workflow

Once all secrets are configured:

1. **Push to main branch** - Will build, push, and deploy automatically
2. **Create a tag** (e.g., `v1.0.0`) - Will build, push, and deploy with version tag
3. **Manual trigger** - Go to Actions → Build and Deploy to Azure → Run workflow

## Verify Deployment

After the workflow completes, check your deployment:

```bash
# Get container details
az container show \
  --resource-group your-resource-group \
  --name water-order-bot \
  --query "{FQDN:ipAddress.fqdn,State:instanceView.state}" \
  --output table

# View logs
az container logs \
  --resource-group your-resource-group \
  --name water-order-bot
```

## Security Best Practices

- ✅ Never commit secrets to the repository
- ✅ Use GitHub Secrets for all sensitive values
- ✅ Rotate Azure credentials regularly
- ✅ Use service principals with minimal required permissions
- ✅ Consider using Azure Key Vault for production secrets
