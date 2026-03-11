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
- Reading Mode / Mode Lecture (March 2026)
- Splash screen (3s, SIJILL PROJECT logo)

### iOS App Store Compliance (v1.0.2)
- Removed Google Sign-In (only email/password)
- Removed Apple Sign-In button
- Hidden subscription plans on iOS (trial only)
- Removed promo codes on iOS
- No external payment links on iOS
- Test account: apple-test@sijillproject.com / AppleTest123!

---

## Completed Development

### Phase 1: Text Reading Mode - COMPLETED (March 2026)
- Backend: Transcript API endpoints (CRUD + upload docx + sync from R2)
- Frontend: TranscriptReader component with markdown rendering
- Integration: "Lire" button in audio player
- Admin: Upload Word documents, "Sync Textes R2" button

### Phase 3: Website Redesign - v4 COMPLETED (February 2026)
- React SPA (Vite) served via FastAPI at `/api/site/`
- Pages: Home, Cursus, Catalogue, Course detail, Login, Register, About, Resource Viewer
- Design: Dark mode, Cinzel/EB Garamond fonts, gold accents (#C9A84C), green accent (#04D182)
- **About page v3**: Hero manifesto, gold accents, 4 principle cards with ghost numbers, domain tags grid, vision block, footer logo
- **CourseDetail**: 5 resource tabs (Episodes, Frise, Contexte, Bibliographie, Conferences), cursus-specific timeline filtering
- **ResourceViewer v3**: Context (module info, thinker name, diamond divider, colored section bars), Bibliography (title with accent bar, diamond divider)
- Auth: Login/Register/Logout with localStorage token
- Audio player: Fixed bar with controls, transcript toggle
- Body text font-size: 18px

### Bibliography Sync Fix - COMPLETED (February 2026)
- Fixed sync logic from R2: positional matching (N-th file → N-th course per cursus)
- Fixed regex to handle spaces in R2 filenames
- Local module numbering (1-based per cursus) instead of global
- Auto-cleanup of orphaned entries
- Fixed standardize-titles for new numbering
- 22 biblios correctly synced, 2 extra files skipped, 19 orphans deleted

### Mobile App Header Fix - COMPLETED (February 2026)
- Fixed web mobile header: incorrect style references (logoWrapper→wordmarkRow, logoText→logoSijill)
- Added profile avatar access in web mobile header
- Logo now shows "SIJILL PROJECT." correctly

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
- Offline mode (download episodes)
- Push notifications
- Newsletter for new episodes
- Refactor backend/server.py into APIRouter modules
- Admin panel improvement (tree structure display)
- Admin Dashboard for Analytics
- "My Subscription" page

---

## Known Issues
- Login fails on native mobile app (iOS) - BLOCKED on new EAS build
- Splash screen "double loop" on native app
- Apple App Store submission pending review
- Intermittent 502 Bad Gateway (platform-level)

---

## Credentials

**Admin Panel**: `/api/admin-panel/login`
- Email: loubna.serrar@gmail.com / Admin123!

**Test Users**:
- loubniz@hotmail.com / loulouz
- apple-test@sijillproject.com / AppleTest123! (expired trial)

**Services**: Cloudflare R2, Stripe, SendPulse
