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
  Plus,
  Settings,
  Thermometer,
  Speaker,
  Camera,
  Tv
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddDeviceModal from '@/components/AddDeviceModal';
import DeviceConfigModal from '@/components/DeviceConfigModal';

export default function Wifi() {
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const { toast } = useToast();

  // Form states for manual device addition
  const [deviceName, setDeviceName] = useState('');
  const [deviceIP, setDeviceIP] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [apiKey, setApiKey] = useState('');

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

  const handleAddManualDevice = async () => {
    try {
      if (!deviceName || !deviceIP || !deviceType) {
        toast({
          title: 'Missing information',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
      
      // Call API to add the device
      await apiRequest('POST', '/api/devices', {
        name: deviceName,
        deviceId: deviceIP,
        type: deviceType,
        protocol: 'wifi',
        manufacturer,
        config: {
          apiKey
        }
      });
      
      // Invalidate devices query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      
      toast({
        title: 'Device added',
        description: `${deviceName} has been added successfully`,
      });
      
      // Reset form
      setDeviceName('');
      setDeviceIP('');
      setDeviceType('');
      setManufacturer('');
      setApiKey('');
      
    } catch (error) {
      toast({
        title: 'Failed to add device',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your Wi-Fi connected IoT devices</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleScanNetwork}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Scan Network
          </Button>
          <Button onClick={() => setIsAddingDevice(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Device
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
                {loadingStatus ? 'Loading...' : wifiStatus?.networkName || 'HorusHubNetwork'}
              </p>
              <p className="text-sm mt-1">
                Signal Strength: {loadingStatus ? 'Loading...' : wifiStatus?.signalStrength || 'Excellent'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">IP Address</p>
              <p className="font-medium">
                {loadingStatus ? 'Loading...' : wifiStatus?.ipAddress || '192.168.1.105'}
              </p>
              <p className="text-sm mt-1">
                MAC: {loadingStatus ? 'Loading...' : wifiStatus?.macAddress || '00:0a:95:9d:68:16'}
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
                    : '5 min ago'}
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
                        <span className="sr-only">Configure</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No WiFi devices found. Add a device to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Add WiFi Device */}
      <div>
        <h4 className="text-md font-medium mb-4">Add Wi-Fi Device</h4>
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deviceName">Device Name</Label>
                <Input 
                  id="deviceName" 
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceType">Device Type</Label>
                <Select value={deviceType} onValueChange={setDeviceType}>
                  <SelectTrigger id="deviceType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="speaker">Smart Speaker</SelectItem>
                    <SelectItem value="thermostat">Thermostat</SelectItem>
                    <SelectItem value="camera">Camera</SelectItem>
                    <SelectItem value="tv">TV</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceIP">IP Address</Label>
                <Input 
                  id="deviceIP" 
                  placeholder="192.168.1.x" 
                  value={deviceIP}
                  onChange={(e) => setDeviceIP(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input 
                  id="manufacturer" 
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6">
              <Label htmlFor="apiKey">API Key/Token (if required)</Label>
              <Input 
                id="apiKey" 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setDeviceName('');
                setDeviceIP('');
                setDeviceType('');
                setManufacturer('');
                setApiKey('');
              }}>Cancel</Button>
              <Button onClick={handleAddManualDevice}>Add Device</Button>
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
