# Sijill Project - Product Requirements Document

## Original Problem Statement
Build "Sijill", an Islamic studies e-learning platform with a three-level content hierarchy: **Cursus -> Cours -> Modules**, where each module contains an audio episode.

## Product Requirements
- **App Name**: Sijill Project
- **Language**: French
- **Platform**: React Native (Expo Web) Frontend + FastAPI Backend
- **Core Hierarchy**: Cursus -> Cours -> Modules -> Audios (Episodes)
- **Content Storage**: All media files (audios, images, bibliographies, timelines) stored in `sijill-project` Cloudflare R2 bucket
- **Design**: Strict, text-only, dark-mode UI using Cinzel and EB Garamond fonts
- **Admin Panel**: Full content management including payments, referrals, stats, homepage features
- **Monetization**: Subscriptions (Monthly, Annual) via Stripe + referral system

## User Personas
1. **Students** - Access courses, track progress, subscribe for premium content
2. **Administrators** - Manage content, users, payments, and analytics via admin panel

## Core Features Implemented

### Authentication
- [x] User registration and login
- [x] Forgot password flow (UI + backend)
- [x] JWT-based authentication
- [ ] Apple Sign-In (placeholder only)

### Content Management
- [x] Cursus listing and navigation
- [x] Course details and playlists
- [x] Audio episode playback with progress tracking
- [x] Bibliography display
- [x] Timeline resources (HTML)
- [x] Historical context documents (DOCX)
- [x] Audio conferences

### Admin Panel (/api/admin-panel/)
- [x] Dashboard with stats
- [x] User management
- [x] Course management
- [x] Timeline editing (title, order)
- [x] Context document editing (title, cursus, module, subject)
- [x] Payment/subscription management
- [x] Referral system management

### UI/UX
- [x] Dark-mode "prestige" design system
- [x] Spotify-style header (profile left, search right)
- [x] Resource filtering by Cursus
- [x] Prestige context document viewer

## Code Architecture

```
/app
├── backend
│   ├── .env                    # Environment variables (MONGO_URL, DB_NAME, SendPulse, etc.)
│   ├── server.py               # Main FastAPI server (6000+ lines - refactoring in progress)
│   ├── requirements.txt
│   ├── routes/                 # NEW: FastAPI routers (modularization)
│   │   ├── __init__.py
│   │   └── dependencies.py     # Shared DB, auth utilities
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── helpers.py
│   │   └── email_service.py    # NEW: SendPulse email integration
│   └── admin_templates/        # Jinja2 admin templates
│       ├── base.html           # Base template with inheritance
│       ├── *_new.html          # Migrated templates using Jinja2
│       └── referrals.html      # NEW: Referral management page
├── frontend
│   ├── app
│   │   ├── (auth)/             # Login, forgot-password pages
│   │   ├── (tabs)/             # Main app tabs (index, cursus, about, profil)
│   │   ├── context/[resourceId].tsx  # Context document viewer
│   │   ├── cursus/[id].tsx     # Individual cursus page
│   │   └── audio/[id].tsx      # Audio player
│   ├── components/
│   │   └── GlobalHeader.tsx    # Spotify-style header
│   └── context/AuthContext.tsx # Authentication context
└── memory/
    └── PRD.md                  # This file
```

## Key API Endpoints

### Public
- `GET /api/cursus` - List all cursus
- `GET /api/courses` - List courses (with filters)
- `GET /api/courses/{id}/playlist` - Get course episodes
- `GET /api/timelines/cursus/{id}` - Get timelines for cursus
- `GET /api/resources/context/{id}` - Get context document
- `GET /api/resources/context/cursus/{id}` - Get context docs by cursus
- `GET /api/resources/audio` - Get audio conferences

### Auth
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset

### Admin
- `PUT /api/admin/resources/timeline/{id}` - Update timeline metadata
- `PUT /api/admin/resources/context/{id}` - Update context doc metadata

## Database Schema (MongoDB)

### Collections
- **users**: {email, hashed_password, name, subscription, ...}
- **courses**: {id, title, cursus_id, modules_count, ...}
- **cursus**: {id, name, order, ...}
- **timeline_resources**: {resource_id, title, display_order, cursus_letter}
- **context_resources**: {resource_id, title, cursus_letter, module_number, subject}
- **password_reset_tokens**: {email, token, expires_at}
- **user_progress**: {user_id, content_id, progress, completed}

## Test Credentials
- **Admin Panel**: `/api/admin-panel/login`
  - Email: `loubna.serrar@gmail.com`
  - Password: `Admin123!`
- **Test User**:
  - Email: `loubniz@hotmail.com`
  - Password: `Test123!`

## Completed Work (Latest Session - Feb 26, 2026)

### Admin Panel Bug Fixes (26 Fév 2026)
- [x] **Fixed Stats d'écoute page** - Was not loading due to incorrect Jinja2 rendering (used TemplateResponse instead of manual string replacement)
- [x] **Restored missing menu items** - Added Tarifs, Parrainage, Codes promo, Stockage R2 back to sidebar
- [x] **Created Parrainage page** - New admin page (`referrals.html`) with stats, configuration, and referral list
- [x] **Updated pricing/promos endpoints** - Now use Jinja2 templates (`pricing_new.html`, `promos_new.html`)

### Previous Bug Fixes (Session précédente)
- [x] Fixed Cursus page scroll behavior (removed sticky header causing overlap)
- [x] **Fixed resource filtering on Course detail page** - Timelines, context documents, and audio conferences are now correctly filtered by cursus when opening a course from the homepage
- [x] **Custom titles display** - Timeline and context document titles from admin panel are now correctly displayed

### Backend Changes
- [x] Added `/api/resources/context/cursus/{cursus_id}` endpoint to filter DOCX files by cursus

### Frontend Changes (course/[id].tsx)
- [x] Refactored `loadData()` to fetch cursus info first, then apply proper filtering
- [x] Added timelines fetching via `/timelines/cursus/{cursus_id}`
- [x] Client-side audio conference filtering by `cursus_letter`
- [x] Display custom titles for timelines and context documents

### Frontend Changes (cursus.tsx)
- [x] **Fixed cursus titles/descriptions from admin panel** - Now uses database values instead of hardcoded static data

### Refactoring (P2) - Phase 1
- [x] **Admin Templates Jinja2 Inheritance**: Modified `base.html` with blocks, created `dashboard_new.html`
- [x] **Backend Structure**: Created `/app/backend/config.py`, `/app/backend/utils/helpers.py`, `/app/backend/routes/`
- [x] Configured `Jinja2Templates` in `server.py`

### Refactoring (P2) - Phase 2 : Templates Admin Migrés
- [x] `dashboard_new.html` - Tableau de bord (~70% code reduction)
- [x] `professors_new.html` - Gestion des professeurs (~51% code reduction)
- [x] `courses_new.html` - Gestion des cours (~52% code reduction)
- [x] `users_new.html` - Gestion des utilisateurs (~59% code reduction)
- [x] `cursus_new.html` - Gestion des cursus (~52% code reduction)
- [x] `modules_new.html` - Gestion des modules (~53% code reduction)
- [x] `bibliographies_new.html` - Gestion des bibliographies (~51% code reduction)
- [x] `audios_new.html` - Gestion des audios avec R2 browser (~52% code reduction)
- [x] `settings_new.html` - Paramètres plateforme (~73% code reduction)
- [x] `highlight.html` - Corrigé pour utiliser Jinja2
- [x] `timeline-resources.html` - Corrigé pour utiliser Jinja2
- [x] Suppression de `masterclasses.html` et son endpoint

### Templates Admin Restants (non critiques)
- [x] `promos_new.html` - Migrée vers Jinja2 (Fév 2026)
- [x] `pricing_new.html` - Migrée vers Jinja2 (Fév 2026)
- [x] `listening-stats.html` - Corrigée pour utiliser Jinja2 (Fév 2026)
- [x] `referrals.html` - Nouvelle page créée (Fév 2026)
- [ ] `audio-categories.html`

### Previous Session Work
- [x] Admin Panel - Timeline Management (edit title, order)
- [x] Admin Panel - Context Document Management (edit metadata)
- [x] Resource filtering by Cursus on frontend
- [x] Redesigned context document viewer (prestige layout)
- [x] Removed animated splash screen
- [x] Spotify-style header redesign
- [x] Increased font sizes on About page
- [x] Fixed user login issues (DB/JWT key mismatches)
- [x] Implemented Forgot Password flow

## Known Issues

### P2 - Frontend Environment Instability
- **Description**: Intermittent 502 Bad Gateway errors
- **Workaround**: Restart frontend service via supervisor
- **Status**: NOT FIXED (platform-level issue)

### P3 - Data Inconsistency ("Pierre Marchal")
- **Description**: Unexpected user name appeared in data
- **Status**: NOT INVESTIGATED

## Future Tasks (Prioritized)

### P2 - Technical Debt
1. **Refactor Backend**: Break `server.py` into FastAPI Router modules
2. **Refactor Admin Templates**: Use Jinja2 inheritance, external JS files
3. **Implement Apple Sign-In**: Currently placeholder button

### P2 - Features
4. **Enhanced Referral Dashboard**: Detailed views and management
5. **Improved Progress Tracking**: Cross-device sync

## 3rd Party Integrations
- **Cloudflare R2**: Media storage
- **Stripe**: Subscription payments
- **MongoDB**: Database
- **Google Fonts**: Cinzel & EB Garamond
- **python-docx**: DOCX parsing

## Notes
- Communicate with user in **French**
- User is detail-oriented on UI - verify visual changes with screenshots
- Watch for ID format mismatches (`-` vs `_`) when debugging
- Check environment variables (DB_NAME, JWT_SECRET_KEY) when debugging auth issues
