/**
 * Reply Monitor Service
 * Periodically checks for email replies and sends Telegram notifications
 */

import { Telegraf } from 'telegraf';
import { GmailService } from './gmailService';
import { orderTracker } from './orderTracker';

export class ReplyMonitorService {
  private intervalId: NodeJS.Timeout | null = null;
  private bot: Telegraf;
  private gmailService: GmailService;
  private isChecking: boolean = false;

  constructor(bot: Telegraf) {
    this.bot = bot;
    this.gmailService = new GmailService();
  }

  /**
   * Start monitoring for email replies
   */
  start(intervalMinutes: number = 2): void {
    if (this.intervalId) {
      console.log('⚠️  Reply monitor is already running');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    console.log(`🔄 Starting reply monitor (checking every ${intervalMinutes} minutes)`);

    // Run initial check
    this.checkForReplies();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkForReplies();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Reply monitor stopped');
    }
  }

  /**
   * Check all pending orders for replies
   */
  private async checkForReplies(): Promise<void> {
    if (this.isChecking) {
      console.log('⏭️  Skipping check - previous check still running');
      return;
    }

    this.isChecking = true;

    try {
      const pendingOrders = orderTracker.getPendingOrders();
      const pendingCount = orderTracker.getPendingCount();

      if (pendingCount === 0) {
        console.log('📭 No pending orders to check');
        this.isChecking = false;
        return;
      }

      console.log(`📬 Checking ${pendingCount} pending orders for replies...`);

      for (const [trackingId, order] of pendingOrders.entries()) {
        try {
          // Check for reply from the email recipient
          const reply = await this.gmailService.checkForReply(
            order.emailSentTo,
            order.emailSubject,
            order.sentAt
          );

          if (reply) {
            console.log(`✉️  Reply received for order ${trackingId}!`);

            // Send notification to user
            await this.sendReplyNotification(order.chatId, reply.body);

            // Mark order as completed
            orderTracker.completePendingOrder(trackingId);
          }
        } catch (error) {
          console.error(`Error checking order ${trackingId}:`, error);
          // Continue checking other orders
        }
      }

      // Clean up old orders (older than 24 hours)
      orderTracker.clearOldOrders(24);

    } catch (error) {
      console.error('Error in reply monitor:', error);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Send Telegram notification about email reply
   */
  private async sendReplyNotification(chatId: number, replyBody: string): Promise<void> {
    try {
      // Limit reply body to 500 characters
      const MAX_REPLY_LENGTH = 500;
      const truncatedReply = replyBody.length > MAX_REPLY_LENGTH
        ? replyBody.substring(0, MAX_REPLY_LENGTH) + '...'
        : replyBody;

      const message = `📨 *Reply Received!*\n\n` +
        `You have a new reply to your water delivery order:\n\n` +
        `${truncatedReply}`;

      await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      console.log(`✅ Notification sent to chat ${chatId}`);
    } catch (error) {
      console.error(`Error sending notification to chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Get monitor status
   */
  getStatus(): { running: boolean; checking: boolean; pendingOrders: number } {
    return {
      running: this.intervalId !== null,
      checking: this.isChecking,
      pendingOrders: orderTracker.getPendingCount()
    };
  }
}
