import { Telegraf, Markup } from 'telegraf';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
}

const bot = new Telegraf(BOT_TOKEN);

// Handle /start command
bot.command('start', async (ctx) => {
  const keyboard = Markup.keyboard([
    [Markup.button.text('Order water')]
  ]).resize();

  await ctx.reply(
    'This bot can order water delivery for you',
    keyboard
  );
});

// Handle "Order water" button
bot.hears('Order water', async (ctx) => {
  await ctx.reply('This command will allow you to order delivery');
});

export default bot;
