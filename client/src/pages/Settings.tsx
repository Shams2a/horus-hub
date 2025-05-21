import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Download,
  Upload,
  RotateCcw,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [generalSettings, setGeneralSettings] = useState({
    systemName: 'Horus Hub',
    location: 'Home',
    timezone: 'UTC',
    language: 'English',
    webInterfacePort: 8001,
    autoUpdate: true
  });
  
  const [networkSettings, setNetworkSettings] = useState({
    ipAddress: '',
    networkMode: 'DHCP',
    hostname: 'horushub'
  });
  
  const [zigbeeSettings, setZigbeeSettings] = useState({
    serialPort: '/dev/ttyUSB0',
    baudRate: 115200,
    adapterType: 'ember',
    channel: 15,
    networkKey: '01 03 05 07 09 0B 0D 0F 11 13 15 17 19 1B 1D 1F',
    permitJoin: false,
    cacheState: true
  });
  
  const [wifiSettings, setWifiSettings] = useState({
    ipRangeStart: '192.168.1.1',
    ipRangeEnd: '192.168.1.254',
    scanInterval: 30,
    enableMdns: true,
    serviceTypes: '_hap._tcp.local.,_http._tcp.local.'
  });
  
  const [backupName, setBackupName] = useState(`horus-backup-${new Date().toISOString().split('T')[0]}`);
  const [backupOptions, setBackupOptions] = useState({
    includeConfig: true,
    includeDevices: true,
    includeLogs: false
  });
  
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Fetch system information
  const { data: systemInfo, isLoading: loadingSystemInfo } = useQuery({
    queryKey: ['/api/system/info'],
  });

  // Fetch settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['/api/settings'],
  });

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      if (settings.general) setGeneralSettings(settings.general);
      if (settings.network) setNetworkSettings(settings.network);
      if (settings.zigbee) setZigbeeSettings(settings.zigbee);
      if (settings.wifi) setWifiSettings(settings.wifi);
    }
  }, [settings]);

  const handleSaveGeneral = async () => {
    try {
      await apiRequest('PUT', '/api/settings/general', generalSettings);
      
      toast({
        title: 'Settings saved',
        description: 'General settings have been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSaveNetwork = async () => {
    try {
      await apiRequest('PUT', '/api/settings/network', networkSettings);
      
      toast({
        title: 'Settings saved',
        description: 'Network settings have been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSaveZigbee = async () => {
    try {
      await apiRequest('PUT', '/api/settings/zigbee', zigbeeSettings);
      
      toast({
        title: 'Settings saved',
        description: 'Zigbee settings have been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSaveWifi = async () => {
    try {
      await apiRequest('PUT', '/api/settings/wifi', wifiSettings);
      
      toast({
        title: 'Settings saved',
        description: 'WiFi settings have been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleCreateBackup = async () => {
    try {
      const response = await fetch('/api/system/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: backupName,
          ...backupOptions
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create backup');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${backupName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Backup created',
        description: 'The backup file has been created and downloaded',
      });
    } catch (error) {
      toast({
        title: 'Backup failed',
        description: error instanceof Error ? error.message : 'Failed to create backup',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async () => {
    if (!selectedBackupFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a backup file to restore',
        variant: 'destructive',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('backup', selectedBackupFile);
      
      const response = await fetch('/api/system/restore', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore backup');
      }
      
      toast({
        title: 'Restoration in progress',
        description: 'The system is being restored from backup and will restart shortly',
      });
      
      // Simulate a reload after restoration completes
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (error) {
      toast({
        title: 'Restore failed',
        description: error instanceof Error ? error.message : 'Failed to restore from backup',
        variant: 'destructive',
      });
    }
  };

  const handleFactoryReset = async () => {
    // Show confirmation first
    if (!window.confirm('Are you sure you want to reset all settings to default and remove all device data? This action cannot be undone.')) {
      return;
    }
    
    try {
      await apiRequest('POST', '/api/system/factory-reset', {});
      
      toast({
        title: 'Factory reset initiated',
        description: 'The system is being reset to factory defaults and will restart shortly',
      });
      
      // Simulate a reload after reset completes
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (error) {
      toast({
        title: 'Reset failed',
        description: error instanceof Error ? error.message : 'Failed to perform factory reset',
        variant: 'destructive',
      });
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      const result = await apiRequest('GET', '/api/system/check-updates', undefined);
      
      if (result.available) {
        toast({
          title: 'Update available',
          description: `Version ${result.version} is available. Click to install now.`,
          action: (
            <Button size="sm" onClick={() => {
              // Trigger update installation
              apiRequest('POST', '/api/system/update', {});
              
              toast({
                title: 'Update started',
                description: 'The update is being installed. The system will restart when complete.',
              });
            }}>
              Install
            </Button>
          )
        });
      } else {
        toast({
          title: 'No updates available',
          description: 'Your system is up to date',
        });
      }
    } catch (error) {
      toast({
        title: 'Check failed',
        description: error instanceof Error ? error.message : 'Failed to check for updates',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">System Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Configure your Horus Hub system settings</p>
      </div>
      
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="zigbee">Zigbee</TabsTrigger>
          <TabsTrigger value="wifi">WiFi</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
        </TabsList>
        
        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card className="mb-6">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-md font-medium">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveGeneral();
              }}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="systemName">System Name</Label>
                    <Input 
                      id="systemName" 
                      value={generalSettings.systemName} 
                      onChange={(e) => setGeneralSettings({...generalSettings, systemName: e.target.value})}
                      disabled={loadingSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location" 
                      value={generalSettings.location} 
                      onChange={(e) => setGeneralSettings({...generalSettings, location: e.target.value})}
                      disabled={loadingSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={generalSettings.timezone} 
                      onValueChange={(value) => setGeneralSettings({...generalSettings, timezone: value})}
                      disabled={loadingSettings}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={generalSettings.language} 
                      onValueChange={(value) => setGeneralSettings({...generalSettings, language: value})}
                      disabled={loadingSettings}
                    >
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="German">German</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={loadingSettings}>Save Settings</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Network Settings Tab */}
        <TabsContent value="network">
          <Card className="mb-6">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-md font-medium">Network Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveNetwork();
              }}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="networkMode">Network Mode</Label>
                    <Select 
                      value={networkSettings.networkMode} 
                      onValueChange={(value) => setNetworkSettings({...networkSettings, networkMode: value})}
                      disabled={loadingSettings}
                    >
                      <SelectTrigger id="networkMode">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DHCP">DHCP</SelectItem>
                        <SelectItem value="Static IP">Static IP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ipAddress">IP Address</Label>
                    <Input 
                      id="ipAddress" 
                      value={networkSettings.ipAddress} 
                      onChange={(e) => setNetworkSettings({...networkSettings, ipAddress: e.target.value})}
                      disabled={loadingSettings || networkSettings.networkMode !== 'Static IP'}
                      placeholder={networkSettings.networkMode === 'DHCP' ? 'Assigned by DHCP' : '192.168.1.x'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hostname">Hostname</Label>
                    <Input 
                      id="hostname" 
                      value={networkSettings.hostname} 
                      onChange={(e) => setNetworkSettings({...networkSettings, hostname: e.target.value})}
                      disabled={loadingSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webInterfacePort">Web Interface Port</Label>
                    <Input 
                      id="webInterfacePort" 
                      type="number" 
                      value={generalSettings.webInterfacePort} 
                      onChange={(e) => setGeneralSettings({...generalSettings, webInterfacePort: parseInt(e.target.value)})}
                      disabled={loadingSettings}
                      min={1}
                      max={65535}
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={loadingSettings}>Save Settings</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Zigbee Settings Tab */}
        <TabsContent value="zigbee">
          <Card className="mb-6">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-md font-medium">Zigbee Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveZigbee();
              }}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="serialPort">Serial Port</Label>
                    <Input 
                      id="serialPort" 
                      value={zigbeeSettings.serialPort} 
                      onChange={(e) => setZigbeeSettings({...zigbeeSettings, serialPort: e.target.value})}
                      disabled={loadingSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baudRate">Baud Rate</Label>
                    <Input 
                      id="baudRate" 
                      type="number" 
                      value={zigbeeSettings.baudRate} 
                      onChange={(e) => setZigbeeSettings({...zigbeeSettings, baudRate: parseInt(e.target.value)})}
                      disabled={loadingSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adapterType">Adapter Type</Label>
                    <Select 
                      value={zigbeeSettings.adapterType} 
                      onValueChange={(value) => setZigbeeSettings({...zigbeeSettings, adapterType: value})}
                      disabled={loadingSettings}
                    >
                      <SelectTrigger id="adapterType">
                        <SelectValue placeholder="Select adapter type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ember">Ember</SelectItem>
                        <SelectItem value="cc2531">CC2531</SelectItem>
                        <SelectItem value="conbee">Conbee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel">Channel</Label>
                    <Select 
                      value={zigbeeSettings.channel.toString()} 
                      onValueChange={(value) => setZigbeeSettings({...zigbeeSettings, channel: parseInt(value)})}
                      disabled={loadingSettings}
                    >
                      <SelectTrigger id="channel">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="11">11</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="networkKey" className="block text-sm font-medium mb-2">Network Key (hex format)</Label>
                  <Input 
                    id="networkKey" 
                    value={zigbeeSettings.networkKey} 
                    onChange={(e) => setZigbeeSettings({...zigbeeSettings, networkKey: e.target.value})}
                    disabled={loadingSettings}
                    className="font-mono"
                  />
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="permitJoin" 
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      checked={zigbeeSettings.permitJoin}
                      onChange={(e) => setZigbeeSettings({...zigbeeSettings, permitJoin: e.target.checked})}
                      disabled={loadingSettings}
                    />
                    <Label htmlFor="permitJoin" className="ml-2">Permit Join</Label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="cacheState" 
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      checked={zigbeeSettings.cacheState}
                      onChange={(e) => setZigbeeSettings({...zigbeeSettings, cacheState: e.target.checked})}
                      disabled={loadingSettings}
                    />
                    <Label htmlFor="cacheState" className="ml-2">Cache State</Label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={loadingSettings}>Save Settings</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* WiFi Settings Tab */}
        <TabsContent value="wifi">
          <Card className="mb-6">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-md font-medium">WiFi Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveWifi();
              }}>
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-2">WiFi Device Detection</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="ipRangeStart">IP Range Start</Label>
                      <Input 
                        id="ipRangeStart" 
                        value={wifiSettings.ipRangeStart} 
                        onChange={(e) => setWifiSettings({...wifiSettings, ipRangeStart: e.target.value})}
                        disabled={loadingSettings}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ipRangeEnd">IP Range End</Label>
                      <Input 
                        id="ipRangeEnd" 
                        value={wifiSettings.ipRangeEnd} 
                        onChange={(e) => setWifiSettings({...wifiSettings, ipRangeEnd: e.target.value})}
                        disabled={loadingSettings}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="scanInterval">Scan Interval (minutes)</Label>
                    <Input 
                      id="scanInterval" 
                      type="number" 
                      value={wifiSettings.scanInterval} 
                      onChange={(e) => setWifiSettings({...wifiSettings, scanInterval: parseInt(e.target.value)})}
                      disabled={loadingSettings}
                      min={5}
                      max={1440}
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-2">mDNS Discovery</h3>
                  <div className="mt-4">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="enableMdns" 
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        checked={wifiSettings.enableMdns}
                        onChange={(e) => setWifiSettings({...wifiSettings, enableMdns: e.target.checked})}
                        disabled={loadingSettings}
                      />
                      <Label htmlFor="enableMdns" className="ml-2">Enable mDNS Discovery</Label>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="serviceTypes">Service Types</Label>
                    <Input 
                      id="serviceTypes" 
                      value={wifiSettings.serviceTypes} 
                      onChange={(e) => setWifiSettings({...wifiSettings, serviceTypes: e.target.value})}
                      disabled={loadingSettings || !wifiSettings.enableMdns}
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={loadingSettings}>Save Settings</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Backup & Restore Tab */}
        <TabsContent value="backup">
          <Card className="mb-6">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-md font-medium">Create Backup</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Create a backup of your current configuration and device data.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="backupName">Backup Name</Label>
                  <Input 
                    id="backupName" 
                    value={backupName} 
                    onChange={(e) => setBackupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backupOptions" className="block mb-2">Include</Label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="includeConfig" 
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        checked={backupOptions.includeConfig}
                        onChange={(e) => setBackupOptions({...backupOptions, includeConfig: e.target.checked})}
                      />
                      <Label htmlFor="includeConfig" className="ml-2">Configuration</Label>
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="includeDevices" 
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        checked={backupOptions.includeDevices}
                        onChange={(e) => setBackupOptions({...backupOptions, includeDevices: e.target.checked})}
                      />
                      <Label htmlFor="includeDevices" className="ml-2">Device Data</Label>
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="includeLogs" 
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        checked={backupOptions.includeLogs}
                        onChange={(e) => setBackupOptions({...backupOptions, includeLogs: e.target.checked})}
                      />
                      <Label htmlFor="includeLogs" className="ml-2">Logs</Label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleCreateBackup}>
                  <Download className="h-4 w-4 mr-1" />
                  Create Backup
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-md font-medium">Restore Backup</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Upload a backup file to restore your configuration.</p>
              <div className="mb-4">
                <Label htmlFor="backupFile" className="block mb-2">Backup File</Label>
                <Input 
                  id="backupFile"
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedBackupFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleRestore}
                  disabled={!selectedBackupFile}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Restore
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-md font-medium">Factory Reset</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Reset all settings to default and remove all device data. This action cannot be undone.</p>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md flex items-start mb-4">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  Warning: This will reset your Horus Hub to factory defaults, deleting all configuration, devices, and data. Make sure to create a backup first if you want to restore this configuration later.
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button 
                  variant="destructive" 
                  onClick={handleFactoryReset}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Factory Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* System Information */}
      <Card className="mt-6">
        <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-lg font-medium">System Information</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium mb-4">Software</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Horus Hub Version:</span>
                  <span className="text-sm">
                    {loadingSystemInfo ? 'Loading...' : systemInfo?.software?.version || '1.0.0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Node.js Version:</span>
                  <span className="text-sm">
                    {loadingSystemInfo ? 'Loading...' : systemInfo?.software?.nodeVersion || '16.14.2'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">OS:</span>
                  <span className="text-sm">
                    {loadingSystemInfo ? 'Loading...' : systemInfo?.software?.os || 'Raspberry Pi OS 11 (Bullseye)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Uptime:</span>
                  <span className="text-sm">
                    {loadingSystemInfo ? 'Loading...' : systemInfo?.software?.uptime || '2 days, 5 hours'}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 text-right">
                <Button variant="outline" size="sm" onClick={handleCheckForUpdates}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Check for Updates
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-md font-medium mb-4">Hardware</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Device:</span>
                  <span className="text-sm">
                    {loadingSystemInfo ? 'Loading...' : systemInfo?.hardware?.device || 'Raspberry Pi 4 Model B'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">CPU Usage:</span>
                  <span className="text-sm">
                    {loadingSystemInfo ? 'Loading...' : `${systemInfo?.hardware?.cpuUsage || 23}%`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Memory Usage:</span>
                  <span className="text-sm">
                    {loadingSystemInfo ? 'Loading...' : systemInfo?.hardware?.memoryUsage || '512MB / 2GB'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Storage:</span>
                  <span className="text-sm">
                    {loadingSystemInfo ? 'Loading...' : systemInfo?.hardware?.storageUsage || '4.2GB / 16GB'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-md font-medium mb-4">Installed Adapters</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Library Version</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSystemInfo ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        Loading adapter information...
                      </TableCell>
                    </TableRow>
                  ) : systemInfo?.adapters ? (
                    systemInfo.adapters.map((adapter: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">{adapter.protocol}</TableCell>
                        <TableCell className="text-sm">{adapter.version}</TableCell>
                        <TableCell>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            adapter.status === 'active' 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                          }`}>
                            {adapter.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No adapter information available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
