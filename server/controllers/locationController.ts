import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertBuildingSchema, insertRoomSchema } from '@shared/schema';
import logger from '../utils/logger';

// Building controllers
const getAllBuildings = async (req: Request, res: Response) => {
  try {
    const buildings = await storage.getAllBuildings();
    res.json(buildings);
  } catch (error) {
    logger.error('Error fetching buildings', { error });
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
};

const getBuilding = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const building = await storage.getBuilding(id);
    
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    res.json(building);
  } catch (error) {
    logger.error('Error fetching building', { error });
    res.status(500).json({ error: 'Failed to fetch building' });
  }
};

const addBuilding = async (req: Request, res: Response) => {
  try {
    const result = insertBuildingSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid building data', details: result.error.errors });
    }
    
    const newBuilding = await storage.insertBuilding(result.data);
    
    // Log activity
    const activityData = {
      entityId: newBuilding.id,
      activity: 'building_added',
      details: {
        name: newBuilding.name
      },
      timestamp: new Date()
    };
    await storage.insertActivity(activityData);
    
    res.status(201).json(newBuilding);
  } catch (error) {
    logger.error('Error adding building', { error });
    res.status(500).json({ error: 'Failed to add building' });
  }
};

const updateBuilding = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = insertBuildingSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid building data', details: result.error.errors });
    }
    
    const updatedBuilding = await storage.updateBuilding(id, result.data);
    
    if (!updatedBuilding) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    // Log activity
    const activityData = {
      entityId: updatedBuilding.id,
      activity: 'building_updated',
      details: {
        name: updatedBuilding.name
      },
      timestamp: new Date()
    };
    await storage.insertActivity(activityData);
    
    res.json(updatedBuilding);
  } catch (error) {
    logger.error('Error updating building', { error });
    res.status(500).json({ error: 'Failed to update building' });
  }
};

const deleteBuilding = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // First, check if there are any rooms in this building
    const rooms = await storage.getRoomsByBuilding(id);
    
    if (rooms.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete building with rooms', 
        message: 'Please delete all rooms in this building first' 
      });
    }
    
    const success = await storage.deleteBuilding(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    // Log activity
    const activityData = {
      entityId: id,
      activity: 'building_deleted',
      details: {},
      timestamp: new Date()
    };
    await storage.insertActivity(activityData);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting building', { error });
    res.status(500).json({ error: 'Failed to delete building' });
  }
};

// Room controllers
const getAllRooms = async (req: Request, res: Response) => {
  try {
    const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string) : undefined;
    
    let rooms;
    if (buildingId) {
      rooms = await storage.getRoomsByBuilding(buildingId);
    } else {
      rooms = await storage.getAllRooms();
    }
    
    res.json(rooms);
  } catch (error) {
    logger.error('Error fetching rooms', { error });
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

const getRoom = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const room = await storage.getRoom(id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json(room);
  } catch (error) {
    logger.error('Error fetching room', { error });
    res.status(500).json({ error: 'Failed to fetch room' });
  }
};

const addRoom = async (req: Request, res: Response) => {
  try {
    const result = insertRoomSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid room data', details: result.error.errors });
    }
    
    // Verify that the building exists
    const building = await storage.getBuilding(result.data.building_id);
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    const newRoom = await storage.insertRoom(result.data);
    
    // Log activity
    const activityData = {
      entityId: newRoom.id,
      activity: 'room_added',
      details: {
        name: newRoom.name,
        building: building.name
      },
      timestamp: new Date()
    };
    await storage.insertActivity(activityData);
    
    res.status(201).json(newRoom);
  } catch (error) {
    logger.error('Error adding room', { error });
    res.status(500).json({ error: 'Failed to add room' });
  }
};

const updateRoom = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = insertRoomSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid room data', details: result.error.errors });
    }
    
    // Verify that the building exists
    const building = await storage.getBuilding(result.data.building_id);
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    const updatedRoom = await storage.updateRoom(id, result.data);
    
    if (!updatedRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Log activity
    const activityData = {
      entityId: updatedRoom.id,
      activity: 'room_updated',
      details: {
        name: updatedRoom.name,
        building: building.name
      },
      timestamp: new Date()
    };
    await storage.insertActivity(activityData);
    
    res.json(updatedRoom);
  } catch (error) {
    logger.error('Error updating room', { error });
    res.status(500).json({ error: 'Failed to update room' });
  }
};

const deleteRoom = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if any devices are associated with this room
    // This would require a getDevicesByRoom function in storage
    // For now, we'll skip this check
    
    const success = await storage.deleteRoom(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Log activity
    const activityData = {
      entityId: id,
      activity: 'room_deleted',
      details: {},
      timestamp: new Date()
    };
    await storage.insertActivity(activityData);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting room', { error });
    res.status(500).json({ error: 'Failed to delete room' });
  }
};

export default {
  getAllBuildings,
  getBuilding,
  addBuilding,
  updateBuilding,
  deleteBuilding,
  getAllRooms,
  getRoom,
  addRoom,
  updateRoom,
  deleteRoom
};