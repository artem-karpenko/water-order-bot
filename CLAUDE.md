# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Water Order Bot is a TypeScript/Node.js application that combines a Telegram bot with an HTTP API, designed for serverless deployment (AWS Lambda). The bot allows users to order water delivery through Telegram, while the HTTP API provides programmatic access. Uses Express.js with serverless-http wrapper and Telegraf for Telegram bot functionality. Currently has no database - stateless operations only.

## Development Commands

### HTTP API Server

```bash
# Development (with hot reload)
npm run dev

# Run production build locally
npm run start
```

The dev server runs on port 3000 by default (configurable via PORT environment variable).

### Telegram Bot

```bash
# Run bot in development mode with polling (with hot reload)
npm run dev:bot

# Run production bot with polling
npm run start:bot
```

The bot requires `TELEGRAM_BOT_TOKEN` environment variable. The application uses `dotenv` to load environment variables from a `.env` file. Copy `.env.example` to `.env` and add your bot token.

### Build Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Clean build artifacts
npm run clean
```

## Docker

```bash
# Build Docker image
docker build -t water-order-bot .

# Run container
docker run -p 3000:3000 water-order-bot

# Run with custom port
docker run -p 8080:3000 -e PORT=3000 water-order-bot
```

The Dockerfile uses a multi-stage build to create a lean production image. The build stage compiles TypeScript, and the production stage only includes runtime dependencies and compiled JavaScript.

## Architecture

### Entry Points

The application has multiple entry points depending on deployment mode:

**HTTP API:**
1. **Local Development** (`src/index.ts`): Standard Express server that listens on a port for local testing
2. **AWS Lambda** (`src/handler.ts`): Serverless wrapper that exports a Lambda handler function

**Telegram Bot:**
3. **Standalone Bot** (`src/bot-standalone.ts`): Runs the bot in polling mode for development and traditional server deployments
4. **Webhook Mode**: The bot integrates with the Express app via `/telegram-webhook` endpoint for serverless deployments

### Key Files

- `src/app.ts`: Core Express application with middleware, HTTP routes, and Telegram webhook endpoint
- `src/bot.ts`: Telegram bot logic using Telegraf - defines commands and message handlers
- `src/bot-standalone.ts`: Entry point for running the bot in polling mode
- `src/index.ts`: Local development server entry point for HTTP API
- `src/handler.ts`: AWS Lambda handler using serverless-http wrapper
- `tsconfig.json`: TypeScript compilation config (ES2020 target, CommonJS modules)
- `dist/`: Compiled JavaScript output (gitignored)

### Telegram Bot Architecture

The bot is built with Telegraf and supports two operational modes:

1. **Polling Mode** (Development/Traditional Servers): Bot actively polls Telegram for updates. Use `npm run dev:bot` or `npm run start:bot`.
2. **Webhook Mode** (Serverless/Production): Telegram sends updates to `/telegram-webhook` endpoint. Configure webhook URL in Telegram using their Bot API.

**Current Bot Features:**
- `/start` command: Displays greeting message and shows "Order water" keyboard button
- "Order water" button handler: Responds with placeholder message

The same bot instance (`src/bot.ts`) works in both modes. The standalone file uses polling, while the Express app handles webhooks.

### Serverless Design

The application is designed for occasional, on-demand use:
- No persistent connections or state
- Uses serverless-http to adapt Express for Lambda's event-driven model
- API Gateway events are automatically translated to Express req/res objects
- Bot can work via webhooks in serverless environments (no polling needed)
- No database currently - extend with DynamoDB or other serverless DB when needed

### Adding Features

- **HTTP Routes**: Add new routes in `src/app.ts`. They will automatically work in both local dev and Lambda environments.
- **Bot Commands**: Add new commands and handlers in `src/bot.ts`. They will work in both polling and webhook modes.
