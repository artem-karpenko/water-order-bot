import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import bot from './shared/bot';

/**
 * Azure Function: Telegram Webhook Handler
 * Receives updates from Telegram via webhook and processes them with the bot instance
 */
export async function telegramWebhook(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const update = await request.json() as any;
    context.log('Received Telegram update:', JSON.stringify(update, null, 2));

    // Process update with bot instance (webhook mode)
    await bot.handleUpdate(update);

    return {
      status: 200,
      body: 'OK'
    };
  } catch (error) {
    context.error('Error handling Telegram update:', error);
    return {
      status: 500,
      body: 'Internal Server Error'
    };
  }
}

// Register HTTP trigger function
app.http('telegramWebhook', {
  methods: ['POST'],
  route: 'telegram-webhook',
  authLevel: 'anonymous',
  handler: telegramWebhook
});
