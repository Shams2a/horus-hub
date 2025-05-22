import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';

const execAsync = promisify(exec);

interface LibraryVersion {
  name: string;
  current: string;
  latest: string;
  compatible: boolean;
  changelogUrl?: string;
  releaseDate?: string;
  breakingChanges?: string[];
}

interface UpdateStatus {
  inProgress: boolean;
  library?: string;
  version?: string;
  progress: number;
  status: 'checking' | 'downloading' | 'installing' | 'testing' | 'completed' | 'failed' | 'rolling_back';
  error?: string;
  startTime?: string;
}

interface HardwareCompatibility {
  zigbeeAdapters: string[];
  supportedChipsets: string[];
  minimumFirmware: string;
  knownIssues: string[];
}

export class UpdateService {
  private updateStatus: UpdateStatus = {
    inProgress: false,
    progress: 0,
    status: 'completed'
  };

  private backupDir = path.join(process.cwd(), 'backups');
  private libraryBackups: Map<string, string> = new Map();

  // Bibliothèques IoT critiques à surveiller
  private iotLibraries = [
    'zigbee-herdsman',
    'zigbee-herdsman-converters',
    'zigbee2mqtt',
    'node-hid',
    'serialport',
    '@homebridge/hap-nodejs'
  ];

  constructor() {
    this.ensureBackupDirectory();
    this.startPeriodicCheck();
  }

  private async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Démarre la vérification périodique des mises à jour (toutes les 24h)
   */
  private startPeriodicCheck() {
    // Vérification immédiate
    setTimeout(() => this.checkForUpdates(), 5000);
    
    // Puis vérification toutes les 24 heures
    setInterval(() => {
      this.checkForUpdates();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Vérifie les mises à jour disponibles pour toutes les bibliothèques IoT
   */
  async checkForUpdates(): Promise<LibraryVersion[]> {
    try {
      console.log('🔍 Vérification des mises à jour des bibliothèques IoT...');
      
      const updates: LibraryVersion[] = [];
      
      for (const libraryName of this.iotLibraries) {
        try {
          const versionInfo = await this.getLibraryVersionInfo(libraryName);
          if (versionInfo) {
            updates.push(versionInfo);
          }
        } catch (error) {
          console.warn(`❌ Impossible de vérifier ${libraryName}:`, error);
        }
      }

      // Sauvegarder les informations de mise à jour
      await this.saveUpdateInfo(updates);
      
      // Notifier les mises à jour disponibles
      const availableUpdates = updates.filter(lib => lib.current !== lib.latest && lib.compatible);
      if (availableUpdates.length > 0) {
        console.log(`✨ ${availableUpdates.length} mise(s) à jour disponible(s)`);
        await this.logActivity('updates_available', {
          count: availableUpdates.length,
          libraries: availableUpdates.map(lib => `${lib.name}@${lib.latest}`)
        });
      }

      return updates;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des mises à jour:', error);
      return [];
    }
  }

  /**
   * Obtient les informations de version d'une bibliothèque
   */
  private async getLibraryVersionInfo(libraryName: string): Promise<LibraryVersion | null> {
    try {
      // Vérifier la version actuelle
      const { stdout: currentVersionOutput } = await execAsync(`npm list ${libraryName} --depth=0 --json`);
      const currentData = JSON.parse(currentVersionOutput);
      const currentVersion = currentData.dependencies?.[libraryName]?.version || 'non installé';

      // Vérifier la dernière version disponible
      const { stdout: latestVersionOutput } = await execAsync(`npm view ${libraryName} version`);
      const latestVersion = latestVersionOutput.trim();

      // Vérifier la compatibilité matérielle
      const compatibility = await this.checkHardwareCompatibility(libraryName, latestVersion);

      // Obtenir les informations supplémentaires
      const { stdout: infoOutput } = await execAsync(`npm view ${libraryName} --json`);
      const packageInfo = JSON.parse(infoOutput);

      return {
        name: libraryName,
        current: currentVersion,
        latest: latestVersion,
        compatible: compatibility.compatible,
        changelogUrl: packageInfo.homepage || packageInfo.repository?.url,
        releaseDate: packageInfo.time?.[latestVersion],
        breakingChanges: compatibility.issues
      };
    } catch (error) {
      console.warn(`⚠️ Impossible d'obtenir les infos de ${libraryName}:`, error);
      return null;
    }
  }

  /**
   * Vérifie la compatibilité matérielle d'une nouvelle version
   */
  private async checkHardwareCompatibility(libraryName: string, version: string): Promise<{ compatible: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Vérifier les adaptateurs Zigbee connectés
      const adapters = await this.getConnectedAdapters();
      
      // Règles de compatibilité spécifiques
      if (libraryName === 'zigbee-herdsman') {
        // Vérifier la compatibilité avec les chipsets
        const incompatibleChipsets = await this.checkZigbeeChipsetCompatibility(version, adapters);
        if (incompatibleChipsets.length > 0) {
          issues.push(`Incompatible avec les chipsets: ${incompatibleChipsets.join(', ')}`);
        }
      }

      if (libraryName === 'serialport') {
        // Vérifier la compatibilité avec les ports série
        const serialIssues = await this.checkSerialPortCompatibility(version);
        issues.push(...serialIssues);
      }

      return {
        compatible: issues.length === 0,
        issues
      };
    } catch (error) {
      console.warn('⚠️ Erreur lors de la vérification de compatibilité:', error);
      return { compatible: true, issues: [] }; // En cas d'erreur, considérer comme compatible
    }
  }

  /**
   * Effectue la mise à jour d'une bibliothèque avec rollback automatique
   */
  async updateLibrary(libraryName: string): Promise<{ success: boolean; error?: string }> {
    if (this.updateStatus.inProgress) {
      return { success: false, error: 'Une mise à jour est déjà en cours' };
    }

    try {
      this.updateStatus = {
        inProgress: true,
        library: libraryName,
        progress: 0,
        status: 'checking',
        startTime: new Date().toISOString()
      };

      console.log(`🚀 Début de la mise à jour de ${libraryName}`);

      // 1. Créer une sauvegarde
      this.updateStatus.status = 'downloading';
      this.updateStatus.progress = 10;
      const backupPath = await this.createBackup(libraryName);
      this.libraryBackups.set(libraryName, backupPath);

      // 2. Télécharger et installer la nouvelle version
      this.updateStatus.progress = 30;
      await this.installUpdate(libraryName);

      // 3. Tester la nouvelle version
      this.updateStatus.status = 'testing';
      this.updateStatus.progress = 70;
      const testResult = await this.testUpdate(libraryName);

      if (!testResult.success) {
        // 4. Rollback en cas d'échec
        console.warn(`❌ Test échoué pour ${libraryName}, rollback en cours...`);
        this.updateStatus.status = 'rolling_back';
        this.updateStatus.progress = 80;
        await this.rollbackUpdate(libraryName);
        
        return { success: false, error: `Test échoué: ${testResult.error}` };
      }

      // 5. Finaliser la mise à jour
      this.updateStatus.status = 'completed';
      this.updateStatus.progress = 100;
      
      await this.logActivity('library_updated', {
        library: libraryName,
        success: true
      });

      console.log(`✅ Mise à jour de ${libraryName} réussie`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour de ${libraryName}:`, error);
      
      // Rollback automatique en cas d'erreur
      try {
        this.updateStatus.status = 'rolling_back';
        await this.rollbackUpdate(libraryName);
      } catch (rollbackError) {
        console.error('❌ Erreur lors du rollback:', rollbackError);
      }

      await this.logActivity('library_update_failed', {
        library: libraryName,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });

      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    } finally {
      this.updateStatus.inProgress = false;
    }
  }

  /**
   * Crée une sauvegarde de la bibliothèque actuelle
   */
  private async createBackup(libraryName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `${libraryName}-${timestamp}`);
    
    try {
      // Sauvegarder le package.json et node_modules
      await execAsync(`cp -r node_modules/${libraryName} "${backupPath}"`);
      console.log(`📦 Sauvegarde créée: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.warn('⚠️ Impossible de créer la sauvegarde:', error);
      throw error;
    }
  }

  /**
   * Installe la mise à jour
   */
  private async installUpdate(libraryName: string): Promise<void> {
    try {
      console.log(`📥 Installation de ${libraryName}...`);
      await execAsync(`npm update ${libraryName}`);
      this.updateStatus.progress = 60;
    } catch (error) {
      console.error(`❌ Erreur d'installation de ${libraryName}:`, error);
      throw error;
    }
  }

  /**
   * Teste la nouvelle version
   */
  private async testUpdate(libraryName: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🧪 Test de ${libraryName}...`);
      
      // Tests spécifiques selon la bibliothèque
      if (libraryName === 'zigbee-herdsman') {
        return await this.testZigbeeHerdsman();
      } else if (libraryName === 'serialport') {
        return await this.testSerialPort();
      } else {
        // Test générique: vérifier que le module peut être importé
        await execAsync(`node -e "require('${libraryName}')"`);
        return { success: true };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Test échoué' 
      };
    }
  }

  /**
   * Effectue un rollback vers la version précédente
   */
  private async rollbackUpdate(libraryName: string): Promise<void> {
    const backupPath = this.libraryBackups.get(libraryName);
    if (!backupPath) {
      throw new Error('Aucune sauvegarde trouvée pour le rollback');
    }

    try {
      console.log(`🔄 Rollback de ${libraryName}...`);
      await execAsync(`rm -rf node_modules/${libraryName}`);
      await execAsync(`cp -r "${backupPath}" node_modules/${libraryName}`);
      
      await this.logActivity('library_rollback', {
        library: libraryName,
        backupPath
      });
      
      console.log(`✅ Rollback de ${libraryName} réussi`);
    } catch (error) {
      console.error(`❌ Erreur lors du rollback de ${libraryName}:`, error);
      throw error;
    }
  }

  /**
   * Obtient le statut de mise à jour actuel
   */
  getUpdateStatus(): UpdateStatus {
    return { ...this.updateStatus };
  }

  /**
   * Fonctions utilitaires privées
   */
  private async getConnectedAdapters(): Promise<string[]> {
    // Simuler la détection d'adaptateurs connectés
    return ['ConBee II', 'CC2531'];
  }

  private async checkZigbeeChipsetCompatibility(version: string, adapters: string[]): Promise<string[]> {
    // Logique de vérification de compatibilité Zigbee
    const incompatible: string[] = [];
    
    // Exemples de règles de compatibilité
    if (version.startsWith('0.') && adapters.includes('CC2531')) {
      incompatible.push('CC2531');
    }
    
    return incompatible;
  }

  private async checkSerialPortCompatibility(version: string): Promise<string[]> {
    const issues: string[] = [];
    
    // Vérifier la compatibilité avec les ports série
    try {
      const { stdout } = await execAsync('ls /dev/tty*');
      if (!stdout.includes('ttyUSB') && !stdout.includes('ttyACM')) {
        issues.push('Aucun port série détecté');
      }
    } catch (error) {
      issues.push('Impossible de vérifier les ports série');
    }
    
    return issues;
  }

  private async testZigbeeHerdsman(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test basique d'importation et d'initialisation
      const { spawn } = require('child_process');
      const testProcess = spawn('node', ['-e', `
        const zigbeeHerdsman = require('zigbee-herdsman');
        console.log('Test réussi');
        process.exit(0);
      `]);
      
      return new Promise((resolve) => {
        testProcess.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Test d\'importation échoué' });
          }
        });
        
        setTimeout(() => {
          testProcess.kill();
          resolve({ success: false, error: 'Timeout du test' });
        }, 10000);
      });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur de test' };
    }
  }

  private async testSerialPort(): Promise<{ success: boolean; error?: string }> {
    try {
      await execAsync(`node -e "const SerialPort = require('serialport'); console.log('SerialPort OK');"`);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Test SerialPort échoué' };
    }
  }

  private async saveUpdateInfo(updates: LibraryVersion[]): Promise<void> {
    try {
      await storage.insertSetting({
        key: 'library_updates',
        value: JSON.stringify({
          lastCheck: new Date().toISOString(),
          updates: updates
        }),
        category: 'system'
      });
    } catch (error) {
      console.warn('⚠️ Impossible de sauvegarder les infos de mise à jour:', error);
    }
  }

  private async logActivity(activity: string, details: any): Promise<void> {
    try {
      await storage.insertActivity({
        deviceId: 0,
        activity,
        details: JSON.stringify(details),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('⚠️ Impossible de logger l\'activité:', error);
    }
  }

  /**
   * APIs publiques pour l'interface web
   */
  async getAvailableUpdates(): Promise<LibraryVersion[]> {
    try {
      const setting = await storage.getSetting('library_updates');
      if (setting) {
        const data = JSON.parse(setting.value);
        return data.updates || [];
      }
      return [];
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer les mises à jour:', error);
      return [];
    }
  }

  async getUpdateHistory(): Promise<any[]> {
    try {
      const activities = await storage.getActivities(50);
      return activities.filter(activity => 
        activity.activity.includes('update') || 
        activity.activity.includes('rollback')
      );
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer l\'historique:', error);
      return [];
    }
  }
}

// Instance singleton
export const updateService = new UpdateService();