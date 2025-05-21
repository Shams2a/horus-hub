import { Request, Response } from 'express';
import { storage } from '../storage';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Controller for settings-related API endpoints
 */
const settingsController = {
  /**
   * Get all settings
   */
  async getAllSettings(req: Request, res: Response): Promise<void> {
    try {
      const allSettings = await storage.getAllSettings();
      
      // Group settings by category
      const settings: Record<string, any> = {};
      allSettings.forEach(setting => {
        settings[setting.category] = {
          ...(settings[setting.category] || {}),
          [setting.key]: setting.value
        };
      });
      
      res.json(settings);
    } catch (error) {
      logger.error('Failed to get all settings', { error });
      res.status(500).json({ error: 'Failed to get settings' });
    }
  },
  
  /**
   * Get settings by category
   */
  async getCategorySettings(req: Request, res: Response): Promise<void> {
    try {
      const category = req.params.category;
      const settings = await storage.getSettingsByCategory(category);
      
      if (settings.length === 0) {
        res.status(404).json({ error: `No settings found for category: ${category}` });
        return;
      }
      
      // Return only the values
      const categorySettings = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);
      
      res.json(categorySettings);
    } catch (error) {
      logger.error('Failed to get category settings', { error, category: req.params.category });
      res.status(500).json({ error: 'Failed to get category settings' });
    }
  },
  
  /**
   * Update settings by category
   */
  async updateCategorySettings(req: Request, res: Response): Promise<void> {
    try {
      const category = req.params.category;
      const newSettings = req.body;
      
      // Get the current setting for this category
      const setting = await storage.getSetting(category);
      
      if (setting) {
        // Update existing setting
        await storage.updateSetting(category, newSettings);
      } else {
        // Create new setting
        await storage.insertSetting({
          key: category,
          value: newSettings,
          category,
          description: `${category} settings`
        });
      }
      
      logger.info('Settings updated', { category });
      
      // Apply the updated settings
      await applySettings(category, newSettings, req);
      
      res.json({ success: true, category, settings: newSettings });
    } catch (error) {
      logger.error('Failed to update category settings', { error, category: req.params.category });
      res.status(500).json({ error: 'Failed to update category settings' });
    }
  },
  
  /**
   * Get system status
   */
  async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      // Calculate uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor(((uptime % 86400) % 3600) / 60);
      const uptimeString = `${days}d ${hours}h ${minutes}m`;
      
      // Get CPU and memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
      
      // Get CPU load
      const cpuUsage = Math.round(os.loadavg()[0] * 100) / 100;
      
      const status = {
        status: 'running',
        uptime: uptimeString,
        cpuUsage,
        memoryUsage,
        storageUsage: 50 // Mock value for storage usage
      };
      
      res.json(status);
    } catch (error) {
      logger.error('Failed to get system status', { error });
      res.status(500).json({ error: 'Failed to get system status' });
    }
  },
  
  /**
   * Get system information
   */
  async getSystemInfo(req: Request, res: Response): Promise<void> {
    try {
      // Calculate uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor(((uptime % 86400) % 3600) / 60);
      const uptimeString = `${days} days, ${hours} hours, ${minutes} minutes`;
      
      // Get memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsageString = `${Math.round(usedMem / 1024 / 1024)}MB / ${Math.round(totalMem / 1024 / 1024)}MB`;
      
      // Get system info
      const systemInfo = {
        software: {
          version: '1.0.0',
          nodeVersion: process.version,
          os: `${os.type()} ${os.release()}`,
          uptime: uptimeString
        },
        hardware: {
          device: 'Raspberry Pi 4 Model B',
          cpuUsage: Math.round(os.loadavg()[0] * 100) / 100,
          memoryUsage: memoryUsageString,
          storageUsage: '4.2GB / 16GB' // Mock value for storage usage
        },
        adapters: [
          {
            protocol: 'zigbee',
            version: 'zigbee-herdsman 0.14.0',
            status: 'active'
          },
          {
            protocol: 'wifi',
            version: 'wireless-tools 0.19.0',
            status: 'active'
          },
          {
            protocol: 'mqtt',
            version: 'mqtt 4.3.7',
            status: 'active'
          }
        ]
      };
      
      res.json(systemInfo);
    } catch (error) {
      logger.error('Failed to get system information', { error });
      res.status(500).json({ error: 'Failed to get system information' });
    }
  },
  
  /**
   * Create a system backup
   */
  async createBackup(req: Request, res: Response): Promise<void> {
    try {
      const { name, includeConfig = true, includeDevices = true, includeLogs = false } = req.body;
      
      if (!name) {
        res.status(400).json({ error: 'Backup name is required' });
        return;
      }
      
      // In a real implementation, this would create a zip file with the requested data
      // For this demonstration, we'll create a simple JSON object
      
      const backup: any = {
        name,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
      
      if (includeConfig) {
        backup.settings = await storage.getAllSettings();
      }
      
      if (includeDevices) {
        backup.devices = await storage.getAllDevices();
      }
      
      if (includeLogs) {
        const logsResult = await storage.getLogs({ limit: 1000 });
        backup.logs = logsResult.logs;
      }
      
      logger.info('System backup created', { name });
      
      // Convert to JSON string with pretty formatting
      const backupData = JSON.stringify(backup, null, 2);
      
      // Set response headers
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.json"`);
      
      res.send(backupData);
    } catch (error) {
      logger.error('Failed to create backup', { error });
      res.status(500).json({ error: 'Failed to create backup' });
    }
  },
  
  /**
   * Restore from backup
   */
  async restoreBackup(req: Request, res: Response): Promise<void> {
    try {
      // In a real implementation, this would extract the uploaded zip file
      // and restore data from it
      
      if (!req.files || !req.files.backup) {
        res.status(400).json({ error: 'No backup file provided' });
        return;
      }
      
      logger.info('System restore initiated');
      
      // For this demonstration, we'll just return success
      res.json({ success: true, message: 'Restore initiated. System will restart shortly.' });
    } catch (error) {
      logger.error('Failed to restore from backup', { error });
      res.status(500).json({ error: 'Failed to restore from backup' });
    }
  },
  
  /**
   * Factory reset
   */
  async factoryReset(req: Request, res: Response): Promise<void> {
    try {
      // In a real implementation, this would reset all settings and data to defaults
      
      // Clear all data
      await storage.clearLogs();
      
      // For other data, in a real implementation we would clear it
      // but for this demo, we'll keep the adapters and devices for demonstration purposes
      
      logger.info('Factory reset initiated');
      
      res.json({ success: true, message: 'Factory reset initiated. System will restart shortly.' });
    } catch (error) {
      logger.error('Failed to perform factory reset', { error });
      res.status(500).json({ error: 'Failed to perform factory reset' });
    }
  },
  
  /**
   * Check for updates
   */
  async checkForUpdates(req: Request, res: Response): Promise<void> {
    try {
      // In a real implementation, this would check for available updates
      
      // For this demonstration, we'll simulate no updates available
      logger.info('Checked for updates');
      
      // Randomly decide if an update is available for demonstration purposes
      const updateAvailable = Math.random() > 0.7;
      
      if (updateAvailable) {
        res.json({
          available: true,
          version: '1.1.0',
          releaseDate: new Date().toISOString(),
          description: 'This update includes bug fixes and performance improvements.'
        });
      } else {
        res.json({
          available: false,
          currentVersion: '1.0.0'
        });
      }
    } catch (error) {
      logger.error('Failed to check for updates', { error });
      res.status(500).json({ error: 'Failed to check for updates' });
    }
  },
  
  /**
   * Install update
   */
  async installUpdate(req: Request, res: Response): Promise<void> {
    try {
      // In a real implementation, this would download and install the update
      
      logger.info('Update installation initiated');
      
      res.json({ success: true, message: 'Update installation initiated. System will restart shortly.' });
    } catch (error) {
      logger.error('Failed to install update', { error });
      res.status(500).json({ error: 'Failed to install update' });
    }
  }
};

/**
 * Apply settings based on category
 */
async function applySettings(category: string, settings: any, req: Request): Promise<void> {
  try {
    switch (category) {
      case 'general':
        // Apply general settings
        break;
        
      case 'logging':
        // Update logger settings
        if (settings.logLevel || settings.consoleLog !== undefined || settings.fileLog !== undefined) {
          const logger = req.app.locals.logger;
          if (logger && logger.updateSettings) {
            await logger.updateSettings({
              logLevel: settings.logLevel,
              consoleLog: settings.consoleLog,
              fileLog: settings.fileLog
            });
          }
        }
        break;
        
      case 'mqtt':
        // Update MQTT adapter
        const adapterManager = req.app.locals.adapterManager;
        if (adapterManager) {
          const mqttAdapter = adapterManager.getAdapter('mqtt');
          if (mqttAdapter && mqttAdapter.updateConfig) {
            await mqttAdapter.updateConfig(settings);
          }
        }
        break;
        
      // Add cases for other categories as needed
    }
  } catch (error) {
    logger.error('Failed to apply settings', { error, category });
    throw error;
  }
}

export default settingsController;
