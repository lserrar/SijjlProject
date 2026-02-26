# SendPulse Email Service for Sijill Project
# Configure your credentials in backend/.env once you have your domain

import os
import json
import logging
from typing import Optional, List, Dict
import requests
from requests.auth import HTTPBasicAuth

logger = logging.getLogger(__name__)

# SendPulse Configuration - Set these in .env
SENDPULSE_CLIENT_ID = os.environ.get('SENDPULSE_CLIENT_ID', '')
SENDPULSE_CLIENT_SECRET = os.environ.get('SENDPULSE_CLIENT_SECRET', '')
SENDPULSE_SENDER_EMAIL = os.environ.get('SENDPULSE_SENDER_EMAIL', '')
SENDPULSE_SENDER_NAME = os.environ.get('SENDPULSE_SENDER_NAME', 'Sijill Project')

SENDPULSE_API_URL = 'https://api.sendpulse.com/smtp/emails'

# Check if SendPulse is configured
def is_email_configured() -> bool:
    """Check if SendPulse credentials are configured."""
    return bool(SENDPULSE_CLIENT_ID and SENDPULSE_CLIENT_SECRET and SENDPULSE_SENDER_EMAIL)


def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> Dict:
    """
    Send an email via SendPulse SMTP API.
    
    Args:
        to_email: Recipient email address
        to_name: Recipient name
        subject: Email subject
        html_content: HTML body of the email
        text_content: Plain text fallback (optional)
    
    Returns:
        dict with 'success' and 'message' or 'error'
    """
    if not is_email_configured():
        logger.warning("SendPulse not configured - email not sent")
        return {'success': False, 'error': 'Email service not configured'}
    
    email_data = {
        "html": html_content,
        "text": text_content or "",
        "subject": subject,
        "from": {
            "name": SENDPULSE_SENDER_NAME,
            "email": SENDPULSE_SENDER_EMAIL
        },
        "to": [
            {
                "name": to_name,
                "email": to_email
            }
        ]
    }
    
    try:
        response = requests.post(
            SENDPULSE_API_URL,
            auth=HTTPBasicAuth(SENDPULSE_CLIENT_ID, SENDPULSE_CLIENT_SECRET),
            headers={'Content-Type': 'application/json'},
            data=json.dumps(email_data),
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Email sent successfully to {to_email}: {result}")
            return {'success': True, 'message': 'Email sent', 'id': result.get('id')}
        else:
            logger.error(f"SendPulse error: {response.status_code} - {response.text}")
            return {'success': False, 'error': f"API error: {response.status_code}"}
            
    except requests.exceptions.Timeout:
        logger.error("SendPulse request timeout")
        return {'success': False, 'error': 'Request timeout'}
    except Exception as e:
        logger.error(f"SendPulse exception: {str(e)}")
        return {'success': False, 'error': str(e)}


# ─── Email Templates ────────────────────────────────────────────────────────

def get_base_template(content: str, title: str = "Sijill Project") -> str:
    """Wrap content in base email template."""
    return f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #141414; border-radius: 12px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #04D182, #02b36e); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #0a0a0a; font-size: 28px; font-weight: 700; letter-spacing: 2px;">SIJILL</h1>
                            <p style="margin: 5px 0 0 0; color: rgba(10, 10, 10, 0.7); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Études Islamiques</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px; color: #ffffff;">
                            {content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1a1a1a; padding: 20px 30px; text-align: center; border-top: 1px solid #2a2a2a;">
                            <p style="margin: 0; color: #666666; font-size: 12px;">
                                © 2026 Sijill Project. Tous droits réservés.
                            </p>
                            <p style="margin: 10px 0 0 0; color: #666666; font-size: 11px;">
                                Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


# ─── Referral Notification Emails ───────────────────────────────────────────

def send_referral_signup_notification(
    referrer_email: str,
    referrer_name: str,
    referee_name: str
) -> Dict:
    """
    Notify referrer when someone signs up with their referral code.
    
    Args:
        referrer_email: Email of the referrer (parrain)
        referrer_name: Name of the referrer
        referee_name: Name of the new user (filleul)
    """
    subject = "🎉 Nouveau filleul inscrit avec votre code !"
    
    content = f"""
        <h2 style="margin: 0 0 20px 0; color: #04D182; font-size: 24px;">Bonne nouvelle !</h2>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
            Bonjour <strong>{referrer_name}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
            <strong style="color: #04D182;">{referee_name}</strong> vient de s'inscrire sur Sijill grâce à votre code de parrainage !
        </p>
        <div style="background-color: #1e1e1e; border-left: 4px solid #04D182; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 14px; color: #a0a0a0;">
                <strong style="color: #ffffff;">Prochaine étape :</strong><br>
                Dès que {referee_name} souscrira à un abonnement, vous recevrez automatiquement <strong style="color: #04D182;">1 mois gratuit</strong> en récompense !
            </p>
        </div>
        <p style="margin: 0; font-size: 14px; color: #888888;">
            Continuez à partager votre code pour gagner encore plus de mois gratuits.
        </p>
    """
    
    html = get_base_template(content, "Nouveau filleul - Sijill")
    text = f"Bonjour {referrer_name}, {referee_name} vient de s'inscrire avec votre code de parrainage !"
    
    return send_email(referrer_email, referrer_name, subject, html, text)


def send_referral_conversion_notification(
    referrer_email: str,
    referrer_name: str,
    referee_name: str,
    free_months: int = 1
) -> Dict:
    """
    Notify referrer when their referral converts (subscribes).
    
    Args:
        referrer_email: Email of the referrer (parrain)
        referrer_name: Name of the referrer
        referee_name: Name of the converted user (filleul)
        free_months: Number of free months awarded
    """
    subject = f"🎁 Félicitations ! Vous avez gagné {free_months} mois gratuit{'s' if free_months > 1 else ''} !"
    
    content = f"""
        <h2 style="margin: 0 0 20px 0; color: #04D182; font-size: 24px;">Félicitations !</h2>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
            Bonjour <strong>{referrer_name}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
            Votre filleul <strong style="color: #04D182;">{referee_name}</strong> vient de souscrire à un abonnement Sijill !
        </p>
        <div style="background: linear-gradient(135deg, rgba(4, 209, 130, 0.15), rgba(4, 209, 130, 0.05)); border: 1px solid #04D182; padding: 25px; margin: 25px 0; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #a0a0a0; text-transform: uppercase; letter-spacing: 1px;">Votre récompense</p>
            <p style="margin: 0; font-size: 48px; font-weight: 700; color: #04D182;">{free_months}</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #ffffff;">mois gratuit{'s' if free_months > 1 else ''}</p>
        </div>
        <p style="margin: 0 0 15px 0; font-size: 14px; color: #a0a0a0;">
            Ce mois gratuit a été automatiquement ajouté à votre abonnement.
        </p>
        <p style="margin: 0; font-size: 14px; color: #888888;">
            Merci de faire partie de la communauté Sijill !
        </p>
    """
    
    html = get_base_template(content, "Récompense parrainage - Sijill")
    text = f"Félicitations {referrer_name} ! {referee_name} a souscrit et vous gagnez {free_months} mois gratuit !"
    
    return send_email(referrer_email, referrer_name, subject, html, text)


def send_referee_welcome_notification(
    referee_email: str,
    referee_name: str,
    referrer_name: str,
    free_months: int = 1
) -> Dict:
    """
    Welcome email to new user who signed up with referral code.
    
    Args:
        referee_email: Email of the new user (filleul)
        referee_name: Name of the new user
        referrer_name: Name of the referrer who invited them
        free_months: Number of free months they'll get when subscribing
    """
    subject = "🌟 Bienvenue sur Sijill - Votre bonus de parrainage vous attend !"
    
    content = f"""
        <h2 style="margin: 0 0 20px 0; color: #04D182; font-size: 24px;">Bienvenue sur Sijill !</h2>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
            Bonjour <strong>{referee_name}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
            Merci de rejoindre Sijill grâce à <strong style="color: #04D182;">{referrer_name}</strong> !
        </p>
        <div style="background: linear-gradient(135deg, rgba(4, 209, 130, 0.15), rgba(4, 209, 130, 0.05)); border: 1px solid #04D182; padding: 25px; margin: 25px 0; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #a0a0a0; text-transform: uppercase; letter-spacing: 1px;">Votre bonus parrainage</p>
            <p style="margin: 0; font-size: 48px; font-weight: 700; color: #04D182;">{free_months}</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #ffffff;">mois gratuit{'s' if free_months > 1 else ''}</p>
            <p style="margin: 15px 0 0 0; font-size: 13px; color: #888888;">offert{'s' if free_months > 1 else ''} lors de votre premier abonnement</p>
        </div>
        <p style="margin: 0 0 15px 0; font-size: 14px; color: #a0a0a0;">
            Explorez notre catalogue de cours sur les études islamiques et commencez votre parcours d'apprentissage dès maintenant.
        </p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="https://sijill.com" style="display: inline-block; background-color: #04D182; color: #0a0a0a; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 14px;">Découvrir les cours</a>
        </div>
    """
    
    html = get_base_template(content, "Bienvenue - Sijill")
    text = f"Bienvenue {referee_name} sur Sijill ! Grâce à {referrer_name}, vous bénéficiez de {free_months} mois gratuit lors de votre premier abonnement."
    
    return send_email(referee_email, referee_name, subject, html, text)


# ─── Other Notification Emails ──────────────────────────────────────────────

def send_subscription_confirmation(
    user_email: str,
    user_name: str,
    plan_name: str,
    amount: float,
    end_date: str
) -> Dict:
    """Send subscription confirmation email."""
    subject = "✅ Votre abonnement Sijill est activé"
    
    content = f"""
        <h2 style="margin: 0 0 20px 0; color: #04D182; font-size: 24px;">Abonnement activé !</h2>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
            Bonjour <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
            Votre abonnement <strong style="color: #04D182;">{plan_name}</strong> est maintenant actif.
        </p>
        <div style="background-color: #1e1e1e; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                    <td style="padding: 8px 0; color: #888888; font-size: 14px;">Plan</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">{plan_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #888888; font-size: 14px; border-top: 1px solid #2a2a2a;">Montant</td>
                    <td style="padding: 8px 0; color: #04D182; font-size: 14px; text-align: right; border-top: 1px solid #2a2a2a;">{amount:.2f} €</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #888888; font-size: 14px; border-top: 1px solid #2a2a2a;">Valide jusqu'au</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right; border-top: 1px solid #2a2a2a;">{end_date}</td>
                </tr>
            </table>
        </div>
        <p style="margin: 0; font-size: 14px; color: #888888;">
            Vous avez maintenant accès à l'ensemble du catalogue Sijill. Bon apprentissage !
        </p>
    """
    
    html = get_base_template(content, "Abonnement confirmé - Sijill")
    text = f"Bonjour {user_name}, votre abonnement {plan_name} est activé jusqu'au {end_date}."
    
    return send_email(user_email, user_name, subject, html, text)


def send_password_reset_email(
    user_email: str,
    user_name: str,
    reset_link: str
) -> Dict:
    """Send password reset email."""
    subject = "🔐 Réinitialisation de votre mot de passe Sijill"
    
    content = f"""
        <h2 style="margin: 0 0 20px 0; color: #04D182; font-size: 24px;">Réinitialisation du mot de passe</h2>
        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
            Bonjour <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
            Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en créer un nouveau :
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="display: inline-block; background-color: #04D182; color: #0a0a0a; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 14px;">Réinitialiser mon mot de passe</a>
        </div>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #888888;">
            Ce lien expire dans 1 heure.
        </p>
        <p style="margin: 0; font-size: 13px; color: #888888;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        </p>
    """
    
    html = get_base_template(content, "Mot de passe - Sijill")
    text = f"Bonjour {user_name}, réinitialisez votre mot de passe ici : {reset_link}"
    
    return send_email(user_email, user_name, subject, html, text)
