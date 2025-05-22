import { Request, Response } from 'express';
import { AdapterDetectionService } from '../services/adapterDetectionService';
import { KNOWN_ZIGBEE_ADAPTERS, getRecommendedAdapters, findAdaptersByManufacturer } from '../data/adapterDatabase';
import logger from '../utils/logger';

const detectionService = new AdapterDetectionService();

/**
 * Lance la détection automatique des adaptateurs
 */
const detectAdapters = async (req: Request, res: Response) => {
  try {
    logger.info('Démarrage de la détection automatique des adaptateurs');
    
    const results = await detectionService.detectAdapters();
    
    // Structurer les résultats pour l'interface utilisateur
    const detectionSummary = {
      totalFound: results.length,
      highConfidence: results.filter(r => r.confidence === 'high').length,
      mediumConfidence: results.filter(r => r.confidence === 'medium').length,
      lowConfidence: results.filter(r => r.confidence === 'low').length,
      adapters: results.map(result => ({
        phase: result.phase,
        confidence: result.confidence,
        adapter: result.adapter ? {
          name: result.adapter.model,
          manufacturer: result.adapter.manufacturer,
          chipset: result.adapter.chipset,
          driver: result.adapter.driver,
          reliability: result.adapter.reliability,
          features: result.adapter.supportedFeatures
        } : null,
        devicePath: result.devicePath,
        suggestions: result.suggestions,
        issues: result.issues
      }))
    };
    
    logger.info('Détection automatique terminée', { 
      totalFound: detectionSummary.totalFound,
      highConfidence: detectionSummary.highConfidence 
    });
    
    res.json(detectionSummary);
  } catch (error) {
    logger.error('Erreur lors de la détection des adaptateurs', { error });
    res.status(500).json({ 
      error: 'Impossible de détecter les adaptateurs',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

/**
 * Obtient la liste des adaptateurs connus dans la base de données
 */
const getKnownAdapters = async (req: Request, res: Response) => {
  try {
    const { manufacturer, reliability } = req.query;
    
    let adapters = KNOWN_ZIGBEE_ADAPTERS;
    
    // Filtrer par fabricant si spécifié
    if (manufacturer && typeof manufacturer === 'string') {
      adapters = findAdaptersByManufacturer(manufacturer);
    }
    
    // Filtrer par fiabilité si spécifié
    if (reliability && typeof reliability === 'string') {
      adapters = adapters.filter(a => a.reliability === reliability);
    }
    
    // Structurer les données pour l'interface
    const adaptedList = adapters.map(adapter => ({
      id: `${adapter.vid}:${adapter.pid}`,
      name: adapter.model,
      manufacturer: adapter.manufacturer,
      chipset: adapter.chipset,
      driver: adapter.driver,
      reliability: adapter.reliability,
      type: adapter.type,
      features: adapter.supportedFeatures,
      notes: adapter.notes,
      vid: adapter.vid,
      pid: adapter.pid
    }));
    
    res.json({
      total: adaptedList.length,
      adapters: adaptedList
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des adaptateurs connus', { error });
    res.status(500).json({ error: 'Impossible de récupérer la liste des adaptateurs' });
  }
};

/**
 * Obtient les adaptateurs recommandés
 */
const getRecommendedAdaptersList = async (req: Request, res: Response) => {
  try {
    const recommended = getRecommendedAdapters();
    
    const adaptedList = recommended.map(adapter => ({
      id: `${adapter.vid}:${adapter.pid}`,
      name: adapter.model,
      manufacturer: adapter.manufacturer,
      chipset: adapter.chipset,
      driver: adapter.driver,
      reliability: adapter.reliability,
      features: adapter.supportedFeatures,
      notes: adapter.notes,
      reasonForRecommendation: adapter.reliability === 'excellent' ? 
        'Fiabilité excellente et support complet' : 
        'Bon équilibre performance/compatibilité'
    }));
    
    res.json({
      total: adaptedList.length,
      adapters: adaptedList
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des adaptateurs recommandés', { error });
    res.status(500).json({ error: 'Impossible de récupérer les adaptateurs recommandés' });
  }
};

/**
 * Obtient les détails d'un adaptateur spécifique par VID/PID
 */
const getAdapterDetails = async (req: Request, res: Response) => {
  try {
    const { vid, pid } = req.params;
    
    if (!vid || !pid) {
      return res.status(400).json({ error: 'VID et PID requis' });
    }
    
    const adapter = KNOWN_ZIGBEE_ADAPTERS.find(a => 
      a.vid.toLowerCase() === vid.toLowerCase() && 
      a.pid.toLowerCase() === pid.toLowerCase()
    );
    
    if (!adapter) {
      return res.status(404).json({ error: 'Adaptateur non trouvé dans la base de données' });
    }
    
    // Informations détaillées de l'adaptateur
    const detailedInfo = {
      identification: {
        vid: adapter.vid,
        pid: adapter.pid,
        name: adapter.model,
        manufacturer: adapter.manufacturer
      },
      technical: {
        chipset: adapter.chipset,
        driver: adapter.driver,
        type: adapter.type,
        reliability: adapter.reliability
      },
      capabilities: {
        supportedFeatures: adapter.supportedFeatures,
        zigbeeVersion: adapter.supportedFeatures.includes('zigbee_3_0') ? '3.0' : 
                      adapter.supportedFeatures.includes('zigbee_ha') ? 'HA 1.2' : 'Unknown'
      },
      deployment: {
        recommendedFor: adapter.reliability === 'excellent' ? 
          ['Production', 'Réseaux étendus', 'Applications critiques'] :
          adapter.reliability === 'good' ?
          ['Usage domestique', 'Réseaux moyens'] :
          ['Tests', 'Prototypage'],
        notes: adapter.notes
      }
    };
    
    res.json(detailedInfo);
  } catch (error) {
    logger.error('Erreur lors de la récupération des détails d\'adaptateur', { error });
    res.status(500).json({ error: 'Impossible de récupérer les détails de l\'adaptateur' });
  }
};

/**
 * Obtient les statistiques de la base de données d'adaptateurs
 */
const getAdapterStatistics = async (req: Request, res: Response) => {
  try {
    const stats = {
      total: KNOWN_ZIGBEE_ADAPTERS.length,
      byReliability: {
        excellent: KNOWN_ZIGBEE_ADAPTERS.filter(a => a.reliability === 'excellent').length,
        good: KNOWN_ZIGBEE_ADAPTERS.filter(a => a.reliability === 'good').length,
        fair: KNOWN_ZIGBEE_ADAPTERS.filter(a => a.reliability === 'fair').length,
        limited: KNOWN_ZIGBEE_ADAPTERS.filter(a => a.reliability === 'limited').length
      },
      byManufacturer: Object.entries(
        KNOWN_ZIGBEE_ADAPTERS.reduce((acc, adapter) => {
          acc[adapter.manufacturer] = (acc[adapter.manufacturer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, count })),
      byChipset: Object.entries(
        KNOWN_ZIGBEE_ADAPTERS.reduce((acc, adapter) => {
          acc[adapter.chipset] = (acc[adapter.chipset] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, count })),
      mostRecommended: getRecommendedAdapters().slice(0, 5).map(a => ({
        name: a.model,
        manufacturer: a.manufacturer,
        reliability: a.reliability
      }))
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('Erreur lors du calcul des statistiques', { error });
    res.status(500).json({ error: 'Impossible de calculer les statistiques' });
  }
};

export default {
  detectAdapters,
  getKnownAdapters,
  getRecommendedAdaptersList,
  getAdapterDetails,
  getAdapterStatistics
};