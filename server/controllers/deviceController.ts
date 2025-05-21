import { Request, Response } from 'express';
import { storage } from '../storage';
import logger from '../utils/logger';
import { deviceStateUpdateSchema } from '@shared/schema';
import { ZodError } from 'zod';

/**
 * Device controller for handling device-related API endpoints
 */
const deviceController = {
  /**
   * Get all devices
   */
  async getAllDevices(req: Request, res: Response): Promise<void> {
    try {
      const devices = await storage.getAllDevices();
      res.json(devices);
    } catch (error) {
      logger.error('Failed to get all devices', { error });
      res.status(500).json({ error: 'Failed to get devices' });
    }
  },
  
  /**
   * Get a specific device by ID
   */
  async getDevice(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid device ID' });
        return;
      }
      
      const device = await storage.getDevice(id);
      if (!device) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }
      
      res.json(device);
    } catch (error) {
      logger.error('Failed to get device', { error, deviceId: req.params.id });
      res.status(500).json({ error: 'Failed to get device' });
    }
  },
  
  /**
   * Add a new device
   */
  async addDevice(req: Request, res: Response): Promise<void> {
    try {
      const { name, deviceId, type, protocol, model, manufacturer, location } = req.body;
      
      if (!name || !deviceId || !type || !protocol) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      
      // Check if a device with the same deviceId already exists
      const existingDevice = await storage.getDeviceByDeviceId(deviceId);
      if (existingDevice) {
        res.status(409).json({ error: 'Device with this ID already exists' });
        return;
      }
      
      const newDevice = await storage.insertDevice({
        name,
        deviceId,
        type,
        protocol,
        model,
        manufacturer,
        location,
        status: 'offline', // Default to offline until detected
        config: {},
        state: {}
      });
      
      // Log the activity
      await storage.insertActivity({
        deviceId: newDevice.id,
        activity: 'device_added',
        details: {
          name: newDevice.name,
          type: newDevice.type,
          protocol: newDevice.protocol
        }
      });
      
      logger.info('Device added', { device: newDevice });
      
      // Broadcast to connected clients
      if (req.app.locals.broadcast) {
        req.app.locals.broadcast('device_added', newDevice);
      }
      
      res.status(201).json(newDevice);
    } catch (error) {
      logger.error('Failed to add device', { error, body: req.body });
      res.status(500).json({ error: 'Failed to add device' });
    }
  },
  
  /**
   * Update a device
   */
  async updateDevice(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid device ID' });
        return;
      }
      
      const { name, location, config, state } = req.body;
      
      // Get the existing device
      const existingDevice = await storage.getDevice(id);
      if (!existingDevice) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }
      
      // Update only the provided fields
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (location !== undefined) updates.location = location;
      if (config !== undefined) updates.config = config;
      if (state !== undefined) updates.state = state;
      
      const updatedDevice = await storage.updateDevice(id, updates);
      
      // Log the activity
      await storage.insertActivity({
        deviceId: id,
        activity: 'device_updated',
        details: {
          name: updatedDevice?.name,
          updates
        }
      });
      
      logger.info('Device updated', { deviceId: id, updates });
      
      // Broadcast to connected clients
      if (req.app.locals.broadcast) {
        req.app.locals.broadcast('device_updated', updatedDevice);
      }
      
      res.json(updatedDevice);
    } catch (error) {
      logger.error('Failed to update device', { error, deviceId: req.params.id });
      res.status(500).json({ error: 'Failed to update device' });
    }
  },
  
  /**
   * Delete a device
   */
  async deleteDevice(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid device ID' });
        return;
      }
      
      // Get the device to check if it exists and for logging
      const device = await storage.getDevice(id);
      if (!device) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }
      
      const success = await storage.deleteDevice(id);
      
      if (success) {
        // Log the activity
        await storage.insertActivity({
          activity: 'device_removed',
          details: {
            name: device.name,
            type: device.type,
            protocol: device.protocol
          }
        });
        
        logger.info('Device deleted', { deviceId: id, name: device.name });
        
        // Broadcast to connected clients
        if (req.app.locals.broadcast) {
          req.app.locals.broadcast('device_deleted', { id });
        }
        
        res.json({ success: true });
      } else {
        res.status(500).json({ error: 'Failed to delete device' });
      }
    } catch (error) {
      logger.error('Failed to delete device', { error, deviceId: req.params.id });
      res.status(500).json({ error: 'Failed to delete device' });
    }
  },
  
  /**
   * Update a device's state
   */
  async updateDeviceState(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid device ID' });
        return;
      }
      
      // Validate request body
      try {
        deviceStateUpdateSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({ error: 'Invalid device state data', details: error.errors });
          return;
        }
        throw error;
      }
      
      const { state } = req.body;
      
      // Get the existing device
      const existingDevice = await storage.getDevice(id);
      if (!existingDevice) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }
      
      // Update the device state
      const updatedDevice = await storage.updateDeviceState(id, state);
      
      // Log the activity
      await storage.insertActivity({
        deviceId: id,
        activity: 'state_change',
        details: {
          name: existingDevice.name,
          type: existingDevice.type,
          ...state
        }
      });
      
      logger.info('Device state updated', { deviceId: id, state });
      
      // Broadcast to connected clients
      if (req.app.locals.broadcast) {
        req.app.locals.broadcast('device_state_changed', { id, state: updatedDevice?.state });
      }
      
      // Forward the state update to the appropriate adapter
      const adapterManager = req.app.locals.adapterManager;
      if (adapterManager && existingDevice.protocol) {
        const adapter = adapterManager.getAdapter(existingDevice.protocol);
        if (adapter && adapter.controlDevice) {
          try {
            await adapter.controlDevice(existingDevice.deviceId, state);
          } catch (adapterError) {
            logger.error('Failed to control device via adapter', { 
              error: adapterError, 
              deviceId: id,
              protocol: existingDevice.protocol
            });
            // Don't fail the request if the adapter fails
          }
        }
      }
      
      res.json(updatedDevice);
    } catch (error) {
      logger.error('Failed to update device state', { error, deviceId: req.params.id });
      res.status(500).json({ error: 'Failed to update device state' });
    }
  },
  
  /**
   * Search for devices using protocol adapters
   */
  async searchDevices(req: Request, res: Response): Promise<void> {
    try {
      const { protocol } = req.body;
      
      if (!protocol) {
        res.status(400).json({ error: 'Protocol is required' });
        return;
      }
      
      const adapterManager = req.app.locals.adapterManager;
      if (!adapterManager) {
        res.status(500).json({ error: 'Adapter manager not available' });
        return;
      }
      
      const adapter = adapterManager.getAdapter(protocol);
      if (!adapter) {
        res.status(404).json({ error: `No adapter found for protocol: ${protocol}` });
        return;
      }
      
      // Different protocols have different search methods
      if (protocol === 'zigbee' && adapter.permitJoin) {
        // For Zigbee, enable permit join mode for 60 seconds
        await adapter.permitJoin(true, 60);
        res.json({ success: true, message: 'Zigbee permit join enabled for 60 seconds' });
      } else if (protocol === 'wifi' && adapter.scan) {
        // For WiFi, trigger a network scan
        await adapter.scan();
        res.json({ success: true, message: 'WiFi network scan initiated' });
      } else {
        res.status(400).json({ error: `Search not supported for protocol: ${protocol}` });
      }
    } catch (error) {
      logger.error('Failed to search for devices', { error, body: req.body });
      res.status(500).json({ error: 'Failed to search for devices' });
    }
  },
  
  /**
   * Get recent activities
   */
  async getActivities(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const activities = await storage.getActivities(limit);
      res.json(activities);
    } catch (error) {
      logger.error('Failed to get activities', { error });
      res.status(500).json({ error: 'Failed to get activities' });
    }
  }
};

export default deviceController;
