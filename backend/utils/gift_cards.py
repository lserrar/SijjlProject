"""Sijill Gift Cards module — purchase, redeem, email notifications.

Flow:
  1. Purchaser fills /api/gift-cards/purchase (recipient infos + plan + optional deliver_at)
  2. Backend creates a `gift_cards` doc (status='pending') + Stripe Checkout (mode=payment)
  3. On Stripe webhook success → status='paid' → generate unique code + send email
     (immediately or scheduled for `deliver_at`)
  4. Recipient enters code on /api/gift-cards/redeem → subscription extended.
"""
from __future__ import annotations
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


def generate_code() -> str:
    """SIJILL-XXXX-XXXX-XXXX (uppercase alphanum, no ambiguous chars)."""
    alphabet = ''.join(c for c in (string.ascii_uppercase + string.digits) if c not in 'O0I1L')
    blocks = [''.join(secrets.choice(alphabet) for _ in range(4)) for _ in range(3)]
    return 'SIJILL-' + '-'.join(blocks)


class GiftCardPurchaseRequest(BaseModel):
    plan_id: str = Field(..., description="founder_monthly | founder_yearly")
    purchaser_name: str
    purchaser_email: EmailStr
    recipient_name: str
    recipient_email: EmailStr
    personal_message: Optional[str] = Field(default='', max_length=500)
    deliver_at: Optional[str] = Field(default=None, description="ISO date YYYY-MM-DD or None for immediate")
    origin_url: str


class GiftCardRedeemRequest(BaseModel):
    code: str


GIFT_PLAN_PRICES = {
    'founder_monthly': {'amount': 7.0, 'duration_days': 31, 'label': 'Abonnement Founder · 1 mois'},
    'founder_yearly':  {'amount': 84.0, 'duration_days': 366, 'label': 'Abonnement Founder · 1 an'},
}


def gift_email_html(*, purchaser_name: str, recipient_name: str, plan_label: str,
                    code: str, redeem_url: str, personal_message: str = '') -> str:
    safe_msg = (personal_message or '').strip()
    msg_block = ''
    if safe_msg:
        msg_block = (
            f"<div style='background:#F4EDE0;border-left:3px solid #1FAE6B;"
            f"padding:18px 22px;margin:28px 0;font-style:italic;color:#3a2f24;"
            f"font-family:Georgia,serif;font-size:15px;line-height:1.6;'>"
            f"« {safe_msg.replace(chr(10), '<br>')} »"
            f"</div>"
        )
    return f"""<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#0d0c0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:0 auto;background:#f9f5ed;color:#1a1611;">
    <div style="background:#1FAE6B;padding:36px 28px;text-align:center;">
      <h1 style="color:#0d0c0a;font-family:Georgia,serif;font-size:30px;margin:0;letter-spacing:-0.5px;">Sijill Project</h1>
      <p style="margin:8px 0 0;color:#0d0c0a;font-size:13px;letter-spacing:3px;text-transform:uppercase;">Un cadeau pour vous</p>
    </div>
    <div style="padding:36px 28px;">
      <p style="font-size:16px;">Bonjour {recipient_name},</p>
      <p style="font-size:16px;line-height:1.6;">
        <strong>{purchaser_name}</strong> vous offre un abonnement <strong>{plan_label}</strong> à
        <em>Sijill Project</em> — la plateforme de référence sur les pensées de l'islam classique.
      </p>
      {msg_block}
      <div style="background:#0d0c0a;color:#1FAE6B;padding:26px;border-radius:6px;text-align:center;margin:28px 0;">
        <p style="margin:0 0 12px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#bbb;">Votre code cadeau</p>
        <p style="margin:0;font-family:'Courier New',monospace;font-size:22px;letter-spacing:2px;color:#1FAE6B;font-weight:700;">{code}</p>
      </div>
      <p style="text-align:center;margin:30px 0;">
        <a href="{redeem_url}" style="background:#1FAE6B;color:#0d0c0a;padding:14px 32px;text-decoration:none;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:13px;display:inline-block;border-radius:3px;">Activer mon cadeau</a>
      </p>
      <p style="font-size:13px;color:#6B5E4A;line-height:1.6;">
        Connectez-vous sur <a href="https://sijillproject.com" style="color:#1FAE6B;">sijillproject.com</a>,
        cliquez sur « Mon compte » puis saisissez ce code dans la section « J'ai reçu un cadeau ».
        Si vous n'avez pas encore de compte, créez-en un avant d'utiliser le code.
      </p>
      <p style="font-size:12px;color:#888;border-top:1px solid #e0d8c8;padding-top:18px;margin-top:32px;">
        Code valable 1 an. Sijill Project · sijillproject.com
      </p>
    </div>
  </div>
</body></html>"""


def purchaser_confirmation_html(*, purchaser_name: str, recipient_name: str,
                                plan_label: str, deliver_at: Optional[str], code: str) -> str:
    delivery = (
        f"livraison programmée pour le <strong>{deliver_at}</strong>"
        if deliver_at else "envoyé à l'instant"
    )
    return f"""<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#0d0c0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#f9f5ed;color:#1a1611;padding:36px 28px;">
    <h2 style="font-family:Georgia,serif;color:#0d0c0a;">Merci {purchaser_name} !</h2>
    <p style="font-size:15px;line-height:1.6;">
      Votre achat d'un <strong>{plan_label}</strong> pour <strong>{recipient_name}</strong> a été confirmé.
      L'email cadeau sera {delivery}.
    </p>
    <p style="font-size:13px;color:#6B5E4A;background:#F4EDE0;padding:14px 18px;border-radius:4px;">
      Pour information, le code généré est <code style="color:#1FAE6B;">{code}</code>.
      Conservez-le précieusement au cas où votre destinataire ne reçoive pas l'email.
    </p>
  </div>
</body></html>"""
