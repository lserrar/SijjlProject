# Sijill Project - PRD (Product Requirements Document)

## Application Overview
**App Name**: Sijill Project  
**Platform**: React Native (Expo) + FastAPI Backend + MongoDB  
**Language**: French  
**Last Updated**: February 2026

---

## Core Product

### Content Hierarchy
```
Cursus -> Cours -> Modules -> Audios (Episodes)
```

### Current Features
- Audio streaming from Cloudflare R2
- User authentication (email/password)
- Subscription system (Stripe)
- Free trial (3 days)
- Admin panel (Jinja2)
- Adaptive web/mobile layout
- Password reset via email (SendPulse)
- Reading Mode / Mode Lecture
- Splash screen (3s, SIJILL PROJECT logo)

---

## Completed Development

### Phase 1: Text Reading Mode - COMPLETED
- Backend: Transcript API endpoints (CRUD + upload docx + sync from R2)
- Frontend: TranscriptReader component with markdown rendering
- Integration: "Lire" button in audio player
- Admin: Upload Word documents, "Sync Textes R2" button

### Phase 3: Website Redesign - v4 COMPLETED
- React SPA (Vite) served via FastAPI at `/api/site/`
- Pages: Home, Cursus, Catalogue, Course detail, Login, Register, About, Resource Viewer
- About page v3: Hero manifesto, gold accents, 4 principle cards, domain tags, vision block
- CourseDetail: 5 resource tabs, cursus-specific timeline filtering
- ResourceViewer v3: Context + Bibliography layouts matching mobile app
- Auth: Login/Register/Logout with localStorage token
- Audio player: Fixed bar with controls, transcript toggle

### Bibliography Sync Fix - COMPLETED
- Positional matching (N-th file -> N-th course per cursus)
- Tolerant regex for R2 filenames with spaces
- Local module numbering (1-based per cursus)
- Auto-cleanup of orphaned entries
- 22 biblios correctly synced

### Bibliography Display Improvements - COMPLETED
- Filtered out header sections (Sijill Project, Bibliographie sélective, Cursus X, Module N — Title)
- Filtered out footer section (Le Sijill — Plateforme académique)
- Annotation text (after Note pédagogique) rendered in italic
- Font size toggle (A/A+/A++) on both mobile app and website
- Applied to BOTH mobile app (bibliography/[id].tsx) and website (ResourceViewer.jsx)
- 100% tests passed (iteration 25)

### Mobile App Header Fix - COMPLETED
- Fixed web mobile header: correct style references for logo
- Added profile avatar access in web mobile header
- Fixed handleSearch hoisting error

---

## Backlog

### Phase 2: Blog Section (P1)
- Article management in admin
- Categories and tags
- Markdown content from Cloudflare
- Free access for all users

### Phase 4: Individual Course Purchases (P2)
- Course-level pricing in admin
- 19EUR per course for 6 months
- Mixed access (subscription + purchases)

### Future (P3)
- Offline mode, Push notifications, Newsletter
- Refactor backend/server.py into APIRouter modules
- Admin panel improvement (tree structure display)
- Admin Dashboard for Analytics, "My Subscription" page

---

## Known Issues
- Login fails on native mobile app (iOS) - BLOCKED on new EAS build
- Splash screen "double loop" on native app
- Apple App Store submission pending review

---

## Credentials
- Admin: loubna.serrar@gmail.com / Admin123!
- Test user: loubniz@hotmail.com / loulouz
- Apple test: apple-test@sijillproject.com / AppleTest123!
