import express, { Request, Response } from 'express';
import bot from './bot';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Water Order Bot API',
    version: '1.0.0'
  });
});

// Example water order endpoint
app.post('/orders', (req: Request, res: Response) => {
  const { quantity, address } = req.body;

  if (!quantity || !address) {
    return res.status(400).json({
      error: 'Missing required fields: quantity and address'
    });
  }

  // TODO: Implement order processing logic
  res.json({
    orderId: `ORDER-${Date.now()}`,
    quantity,
    address,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
});

// Telegram bot webhook endpoint
// This endpoint receives updates from Telegram when using webhooks
app.post('/telegram-webhook', async (req: Request, res: Response) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling Telegram update:', error);
    res.sendStatus(500);
  }
});

export default app;
