import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import logger from './utils/logger';

// Configure Neon database to use WebSockets
neonConfig.webSocketConstructor = ws;

// Database connection configuration
let databaseUrl = process.env.DATABASE_URL;

// Function to initialize the database connection
export function initializeDb(cloudUrl?: string) {
  try {
    // If a cloud URL is provided and it's different from the current one, update it
    if (cloudUrl && cloudUrl !== databaseUrl) {
      databaseUrl = cloudUrl;
      logger.info('Switched to cloud database connection');
    }

    if (!databaseUrl) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }

    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool, { schema });
    
    logger.info('Database connection initialized successfully');
    return { pool, db };
  } catch (error) {
    logger.error('Failed to initialize database connection', { error });
    throw error;
  }
}

// Initialize the default database connection
const { pool, db } = initializeDb();

export { pool, db };