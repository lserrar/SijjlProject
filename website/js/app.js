// Sijill Project - Website JavaScript

// ─── Configuration ─────────────────────────────────────────────────────────
// IMPORTANT: Change this to your production API URL when deploying
const API_URL = 'https://quranic-studies-2.preview.emergentagent.com/api';

// ─── State ─────────────────────────────────────────────────────────────────
let currentUser = null;
let authToken = localStorage.getItem('auth_token');

// ─── Initialization ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  checkAuth();
  loadPageContent();
});

// ─── Navigation ────────────────────────────────────────────────────────────
function initNavigation() {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      nav.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });
  }
  
  // Close menu on link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav?.classList.remove('active');
      menuToggle?.classList.remove('active');
    });
  });
  
  // Mark current page as active
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
}

// ─── Authentication ────────────────────────────────────────────────────────
async function checkAuth() {
  if (!authToken) {
    updateAuthUI(null);
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      currentUser = await response.json();
      updateAuthUI(currentUser);
    } else {
      logout();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    logout();
  }
}

function updateAuthUI(user) {
  const authBtn = document.getElementById('auth-btn');
  const subscribeBtn = document.getElementById('subscribe-btn');
  
  if (user) {
    if (authBtn) {
      authBtn.innerHTML = `<i class="fas fa-user"></i>`;
      authBtn.onclick = () => window.location.href = '/pages/profil.html';
    }
    if (subscribeBtn && user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      if (endDate > new Date()) {
        subscribeBtn.textContent = 'Mon compte';
        subscribeBtn.onclick = () => window.location.href = '/pages/profil.html';
      }
    }
  } else {
    if (authBtn) {
      authBtn.innerHTML = `<i class="fas fa-user"></i>`;
      authBtn.onclick = showLoginModal;
    }
  }
}

async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Connexion échouée');
    }
    
    const data = await response.json();
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('auth_user', JSON.stringify(currentUser));
    
    updateAuthUI(currentUser);
    hideModal();
    
    // Redirect based on subscription status
    if (currentUser.subscription_end_date && new Date(currentUser.subscription_end_date) > new Date()) {
      window.location.reload();
    } else {
      window.location.href = '/pages/abonnement.html';
    }
  } catch (error) {
    showError(error.message);
  }
}

async function register(name, email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Inscription échouée');
    }
    
    const data = await response.json();
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('auth_user', JSON.stringify(currentUser));
    
    updateAuthUI(currentUser);
    hideModal();
    window.location.href = '/pages/abonnement.html';
  } catch (error) {
    showError(error.message);
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  updateAuthUI(null);
  window.location.href = '/';
}

async function loginWithGoogle() {
  const redirectUrl = window.location.origin + '/auth-callback.html';
  const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  window.location.href = authUrl;
}

async function loginWithApple() {
  try {
    const response = await fetch(`${API_URL}/auth/apple/login`);
    if (!response.ok) {
      throw new Error('Apple Sign-In non disponible');
    }
    const { auth_url } = await response.json();
    window.location.href = auth_url;
  } catch (error) {
    showError(error.message);
  }
}

// ─── Modal Management ──────────────────────────────────────────────────────
function showLoginModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('modal-title').textContent = 'Connexion';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('modal-switch').innerHTML = 'Pas encore de compte ? <a href="#" onclick="showRegisterModal(); return false;">S\'inscrire</a>';
  }
}

function showRegisterModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('modal-title').textContent = 'Inscription';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('modal-switch').innerHTML = 'Déjà un compte ? <a href="#" onclick="showLoginModal(); return false;">Se connecter</a>';
  }
}

function hideModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function showError(message) {
  const errorEl = document.getElementById('form-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => { errorEl.style.display = 'none'; }, 5000);
  } else {
    alert(message);
  }
}

// ─── API Helpers ───────────────────────────────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

// ─── Data Loading ──────────────────────────────────────────────────────────
async function loadPageContent() {
  const page = document.body.dataset.page;
  
  switch (page) {
    case 'home':
      await loadHomePage();
      break;
    case 'cursus':
      await loadCursusPage();
      break;
    case 'cursus-detail':
      await loadCursusDetail();
      break;
    case 'cours-detail':
      await loadCoursDetail();
      break;
  }
}

async function loadHomePage() {
  try {
    // Load highlight and cursus
    const homeData = await apiRequest('/home');
    
    // Render highlight
    if (homeData.highlight) {
      renderHighlight(homeData.highlight);
    }
    
    // Render cursus list
    if (homeData.cursus) {
      renderCursusList(homeData.cursus);
    }
  } catch (error) {
    console.error('Failed to load home page:', error);
  }
}

async function loadCursusPage() {
  try {
    const cursus = await apiRequest('/cursus');
    renderCursusGrid(cursus);
  } catch (error) {
    console.error('Failed to load cursus:', error);
  }
}

async function loadCursusDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const cursusId = urlParams.get('id');
  
  if (!cursusId) {
    window.location.href = '/pages/cursus.html';
    return;
  }
  
  try {
    const cursus = await apiRequest(`/cursus/${cursusId}`);
    renderCursusDetail(cursus);
  } catch (error) {
    console.error('Failed to load cursus detail:', error);
  }
}

async function loadCoursDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const coursId = urlParams.get('id');
  
  if (!coursId) {
    window.location.href = '/pages/cursus.html';
    return;
  }
  
  try {
    const cours = await apiRequest(`/courses/${coursId}`);
    renderCoursDetail(cours);
  } catch (error) {
    console.error('Failed to load course detail:', error);
  }
}

// ─── Rendering Functions ───────────────────────────────────────────────────
function renderHighlight(highlight) {
  const container = document.getElementById('highlight-container');
  if (!container || !highlight) return;
  
  const course = highlight.course;
  const professor = highlight.professor;
  
  container.innerHTML = `
    <div class="highlight-card">
      <div class="highlight-image">
        <img src="${professor?.image_url || '/images/placeholder.jpg'}" alt="${professor?.name || 'Professeur'}">
      </div>
      <div class="highlight-content">
        <span class="highlight-badge">À la une</span>
        <h2 class="highlight-title">${course?.title || 'Cours mis en avant'}</h2>
        <p class="highlight-description">${course?.description || ''}</p>
        <div class="professor-card" style="margin-bottom: var(--spacing-lg);">
          <div class="professor-avatar">
            <img src="${professor?.image_url || '/images/avatar.jpg'}" alt="${professor?.name}">
          </div>
          <div class="professor-info">
            <h4>${professor?.name || 'Professeur'}</h4>
            <p>${professor?.title || ''}</p>
          </div>
        </div>
        <a href="/pages/cours.html?id=${course?.course_id}" class="btn btn-primary">Découvrir ce cours</a>
      </div>
    </div>
  `;
}

function renderCursusList(cursusList) {
  const container = document.getElementById('cursus-list');
  if (!container) return;
  
  container.innerHTML = cursusList.map(cursus => `
    <a href="/pages/cursus-detail.html?id=${cursus.id}" class="card">
      <div class="card-content" style="display: flex; align-items: center; gap: var(--spacing-md);">
        <div class="cursus-letter">${cursus.letter || cursus.id?.charAt(0)?.toUpperCase()}</div>
        <div>
          <h3 class="card-title">${cursus.name}</h3>
          <p class="card-description" style="font-size: 0.9rem; margin: 0;">${cursus.description || ''}</p>
        </div>
      </div>
    </a>
  `).join('');
}

function renderCursusGrid(cursusList) {
  const container = document.getElementById('cursus-grid');
  if (!container) return;
  
  container.innerHTML = cursusList.map(cursus => `
    <a href="/pages/cursus-detail.html?id=${cursus.id}" class="card">
      <div class="card-image" style="display: flex; align-items: center; justify-content: center;">
        <span class="cursus-letter" style="width: 80px; height: 80px; font-size: 2.5rem;">${cursus.letter || cursus.id?.charAt(0)?.toUpperCase()}</span>
      </div>
      <div class="card-content">
        <h3 class="card-title">${cursus.name}</h3>
        <p class="card-description">${cursus.description || ''}</p>
      </div>
      <div class="card-footer">
        <span class="card-stat"><i class="fas fa-book"></i> ${cursus.course_count || 0} cours</span>
      </div>
    </a>
  `).join('');
}

function renderCursusDetail(cursus) {
  // Update page title
  document.getElementById('cursus-title')?.textContent && (document.getElementById('cursus-title').textContent = cursus.name);
  document.getElementById('cursus-description')?.textContent && (document.getElementById('cursus-description').textContent = cursus.description || '');
  document.getElementById('cursus-letter')?.textContent && (document.getElementById('cursus-letter').textContent = cursus.letter);
  
  // Render courses
  const container = document.getElementById('courses-list');
  if (!container || !cursus.courses) return;
  
  container.innerHTML = cursus.courses.map(course => `
    <a href="/pages/cours.html?id=${course.course_id}" class="card">
      <div class="card-content">
        <span class="card-meta">Module ${course.module_number || ''}</span>
        <h3 class="card-title">${course.title}</h3>
        <p class="card-description">${course.description || ''}</p>
      </div>
      <div class="card-footer">
        <span class="card-stat"><i class="fas fa-headphones"></i> ${course.audio_count || 0} épisodes</span>
        <span class="card-stat"><i class="fas fa-clock"></i> ${course.total_duration || '0h'}</span>
      </div>
    </a>
  `).join('');
}

function renderCoursDetail(cours) {
  document.getElementById('cours-title')?.textContent && (document.getElementById('cours-title').textContent = cours.title);
  document.getElementById('cours-description')?.textContent && (document.getElementById('cours-description').textContent = cours.description || '');
  
  // Professor info
  if (cours.professor) {
    const profContainer = document.getElementById('professor-info');
    if (profContainer) {
      profContainer.innerHTML = `
        <div class="professor-card">
          <div class="professor-avatar">
            <img src="${cours.professor.image_url || '/images/avatar.jpg'}" alt="${cours.professor.name}">
          </div>
          <div class="professor-info">
            <h4>${cours.professor.name}</h4>
            <p>${cours.professor.title || ''}</p>
          </div>
        </div>
      `;
    }
  }
  
  // Audio episodes
  const audioContainer = document.getElementById('audio-list');
  if (audioContainer && cours.audios) {
    audioContainer.innerHTML = cours.audios.map((audio, index) => `
      <div class="audio-item" data-audio-id="${audio.audio_id}">
        <span class="audio-number">${String(index + 1).padStart(2, '0')}</span>
        <button class="audio-play" onclick="playAudio('${audio.audio_id}')">
          <i class="fas fa-play"></i>
        </button>
        <div class="audio-info">
          <div class="audio-title">${audio.title}</div>
          <div class="audio-duration">${formatDuration(audio.duration)}</div>
        </div>
      </div>
    `).join('');
  }
}

// ─── Utility Functions ─────────────────────────────────────────────────────
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function playAudio(audioId) {
  if (!currentUser) {
    showLoginModal();
    return;
  }
  
  // Check subscription
  if (!currentUser.subscription_end_date || new Date(currentUser.subscription_end_date) < new Date()) {
    window.location.href = '/pages/abonnement.html';
    return;
  }
  
  // Navigate to audio player or play inline
  window.location.href = `/pages/audio.html?id=${audioId}`;
}

// ─── Form Handlers ─────────────────────────────────────────────────────────
function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  login(email, password);
}

function handleRegisterSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  register(name, email, password);
}
