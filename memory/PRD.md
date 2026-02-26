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

### Admin Panel - Page "Ressources" ✅ (26/02 - Session actuelle)
- **Renommage**: "Timeline" → "Ressources" dans la navigation et le titre de page
- **Audios chargés**: L'endpoint `/admin/resources/timeline` charge maintenant les 3 types de ressources (HTML, DOCX, Audio)
- **Édition des audios**: Nouveau modal d'édition avec champs Titre, Description, Crédits, Conférencier, Sujet, Module
- **Endpoint PUT**: `/admin/resources/audio/{resource_id}` pour sauvegarder les modifications
- **API publique mise à jour**: `/resources/audio` utilise les données DB si disponibles (titre/description personnalisés)

### Intégration Conférences Audio ✅
- Interface `AudioConference` ajoutée aux pages Cursus et Cours
- API `/resources/audio` intégrée pour récupérer les conférences
- Lecteur audio natif HTML avec play/pause dans l'onglet Ressources
- Styles dédiés pour les cartes de conférence (`audioConferenceCard`, `audioPlayBtn`)
- 1 fichier test uploadé: `Conf_Averroes_Brenet_module4.m4a` (43 Mo)

### Système de Ressources Timeline ✅

#### Backend (Fonctionnel)
- `GET /api/timelines` - Liste les 5 timelines HTML
- `GET /api/timeline/{A-E}` - Retourne le HTML d'une timeline
- `GET /api/resources/context` - Liste les 18 documents de contexte
- `GET /api/resources/context/{id}` - Contenu parsé d'un document Word
- `GET /api/resources/audio` - Liste les conférences audio du bucket R2
- `GET /api/resources/audio/stream/{filename}` - Stream d'une conférence audio
- `GET /api/admin/resources/timeline` - Liste admin des ressources (HTML + DOCX + Audio)
- `POST /api/admin/resources/sync-timeline` - Synchronisation R2 → DB
- `PUT /api/admin/resources/audio/{resource_id}` - Éditer métadonnées audio

#### Frontend (Implémenté)
- `/app/frontend/app/timeline/[cursusId].tsx` - Page timeline plein écran (iframe)
- `/app/frontend/app/context/[resourceId].tsx` - Page contexte historique (style Sijill)
- Onglet "Ressources" mis à jour dans Cursus et Cours avec 4 sections :
  1. **Frise chronologique** → Page timeline interactive
  2. **Contexte historique** → Documents Word par penseur
  3. **Bibliographies** → Documents existants
  4. **Conférences Audio** → Lecteur intégré

#### Admin Panel
- `/api/admin-panel/timeline-resources` - Page "Timeline" avec :
  - Liste des 5 timelines HTML (preview + lien externe)
  - Liste des 18 documents de contexte (aperçu intégré)
  - Liste des conférences audio avec lecteur
  - Bouton "Synchroniser R2" pour mise à jour automatique

### Autres fonctionnalités de la session
- Dashboard Stats d'écoute (`/api/admin-panel/listening-stats`)
- Highlight Page d'accueil (`/api/admin-panel/highlight`)
- Correction bugs déconnexion et paywall
- Pages paiement success/cancel

---

## Structure R2

### Timeline/ (5 HTML + 18 DOCX)
```
sijill_timeline_cursus_{a-e}.html  →  Timelines interactives
Timeline_Module{N}_{Penseur}.docx  →  Documents contexte historique
```

### audio/ (Conférences)
```
Conf_{Sujet}_{Speaker}_module{N}.m4a  →  Conférences audio
```

---

## Fichiers Frontend Modifiés

| Fichier | Description |
|---------|-------------|
| `app/cursus/[id].tsx` | Onglet Ressources avec lecteur audio conférences |
| `app/course/[id].tsx` | Onglet Ressources avec lecteur audio conférences |
| `app/timeline/[cursusId].tsx` | Page timeline plein écran (iframe) |
| `app/context/[resourceId].tsx` | Page contexte historique formatée |
| `app/payment/success.tsx` | Page succès paiement |
| `app/payment/cancel.tsx` | Page annulation paiement |

## Fichiers Backend Créés

| Fichier | Description |
|---------|-------------|
| `admin_templates/timeline-resources.html` | Page admin Timeline |
| `admin_templates/listening-stats.html` | Page admin Stats |
| `admin_templates/highlight.html` | Page admin Highlight |
| `server.py` | Endpoints timeline, context et audio |

---

## Backlog

### P0 (Critique)
- ⚠️ Environnement preview instable (tunnel ngrok ERR_NGROK_334)
- Backend API fonctionne ✅, Frontend inaccessible

### P1 (Important)
- Tester visuellement l'intégration des conférences audio quand env disponible
- Tester webhook Stripe en production
- Lier les ressources aux modules spécifiques (pas seulement au cursus)

### P2 (Futur)
- Refactoriser backend/server.py en modules FastAPI Router (>5000 lignes)
- Implémenter Apple Sign-In
- Dashboard admin parrainages amélioré

---

## Credentials Test
- **Admin**: `admin@hikma-admin.com` / `Admin123!`
- **User test**: `testuser@hikma.com` / `TestUser123!`
- **Panel admin**: `/api/admin-panel/login`
