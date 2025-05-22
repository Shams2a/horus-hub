import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { queryClient, apiRequest } from '../lib/queryClient';
import { 
  Wifi, 
  Cloud, 
  HardDrive, 
  RefreshCw, 
  Settings, 
  Play, 
  Square, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  Shield,
  Wrench
} from 'lucide-react';
import { toast } from '../hooks/use-toast';

interface AdapterStatus {
  protocol: string;
  connected: boolean;
  status: 'online' | 'offline' | 'error' | 'connecting';
  statistics: {
    messagesReceived: number;
    messagesPublished: number;
    errors: number;
    uptime: string;
    lastActivity: string;
  };
  config: Record<string, any>;
  diagnostics: {
    health: 'good' | 'warning' | 'error';
    issues: string[];
    suggestions: string[];
  };
}

const AdapterManagement = () => {
  const [selectedAdapter, setSelectedAdapter] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [detectionResults, setDetectionResults] = useState<any>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Charger le statut des adaptateurs réels uniquement
  const { data: adapters = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/adapters/real-status'],
    queryFn: async () => {
      const adaptersFound = [];
      
      // Tenter de récupérer le statut Zigbee
      try {
        const zigbeeResponse = await fetch('/api/zigbee/status');
        if (zigbeeResponse.ok) {
          const zigbeeStatus = await zigbeeResponse.json();
          adaptersFound.push({
            protocol: 'zigbee',
            name: 'Adaptateur Zigbee',
            icon: Zap,
            connected: zigbeeStatus.connected || false,
            status: zigbeeStatus.connected ? 'online' : 'offline',
            statistics: {
              messagesReceived: zigbeeStatus.messagesReceived || 0,
              messagesPublished: zigbeeStatus.messagesPublished || 0,
              errors: zigbeeStatus.errors || 0,
              uptime: zigbeeStatus.uptime || 'N/A',
              lastActivity: zigbeeStatus.lastActivity || 'Jamais'
            },
            config: zigbeeStatus,
            diagnostics: {
              health: zigbeeStatus.connected ? 'good' : 'error',
              issues: zigbeeStatus.connected ? [] : ['Adaptateur Zigbee déconnecté'],
              suggestions: zigbeeStatus.connected ? [] : ['Vérifiez la connexion USB de l\'adaptateur Zigbee']
            }
          });
        }
      } catch (error) {
        console.log('Adaptateur Zigbee non détecté');
      }

      // Tenter de récupérer le statut WiFi
      try {
        const wifiResponse = await fetch('/api/wifi/status');
        if (wifiResponse.ok) {
          const wifiStatus = await wifiResponse.json();
          adaptersFound.push({
            protocol: 'wifi',
            name: 'Adaptateur WiFi',
            icon: Wifi,
            connected: wifiStatus.connected || false,
            status: wifiStatus.connected ? 'online' : 'offline',
            statistics: {
              messagesReceived: wifiStatus.devicesScanned || 0,
              messagesPublished: wifiStatus.commandsSent || 0,
              errors: wifiStatus.errors || 0,
              uptime: wifiStatus.uptime || 'N/A',
              lastActivity: wifiStatus.lastScan || 'Jamais'
            },
            config: wifiStatus,
            diagnostics: {
              health: wifiStatus.connected ? 'good' : 'warning',
              issues: wifiStatus.connected ? [] : ['Scanner WiFi inactif'],
              suggestions: wifiStatus.connected ? [] : ['Vérifiez la connectivité réseau WiFi']
            }
          });
        }
      } catch (error) {
        console.log('Adaptateur WiFi non détecté');
      }

      // Tenter de récupérer le statut MQTT
      try {
        const mqttResponse = await fetch('/api/mqtt/status');
        if (mqttResponse.ok) {
          const mqttStatus = await mqttResponse.json();
          adaptersFound.push({
            protocol: 'mqtt',
            name: 'Broker MQTT',
            icon: Cloud,
            connected: mqttStatus.connected || false,
            status: mqttStatus.connected ? 'online' : 'offline',
            statistics: {
              messagesReceived: mqttStatus.messagesReceived || 0,
              messagesPublished: mqttStatus.messagesPublished || 0,
              errors: mqttStatus.errors || 0,
              uptime: mqttStatus.uptime || 'N/A',
              lastActivity: mqttStatus.lastMessage || 'Jamais'
            },
            config: mqttStatus,
            diagnostics: {
              health: mqttStatus.connected ? 'good' : 'error',
              issues: mqttStatus.connected ? [] : ['Connexion MQTT fermée'],
              suggestions: mqttStatus.connected ? [] : ['Vérifiez les paramètres de connexion MQTT']
            }
          });
        }
      } catch (error) {
        console.log('Broker MQTT non détecté');
      }

      return adaptersFound;
    },
    refetchInterval: 5000, // Actualiser toutes les 5 secondes
  });

  // Charger les adaptateurs recommandés
  const { data: recommendedAdapters = [] } = useQuery({
    queryKey: ['/api/adapters/recommended'],
    queryFn: async () => {
      const response = await fetch('/api/adapters/recommended');
      if (!response.ok) return [];
      const data = await response.json();
      return data.adapters || [];
    }
  });

  // Lancer la détection automatique
  const runDetection = async () => {
    setIsDetecting(true);
    try {
      const response = await fetch('/api/adapters/detect', { method: 'POST' });
      if (response.ok) {
        const results = await response.json();
        setDetectionResults(results);
        toast({
          title: "Détection terminée",
          description: `${results.totalFound} adaptateur(s) détecté(s)`
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de détecter les adaptateurs",
        variant: "destructive"
      });
    } finally {
      setIsDetecting(false);
    }
  };

  // Mutations pour les actions sur les adaptateurs
  const restartMutation = useMutation({
    mutationFn: async (protocol: string) => {
      await apiRequest('POST', `/api/adapters/${protocol}/restart`);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Adaptateur redémarré avec succès"
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de redémarrer l'adaptateur",
        variant: "destructive"
      });
    }
  });

  const testMutation = useMutation({
    mutationFn: async (protocol: string) => {
      await apiRequest('POST', `/api/adapters/${protocol}/test`);
    },
    onSuccess: () => {
      toast({
        title: "Test réussi",
        description: "L'adaptateur fonctionne correctement"
      });
    },
    onError: () => {
      toast({
        title: "Test échoué",
        description: "L'adaptateur ne répond pas correctement",
        variant: "destructive"
      });
    }
  });

  const resetMutation = useMutation({
    mutationFn: async (protocol: string) => {
      await apiRequest('POST', `/api/adapters/${protocol}/reset`);
    },
    onSuccess: () => {
      toast({
        title: "Réinitialisation effectuée",
        description: "L'adaptateur a été réinitialisé"
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser l'adaptateur",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500 text-white"><CheckCircle size={12} className="mr-1" />En ligne</Badge>;
      case 'offline':
        return <Badge variant="secondary"><XCircle size={12} className="mr-1" />Hors ligne</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle size={12} className="mr-1" />Erreur</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500 text-white"><RefreshCw size={12} className="mr-1" />Connexion...</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'good':
        return <Badge className="bg-green-500 text-white">Excellent</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white">Attention</Badge>;
      case 'error':
        return <Badge variant="destructive">Critique</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {adapters.map((adapter: any) => {
        const IconComponent = adapter.icon;
        return (
          <Card key={adapter.protocol} className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedAdapter(adapter.protocol)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <IconComponent size={24} />
                  <CardTitle className="text-lg">{adapter.name}</CardTitle>
                </div>
                {getStatusBadge(adapter.status)}
              </div>
              <CardDescription>
                Protocole {adapter.protocol.toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Messages reçus:</span>
                  <span className="font-medium">{adapter.statistics.messagesReceived}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Messages envoyés:</span>
                  <span className="font-medium">{adapter.statistics.messagesPublished}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Erreurs:</span>
                  <span className={`font-medium ${adapter.statistics.errors > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {adapter.statistics.errors}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Temps de fonctionnement:</span>
                  <span className="font-medium">{adapter.statistics.uptime}</span>
                </div>
              </div>
              
              <div className="mt-4 flex space-x-2">
                <Button size="sm" variant="outline" 
                        onClick={(e) => { e.stopPropagation(); testMutation.mutate(adapter.protocol); }}>
                  <Activity size={14} className="mr-1" />
                  Test
                </Button>
                <Button size="sm" variant="outline"
                        onClick={(e) => { e.stopPropagation(); restartMutation.mutate(adapter.protocol); }}>
                  <RefreshCw size={14} className="mr-1" />
                  Redémarrer
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderDiagnostics = () => (
    <div className="space-y-6">
      {adapters.map((adapter: any) => (
        <Card key={adapter.protocol}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <adapter.icon size={20} />
                <span>{adapter.name}</span>
              </CardTitle>
              {getHealthBadge(adapter.diagnostics.health)}
            </div>
          </CardHeader>
          <CardContent>
            {adapter.diagnostics.issues.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">Problèmes détectés :</p>
                    <ul className="list-disc list-inside space-y-1">
                      {adapter.diagnostics.issues.map((issue: string, index: number) => (
                        <li key={index} className="text-sm">{issue}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {adapter.diagnostics.suggestions.length > 0 && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">Suggestions :</p>
                    <ul className="list-disc list-inside space-y-1">
                      {adapter.diagnostics.suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="text-sm">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-4 flex space-x-2">
              <Button size="sm" variant="outline"
                      onClick={() => testMutation.mutate(adapter.protocol)}>
                <Activity size={14} className="mr-1" />
                Diagnostic complet
              </Button>
              <Button size="sm" variant="outline"
                      onClick={() => resetMutation.mutate(adapter.protocol)}>
                <Wrench size={14} className="mr-1" />
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const selectedAdapterData = adapters.find((a: any) => a.protocol === selectedAdapter);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gestion des Adaptateurs</h1>
        <Button onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <HardDrive size={16} />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="detection" className="flex items-center gap-2">
            <Activity size={16} />
            Détection automatique
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <Shield size={16} />
            Diagnostic
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {isLoading ? (
            <div className="text-center py-10">Chargement des adaptateurs...</div>
          ) : (
            renderOverview()
          )}
        </TabsContent>

        <TabsContent value="detection">
          <div className="space-y-6">
            {/* Section de lancement de détection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity size={20} />
                  <span>Détection Automatique des Adaptateurs</span>
                </CardTitle>
                <CardDescription>
                  Scanne automatiquement votre système pour détecter les adaptateurs Zigbee connectés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Button 
                    onClick={runDetection} 
                    disabled={isDetecting}
                    className="flex items-center space-x-2"
                  >
                    <Activity size={16} className={isDetecting ? 'animate-spin' : ''} />
                    <span>{isDetecting ? 'Détection en cours...' : 'Lancer la détection'}</span>
                  </Button>
                  <div className="text-sm text-gray-600">
                    Détection en 3 phases : matériel → communication → heuristiques
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Résultats de détection */}
            {detectionResults && (
              <Card>
                <CardHeader>
                  <CardTitle>Résultats de la Détection</CardTitle>
                  <CardDescription>
                    {detectionResults.totalFound} adaptateur(s) détecté(s) - 
                    Confiance élevée: {detectionResults.highConfidence}, 
                    Moyenne: {detectionResults.mediumConfidence}, 
                    Faible: {detectionResults.lowConfidence}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {detectionResults.adapters.map((result: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge className={
                              result.confidence === 'high' ? 'bg-green-500' :
                              result.confidence === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
                            }>
                              Phase {result.phase} - {result.confidence}
                            </Badge>
                            {result.adapter && <span className="font-semibold">{result.adapter.name}</span>}
                          </div>
                        </div>
                        
                        {result.adapter && (
                          <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                            <div><strong>Fabricant:</strong> {result.adapter.manufacturer}</div>
                            <div><strong>Chipset:</strong> {result.adapter.chipset}</div>
                            <div><strong>Driver:</strong> {result.adapter.driver}</div>
                            <div><strong>Fiabilité:</strong> 
                              <Badge variant={result.adapter.reliability === 'excellent' ? 'default' : 'secondary'} className="ml-2">
                                {result.adapter.reliability}
                              </Badge>
                            </div>
                          </div>
                        )}
                        
                        {result.devicePath && (
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Chemin:</strong> {result.devicePath}
                          </div>
                        )}
                        
                        {result.suggestions.length > 0 && (
                          <div className="mb-2">
                            <div className="text-sm font-medium text-green-700 mb-1">Suggestions:</div>
                            <ul className="text-sm text-green-600 list-disc list-inside">
                              {result.suggestions.map((suggestion: string, i: number) => (
                                <li key={i}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {result.issues.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-red-700 mb-1">Problèmes:</div>
                            <ul className="text-sm text-red-600 list-disc list-inside">
                              {result.issues.map((issue: string, i: number) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Adaptateurs recommandés */}
            {recommendedAdapters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Adaptateurs Recommandés</CardTitle>
                  <CardDescription>
                    Adaptateurs Zigbee avec excellente fiabilité et support communautaire
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendedAdapters.slice(0, 4).map((adapter: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{adapter.name}</h4>
                          <Badge className="bg-green-500">{adapter.reliability}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div><strong>Fabricant:</strong> {adapter.manufacturer}</div>
                          <div><strong>Chipset:</strong> {adapter.chipset}</div>
                          <div><strong>VID/PID:</strong> {adapter.vid}:{adapter.pid}</div>
                        </div>
                        {adapter.notes && (
                          <div className="text-xs text-gray-500 mt-2">{adapter.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="diagnostics">
          {isLoading ? (
            <div className="text-center py-10">Chargement des diagnostics...</div>
          ) : (
            renderDiagnostics()
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogue de détails d'adaptateur */}
      <Dialog open={!!selectedAdapter} onOpenChange={() => setSelectedAdapter(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAdapterData && (
                <div className="flex items-center space-x-2">
                  <selectedAdapterData.icon size={20} />
                  <span>{selectedAdapterData.name}</span>
                  {getStatusBadge(selectedAdapterData.status)}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAdapterData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Statistiques détaillées</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Messages reçus:</span>
                      <span className="font-medium">{selectedAdapterData.statistics.messagesReceived}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Messages envoyés:</span>
                      <span className="font-medium">{selectedAdapterData.statistics.messagesPublished}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Erreurs:</span>
                      <span className="font-medium text-red-500">{selectedAdapterData.statistics.errors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dernière activité:</span>
                      <span className="font-medium">{selectedAdapterData.statistics.lastActivity}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Actions</h4>
                  <div className="space-y-2">
                    <Button className="w-full" size="sm" variant="outline"
                            onClick={() => testMutation.mutate(selectedAdapterData.protocol)}>
                      <Activity size={14} className="mr-2" />
                      Tester la connexion
                    </Button>
                    <Button className="w-full" size="sm" variant="outline"
                            onClick={() => restartMutation.mutate(selectedAdapterData.protocol)}>
                      <RefreshCw size={14} className="mr-2" />
                      Redémarrer l'adaptateur
                    </Button>
                    <Button className="w-full" size="sm" variant="destructive"
                            onClick={() => resetMutation.mutate(selectedAdapterData.protocol)}>
                      <Wrench size={14} className="mr-2" />
                      Réinitialiser complètement
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdapterManagement;