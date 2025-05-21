# Guide de configuration de Horus Hub

Ce document explique comment configurer les différents aspects de Horus Hub après son installation.

## Configuration générale

### Interface web

Après avoir installé Horus Hub, vous pouvez accéder à l'interface web à:
- `http://[adresse-ip-raspberry-pi]:5000` ou 
- `http://horushub.local:5000` (si vous avez configuré mDNS)

L'interface web vous permet de:
- Visualiser les appareils connectés
- Gérer les paramètres des différents protocoles
- Organiser vos appareils par emplacements (bâtiments et pièces)
- Visualiser les logs système
- Configurer les paramètres globaux

## Organisation des emplacements

Vous pouvez organiser vos appareils par emplacements physiques:

1. Créez des bâtiments dans l'onglet "Emplacements" > "Bâtiments"
2. Ajoutez des salles à chaque bâtiment dans l'onglet "Emplacements" > "Salles"
3. Associez vos appareils à ces emplacements pour mieux les organiser

## Configuration des protocoles

### Configuration Zigbee

Pour configurer l'adaptateur Zigbee:

1. Connectez votre adaptateur Zigbee à un port USB du Raspberry Pi
2. Accédez à "Paramètres" > "Zigbee" dans l'interface
3. Configurez:
   - Port: généralement `/dev/ttyACM0` ou `/dev/ttyUSB0`
   - PAN ID: identifiant de votre réseau Zigbee (laissez vide pour auto-configuration)
   - Canal: 15, 20 ou 25 recommandés (pour éviter les interférences WiFi)
   - Mode de pairage: définit la durée pendant laquelle le mode appairage est activé

Conseil: Pour déterminer le port exact de votre adaptateur Zigbee, exécutez dans un terminal:
```bash
ls -l /dev/ttyACM* /dev/ttyUSB*
```

### Configuration WiFi

La configuration WiFi permet à Horus Hub de communiquer avec les appareils connectés à votre réseau:

1. Accédez à "Paramètres" > "WiFi" dans l'interface
2. Configurez:
   - Intervalle de scan: fréquence à laquelle Horus Hub recherche des appareils WiFi
   - Plage d'adresses IP: plage d'adresses à scanner pour trouver des appareils
   - Timeout de connexion: temps d'attente maximal pour la réponse d'un appareil

### Configuration MQTT

Pour connecter Horus Hub à un broker MQTT (local ou cloud):

1. Accédez à "Paramètres" > "MQTT" dans l'interface
2. Configurez:
   - URL du broker: adresse du broker MQTT (ex: `mqtt://broker.hivemq.com:1883`)
   - Identifiant client: identifiant unique pour Horus Hub
   - Nom utilisateur/Mot de passe: si votre broker nécessite une authentification
   - Topics à suivre: liste des topics MQTT auxquels s'abonner
   - QoS: niveau de qualité de service (0, 1 ou 2)

## Configuration de la base de données

Horus Hub utilise PostgreSQL pour stocker les données. Vous pouvez configurer:

1. La base de données locale:
   - Déjà configurée par défaut avec l'installation
   - Les données sont stockées localement sur le Raspberry Pi

2. Une base de données cloud (optionnel):
   - Accédez à "Paramètres" > "Base de données" dans l'interface
   - Configurez l'URL de connexion à votre base de données cloud
   - Vous pouvez utiliser des services comme:
     - Neon (PostgreSQL serverless)
     - DigitalOcean PostgreSQL
     - Amazon RDS
     - Azure Database for PostgreSQL

## Sécurisation

### Authentification

Par défaut, l'accès à l'interface web est restreint à votre réseau local. Pour renforcer la sécurité:

1. Configurez un mot de passe administrateur:
   - Accédez à "Paramètres" > "Général" > "Sécurité"
   - Définissez un nom d'utilisateur et mot de passe pour l'interface web

2. Activation de HTTPS (recommandé si accessible depuis Internet):
   - Suivez les instructions dans le document d'installation pour configurer Nginx avec Let's Encrypt

### Pare-feu

Si vous exposez Horus Hub à l'extérieur de votre réseau local, assurez-vous que seuls les ports nécessaires sont ouverts:

- Port 5000 pour l'interface web
- Ports spécifiques pour les brokers MQTT externes si nécessaire

## Paramètres avancés

### Logs système

Configurez la journalisation:

1. Accédez à "Paramètres" > "Général" > "Journalisation"
2. Définissez:
   - Niveau de journalisation (debug, info, warning, error)
   - Nombre de jours de conservation des logs
   - Activer/désactiver la journalisation dans la console

### Sauvegarde et restauration

Pour sauvegarder votre configuration:

1. Accédez à "Paramètres" > "Sauvegarde et restauration"
2. Options:
   - Créer une sauvegarde complète (configuration et données)
   - Restaurer depuis une sauvegarde précédente
   - Planifier des sauvegardes automatiques

### Mises à jour automatiques

Configurez les mises à jour automatiques:

1. Accédez à "Paramètres" > "Général" > "Mises à jour"
2. Options:
   - Vérifier automatiquement les mises à jour
   - Télécharger automatiquement les mises à jour
   - Installer automatiquement les mises à jour

## Dépannage

### Problèmes de détection d'appareils Zigbee

Si vos appareils Zigbee ne sont pas détectés:

1. Vérifiez que l'adaptateur est correctement branché et reconnu
2. Assurez-vous que le port configuré est correct
3. Redémarrez l'adaptateur Zigbee depuis l'interface: "Zigbee" > "Options" > "Redémarrer l'adaptateur"
4. Placez l'appareil en mode appairage selon les instructions du fabricant
5. Activez le mode d'appairage dans l'interface Horus Hub

### Problèmes de connexion MQTT

Si la connexion au broker MQTT échoue:

1. Vérifiez que l'URL du broker est correcte
2. Assurez-vous que les identifiants d'authentification sont valides
3. Vérifiez que le broker est accessible depuis votre réseau
4. Consultez les logs pour plus de détails sur l'erreur

### Problèmes de base de données

Si des erreurs de base de données surviennent:

1. Vérifiez que PostgreSQL est en cours d'exécution: `sudo systemctl status postgresql`
2. Assurez-vous que les informations de connexion sont correctes
3. Vérifiez l'espace disque disponible: `df -h`

## Optimisation des performances

Pour optimiser les performances de Horus Hub sur votre Raspberry Pi:

1. Limitez le nombre d'appareils connectés simultanément
2. Ajustez la fréquence de scan WiFi pour réduire la charge CPU
3. Configurez une rotation des logs pour éviter de remplir la carte SD
4. Envisagez d'ajouter un système de refroidissement à votre Raspberry Pi pour éviter la limitation thermique
5. Considérez l'utilisation d'un SSD USB au lieu d'une carte SD pour une meilleure fiabilité et performance