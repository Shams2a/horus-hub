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
    this.buildings = new Map();
    this.rooms = new Map();
    
    this.nextAdapterId = 1;
    this.nextDeviceId = 1;
    this.nextLogId = 1;
    this.nextActivityId = 1;
    this.nextBuildingId = 1;
    this.nextRoomId = 1;
    
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
  
  // Building methods
  async getBuilding(id: number): Promise<Building | undefined> {
    return this.buildings.get(id);
  }
  
  async getAllBuildings(): Promise<Building[]> {
    return Array.from(this.buildings.values());
  }
  
  async insertBuilding(building: InsertBuilding): Promise<Building> {
    const id = this.nextBuildingId++;
    const now = new Date();
    const newBuilding: Building = {
      ...building,
      id,
      created_at: now,
      updated_at: now
    };
    this.buildings.set(id, newBuilding);
    return newBuilding;
  }
  
  async updateBuilding(id: number, building: Partial<Building>): Promise<Building | undefined> {
    const existingBuilding = this.buildings.get(id);
    if (!existingBuilding) {
      return undefined;
    }
    
    const updatedBuilding: Building = {
      ...existingBuilding,
      ...building,
      id: existingBuilding.id,
      updated_at: new Date()
    };
    
    this.buildings.set(id, updatedBuilding);
    return updatedBuilding;
  }
  
  async deleteBuilding(id: number): Promise<boolean> {
    // Check if there are rooms assigned to this building
    const hasRooms = Array.from(this.rooms.values()).some(room => room.building_id === id);
    if (hasRooms) {
      // Building has rooms, cannot delete
      return false;
    }
    
    return this.buildings.delete(id);
  }
  
  // Room methods
  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }
  
  async getRoomsByBuilding(buildingId: number): Promise<Room[]> {
    return Array.from(this.rooms.values())
      .filter(room => room.building_id === buildingId);
  }
  
  async getAllRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }
  
  async insertRoom(room: InsertRoom): Promise<Room> {
    const id = this.nextRoomId++;
    const now = new Date();
    const newRoom: Room = {
      ...room,
      id,
      created_at: now,
      updated_at: now
    };
    this.rooms.set(id, newRoom);
    return newRoom;
  }
  
  async updateRoom(id: number, room: Partial<Room>): Promise<Room | undefined> {
    const existingRoom = this.rooms.get(id);
    if (!existingRoom) {
      return undefined;
    }
    
    const updatedRoom: Room = {
      ...existingRoom,
      ...room,
      id: existingRoom.id,
      updated_at: new Date()
    };
    
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }
  
  async deleteRoom(id: number): Promise<boolean> {
    // Check if there are devices assigned to this room
    // We would need to add a roomId field to devices for this
    // For now just delete the room
    return this.rooms.delete(id);
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
/**
 * DatabaseStorage implements the IStorage interface using PostgreSQL database
 */
export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize default database settings if needed
    this.initializeDefaultSettings();
  }

  private async initializeDefaultSettings(): Promise<void> {
    try {
      // Check if essential settings exist, if not create them
      const generalSettings = await this.getSettingsByCategory('general');
      
      if (generalSettings.length === 0) {
        // Create some default settings
        await this.insertSetting({
          key: 'general.systemName',
          value: 'Horus Hub',
          category: 'general',
          description: 'System name displayed in the UI'
        });
        
        await this.insertSetting({
          key: 'general.location',
          value: 'Home',
          category: 'general',
          description: 'Default location for the system'
        });
        
        await this.insertSetting({
          key: 'database.useCloud',
          value: false,
          category: 'database',
          description: 'Enable or disable cloud database synchronization'
        });
        
        await this.insertSetting({
          key: 'database.syncMode',
          value: 'full',
          category: 'database',
          description: 'Synchronization mode between local and cloud databases'
        });
        
        await this.insertSetting({
          key: 'database.syncInterval',
          value: 60,
          category: 'database',
          description: 'Interval in minutes for database synchronization'
        });
      }
    } catch (error) {
      console.error('Error initializing default settings:', error);
    }
  }
  
  // Adapter operations
  async getAdapter(id: number): Promise<Adapter | undefined> {
    try {
      const [result] = await db.select().from(adapters).where(eq(adapters.id, id));
      return result;
    } catch (error) {
      console.error('Error getting adapter:', error);
      return undefined;
    }
  }

  async getAdapterByName(name: string): Promise<Adapter | undefined> {
    try {
      const [result] = await db.select().from(adapters).where(eq(adapters.name, name));
      return result;
    } catch (error) {
      console.error('Error getting adapter by name:', error);
      return undefined;
    }
  }

  async getAdaptersByType(type: string): Promise<Adapter[]> {
    try {
      return await db.select().from(adapters).where(eq(adapters.type, type));
    } catch (error) {
      console.error('Error getting adapters by type:', error);
      return [];
    }
  }

  async getAllAdapters(): Promise<Adapter[]> {
    try {
      return await db.select().from(adapters);
    } catch (error) {
      console.error('Error getting all adapters:', error);
      return [];
    }
  }

  async insertAdapter(adapter: InsertAdapter): Promise<Adapter> {
    try {
      const [result] = await db.insert(adapters).values(adapter).returning();
      return result;
    } catch (error) {
      console.error('Error inserting adapter:', error);
      throw error;
    }
  }

  async updateAdapter(id: number, adapter: Partial<Adapter>): Promise<Adapter | undefined> {
    try {
      const [result] = await db
        .update(adapters)
        .set({
          ...adapter,
          lastSeen: new Date()
        })
        .where(eq(adapters.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating adapter:', error);
      return undefined;
    }
  }

  async deleteAdapter(id: number): Promise<boolean> {
    try {
      const result = await db.delete(adapters).where(eq(adapters.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting adapter:', error);
      return false;
    }
  }

  // Device operations
  async getDevice(id: number): Promise<Device | undefined> {
    try {
      const [result] = await db.select().from(devices).where(eq(devices.id, id));
      return result;
    } catch (error) {
      console.error('Error getting device:', error);
      return undefined;
    }
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    try {
      const [result] = await db.select().from(devices).where(eq(devices.deviceId, deviceId));
      return result;
    } catch (error) {
      console.error('Error getting device by deviceId:', error);
      return undefined;
    }
  }

  async getDevicesByProtocol(protocol: string): Promise<Device[]> {
    try {
      return await db.select().from(devices).where(eq(devices.protocol, protocol));
    } catch (error) {
      console.error('Error getting devices by protocol:', error);
      return [];
    }
  }

  async getAllDevices(): Promise<Device[]> {
    try {
      return await db.select().from(devices);
    } catch (error) {
      console.error('Error getting all devices:', error);
      return [];
    }
  }

  async insertDevice(device: InsertDevice): Promise<Device> {
    try {
      const [result] = await db.insert(devices).values({
        ...device,
        lastSeen: new Date()
      }).returning();
      return result;
    } catch (error) {
      console.error('Error inserting device:', error);
      throw error;
    }
  }

  async updateDevice(id: number, device: Partial<Device>): Promise<Device | undefined> {
    try {
      const [result] = await db
        .update(devices)
        .set({
          ...device,
          lastSeen: new Date()
        })
        .where(eq(devices.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating device:', error);
      return undefined;
    }
  }

  async updateDeviceState(id: number, state: Record<string, any>): Promise<Device | undefined> {
    try {
      const [device] = await db.select().from(devices).where(eq(devices.id, id));
      
      if (!device) {
        return undefined;
      }
      
      const [result] = await db
        .update(devices)
        .set({
          state,
          lastSeen: new Date()
        })
        .where(eq(devices.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating device state:', error);
      return undefined;
    }
  }

  async deleteDevice(id: number): Promise<boolean> {
    try {
      const result = await db.delete(devices).where(eq(devices.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting device:', error);
      return false;
    }
  }

  // Building operations
  async getBuilding(id: number): Promise<Building | undefined> {
    try {
      const [result] = await db.select().from(buildings).where(eq(buildings.id, id));
      return result;
    } catch (error) {
      console.error('Error getting building:', error);
      return undefined;
    }
  }

  async getAllBuildings(): Promise<Building[]> {
    try {
      return await db.select().from(buildings);
    } catch (error) {
      console.error('Error getting all buildings:', error);
      return [];
    }
  }

  async insertBuilding(building: InsertBuilding): Promise<Building> {
    try {
      const now = new Date();
      const [result] = await db.insert(buildings).values({
        ...building,
        created_at: now,
        updated_at: now
      }).returning();
      return result;
    } catch (error) {
      console.error('Error inserting building:', error);
      throw error;
    }
  }

  async updateBuilding(id: number, building: Partial<Building>): Promise<Building | undefined> {
    try {
      const [result] = await db
        .update(buildings)
        .set({
          ...building,
          updated_at: new Date()
        })
        .where(eq(buildings.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating building:', error);
      return undefined;
    }
  }

  async deleteBuilding(id: number): Promise<boolean> {
    try {
      const result = await db.delete(buildings).where(eq(buildings.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting building:', error);
      return false;
    }
  }

  // Room operations
  async getRoom(id: number): Promise<Room | undefined> {
    try {
      const [result] = await db.select().from(rooms).where(eq(rooms.id, id));
      return result;
    } catch (error) {
      console.error('Error getting room:', error);
      return undefined;
    }
  }

  async getRoomsByBuilding(buildingId: number): Promise<Room[]> {
    try {
      return await db.select().from(rooms).where(eq(rooms.building_id, buildingId));
    } catch (error) {
      console.error('Error getting rooms by building:', error);
      return [];
    }
  }

  async getAllRooms(): Promise<Room[]> {
    try {
      return await db.select().from(rooms);
    } catch (error) {
      console.error('Error getting all rooms:', error);
      return [];
    }
  }

  async insertRoom(room: InsertRoom): Promise<Room> {
    try {
      const now = new Date();
      const [result] = await db.insert(rooms).values({
        ...room,
        created_at: now,
        updated_at: now
      }).returning();
      return result;
    } catch (error) {
      console.error('Error inserting room:', error);
      throw error;
    }
  }

  async updateRoom(id: number, room: Partial<Room>): Promise<Room | undefined> {
    try {
      const [result] = await db
        .update(rooms)
        .set({
          ...room,
          updated_at: new Date()
        })
        .where(eq(rooms.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating room:', error);
      return undefined;
    }
  }

  async deleteRoom(id: number): Promise<boolean> {
    try {
      const result = await db.delete(rooms).where(eq(rooms.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting room:', error);
      return false;
    }
  }

  // Log operations
  async getLog(id: number): Promise<Log | undefined> {
    try {
      const [result] = await db.select().from(logs).where(eq(logs.id, id));
      return result;
    } catch (error) {
      console.error('Error getting log:', error);
      return undefined;
    }
  }

  async getLogs(options: { 
    limit?: number; 
    offset?: number; 
    level?: string; 
    source?: string;
    search?: string;
  }): Promise<{ logs: Log[]; totalCount: number }> {
    try {
      const { limit = 50, offset = 0, level, source, search } = options;
      
      let query = db.select().from(logs);
      let countQuery = db.select({ count: sql`count(*)` }).from(logs);
      
      const conditions = [];
      
      if (level) {
        conditions.push(eq(logs.level, level));
      }
      
      if (source) {
        conditions.push(eq(logs.source, source));
      }
      
      if (search) {
        conditions.push(like(logs.message, `%${search}%`));
      }
      
      if (conditions.length > 0) {
        const condition = and(...conditions);
        query = query.where(condition);
        countQuery = countQuery.where(condition);
      }
      
      const [countResult] = await countQuery;
      const totalCount = Number(countResult.count);
      
      const results = await query
        .orderBy(desc(logs.timestamp))
        .limit(limit)
        .offset(offset);
      
      return { logs: results, totalCount };
    } catch (error) {
      console.error('Error getting logs:', error);
      return { logs: [], totalCount: 0 };
    }
  }

  async insertLog(log: InsertLog): Promise<Log> {
    try {
      const [result] = await db.insert(logs).values({
        ...log,
        timestamp: new Date()
      }).returning();
      return result;
    } catch (error) {
      console.error('Error inserting log:', error);
      throw error;
    }
  }

  async clearLogs(): Promise<boolean> {
    try {
      await db.delete(logs);
      return true;
    } catch (error) {
      console.error('Error clearing logs:', error);
      return false;
    }
  }

  // Setting operations
  async getSetting(key: string): Promise<Setting | undefined> {
    try {
      const [result] = await db.select().from(settings).where(eq(settings.key, key));
      return result;
    } catch (error) {
      console.error('Error getting setting:', error);
      return undefined;
    }
  }

  async getSettingsByCategory(category: string): Promise<Setting[]> {
    try {
      return await db.select().from(settings).where(eq(settings.category, category));
    } catch (error) {
      console.error('Error getting settings by category:', error);
      return [];
    }
  }

  async getAllSettings(): Promise<Setting[]> {
    try {
      return await db.select().from(settings);
    } catch (error) {
      console.error('Error getting all settings:', error);
      return [];
    }
  }

  async insertSetting(setting: InsertSetting): Promise<Setting> {
    try {
      const [result] = await db.insert(settings).values({
        ...setting,
        updatedAt: new Date()
      }).returning();
      return result;
    } catch (error) {
      console.error('Error inserting setting:', error);
      
      // If the setting already exists, try updating it
      try {
        const existingSetting = await this.getSetting(setting.key);
        if (existingSetting) {
          return await this.updateSetting(setting.key, setting.value);
        }
        throw error;
      } catch (updateError) {
        console.error('Error updating existing setting:', updateError);
        throw error;
      }
    }
  }

  async updateSetting(key: string, value: any): Promise<Setting | undefined> {
    try {
      const [result] = await db
        .update(settings)
        .set({
          value,
          updatedAt: new Date()
        })
        .where(eq(settings.key, key))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating setting:', error);
      return undefined;
    }
  }

  async deleteSetting(key: string): Promise<boolean> {
    try {
      const result = await db.delete(settings).where(eq(settings.key, key));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting setting:', error);
      return false;
    }
  }

  // Activity operations
  async getActivity(id: number): Promise<Activity | undefined> {
    try {
      const [result] = await db.select().from(activities).where(eq(activities.id, id));
      return result;
    } catch (error) {
      console.error('Error getting activity:', error);
      return undefined;
    }
  }

  async getActivities(limit: number = 20): Promise<Activity[]> {
    try {
      return await db
        .select()
        .from(activities)
        .orderBy(desc(activities.timestamp))
        .limit(limit);
    } catch (error) {
      console.error('Error getting activities:', error);
      return [];
    }
  }

  async insertActivity(activity: InsertActivity): Promise<Activity> {
    try {
      const [result] = await db.insert(activities).values({
        ...activity,
        timestamp: new Date()
      }).returning();
      return result;
    } catch (error) {
      console.error('Error inserting activity:', error);
      throw error;
    }
  }
}

// For now, continue using MemStorage while we develop the database implementation
// The DatabaseStorage class implementation needs to be fixed before it can be used
const storageImpl = new MemStorage();

export const storage = storageImpl;
