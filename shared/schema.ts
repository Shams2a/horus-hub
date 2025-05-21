import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Protocol adapters
export const adapters = pgTable("adapters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // zigbee, wifi, matter, thread, zwave
  status: text("status").notNull().default("inactive"), // active, inactive, error
  config: jsonb("config").notNull().default({}),
  lastSeen: timestamp("lastSeen"),
});

export const insertAdapterSchema = createInsertSchema(adapters).omit({
  id: true,
  lastSeen: true,
});

// Devices connected to the hub
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  deviceId: text("deviceId").notNull(), // External identifier (IEEE address, MAC, etc.)
  type: text("type").notNull(), // light, switch, sensor, etc.
  protocol: text("protocol").notNull(), // zigbee, wifi, matter, thread, zwave
  model: text("model"),
  manufacturer: text("manufacturer"),
  location: text("location"),
  status: text("status").notNull().default("offline"), // online, offline, error
  battery: integer("battery"), // Battery percentage if applicable
  lastSeen: timestamp("lastSeen"),
  config: jsonb("config").notNull().default({}),
  state: jsonb("state").notNull().default({}),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  lastSeen: true,
});

// System logs
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  level: text("level").notNull(), // info, warning, error, debug
  source: text("source").notNull(), // system, zigbee, wifi, mqtt, etc.
  message: text("message").notNull(),
  details: jsonb("details")
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  timestamp: true,
});

// System settings
export const settings = pgTable("settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: jsonb("value").notNull(),
  category: text("category").notNull(), // general, mqtt, zigbee, wifi, etc.
  description: text("description"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow()
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  updatedAt: true,
});

// Buildings for organizing rooms
export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Rooms for organizing devices
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  capacity: integer("capacity"),
  features: jsonb("features").notNull().default([]),
  status: text("status").notNull().default("active"), // active, inactive
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  building_id: integer("building_id").notNull(), // Foreign key to buildings table
  floor: integer("floor").notNull().default(1),
  description: text("description"),
  type: text("type"), // bedroom, living room, kitchen, etc.
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Activity log (device state changes, connections, etc.)
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  deviceId: integer("deviceId"), // Can be null for system-level activities
  activity: text("activity").notNull(),
  details: jsonb("details").notNull().default({}),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  timestamp: true,
});

// Types
export type Adapter = typeof adapters.$inferSelect;
export type InsertAdapter = z.infer<typeof insertAdapterSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Validation schemas for MQTT messages
export const mqttMessageSchema = z.object({
  topic: z.string(),
  payload: z.any(),
  qos: z.number().optional(),
  retain: z.boolean().optional(),
});

// Device state update schema
export const deviceStateUpdateSchema = z.object({
  deviceId: z.string(),
  state: z.record(z.any()),
  protocol: z.string().optional(),
});

// Database configuration schema
export const databaseConfigSchema = z.object({
  useCloud: z.boolean().default(false),
  cloudDatabaseUrl: z.string().optional(),
  syncMode: z.enum(['readonly', 'writeonly', 'full']).default('full'),
  syncInterval: z.number().default(60) // in minutes
});
