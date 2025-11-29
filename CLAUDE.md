# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Water Order Bot is a TypeScript/Node.js Telegram bot for ordering water delivery, deployed as Azure Functions serverless application. The bot integrates with Gmail API for sending orders and monitoring supplier email replies. Uses Azure Table Storage for persistent order tracking.

## Architecture

### Serverless Azure Functions

The application runs on Azure Functions with two functions:

1. **telegramWebhook** (`src/telegramWebhook.ts`)
   - HTTP trigger at `/api/telegram-webhook`
   - Handles incoming Telegram updates via webhook
   - Processes bot commands and user interactions

2. **replyMonitor** (`src/replyMonitor.ts`)
   - Timer trigger (runs every 2 minutes)
   - Checks Gmail for supplier email replies
   - Notifies users when new replies arrive

### Key Files

```
src/
├── functions.ts                          # Entry point - imports both functions
├── telegramWebhook.ts                    # HTTP trigger function
├── replyMonitor.ts                       # Timer trigger function
└── shared/
    ├── bot.ts                            # Telegram bot instance (singleton)
    └── services/
        ├── azureTableOrderTracker.ts     # Order tracking with Azure Table Storage
        ├── gmailService.ts               # Gmail API integration
        └── replyMonitor.ts               # Reply monitoring logic
```

**Important Files:**
- `functions.ts`: Single entry point that imports both function definitions
- `host.json`: Azure Functions host configuration
- `local.settings.json`: Local environment variables (gitignored)
- `tsconfig.json`: TypeScript compilation (ES2020 target, CommonJS modules)
- `dist/`: Compiled JavaScript output (gitignored)

### Shared Code Architecture

Both functions share code from `src/shared/`:
- **Singleton bot instance**: Created once, reused across function invocations
- **Gmail service**: Shared Gmail API client with OAuth2 authentication
- **Order tracking**: Azure Table Storage client for persistent order state
- **Reply monitoring**: Shared logic for checking and processing email replies

This design minimizes cold start time and memory usage.

## Development Commands

### Local Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start Azure Functions locally
npm start

# The functions will be available at:
# - HTTP: http://localhost:7071/api/telegram-webhook
# - Timer: Runs automatically every 2 minutes
```

The `npm start` command runs `func start` which uses Azure Functions Core Tools.

### TypeScript Compilation

```bash
# Build TypeScript to JavaScript
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# Clean build artifacts
npm run clean
```

TypeScript compiles from `src/` to `dist/` using settings in `tsconfig.json`.

### Deployment

```bash
# Build and deploy in one command
npm run deploy

# Or manually
npm run build
func azure functionapp publish water-order-bot-func --no-build
```

The `--no-build` flag tells Azure to use the pre-built `dist/` folder.

## Configuration

### Local Development

Copy `local.settings.json.example` to `local.settings.json` (gitignored):

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

### Azure Production

Environment variables are set in Azure Function App settings:

```bash
az functionapp config appsettings set \
  --name water-order-bot-func \
  --resource-group yozh \
  --settings \
    TELEGRAM_BOT_TOKEN=your_token \
    WHITELISTED_USER_IDS=123456789 \
    # ... (see DEPLOYMENT.md for full list)
```

## Bot Features

### Commands
- `/start` - Start the bot and show main menu with keyboard buttons

### Keyboard Buttons
- **Order water** - Sends water delivery order via email
- **Read latest email** - Views the most recent email from supplier

### Authorization
- Whitelist-based access control via `WHITELISTED_USER_IDS`
- Unauthorized users receive error message

### Order Tracking
- Orders stored in Azure Table Storage
- Tracks: order date, user info, notification status
- Used by reply monitor to avoid duplicate notifications

### Email Integration
- **Sending**: Gmail API to send order emails
- **Monitoring**: Timer function checks for replies every 2 minutes
- **Notifications**: Bot notifies users when supplier responds

## Technical Details

### Azure Functions v4 Programming Model

Uses the new v4 programming model (`@azure/functions` v4.x):

```typescript
// HTTP trigger example
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function telegramWebhook(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Function logic
}

app.http('telegramWebhook', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: telegramWebhook,
});
```

**Key Features:**
- Code-centric function definitions (no separate `function.json` files)
- TypeScript-first approach
- Trigger configurations in code
- Auto-generated metadata

### Dependencies

**Production:**
- `@azure/functions` - Azure Functions runtime
- `@azure/data-tables` - Azure Table Storage client
- `telegraf` - Telegram bot framework
- `@googleapis/gmail` - Gmail API client (lightweight, Gmail-only)
- `google-auth-library` - OAuth2 authentication

**Development:**
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions
- `azure-functions-core-tools` - Local development runtime

**Dependency Optimization:**
- Uses `@googleapis/gmail` instead of full `googleapis` package
- Reduces deployment size from 1.5GB to 40MB (97% reduction)

### Telegram Bot (Telegraf)

The bot runs in **webhook mode** for serverless deployment:

```typescript
// Shared bot instance in src/shared/bot.ts
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Commands and handlers registered here
bot.command('start', (ctx) => { /* ... */ });
bot.hears('Order water', async (ctx) => { /* ... */ });
```

**Webhook Processing:**
```typescript
// In telegramWebhook.ts
const update = await request.json();
await bot.handleUpdate(update);
```

**No polling** - Telegram sends updates directly to the webhook endpoint.

### Gmail API Integration

Uses OAuth2 for authentication:

```typescript
// src/shared/services/gmailService.ts
export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail: gmail_v1.Gmail;

  async sendEmail(to: string, subject: string, body: string): Promise<string>
  async getLatestEmailFromSender(senderEmail: string): Promise<EmailData | null>
  async checkForReply(senderEmail: string, subjectContains: string, afterDate: Date): Promise<EmailData | null>
}
```

See `GMAIL_SETUP.md` for OAuth2 setup instructions.

### Azure Table Storage

Order tracking using Azure Table Storage:

```typescript
// src/shared/services/azureTableOrderTracker.ts
export class AzureTableOrderTracker {
  async createOrder(userId: number, username: string): Promise<string>
  async getOrder(orderId: string): Promise<Order | null>
  async updateOrderNotified(orderId: string): Promise<void>
  async getPendingOrders(): Promise<Order[]>
}
```

**Table Structure:**
- PartitionKey: `userId` (for efficient user queries)
- RowKey: `orderId` (unique order identifier)
- Properties: `orderDate`, `username`, `notified`, etc.

## Adding Features

### Adding Bot Commands

Edit `src/shared/bot.ts`:

```typescript
bot.command('newcommand', async (ctx) => {
  await ctx.reply('Response');
});
```

The command automatically works in both local development and Azure.

### Adding Keyboard Buttons

```typescript
bot.hears('New Button', async (ctx) => {
  // Button handler logic
});

// Update keyboard in /start command
const keyboard = Markup.keyboard([
  ['Order water', 'Read latest email'],
  ['New Button']  // Add here
]).resize();
```

### Adding New Functions

1. Create function file in `src/` (e.g., `src/newFunction.ts`)
2. Define function and register with `app`:
```typescript
import { app, Timer, InvocationContext } from '@azure/functions';

export async function newFunction(
  timer: Timer,
  context: InvocationContext
): Promise<void> {
  // Function logic
}

app.timer('newFunction', {
  schedule: '0 */5 * * * *', // Every 5 minutes
  handler: newFunction,
});
```
3. Import in `src/functions.ts`:
```typescript
import './newFunction';
```

### Modifying Timer Schedule

Edit the schedule in `src/replyMonitor.ts`:

```typescript
app.timer('replyMonitor', {
  schedule: '0 */2 * * * *', // Current: every 2 minutes
  // Example: '0 */5 * * * *' = every 5 minutes
  // Example: '0 0 * * * *' = every hour
  handler: replyMonitor,
});
```

Uses cron expression format: `{second} {minute} {hour} {day} {month} {day-of-week}`

## Serverless Design Principles

The application follows serverless best practices:

1. **Stateless functions** - Each invocation is independent
2. **Shared code** - Common logic in `src/shared/` to reduce cold starts
3. **Singleton pattern** - Bot and service instances created once
4. **Lightweight dependencies** - Minimal package size (40MB)
5. **Environment-based config** - No hardcoded values
6. **Idempotent operations** - Order tracking prevents duplicate processing
7. **Error handling** - Functions catch and log errors gracefully

## Testing Locally

### Testing Webhook

```bash
# Start functions locally
npm start

# In another terminal, send test update
curl -X POST http://localhost:7071/api/telegram-webhook \
  -H "Content-Type: application/json" \
  -d '{"message": {"text": "/start", "chat": {"id": 123456789}}}'
```

### Testing Timer Function

Timer runs automatically every 2 minutes when `func start` is running. Check console logs for execution.

### Testing with Real Telegram

For local testing with real Telegram:

1. Use ngrok to expose local endpoint:
```bash
ngrok http 7071
```

2. Set webhook to ngrok URL:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-ngrok-url.ngrok.io/api/telegram-webhook"
```

3. Test with your Telegram app

4. Remove webhook when done:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

## Deployment Notes

### What Gets Deployed

- `dist/` folder (compiled JavaScript)
- `node_modules/` (production dependencies)
- `host.json`, `package.json`

### What Doesn't Get Deployed

- `src/` folder (TypeScript source - not needed after compilation)
- `local.settings.json` (local only - use Azure app settings)
- `devDependencies` (only production dependencies deployed)

### Deployment Process

1. TypeScript compilation (`npm run build`)
2. Package upload to Azure (code + node_modules)
3. Azure installs production dependencies if needed
4. Functions runtime loads from `dist/functions.js`

### Cold Starts

- First request after idle: ~1-2 seconds
- Subsequent requests: <100ms
- Acceptable for Telegram bot use case (users don't notice)

### Cost

Running on Consumption plan:
- **Current cost**: ~$1-2/month
- **Previous cost**: ~$60-70/month (Container Instances)
- **Savings**: 97% cost reduction

See `DEPLOYMENT_NOTES.md` for detailed migration analysis.

## Resources

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [GMAIL_SETUP.md](GMAIL_SETUP.md) - Gmail API OAuth2 setup
- [DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md) - Migration notes and architecture decisions
- [Azure Functions Node.js Guide](https://learn.microsoft.com/azure/azure-functions/functions-reference-node)
- [Telegraf Documentation](https://telegraf.js.org/)
