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

### Session actuelle - Corrections et Nouvelles Fonctionnalités

#### 1. Affichage Multi-Timelines par Cursus ✅ (NEW)
- **Backend**: API `GET /api/timelines/cursus/{cursus_id}` retourne toutes les timelines associées
- **Frontend**: Page Cursus affiche dynamiquement la liste des timelines (ex: Cursus A + Cursus A Map)
- **Timeline Viewer**: Support du paramètre `file` pour charger une timeline spécifique
- Test: 2 timelines affichées pour Cursus A (Cursus A, Cursus A Map)

#### 2. Lecteur Audio Conférence ✅ (VERIFIED)
- Page `/conference/[id].tsx` entièrement fonctionnelle
- Lecteur avec: waveform, play/pause, skip ±15s/30s, vitesse (1x/1.25x/1.5x/2x)
- Métadonnées: titre, intervenant, description, taille fichier
- Style cohérent avec le design Sijill

#### 3. Couleur Titres Documents ✅ (FIXED)
- Les titres de section dans `/context/[resourceId].tsx` sont maintenant en vert `#04D182`
- Avant: violet `#8B5CF6` (colors.brand.secondary)
- Après: vert `#04D182` (Cursus A accent color)

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
