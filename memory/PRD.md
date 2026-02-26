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

### Nouvelles Fonctionnalités ✅

#### 1. Dashboard Stats d'écoute
- **Page** : `/api/admin-panel/listening-stats`
- Stats globales + graphique d'évolution temporelle
- Tableaux par Professeur, Cursus, Cours, Épisode (Top 20)
- Filtres : 7 jours, mois, année, tout

#### 2. Highlight Page d'accueil
- **Page** : `/api/admin-panel/highlight`
- Mode Manuel ou Aléatoire pour le contenu en vedette
- Interface visuelle avec grilles cliquables

#### 3. Ressources Timeline (NOUVEAU)
- **Page Admin** : `/api/admin-panel/timeline-resources`
- Gestion des 5 timelines HTML (par cursus A-E)
- Gestion des 18 documents de contexte historique (par module/penseur)
- Aperçu intégré des documents Word
- Bouton "Synchroniser R2" pour mise à jour automatique

### API Endpoints Timeline
- `GET /api/timelines` - Liste toutes les timelines
- `GET /api/timeline/{cursus_letter}` - Retourne le HTML de la timeline
- `GET /api/resources/context` - Liste tous les documents de contexte
- `GET /api/resources/context/{resource_id}` - Contenu parsé d'un document
- `GET /api/admin/resources/timeline` - Liste admin des ressources
- `POST /api/admin/resources/sync-timeline` - Synchronisation R2

### Bugs Corrigés ✅
1. Bouton "Se déconnecter" sur web
2. Bypass paywall corrigé
3. Pages paiement créées

---

## Structure des fichiers Timeline (R2)

### Timelines HTML (5 fichiers)
- `sijill_timeline_cursus_a.html` - Cursus A
- `sijill_timeline_cursus_b.html` - Cursus B
- `sijill_timeline_cursus_c.html` - Cursus C
- `sijill_timeline_cursus_d.html` - Cursus D
- `sijill_timeline_cursus_e.html` - Cursus E

### Documents Contexte (18 fichiers)
Format: `Timeline_Module{N}_{Sujet}.docx`
- Module 1: Traduction
- Module 2: Al-Kindi, Al-Farabi, Avicenne
- Module 3: Al-Ghazali, Fakhr al-Din al-Razi, Nasir al-Din al-Tusi
- Module 4: Averroes, Ibn Bajja, Ibn Tufayl
- Module 5: Mir Damad, Mulla Sadra
- Module 6: Suhrawardi
- Module 7: Ibn Khaldun, Miskawayh

---

## Fichiers Créés/Modifiés

### Backend
- `server.py` - Endpoints timeline et context resources
- `admin_templates/timeline-resources.html` - Page admin
- `admin_templates/listening-stats.html`
- `admin_templates/highlight.html`

### Frontend
- `app/timeline/[cursusId].tsx` - Page timeline plein écran
- `app/cursus/[id].tsx` - Onglet Ressources mis à jour
- `app/payment/success.tsx` et `cancel.tsx`

---

## Backlog

### P0 (Critique)
- ⚠️ Résoudre problème tunnel ngrok (environnement frontend inaccessible)

### P1 (Important)
- Créer page frontend pour afficher les documents de contexte
- Lier les ressources aux cours/modules dans l'onglet Ressources
- Tester webhook Stripe en production

### P2 (Futur)
- Refactoriser backend/server.py en modules FastAPI Router
- Implémenter Apple Sign-In
- Dashboard admin parrainages amélioré

---

## Credentials Test
- **Admin**: `admin@hikma-admin.com` / `Admin123!`
- **User test**: `testuser@hikma.com` / `TestUser123!`
- **Panel admin**: `/api/admin-panel/login`
