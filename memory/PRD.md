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
- **Production**: VPS Hostinger (Ubuntu 24.04, Docker Compose)
- **Domains**: sijillproject.com (primary), .fr/.org redirect to .com

## What's Been Implemented
- [x] Reading Mode (transcripts for audio episodes)
- [x] Full public website rebuild (React + Vite)
- [x] Admin Panel overhaul (tree view, manifest upload, publish/unpublish)
- [x] Episode publishing system (active/inactive toggles)
- [x] Blog "Sijill Times" - full backend sync + NYT-style frontend
- [x] Blog UI adjustments: bigger series title, prominent year/dates, photo thumbnails
- [x] Admin: renamed "Blog Waraqa" to "Blog"
- [x] Cursus page text updated to match app
- [x] Home page hero text: "Comprendre, transmettre, penser la pluralité des savoirs islamiques"
- [x] SEO: OG meta tags, Twitter Cards, react-helmet-async, server-side OG injection, robots.txt, sitemap.xml
- [x] Social sharing: Facebook, X, LinkedIn, WhatsApp on blog articles
- [x] Legal pages: Mentions légales, Politique de confidentialité, CGU
- [x] Footer: Social icons (Facebook, Instagram), legal links, App Store/Google Play placeholders
- [x] Bug fix: playlist endpoint (episodes were empty due to missing module_id)
- [x] **Production deployment on Hostinger VPS** (Feb 2026): Docker Compose, Nginx, SSL, MongoDB migration
- [x] Domain redirections: sijillproject.fr, .org → sijillproject.com

## Known Issues
- Login fails on native mobile app (blocked - needs new EAS build)
- Splash screen "double loop" on native app (blocked)

## Prioritized Backlog
### P1
- Add Google Analytics / tracking
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
- YouTube channel creation + footer link update

## Key API Endpoints
- `POST /api/blog/sync-r2` - Sync blog articles from R2
- `GET /api/blog` - Public blog articles list
- `GET /api/blog/{slug}` - Single article by slug
- `GET /api/blog/image/{article_id}` - Article images
- `GET /api/site/robots.txt` - SEO robots.txt
- `GET /api/site/sitemap.xml` - Dynamic sitemap
- `GET /api/courses/{course_id}/playlist` - Course playlist (fixed)
- `PATCH /api/admin/audios/{audio_id}/toggle` - Toggle episode
- `GET /api/audios` - Public audios (active only)

## Production URLs
- Site: https://sijillproject.com
- Blog: https://sijillproject.com/blog
- Admin: https://sijillproject.com/api/admin-panel/
- API: https://sijillproject.com/api/

## Deployment
- VPS: Hostinger KVM, Ubuntu 24.04, IP 187.124.40.195
- Stack: Docker Compose (Nginx + FastAPI + MongoDB + Certbot)
- SSL: Let's Encrypt (auto-renewal via certbot container)
- Update: git pull + docker compose build --no-cache backend + docker compose up -d + restart nginx

## Social Links
- Facebook: https://www.facebook.com/sijill.project
- Instagram: https://www.instagram.com/sijillproject/
- YouTube: (à créer)

## 3rd Party Integrations
- Cloudflare R2, Stripe, SendPulse, Expo EAS, python-docx

## Credentials
- Admin: loubna.serrar@gmail.com / Admin123!
- Test User: loubniz@hotmail.com / loulouz
