import dotenv from 'dotenv';

// Load environment variables from .env file (only in dev)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import app from './app';

const PORT = process.env.PORT || 3000;

console.log('Starting Water Order Bot HTTP Server...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`✓ Server is running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ Telegram webhook: http://localhost:${PORT}/telegram-webhook`);
  console.log('='.repeat(50));
});
