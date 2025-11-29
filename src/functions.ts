/**
 * Azure Functions Entry Point
 * This file imports all function definitions to register them with the Functions runtime
 */

// Import function definitions to register them with @azure/functions app
import './telegramWebhook';
import './replyMonitor';

// Functions are auto-registered via the imports above
console.log('Azure Functions loaded: telegramWebhook, replyMonitor');
