import { Request, Response } from 'express';
import { diagnosticService } from '../services/diagnosticService';

export class DiagnosticController {
  
  // Obtenir l'état de santé général du système
  async getSystemHealth(req: Request, res: Response) {
    try {
      const health = diagnosticService.getSystemHealth();
      res.json({
        success: true,
        health
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Obtenir toutes les erreurs avec filtres optionnels
  async getErrors(req: Request, res: Response) {
    try {
      const { severity, category, resolved, source, limit = 50 } = req.query;
      
      const filters: any = {};
      if (severity) filters.severity = severity;
      if (category) filters.category = category;
      if (resolved !== undefined) filters.resolved = resolved === 'true';
      if (source) filters.source = source;
      
      const errors = diagnosticService.getErrors(filters);
      const limitedErrors = errors.slice(0, parseInt(limit as string));
      
      res.json({
        success: true,
        errors: limitedErrors,
        total: errors.length,
        filtered: limitedErrors.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Obtenir les détails d'une erreur spécifique
  async getError(req: Request, res: Response) {
    try {
      const { errorId } = req.params;
      const errors = diagnosticService.getErrors();
      const error = errors.find(e => e.id === errorId);
      
      if (!error) {
        return res.status(404).json({
          success: false,
          error: 'Erreur non trouvée'
        });
      }
      
      res.json({
        success: true,
        error
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Marquer une erreur comme résolue
  async resolveError(req: Request, res: Response) {
    try {
      const { errorId } = req.params;
      const { resolvedBy } = req.body;
      
      await diagnosticService.resolveError(errorId, resolvedBy);
      
      res.json({
        success: true,
        message: 'Erreur marquée comme résolue'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Obtenir la configuration des vérifications
  async getChecks(req: Request, res: Response) {
    try {
      const checks = diagnosticService.getChecks();
      res.json({
        success: true,
        checks
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Mettre à jour la configuration d'une vérification
  async updateCheck(req: Request, res: Response) {
    try {
      const { checkId } = req.params;
      const updates = req.body;
      
      diagnosticService.updateCheck(checkId, updates);
      
      res.json({
        success: true,
        message: 'Configuration de vérification mise à jour'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Exécuter manuellement une vérification
  async runCheck(req: Request, res: Response) {
    try {
      const { checkId } = req.params;
      
      // Simuler l'exécution d'une vérification manuelle
      const checks = diagnosticService.getChecks();
      const check = checks.find(c => c.id === checkId);
      
      if (!check) {
        return res.status(404).json({
          success: false,
          error: 'Vérification non trouvée'
        });
      }
      
      res.json({
        success: true,
        message: `Vérification ${check.name} lancée manuellement`,
        checkId
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Obtenir les statistiques des erreurs
  async getErrorStats(req: Request, res: Response) {
    try {
      const { period = '24h' } = req.query;
      
      let startDate = new Date();
      switch (period) {
        case '1h':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
      
      const allErrors = diagnosticService.getErrors();
      const periodErrors = allErrors.filter(e => e.timestamp >= startDate);
      
      const stats = {
        total: periodErrors.length,
        resolved: periodErrors.filter(e => e.resolved).length,
        active: periodErrors.filter(e => !e.resolved).length,
        bySeverity: {
          low: periodErrors.filter(e => e.severity === 'low').length,
          medium: periodErrors.filter(e => e.severity === 'medium').length,
          high: periodErrors.filter(e => e.severity === 'high').length,
          critical: periodErrors.filter(e => e.severity === 'critical').length
        },
        byCategory: {
          hardware: periodErrors.filter(e => e.category === 'hardware').length,
          network: periodErrors.filter(e => e.category === 'network').length,
          software: periodErrors.filter(e => e.category === 'software').length,
          configuration: periodErrors.filter(e => e.category === 'configuration').length
        },
        bySource: this.groupBySource(periodErrors),
        timeline: this.generateTimeline(periodErrors, period as string)
      };
      
      res.json({
        success: true,
        period,
        stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Exporter les logs de diagnostic
  async exportDiagnosticLogs(req: Request, res: Response) {
    try {
      const { format = 'json', period = '24h' } = req.query;
      
      let startDate = new Date();
      switch (period) {
        case '1h':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
      
      const errors = diagnosticService.getErrors().filter(e => e.timestamp >= startDate);
      const checks = diagnosticService.getChecks();
      const health = diagnosticService.getSystemHealth();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        period,
        systemHealth: health,
        errors: errors,
        checks: checks,
        summary: {
          totalErrors: errors.length,
          resolvedErrors: errors.filter(e => e.resolved).length,
          activeErrors: errors.filter(e => !e.resolved).length,
          criticalErrors: errors.filter(e => e.severity === 'critical').length
        }
      };
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="diagnostic-${period}-${Date.now()}.json"`);
        res.json(exportData);
      } else {
        // Format CSV basique
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="diagnostic-${period}-${Date.now()}.csv"`);
        
        const csvData = this.convertToCSV(errors);
        res.send(csvData);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Simuler un problème pour les tests
  async simulateError(req: Request, res: Response) {
    try {
      const { severity = 'medium', category = 'software', source = 'test' } = req.body;
      
      const errorId = await diagnosticService.reportError({
        source: `test_${source}`,
        category,
        severity,
        code: 'SIMULATED_ERROR',
        message: 'Erreur simulée pour test du système de diagnostic',
        details: {
          simulated: true,
          timestamp: new Date().toISOString(),
          requestData: req.body
        },
        suggestedActions: [
          'Ceci est une erreur de test',
          'Marquer comme résolue quand le test est terminé',
          'Vérifier que le système de diagnostic fonctionne'
        ]
      });
      
      res.json({
        success: true,
        message: 'Erreur simulée créée avec succès',
        errorId
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  private groupBySource(errors: any[]) {
    const grouped: Record<string, number> = {};
    errors.forEach(error => {
      grouped[error.source] = (grouped[error.source] || 0) + 1;
    });
    return grouped;
  }

  private generateTimeline(errors: any[], period: string) {
    const timeline: { timestamp: string; count: number }[] = [];
    const now = new Date();
    let intervals = 24;
    let intervalMs = 60 * 60 * 1000; // 1 heure
    
    switch (period) {
      case '1h':
        intervals = 12;
        intervalMs = 5 * 60 * 1000; // 5 minutes
        break;
      case '24h':
        intervals = 24;
        intervalMs = 60 * 60 * 1000; // 1 heure
        break;
      case '7d':
        intervals = 7;
        intervalMs = 24 * 60 * 60 * 1000; // 1 jour
        break;
      case '30d':
        intervals = 30;
        intervalMs = 24 * 60 * 60 * 1000; // 1 jour
        break;
    }
    
    for (let i = intervals - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * intervalMs));
      const nextTimestamp = new Date(timestamp.getTime() + intervalMs);
      
      const count = errors.filter(error => 
        error.timestamp >= timestamp && error.timestamp < nextTimestamp
      ).length;
      
      timeline.push({
        timestamp: timestamp.toISOString(),
        count
      });
    }
    
    return timeline;
  }

  private convertToCSV(errors: any[]): string {
    const headers = ['ID', 'Timestamp', 'Severity', 'Category', 'Source', 'Message', 'Resolved'];
    const rows = errors.map(error => [
      error.id,
      error.timestamp.toISOString(),
      error.severity,
      error.category,
      error.source,
      `"${error.message.replace(/"/g, '""')}"`,
      error.resolved ? 'Yes' : 'No'
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

export const diagnosticController = new DiagnosticController();