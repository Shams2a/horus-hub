import { EventEmitter } from 'events';
import logger from '../utils/logger';
import { AdapterManager } from './AdapterManager';
import { storage } from '../storage';

/**
 * Mock for node-wifi module as we can't use the real hardware in this environment
 */
class MockWifiScanner extends EventEmitter {
  private devices: Map<string, any>;
  private networkInfo: any;
  private scanInterval: NodeJS.Timeout | null = null;
  private scanIntervalTime: number = 30000; // 30 seconds default

  constructor() {
    super();
    this.devices = new Map();
    this.networkInfo = {
      networkName: 'HorusHubNetwork',
      ipAddress: '192.168.1.105',
      macAddress: '00:0a:95:9d:68:16',
      signalStrength: 'excellent',
      lastScan: new Date().toISOString()
    };

    // WiFi devices will be discovered on your real network
  }

  async init(): Promise<void> {
    logger.info('Initializing WiFi scanner');
    return Promise.resolve();
  }

  async scan(): Promise<any[]> {
    logger.info('Scanning for WiFi devices');
    this.networkInfo.lastScan = new Date().toISOString();
    
    // Simulate some device state changes during scan
    this.devices.forEach((device) => {
      if (Math.random() > 0.7) {
        device.online = !device.online;
        this.emit('deviceStatusChanged', device);
      }
    });
    
    this.emit('scanComplete', Array.from(this.devices.values()));
    return Array.from(this.devices.values());
  }

  async startPeriodicScan(intervalMs: number): Promise<void> {
    this.stopPeriodicScan();
    this.scanIntervalTime = intervalMs;
    
    this.scanInterval = setInterval(async () => {
      await this.scan();
    }, this.scanIntervalTime);
    
    logger.info(`Started periodic WiFi scanning every ${intervalMs / 1000} seconds`);
  }

  stopPeriodicScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      logger.info('Stopped periodic WiFi scanning');
    }
  }

  getNetworkInfo(): any {
    return this.networkInfo;
  }

  getDevices(): any[] {
    return Array.from(this.devices.values());
  }

  getDevice(ipAddress: string): any {
    return this.devices.get(ipAddress);
  }

  // Mock methods to control devices
  async controlDevice(ipAddress: string, command: any): Promise<any> {
    const device = this.devices.get(ipAddress);
    if (!device) {
      throw new Error(`Device with IP ${ipAddress} not found`);
    }

    logger.debug('Controlling WiFi device', { ipAddress, command });
    
    // Simulate device state change based on command
    if (device.type === 'thermostat' && command.targetTemperature !== undefined) {
      device.state.targetTemperature = command.targetTemperature;
    } else if (device.type === 'speaker') {
      if (command.volume !== undefined) device.state.volume = command.volume;
      if (command.playing !== undefined) device.state.playing = command.playing;
    }
    
    this.emit('deviceStateChanged', { device, state: device.state });
    return device;
  }
}

/**
 * WiFiAdapter class to manage WiFi devices
 */
export class WiFiAdapter {
  private scanner: MockWifiScanner;
  private adapterManager: AdapterManager;
  private started: boolean = false;
  
  constructor(adapterManager: AdapterManager) {
    this.scanner = new MockWifiScanner();
    this.adapterManager = adapterManager;
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // Handle scan completion
    this.scanner.on('scanComplete', async (devices) => {
      logger.info('WiFi scan completed', { deviceCount: devices.length });
      
      // Process each device found in the scan
      for (const device of devices) {
        // Check if device already exists in storage
        const existingDevice = await storage.getDeviceByDeviceId(device.ipAddress);
        
        if (existingDevice) {
          // Update existing device
          await storage.updateDevice(existingDevice.id, {
            status: device.online ? 'online' : 'offline',
            state: device.state || {}
          });
          
          // Log status change
          if (existingDevice.status !== (device.online ? 'online' : 'offline')) {
            await storage.insertActivity({
              deviceId: existingDevice.id,
              activity: 'connection_change',
              details: {
                name: existingDevice.name,
                connected: device.online
              }
            });
          }
        } else {
          // Add new device to storage
          const newDevice = await storage.insertDevice({
            name: device.name || `WiFi Device (${device.ipAddress})`,
            deviceId: device.ipAddress,
            type: device.type || 'unknown',
            protocol: 'wifi',
            model: device.model,
            manufacturer: device.manufacturer,
            status: device.online ? 'online' : 'offline',
            config: {},
            state: device.state || {}
          });
          
          // Log new device added
          await storage.insertActivity({
            deviceId: newDevice.id,
            activity: 'device_added',
            details: {
              name: newDevice.name,
              type: newDevice.type,
              protocol: 'wifi'
            }
          });
          
          logger.info('Added new WiFi device to storage', { device: newDevice });
        }
      }
      
      // Broadcast scan results to clients
      if (this.adapterManager.broadcast) {
        this.adapterManager.broadcast('wifi_scan_complete', { devices });
      }
    });
    
    // Handle device status changes
    this.scanner.on('deviceStatusChanged', async (device) => {
      logger.info('WiFi device status changed', { 
        deviceIp: device.ipAddress,
        status: device.online ? 'online' : 'offline'
      });
      
      // Update device in storage
      const existingDevice = await storage.getDeviceByDeviceId(device.ipAddress);
      if (existingDevice) {
        await storage.updateDevice(existingDevice.id, {
          status: device.online ? 'online' : 'offline'
        });
        
        // Log connection change activity
        await storage.insertActivity({
          deviceId: existingDevice.id,
          activity: 'connection_change',
          details: {
            name: existingDevice.name,
            connected: device.online
          }
        });
        
        // Broadcast change to clients
        if (this.adapterManager.broadcast) {
          this.adapterManager.broadcast('device_status_changed', {
            id: existingDevice.id,
            status: device.online ? 'online' : 'offline'
          });
        }
      }
    });
    
    // Handle device state changes
    this.scanner.on('deviceStateChanged', async (data) => {
      logger.debug('WiFi device state changed', { 
        deviceIp: data.device.ipAddress,
        state: data.state
      });
      
      // Update device state in storage
      const existingDevice = await storage.getDeviceByDeviceId(data.device.ipAddress);
      if (existingDevice) {
        const updatedDevice = await storage.updateDeviceState(existingDevice.id, data.state);
        
        // Log the activity for state changes
        if (updatedDevice) {
          await storage.insertActivity({
            deviceId: updatedDevice.id,
            activity: 'state_change',
            details: {
              name: updatedDevice.name,
              type: updatedDevice.type,
              ...data.state
            }
          });
          
          // Broadcast change to clients
          if (this.adapterManager.broadcast) {
            this.adapterManager.broadcast('device_state_changed', {
              id: updatedDevice.id,
              state: updatedDevice.state
            });
          }
        }
      }
    });
  }
  
  async start(): Promise<void> {
    try {
      logger.info('Starting WiFi adapter');
      await this.scanner.init();
      
      // Get WiFi settings from storage
      const wifiSettings = await storage.getSetting('wifi');
      const settings = wifiSettings?.value || {
        scanInterval: 30,
        enableMdns: true
      };
      
      // Start periodic scanning
      await this.scanner.startPeriodicScan(settings.scanInterval * 60 * 1000);
      
      // Save adapter in storage
      const existingAdapter = await storage.getAdapterByName('wifi');
      if (existingAdapter) {
        await storage.updateAdapter(existingAdapter.id, { status: 'active' });
      } else {
        await storage.insertAdapter({
          name: 'wifi',
          type: 'wifi',
          status: 'active',
          config: {
            scanInterval: settings.scanInterval,
            enableMdns: settings.enableMdns
          }
        });
      }
      
      // Initial scan
      await this.scanner.scan();
      
      this.started = true;
      logger.info('WiFi adapter started successfully');
    } catch (error) {
      logger.error('Failed to start WiFi adapter', { error });
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    try {
      logger.info('Stopping WiFi adapter');
      this.scanner.stopPeriodicScan();
      
      // Update adapter status in storage
      const existingAdapter = await storage.getAdapterByName('wifi');
      if (existingAdapter) {
        await storage.updateAdapter(existingAdapter.id, { status: 'inactive' });
      }
      
      this.started = false;
      logger.info('WiFi adapter stopped successfully');
    } catch (error) {
      logger.error('Failed to stop WiFi adapter', { error });
      throw error;
    }
  }
  
  async scan(): Promise<any[]> {
    return this.scanner.scan();
  }
  
  getStatus(): any {
    return {
      started: this.started,
      networkInfo: this.scanner.getNetworkInfo(),
      deviceCount: this.scanner.getDevices().length
    };
  }
  
  getNetworkInfo(): any {
    return this.scanner.getNetworkInfo();
  }
  
  getDevices(): any[] {
    return this.scanner.getDevices();
  }
  
  async controlDevice(ipAddress: string, command: any): Promise<any> {
    return this.scanner.controlDevice(ipAddress, command);
  }
}

/**
 * Setup and register the WiFi adapter with the adapter manager
 */
export async function setupWifiAdapter(adapterManager: AdapterManager): Promise<WiFiAdapter> {
  logger.info('Setting up WiFi adapter');
  
  // Create WiFi adapter instance
  const wifiAdapter = new WiFiAdapter(adapterManager);
  
  // Register the adapter with the manager
  adapterManager.registerAdapter('wifi', wifiAdapter);
  
  // Start the adapter
  try {
    await wifiAdapter.start();
  } catch (error) {
    logger.error('Failed to start WiFi adapter during setup', { error });
    // We'll continue even if there's an error, so the user can reconfigure the adapter
  }
  
  return wifiAdapter;
}
