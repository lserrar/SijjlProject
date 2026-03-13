# Sijill Project - PRD

## Original Problem Statement
Build "Sijill", an Islamic studies e-learning platform with:
- Reading Mode for audio episode transcripts
- Public website with course catalogue
- Admin panel for content management
- Blog section ("Sijill Times") - NYT-style design
- Future: Advanced monetization (one-time course purchases)

## Core Architecture
- **Backend**: FastAPI + MongoDB + Jinja2 (admin panel)
- **Frontend (Mobile)**: React Native (Expo Web)
- **Frontend (Website)**: React + Vite at `/app/website-react/`
- **Content Storage**: Cloudflare R2
- **Content Hierarchy**: Cursus -> Cours -> Modules -> Audios

## What's Been Implemented
- [x] Reading Mode (transcripts for audio episodes)
- [x] Full public website rebuild (React + Vite)
- [x] Admin Panel overhaul (tree view, manifest upload, publish/unpublish)
- [x] Episode publishing system (active/inactive toggles)
- [x] Blog "Sijill Times" - full backend sync + NYT-style frontend
- [x] Blog build deployment fix (Feb 2026)
- [x] Blog UI adjustments: bigger series title, prominent year/dates, photo thumbnails, removed article image
- [x] Admin: renamed "Blog Waraqa" to "Blog"
- [x] Cursus page text updated to match app
- [x] **SEO** (Feb 2026): OG meta tags, Twitter Cards, react-helmet-async, server-side OG injection for blog articles, robots.txt, sitemap.xml (dynamic with blog articles)
- [x] **Social sharing** (Feb 2026): Facebook, X, LinkedIn, WhatsApp share buttons on blog articles
- [x] **Legal pages** (Feb 2026): Mentions légales, Politique de confidentialité, CGU
- [x] **Footer update** (Feb 2026): Social icons (Facebook, Instagram, YouTube), legal links, App Store/Google Play placeholders, Sijill Times link

## Known Issues
- Login fails on native mobile app (blocked - needs new EAS build)
- Splash screen "double loop" on native app (blocked)

## Prioritized Backlog
### P1
- Prepare for Hostinger deployment (Docker config, migration scripts)
- Finalize App Store / Google Play submission (pending KBIS)

### P2
- Advanced monetization (one-time course purchases)
- Refactor `backend/server.py` into modular APIRouter structure

### P3
- Admin panel analytics dashboard
- "My Subscription" page
- Newsletter functionality
- Offline mode
- Push notifications

## Key API Endpoints
- `POST /api/blog/sync-r2` - Sync blog articles from R2
- `GET /api/blog` - Public blog articles list
- `GET /api/blog/{slug}` - Single article by slug
- `GET /api/blog/image/{article_id}` - Article images
- `GET /api/site/robots.txt` - SEO robots.txt
- `GET /api/site/sitemap.xml` - Dynamic sitemap
- `PATCH /api/admin/audios/{audio_id}/toggle` - Toggle episode
- `POST /api/admin/courses/{course_id}/toggle-all` - Bulk toggle
- `GET /api/audios` - Public audios (active only)

## 3rd Party Integrations
- Cloudflare R2, Stripe, SendPulse, Expo EAS, python-docx

## Credentials
- Admin: loubna.serrar@gmail.com / Admin123!
- Test User: loubniz@hotmail.com / loulouz
