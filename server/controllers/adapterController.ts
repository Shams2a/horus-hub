import { Request, Response } from 'express';
import { storage } from '../storage';
import logger from '../utils/logger';

/**
 * Controller for adapter-related API endpoints
 */
const adapterController = {
  /**
   * Get all adapters
   */
  async getAllAdapters(req: Request, res: Response): Promise<void> {
    try {
      const adapters = await storage.getAllAdapters();
      res.json(adapters);
    } catch (error) {
      logger.error('Failed to get all adapters', { error });
      res.status(500).json({ error: 'Failed to get adapters' });
    }
  },
  
  /**
   * Get a specific adapter by ID
   */
  async getAdapter(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid adapter ID' });
        return;
      }
      
      const adapter = await storage.getAdapter(id);
      if (!adapter) {
        res.status(404).json({ error: 'Adapter not found' });
        return;
      }
      
      res.json(adapter);
    } catch (error) {
      logger.error('Failed to get adapter', { error, adapterId: req.params.id });
      res.status(500).json({ error: 'Failed to get adapter' });
    }
  },
  
  /**
   * Add a new adapter
   */
  async addAdapter(req: Request, res: Response): Promise<void> {
    try {
      const { name, type, config } = req.body;
      
      if (!name || !type) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      
      // Check if an adapter with the same name already exists
      const existingAdapter = await storage.getAdapterByName(name);
      if (existingAdapter) {
        res.status(409).json({ error: 'Adapter with this name already exists' });
        return;
      }
      
      const newAdapter = await storage.insertAdapter({
        name,
        type,
        status: 'inactive', // Default to inactive until started
        config: config || {}
      });
      
      logger.info('Adapter added', { adapter: newAdapter });
      res.status(201).json(newAdapter);
    } catch (error) {
      logger.error('Failed to add adapter', { error, body: req.body });
      res.status(500).json({ error: 'Failed to add adapter' });
    }
  },
  
  /**
   * Update an adapter
   */
  async updateAdapter(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid adapter ID' });
        return;
      }
      
      const { name, status, config } = req.body;
      
      // Get the existing adapter
      const existingAdapter = await storage.getAdapter(id);
      if (!existingAdapter) {
        res.status(404).json({ error: 'Adapter not found' });
        return;
      }
      
      // Update only the provided fields
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (status !== undefined) updates.status = status;
      if (config !== undefined) updates.config = config;
      
      const updatedAdapter = await storage.updateAdapter(id, updates);
      
      logger.info('Adapter updated', { adapterId: id, updates });
      res.json(updatedAdapter);
    } catch (error) {
      logger.error('Failed to update adapter', { error, adapterId: req.params.id });
      res.status(500).json({ error: 'Failed to update adapter' });
    }
  },
  
  /**
   * Delete an adapter
   */
  async deleteAdapter(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid adapter ID' });
        return;
      }
      
      // Get the adapter to check if it exists and for logging
      const adapter = await storage.getAdapter(id);
      if (!adapter) {
        res.status(404).json({ error: 'Adapter not found' });
        return;
      }
      
      const success = await storage.deleteAdapter(id);
      
      if (success) {
        logger.info('Adapter deleted', { adapterId: id, name: adapter.name });
        res.json({ success: true });
      } else {
        res.status(500).json({ error: 'Failed to delete adapter' });
      }
    } catch (error) {
      logger.error('Failed to delete adapter', { error, adapterId: req.params.id });
      res.status(500).json({ error: 'Failed to delete adapter' });
    }
  },
  
  /**
   * Get Zigbee status
   */
  async getZigbeeStatus(req: Request, res: Response): Promise<void> {
    try {
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const zigbeeAdapter = adapterManager.getAdapter('zigbee');
      if (!zigbeeAdapter) {
        res.status(404).json({ error: 'Zigbee adapter not found' });
        return;
      }
      
      // Get network parameters
      const networkParams = await zigbeeAdapter.getNetworkParameters();
      const coordinator = zigbeeAdapter.getCoordinatorVersion();
      const devices = zigbeeAdapter.getDevices();
      
      // Count device types
      const routerCount = devices.filter(d => d.type === 'Router').length;
      const endDeviceCount = devices.filter(d => d.type === 'EndDevice').length;
      
      const status = {
        coordinator: coordinator.type,
        panId: networkParams.panID,
        channel: networkParams.channel,
        deviceCount: {
          total: devices.length,
          routers: routerCount,
          endDevices: endDeviceCount
        }
      };
      
      res.json(status);
    } catch (error) {
      logger.error('Failed to get Zigbee status', { error });
      res.status(500).json({ error: 'Failed to get Zigbee status' });
    }
  },
  
  /**
   * Set Zigbee permit join
   */
  async setZigbeePermitJoin(req: Request, res: Response): Promise<void> {
    try {
      const { permitJoin, timeout = 60 } = req.body;
      
      if (permitJoin === undefined) {
        res.status(400).json({ error: 'permitJoin parameter is required' });
        return;
      }
      
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const zigbeeAdapter = adapterManager.getAdapter('zigbee');
      if (!zigbeeAdapter) {
        res.status(404).json({ error: 'Zigbee adapter not found' });
        return;
      }
      
      await zigbeeAdapter.permitJoin(permitJoin, timeout);
      
      logger.info('Zigbee permit join set', { permitJoin, timeout });
      res.json({ success: true, permitJoin, timeout });
    } catch (error) {
      logger.error('Failed to set Zigbee permit join', { error });
      res.status(500).json({ error: 'Failed to set Zigbee permit join' });
    }
  },
  
  /**
   * Generate Zigbee network map
   */
  async generateZigbeeMap(req: Request, res: Response): Promise<void> {
    try {
      // In a real implementation, this would generate an actual network map
      // For now, we'll just return a success message
      logger.info('Generating Zigbee network map');
      
      // Get zigbee devices to include in the map response
      const devices = await storage.getDevicesByProtocol('zigbee');
      
      // Simple map structure showing connections between coordinator and devices
      const map = {
        nodes: [
          { id: 'coordinator', type: 'coordinator', name: 'Zigbee Coordinator' },
          ...devices.map(device => ({
            id: device.deviceId,
            type: device.type,
            name: device.name,
            status: device.status
          }))
        ],
        links: devices.map(device => ({
          source: 'coordinator',
          target: device.deviceId,
          quality: Math.floor(Math.random() * 100) + 1 // Random link quality 1-100
        }))
      };
      
      res.json({ success: true, map });
    } catch (error) {
      logger.error('Failed to generate Zigbee map', { error });
      res.status(500).json({ error: 'Failed to generate Zigbee map' });
    }
  },
  
  /**
   * Get WiFi status
   */
  async getWifiStatus(req: Request, res: Response): Promise<void> {
    try {
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const wifiAdapter = adapterManager.getAdapter('wifi');
      if (!wifiAdapter) {
        res.status(404).json({ error: 'WiFi adapter not found' });
        return;
      }
      
      const networkInfo = wifiAdapter.getNetworkInfo();
      const devices = await storage.getDevicesByProtocol('wifi');
      
      const status = {
        ...networkInfo,
        deviceCount: devices.length
      };
      
      res.json(status);
    } catch (error) {
      logger.error('Failed to get WiFi status', { error });
      res.status(500).json({ error: 'Failed to get WiFi status' });
    }
  },
  
  /**
   * Scan WiFi network
   */
  async scanWifiNetwork(req: Request, res: Response): Promise<void> {
    try {
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const wifiAdapter = adapterManager.getAdapter('wifi');
      if (!wifiAdapter) {
        res.status(404).json({ error: 'WiFi adapter not found' });
        return;
      }
      
      // Start a scan
      await wifiAdapter.scan();
      
      logger.info('WiFi network scan initiated');
      res.json({ success: true, message: 'WiFi scan initiated' });
    } catch (error) {
      logger.error('Failed to scan WiFi network', { error });
      res.status(500).json({ error: 'Failed to scan WiFi network' });
    }
  },
  
  /**
   * Get MQTT status
   */
  async getMqttStatus(req: Request, res: Response): Promise<void> {
    try {
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const mqttAdapter = adapterManager.getAdapter('mqtt');
      if (!mqttAdapter) {
        res.status(404).json({ error: 'MQTT adapter not found' });
        return;
      }
      
      const status = mqttAdapter.getStatus();
      res.json(status);
    } catch (error) {
      logger.error('Failed to get MQTT status', { error });
      res.status(500).json({ error: 'Failed to get MQTT status' });
    }
  },
  
  /**
   * Get MQTT configuration
   */
  async getMqttConfig(req: Request, res: Response): Promise<void> {
    try {
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const mqttAdapter = adapterManager.getAdapter('mqtt');
      if (!mqttAdapter) {
        res.status(404).json({ error: 'MQTT adapter not found' });
        return;
      }
      
      const config = mqttAdapter.getConfig();
      
      // Remove sensitive information
      const safeConfig = { ...config };
      if (safeConfig.password) {
        safeConfig.password = safeConfig.password.replace(/./g, '*');
      }
      
      res.json(safeConfig);
    } catch (error) {
      logger.error('Failed to get MQTT config', { error });
      res.status(500).json({ error: 'Failed to get MQTT config' });
    }
  },
  
  /**
   * Update MQTT configuration
   */
  async updateMqttConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const mqttAdapter = adapterManager.getAdapter('mqtt');
      if (!mqttAdapter) {
        res.status(404).json({ error: 'MQTT adapter not found' });
        return;
      }
      
      await mqttAdapter.updateConfig(config);
      
      // Get the updated config (without sensitive info)
      const updatedConfig = mqttAdapter.getConfig();
      const safeConfig = { ...updatedConfig };
      if (safeConfig.password) {
        safeConfig.password = safeConfig.password.replace(/./g, '*');
      }
      
      logger.info('MQTT configuration updated');
      res.json(safeConfig);
    } catch (error) {
      logger.error('Failed to update MQTT config', { error });
      res.status(500).json({ error: 'Failed to update MQTT config' });
    }
  },
  
  /**
   * Get MQTT topics
   */
  async getMqttTopics(req: Request, res: Response): Promise<void> {
    try {
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const mqttAdapter = adapterManager.getAdapter('mqtt');
      if (!mqttAdapter) {
        res.status(404).json({ error: 'MQTT adapter not found' });
        return;
      }
      
      const topics = mqttAdapter.getTopics();
      res.json(topics);
    } catch (error) {
      logger.error('Failed to get MQTT topics', { error });
      res.status(500).json({ error: 'Failed to get MQTT topics' });
    }
  },
  
  /**
   * Add MQTT topic
   */
  async addMqttTopic(req: Request, res: Response): Promise<void> {
    try {
      const { topic, qos = 0 } = req.body;
      
      if (!topic) {
        res.status(400).json({ error: 'Topic is required' });
        return;
      }
      
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const mqttAdapter = adapterManager.getAdapter('mqtt');
      if (!mqttAdapter) {
        res.status(404).json({ error: 'MQTT adapter not found' });
        return;
      }
      
      await mqttAdapter.subscribeTopic(topic, qos);
      
      logger.info('MQTT topic added', { topic, qos });
      res.json({ success: true, topic, qos });
    } catch (error) {
      logger.error('Failed to add MQTT topic', { error });
      res.status(500).json({ error: 'Failed to add MQTT topic' });
    }
  },
  
  /**
   * Delete MQTT topic
   */
  async deleteMqttTopic(req: Request, res: Response): Promise<void> {
    try {
      const topic = decodeURIComponent(req.params.topic);
      
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const mqttAdapter = adapterManager.getAdapter('mqtt');
      if (!mqttAdapter) {
        res.status(404).json({ error: 'MQTT adapter not found' });
        return;
      }
      
      await mqttAdapter.unsubscribeTopic(topic);
      
      logger.info('MQTT topic deleted', { topic });
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete MQTT topic', { error });
      res.status(500).json({ error: 'Failed to delete MQTT topic' });
    }
  },
  
  /**
   * Test MQTT connection
   */
  async testMqttConnection(req: Request, res: Response): Promise<void> {
    try {
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const mqttAdapter = adapterManager.getAdapter('mqtt');
      if (!mqttAdapter) {
        res.status(404).json({ error: 'MQTT adapter not found' });
        return;
      }
      
      const success = await mqttAdapter.testConnection();
      
      if (success) {
        logger.info('MQTT connection test successful');
        res.json({ success: true, message: 'Connection successful' });
      } else {
        logger.warn('MQTT connection test failed');
        res.status(400).json({ success: false, message: 'Connection failed' });
      }
    } catch (error) {
      logger.error('Failed to test MQTT connection', { error });
      res.status(500).json({ error: 'Failed to test MQTT connection' });
    }
  },
  
  /**
   * Reconnect MQTT
   */
  async reconnectMqtt(req: Request, res: Response): Promise<void> {
    try {
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const mqttAdapter = adapterManager.getAdapter('mqtt');
      if (!mqttAdapter) {
        res.status(404).json({ error: 'MQTT adapter not found' });
        return;
      }
      
      // Stop and start the adapter
      await mqttAdapter.stop();
      await mqttAdapter.start();
      
      logger.info('MQTT adapter restarted');
      res.json({ success: true, message: 'MQTT adapter restarted' });
    } catch (error) {
      logger.error('Failed to reconnect MQTT', { error });
      res.status(500).json({ error: 'Failed to reconnect MQTT' });
    }
  }
};

export default adapterController;
