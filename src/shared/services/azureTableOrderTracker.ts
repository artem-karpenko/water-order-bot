/**
 * Azure Table Storage Order Tracker Service
 * Persists pending water delivery orders in Azure Table Storage
 */

import { TableClient, TableEntity } from '@azure/data-tables';
import { Logger, consoleLogger } from '../utils/logger';

interface PendingOrder {
  chatId: number;
  userId: number;
  messageId: number;
  emailSentTo: string;
  emailSubject: string;
  sentAt: Date;
  emailMessageId?: string;
  lastReminderAt?: Date;
}

interface OrderEntity extends TableEntity {
  chatId: number;
  userId: number;
  messageId: number;
  emailSentTo: string;
  emailSubject: string;
  sentAt: string; // ISO string for serialization
  emailMessageId?: string;
  lastReminderAt?: string; // ISO string for serialization
}

class AzureTableOrderTrackerService {
  private tableClient: TableClient | null = null;
  private tableName = 'PendingOrders';
  private initializationPromise: Promise<void> | null = null;
  private logger: Logger;

  constructor(logger: Logger = consoleLogger) {
    this.logger = logger;
    // Lazy initialization - connect when first operation is called
  }

  /**
   * Set logger for the service (useful for singleton instances)
   */
  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * Initialize the table client
   */
  private async initialize(): Promise<void> {
    if (this.tableClient) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

      if (!connectionString) {
        this.logger.error('⚠️  AZURE_STORAGE_CONNECTION_STRING not configured - order persistence disabled');
        this.logger.error('   Orders will not persist across restarts!');
        return;
      }

      try {
        this.tableClient = TableClient.fromConnectionString(
          connectionString,
          this.tableName
        );

        // Create table if it doesn't exist
        await this.tableClient.createTable();
        this.logger.log(`✓ Connected to Azure Table Storage: ${this.tableName}`);
      } catch (error: any) {
        if (error?.statusCode === 409) {
          // Table already exists - this is fine
          this.logger.log(`✓ Using existing Azure Table: ${this.tableName}`);
        } else {
          this.logger.error('✗ Failed to initialize Azure Table Storage:', error);
          this.tableClient = null;
        }
      }
    })();

    await this.initializationPromise;
  }

  /**
   * Add a new pending order to track
   */
  async addPendingOrder(order: PendingOrder): Promise<string> {
    await this.initialize();

    // Generate unique tracking ID (use underscore to avoid conflicts with negative chatIds)
    const trackingId = `${order.chatId}_${order.userId}_${Date.now()}`;

    if (!this.tableClient) {
      this.logger.error('⚠️  Azure Table Storage not available - order not persisted');
      return trackingId;
    }

    try {
      const entity: OrderEntity = {
        partitionKey: order.userId.toString(),
        rowKey: trackingId,
        chatId: order.chatId,
        userId: order.userId,
        messageId: order.messageId,
        emailSentTo: order.emailSentTo,
        emailSubject: order.emailSubject,
        sentAt: order.sentAt.toISOString(),
        emailMessageId: order.emailMessageId,
      };

      await this.tableClient.createEntity(entity);

      this.logger.log(`📝 Tracking new order: ${trackingId}`);
      this.logger.log(`   Chat: ${order.chatId}, User: ${order.userId}`);
      this.logger.log(`   Sent to: ${order.emailSentTo}`);
      this.logger.log(`   📊 Persisted to Azure Table Storage`);

      return trackingId;
    } catch (error) {
      this.logger.error('Error adding order to Azure Table:', error);
      throw error;
    }
  }

  /**
   * Get all pending orders
   */
  async getPendingOrders(): Promise<Map<string, PendingOrder>> {
    await this.initialize();

    const orders = new Map<string, PendingOrder>();

    if (!this.tableClient) {
      this.logger.error('⚠️  Azure Table Storage not available');
      return orders;
    }

    try {
      const entities = this.tableClient.listEntities<OrderEntity>();

      for await (const entity of entities) {
        const order: PendingOrder = {
          chatId: entity.chatId,
          userId: entity.userId,
          messageId: entity.messageId,
          emailSentTo: entity.emailSentTo,
          emailSubject: entity.emailSubject,
          sentAt: new Date(entity.sentAt),
          emailMessageId: entity.emailMessageId,
          lastReminderAt: entity.lastReminderAt ? new Date(entity.lastReminderAt) : undefined,
        };

        orders.set(entity.rowKey!, order);
      }

      return orders;
    } catch (error) {
      this.logger.error('Error fetching orders from Azure Table:', error);
      return orders;
    }
  }

  /**
   * Get a specific pending order
   */
  async getPendingOrder(trackingId: string): Promise<PendingOrder | undefined> {
    await this.initialize();

    if (!this.tableClient) {
      return undefined;
    }

    try {
      // Extract userId from tracking ID (format: chatId_userId_timestamp)
      const parts = trackingId.split('_');
      const userId = parts[1];

      const entity = await this.tableClient.getEntity<OrderEntity>(
        userId,
        trackingId
      );

      return {
        chatId: entity.chatId,
        userId: entity.userId,
        messageId: entity.messageId,
        emailSentTo: entity.emailSentTo,
        emailSubject: entity.emailSubject,
        sentAt: new Date(entity.sentAt),
        emailMessageId: entity.emailMessageId,
        lastReminderAt: entity.lastReminderAt ? new Date(entity.lastReminderAt) : undefined,
      };
    } catch (error: any) {
      if (error?.statusCode === 404) {
        return undefined;
      }
      this.logger.error('Error fetching order from Azure Table:', error);
      return undefined;
    }
  }

  /**
   * Mark order as completed (reply received)
   */
  async completePendingOrder(trackingId: string): Promise<void> {
    await this.initialize();

    if (!this.tableClient) {
      return;
    }

    try {
      // Extract userId from tracking ID (format: chatId_userId_timestamp)
      const parts = trackingId.split('_');
      const userId = parts[1];

      await this.tableClient.deleteEntity(userId, trackingId);
      this.logger.log(`✅ Completing order: ${trackingId}`);
    } catch (error: any) {
      if (error?.statusCode !== 404) {
        this.logger.error('Error deleting order from Azure Table:', error);
      }
    }
  }

  /**
   * Get count of pending orders
   */
  async getPendingCount(): Promise<number> {
    await this.initialize();

    if (!this.tableClient) {
      return 0;
    }

    try {
      let count = 0;
      const entities = this.tableClient.listEntities();

      for await (const _ of entities) {
        count++;
      }

      return count;
    } catch (error) {
      this.logger.error('Error counting orders in Azure Table:', error);
      return 0;
    }
  }

  /**
   * Update the last reminder time for an order
   */
  async updateLastReminder(trackingId: string): Promise<void> {
    await this.initialize();

    if (!this.tableClient) {
      return;
    }

    try {
      // Extract userId from tracking ID (format: chatId_userId_timestamp)
      const parts = trackingId.split('_');
      const userId = parts[1];

      const entity = await this.tableClient.getEntity<OrderEntity>(
        userId,
        trackingId
      );

      entity.lastReminderAt = new Date().toISOString();

      await this.tableClient.updateEntity(entity, 'Replace');
      this.logger.log(`🔔 Updated reminder time for order: ${trackingId}`);
    } catch (error) {
      this.logger.error('Error updating order in Azure Table:', error);
    }
  }
}

// Export singleton instance
export const orderTracker = new AzureTableOrderTrackerService();
export type { PendingOrder };
