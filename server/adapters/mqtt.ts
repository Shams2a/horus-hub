import { EventEmitter } from 'events';
import * as mqtt from 'mqtt';
import logger from '../utils/logger';
import { AdapterManager } from './AdapterManager';
import { storage } from '../storage';

/**
 * MQTT Adapter class to manage MQTT connection and messaging with real MQTTS support
 */
export class MqttAdapter {
  private client: mqtt.MqttClient | null = null;
  private adapterManager: AdapterManager;
  private started: boolean = false;
  private config: any;
  private reconnectAttempts: number = 0;
  private reconnectMaxAttempts: number = 10;
  private reconnectDelay: number = 5000;
  private topics: Map<string, { qos: number, lastMessage?: any }> = new Map();
  private messagesPublished: number = 0;
  private messagesReceived: number = 0;
  private lastMessageTime: string | null = null;
  private isConnecting: boolean = false;

  constructor(adapterManager: AdapterManager) {
    this.adapterManager = adapterManager;
    this.config = {
      protocol: 'mqtts',
      host: '6f66b254393d4dea9f6ed5d169c03469.s1.eu.hivemq.cloud',
      port: 8883,
      username: process.env.HIVEMQ_USERNAME || 'shams5',
      password: process.env.HIVEMQ_PASSWORD || 'Shams123*',
      clientId: 'HorusHub_' + Math.random().toString(16).substr(2, 8),
      baseTopic: 'horus',
      useTls: true,
      cleanSession: true,
      retainMessages: false,
      persistentConnection: true
    };
  }

  async start(): Promise<void> {
    if (this.started) {
      logger.info('MQTT adapter already started');
      return;
    }

    logger.info('Starting MQTT adapter');
    this.started = true;

    await this.loadStoredTopics();
    await this.connect();

    logger.info('MQTT adapter started successfully');
  }

  private async loadStoredTopics(): Promise<void> {
    try {
      // Load previously subscribed topics from storage
      // For now, we'll start with an empty topic list
      logger.debug('Loading stored MQTT topics');
    } catch (error: any) {
      logger.error('Failed to load stored topics', { error });
    }
  }

  private async connect(): Promise<void> {
    if (this.isConnecting || this.client?.connected) {
      return;
    }

    this.isConnecting = true;
    logger.info('Connecting to MQTT broker', this.config);

    try {
      // Construct the broker URL with proper protocol
      const protocol = this.config.protocol === 'mqtts' ? 'mqtts' : 'mqtt';
      const brokerUrl = `${protocol}://${this.config.host}:${this.config.port}`;

      // MQTT connection options with MQTTS support
      const options: mqtt.IClientOptions = {
        clientId: this.config.clientId,
        clean: this.config.cleanSession,
        keepalive: 60,
        reconnectPeriod: 0, // We handle reconnection manually
        connectTimeout: 30000,
        will: {
          topic: `${this.config.baseTopic}/status`,
          payload: JSON.stringify({
            clientId: this.config.clientId,
            status: 'offline',
            timestamp: new Date().toISOString()
          }),
          qos: 1,
          retain: true
        }
      };

      // Add authentication if provided
      if (this.config.username) {
        options.username = this.config.username;
      }
      if (this.config.password) {
        options.password = this.config.password;
      }

      // MQTTS/TLS specific options
      if (protocol === 'mqtts') {
        options.rejectUnauthorized = true;
        options.protocol = 'mqtts';
      }

      logger.debug('MQTT connection options', { 
        brokerUrl, 
        clientId: options.clientId,
        username: options.username ? '***' : undefined,
        protocol: options.protocol 
      });

      // Create the MQTT client
      this.client = mqtt.connect(brokerUrl, options);

      // Set up event listeners
      this.client.on('connect', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        logger.info('Connected to MQTT broker');
        
        // Publish online status
        this.publishOnlineStatus();
        
        // Re-subscribe to all topics
        this.resubscribeToTopics();
        
        // Notify adapter manager
        if (this.adapterManager.broadcast) {
          this.adapterManager.broadcast('mqtt:connected', {
            broker: this.config.host,
            port: this.config.port,
            clientId: this.config.clientId
          });
        }
      });

      this.client.on('message', (topic: string, message: Buffer) => {
        try {
          this.messagesReceived++;
          this.lastMessageTime = new Date().toISOString();
          
          const messageStr = message.toString();
          logger.debug('Received MQTT message', { topic, message: messageStr });
          
          // Update topic info
          const topicInfo = this.topics.get(topic);
          if (topicInfo) {
            topicInfo.lastMessage = {
              content: messageStr,
              timestamp: this.lastMessageTime
            };
          }

          this.processMessage(topic, messageStr);
        } catch (error: any) {
          logger.error('Error processing MQTT message', { topic, error: error.message });
        }
      });

      this.client.on('error', (error: Error) => {
        this.isConnecting = false;
        logger.error('MQTT client error', { error: error.message });
        this.handleDisconnection();
      });

      this.client.on('close', () => {
        this.isConnecting = false;
        logger.info('Disconnected from MQTT broker');
        this.handleDisconnection();
      });

      this.client.on('offline', () => {
        this.isConnecting = false;
        logger.warn('MQTT client offline');
        this.handleDisconnection();
      });

    } catch (error: any) {
      this.isConnecting = false;
      logger.error('Failed to connect to MQTT broker', { error: error.message });
      this.handleDisconnection();
    }
  }

  private handleDisconnection(): void {
    if (!this.started) return;

    if (this.reconnectAttempts < this.reconnectMaxAttempts) {
      this.reconnectAttempts++;
      logger.info(`Attempting to reconnect to MQTT broker in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (this.started && (!this.client || !this.client.connected)) {
          this.connect();
        }
      }, this.reconnectDelay);
    } else {
      logger.error('Max reconnection attempts reached for MQTT broker');
    }
  }

  private publishOnlineStatus(): void {
    if (!this.client?.connected) return;

    const statusMessage = {
      clientId: this.config.clientId,
      status: 'online',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    this.client.publish(
      `${this.config.baseTopic}/status`,
      JSON.stringify(statusMessage),
      { qos: 1, retain: true }
    );
  }

  private async resubscribeToTopics(): Promise<void> {
    if (!this.client?.connected) return;

    for (const [topic, info] of this.topics.entries()) {
      try {
        await this.client.subscribeAsync(topic, { qos: info.qos });
        logger.debug('Resubscribed to MQTT topic', { topic, qos: info.qos });
      } catch (error: any) {
        logger.error('Failed to resubscribe to topic', { topic, error: error.message });
      }
    }
  }

  private processMessage(topic: string, message: string): void {
    try {
      // Parse the topic to determine device protocol and ID
      const topicParts = topic.split('/');
      if (topicParts.length >= 3) {
        const [baseTopic, protocol, deviceId, ...rest] = topicParts;
        const messageType = rest.join('/') || 'data';

        if (baseTopic === this.config.baseTopic) {
          this.updateDeviceFromMessage(protocol, deviceId, messageType, message);
        }
      }

      // Broadcast to connected clients
      if (this.adapterManager.broadcast) {
        this.adapterManager.broadcast('mqtt:message', {
          topic,
          message,
          timestamp: this.lastMessageTime
        });
      }

    } catch (error: any) {
      logger.error('Error processing MQTT message', { topic, error: error.message });
    }
  }

  private async updateDeviceFromMessage(protocol: string, deviceId: string, messageType: string, message: string): Promise<void> {
    try {
      // Find or create device in storage
      let device = await storage.getDeviceByDeviceId(deviceId);
      
      if (!device) {
        device = await storage.insertDevice({
          deviceId,
          name: `${protocol.toUpperCase()} Device ${deviceId}`,
          protocol,
          address: deviceId,
          state: {},
          lastSeen: new Date()
        });
        logger.info('Created new device from MQTT message', { deviceId, protocol });
      }

      // Update device state based on message
      let parsedMessage: any;
      try {
        parsedMessage = JSON.parse(message);
      } catch {
        parsedMessage = { value: message };
      }

      const updatedState = {
        ...device.state,
        [messageType]: parsedMessage,
        lastUpdate: new Date().toISOString()
      };

      await storage.updateDeviceState(device.id, updatedState);
      
    } catch (error: any) {
      logger.error('Failed to update device from MQTT message', { 
        protocol, deviceId, messageType, error: error.message 
      });
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping MQTT adapter');
    this.started = false;

    if (this.client) {
      try {
        // Publish offline status
        if (this.client.connected) {
          const statusMessage = {
            clientId: this.config.clientId,
            status: 'offline',
            timestamp: new Date().toISOString()
          };

          this.client.publish(
            `${this.config.baseTopic}/status`,
            JSON.stringify(statusMessage),
            { qos: 1, retain: true }
          );
        }

        await this.client.endAsync();
        logger.info('MQTT client disconnected gracefully');
      } catch (error: any) {
        logger.error('Error stopping MQTT client', { error: error.message });
      }
      
      this.client = null;
    }
  }

  async subscribeTopic(topic: string, qos: number = 0): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client not connected');
    }

    try {
      await this.client.subscribeAsync(topic, { qos });
      this.topics.set(topic, { qos });
      logger.info('Subscribed to MQTT topic', { topic, qos });
    } catch (error: any) {
      logger.error('Failed to subscribe to MQTT topic', { topic, error: error.message });
      throw error;
    }
  }

  async unsubscribeTopic(topic: string): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client not connected');
    }

    try {
      await this.client.unsubscribeAsync(topic);
      this.topics.delete(topic);
      logger.info('Unsubscribed from MQTT topic', { topic });
    } catch (error: any) {
      logger.error('Failed to unsubscribe from MQTT topic', { topic, error: error.message });
      throw error;
    }
  }

  async publishMessage(topic: string, message: any, options: { qos?: number, retain?: boolean } = {}): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client not connected');
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      await this.client.publishAsync(topic, messageStr, {
        qos: options.qos || 0,
        retain: options.retain || false
      });
      
      this.messagesPublished++;
      this.lastMessageTime = new Date().toISOString();
      
      logger.debug('Published MQTT message', { topic, qos: options.qos, retain: options.retain });
    } catch (error: any) {
      logger.error('Failed to publish MQTT message', { topic, error: error.message });
      throw error;
    }
  }

  getStatus(): any {
    const isConnected = this.client?.connected || false;
    
    return {
      connected: isConnected,
      messagesPublished: this.messagesPublished,
      messagesReceived: this.messagesReceived,
      lastMessageTime: this.lastMessageTime,
      topics: Array.from(this.topics.keys()),
      reconnectAttempts: this.reconnectAttempts,
      clientId: this.config.clientId,
      broker: this.config.host,
      port: this.config.port,
      debug: {
        clientExists: !!this.client,
        clientConnected: this.client?.connected,
        started: this.started,
        isConnecting: this.isConnecting
      }
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
    return { ...this.config };
  }

  async updateConfig(newConfig: any): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    logger.info('MQTT configuration updated', { newConfig });

    // If connection parameters changed, reconnect
    const connectionChanged = 
      oldConfig.host !== this.config.host ||
      oldConfig.port !== this.config.port ||
      oldConfig.username !== this.config.username ||
      oldConfig.password !== this.config.password ||
      oldConfig.protocol !== this.config.protocol;

    if (connectionChanged && this.started) {
      logger.info('MQTT connection parameters changed, reconnecting...');
      
      // Disconnect current client
      if (this.client) {
        try {
          await this.client.endAsync();
        } catch (error) {
          logger.warn('Error disconnecting old MQTT client', { error });
        }
        this.client = null;
      }

      // Reset connection state
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // Reconnect with new config
      await this.connect();
    }

    logger.info('MQTT configuration updated');
  }

  async testConnection(): Promise<boolean> {
    try {
      if (this.client?.connected) {
        // Test by publishing a test message
        await this.publishMessage(
          `${this.config.baseTopic}/test`,
          {
            test: true,
            timestamp: new Date().toISOString(),
            clientId: this.config.clientId
          },
          { qos: 0 }
        );
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error('MQTT connection test failed', { error: error.message });
      return false;
    }
  }
}

/**
 * Setup and register the MQTT adapter with the adapter manager
 */
export async function setupMqttAdapter(adapterManager: AdapterManager): Promise<MqttAdapter> {
  logger.info('Setting up MQTT adapter');
  
  const mqttAdapter = new MqttAdapter(adapterManager);
  adapterManager.registerAdapter('mqtt', mqttAdapter);
  logger.info('Registered mqtt adapter');
  
  return mqttAdapter;
}