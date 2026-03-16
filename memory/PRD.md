# Sijill Project — PRD

## Problem Statement
Plateforme e-learning d'études islamiques "Sijill Project". Application full-stack (React/Vite Website, FastAPI Backend, MongoDB) déployée sur un VPS Hostinger via Docker.

## Core Hierarchy
Cursus -> Cours -> Modules -> Audios

## Architecture
- **Website**: React + Vite (website-react/), servi via FastAPI à /api/site/
- **Backend**: FastAPI monolithique (backend/server.py)
- **Mobile App**: React Native / Expo (frontend/)
- **Database**: MongoDB (test_database)
- **Deployment**: Docker + Nginx sur VPS Hostinger, HTTPS via Let's Encrypt
- **Domains**: sijillproject.com (principal), .fr et .org redirigent vers .com

## 6 Cursus (v3 — Février 2026)
| Lettre | ID | Nom |
|--------|-----|-----|
| A | cursus-falsafa | La Falsafa et son héritage |
| B | cursus-theologie | Théologie et Droit |
| C | cursus-sciences-islamiques | Sciences islamiques et transmission |
| D | cursus-arts | Arts, Littérature et Sciences |
| E | cursus-spiritualites | La Mystique islamique |
| F | cursus-pensees-non-islamiques | Pensées arabes non islamiques |

## What's Been Implemented

### Phase 1-5 (Completed before this session)
- Reading mode, website refactor, admin panel overhaul
- Blog "Sijill Times" with NYT-inspired design
- Full SEO (meta tags, OG tags, sitemap, robots.txt)
- Docker deployment on Hostinger VPS with HTTPS
- Database migration workflow
- Social share buttons on blog articles
- Legal pages (Mentions, Privacy, Terms)
- Footer with social links

### Phase 6 — New Feature Batch (March 2026)
- **Quote Update**: Homepage quote changed to new Ibn Khaldun (al-Muqaddima) text
- **Favicon**: SVG favicon "S." added to website
- **Mobile Menu**: Full hamburger menu with overlay, auto-close on navigation, body scroll lock
- **Catalog Update v3**: 5→6 cursus, Cursus E renamed "La Mystique islamique", new Cursus F "Pensées arabes non islamiques", updated all descriptions, backend mappings updated (regex, letter maps, R2 mappings)

## Backlog

### P1
- DNS setup for .fr and .org redirections
- App Store / Google Play links in footer

### P2
- YouTube channel link in footer
- Advanced monetization (one-time course purchases)
- Backend refactoring (server.py → APIRouter modules)

### P3
- Admin panel analytics dashboard
- Newsletter, offline mode, push notifications
- "My Subscription" page

### Known Issues
- Native mobile app: login broken, splash screen buggy (blocked pending new builds)
- Inconsistent user data ("Pierre Marchal" mystery)

## Credentials
- Admin: loubna.serrar@gmail.com / Admin123!
- Test user: loubniz@hotmail.com / loulouz

## Deployment
After changes, push to GitHub then on VPS:
```bash
cd /root/sijill && git pull && docker compose build --no-cache && docker compose up -d
```
