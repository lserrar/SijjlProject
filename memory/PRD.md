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

### Bugs Corrigés ✅
1. **Bouton "Se déconnecter"** - Ne fonctionnait pas sur web → Corrigé avec `window.location.href = '/login'`
2. **Bypass du paywall** - Utilisateurs existants pouvaient accéder au contenu sans abonnement → Ajout vérification dans login.tsx
3. **Pages paiement manquantes** - Créé `/payment/success.tsx` et `/payment/cancel.tsx`

### Fonctionnalités Complètes ✅
- Système d'abonnement Stripe (mensuel 9,99€ / annuel 89,99€)
- Essai gratuit 3 jours
- Système de parrainage complet
- Lecteur de bibliographies plein écran
- Panel admin avec gestion contenu + paramètres Stripe

---

## Fichiers Clés

### Frontend
- `/app/frontend/app/(tabs)/profil.tsx` - Page profil avec logout
- `/app/frontend/app/(auth)/login.tsx` - Login avec vérification abonnement
- `/app/frontend/app/subscription-choice.tsx` - Choix d'abonnement
- `/app/frontend/app/payment/success.tsx` - Page succès paiement
- `/app/frontend/app/payment/cancel.tsx` - Page annulation paiement
- `/app/frontend/context/AuthContext.tsx` - Contexte authentification

### Backend
- `/app/backend/server.py` - Monolithe (>2500 lignes) - À REFACTORISER

---

## Backlog

### P0 (Critique)
- Aucun bug bloquant connu

### P1 (Important)
- Tester le webhook Stripe en production avec vrai paiement
- Vérifier le flux complet post-paiement

### P2 (Futur)
- **Refactoriser backend/server.py** en modules FastAPI Router
- **Implémenter Apple Sign-In** (actuellement placeholder)
- **Dashboard admin parrainages** amélioré

---

## Credentials Test
- **Admin**: `admin@hikma-admin.com` / `Admin123!`
- **User test**: `testuser@hikma.com` / `TestUser123!`
- **Panel admin**: `/admin-panel/login`

---

## Notes Importantes
- Clé Stripe LIVE configurée → cartes de test ne fonctionnent pas
- Webhook Stripe configuré mais non testé en production
- Apple Sign-In = placeholder non fonctionnel
