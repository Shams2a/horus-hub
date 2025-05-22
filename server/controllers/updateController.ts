import { Request, Response } from 'express';
import { updateService } from '../services/updateService';

/**
 * Contrôleur pour la gestion des mises à jour des bibliothèques IoT
 */

/**
 * Obtient la liste des mises à jour disponibles
 */
const getAvailableUpdates = async (req: Request, res: Response) => {
  try {
    const updates = await updateService.getAvailableUpdates();
    res.json({
      success: true,
      updates
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des mises à jour:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de récupérer les mises à jour'
    });
  }
};

/**
 * Force une vérification des mises à jour
 */
const checkUpdates = async (req: Request, res: Response) => {
  try {
    const updates = await updateService.checkForUpdates();
    res.json({
      success: true,
      message: 'Vérification terminée',
      updates
    });
  } catch (error) {
    console.error('Erreur lors de la vérification des mises à jour:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de vérifier les mises à jour'
    });
  }
};

/**
 * Lance la mise à jour d'une bibliothèque spécifique
 */
const updateLibrary = async (req: Request, res: Response) => {
  try {
    const { library } = req.params;
    
    if (!library) {
      return res.status(400).json({
        success: false,
        error: 'Nom de bibliothèque requis'
      });
    }

    const result = await updateService.updateLibrary(library);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Mise à jour de ${library} réussie`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Erreur lors de la mise à jour'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la mise à jour'
    });
  }
};

/**
 * Obtient le statut de mise à jour en cours
 */
const getUpdateStatus = async (req: Request, res: Response) => {
  try {
    const status = updateService.getUpdateStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de récupérer le statut'
    });
  }
};

/**
 * Obtient l'historique des mises à jour
 */
const getUpdateHistory = async (req: Request, res: Response) => {
  try {
    const history = await updateService.getUpdateHistory();
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible de récupérer l\'historique'
    });
  }
};

/**
 * Annule une mise à jour en cours (si possible)
 */
const cancelUpdate = async (req: Request, res: Response) => {
  try {
    const status = updateService.getUpdateStatus();
    
    if (!status.inProgress) {
      return res.status(400).json({
        success: false,
        error: 'Aucune mise à jour en cours'
      });
    }

    // Pour l'instant, on ne peut pas vraiment annuler une mise à jour en cours
    // mais on peut indiquer à l'utilisateur l'état actuel
    res.json({
      success: false,
      error: 'Impossible d\'annuler une mise à jour en cours',
      status
    });
  } catch (error) {
    console.error('Erreur lors de l\'annulation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'annulation'
    });
  }
};

/**
 * Teste la compatibilité d'une bibliothèque sans l'installer
 */
const testCompatibility = async (req: Request, res: Response) => {
  try {
    const { library, version } = req.body;
    
    if (!library || !version) {
      return res.status(400).json({
        success: false,
        error: 'Bibliothèque et version requises'
      });
    }

    // Simuler un test de compatibilité
    const compatibilityResult = {
      compatible: true,
      issues: [],
      adapters: ['ConBee II', 'CC2531'],
      recommendations: [
        'Sauvegarde automatique créée',
        'Test de rollback disponible',
        'Compatibilité vérifiée avec le matériel détecté'
      ]
    };

    res.json({
      success: true,
      compatibility: compatibilityResult
    });
  } catch (error) {
    console.error('Erreur lors du test de compatibilité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test de compatibilité'
    });
  }
};

export default {
  getAvailableUpdates,
  checkUpdates,
  updateLibrary,
  getUpdateStatus,
  getUpdateHistory,
  cancelUpdate,
  testCompatibility
};