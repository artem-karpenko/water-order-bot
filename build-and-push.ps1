# Azure Container Registry configuration
$REGISTRY = "yozhdev.azurecr.io"
$IMAGE_NAME = "water-order-bot"

# Get version from argument or use 'latest'
$VERSION = if ($args.Count -gt 0) { $args[0] } else { "latest" }

# Full image name with registry
$FULL_IMAGE_NAME = "${REGISTRY}/${IMAGE_NAME}:${VERSION}"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Building and pushing Docker image" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Registry: ${REGISTRY}"
Write-Host "Image: ${IMAGE_NAME}"
Write-Host "Version: ${VERSION}"
Write-Host "Full name: ${FULL_IMAGE_NAME}"
Write-Host "=========================================" -ForegroundColor Cyan

# Build the Docker image
Write-Host ""
Write-Host "Step 1: Building Docker image..." -ForegroundColor Yellow
docker build -t "${IMAGE_NAME}:${VERSION}" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker build successful!" -ForegroundColor Green

# Tag the image for Azure Container Registry
Write-Host ""
Write-Host "Step 2: Tagging image for Azure Container Registry..." -ForegroundColor Yellow
docker tag "${IMAGE_NAME}:${VERSION}" $FULL_IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker tag failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Image tagged successfully!" -ForegroundColor Green

# Push to Azure Container Registry
Write-Host ""
Write-Host "Step 3: Pushing image to Azure Container Registry..." -ForegroundColor Yellow
Write-Host "Note: Make sure you're logged in with 'az acr login --name yozhdev'" -ForegroundColor Gray
docker push $FULL_IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed!" -ForegroundColor Red
    Write-Host "💡 Make sure you're logged in: az acr login --name yozhdev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Successfully pushed image!" -ForegroundColor Green
Write-Host "Image: ${FULL_IMAGE_NAME}" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To deploy this image, use:"
Write-Host "  ${FULL_IMAGE_NAME}" -ForegroundColor Cyan
