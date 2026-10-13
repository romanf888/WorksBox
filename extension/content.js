// WorksBox Content Script - Automatic Google Account & Permanent Sync
const TARGET_GITHUB_PAGES_URL = "https://romanf888.github.io/WorksBox";

(function() {
  function getGoogleAndSessionData() {
    try {
      const rawGoogleUser = localStorage.getItem('worksbox_google_user');
      const rawLocalUser = localStorage.getItem('worksbox_local_user');
      const studentName = localStorage.getItem('wb_student_name') || '';
      const selectedSchool = localStorage.getItem('wb_selected_school') || '';
      const selectedClass = localStorage.getItem('wb_selected_class') || '';
      const rawCourses = localStorage.getItem('wb_courses_offline_cache');

      let googleUser = null;
      let localUser = null;

      if (rawGoogleUser) {
        try { googleUser = JSON.parse(rawGoogleUser); } catch(e) {}
      }
      if (rawLocalUser) {
        try { localUser = JSON.parse(rawLocalUser); } catch(e) {}
      }

      const email = googleUser?.email || localUser?.email || '';
      const displayName = googleUser?.displayName || (email ? email.split('@')[0] : null) || localUser?.name || studentName || '';
      const photoURL = googleUser?.photoURL || localUser?.photoURL || '';
      const isGoogleLoggedIn = Boolean(email || googleUser?.uid || googleUser?.displayName);

      const sessionData = {
        displayName: displayName || 'Compte Google WorksBox',
        email: email || '',
        photoURL: photoURL || '',
        isGoogleLoggedIn: isGoogleLoggedIn,
        school: selectedSchool || googleUser?.selectedSchool || localUser?.selectedSchool || 'Lycée François Bazin',
        classe: selectedClass || googleUser?.selectedClass || localUser?.selectedClass || 'Terminale STI2D',
        lastSynced: Date.now()
      };

      let liveCourses = [];
      if (rawCourses) {
        try {
          const parsed = JSON.parse(rawCourses);
          if (Array.isArray(parsed)) liveCourses = parsed;
        } catch(e) {}
      }

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          worksbox_site_url: TARGET_GITHUB_PAGES_URL,
          worksbox_user_session: sessionData,
          worksbox_google_user: sessionData,
          worksbox_live_courses: liveCourses,
          worksbox_last_sync: Date.now()
        });
      }

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'SYNC_WORKSBOX_SESSION',
          session: sessionData,
          courses: liveCourses,
          siteUrl: TARGET_GITHUB_PAGES_URL
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('WorksBox Content Script sync error:', e);
    }
  }

  getGoogleAndSessionData();

  window.addEventListener('storage', getGoogleAndSessionData);
  window.addEventListener('focus', getGoogleAndSessionData);

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'WORKSBOX_EXT_SYNC') {
      getGoogleAndSessionData();
    }
  });

  setInterval(getGoogleAndSessionData, 3000);
})();
