# PRD – HikmabyLM

## Statut : MVP + R2 Storage + Admin Panel Web

## Problème original
Application mobile e-learning académique française pour études islamiques (iOS & Android) : cours vidéo, podcasts, articles, sessions live, bibliothèque. Design type Spotify dark. Tone intellectuel et rigoureux.

**Évolution majeure**: Ajout d'un panel admin web dédié pour la gestion complète du contenu.

## Architecture
- **Backend** : FastAPI + MongoDB (port 8001)
- **Frontend Mobile** : Expo SDK 54 (React Native), expo-router
- **Admin Panel Web** : Interface HTML/CSS/JS servie par FastAPI
- **Storage audio** : Cloudflare R2 (bucket hikma-audio)
- **Auth** : Email/password (JWT) + Google OAuth (Emergent Auth)

## Ce qui est implémenté

### Backend (server.py)
- Auth : register/login (JWT), Google OAuth via Emergent session exchange
- Scholars CRUD avec toggle actif/inactif
- Courses CRUD avec sync R2
- Audios CRUD avec file_key R2
- Articles existants
- Live Sessions avec inscription/désinscription
- User Progress & Favorites CRUD
- Home endpoint (hero, recommendations, featured scholar, daily pick)
- **Cloudflare R2** : presigned URLs pour streaming, upload URLs, listing
- **Admin Routes** :
  - GET/POST/PUT/DELETE /admin/scholars
  - GET/POST/PUT/DELETE /admin/courses
  - GET/POST/PUT/DELETE /admin/audios
  - GET /admin/users + grant-access + revoke-access
  - POST /admin/courses/{id}/sync-r2
- **Admin Panel Web** : Pages HTML servies à /api/admin-panel/*
- Health check endpoint

### Admin Panel Web (Nouveau)
- **Login** : /api/admin-panel/login - Page de connexion sécurisée
- **Dashboard** : /api/admin-panel/ - Vue d'ensemble (stats, listes récentes)
- **Savants** : /api/admin-panel/scholars - CRUD complet avec toggle
- **Cours** : /api/admin-panel/courses - CRUD avec sélection savant
- **Audios** : /api/admin-panel/audios - CRUD avec filtre par type
- **Utilisateurs** : /api/admin-panel/users - Liste + attribution accès gratuit

### Frontend Mobile (Expo)
- Auth screens : login (email + Google) / register
- Home : hero "continuer", recommendations, érudit semaine, écoute du jour
- Navigation 6 onglets : Accueil, Cursus, Biblio, Live, Profil, À propos
- Écrans placeholder pour nouveaux onglets
- Audio/[id] : lecteur complet R2
- Course/[id], Article/[id], Scholar/[id] : pages détail
- MiniPlayer persistant
- PlayerContext : expo-av avec streaming R2

## Utilisateurs Spéciaux
- **Admin** : loubna.serrar@gmail.com
- **Accès gratuit** (à configurer) : meryemsebti@yahoo.fr

## Credentials Test Admin
- Email : admin@hikma-admin.com
- Password : Admin123!

## Backlog Priorité

### P0 (terminé cette session)
- ✅ Panel Admin Web dédié
- ✅ CRUD Savants, Cours, Audios
- ✅ Gestion utilisateurs avec accès gratuit
- ✅ Health check endpoint

### P1 (prochaine session)
- [ ] Implémenter l'onglet "Nos Cursus" (frontend mobile)
- [ ] Implémenter l'onglet "Bibliothèque" (frontend mobile)
- [ ] Implémenter l'onglet "Live" Masterclasses (frontend mobile)
- [ ] Ajouter CRUD Articles dans admin panel
- [ ] Ajouter CRUD Masterclasses dans admin panel

### P2 (futur)
- [ ] Système de monétisation (Stripe)
- [ ] Push notifications
- [ ] Analytics temps d'écoute
- [ ] Multi-langue (EN, AR, RTL)

## Structure des fichiers Admin
```
/app/backend/
├── admin_templates/
│   ├── login.html
│   ├── dashboard.html
│   ├── scholars.html
│   ├── courses.html
│   ├── audios.html
│   └── users.html
└── server.py
```

## Date implémentation : 2026-02-20
