/**
 * Order Tracker Service
 * Manages pending water delivery orders and tracks email replies
 */

interface PendingOrder {
  chatId: number;
  userId: number;
  messageId: number;
  emailSentTo: string;
  emailSubject: string;
  sentAt: Date;
  emailMessageId?: string; // Gmail message ID for tracking replies
}

class OrderTrackerService {
  private pendingOrders: Map<string, PendingOrder> = new Map();

  /**
   * Add a new pending order to track
   */
  addPendingOrder(order: PendingOrder): string {
    // Generate unique tracking ID
    const trackingId = `${order.chatId}-${order.userId}-${Date.now()}`;
    this.pendingOrders.set(trackingId, order);

    console.log(`📝 Tracking new order: ${trackingId}`);
    console.log(`   Chat: ${order.chatId}, User: ${order.userId}`);
    console.log(`   Sent to: ${order.emailSentTo}`);

    return trackingId;
  }

  /**
   * Get all pending orders
   */
  getPendingOrders(): Map<string, PendingOrder> {
    return this.pendingOrders;
  }

  /**
   * Get a specific pending order
   */
  getPendingOrder(trackingId: string): PendingOrder | undefined {
    return this.pendingOrders.get(trackingId);
  }

  /**
   * Mark order as completed (reply received)
   */
  completePendingOrder(trackingId: string): void {
    const order = this.pendingOrders.get(trackingId);
    if (order) {
      console.log(`✅ Completing order: ${trackingId}`);
      this.pendingOrders.delete(trackingId);
    }
  }

  /**
   * Get count of pending orders
   */
  getPendingCount(): number {
    return this.pendingOrders.size;
  }

  /**
   * Clear old pending orders (older than specified hours)
   */
  clearOldOrders(hoursOld: number = 24): void {
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    let cleared = 0;

    for (const [trackingId, order] of this.pendingOrders.entries()) {
      if (order.sentAt < cutoffTime) {
        this.pendingOrders.delete(trackingId);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} old pending orders (older than ${hoursOld}h)`);
    }
  }
}

// Export singleton instance
export const orderTracker = new OrderTrackerService();
export type { PendingOrder };
