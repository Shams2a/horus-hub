import { exec } from 'child_process';
import { promisify } from 'util';
import { findAdapterByUSBId, AdapterInfo, getRecommendedAdapters } from '../data/adapterDatabase';
import logger from '../utils/logger';
import { storage } from '../storage';

const execAsync = promisify(exec);

export interface DetectionResult {
  phase: 'hardware' | 'communication' | 'heuristic';
  confidence: 'high' | 'medium' | 'low';
  adapter: AdapterInfo | null;
  devicePath?: string;
  rawData?: any;
  suggestions: string[];
  issues: string[];
}

export interface USBDevice {
  vid: string;
  pid: string;
  manufacturer?: string;
  product?: string;
  devicePath?: string;
}

/**
 * Service de détection automatique des adaptateurs en cascade
 */
export class AdapterDetectionService {
  
  /**
   * Détection complète en cascade
   */
  async detectAdapters(): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];
    
    // Phase 1: Détection matérielle par identifiants USB
    const hardwareResults = await this.detectByHardware();
    results.push(...hardwareResults);
    
    // Phase 2: Test de communication pour les adaptateurs non identifiés
    if (hardwareResults.length === 0 || hardwareResults.some(r => r.confidence !== 'high')) {
      const communicationResults = await this.detectByCommunication();
      results.push(...communicationResults);
    }
    
    // Phase 3: Heuristiques pour les cas complexes
    if (results.length === 0 || results.every(r => r.confidence === 'low')) {
      const heuristicResults = await this.detectByHeuristics();
      results.push(...heuristicResults);
    }
    
    // Sauvegarder automatiquement les configurations recommandées
    await this.saveDetectedConfigurations(results);
    
    return results;
  }

  /**
   * Sauvegarde les configurations recommandées dans les settings
   */
  private async saveDetectedConfigurations(results: DetectionResult[]): Promise<void> {
    try {
      for (const result of results) {
        if (result.adapter && result.confidence === 'high') {
          await this.saveAdapterConfiguration(result);
        }
      }
    } catch (error) {
      logger.error('Error saving detected configurations', { error });
    }
  }

  /**
   * Sauvegarde la configuration d'un adaptateur détecté
   */
  private async saveAdapterConfiguration(result: DetectionResult): Promise<void> {
    if (!result.adapter) return;

    const protocol = this.getProtocolFromAdapter(result.adapter);
    if (!protocol) return;

    const configKey = `detected_${protocol}_config`;
    const configuration = this.generateConfiguration(result);

    try {
      await storage.updateSetting(configKey, JSON.stringify(configuration));
      logger.info(`Saved detected configuration for ${protocol}`, { configuration });
    } catch (error) {
      logger.error(`Error saving configuration for ${protocol}`, { error });
    }
  }

  /**
   * Génère la configuration recommandée pour un adaptateur
   */
  private generateConfiguration(result: DetectionResult): any {
    if (!result.adapter) return {};

    const config: any = {
      detectedAt: new Date().toISOString(),
      confidence: result.confidence,
      adapter: result.adapter,
      devicePath: result.devicePath || '/dev/ttyUSB0',
      suggestions: result.suggestions,
      issues: result.issues
    };

    // Configuration spécifique selon le type d'adaptateur
    if (result.adapter.chipset.includes('CC2531') || result.adapter.chipset.includes('CC2652')) {
      config.zigbee = {
        serialPort: result.devicePath || '/dev/ttyUSB0',
        baudRate: 115200,
        coordinator: 'zStack',
        panId: '0x1a62',
        channel: 11,
        networkKey: 'GENERATE_NEW_KEY'
      };
    }

    return config;
  }

  /**
   * Détermine le protocole depuis les informations de l'adaptateur
   */
  private getProtocolFromAdapter(adapter: AdapterInfo): string | null {
    // La plupart des adaptateurs détectés sont Zigbee
    if (adapter.chipset.includes('CC') || adapter.chipset.includes('EFR32')) {
      return 'zigbee';
    }
    
    // Ajouter d'autres types si nécessaire
    return 'zigbee'; // Par défaut pour les adaptateurs connus
  }
  
  /**
   * Phase 1: Détection par identifiants matériels (VID/PID)
   */
  private async detectByHardware(): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];
    
    try {
      const usbDevices = await this.scanUSBDevices();
      
      for (const device of usbDevices) {
        const knownAdapter = findAdapterByUSBId(device.vid, device.pid);
        
        if (knownAdapter) {
          results.push({
            phase: 'hardware',
            confidence: 'high',
            adapter: knownAdapter,
            devicePath: device.devicePath,
            rawData: device,
            suggestions: [
              `Adaptateur ${knownAdapter.model} détecté avec confiance élevée`,
              `Utiliser le driver ${knownAdapter.driver}`,
              ...(knownAdapter.reliability === 'excellent' ? ['Adaptateur recommandé'] : [])
            ],
            issues: knownAdapter.reliability === 'limited' ? 
              ['Support limité pour cet adaptateur'] : []
          });
        }
      }
      
    } catch (error) {
      logger.error('Erreur lors de la détection matérielle', { error });
    }
    
    return results;
  }
  
  /**
   * Phase 2: Détection par test de communication
   */
  private async detectByCommunication(): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];
    
    const serialPorts = await this.scanSerialPorts();
    
    for (const port of serialPorts) {
      try {
        const commResult = await this.testCommunication(port);
        
        if (commResult.success) {
          results.push({
            phase: 'communication',
            confidence: 'medium',
            adapter: null,
            devicePath: port,
            rawData: commResult,
            suggestions: ['Adaptateur répondant détecté sur ' + port],
            issues: []
          });
        }
        
      } catch (error) {
        logger.debug(`Échec de communication sur ${port}`, { error });
      }
    }
    
    return results;
  }
  
  /**
   * Phase 3: Détection par heuristiques
   */
  private async detectByHeuristics(): Promise<DetectionResult[]> {
    const recommendedAdapters = getRecommendedAdapters();
    
    return [{
      phase: 'heuristic',
      confidence: 'low',
      adapter: null,
      suggestions: [
        'Aucun adaptateur détecté automatiquement',
        'Adaptateurs recommandés : ' + recommendedAdapters.slice(0, 3).map(a => a.model).join(', ')
      ],
      issues: ['Détection automatique impossible']
    }];
  }
  
  /**
   * Scanner les périphériques USB
   */
  private async scanUSBDevices(): Promise<USBDevice[]> {
    const devices: USBDevice[] = [];
    
    try {
      const { stdout } = await execAsync('lsusb 2>/dev/null || echo ""');
      
      for (const line of stdout.split('\n').filter(l => l.trim())) {
        const match = line.match(/ID ([0-9a-fA-F]{4}):([0-9a-fA-F]{4})/);
        if (match) {
          devices.push({
            vid: match[1],
            pid: match[2]
          });
        }
      }
      
    } catch (error) {
      logger.debug('Erreur scan USB', { error });
    }
    
    return devices;
  }
  
  /**
   * Scanner les ports série
   */
  private async scanSerialPorts(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('ls /dev/tty{USB,ACM}* 2>/dev/null || echo ""');
      return stdout.split('\n').filter(p => p.trim());
    } catch {
      return [];
    }
  }
  
  /**
   * Tester la communication avec un port
   */
  private async testCommunication(port: string): Promise<{ success: boolean; response?: string }> {
    // Test de communication basique
    return { success: false };
  }
}