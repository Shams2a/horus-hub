import { useState, useEffect, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Log } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  RefreshCw, 
  Download, 
  Search, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Bug 
} from 'lucide-react';

export default function Logs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logs, setLogs] = useState<Log[]>([]);
  const [logSettings, setLogSettings] = useState({
    logLevel: 'info',
    logRetention: 7,
    consoleLog: true,
    fileLog: true,
    logRotation: true
  });
  const { toast } = useToast();
  const logsContainerRef = useRef<HTMLDivElement>(null);
  
  // WebSocket connection for real-time logs
  const { isConnected, addMessageHandler } = useWebSocket({
    onMessage: (message) => {
      // Handle general messages if needed
    }
  });

  // Fetch logs with pagination and filters
  const { data: logsData, isLoading, refetch } = useQuery<{logs: Log[], totalPages: number}>({
    queryKey: ['/api/logs', currentPage, levelFilter, sourceFilter, searchQuery],
  });

  // Fetch log settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['/api/logs/settings'],
  });

  // Subscribe to real-time logs over WebSocket
  useEffect(() => {
    const removeHandler = addMessageHandler('log', (newLog) => {
      setLogs(prev => {
        // Add the new log at the beginning and limit to keep the list performant
        const updated = [newLog, ...prev].slice(0, 100);
        return updated;
      });
      
      // Auto-scroll if we're at the bottom
      if (logsContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
        
        if (isAtBottom) {
          setTimeout(() => {
            if (logsContainerRef.current) {
              logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
            }
          }, 10);
        }
      }
    });
    
    return () => removeHandler();
  }, [addMessageHandler]);

  // Update logs when data changes
  useEffect(() => {
    if (logsData) {
      setLogs(logsData.logs);
      setTotalPages(logsData.totalPages);
    }
  }, [logsData]);

  // Update log settings when they are loaded
  useEffect(() => {
    if (settings) {
      setLogSettings(settings);
    }
  }, [settings]);

  const handleRefresh = () => {
    refetch();
  };

  const handleDownload = async () => {
    try {
      // Make a request to download logs and handle the blob response
      const response = await fetch('/api/logs/download', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download logs');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `horus-hub-logs-${new Date().toISOString().split('T')[0]}.log`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Logs downloaded',
        description: 'The log file has been downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Failed to download logs',
        variant: 'destructive',
      });
    }
  };

  const handleClearLogs = async () => {
    try {
      await apiRequest('DELETE', '/api/logs', undefined);
      
      setLogs([]);
      refetch();
      
      toast({
        title: 'Logs cleared',
        description: 'All logs have been cleared from the database',
      });
    } catch (error) {
      toast({
        title: 'Failed to clear logs',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      await apiRequest('PUT', '/api/logs/settings', logSettings);
      
      toast({
        title: 'Settings saved',
        description: 'Log settings have been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug':
        return <Bug className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelClass = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300';
      case 'info':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
      case 'debug':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl font-bold">System Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and analyze system logs for troubleshooting</p>
        </div>
        <div className="flex space-x-3">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="zigbee">Zigbee</SelectItem>
              <SelectItem value="wifi">WiFi</SelectItem>
              <SelectItem value="mqtt">MQTT</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
      
      {/* Log Viewer */}
      <Card className="mb-6">
        <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <CardTitle className="text-md font-medium">Log Entries</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-56"
              />
            </div>
            <Button variant="primary" size="sm" onClick={() => {
              // Apply search
              refetch();
            }}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <div 
          ref={logsContainerRef} 
          className="logs-container max-h-96 overflow-auto"
        >
          <Table>
            <TableHeader className="sticky top-0 bg-white dark:bg-gray-800 z-10">
              <TableRow>
                <TableHead className="w-44">Timestamp</TableHead>
                <TableHead className="w-28">Level</TableHead>
                <TableHead className="w-28">Source</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getLevelClass(log.level)}`}>
                        {getLevelIcon(log.level)}
                        <span className="ml-1 uppercase">{log.level}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{log.source}</TableCell>
                    <TableCell className="text-sm">
                      {log.message}
                      {log.details && (
                        <details className="mt-1">
                          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">Details</summary>
                          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No logs found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <CardFooter className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
          <span>
            {isLoading ? 'Loading...' : logs.length > 0 ? `Showing ${logs.length} log entries` : 'No logs to display'}
          </span>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Log Settings */}
      <Card>
        <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-md font-medium">Log Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSaveSettings();
          }}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logLevel">Log Level</Label>
                <Select 
                  value={logSettings.logLevel} 
                  onValueChange={(value) => setLogSettings({...logSettings, logLevel: value})}
                  disabled={loadingSettings}
                >
                  <SelectTrigger id="logLevel">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">debug</SelectItem>
                    <SelectItem value="info">info</SelectItem>
                    <SelectItem value="warning">warning</SelectItem>
                    <SelectItem value="error">error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logRetention">Log Retention (days)</Label>
                <Input 
                  id="logRetention" 
                  type="number" 
                  value={logSettings.logRetention} 
                  onChange={(e) => setLogSettings({...logSettings, logRetention: parseInt(e.target.value)})}
                  disabled={loadingSettings}
                  min={1}
                  max={90}
                />
              </div>
            </div>
            
            <div className="mt-6">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Log File Options</h5>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Switch 
                    id="consoleLog" 
                    checked={logSettings.consoleLog}
                    onCheckedChange={(checked) => setLogSettings({...logSettings, consoleLog: checked})}
                    disabled={loadingSettings}
                  />
                  <Label htmlFor="consoleLog" className="ml-2">Console Logging</Label>
                </div>
                <div className="flex items-center">
                  <Switch 
                    id="fileLog" 
                    checked={logSettings.fileLog}
                    onCheckedChange={(checked) => setLogSettings({...logSettings, fileLog: checked})}
                    disabled={loadingSettings}
                  />
                  <Label htmlFor="fileLog" className="ml-2">File Logging</Label>
                </div>
                <div className="flex items-center">
                  <Switch 
                    id="logRotation" 
                    checked={logSettings.logRotation}
                    onCheckedChange={(checked) => setLogSettings({...logSettings, logRotation: checked})}
                    disabled={loadingSettings}
                  />
                  <Label htmlFor="logRotation" className="ml-2">Log Rotation</Label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <Button type="button" variant="destructive" onClick={handleClearLogs}>Clear Logs</Button>
              <Button type="submit" disabled={loadingSettings}>Save Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
