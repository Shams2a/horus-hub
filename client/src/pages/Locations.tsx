import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger,
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
  Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogTrigger, Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue, Textarea
} from '@/components/ui';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Building, Room } from '@shared/schema';
import { Plus, Edit, Trash2, Home, Building2, ListFilter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Locations = () => {
  // State for forms and dialogs
  const [activeTab, setActiveTab] = useState('buildings');
  const [showBuildingDialog, setShowBuildingDialog] = useState(false);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filterBuildingId, setFilterBuildingId] = useState<number | null>(null);

  // Form states
  const [buildingForm, setBuildingForm] = useState({
    id: 0,
    name: '',
    address: ''
  });

  const [roomForm, setRoomForm] = useState({
    id: 0,
    name: '',
    building_id: 0,
    floor: 1,
    type: '',
    capacity: 0,
    description: '',
    features: [] as string[]
  });

  // Fetch buildings
  const { data: buildings = [], isLoading: loadingBuildings } = useQuery({
    queryKey: ['/api/buildings'],
  });

  // Fetch rooms with optional building filter
  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ['/api/rooms', filterBuildingId],
    queryFn: async () => {
      const url = filterBuildingId 
        ? `/api/rooms?buildingId=${filterBuildingId}` 
        : '/api/rooms';
      return apiRequest('GET', url);
    }
  });

  // Mutations for buildings
  const createBuildingMutation = useMutation({
    mutationFn: (building: Omit<Building, 'id' | 'created_at' | 'updated_at'>) => {
      return apiRequest('POST', '/api/buildings', building);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buildings'] });
      setShowBuildingDialog(false);
      resetBuildingForm();
      toast({
        title: 'Succès',
        description: 'Bâtiment créé avec succès',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Échec de la création du bâtiment: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const updateBuildingMutation = useMutation({
    mutationFn: (building: Partial<Building> & { id: number }) => {
      return apiRequest('PUT', `/api/buildings/${building.id}`, building);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buildings'] });
      setShowBuildingDialog(false);
      resetBuildingForm();
      toast({
        title: 'Succès',
        description: 'Bâtiment mis à jour avec succès',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Échec de la mise à jour du bâtiment: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/buildings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buildings'] });
      toast({
        title: 'Succès',
        description: 'Bâtiment supprimé avec succès',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Échec de la suppression du bâtiment: ${error.message || 'Impossible de supprimer un bâtiment qui contient des salles'}`,
        variant: 'destructive',
      });
    }
  });

  // Mutations for rooms
  const createRoomMutation = useMutation({
    mutationFn: (room: Omit<Room, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
      return apiRequest('POST', '/api/rooms', room);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      setShowRoomDialog(false);
      resetRoomForm();
      toast({
        title: 'Succès',
        description: 'Salle créée avec succès',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Échec de la création de la salle: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const updateRoomMutation = useMutation({
    mutationFn: (room: Partial<Room> & { id: number }) => {
      return apiRequest('PUT', `/api/rooms/${room.id}`, room);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      setShowRoomDialog(false);
      resetRoomForm();
      toast({
        title: 'Succès',
        description: 'Salle mise à jour avec succès',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Échec de la mise à jour de la salle: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/rooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      toast({
        title: 'Succès',
        description: 'Salle supprimée avec succès',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Échec de la suppression de la salle: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Helper functions
  const resetBuildingForm = () => {
    setBuildingForm({
      id: 0,
      name: '',
      address: ''
    });
    setIsEditMode(false);
    setSelectedBuilding(null);
  };

  const resetRoomForm = () => {
    setRoomForm({
      id: 0,
      name: '',
      building_id: filterBuildingId || 0,
      floor: 1,
      type: '',
      capacity: 0,
      description: '',
      features: []
    });
    setIsEditMode(false);
    setSelectedRoom(null);
  };

  const handleEditBuilding = (building: Building) => {
    setBuildingForm({
      id: building.id,
      name: building.name,
      address: building.address || ''
    });
    setIsEditMode(true);
    setSelectedBuilding(building);
    setShowBuildingDialog(true);
  };

  const handleEditRoom = (room: Room) => {
    setRoomForm({
      id: room.id,
      name: room.name,
      building_id: room.building_id,
      floor: room.floor || 1,
      type: room.type || '',
      capacity: room.capacity || 0,
      description: room.description || '',
      features: Array.isArray(room.features) ? room.features : []
    });
    setIsEditMode(true);
    setSelectedRoom(room);
    setShowRoomDialog(true);
  };

  const handleAddBuilding = () => {
    resetBuildingForm();
    setShowBuildingDialog(true);
  };

  const handleAddRoom = () => {
    resetRoomForm();
    setRoomForm(prev => ({
      ...prev,
      building_id: filterBuildingId || 0
    }));
    setShowRoomDialog(true);
  };

  const handleSubmitBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingForm.name) {
      toast({
        title: 'Erreur',
        description: 'Le nom du bâtiment est requis',
        variant: 'destructive',
      });
      return;
    }

    if (isEditMode && selectedBuilding) {
      updateBuildingMutation.mutate({
        id: selectedBuilding.id,
        name: buildingForm.name,
        address: buildingForm.address || null
      });
    } else {
      createBuildingMutation.mutate({
        name: buildingForm.name,
        address: buildingForm.address || null
      });
    }
  };

  const handleSubmitRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.name) {
      toast({
        title: 'Erreur',
        description: 'Le nom de la salle est requis',
        variant: 'destructive',
      });
      return;
    }

    if (!roomForm.building_id) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un bâtiment',
        variant: 'destructive',
      });
      return;
    }

    const roomData = {
      name: roomForm.name,
      building_id: roomForm.building_id,
      floor: roomForm.floor,
      type: roomForm.type || null,
      capacity: roomForm.capacity || null,
      description: roomForm.description || null,
      features: roomForm.features
    };

    if (isEditMode && selectedRoom) {
      updateRoomMutation.mutate({
        id: selectedRoom.id,
        ...roomData
      });
    } else {
      createRoomMutation.mutate(roomData);
    }
  };

  const handleDeleteBuilding = (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bâtiment ? Cette action est irréversible.')) {
      deleteBuildingMutation.mutate(id);
    }
  };

  const handleDeleteRoom = (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette salle ? Cette action est irréversible.')) {
      deleteRoomMutation.mutate(id);
    }
  };

  const getBuildingName = (buildingId: number) => {
    const building = buildings.find((b: Building) => b.id === buildingId);
    return building ? building.name : 'Bâtiment inconnu';
  };

  // UI Elements
  const BuildingsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Liste des bâtiments</h2>
        <Button onClick={handleAddBuilding} className="flex items-center gap-2">
          <Plus size={16} /> Ajouter un bâtiment
        </Button>
      </div>
      
      {loadingBuildings ? (
        <div className="flex justify-center p-8">Chargement des bâtiments...</div>
      ) : buildings.length === 0 ? (
        <Card className="mb-4">
          <CardContent className="p-6 text-center">
            <Building2 className="mx-auto text-gray-300 mb-2" size={48} />
            <p className="text-lg text-gray-500">Aucun bâtiment trouvé</p>
            <p className="text-sm text-gray-400 mt-1">Ajoutez votre premier bâtiment pour commencer à organiser vos appareils</p>
            <Button onClick={handleAddBuilding} className="mt-4 flex items-center gap-2 mx-auto">
              <Plus size={16} /> Ajouter un bâtiment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map((building: Building) => (
            <Card key={building.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{building.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8" 
                      onClick={() => handleEditBuilding(building)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-red-500" 
                      onClick={() => handleDeleteBuilding(building.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                {building.address && <CardDescription>{building.address}</CardDescription>}
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-gray-500">
                  {rooms.filter((room: Room) => room.building_id === building.id).length} salles
                </p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setFilterBuildingId(building.id);
                    setActiveTab('rooms');
                  }}
                  className="w-full"
                >
                  Voir les salles
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for adding/editing buildings */}
      <Dialog open={showBuildingDialog} onOpenChange={setShowBuildingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Modifier le bâtiment' : 'Ajouter un bâtiment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitBuilding}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="building-name">Nom du bâtiment</Label>
                <Input 
                  id="building-name" 
                  placeholder="Nom du bâtiment" 
                  value={buildingForm.name}
                  onChange={(e) => setBuildingForm({...buildingForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="building-address">Adresse (optionnelle)</Label>
                <Input 
                  id="building-address" 
                  placeholder="Adresse du bâtiment" 
                  value={buildingForm.address || ''}
                  onChange={(e) => setBuildingForm({...buildingForm, address: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetBuildingForm();
                  setShowBuildingDialog(false);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createBuildingMutation.isPending || updateBuildingMutation.isPending}>
                {isEditMode ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  const RoomsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Liste des salles</h2>
        <div className="flex gap-2">
          <Select value={filterBuildingId?.toString() || ''} onValueChange={(value) => setFilterBuildingId(value ? Number(value) : null)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par bâtiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les bâtiments</SelectItem>
              {buildings.map((building: Building) => (
                <SelectItem key={building.id} value={building.id.toString()}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddRoom} className="flex items-center gap-2">
            <Plus size={16} /> Ajouter une salle
          </Button>
        </div>
      </div>
      
      {loadingRooms ? (
        <div className="flex justify-center p-8">Chargement des salles...</div>
      ) : rooms.length === 0 ? (
        <Card className="mb-4">
          <CardContent className="p-6 text-center">
            <Home className="mx-auto text-gray-300 mb-2" size={48} />
            <p className="text-lg text-gray-500">Aucune salle trouvée</p>
            <p className="text-sm text-gray-400 mt-1">
              {filterBuildingId 
                ? "Ce bâtiment ne contient pas encore de salles" 
                : "Ajoutez votre première salle pour organiser vos appareils"
              }
            </p>
            <Button onClick={handleAddRoom} className="mt-4 flex items-center gap-2 mx-auto">
              <Plus size={16} /> Ajouter une salle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room: Room) => (
            <Card key={room.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{room.name}</CardTitle>
                    <CardDescription>
                      {getBuildingName(room.building_id)} • Étage {room.floor}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8" 
                      onClick={() => handleEditRoom(room)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-red-500" 
                      onClick={() => handleDeleteRoom(room.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {room.type && <p className="text-sm text-gray-500 mb-1">Type: {room.type}</p>}
                {room.capacity > 0 && <p className="text-sm text-gray-500 mb-1">Capacité: {room.capacity} personnes</p>}
                {room.description && <p className="text-sm text-gray-600 mt-2">{room.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for adding/editing rooms */}
      <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Modifier la salle' : 'Ajouter une salle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitRoom}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Nom de la salle</Label>
                <Input 
                  id="room-name" 
                  placeholder="Nom de la salle" 
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="room-building">Bâtiment</Label>
                <Select 
                  value={roomForm.building_id.toString() || ''}
                  onValueChange={(value) => setRoomForm({...roomForm, building_id: Number(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un bâtiment" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building: Building) => (
                      <SelectItem key={building.id} value={building.id.toString()}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room-floor">Étage</Label>
                  <Input 
                    id="room-floor" 
                    type="number" 
                    min="0"
                    placeholder="Étage" 
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({...roomForm, floor: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="room-capacity">Capacité</Label>
                  <Input 
                    id="room-capacity" 
                    type="number" 
                    min="0"
                    placeholder="Capacité" 
                    value={roomForm.capacity || ''}
                    onChange={(e) => setRoomForm({...roomForm, capacity: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="room-type">Type de salle</Label>
                <Select 
                  value={roomForm.type}
                  onValueChange={(value) => setRoomForm({...roomForm, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bedroom">Chambre</SelectItem>
                    <SelectItem value="living">Salon</SelectItem>
                    <SelectItem value="kitchen">Cuisine</SelectItem>
                    <SelectItem value="bathroom">Salle de bain</SelectItem>
                    <SelectItem value="office">Bureau</SelectItem>
                    <SelectItem value="garage">Garage</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="room-description">Description</Label>
                <Textarea 
                  id="room-description" 
                  placeholder="Description de la salle" 
                  value={roomForm.description || ''}
                  onChange={(e) => setRoomForm({...roomForm, description: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetRoomForm();
                  setShowRoomDialog(false);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createRoomMutation.isPending || updateRoomMutation.isPending}>
                {isEditMode ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Gestion des emplacements</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="buildings" className="flex items-center gap-2">
            <Building2 size={16} /> Bâtiments
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <Home size={16} /> Salles
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="buildings">
          <BuildingsTab />
        </TabsContent>
        
        <TabsContent value="rooms">
          <RoomsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Locations;