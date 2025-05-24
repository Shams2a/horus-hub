import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Device, ZigbeeStatus } from '@/lib/types';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  Plus,
  Settings,
  Lightbulb,
  Eye,
  Lock,
  Power,
  BarChart4
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import AddDeviceModal from '@/components/AddDeviceModal';
import DeviceConfigModal from '@/components/DeviceConfigModal';

export default function Zigbee() {
  const [permitJoin, setPermitJoin] = useState(false);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch zigbee network status
  const { data: zigbeeStatus, isLoading: loadingStatus, refetch: refetchStatus } = useQuery<ZigbeeStatus>({
    queryKey: ['/api/zigbee/status'],
  });

  // Fetch zigbee devices
  const { data: devices, isLoading: loadingDevices, refetch: refetchDevices } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
    select: (data) => data.filter(device => device.protocol === 'zigbee'),
  });

  const handleRefresh = () => {
    refetchStatus();
    refetchDevices();
    
    toast({
      title: 'Refreshed',
      description: 'Zigbee network information has been refreshed',
    });
  };

  const handlePermitJoinToggle = async (checked: boolean) => {
    try {
      await apiRequest('POST', '/api/zigbee/permit-join', { permitJoin: checked });
      setPermitJoin(checked);
      
      toast({
        title: checked ? 'Join mode enabled' : 'Join mode disabled',
        description: checked 
          ? 'New devices can now join the network for the next 60 seconds' 
          : 'Device joining has been disabled',
      });
      
      if (checked) {
        // Auto-disable after 60 seconds
        setTimeout(() => {
          setPermitJoin(false);
          toast({
            title: 'Join mode disabled',
            description: 'Device joining time has expired',
          });
        }, 60000);
      }
    } catch (error) {
      toast({
        title: 'Failed to toggle join mode',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateMap = async () => {
    try {
      await apiRequest('POST', '/api/zigbee/map', {});
      
      toast({
        title: 'Generating network map',
        description: 'The network map is being generated. This may take a few moments.',
      });
      
      // In a full implementation, this would trigger the backend to generate a map
      // and the result might come back via WebSocket
    } catch (error) {
      toast({
        title: 'Failed to generate map',
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
      case 'light':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'sensor':
        return <Eye className="h-5 w-5 text-blue-500" />;
      case 'lock':
        return <Lock className="h-5 w-5 text-green-500" />;
      case 'plug':
        return <Power className="h-5 w-5 text-purple-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl font-bold">Zigbee Devices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your Zigbee devices and network</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddingDevice(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Device
          </Button>
        </div>
      </div>
      
      {/* Zigbee Network Status */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h4 className="text-md font-medium mb-4">Zigbee Network Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Coordinator</p>
              <p className="font-medium">
                {loadingStatus ? 'Loading...' : zigbeeStatus?.coordinator || 'CC2531 USB Dongle'}
              </p>
              <p className="text-sm mt-1">Port: /dev/ttyUSB0</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Network</p>
              <p className="font-medium">
                PAN ID: {loadingStatus ? 'Loading...' : zigbeeStatus?.panId || '0x1a62'}
              </p>
              <p className="text-sm mt-1">
                Channel: {loadingStatus ? 'Loading...' : zigbeeStatus?.channel || 15}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Devices</p>
              <p className="font-medium">
                {loadingStatus || loadingDevices 
                  ? 'Loading...' 
                  : `${devices?.length || 0} Connected`}
              </p>
              <p className="text-sm mt-1">
                {loadingStatus 
                  ? 'Loading...' 
                  : `${zigbeeStatus?.deviceCount.routers || 0} Routers, ${zigbeeStatus?.deviceCount.endDevices || 0} End devices`}
              </p>
            </div>
          </div>

        </CardContent>
      </Card>
      
      {/* Zigbee Device List */}
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
                <TableHead>IEEE Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingDevices ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
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
                    <TableCell className="text-sm font-mono">
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
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                      {device.lastSeen 
                        ? new Date(device.lastSeen).toLocaleString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell className="text-right text-sm text-primary space-x-2">
                      <Button 
                        variant="ghost" 
                        className="hover:text-primary-600" 
                        onClick={() => handleConfigClick(device)}
                      >
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Configure</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No Zigbee devices found. Add a device to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Zigbee Network Map */}
      <div>
        <h4 className="text-md font-medium mb-4">Network Map</h4>
        <Card className="border border-dashed">
          <CardContent className="p-4 flex items-center justify-center h-80">
            <div className="text-center">
              <BarChart4 className="h-16 w-16 mx-auto text-gray-400" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">Network map visualization will appear here</p>
              <Button className="mt-4" onClick={handleGenerateMap}>
                Generate Network Map
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Add Device Modal */}
      <AddDeviceModal 
        isOpen={isAddingDevice} 
        onClose={() => setIsAddingDevice(false)} 
      />
      
      {/* Device Configuration Modal */}
      <DeviceConfigModal 
        isOpen={configModalOpen} 
        onClose={() => setConfigModalOpen(false)} 
        device={selectedDevice}
      />
    </div>
  );
}
