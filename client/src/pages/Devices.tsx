import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Device } from '@/lib/types';
import DeviceCard from '@/components/DeviceCard';
import AddDeviceModal from '@/components/AddDeviceModal';
import DeviceConfigModal from '@/components/DeviceConfigModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search } from 'lucide-react';

export default function Devices() {
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Fetch all devices
  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const handleConfigClick = (device: Device) => {
    setSelectedDevice(device);
    setConfigModalOpen(true);
  };

  // Filter devices based on search query and filters
  const filteredDevices = devices?.filter(device => {
    // Filter by search query (name, type, or location)
    const matchesSearch = searchQuery === '' || 
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (device.location && device.location.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by protocol
    const matchesProtocol = protocolFilter === 'all' || device.protocol === protocolFilter;
    
    // Filter by status
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    
    return matchesSearch && matchesProtocol && matchesStatus;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Devices</h1>
        <Button onClick={() => setAddDeviceModalOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </div>
      
      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            className="pl-10"
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <Select value={protocolFilter} onValueChange={setProtocolFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Protocols" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Protocols</SelectItem>
              <SelectItem value="zigbee">Zigbee</SelectItem>
              <SelectItem value="wifi">WiFi</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Device Grid */}
      {isLoading ? (
        <div className="text-center py-10">Loading devices...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices && filteredDevices.length > 0 ? (
            filteredDevices.map(device => (
              <DeviceCard 
                key={device.id} 
                device={device} 
                onConfigClick={handleConfigClick}
              />
            ))
          ) : (
            <div className="col-span-3 text-center py-10 text-gray-500 dark:text-gray-400">
              {searchQuery || protocolFilter !== 'all' || statusFilter !== 'all' ? 
                'No devices match your filters.' : 
                'No devices found. Add your first device to get started.'}
            </div>
          )}
        </div>
      )}
      
      {/* Add Device Modal */}
      <AddDeviceModal 
        isOpen={addDeviceModalOpen} 
        onClose={() => setAddDeviceModalOpen(false)} 
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
