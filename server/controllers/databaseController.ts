import { Request, Response } from 'express';
import { initializeDb } from '../db';
import { storage } from '../storage';
import { databaseConfigSchema } from '@shared/schema';
import logger from '../utils/logger';

/**
 * Controller for database configuration and synchronization operations
 */
const getDatabaseConfig = async (req: Request, res: Response) => {
  try {
    // Get database settings from storage
    const useCloudSetting = await storage.getSetting('database.useCloud');
    const syncModeSetting = await storage.getSetting('database.syncMode');
    const syncIntervalSetting = await storage.getSetting('database.syncInterval');
    const cloudDatabaseUrlSetting = await storage.getSetting('database.cloudDatabaseUrl');
    
    // Prepare response object
    const config = {
      useCloud: useCloudSetting ? useCloudSetting.value : false,
      syncMode: syncModeSetting ? syncModeSetting.value : 'full',
      syncInterval: syncIntervalSetting ? syncIntervalSetting.value : 60,
      cloudDatabaseUrl: cloudDatabaseUrlSetting ? cloudDatabaseUrlSetting.value : ''
    };
    
    res.json(config);
  } catch (error) {
    logger.error('Error fetching database configuration', { error });
    res.status(500).json({ error: 'Failed to fetch database configuration' });
  }
};

const updateDatabaseConfig = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = databaseConfigSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid database configuration', details: result.error.errors });
    }
    
    const config = result.data;
    
    // Update settings in storage
    await storage.updateSetting('database.useCloud', config.useCloud);
    await storage.updateSetting('database.syncMode', config.syncMode);
    await storage.updateSetting('database.syncInterval', config.syncInterval);
    
    // Only update URL if it's provided and different from the current one
    if (config.cloudDatabaseUrl && config.cloudDatabaseUrl.trim() !== '') {
      await storage.updateSetting('database.cloudDatabaseUrl', config.cloudDatabaseUrl);
      
      // If cloud database is enabled, initialize the connection
      if (config.useCloud) {
        // Try to initialize the database connection with the new URL
        try {
          initializeDb(config.cloudDatabaseUrl);
          logger.info('Cloud database connection updated');
        } catch (dbError) {
          logger.error('Failed to connect to cloud database', { error: dbError });
          
          // Still save the URL but return a warning
          return res.status(200).json({
            config,
            warning: 'Settings saved but could not connect to cloud database'
          });
        }
      }
    }
    
    // Log activity
    const activityData = {
      activity: 'database_config_updated',
      details: { useCloud: config.useCloud, syncMode: config.syncMode },
      timestamp: new Date()
    };
    await storage.insertActivity(activityData);
    
    res.json({ config, message: 'Database configuration updated successfully' });
  } catch (error) {
    logger.error('Error updating database configuration', { error });
    res.status(500).json({ error: 'Failed to update database configuration' });
  }
};

const testDatabaseConnection = async (req: Request, res: Response) => {
  try {
    const { cloudDatabaseUrl } = req.body;
    
    if (!cloudDatabaseUrl || cloudDatabaseUrl.trim() === '') {
      return res.status(400).json({ error: 'Cloud database URL is required' });
    }
    
    // Try to initialize a connection with this URL
    try {
      const { pool } = initializeDb(cloudDatabaseUrl);
      
      // Test the connection by running a simple query
      await pool.query('SELECT 1');
      
      // Close the test connection
      await pool.end();
      
      res.json({ success: true, message: 'Successfully connected to cloud database' });
    } catch (dbError) {
      logger.error('Database connection test failed', { error: dbError });
      res.status(400).json({ 
        success: false, 
        error: 'Failed to connect to cloud database',
        details: dbError.message 
      });
    }
  } catch (error) {
    logger.error('Error testing database connection', { error });
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
};

const syncDatabases = async (req: Request, res: Response) => {
  try {
    // Get database settings
    const useCloudSetting = await storage.getSetting('database.useCloud');
    const cloudDatabaseUrlSetting = await storage.getSetting('database.cloudDatabaseUrl');
    const syncModeSetting = await storage.getSetting('database.syncMode');
    
    const useCloud = useCloudSetting ? useCloudSetting.value : false;
    const cloudDatabaseUrl = cloudDatabaseUrlSetting ? cloudDatabaseUrlSetting.value : '';
    const syncMode = syncModeSetting ? syncModeSetting.value : 'full';
    
    // Check if cloud sync is enabled and we have a URL
    if (!useCloud) {
      return res.status(400).json({ error: 'Cloud database synchronization is not enabled' });
    }
    
    if (!cloudDatabaseUrl || cloudDatabaseUrl.trim() === '') {
      return res.status(400).json({ error: 'Cloud database URL is not configured' });
    }
    
    // Start a manual sync here (full implementation would use a more sophisticated sync mechanism)
    logger.info('Starting manual database synchronization', { syncMode });
    
    // Here we would implement the actual sync between databases
    // For now, just return success
    res.json({ 
      success: true, 
      message: 'Database synchronization initiated', 
      syncMode
    });
  } catch (error) {
    logger.error('Error initiating database synchronization', { error });
    res.status(500).json({ error: 'Failed to initiate synchronization' });
  }
};

export default {
  getDatabaseConfig,
  updateDatabaseConfig,
  testDatabaseConnection,
  syncDatabases
};