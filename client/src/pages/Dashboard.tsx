import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Device, SystemStatus } from '@/lib/types';
import DeviceCard from '@/components/DeviceCard';
import DeviceConfigModal from '@/components/DeviceConfigModal';
import ActivityLog from '@/components/ActivityLog';
import { CheckCircle, Cpu, Wifi, Cloud } from 'lucide-react';

interface MqttStatus {
  connected: boolean;
  broker: string;
  port: number;
  messagesPublished: number;
  messagesReceived: number;
  reconnectAttempts: number;
}

export default function Dashboard() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Fetch system status
  const { data: systemStatus, isLoading: loadingStatus } = useQuery<SystemStatus>({
    queryKey: ['/api/system/status'],
  });

  // Fetch all devices
  const { data: devices, isLoading: loadingDevices } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  // Fetch MQTT status
  const { data: mqttStatus } = useQuery<MqttStatus>({
    queryKey: ['/api/mqtt/status'],
    refetchInterval: 3000, // Rafraîchir toutes les 3 secondes
  });

  const handleConfigClick = (device: Device) => {
    setSelectedDevice(device);
    setConfigModalOpen(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* System Status */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hub Status */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hub Status</p>
                  <p className="text-xl font-semibold mt-1">
                    {loadingStatus ? 'Loading...' : systemStatus?.status === 'running' ? 'Running' : 'Error'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-success bg-opacity-20">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Uptime: {loadingStatus ? 'Loading...' : systemStatus?.uptime || 'Unknown'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Zigbee Adapter */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Zigbee Adapter</p>
                  <p className="text-xl font-semibold mt-1">Non détecté</p>
                </div>
                <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-700">
                  <Wifi className="h-6 w-6 text-gray-500" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connectez un adaptateur Zigbee pour commencer
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* MQTT Broker */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">MQTT Broker</p>
                  <p className="text-xl font-semibold mt-1">
                    {mqttStatus?.connected ? 'Connecté' : 'Déconnecté'}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${mqttStatus?.connected ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                  <Cloud className={`h-6 w-6 ${mqttStatus?.connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                </div>
              </div>
              <div className="mt-4">
                {mqttStatus?.connected ? (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{mqttStatus.broker}:{mqttStatus.port}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {mqttStatus.messagesReceived} reçus, {mqttStatus.messagesPublished} publiés
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(mqttStatus?.reconnectAttempts || 0) > 0 ? 'Tentative de reconnexion...' : 'Configurer un broker pour commencer'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Device Overview */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Device Overview</h3>
          <button 
            className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-md text-sm flex items-center"
            onClick={() => window.location.href = '/devices'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Device
          </button>
        </div>
        
        {loadingDevices ? (
          <div className="text-center py-10">Loading devices...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices && devices.length > 0 ? (
              devices.slice(0, 6).map(device => (
                <DeviceCard 
                  key={device.id} 
                  device={device} 
                  onConfigClick={handleConfigClick}
                />
              ))
            ) : (
              <div className="col-span-3 text-center py-10 text-gray-500 dark:text-gray-400">
                No devices found. Add your first device to get started.
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
        <Card>
          <ActivityLog limit={5} />
        </Card>
      </div>
      
      {/* Device Configuration Modal */}
      <DeviceConfigModal 
        isOpen={configModalOpen} 
        onClose={() => setConfigModalOpen(false)} 
        device={selectedDevice}
      />
    </div>
  );
}
