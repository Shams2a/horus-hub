import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Zap,
  Download,
  RefreshCw,
  Settings,
  TrendingUp,
  Eye,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface DiagnosticError {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'hardware' | 'network' | 'software' | 'configuration';
  source: string;
  code: string;
  message: string;
  details: Record<string, any>;
  suggestedActions: string[];
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  adapters: {
    [key: string]: {
      status: 'healthy' | 'warning' | 'critical' | 'offline';
      lastCheck: string;
      issues: DiagnosticError[];
    };
  };
  system: {
    memory: { usage: number; status: 'healthy' | 'warning' | 'critical' };
    disk: { usage: number; status: 'healthy' | 'warning' | 'critical' };
    network: { status: 'healthy' | 'warning' | 'critical' };
  };
  errorCount: {
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

interface DiagnosticCheck {
  id: string;
  name: string;
  type: 'hardware' | 'network' | 'software' | 'configuration';
  interval: number;
  timeout: number;
  enabled: boolean;
  lastRun?: string;
  lastResult?: 'success' | 'warning' | 'error';
  lastError?: string;
}

export default function Diagnostics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedError, setSelectedError] = useState<DiagnosticError | null>(null);
  const { toast } = useToast();

  // Chargement de l'état de santé du système
  const { data: healthResponse, isLoading: loadingHealth } = useQuery({
    queryKey: ['/api/diagnostics/health'],
    refetchInterval: 10000 // Actualiser toutes les 10 secondes
  });

  const systemHealth: SystemHealth = healthResponse?.health;

  // Chargement des erreurs
  const { data: errorsResponse, isLoading: loadingErrors, refetch: refetchErrors } = useQuery({
    queryKey: ['/api/diagnostics/errors'],
    refetchInterval: 15000
  });

  const errors: DiagnosticError[] = errorsResponse?.errors || [];

  // Chargement des vérifications
  const { data: checksResponse, isLoading: loadingChecks } = useQuery({
    queryKey: ['/api/diagnostics/checks'],
  });

  const checks: DiagnosticCheck[] = checksResponse?.checks || [];

  // Chargement des statistiques
  const { data: statsResponse } = useQuery({
    queryKey: ['/api/diagnostics/stats', { period: '24h' }],
    refetchInterval: 30000
  });

  // Mutation pour résoudre une erreur
  const resolveErrorMutation = useMutation({
    mutationFn: async (errorId: string) => {
      return apiRequest('POST', `/api/diagnostics/errors/${errorId}/resolve`, {
        resolvedBy: 'Utilisateur'
      });
    },
    onSuccess: () => {
      toast({
        title: "Erreur résolue",
        description: "L'erreur a été marquée comme résolue"
      });
      refetchErrors();
      queryClient.invalidateQueries({ queryKey: ['/api/diagnostics/health'] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de résoudre l'erreur",
        variant: "destructive"
      });
    }
  });

  // Mutation pour exécuter une vérification
  const runCheckMutation = useMutation({
    mutationFn: async (checkId: string) => {
      return apiRequest('POST', `/api/diagnostics/checks/${checkId}/run`);
    },
    onSuccess: () => {
      toast({
        title: "Vérification lancée",
        description: "La vérification a été démarrée"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/diagnostics/checks'] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de lancer la vérification",
        variant: "destructive"
      });
    }
  });

  // Mutation pour simuler une erreur (test)
  const simulateErrorMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/diagnostics/simulate', {
        severity: 'medium',
        category: 'software',
        source: 'test_interface'
      });
    },
    onSuccess: () => {
      toast({
        title: "Erreur de test créée",
        description: "Une erreur de test a été générée"
      });
      refetchErrors();
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string, size = 'h-4 w-4') => {
    switch (status) {
      case 'healthy': return <CheckCircle className={`${size} text-green-500`} />;
      case 'warning': return <AlertTriangle className={`${size} text-yellow-500`} />;
      case 'critical': return <XCircle className={`${size} text-red-500`} />;
      case 'offline': return <Clock className={`${size} text-gray-500`} />;
      default: return <Clock className={`${size} text-gray-500`} />;
    }
  };

  const activeErrors = errors.filter(e => !e.resolved);
  const criticalErrors = activeErrors.filter(e => e.severity === 'critical');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Diagnostic système</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Surveillance et diagnostic automatique des adaptateurs IoT
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="errors">Erreurs</TabsTrigger>
          <TabsTrigger value="checks">Vérifications</TabsTrigger>
          <TabsTrigger value="analytics">Analyse</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* État de santé général */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {systemHealth?.overall && getStatusIcon(systemHealth.overall, 'h-6 w-6')}
                  État de santé du système
                </CardTitle>
                <CardDescription>
                  Surveillance en temps réel des composants critiques
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHealth ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        systemHealth?.overall === 'healthy' ? 'text-green-600' :
                        systemHealth?.overall === 'warning' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {systemHealth?.overall === 'healthy' ? 'Sain' :
                         systemHealth?.overall === 'warning' ? 'Attention' : 'Critique'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">État général</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {systemHealth?.errorCount.total || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Erreurs actives</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {criticalErrors.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Critiques</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* État des adaptateurs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  État des adaptateurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {systemHealth?.adapters && Object.entries(systemHealth.adapters).map(([name, adapter]) => (
                    <Card key={name} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium capitalize">{name}</h3>
                          {getStatusIcon(adapter.status)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Dernière vérification: {new Date(adapter.lastCheck).toLocaleTimeString()}
                        </div>
                        {adapter.issues.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {adapter.issues.length} problème(s)
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Erreurs critiques récentes */}
            {criticalErrors.length > 0 && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                    <XCircle className="h-5 w-5" />
                    Erreurs critiques ({criticalErrors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {criticalErrors.slice(0, 3).map((error) => (
                      <div key={error.id} className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium text-red-800 dark:text-red-200">
                            {error.source}: {error.message}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(error.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resolveErrorMutation.mutate(error.id)}
                          disabled={resolveErrorMutation.isPending}
                        >
                          Résoudre
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Erreurs */}
        <TabsContent value="errors">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Journal des erreurs ({errors.length})
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => simulateErrorMutation.mutate()}
                    disabled={simulateErrorMutation.isPending}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Test d'erreur
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {errors.map((error) => (
                      <div 
                        key={error.id} 
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          error.resolved ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
                        } ${selectedError?.id === error.id ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getSeverityColor(error.severity)}>
                                {error.severity}
                              </Badge>
                              <Badge variant="outline">{error.category}</Badge>
                              {error.resolved && <Badge variant="secondary">Résolu</Badge>}
                            </div>
                            <div className="font-medium mb-1">
                              {error.source}: {error.message}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(error.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!error.resolved && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resolveErrorMutation.mutate(error.id);
                                }}
                                disabled={resolveErrorMutation.isPending}
                              >
                                Résoudre
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedError(selectedError?.id === error.id ? null : error);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {selectedError?.id === error.id && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            <div>
                              <h4 className="font-medium mb-2">Détails:</h4>
                              <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                                {JSON.stringify(error.details, null, 2)}
                              </pre>
                            </div>
                            {error.suggestedActions.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Actions suggérées:</h4>
                                <ul className="text-sm space-y-1">
                                  {error.suggestedActions.map((action, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-blue-500">→</span>
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vérifications */}
        <TabsContent value="checks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration des vérifications
              </CardTitle>
              <CardDescription>
                Gestion des contrôles automatiques du système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checks.map((check) => (
                  <Card key={check.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{check.name}</h3>
                          <Badge variant="outline">{check.type}</Badge>
                          {check.enabled ? (
                            <Badge className="bg-green-100 text-green-800">Activé</Badge>
                          ) : (
                            <Badge variant="secondary">Désactivé</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {check.lastResult && getStatusIcon(check.lastResult)}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => runCheckMutation.mutate(check.id)}
                            disabled={runCheckMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Tester
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>Intervalle: {Math.round(check.interval / 1000)}s</div>
                        <div>Timeout: {Math.round(check.timeout / 1000)}s</div>
                        {check.lastRun && (
                          <div>Dernière exécution: {new Date(check.lastRun).toLocaleString()}</div>
                        )}
                        {check.lastError && (
                          <div className="text-red-600">Erreur: {check.lastError}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyse */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Statistiques (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsResponse?.stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {statsResponse.stats.total}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total erreurs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {statsResponse.stats.resolved}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Résolues</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {statsResponse.stats.active}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Actives</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {statsResponse.stats.bySeverity.critical || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Critiques</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucune donnée d'analyse disponible
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Répartition par sévérité */}
              <Card>
                <CardHeader>
                  <CardTitle>Par sévérité</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsResponse?.stats?.bySeverity && (
                    <div className="space-y-3">
                      {Object.entries(statsResponse.stats.bySeverity).map(([severity, count]) => (
                        <div key={severity} className="flex items-center justify-between">
                          <Badge className={getSeverityColor(severity)}>
                            {severity}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Répartition par catégorie */}
              <Card>
                <CardHeader>
                  <CardTitle>Par catégorie</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsResponse?.stats?.byCategory && (
                    <div className="space-y-3">
                      {Object.entries(statsResponse.stats.byCategory).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <Badge variant="outline">{category}</Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}