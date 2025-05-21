# Documentation Horus Hub

## Présentation

Bienvenue dans la documentation de Horus Hub, une plateforme de gestion multi-protocoles IoT conçue spécialement pour Raspberry Pi. Cette plateforme vous permet de connecter, surveiller et gérer des appareils utilisant différents protocoles (Zigbee, WiFi, MQTT) via une interface web unifiée.

## Contenu de la documentation

Cette documentation est organisée de la façon suivante:

1. [**Guide d'installation**](./INSTALLATION.md) - Instructions détaillées pour installer Horus Hub sur un Raspberry Pi
2. [**Guide de configuration**](./CONFIGURATION.md) - Comment configurer les différents aspects de la plateforme
3. [**Architecture du système**](./ARCHITECTURE.md) - Description technique de l'architecture et des composants
4. [**Documentation de l'API**](./API.md) - Référence complète de l'API REST et WebSocket

## Fonctionnalités principales

Horus Hub offre les fonctionnalités suivantes:

- **Multi-protocoles**: Support pour Zigbee, WiFi et MQTT intégré
- **Interface web intuitive**: Interface utilisateur moderne et responsive
- **Gestion des emplacements**: Organisation des appareils par bâtiments et salles
- **Journalisation avancée**: Logs détaillés pour le dépannage et la surveillance
- **Base de données robuste**: Stockage PostgreSQL pour la fiabilité des données
- **API complète**: API REST et WebSocket pour l'intégration avec d'autres systèmes
- **Configuration flexible**: Options de personnalisation avancées

## Prérequis

Pour utiliser Horus Hub, vous aurez besoin de:

- Raspberry Pi 4 (4GB ou 8GB recommandé) ou Raspberry Pi 5
- Carte microSD de 16GB minimum (32GB recommandé)
- Adaptateur Zigbee compatible (comme ConBee II, Sonoff Zigbee 3.0)
- Connexion réseau (Ethernet recommandé pour la stabilité)

## Démarrage rapide

Pour un démarrage rapide:

1. Suivez les instructions d'[installation](./INSTALLATION.md)
2. Lancez l'application et accédez à l'interface web (http://adresse-pi:5000)
3. Configurez vos protocoles préférés dans l'onglet Paramètres
4. Commencez à ajouter vos appareils

## Problèmes courants

Consultez notre document d'installation pour les problèmes d'installation courants. Pour les problèmes spécifiques aux protocoles, référez-vous aux sections pertinentes du guide de configuration.

## Contributions

Horus Hub est un projet ouvert aux contributions. Si vous souhaitez participer au développement:

1. Forkez le dépôt GitHub
2. Créez une branche pour votre fonctionnalité (`git checkout -b nouvelle-fonctionnalite`)
3. Committez vos changements (`git commit -m 'Ajout de nouvelle-fonctionnalite'`)
4. Poussez vers la branche (`git push origin nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request

## Licence

Horus Hub est distribué sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## Contact

Pour toute question ou support, vous pouvez:
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement à support@horushub.io

---

© 2025 Horus Hub - Plateforme de gestion multi-protocoles IoT