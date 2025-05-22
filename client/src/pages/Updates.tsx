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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Download,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Package,
  Zap,
  History,
  Play,
  Pause,
  RotateCcw,
  Info
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

export default function Updates() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const { toast } = useToast();

  // Chargement des mises à jour disponibles
  const { data: availableUpdates = [], isLoading: loadingUpdates, refetch: refetchUpdates } = useQuery<LibraryVersion[]>({
    queryKey: ['/api/updates/available'],
    refetchInterval: 30000 // Actualiser toutes les 30 secondes
  });

  // Chargement du statut de mise à jour
  const { data: updateStatus, isLoading: loadingStatus } = useQuery<UpdateStatus>({
    queryKey: ['/api/updates/status'],
    refetchInterval: 2000 // Actualiser toutes les 2 secondes pendant une mise à jour
  });

  // Chargement de l'historique
  const { data: updateHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['/api/updates/history']
  });

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

  // Fonction pour formater la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date inconnue';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Fonction pour obtenir la couleur du badge selon le statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checking':
        return <Badge variant="outline" className="bg-blue-50"><Clock size={12} className="mr-1" />Vérification</Badge>;
      case 'downloading':
        return <Badge variant="outline" className="bg-yellow-50"><Download size={12} className="mr-1" />Téléchargement</Badge>;
      case 'installing':
        return <Badge variant="outline" className="bg-orange-50"><Package size={12} className="mr-1" />Installation</Badge>;
      case 'testing':
        return <Badge variant="outline" className="bg-purple-50"><Zap size={12} className="mr-1" />Test</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle size={12} className="mr-1" />Terminé</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle size={12} className="mr-1" />Échec</Badge>;
      case 'rolling_back':
        return <Badge variant="outline" className="bg-red-50"><RotateCcw size={12} className="mr-1" />Rollback</Badge>;
      default:
        return <Badge variant="outline">Inactif</Badge>;
    }
  };

  const pendingUpdates = availableUpdates.filter(lib => lib.current !== lib.latest && lib.compatible);
  const incompatibleUpdates = availableUpdates.filter(lib => lib.current !== lib.latest && !lib.compatible);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gestion des Mises à Jour</h1>
        <div className="flex items-center space-x-2">
          {updateStatus?.inProgress && (
            <Badge variant="outline" className="animate-pulse">
              <RefreshCw size={14} className="mr-1 animate-spin" />
              Mise à jour en cours
            </Badge>
          )}
          <Button 
            onClick={() => checkUpdatesMutation.mutate()}
            disabled={checkUpdatesMutation.isPending}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checkUpdatesMutation.isPending ? 'animate-spin' : ''}`} />
            Vérifier
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package size={16} />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Download size={16} />
            Disponibles ({pendingUpdates.length})
          </TabsTrigger>
          <TabsTrigger value="incompatible" className="flex items-center gap-2">
            <AlertTriangle size={16} />
            Incompatibles ({incompatibleUpdates.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History size={16} />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Bibliothèques suivies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{availableUpdates.length}</div>
                <div className="text-sm text-gray-500">IoT et Zigbee</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Mises à jour disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{pendingUpdates.length}</div>
                <div className="text-sm text-gray-500">Prêtes à installer</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Incompatibilités</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{incompatibleUpdates.length}</div>
                <div className="text-sm text-gray-500">Nécessitent attention</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Statut système</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {updateStatus?.inProgress ? (
                    <>
                      <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
                      <span className="font-medium text-orange-600">En cours</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium text-green-600">Prêt</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statut de mise à jour en cours */}
          {updateStatus?.inProgress && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Mise à jour en cours</CardTitle>
                <CardDescription>
                  {updateStatus.library} - {getStatusBadge(updateStatus.status)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={updateStatus.progress} className="w-full" />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Progression: {updateStatus.progress}%</span>
                    <span>
                      Démarré: {updateStatus.startTime ? new Date(updateStatus.startTime).toLocaleTimeString() : 'Inconnu'}
                    </span>
                  </div>
                  {updateStatus.error && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{updateStatus.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aperçu des mises à jour importantes */}
          <Card>
            <CardHeader>
              <CardTitle>Mises à jour prioritaires</CardTitle>
              <CardDescription>Bibliothèques critiques avec nouvelles versions</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingUpdates.length > 0 ? (
                <div className="space-y-3">
                  {pendingUpdates.slice(0, 3).map((library) => (
                    <div key={library.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Package size={16} className="text-blue-500" />
                        <div>
                          <div className="font-medium">{library.name}</div>
                          <div className="text-sm text-gray-500">
                            {library.current} → {library.latest}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-50">Compatible</Badge>
                        <Button 
                          size="sm"
                          onClick={() => updateLibraryMutation.mutate(library.name)}
                          disabled={updateStatus?.inProgress || updateLibraryMutation.isPending}
                        >
                          <Download size={14} className="mr-1" />
                          Installer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                  <p>Toutes les bibliothèques sont à jour !</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mises à jour disponibles */}
        <TabsContent value="available">
          <div className="space-y-6">
            {pendingUpdates.length > 0 ? (
              pendingUpdates.map((library) => (
                <Card key={library.name}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Package size={20} />
                          <span>{library.name}</span>
                        </CardTitle>
                        <CardDescription>
                          Version {library.current} → {library.latest}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-500">
                          <Shield size={12} className="mr-1" />
                          Compatible
                        </Badge>
                        <Button 
                          onClick={() => updateLibraryMutation.mutate(library.name)}
                          disabled={updateStatus?.inProgress || updateLibraryMutation.isPending}
                        >
                          <Download size={16} className="mr-2" />
                          Installer
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Date de sortie:</span>
                        <div className="text-gray-600">{formatDate(library.releaseDate)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Changelog:</span>
                        <div>
                          {library.changelogUrl ? (
                            <a href={library.changelogUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                              Voir les changements
                            </a>
                          ) : (
                            <span className="text-gray-500">Non disponible</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Statut:</span>
                        <div className="text-green-600">✓ Prêt à installer</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold mb-2">Tout est à jour !</h3>
                  <p className="text-gray-500">Aucune mise à jour compatible disponible</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Mises à jour incompatibles */}
        <TabsContent value="incompatible">
          <div className="space-y-6">
            {incompatibleUpdates.length > 0 ? (
              incompatibleUpdates.map((library) => (
                <Card key={library.name}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <AlertTriangle size={20} className="text-red-500" />
                          <span>{library.name}</span>
                        </CardTitle>
                        <CardDescription>
                          Version {library.current} → {library.latest}
                        </CardDescription>
                      </div>
                      <Badge variant="destructive">
                        <XCircle size={12} className="mr-1" />
                        Incompatible
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p><strong>Problèmes de compatibilité détectés :</strong></p>
                          <ul className="list-disc list-inside space-y-1">
                            {library.breakingChanges?.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Shield size={64} className="mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold mb-2">Aucun problème de compatibilité</h3>
                  <p className="text-gray-500">Toutes les mises à jour disponibles sont compatibles</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Historique */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historique des mises à jour</CardTitle>
              <CardDescription>Journal des installations et rollbacks</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {updateHistory.length > 0 ? (
                  <div className="space-y-4">
                    {updateHistory.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <History size={16} className="text-blue-500" />
                          <div>
                            <div className="font-medium">{entry.activity}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {entry.activity.includes('success') ? 'Succès' : 
                           entry.activity.includes('failed') ? 'Échec' : 
                           entry.activity.includes('rollback') ? 'Rollback' : 'Info'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucun historique de mise à jour
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}