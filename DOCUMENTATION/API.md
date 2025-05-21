# Documentation de l'API Horus Hub

Ce document décrit les points d'accès (endpoints) de l'API REST et WebSocket de Horus Hub, permettant l'intégration avec d'autres systèmes.

## Introduction

L'API Horus Hub permet d'interagir programmatiquement avec la plateforme pour:
- Obtenir des informations sur les appareils connectés
- Récupérer l'état des appareils
- Gérer les emplacements (bâtiments et pièces)
- Accéder aux journaux système
- Configurer la plateforme

## Base URL

Toutes les URLs de l'API commencent par:

```
http://<adresse-raspberry-pi>:5000/api
```

Par exemple: `http://horushub.local:5000/api/devices`

## Authentification

L'API nécessite une authentification via un cookie de session. Pour obtenir une session:

1. Effectuez une requête POST à `/api/auth/login` avec les identifiants configurés
2. Utilisez le cookie de session retourné dans les requêtes suivantes

## Points d'accès de l'API REST

### Appareils

#### Obtenir tous les appareils

```
GET /api/devices
```

Paramètres de requête optionnels:
- `protocol` - Filtrer par protocole (zigbee, wifi, mqtt)
- `status` - Filtrer par statut (online, offline)

Exemple de réponse:
```json
[
  {
    "id": 1,
    "name": "Living Room Thermostat",
    "deviceId": "192.168.1.120",
    "type": "thermostat",
    "protocol": "wifi",
    "model": "Learning Thermostat",
    "manufacturer": "Nest",
    "status": "online",
    "config": {},
    "state": {
      "temperature": 21.5,
      "targetTemperature": 22,
      "mode": "heat"
    },
    "lastSeen": "2025-05-21T22:28:05.894Z"
  }
]
```

#### Obtenir un appareil par ID

```
GET /api/devices/:id
```

Exemple de réponse:
```json
{
  "id": 1,
  "name": "Living Room Thermostat",
  "deviceId": "192.168.1.120",
  "type": "thermostat",
  "protocol": "wifi",
  "model": "Learning Thermostat",
  "manufacturer": "Nest",
  "status": "online",
  "config": {},
  "state": {
    "temperature": 21.5,
    "targetTemperature": 22,
    "mode": "heat"
  },
  "lastSeen": "2025-05-21T22:28:05.894Z"
}
```

#### Mettre à jour un appareil

```
PUT /api/devices/:id
```

Corps de la requête:
```json
{
  "name": "Kitchen Thermostat",
  "config": {
    "tempOffset": 0.5
  }
}
```

### Bâtiments et salles

#### Obtenir tous les bâtiments

```
GET /api/buildings
```

Exemple de réponse:
```json
[
  {
    "id": 1,
    "name": "Maison Principale",
    "address": "123 Rue Principale",
    "created_at": "2025-05-21T22:25:48.804Z",
    "updated_at": "2025-05-21T22:25:48.804Z"
  }
]
```

#### Ajouter un bâtiment

```
POST /api/buildings
```

Corps de la requête:
```json
{
  "name": "Villa secondaire",
  "address": "45 Avenue des Fleurs"
}
```

#### Obtenir toutes les salles

```
GET /api/rooms
```

Paramètres de requête optionnels:
- `buildingId` - Filtrer par ID de bâtiment

Exemple de réponse:
```json
[
  {
    "id": 1,
    "name": "Salon",
    "building_id": 1,
    "floor": 1,
    "description": "Pièce principale",
    "type": "living",
    "capacity": 6,
    "features": [],
    "created_at": "2025-05-21T22:25:58.853Z",
    "updated_at": "2025-05-21T22:25:58.853Z"
  }
]
```

#### Ajouter une salle

```
POST /api/rooms
```

Corps de la requête:
```json
{
  "name": "Chambre principale",
  "building_id": 1,
  "floor": 1,
  "type": "bedroom",
  "capacity": 2,
  "description": "Chambre avec salle de bain attenante",
  "features": []
}
```

### Adaptateurs de protocole

#### Obtenir le statut Zigbee

```
GET /api/zigbee/status
```

Exemple de réponse:
```json
{
  "coordinator": "zStack",
  "panId": "0x1a62",
  "channel": 15,
  "extendedPanId": "0xdddddddddddddddd",
  "networkKeyDistributed": true,
  "permitJoin": false,
  "devices": 3
}
```

#### Activer l'appairage Zigbee

```
POST /api/zigbee/permit-join
```

Corps de la requête:
```json
{
  "duration": 60
}
```

#### Obtenir le statut WiFi

```
GET /api/wifi/status
```

Exemple de réponse:
```json
{
  "networkName": "HorusHubNetwork",
  "ipAddress": "192.168.1.10",
  "macAddress": "B8:27:EB:XX:XX:XX",
  "signal": 80,
  "devices": 2,
  "scanInterval": 1800
}
```

#### Déclencher un scan WiFi

```
POST /api/wifi/scan
```

#### Obtenir le statut MQTT

```
GET /api/mqtt/status
```

Exemple de réponse:
```json
{
  "connected": true,
  "messagesPublished": 156,
  "messagesReceived": 243,
  "lastMessageTime": "2025-05-21T22:28:06.496Z",
  "reconnectCount": 0
}
```

#### Obtenir les topics MQTT

```
GET /api/mqtt/topics
```

Exemple de réponse:
```json
[
  {
    "topic": "home/livingroom/temperature",
    "qos": 0,
    "lastMessage": {
      "value": 22.5,
      "timestamp": "2025-05-21T22:20:00.123Z"
    }
  }
]
```

#### S'abonner à un topic MQTT

```
POST /api/mqtt/subscribe
```

Corps de la requête:
```json
{
  "topic": "home/bedroom/temperature",
  "qos": 1
}
```

#### Publier un message MQTT

```
POST /api/mqtt/publish
```

Corps de la requête:
```json
{
  "topic": "home/lights/livingroom/set",
  "message": {
    "state": "ON",
    "brightness": 100
  },
  "options": {
    "qos": 1,
    "retain": false
  }
}
```

### Logs système

#### Obtenir les logs

```
GET /api/logs
```

Paramètres de requête optionnels:
- `level` - Niveau de log (debug, info, warning, error)
- `source` - Source du log (system, zigbee, wifi, mqtt)
- `search` - Recherche textuelle dans les logs
- `limit` - Nombre de logs à retourner (par défaut: 100)
- `offset` - Décalage pour la pagination

Exemple de réponse:
```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2025-05-21T22:28:05.806Z",
      "level": "info",
      "source": "system",
      "message": "Database connection initialized successfully",
      "details": {}
    }
  ],
  "totalCount": 256
}
```

#### Effacer les logs

```
DELETE /api/logs
```

### Paramètres système

#### Obtenir les paramètres

```
GET /api/settings
```

Exemple de réponse:
```json
{
  "general": {
    "systemName": "Horus Hub",
    "theme": "dark",
    "language": "fr"
  },
  "zigbee": {
    "port": "/dev/ttyACM0",
    "panId": "auto",
    "channel": 15
  },
  "wifi": {
    "scanInterval": 1800,
    "ipRange": "192.168.1.0/24",
    "timeout": 2000
  },
  "mqtt": {
    "url": "mqtt://localhost:1883",
    "clientId": "horus-hub",
    "username": "",
    "password": ""
  }
}
```

#### Mettre à jour les paramètres par catégorie

```
PUT /api/settings/:category
```

Exemple pour mettre à jour les paramètres MQTT:
```
PUT /api/settings/mqtt
```

Corps de la requête:
```json
{
  "url": "mqtt://broker.hivemq.com:1883",
  "clientId": "horus-hub-prod",
  "username": "user",
  "password": "password"
}
```

### Base de données

#### Obtenir la configuration de la base de données

```
GET /api/database/config
```

Exemple de réponse:
```json
{
  "local": {
    "enabled": true,
    "status": "connected"
  },
  "cloud": {
    "enabled": false,
    "url": "",
    "status": "disconnected"
  },
  "sync": {
    "enabled": false,
    "interval": 3600,
    "lastSync": null
  }
}
```

#### Mettre à jour la configuration de la base de données

```
PUT /api/database/config
```

Corps de la requête:
```json
{
  "cloud": {
    "enabled": true,
    "url": "postgresql://user:password@db.example.com:5432/horushub"
  },
  "sync": {
    "enabled": true,
    "interval": 1800
  }
}
```

#### Tester la connexion à la base de données

```
POST /api/database/test
```

Corps de la requête:
```json
{
  "url": "postgresql://user:password@db.example.com:5432/horushub"
}
```

## API WebSocket

Horus Hub fournit également une API WebSocket pour les mises à jour en temps réel.

### Connexion

```
ws://<adresse-raspberry-pi>:5000/ws
```

### Messages

Les messages WebSocket sont au format JSON avec la structure suivante:

```json
{
  "type": "event_type",
  "data": {
    // Contenu spécifique à l'événement
  }
}
```

### Types d'événements

#### device_updated

Envoyé lorsque l'état d'un appareil change:

```json
{
  "type": "device_updated",
  "data": {
    "id": 1,
    "deviceId": "192.168.1.120",
    "protocol": "wifi",
    "state": {
      "temperature": 22.5,
      "targetTemperature": 22,
      "mode": "heat"
    },
    "status": "online",
    "lastSeen": "2025-05-21T22:35:12.345Z"
  }
}
```

#### device_added

Envoyé lorsqu'un nouvel appareil est découvert:

```json
{
  "type": "device_added",
  "data": {
    "id": 6,
    "name": "New Motion Sensor",
    "deviceId": "0x00158d0003a4b5c6",
    "type": "sensor",
    "protocol": "zigbee",
    "model": "Motion Sensor",
    "manufacturer": "Aqara",
    "status": "online",
    "config": {},
    "state": {
      "motionDetected": false
    },
    "lastSeen": "2025-05-21T22:36:45.678Z"
  }
}
```

#### device_removed

Envoyé lorsqu'un appareil est supprimé:

```json
{
  "type": "device_removed",
  "data": {
    "id": 3,
    "deviceId": "0x00158d0001d86c3e"
  }
}
```

#### adapter_status

Envoyé lorsque le statut d'un adaptateur change:

```json
{
  "type": "adapter_status",
  "data": {
    "protocol": "zigbee",
    "status": "online",
    "details": {
      "permitJoin": true,
      "remainingTime": 58
    }
  }
}
```

#### log_entry

Envoyé lorsqu'un nouveau log est créé:

```json
{
  "type": "log_entry",
  "data": {
    "id": 257,
    "timestamp": "2025-05-21T22:40:12.345Z",
    "level": "warning",
    "source": "zigbee",
    "message": "Device lost connection",
    "details": {
      "deviceId": "0x00158d0001d86c3e"
    }
  }
}
```

## Codes d'erreur

L'API retourne des codes d'erreur HTTP standard:

- `200 OK` - Requête réussie
- `201 Created` - Ressource créée avec succès
- `400 Bad Request` - Requête invalide ou mal formée
- `401 Unauthorized` - Authentification requise
- `403 Forbidden` - Accès interdit
- `404 Not Found` - Ressource introuvable
- `500 Internal Server Error` - Erreur serveur

Les réponses d'erreur incluent un corps JSON avec plus de détails:

```json
{
  "error": "Invalid request",
  "details": "Missing required field: topic"
}
```

## Limites de l'API

- **Taux de requêtes**: Maximum 60 requêtes par minute
- **Taille des réponses**: Les listes sont limitées à 100 éléments par défaut
- **WebSocket**: Maximum 5 connexions simultanées par adresse IP

## Conseils d'utilisation

- Utilisez les paramètres de pagination (`limit` et `offset`) pour les requêtes qui retournent un grand nombre d'éléments
- Privilégiez l'API WebSocket pour les applications nécessitant des mises à jour en temps réel
- Limitez la fréquence des requêtes pour éviter les surcharges sur le Raspberry Pi