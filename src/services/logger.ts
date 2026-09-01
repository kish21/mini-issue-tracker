export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, any>;
}

class Logger {
  private log(level: LogLevel, context: string, message: string, data?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
    };

    if (level === 'error') {
      console.error(`[${entry.timestamp}] [${context}] ERROR: ${message}`, data || '');
    } else if (level === 'warn') {
      console.warn(`[${entry.timestamp}] [${context}] WARN: ${message}`, data || '');
    } else {
      console.log(`[${entry.timestamp}] [${context}] ${level.toUpperCase()}: ${message}`, data || '');
    }
  }

  info(context: string, message: string, data?: Record<string, any>) {
    this.log('info', context, message, data);
  }

  warn(context: string, message: string, data?: Record<string, any>) {
    this.log('warn', context, message, data);
  }

  error(context: string, message: string, data?: Record<string, any>) {
    this.log('error', context, message, data);
  }
}

export const logger = new Logger();
