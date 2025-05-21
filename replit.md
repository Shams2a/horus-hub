# Horus Hub - Smart Home Automation Platform

## Overview

Horus Hub is a smart home automation platform designed to connect and manage various IoT devices through different protocols. The system consists of a React-based frontend client and a Node.js Express backend, with Drizzle ORM for database interactions. The application is built to support multiple connectivity protocols (Zigbee, WiFi, MQTT, etc.) and provide a unified interface for managing smart home devices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with:
- **React** as the UI framework
- **TailwindCSS** for styling
- **shadcn/ui** components
- **React Query** for data fetching
- **Wouter** for routing

The UI follows a modern design system with light/dark mode support and is organized around protocol-specific pages and a centralized dashboard.

### Backend Architecture

The backend uses:
- **Express.js** as the web server framework
- **Drizzle ORM** for database interactions
- **WebSockets** for real-time communication
- **Adapter Pattern** for protocol implementations

The backend is designed with a modular architecture where different protocol adapters can be plugged in and managed through a unified API.

### Data Storage

- **PostgreSQL** database (through Drizzle ORM)
- Schema includes tables for devices, adapters, logs, and settings
- Relational model keeps track of all connected devices and their states

### Communication Layer

- **REST API** for CRUD operations
- **WebSockets** for real-time state updates
- Events system for internal communication between modules

## Key Components

### Protocol Adapters

The system uses an adapter pattern to integrate different smart home protocols:

1. **Zigbee Adapter**: Connects to Zigbee devices (lights, sensors, etc.)
2. **WiFi Adapter**: Manages WiFi-connected smart devices
3. **MQTT Adapter**: Provides MQTT protocol support for compatible devices

Each adapter implements a common interface for device discovery, state management, and command execution.

### Device Management

- Device discovery and onboarding
- State monitoring and control
- Grouping and automation
- Configuration management

### Logging System

- Centralized logging with filtering capabilities
- Different log levels (debug, info, warning, error)
- Activity tracking for user and system events

### Settings Management

- System-wide configuration
- Protocol-specific settings
- User preferences

## Data Flow

1. **Device Communication**:
   - Adapters communicate with physical devices using their native protocols
   - State changes from devices are captured by adapters and normalized
   - Device commands flow from the UI through the backend to the appropriate adapter

2. **State Management**:
   - Device states are stored in the database
   - Real-time updates are pushed to connected clients via WebSockets
   - Historical state data is available for reporting and automation

3. **User Interactions**:
   - User actions in the UI trigger API calls to the backend
   - Backend processes commands and routes them to appropriate adapters
   - Feedback and state changes are communicated back to the UI

## External Dependencies

- **Drizzle ORM**: Database ORM for PostgreSQL
- **@radix-ui** components: UI component primitives
- **TanStack Query**: Data fetching and state management
- **shadcn/ui**: UI component library built on Radix UI
- **WebSockets**: Real-time communication
- **@neondatabase/serverless**: Serverless PostgreSQL client

## Deployment Strategy

The application is configured to deploy on Replit's infrastructure:

- **Development**: `npm run dev` starts both frontend and backend in development mode
- **Production**: 
  - `npm run build` bundles the React app and builds the server
  - `npm run start` runs the production build
- **Database**: 
  - Uses environment variables for database configuration
  - Need to provision a PostgreSQL database and set `DATABASE_URL`

### Development Workflow

1. Run `npm run dev` to start the development server
2. Access the application at the provided port (5000)
3. Use `drizzle-kit` for database schema changes:
   - `npm run db:push` to push schema changes to the database

### Production Considerations

- The application uses environment variables for configuration
- In production, set `NODE_ENV=production`
- Consider adding proper authentication and authorization
- Implement proper error handling and monitoring

## Getting Started

1. Ensure PostgreSQL is available (via Replit's PostgreSQL module)
2. Set up the `DATABASE_URL` environment variable
3. Run `npm install` to install dependencies
4. Run `npm run db:push` to initialize the database schema
5. Start the development server with `npm run dev`