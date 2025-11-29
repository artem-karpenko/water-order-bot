import dotenv from 'dotenv';

// Load environment variables from .env file (only in dev)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import bot from './bot';
import app from './app';
import { ReplyMonitorService } from './services/replyMonitor';

const PORT = process.env.PORT || 3000;
const REPLY_CHECK_INTERVAL = parseInt(process.env.REPLY_CHECK_INTERVAL_MINUTES || '2');

console.log('Starting Water Order Bot with HTTP server...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);

// Start HTTP server for health checks and webhooks
const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`✓ HTTP server running on port ${PORT}`);
  console.log(`✓ Health endpoint: http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
});

// Initialize reply monitor
const replyMonitor = new ReplyMonitorService(bot);

// Start bot in polling mode
bot.launch(() => {
    console.log('='.repeat(50));
    console.log('✓ Telegram bot started successfully');
    console.log('✓ Mode: Polling');
    console.log('✓ Waiting for messages...');
    console.log('='.repeat(50));

    // Start reply monitoring
    replyMonitor.start(REPLY_CHECK_INTERVAL);
  })
  .catch((error) => {
    console.error('✗ Failed to start bot:', error);
    process.exit(1);
  });

// Enable graceful stop
process.once('SIGINT', () => {
  console.log('Shutting down gracefully...');
  replyMonitor.stop();
  bot.stop('SIGINT');
  server.close();
});
process.once('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  replyMonitor.stop();
  bot.stop('SIGTERM');
  server.close();
});
