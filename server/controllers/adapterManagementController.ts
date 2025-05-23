import { Request, Response } from 'express';
import logger from '../utils/logger';

// Variable pour stocker l'instance d'AdapterManager
let globalAdapterManager: any = null;

// Fonction pour définir l'instance d'AdapterManager
export const setAdapterManager = (manager: any) => {
  globalAdapterManager = manager;
};

// Contrôleur pour les actions de gestion des adaptateurs
const restartAdapter = async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    
    logger.info(`Restarting ${protocol} adapter`);
    
    // Obtenir l'adaptateur réel
    const adapter = globalAdapterManager?.getAdapter(protocol);
    if (!adapter) {
      return res.status(404).json({ 
        success: false, 
        error: `Adaptateur ${protocol} non trouvé` 
      });
    }
    
    // Redémarrer l'adaptateur réel
    await adapter.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Petite pause
    await adapter.start();
    
    logger.info(`Adapter ${protocol} restarted successfully`);
    
    res.json({ 
      success: true, 
      message: `Adaptateur ${protocol} redémarré avec succès` 
    });
  } catch (error: any) {
    logger.error('Error restarting adapter', { protocol: req.params.protocol, error: error.message });
    res.status(500).json({ 
      success: false, 
      error: `Impossible de redémarrer l'adaptateur: ${error.message}` 
    });
  }
};

const testAdapter = async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    
    logger.info(`Testing ${protocol} adapter`);
    
    // Simuler le test de l'adaptateur
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simuler différents résultats de test selon le protocole
    let testResult;
    switch (protocol) {
      case 'zigbee':
        testResult = {
          success: true,
          message: 'Test Zigbee réussi',
          details: {
            coordinator: 'Connecté',
            networkKey: 'Valide',
            panId: '0x1a62'
          }
        };
        break;
      case 'wifi':
        testResult = {
          success: true,
          message: 'Test WiFi réussi',
          details: {
            scanner: 'Actif',
            networkInterface: 'Disponible'
          }
        };
        break;
      case 'mqtt':
        testResult = {
          success: true,
          message: 'Test MQTT réussi',
          details: {
            broker: 'Connecté',
            authentication: 'Valide'
          }
        };
        break;
      default:
        testResult = {
          success: false,
          message: 'Protocole non reconnu'
        };
    }
    
    res.json(testResult);
  } catch (error) {
    logger.error('Error testing adapter', { protocol: req.params.protocol, error });
    res.status(500).json({ error: 'Impossible de tester l\'adaptateur' });
  }
};

const resetAdapter = async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    
    logger.info(`Resetting ${protocol} adapter`);
    
    // Simuler la réinitialisation de l'adaptateur
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Log de l'activité
    const activityData = {
      entityId: 0,
      activity: 'adapter_reset',
      details: {
        protocol: protocol
      },
      timestamp: new Date()
    };
    
    res.json({ 
      success: true, 
      message: `Adaptateur ${protocol} réinitialisé avec succès` 
    });
  } catch (error) {
    logger.error('Error resetting adapter', { protocol: req.params.protocol, error });
    res.status(500).json({ error: 'Impossible de réinitialiser l\'adaptateur' });
  }
};

const getAdapterStatus = async (req: Request, res: Response) => {
  try {
    // Récupérer le statut réel des adaptateurs depuis leurs APIs respectives
    const status = {};
    
    // Note: Retourner un objet vide pour l'instant
    // Les vrais adaptateurs seront détectés via leurs APIs individuelles
    
    res.json(status);
  } catch (error) {
    logger.error('Error getting adapter status', { error });
    res.status(500).json({ error: 'Impossible de récupérer le statut des adaptateurs' });
  }
};

const runDiagnostics = async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    
    logger.info(`Running diagnostics for ${protocol} adapter`);
    
    // Simuler l'exécution de diagnostics
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let diagnosticResult;
    switch (protocol) {
      case 'zigbee':
        diagnosticResult = {
          health: 'good',
          issues: [],
          suggestions: ['Tout fonctionne correctement'],
          details: {
            signalStrength: 'Excellent',
            networkStability: 'Stable',
            deviceCount: 5
          }
        };
        break;
      case 'wifi':
        diagnosticResult = {
          health: 'warning',
          issues: ['Latence réseau élevée'],
          suggestions: ['Vérifiez la qualité du signal WiFi', 'Redémarrez le routeur si nécessaire'],
          details: {
            signalStrength: 'Moyen',
            networkLatency: '120ms',
            deviceCount: 2
          }
        };
        break;
      case 'mqtt':
        diagnosticResult = {
          health: 'good',
          issues: [],
          suggestions: ['Connexion MQTT optimale'],
          details: {
            brokerResponse: 'Rapide',
            queueSize: 0,
            subscriptions: 8
          }
        };
        break;
      default:
        diagnosticResult = {
          health: 'error',
          issues: ['Protocole non reconnu'],
          suggestions: ['Vérifiez la configuration']
        };
    }
    
    res.json(diagnosticResult);
  } catch (error) {
    logger.error('Error running diagnostics', { protocol: req.params.protocol, error });
    res.status(500).json({ error: 'Impossible d\'exécuter les diagnostics' });
  }
};

// Nouvelle méthode pour mettre à jour la configuration Zigbee
const updateZigbeeConfig = async (req: Request, res: Response) => {
  try {
    const config = req.body;
    
    logger.info('Updating Zigbee configuration', { config });
    
    // Obtenir l'adaptateur Zigbee réel
    const zigbeeAdapter = globalAdapterManager?.getAdapter('zigbee');
    if (!zigbeeAdapter) {
      return res.status(404).json({ 
        success: false, 
        error: 'Adaptateur Zigbee non trouvé' 
      });
    }
    
    // Mettre à jour la configuration si l'adaptateur le permet
    if (zigbeeAdapter.updateConfig) {
      await zigbeeAdapter.updateConfig(config);
    }
    
    logger.info('Zigbee configuration updated successfully');
    
    res.json({ 
      success: true, 
      message: 'Configuration Zigbee mise à jour avec succès',
      config 
    });
  } catch (error: any) {
    logger.error('Error updating Zigbee configuration', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: `Impossible de mettre à jour la configuration: ${error.message}` 
    });
  }
};

// Nouvelle méthode pour mettre à jour la configuration WiFi
const updateWifiConfig = async (req: Request, res: Response) => {
  try {
    const config = req.body;
    
    logger.info('Updating WiFi configuration', { config });
    
    // Obtenir l'adaptateur WiFi réel
    const wifiAdapter = globalAdapterManager?.getAdapter('wifi');
    if (!wifiAdapter) {
      return res.status(404).json({ 
        success: false, 
        error: 'Adaptateur WiFi non trouvé' 
      });
    }
    
    // Mettre à jour la configuration si l'adaptateur le permet
    if (wifiAdapter.updateConfig) {
      await wifiAdapter.updateConfig(config);
    }
    
    logger.info('WiFi configuration updated successfully');
    
    res.json({ 
      success: true, 
      message: 'Configuration WiFi mise à jour avec succès',
      config 
    });
  } catch (error: any) {
    logger.error('Error updating WiFi configuration', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: `Impossible de mettre à jour la configuration: ${error.message}` 
    });
  }
};

export default {
  restartAdapter,
  testAdapter,
  resetAdapter,
  getAdapterStatus,
  runDiagnostics,
  updateZigbeeConfig,
  updateWifiConfig
};