import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import bot from './bot';

// Start bot in polling mode (for local development)
bot.launch()
  .then(() => {
    console.log('Telegram bot started in polling mode');
  })
  .catch((error) => {
    console.error('Failed to start bot:', error);
    process.exit(1);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
