# Sijill Project - PRD (Product Requirements Document)

## 📱 Application Overview
**App Name**: Sijill Project  
**Platform**: React Native (Expo) + FastAPI Backend + MongoDB  
**Language**: French  
**Last Updated**: March 2026

---

## 🎯 Core Product

### Content Hierarchy
```
Cursus → Cours → Modules → Audios (Episodes)
```

### Current Features
- ✅ Audio streaming from Cloudflare R2
- ✅ User authentication (email/password)
- ✅ Subscription system (Stripe)
- ✅ Free trial (3 days)
- ✅ Admin panel (Jinja2)
- ✅ Adaptive web/mobile layout
- ✅ Password reset via email (SendPulse)
- ✅ Splash screen (3s, SIJILL PROJECT logo)

### iOS App Store Compliance (v1.0.2)
- ✅ Removed Google Sign-In (only email/password)
- ✅ Removed Apple Sign-In button
- ✅ Hidden subscription plans on iOS (trial only)
- ✅ Removed promo codes on iOS
- ✅ No external payment links on iOS
- ✅ Test account: apple-test@sijillproject.com / AppleTest123!

---

## 🚀 Upcoming Development (Phase 1 + 3)

### Phase 1: Text Reading Mode
**Objective**: Allow users to read episode transcripts while listening

**Database Schema** - New collection `transcripts`:
```javascript
{
  transcript_id: "tr_xxx",
  audio_id: "audio_xxx",
  title: "Episode title",
  content: "Full markdown text...",
  sections: [
    { title: "Section 1", content: "..." },
    { title: "Section 2", content: "..." }
  ],
  word_count: 2375,
  file_url: "https://r2.../transcripts/episode-01.docx",
  created_at: "2026-03-01T...",
  updated_at: "2026-03-01T..."
}
```

**Features**:
- Tab toggle: "🎧 Écouter" / "📖 Lire"
- Formatted text with headings and paragraphs
- Floating audio player during reading
- Reading position saved
- Word file upload in admin panel

**Files to modify**:
- `/app/backend/server.py` - Add transcript endpoints
- `/app/frontend/app/audio/[id].tsx` - Add reading mode
- Admin panel templates for transcript management

---

### Phase 3: Website Redesign (MasterClass Style)

**Objective**: Full-featured website with courses, payments, and blog

**Tech Stack**:
- React (same as app for consistency)
- Shared backend API
- Stripe integration
- Responsive design

**Design Guidelines**:
- Background: #0A0A0A (black)
- Accent: #04D182 (green)
- Typography: Cinzel (headings) + EB Garamond (body)
- Card borders: colored by cursus
- Hover previews
- Minimalist sticky header

**Pages**:
1. Home - Hero + Featured Cursus + Testimonials
2. Cursus - List with previews
3. Course - Details + Episodes + Player
4. Blog - Free articles (future)
5. Profile - Progress + Subscription
6. Checkout - Stripe payments

**User Features**:
- Full audio playback with text reading
- Progress tracking (episodes listened)
- Subscription management
- Same content as mobile app

---

## 📋 Backlog

### Phase 2: Blog Section
- Article management in admin
- Categories and tags
- Markdown content from Cloudflare
- Free access for all users

### Phase 4: Individual Course Purchases
- Course-level pricing in admin
- 19€ per course for 6 months
- Mixed access (subscription + purchases)

### Future
- Offline mode (download episodes)
- Push notifications
- Newsletter for new episodes
- Multi-language (Arabic, English)

---

## 🔧 Technical Architecture

```
┌─────────────────────────────────────────┐
│            CLOUDFLARE R2                │
│  Audios | Transcripts | Blog | Images   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          BACKEND (FastAPI)              │
│  Auth | Courses | Transcripts | Blog    │
│  Payments | Admin Panel                 │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │   App   │ │ Website │ │  Admin  │
   │ (Expo)  │ │ (React) │ │ (Jinja) │
   └─────────┘ └─────────┘ └─────────┘
```

---

## 📊 Database Collections

- `users` - User accounts and subscriptions
- `cursus` - Course categories
- `courses` - Individual courses
- `audios` - Audio episodes
- `transcripts` - Episode text content (NEW)
- `articles` - Blog posts (FUTURE)
- `favorites` - User favorites
- `progress` - Listening progress

---

## 🔐 Credentials

**Admin Panel**: `/api/admin-panel/login`
- Email: loubna.serrar@gmail.com
- Password: Admin123!

**Test Users**:
- loubniz@hotmail.com / loulouz
- apple-test@sijillproject.com / AppleTest123! (expired trial)

**Services**:
- Cloudflare R2: Media storage
- Stripe: Payments
- SendPulse: Email (SMTP)
