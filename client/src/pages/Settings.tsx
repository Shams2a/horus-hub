import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Download,
  Upload,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Zap,
  History,
  Shield,
  Play,
  Pause,
  Settings as SettingsIcon
} from 'lucide-react';

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

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [generalSettings, setGeneralSettings] = useState({
    systemName: 'Horus Hub',
    location: 'Home',
    timezone: 'UTC',
    language: 'English',
    webInterfacePort: 8001,
    autoUpdate: true
  });
  
  const [networkSettings, setNetworkSettings] = useState({
    ipAddress: '',
    networkMode: 'DHCP',
    hostname: 'horushub'
  });
  
  const [zigbeeSettings, setZigbeeSettings] = useState({
    serialPort: '/dev/ttyUSB0',
    baudRate: 115200,
    panId: 6754,
    channel: 11
  });

  const [mqttSettings, setMqttSettings] = useState({
    brokerUrl: 'mqtt://localhost:1883',
    username: '',
    password: '',
    clientId: 'horus-hub'
  });

  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const { toast } = useToast();

  // Chargement des mises à jour disponibles
  const { data: updatesResponse, isLoading: loadingUpdates, refetch: refetchUpdates } = useQuery({
    queryKey: ['/api/updates/available'],
    refetchInterval: 30000
  });

  const availableUpdates = updatesResponse?.updates || [];

  // Chargement du statut de mise à jour
  const { data: updateStatusResponse, isLoading: loadingStatus } = useQuery({
    queryKey: ['/api/updates/status'],
    refetchInterval: 2000
  });

  const updateStatus = updateStatusResponse?.status;

  // Chargement de l'historique
  const { data: updateHistoryResponse, isLoading: loadingHistory } = useQuery({
    queryKey: ['/api/updates/history']
  });

  const updateHistory = updateHistoryResponse?.history || [];

  // Mutation pour vérifier les mises à jour
  const checkUpdatesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/updates/check');
    },
    onSuccess: () => {
      toast({
        title: "Vérification terminée",
        description: "Mises à jour vérifiées avec succès"
      });
      refetchUpdates();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de vérifier les mises à jour",
        variant: "destructive"
      });
    }
  });

  // Mutation pour installer une mise à jour
  const updateLibraryMutation = useMutation({
    mutationFn: async (libraryName: string) => {
      return apiRequest('POST', `/api/updates/library/${libraryName}`);
    },
    onSuccess: (data, libraryName) => {
      toast({
        title: "Mise à jour réussie",
        description: `${libraryName} a été mis à jour avec succès`
      });
      refetchUpdates();
    },
    onError: (error, libraryName) => {
      toast({
        title: "Erreur de mise à jour",
        description: `Impossible de mettre à jour ${libraryName}`,
        variant: "destructive"
      });
    }
  });

  const compatibleUpdates = availableUpdates.filter((lib: LibraryVersion) => lib.compatible);
  const incompatibleUpdates = availableUpdates.filter((lib: LibraryVersion) => !lib.compatible);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking': return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'downloading': return <Download className="h-4 w-4 text-blue-500" />;
      case 'installing': return <Package className="h-4 w-4 text-orange-500" />;
      case 'testing': return <Shield className="h-4 w-4 text-purple-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rolling_back': return <RotateCcw className="h-4 w-4 animate-spin text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checking':
      case 'downloading': return 'bg-blue-500';
      case 'installing': return 'bg-orange-500';
      case 'testing': return 'bg-purple-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'rolling_back': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const handleSaveGeneral = () => {
    toast({
      title: "Paramètres sauvegardés",
      description: "Les paramètres généraux ont été sauvegardés"
    });
  };

  const handleSaveNetwork = () => {
    toast({
      title: "Paramètres réseau sauvegardés",
      description: "Les paramètres réseau ont été sauvegardés"
    });
  };

  const handleSaveZigbee = () => {
    toast({
      title: "Paramètres Zigbee sauvegardés",
      description: "Les paramètres Zigbee ont été sauvegardés"
    });
  };

  const handleSaveMqtt = () => {
    toast({
      title: "Paramètres MQTT sauvegardés",
      description: "Les paramètres MQTT ont été sauvegardés"
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configuration du système et gestion des mises à jour
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="network">Réseau</TabsTrigger>
          <TabsTrigger value="protocols">Protocoles</TabsTrigger>
          <TabsTrigger value="updates">Mises à jour</TabsTrigger>
          <TabsTrigger value="system">Système</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Paramètres généraux
              </CardTitle>
              <CardDescription>
                Configuration de base du système Horus Hub
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="systemName">Nom du système</Label>
                  <Input 
                    id="systemName" 
                    value={generalSettings.systemName} 
                    onChange={(e) => setGeneralSettings({...generalSettings, systemName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Emplacement</Label>
                  <Input 
                    id="location" 
                    value={generalSettings.location} 
                    onChange={(e) => setGeneralSettings({...generalSettings, location: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select 
                    value={generalSettings.timezone} 
                    onValueChange={(value) => setGeneralSettings({...generalSettings, timezone: value})}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webPort">Port interface web</Label>
                  <Input 
                    id="webPort" 
                    type="number" 
                    value={generalSettings.webInterfacePort} 
                    onChange={(e) => setGeneralSettings({...generalSettings, webInterfacePort: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <Button onClick={handleSaveGeneral}>Sauvegarder</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Settings Tab */}
        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle>Configuration réseau</CardTitle>
              <CardDescription>
                Paramètres de connectivité réseau
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="networkMode">Mode réseau</Label>
                  <Select 
                    value={networkSettings.networkMode} 
                    onValueChange={(value) => setNetworkSettings({...networkSettings, networkMode: value})}
                  >
                    <SelectTrigger id="networkMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DHCP">DHCP</SelectItem>
                      <SelectItem value="Static IP">IP Statique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hostname">Nom d'hôte</Label>
                  <Input 
                    id="hostname" 
                    value={networkSettings.hostname} 
                    onChange={(e) => setNetworkSettings({...networkSettings, hostname: e.target.value})}
                  />
                </div>
                {networkSettings.networkMode === 'Static IP' && (
                  <div className="space-y-2">
                    <Label htmlFor="ipAddress">Adresse IP</Label>
                    <Input 
                      id="ipAddress" 
                      value={networkSettings.ipAddress} 
                      onChange={(e) => setNetworkSettings({...networkSettings, ipAddress: e.target.value})}
                      placeholder="192.168.1.100"
                    />
                  </div>
                )}
              </div>
              <Button onClick={handleSaveNetwork}>Sauvegarder</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocols Settings Tab */}
        <TabsContent value="protocols">
          <div className="space-y-6">
            {/* Zigbee Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration Zigbee</CardTitle>
                <CardDescription>
                  Paramètres de l'adaptateur Zigbee
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serialPort">Port série</Label>
                    <Input 
                      id="serialPort" 
                      value={zigbeeSettings.serialPort} 
                      onChange={(e) => setZigbeeSettings({...zigbeeSettings, serialPort: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baudRate">Vitesse de transmission</Label>
                    <Select 
                      value={zigbeeSettings.baudRate.toString()} 
                      onValueChange={(value) => setZigbeeSettings({...zigbeeSettings, baudRate: parseInt(value)})}
                    >
                      <SelectTrigger id="baudRate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9600">9600</SelectItem>
                        <SelectItem value="115200">115200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panId">PAN ID</Label>
                    <Input 
                      id="panId" 
                      type="number" 
                      value={zigbeeSettings.panId} 
                      onChange={(e) => setZigbeeSettings({...zigbeeSettings, panId: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel">Canal</Label>
                    <Input 
                      id="channel" 
                      type="number" 
                      value={zigbeeSettings.channel} 
                      onChange={(e) => setZigbeeSettings({...zigbeeSettings, channel: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <Button onClick={handleSaveZigbee}>Sauvegarder</Button>
              </CardContent>
            </Card>

            {/* MQTT Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration MQTT</CardTitle>
                <CardDescription>
                  Paramètres du broker MQTT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brokerUrl">URL du broker</Label>
                    <Input 
                      id="brokerUrl" 
                      value={mqttSettings.brokerUrl} 
                      onChange={(e) => setMqttSettings({...mqttSettings, brokerUrl: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">ID Client</Label>
                    <Input 
                      id="clientId" 
                      value={mqttSettings.clientId} 
                      onChange={(e) => setMqttSettings({...mqttSettings, clientId: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Nom d'utilisateur</Label>
                    <Input 
                      id="username" 
                      value={mqttSettings.username} 
                      onChange={(e) => setMqttSettings({...mqttSettings, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={mqttSettings.password} 
                      onChange={(e) => setMqttSettings({...mqttSettings, password: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={handleSaveMqtt}>Sauvegarder</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates">
          <div className="space-y-6">
            {/* Status de mise à jour en cours */}
            {updateStatus?.inProgress && (
              <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    {getStatusIcon(updateStatus.status)}
                    Mise à jour en cours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {updateStatus.library} vers {updateStatus.version}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {updateStatus.progress}%
                    </span>
                  </div>
                  <Progress value={updateStatus.progress} className="h-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Statut : {updateStatus.status}
                  </p>
                  {updateStatus.error && (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-red-800 dark:text-red-200">
                        {updateStatus.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Vue d'ensemble */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Vue d'ensemble des mises à jour
                </CardTitle>
                <CardDescription>
                  État des bibliothèques IoT surveillées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {availableUpdates.length - incompatibleUpdates.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">À jour</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {compatibleUpdates.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Mises à jour disponibles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {incompatibleUpdates.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Incompatibles</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button 
                    onClick={() => checkUpdatesMutation.mutate()}
                    disabled={checkUpdatesMutation.isPending}
                    variant="outline"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${checkUpdatesMutation.isPending ? 'animate-spin' : ''}`} />
                    Vérifier les mises à jour
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mises à jour disponibles */}
            {compatibleUpdates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-green-600" />
                    Mises à jour disponibles ({compatibleUpdates.length})
                  </CardTitle>
                  <CardDescription>
                    Bibliothèques compatibles prêtes à être mises à jour
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {compatibleUpdates.map((library: LibraryVersion) => (
                        <div key={library.name} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{library.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {library.current} → {library.latest}
                            </div>
                            {library.releaseDate && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                Publié le {new Date(library.releaseDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Compatible</Badge>
                            <Button 
                              size="sm" 
                              onClick={() => updateLibraryMutation.mutate(library.name)}
                              disabled={updateLibraryMutation.isPending || updateStatus?.inProgress}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Installer
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Mises à jour incompatibles */}
            {incompatibleUpdates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Mises à jour incompatibles ({incompatibleUpdates.length})
                  </CardTitle>
                  <CardDescription>
                    Ces mises à jour peuvent causer des problèmes de compatibilité
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <div className="space-y-4">
                      {incompatibleUpdates.map((library: LibraryVersion) => (
                        <div key={library.name} className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                          <div className="flex-1">
                            <div className="font-medium">{library.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {library.current} → {library.latest}
                            </div>
                            {library.breakingChanges && (
                              <div className="text-xs text-orange-600 dark:text-orange-400">
                                Changements incompatibles détectés
                              </div>
                            )}
                          </div>
                          <Badge variant="destructive">Incompatible</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Historique */}
            {updateHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historique des mises à jour
                  </CardTitle>
                  <CardDescription>
                    Dernières installations et mises à jour
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {updateHistory.slice(0, 10).map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 text-sm border-b border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2">
                            {entry.success ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span>{entry.library} {entry.version}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>Informations système</CardTitle>
              <CardDescription>
                État et performances du système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Version du système</Label>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Horus Hub v1.0.0</div>
                  </div>
                  <div>
                    <Label>Temps de fonctionnement</Label>
                    <div className="text-sm text-gray-600 dark:text-gray-400">2h 15m</div>
                  </div>
                  <div>
                    <Label>Utilisation mémoire</Label>
                    <div className="text-sm text-gray-600 dark:text-gray-400">45%</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Adaptateurs actifs</Label>
                    <div className="text-sm text-gray-600 dark:text-gray-400">3/4</div>
                  </div>
                  <div>
                    <Label>Appareils connectés</Label>
                    <div className="text-sm text-gray-600 dark:text-gray-400">12</div>
                  </div>
                  <div>
                    <Label>État de la base de données</Label>
                    <div className="text-sm text-green-600 dark:text-green-400">Connectée</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}