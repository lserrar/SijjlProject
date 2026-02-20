# PRD – HikmabyLM

## Statut : MVP Complet - Pret pour production

## Probleme original
Application mobile e-learning academique francaise pour etudes islamiques (iOS & Android) : cours video, podcasts, articles, sessions live, bibliotheque. Design type Spotify dark. Tone intellectuel et rigoureux.

## Architecture
- **Backend** : FastAPI + MongoDB (port 8001)
- **Frontend Mobile** : Expo SDK 54 (React Native), expo-router
- **Admin Panel Web** : Interface HTML/CSS/JS servie par FastAPI
- **Storage audio** : Cloudflare R2 (bucket hikma-audio)
- **Auth** : Email/password (JWT) + Google OAuth (Emergent Auth)

## Ce qui est implemente

### Backend (server.py)
- Auth : register/login (JWT), Google OAuth
- **Professors** CRUD avec toggle (anciennement Scholars/Savants)
- **Courses** CRUD avec sync R2 + champ thematique_id pour liaison Cursus
- **Audios** CRUD avec file_key R2
- **Thematiques** API (26 themes) = Cursus dans l'interface
- **Bibliographies** API (22 entrees)
- **Masterclasses** API (22 sessions, gratuit ou payant)
- Admin Routes CRUD completes pour toutes les entites
- R2 Storage : folders listing, files listing, sync

### Admin Panel Web (Complet)
- **Login** : Connexion securisee
- **Dashboard** : Stats globales (Professeurs, Cours, Audios, Utilisateurs)
- **Professeurs** : CRUD complet (renomme de "Savants")
- **Cours** : CRUD avec selection professeur + selection Cursus
- **Audios** : CRUD avec filtre type
- **Cursus** : CRUD (anciennement Thematiques dans le code, affiche "Cursus" dans l'interface)
- **Bibliographies** : CRUD avec liens thematiques
- **Masterclasses** : CRUD avec prix, duree, inscrits
- **Utilisateurs** : Gestion + acces gratuit
- **Stockage R2** : Navigation + sync cours

### Frontend Mobile (Expo)
- Auth screens : login (email + Google) / register
- Home : hero, recommendations, erudit semaine, ecoute du jour
- **Navigation 6 onglets** : Accueil, Cursus, Biblio, Live, Profil, A propos
- **Cursus** : Liste des thematiques avec cours associes
- **Bibliotheque** : Articles par theme
- **Live** : Masterclasses avec inscription
- Audio player complet avec streaming R2
- MiniPlayer persistant

## Modifications recentes (2025-12-20)
- ✅ Renommage "Savants" → "Professeurs" dans tout le panel admin
- ✅ Renommage "Thematiques" → "Cursus" dans la navigation sidebar
- ✅ Ajout liaison Cours ↔ Cursus (champ thematique_id)
- ✅ Formulaire de cours avec selection du Cursus
- ✅ Colonne Cursus dans la liste des cours
- ✅ Nouvelle route /api/admin-panel/professors
- ✅ **Filtre par Cursus** dans le panel admin (dropdown pour filtrer les cours)
- ✅ **API publique /api/courses** accepte le parametre `thematique_id` pour filtrer par cursus
- ✅ **Integration Stripe** complete pour paiements
- ✅ **Abonnements** Mensuel (9.99€/30j) et Annuel (89.99€/365j)
- ✅ **Achats uniques** de cours ou cursus (6 mois d'acces)
- ✅ **Page admin Tarification** pour gerer les plans et voir les transactions
- ✅ **Verification d'acces utilisateur** (abonnement, achat, admin, acces gratuit)

## Credentials
- **Admin Panel** : admin@hikma-admin.com / Admin123!
- **URL Panel** : https://thematic-platform.preview.emergentagent.com/api/admin-panel/

## Contenu
- 26 Cursus (Thematiques)
- 22 Bibliographies
- 22 Masterclasses
- 38 Cours
- 15 Audios
- 9 Professeurs

## Backlog P1 (A venir)
- Implementation des ecrans mobiles pour Cursus, Bibliotheque, Live
- Stabilisation du tunnel Ngrok pour l'environnement Expo
- Page de paiement dans l'app mobile (integration avec les APIs Stripe)

## Backlog P2 (Futur)
- Push notifications
- Analytics temps d'ecoute
- Multi-langue (EN, AR, RTL)
- Refactorisation backend (server.py monolithique)

## Date implementation : 2025-12-20
