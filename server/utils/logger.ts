import { storage } from '../storage';

/**
 * Logging levels
 */
enum LogLevel {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Numeric value for log levels for filtering
 */
const LOG_LEVEL_VALUES: Record<string, number> = {
  [LogLevel.ERROR]: 0,
  [LogLevel.WARNING]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3
};

/**
 * Logger implementation for Horus Hub
 */
class Logger {
  private level: LogLevel = LogLevel.INFO;
  private consoleLog: boolean = true;
  private fileLog: boolean = true;
  
  /**
   * Initialize logger with default settings
   */
  constructor() {
    // Default settings will be overridden when settings are loaded
    this.loadSettings().catch(error => {
      console.error('Failed to load logger settings:', error);
    });
  }
  
  /**
   * Load logger settings from storage
   */
  async loadSettings(): Promise<void> {
    try {
      const settings = await storage.getSetting('logging');
      if (settings) {
        this.level = settings.value.logLevel || LogLevel.INFO;
        this.consoleLog = settings.value.consoleLog !== undefined ? settings.value.consoleLog : true;
        this.fileLog = settings.value.fileLog !== undefined ? settings.value.fileLog : true;
      }
    } catch (error) {
      console.error('Error loading logger settings:', error);
    }
  }
  
  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_VALUES[level] <= LOG_LEVEL_VALUES[this.level];
  }
  
  /**
   * Format a log message
   */
  private formatLog(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }
  
  /**
   * Save a log entry to storage
   */
  private async saveLog(level: LogLevel, message: string, source: string = 'system', details?: any): Promise<void> {
    if (!this.fileLog) return;
    
    try {
      await storage.insertLog({
        level,
        source,
        message,
        details
      });
    } catch (error) {
      console.error('Failed to save log entry:', error);
    }
  }
  
  /**
   * Log an error message
   */
  error(message: string, meta?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const source = meta?.source || 'system';
    const formattedMessage = this.formatLog(LogLevel.ERROR, message, meta);
    
    if (this.consoleLog) {
      console.error(formattedMessage);
    }
    
    this.saveLog(LogLevel.ERROR, message, source, meta);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, meta?: any): void {
    if (!this.shouldLog(LogLevel.WARNING)) return;
    
    const source = meta?.source || 'system';
    const formattedMessage = this.formatLog(LogLevel.WARNING, message, meta);
    
    if (this.consoleLog) {
      console.warn(formattedMessage);
    }
    
    this.saveLog(LogLevel.WARNING, message, source, meta);
  }
  
  /**
   * Log an info message
   */
  info(message: string, meta?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const source = meta?.source || 'system';
    const formattedMessage = this.formatLog(LogLevel.INFO, message, meta);
    
    if (this.consoleLog) {
      console.info(formattedMessage);
    }
    
    this.saveLog(LogLevel.INFO, message, source, meta);
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, meta?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const source = meta?.source || 'system';
    const formattedMessage = this.formatLog(LogLevel.DEBUG, message, meta);
    
    if (this.consoleLog) {
      console.debug(formattedMessage);
    }
    
    this.saveLog(LogLevel.DEBUG, message, source, meta);
  }
  
  /**
   * Update logger settings
   */
  async updateSettings(settings: { logLevel?: LogLevel; consoleLog?: boolean; fileLog?: boolean }): Promise<void> {
    if (settings.logLevel) {
      this.level = settings.logLevel;
    }
    
    if (settings.consoleLog !== undefined) {
      this.consoleLog = settings.consoleLog;
    }
    
    if (settings.fileLog !== undefined) {
      this.fileLog = settings.fileLog;
    }
    
    this.info('Logger settings updated', { settings });
  }
}

// Create and export a singleton instance of the logger
const logger = new Logger();
export default logger;
