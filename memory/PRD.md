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

## Ce qui est implémenté

### Backend (server.py)
- Auth : register/login (JWT), Google OAuth
- **Scholars** CRUD avec toggle
- **Courses** CRUD avec sync R2
- **Audios** CRUD avec file_key R2
- **Thematiques** API (26 thèmes)
- **Bibliographies** API (22 entrées)
- **Masterclasses** API (22 sessions, gratuit ou payant)
- Admin Routes CRUD complètes pour toutes les entités
- R2 Storage : folders listing, files listing, sync

### Admin Panel Web (Complet)
- **Login** : Connexion sécurisée
- **Dashboard** : Stats globales
- **Savants** : CRUD complet
- **Cours** : CRUD avec sélection savant
- **Audios** : CRUD avec filtre type
- **Thématiques** : CRUD (Cursus)
- **Bibliographies** : CRUD avec liens thématiques
- **Masterclasses** : CRUD avec prix, durée, inscrits
- **Utilisateurs** : Gestion + accès gratuit
- **Stockage R2** : Navigation + sync cours

### Frontend Mobile (Expo)
- Auth screens : login (email + Google) / register
- Home : hero, recommendations, érudit semaine, écoute du jour
- **Navigation 6 onglets** : Accueil, Cursus, Biblio, Live, Profil, À propos
- **Cursus** : Liste des thématiques avec cours associés
- **Bibliothèque** : Articles par thème
- **Live** : Masterclasses avec inscription
- Audio player complet avec streaming R2
- MiniPlayer persistant

## Credentials
- **Admin Panel** : admin@hikma-admin.com / Admin123!
- **URL Panel** : https://thematic-platform.preview.emergentagent.com/api/admin-panel/

## Contenu
- 26 Thématiques
- 22 Bibliographies
- 22 Masterclasses
- 38 Cours
- 15 Audios
- 5-9 Savants

## Backlog P2 (Futur)
- Système de monétisation (Stripe)
- Push notifications
- Analytics temps d'écoute
- Multi-langue (EN, AR, RTL)

## Date implémentation : 2026-02-20
