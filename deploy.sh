#!/bin/bash
set -e

# ================================================================
# Script de déploiement Sijill Project sur VPS Hostinger
# Usage: ./deploy.sh
# ================================================================

DOMAIN="sijill.com"
EMAIL="contact@sijillproject.com"
PROJECT_DIR="/root/sijill"

echo "========================================"
echo "  Déploiement Sijill Project"
echo "========================================"

# 1. Mise à jour système
echo "[1/7] Mise à jour du système..."
apt-get update && apt-get upgrade -y

# 2. Installer Docker si absent
if ! command -v docker &> /dev/null; then
    echo "[2/7] Installation de Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "[2/7] Docker déjà installé"
fi

# 3. Installer Docker Compose si absent
if ! command -v docker compose &> /dev/null; then
    echo "[3/7] Installation de Docker Compose..."
    apt-get install -y docker-compose-plugin
else
    echo "[3/7] Docker Compose déjà installé"
fi

# 4. Créer les dossiers nécessaires
echo "[4/7] Préparation des dossiers..."
mkdir -p $PROJECT_DIR/certbot/conf
mkdir -p $PROJECT_DIR/certbot/www

# 5. Obtenir le certificat SSL (première fois)
if [ ! -d "$PROJECT_DIR/certbot/conf/live/$DOMAIN" ]; then
    echo "[5/7] Obtention du certificat SSL Let's Encrypt..."
    
    # Config nginx temporaire sans SSL pour la validation
    cat > $PROJECT_DIR/nginx/default.conf << 'NGINX_TEMP'
server {
    listen 80;
    server_name sijill.com www.sijill.com sijill.fr www.sijill.fr sijill.org www.sijill.org;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://backend:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://backend:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_TEMP

    # Démarrer nginx + backend temporairement
    cd $PROJECT_DIR
    docker compose up -d nginx backend mongodb
    sleep 5

    # Obtenir le certificat
    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        -d $DOMAIN -d www.$DOMAIN \
        -d sijill.fr -d www.sijill.fr \
        -d sijill.org -d www.sijill.org \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email

    # Restaurer la config nginx complète avec SSL
    cp $PROJECT_DIR/nginx/default.conf.ssl $PROJECT_DIR/nginx/default.conf 2>/dev/null || true
    
    docker compose down
else
    echo "[5/7] Certificat SSL déjà présent"
fi

# 6. Construire et lancer
echo "[6/7] Construction et lancement des conteneurs..."
cd $PROJECT_DIR
docker compose build --no-cache
docker compose up -d

# 7. Vérification
echo "[7/7] Vérification..."
sleep 10
docker compose ps

echo ""
echo "========================================"
echo "  Déploiement terminé !"
echo "  Site : https://$DOMAIN"
echo "  Admin : https://$DOMAIN/api/admin"
echo "========================================"
