const API_BASE = window.location.origin + '/api';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('sijill_token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function getCursus() {
  return apiFetch('/cursus');
}

export async function getCourses(cursusId) {
  return apiFetch(`/courses?cursus_id=${cursusId}`);
}

export async function getAllCourses() {
  return apiFetch('/courses');
}

export async function getCatalogue() {
  return apiFetch('/catalogue');
}

export async function getCourseDetail(courseId) {
  return apiFetch(`/courses/${courseId}`);
}

export async function getModules(courseId) {
  return apiFetch(`/modules?course_id=${courseId}`);
}

export async function getCoursePlaylist(courseId) {
  return apiFetch(`/courses/${courseId}/playlist`);
}

export async function getAudios(courseId) {
  return apiFetch(`/audios?course_id=${courseId}`);
}

export async function getAudioDetail(audioId) {
  return apiFetch(`/audios/${audioId}`);
}

export async function getAudioStreamUrl(audioId) {
  return apiFetch(`/audios/${audioId}/stream-url`);
}

export async function getAudioTranscript(audioId) {
  return apiFetch(`/audios/${audioId}/transcript`);
}

export async function getContextResources(cursusId) {
  return apiFetch(`/resources/context/cursus/${cursusId}`);
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Identifiants incorrects');
  }
  return res.json();
}

export async function register(name, email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Erreur lors de l'inscription");
  }
  return res.json();
}

export async function getBibliographies(courseId) {
  return apiFetch(`/bibliographies${courseId ? `?course_id=${courseId}` : ''}`);
}

export async function getCourseResources(courseId) {
  return apiFetch(`/courses/${courseId}/resources`);
}

export async function getResourceAccessUrl(courseId, r2_key) {
  return apiFetch(`/courses/${courseId}/resource-access-url`, {
    method: 'POST',
    body: JSON.stringify({ r2_key }),
  });
}

export async function getEpisodeAudioAccessUrl(audioId) {
  return apiFetch(`/audios/${audioId}/audio-access-url`);
}

export async function getCourseResourceArticle(courseId, r2_key) {
  return apiFetch(`/courses/${courseId}/resource-article?r2_key=${encodeURIComponent(r2_key)}`);
}

export async function getTimelineHtml(cursusLetter) {
  const res = await fetch(`${API_BASE}/timeline/${cursusLetter}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('sijill_token') || ''}` },
  });
  return res.text();
}

export async function getResourceContent(resourceId) {
  return apiFetch(`/resources/context/${resourceId}`);
}

export async function getMe() {
  return apiFetch('/auth/me');
}

export async function preregister(prenom, email) {
  const res = await fetch(`${API_BASE}/preregistration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prenom, email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Erreur lors de la pré-inscription");
  }
  return res.json();
}

export async function getPreregistrationCount() {
  return apiFetch('/preregistration/count');
}

export async function getAdminPreregistrations() {
  return apiFetch('/admin/preregistrations');
}

export async function getAdminStats() {
  return apiFetch('/admin/stats');
}
