"""Regression tests for cursus map title rewriting.

The two map files of a cursus (historical + thinkers) share the same
HTML <title> tag, so the listing endpoint must rewrite the brand prefix
("Sijill —") into a role-specific label derived from the filename:
- `map_*_penseurs.html` → "Carte des Penseurs"
- `map_*.html`           → "Carte Historique"
"""
import os
import httpx
import pytest

BASE = os.environ.get('SIJILL_API_BASE', 'https://phased-launch-1.preview.emergentagent.com').rstrip('/')
EMAIL = 'loubna.serrar@gmail.com'
PASSWORD = 'Admin123!'
# `cursus-arts` is the public-facing cursus id that resolves to the
# `cursus-d-arts-litterature/` R2 root (see Migration v12).
CURSUS_ID = 'cursus-arts'


@pytest.fixture(scope='module')
def auth():
    r = httpx.post(f'{BASE}/api/auth/login', json={'email': EMAIL, 'password': PASSWORD}, timeout=20)
    r.raise_for_status()
    return {'Authorization': f"Bearer {r.json()['token']}"}


def test_cursus_maps_have_distinct_role_labels(auth):
    r = httpx.get(f'{BASE}/api/timelines/cursus/{CURSUS_ID}', headers=auth, timeout=30)
    r.raise_for_status()
    payload = r.json()
    items = payload if isinstance(payload, list) else payload.get('timelines', payload.get('items', []))
    by_name = {it['filename']: it['title'] for it in items if 'filename' in it}
    assert 'map_cursus_d.html' in by_name, f'missing historical map: {by_name}'
    assert 'map_cursus_d_penseurs.html' in by_name, f'missing thinkers map: {by_name}'
    assert by_name['map_cursus_d.html'].startswith('Carte Historique —'), by_name['map_cursus_d.html']
    assert by_name['map_cursus_d_penseurs.html'].startswith('Carte des Penseurs —'), by_name['map_cursus_d_penseurs.html']
    # Both must still carry the cursus context (no stripped right-hand side).
    assert 'Cursus D' in by_name['map_cursus_d.html']
    assert 'Cursus D' in by_name['map_cursus_d_penseurs.html']
