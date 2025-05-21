import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from '@/lib/types';
import { 
  CheckCircle, 
  AlertCircle, 
  WifiOff, 
  Lightbulb, 
  Lock, 
  Thermometer, 
  EyeOff,
  Wifi
} from 'lucide-react';

interface ActivityLogProps {
  limit?: number;
}

export default function ActivityLog({ limit = 5 }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/activities'],
  });

  useEffect(() => {
    if (data) {
      // Limit the number of activities to display
      setActivities(data.slice(0, limit));
    }
  }, [data, limit]);

  const getActivityIcon = (activity: Activity) => {
    const { activity: activityType, details } = activity;
    
    switch (activityType) {
      case 'state_change':
        if (details.type === 'light') {
          return (
            <div className={`p-2 rounded-full ${details.state === 'ON' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'} mr-3`}>
              <Lightbulb className={`h-5 w-5 ${details.state === 'ON' ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          );
        }
        if (details.type === 'lock') {
          return (
            <div className={`p-2 rounded-full ${details.state === 'LOCKED' ? 'bg-green-100 dark:bg-green-900' : 'bg-orange-100 dark:bg-orange-900'} mr-3`}>
              <Lock className={`h-5 w-5 ${details.state === 'LOCKED' ? 'text-green-500' : 'text-orange-500'}`} />
            </div>
          );
        }
        if (details.type === 'sensor' && details.motionDetected !== undefined) {
          return (
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 mr-3">
              {details.motionDetected ? <EyeOff className="h-5 w-5 text-blue-500" /> : <EyeOff className="h-5 w-5 text-blue-500" />}
            </div>
          );
        }
        if (details.type === 'thermostat') {
          return (
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 mr-3">
              <Thermometer className="h-5 w-5 text-blue-500" />
            </div>
          );
        }
        // Default state change icon
        return (
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900 mr-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        );
        
      case 'connection_change':
        if (details.connected) {
          return (
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900 mr-3">
              <Wifi className="h-5 w-5 text-green-500" />
            </div>
          );
        } else {
          return (
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900 mr-3">
              <WifiOff className="h-5 w-5 text-red-500" />
            </div>
          );
        }
        
      case 'error':
        return (
          <div className="p-2 rounded-full bg-red-100 dark:bg-red-900 mr-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        );
        
      default:
        return (
          <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 mr-3">
            <CheckCircle className="h-5 w-5 text-gray-500" />
          </div>
        );
    }
  };

  const getActivityText = (activity: Activity) => {
    const { activity: activityType, details } = activity;
    
    switch (activityType) {
      case 'state_change':
        if (details.type === 'light') {
          return `${details.name} turned ${details.state}`;
        }
        if (details.type === 'lock') {
          return `${details.name} ${details.state === 'LOCKED' ? 'locked' : 'unlocked'}`;
        }
        if (details.type === 'sensor' && details.motionDetected !== undefined) {
          return `${details.motionDetected ? 'Motion detected' : 'No motion'} by ${details.name}`;
        }
        if (details.type === 'thermostat' && details.temperature !== undefined) {
          return `${details.name} temperature set to ${details.temperature}°C`;
        }
        return `${details.name} state changed`;
        
      case 'connection_change':
        return `${details.name} ${details.connected ? 'connected' : 'disconnected'}`;
        
      case 'error':
        return `Error: ${details.message}`;
        
      default:
        return `${details.name || 'System'} activity`;
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading activities...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">Failed to load activities</div>;
  }

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
      {activities.length === 0 ? (
        <li className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
          No recent activity
        </li>
      ) : (
        activities.map((activity) => (
          <li key={activity.id} className="px-4 py-3">
            <div className="flex items-center">
              {getActivityIcon(activity)}
              <div>
                <p className="text-sm font-medium">{getActivityText(activity)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </li>
        ))
      )}
    </ul>
  );
}
