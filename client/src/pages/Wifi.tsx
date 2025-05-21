import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Device, WifiStatus } from '@/lib/types';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  RefreshCw,
  Settings,
  Thermometer,
  Speaker,
  Camera,
  Tv
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import DeviceConfigModal from '@/components/DeviceConfigModal';

export default function Wifi() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch WiFi network status
  const { data: wifiStatus, isLoading: loadingStatus, refetch: refetchStatus } = useQuery<WifiStatus>({
    queryKey: ['/api/wifi/status'],
  });

  // Fetch WiFi devices
  const { data: devices, isLoading: loadingDevices, refetch: refetchDevices } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
    select: (data) => data.filter(device => device.protocol === 'wifi'),
  });

  const handleRefresh = () => {
    refetchStatus();
    refetchDevices();
    
    toast({
      title: 'Refreshed',
      description: 'WiFi network information has been refreshed',
    });
  };

  const handleScanNetwork = async () => {
    try {
      await apiRequest('POST', '/api/wifi/scan', {});
      
      toast({
        title: 'Network scan started',
        description: 'Scanning for WiFi devices on the network. This may take a few moments.',
      });
      
      // In a full implementation, this would trigger a backend scan
      // and results would come via WebSocket or a subsequent query
      setTimeout(() => refetchDevices(), 5000);
      
    } catch (error) {
      toast({
        title: 'Failed to scan network',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleConfigClick = (device: Device) => {
    setSelectedDevice(device);
    setConfigModalOpen(true);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'thermostat':
        return <Thermometer className="h-5 w-5 text-blue-500" />;
      case 'speaker':
        return <Speaker className="h-5 w-5 text-gray-500" />;
      case 'camera':
        return <Camera className="h-5 w-5 text-red-500" />;
      case 'tv':
        return <Tv className="h-5 w-5 text-purple-500" />;
      default:
        return <Tv className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl font-bold">Wi-Fi Devices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View your Wi-Fi connected IoT devices</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleScanNetwork}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Scan Network
          </Button>
        </div>
      </div>
      
      {/* WiFi Network Status */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h4 className="text-md font-medium mb-4">Network Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Connected Network</p>
              <p className="font-medium">
                {loadingStatus ? 'Loading...' : wifiStatus?.networkName || 'Home Network'}
              </p>
              <p className="text-sm mt-1">
                Signal Strength: {loadingStatus ? 'Loading...' : wifiStatus?.signalStrength || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">IP Address</p>
              <p className="font-medium">
                {loadingStatus ? 'Loading...' : wifiStatus?.ipAddress || '-'}
              </p>
              <p className="text-sm mt-1">
                MAC: {loadingStatus ? 'Loading...' : wifiStatus?.macAddress || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Devices</p>
              <p className="font-medium">
                {loadingDevices 
                  ? 'Loading...' 
                  : `${devices?.length || 0} Connected`}
              </p>
              <p className="text-sm mt-1">
                Last scan: {loadingStatus 
                  ? 'Loading...' 
                  : wifiStatus?.lastScan 
                    ? new Date(wifiStatus.lastScan).toLocaleString() 
                    : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* WiFi Device List */}
      <Card className="mb-6">
        <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-md font-medium">Device List</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingDevices ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Loading devices...
                  </TableCell>
                </TableRow>
              ) : devices && devices.length > 0 ? (
                devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="p-2 rounded-md bg-gray-100 dark:bg-gray-800">
                          {getDeviceIcon(device.type)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium">{device.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {device.manufacturer || 'Unknown'} {device.model || ''}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {device.type.charAt(0).toUpperCase() + device.type.slice(1)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {device.deviceId}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        device.status === 'online' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}>
                        <span className={`h-2 w-2 rounded-full mr-1 self-center ${
                          device.status === 'online' ? 'bg-green-500 device-status-online' : 'bg-gray-500'
                        }`}></span>
                        {device.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-primary space-x-2">
                      <Button 
                        variant="ghost" 
                        className="hover:text-primary-600" 
                        onClick={() => handleConfigClick(device)}
                      >
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No WiFi devices found. Run a network scan to discover devices.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Device Configuration Modal */}
      <DeviceConfigModal 
        isOpen={configModalOpen} 
        onClose={() => setConfigModalOpen(false)} 
        device={selectedDevice}
      />
    </div>
  );
}
