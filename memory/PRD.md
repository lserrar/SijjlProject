# Sijill Project — PRD

## Problème original
Plateforme e-learning d'études islamiques "Sijill Project" avec :
- **Site principal** : `sijillproject.com` (React/Vite)
- **Web App** : `app.sijillproject.com` (React Native Expo for Web)
- **Backend** : FastAPI + MongoDB
- **Hiérarchie de contenu** : Cursus → Cours → Modules → Audios

## Stratégie actuelle
- **Web-app-first** : Pause du développement natif mobile, focus sur la PWA
- **Reader App** : L'app mobile/web est en lecture seule (pas de paiement/inscription)
- **Déploiement** : Docker Compose sur VPS Hostinger avec Nginx + SSL Let's Encrypt

## Architecture technique

### Stack
- **Backend** : FastAPI (Python), MongoDB (Motor async), Cloudflare R2 (audio/images)
- **Frontend Website** : React/Vite
- **Frontend Web App** : Expo for Web (React Native)
- **Déploiement** : Docker multi-stage, Docker Compose, Nginx, Let's Encrypt

### Architecture Docker (mise à jour Fév 2026)
```
Dockerfile          → Backend + Website React (2 stages)
nginx/Dockerfile    → Webapp Expo (2 stages: build + nginx)
docker-compose.yml  → mongodb, backend, nginx (custom build), certbot
```

### Nginx routing
- `sijillproject.com` → proxy vers backend (site React via StaticFiles)
- `app.sijillproject.com` → fichiers servis directement par nginx (try_files)
- `/api/*` → proxy vers backend FastAPI

### Intégrations 3rd party
- Cloudflare R2 (stockage audio/images)
- Stripe (paiements sur le site web)
- Let's Encrypt (SSL)
- Docker/Docker Hub

## Ce qui fonctionne
- ✅ Site principal `sijillproject.com` (homepage, catalogue, blog)
- ✅ Blog avec recherche, tri par chronique/année Hijri, SEO (meta keywords, JSON-LD)
- ✅ Blog sync : 50 articles synchronisés correctement depuis R2 — CORRIGÉ collision IDs (Fév 2026)
- ✅ Web App `app.sijillproject.com` — CORRIGÉ architecture nginx (Fév 2026)
- ✅ Page de pré-inscription avec formulaire (prénom + email), hero sur homepage, bouton header — AJOUTÉ (Avr 2026)
- ✅ Backend API complet (auth, courses, audios, streaming, admin, pre-registration)
- ✅ Système de parrainage
- ✅ Système d'abonnement Stripe
- ✅ **7 cursus** (A=Histoire, B=Théologie, C=Sciences, D=Arts, E=Falsafa, F=Mystique, G=Pensées non-islamiques) — RESTRUCTURÉ Fév 2026
- ✅ **Catalogue de lancement Mai 2026** : page Catalogue filtrée sur `is_launch_catalog=true` (19 cours) — AJOUTÉ Fév 2026
- ✅ **Page Cursus** : bandeau "Première vague — Mai 2026", catalogue complet visible, badges « bientôt disponible » — AJOUTÉ Fév 2026
- ✅ **YouTube unlisted** : embed `youtube-nocookie.com` (cours et épisodes), priorité épisode → cours, lien masqué via `sandbox` + `onContextMenu` — AJOUTÉ Fév 2026
- ✅ **Sécurité du contenu premium** (Fév 2026) — Contenu vidéo/podcast restreint aux abonnés :
  - Backend : `youtube_url` retiré des réponses publiques (`/api/courses`, `/api/courses/{id}`, `/api/audios`, `/api/audios/{id}`) si l'utilisateur n'a pas un abonnement actif, un essai gratuit ou le flag admin
  - Backend : `/api/audios/{id}/stream-url` requiert auth + accès actif → retourne une URL signée avec JWT `scope=audio_stream` (expiration 1h)
  - Backend : `/api/audios/{id}/stream` vérifie le token `?t=` sur chaque requête (ou Authorization header en fallback)
  - Frontend CourseDetail : paywall CTA « Contenu réservé aux abonnés » (7 €/mois ou 84 €/an) à la place de l'iframe YouTube si pas d'accès
  - Frontend CourseDetail : clic sur « play » audio redirige vers `/connexion` ou `/pre-inscription` selon l'état
- ✅ **Sécurité Frises / Contexte / Bibliographies / Transcripts / Conférences** (Fév 2026) — Verrou complet sur TOUTES les ressources premium :
  - Backend : `GET /api/timeline/{cursus_letter}` et `GET /api/timeline/file/{filename}` requièrent désormais auth + abonnement actif (header `Authorization` ou token signé `?t=`, scope `content_access`, expiration 1h)
  - Backend : nouveaux endpoints `/api/timeline/{letter}/access-url`, `/api/timeline/file/{filename}/access-url`, `/api/resources/audio/{filename}/access-url` qui délivrent une URL tokenisée pour ouverture/streaming dans un nouvel onglet
  - Backend : `GET /api/resources/context/{resource_id}` (parsing Word docx) et `GET /api/bibliographies/{biblio_id}` requièrent auth + abonnement
  - Backend : `GET /api/transcripts/{audio_id}` requiert auth + abonnement (texte intégral des podcasts)
  - Backend : `GET /api/audios/{audio_id}/transcript` retire le champ `content` et ajoute `locked: true` pour les non-abonnés (existence + métadonnées seulement)
  - Backend : `GET /api/resources/audio/stream/{filename}` (conférences audio) requiert token signé `?t=` (scope `audio_resource_stream`) ou Authorization header
  - Backend : `GET /api/bibliographies` (listing) retire le champ `content` et ajoute `locked: true` pour les non-abonnés
  - Backend : `GET /api/resources/audio` (listing conférences) retire le champ `stream_url` et ajoute `locked: true` pour les non-abonnés
  - Frontend `CourseDetail.jsx` : onglets Frise / Contexte / Bibliographie affichent un paywall si pas d'accès actif
  - Frontend `CourseDetail.jsx` : le bouton de la frise appelle `/timeline/{letter}/access-url` puis `window.open(url)` au lieu d'un `<a target="_blank">` direct
  - Frontend `ResourceViewer.jsx` : intercepte 401/403 et `locked: true` pour afficher le paywall
- ✅ **Catalogue filtré sur les cours disponibles** (Fév 2026) : `coming_soon !== true` ajouté au filtre en complément de `is_launch_catalog === true` (17 cours affichés au lieu de 19 — les 2 cours « Mamelouke » et « Ottoman » bientôt disponibles restent visibles uniquement sur la page Cursus)
  - Onglet **Cours** : checkbox « Catalogue de lancement uniquement » activée par défaut
  - Onglet **Professeurs** : même filtre, calcul automatique via les `scholar_id` des cours du lancement (ID + matching par nom dans `scholar_name`)
  - Onglet **Catalogue** : toggle « Lancement uniquement » (doré, actif par défaut) + arborescence enrichie **Cursus → Cours → Module → Épisodes** (correspondant fichier Excel) avec tags `LANCEMENT` et `coming_soon`, et avertissement pour les épisodes non rattachés à un module
- ✅ **Migration v4 défensive** (Fév 2026) : nettoie automatiquement les éventuels doublons de cursus « Histoire du monde islamique » avec ID différent de `cursus-histoire`
- ✅ **Home.jsx dynamisé** (Fév 2026) : compteur cursus = `cursus.length` au lieu de hardcodé 6
- ✅ **Al-Kindī épisodes 1-3** ajoutés en BDD via migration avec leurs URLs YouTube (incluant la nouvelle URL ép. 3 fournie par l'utilisateur)
- ✅ **PHASE 3 — Auto-sync R2 médias générique pour TOUS les cours** (Avr 2026) :
  - Module de classification automatique : `_extract_episode_number()`, `_classify_r2_file()`, `_build_r2_detections()`, `_apply_r2_detections()`
  - Heuristiques tolérantes (validées sur multiples formats: `episode1`, `ep1`, `partie1`, `chap-2`, `-1.`, `_01_`, `Yacoubi-3.m4a`, `Cours_Maimonide_partie02.docx`)
  - Vidéos `.mp4/.mov/.webm`, Audios `.mp3/.m4a/.wav/.aac/.ogg/.flac`, Documents `.pdf/.docx/.doc`
  - Reconnaissance auto biblio (`biblio`), glossaire (`glossaire/glossary/lexique`), script d'épisode (avec numéro), document générique
  - Champ `r2_prefix` ajouté au schéma `courses` (chemin R2 personnalisable par cours)
  - Endpoints admin (4) : `r2-prefix`, `r2-detection`, `sync-r2` (par cours), `sync-r2-all` (global), + DELETE pour override manuel
  - **Migration v11** : auto-sync au démarrage du backend pour tous les cours ayant un `r2_prefix`
  - **Page admin Jinja2** `/api/admin-panel/r2-medias` : liste tous les cours (28), bouton « Synchroniser tous les cours » + boutons individuels (Sauver préfixe / Prévisualiser / Synchroniser) avec rendu détaillé des fichiers détectés et badges colorés (VIDÉO / AUDIO / SCRIPT / BIBLIO / GLOSSAIRE / non classé)
  - Validation pilote Maïmonide : 100 % détection (2 vidéos + 2 audios `.m4a` + 2 scripts + 2 docs cours, 0 non classé)

- ✅ **PILOT Maïmonide — Onglet Ressources + Lecteur audio R2** (Avr 2026) :
  - Migration v9 PILOT enrichie : probe HEAD sur `episode{N}_maimounide.mp3` → set `r2_audio_key` + `has_r2_audio` (False tant que .mp3 pas uploadé)
  - Nouveaux endpoints backend (tous gated `require_subscriber`) :
    - `GET /api/courses/{id}/resources` → liste agrégée `course_resources` + `episode_resources` (scope, label, mime, episode_number)
    - `POST /api/courses/{id}/resource-access-url` → token JWT signé (1 h, `scope=course_resource`) après whitelist du `r2_key`
    - `GET /api/files/r2-stream?t=...` → proxy R2 streaming (PDF inline, supporte Range/HEAD)
    - `GET /api/files/r2-html?t=...` → conversion DOCX → HTML via **mammoth** (Word uniquement)
    - `GET /api/audios/{id}/audio-access-url` → URL signée podcast `.mp3` (scope `episode_audio`)
  - Sécurité : `youtube_url`, `r2_video_key`, `r2_audio_key`, `episode_resources`, `course_resources` strippés pour non-abonnés sur `/api/audios` et `/api/courses/{id}` (seul `has_r2_audio` boolean reste exposé)
  - Frontend `CourseDetail.jsx` :
    - Onglet `Bibliographie` → renommé en **`Ressources`** (data-testid=tab-ressources)
    - Composant `ResourceList` : agrège script + glossaire + bibliographie sous deux sections (« Ressources du cours » / « Épisode N »)
    - PDF : ouverture dans nouvel onglet via URL signée
    - DOCX : modal inline avec HTML converti via mammoth
    - Lecteur audio podcast (data-testid=episode-podcast-player) sous l'iframe YouTube, affiché uniquement si `currentAudio.has_r2_audio === true`
    - Helpers `getCourseResources` / `getResourceAccessUrl` / `getEpisodeAudioAccessUrl` ajoutés à `api.js`
  - Tests : 19/19 backend pytest PASS + 6/6 UI flows verified (testing agent iteration_32)
  - Bug bonus corrigé : legacy `/api/audios/{id}/stream` retourne désormais 404 (au lieu de 500) si la clé R2 n'existe pas
- ✅ Apple Sign-In (backend prêt)
- ✅ **Visionneuses de documents protégés (Sijill Prestige + Slides)** (Fév 2026 — handoff fork) :
  - `CourseResourceArticle.jsx` : rendu blog "Sijill Prestige" (fond crème `#F4EDE0`, EBGaramond, espacements généreux) pour scripts / glossaires / bibliographies. Auto-bolding des termes de glossaire via regex `^([A-ZÀ-ÝŒÇ][^.:;\n]{1,60}?)\s*:\s+(.*)$`. Anti-copie soft : `contextmenu` désactivé + raccourcis Ctrl+S/P/A bloqués + tag utilisateur en bas.
  - `CourseSlides.jsx` : visionneuse PDF protégée (iframe avec `#toolbar=0&navpanes=0&scrollbar=0&view=FitH`, fond noir, watermark diagonal + tag utilisateur "Lecture · {email}"). Bug corrigé : retiré l'attribut `sandbox` qui faisait avorter le viewer PDF de Chromium (`net::ERR_ABORTED`).
  - Bug corrigé : doublon de la fonction `getResourceAccessUrl` dans `website-react/src/api.js` (ligne 132 et 139, identiques).
  - Routes : `/cours/:courseId/ressource?key=…` (CRA) et `/cours/:courseId/slides?key=…` (Slides) ; le `ResourceList` route automatiquement les "slides" vers le viewer PDF et les autres types vers l'article.
  - Vérification : screenshots OK (Glossaire Maïmonide, Script Al-Kindi). Backend : `/api/courses/cours-philo-juive/resources` → 5 ressources (3 course + 2 episode), `/api/files/r2-stream` → 200 OK 3.7 MB.

- ✅ **Téléchargement PDF protégé "Sijill Prestige" avec watermark utilisateur** (Fév 2026 — handoff fork) :
  - **Backend** : nouvelle dépendance `reportlab==4.5.0` ; endpoint `GET /api/courses/{course_id}/resource-pdf?r2_key=…` (gated `require_subscriber`) qui :
    1. Réutilise `_pdf_to_article` + `_pdf_article_cache` pour extraire la structure de l'article
    2. Génère un PDF A4 stylé "Sijill Prestige" (fond crème, EBGaramond pour le corps, DejaVuSans pour les chrome de page) via `BaseDocTemplate` + `PageTemplate.onPage`
    3. Ajoute sur chaque page : watermark diagonal (nom utilisateur en majuscules, alpha 10%) + header (`SIJILL PROJECT` / type) + footer (`Document réservé · Lecture par {name} <{email}>` + n° de page + mention `Reproduction interdite — usage strictement personnel`)
    4. Renvoie en `application/pdf` avec `Content-Disposition: attachment; filename="sijill-{label}.pdf"` et `Cache-Control: no-store`
    5. Refus 400 pour les slides, 404 pour clé non whitelistée, 401 pour non-abonné
  - **Polices Unicode** : `EBGaramond-Regular/Bold/Italic` copiées depuis `@expo-google-fonts/eb-garamond` vers `/app/backend/fonts/`, plus `fonts-dejavu-core` apt installé. Caractères de translittération arabe (ī, ū, ā, ḥ…) rendus correctement.
  - **Frontend** : nouveau helper `downloadCourseResourcePdf` (api.js) qui fetch en blob + `Authorization: Bearer` + extrait le filename de `Content-Disposition` + déclenche le download via `URL.createObjectURL`. Bouton `[data-testid=resource-article-download-pdf]` ajouté dans la `cra-toolbar` (alignée à droite, opposé du bouton "Retour au cours") avec états `idle / loading / error`.
  - Tests : 401 (no auth), 400 (slides), 404 (clé invalide), 200 (download). Vérification visuelle : caractères spéciaux OK, watermark visible, footer avec email utilisateur correctement intégré.

## Tâches à venir

### P1 - Prioritaire
- [ ] Corriger les pistes audio non synchronisées (épisodes manquants) — peut être superposé par YouTube
- [ ] Corriger les photos des articles du blog (images du dossier R2 non récupérées)
- [ ] Saisir les liens YouTube pour les épisodes restants via le panneau admin
- [ ] Affiner les descriptions des 4 cours du cursus A (Histoire) avec contenu fourni par les professeurs

### P2 - Futur
- [ ] Retour au développement natif mobile (prévu septembre)
- [ ] Achats ponctuels de cours
- [ ] Refactoring `backend/server.py` avec APIRouter
- [ ] Page « Catalogue complet » publique (vs catalogue de lancement)

## Comptes de test
- Admin : `loubna.serrar@gmail.com` / `Admin123!`

## Fichiers clés
- `backend/server.py` — API monolithique FastAPI
- `nginx/default.conf` — Configuration Nginx (2 domaines)
- `nginx/Dockerfile` — Build Expo webapp + image nginx
- `Dockerfile` — Build website React + backend Python
- `docker-compose.yml` — Orchestration des services
- `frontend/app/_layout.tsx` — Layout principal de l'app Expo
