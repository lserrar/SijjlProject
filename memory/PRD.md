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
│   ├── static/            # Web Admin Panel HTML/CSS/JS
│   ├── templates/         # Jinja2 templates for web admin
│   └── tests/             # Tests pytest
├── frontend/              # React Native (Expo for Web)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx      # Homepage text-only prestige (✅ 2025-02)
│   │   │   ├── profil.tsx     # Profil utilisateur (admin button ouvre web panel)
│   │   │   └── _layout.tsx    # Tab bar 5 onglets
│   │   ├── cursus/[id].tsx    # Page Cours - REFONTE COMPLÈTE ✅ 2026-02-24
│   │   ├── audio/[id].tsx     # Player audio redesign prestige (✅ 2026-02)
│   │   ├── course/[id].tsx    # Page cours avec "Commencer le cours"
│   │   ├── search.tsx         # Écran de recherche
│   │   └── ...
│   │   # NOTE: admin/ supprimé (2026-02-24) - admin web uniquement
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── PlayerContext.tsx  # Gestion audio global + callback onFinish
│   └── components/
│       └── MiniPlayer.tsx     # MiniPlayer redesign prestige (✅ 2026-02)
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

### 2026-02 — Session actuelle
- ✅ Homepage prestige text-only (Cinzel/EB Garamond, badges Top 5, hover cards)
- ✅ Hero "À la une" dynamique : cursus ET cours, hero_title/hero_description personnalisables
- ✅ Effet hover cards épisodes (fond + bordure bas colorée, transition 0.2s)
- ✅ Player audio redesign complet : artwork géométrique, waveform 30 barres, scrubber thumb, contrôles, vitesse, bookmark/share/download, description, épisode suivant
- ✅ Backend GET /api/audios/{id} enrichi : cursus_color, cursus_letter, scholar_name, total_episodes
- ✅ Admin : page Cursus (étoile featured + hero text), bouton étoile dans liste cours, champs hero dans formulaire cours
- ✅ MiniPlayer redesign prestige (sans image, contrôles simplifiés)
- ✅ Effet hover "halo blanc" sur Top 5 du mois

### 2026-02-24 — Session actuelle
- ✅ **Page "Qui sommes-nous"** (manifeste intellectuel) :
  - Renommage de "À propos" vers "Qui sommes-nous"
  - Hero avec gradient verdâtre (#0C1A12 → #0A0A0A), cercles décoratifs, ligne dorée verticale
  - Eyebrow or "NOTRE IDENTITÉ" + titre Cinzel + sous-titre EB Garamond italique
  - Introduction académique
  - Section "Pourquoi Sijill Project ?" avec emphases en gras
  - Citation Shlomo Pines avec bloc doré et guillemet typographique
  - 4 Principes (cartes avec numéros et chiffres fantômes, hover vert)
  - Mosaïque de 15 domaines (tags colorés : Falsafa, Kalām, Soufisme, etc.)
  - Bloc "Notre ambition" avec gradient doré
  - Footer SIJILL PROJECT avec devise "Rigueur · Pluralité · Transmission"
  - 3 séparateurs diamant or entre sections
- ✅ **Connexion Bibliothèque aux vraies données** (`/app/(tabs)/bibliotheque.tsx`) :
  - Nouvel endpoint `GET /api/user/library` : retourne in_progress, favorites, completed, global_progress
  - Affichage dynamique des épisodes en cours avec progression
  - Affichage des favoris avec date relative ("Aujourd'hui", "Il y a 2j", etc.)
  - Affichage des épisodes terminés
  - États vides élégants avec icônes
  - Pull-to-refresh fonctionnel
- ✅ **Connexion Profil aux vraies données** (`/app/(tabs)/profil.tsx`) :
  - Nouvel endpoint `GET /api/user/stats` : retourne courses_followed, listening_hours, favorites_count, completed_count, in_progress_count
  - Stats dynamiques : "X Cours suivis", "Xh Temps d'écoute", "X Contenus sauvegardés"
  - Niveau académique calculé dynamiquement (Débutant → Initié → Intermédiaire → Avancé → Expert)
  - Barre de progression du niveau
  - Pull-to-refresh fonctionnel
- ✅ **Admin Pages Légales** (déjà fonctionnel) :
  - Page `/api/admin-panel/legal` pour éditer Politique de confidentialité et CGU
  - Endpoints `GET /api/legal/{type}` et `PUT /api/admin/legal/{type}`
- ✅ **Amélioration Google Auth Mobile** :
  - Ajout des options `showInRecents` et `preferEphemeralSession` pour meilleure UX mobile
- ✅ **Bug fix datetime timezone** : Correction comparaison datetime naive vs aware dans `/api/user/library`

### 2026-02-25 — Session actuelle
- ✅ **Bug fix: Images professeurs** (`cursus/[id].tsx`) :
  - Correction de l'affichage des photos dans l'onglet Professeurs
  - Import du composant `Image` de React Native
  - Ajout de la condition `scholar.photo` pour afficher l'image ou les initiales
  - Mise à jour des URLs photos dans MongoDB (ancien domaine `sijill-preview` → `quranic-studies-1`)
- ✅ **Bug fix: Descriptions épisodes** (`app/(tabs)/index.tsx`) :
  - Ajout du prop `description` à `EpisodeCard`
  - Style `epDesc` en EB Garamond italique, couleur ivoire 50%
- ✅ **Synchronisation professeurs Cursus A** :
  - Tous les cours et épisodes du Cursus A assignés à Meryem Sebti
  - Le cours 22 (Soufisme/Taṣawwuf) assigné à Eric Geoffroy
  - 25+ audios mis à jour avec le bon scholar_id et scholar_name
- ✅ **Amélioration sync R2** (`server.py` `/admin/courses/{id}/sync-r2`) :
  - Préservation des descriptions existantes lors de la re-synchronisation
  - Préservation des titres, thumbnails, topics personnalisés
  - Les nouvelles syncs n'écrasent plus les données éditées manuellement
- ✅ **Panel Admin : Sélection multiple** (`audios.html`) :
  - Cases à cocher pour sélectionner plusieurs épisodes
  - Checkbox "tout sélectionner" dans l'en-tête
  - Barre d'actions groupées : assigner professeur ou catégorie en lot
  - Lignes sélectionnées surlignées en vert
- ✅ **Panel Admin : Synchronisation R2 directe** (`audios.html`) :
  - Nouveau bouton "Sync R2" dans la barre d'outils
  - Modal avec dropdown cours + champ dossier R2
  - Message explicatif sur la préservation des descriptions
  - Aperçu du résultat après synchronisation

### 2026-02-24 — Session précédente
- ✅ **REFONTE COMPLÈTE Page Cours** (`/cursus/[id].tsx`) :
  - Hero avec dégradé sombre verdâtre (#0D1F17 → #090F0C → #0A0A0A)
  - Radial glow effect + bordure gauche gradient vert
  - Navigation retour avec icônes recherche/more
  - Eyebrow "Cursus A · Falsafa" avec ligne décorative
  - 4 statistiques : Cours, Épisodes, Durée totale, % Complété
  - Barre de progression globale avec labels
  - **Onglets sticky** : COURS (actif) / PROFESSEURS / RESSOURCES
  - **Système d'accordéon** pour les cours :
    - Sections "En cours", "À venir", "Terminés"
    - Cards avec 3 états (todo/active/done)
    - Icône statut circulaire (cercle gris / vert play / check)
    - Un seul cours déplié à la fois
  - **Contenu déplié** :
    - Barre de progression du cours
    - Description
    - Liste mini des épisodes avec boutons play (3 états)
    - Boutons action "COMMENCER/Continuer" + "SAUVEGARDER"
- ✅ **REFONTE COMPLÈTE Page Cours individuel** (`/course/[id].tsx`) :
  - Même design prestige que Page Cursus
  - Hero avec dégradé, eyebrow Cursus, titre Cinzel
  - Info professeur avec avatar initiales
  - Stats (Épisodes, Durée, % Complété) + barre de progression
  - Boutons action "COMMENCER" + "SAUVEGARDER"
  - Liste des épisodes avec 3 états visuels
  - Badge "Aperçu gratuit" pour premier épisode non-abonné
  - Section "À propos de ce cours"
- ✅ **REFONTE Onglet Cursus** (`/app/(tabs)/cursus.tsx`) :
  - Barre navigation haute sticky (SIJILL + point vert + recherche)
  - Hero avec gradient : eyebrow "5 Cursus disponibles", titre, sous-titre
  - Liste de 5 cartes cursus avec :
    - Bordure gauche colorée (vert, violet, orange, rose, cyan)
    - Tag "Cursus X · Nom" en couleur
    - Stats "N cours · Xh" à droite
    - Titre Cinzel + Description EB Garamond
    - Footer stats avec icônes (épisodes, durée)
    - Barre de progression en bas
- ✅ **MiniPlayer amélioré** :
  - Mini waveform : 15 barres rectangulaires qui s'allument progressivement
  - Timer en chiffres : "1:45 / 3:20" (position actuelle en vert)
- ✅ **Suppression Admin Mobile** : Dossier `/app/frontend/app/admin/` supprimé
  - Le bouton admin dans profil.tsx ouvre maintenant le web panel (`/api/admin-panel/login`) via Linking

---

## Backlog Priorisé

### P0 — Terminé ✅
- ✅ Connecter "Ma Bibliothèque" aux vraies données
- ✅ Connecter "Profil" aux vraies données
- ✅ Interface admin pour pages légales
- ✅ **Bug fix: Images professeurs** (2026-02-25) : Correction de l'affichage des photos dans l'onglet Professeurs de cursus/[id].tsx
- ✅ **Bug fix: Descriptions épisodes** (2026-02-25) : Ajout de l'affichage des descriptions dans les cartes d'épisodes sur la page d'accueil

### P1 — Prochain sprint
- ✅ Design MiniPlayer validé par utilisateur
- Implémenter l'onglet "Ressources" sur la Page Cursus (intégrer les fichiers Biblio/ depuis R2)
- Synchroniser le nouveau cursus "Géographes" depuis R2
- Appliquer le Paywall sur tout le contenu premium (useAccessCheck hook)
- Ajouter play_count tracking dans le player audio (appel POST /audios/{id}/play au démarrage)
- Implémenter l'authentification Apple (nécessite configuration développeur Apple)

### P2 — Futur
- Refactoriser backend/server.py en routers modulaires
- Section "Continuer à regarder" enrichie (afficher position exacte)
- "Recommandations pour vous" basées sur historique
- Notifications push
- Pagination des bandeaux sur homepage (lazy loading)
- Améliorer le logo Sijill
