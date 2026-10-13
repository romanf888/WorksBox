// WorksBox Production Grade Extension Script v1.3.2
const DEFAULT_SITE_URL = "https://romanf888.github.io/WorksBox";

// Built-in baseline courses array guaranteed to be available 24/7 offline or without site open
const EMBEDDED_COURSES = [
  {
    id: "sample-bts-cyber-1",
    title: "Sécurisation des accès, cryptographie et analyse de vulnérabilités",
    subject: "BLOC 3 CYBER",
    school: "Lycée Gaspard Monge",
    classe: "BTS SIO 1",
    url: "/?course=sample-bts-cyber-1"
  },
  {
    id: "sample-bts-cejm-1",
    title: "L'intégration de l'entreprise dans son environnement numérique",
    subject: "CEJM",
    school: "Lycée Gaspard Monge",
    classe: "BTS SIO 1",
    url: "/?course=sample-bts-cejm-1"
  },
  {
    id: "sample-term-anglais-1",
    title: "Technical English: Sustainable Technologies & Eco-Design",
    subject: "Anglais",
    school: "Lycée François Bazin",
    classe: "Terminale STI2D",
    url: "/?course=sample-term-anglais-1"
  },
  {
    id: "sample-math-1",
    title: "Suites géométriques, arithmétiques et limites",
    subject: "Mathématiques",
    school: "Lycée François Bazin",
    classe: "Terminale STI2D",
    url: "/?course=sample-math-1"
  },
  {
    id: "sample-math-2",
    title: "Formulaire complet dérivées, primitives et intégrales",
    subject: "Mathématiques",
    school: "Lycée François Bazin",
    classe: "Terminale STI2D",
    url: "/?course=sample-math-2"
  },
  {
    id: "sample-pc-1",
    title: "Premier principe de la thermodynamique et transferts thermiques",
    subject: "Physique Chimie",
    school: "Lycée François Bazin",
    classe: "Terminale STI2D",
    url: "/?course=sample-pc-1"
  },
  {
    id: "sample-sin-1",
    title: "Architecture réseau, adressage IPv4 et trames CAN",
    subject: "SIN",
    school: "Lycée François Bazin",
    classe: "Terminale STI2D",
    url: "/?course=sample-sin-1"
  },
  {
    id: "sample-philo-1",
    title: "La technique, la liberté et la responsabilité humaine",
    subject: "Philosophie",
    school: "Lycée François Bazin",
    classe: "Terminale STI2D",
    url: "/?course=sample-philo-1"
  },
  {
    id: "sample-prem-math-1",
    title: "Polynômes du second degré, discriminant et racines",
    subject: "Mathématiques",
    school: "Lycée François Bazin",
    classe: "Première STI2D",
    url: "/?course=sample-prem-math-1"
  },
  {
    id: "sample-prem-francais-1",
    title: "La littérature d'idées et le combat des Lumières",
    subject: "Français",
    school: "Lycée François Bazin",
    classe: "Première STI2D",
    url: "/?course=sample-prem-francais-1"
  },
  {
    id: "sample-bts-cprp-anglais-1",
    title: "Technical English: Machining Operations & Safety Standards",
    subject: "Anglais",
    school: "Lycée François Bazin",
    classe: "BTS CPRP",
    url: "/?course=sample-bts-cprp-anglais-1"
  }
];

let allCourses = [...EMBEDDED_COURSES];
let activeFilter = 'my-school';
let userSession = {
  displayName: 'Roman Ferriere',
  email: 'romanferriere4@gmail.com',
  photoURL: '',
  isGoogleLoggedIn: true,
  school: 'Lycée François Bazin',
  classe: 'Terminale STI2D'
};

document.addEventListener('DOMContentLoaded', () => {
  initExtension();

  // Settings Panel Toggle
  const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
  const closeConfigBtn = document.getElementById('closeConfigBtn');
  const accountConfigPanel = document.getElementById('accountConfigPanel');

  if (toggleSettingsBtn && accountConfigPanel) {
    toggleSettingsBtn.addEventListener('click', () => {
      accountConfigPanel.classList.toggle('hidden');
      if (!accountConfigPanel.classList.contains('hidden')) {
        populateConfigInputs();
      }
    });
  }

  if (closeConfigBtn && accountConfigPanel) {
    closeConfigBtn.addEventListener('click', () => {
      accountConfigPanel.classList.add('hidden');
    });
  }

  // Save manual config
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', () => {
      saveManualGoogleConfig();
    });
  }

  // Search input handler
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderCourses(filterCourses(e.target.value, activeFilter));
    });
  }

  // Filter chips handler
  setupFilterChips();

  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadCoursesAndSyncSession();
    });
  }

  // Open main site button
  const openSiteBtn = document.getElementById('openSiteBtn');
  if (openSiteBtn) {
    openSiteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openURL(DEFAULT_SITE_URL);
    });
  }
});

async function initExtension() {
  await syncUserSession();
  await loadCoursesAndSyncSession();
}

async function syncUserSession() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['worksbox_user_session', 'worksbox_google_user', 'worksbox_live_courses'], (result) => {
        const savedSession = result.worksbox_user_session || result.worksbox_google_user;
        if (savedSession) {
          userSession = { ...userSession, ...savedSession };
        }
        if (result.worksbox_live_courses && Array.isArray(result.worksbox_live_courses) && result.worksbox_live_courses.length > 0) {
          allCourses = mergeCourses(EMBEDDED_COURSES, result.worksbox_live_courses);
        }

        updateAccountUI();

        inspectActiveTabIfOpen().then(() => {
          updateAccountUI();
          resolve();
        });
      });
    } else {
      updateAccountUI();
      resolve();
    }
  });
}

async function inspectActiveTabIfOpen() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;
  try {
    const tabs = await new Promise(r => chrome.tabs.query({ active: true, currentWindow: true }, r));
    const activeTab = tabs && tabs[0];
    if (activeTab && activeTab.url && (activeTab.url.includes('worksbox') || activeTab.url.includes('github.io') || activeTab.url.includes('run.app') || activeTab.url.includes('localhost'))) {
      if (chrome.scripting) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: () => {
            const rawGoogle = localStorage.getItem('worksbox_google_user');
            const rawLocal = localStorage.getItem('worksbox_local_user');
            return {
              rawGoogle: rawGoogle,
              rawLocal: rawLocal,
              studentName: localStorage.getItem('wb_student_name') || '',
              school: localStorage.getItem('wb_selected_school') || '',
              classe: localStorage.getItem('wb_selected_class') || ''
            };
          }
        });

        if (results && results[0] && results[0].result) {
          const res = results[0].result;
          let gUser = null;
          let lUser = null;
          if (res.rawGoogle) { try { gUser = JSON.parse(res.rawGoogle); } catch(e) {} }
          if (res.rawLocal) { try { lUser = JSON.parse(res.rawLocal); } catch(e) {} }

          if (gUser && (gUser.email || gUser.displayName)) {
            userSession.isGoogleLoggedIn = true;
            userSession.displayName = gUser.displayName || gUser.email?.split('@')[0] || userSession.displayName;
            userSession.email = gUser.email || userSession.email;
            userSession.photoURL = gUser.photoURL || userSession.photoURL;
            userSession.school = res.school || gUser.selectedSchool || userSession.school;
            userSession.classe = res.classe || gUser.selectedClass || userSession.classe;

            if (chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({
                worksbox_user_session: userSession,
                worksbox_google_user: userSession
              });
            }
          } else if (res.school || res.classe) {
            if (res.school) userSession.school = res.school;
            if (res.classe) userSession.classe = res.classe;
            if (chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ worksbox_user_session: userSession });
            }
          }
        }
      }
    }
  } catch(e) {
    console.log('Tab inspection skipped');
  }
}

function populateConfigInputs() {
  const emailInput = document.getElementById('googleEmailInput');
  const nameInput = document.getElementById('googleNameInput');
  const schoolSelect = document.getElementById('googleSchoolSelect');
  const classSelect = document.getElementById('googleClassSelect');

  if (emailInput) emailInput.value = userSession.email || 'romanferriere4@gmail.com';
  if (nameInput) nameInput.value = userSession.displayName || 'Roman Ferriere';
  if (schoolSelect && userSession.school) schoolSelect.value = userSession.school;
  if (classSelect && userSession.classe) classSelect.value = userSession.classe;
}

function saveManualGoogleConfig() {
  const emailInput = document.getElementById('googleEmailInput');
  const nameInput = document.getElementById('googleNameInput');
  const schoolSelect = document.getElementById('googleSchoolSelect');
  const classSelect = document.getElementById('googleClassSelect');

  const email = emailInput ? emailInput.value.trim() : '';
  const name = nameInput ? nameInput.value.trim() : '';
  const school = schoolSelect ? schoolSelect.value : 'Lycée François Bazin';
  const classe = classSelect ? classSelect.value : 'Terminale STI2D';

  userSession.email = email || userSession.email;
  userSession.displayName = name || (email ? email.split('@')[0] : 'Roman Ferriere');
  userSession.school = school;
  userSession.classe = classe;
  userSession.isGoogleLoggedIn = true;

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({
      worksbox_user_session: userSession,
      worksbox_google_user: userSession
    }, () => {
      updateAccountUI();
      const panel = document.getElementById('accountConfigPanel');
      if (panel) panel.classList.add('hidden');
      loadCoursesAndSyncSession();
    });
  } else {
    updateAccountUI();
    const panel = document.getElementById('accountConfigPanel');
    if (panel) panel.classList.add('hidden');
    loadCoursesAndSyncSession();
  }
}

function updateAccountUI() {
  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');
  const schoolClassEl = document.getElementById('userSchoolClass');
  const avatarEl = document.getElementById('userAvatar');
  const statusBadge = document.getElementById('userStatusBadge');

  const displayName = userSession.displayName || (userSession.email ? userSession.email.split('@')[0] : 'Roman Ferriere');
  const email = userSession.email || 'romanferriere4@gmail.com';

  if (nameEl) nameEl.textContent = displayName;
  if (emailEl) emailEl.textContent = email;

  if (statusBadge) {
    statusBadge.textContent = 'G Google Sync';
    statusBadge.className = 'status-indicator';
  }

  if (avatarEl) {
    if (userSession.photoURL) {
      avatarEl.innerHTML = `<img src="${userSession.photoURL}" alt="Google Avatar" />`;
    } else {
      const initial = (displayName[0] || 'G').toUpperCase();
      avatarEl.textContent = initial;
    }
  }

  const school = userSession.school || 'Lycée François Bazin';
  const classe = userSession.classe ? ` · ${userSession.classe}` : '';
  if (schoolClassEl) schoolClassEl.textContent = `${school}${classe}`;

  const mySchoolChip = document.querySelector('[data-filter="my-school"]');
  if (mySchoolChip) {
    const shortSchool = school.replace('Lycée ', '');
    mySchoolChip.textContent = shortSchool || 'Mon Lycée';
  }
}

function setupFilterChips() {
  const container = document.getElementById('filterChipsContainer');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.seg-btn');
    if (!chip) return;

    document.querySelectorAll('.seg-btn').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.getAttribute('data-filter');

    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value : '';
    renderCourses(filterCourses(query, activeFilter));
  });
}

async function loadCoursesAndSyncSession() {
  const courseList = document.getElementById('courseList');
  if (courseList) {
    courseList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Chargement des cours...</span>
      </div>
    `;
  }

  // 1. Load from extension storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await new Promise((resolve) => {
      chrome.storage.local.get(['worksbox_live_courses'], (res) => {
        if (res && res.worksbox_live_courses && Array.isArray(res.worksbox_live_courses) && res.worksbox_live_courses.length > 0) {
          allCourses = mergeCourses(EMBEDDED_COURSES, res.worksbox_live_courses);
        }
        resolve();
      });
    });
  }

  // 2. Fetch static JSON courses from GitHub Pages / Site
  try {
    const res = await fetch(`${DEFAULT_SITE_URL}/courses.json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        allCourses = mergeCourses(allCourses, data);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ worksbox_live_courses: allCourses });
        }
      }
    }
  } catch(e) {
    console.log('Mode autonomie : utilisation du jeu de cours permanent');
  }

  setTimeout(() => {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value : '';
    renderCourses(filterCourses(query, activeFilter));
  }, 100);
}

function mergeCourses(baseList, newList) {
  const map = new Map();
  [...baseList, ...newList].forEach(c => {
    if (c && c.id) {
      map.set(c.id, {
        id: c.id,
        title: c.title || 'Sans titre',
        subject: c.subject || 'Général',
        classe: c.classe || 'Toutes classes',
        school: c.school || 'Lycée François Bazin',
        date: c.date || new Date().toISOString().split('T')[0],
        tag: c.tag || c.type || 'Cours',
        url: c.url || `/?course=${encodeURIComponent(c.id)}`
      });
    }
  });
  return Array.from(map.values());
}

function filterCourses(query, filter) {
  let filtered = allCourses.filter(c => {
    const matchesQuery = !query || 
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subject.toLowerCase().includes(query.toLowerCase()) ||
      c.classe.toLowerCase().includes(query.toLowerCase()) ||
      c.school.toLowerCase().includes(query.toLowerCase());

    if (!matchesQuery) return false;

    if (filter === 'my-school') {
      if (!userSession.school) return true;
      const userSchoolNorm = userSession.school.toLowerCase().replace('lycée ', '').trim();
      const courseSchoolNorm = c.school.toLowerCase().replace('lycée ', '').trim();
      return courseSchoolNorm.includes(userSchoolNorm) || userSchoolNorm.includes(courseSchoolNorm) || c.school === 'WorksBox System';
    }

    if (filter === 'sio') return c.classe.toLowerCase().includes('sio') || c.subject.toLowerCase().includes('cyber') || c.subject.toLowerCase().includes('eco');
    if (filter === 'sti2d') return c.classe.toLowerCase().includes('sti2d');
    if (filter === 'maths') return c.subject.toLowerCase().includes('math');

    return true;
  });

  // Smart Fallback: if 'my-school' filter returns 0 courses, return all courses so user NEVER sees empty screen
  if (filter === 'my-school' && filtered.length === 0) {
    return allCourses.filter(c => {
      return !query || 
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.subject.toLowerCase().includes(query.toLowerCase()) ||
        c.classe.toLowerCase().includes(query.toLowerCase()) ||
        c.school.toLowerCase().includes(query.toLowerCase());
    });
  }

  return filtered;
}

function renderCourses(courses) {
  const courseList = document.getElementById('courseList');
  if (!courseList) return;

  if (courses.length === 0) {
    courseList.innerHTML = `
      <div class="empty-state">
        <p>Aucun cours disponible.</p>
        <button class="primary-btn" onclick="openURL('${DEFAULT_SITE_URL}')">
          Ouvrir WorksBox sur GitHub Pages
        </button>
      </div>
    `;
    return;
  }

  courseList.innerHTML = courses.map(c => {
    const courseRelativeUrl = c.url.startsWith('/') ? c.url : `/${c.url}`;
    const fullCourseURL = `${DEFAULT_SITE_URL}${courseRelativeUrl}`;

    return `
      <div class="course-card" data-url="${fullCourseURL}">
        <h2 class="card-title">${escapeHTML(c.title)}</h2>
        
        <div class="card-unboxed-meta">
          <span class="meta-subject">${escapeHTML(c.subject)}</span>
          <span class="meta-dot">·</span>
          <span>${escapeHTML(c.classe)}</span>
        </div>

        <div class="card-footer-row">
          <span class="meta-school">${escapeHTML(c.school)}</span>
          <button class="open-btn" data-url="${fullCourseURL}">
            <span>Ouvrir</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.open-btn, .course-card').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = item.getAttribute('data-url') || item.querySelector('.open-btn')?.getAttribute('data-url');
      if (url) {
        openURL(url);
      }
    });
  });
}

function openURL(url) {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: url });
  } else {
    window.open(url, '_blank');
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}
