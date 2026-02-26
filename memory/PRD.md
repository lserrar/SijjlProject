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

### Système de Ressources Timeline ✅

#### Backend (Fonctionnel)
- `GET /api/timelines` - Liste les 5 timelines HTML
- `GET /api/timeline/{A-E}` - Retourne le HTML d'une timeline
- `GET /api/resources/context` - Liste les 18 documents de contexte
- `GET /api/resources/context/{id}` - Contenu parsé d'un document Word
- `GET /api/admin/resources/timeline` - Liste admin des ressources
- `POST /api/admin/resources/sync-timeline` - Synchronisation R2 → DB

#### Frontend (Implémenté, à tester quand env disponible)
- `/app/frontend/app/timeline/[cursusId].tsx` - Page timeline plein écran (iframe)
- `/app/frontend/app/context/[resourceId].tsx` - Page contexte historique (style Sijill)
- Onglet "Ressources" mis à jour dans Cursus et Cours avec 3 sections :
  1. **Frise chronologique** → Page timeline interactive
  2. **Contexte historique** → Documents Word par penseur
  3. **Bibliographies** → Documents existants

#### Admin Panel
- `/api/admin-panel/timeline-resources` - Page "Timeline" avec :
  - Liste des 5 timelines HTML (preview + lien externe)
  - Liste des 18 documents de contexte (aperçu intégré)
  - Bouton "Synchroniser R2" pour mise à jour automatique

### Autres fonctionnalités de la session
- Dashboard Stats d'écoute (`/api/admin-panel/listening-stats`)
- Highlight Page d'accueil (`/api/admin-panel/highlight`)
- Correction bugs déconnexion et paywall
- Pages paiement success/cancel

---

## Structure R2 Timeline/

### Timelines HTML (5)
```
Timeline/sijill_timeline_cursus_a.html  →  Cursus A (Falsafa)
Timeline/sijill_timeline_cursus_b.html  →  Cursus B (Théologie)
Timeline/sijill_timeline_cursus_c.html  →  Cursus C (Sciences)
Timeline/sijill_timeline_cursus_d.html  →  Cursus D (Arts)
Timeline/sijill_timeline_cursus_e.html  →  Cursus E (Spiritualités)
```

### Documents Contexte (18)
```
Format: Timeline_Module{N}_{Penseur}.docx

Module 1: Traduction
Module 2: Al-Kindi, Al-Farabi, Avicenne
Module 3: Al-Ghazali, Fakhr al-Din al-Razi, Nasir al-Din al-Tusi
Module 4: Averroes, Ibn Bajja, Ibn Tufayl
Module 5: Mir Damad, Mulla Sadra
Module 6: Suhrawardi
Module 7: Ibn Khaldun, Miskawayh
```

---

## Fichiers Frontend Créés

| Fichier | Description |
|---------|-------------|
| `app/timeline/[cursusId].tsx` | Page timeline plein écran (iframe) |
| `app/context/[resourceId].tsx` | Page contexte historique formatée |
| `app/cursus/[id].tsx` | Onglet Ressources mis à jour |
| `app/course/[id].tsx` | Onglet Ressources mis à jour |
| `app/payment/success.tsx` | Page succès paiement |
| `app/payment/cancel.tsx` | Page annulation paiement |

## Fichiers Backend Créés

| Fichier | Description |
|---------|-------------|
| `admin_templates/timeline-resources.html` | Page admin Timeline |
| `admin_templates/listening-stats.html` | Page admin Stats |
| `admin_templates/highlight.html` | Page admin Highlight |
| `server.py` | Endpoints timeline et context |

---

## Backlog

### P0 (Critique)
- ⚠️ Environnement preview down (tunnel ngrok ERR_NGROK_334)

### P1 (Important)
- Tester l'intégration frontend quand env disponible
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
