# Guide de déploiement - Sijill Project sur VPS Hostinger

## Prérequis
- VPS Hostinger avec Ubuntu 24.04 + Docker Manager activé
- Domaines (sijill.com, sijill.fr, sijill.org) pointant vers l'IP du VPS
- Accès SSH au serveur

---

## Étape 1 : Configurer les DNS

Dans le tableau de bord Hostinger, pour **chaque domaine** (sijill.com, sijill.fr, sijill.org) :

| Type | Nom | Valeur |
|------|------|--------|
| A    | @    | 187.124.40.195 |
| A    | www  | 187.124.40.195 |

> Les DNS peuvent prendre 5 à 30 minutes pour se propager.

---

## Étape 2 : Se connecter en SSH

```bash
ssh root@187.124.40.195
```

Le mot de passe est dans votre tableau de bord Hostinger > VPS > Détails du serveur.

---

## Étape 3 : Transférer le projet

### Option A : Via GitHub (recommandé)

1. Poussez le code sur GitHub via le bouton **"Save to Github"** dans Emergent
2. Sur le VPS :
```bash
cd /root
git clone https://github.com/VOTRE_REPO/sijill.git
cd sijill
```

### Option B : Via SCP (depuis votre machine locale)

Si vous avez téléchargé le code :
```bash
scp -r ./projet-sijill root@187.124.40.195:/root/sijill
```

---

## Étape 4 : Lancer le déploiement

```bash
cd /root/sijill
chmod +x deploy.sh
./deploy.sh
```

Le script va :
1. Mettre à jour le système
2. Installer Docker (si absent)
3. Obtenir un certificat SSL Let's Encrypt
4. Construire et lancer tous les conteneurs (MongoDB + Backend + Nginx)

---

## Étape 5 : Vérifier

```bash
# Voir les conteneurs
docker compose ps

# Voir les logs du backend
docker compose logs -f backend

# Tester l'API
curl https://sijill.com/api/cursus
```

---

## URLs après déploiement

| Service | URL |
|---------|-----|
| Site web | https://sijill.com |
| Blog | https://sijill.com/blog |
| Admin | https://sijill.com/api/admin |
| API | https://sijill.com/api/ |

---

## Commandes utiles

```bash
# Redémarrer tout
docker compose restart

# Voir les logs
docker compose logs -f backend
docker compose logs -f nginx

# Reconstruire après une mise à jour du code
git pull
docker compose build --no-cache backend
docker compose up -d

# Renouveler le certificat SSL (automatique, mais en cas de besoin)
docker compose run --rm certbot renew
docker compose restart nginx
```

---

## Migration des données depuis Emergent

Pour exporter la base MongoDB depuis Emergent et l'importer sur le VPS :

### Sur Emergent (avant de quitter) :
```bash
mongodump --db test_database --out /tmp/sijill_dump
```

### Transférer sur le VPS :
```bash
scp -r /tmp/sijill_dump root@187.124.40.195:/root/
```

### Importer sur le VPS :
```bash
docker compose exec -T mongodb mongorestore --db sijill_production /root/sijill_dump/test_database
```

---

## Support

Email : contact@sijillproject.com
