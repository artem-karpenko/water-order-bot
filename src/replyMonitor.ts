import { app, InvocationContext, Timer } from "@azure/functions";
import { Telegraf, Markup } from 'telegraf';
import { GmailService } from './shared/services/gmailService';
import { orderTracker } from './shared/services/azureTableOrderTracker';
import { contextLogger } from './shared/utils/logger';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

// Create bot instance for sending notifications
const bot = new Telegraf(BOT_TOKEN);

/**
 * Azure Function: Reply Monitor (Timer Trigger)
 * Runs every 2 minutes to check for email replies to water delivery orders
 */
export async function replyMonitor(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('Reply monitor triggered at:', new Date().toISOString());

  try {
    const logger = contextLogger(context);
    const gmailService = new GmailService(logger);

    // Inject context logger into singleton orderTracker
    orderTracker.setLogger(logger);

    const pendingOrders = await orderTracker.getPendingOrders();
    const pendingCount = await orderTracker.getPendingCount();

    context.log(`📊 Reply monitor check - found ${pendingCount} pending orders`);

    if (pendingCount === 0) {
      context.log('📭 No pending orders to check');
      return;
    }

    context.log(`📬 Checking ${pendingCount} pending orders for replies...`);

    for (const [trackingId, order] of pendingOrders.entries()) {
      try {
        context.log(`🔍 Checking order ${trackingId} - sent to: ${order.emailSentTo}, subject: ${order.emailSubject}, date: ${order.sentAt}`);

        // Check for reply from the email recipient
        const reply = await gmailService.checkForReply(
          order.emailSentTo,
          order.emailSubject,
          order.sentAt
        );

        if (reply) {
          context.log(`✉️  Reply received for order ${trackingId}!`);
          context.log(`Reply content: ${reply.body.substring(0, 200)}...`);

          // Send notification (but don't let failure prevent order completion)
          try {
            await sendReplyNotification(bot, order.chatId, reply.body, context);
          } catch (error) {
            context.error(`Failed to send notification for order ${trackingId}:`, error);
            context.warn('Order will still be marked as completed despite notification failure');
          }

          // Mark as completed (always execute, even if notification failed)
          await orderTracker.completePendingOrder(trackingId);
        } else {
          context.log(`📭 No reply yet for order ${trackingId}`);
          // Check if reminder should be sent
          await checkAndSendReminder(bot, trackingId, order, context);
        }
      } catch (error) {
        context.error(`Error checking order ${trackingId}:`, error);
        // Continue checking other orders
      }
    }

    context.log('✅ Reply monitor check completed');
  } catch (error) {
    context.error('Error in reply monitor:', error);
  }
}

/**
 * Send Telegram notification about email reply
 */
async function sendReplyNotification(
  bot: Telegraf,
  chatId: number,
  replyBody: string,
  context: InvocationContext
): Promise<void> {
  try {
    const MAX_REPLY_LENGTH = 500;
    const truncatedReply = replyBody.length > MAX_REPLY_LENGTH
      ? replyBody.substring(0, MAX_REPLY_LENGTH) + '...'
      : replyBody;

    const message = `📨 *Reply Received!*\n\n` +
      `You have a new reply to your water delivery order:\n\n` +
      `${truncatedReply}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('💧 Order water', 'action_order_water')],
      [Markup.button.callback('📧 Read latest email', 'action_read_email')]
    ]);

    await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard.reply_markup
    });
    context.log(`✅ Notification sent to chat ${chatId}`);
  } catch (error) {
    context.error(`Error sending notification to chat ${chatId}:`, error);
    // Re-throw to let caller decide how to handle
    throw error;
  }
}

/**
 * Check if reminder should be sent and send it
 */
async function checkAndSendReminder(
  bot: Telegraf,
  trackingId: string,
  order: any,
  context: InvocationContext
): Promise<void> {
  const now = new Date();
  const hoursSinceOrder = (now.getTime() - order.sentAt.getTime()) / (1000 * 60 * 60);
  const lastReferenceTime = order.lastReminderAt || order.sentAt;
  const hoursSinceLastReminder = (now.getTime() - lastReferenceTime.getTime()) / (1000 * 60 * 60);

  // Send reminder if 24 hours have passed since last reminder (or since order was sent)
  if (hoursSinceLastReminder >= 24) {
    try {
      const message = `⏰ *No answer yet*\n\n` +
        `Your water delivery order sent ${Math.floor(hoursSinceOrder)} hours ago has not been answered yet.\n\n` +
        `I'll keep checking and notify you when a reply arrives.`;

      await bot.telegram.sendMessage(order.chatId, message, { parse_mode: 'Markdown' });
      context.log(`⏰ Reminder sent for order ${trackingId} (${Math.floor(hoursSinceOrder)}h old)`);

      await orderTracker.updateLastReminder(trackingId);
    } catch (error) {
      context.error(`Error sending reminder for order ${trackingId}:`, error);
    }
  }
}

// Register timer trigger function (runs every 2 minutes)
app.timer('replyMonitor', {
  schedule: '0 */2 * * * *', // Every 2 minutes (seconds, minutes, hours, day, month, day-of-week)
  handler: replyMonitor
});
