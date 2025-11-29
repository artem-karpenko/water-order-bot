# Water Order Bot

A Telegram bot for ordering water delivery, built with TypeScript, Node.js, and Azure Functions for serverless deployment.

## Features

- **Telegram Bot Interface**: Users can interact with the bot through Telegram
- **Water Delivery Ordering**: Order water delivery and track order status
- **Email Integration**: Gmail API integration for sending orders and monitoring replies
- **User Authorization**: Whitelist-based access control
- **Reply Monitoring**: Automated checking for supplier email responses
- **Azure Functions Serverless**: Cost-effective serverless deployment on Azure
- **Azure Table Storage**: Persistent order tracking

## Quick Start

### Prerequisites

- Node.js 20 or higher
- A Telegram Bot Token (get one from [@BotFather](https://t.me/botfather))
- Azure account (for deployment)

### Installation

```bash
# Install dependencies
npm install

# Set up local development settings
cp .env.example .env

# Add your configuration to .env
# TELEGRAM_BOT_TOKEN=your_bot_token_here
# WHITELISTED_USER_IDS=your_telegram_user_id
# ... (see GMAIL_SETUP.md for Gmail config)
```

### Local Development

```bash
# Build TypeScript
npm run build

# Run Azure Functions locally
npm start

# The bot will be available at http://localhost:7071/api/telegram-webhook
# Timer function will run every 2 minutes to check for email replies
```

## Bot Commands

- `/start` - Start the bot and see the main menu with keyboard buttons
- **Order water** button - Send water delivery order via email
- **Read latest email** button - View the most recent email from supplier

## Deployment

### Azure Functions (Production)

The bot runs on Azure Functions in serverless mode:

```bash
# Build and deploy
npm run deploy

# Or manually:
npm run build
func azure functionapp publish water-order-bot-func --no-build
```

**Functions deployed:**
- `telegramWebhook` - HTTP trigger for Telegram updates
- `replyMonitor` - Timer trigger (runs every 2 minutes) to check for email replies

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete setup instructions.

## Project Structure

```
src/
├── functions.ts                          # Azure Functions entry point
├── telegramWebhook.ts                    # HTTP trigger for Telegram
├── replyMonitor.ts                       # Timer trigger for email checking
└── shared/
    ├── bot.ts                            # Bot instance and handlers
    └── services/
        ├── azureTableOrderTracker.ts     # Order tracking with Azure Table Storage
        ├── gmailService.ts               # Gmail API integration
        └── replyMonitor.ts               # Reply monitoring logic
```

## Configuration

### Environment Variables

Required environment variables (set in Azure Function App settings):

- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `WHITELISTED_USER_IDS` - Comma-separated list of allowed Telegram user IDs
- `GMAIL_CLIENT_ID` - Gmail API OAuth client ID
- `GMAIL_CLIENT_SECRET` - Gmail API OAuth client secret
- `GMAIL_REFRESH_TOKEN` - Gmail API refresh token
- `EMAIL_SENDER_FILTER` - Email address to send orders to and monitor
- `EMAIL_ORDER_SUBJECT` - Subject line for order emails
- `EMAIL_ORDER_BODY` - Body content for order emails
- `AZURE_STORAGE_CONNECTION_STRING` - Azure Storage connection for order tracking

See [GMAIL_SETUP.md](GMAIL_SETUP.md) for Gmail API setup instructions.

## Cost Optimization

This serverless implementation reduces costs significantly:
- **Before**: ~$60-70/month (Azure Container Instances, always-on)
- **After**: ~$1-2/month (Azure Functions Consumption plan, pay-per-execution)
- **Dependencies optimized**: From 1.5GB to 40MB (97% reduction)

## Development

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation and development guidelines.

## License

ISC
