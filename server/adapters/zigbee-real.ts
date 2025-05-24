import { EventEmitter } from 'events';
import logger from '../utils/logger';
import { AdapterManager } from './AdapterManager';
import { storage } from '../storage';
import * as ZigbeeHerdsman from 'zigbee-herdsman';
import { SerialPort } from 'serialport';

// Interface pour le contrôleur Zigbee réel
interface ZigbeeControllerInterface {
  start(): Promise<void>;
  stop(): Promise<void>;
  permitJoin(permit: boolean, timeout?: number): Promise<void>;
  getDevices(): any[];
  getNetworkParameters(): any;
  getCoordinatorVersion(): any;
  reset(): Promise<void>;
}

// Contrôleur Zigbee réel utilisant zigbee-herdsman
class RealZigbeeController extends EventEmitter implements ZigbeeControllerInterface {
  private controller: any = null;
  public options: any;
  private isStarted: boolean = false;
  private permitJoinEnabled: boolean = false;
  private permitJoinTimeout: NodeJS.Timeout | null = null;
  private devices: Map<string, any> = new Map();

  constructor(options: any) {
    super();
    this.options = {
      serialPort: '/dev/ttyUSB0',
      baudRate: 115200,
      adapter: 'zstack',
      panID: 0x1a62,
      channel: 15,
      networkKey: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31],
      ...options
    };
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting real Zigbee controller', { 
        port: this.options.serialPort,
        adapter: this.options.adapter 
      });

      // Vérifier si le port série existe
      const ports = await SerialPort.list();
      const portExists = ports.some(port => port.path === this.options.serialPort);
      
      if (!portExists) {
        logger.warn('Serial port not found, available ports:', ports.map(p => p.path));
        throw new Error(`Port série ${this.options.serialPort} non trouvé`);
      }

      // Configuration pour zigbee-herdsman
      const config = {
        serialPort: {
          path: this.options.serialPort,
          baudRate: this.options.baudRate
        },
        adapter: this.options.adapter,
        network: {
          panID: this.options.panID,
          channel: this.options.channel,
          channelList: [this.options.channel],
          networkKey: this.options.networkKey
        },
        databasePath: './data/zigbee.db',
        databaseBackupPath: './data/zigbee_backup.db',
        backupPath: './data/zigbee_backup.json',
        acceptJoiningDeviceHandler: (ieeeAddr: string) => {
          logger.info('Device joining', { ieeeAddr });
          return Promise.resolve(true);
        }
      };

      this.controller = new ZigbeeHerdsman.Controller(config);

      // Événements du contrôleur
      this.controller.on('deviceJoined', this.onDeviceJoined.bind(this));
      this.controller.on('deviceLeft', this.onDeviceLeft.bind(this));
      this.controller.on('deviceAnnounce', this.onDeviceAnnounce.bind(this));
      this.controller.on('message', this.onMessage.bind(this));

      await this.controller.start();
      
      // Charger les appareils existants
      await this.loadExistingDevices();
      
      this.isStarted = true;
      logger.info('Zigbee controller started successfully');

    } catch (error) {
      logger.error('Failed to start Zigbee controller', { error: error.message });
      this.isStarted = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.controller) {
        await this.controller.stop();
        this.controller = null;
      }
      this.isStarted = false;
      logger.info('Zigbee controller stopped');
    } catch (error) {
      logger.error('Error stopping Zigbee controller', { error });
    }
  }

  async permitJoin(permit: boolean, timeout: number = 60): Promise<void> {
    try {
      if (!this.controller) {
        throw new Error('Contrôleur Zigbee non démarré');
      }

      await this.controller.permitJoin(permit, timeout);
      this.permitJoinEnabled = permit;

      if (this.permitJoinTimeout) {
        clearTimeout(this.permitJoinTimeout);
        this.permitJoinTimeout = null;
      }

      if (permit && timeout > 0) {
        this.permitJoinTimeout = setTimeout(async () => {
          await this.controller.permitJoin(false);
          this.permitJoinEnabled = false;
          this.emit('permitJoinChanged', false);
          logger.info('Permit join timeout, automatically disabled');
        }, timeout * 1000);
      }

      this.emit('permitJoinChanged', permit);
      logger.info('Permit join set', { permit, timeout });

    } catch (error) {
      logger.error('Failed to set permit join', { error });
      throw error;
    }
  }

  getDevices(): any[] {
    if (!this.controller) {
      return Array.from(this.devices.values());
    }

    try {
      const devices = this.controller.getDevices();
      return devices.map((device: any) => ({
        ieeeAddr: device.ieeeAddr,
        networkAddress: device.networkAddress,
        friendlyName: device.definition?.description || device.ieeeAddr,
        type: device.type,
        manufacturer: device.definition?.vendor,
        model: device.definition?.model,
        modelID: device.modelID,
        powerSource: device.powerSource,
        interviewCompleted: device.interviewCompleted,
        interviewing: device.interviewing,
        lastSeen: device.lastSeen
      }));
    } catch (error) {
      logger.error('Error getting devices', { error });
      return Array.from(this.devices.values());
    }
  }

  getNetworkParameters(): any {
    if (!this.controller) {
      return {
        panID: this.options.panID,
        channel: this.options.channel,
        extendedPanID: '0xdddddddddddddddd'
      };
    }

    try {
      return {
        panID: this.controller.getNetworkParameters().panID,
        channel: this.controller.getNetworkParameters().channel,
        extendedPanID: this.controller.getNetworkParameters().extendedPanID
      };
    } catch (error) {
      logger.error('Error getting network parameters', { error });
      return {
        panID: this.options.panID,
        channel: this.options.channel,
        extendedPanID: '0xdddddddddddddddd'
      };
    }
  }

  getCoordinatorVersion(): any {
    if (!this.controller) {
      return {
        type: this.options.adapter,
        meta: { version: 'Unknown', revision: 0 }
      };
    }

    try {
      const version = this.controller.getCoordinatorVersion();
      return {
        type: version.type || this.options.adapter,
        meta: version.meta || { version: 'Unknown', revision: 0 }
      };
    } catch (error) {
      logger.error('Error getting coordinator version', { error });
      return {
        type: this.options.adapter,
        meta: { version: 'Unknown', revision: 0 }
      };
    }
  }

  async reset(): Promise<void> {
    try {
      if (this.controller) {
        await this.controller.reset('soft');
        logger.info('Zigbee controller reset');
      }
    } catch (error) {
      logger.error('Error resetting controller', { error });
    }
  }

  private async loadExistingDevices(): Promise<void> {
    try {
      const devices = this.getDevices();
      devices.forEach(device => {
        this.devices.set(device.ieeeAddr, device);
      });
      logger.info(`Loaded ${devices.length} existing Zigbee devices`);
    } catch (error) {
      logger.error('Error loading existing devices', { error });
    }
  }

  private onDeviceJoined(device: any): void {
    logger.info('Device joined', { 
      ieeeAddr: device.ieeeAddr, 
      friendlyName: device.definition?.description 
    });
    
    this.devices.set(device.ieeeAddr, {
      ieeeAddr: device.ieeeAddr,
      networkAddress: device.networkAddress,
      friendlyName: device.definition?.description || device.ieeeAddr,
      type: device.type,
      manufacturer: device.definition?.vendor,
      model: device.definition?.model
    });

    this.emit('deviceJoined', device);
  }

  private onDeviceLeft(device: any): void {
    logger.info('Device left', { ieeeAddr: device.ieeeAddr });
    this.devices.delete(device.ieeeAddr);
    this.emit('deviceLeft', device);
  }

  private onDeviceAnnounce(device: any): void {
    logger.info('Device announced', { ieeeAddr: device.ieeeAddr });
    this.emit('deviceAnnounce', device);
  }

  private onMessage(data: any): void {
    // Traiter les messages des appareils
    if (data.device) {
      const device = this.devices.get(data.device.ieeeAddr);
      if (device) {
        device.lastSeen = new Date().toISOString();
        this.devices.set(data.device.ieeeAddr, device);
      }
    }
    this.emit('message', data);
  }
}

// Adaptateur Zigbee principal qui utilise le contrôleur réel
export class RealZigbeeAdapter extends EventEmitter {
  private controller: RealZigbeeController;
  private adapterManager: AdapterManager;
  private started: boolean = false;

  constructor(options: any, adapterManager: AdapterManager) {
    super();
    this.controller = new RealZigbeeController(options);
    this.adapterManager = adapterManager;

    // Transmettre les événements du contrôleur
    this.controller.on('deviceJoined', (device) => {
      this.emit('deviceJoined', device);
      if (this.adapterManager.broadcast) {
        this.adapterManager.broadcast('zigbee:deviceJoined', device);
      }
    });

    this.controller.on('deviceLeft', (device) => {
      this.emit('deviceLeft', device);
      if (this.adapterManager.broadcast) {
        this.adapterManager.broadcast('zigbee:deviceLeft', device);
      }
    });

    this.controller.on('permitJoinChanged', (permit) => {
      this.emit('permitJoinChanged', permit);
      if (this.adapterManager.broadcast) {
        this.adapterManager.broadcast('zigbee:permitJoinChanged', permit);
      }
    });
  }

  async start(): Promise<void> {
    try {
      await this.controller.start();
      this.started = true;
      logger.info('Real Zigbee adapter started successfully');
    } catch (error) {
      logger.error('Failed to start real Zigbee adapter', { error });
      this.started = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.controller.stop();
      this.started = false;
      logger.info('Real Zigbee adapter stopped');
    } catch (error) {
      logger.error('Error stopping real Zigbee adapter', { error });
    }
  }

  async permitJoin(permit: boolean, seconds: number = 60): Promise<void> {
    return await this.controller.permitJoin(permit, seconds);
  }

  getDevices(): any[] {
    return this.controller.getDevices();
  }

  getStatus(): any {
    const networkParams = this.controller.getNetworkParameters();
    const coordinator = this.controller.getCoordinatorVersion();
    const devices = this.getDevices();

    const routerCount = devices.filter(d => d.type === 'Router').length;
    const endDeviceCount = devices.filter(d => d.type === 'EndDevice').length;

    return {
      coordinator: coordinator.type,
      panId: networkParams.panID,
      channel: networkParams.channel,
      deviceCount: {
        total: devices.length,
        routers: routerCount,
        endDevices: endDeviceCount
      }
    };
  }

  async getNetworkParameters(): Promise<any> {
    return this.controller.getNetworkParameters();
  }

  getCoordinatorVersion(): any {
    return this.controller.getCoordinatorVersion();
  }

  async updateConfig(newConfig: any): Promise<void> {
    logger.info('Updating real Zigbee configuration', { newConfig });
    
    // Sauvegarder la configuration dans le stockage
    await storage.insertSetting({
      key: 'zigbee',
      value: newConfig,
      category: 'adapter'
    });
    
    logger.info('Zigbee configuration saved to storage');
  }

  getConfig(): any {
    return this.controller.options;
  }

  async reset(): Promise<void> {
    return await this.controller.reset();
  }

  async testConnection(): Promise<boolean> {
    try {
      const coordinator = this.controller.getCoordinatorVersion();
      return coordinator && coordinator.type !== 'Unknown';
    } catch (error) {
      return false;
    }
  }
}

// Fonction de configuration de l'adaptateur Zigbee réel
export async function setupRealZigbeeAdapter(adapterManager: AdapterManager): Promise<RealZigbeeAdapter> {
  logger.info('Setting up real Zigbee adapter');
  
  // Récupérer les paramètres Zigbee depuis le stockage
  const zigbeeSettings = await storage.getSetting('zigbee');
  const settings = zigbeeSettings?.value || {
    serialPort: '/dev/ttyUSB0',
    baudRate: 115200,
    adapter: 'zstack',
    panID: 0x1a62,
    channel: 15,
    networkKey: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]
  };
  
  // Créer l'adaptateur Zigbee réel
  const zigbeeAdapter = new RealZigbeeAdapter(settings, adapterManager);
  
  // Enregistrer l'adaptateur avec le gestionnaire
  adapterManager.registerAdapter('zigbee', zigbeeAdapter);
  
  // Démarrer l'adaptateur
  try {
    await zigbeeAdapter.start();
  } catch (error) {
    logger.error('Failed to start real Zigbee adapter during setup', { error });
    // Continuer même en cas d'erreur pour permettre la reconfiguration
  }
  
  return zigbeeAdapter;
}