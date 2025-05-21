import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { queryClient, apiRequest } from '../lib/queryClient';
import { Building2, Home, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '../hooks/use-toast';

// Types simplifiés
interface Building {
  id: number;
  name: string;
  address: string | null;
}

interface Room {
  id: number;
  name: string;
  building_id: number;
  floor: number;
  type: string | null;
  capacity: number | null;
  description: string | null;
}

const Locations = () => {
  // State pour les onglets et filtres
  const [activeTab, setActiveTab] = useState('buildings');
  const [filterBuildingId, setFilterBuildingId] = useState<number | null>(null);
  
  // État pour les formulaires et dialogues
  const [showBuildingDialog, setShowBuildingDialog] = useState(false);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  // États des formulaires
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
    description: ''
  });
  
  // Charger les bâtiments
  const { data: buildings = [], isLoading: loadingBuildings, refetch: refetchBuildings } = useQuery({
    queryKey: ['/api/buildings'],
    queryFn: async () => {
      const response = await fetch('/api/buildings');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des bâtiments');
      }
      return response.json();
    }
  });
  
  // Charger les salles avec filtre optionnel
  const { data: rooms = [], isLoading: loadingRooms, refetch: refetchRooms } = useQuery({
    queryKey: ['/api/rooms', filterBuildingId],
    queryFn: async () => {
      const url = filterBuildingId 
        ? `/api/rooms?buildingId=${filterBuildingId}` 
        : '/api/rooms';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des salles');
      }
      return response.json();
    }
  });
  
  // Fonction pour ajouter un bâtiment
  const handleAddBuilding = async () => {
    if (!buildingForm.name) {
      toast({
        title: "Erreur",
        description: "Le nom du bâtiment est requis",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await apiRequest('POST', '/api/buildings', {
        name: buildingForm.name,
        address: buildingForm.address || null
      });
      
      toast({
        title: "Succès",
        description: "Bâtiment ajouté avec succès"
      });
      
      // Réinitialiser le formulaire et fermer le dialogue
      setBuildingForm({ id: 0, name: '', address: '' });
      setShowBuildingDialog(false);
      
      // Rafraîchir la liste des bâtiments
      refetchBuildings();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le bâtiment",
        variant: "destructive"
      });
    }
  };
  
  // Fonction pour modifier un bâtiment
  const handleUpdateBuilding = async () => {
    if (!buildingForm.name || !selectedBuilding) {
      return;
    }
    
    try {
      await apiRequest('PUT', `/api/buildings/${selectedBuilding.id}`, {
        name: buildingForm.name,
        address: buildingForm.address || null
      });
      
      toast({
        title: "Succès",
        description: "Bâtiment mis à jour avec succès"
      });
      
      // Réinitialiser le formulaire et fermer le dialogue
      setBuildingForm({ id: 0, name: '', address: '' });
      setSelectedBuilding(null);
      setIsEditMode(false);
      setShowBuildingDialog(false);
      
      // Rafraîchir la liste des bâtiments
      refetchBuildings();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le bâtiment",
        variant: "destructive"
      });
    }
  };
  
  // Fonction pour supprimer un bâtiment
  const handleDeleteBuilding = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce bâtiment ?")) {
      return;
    }
    
    try {
      await apiRequest('DELETE', `/api/buildings/${id}`);
      
      toast({
        title: "Succès",
        description: "Bâtiment supprimé avec succès"
      });
      
      // Rafraîchir la liste des bâtiments
      refetchBuildings();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bâtiment. Vérifiez qu'il ne contient pas de salles.",
        variant: "destructive"
      });
    }
  };
  
  // Fonction pour ajouter une salle
  const handleAddRoom = async () => {
    if (!roomForm.name || !roomForm.building_id) {
      toast({
        title: "Erreur",
        description: "Le nom de la salle et le bâtiment sont requis",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await apiRequest('POST', '/api/rooms', {
        name: roomForm.name,
        building_id: roomForm.building_id,
        floor: roomForm.floor,
        type: roomForm.type || null,
        capacity: roomForm.capacity || null,
        description: roomForm.description || null,
        features: []
      });
      
      toast({
        title: "Succès",
        description: "Salle ajoutée avec succès"
      });
      
      // Réinitialiser le formulaire et fermer le dialogue
      setRoomForm({ 
        id: 0, 
        name: '', 
        building_id: filterBuildingId || 0, 
        floor: 1, 
        type: '', 
        capacity: 0, 
        description: '' 
      });
      setShowRoomDialog(false);
      
      // Rafraîchir la liste des salles
      refetchRooms();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la salle",
        variant: "destructive"
      });
    }
  };
  
  // Fonction pour modifier une salle
  const handleUpdateRoom = async () => {
    if (!roomForm.name || !roomForm.building_id || !selectedRoom) {
      return;
    }
    
    try {
      await apiRequest('PUT', `/api/rooms/${selectedRoom.id}`, {
        name: roomForm.name,
        building_id: roomForm.building_id,
        floor: roomForm.floor,
        type: roomForm.type || null,
        capacity: roomForm.capacity || null,
        description: roomForm.description || null,
        features: []
      });
      
      toast({
        title: "Succès",
        description: "Salle mise à jour avec succès"
      });
      
      // Réinitialiser le formulaire et fermer le dialogue
      setRoomForm({ 
        id: 0, 
        name: '', 
        building_id: filterBuildingId || 0, 
        floor: 1, 
        type: '', 
        capacity: 0, 
        description: '' 
      });
      setSelectedRoom(null);
      setIsEditMode(false);
      setShowRoomDialog(false);
      
      // Rafraîchir la liste des salles
      refetchRooms();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la salle",
        variant: "destructive"
      });
    }
  };
  
  // Fonction pour supprimer une salle
  const handleDeleteRoom = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette salle ?")) {
      return;
    }
    
    try {
      await apiRequest('DELETE', `/api/rooms/${id}`);
      
      toast({
        title: "Succès",
        description: "Salle supprimée avec succès"
      });
      
      // Rafraîchir la liste des salles
      refetchRooms();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la salle",
        variant: "destructive"
      });
    }
  };
  
  // Fonctions utilitaires
  const openBuildingDialog = (building?: Building) => {
    if (building) {
      setBuildingForm({
        id: building.id,
        name: building.name,
        address: building.address || ''
      });
      setSelectedBuilding(building);
      setIsEditMode(true);
    } else {
      setBuildingForm({ id: 0, name: '', address: '' });
      setSelectedBuilding(null);
      setIsEditMode(false);
    }
    setShowBuildingDialog(true);
  };
  
  const openRoomDialog = (room?: Room) => {
    if (room) {
      setRoomForm({
        id: room.id,
        name: room.name,
        building_id: room.building_id,
        floor: room.floor,
        type: room.type || '',
        capacity: room.capacity || 0,
        description: room.description || ''
      });
      setSelectedRoom(room);
      setIsEditMode(true);
    } else {
      setRoomForm({ 
        id: 0, 
        name: '', 
        building_id: filterBuildingId || 0, 
        floor: 1, 
        type: '', 
        capacity: 0, 
        description: '' 
      });
      setSelectedRoom(null);
      setIsEditMode(false);
    }
    setShowRoomDialog(true);
  };
  
  // Fonction pour obtenir le nom d'un bâtiment par ID
  const getBuildingName = (id: number) => {
    const building = Array.isArray(buildings) 
      ? buildings.find((b: any) => b.id === id) 
      : null;
    return building ? building.name : 'Bâtiment inconnu';
  };
  
  // Rendu pour l'onglet des bâtiments
  const renderBuildingsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Bâtiments</h2>
        <Button onClick={() => openBuildingDialog()} className="flex items-center gap-2">
          <Plus size={16} /> Ajouter un bâtiment
        </Button>
      </div>
      
      {loadingBuildings ? (
        <div className="text-center py-10">Chargement des bâtiments...</div>
      ) : Array.isArray(buildings) && buildings.length === 0 ? (
        <div className="text-center py-10">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">Aucun bâtiment trouvé</p>
          <p className="text-gray-400 mb-4">Ajoutez un bâtiment pour commencer à organiser vos appareils</p>
          <Button onClick={() => openBuildingDialog()} className="flex items-center gap-2 mx-auto">
            <Plus size={16} /> Ajouter un bâtiment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.isArray(buildings) && buildings.map((building: any) => (
            <Card key={building.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{building.name}</CardTitle>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openBuildingDialog(building)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteBuilding(building.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                {building.address && <CardDescription>{building.address}</CardDescription>}
              </CardHeader>
              <CardFooter>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    setFilterBuildingId(building.id);
                    setActiveTab('rooms');
                  }}
                >
                  Voir les salles
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
  
  // Rendu pour l'onglet des salles
  const renderRoomsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">Salles</h2>
          {filterBuildingId && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium py-1 px-2 rounded">
              Bâtiment: {getBuildingName(filterBuildingId)}
              <button 
                className="ml-2 text-blue-500"
                onClick={() => setFilterBuildingId(null)}
              >
                ×
              </button>
            </span>
          )}
        </div>
        <Button onClick={() => openRoomDialog()} className="flex items-center gap-2">
          <Plus size={16} /> Ajouter une salle
        </Button>
      </div>
      
      {loadingRooms ? (
        <div className="text-center py-10">Chargement des salles...</div>
      ) : Array.isArray(rooms) && rooms.length === 0 ? (
        <div className="text-center py-10">
          <Home size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">Aucune salle trouvée</p>
          <p className="text-gray-400 mb-4">
            {filterBuildingId 
              ? "Ce bâtiment ne contient pas encore de salles" 
              : "Ajoutez votre première salle pour organiser vos appareils"
            }
          </p>
          <Button onClick={() => openRoomDialog()} className="flex items-center gap-2 mx-auto">
            <Plus size={16} /> Ajouter une salle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.isArray(rooms) && rooms.map((room: any) => (
            <Card key={room.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{room.name}</CardTitle>
                    <CardDescription>
                      {getBuildingName(room.building_id)} • Étage {room.floor}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openRoomDialog(room)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteRoom(room.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {room.type && <p className="text-sm text-gray-500 mb-1">Type: {room.type}</p>}
                {room.capacity > 0 && <p className="text-sm text-gray-500 mb-1">Capacité: {room.capacity}</p>}
                {room.description && <p className="text-sm text-gray-600 mt-2">{room.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
          {renderBuildingsTab()}
        </TabsContent>
        
        <TabsContent value="rooms">
          {renderRoomsTab()}
        </TabsContent>
      </Tabs>
      
      {/* Dialogue pour ajouter/modifier un bâtiment */}
      <Dialog open={showBuildingDialog} onOpenChange={setShowBuildingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Modifier le bâtiment' : 'Ajouter un bâtiment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="building-name">Nom du bâtiment</Label>
              <Input 
                id="building-name" 
                placeholder="Nom du bâtiment" 
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({...buildingForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-address">Adresse (optionnelle)</Label>
              <Input 
                id="building-address" 
                placeholder="Adresse du bâtiment" 
                value={buildingForm.address}
                onChange={(e) => setBuildingForm({...buildingForm, address: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBuildingDialog(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={isEditMode ? handleUpdateBuilding : handleAddBuilding}
            >
              {isEditMode ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialogue pour ajouter/modifier une salle */}
      <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Modifier la salle' : 'Ajouter une salle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Nom de la salle</Label>
              <Input 
                id="room-name" 
                placeholder="Nom de la salle" 
                value={roomForm.name}
                onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="room-building">Bâtiment</Label>
              <select
                id="room-building"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={roomForm.building_id}
                onChange={(e) => setRoomForm({...roomForm, building_id: parseInt(e.target.value)})}
              >
                <option value="">Sélectionner un bâtiment</option>
                {Array.isArray(buildings) && buildings.map((building: any) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-floor">Étage</Label>
                <Input 
                  id="room-floor" 
                  type="number" 
                  placeholder="Étage" 
                  value={roomForm.floor}
                  onChange={(e) => setRoomForm({...roomForm, floor: parseInt(e.target.value) || 1})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="room-capacity">Capacité</Label>
                <Input 
                  id="room-capacity" 
                  type="number" 
                  placeholder="Capacité" 
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({...roomForm, capacity: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="room-type">Type de salle</Label>
              <select
                id="room-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={roomForm.type}
                onChange={(e) => setRoomForm({...roomForm, type: e.target.value})}
              >
                <option value="">Sélectionner un type</option>
                <option value="bedroom">Chambre</option>
                <option value="living">Salon</option>
                <option value="kitchen">Cuisine</option>
                <option value="bathroom">Salle de bain</option>
                <option value="office">Bureau</option>
                <option value="garage">Garage</option>
                <option value="other">Autre</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="room-description">Description</Label>
              <Textarea 
                id="room-description" 
                placeholder="Description de la salle" 
                value={roomForm.description}
                onChange={(e) => setRoomForm({...roomForm, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRoomDialog(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={isEditMode ? handleUpdateRoom : handleAddRoom}
            >
              {isEditMode ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Locations;