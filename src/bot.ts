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

  await ctx.reply('This command will allow you to order delivery');
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

    // Format the email message
    const formattedMessage = `📧 *Latest Email*\n\n` +
      `📅 *Date:* ${email.date}\n` +
      `👤 *From:* ${email.sender}\n` +
      `📝 *Subject:* ${email.subject}\n\n` +
      `*Body:*\n${email.body}`;

    await ctx.reply(formattedMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error reading email:', error);
    await ctx.reply('Failed to fetch email. Please check the logs for details.');
  }
});

export default bot;
