import { Telegraf, Markup } from 'telegraf';
import { orderTracker } from './services/azureTableOrderTracker';
import { Logger, consoleLogger } from './utils/logger';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
}

// Parse whitelisted user IDs from environment variable
const WHITELISTED_USER_IDS = process.env.WHITELISTED_USER_IDS
  ? process.env.WHITELISTED_USER_IDS.split(',').map(id => parseInt(id.trim()))
  : [];

// Logger that can be injected from Azure Functions context
let currentLogger: Logger = consoleLogger;

export function setLogger(logger: Logger) {
  currentLogger = logger;
  // Also inject logger into orderTracker singleton
  orderTracker.setLogger(logger);
}

currentLogger.log(`Whitelisted user IDs: ${WHITELISTED_USER_IDS.join(', ') || 'None (all users DENIED)'}`);
currentLogger.log(`Email sender filter: ${process.env.EMAIL_SENDER_FILTER || 'NOT CONFIGURED'}`);
currentLogger.log(`Email order subject: ${process.env.EMAIL_ORDER_SUBJECT || 'Water Delivery Order (default)'}`);
currentLogger.log(`Email order body: ${process.env.EMAIL_ORDER_BODY || 'Please deliver water. (default)'}`);

const bot = new Telegraf(BOT_TOKEN);

// Middleware to check if user is authorized
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;

  // If no whitelist configured, reject all users
  if (WHITELISTED_USER_IDS.length === 0) {
    currentLogger.log('='.repeat(50));
    currentLogger.log('⚠️  Access denied - No whitelist configured');
    currentLogger.log(`User ID: ${userId}`);
    currentLogger.log(`Username: @${ctx.from?.username || 'N/A'}`);
    currentLogger.log(`Name: ${ctx.from?.first_name} ${ctx.from?.last_name || ''}`);
    currentLogger.log('='.repeat(50));
    await ctx.reply('User not recognized');
    return;
  }

  // Check if user is whitelisted
  if (userId && WHITELISTED_USER_IDS.includes(userId)) {
    currentLogger.log(`✓ Authorized user: ${userId}`);
    return next();
  }

  // Log unauthorized access attempt
  currentLogger.log('='.repeat(50));
  currentLogger.log('⚠️  Unauthorized access attempt');
  currentLogger.log(`User ID: ${userId}`);
  currentLogger.log(`Username: @${ctx.from?.username || 'N/A'}`);
  currentLogger.log(`Name: ${ctx.from?.first_name} ${ctx.from?.last_name || ''}`);
  currentLogger.log('='.repeat(50));

  // Respond to unauthorized user
  await ctx.reply('User not recognized');
});

// Handle /start command
bot.command('start', async (ctx) => {
  const user = ctx.from;
  currentLogger.log('='.repeat(50));
  currentLogger.log('User interaction: /start command');
  currentLogger.log(`User ID: ${user?.id}`);
  currentLogger.log(`Username: @${user?.username || 'N/A'}`);
  currentLogger.log(`Name: ${user?.first_name} ${user?.last_name || ''}`);
  currentLogger.log('='.repeat(50));

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💧 Order water', 'action_order_water')],
    [Markup.button.callback('📧 Read latest email', 'action_read_email')]
  ]);

  await ctx.reply(
    'This bot can order water delivery for you.\n\nChoose an action:',
    keyboard
  );
});

// Handle "Order water" inline button
bot.action('action_order_water', async (ctx) => {
  const user = ctx.from;
  currentLogger.log('='.repeat(50));
  currentLogger.log('User interaction: Order water button');
  currentLogger.log(`User ID: ${user?.id}`);
  currentLogger.log(`Username: @${user?.username || 'N/A'}`);
  currentLogger.log(`Name: ${user?.first_name} ${user?.last_name || ''}`);
  currentLogger.log('='.repeat(50));

  // Show message with inline keyboard
  await ctx.reply(
    'Do you want to order water now?',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('Yes, send email', 'confirm_order'),
        Markup.button.callback('Cancel', 'cancel_order')
      ]
    ])
  );

  // Answer the callback query to remove loading state
  await ctx.answerCbQuery();
});

// Handle "Read latest email" inline button
bot.action('action_read_email', async (ctx) => {
  const user = ctx.from;
  currentLogger.log('='.repeat(50));
  currentLogger.log('User interaction: Read latest email button');
  currentLogger.log(`User ID: ${user?.id}`);
  currentLogger.log(`Username: @${user?.username || 'N/A'}`);
  currentLogger.log(`Name: ${user?.first_name} ${user?.last_name || ''}`);
  currentLogger.log('='.repeat(50));

  try {
    const { GmailService } = await import('./services/gmailService');
    const senderEmail = process.env.EMAIL_SENDER_FILTER;

    if (!senderEmail) {
      await ctx.answerCbQuery('Error: EMAIL_SENDER_FILTER not configured');
      await ctx.reply('Error: EMAIL_SENDER_FILTER not configured');
      return;
    }

    currentLogger.log(`Querying emails from: ${senderEmail}`);
    // Show loading message via callback query answer
    await ctx.answerCbQuery('Fetching latest email...');

    const gmailService = new GmailService();
    const email = await gmailService.getLatestEmailFromSender(senderEmail);

    if (!email) {
      await ctx.reply(`No emails found from ${senderEmail}`);
      return;
    }

    // Limit body to 100 characters
    const MAX_BODY_LENGTH = 100;
    const truncatedBody = email.body.length > MAX_BODY_LENGTH
      ? email.body.substring(0, MAX_BODY_LENGTH) + '...'
      : email.body;

    // Format the email message
    const formattedMessage = `📧 *Latest Email*\n\n` +
      `📅 *Date:* ${email.date}\n` +
      `👤 *From:* ${email.sender}\n` +
      `📝 *Subject:* ${email.subject}\n\n` +
      `*Body:*\n${truncatedBody}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('💧 Order water', 'action_order_water')],
      [Markup.button.callback('📧 Read latest email', 'action_read_email')]
    ]);

    await ctx.reply(formattedMessage, { parse_mode: 'Markdown', ...keyboard });
  } catch (error) {
    currentLogger.error('Error reading email:', error);
    await ctx.answerCbQuery('Failed to fetch email');
    await ctx.reply('Failed to fetch email. Please check the logs for details.');
  }
});

// Handle "Cancel" inline button
bot.action('cancel_order', async (ctx) => {
  currentLogger.log('='.repeat(50));
  currentLogger.log('User interaction: Cancel order button');
  currentLogger.log(`User ID: ${ctx.from?.id}`);
  currentLogger.log('='.repeat(50));

  // Edit the message and remove inline keyboard
  await ctx.editMessageText('Delivery not confirmed');

  // Acknowledge the callback query
  await ctx.answerCbQuery();
});

// Handle "Yes, send email" inline button
bot.action('confirm_order', async (ctx) => {
  currentLogger.log('='.repeat(50));
  currentLogger.log('User interaction: Confirm order button');
  currentLogger.log(`User ID: ${ctx.from?.id}`);
  currentLogger.log('='.repeat(50));

  try {
    // Check if there's already a pending order for this user in this chat
    const existingOrder = await orderTracker.hasPendingOrder(ctx.chat!.id, ctx.from!.id);

    if (existingOrder) {
      const hoursSinceOrder = (new Date().getTime() - existingOrder.sentAt.getTime()) / (1000 * 60 * 60);
      const timeAgo = hoursSinceOrder < 1
        ? `${Math.floor(hoursSinceOrder * 60)} minutes ago`
        : `${Math.floor(hoursSinceOrder)} hours ago`;

      await ctx.answerCbQuery('You already have a pending order');
      await ctx.editMessageText(
        `⏳ *Pending Order*\n\n` +
        `You already have an order waiting for reply.\n\n` +
        `📅 *Sent:* ${timeAgo}\n` +
        `📧 *To:* ${existingOrder.emailSentTo}\n\n` +
        `Please wait for a response before ordering again.`,
        { parse_mode: 'Markdown' }
      );

      currentLogger.log(`Order rejected - pending order exists (sent ${timeAgo})`);
      return;
    }

    const { GmailService } = await import('./services/gmailService');
    const recipientEmail = process.env.EMAIL_SENDER_FILTER;
    const emailSubject = process.env.EMAIL_ORDER_SUBJECT || 'Water Delivery Order';
    const emailBody = process.env.EMAIL_ORDER_BODY || 'Please deliver water.';

    if (!recipientEmail) {
      await ctx.answerCbQuery('Error: EMAIL_SENDER_FILTER not configured');
      await ctx.editMessageText('Error: Email recipient not configured');
      return;
    }

    // Update message to show sending status
    await ctx.editMessageText('Sending email...');

    // Send the email
    currentLogger.log(`Sending email to: ${recipientEmail}`);
    currentLogger.log(`Subject: ${emailSubject}`);
    currentLogger.log(`Body: ${emailBody}`);
    const gmailService = new GmailService();
    const emailMessageId = await gmailService.sendEmail(recipientEmail, emailSubject, emailBody);

    // Track this order for reply monitoring
    const trackingId = await orderTracker.addPendingOrder({
      chatId: ctx.chat!.id,
      userId: ctx.from!.id,
      messageId: ctx.callbackQuery!.message!.message_id,
      emailSentTo: recipientEmail,
      emailSubject: emailSubject,
      sentAt: new Date(),
      emailMessageId: emailMessageId
    });

    // Update message to confirm success
    await ctx.editMessageText('✅ Email sent! Your water delivery order has been submitted.\n\n💡 I\'ll notify you when you receive a reply.');
    await ctx.answerCbQuery('Email sent successfully');
  } catch (error) {
    currentLogger.error('Error sending order email:', error);
    await ctx.editMessageText('❌ Failed to send email. Please try again or contact support.');
    await ctx.answerCbQuery('Failed to send email');
  }
});

// Export bot instance for use in Azure Functions
// NOTE: Do NOT call bot.launch() - webhook mode only
export default bot;
