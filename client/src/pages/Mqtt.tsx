import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { MqttConfig, MqttStatus, MqttTopic } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';

export default function Mqtt() {
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [newTopicQos, setNewTopicQos] = useState<string>("0");
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

  const handleSaveConfig = async () => {
    if (!mqttConfig) return;

    try {
      await apiRequest('PUT', '/api/mqtt/config', mqttConfig);
      
      // Refresh status
      refetchStatus();
      
      toast({
        title: 'Configuration saved',
        description: 'MQTT broker configuration has been updated',
      });
    } catch (error) {
      toast({
        title: 'Failed to save configuration',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async () => {
    try {
      await apiRequest('POST', '/api/mqtt/test', {});
      
      toast({
        title: 'Connection test',
        description: 'Connection to MQTT broker successful',
      });
      
      // Refresh status
      refetchStatus();
    } catch (error) {
      toast({
        title: 'Connection test failed',
        description: error instanceof Error ? error.message : 'Failed to connect to MQTT broker',
        variant: 'destructive',
      });
    }
  };

  const handleReconnect = async () => {
    try {
      await apiRequest('POST', '/api/mqtt/reconnect', {});
      
      toast({
        title: 'Reconnecting',
        description: 'Attempting to reconnect to MQTT broker',
      });
      
      // Refresh status after a short delay
      setTimeout(() => refetchStatus(), 2000);
    } catch (error) {
      toast({
        title: 'Reconnection failed',
        description: error instanceof Error ? error.message : 'Failed to reconnect to MQTT broker',
        variant: 'destructive',
      });
    }
  };

  const handleAddTopic = async () => {
    if (!newTopic) {
      toast({
        title: 'Missing topic',
        description: 'Please enter a topic name',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/mqtt/topics', {
        topic: newTopic,
        qos: parseInt(newTopicQos),
      });
      
      // Reset form and refresh topics
      setNewTopic("");
      setNewTopicQos("0");
      refetchTopics();
      
      toast({
        title: 'Topic added',
        description: `Subscribed to topic: ${newTopic}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to add topic',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTopic = async (topic: string) => {
    try {
      await apiRequest('DELETE', `/api/mqtt/topics/${encodeURIComponent(topic)}`, undefined);
      
      // Refresh topics
      refetchTopics();
      
      toast({
        title: 'Topic deleted',
        description: `Unsubscribed from topic: ${topic}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to delete topic',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const updateConfigField = (field: keyof MqttConfig, value: any) => {
    if (!mqttConfig) return;
    
    const updatedConfig = {
      ...mqttConfig,
      [field]: value
    };
    
    queryClient.setQueryData(['/api/mqtt/config'], updatedConfig);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">MQTT Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Configure your MQTT broker connection for device communication</p>
      </div>
      
      {/* MQTT Status */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h4 className="text-md font-medium mb-4">Connection Status</h4>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <span className={`h-3 w-3 rounded-full mr-2 ${
                  loadingStatus ? 'bg-gray-400' : 
                  mqttStatus?.connected ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className="font-medium">
                  {loadingStatus 
                    ? 'Loading...' 
                    : mqttStatus?.connected ? 'Connected' : 'Disconnected'
                  }
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Broker: {loadingConfig 
                  ? 'Loading...' 
                  : mqttConfig 
                    ? `${mqttConfig.protocol}://${mqttConfig.host}:${mqttConfig.port}` 
                    : 'Not configured'
                }
              </p>
            </div>
            <Button variant="outline" onClick={handleReconnect}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reconnect
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Messages Published</p>
              <p className="font-medium">
                {loadingStatus ? 'Loading...' : mqttStatus?.messagesPublished || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Messages Received</p>
              <p className="font-medium">
                {loadingStatus ? 'Loading...' : mqttStatus?.messagesReceived || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last Activity</p>
              <p className="font-medium">
                {loadingStatus 
                  ? 'Loading...' 
                  : mqttStatus?.lastMessageTime 
                    ? new Date(mqttStatus.lastMessageTime).toLocaleString() 
                    : 'Never'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* MQTT Settings */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h4 className="text-md font-medium mb-4">Broker Settings</h4>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSaveConfig();
          }}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mqttProtocol">Protocol</Label>
                <Select 
                  value={mqttConfig?.protocol} 
                  onValueChange={(value) => updateConfigField('protocol', value)}
                  disabled={loadingConfig}
                >
                  <SelectTrigger id="mqttProtocol">
                    <SelectValue placeholder="Select protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mqtt">mqtt</SelectItem>
                    <SelectItem value="mqtts">mqtts</SelectItem>
                    <SelectItem value="ws">ws</SelectItem>
                    <SelectItem value="wss">wss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mqttHost">Host</Label>
                <Input 
                  id="mqttHost" 
                  value={mqttConfig?.host || ''} 
                  onChange={(e) => updateConfigField('host', e.target.value)}
                  disabled={loadingConfig}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mqttPort">Port</Label>
                <Input 
                  id="mqttPort" 
                  type="number" 
                  value={mqttConfig?.port || ''} 
                  onChange={(e) => updateConfigField('port', parseInt(e.target.value))}
                  disabled={loadingConfig}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mqttBaseTopic">Base Topic</Label>
                <Input 
                  id="mqttBaseTopic" 
                  value={mqttConfig?.baseTopic || ''} 
                  onChange={(e) => updateConfigField('baseTopic', e.target.value)}
                  disabled={loadingConfig}
                />
              </div>
            </div>
            
            <div className="mt-6">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Authentication</h5>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mqttUsername">Username</Label>
                  <Input 
                    id="mqttUsername" 
                    value={mqttConfig?.username || ''} 
                    onChange={(e) => updateConfigField('username', e.target.value)}
                    disabled={loadingConfig}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mqttPassword">Password</Label>
                  <Input 
                    id="mqttPassword" 
                    type="password" 
                    value={mqttConfig?.password || ''} 
                    onChange={(e) => updateConfigField('password', e.target.value)}
                    disabled={loadingConfig}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Advanced Options</h5>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Switch 
                    id="cleanSession" 
                    checked={mqttConfig?.cleanSession || false}
                    onCheckedChange={(checked) => updateConfigField('cleanSession', checked)}
                    disabled={loadingConfig}
                  />
                  <Label htmlFor="cleanSession" className="ml-2">Clean Session</Label>
                </div>
                <div className="flex items-center">
                  <Switch 
                    id="retainMessages" 
                    checked={mqttConfig?.retainMessages || false}
                    onCheckedChange={(checked) => updateConfigField('retainMessages', checked)}
                    disabled={loadingConfig}
                  />
                  <Label htmlFor="retainMessages" className="ml-2">Retain Messages</Label>
                </div>
                <div className="flex items-center">
                  <Switch 
                    id="persistentConnection" 
                    checked={mqttConfig?.persistentConnection || false}
                    onCheckedChange={(checked) => updateConfigField('persistentConnection', checked)}
                    disabled={loadingConfig}
                  />
                  <Label htmlFor="persistentConnection" className="ml-2">Persistent Connection</Label>
                </div>
                <div className="flex items-center">
                  <Switch 
                    id="useTls" 
                    checked={mqttConfig?.useTls || false}
                    onCheckedChange={(checked) => updateConfigField('useTls', checked)}
                    disabled={loadingConfig}
                  />
                  <Label htmlFor="useTls" className="ml-2">Use TLS</Label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center space-x-2">
              <Button type="submit" disabled={loadingConfig}>Save Changes</Button>
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={loadingConfig}>
                Test Connection
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* MQTT Topics */}
      <Card>
        <CardHeader className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-md font-medium">Monitored Topics</CardTitle>
          <Button variant="outline" size="sm" onClick={() => {
            setEditingTopic('new');
            setNewTopic('');
            setNewTopicQos('0');
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Topic
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>QoS</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editingTopic === 'new' && (
                <TableRow>
                  <TableCell>
                    <Input
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      placeholder="Enter topic (e.g. horus/devices/+/state)"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={newTopicQos} onValueChange={setNewTopicQos}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="QoS" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={handleAddTopic} className="mr-2">
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingTopic(null)}
                    >
                      Cancel
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              
              {loadingTopics ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Loading topics...
                  </TableCell>
                </TableRow>
              ) : mqttTopics && mqttTopics.length > 0 ? (
                mqttTopics.map((topicItem) => (
                  <TableRow key={topicItem.topic}>
                    <TableCell className="font-mono text-sm">
                      {topicItem.topic}
                    </TableCell>
                    <TableCell>{topicItem.qos}</TableCell>
                    <TableCell>
                      {topicItem.lastMessage 
                        ? <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate inline-block">
                            {typeof topicItem.lastMessage === 'object' 
                              ? JSON.stringify(topicItem.lastMessage) 
                              : topicItem.lastMessage}
                          </span>
                        : <span className="text-gray-400 dark:text-gray-600">No messages yet</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteTopic(topicItem.topic)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No topics configured. Add a topic to start monitoring MQTT messages.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
