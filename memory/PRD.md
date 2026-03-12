# Sijill Project - PRD

## Application Overview
**App Name**: Sijill Project  
**Platform**: React Native (Expo) + FastAPI Backend + MongoDB  
**Language**: French  
**Last Updated**: March 2026

---

## Completed Development

### Phase 1: Text Reading Mode - COMPLETED
- Transcript API + frontend TranscriptReader + admin sync from R2

### Phase 3: Website Redesign - v4 COMPLETED  
- React SPA (Vite) at `/api/site/` with About, CourseDetail (5 tabs), ResourceViewer
- Cursus-specific filtering for timelines, biblios, context, and conferences

### Bibliography System - COMPLETED
- Positional sync from R2, orphan cleanup, content filtering (no header/footer, italic annotations), font size toggle

### Audio Sync System - COMPLETED (Feb 2026)
- Fixed sync to scan `cursus-*/` folders instead of `Audio/`
- R2 path pattern: `cursus-{x}-{name}/{NN}-{module-slug}/[subfolder/]episode-{N}.m4a`
- Automatic course mapping via R2_TO_COURSE_MAPPING (24 courses) + R2_CURSUS_MAPPING (5 cursus)
- Orphan cleanup: removes DB entries for deleted R2 files AND legacy Audio/ entries
- 78 files synced, 0 errors

### Admin Panel Restructuring - COMPLETED (Feb 2026)
- Sidebar reordered: Professeurs -> Cursus -> Cours -> Catalogue -> Ressources -> Bibliographies
- "Audio" renamed to "Catalogue"
- "Ressources" moved from Dashboard section to Contenu section

### Blog Waraqa - COMPLETED (Mar 2026)
- Blog series "Waraqa: Chroniques de la civilisation islamique" - free public access
- Parser extracts articles from .docx files in R2 Blog/ folder
- Each article has: date AH/CE, epoch, title, tags, body sections (Terres d'Islam, Vie Intellectuelle, etc.), context, portrait, thesis, references, author
- Public API: `GET /api/blog` (list), `GET /api/blog/{id}` (detail) - no auth required
- Admin: sync from R2, toggle active/inactive per article
- Website: Blog list page (/blog) + Article detail page (/blog/{id}) with SEO (dynamic title, meta description)
- Admin panel: Blog management page with stats, toggle switches
- 3 articles synced: 370 AH, 150 AH, 179 AH

### Episode Publish/Unpublish System - COMPLETED (Mar 2026)
- Toggle switch on each episode in catalogue tree (green = published, grey = draft)
- Inactive episodes rendered with reduced opacity
- Bulk publish/unpublish buttons per course (eye/eye-slash icons)
- Public API `/api/audios` filters to only return `is_active: true` episodes
- Public API `/api/audios/{id}` also filters by `is_active: true`
- Stats card shows "Publiés" count alongside total
- Endpoints: `PATCH /api/admin/audios/{id}/toggle`, `POST /api/admin/audios/bulk-toggle`

### Admin Manifest Upload - COMPLETED (Mar 2026)
- Upload .docx manifest file via admin panel button "Charger manifeste"
- Parser extracts hierarchical structure: Cursus → Cours → Modules/Penseurs → Professeurs → Épisodes prévus
- Stored in MongoDB `manifest` collection, replaces previous manifest on re-upload
- Enriches catalogue tree view: progress badges (25/61 ép.), manifest modules table (Module/Penseur, Professeur prévu, Ép. prévus vs réels, Statut), stats card "127 Prévus (manifeste)"
- Endpoints: `POST /api/admin/manifest/upload`, `GET /api/admin/manifest`
- Replaced flat audio list with hierarchical Cursus -> Cours -> Episodes collapsible tree view
- Stats summary at top: Cursus count, Courses count, Episodes count, Synced count
- Dynamic data from DB (not hardcoded) - uses `/admin/cursus`, `/admin/courses`, `/admin/audios`, `/admin/scholars` APIs
- Each cursus shows letter (A-E), name, course count, episode count, active/inactive status
- Each course shows number, title, episode count
- Each episode shows: EP number, Title, Professor, Duration, Sync status (green/red dot), Edit/Delete buttons
- Inline edit modal for episodes (title, description, professor, duration)
- Orphan episodes section: shows episodes without a valid course_id
- Sync Preview (`POST /api/admin/sync-preview`): previews changes before R2 sync
- Sync All (`POST /api/admin/sync-all-r2`): executes full R2 synchronization
- CSS styles embedded directly in content block for reliable rendering
- Template: `audios_new.html` extends `base.html`

---

## Backlog

### Phase 2: Blog Section (P1)
- Article management in admin, categories/tags, free access
- Blog UI in mobile app and website

### Phase 4: Individual Course Purchases (P2)  
- Course-level pricing, 19EUR/course for 6 months

### Admin Manifest Upload (P3)
- Upload `.docx` manifest file to automate content structure creation

### Future (P3)
- Offline mode, push notifications, newsletter
- Refactor backend/server.py into APIRouter modules
- Admin Dashboard for Analytics, "My Subscription" page

---

## Known Issues
- Login fails on native mobile app (iOS) - BLOCKED on new EAS build
- Splash screen "double loop" on native app
- Apple App Store submission pending review

## Credentials
- Admin: loubna.serrar@gmail.com / Admin123!
- Test: loubniz@hotmail.com / loulouz
