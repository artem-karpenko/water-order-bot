# Water Order Bot

A Telegram bot for ordering water delivery, built with TypeScript, Node.js, and designed for serverless deployment.

## Features

- **Telegram Bot Interface**: Users can interact with the bot through Telegram
- **HTTP API**: RESTful API for programmatic access
- **Serverless Ready**: Designed for AWS Lambda deployment
- **Dual Bot Modes**: Supports both polling (development) and webhook (production) modes

## Quick Start

### Prerequisites

- Node.js 20 or higher
- A Telegram Bot Token (get one from [@BotFather](https://t.me/botfather))

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your Telegram bot token to .env
# TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### Running the Bot

```bash
# Development mode with hot reload
npm run dev:bot

# Production mode
npm run build
npm run start:bot
```

### Running the HTTP API

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm run start
```

## Bot Commands

- `/start` - Start the bot and see the main menu

## Current Features

When you start the bot with `/start`, it will:
1. Display a greeting: "This bot can order water delivery for you"
2. Show a keyboard with "Order water" button
3. Respond to button presses with a placeholder message

## Deployment

### Docker

```bash
docker build -t water-order-bot .
docker run -p 3000:3000 -e TELEGRAM_BOT_TOKEN=your_token water-order-bot
```

### AWS Lambda

The bot can be deployed to AWS Lambda using the webhook mode. The Express app handles Telegram updates via the `/telegram-webhook` endpoint.

## Project Structure

```
src/
├── app.ts              # Express application with HTTP routes and webhook
├── bot.ts              # Telegram bot logic (commands and handlers)
├── bot-standalone.ts   # Standalone bot runner (polling mode)
├── index.ts            # HTTP server entry point
└── handler.ts          # AWS Lambda handler
```

## Development

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation and development guidelines.

## License

ISC
