# Sijill Project - PRD

## Description
Plateforme e-learning d'études islamiques avec hiérarchie de contenu : Cursus → Cours → Modules → Audios

## Stack Technique
- **Frontend**: React Native (Expo Web)
- **Backend**: FastAPI
- **Base de données**: MongoDB
- **Stockage**: Cloudflare R2 (bucket: sijill-project)
- **Paiement**: Stripe (clé LIVE configurée)
- **Auth**: Email/Password + Google OAuth (Emergent Auth)

## Design System
- Mode sombre, police Cinzel + EB Garamond
- Couleurs: `#04D182` (vert), `#C9A84C` (or)
- Zero border-radius policy

---

## Travail Accompli (26 février 2026)

### Session actuelle - Splash Screen & Améliorations

#### 1. Écran de démarrage animé ✅ (NEW)
- Animation séquencée : SIJILL → PROJECT• → lignes → tagline → fade out
- Halo vert subtil en arrière-plan
- Point vert qui pulse avec glow effect
- Losange vert au centre
- Tagline "Sciences Islamiques" en doré
- Responsive (desktop + mobile)

#### 2. Logo page login/register ✅
- Point vert collé au "T" de "PROJECT" via Text inline `•`
- Structure: SIJILL (ligne 1) + PROJECT• (ligne 2)

#### 3. Tailles de police augmentées ✅ (v2)
- Thème: xs 14, sm 16, md 18, lg 20, xl 26, xxl 34, xxxl 44px
- Page d'accueil: heroTitle 24px, heroDesc 17px, epTitle 16px, epDesc 14px

#### 4. Réorganisation onglet Ressources ✅
- Nouvel ordre: Frise chronologique → Contexte historique → Conférences Audio → Bibliographies

#### 5. Nouvelle convention DOCX ✅
- Format: `sijill_{cursus}_m{NN}_{penseur}.docx`
- 47 ressources chargées avec cursus/module corrects

#### 6. Fiches contexte historique redessinées ✅
- Format similaire à la bibliographie
- Titres en vert, labels en doré, texte lisible
- **Backend**: API `GET /api/timelines/cursus/{cursus_id}` retourne toutes les timelines associées
- **Frontend**: Page Cursus affiche dynamiquement la liste des timelines (ex: Cursus A + Cursus A Map)
- **Timeline Viewer**: Support du paramètre `file` pour charger une timeline spécifique
- Test: 2 timelines affichées pour Cursus A (Cursus A, Cursus A Map)

#### 2. Réorganisation onglet Ressources ✅ (NEW)
- Ordre modifié : **Bibliographies** → **Frise chronologique** → **Contexte historique** → **Conférences Audio**
- Tous les éléments utilisent le même style de carte (`biblioCard`)

#### 3. Couleur du texte Documents DOCX ✅ (FIXED)
- Le texte des paragraphes est maintenant en crème clair `rgba(245,240,232,0.85)` (comme bibliographie)
- Les titres de section restent en vert `#04D182`

#### 4. Bug Fix: Variable undefined ✅
- Corrigé référence à `currentCursus` → `id` dans le lien conference

### Fonctionnalités Précédentes

#### Header Global "SIJILL PROJECT" ✅
- Composant GlobalHeader créé avec logo, navigation et icons
- Layout responsive: Desktop (logo+nav+icons) / Mobile (logo centré+hamburger)

#### Admin Panel - Ressources ✅
- Renommage "Timeline" → "Ressources"
- Édition des audios ET des documents .docx (titre, description, crédits)

#### Page Conférence Audio ✅
- Nouvelle page `/conference/[id].tsx` avec lecteur style Sijill
- Waveform, contrôles, vitesse de lecture

---

## Structure R2

### Timeline/ (5 HTML + 18 DOCX)
```
sijill_timeline_cursus_{a-e}.html  →  Timelines interactives
sijill_timeline_cursus_a_map.html  →  Timeline carte (NEW)
Timeline_Module{N}_{Penseur}.docx  →  Documents contexte historique
```

### audio/ (Conférences)
```
Conf_{Sujet}_{Speaker}_module{N}.m4a  →  Conférences audio
```

---

## Key API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/timelines/cursus/{cursus_id}` | Liste les timelines d'un cursus |
| `GET /api/timeline/file/{filename}` | Retourne le HTML d'une timeline spécifique |
| `GET /api/resources/audio` | Liste les conférences audio |
| `GET /api/resources/context/{id}` | Contenu parsé d'un document Word |

---

## Backlog

### P0 (Critique) - RESOLVED
- ~~Environnement preview instable~~ → Stabilisé

### P1 (Important)
- Écran de démarrage animé "SIJILL PROJECT" (demandé par user)
- Tester webhook Stripe en production

### P2 (Futur)
- Refactoriser backend/server.py en modules FastAPI Router (>5000 lignes)
- Refactoriser templates admin avec héritage Jinja2
- Implémenter Apple Sign-In
- Dashboard admin parrainages amélioré

---

## Credentials Test
- **Admin Panel**: `/admin-panel/login`
- **Admin Email**: `loubna.serrar@gmail.com`
- **Admin Password**: `Admin123!`
- **Test User**: `testuser@hikma.com` / `TestUser123!`
