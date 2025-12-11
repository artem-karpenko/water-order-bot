/**
 * Logger Interface for Azure Functions
 *
 * Provides a unified logging interface that works with both Azure Functions context
 * and standard console logging for backward compatibility.
 */

import { InvocationContext } from '@azure/functions';

/**
 * Unified logger interface
 */
export interface Logger {
  log(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
}

/**
 * Console-based logger (fallback for non-Azure environments)
 */
export const consoleLogger: Logger = {
  log: console.log,
  error: console.error,
  warn: console.warn,
};

/**
 * Create a logger from Azure Functions InvocationContext
 */
export function contextLogger(context: InvocationContext): Logger {
  return {
    log: (msg, ...args) => context.log(msg, ...args),
    error: (msg, ...args) => context.error(msg, ...args),
    warn: (msg, ...args) => context.warn(msg, ...args),
  };
}
