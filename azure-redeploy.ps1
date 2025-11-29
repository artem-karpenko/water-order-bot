# Load environment variables from .env file
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    Write-Host "Loaded environment variables from .env" -ForegroundColor Green
} else {
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
}

# Azure Container Instance configuration
$CONTAINER_NAME = "water-order-bot"
$RESOURCE_GROUP = if ($args.Count -gt 0) { $args[0] } else { "yozh" }
$REGISTRY = "yozhdev.azurecr.io"
$REGISTRY_USERNAME = "yozhdev"

# Check for required environment variables
if ([string]::IsNullOrEmpty($env:TELEGRAM_BOT_TOKEN)) {
    Write-Host "Error: TELEGRAM_BOT_TOKEN not set in .env file" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrEmpty($env:AZURE_REGISTRY_PASSWORD)) {
    Write-Host "Error: AZURE_REGISTRY_PASSWORD not set in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Azure Container Instance Redeployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Container: $CONTAINER_NAME"
Write-Host "Resource Group: $RESOURCE_GROUP"
Write-Host "Registry: $REGISTRY"
Write-Host "=========================================" -ForegroundColor Cyan

# Check if container exists
Write-Host ""
Write-Host "Step 1: Checking if container exists..." -ForegroundColor Yellow
Write-Host "Running: az container show --name $CONTAINER_NAME --resource-group $RESOURCE_GROUP" -ForegroundColor Gray
$null = az container show --name $CONTAINER_NAME --resource-group $RESOURCE_GROUP 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Container found" -ForegroundColor Green

    # Delete existing container
    Write-Host ""
    Write-Host "Step 2: Deleting existing container..." -ForegroundColor Yellow
    Write-Host "Running: az container delete --name $CONTAINER_NAME --resource-group $RESOURCE_GROUP --yes" -ForegroundColor Gray
    az container delete --name $CONTAINER_NAME --resource-group $RESOURCE_GROUP --yes

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to delete container!" -ForegroundColor Red
        exit 1
    }

    Write-Host "Container deleted successfully" -ForegroundColor Green

    # Wait a moment for Azure to clean up
    Write-Host ""
    Write-Host "Waiting for cleanup..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
} else {
    Write-Host "Container does not exist, will create new one" -ForegroundColor Blue
}

# Create new container
Write-Host ""
Write-Host "Step 3: Creating new container instance..." -ForegroundColor Yellow

$botToken = $env:TELEGRAM_BOT_TOKEN
$registryPassword = $env:AZURE_REGISTRY_PASSWORD
$whitelistedUserIds = if ($env:WHITELISTED_USER_IDS) { $env:WHITELISTED_USER_IDS } else { "" }
$gmailClientId = if ($env:GMAIL_CLIENT_ID) { $env:GMAIL_CLIENT_ID } else { "" }
$gmailClientSecret = if ($env:GMAIL_CLIENT_SECRET) { $env:GMAIL_CLIENT_SECRET } else { "" }
$gmailRefreshToken = if ($env:GMAIL_REFRESH_TOKEN) { $env:GMAIL_REFRESH_TOKEN } else { "" }
$emailSenderFilter = if ($env:EMAIL_SENDER_FILTER) { $env:EMAIL_SENDER_FILTER } else { "" }
$emailOrderSubject = if ($env:EMAIL_ORDER_SUBJECT) { $env:EMAIL_ORDER_SUBJECT } else { "Water Delivery Order" }
$emailOrderBody = if ($env:EMAIL_ORDER_BODY) { $env:EMAIL_ORDER_BODY } else { "Please deliver water." }
$azureStorageConnectionString = if ($env:AZURE_STORAGE_CONNECTION_STRING) { $env:AZURE_STORAGE_CONNECTION_STRING } else { "" }

# Create temporary YAML with substituted values
$yamlContent = Get-Content azure-deploy.yaml -Raw
$yamlContent = $yamlContent -replace 'REGISTRY_PASSWORD_PLACEHOLDER', $registryPassword
$yamlContent = $yamlContent -replace 'BOT_TOKEN_PLACEHOLDER', $botToken
$yamlContent = $yamlContent -replace 'WHITELISTED_USER_IDS_PLACEHOLDER', $whitelistedUserIds
$yamlContent = $yamlContent -replace 'GMAIL_CLIENT_ID_PLACEHOLDER', $gmailClientId
$yamlContent = $yamlContent -replace 'GMAIL_CLIENT_SECRET_PLACEHOLDER', $gmailClientSecret
$yamlContent = $yamlContent -replace 'GMAIL_REFRESH_TOKEN_PLACEHOLDER', $gmailRefreshToken
$yamlContent = $yamlContent -replace 'EMAIL_SENDER_FILTER_PLACEHOLDER', $emailSenderFilter
$yamlContent = $yamlContent -replace 'EMAIL_ORDER_SUBJECT_PLACEHOLDER', $emailOrderSubject
$yamlContent = $yamlContent -replace 'EMAIL_ORDER_BODY_PLACEHOLDER', $emailOrderBody
$yamlContent = $yamlContent -replace 'AZURE_STORAGE_CONNECTION_STRING_PLACEHOLDER', $azureStorageConnectionString
$tempYaml = "azure-deploy.temp.yaml"
$yamlContent | Set-Content $tempYaml -NoNewline

Write-Host "Running: az container create --resource-group $RESOURCE_GROUP --file $tempYaml" -ForegroundColor Gray
az container create --resource-group $RESOURCE_GROUP --file $tempYaml

# Clean up temp file
Remove-Item $tempYaml -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create container!" -ForegroundColor Red
    exit 1
}

Write-Host "Container created successfully" -ForegroundColor Green

# Get container details
Write-Host ""
Write-Host "Step 4: Getting container details..." -ForegroundColor Yellow
Write-Host "Running: az container show --name $CONTAINER_NAME --resource-group $RESOURCE_GROUP --output table" -ForegroundColor Gray
az container show --name $CONTAINER_NAME --resource-group $RESOURCE_GROUP --output table

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Redeployment complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan

# Show how to view logs
Write-Host ""
Write-Host "To view logs, run:" -ForegroundColor Gray
Write-Host "  az container logs --name water-order-bot --resource-group yozh" -ForegroundColor Cyan
Write-Host ""
Write-Host "To follow logs, run:" -ForegroundColor Gray
Write-Host "  az container logs --name water-order-bot --resource-group yozh --follow" -ForegroundColor Cyan
Write-Host ""
Write-Host "To check status, run:" -ForegroundColor Gray
Write-Host "  az container show --name water-order-bot --resource-group yozh" -ForegroundColor Cyan
