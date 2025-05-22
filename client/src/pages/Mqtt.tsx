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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MqttConfig, MqttStatus, MqttTopic } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Plus, 
  Trash2, 
  Send,
  Bell,
  Eye,
  Filter,
  Download,
  Pause,
  Play,
  MessageSquare,
  Settings,
  Activity
} from 'lucide-react';

export default function Mqtt() {
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [newTopicQos, setNewTopicQos] = useState<string>("0");
  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState<any[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<any[]>([]);
  const [messageFilter, setMessageFilter] = useState('');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [publishTopic, setPublishTopic] = useState('');
  const [publishMessage, setPublishMessage] = useState('');
  const [publishQos, setPublishQos] = useState('0');
  const [publishRetain, setPublishRetain] = useState(false);
  const { toast } = useToast();

  // Fetch MQTT status
  const { data: mqttStatus, isLoading: loadingStatus, refetch: refetchStatus } = useQuery<MqttStatus>({
    queryKey: ['/api/mqtt/status'],
  });

  // Fetch MQTT config
  const { data: mqttConfig, isLoading: loadingConfig } = useQuery<MqttConfig>({
    queryKey: ['/api/mqtt/config'],
  });

  // Fetch MQTT topics
  const { data: mqttTopics, isLoading: loadingTopics, refetch: refetchTopics } = useQuery<MqttTopic[]>({
    queryKey: ['/api/mqtt/topics'],
  });

  // Mutations pour la gestion des topics
  const subscribeMutation = useMutation({
    mutationFn: async ({ topic, qos }: { topic: string; qos: number }) => {
      return apiRequest('POST', '/api/mqtt/subscribe', { topic, qos });
    },
    onSuccess: () => {
      toast({
        title: "Abonnement réussi",
        description: "Topic ajouté avec succès"
      });
      refetchTopics();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de s'abonner au topic",
        variant: "destructive"
      });
    }
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (topic: string) => {
      return apiRequest('POST', '/api/mqtt/unsubscribe', { topic });
    },
    onSuccess: () => {
      toast({
        title: "Désabonnement réussi",
        description: "Topic supprimé avec succès"
      });
      refetchTopics();
    }
  });

  const publishMutation = useMutation({
    mutationFn: async ({ topic, message, qos, retain }: { topic: string; message: string; qos: number; retain: boolean }) => {
      return apiRequest('POST', '/api/mqtt/publish', { topic, message, qos, retain });
    },
    onSuccess: () => {
      toast({
        title: "Message publié",
        description: "Message envoyé avec succès"
      });
      setPublishMessage('');
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de publier le message",
        variant: "destructive"
      });
    }
  });

  // Filtrage des messages
  useEffect(() => {
    if (messageFilter.trim() === '') {
      setFilteredMessages(messages);
    } else {
      const filtered = messages.filter(msg => 
        msg.topic.toLowerCase().includes(messageFilter.toLowerCase()) ||
        msg.payload.toLowerCase().includes(messageFilter.toLowerCase())
      );
      setFilteredMessages(filtered);
    }
  }, [messages, messageFilter]);

  // Simulation de messages en temps réel (à remplacer par WebSocket)
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      if (subscriptions.length > 0) {
        const randomTopic = subscriptions[Math.floor(Math.random() * subscriptions.length)];
        const newMessage = {
          id: Date.now(),
          topic: randomTopic.topic,
          payload: JSON.stringify({
            temperature: (20 + Math.random() * 10).toFixed(1),
            humidity: (40 + Math.random() * 30).toFixed(1),
            timestamp: new Date().toISOString()
          }),
          qos: randomTopic.qos,
          retain: false,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [newMessage, ...prev.slice(0, 99)]); // Garder seulement 100 messages
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isMonitoring, subscriptions]);

  // Fonctions utilitaires
  const handleSubscribe = () => {
    if (!newTopic.trim()) return;
    
    const qos = parseInt(newTopicQos);
    subscribeMutation.mutate({ topic: newTopic.trim(), qos });
    
    // Ajouter à la liste locale des abonnements
    setSubscriptions(prev => [...prev, { 
      topic: newTopic.trim(), 
      qos, 
      subscribed: true,
      messageCount: 0
    }]);
    
    setNewTopic('');
  };

  const handleUnsubscribe = (topic: string) => {
    unsubscribeMutation.mutate(topic);
    setSubscriptions(prev => prev.filter(sub => sub.topic !== topic));
  };

  const handlePublish = () => {
    if (!publishTopic.trim() || !publishMessage.trim()) return;
    
    publishMutation.mutate({
      topic: publishTopic.trim(),
      message: publishMessage.trim(),
      qos: parseInt(publishQos),
      retain: publishRetain
    });
  };

  const exportMessages = () => {
    const dataStr = JSON.stringify(filteredMessages, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `mqtt-messages-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const clearMessages = () => {
    setMessages([]);
    toast({
      title: "Messages effacés",
      description: "L'historique des messages a été vidé"
    });
  };

  const handleSaveConfig = async () => {
    if (!mqttConfig) return;

    try {
      await apiRequest('PUT', '/api/mqtt/config', mqttConfig);
      
      toast({
        title: 'Configuration sauvegardée',
        description: 'Les paramètres MQTT ont été mis à jour',
      });
      
      refetchStatus();
    } catch (error) {
      toast({
        title: 'Erreur de sauvegarde',
        description: error instanceof Error ? error.message : 'Impossible de sauvegarder la configuration',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">MQTT - Gestion des Topics</h1>
        <div className="flex items-center space-x-2">
          <Badge variant={mqttStatus?.connected ? "default" : "destructive"}>
            {mqttStatus?.connected ? "Connecté" : "Déconnecté"}
          </Badge>
          <Button onClick={() => refetchStatus()} size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity size={16} />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <Bell size={16} />
            Abonnements
          </TabsTrigger>
          <TabsTrigger value="publish" className="flex items-center gap-2">
            <Send size={16} />
            Publication
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <MessageSquare size={16} />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings size={16} />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Connexion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${mqttStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">{mqttStatus?.connected ? 'En ligne' : 'Hors ligne'}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Messages reçus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mqttStatus?.messagesReceived || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Messages publiés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mqttStatus?.messagesPublished || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Abonnements actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subscriptions.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Abonnements récents</CardTitle>
              <CardDescription>Derniers topics configurés</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length > 0 ? (
                <div className="space-y-2">
                  {subscriptions.slice(0, 5).map((sub, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Bell size={16} className="text-blue-500" />
                        <span className="font-medium">{sub.topic}</span>
                        <Badge variant="outline">QoS {sub.qos}</Badge>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setActiveTab('monitor')}
                      >
                        <Eye size={14} className="mr-1" />
                        Surveiller
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Aucun abonnement configuré
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestion des abonnements */}
        <TabsContent value="topics">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nouvel abonnement</CardTitle>
                <CardDescription>S'abonner à un topic MQTT pour recevoir des messages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input 
                    placeholder="Topic (ex: sensors/+/temperature)" 
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={newTopicQos} onValueChange={setNewTopicQos}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">QoS 0</SelectItem>
                      <SelectItem value="1">QoS 1</SelectItem>
                      <SelectItem value="2">QoS 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleSubscribe}
                    disabled={!newTopic.trim() || subscribeMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    S'abonner
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Abonnements actifs</CardTitle>
                <CardDescription>Topics auxquels vous êtes abonnés</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptions.length > 0 ? (
                  <div className="space-y-3">
                    {subscriptions.map((sub, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Bell size={16} className="text-green-500" />
                          <div>
                            <div className="font-medium">{sub.topic}</div>
                            <div className="text-sm text-gray-500">QoS {sub.qos}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{sub.messageCount || 0} msg</Badge>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleUnsubscribe(sub.topic)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucun abonnement actif
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Publication de messages */}
        <TabsContent value="publish">
          <Card>
            <CardHeader>
              <CardTitle>Publier un message</CardTitle>
              <CardDescription>Envoyer un message vers un topic MQTT</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Topic de destination</Label>
                    <Input 
                      placeholder="sensors/living_room/temperature"
                      value={publishTopic}
                      onChange={(e) => setPublishTopic(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Qualité de service (QoS)</Label>
                    <Select value={publishQos} onValueChange={setPublishQos}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">QoS 0 - Au maximum une fois</SelectItem>
                        <SelectItem value="1">QoS 1 - Au moins une fois</SelectItem>
                        <SelectItem value="2">QoS 2 - Exactement une fois</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea 
                    placeholder='{"temperature": 23.5, "humidity": 45}'
                    value={publishMessage}
                    onChange={(e) => setPublishMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={publishRetain}
                    onCheckedChange={setPublishRetain}
                  />
                  <Label>Message persistant (retain)</Label>
                </div>
                
                <Button 
                  onClick={handlePublish}
                  disabled={!publishTopic.trim() || !publishMessage.trim() || publishMutation.isPending}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {publishMutation.isPending ? 'Publication...' : 'Publier le message'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring des messages */}
        <TabsContent value="monitor">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Surveillance des messages</span>
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      variant={isMonitoring ? "destructive" : "default"}
                      onClick={() => setIsMonitoring(!isMonitoring)}
                    >
                      {isMonitoring ? <Pause size={14} /> : <Play size={14} />}
                      {isMonitoring ? 'Arrêter' : 'Démarrer'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportMessages}>
                      <Download size={14} className="mr-1" />
                      Exporter
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearMessages}>
                      <Trash2 size={14} className="mr-1" />
                      Vider
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {filteredMessages.length} message(s) affiché(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Filter size={16} />
                    <Input 
                      placeholder="Filtrer par topic ou contenu..."
                      value={messageFilter}
                      onChange={(e) => setMessageFilter(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  
                  <ScrollArea className="h-96 border rounded-lg">
                    <div className="p-4 space-y-3">
                      {filteredMessages.length > 0 ? (
                        filteredMessages.map((message) => (
                          <div key={message.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{message.topic}</Badge>
                              <div className="text-xs text-gray-500">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded p-2 text-sm font-mono">
                              {message.payload}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>QoS: {message.qos}</span>
                              {message.retain && <Badge variant="secondary">Retain</Badge>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {isMonitoring ? 'En attente de messages...' : 'Démarrez la surveillance pour voir les messages'}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configuration */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du broker MQTT</CardTitle>
              <CardDescription>Paramètres de connexion au serveur MQTT</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConfig ? (
                <div>Chargement...</div>
              ) : mqttConfig ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="host">Serveur MQTT</Label>
                      <Input 
                        id="host"
                        value={mqttConfig.host || ''} 
                        onChange={(e) => queryClient.setQueryData(['/api/mqtt/config'], { ...mqttConfig, host: e.target.value })}
                        placeholder="localhost ou broker.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="port">Port</Label>
                      <Input 
                        id="port"
                        type="number" 
                        value={mqttConfig.port || ''} 
                        onChange={(e) => queryClient.setQueryData(['/api/mqtt/config'], { ...mqttConfig, port: parseInt(e.target.value) })}
                        placeholder="1883"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Nom d'utilisateur</Label>
                      <Input 
                        id="username"
                        value={mqttConfig.username || ''} 
                        onChange={(e) => queryClient.setQueryData(['/api/mqtt/config'], { ...mqttConfig, username: e.target.value })}
                        placeholder="Optionnel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <Input 
                        id="password"
                        type="password" 
                        value={mqttConfig.password || ''} 
                        onChange={(e) => queryClient.setQueryData(['/api/mqtt/config'], { ...mqttConfig, password: e.target.value })}
                        placeholder="Optionnel"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveConfig} className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Sauvegarder la configuration
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Impossible de charger la configuration MQTT
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}