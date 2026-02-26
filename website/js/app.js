// Sijill Project - Website JavaScript

// ─── Configuration ─────────────────────────────────────────────────────────
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
  // Mark current page as active
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (currentPath.endsWith(href) || (href === '/' && currentPath.endsWith('/site/'))) {
      link.classList.add('active');
    }
  });
}

function toggleNav() {
  const nav = document.getElementById('main-nav');
  if (nav) nav.classList.toggle('active');
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
      logout(false);
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
}

function updateAuthUI(user) {
  const authBtn = document.getElementById('auth-btn');
  const subscribeBtn = document.getElementById('subscribe-btn');
  
  if (user) {
    if (authBtn) {
      authBtn.innerHTML = `<i class="fas fa-user-check" style="color: var(--brand-primary);"></i>`;
      authBtn.onclick = () => showProfileInfo();
    }
    if (subscribeBtn && user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      if (endDate > new Date()) {
        subscribeBtn.textContent = 'Mon compte';
        subscribeBtn.href = '#';
        subscribeBtn.onclick = (e) => { e.preventDefault(); showProfileInfo(); };
      }
    }
  }
}

function showProfileInfo() {
  if (!currentUser) return;
  const endDate = currentUser.subscription_end_date 
    ? new Date(currentUser.subscription_end_date).toLocaleDateString('fr-FR')
    : 'Non abonné';
  alert(`Connecté en tant que: ${currentUser.name || currentUser.email}\nAbonnement jusqu'au: ${endDate}\n\nCliquez sur le bouton de déconnexion pour vous déconnecter.`);
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
    
    updateAuthUI(currentUser);
    hideModal();
    window.location.reload();
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
    
    updateAuthUI(currentUser);
    hideModal();
    window.location.href = window.location.pathname.includes('/pages/') 
      ? 'abonnement.html' 
      : 'pages/abonnement.html';
  } catch (error) {
    showError(error.message);
  }
}

function logout(redirect = true) {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('auth_token');
  if (redirect) window.location.reload();
}

async function loginWithGoogle() {
  const redirectUrl = window.location.origin + '/api/site/auth-callback.html';
  const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  window.location.href = authUrl;
}

async function loginWithApple() {
  try {
    const response = await fetch(`${API_URL}/auth/apple/login`);
    if (!response.ok) throw new Error('Apple Sign-In non disponible');
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
    const title = document.getElementById('modal-title');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchText = document.getElementById('modal-switch');
    if (title) title.textContent = 'Connexion';
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (switchText) switchText.innerHTML = 'Pas encore de compte ? <a href="#" onclick="showRegisterModal(); return false;">S\'inscrire</a>';
  }
}

function showRegisterModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('active');
    const title = document.getElementById('modal-title');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchText = document.getElementById('modal-switch');
    if (title) title.textContent = 'Inscription';
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (switchText) switchText.innerHTML = 'Déjà un compte ? <a href="#" onclick="showLoginModal(); return false;">Se connecter</a>';
  }
}

function hideModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('active');
}

function showError(message) {
  const errorEl = document.getElementById('form-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    errorEl.style.background = 'rgba(220, 53, 69, 0.1)';
    errorEl.style.border = '1px solid #dc3545';
    errorEl.style.color = '#dc3545';
    errorEl.style.padding = '12px';
    errorEl.style.marginBottom = '16px';
    setTimeout(() => { errorEl.style.display = 'none'; }, 5000);
  } else {
    alert(message);
  }
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
  }
}

async function loadHomePage() {
  try {
    const homeData = await fetch(`${API_URL}/home`).then(r => r.json());
    
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
    const cursus = await fetch(`${API_URL}/cursus`).then(r => r.json());
    renderCursusGrid(cursus);
  } catch (error) {
    console.error('Failed to load cursus:', error);
  }
}

// ─── Rendering Functions ───────────────────────────────────────────────────
const CURSUS_COLORS = {
  'cursus-falsafa': { color: '#04D182', letter: 'A' },
  'cursus-kalam': { color: '#8B5CF6', letter: 'B' },
  'cursus-sciences-islamiques': { color: '#F59E0B', letter: 'C' },
  'cursus-arts': { color: '#EC4899', letter: 'D' },
  'cursus-philosophies': { color: '#06B6D4', letter: 'E' }
};

function getCursusStyle(cursusId) {
  return CURSUS_COLORS[cursusId] || { color: '#04D182', letter: cursusId?.charAt(0)?.toUpperCase() || '?' };
}

function renderHighlight(highlight) {
  const container = document.getElementById('highlight-container');
  if (!container || !highlight) return;
  
  const course = highlight.course;
  const professor = highlight.professor;
  const style = getCursusStyle(course?.cursus_id);
  
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: auto 1fr; gap: var(--spacing-xl); align-items: start; background: var(--bg-card); border-left: 2px solid ${style.color}; padding: var(--spacing-xl);">
      <div style="width: 100px; height: 100px; border: 1px solid ${style.color}; display: flex; align-items: center; justify-content: center;">
        <span style="font-family: var(--font-display); font-size: 2.5rem; color: ${style.color};">${style.letter}</span>
      </div>
      <div>
        <span style="font-family: var(--font-display); font-size: 0.6rem; letter-spacing: 0.2em; color: var(--brand-gold); text-transform: uppercase;">À la une</span>
        <h2 style="font-size: 1.25rem; margin: 8px 0; color: var(--text-primary);">${course?.title || 'Cours mis en avant'}</h2>
        <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md); line-height: 1.6;">${course?.description?.substring(0, 200) || ''}...</p>
        ${professor ? `
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--spacing-md);">
            <span style="font-size: 0.9rem; color: var(--text-secondary);">Par <strong style="color: var(--text-primary);">${professor.name}</strong></span>
          </div>
        ` : ''}
        <a href="#" onclick="requireAuth('pages/abonnement.html'); return false;" class="btn btn-primary" style="display: inline-flex;">Écouter ce cours</a>
      </div>
    </div>
  `;
}

function renderCursusList(cursusList) {
  const container = document.getElementById('cursus-list');
  if (!container) return;
  
  container.innerHTML = cursusList.map(cursus => {
    const style = getCursusStyle(cursus.id);
    return `
      <a href="pages/cursus.html" class="card" style="border-left-color: ${style.color};">
        <div class="card-content" style="display: flex; align-items: center; gap: var(--spacing-md);">
          <div class="cursus-letter" style="color: ${style.color}; border-color: ${style.color};">${style.letter}</div>
          <div>
            <h3 class="card-title">${cursus.name}</h3>
            <p class="card-description" style="font-size: 0.9rem; margin: 0;">${cursus.description?.substring(0, 100) || ''}...</p>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function renderCursusGrid(cursusList) {
  const container = document.getElementById('cursus-grid');
  if (!container) return;
  
  container.innerHTML = cursusList.map(cursus => {
    const style = getCursusStyle(cursus.id);
    return `
      <div class="card" style="border-left-color: ${style.color}; cursor: pointer;" onclick="requireAuth('abonnement.html')">
        <div class="card-content">
          <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
            <div class="cursus-letter" style="color: ${style.color}; border-color: ${style.color};">${style.letter}</div>
            <span style="font-family: var(--font-display); font-size: 0.6rem; letter-spacing: 0.15em; color: ${style.color}; text-transform: uppercase;">Cursus</span>
          </div>
          <h3 class="card-title">${cursus.name}</h3>
          <p class="card-description">${cursus.description || ''}</p>
        </div>
        <div class="card-footer">
          <span class="card-stat"><i class="fas fa-book"></i> ${cursus.course_count || 0} cours</span>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Utility Functions ─────────────────────────────────────────────────────
function requireAuth(redirectTo) {
  if (!currentUser) {
    showLoginModal();
    return false;
  }
  
  // Check subscription
  if (!currentUser.subscription_end_date || new Date(currentUser.subscription_end_date) < new Date()) {
    const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';
    window.location.href = basePath + 'abonnement.html';
    return false;
  }
  
  // Has valid subscription - allow access
  if (redirectTo) {
    const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';
    window.location.href = basePath + redirectTo;
  }
  return true;
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
