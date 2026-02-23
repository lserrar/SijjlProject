# Sijill - Product Requirements Document

## Project Overview
**App Name**: Sijill (anciennement "Le Sijill", anciennement "Hikma by LM")
**Language**: French
**Platform**: Expo (Web) + Web Admin Panel (FastAPI + MongoDB)

## Core Architecture

### 5 Cursus Structure
```
A. La Falsafa et son héritage (7 cours, ~30 modules)
B. Théologie et Droit (2 cours)
C. Sciences islamiques et transmission (5 cours)
D. Arts, Littérature et Sciences (6 cours)
E. Philosophies et spiritualités connexes (4 cours)
```

### Database Collections
- `cursus`: `{id, name, description, icon, order, is_active, course_count}`
- `courses`: `{id, title, description, cursus_id, thumbnail, duration, scholar_name, level, is_active}`
- `modules`: `{id, name, course_id, order, episode_count, is_active}`
- `audios`: `{id, title, module_id, course_id, file_key, episode_number, type, is_active}`
- `audio_categories`: `{id, name, r2_folder_path, is_active}`

## Current Status (Updated Feb 2026)

### Implemented Features ✅

#### Mobile App (Expo Web)
- Login/Registration: Email & password, Google sign-in
- Homepage: Featured courses, recommendations
- **Cursus Page**: All 5 cursus (A-E) displayed with course counts
  - Expandable cursus showing all courses inside
  - Navigation to course detail page
- **Course Detail Page**: Real modules displayed (not dummy data)
  - Modules fetched from `/api/modules?course_id={id}`
  - Audio per module fetched from `/api/audios?module_id={id}`
  - Clickable modules navigate to audio player (`/audio/{id}`)
  - First module free preview, rest locked for non-subscribers
- Navigation: Accueil, Cursus, Ressources, Live, Profil, À propos
- App name: "Sijill" (renamed from "Le Sijill")

#### Admin Panel - 3-Level Hierarchy ✅
- Cursus management (`/api/admin-panel/cursus`)
- Cours management (`/api/admin-panel/courses`)
- Modules management (`/api/admin-panel/modules`)
- Audios management (`/api/admin-panel/audios`)

#### Backend APIs ✅
- `GET /api/audios?module_id={id}` — filter audios by module (new)
- `GET /api/modules?course_id={id}` — list modules for a course
- `GET /api/audios/{id}/stream-url` — R2 presigned URL for streaming
- `GET /api/cursus`, `GET /api/courses`, `GET /api/modules`

#### Audio Sync ✅ (Feb 2026)
- 70 audio files from R2 bucket synced to database
- R2 path structure: `Audio/cursus-{x}/{course-num}/{module-slug}/episode-01.m4a`
- Each audio linked to its module via `module_id` + `file_key`
- **Audio proxy streaming** via `/api/audios/{id}/stream` (backend proxies R2 to avoid CORS)
- `PUBLIC_URL` env var in backend .env controls proxy base URL
- HEAD + GET + Range requests fully supported on proxy endpoint

#### Data ✅
- 5 Cursus (A-E)
- 24 Courses with duration, scholar_name, level populated
- 101 Modules (all active)
- 70 Audios linked to modules with R2 file_keys

### Known Issues
#### Resolved
- ~~Audio playback broken~~ → Fixed! 70 audios synced from R2
- ~~Henry Corbin old data~~ → Fixed! Cleared and replaced
- ~~"NaNmin" in course duration~~ → Fixed! Courses updated with calculated duration
- ~~Mobile App Non-Functional~~ → Workaround: Expo Web mode

#### P3 - Minor
- Expo service uses ngrok which keeps failing. Port 3000 works locally. Environment issue.
- "Pierre Marchal" mystery user - low priority data integrity issue

## Upcoming Tasks

### P1 - High Priority
1. **Logo Sijill** - Improve the logo design in the app
2. **Page d'accueil** - Improve homepage display
3. **Sync Géographes** - Add audio for `cours-geographie` when files are added to R2
4. **Onglet "Ressources" → "Autres"** - Display audio categories (Quran, music)

### P2 - Medium Priority
1. **Apply Paywall**: Implement `useAccessCheck` on all premium content screens
2. **Homepage Logic**: "Continue Watching" and "Recommendations" features
3. **Push Notifications**

### P3 - Low Priority
1. **Refactor server.py**: Break down 2500+ line monolithic file
2. **Audio durations**: Get real durations from R2 metadata instead of 0

## Technical Stack
- Frontend: React Native + Expo (Web mode)
- Backend: FastAPI + Python
- Database: MongoDB (`test_database`)
- Storage: Cloudflare R2 (`hikma-audio` bucket)
- Payments: Stripe

## Admin Credentials
- URL: `/api/admin-panel/login`
- Email: `admin@hikma-admin.com`
- Password: `Admin123!`

## Test User
- Email: `testuser@hikma.com`
- Password: `TestUser123!`

## API Base URL
- Preview: `https://audio-playlist-5.preview.emergentagent.com`
