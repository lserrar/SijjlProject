# PRD – HikmabyLM

## Statut : MVP Complet - Prêt pour production

## Problème original
Application mobile e-learning académique française pour études islamiques (iOS & Android) : cours vidéo, podcasts, articles, sessions live, bibliothèque. Design type Spotify dark. Tone intellectuel et rigoureux.

## Architecture
- **Backend** : FastAPI + MongoDB (port 8001)
- **Frontend Mobile** : Expo SDK 54 (React Native), expo-router
- **Admin Panel Web** : Interface HTML/CSS/JS servie par FastAPI
- **Storage audio** : Cloudflare R2 (bucket hikma-audio)
- **Auth** : Email/password (JWT) + Google OAuth (Emergent Auth)
- **Paiements** : Stripe (abonnements, achats uniques, codes promo)

## Ce qui est implémenté

### Backend (server.py)
- Auth : register/login (JWT), Google OAuth
- **Professors** CRUD avec toggle (anciennement Scholars/Savants)
- **Courses** CRUD avec sync R2 + champ thematique_id pour liaison Cursus
- **Audios** CRUD avec file_key R2
- **Thematiques** API (26 themes) = Cursus dans l'interface
- **Bibliographies** API (22 entrées)
- **Masterclasses** API (22 sessions, gratuit ou payant)
- Admin Routes CRUD complètes pour toutes les entités
- R2 Storage : folders listing, files listing, sync

### Admin Panel Web (Complet)
- **Login** : Connexion sécurisée
- **Dashboard** : Stats globales (Professeurs, Cours, Audios, Utilisateurs)
- **Professeurs** : CRUD complet (renommé de "Savants")
- **Cours** : CRUD avec sélection professeur + sélection Cursus
- **Audios** : CRUD avec filtre type
- **Cursus** : CRUD (anciennement Thématiques dans le code, affiche "Cursus" dans l'interface)
- **Bibliographies** : CRUD avec liens thématiques
- **Masterclasses** : CRUD avec prix, durée, inscrits
- **Utilisateurs** : Gestion complète avec affichage abonnements et actions (voir ci-dessous)
- **Stockage R2** : Navigation + sync cours
- **Tarification** : Gestion des plans Stripe
- **Codes Promo** : CRUD avec périodes de validité (date début et fin)

### Frontend Mobile (Expo)
- Auth screens : login (email + Google) / register
- Home : hero, recommendations, érudit semaine, écoute du jour
- **Navigation 6 onglets** : Accueil, Cursus, Biblio, Live, Profil, À propos
- **Cursus** : Liste des thématiques avec cours associés
- **Bibliothèque** : Articles par thème
- **Live** : Masterclasses avec inscription
- Audio player complet avec streaming R2
- MiniPlayer persistant

## Modifications récentes (2026-02-21)
- ✅ **Gestion des abonnements utilisateurs** dans le panel admin :
  - Affichage du type d'abonnement (Annuel, Mensuel, Manuel, Essai gratuit, Accès gratuit)
  - Affichage de la date d'expiration avec jours restants
  - Actions admin : Prolonger l'abonnement, Accorder un abonnement, Accès gratuit, Révoquer l'accès
  - Endpoints : `/api/admin/users/{user_id}/extend-subscription`, `/api/admin/users/{user_id}/grant-subscription`
- ✅ **Codes promo avec périodes de validité** :
  - Champ `start_date` (date de début) ajouté
  - Champ `expires_at` (date d'expiration) existant
  - Validation : vérifie si code pas encore valide ou expiré
  - Affichage dans le tableau : colonne "Période de validité"
  - Statuts : Actif, Pas encore valide, Expiré, Épuisé
- ✅ **Écran de choix d'abonnement post-inscription** :
  - Nouveau fichier `/app/frontend/app/subscription-choice.tsx`
  - Après inscription, l'utilisateur est redirigé vers cet écran
  - Options : Essai gratuit 3 jours, Abonnement Mensuel, Abonnement Annuel
  - Possibilité de continuer sans abonnement (accès limité)
- ✅ **Protection du contenu payant** :
  - Hook `useAccessCheck` pour vérifier l'accès utilisateur
  - Composant `PaywallOverlay` pour bloquer le contenu
  - Écran de cours modifié pour afficher un paywall si pas d'accès
  - Modules verrouillés sauf aperçu gratuit du premier module
- ✅ **Essai gratuit de 3 jours** :
  - Endpoint `/api/trial/start` accepte `plan_id: trial_3days`
  - Limité à un essai par utilisateur
- ✅ **Écran Paramètres** (`/settings`) :
  - Gestion lecture audio (automatique, haute qualité)
  - Gestion téléchargements (Wi-Fi uniquement)
  - Accès abonnement, confidentialité, CGU
  - **Suppression de compte** avec confirmation
- ✅ **Écran Notifications** (`/notifications`) :
  - Toggle nouveaux cours
  - Toggle masterclasses en direct
  - Toggle résumé hebdomadaire
  - Toggle expiration abonnement
  - Toggle promotions
- ✅ **Écran À propos** (`/about`) :
  - Présentation de l'application
  - Liste des fonctionnalités
  - Contact (email, Instagram)
  - Mentions légales
- ✅ **Lecture audio en arrière-plan** :
  - Configuration `UIBackgroundModes: ["audio"]` pour iOS
  - Permission `FOREGROUND_SERVICE` pour Android
  - `staysActiveInBackground: true` dans expo-av
- ✅ **Endpoint suppression de compte** :
  - `DELETE /api/user/delete-account`
  - Supprime toutes les données utilisateur

## Modifications précédentes (2025-12-20)
- ✅ Renommage "Savants" → "Professeurs" dans tout le panel admin
- ✅ Renommage "Thématiques" → "Cursus" dans la navigation sidebar
- ✅ Ajout liaison Cours ↔ Cursus (champ thematique_id)
- ✅ Formulaire de cours avec sélection du Cursus
- ✅ Colonne Cursus dans la liste des cours
- ✅ Nouvelle route /api/admin-panel/professors
- ✅ **Filtre par Cursus** dans le panel admin (dropdown pour filtrer les cours)
- ✅ **API publique /api/courses** accepte le paramètre `thematique_id` pour filtrer par cursus
- ✅ **Intégration Stripe** complète pour paiements
- ✅ **Abonnements** Mensuel (9.99€/30j) et Annuel (89.99€/365j)
- ✅ **Achats uniques** de cours ou cursus (6 mois d'accès)
- ✅ **Page admin Tarification** pour gérer les plans et voir les transactions
- ✅ **Vérification d'accès utilisateur** (abonnement, achat, admin, accès gratuit)
- ✅ **Codes promo** : CRUD complet avec % ou montant fixe, max utilisations
- ✅ **Essais gratuits** : 7 jours mensuel, 14 jours annuel (1 essai par utilisateur)
- ✅ **Page admin Codes Promo** pour gérer les codes promotionnels

## Credentials
- **Admin Panel** : admin@hikma-admin.com / Admin123!
- **URL Panel** : https://hikma-staging.preview.emergentagent.com/api/admin-panel/

## Contenu
- 26 Cursus (Thématiques)
- 22 Bibliographies
- 22 Masterclasses
- 38 Cours
- 15 Audios
- 9 Professeurs

## Backlog P1 (À venir)
- Implémentation des écrans mobiles pour Cursus, Bibliothèque, Live
- Stabilisation du tunnel Ngrok pour l'environnement Expo
- Page de paiement dans l'app mobile (intégration avec les APIs Stripe)

## Backlog P2 (Futur)
- Push notifications
- Analytics temps d'écoute
- Multi-langue (EN, AR, RTL)
- Refactorisation backend (server.py monolithique)

## Date implémentation : 2026-02-21
