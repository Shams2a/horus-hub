import { EventEmitter } from 'events';
import logger from '../utils/logger';
import { AdapterManager } from './AdapterManager';
import { storage } from '../storage';

/**
 * Mock for MQTT client as we can't use the real library in this environment
 */
class MockMqttClient extends EventEmitter {
  private connected: boolean = false;
  private options: any;
  private topics: Map<string, number> = new Map();
  private messagesPublished: number = 0;
  private messagesReceived: number = 0;
  private lastMessageTime: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(url: string, options: any) {
    super();
    this.options = options;
    logger.debug('Creating MQTT client', { url, clientId: options.clientId });
  }

  connect(): this {
    logger.info('Connecting to MQTT broker', { host: this.options.host, port: this.options.port });
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.connected = true;
      this.emit('connect');
      logger.info('Connected to MQTT broker');
      
      // Simulate receiving messages after connection
      this.simulateMessages();
    }, 500);
    
    return this;
  }

  end(force?: boolean): Promise<void> {
    logger.info('Disconnecting from MQTT broker');
    this.connected = false;
    this.emit('close');
    return Promise.resolve();
  }

  subscribe(topic: string | string[], options?: { qos?: number }): Promise<void> {
    const qos = options?.qos || 0;
    
    if (Array.isArray(topic)) {
      topic.forEach(t => {
        this.topics.set(t, qos);
        logger.info('Subscribed to topic', { topic: t, qos });
      });
    } else {
      this.topics.set(topic, qos);
      logger.info('Subscribed to topic', { topic, qos });
    }
    
    return Promise.resolve();
  }

  unsubscribe(topic: string | string[]): Promise<void> {
    if (Array.isArray(topic)) {
      topic.forEach(t => {
        this.topics.delete(t);
        logger.info('Unsubscribed from topic', { topic: t });
      });
    } else {
      this.topics.delete(topic);
      logger.info('Unsubscribed from topic', { topic });
    }
    
    return Promise.resolve();
  }

  publish(topic: string, message: string | Buffer, options?: { qos?: number, retain?: boolean }): Promise<void> {
    const qos = options?.qos || 0;
    const retain = options?.retain || false;
    
    logger.debug('Publishing message', { topic, qos, retain });
    this.messagesPublished++;
    this.lastMessageTime = new Date().toISOString();
    
    // For subscribed topics, simulate receiving the message as well
    if (this.matchesTopic(topic)) {
      this.messagesReceived++;
      
      setTimeout(() => {
        this.emit('message', topic, typeof message === 'string' ? message : message.toString());
      }, 50);
    }
    
    return Promise.resolve();
  }

  private simulateMessages(): void {
    // Periodically simulate receiving messages for subscribed topics
    const interval = setInterval(() => {
      if (!this.connected) {
        clearInterval(interval);
        return;
      }
      
      // Only simulate messages if there are subscribed topics
      if (this.topics.size > 0) {
        const topics = Array.from(this.topics.keys());
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        
        // Generate a random message
        let message;
        if (randomTopic.includes('zigbee')) {
          message = JSON.stringify({
            state: Math.random() > 0.5 ? 'ON' : 'OFF',
            brightness: Math.floor(Math.random() * 100),
            timestamp: new Date().toISOString()
          });
        } else if (randomTopic.includes('wifi')) {
          message = JSON.stringify({
            online: true,
            ip: '192.168.1.120',
            lastSeen: new Date().toISOString()
          });
        } else {
          message = JSON.stringify({
            uptime: Math.floor(Math.random() * 86400),
            memory: {
              free: Math.floor(Math.random() * 512348),
              total: 1048576
            }
          });
        }
        
        this.messagesReceived++;
        this.lastMessageTime = new Date().toISOString();
        this.emit('message', randomTopic, message);
      }
    }, 10000); // Simulate a message every 10 seconds
  }

  private matchesTopic(publishTopic: string): boolean {
    // Check if any subscribed topic matches the published topic
    // including wildcard topics like 'horus/+/status'
    for (const subscribedTopic of this.topics.keys()) {
      if (this.topicMatches(subscribedTopic, publishTopic)) {
        return true;
      }
    }
    return false;
  }

  private topicMatches(subscribedTopic: string, publishTopic: string): boolean {
    // Simple wildcard matching
    const subParts = subscribedTopic.split('/');
    const pubParts = publishTopic.split('/');
    
    if (subParts.length > pubParts.length && subParts[subParts.length - 1] !== '#') {
      return false;
    }
    
    for (let i = 0; i < subParts.length; i++) {
      if (subParts[i] === '+') {
        continue; // Single-level wildcard matches anything
      } else if (subParts[i] === '#') {
        return true; // Multi-level wildcard matches all remaining levels
      } else if (subParts[i] !== pubParts[i]) {
        return false; // Exact parts must match
      }
    }
    
    return subParts.length === pubParts.length;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStats(): any {
    return {
      connected: this.connected,
      messagesPublished: this.messagesPublished,
      messagesReceived: this.messagesReceived,
      lastMessageTime: this.lastMessageTime,
      subscribedTopics: Array.from(this.topics.entries())
    };
  }

  reconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    logger.info('Attempting to reconnect to MQTT broker');
    this.connected = false;
    this.emit('close');
    
    this.reconnectTimer = setTimeout(() => {
      this.connected = true;
      this.emit('connect');
      logger.info('Reconnected to MQTT broker');
      
      // Re-subscribe to all topics
      for (const [topic, qos] of this.topics.entries()) {
        logger.info('Re-subscribing to topic', { topic, qos });
      }
    }, 1000);
  }
}

/**
 * MQTT Adapter class to manage MQTT connection and messaging
 */
export class MqttAdapter {
  private client: MockMqttClient | null = null;
  private adapterManager: AdapterManager;
  private started: boolean = false;
  private config: any;
  private reconnectAttempts: number = 0;
  private reconnectMaxAttempts: number = 10;
  private reconnectDelay: number = 5000;
  private topics: Map<string, { qos: number, lastMessage?: any }> = new Map();
  
  constructor(adapterManager: AdapterManager) {
    this.adapterManager = adapterManager;
  }
  
  async start(): Promise<void> {
    try {
      logger.info('Starting MQTT adapter');
      
      // Get MQTT settings from storage
      const mqttSettings = await storage.getSetting('mqtt');
      this.config = mqttSettings?.value || {
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
      };
      
      // Create MQTT client
      await this.connect();
      
      // Save adapter in storage
      const existingAdapter = await storage.getAdapterByName('mqtt');
      if (existingAdapter) {
        await storage.updateAdapter(existingAdapter.id, { status: 'active' });
      } else {
        await storage.insertAdapter({
          name: 'mqtt',
          type: 'mqtt',
          status: 'active',
          config: this.config
        });
      }
      
      this.started = true;
      logger.info('MQTT adapter started successfully');
      
      // Load and subscribe to stored topics
      await this.loadStoredTopics();
    } catch (error) {
      logger.error('Failed to start MQTT adapter', { error });
      throw error;
    }
  }
  
  private async loadStoredTopics(): Promise<void> {
    try {
      // TODO: In a real implementation, we would load topics from storage
      // For now, we'll just subscribe to some default topics
      await this.subscribeTopic('horus/zigbee/+/state', 1);
      await this.subscribeTopic('horus/wifi/+/status', 0);
      await this.subscribeTopic('horus/system/heartbeat', 0);
    } catch (error) {
      logger.error('Failed to load stored topics', { error });
    }
  }
  
  private async connect(): Promise<void> {
    // If client exists and is connected, disconnect first
    if (this.client && this.client.isConnected()) {
      await this.client.end();
    }
    
    // Construct the MQTT URL
    const url = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
    
    // Create client options
    const options: any = {
      clientId: `horus_hub_${Date.now()}`,
      clean: this.config.cleanSession,
      reconnectPeriod: this.config.persistentConnection ? 1000 : 0,
      keepalive: 60
    };
    
    // Add authentication if provided
    if (this.config.username) {
      options.username = this.config.username;
      options.password = this.config.password;
    }
    
    // Create client
    this.client = new MockMqttClient(url, options);
    
    // Set up event handlers
    this.client.on('connect', () => {
      logger.info('Connected to MQTT broker');
      this.reconnectAttempts = 0;
      
      // Re-subscribe to all topics
      this.topics.forEach(async (value, topic) => {
        await this.subscribeTopic(topic, value.qos);
      });
      
      // Broadcast connection status to clients
      if (this.adapterManager.broadcast) {
        this.adapterManager.broadcast('mqtt_status_changed', { connected: true });
      }
    });
    
    this.client.on('close', () => {
      logger.info('Disconnected from MQTT broker');
      
      // Broadcast connection status to clients
      if (this.adapterManager.broadcast) {
        this.adapterManager.broadcast('mqtt_status_changed', { connected: false });
      }
      
      // Attempt to reconnect if needed
      if (this.config.persistentConnection && this.started) {
        this.reconnect();
      }
    });
    
    this.client.on('error', (error) => {
      logger.error('MQTT client error', { error });
    });
    
    this.client.on('message', (topic: string, message: string) => {
      try {
        logger.debug('Received MQTT message', { topic });
        
        // Parse the message if it's JSON
        let parsedMessage;
        try {
          parsedMessage = JSON.parse(message);
        } catch (e) {
          parsedMessage = message;
        }
        
        // Update the last message for this topic
        const topicInfo = this.topics.get(topic) || { qos: 0 };
        topicInfo.lastMessage = parsedMessage;
        this.topics.set(topic, topicInfo);
        
        // Process the message based on topic
        this.processMessage(topic, parsedMessage);
        
        // Broadcast the message to clients
        if (this.adapterManager.broadcast) {
          this.adapterManager.broadcast('mqtt_message', { topic, payload: parsedMessage });
        }
      } catch (error) {
        logger.error('Error processing MQTT message', { error, topic });
      }
    });
    
    // Connect to the broker
    this.client.connect();
  }
  
  private reconnect(): void {
    if (this.reconnectAttempts >= this.reconnectMaxAttempts) {
      logger.warn(`Exceeded maximum reconnect attempts (${this.reconnectMaxAttempts})`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info(`Attempting to reconnect to MQTT broker in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.client) {
        this.client.reconnect();
      } else {
        this.connect().catch(error => {
          logger.error('Failed to reconnect to MQTT broker', { error });
        });
      }
    }, delay);
  }
  
  private processMessage(topic: string, message: any): void {
    // Extract device information from topic
    const topicParts = topic.split('/');
    
    if (topicParts.length >= 4 && topicParts[0] === this.config.baseTopic) {
      const protocol = topicParts[1]; // 'zigbee' or 'wifi'
      const deviceId = topicParts[2];
      const messageType = topicParts[3]; // 'state', 'status', etc.
      
      // Process messages for known devices
      if (protocol && deviceId && messageType) {
        this.updateDeviceFromMessage(protocol, deviceId, messageType, message);
      }
    }
  }
  
  private async updateDeviceFromMessage(protocol: string, deviceId: string, messageType: string, message: any): Promise<void> {
    // Find the device in storage
    const device = await storage.getDeviceByDeviceId(deviceId);
    
    if (device) {
      // Update device state based on message type
      if (messageType === 'state' || messageType === 'status') {
        await storage.updateDeviceState(device.id, message);
        
        // Log the activity
        await storage.insertActivity({
          deviceId: device.id,
          activity: 'state_change',
          details: {
            name: device.name,
            type: device.type,
            ...message
          }
        });
        
        logger.debug('Updated device state from MQTT message', {
          deviceId: device.id,
          protocol,
          message
        });
      }
    }
  }
  
  async stop(): Promise<void> {
    try {
      logger.info('Stopping MQTT adapter');
      
      if (this.client) {
        await this.client.end();
        this.client = null;
      }
      
      // Update adapter status in storage
      const existingAdapter = await storage.getAdapterByName('mqtt');
      if (existingAdapter) {
        await storage.updateAdapter(existingAdapter.id, { status: 'inactive' });
      }
      
      this.started = false;
      logger.info('MQTT adapter stopped successfully');
    } catch (error) {
      logger.error('Failed to stop MQTT adapter', { error });
      throw error;
    }
  }
  
  async subscribeTopic(topic: string, qos: number = 0): Promise<void> {
    if (!this.client || !this.client.isConnected()) {
      throw new Error('MQTT client is not connected');
    }
    
    try {
      await this.client.subscribe(topic, { qos });
      
      // Store the topic in our local map
      this.topics.set(topic, { qos });
      
      logger.info('Subscribed to MQTT topic', { topic, qos });
    } catch (error) {
      logger.error('Failed to subscribe to MQTT topic', { error, topic });
      throw error;
    }
  }
  
  async unsubscribeTopic(topic: string): Promise<void> {
    if (!this.client || !this.client.isConnected()) {
      throw new Error('MQTT client is not connected');
    }
    
    try {
      await this.client.unsubscribe(topic);
      
      // Remove the topic from our local map
      this.topics.delete(topic);
      
      logger.info('Unsubscribed from MQTT topic', { topic });
    } catch (error) {
      logger.error('Failed to unsubscribe from MQTT topic', { error, topic });
      throw error;
    }
  }
  
  async publishMessage(topic: string, message: any, options: { qos?: number, retain?: boolean } = {}): Promise<void> {
    if (!this.client || !this.client.isConnected()) {
      throw new Error('MQTT client is not connected');
    }
    
    try {
      // Ensure the topic starts with the base topic
      const fullTopic = topic.startsWith(this.config.baseTopic) ? topic : `${this.config.baseTopic}/${topic}`;
      
      // Convert message to string if it's an object
      const messageStr = typeof message === 'object' ? JSON.stringify(message) : message.toString();
      
      await this.client.publish(fullTopic, messageStr, {
        qos: options.qos || 0,
        retain: options.retain !== undefined ? options.retain : this.config.retainMessages
      });
      
      logger.debug('Published MQTT message', { topic: fullTopic });
    } catch (error) {
      logger.error('Failed to publish MQTT message', { error, topic });
      throw error;
    }
  }
  
  getStatus(): any {
    if (!this.client) {
      return {
        connected: false,
        messagesPublished: 0,
        messagesReceived: 0,
        lastMessageTime: null,
        topics: []
      };
    }
    
    const stats = this.client.getStats();
    return {
      connected: stats.connected,
      messagesPublished: stats.messagesPublished,
      messagesReceived: stats.messagesReceived,
      lastMessageTime: stats.lastMessageTime,
      topics: Array.from(this.topics.entries()).map(([topic, info]) => ({
        topic,
        qos: info.qos,
        lastMessage: info.lastMessage
      }))
    };
  }
  
  getTopics(): any[] {
    return Array.from(this.topics.entries()).map(([topic, info]) => ({
      topic,
      qos: info.qos,
      lastMessage: info.lastMessage
    }));
  }
  
  getConfig(): any {
    return this.config;
  }
  
  async updateConfig(newConfig: any): Promise<void> {
    // Save the new configuration
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    // Update settings in storage
    await storage.updateSetting('mqtt', this.config);
    
    // Reconnect with new configuration
    await this.connect();
    
    logger.info('MQTT configuration updated', { newConfig });
  }
  
  async testConnection(): Promise<boolean> {
    if (this.client && this.client.isConnected()) {
      return true;
    }
    
    try {
      await this.connect();
      return this.client !== null && this.client.isConnected();
    } catch (error) {
      logger.error('MQTT connection test failed', { error });
      return false;
    }
  }
}

/**
 * Setup and register the MQTT adapter with the adapter manager
 */
export async function setupMqttAdapter(adapterManager: AdapterManager): Promise<MqttAdapter> {
  logger.info('Setting up MQTT adapter');
  
  // Create MQTT adapter instance
  const mqttAdapter = new MqttAdapter(adapterManager);
  
  // Register the adapter with the manager
  adapterManager.registerAdapter('mqtt', mqttAdapter);
  
  // Start the adapter
  try {
    await mqttAdapter.start();
  } catch (error) {
    logger.error('Failed to start MQTT adapter during setup', { error });
    // We'll continue even if there's an error, so the user can reconfigure the adapter
  }
  
  return mqttAdapter;
}
