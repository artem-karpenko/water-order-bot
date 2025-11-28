# Complete deployment script: build, push, and redeploy
# Usage: .\deploy.ps1 [version-tag] [resource-group]

$VERSION = if ($args.Count -gt 0) { $args[0] } else { "latest" }
$RESOURCE_GROUP = if ($args.Count -gt 1) { $args[1] } else { "yozh" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete Deployment Pipeline" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Version: $VERSION"
Write-Host "Resource Group: $RESOURCE_GROUP"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build and push Docker image
Write-Host "Step 1: Building and pushing Docker image..." -ForegroundColor Yellow
& .\build-and-push.ps1 $VERSION

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build and push failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Redeploying to Azure..." -ForegroundColor Yellow
& .\azure-redeploy.ps1 $RESOURCE_GROUP

if ($LASTEXITCODE -ne 0) {
    Write-Host "Redeploy failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
