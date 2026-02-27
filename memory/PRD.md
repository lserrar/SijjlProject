# Sijill Project - Product Requirements Document

## Original Problem Statement
Build "Sijill", an Islamic studies e-learning platform with a three-level content hierarchy: **Cursus -> Cours -> Modules**, where each module contains an audio episode.

A separate public-facing website (`sijillproject.com`) was also requested to validate SendPulse email account, sharing the same backend, database, and "prestige" design.

## Product Requirements
- **App Name**: Sijill Project
- **Language**: French
- **Platform**: React Native (Expo Web) Frontend + FastAPI Backend + Static Website
- **Core Hierarchy**: Cursus -> Cours -> Modules -> Audios (Episodes)
- **Content Storage**: Cloudflare R2 bucket
- **Design**: Dark-mode, text-only UI using Cinzel and EB Garamond fonts
- **Color Palette**: `#0A0A0A` (bg), `#04D182` (brand green), `#C9A84C` (gold)
- **Admin Panel**: Jinja2-based web admin for content management
- **Monetization**: Stripe subscriptions + referral system

## Architecture

```
/app
├── backend/
│   ├── server.py           # Main FastAPI server (6000+ lines - needs refactoring)
│   ├── routes/             # NEW: Router modules (started)
│   ├── templates/admin/    # Jinja2 admin templates
│   └── utils/
│       ├── apple_auth.py   # Apple Sign-In utility
│       └── email_service.py # SendPulse SMTP (inactive)
├── frontend/               # React Native (Expo Web)
└── website/                # Static website
    ├── css/style.css
    ├── js/app.js
    ├── index.html
    └── pages/
```

## Key API Endpoints
- `GET /api/site/**` - Static website
- `GET /api/plans` - Public pricing plans
- `GET /api/cursus` - List all cursus
- `GET /api/scholars` - List professors
- `POST /api/auth/login` - User authentication
- `GET /api/auth/apple/login` - Apple Sign-In initiation

## What's Been Implemented

### Session: 2026-02-26
- ✅ Fixed pricing endpoint in static website (`/api/admin/plans` → `/api/plans`)
- ✅ Verified all static website pages work correctly:
  - Home, Cursus, Professors, About, Subscriptions
  - Login modal with Google/Apple options
  - Dynamic data loading from API

### Previous Sessions
- ✅ Complete static website in `/app/website`
- ✅ Apple Sign-In backend integration (pending user config)
- ✅ SendPulse email service (code ready, inactive)
- ✅ Admin pricing page (full CRUD)
- ✅ Referral system

## Prioritized Backlog

### P0 - Critical
- None currently

### P1 - High Priority
- [ ] Refactor `backend/server.py` into FastAPI Router modules
- [x] ~~Activate SendPulse integration~~ - DONE (2026-02-27)
- [ ] Clean up admin templates (`*_new.html` → `*.html`)

### P2 - Medium Priority
- [ ] Finalize Apple Sign-In (user must configure Apple Developer portal)
- [ ] Enhanced admin dashboard for referrals

### P3 - Future
- [ ] Offline listening in mobile app
- [ ] Advanced analytics dashboard

## Blocked Items
1. **SendPulse**: Waiting for user's domain verification
2. **Apple Sign-In**: User must configure Apple Developer account:
   - Verify domain `sijillproject.com`
   - Set callback URL: `https://sijillproject.com/api/auth/apple/callback`

## Test Credentials
- **Admin Panel**: `/api/admin-panel/login`
  - Email: `loubna.serrar@gmail.com`
  - Password: `Admin123!`
- **Test User**:
  - Email: `loubniz@hotmail.com`
  - Password: `Test123!`

## Third-Party Integrations
| Service | Status | Notes |
|---------|--------|-------|
| Cloudflare R2 | ✅ Active | Media storage |
| Stripe | ✅ Active | Subscriptions |
| Google Fonts | ✅ Active | Cinzel, EB Garamond |
| SendPulse | ✅ Active | SMTP configured |
| Apple Sign-In | ⏸️ Coded | Waiting for user config |

## Static Website URLs
- Home: `/api/site/`
- Cursus: `/api/site/pages/cursus.html`
- Professors: `/api/site/pages/professeurs.html`
- About: `/api/site/pages/a-propos.html`
- Subscriptions: `/api/site/pages/abonnement.html`
- Reset Password: `/api/site/pages/reset-password.html`

## Recent Changes (2026-02-27)

### Email System - COMPLETED
- ✅ **SendPulse SMTP Integration**: Configured and tested with `smtp-pulse.com:587`
  - Sender: `contact@sijillproject.com`
  - SMTP User: `sijill.project@gmail.com`
- ✅ **Email Templates**: All templates using branded HTML design
  - Welcome email (new users)
  - Subscription confirmation
  - Referral notifications (signup + conversion)
  - Password reset

### Password Recovery - COMPLETED
- ✅ **Forgot Password API**: `POST /api/auth/forgot-password`
  - Generates secure token (`rst_*`)
  - Token expires in 1 hour
  - Sends reset link via email
- ✅ **Reset Password API**: `POST /api/auth/reset-password`
  - Validates token
  - Updates password
  - Marks token as used
- ✅ **Token Validation API**: `GET /api/auth/reset-password/validate`
- ✅ **Static Site Integration**:
  - "Mot de passe oublié" link in login modal
  - Forgot password form
  - Reset password page (`/pages/reset-password.html`)

