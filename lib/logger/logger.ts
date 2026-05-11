/**
 * Core logger implementation
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context, requestId, userId } = entry;

  // Build base log message
  const parts: string[] = [
    `[${timestamp}]`,
    `[${level.toUpperCase()}]`,
  ];

  if (requestId) {
    parts.push(`[requestId: ${requestId}]`);
  }

  if (userId) {
    parts.push(`[userId: ${userId}]`);
  }

  parts.push(message);

  let logMessage = parts.join(' ');

  // Add context if present
  if (context && Object.keys(context).length > 0) {
    logMessage += ' ' + JSON.stringify(context);
  }

  return logMessage;
}

/**
 * Get current timestamp in ISO format
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    context,
  };

  const formattedMessage = formatLogEntry(entry);

  switch (level) {
    case 'info':
      console.info(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      break;
  }
}

/**
 * Log info message
 */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  log('info', message, context);
}

/**
 * Log warning message
 */
export function logWarn(message: string, context?: Record<string, unknown>): void {
  log('warn', message, context);
}

/**
 * Log error message
 */
export function logError(message: string, context?: Record<string, unknown>): void {
  log('error', message, context);
}
