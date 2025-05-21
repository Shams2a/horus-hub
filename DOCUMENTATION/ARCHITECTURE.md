# Architecture du système Horus Hub

Ce document décrit l'architecture technique de Horus Hub, sa structure et ses composants principaux pour aider à comprendre comment le système fonctionne.

## Vue d'ensemble

Horus Hub est une plateforme IoT conçue pour connecter et gérer des appareils utilisant différents protocoles (Zigbee, WiFi, MQTT) via une interface unifiée. L'architecture est basée sur un modèle client-serveur avec une conception modulaire qui permet d'étendre facilement les fonctionnalités.

## Architecture générale

![Architecture Horus Hub](./images/architecture.png)

*Note: L'image ci-dessus est une représentation schématique. Si elle n'apparaît pas, consultez le dossier `DOCUMENTATION/images`.*

### Composants principaux

1. **Interface utilisateur**: Application web React qui communique avec le serveur
2. **Serveur API**: Serveur Express.js qui gère les requêtes HTTP et WebSocket
3. **Gestionnaire d'adaptateurs**: Composant central qui coordonne les différents adaptateurs de protocole
4. **Adaptateurs de protocole**: Modules qui implémentent la communication avec les appareils via différents protocoles
5. **Système de stockage**: Couche d'abstraction pour la persistance des données, supportant à la fois le stockage local et cloud
6. **Système de journalisation**: Enregistre les événements et les activités du système

## Architecture détaillée

### Interface utilisateur (Frontend)

- **Technologies**: React, TailwindCSS, shadcn/ui
- **Communication**: REST API et WebSockets pour les mises à jour en temps réel
- **Pages principales**:
  - Dashboard (vue d'ensemble)
  - Gestion des appareils
  - Gestion des emplacements (bâtiments/salles)
  - Pages spécifiques aux protocoles (Zigbee, WiFi, MQTT)
  - Logs système
  - Paramètres

### Serveur API (Backend)

- **Technologies**: Node.js, Express.js
- **Points d'entrée**:
  - API REST pour les opérations CRUD
  - WebSocket pour les communications en temps réel
- **Contrôleurs**: Gèrent les requêtes HTTP et les acheminent vers les services appropriés
- **Middleware**: Gestion de l'authentification, journalisation, validation des données

### Gestionnaire d'adaptateurs

Le gestionnaire d'adaptateurs est le composant central qui:
- Initialise et gère les différents adaptateurs de protocole
- Coordonne la communication entre les adaptateurs
- Propage les changements d'état des appareils vers l'interface utilisateur via WebSocket
- Gère les événements système comme la détection de nouveaux appareils

### Adaptateurs de protocole

Chaque adaptateur implémente une interface commune et se spécialise dans un protocole spécifique:

#### Adaptateur Zigbee
- Communique avec le coordinateur Zigbee (adaptateur USB)
- Gère le processus d'appairage des appareils
- Normalise les données des appareils Zigbee dans un format commun

#### Adaptateur WiFi
- Découvre les appareils WiFi sur le réseau local
- Communique avec les appareils via leurs API REST respectives
- Supporte les protocoles courants (HTTP, HTTPS, mDNS)

#### Adaptateur MQTT
- Se connecte à un broker MQTT local ou cloud
- Gère les abonnements aux topics pertinents
- Publie les changements d'état vers le broker

### Système de stockage

Le système de stockage utilise une architecture en couches:

1. **Interface de stockage**: Définit les opérations CRUD communes
2. **Implémentations de stockage**:
   - **Stockage mémoire**: Pour le développement et les tests
   - **Stockage base de données**: Persistance PostgreSQL

La couche de stockage gère:
- Les métadonnées des appareils
- L'état actuel des appareils
- Les informations sur les bâtiments et les salles
- Les logs système
- Les paramètres de configuration

### Schéma de base de données

La base de données PostgreSQL comprend les tables principales suivantes:

- **adapters**: Configurations des adaptateurs de protocole
- **devices**: Informations sur les appareils connectés
- **buildings**: Représentation des bâtiments physiques
- **rooms**: Salles au sein des bâtiments
- **logs**: Événements système
- **settings**: Paramètres de configuration
- **activities**: Actions utilisateur et événements système importants

## Flux de données

### Découverte d'appareils

1. L'utilisateur active la découverte d'appareils dans l'interface
2. La requête est envoyée à l'adaptateur approprié via le serveur API
3. L'adaptateur lance le processus de découverte spécifique au protocole
4. Les appareils détectés sont normalisés et stockés dans la base de données
5. Les mises à jour sont envoyées à l'interface utilisateur via WebSocket

### Mise à jour de l'état des appareils

1. Un changement d'état est détecté par un adaptateur de protocole
2. L'adaptateur normalise les données et les transmet au gestionnaire d'adaptateurs
3. Le gestionnaire d'adaptateurs met à jour l'état dans la base de données
4. Le changement est diffusé à tous les clients connectés via WebSocket
5. L'interface utilisateur se met à jour pour refléter le nouvel état

## Sécurité

### Authentification et autorisation

- Authentification basée sur des sessions pour l'interface utilisateur
- Possibilité d'intégration avec des systèmes d'authentification externes (OAuth)
- Autorisation basée sur les rôles (administrateur, utilisateur)

### Sécurité des communications

- Support HTTPS pour les communications web (via Nginx en production)
- Support TLS pour les connexions MQTT
- Validation des données entrantes

## Extensibilité

L'architecture modulaire de Horus Hub permet une extension facile:

1. **Nouveaux adaptateurs**: Possibilité d'ajouter de nouveaux protocoles en implémentant l'interface adaptateur
2. **API extensible**: Points d'extension pour les plugins tiers
3. **Événements système**: Architecture basée sur les événements pour découpler les composants

## Considérations de déploiement

### Déploiement standard (Raspberry Pi)

Dans un déploiement standard sur Raspberry Pi:
- L'application fonctionne comme un service systemd
- La base de données PostgreSQL est sur le même appareil
- L'accès est généralement limité au réseau local

### Déploiement avancé

Pour des installations plus avancées:
- Base de données cloud (PostgreSQL serverless)
- Proxy inverse (Nginx) pour la sécurité et mise en cache
- Possibilité de déploiement en cluster (plusieurs instances)

## Limites et considérations

- **Ressources matérielles**: Les performances dépendent des spécifications du Raspberry Pi
- **Sécurité**: L'exposition directe à Internet n'est pas recommandée sans mesures supplémentaires
- **Évolutivité**: Conçu pour des environnements domestiques ou petites entreprises (<100 appareils)
- **Protocoles**: Support initial pour Zigbee, WiFi et MQTT, avec possibilité d'extension