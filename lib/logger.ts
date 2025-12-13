/**
 * Centralized Logger for CineMate
 * Info-level logging for both frontend and backend
 * Edge Runtime compatible - console only (no file logging in Edge)
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

class Logger {
  private isServer: boolean;
  private isEdgeRuntime: boolean;

  constructor() {
    this.isServer = typeof window === 'undefined';
    // Detect Edge Runtime (no access to Node.js fs/path modules)
    this.isEdgeRuntime = this.isServer && typeof EdgeRuntime !== 'undefined';
  }

  private formatTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  private formatConsoleLog(entry: LogEntry): string {
    const emoji = {
      info: '📘',
      warn: '⚠️',
      error: '❌',
    }[entry.level];

    const colorCode = {
      info: '\x1b[36m', // Cyan
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    }[entry.level];

    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const dim = '\x1b[2m';

    const dataStr = entry.data ? `\n${dim}${JSON.stringify(entry.data, null, 2)}${reset}` : '';

    return `${dim}[${entry.timestamp}]${reset} ${emoji} ${colorCode}${bold}${entry.level.toUpperCase()}${reset} ${bold}[${entry.context}]${reset} ${entry.message}${dataStr}`;
  }

  info(context: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'info',
      context,
      message,
      data,
    };
    
    console.log(this.formatConsoleLog(entry));
  }

  warn(context: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'warn',
      context,
      message,
      data,
    };
    
    console.warn(this.formatConsoleLog(entry));
  }

  error(context: string, message: string, error?: any) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: 'error',
      context,
      message,
      data: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    
    console.error(this.formatConsoleLog(entry));
  }

  // API request logger
  apiRequest(method: string, url: string, status?: number) {
    const statusEmoji = status ? (status < 400 ? '✅' : '❌') : '🔄';
    this.info('API', `${statusEmoji} ${method} ${url}${status ? ` → ${status}` : ''}`);
  }

  // Database operation logger
  dbOperation(operation: string, table: string, details?: string) {
    this.info('DATABASE', `${operation} on ${table}${details ? ` - ${details}` : ''}`);
  }

  // Auth logger
  auth(action: string, details?: string) {
    this.info('AUTH', `${action}${details ? ` - ${details}` : ''}`);
  }

  // Client-side logger (only console)
  client(context: string, message: string, data?: any) {
    if (typeof window !== 'undefined') {
      console.log(`[${this.formatTimestamp()}] [CLIENT:${context}] ${message}`, data || '');
    }
  }
}

export const logger = new Logger();

