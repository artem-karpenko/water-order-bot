import { Telegraf, Markup, Context } from 'telegraf';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
}

// Parse whitelisted user IDs from environment variable
const WHITELISTED_USER_IDS = process.env.WHITELISTED_USER_IDS
  ? process.env.WHITELISTED_USER_IDS.split(',').map(id => parseInt(id.trim()))
  : [];

console.log(`Whitelisted user IDs: ${WHITELISTED_USER_IDS.join(', ') || 'None (all users DENIED)'}`);

const bot = new Telegraf(BOT_TOKEN);

// Middleware to check if user is authorized
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;

  // If no whitelist configured, reject all users
  if (WHITELISTED_USER_IDS.length === 0) {
    console.log('='.repeat(50));
    console.log('⚠️  Access denied - No whitelist configured');
    console.log(`User ID: ${userId}`);
    console.log(`Username: @${ctx.from?.username || 'N/A'}`);
    console.log(`Name: ${ctx.from?.first_name} ${ctx.from?.last_name || ''}`);
    console.log('='.repeat(50));
    await ctx.reply('User not recognized');
    return;
  }

  // Check if user is whitelisted
  if (userId && WHITELISTED_USER_IDS.includes(userId)) {
    console.log(`✓ Authorized user: ${userId}`);
    return next();
  }

  // Log unauthorized access attempt
  console.log('='.repeat(50));
  console.log('⚠️  Unauthorized access attempt');
  console.log(`User ID: ${userId}`);
  console.log(`Username: @${ctx.from?.username || 'N/A'}`);
  console.log(`Name: ${ctx.from?.first_name} ${ctx.from?.last_name || ''}`);
  console.log('='.repeat(50));

  // Respond to unauthorized user
  await ctx.reply('User not recognized');
});

// Handle /start command
bot.command('start', async (ctx) => {
  const user = ctx.from;
  console.log('='.repeat(50));
  console.log('User interaction: /start command');
  console.log(`User ID: ${user?.id}`);
  console.log(`Username: @${user?.username || 'N/A'}`);
  console.log(`Name: ${user?.first_name} ${user?.last_name || ''}`);
  console.log('='.repeat(50));

  const keyboard = Markup.keyboard([
    [Markup.button.text('Order water')],
    [Markup.button.text('Read latest email')]
  ]).resize();

  await ctx.reply(
    'This bot can order water delivery for you',
    keyboard
  );
});

// Handle "Order water" button
bot.hears('Order water', async (ctx) => {
  const user = ctx.from;
  console.log('='.repeat(50));
  console.log('User interaction: Order water button');
  console.log(`User ID: ${user?.id}`);
  console.log(`Username: @${user?.username || 'N/A'}`);
  console.log(`Name: ${user?.first_name} ${user?.last_name || ''}`);
  console.log('='.repeat(50));

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
});

// Handle "Read latest email" button
bot.hears('Read latest email', async (ctx) => {
  const user = ctx.from;
  console.log('='.repeat(50));
  console.log('User interaction: Read latest email button');
  console.log(`User ID: ${user?.id}`);
  console.log(`Username: @${user?.username || 'N/A'}`);
  console.log(`Name: ${user?.first_name} ${user?.last_name || ''}`);
  console.log('='.repeat(50));

  try {
    const { GmailService } = await import('./services/gmailService');
    const senderEmail = process.env.EMAIL_SENDER_FILTER;

    if (!senderEmail) {
      await ctx.reply('Error: EMAIL_SENDER_FILTER not configured');
      return;
    }

    await ctx.reply('Fetching latest email...');

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

    await ctx.reply(formattedMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error reading email:', error);
    await ctx.reply('Failed to fetch email. Please check the logs for details.');
  }
});

// Handle "Cancel" inline button
bot.action('cancel_order', async (ctx) => {
  console.log('='.repeat(50));
  console.log('User interaction: Cancel order button');
  console.log(`User ID: ${ctx.from?.id}`);
  console.log('='.repeat(50));

  // Edit the message and remove inline keyboard
  await ctx.editMessageText('Delivery not confirmed');

  // Acknowledge the callback query
  await ctx.answerCbQuery();
});

// Handle "Yes, send email" inline button
bot.action('confirm_order', async (ctx) => {
  console.log('='.repeat(50));
  console.log('User interaction: Confirm order button');
  console.log(`User ID: ${ctx.from?.id}`);
  console.log('='.repeat(50));

  // Just acknowledge for now (will implement email sending later)
  await ctx.answerCbQuery('Email sending will be implemented');
});

export default bot;
