import { useState } from 'react';
import { Device } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { Switch } from '@/components/ui/switch';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Thermometer, Lock, Power, Speaker, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeviceCardProps {
  device: Device;
  onConfigClick: (device: Device) => void;
}

export default function DeviceCard({ device, onConfigClick }: DeviceCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const getDeviceIcon = () => {
    switch (device.type) {
      case 'light':
        return <Lightbulb className="h-6 w-6 text-yellow-500" />;
      case 'thermostat':
        return <Thermometer className="h-6 w-6 text-blue-500" />;
      case 'lock':
        return <Lock className="h-6 w-6 text-green-500" />;
      case 'plug':
        return <Power className="h-6 w-6 text-purple-500" />;
      case 'speaker':
        return <Speaker className="h-6 w-6 text-gray-500" />;
      case 'sensor':
        return <Eye className="h-6 w-6 text-blue-500" />;
      default:
        return <Lightbulb className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getDeviceStatus = () => {
    if (device.type === 'light' || device.type === 'plug') {
      const isPowered = device.state.state === 'ON';
      return (
        <div className="flex items-center justify-between">
          <div className="text-sm">
            {device.type === 'light' && device.state.brightness && (
              <p>Brightness: {device.state.brightness}%</p>
            )}
            {device.type === 'plug' && device.state.power && (
              <p>Power: {device.state.power}W</p>
            )}
          </div>
          <Switch 
            checked={isPowered}
            disabled={isUpdating || device.status === 'offline'}
            onCheckedChange={handleStateChange}
          />
        </div>
      );
    }
    
    if (device.type === 'thermostat' && device.state.temperature) {
      return (
        <div className="text-sm text-blue-500 font-semibold">
          {device.state.temperature}°C
        </div>
      );
    }
    
    if (device.type === 'lock') {
      return (
        <div className="text-sm text-green-500 font-semibold">
          {device.state.state === 'LOCKED' ? 'Locked' : 'Unlocked'}
        </div>
      );
    }
    
    if (device.type === 'sensor') {
      if (device.state.motion !== undefined) {
        return (
          <div className="text-sm">
            {device.state.motion ? 'Motion detected' : 'No motion detected'}
          </div>
        );
      }
      if (device.state.contact !== undefined) {
        return (
          <div className="text-sm text-green-500 font-semibold">
            {device.state.contact ? 'Closed' : 'Open'}
          </div>
        );
      }
    }
    
    return (
      <div className="text-sm">
        {device.status === 'offline' ? (
          <p>Last seen: {new Date(device.lastSeen || '').toLocaleString()}</p>
        ) : (
          <p>Connected</p>
        )}
      </div>
    );
  };

  const handleStateChange = async (checked: boolean) => {
    try {
      setIsUpdating(true);
      
      await apiRequest('PUT', `/api/devices/${device.id}/state`, {
        state: { state: checked ? 'ON' : 'OFF' }
      });
      
      // Invalidate devices cache to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      
      toast({
        title: 'Device updated',
        description: `${device.name} turned ${checked ? 'on' : 'off'}`,
      });
      
    } catch (error) {
      toast({
        title: 'Failed to update device',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-gray-100 dark:bg-gray-800">
              {getDeviceIcon()}
            </div>
            <div className="ml-3">
              <h4 className="font-medium">{device.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {device.protocol.charAt(0).toUpperCase() + device.protocol.slice(1)} • {device.manufacturer || 'Unknown'}
              </p>
            </div>
          </div>
          <span 
            className={`px-2 py-1 text-xs ${
              device.status === 'online'
                ? 'bg-green-500 text-white'
                : 'bg-gray-400 text-white'
            } rounded-full`}
          >
            {device.status === 'online' ? (
              <>
                <span className="h-2 w-2 bg-white rounded-full mr-1 inline-block device-status-online"></span>
                Online
              </>
            ) : 'Offline'}
          </span>
        </div>
        
        {getDeviceStatus()}
        
        <div className="mt-3 text-right">
          <button 
            onClick={() => onConfigClick(device)}
            className="text-primary-500 hover:text-primary-600 text-sm font-medium"
          >
            Configure
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
