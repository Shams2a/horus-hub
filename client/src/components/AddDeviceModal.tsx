import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddDeviceModal({ isOpen, onClose }: AddDeviceModalProps) {
  const [protocol, setProtocol] = useState<'zigbee' | 'wifi'>('zigbee');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      
      // Call the search devices API
      await apiRequest('POST', `/api/devices/search`, { protocol });
      
      toast({
        title: 'Searching for devices',
        description: `Looking for new ${protocol} devices. This may take a minute...`,
      });
      
      // In a real implementation, this would trigger the backend to start scanning
      // and results would come back via WebSocket
      
    } catch (error) {
      toast({
        title: 'Search failed',
        description: error instanceof Error ? error.message : 'Failed to start device search',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async () => {
    try {
      if (!name) {
        toast({
          title: 'Missing information',
          description: 'Please provide a name for the device',
          variant: 'destructive',
        });
        return;
      }
      
      if (!deviceType || !deviceId) {
        toast({
          title: 'Missing information',
          description: 'Please select a device type and provide a device ID',
          variant: 'destructive',
        });
        return;
      }
      
      // Call API to add the device
      await apiRequest('POST', '/api/devices', {
        name,
        deviceId,
        type: deviceType,
        protocol,
        location,
      });
      
      // Invalidate devices query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      
      toast({
        title: 'Device added',
        description: `${name} has been added successfully`,
      });
      
      // Reset form and close modal
      resetForm();
      onClose();
      
    } catch (error) {
      toast({
        title: 'Failed to add device',
        description: error instanceof Error ? error.message : 'An error occurred while adding the device',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setName('');
    setLocation('');
    setDeviceType('');
    setDeviceId('');
    setProtocol('zigbee');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Protocol</Label>
            <RadioGroup 
              defaultValue="zigbee" 
              value={protocol} 
              onValueChange={(value) => setProtocol(value as 'zigbee' | 'wifi')}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-900">
                <RadioGroupItem value="zigbee" id="zigbee" />
                <Label htmlFor="zigbee" className="cursor-pointer">Zigbee</Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer">
                <RadioGroupItem value="wifi" id="wifi" />
                <Label htmlFor="wifi" className="cursor-pointer">WiFi</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Device Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter device name" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location/Room</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main-room">Pièce principale</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="bedroom">Bedroom</SelectItem>
                  <SelectItem value="bathroom">Bathroom</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button disabled={isSearching} onClick={handleSearch} variant="secondary" className="w-full">
            {isSearching ? 'Searching...' : 'Search for Devices'}
          </Button>
          
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Alternatively, add a device manually:</p>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deviceType">Device Type</Label>
                <Select value={deviceType} onValueChange={setDeviceType}>
                  <SelectTrigger id="deviceType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light Bulb</SelectItem>
                    <SelectItem value="switch">Switch</SelectItem>
                    <SelectItem value="sensor">Sensor</SelectItem>
                    <SelectItem value="thermostat">Thermostat</SelectItem>
                    <SelectItem value="lock">Lock</SelectItem>
                    <SelectItem value="plug">Plug</SelectItem>
                    <SelectItem value="camera">Camera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input 
                  id="deviceId" 
                  value={deviceId} 
                  onChange={(e) => setDeviceId(e.target.value)} 
                  placeholder="Device ID/Address"
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd}>Add Device</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
