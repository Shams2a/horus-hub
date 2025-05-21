# Guide d'installation de Horus Hub sur Raspberry Pi

Ce guide vous explique comment installer et configurer Horus Hub, votre plateforme de gestion multi-protocoles IoT, sur un Raspberry Pi.

## Prérequis matériels

- Raspberry Pi 4 (4GB ou 8GB RAM recommandé) ou Raspberry Pi 5
- Carte microSD de 16GB minimum (32GB ou plus recommandé)
- Alimentation officielle Raspberry Pi (3A minimum)
- Adaptateur USB Zigbee comme Conbee II, Sonoff Zigbee 3.0 ou TI CC2531 (pour la compatibilité Zigbee)
- Connexion Ethernet ou WiFi stable
- Boîtier Raspberry Pi recommandé pour une meilleure dissipation thermique

## Prérequis logiciels

- Raspberry Pi OS Lite (64-bit, Debian Bookworm) - version la plus récente
- Node.js v20.11.1 LTS ou supérieur
- PostgreSQL 16 ou supérieur
- Git

## Étapes d'installation

### 1. Préparer le Raspberry Pi

1. Téléchargez et installez le Raspberry Pi Imager depuis [le site officiel](https://www.raspberrypi.com/software/)
2. Insérez votre carte microSD dans votre ordinateur
3. Lancez Raspberry Pi Imager et choisissez:
   - Système d'exploitation: "Raspberry Pi OS Lite (64-bit)"
   - Stockage: votre carte microSD
   - Cliquez sur l'icône d'engrenage pour configurer:
     - Nom d'hôte: "horushub" (ou le nom de votre choix)
     - Activez SSH
     - Créez un nom d'utilisateur et mot de passe
     - Configurez votre WiFi si nécessaire
4. Cliquez sur "Écrire" et attendez la fin de l'opération
5. Insérez la carte microSD dans votre Raspberry Pi et démarrez-le
6. Connectez-vous à votre Raspberry Pi via SSH ou directement avec un clavier/écran

### 2. Mettre à jour le système

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git
```

### 3. Installer Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Vérifiez l'installation:
```bash
node -v  # Devrait afficher v20.x.x
npm -v   # Devrait afficher 10.x.x ou supérieur
```

### 4. Installer PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

Configurer la base de données:
```bash
sudo -u postgres psql

# Dans l'invite psql
CREATE USER horushub WITH PASSWORD 'votre_mot_de_passe_sécurisé';
CREATE DATABASE horushub OWNER horushub;
\q

# Activer et démarrer PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 5. Installer Horus Hub

#### Cloner le dépôt

```bash
git clone https://github.com/votre-organisation/horus-hub.git
cd horus-hub
```

#### Installer les dépendances

```bash
npm install
```

### 6. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet:

```bash
nano .env
```

Ajoutez les configurations suivantes:

```
# Configuration Serveur
PORT=5000
NODE_ENV=production

# Configuration Base de données
DATABASE_URL=postgresql://horushub:votre_mot_de_passe_sécurisé@localhost:5432/horushub

# Configuration Zigbee
ZIGBEE_ADAPTER=/dev/ttyACM0  # Ajustez selon votre adaptateur Zigbee

# Configuration MQTT (optionnel, pour connecter à un broker externe)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
```

Sauvegardez avec Ctrl+O puis Entrée, et quittez avec Ctrl+X.

### 7. Configurer l'adaptateur Zigbee

Si vous utilisez un adaptateur Zigbee USB, vous devez donner à l'utilisateur les permissions d'accès:

```bash
# Identifier le port de l'adaptateur
ls -l /dev/ttyACM* /dev/ttyUSB*

# Ajuster les permissions (exemple pour ttyACM0)
sudo usermod -a -G dialout $USER
sudo chmod 666 /dev/ttyACM0
```

### 8. Initialiser la base de données

```bash
npx drizzle-kit push
```

### 9. Créer un service systemd pour Horus Hub

Créez un fichier de service:

```bash
sudo nano /etc/systemd/system/horushub.service
```

Ajoutez le contenu suivant (ajustez les chemins si nécessaire):

```
[Unit]
Description=Horus Hub IoT Platform
After=network.target postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/horus-hub
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=horushub
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Activez et démarrez le service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable horushub
sudo systemctl start horushub
```

### 10. Vérifier l'installation

Vérifiez le statut du service:

```bash
sudo systemctl status horushub
```

Pour accéder à l'interface Web:
- Depuis le Raspberry Pi: http://localhost:5000
- Depuis d'autres appareils sur le réseau: http://horushub.local:5000 ou http://IP_DU_RASPBERRY:5000

## Dépannage

### Problèmes avec l'adaptateur Zigbee

Si l'adaptateur Zigbee n'est pas détecté:

```bash
# Vérifier les périphériques USB connectés
lsusb

# Vérifier les ports série
dmesg | grep tty

# S'assurer que l'adaptateur est accessible
sudo chmod 666 /dev/ttyACM0  # ou le port correct détecté
```

### Problèmes avec le service

Consultez les journaux pour diagnostiquer les problèmes:

```bash
sudo journalctl -u horushub -f
```

### Problèmes de base de données

```bash
# Se connecter à la base de données
sudo -u postgres psql -d horushub

# Vérifier les tables
\dt

# Quitter
\q
```

## Mises à jour

Pour mettre à jour Horus Hub:

```bash
cd ~/horus-hub
git pull
npm install
npx drizzle-kit push  # Pour les mises à jour de schéma de base de données
sudo systemctl restart horushub
```

## Sauvegarde

Pour sauvegarder votre configuration et vos données:

```bash
# Sauvegarde de la base de données
pg_dump -U horushub -d horushub > backup_$(date +%Y%m%d).sql

# Sauvegarde des fichiers de configuration
cp .env ~/backups/env_backup_$(date +%Y%m%d)
```

## Versions des composants recommandées

| Composant | Version recommandée | Notes |
|-----------|---------------------|-------|
| Raspberry Pi OS | 64-bit Debian Bookworm Lite | Version la plus stable et performante |
| Node.js | 20.11.1 LTS | Support jusqu'en 2026 |
| PostgreSQL | 16.1 | Meilleures performances et fonctionnalités |
| npm | 10.2.4 ou supérieur | Inclus avec Node.js 20 |
| ConBee II | Dernier firmware | Meilleur adaptateur Zigbee pour la compatibilité |
| Drizzle ORM | 0.29.0 ou supérieur | ORM utilisé par l'application |

## Sécurité

Quelques recommandations pour sécuriser votre installation:

1. Utilisez des mots de passe forts pour tous les comptes
2. Activez le pare-feu: `sudo ufw enable`
3. Configurez le pare-feu pour autoriser uniquement les ports nécessaires:
   ```bash
   sudo ufw allow ssh
   sudo ufw allow 5000
   ```
4. Mettez régulièrement à jour le système avec `sudo apt update && sudo apt upgrade`
5. Utilisez HTTPS si vous exposez l'interface sur Internet (voir section suivante)

## Configuration HTTPS (optionnel)

Pour une utilisation plus sécurisée, vous pouvez configurer HTTPS avec un proxy inverse comme Nginx:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Créez une configuration Nginx:

```bash
sudo nano /etc/nginx/sites-available/horushub
```

Ajoutez:

```
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activez la configuration et obtenez un certificat SSL:

```bash
sudo ln -s /etc/nginx/sites-available/horushub /etc/nginx/sites-enabled/
sudo certbot --nginx -d your_domain.com
sudo systemctl restart nginx
```

Votre Horus Hub sera maintenant accessible en HTTPS à l'adresse https://your_domain.com.