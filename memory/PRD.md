# PRD – HikmabyLM

## Statut : MVP Complet - Prêt pour production

## Problème original
Application mobile e-learning académique française pour études islamiques (iOS & Android) : cours vidéo, podcasts, articles, sessions live, bibliothèque. Design type Spotify dark. Tone intellectuel et rigoureux.

## Architecture
- **Backend** : FastAPI + MongoDB (port 8001)
- **Frontend Mobile** : Expo SDK 54 (React Native), expo-router
- **Admin Panel Web** : Interface HTML/CSS/JS servie par FastAPI
- **Storage audio** : Cloudflare R2 (bucket hikma-audio)
- **Auth** : Email/password (JWT) + Google OAuth (Emergent Auth)
- **Paiements** : Stripe (abonnements, achats uniques, codes promo)

## Ce qui est implémenté

### Backend (server.py)
- Auth : register/login (JWT), Google OAuth
- **Professors** CRUD avec toggle (anciennement Scholars/Savants)
- **Courses** CRUD avec sync R2 + champ thematique_id pour liaison Cursus
- **Audios** CRUD avec file_key R2 + **category_id** pour catégories
- **Audio Categories** CRUD complet (remplace Conférences)
- **Thematiques** API (26 themes) = Cursus dans l'interface
- **Bibliographies** API (22 entrées)
- **Masterclasses** API (22 sessions, gratuit ou payant)
- Admin Routes CRUD complètes pour toutes les entités
- R2 Storage : folders listing, files listing, sync

### Admin Panel Web (Complet)
- **Login** : Connexion sécurisée
- **Dashboard** : Stats globales (Professeurs, Cours, Audios, Utilisateurs)
- **Professeurs** : CRUD complet (renommé de "Savants")
- **Cours** : CRUD avec sélection professeur + sélection Cursus + cours à la une
- **Audios** : CRUD avec filtre type ET filtre catégorie + sélecteur de catégorie + navigateur R2 par catégorie
- **Catégories Audio** : NOUVELLE PAGE - CRUD pour gérer les catégories d'audios (Conférences, Musique, Récitation du Coran, Podcasts...)
- **Cursus** : CRUD (anciennement Thématiques dans le code, affiche "Cursus" dans l'interface)
- **Bibliographies** : CRUD avec liens thématiques
- **Masterclasses** : CRUD avec prix, durée, inscrits
- **Utilisateurs** : Gestion complète avec affichage abonnements et actions
- **Stockage R2** : Navigation + sync cours
- **Tarification** : Gestion des plans Stripe
- **Codes Promo** : CRUD avec périodes de validité (date début et fin)

### Frontend Mobile (Expo)
- Auth screens : login (email + Google) / register
- Home : hero, recommendations, érudit semaine, écoute du jour
- **Navigation 6 onglets** : Accueil, Cursus, Biblio, Live, Profil, À propos
- **Cursus** : Liste des thématiques avec cours associés
- **Bibliothèque** : Articles par thème
- **Live** : Masterclasses avec inscription
- Audio player complet avec streaming R2
- MiniPlayer persistant

## Modifications 2026-02-21 (Aujourd'hui)

### ✅ **Système de Catégories Audio** (Remplace Conférences)
- **Nouvelle collection `audio_categories`** dans MongoDB avec schéma :
  - `id`, `name`, `description`, `r2_folder`, `icon`, `is_active`, `created_at`
- **Nouveau champ `category_id`** dans les audios pour liaison
- **Endpoints API** :
  - `GET /api/admin/audio-categories` - Liste toutes les catégories (admin)
  - `GET /api/audio-categories` - Liste les catégories actives (public)
  - `POST /api/admin/audio-categories` - Créer une catégorie
  - `PUT /api/admin/audio-categories/{cat_id}` - Modifier une catégorie
  - `DELETE /api/admin/audio-categories/{cat_id}` - Supprimer (si pas d'audios liés)
  - `PATCH /api/admin/audio-categories/{cat_id}/toggle` - Activer/Désactiver
  - `GET /api/audios/by-category/{cat_id}` - Audios par catégorie
- **Page admin `/api/admin-panel/audio-categories`** :
  - Grille de cartes avec icône, nom, dossier R2, description
  - Compteur d'audios par catégorie
  - Actions : Modifier, Toggle, Supprimer
  - Sélecteur d'icônes (headphones, microphone-alt, music, quran, podcast...)
- **Catégories par défaut créées** :
  - Conférences (hikma-audio/0. Conference/)
  - Musique (hikma-audio/Musique/)
  - Récitation du Coran (hikma-audio/Coran/)
  - Podcasts (hikma-audio/Podcasts/)

### ✅ **Page Audios mise à jour**
- **Nouveau filtre "Catégorie"** dans la barre d'outils
- **Nouvelle colonne "Catégorie"** dans le tableau
- **Sélecteur de catégorie** dans le formulaire d'ajout/modification
- **Navigateur R2 dynamique** : quand une catégorie est sélectionnée, le dossier R2 associé est utilisé pour parcourir les fichiers
- Message d'aide indiquant le dossier R2 de la catégorie sélectionnée

### ✅ **Navigation Admin mise à jour**
- Lien "Conférences" remplacé par "Catégories Audio" dans toutes les pages
- Fichier `conferences.html` supprimé
- Nouvelle icône `folder-tree` pour Catégories Audio

## Modifications précédentes

### 2026-02-21 (Session précédente)
- ✅ Gestion des abonnements utilisateurs dans le panel admin
- ✅ Codes promo avec périodes de validité (date début et fin)
- ✅ Écran de choix d'abonnement post-inscription
- ✅ Protection du contenu payant (hook useAccessCheck, PaywallOverlay)
- ✅ Essai gratuit de 3 jours
- ✅ Écran Paramètres (/settings)
- ✅ Écran Notifications (/notifications)
- ✅ Écran À propos (/about)
- ✅ Lecture audio en arrière-plan
- ✅ Endpoint suppression de compte
- ✅ Page d'accueil restructurée
- ✅ Panel Admin - Cours featured
- ✅ Onglet "Ressources" (ex-Bibliothèque)
- ✅ Suggestions "Pour approfondir"

### 2025-12-20
- ✅ Renommage "Savants" → "Professeurs"
- ✅ Renommage "Thématiques" → "Cursus"
- ✅ Liaison Cours ↔ Cursus
- ✅ Intégration Stripe complète
- ✅ Abonnements Mensuel/Annuel
- ✅ Achats uniques
- ✅ Codes promo
- ✅ Essais gratuits

## Credentials
- **Admin Panel** : admin@hikma-admin.com / Admin123!
- **URL Panel** : https://islamic-content-hub-2.preview.emergentagent.com/api/admin-panel/

## Contenu
- 26 Cursus (Thématiques)
- 22 Bibliographies
- 22 Masterclasses
- 38 Cours
- 15 Audios
- 9 Professeurs
- 4 Catégories Audio

## Backlog P0 (Urgent - En cours)
- ⚠️ Application mobile Expo en erreur (ngrok tunnel issues)
- Appliquer le paywall à tous les contenus premium (pas seulement les cours)

## Backlog P1 (À venir)
- Implémentation backend "Continue Watching" et "Recommandations"
- Implémentation backend "Mes Cursus" et "Mes Favoris" dans l'onglet Ressources
- Suggestions post-cours (conférences/bibliographies liées)
- Écrans mobiles pour afficher les audios par catégorie

## Backlog P2 (Futur)
- Push notifications pour nouveaux cours et expiration d'abonnement
- Analytics temps d'écoute
- Multi-langue (EN, AR, RTL)
- Refactorisation backend (server.py monolithique → routers)
- Suppression du code admin mobile déprécié (/app/frontend/app/admin)

## Date dernière mise à jour : 2026-02-21
