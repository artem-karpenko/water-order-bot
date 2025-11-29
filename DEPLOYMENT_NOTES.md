# Azure Functions Deployment Notes

## Current Status

### ✅ Local Development - WORKING
- Azure Functions runtime runs successfully locally
- Both functions (telegramWebhook, replyMonitor) load and execute correctly
- Timer function triggers every 2 minutes as expected
- Webhook function responds to HTTP requests
- Azure Table Storage integration works perfectly

**To test locally:**
```bash
npm start
```

### ❌ Azure Deployment - NOT WORKING
- Function App created: `water-order-bot-func.azurewebsites.net`
- Storage account created: `waterbotfuncstor`
- Environment variables configured
- Deployment succeeds but **functions don't appear** in Azure

**Issue:**
```
func azure functionapp list-functions water-order-bot-func
> Functions in water-order-bot-func:
> (empty)
```

Testing webhook returns 404:
```
curl https://water-order-bot-func.azurewebsites.net/api/telegram-webhook
> 404 Not Found
```

## Problem Analysis

### Azure Functions v4 Programming Model
Using the new Azure Functions v4 Node.js programming model with `@azure/functions` v4.x.

**Current Structure:**
```
src/
├── azureFunctions.ts          # Entry point - imports both functions
├── telegramWebhook.ts         # HTTP trigger
├── replyMonitor.ts            # Timer trigger
└── shared/
    ├── bot.ts                 # Shared bot instance
    └── services/              # Shared services
```

**package.json:**
```json
{
  "main": "src/azureFunctions.ts",
  "dependencies": {
    "@azure/functions": "^4.0.0"
  }
}
```

### Deployment Commands Tried
1. `func azure functionapp publish water-order-bot-func`
2. `func azure functionapp publish water-order-bot-func --typescript`

Both succeed but functions don't register.

## Known Issues with Azure Functions v4

### Issue: Functions Not Discovered After Deployment

**Possible Causes:**
1. **Entry Point Not Loaded**: Azure runtime may not be executing `azureFunctions.ts`
2. **Module Resolution**: Import paths might resolve differently in Azure vs locally
3. **Build Configuration**: TypeScript compilation might not match Azure expectations
4. **Programming Model v4 Requirements**: May need specific project structure

### Common Solutions to Try

#### Option 1: Use `index.ts` as Entry Point
Azure Functions v4 might expect `index.ts` in project root:
```typescript
// index.ts at project root
import './src/telegramWebhook';
import './src/replyMonitor';
```

#### Option 2: Check `tsconfig.json` Output
Ensure compiled files are in expected locations:
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

#### Option 3: Function.json Metadata
v4 programming model should auto-generate but might need manual function.json:
```
dist/
├── telegramWebhook/
│   ├── index.js
│   └── function.json
└── replyMonitor/
    ├── index.js
    └── function.json
```

#### Option 4: Application Insights Logs
Check Function App logs for startup errors:
```bash
az monitor app-insights query \
  --app water-order-bot-func \
  --analytics-query "traces | where timestamp > ago(1h)" \
  --output table
```

#### Option 5: Verify FUNCTIONS_WORKER_RUNTIME
Ensure environment variable is set:
```bash
az functionapp config appsettings list \
  --name water-order-bot-func \
  --resource-group yozh \
  --query "[?name=='FUNCTIONS_WORKER_RUNTIME']"
```

#### Option 6: Try Functions v3 Model
Downgrade to v3 model which uses separate folders per function:
```
functions/
├── telegramWebhook/
│   ├── function.json
│   └── index.ts
└── replyMonitor/
    ├── function.json
    └── index.ts
```

## Resources

- [Azure Functions Node.js v4 Programming Model](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Azure Functions TypeScript Developer Guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?pivots=nodejs-model-v4#typescript)
- [Troubleshooting Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-diagnostics)

## Temporary Solution

**Container Instances are still running and working:**
- Continue using Azure Container Instances ($60-70/month)
- Bot is fully functional with all features
- Can revisit Functions deployment when issue is resolved

**To switch back to Container Instances:**
```bash
# Remove Telegram webhook (back to polling mode)
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook"

# Container Instance will resume polling automatically
```

## Next Steps

1. Research Azure Functions v4 deployment best practices
2. Check official Microsoft samples for v4 TypeScript projects
3. Consider opening GitHub issue with Azure Functions team
4. Test with minimal reproducible example
5. Alternative: Migrate to Azure Functions v3 model (proven to work)

---

**Last Updated:** 2025-11-29
**Status:** Local development works, Azure deployment needs investigation
