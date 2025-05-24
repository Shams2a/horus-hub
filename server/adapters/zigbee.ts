import { EventEmitter } from 'events';
import logger from '../utils/logger';
import { AdapterManager } from './AdapterManager';
import { storage } from '../storage';
import * as ZigbeeHerdsman from 'zigbee-herdsman';
import { SerialPort } from 'serialport';

// Mock for zigbee-herdsman as we can't use the real library in this environment
class MockZigbeeController extends EventEmitter {
  private devices: Map<string, any>;
  private options: any;
  private isStarted: boolean = false;
  private permitJoinEnabled: boolean = false;
  private permitJoinTimeout: NodeJS.Timeout | null = null;

  constructor(options: any) {
    super();
    this.devices = new Map();
    // Initialiser avec les options par défaut si non fournies
    this.options = {
      serialPort: '/dev/ttyUSB0',
      baudRate: '115200',
      panId: '0x1a62',
      channel: '11',
      coordinator: 'zStack',
      networkKey: '',
      permitJoin: false,
      ...options // Appliquer les options passées en paramètre
    };
    
    // Devices will be populated when real Zigbee devices are discovered
    

  }

  async start(): Promise<void> {
    logger.info('Starting mock Zigbee controller', { port: this.options.serialPort });
    this.isStarted = true;
    
    // Real devices will be discovered when connected to actual Zigbee hardware
    
    return Promise.resolve();
  }

  async stop(): Promise<void> {
    logger.info('Stopping mock Zigbee controller');
    this.isStarted = false;
    return Promise.resolve();
  }

  getConfig(): any {
    return this.options;
  }

  async updateConfig(newConfig: any): Promise<void> {
    logger.info('Updating Zigbee configuration', { newConfig });
    this.options = { ...this.options, ...newConfig };
  }

  async permitJoin(permit: boolean, seconds: number = 60): Promise<void> {
    logger.info('Setting permit join', { permit, seconds });
    this.permitJoinEnabled = permit;
    
    if (this.permitJoinTimeout) {
      clearTimeout(this.permitJoinTimeout);
      this.permitJoinTimeout = null;
    }
    
    if (permit && seconds > 0) {
      this.permitJoinTimeout = setTimeout(() => {
        this.permitJoinEnabled = false;
        this.emit('permitJoinChanged', false);
        logger.info('Permit join timeout, automatically disabled');
      }, seconds * 1000);
    }
    
    this.emit('permitJoinChanged', permit);
    return Promise.resolve();
  }

  getDevices(): any[] {
    return Array.from(this.devices.values());
  }

  getPermitJoin(): boolean {
    return this.permitJoinEnabled;
  }

  async getNetworkParameters(): Promise<any> {
    return {
      panID: '0x1a62',
      extendedPanID: '0xdddddddddddddddd',
      channel: 15
    };
  }

  getCoordinatorVersion(): any {
    return {
      type: 'zStack',
      meta: {
        version: '1.2.3',
        revision: 123
      }
    };
  }

  // Mock method to simulate sending data to a device
  async sendData(device: any, endpoint: number, cluster: number, payload: any): Promise<void> {
    logger.debug('Sending data to device', { device: device.ieeeAddr, endpoint, cluster, payload });
    
    // Simulate a device update after a short delay
    setTimeout(() => {
      const deviceObj = this.devices.get(device.ieeeAddr);
      if (deviceObj) {
        switch (deviceObj.meta.device.type) {
          case 'light':
            if (payload.state !== undefined) {
              deviceObj.meta.device.state.state = payload.state;
            }
            if (payload.brightness !== undefined) {
              deviceObj.meta.device.state.brightness = payload.brightness;
            }
            break;
          case 'lock':
            if (payload.state !== undefined) {
              deviceObj.meta.device.state.state = payload.state;
            }
            break;
        }
        
        this.emit('message', {
          device: deviceObj,
          data: deviceObj.meta.device.state
        });
      }
    }, 500);
    
    return Promise.resolve();
  }
}

// Interface for the ZigbeeAdapter
interface ZigbeeAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  permitJoin(permit: boolean, seconds?: number): Promise<void>;
  getDevices(): any[];
  getNetworkParameters(): Promise<any>;
  getCoordinatorVersion(): any;
  getStatus(): any;
}

// ZigbeeAdapter implementation
class ZigbeeAdapter implements ZigbeeAdapter {
  private controller: MockZigbeeController;
  private adapterManager: AdapterManager;
  
  constructor(options: any, adapterManager: AdapterManager) {
    this.controller = new MockZigbeeController(options);
    this.adapterManager = adapterManager;
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // Handle device joined
    this.controller.on('deviceJoined', async (device) => {
      logger.info('Device joined the network', { 
        ieeeAddr: device.ieeeAddr, 
        manufacturer: device.manufacturerName 
      });
      
      // Check if device already exists in storage
      const existingDevice = await storage.getDeviceByDeviceId(device.ieeeAddr);
      if (!existingDevice) {
        // Add the device to storage
        const deviceType = device.meta?.device?.type || 'unknown';
        const deviceName = `${device.manufacturerName || 'Unknown'} ${deviceType}`;
        
        const newDevice = await storage.insertDevice({
          name: deviceName,
          deviceId: device.ieeeAddr,
          type: deviceType,
          protocol: 'zigbee',
          model: device.modelID,
          manufacturer: device.manufacturerName,
          status: 'online',
          config: {},
          state: device.meta?.device?.state || {}
        });
        
        // Log the activity
        await storage.insertActivity({
          deviceId: newDevice.id,
          activity: 'device_added',
          details: {
            name: newDevice.name,
            type: newDevice.type,
            protocol: 'zigbee'
          }
        });
        
        logger.info('Added new device to storage', { device: newDevice });
      }
    });
    
    // Handle device interview
    this.controller.on('deviceInterview', async (device) => {
      logger.info('Device interview completed', { 
        ieeeAddr: device.ieeeAddr 
      });
      
      // Update device status
      const existingDevice = await storage.getDeviceByDeviceId(device.ieeeAddr);
      if (existingDevice) {
        await storage.updateDevice(existingDevice.id, {
          status: 'online',
          state: device.meta?.device?.state || {}
        });
      }
    });
    
    // Handle messages from devices
    this.controller.on('message', async (message) => {
      logger.debug('Received message from device', { 
        ieeeAddr: message.device.ieeeAddr, 
        data: message.data 
      });
      
      // Update device state in storage
      const existingDevice = await storage.getDeviceByDeviceId(message.device.ieeeAddr);
      if (existingDevice) {
        const updatedDevice = await storage.updateDeviceState(existingDevice.id, message.data);
        
        // Log the activity for state changes
        if (updatedDevice) {
          await storage.insertActivity({
            deviceId: updatedDevice.id,
            activity: 'state_change',
            details: {
              name: updatedDevice.name,
              type: updatedDevice.type,
              ...message.data
            }
          });
        }
      }
    });
    
    // Handle permit join changes
    this.controller.on('permitJoinChanged', (enabled) => {
      logger.info('Permit join status changed', { enabled });
      
      // Notify clients of the change
      if (this.adapterManager.broadcast) {
        this.adapterManager.broadcast('zigbee_permit_join', { enabled });
      }
    });
  }
  
  async start(): Promise<void> {
    try {
      logger.info('Starting Zigbee adapter');
      await this.controller.start();
      
      // Save adapter in storage
      const existingAdapter = await storage.getAdapterByName('zigbee');
      if (existingAdapter) {
        await storage.updateAdapter(existingAdapter.id, { status: 'active' });
      } else {
        await storage.insertAdapter({
          name: 'zigbee',
          type: 'zigbee',
          status: 'active',
          config: {
            serialPort: '/dev/ttyUSB0',
            baudRate: 115200,
            adapterType: 'ember'
          }
        });
      }
      
      logger.info('Zigbee adapter started successfully');
    } catch (error) {
      logger.error('Failed to start Zigbee adapter', { error });
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    try {
      logger.info('Stopping Zigbee adapter');
      await this.controller.stop();
      
      // Update adapter status in storage
      const existingAdapter = await storage.getAdapterByName('zigbee');
      if (existingAdapter) {
        await storage.updateAdapter(existingAdapter.id, { status: 'inactive' });
      }
      
      logger.info('Zigbee adapter stopped successfully');
    } catch (error) {
      logger.error('Failed to stop Zigbee adapter', { error });
      throw error;
    }
  }
  
  async permitJoin(permit: boolean, seconds: number = 60): Promise<void> {
    try {
      await this.controller.permitJoin(permit, seconds);
    } catch (error) {
      logger.error('Failed to set permit join mode', { error });
      throw error;
    }
  }
  
  getDevices(): any[] {
    return this.controller.getDevices();
  }
  
  async getNetworkParameters(): Promise<any> {
    return this.controller.getNetworkParameters();
  }
  
  getCoordinatorVersion(): any {
    return this.controller.getCoordinatorVersion();
  }
  
  getStatus(): any {
    const status = {
      started: true,
      permitJoin: this.controller.getPermitJoin(),
      devices: this.controller.getDevices().length,
      coordinator: this.getCoordinatorVersion()
    };
    
    return status;
  }

  // Method to get current configuration
  getConfig(): any {
    return this.controller.getConfig();
  }

  // Method to update configuration
  async updateConfig(newConfig: any): Promise<void> {
    return this.controller.updateConfig(newConfig);
  }
  
  // Method to control a device (e.g., turn on/off a light)
  async controlDevice(deviceId: string, command: any): Promise<void> {
    logger.debug('Controlling Zigbee device', { deviceId, command });
    
    // Find the device in the controller
    const devices = this.controller.getDevices();
    const device = devices.find(d => d.ieeeAddr === deviceId);
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    
    // Send the command to the device
    // Note: In a real implementation, this would use the appropriate ZCL clusters and commands
    await this.controller.sendData(device, 1, 0, command);
  }
}

// Function to set up and register the Zigbee adapter with the adapter manager
export async function setupZigbeeAdapter(adapterManager: AdapterManager): Promise<ZigbeeAdapter> {
  logger.info('Setting up Zigbee adapter');
  
  // Essayer d'abord l'adaptateur réel seulement si un coordinateur est disponible
  const zigbeeSettings = await storage.getSetting('zigbee');
  const settings = zigbeeSettings?.value || {
    serialPort: '/dev/ttyUSB0',
    baudRate: 115200,
    adapterType: 'ember',
    channel: 15,
    networkKey: '01 03 05 07 09 0B 0D 0F 11 13 15 17 19 1B 1D 1F'
  };

  // Vérifier si on peut utiliser l'adaptateur réel
  let useRealAdapter = false;
  try {
    const { SerialPort } = await import('serialport');
    const ports = await SerialPort.list();
    useRealAdapter = ports.some(port => port.path === settings.serialPort);
    
    if (useRealAdapter) {
      logger.info('Serial port found, attempting to use real Zigbee adapter');
      const { setupRealZigbeeAdapter } = await import('./zigbee-real');
      const realAdapter = await setupRealZigbeeAdapter(adapterManager);
      logger.info('Real Zigbee adapter setup successful');
      return realAdapter as any;
    }
  } catch (realError) {
    logger.warn('Failed to setup real Zigbee adapter, falling back to mock', { error: realError instanceof Error ? realError.message : 'Unknown error' });
  }
  
  // Utiliser l'adaptateur simulé
    const zigbeeSettings = await storage.getSetting('zigbee');
    const settings = zigbeeSettings?.value || {
      serialPort: '/dev/ttyUSB0',
      baudRate: 115200,
      adapterType: 'ember',
      channel: 15,
      networkKey: '01 03 05 07 09 0B 0D 0F 11 13 15 17 19 1B 1D 1F'
    };
    
    // Create a Zigbee adapter instance
    const zigbeeAdapter = new ZigbeeAdapter({
      serialPort: settings.serialPort,
      baudRate: settings.baudRate,
      adapterType: settings.adapterType
    }, adapterManager);
    
    // Register the adapter with the manager
    adapterManager.registerAdapter('zigbee', zigbeeAdapter);
    
    // Start the adapter
    try {
      await zigbeeAdapter.start();
    } catch (error) {
      logger.error('Failed to start Zigbee adapter during setup', { error });
      // We'll continue even if there's an error, so the user can reconfigure the adapter
    }
    
    return zigbeeAdapter;
  }
}
