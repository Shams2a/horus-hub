import { 
  Adapter, InsertAdapter, 
  Device, InsertDevice, 
  Log, InsertLog, 
  Setting, InsertSetting,
  Building, InsertBuilding,
  Room, InsertRoom,
  Activity, InsertActivity 
} from "@shared/schema";

// Storage interface for all database operations
export interface IStorage {
  // Adapter operations
  getAdapter(id: number): Promise<Adapter | undefined>;
  getAdapterByName(name: string): Promise<Adapter | undefined>;
  getAdaptersByType(type: string): Promise<Adapter[]>;
  getAllAdapters(): Promise<Adapter[]>;
  insertAdapter(adapter: InsertAdapter): Promise<Adapter>;
  updateAdapter(id: number, adapter: Partial<Adapter>): Promise<Adapter | undefined>;
  deleteAdapter(id: number): Promise<boolean>;
  
  // Device operations
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceByDeviceId(deviceId: string): Promise<Device | undefined>;
  getDevicesByProtocol(protocol: string): Promise<Device[]>;
  getAllDevices(): Promise<Device[]>;
  insertDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<Device>): Promise<Device | undefined>;
  updateDeviceState(id: number, state: Record<string, any>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;
  
  // Building operations
  getBuilding(id: number): Promise<Building | undefined>;
  getAllBuildings(): Promise<Building[]>;
  insertBuilding(building: InsertBuilding): Promise<Building>;
  updateBuilding(id: number, building: Partial<Building>): Promise<Building | undefined>;
  deleteBuilding(id: number): Promise<boolean>;
  
  // Room operations
  getRoom(id: number): Promise<Room | undefined>;
  getRoomsByBuilding(buildingId: number): Promise<Room[]>;
  getAllRooms(): Promise<Room[]>;
  insertRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<boolean>;
  
  // Log operations
  getLog(id: number): Promise<Log | undefined>;
  getLogs(options: { 
    limit?: number; 
    offset?: number; 
    level?: string; 
    source?: string;
    search?: string;
  }): Promise<{ logs: Log[]; totalCount: number }>;
  insertLog(log: InsertLog): Promise<Log>;
  clearLogs(): Promise<boolean>;
  
  // Setting operations
  getSetting(key: string): Promise<Setting | undefined>;
  getSettingsByCategory(category: string): Promise<Setting[]>;
  getAllSettings(): Promise<Setting[]>;
  insertSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(key: string, value: any): Promise<Setting | undefined>;
  deleteSetting(key: string): Promise<boolean>;
  
  // Activity operations
  getActivity(id: number): Promise<Activity | undefined>;
  getActivities(limit?: number): Promise<Activity[]>;
  insertActivity(activity: InsertActivity): Promise<Activity>;
}

// In-memory implementation of the storage interface
export class MemStorage implements IStorage {
  private adapters: Map<number, Adapter>;
  private devices: Map<number, Device>;
  private logs: Map<number, Log>;
  private settings: Map<string, Setting>;
  private activities: Map<number, Activity>;
  private buildings: Map<number, Building>;
  private rooms: Map<number, Room>;
  
  private nextAdapterId: number;
  private nextDeviceId: number;
  private nextLogId: number;
  private nextActivityId: number;
  private nextBuildingId: number;
  private nextRoomId: number;
  
  constructor() {
    this.adapters = new Map();
    this.devices = new Map();
    this.logs = new Map();
    this.settings = new Map();
    this.activities = new Map();
    
    this.nextAdapterId = 1;
    this.nextDeviceId = 1;
    this.nextLogId = 1;
    this.nextActivityId = 1;
    
    // Initialize with default settings
    this.initializeDefaultSettings();
  }
  
  private initializeDefaultSettings(): void {
    // General settings
    this.insertSetting({
      key: 'general',
      value: {
        systemName: 'Horus Hub',
        location: 'Home',
        timezone: 'UTC',
        language: 'English',
        webInterfacePort: 8001,
        autoUpdate: true
      },
      category: 'general',
      description: 'General system settings'
    });
    
    // Network settings
    this.insertSetting({
      key: 'network',
      value: {
        ipAddress: '192.168.1.105',
        networkMode: 'DHCP',
        hostname: 'horushub'
      },
      category: 'network',
      description: 'Network configuration settings'
    });
    
    // Zigbee settings
    this.insertSetting({
      key: 'zigbee',
      value: {
        serialPort: '/dev/ttyUSB0',
        baudRate: 115200,
        adapterType: 'ember',
        channel: 15,
        networkKey: '01 03 05 07 09 0B 0D 0F 11 13 15 17 19 1B 1D 1F',
        permitJoin: false,
        cacheState: true
      },
      category: 'zigbee',
      description: 'Zigbee adapter settings'
    });
    
    // WiFi settings
    this.insertSetting({
      key: 'wifi',
      value: {
        ipRangeStart: '192.168.1.1',
        ipRangeEnd: '192.168.1.254',
        scanInterval: 30,
        enableMdns: true,
        serviceTypes: '_hap._tcp.local.,_http._tcp.local.'
      },
      category: 'wifi',
      description: 'WiFi adapter settings'
    });
    
    // MQTT settings
    this.insertSetting({
      key: 'mqtt',
      value: {
        protocol: 'mqtt',
        host: 'localhost',
        port: 1883,
        username: '',
        password: '',
        baseTopic: 'horus',
        useTls: false,
        cleanSession: true,
        retainMessages: false,
        persistentConnection: true
      },
      category: 'mqtt',
      description: 'MQTT broker settings'
    });
    
    // Logging settings
    this.insertSetting({
      key: 'logging',
      value: {
        logLevel: 'info',
        logRetention: 7,
        consoleLog: true,
        fileLog: true,
        logRotation: true
      },
      category: 'logging',
      description: 'Log configuration settings'
    });
  }
  
  // Adapter methods
  async getAdapter(id: number): Promise<Adapter | undefined> {
    return this.adapters.get(id);
  }
  
  async getAdapterByName(name: string): Promise<Adapter | undefined> {
    return Array.from(this.adapters.values()).find(adapter => adapter.name === name);
  }
  
  async getAdaptersByType(type: string): Promise<Adapter[]> {
    return Array.from(this.adapters.values()).filter(adapter => adapter.type === type);
  }
  
  async getAllAdapters(): Promise<Adapter[]> {
    return Array.from(this.adapters.values());
  }
  
  async insertAdapter(adapter: InsertAdapter): Promise<Adapter> {
    const id = this.nextAdapterId++;
    const newAdapter: Adapter = {
      ...adapter,
      id,
      lastSeen: new Date().toISOString()
    };
    this.adapters.set(id, newAdapter);
    return newAdapter;
  }
  
  async updateAdapter(id: number, adapter: Partial<Adapter>): Promise<Adapter | undefined> {
    const existingAdapter = this.adapters.get(id);
    if (!existingAdapter) return undefined;
    
    const updatedAdapter: Adapter = {
      ...existingAdapter,
      ...adapter,
      lastSeen: new Date().toISOString()
    };
    this.adapters.set(id, updatedAdapter);
    return updatedAdapter;
  }
  
  async deleteAdapter(id: number): Promise<boolean> {
    return this.adapters.delete(id);
  }
  
  // Device methods
  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }
  
  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    return Array.from(this.devices.values()).find(device => device.deviceId === deviceId);
  }
  
  async getDevicesByProtocol(protocol: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(device => device.protocol === protocol);
  }
  
  async getAllDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }
  
  async insertDevice(device: InsertDevice): Promise<Device> {
    const id = this.nextDeviceId++;
    const newDevice: Device = {
      ...device,
      id,
      lastSeen: new Date().toISOString()
    };
    this.devices.set(id, newDevice);
    return newDevice;
  }
  
  async updateDevice(id: number, device: Partial<Device>): Promise<Device | undefined> {
    const existingDevice = this.devices.get(id);
    if (!existingDevice) return undefined;
    
    const updatedDevice: Device = {
      ...existingDevice,
      ...device,
      lastSeen: new Date().toISOString()
    };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }
  
  async updateDeviceState(id: number, state: Record<string, any>): Promise<Device | undefined> {
    const existingDevice = this.devices.get(id);
    if (!existingDevice) return undefined;
    
    const updatedDevice: Device = {
      ...existingDevice,
      state: {
        ...existingDevice.state,
        ...state
      },
      lastSeen: new Date().toISOString()
    };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }
  
  async deleteDevice(id: number): Promise<boolean> {
    return this.devices.delete(id);
  }
  
  // Log methods
  async getLog(id: number): Promise<Log | undefined> {
    return this.logs.get(id);
  }
  
  async getLogs(options: { 
    limit?: number; 
    offset?: number; 
    level?: string; 
    source?: string;
    search?: string;
  }): Promise<{ logs: Log[]; totalCount: number }> {
    const { limit = 100, offset = 0, level, source, search } = options;
    
    // Filter logs based on criteria
    let filteredLogs = Array.from(this.logs.values());
    
    if (level && level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (source && source !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.source === source);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.source.toLowerCase().includes(searchLower) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
      );
    }
    
    // Sort logs by timestamp, newest first
    filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);
    
    return {
      logs: paginatedLogs,
      totalCount: filteredLogs.length
    };
  }
  
  async insertLog(log: InsertLog): Promise<Log> {
    const id = this.nextLogId++;
    const newLog: Log = {
      ...log,
      id,
      timestamp: new Date().toISOString()
    };
    this.logs.set(id, newLog);
    
    // Keep logs limited to prevent memory issues
    if (this.logs.size > 1000) {
      // Remove oldest logs
      const logsArray = Array.from(this.logs.entries());
      logsArray.sort((a, b) => 
        new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime()
      );
      
      // Remove the oldest 100 logs
      for (let i = 0; i < 100 && i < logsArray.length; i++) {
        this.logs.delete(logsArray[i][0]);
      }
    }
    
    return newLog;
  }
  
  async clearLogs(): Promise<boolean> {
    this.logs.clear();
    this.nextLogId = 1;
    return true;
  }
  
  // Setting methods
  async getSetting(key: string): Promise<Setting | undefined> {
    return this.settings.get(key);
  }
  
  async getSettingsByCategory(category: string): Promise<Setting[]> {
    return Array.from(this.settings.values()).filter(setting => setting.category === category);
  }
  
  async getAllSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }
  
  async insertSetting(setting: InsertSetting): Promise<Setting> {
    const newSetting: Setting = {
      ...setting,
      updatedAt: new Date().toISOString()
    };
    this.settings.set(setting.key, newSetting);
    return newSetting;
  }
  
  async updateSetting(key: string, value: any): Promise<Setting | undefined> {
    const existingSetting = this.settings.get(key);
    if (!existingSetting) return undefined;
    
    const updatedSetting: Setting = {
      ...existingSetting,
      value,
      updatedAt: new Date().toISOString()
    };
    this.settings.set(key, updatedSetting);
    return updatedSetting;
  }
  
  async deleteSetting(key: string): Promise<boolean> {
    return this.settings.delete(key);
  }
  
  // Activity methods
  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }
  
  async getActivities(limit: number = 20): Promise<Activity[]> {
    const activities = Array.from(this.activities.values());
    
    // Sort by timestamp, newest first
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return activities.slice(0, limit);
  }
  
  async insertActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.nextActivityId++;
    const newActivity: Activity = {
      ...activity,
      id,
      timestamp: new Date().toISOString()
    };
    this.activities.set(id, newActivity);
    
    // Keep activities limited to prevent memory issues
    if (this.activities.size > 1000) {
      // Remove oldest activities
      const activitiesArray = Array.from(this.activities.entries());
      activitiesArray.sort((a, b) => 
        new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime()
      );
      
      // Remove the oldest 100 activities
      for (let i = 0; i < 100 && i < activitiesArray.length; i++) {
        this.activities.delete(activitiesArray[i][0]);
      }
    }
    
    return newActivity;
  }
}

// Create and export a singleton instance of the storage
export const storage = new MemStorage();
