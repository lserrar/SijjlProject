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

## Travail Accompli (25 février 2026)

### Nouvelles Fonctionnalités ✅

#### 1. Dashboard Stats d'écoute
- **Page** : `/api/admin-panel/listening-stats`
- Stats globales (heures totales, lectures, utilisateurs actifs)
- Graphique d'évolution temporelle (style YouTube)
- Tableaux par Professeur, Cursus, Cours, Épisode (Top 20)
- Filtres : 7 jours, mois, année, tout

#### 2. Highlight Page d'accueil
- **Page** : `/api/admin-panel/highlight`
- **Mode Manuel** : Sélectionner un cours OU un cursus à mettre en avant
- **Mode Aléatoire** : Contenu différent à chaque connexion utilisateur
- Interface visuelle avec grilles cliquables
- Bouton "Effacer" pour retirer le highlight

### Bugs Corrigés ✅
1. **Bouton "Se déconnecter"** → Fonctionne maintenant sur web
2. **Bypass paywall** → Utilisateurs sans abonnement redirigés vers subscription
3. **Pages paiement** → Créé `/payment/success` et `/payment/cancel`
4. **Flux Stripe** → Testé et fonctionnel

---

## API Endpoints Ajoutés

### Highlight
- `GET /api/admin/highlight` - Config actuelle
- `PUT /api/admin/highlight/mode` - Changer mode (manual/random)
- `PATCH /api/admin/cursus/{id}/set-featured` - Mettre cursus en avant
- `PATCH /api/admin/courses/{id}/set-featured` - Mettre cours en avant
- `DELETE /api/admin/highlight/clear` - Effacer highlight

### Stats d'écoute
- `GET /api/admin/listening-stats?period=7days|month|year|all`

---

## Fichiers Créés/Modifiés

### Nouveaux
- `/app/backend/admin_templates/listening-stats.html`
- `/app/backend/admin_templates/highlight.html`
- `/app/frontend/app/payment/success.tsx`
- `/app/frontend/app/payment/cancel.tsx`

### Modifiés
- `/app/backend/server.py` (endpoints highlight + stats)
- `/app/backend/admin_templates/base.html` (menu navigation)
- `/app/frontend/app/(tabs)/profil.tsx` (logout fix)

---

## Backlog

### P0 (Critique)
- Aucun bug bloquant connu

### P1 (Important)
- Tester webhook Stripe en production avec vrai paiement

### P2 (Futur)
- **Refactoriser backend/server.py** en modules FastAPI Router (>5000 lignes)
- **Implémenter Apple Sign-In** (placeholder)
- **Dashboard admin parrainages** amélioré

---

## Credentials Test
- **Admin**: `admin@hikma-admin.com` / `Admin123!`
- **User test**: `testuser@hikma.com` / `TestUser123!`
- **Panel admin**: `/api/admin-panel/login`
