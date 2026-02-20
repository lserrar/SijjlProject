# PRD – HikmabyLM

## Statut : MVP + R2 Storage implémentés

## Problème original
Application mobile e-learning académique française pour études islamiques (iOS & Android) : cours vidéo, podcasts, articles, sessions live, bibliothèque. Design type Spotify dark. Tone intellectuel et rigoureux.

## Architecture
- **Backend** : FastAPI + MongoDB (port 8001)
- **Frontend** : Expo SDK 54 (React Native), expo-router
- **Storage audio** : Cloudflare R2 (bucket hikma-audio)
- **Auth** : Email/password (JWT) + Google OAuth (Emergent Auth)

## Ce qui est implémenté

### Backend (server.py)
- Auth : register/login (JWT), Google OAuth via Emergent session exchange
- Scholars : 5 érudits français académiques seedés
- Courses : 8 cours avec topics/niveaux/langues
- Audios : 12 contenus (podcasts/conférences/récitations/documentaires) avec file_key R2
- Articles : 6 articles académiques longs
- Live Sessions : 5 sessions avec inscription/désinscription
- User Progress & Favorites CRUD
- Home endpoint (hero, recommendations, featured scholar, daily pick)
- **Cloudflare R2** : presigned URLs pour streaming (1h), upload URLs, listing, mise à jour file_key

### Frontend (Expo)
- Auth screens : login (email + Google + Apple placeholder) / register
- Home : hero "continuer", recommendations, érudit semaine, écoute du jour, publications
- Explorer : filtres par type + topic, grille de contenus
- Ma Bibliothèque : sauvegardés / en cours / bibliographie
- Live Sessions : calendrier + inscription
- Profil : stats, niveau, paramètres, logout
- Audio/[id] : lecteur complet R2 (seek, skip 15s, vitesse, favoris)
- Course/[id] : détail cours + modules
- Article/[id] : lecteur article long
- Scholar/[id] : profil érudit + contenu
- MiniPlayer persistant au-dessus de la tab bar
- PlayerContext : expo-av avec streaming R2 via presigned URLs
- useAudioPlayer hook : résolution automatique URL R2 avant lecture

## Fichiers audio R2 — Nommage

| Audio ID | File Key R2 |
|---|---|
| aud-001 | podcasts/aud-001.mp3 |
| aud-002 | podcasts/aud-002.mp3 |
| aud-003 | lectures/aud-003.mp3 |
| aud-004 | lectures/aud-004.mp3 |
| aud-005 | podcasts/aud-005.mp3 |
| aud-006 | quran/aud-006.mp3 |
| aud-007 | podcasts/aud-007.mp3 |
| aud-008 | lectures/aud-008.mp3 |
| aud-009 | quran/aud-009.mp3 |
| aud-010 | podcasts/aud-010.mp3 |
| aud-011 | lectures/aud-011.mp3 |
| aud-012 | documentaries/aud-012.mp3 |

## Backlog Priorité

### P0 (bloquants)
- [ ] Tests e2e complets

### P1 (prochaine session)
- [ ] Lecteur vidéo pour cours
- [ ] Push notifications (sessions live)
- [ ] Upload audio in-app (admin)
- [ ] Analytics (temps d'écoute réel)

### P2 (futur)
- [ ] Apple Sign-In (Apple Developer account requis)
- [ ] Multi-langue (EN, AR, RTL)
- [ ] Architecture subscription (free/paid gating)
- [ ] Algorithme recommendation ML
- [ ] Zoom live integration réelle

## Date implémentation : 2026-02-20
