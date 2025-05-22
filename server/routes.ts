import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from 'ws';
import deviceController from "./controllers/deviceController";
import adapterController from "./controllers/adapterController";
import settingsController from "./controllers/settingsController";
import logController from "./controllers/logController";
import locationController from "./controllers/locationController";
import databaseController from "./controllers/databaseController";
import adapterManagementController, { setAdapterManager } from "./controllers/adapterManagementController";
import adapterDetectionController from "./controllers/adapterDetectionController";
import updateController from "./controllers/updateController";
import { diagnosticController } from "./controllers/diagnosticController";
import { diagnosticService } from "./services/diagnosticService";
import { AdapterManager } from "./adapters/AdapterManager";
import { setupZigbeeAdapter } from "./adapters/zigbee";
import { setupWifiAdapter } from "./adapters/wifi";
import { setupMqttAdapter } from "./adapters/mqtt";
import logger from "./utils/logger";

// Initialize the adapter manager
const adapterManager = new AdapterManager();

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');
    
    // Send initial data to the client
    const initMessage = JSON.stringify({
      type: 'init',
      data: { message: 'Connected to Horus Hub' }
    });
    ws.send(initMessage);
    
    // Handle client messages
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        logger.debug('Received WebSocket message', { message: parsedMessage });
        
        // Handle different message types
        switch (parsedMessage.type) {
          case 'subscribe':
            // Handle subscription requests
            break;
          default:
            logger.warn('Unknown WebSocket message type', { type: parsedMessage.type });
        }
      } catch (error) {
        logger.error('Error processing WebSocket message', { error });
      }
    });
    
    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
    });
  });
  
  // Broadcast function to send messages to all connected clients
  const broadcast = (type: string, data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type, data }));
      }
    });
  };
  
  // Make broadcast available to controllers
  app.locals.broadcast = broadcast;
  
  // Initialize adapters
  try {
    // Register and start adapters
    await setupZigbeeAdapter(adapterManager);
    await setupWifiAdapter(adapterManager);
    const mqttAdapter = await setupMqttAdapter(adapterManager);
    
    // Start MQTT adapter immediately
    await mqttAdapter.start();
    
    // Make adapter manager available to controllers
    app.locals.adapterManager = adapterManager;
    
    logger.info('All adapters initialized');
  } catch (error) {
    logger.error('Error initializing adapters', { error });
  }
  
  // API routes
  // Device routes
  app.get('/api/devices', deviceController.getAllDevices);
  app.get('/api/devices/:id', deviceController.getDevice);
  app.post('/api/devices', deviceController.addDevice);
  app.put('/api/devices/:id', deviceController.updateDevice);
  app.delete('/api/devices/:id', deviceController.deleteDevice);
  app.put('/api/devices/:id/state', deviceController.updateDeviceState);
  app.post('/api/devices/search', deviceController.searchDevices);
  
  // Adapter routes
  app.get('/api/adapters', adapterController.getAllAdapters);
  app.get('/api/adapters/:id', adapterController.getAdapter);
  app.post('/api/adapters', adapterController.addAdapter);
  app.put('/api/adapters/:id', adapterController.updateAdapter);
  app.delete('/api/adapters/:id', adapterController.deleteAdapter);
  
  // Zigbee specific routes
  app.get('/api/zigbee/status', adapterController.getZigbeeStatus);
  app.post('/api/zigbee/permit-join', adapterController.setZigbeePermitJoin);
  app.post('/api/zigbee/map', adapterController.generateZigbeeMap);
  
  // WiFi specific routes
  app.get('/api/wifi/status', adapterController.getWifiStatus);
  app.post('/api/wifi/scan', adapterController.scanWifiNetwork);
  
  // MQTT specific routes
  app.get('/api/mqtt/status', adapterController.getMqttStatus);
  app.get('/api/mqtt/config', adapterController.getMqttConfig);
  app.put('/api/mqtt/config', adapterController.updateMqttConfig);
  app.get('/api/mqtt/topics', adapterController.getMqttTopics);
  app.post('/api/mqtt/topics', adapterController.addMqttTopic);
  app.delete('/api/mqtt/topics/:topic', adapterController.deleteMqttTopic);
  app.post('/api/mqtt/test', adapterController.testMqttConnection);
  app.post('/api/mqtt/reconnect', adapterController.reconnectMqtt);
  
  // Log routes
  app.get('/api/logs', logController.getLogs);
  app.delete('/api/logs', logController.clearLogs);
  app.get('/api/logs/download', logController.downloadLogs);
  app.get('/api/logs/settings', logController.getLogSettings);
  app.put('/api/logs/settings', logController.updateLogSettings);
  
  // Settings routes
  app.get('/api/settings', settingsController.getAllSettings);
  app.get('/api/settings/:category', settingsController.getCategorySettings);
  app.put('/api/settings/:category', settingsController.updateCategorySettings);
  
  // System routes
  app.get('/api/system/status', settingsController.getSystemStatus);
  app.get('/api/system/info', settingsController.getSystemInfo);
  app.post('/api/system/backup', settingsController.createBackup);
  app.post('/api/system/restore', settingsController.restoreBackup);
  app.post('/api/system/factory-reset', settingsController.factoryReset);
  app.get('/api/system/check-updates', settingsController.checkForUpdates);
  app.post('/api/system/update', settingsController.installUpdate);
  
  // Activity routes
  app.get('/api/activities', deviceController.getActivities);
  
  // Building routes
  app.get('/api/buildings', locationController.getAllBuildings);
  app.get('/api/buildings/:id', locationController.getBuilding);
  app.post('/api/buildings', locationController.addBuilding);
  app.put('/api/buildings/:id', locationController.updateBuilding);
  app.delete('/api/buildings/:id', locationController.deleteBuilding);
  
  // Room routes
  app.get('/api/rooms', locationController.getAllRooms);
  app.get('/api/rooms/:id', locationController.getRoom);
  app.post('/api/rooms', locationController.addRoom);
  app.put('/api/rooms/:id', locationController.updateRoom);
  app.delete('/api/rooms/:id', locationController.deleteRoom);
  
  // Database routes
  app.get('/api/database/config', databaseController.getDatabaseConfig);
  app.put('/api/database/config', databaseController.updateDatabaseConfig);
  app.post('/api/database/test', databaseController.testDatabaseConnection);
  app.post('/api/database/sync', databaseController.syncDatabases);
  
  // Adapter management routes
  app.get('/api/adapters/status', adapterManagementController.getAdapterStatus);
  app.post('/api/adapters/:protocol/restart', adapterManagementController.restartAdapter);
  app.post('/api/adapters/:protocol/test', adapterManagementController.testAdapter);
  app.post('/api/adapters/:protocol/reset', adapterManagementController.resetAdapter);
  app.post('/api/adapters/:protocol/diagnostics', adapterManagementController.runDiagnostics);
  
  // Adapter detection routes
  app.post('/api/adapters/detect', adapterDetectionController.detectAdapters);
  app.get('/api/adapters/known', adapterDetectionController.getKnownAdapters);
  app.get('/api/adapters/recommended', adapterDetectionController.getRecommendedAdaptersList);
  app.get('/api/adapters/details/:vid/:pid', adapterDetectionController.getAdapterDetails);
  app.get('/api/adapters/statistics', adapterDetectionController.getAdapterStatistics);

  // MQTT routes
  app.get('/api/mqtt/status', (req, res) => {
    const mqttAdapter = adapterManager.getAdapter('mqtt') as any;
    res.json(mqttAdapter ? mqttAdapter.getStatus() : { connected: false });
  });
  
  app.get('/api/mqtt/config', (req, res) => {
    const mqttAdapter = adapterManager.getAdapter('mqtt') as any;
    res.json(mqttAdapter ? mqttAdapter.getConfig() : {});
  });
  
  app.put('/api/mqtt/config', async (req, res) => {
    try {
      const mqttAdapter = adapterManager.getAdapter('mqtt') as any;
      if (mqttAdapter) {
        await mqttAdapter.updateConfig(req.body);
        res.json({ success: true, message: 'Configuration MQTT mise à jour' });
      } else {
        res.status(404).json({ error: 'Adaptateur MQTT non trouvé' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/mqtt/topics', (req, res) => {
    const mqttAdapter = adapterManager.getAdapter('mqtt') as any;
    res.json(mqttAdapter ? mqttAdapter.getTopics() : []);
  });
  
  app.post('/api/mqtt/test', async (req, res) => {
    try {
      const mqttAdapter = adapterManager.getAdapter('mqtt') as any;
      if (mqttAdapter) {
        const isConnected = await mqttAdapter.testConnection();
        res.json({ success: isConnected, connected: isConnected });
      } else {
        res.status(404).json({ error: 'Adaptateur MQTT non trouvé' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Library update routes
  app.get('/api/updates/available', updateController.getAvailableUpdates);
  app.post('/api/updates/check', updateController.checkUpdates);
  app.post('/api/updates/library/:library', updateController.updateLibrary);
  app.get('/api/updates/status', updateController.getUpdateStatus);
  app.get('/api/updates/history', updateController.getUpdateHistory);
  app.post('/api/updates/cancel', updateController.cancelUpdate);
  app.post('/api/updates/test-compatibility', updateController.testCompatibility);

  // Diagnostic routes
  app.get('/api/diagnostics/health', diagnosticController.getSystemHealth);
  app.get('/api/diagnostics/errors', diagnosticController.getErrors);
  app.get('/api/diagnostics/errors/:errorId', diagnosticController.getError);
  app.post('/api/diagnostics/errors/:errorId/resolve', diagnosticController.resolveError);
  app.get('/api/diagnostics/checks', diagnosticController.getChecks);
  app.put('/api/diagnostics/checks/:checkId', diagnosticController.updateCheck);
  app.post('/api/diagnostics/checks/:checkId/run', diagnosticController.runCheck);
  app.get('/api/diagnostics/stats', diagnosticController.getErrorStats);
  app.get('/api/diagnostics/export', diagnosticController.exportDiagnosticLogs);
  app.post('/api/diagnostics/simulate', diagnosticController.simulateError);

  return httpServer;
}
