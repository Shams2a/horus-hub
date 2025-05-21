import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Device } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DeviceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device | null;
}

export default function DeviceConfigModal({ isOpen, onClose, device }: DeviceConfigModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (device) {
      setName(device.name);
      setLocation(device.location || '');
    }
  }, [device]);

  const handleSave = async () => {
    if (!device) return;
    
    try {
      setIsLoading(true);
      
      // Call API to update the device
      await apiRequest('PUT', `/api/devices/${device.id}`, {
        name,
        location
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      
      toast({
        title: 'Device updated',
        description: `${name} has been updated successfully`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to update device',
        description: error instanceof Error ? error.message : 'An error occurred while updating the device',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!device) return;
    
    try {
      setIsLoading(true);
      
      // Call API to delete the device
      await apiRequest('DELETE', `/api/devices/${device.id}`, undefined);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      
      toast({
        title: 'Device removed',
        description: `${device.name} has been removed successfully`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to remove device',
        description: error instanceof Error ? error.message : 'An error occurred while removing the device',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!device) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Device Details: {device.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deviceName">Device Name</Label>
            <Input 
              id="deviceName" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceId">ID</Label>
              <Input 
                id="deviceId" 
                value={device.deviceId} 
                disabled
                className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deviceType">Type</Label>
              <Input 
                id="deviceType" 
                value={device.type.charAt(0).toUpperCase() + device.type.slice(1)} 
                disabled
                className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location/Room</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="living-room">Living Room</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="bedroom">Bedroom</SelectItem>
                <SelectItem value="bathroom">Bathroom</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Display device status and last seen information */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Device Information</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Status:</p>
                <p className="font-medium">{device.status === 'online' ? 'Online' : 'Offline'}</p>
              </div>
              
              <div>
                <p className="text-gray-500 dark:text-gray-400">Last Seen:</p>
                <p className="font-medium">
                  {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}
                </p>
              </div>
              
              <div>
                <p className="text-gray-500 dark:text-gray-400">Protocol:</p>
                <p className="font-medium">{device.protocol.toUpperCase()}</p>
              </div>
              
              <div>
                <p className="text-gray-500 dark:text-gray-400">Manufacturer:</p>
                <p className="font-medium">{device.manufacturer || 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            Remove Device
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
