import { Request, Response } from 'express';
import { storage } from '../storage';
import logger from '../utils/logger';

/**
 * Controller for log-related API endpoints
 */
const logController = {
  /**
   * Get logs with filtering and pagination
   */
  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const level = req.query.level as string || 'all';
      const source = req.query.source as string || 'all';
      const search = req.query.search as string || '';
      
      const { logs, totalCount } = await storage.getLogs({
        limit,
        offset,
        level,
        source,
        search
      });
      
      const totalPages = Math.ceil(totalCount / limit);
      
      res.json({
        logs,
        totalCount,
        totalPages,
        currentPage: Math.floor(offset / limit) + 1
      });
    } catch (error) {
      logger.error('Failed to get logs', { error });
      res.status(500).json({ error: 'Failed to get logs' });
    }
  },
  
  /**
   * Clear all logs
   */
  async clearLogs(req: Request, res: Response): Promise<void> {
    try {
      const success = await storage.clearLogs();
      
      if (success) {
        logger.info('All logs cleared');
        res.json({ success: true });
      } else {
        res.status(500).json({ error: 'Failed to clear logs' });
      }
    } catch (error) {
      logger.error('Failed to clear logs', { error });
      res.status(500).json({ error: 'Failed to clear logs' });
    }
  },
  
  /**
   * Download logs as a file
   */
  async downloadLogs(req: Request, res: Response): Promise<void> {
    try {
      // Get all logs
      const { logs } = await storage.getLogs({ limit: 10000 });
      
      // Format logs as text
      const logsText = logs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const detailsStr = log.details ? ` ${JSON.stringify(log.details)}` : '';
        return `[${timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${detailsStr}`;
      }).join('\n');
      
      // Set response headers
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="horus-hub-logs-${new Date().toISOString().split('T')[0]}.log"`);
      
      // Send the logs
      res.send(logsText);
      
      logger.info('Logs downloaded');
    } catch (error) {
      logger.error('Failed to download logs', { error });
      res.status(500).json({ error: 'Failed to download logs' });
    }
  },
  
  /**
   * Get log settings
   */
  async getLogSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await storage.getSetting('logging');
      
      if (!settings) {
        // Return default settings if not found
        res.json({
          logLevel: 'info',
          logRetention: 7,
          consoleLog: true,
          fileLog: true,
          logRotation: true
        });
        return;
      }
      
      res.json(settings.value);
    } catch (error) {
      logger.error('Failed to get log settings', { error });
      res.status(500).json({ error: 'Failed to get log settings' });
    }
  },
  
  /**
   * Update log settings
   */
  async updateLogSettings(req: Request, res: Response): Promise<void> {
    try {
      const { logLevel, logRetention, consoleLog, fileLog, logRotation } = req.body;
      
      // Validate inputs
      if (logLevel && !['error', 'warning', 'info', 'debug'].includes(logLevel)) {
        res.status(400).json({ error: 'Invalid log level' });
        return;
      }
      
      if (logRetention !== undefined && (typeof logRetention !== 'number' || logRetention < 1)) {
        res.status(400).json({ error: 'Invalid log retention value' });
        return;
      }
      
      // Get current settings
      const currentSettings = await storage.getSetting('logging');
      
      // Prepare new settings
      const newSettings = {
        logLevel: logLevel || currentSettings?.value?.logLevel || 'info',
        logRetention: logRetention || currentSettings?.value?.logRetention || 7,
        consoleLog: consoleLog !== undefined ? consoleLog : (currentSettings?.value?.consoleLog !== undefined ? currentSettings.value.consoleLog : true),
        fileLog: fileLog !== undefined ? fileLog : (currentSettings?.value?.fileLog !== undefined ? currentSettings.value.fileLog : true),
        logRotation: logRotation !== undefined ? logRotation : (currentSettings?.value?.logRotation !== undefined ? currentSettings.value.logRotation : true)
      };
      
      // Update settings in storage
      if (currentSettings) {
        await storage.updateSetting('logging', newSettings);
      } else {
        await storage.insertSetting({
          key: 'logging',
          value: newSettings,
          category: 'logging',
          description: 'Log configuration settings'
        });
      }
      
      // Update logger configuration
      logger.updateSettings({
        logLevel: newSettings.logLevel,
        consoleLog: newSettings.consoleLog,
        fileLog: newSettings.fileLog
      });
      
      logger.info('Log settings updated', { settings: newSettings });
      res.json(newSettings);
    } catch (error) {
      logger.error('Failed to update log settings', { error });
      res.status(500).json({ error: 'Failed to update log settings' });
    }
  }
};

export default logController;
