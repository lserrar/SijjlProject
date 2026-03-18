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
- ✅ Web App `app.sijillproject.com` — CORRIGÉ (Fév 2026)
- ✅ Backend API complet (auth, courses, audios, streaming, admin)
- ✅ Système de parrainage
- ✅ Système d'abonnement Stripe
- ✅ 6 cursus avec couleurs personnalisées
- ✅ Apple Sign-In (backend prêt)

## Tâches à venir

### P1 - Prioritaire
- [ ] Convertir la web app en **PWA** (manifest, service worker, icônes)
- [ ] Tester et finaliser **Sign in with Apple** sur la web app

### P2 - Futur
- [ ] Retour au développement natif mobile (prévu septembre)
- [ ] Achats ponctuels de cours
- [ ] Refactoring `backend/server.py` avec APIRouter

## Comptes de test
- Admin : `loubna.serrar@gmail.com` / `Admin123!`

## Fichiers clés
- `backend/server.py` — API monolithique FastAPI
- `nginx/default.conf` — Configuration Nginx (2 domaines)
- `nginx/Dockerfile` — Build Expo webapp + image nginx
- `Dockerfile` — Build website React + backend Python
- `docker-compose.yml` — Orchestration des services
- `frontend/app/_layout.tsx` — Layout principal de l'app Expo
