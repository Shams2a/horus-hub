# Guide des Tests sur Matériel Réel - Horus Hub

## 🎯 Fonctionnalités Prêtes pour Tests Réels

### ✅ **Complètement Fonctionnelles (Sans Matériel)**
1. **Interface Web Complète**
   - Navigation responsive avec sidebar
   - Thème sombre/clair
   - Toutes les pages accessibles
   - État : **Prêt pour production**

2. **Système de Logs Avancé**
   - Enregistrement en temps réel
   - Filtres par niveau et source
   - Pagination et recherche
   - État : **Prêt pour production**

3. **Gestion des Emplacements**
   - Création de bâtiments et pièces
   - Organisation hiérarchique
   - Assignation d'appareils
   - État : **Prêt pour production**

4. **Configuration Système**
   - Paramètres généraux, réseau, protocoles
   - Sauvegarde persistante
   - Interface unifiée dans Paramètres
   - État : **Prêt pour production**

5. **Diagnostic Avancé**
   - Auto-monitoring des adaptateurs
   - Classification des erreurs par sévérité
   - Suggestions de résolution
   - Statistiques et export
   - État : **Prêt pour production**

6. **Base de Données PostgreSQL**
   - Stockage persistant
   - Schémas complets
   - Relations optimisées
   - État : **Prêt pour production**

### 🔧 **Prêtes avec Matériel Réel**

#### 1. **Adaptateur Zigbee**
**Matériel requis :**
- Dongle Zigbee (CC2531, ConBee II, Sonoff Zigbee 3.0)
- Appareils Zigbee (ampoules Philips Hue, capteurs Aqara, etc.)

**Configuration :**
```bash
# Port série typique
/dev/ttyUSB0  # Linux
/dev/ttyACM0  # Certains dongles
COM3          # Windows
```

**Fonctionnalités disponibles :**
- Découverte automatique d'appareils
- Autorisation d'appairage
- Surveillance de l'état réseau
- Diagnostic de connectivité

#### 2. **Adaptateur WiFi**
**Matériel requis :**
- Appareils IoT WiFi (thermostats Nest, prises connectées, etc.)
- Réseau WiFi configuré

**Fonctionnalités disponibles :**
- Scan automatique du réseau
- Détection d'appareils IoT
- Monitoring de connectivité
- Gestion des états en ligne/hors ligne

#### 3. **Adaptateur MQTT**
**Configuration requise :**
- Broker MQTT (Mosquitto local ou cloud)
- Topics configurés
- Identifiants de connexion

**Fonctionnalités disponibles :**
- Connexion au broker
- Abonnement aux topics
- Publication de messages
- Monitoring en temps réel

## 🚀 Instructions de Démarrage

### 1. **Lancement de Base**
```bash
npm run dev
# Interface accessible sur http://localhost:5000
```

### 2. **Configuration Zigbee**
1. Aller dans **Paramètres > Protocoles > Zigbee**
2. Configurer le port série de votre dongle
3. Aller dans **Adaptateurs** pour vérifier l'état
4. Utiliser **Diagnostic** pour surveiller la connectivité

### 3. **Configuration MQTT**
1. Aller dans **Paramètres > Protocoles > MQTT**
2. Configurer l'URL du broker
3. Tester la connexion dans **MQTT > Configuration**
4. Configurer les topics dans **MQTT > Abonnements**

### 4. **Test des Fonctionnalités**
1. **Logs** : Vérifier l'enregistrement des événements
2. **Diagnostic** : Tester l'auto-monitoring
3. **Emplacements** : Créer votre structure de bâtiments
4. **Paramètres** : Configurer selon votre environnement

## 📋 Checklist de Validation

### Interface Utilisateur
- [ ] Navigation fluide entre toutes les pages
- [ ] Thème sombre/clair fonctionne
- [ ] Interface responsive sur mobile/tablette
- [ ] Sidebar se rétracte correctement

### Fonctionnalités Core
- [ ] Création de bâtiments et pièces
- [ ] Logs en temps réel avec filtres
- [ ] Paramètres sauvegardés correctement
- [ ] Diagnostic système actif
- [ ] Base de données fonctionnelle

### Avec Matériel Zigbee
- [ ] Dongle détecté sur le port série
- [ ] Réseau Zigbee initialisé
- [ ] Appareils découverts automatiquement
- [ ] États des appareils mis à jour
- [ ] Diagnostic Zigbee sans erreurs

### Avec Matériel WiFi
- [ ] Scan réseau fonctionnel
- [ ] Appareils IoT détectés
- [ ] États de connectivité corrects
- [ ] Monitoring temps réel actif

### Avec MQTT
- [ ] Connexion au broker établie
- [ ] Topics configurés et actifs
- [ ] Messages publiés/reçus
- [ ] Monitoring en temps réel

## 🔍 Points de Test Critiques

### 1. **Stabilité**
- Laisser tourner 1h minimum
- Vérifier absence de fuites mémoire
- Tester reconnexion après coupure réseau

### 2. **Performance**
- Temps de démarrage < 10 secondes
- Interface réactive (< 200ms)
- Gestion de 10+ appareils simultanés

### 3. **Robustesse**
- Redémarrage après crash d'adaptateur
- Récupération automatique de connexion
- Logs d'erreur détaillés

## 🛠 Dépannage

### Problèmes Courants

**Zigbee ne démarre pas :**
```bash
# Vérifier les permissions
sudo chmod 666 /dev/ttyUSB0
# Vérifier le port
dmesg | grep tty
```

**MQTT ne se connecte pas :**
- Vérifier l'URL du broker
- Tester avec un client MQTT externe
- Vérifier les identifiants

**WiFi scan vide :**
- Vérifier les permissions réseau
- S'assurer d'être sur le même réseau
- Vérifier les appareils IoT activés

### Logs de Diagnostic
- **Page Diagnostic** : État temps réel
- **Page Logs** : Historique détaillé
- **Console serveur** : Erreurs techniques

## 📈 Prochaines Étapes

Après validation sur matériel réel :
1. Optimisation des performances
2. Ajout de nouveaux protocoles
3. Interface mobile native
4. Intégrations cloud avancées

---

**Note :** Toutes les données fictives ont été supprimées. L'application affichera uniquement les vrais appareils découverts sur votre réseau.