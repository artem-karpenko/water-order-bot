#!/usr/bin/env pwsh

# Build Docker image locally without pushing to registry
# Usage: .\build-image.ps1 [tag]
# Example: .\build-image.ps1 v1.0.0

param(
    [string]$Tag = "latest"
)

$IMAGE_NAME = "water-order-bot"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Building Docker Image Locally" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Image: $IMAGE_NAME" -ForegroundColor White
Write-Host "Tag: $Tag" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Build the Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t "${IMAGE_NAME}:${Tag}" .

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Image built: ${IMAGE_NAME}:${Tag}" -ForegroundColor White
Write-Host ""
Write-Host "To run the image locally:" -ForegroundColor Yellow
Write-Host "  docker run --env-file .env -p 3000:3000 ${IMAGE_NAME}:${Tag}" -ForegroundColor Gray
Write-Host ""
Write-Host "To view images:" -ForegroundColor Yellow
Write-Host "  docker images $IMAGE_NAME" -ForegroundColor Gray
Write-Host ""
