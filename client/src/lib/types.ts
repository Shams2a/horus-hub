// Adapter types
export interface Adapter {
  id: number;
  name: string;
  type: 'zigbee' | 'wifi' | 'matter' | 'thread' | 'zwave';
  status: 'active' | 'inactive' | 'error';
  config: Record<string, any>;
  lastSeen?: string;
}

// Device types
export interface Device {
  id: number;
  name: string;
  deviceId: string;
  type: string;
  protocol: 'zigbee' | 'wifi' | 'matter' | 'thread' | 'zwave';
  model?: string;
  manufacturer?: string;
  location?: string;
  status: 'online' | 'offline' | 'error';
  battery?: number;
  lastSeen?: string;
  config: Record<string, any>;
  state: Record<string, any>;
}

// Log types
export interface Log {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  details?: Record<string, any>;
}

// Setting types
export interface Setting {
  key: string;
  value: any;
  category: string;
  description?: string;
  updatedAt: string;
}

// Activity types
export interface Activity {
  id: number;
  timestamp: string;
  deviceId?: number;
  activity: string;
  details: Record<string, any>;
}

// System status types
export interface SystemStatus {
  status: 'running' | 'starting' | 'error';
  uptime: string;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
}

// MQTT types
export interface MqttConfig {
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  host: string;
  port: number;
  username?: string;
  password?: string;
  baseTopic: string;
  useTls: boolean;
  cleanSession: boolean;
  retainMessages: boolean;
  persistentConnection: boolean;
}

export interface MqttStatus {
  connected: boolean;
  lastMessageTime?: string;
  messagesPublished: number;
  messagesReceived: number;
}

export interface MqttTopic {
  topic: string;
  qos: number;
  lastMessage?: string;
}

// Zigbee types
export interface ZigbeeConfig {
  serialPort: string;
  baudRate: number;
  adapterType: string;
  channel?: number;
  networkKey: string;
  permitJoin: boolean;
  cacheState: boolean;
}

export interface ZigbeeStatus {
  coordinator: string;
  panId: string;
  channel: number;
  deviceCount: {
    total: number;
    routers: number;
    endDevices: number;
  };
}

// WiFi types
export interface WifiConfig {
  ipRangeStart: string;
  ipRangeEnd: string;
  scanInterval: number;
  enableMdns: boolean;
  serviceTypes: string;
}

export interface WifiStatus {
  networkName: string;
  ipAddress: string;
  macAddress: string;
  signalStrength: 'excellent' | 'good' | 'fair' | 'poor';
  deviceCount: number;
  lastScan: string;
}

// WebSocket message types
export interface WsMessage {
  type: string;
  data: any;
}
