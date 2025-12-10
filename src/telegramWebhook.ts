import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import bot, { setLogger } from './shared/bot';
import { contextLogger } from './shared/utils/logger';

/**
 * Azure Function: Telegram Webhook Handler
 * Receives updates from Telegram via webhook and processes them with the bot instance
 *
 * Security: Validates X-Telegram-Bot-Api-Secret-Token header to ensure requests come from Telegram
 */
export async function telegramWebhook(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Inject Azure Functions context logger into bot handlers
  setLogger(contextLogger(context));

  try {
    // Security: Verify Telegram secret token
    const expectedSecret = process.env.TELEGRAM_SECRET_TOKEN;
    const receivedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');

    if (!expectedSecret) {
      context.error('TELEGRAM_SECRET_TOKEN not configured - webhook is INSECURE!');
      // Allow requests if not configured (backward compatibility during migration)
      // TODO: Make this mandatory after initial deployment
    } else if (receivedSecret !== expectedSecret) {
      context.warn('Unauthorized webhook request - invalid or missing secret token');
      context.warn(`Received from IP: ${request.headers.get('X-Forwarded-For') || 'unknown'}`);
      return {
        status: 403,
        body: 'Forbidden'
      };
    } else {
      context.log('✓ Webhook request authenticated successfully');
    }

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
