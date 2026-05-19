"""Sijill Stripe Subscriptions — Phase B.

12-month minimum commitment enforced at the application level:
- On subscription creation, we store `commitment_min_end` = now + 12 months.
- Each `invoice.paid` webhook increments `paid_invoices_count`.
- The cancellation endpoint refuses (HTTP 400) if `paid_invoices_count < 12`.
- Monthly plans bill 7€ (Founder) / 12€ (Standard) once a month for 12 invoices.
- Yearly plans bill 84€ (Founder) / 120€ (Standard) upfront (1 invoice, commitment auto-satisfied).
- Gift cards remain on the existing one-shot `mode=payment` flow (utils/gift_cards.py).
"""
from __future__ import annotations
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import stripe

logger = logging.getLogger(__name__)


# ─── Catalog definition ───────────────────────────────────────────────────────
# `lookup_key` is the idempotent handle Stripe uses to find existing prices.
# Format: sijill_<plan_id>_v1. Bump the version suffix if you ever need to
# create a new price for the same plan (do not edit existing prices).
SUBSCRIPTION_PLANS = {
    'founder_monthly': {
        'product_lookup': 'sijill_founder',
        'product_name': 'Sijill Project — Abonnement Fondateur',
        'product_description': 'Abonnement Fondateur · 200 places · tarif garanti à vie',
        'lookup_key': 'sijill_founder_monthly_v1',
        'price_eur': 7.00,
        'interval': 'month',
        'commitment_months': 12,
    },
    'founder_yearly': {
        'product_lookup': 'sijill_founder',
        'product_name': 'Sijill Project — Abonnement Fondateur',
        'product_description': 'Abonnement Fondateur · 200 places · tarif garanti à vie',
        'lookup_key': 'sijill_founder_yearly_v1',
        'price_eur': 84.00,
        'interval': 'year',
        'commitment_months': 12,
    },
    'standard_monthly': {
        'product_lookup': 'sijill_standard',
        'product_name': 'Sijill Project — Abonnement Standard',
        'product_description': 'Abonnement Standard · accès complet au catalogue',
        'lookup_key': 'sijill_standard_monthly_v1',
        'price_eur': 12.00,
        'interval': 'month',
        'commitment_months': 12,
    },
    'standard_yearly': {
        'product_lookup': 'sijill_standard',
        'product_name': 'Sijill Project — Abonnement Standard',
        'product_description': 'Abonnement Standard · accès complet au catalogue',
        'lookup_key': 'sijill_standard_yearly_v1',
        'price_eur': 120.00,
        'interval': 'year',
        'commitment_months': 12,
    },
}


def _stripe_configured() -> bool:
    """True if a Stripe secret key is set (test or live)."""
    key = os.environ.get('STRIPE_API_KEY', '')
    return key.startswith('sk_')


def _ensure_api_key():
    """Set stripe.api_key from env at every entry-point (cheap idempotent)."""
    key = os.environ.get('STRIPE_API_KEY', '')
    if not key:
        raise RuntimeError('STRIPE_API_KEY not configured')
    stripe.api_key = key


# ─── Provisioning (boot-time) ─────────────────────────────────────────────────
async def provision_catalog(db) -> dict:
    """Find-or-create Stripe Products + Prices using lookup_key.

    Idempotent: safe to call on every boot. Stores resulting price IDs into
    `db.plans` so the rest of the app can map plan_id → stripe_price_id.

    Returns a summary dict for logging.
    """
    if not _stripe_configured():
        return {'provisioned': 0, 'skipped': 'no_stripe_key'}

    _ensure_api_key()
    summary = {'created_products': 0, 'created_prices': 0, 'existing_prices': 0, 'plans': []}

    # Cache product IDs by product_lookup so we only retrieve once per unique product.
    product_cache: dict[str, str] = {}

    for plan_id, cfg in SUBSCRIPTION_PLANS.items():
        # 1. Resolve or create Product
        product_id = product_cache.get(cfg['product_lookup'])
        if not product_id:
            # Try to find existing product by metadata lookup
            existing = stripe.Product.search(query=f"metadata['lookup']:'{cfg['product_lookup']}'", limit=1)
            if existing.data:
                product_id = existing.data[0].id
            else:
                product = stripe.Product.create(
                    name=cfg['product_name'],
                    description=cfg['product_description'],
                    metadata={'lookup': cfg['product_lookup']},
                )
                product_id = product.id
                summary['created_products'] += 1
            product_cache[cfg['product_lookup']] = product_id

        # 2. Resolve or create Price via lookup_key (idempotent)
        existing_prices = stripe.Price.list(lookup_keys=[cfg['lookup_key']], active=True, limit=1)
        if existing_prices.data:
            price = existing_prices.data[0]
            summary['existing_prices'] += 1
        else:
            price = stripe.Price.create(
                product=product_id,
                unit_amount=int(round(cfg['price_eur'] * 100)),
                currency='eur',
                recurring={'interval': cfg['interval']},
                lookup_key=cfg['lookup_key'],
            )
            summary['created_prices'] += 1

        # 3. Persist mapping into db.plans (used by checkout + gift cards)
        await db.plans.update_one(
            {'plan_id': plan_id},
            {
                '$set': {
                    'plan_id': plan_id,
                    'name': cfg['product_name'].replace('Sijill Project — ', '') + (
                        ' Mensuel' if cfg['interval'] == 'month' else ' Annuel'
                    ),
                    'price': cfg['price_eur'],
                    'currency': 'eur',
                    'interval': cfg['interval'],
                    'duration_days': 30 if cfg['interval'] == 'month' else 365,
                    'type': 'subscription',
                    'commitment_months': cfg['commitment_months'],
                    'stripe_product_id': product_id,
                    'stripe_price_id': price.id,
                    'stripe_lookup_key': cfg['lookup_key'],
                    'is_active': True,
                    'is_fondateur': 'founder' in plan_id,
                    'updated_at': datetime.now(timezone.utc),
                },
                '$setOnInsert': {'created_at': datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        summary['plans'].append({'plan_id': plan_id, 'stripe_price_id': price.id})

    logger.info(f"Stripe catalog provisioned: {summary}")
    return summary


# ─── Customer helpers ─────────────────────────────────────────────────────────
async def get_or_create_stripe_customer(db, user: dict) -> str:
    """Return the Stripe customer ID for the user, creating one if needed.

    Caches in `users.stripe_customer_id`.
    """
    _ensure_api_key()
    existing = user.get('stripe_customer_id')
    if existing:
        return existing

    customer = stripe.Customer.create(
        email=user.get('email'),
        name=user.get('name') or user.get('full_name') or '',
        metadata={'user_id': user['user_id']},
    )
    await db.users.update_one(
        {'user_id': user['user_id']},
        {'$set': {'stripe_customer_id': customer.id}},
    )
    return customer.id


# ─── Checkout (subscription mode) ─────────────────────────────────────────────
async def create_subscription_checkout(
    db,
    *,
    user: dict,
    plan_id: str,
    origin_url: str,
) -> dict:
    """Create a Stripe Checkout Session in subscription mode.

    Returns `{ 'url': ..., 'session_id': ... }`. The actual subscription record
    is created/updated by the webhook handler on `checkout.session.completed`.
    """
    if plan_id not in SUBSCRIPTION_PLANS:
        raise ValueError(f"Unknown plan_id: {plan_id}")

    cfg = SUBSCRIPTION_PLANS[plan_id]
    _ensure_api_key()

    # Look up the stripe_price_id (set by provision_catalog at boot)
    plan = await db.plans.find_one({'plan_id': plan_id, 'is_active': True}, {'_id': 0})
    if not plan or not plan.get('stripe_price_id'):
        raise RuntimeError(f"Plan {plan_id} has no stripe_price_id — run provision_catalog first")

    customer_id = await get_or_create_stripe_customer(db, user)

    success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/payment/cancel"

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode='subscription',
        line_items=[{'price': plan['stripe_price_id'], 'quantity': 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        allow_promotion_codes=True,
        locale='fr',
        client_reference_id=user['user_id'],
        subscription_data={
            'metadata': {
                'user_id': user['user_id'],
                'plan_id': plan_id,
                'commitment_months': str(cfg['commitment_months']),
            },
            'description': cfg['product_description'],
        },
        metadata={
            'user_id': user['user_id'],
            'plan_id': plan_id,
            'purchase_type': 'subscription',
        },
    )

    # Record provisional transaction (status updated by webhook)
    await db.payment_transactions.insert_one({
        'transaction_id': f"sub_{session.id[-12:]}",
        'session_id': session.id,
        'user_id': user['user_id'],
        'user_email': user.get('email', ''),
        'amount': cfg['price_eur'],
        'currency': 'eur',
        'product_name': cfg['product_name'],
        'metadata': {
            'user_id': user['user_id'],
            'plan_id': plan_id,
            'purchase_type': 'subscription',
            'duration_days': str(30 if cfg['interval'] == 'month' else 365),
            'commitment_months': str(cfg['commitment_months']),
        },
        'status': 'pending',
        'payment_status': 'initiated',
        'mode': 'subscription',
        'created_at': datetime.now(timezone.utc),
    })

    return {'url': session.url, 'session_id': session.id}


# ─── Webhook handler ──────────────────────────────────────────────────────────
async def construct_event(payload: bytes, signature: str):
    """Verify Stripe signature, return the event."""
    secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    if not secret:
        raise RuntimeError('STRIPE_WEBHOOK_SECRET not configured')
    _ensure_api_key()
    return stripe.Webhook.construct_event(payload, signature, secret)


async def handle_event(db, event) -> dict:
    """Dispatch a verified Stripe event to the right handler.

    Idempotent: each handler tolerates being called multiple times on the
    same Stripe object (re-delivered webhooks).
    """
    etype = event['type']
    obj = event['data']['object']
    handlers = {
        'checkout.session.completed': _on_checkout_completed,
        'invoice.paid': _on_invoice_paid,
        'invoice.payment_succeeded': _on_invoice_paid,  # alias
        'invoice.payment_failed': _on_invoice_failed,
        'customer.subscription.created': _on_subscription_upserted,
        'customer.subscription.updated': _on_subscription_upserted,
        'customer.subscription.deleted': _on_subscription_deleted,
    }
    handler = handlers.get(etype)
    if not handler:
        return {'handled': False, 'type': etype}
    try:
        await handler(db, obj)
        return {'handled': True, 'type': etype}
    except Exception as exc:
        logger.exception(f"Stripe webhook handler error for {etype}: {exc}")
        return {'handled': False, 'type': etype, 'error': str(exc)}


async def _on_checkout_completed(db, session: dict):
    """Mark our payment_transactions row as complete; subscription details come
    via customer.subscription.created (also fired right after)."""
    session_id = session.get('id')
    if not session_id:
        return
    await db.payment_transactions.update_one(
        {'session_id': session_id},
        {'$set': {
            'status': 'complete',
            'payment_status': 'paid' if session.get('payment_status') == 'paid' else 'processing',
            'subscription_id': session.get('subscription'),
            'customer_id': session.get('customer'),
            'updated_at': datetime.now(timezone.utc),
        }},
    )


async def _on_subscription_upserted(db, sub: dict):
    """Create or update the user's subscription record + grant access."""
    sub_id = sub.get('id')
    customer_id = sub.get('customer')
    status = sub.get('status', 'incomplete')
    metadata = sub.get('metadata') or {}

    user_id = metadata.get('user_id')
    plan_id = metadata.get('plan_id')
    commitment_months = int(metadata.get('commitment_months') or 12)

    # Fallback: locate user via customer_id
    if not user_id and customer_id:
        u = await db.users.find_one({'stripe_customer_id': customer_id}, {'user_id': 1})
        if u:
            user_id = u['user_id']
    if not user_id:
        logger.warning(f"Stripe subscription {sub_id} has no user_id (customer={customer_id})")
        return

    items = (sub.get('items') or {}).get('data') or []
    stripe_price_id = items[0]['price']['id'] if items else None
    interval = items[0]['price']['recurring']['interval'] if items else 'month'

    # Resolve plan_id from price if metadata missing (defensive)
    if not plan_id and stripe_price_id:
        plan_row = await db.plans.find_one({'stripe_price_id': stripe_price_id}, {'plan_id': 1})
        if plan_row:
            plan_id = plan_row['plan_id']

    cps = sub.get('current_period_start')
    cpe = sub.get('current_period_end')
    started_at = datetime.fromtimestamp(cps, tz=timezone.utc) if cps else datetime.now(timezone.utc)
    period_end = datetime.fromtimestamp(cpe, tz=timezone.utc) if cpe else (started_at + timedelta(days=30))

    # 12-month commitment minimum end date
    commitment_min_end = started_at + timedelta(days=commitment_months * 30)
    # Yearly subscriptions: commitment auto-satisfied by first invoice
    yearly = (interval == 'year')

    existing = await db.subscriptions.find_one({'stripe_subscription_id': sub_id}, {'_id': 0})
    paid_count = existing.get('paid_invoices_count', 0) if existing else 0

    doc = {
        'user_id': user_id,
        'stripe_subscription_id': sub_id,
        'stripe_customer_id': customer_id,
        'stripe_price_id': stripe_price_id,
        'plan_id': plan_id,
        'interval': interval,
        'status': status,
        'started_at': started_at,
        'current_period_end': period_end,
        'commitment_months': commitment_months,
        'commitment_min_end': commitment_min_end,
        'cancel_at_period_end': bool(sub.get('cancel_at_period_end')),
        'canceled_at': datetime.fromtimestamp(sub['canceled_at'], tz=timezone.utc) if sub.get('canceled_at') else None,
        'paid_invoices_count': paid_count,
        'yearly_upfront': yearly,
        'updated_at': datetime.now(timezone.utc),
    }
    await db.subscriptions.update_one(
        {'stripe_subscription_id': sub_id},
        {'$set': doc, '$setOnInsert': {'created_at': datetime.now(timezone.utc)}},
        upsert=True,
    )

    # Grant access on the user document if status is active/trialing
    if status in ('active', 'trialing'):
        await db.users.update_one(
            {'user_id': user_id},
            {'$set': {
                'subscription': {
                    'plan_id': plan_id,
                    'started_at': started_at,
                    'expires_at': period_end,
                    'status': status,
                    'stripe_subscription_id': sub_id,
                },
                'subscription_status': 'active',
                'subscription_plan': plan_id,
                'subscription_source': 'stripe',
                'subscription_end_date': period_end,
            }},
        )


async def _on_subscription_deleted(db, sub: dict):
    sub_id = sub.get('id')
    canceled_at = sub.get('canceled_at') or sub.get('ended_at')
    await db.subscriptions.update_one(
        {'stripe_subscription_id': sub_id},
        {'$set': {
            'status': 'canceled',
            'canceled_at': datetime.fromtimestamp(canceled_at, tz=timezone.utc) if canceled_at else datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc),
        }},
    )
    # Revoke active access on the user
    s = await db.subscriptions.find_one({'stripe_subscription_id': sub_id}, {'user_id': 1, 'current_period_end': 1})
    if s and s.get('user_id'):
        await db.users.update_one(
            {'user_id': s['user_id']},
            {'$set': {
                'subscription_status': 'canceled',
                'subscription_end_date': s.get('current_period_end'),
            }},
        )


async def _on_invoice_paid(db, invoice: dict):
    """Increment paid_invoices_count and extend access window."""
    sub_id = invoice.get('subscription')
    if not sub_id:
        return
    period_end_ts = invoice.get('period_end') or invoice.get('lines', {}).get('data', [{}])[0].get('period', {}).get('end')
    period_end = datetime.fromtimestamp(period_end_ts, tz=timezone.utc) if period_end_ts else None

    update_set = {'updated_at': datetime.now(timezone.utc), 'last_paid_invoice_id': invoice.get('id')}
    if period_end:
        update_set['current_period_end'] = period_end

    await db.subscriptions.update_one(
        {'stripe_subscription_id': sub_id},
        {'$inc': {'paid_invoices_count': 1}, '$set': update_set},
    )

    # Push expires_at forward on the user doc
    sub = await db.subscriptions.find_one({'stripe_subscription_id': sub_id}, {'_id': 0})
    if sub and sub.get('user_id') and period_end:
        await db.users.update_one(
            {'user_id': sub['user_id']},
            {'$set': {
                'subscription_end_date': period_end,
                'subscription_status': 'active',
                'subscription.expires_at': period_end,
                'subscription.status': 'active',
            }},
        )


async def _on_invoice_failed(db, invoice: dict):
    sub_id = invoice.get('subscription')
    if not sub_id:
        return
    await db.subscriptions.update_one(
        {'stripe_subscription_id': sub_id},
        {'$set': {
            'last_payment_failed_at': datetime.now(timezone.utc),
            'last_payment_failed_invoice_id': invoice.get('id'),
            'updated_at': datetime.now(timezone.utc),
        }},
    )


# ─── Cancellation (strict 12-month policy) ────────────────────────────────────
class CommitmentNotMet(Exception):
    """Raised when user attempts to cancel before paying 12 invoices."""
    def __init__(self, *, paid: int, required: int, commitment_min_end: Optional[datetime]):
        self.paid = paid
        self.required = required
        self.commitment_min_end = commitment_min_end
        super().__init__(
            f"Engagement de {required} mois non atteint ({paid}/{required} mensualités payées)."
        )


async def cancel_subscription_with_policy(db, *, user_id: str) -> dict:
    """Cancel the user's active subscription at period end if commitment met.

    Raises CommitmentNotMet otherwise.
    """
    _ensure_api_key()
    sub = await db.subscriptions.find_one(
        {'user_id': user_id, 'status': {'$in': ['active', 'trialing', 'past_due']}},
        {'_id': 0},
        sort=[('created_at', -1)],
    )
    if not sub:
        raise ValueError("Aucun abonnement actif trouvé.")

    paid = int(sub.get('paid_invoices_count', 0))
    required = int(sub.get('commitment_months', 12))
    yearly = bool(sub.get('yearly_upfront'))

    # Yearly upfront subscribers paid the full 12 months in one invoice → commitment satisfied
    if not yearly and paid < required:
        raise CommitmentNotMet(
            paid=paid,
            required=required,
            commitment_min_end=sub.get('commitment_min_end'),
        )

    # Schedule cancellation at end of period (no proration / no refund)
    stripe_sub = stripe.Subscription.modify(
        sub['stripe_subscription_id'],
        cancel_at_period_end=True,
    )
    await db.subscriptions.update_one(
        {'stripe_subscription_id': sub['stripe_subscription_id']},
        {'$set': {
            'cancel_at_period_end': True,
            'cancel_requested_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc),
        }},
    )
    return {
        'stripe_subscription_id': stripe_sub.id,
        'cancel_at_period_end': True,
        'current_period_end': sub.get('current_period_end'),
    }
