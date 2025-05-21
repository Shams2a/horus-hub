import { Request, Response } from "express";
import { storage } from "../storage";
import logger from "../utils/logger";
import { insertBuildingSchema, insertRoomSchema } from "@shared/schema";

// Building controllers
export const getAllBuildings = async (req: Request, res: Response) => {
  try {
    const buildings = await storage.getAllBuildings();
    res.json(buildings);
  } catch (error) {
    logger.error('Error getting buildings', { error });
    res.status(500).json({ error: 'Failed to get buildings' });
  }
};

export const getBuilding = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid building ID' });
    }
    
    const building = await storage.getBuilding(id);
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    res.json(building);
  } catch (error) {
    logger.error('Error getting building', { error, id: req.params.id });
    res.status(500).json({ error: 'Failed to get building' });
  }
};

export const addBuilding = async (req: Request, res: Response) => {
  try {
    const parseResult = insertBuildingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid building data', details: parseResult.error });
    }
    
    const building = await storage.insertBuilding(parseResult.data);
    
    // Log activity
    await storage.insertActivity({
      activity: 'building_added',
      details: { buildingId: building.id, name: building.name }
    });
    
    // Broadcast to connected clients
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('building_added', building);
    }
    
    res.status(201).json(building);
  } catch (error) {
    logger.error('Error adding building', { error, data: req.body });
    res.status(500).json({ error: 'Failed to add building' });
  }
};

export const updateBuilding = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid building ID' });
    }
    
    const building = await storage.getBuilding(id);
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    const updatedBuilding = await storage.updateBuilding(id, req.body);
    
    // Log activity
    await storage.insertActivity({
      activity: 'building_updated',
      details: { buildingId: id, name: updatedBuilding?.name }
    });
    
    // Broadcast to connected clients
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('building_updated', updatedBuilding);
    }
    
    res.json(updatedBuilding);
  } catch (error) {
    logger.error('Error updating building', { error, id: req.params.id, data: req.body });
    res.status(500).json({ error: 'Failed to update building' });
  }
};

export const deleteBuilding = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid building ID' });
    }
    
    const building = await storage.getBuilding(id);
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    const deleted = await storage.deleteBuilding(id);
    if (!deleted) {
      return res.status(400).json({ error: 'Cannot delete building with assigned rooms' });
    }
    
    // Log activity
    await storage.insertActivity({
      activity: 'building_deleted',
      details: { buildingId: id, name: building.name }
    });
    
    // Broadcast to connected clients
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('building_deleted', { id });
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting building', { error, id: req.params.id });
    res.status(500).json({ error: 'Failed to delete building' });
  }
};

// Room controllers
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    let rooms;
    if (req.query.buildingId) {
      const buildingId = parseInt(req.query.buildingId as string);
      if (isNaN(buildingId)) {
        return res.status(400).json({ error: 'Invalid building ID' });
      }
      rooms = await storage.getRoomsByBuilding(buildingId);
    } else {
      rooms = await storage.getAllRooms();
    }
    res.json(rooms);
  } catch (error) {
    logger.error('Error getting rooms', { error, query: req.query });
    res.status(500).json({ error: 'Failed to get rooms' });
  }
};

export const getRoom = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }
    
    const room = await storage.getRoom(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json(room);
  } catch (error) {
    logger.error('Error getting room', { error, id: req.params.id });
    res.status(500).json({ error: 'Failed to get room' });
  }
};

export const addRoom = async (req: Request, res: Response) => {
  try {
    const parseResult = insertRoomSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid room data', details: parseResult.error });
    }
    
    // Check if building exists
    const building = await storage.getBuilding(parseResult.data.building_id);
    if (!building) {
      return res.status(400).json({ error: 'Building not found' });
    }
    
    const room = await storage.insertRoom(parseResult.data);
    
    // Log activity
    await storage.insertActivity({
      activity: 'room_added',
      details: { roomId: room.id, name: room.name, buildingId: room.building_id }
    });
    
    // Broadcast to connected clients
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('room_added', room);
    }
    
    res.status(201).json(room);
  } catch (error) {
    logger.error('Error adding room', { error, data: req.body });
    res.status(500).json({ error: 'Failed to add room' });
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }
    
    const room = await storage.getRoom(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // If building_id is changing, check if new building exists
    if (req.body.building_id && req.body.building_id !== room.building_id) {
      const building = await storage.getBuilding(req.body.building_id);
      if (!building) {
        return res.status(400).json({ error: 'New building not found' });
      }
    }
    
    const updatedRoom = await storage.updateRoom(id, req.body);
    
    // Log activity
    await storage.insertActivity({
      activity: 'room_updated',
      details: { roomId: id, name: updatedRoom?.name }
    });
    
    // Broadcast to connected clients
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('room_updated', updatedRoom);
    }
    
    res.json(updatedRoom);
  } catch (error) {
    logger.error('Error updating room', { error, id: req.params.id, data: req.body });
    res.status(500).json({ error: 'Failed to update room' });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }
    
    const room = await storage.getRoom(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const deleted = await storage.deleteRoom(id);
    
    // Log activity
    await storage.insertActivity({
      activity: 'room_deleted',
      details: { roomId: id, name: room.name }
    });
    
    // Broadcast to connected clients
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('room_deleted', { id });
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting room', { error, id: req.params.id });
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