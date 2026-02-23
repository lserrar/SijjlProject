# Sijill — PRD (Product Requirements Document)

## Nom de l'application
**Sijill** — Plateforme d'études islamiques en ligne

## Langue de l'interface
Français (fr)

## Type d'application
React Native (Expo Web) + FastAPI backend + MongoDB

---

## Description du produit
Sijill est une plateforme académique d'études islamiques proposant une hiérarchie de contenu en 3 niveaux :
**Cursus → Cours → Modules → Audios (Épisodes)**

Le contenu audio est stocké dans un bucket Cloudflare R2.

---

## Personas utilisateurs
- **Étudiants** : accès au catalogue, lecture audio, suivi de progression
- **Auditeurs libres** : navigation, recherche, écoute gratuite ou payante
- **Administrateurs** : gestion du contenu (panneaul admin)

---

## Architecture technique

```
/app
├── backend/
│   ├── server.py          # FastAPI monolithique (proxy R2, playlist, home, search, top10)
│   ├── sync_r2_audios.py  # Script de sync R2 → MongoDB
│   └── tests/             # Tests pytest
├── frontend/              # React Native (Expo for Web)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx      # Homepage text-only prestige (REFONTE FINALE ✅ 2025-02)
│   │   │   └── _layout.tsx    # Tab bar 5 onglets (bug double-export corrigé ✅)
│   │   ├── audio/[id].tsx     # Player audio avec playlist auto-play
│   │   ├── course/[id].tsx    # Page cours avec "Commencer le cours"
│   │   ├── search.tsx         # Écran de recherche (NOUVEAU)
│   │   └── ...
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── PlayerContext.tsx  # Gestion audio global + callback onFinish
│   └── components/
│       └── MiniPlayer.tsx
└── r2-assets/                 # Mount Cloudflare R2
```

---

## Schéma DB (MongoDB)

- `cursus`: `{id, name, description, icon, order, is_active, is_featured, hero_title, hero_description}`
- `courses`: `{id, title, cursus_id, scholar_id, scholar_name, thumbnail, duration, modules_count, is_active, is_featured, play_count, r2_folder, hero_title, hero_description}`
- `modules`: `{id, title, course_id, is_active, order}`
- `audios`: `{id, title, audio_url, file_key, module_id, course_id, episode_number, order, play_count, is_active}`
- `scholars`: `{id, name, photo, bio, specializations, is_active}`
- `user_progress`: `{user_id, content_id, content_type, progress, position, updated_at, completed}`
- `config`: `{key: 'top10_courses', course_ids: [...]}` (configuration admin)

---

## API Endpoints Clés

### Publics
- `GET /api/home` — Homepage data (featured_course avec hero_type='cursus'|'course', continue_watching, recommendations, scholars, top5_courses)
- `GET /api/search?q=...` — Recherche épisodes/cours par mots-clés
- `POST /api/audios/{id}/play` — Incrémenter compteur d'écoutes
- `GET /api/courses/{id}/playlist` — Playlist ordonnée d'un cours
- `GET /api/audios/{id}/stream` — Streaming proxy R2 (contournement CORS)
- `POST /api/user/progress` — Sauvegarder progression (position, progress%)
- `GET /api/user/progress` — Récupérer progressions utilisateur

### Admin
- `GET /api/admin/top10` — Voir la config Top 10
- `PUT /api/admin/top10` — Mettre à jour le Top 10 manuellement
- Admin CRUD pour cursus, cours, modules, audios, scholars

---

## Ce qui a été implémenté

### Session actuelle (Feb 2026)
- ✅ **Design System complet** (brief Sijill Option A) :
  - Typographie : Cinzel (titres/navigation) + EB Garamond (corps/descriptions)
  - Palette : #0A0A0A bg, #F5F0E8 ivoire, #04D182 vert, #C9A84C or
  - Logo SIJILL en Cinzel avec point vert lumineux
  - Boutons carrés (sans border-radius), bordures 1px #222222
  - Bouton primaire : vert #04D182, Cinzel uppercase, letter-spacing 4px
  - Bouton secondaire : bordure or, texte or transparent
  - Tab bar : Cinzel 7px, uppercase, letter-spacing 2px
- ✅ **Refonte homepage Netflix-style** :
  - Header : "Bonjour [prénom]" + icône recherche (sans logo Sijill)
  - Hero card "À LA UNE" avec gradient + badge + bouton "Commencer"
  - Section "Reprendre la lecture" (progression utilisateur)
  - Section "Recommandations" (scroll horizontal)
  - Section "Professeurs" (avatars circulaires)
  - Section "Top 10 du mois" (numéros Netflix-style)
  - Bandeaux par cours (24 bandeaux horizontaux d'épisodes)
- ✅ **Écran de recherche** (`/search`) : input autofocused, résultats en temps réel (debounced 350ms)
- ✅ **Backend** : endpoint `/api/search`, `/api/audios/{id}/play`, `/api/admin/top10` GET/PUT
- ✅ **Suivi du play_count** sur audios et cours
- ✅ **Top 10 configurable** : par écoutes + override manuel via admin

### Sessions précédentes
- ✅ Synchronisation audios R2 → MongoDB (sync_r2_audios.py)
- ✅ Proxy streaming audio (bypass CORS R2)
- ✅ Playlist avec auto-play séquentiel
- ✅ Homepage restaurée (featured course, scholars)
- ✅ Bugs critiques corrigés (bouton "Commencer le cours", seeking audio)
- ✅ Renommage app en "Sijill"
- ✅ Intégration Stripe (paiement)
- ✅ Auth JWT + Google OAuth

---

## Backlog Priorisé

### P0 — En cours / Vérification
- Vérification utilisateur des dernières corrections (playlist, seeking audio, bouton "Commencer")

### P1 — Prochain sprint
- Améliorer le logo Sijill
- Synchroniser le nouveau cursus "Géographes" depuis R2
- Implémenter l'onglet "Ressources" (sous-onglet "Autres" + "Ressources liées")
- Appliquer le Paywall sur tout le contenu premium (useAccessCheck hook)
- Ajouter play_count tracking dans le player audio (appel POST /audios/{id}/play au démarrage)

### P2 — Futur
- Refactoriser backend/server.py en routers modulaires
- Section "Continuer à regarder" enrichie (afficher position exacte)
- "Recommandations pour vous" basées sur historique
- Notifications push
- Pagination des bandeaux sur homepage (lazy loading)
