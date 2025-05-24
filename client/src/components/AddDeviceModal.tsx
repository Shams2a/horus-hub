import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Radio, Search, CheckCircle, Clock, AlertCircle, Plus, Scan, Wifi } from 'lucide-react';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ScannedDevice {
  id: string;
  name: string;
  type: string;
  rssi: number;
  manufacturer?: string;
  model?: string;
  status: 'discovered' | 'pairing' | 'paired' | 'failed';
}

export default function AddDeviceModal({ isOpen, onClose }: AddDeviceModalProps) {
  const [scanningStep, setScanningStep] = useState<'idle' | 'enabling' | 'scanning' | 'results'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanDuration, setScanDuration] = useState(60);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [permitJoinEnabled, setPermitJoinEnabled] = useState(false);
  const { toast } = useToast();

  // Activer le mode appairage Zigbee
  const enablePermitJoin = async () => {
    try {
      setScanningStep('enabling');
      await apiRequest('POST', '/api/zigbee/permit-join', { 
        permitJoin: true, 
        seconds: scanDuration 
      });
      setPermitJoinEnabled(true);
      setScanningStep('scanning');
      startScanning();
      
      toast({
        title: "Mode appairage activé",
        description: `Les appareils peuvent se connecter pendant ${scanDuration} secondes`,
      });
    } catch (error) {
      console.error('Error enabling permit join:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer le mode appairage",
        variant: "destructive",
      });
      setScanningStep('idle');
    }
  };

  // Démarrer le scan d'appareils
  const startScanning = () => {
    let progress = 0;
    let scanInterval: NodeJS.Timeout;
    
    scanInterval = setInterval(() => {
      progress += (100 / scanDuration);
      setScanProgress(progress);

      // Récupérer les vrais appareils Zigbee découverts
      if (progress > 20 && Math.random() < 0.15) {
        fetchZigbeeDevices();
      }

      if (progress >= 100) {
        clearInterval(scanInterval);
        setScanningStep('results');
        setScanProgress(100);
        setPermitJoinEnabled(false);
        
        // Désactiver le permit join
        apiRequest('POST', '/api/zigbee/permit-join', { permitJoin: false });
      }
    }, 1000);
  };

  // Récupérer les appareils Zigbee réels
  const fetchZigbeeDevices = async () => {
    try {
      const response = await fetch('/api/zigbee/devices');
      if (response.ok) {
        const data = await response.json();
        if (data.devices) {
          const devices = data.devices.map((device: any) => ({
            id: device.ieeeAddr || device.id,
            name: device.friendlyName || device.name || `Appareil ${device.id}`,
            type: device.type || 'unknown',
            rssi: device.rssi || -50,
            manufacturer: device.manufacturer,
            model: device.model,
            status: 'discovered' as const
          }));
          setScannedDevices(devices);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des appareils:', error);
    }
  };

  // Ajouter un appareil scanné
  const addScannedDevice = async (device: ScannedDevice) => {
    try {
      device.status = 'pairing';
      setScannedDevices(prev => prev.map(d => d.id === device.id ? device : d));

      await apiRequest('POST', '/api/devices', {
        name: device.name,
        protocol: 'zigbee',
        deviceId: device.id,
        type: device.type,
        manufacturer: device.manufacturer,
        model: device.model,
        state: { rssi: device.rssi }
      });
      
      device.status = 'paired';
      setScannedDevices(prev => prev.map(d => d.id === device.id ? device : d));
      
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      
      toast({
        title: 'Appareil ajouté',
        description: `${device.name} a été ajouté avec succès`,
      });
      
    } catch (error) {
      device.status = 'failed';
      setScannedDevices(prev => prev.map(d => d.id === device.id ? device : d));
      
      toast({
        title: 'Échec de l\'ajout',
        description: `Impossible d'ajouter ${device.name}`,
        variant: 'destructive',
      });
    }
  };

  // Reset modal state when closing
  const handleClose = () => {
    setScanningStep('idle');
    setScanProgress(0);
    setScannedDevices([]);
    setPermitJoinEnabled(false);
    onClose();
  };

  // Obtenir l'icône de statut
  const getStatusIcon = (status: ScannedDevice['status']) => {
    switch (status) {
      case 'discovered':
        return <Search className="h-4 w-4" />;
      case 'pairing':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'paired':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Ajouter un appareil Zigbee
          </DialogTitle>
          <DialogDescription>
            Activez le mode appairage pour détecter et ajouter de nouveaux appareils Zigbee
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {scanningStep === 'idle' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Radio className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Prêt à scanner</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Mettez vos appareils Zigbee en mode appairage, puis cliquez sur le bouton ci-dessous
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚡ Assurez-vous que vos appareils sont en mode appairage avant de commencer
                </p>
              </div>
            </div>
          )}

          {scanningStep === 'enabling' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Radio className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Activation en cours...</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ouverture du réseau Zigbee pour nouveaux appareils
                </p>
              </div>
            </div>
          )}

          {scanningStep === 'scanning' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <Scan className="h-8 w-8 text-green-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-medium">Scan en cours...</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Recherche d'appareils Zigbee ({Math.round((100 - scanProgress) * scanDuration / 100)}s restantes)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progression</span>
                  <span>{Math.round(scanProgress)}%</span>
                </div>
                <Progress value={scanProgress} className="w-full" />
              </div>

              {scannedDevices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Appareils découverts :</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {scannedDevices.map((device) => (
                      <div key={device.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(device.status)}
                          <div>
                            <div className="text-sm font-medium">{device.name}</div>
                            <div className="text-xs text-gray-500">
                              {device.manufacturer} • RSSI: {device.rssi}dBm
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {device.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {scanningStep === 'results' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium">Scan terminé</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {scannedDevices.length} appareil(s) découvert(s)
                </p>
              </div>

              {scannedDevices.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Cliquez pour ajouter :</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {scannedDevices.map((device) => (
                      <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(device.status)}
                          <div>
                            <div className="text-sm font-medium">{device.name}</div>
                            <div className="text-xs text-gray-500">
                              {device.manufacturer} • {device.model} • RSSI: {device.rssi}dBm
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {device.type}
                          </Badge>
                          {device.status === 'discovered' && (
                            <Button
                              size="sm"
                              onClick={() => addScannedDevice(device)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Ajouter
                            </Button>
                          )}
                          {device.status === 'paired' && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Ajouté
                            </Badge>
                          )}
                          {device.status === 'failed' && (
                            <Badge variant="destructive">
                              Échec
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Wifi className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun nouvel appareil découvert</p>
                  <p className="text-xs mt-1">Vérifiez que vos appareils sont en mode appairage</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {scanningStep === 'results' ? 'Fermer' : 'Annuler'}
          </Button>
          
          {scanningStep === 'idle' && (
            <Button onClick={enablePermitJoin}>
              <Radio className="h-4 w-4 mr-2" />
              Commencer le scan
            </Button>
          )}
          
          {scanningStep === 'results' && scannedDevices.length > 0 && (
            <Button onClick={() => {
              setScanningStep('idle');
              setScanProgress(0);
              setScannedDevices([]);
            }}>
              <Scan className="h-4 w-4 mr-2" />
              Nouveau scan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}