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

### Admin Catalogue Tree View - COMPLETED (Mar 2026)
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
