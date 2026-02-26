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
│   ├── .env                    # Environment variables (MONGO_URL, DB_NAME, etc.)
│   ├── server.py               # Main FastAPI server (3000+ lines - needs refactoring)
│   ├── requirements.txt
│   └── templates/admin/        # Jinja2 admin templates
│       └── resources.html      # Timeline/Context doc management
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

## Completed Work (Latest Session - Feb 2026)

### Bug Fixes
- [x] Fixed Cursus page scroll behavior (removed sticky header causing overlap)
- [x] Validated font size increase on About page

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
