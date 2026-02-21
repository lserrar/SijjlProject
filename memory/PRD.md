# HikmabyLM - Product Requirements Document

## Project Overview
**App Name**: HikmabyLM  
**Language**: French  
**Platform**: Expo (iOS/Android) + Web Admin Panel (FastAPI + MongoDB)

## Core Architecture

### 3-Level Content Hierarchy
```
Cursus (7 total)
└── Cours (45+ courses)
    └── Modules (93+ modules)
        └── Audios (Épisodes)
```

### Database Collections
- `cursus`: `{id, name, description, icon, order, is_active, course_count}`
- `courses`: `{id, title, description, cursus_id/thematique_id, scholar_id, scholar_name, is_active, module_count}`
- `modules`: `{id, name, description, course_id, scholar_name, order, episode_count, is_active}`
- `audios`: `{id, title, description, module_id, episode_number, category_id, file_key, is_active}`
- `audio_categories`: `{id, name, r2_folder_path, is_active}`

## Current Status

### Implemented Features (December 2025)

#### Mobile App (Expo Web) ✅ FIXED
- **Login/Registration**: Email & password, Google, Apple sign-in
- **Homepage**: "Continue watching", "Recommended for you", featured courses
- **Cursus Page**: All 7 cursus displayed with course counts
  - Expandable cursus showing all courses inside
  - Navigation to course details
- **Navigation**: Accueil, Cursus, Ressources, Live, Profil, À propos

#### Admin Panel - 3-Level Hierarchy ✅
- **Page Cursus** (`/api/admin-panel/cursus`):
  - List 7 cursus with course counts
  - Bulk actions (activate/deactivate multiple items)
  - Create/Edit/Delete cursus
  - Toggle individual cursus status
  - Navigation to filtered courses

- **Page Cours** (`/api/admin-panel/courses`):
  - List courses with module counts
  - Bulk actions (activate/deactivate)
  - Filter by cursus
  - Featured course setting
  - Navigation to filtered modules

- **Page Modules** (`/api/admin-panel/modules`):
  - List modules with parent course
  - Bulk actions (activate/deactivate)
  - Filter by course
  - Scholar assignment
  - Episode count tracking

- **Page Audios** (`/api/admin-panel/audios`):
  - Link audios to modules (instead of courses)
  - Episode number assignment
  - Audio categories with R2 folder paths
  - R2 file browser integration

#### Backend APIs ✅
- `GET/POST/PUT/DELETE /api/admin/cursus`
- `POST /api/admin/cursus/bulk-toggle`
- `GET/POST/PUT/DELETE /api/admin/courses`
- `POST /api/admin/courses/bulk-toggle`
- `GET/POST/PUT/DELETE /api/admin/modules`
- `POST /api/admin/modules/bulk-toggle`
- `GET/POST/PUT/DELETE /api/admin/audios`
- `GET/POST/PUT/DELETE /api/admin/audio-categories`

#### Data Migration ✅
- 7 Cursus populated from user document
- 45+ Courses created
- 93+ Modules created
- All linked in proper hierarchy

### Known Issues

#### P0 - Critical
- **Mobile App Non-Functional**: Expo app crashes on launch due to ngrok tunnel issues (`err_NGROK_3200`). This is an infrastructure problem in the preview environment.

#### P2 - Minor
- **"Pierre Marchal" Mystery**: A user visible to client but not found in database queries. Suggests potential data integrity issue.

## Upcoming Tasks

### P1 - High Priority
1. **Update Mobile App UI for 3-Level Hierarchy**: Once tunnel is fixed, update navigation to show Cursus -> Cours -> Modules flow
2. **Apply Paywall to All Protected Content**: Implement `useAccessCheck` hook on premium content screens

### P2 - Medium Priority
1. **Homepage Backend Logic**: Implement "Continue Watching" and "Recommendations" features
2. **Push Notifications**: Implement notification system for new content

### P3 - Low Priority
1. **Refactor server.py**: Break down 2500+ line monolithic file into modular routers

## Technical Stack
- **Frontend**: React Native + Expo
- **Backend**: FastAPI + Python
- **Database**: MongoDB
- **Storage**: Cloudflare R2
- **Payments**: Stripe (subscriptions, promo codes)

## Admin Credentials
- **URL**: `/api/admin-panel/login`
- **Email**: `admin@hikma-admin.com`
- **Password**: `Admin123!`

## API Base URL
- **Preview**: `https://islamic-content-hub-2.preview.emergentagent.com`
