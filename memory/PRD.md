# Sijill Project — PRD

## Problème original
Plateforme e-learning d'études islamiques "Sijill Project" avec :
- **Site principal** : `sijillproject.com` (React/Vite)
- **Web App** : `app.sijillproject.com` (React Native Expo for Web)
- **Backend** : FastAPI + MongoDB
- **Hiérarchie de contenu** : Cursus → Cours → Modules → Audios

## Stratégie actuelle
- **Web-app-first** : Pause du développement natif mobile, focus sur la PWA
- **Reader App** : L'app mobile/web est en lecture seule (pas de paiement/inscription)
- **Déploiement** : Docker Compose sur VPS Hostinger avec Nginx + SSL Let's Encrypt

## Architecture technique

### Stack
- **Backend** : FastAPI (Python), MongoDB (Motor async), Cloudflare R2 (audio/images)
- **Frontend Website** : React/Vite
- **Frontend Web App** : Expo for Web (React Native)
- **Déploiement** : Docker multi-stage, Docker Compose, Nginx, Let's Encrypt

### Architecture Docker (mise à jour Fév 2026)
```
Dockerfile          → Backend + Website React (2 stages)
nginx/Dockerfile    → Webapp Expo (2 stages: build + nginx)
docker-compose.yml  → mongodb, backend, nginx (custom build), certbot
```

### Nginx routing
- `sijillproject.com` → proxy vers backend (site React via StaticFiles)
- `app.sijillproject.com` → fichiers servis directement par nginx (try_files)
- `/api/*` → proxy vers backend FastAPI

### Intégrations 3rd party
- Cloudflare R2 (stockage audio/images)
- Stripe (paiements sur le site web)
- Let's Encrypt (SSL)
- Docker/Docker Hub

## Ce qui fonctionne
- ✅ Site principal `sijillproject.com` (homepage, catalogue, blog)
- ✅ Blog avec recherche, tri par chronique/année Hijri, SEO (meta keywords, JSON-LD)
- ✅ Blog sync : 50 articles synchronisés correctement depuis R2 — CORRIGÉ collision IDs (Fév 2026)
- ✅ Web App `app.sijillproject.com` — CORRIGÉ architecture nginx (Fév 2026)
- ✅ Page de pré-inscription avec formulaire (prénom + email), hero sur homepage, bouton header — AJOUTÉ (Avr 2026)
- ✅ Backend API complet (auth, courses, audios, streaming, admin, pre-registration)
- ✅ Système de parrainage
- ✅ Système d'abonnement Stripe
- ✅ **7 cursus** (A=Histoire, B=Théologie, C=Sciences, D=Arts, E=Falsafa, F=Mystique, G=Pensées non-islamiques) — RESTRUCTURÉ Fév 2026
- ✅ **Catalogue de lancement Mai 2026** : page Catalogue filtrée sur `is_launch_catalog=true` (19 cours) — AJOUTÉ Fév 2026
- ✅ **Page Cursus** : bandeau "Première vague — Mai 2026", catalogue complet visible, badges « bientôt disponible » — AJOUTÉ Fév 2026
- ✅ **YouTube unlisted** : embed `youtube-nocookie.com` (cours et épisodes), priorité épisode → cours, lien masqué via `sandbox` + `onContextMenu` — AJOUTÉ Fév 2026
- ✅ **Admin Panel — Filtres Catalogue de lancement** (Fév 2026) :
  - Onglet **Cours** : checkbox « Catalogue de lancement uniquement » activée par défaut
  - Onglet **Professeurs** : même filtre, calcul automatique via les `scholar_id` des cours du lancement (ID + matching par nom dans `scholar_name`)
  - Onglet **Catalogue** : toggle « Lancement uniquement » (doré, actif par défaut) + arborescence enrichie **Cursus → Cours → Module → Épisodes** (correspondant fichier Excel) avec tags `LANCEMENT` et `coming_soon`, et avertissement pour les épisodes non rattachés à un module
- ✅ **Migration v4 défensive** (Fév 2026) : nettoie automatiquement les éventuels doublons de cursus « Histoire du monde islamique » avec ID différent de `cursus-histoire`
- ✅ **Home.jsx dynamisé** (Fév 2026) : compteur cursus = `cursus.length` au lieu de hardcodé 6
- ✅ **Al-Kindī épisodes 1-3** ajoutés en BDD via migration avec leurs URLs YouTube (incluant la nouvelle URL ép. 3 fournie par l'utilisateur)
- ✅ Apple Sign-In (backend prêt)

## Tâches à venir

### P1 - Prioritaire
- [ ] Corriger les pistes audio non synchronisées (épisodes manquants) — peut être superposé par YouTube
- [ ] Corriger les photos des articles du blog (images du dossier R2 non récupérées)
- [ ] Saisir les liens YouTube pour les épisodes restants via le panneau admin
- [ ] Affiner les descriptions des 4 cours du cursus A (Histoire) avec contenu fourni par les professeurs

### P2 - Futur
- [ ] Retour au développement natif mobile (prévu septembre)
- [ ] Achats ponctuels de cours
- [ ] Refactoring `backend/server.py` avec APIRouter
- [ ] Page « Catalogue complet » publique (vs catalogue de lancement)

## Comptes de test
- Admin : `loubna.serrar@gmail.com` / `Admin123!`

## Fichiers clés
- `backend/server.py` — API monolithique FastAPI
- `nginx/default.conf` — Configuration Nginx (2 domaines)
- `nginx/Dockerfile` — Build Expo webapp + image nginx
- `Dockerfile` — Build website React + backend Python
- `docker-compose.yml` — Orchestration des services
- `frontend/app/_layout.tsx` — Layout principal de l'app Expo
