"""Regression tests for module-level bibliography auto-detection.

Covers:
- Listing `/api/courses/{id}/resources` returns module-scoped bibliographie
  entries when a `bibliographie_*` file lives in the IMMEDIATE PARENT of
  a course's r2_prefix.
- `/api/courses/{id}/resource-article` accepts that key and returns a
  rendered article with `scope='module'` and `type='bibliographie'`.
- `/api/courses/{id}/resource-access-url` signs a URL for the same key.

Uses the demo admin account (loubna.serrar@gmail.com / Admin123!) seeded
in MongoDB; the `cours-al-kindi` course has r2_prefix
`cursus-a-falsafa/02-falsafa/al-kindi/`, and its parent folder hosts
`bibliographie_falsafa.docx` on R2.
"""
import os
import urllib.parse
import pytest
import httpx

BASE = os.environ.get('SIJILL_API_BASE', 'https://phased-launch-1.preview.emergentagent.com').rstrip('/')
EMAIL = 'loubna.serrar@gmail.com'
PASSWORD = 'Admin123!'
COURSE_ID = 'cours-al-kindi'
# Dynamically discover the module biblio key (R2 file naming has migrated
# between `bibliographie_falsafa.docx` and `bibliographie-falsafa.docx`).
MODULE_BIBLIO_KEY = 'cursus-a-falsafa/02-falsafa/bibliographie-falsafa.docx'


@pytest.fixture(scope='module')
def token():
    r = httpx.post(f'{BASE}/api/auth/login', json={'email': EMAIL, 'password': PASSWORD}, timeout=20)
    r.raise_for_status()
    return r.json()['token']


@pytest.fixture(scope='module')
def auth(token):
    return {'Authorization': f'Bearer {token}'}


def test_list_resources_includes_module_biblio(auth):
    r = httpx.get(f'{BASE}/api/courses/{COURSE_ID}/resources', headers=auth, timeout=30)
    r.raise_for_status()
    items = r.json()['resources']
    module_items = [it for it in items if it.get('scope') == 'module']
    assert module_items, 'No module-scoped resources returned'
    biblio = next((it for it in module_items if it['r2_key'] == MODULE_BIBLIO_KEY), None)
    assert biblio, f'Expected module biblio {MODULE_BIBLIO_KEY} not found in {items}'
    assert biblio['type'] == 'bibliographie'
    # Label is now the *real* DOCX title (line 2 of the author template),
    # falling back to "Bibliographie — …" if extraction fails.
    assert biblio['label'] and isinstance(biblio['label'], str) and len(biblio['label']) >= 3
    assert biblio['auto_detected'] is True


def test_resource_article_renders_module_biblio(auth):
    key = urllib.parse.quote(MODULE_BIBLIO_KEY)
    r = httpx.get(f'{BASE}/api/courses/{COURSE_ID}/resource-article?r2_key={key}', headers=auth, timeout=60)
    r.raise_for_status()
    art = r.json()
    assert art['scope'] == 'module'
    assert art['type'] == 'bibliographie'
    # Title is now the real DOCX title (no longer prefixed with "Bibliographie").
    assert art['title'] and len(art['title']) >= 3
    assert art.get('sections'), 'Article has no content sections'


def test_resource_access_url_signs_module_biblio(auth):
    r = httpx.post(
        f'{BASE}/api/courses/{COURSE_ID}/resource-access-url',
        headers=auth, json={'r2_key': MODULE_BIBLIO_KEY}, timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    assert data.get('url', '').startswith('http')
    assert 'wordprocessingml' in data.get('mime', '')


def test_resource_access_rejects_sibling_course_leak(auth):
    """Files at the parent prefix that aren't `bibliographie_*` must be
    rejected to prevent siblings from leaking content."""
    sibling_key = 'cursus-a-falsafa/02-falsafa/avicenne/script-avicenne-episode1.docx'
    r = httpx.post(
        f'{BASE}/api/courses/{COURSE_ID}/resource-access-url',
        headers=auth, json={'r2_key': sibling_key}, timeout=30,
    )
    # Either 404 (not registered for cours-al-kindi) or 403; never 200.
    assert r.status_code in (403, 404), f'Sibling leak: status={r.status_code}, body={r.text}'


def test_article_preserves_docx_bold_italic_markers(auth):
    """The DOCX parser must wrap bold/italic runs in the inline markers
    \u2999B\u2999…\u2999/B\u2999 / \u2999I\u2999…\u2999/I\u2999 so the
    frontend can render <strong>/<em>. The Falsafa bibliography file is
    known to contain at least one bold heading and one italic citation."""
    key = urllib.parse.quote(MODULE_BIBLIO_KEY)
    r = httpx.get(f'{BASE}/api/courses/{COURSE_ID}/resource-article?r2_key={key}', headers=auth, timeout=60)
    r.raise_for_status()
    art = r.json()
    full_text = ' '.join(p for s in art.get('sections', []) for p in s.get('paragraphs', []))
    assert '\u2999B\u2999' in full_text, 'No bold markers in bibliography article'
    # Markers must always be balanced.
    assert full_text.count('\u2999B\u2999') == full_text.count('\u2999/B\u2999')
    assert full_text.count('\u2999I\u2999') == full_text.count('\u2999/I\u2999')
    # Headings (sec.title) must NOT carry the markers — they're stripped server-side.
    for sec in art.get('sections', []):
        if sec.get('title'):
            assert '\u2999' not in sec['title'], f"Heading carries markers: {sec['title']!r}"
