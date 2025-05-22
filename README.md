# Horus Hub - IoT Management Platform

Plateforme de gestion IoT multi-protocoles conçue pour Raspberry Pi, permettant la gestion transparente d'appareils Zigbee, WiFi et MQTT avec une interface web moderne.

## 🎯 Fonctionnalités

- **Support multi-protocoles** : Zigbee, WiFi, MQTT
- **Interface web moderne** : Dashboard temps réel avec thème sombre/clair
- **Gestion avancée** : Organisation par bâtiments et pièces
- **Monitoring complet** : Logs détaillés et diagnostic automatique
- **Base de données** : Stockage PostgreSQL pour la persistance
- **Architecture modulaire** : Adaptateurs extensibles

## 🔧 Prérequis

### Matériel requis
- **Raspberry Pi 4** (recommandé) ou Raspberry Pi 3B+
- **Carte SD** : 32GB classe 10 minimum
- **Adaptateur Zigbee** : CC2531, ConBee II, ou Sonoff Zigbee 3.0
- **Connexion réseau** : Ethernet ou WiFi

### Système d'exploitation
- Raspberry Pi OS (64-bit) - version récente
- Ubuntu Server 22.04 LTS pour Raspberry Pi
- Debian 11+ compatible

## 📦 Installation

### Étape 1 : Préparation du système

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation des dépendances système
sudo apt install -y curl git build-essential python3-dev
```

### Étape 2 : Installation de Node.js

```bash
# Installation de Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérification
node --version  # doit afficher v20.x.x
npm --version   # doit afficher 10.x.x
```

### Étape 3 : Installation de PostgreSQL

```bash
# Installation de PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Configuration initiale
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Création de la base de données
sudo -u postgres createuser --interactive --pwprompt horushub
sudo -u postgres createdb -O horushub horushub_db
```

### Étape 4 : Clonage et installation de l'application

```bash
# Clonage du projet
git clone <votre-repo-url> horus-hub
cd horus-hub

# Installation des dépendances
npm install

# Configuration de la base de données
export DATABASE_URL="postgresql://horushub:votre_mot_de_passe@localhost:5432/horushub_db"

# Initialisation du schéma
npm run db:push
```

### Étape 5 : Configuration des adaptateurs

#### Configuration Zigbee

```bash
# Identification du port de votre adaptateur Zigbee
ls /dev/ttyUSB* /dev/ttyACM*

# Attribution des permissions
sudo usermod -a -G dialout $USER
sudo chmod 666 /dev/ttyUSB0  # ou votre port Zigbee

# Redémarrage pour appliquer les permissions
sudo reboot
```

#### Configuration réseau

```bash
# Pour les adaptateurs WiFi, assurez-vous que le Pi est connecté
iwconfig  # vérification WiFi
ip addr   # vérification IP
```

## 🚀 Démarrage

### Mode développement

```bash
# Démarrage avec hot-reload
npm run dev

# L'application sera accessible sur http://votre-ip-pi:5000
```

### Mode production

```bash
# Construction de l'application
npm run build

# Démarrage en production
npm start

# Ou avec PM2 pour la gestion des processus
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔧 Configuration système

### Service systemd (recommandé pour production)

Créez `/etc/systemd/system/horus-hub.service` :

```ini
[Unit]
Description=Horus Hub IoT Platform
After=network.target postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/horus-hub
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://horushub:votre_mot_de_passe@localhost:5432/horushub_db
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activation du service :

```bash
sudo systemctl enable horus-hub
sudo systemctl start horus-hub
sudo systemctl status horus-hub
```

### Configuration réseau

```bash
# Ouverture du port dans le firewall (si activé)
sudo ufw allow 5000/tcp

# Configuration IP statique (optionnel)
# Éditez /etc/dhcpcd.conf pour une IP fixe
```

## 📱 Premier démarrage

### 1. Accès à l'interface web

Ouvrez votre navigateur et allez sur :
```
http://[IP-de-votre-Pi]:5000
```

### 2. Configuration initiale

1. **Paramètres généraux** : Nom du système, localisation
2. **Configuration réseau** : Vérifiez les paramètres réseau
3. **Protocoles** :
   - **Zigbee** : Port série (ex: `/dev/ttyUSB0`)
   - **WiFi** : Plage IP à scanner
   - **MQTT** : URL et identifiants de votre broker

### 3. Test des adaptateurs

1. Allez dans **Adaptateurs** pour vérifier l'état
2. Utilisez **Diagnostic** pour identifier les problèmes
3. Consultez **Logs** pour le debug détaillé

## 🔌 Configuration des adaptateurs

### Zigbee (CC2531/ConBee)

```bash
# Vérification du port
dmesg | grep tty
lsusb  # pour identifier votre adaptateur

# Test de communication
sudo apt install minicom
minicom -D /dev/ttyUSB0 -b 115200
```

### WiFi (Appareils IoT)

L'adaptateur WiFi scanne automatiquement votre réseau local pour détecter les appareils IoT compatibles (Nest, Philips Hue Bridge, etc.).

### MQTT (Broker cloud)

Configurez votre broker MQTT cloud dans **MQTT > Configuration** :
- URL : `mqtt://votre-broker.com` ou `mqtts://` pour SSL
- Port : 1883 (standard) ou 8883 (SSL)
- Identifiants : username/password

## 📊 Monitoring et maintenance

### Logs système

```bash
# Logs de l'application
sudo journalctl -u horus-hub -f

# Logs PostgreSQL
sudo journalctl -u postgresql -f

# Utilisation des ressources
htop
df -h
```

### Sauvegarde

```bash
# Sauvegarde de la base de données
pg_dump -U horushub horushub_db > backup_$(date +%Y%m%d).sql

# Restauration
psql -U horushub -d horushub_db < backup_20250522.sql
```

### Mise à jour

```bash
cd horus-hub
git pull origin main
npm install
npm run db:push
sudo systemctl restart horus-hub
```

## 🛠 Dépannage

### Problèmes courants

**Zigbee non détecté :**
```bash
# Vérifiez les permissions
sudo chmod 666 /dev/ttyUSB0
sudo usermod -a -G dialout $USER
```

**Base de données inaccessible :**
```bash
# Redémarrage PostgreSQL
sudo systemctl restart postgresql
# Vérification de la connexion
psql -U horushub -d horushub_db
```

**Port 5000 déjà utilisé :**
```bash
# Vérification des processus
sudo netstat -tulpn | grep :5000
# Changement de port dans les variables d'environnement
export PORT=8080
```

### Logs de debug

Activez le mode debug pour plus d'informations :

```bash
export DEBUG=horus:*
npm run dev
```

## 🔐 Sécurité

### Recommandations

1. **Changez les mots de passe par défaut**
2. **Activez le firewall** : `sudo ufw enable`
3. **Mettez à jour régulièrement** le système et l'application
4. **Configurez SSL/TLS** pour l'accès distant
5. **Limitez l'accès réseau** aux ports nécessaires

### Configuration SSL (optionnel)

Pour un accès HTTPS sécurisé, utilisez un reverse proxy nginx :

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Configuration nginx pour Horus Hub
# Créez /etc/nginx/sites-available/horus-hub
```

## 📞 Support

### Ressources

- **Documentation** : Consultez le guide `GUIDE_TESTS_REEL.md`
- **Logs applicatifs** : Interface web > Logs
- **Diagnostic** : Interface web > Diagnostic

### Collecte d'informations pour le support

```bash
# Informations système
uname -a
lsb_release -a
node --version
npm --version

# État des services
sudo systemctl status horus-hub
sudo systemctl status postgresql

# Logs récents
sudo journalctl -u horus-hub --since "1 hour ago"
```

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

---

**Note** : Cette application est optimisée pour Raspberry Pi et a été testée sur Raspberry Pi 4 avec 4GB de RAM. Pour des performances optimales, utilisez une carte SD rapide (classe 10 ou mieux) ou un SSD via USB.