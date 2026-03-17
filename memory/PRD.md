# Sijill Project — PRD

## Problem Statement
Plateforme e-learning d'études islamiques "Sijill Project". Application full-stack (React/Vite Website, FastAPI Backend, MongoDB) déployée sur un VPS Hostinger via Docker. App mobile React Native/Expo.

## Core Hierarchy
Cursus -> Cours -> Modules -> Audios

## Architecture
- **Website**: React + Vite (website-react/), servi via FastAPI à /api/site/
- **Backend**: FastAPI monolithique (backend/server.py)
- **Mobile App**: React Native / Expo (frontend/)
- **Database**: MongoDB (test_database)
- **Deployment**: Docker + Nginx sur VPS Hostinger, HTTPS via Let's Encrypt
- **Domains**: sijillproject.com (principal), .fr et .org redirigent vers .com

## 6 Cursus (v3 — Mars 2026)
| Lettre | ID | Nom | Couleur |
|--------|-----|-----|---------|
| A | cursus-falsafa | La Falsafa et son héritage | #04D182 |
| B | cursus-theologie | Théologie et Droit | #8B5CF6 |
| C | cursus-sciences-islamiques | Sciences islamiques et transmission | #F59E0B |
| D | cursus-arts | Arts, Littérature et Sciences | #EC4899 |
| E | cursus-spiritualites | La Mystique islamique | #06B6D4 |
| F | cursus-pensees-non-islamiques | Pensées arabes non islamiques | #C2714F |

## App Store Model: Reader App
L'app iOS suit le modèle Reader App (comme Kindle, Spotify, Netflix) :
- **Aucun paiement** dans l'app
- **Aucune mention** du site web comme moyen de s'abonner
- L'abonnement se fait **exclusivement via sijillproject.com** (Stripe)
- L'app = accès au contenu uniquement
- Message neutre pour les non-abonnés : "Un abonnement actif est nécessaire"

## What's Been Implemented

### Phase 1-5 (Completed)
- Reading mode, website refactor, admin panel overhaul
- Blog "Sijill Times" with NYT-inspired design
- Full SEO (meta tags, OG tags, sitemap, robots.txt)
- Docker deployment on Hostinger VPS with HTTPS
- Database migration workflow
- Social share buttons, legal pages, footer

### Phase 6 — Feature Batch (Mars 2026)
- **Quote Update**: New Ibn Khaldun (al-Muqaddima) quote
- **Favicon**: SVG "S." favicon
- **Mobile Menu**: Hamburger menu with overlay
- **Catalog v3**: 5→6 cursus, course reassignment (Ismaélisme→A, Kalām chrétien→F, Philo juive→F)
- **Color Palette**: Updated to 6 cursus colors (F = #C2714F), unified across 9+ mobile app files
- **Reader App Conversion**: Removed all payment/Stripe UI from mobile app

### Reader App Changes (Mars 2026)
- `subscription-choice.tsx` → Rewritten as subscription status screen (no payment)
- `subscription-success.tsx` → Redirect to tabs
- `payment/success.tsx` → Redirect to tabs
- `payment/cancel.tsx` → Redirect to tabs
- `auth-callback.tsx` → No longer redirects to subscription choice
- `settings.tsx` → "Voir le statut" instead of "Gérer"
- `legal/[type].tsx` → Removed Stripe mention
- `useAccessCheck.ts` → Neutral access denied messages

## Backlog

### P0 (Apple Review)
- Add **Sign in with Apple** to the mobile app (Guideline 4.8)
- Create demo account with active subscription for Apple Review (Guideline 2.1)
- Submit **Reader App entitlement** request in App Store Connect

### P1
- DNS setup for .fr and .org redirections
- App Store / Google Play links in footer

### P2
- YouTube channel link in footer
- Advanced monetization (one-time course purchases on website)
- Backend refactoring (server.py → APIRouter modules)

### P3
- Admin panel analytics dashboard
- Newsletter, offline mode, push notifications
- "My Subscription" page

### Known Issues
- Native mobile app: login broken, splash screen buggy (blocked pending new builds)

## Credentials
- Admin: loubna.serrar@gmail.com / Admin123!
- Test user: loubniz@hotmail.com / loulouz

## Deployment
After changes, push to GitHub then on VPS:
```bash
cd /root/sijill && git pull && docker compose build --no-cache && docker compose up -d
```
For mobile app: new EAS build required.
