import { EventEmitter } from 'events';
import logger from '../utils/logger';

/**
 * Interface for protocol adapters
 */
export interface Adapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  [key: string]: any; // Allow additional methods specific to each adapter
}

/**
 * AdapterManager class to handle registration and management of protocol adapters
 */
export class AdapterManager extends EventEmitter {
  private adapters: Map<string, Adapter>;
  public broadcast: ((type: string, data: any) => void) | null = null;

  constructor() {
    super();
    this.adapters = new Map();
    logger.info('AdapterManager initialized');
  }

  /**
   * Register a new protocol adapter
   * @param protocol - Adapter protocol name (e.g., 'zigbee', 'wifi')
   * @param adapter - Protocol adapter instance
   */
  registerAdapter(protocol: string, adapter: Adapter): void {
    if (this.adapters.has(protocol)) {
      logger.warn(`Adapter for protocol ${protocol} is already registered. Replacing...`);
    }
    this.adapters.set(protocol, adapter);
    logger.info(`Registered ${protocol} adapter`);
    this.emit('adapterRegistered', { protocol });
  }

  /**
   * Get a registered adapter by protocol
   * @param protocol - Adapter protocol name (e.g., 'zigbee', 'wifi')
   * @returns The adapter instance or undefined if not found
   */
  getAdapter(protocol: string): Adapter | undefined {
    return this.adapters.get(protocol);
  }

  /**
   * Get all registered adapters
   * @returns Array of registered adapters
   */
  getAllAdapters(): Array<{ protocol: string; adapter: Adapter }> {
    return Array.from(this.adapters.entries()).map(([protocol, adapter]) => ({
      protocol,
      adapter,
    }));
  }

  /**
   * Start all registered adapters
   */
  async startAllAdapters(): Promise<void> {
    logger.info('Starting all adapters...');
    const startPromises = Array.from(this.adapters.entries()).map(async ([protocol, adapter]) => {
      try {
        await adapter.start();
        logger.info(`Started ${protocol} adapter`);
      } catch (error) {
        logger.error(`Failed to start ${protocol} adapter`, { error });
      }
    });

    await Promise.all(startPromises);
    logger.info('All adapters started');
  }

  /**
   * Stop all registered adapters
   */
  async stopAllAdapters(): Promise<void> {
    logger.info('Stopping all adapters...');
    const stopPromises = Array.from(this.adapters.entries()).map(async ([protocol, adapter]) => {
      try {
        await adapter.stop();
        logger.info(`Stopped ${protocol} adapter`);
      } catch (error) {
        logger.error(`Failed to stop ${protocol} adapter`, { error });
      }
    });

    await Promise.all(stopPromises);
    logger.info('All adapters stopped');
  }

  /**
   * Set the broadcast function to send messages to clients
   * @param broadcast - Function to broadcast messages to clients
   */
  setBroadcastFunction(broadcast: (type: string, data: any) => void): void {
    this.broadcast = broadcast;
    logger.info('Broadcast function set for AdapterManager');
  }
}
