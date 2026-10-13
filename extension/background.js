// WorksBox Extension Background Service Worker (Manifest V3)
const DEFAULT_SITE_URL = "https://romanf888.github.io/WorksBox";

chrome.runtime.onInstalled.addListener(() => {
  console.log('WorksBox Extension Service Worker Installed');
  syncInBackground();
});

chrome.runtime.onStartup.addListener(() => {
  syncInBackground();
});

chrome.alarms.create('worksbox_bg_sync', { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'worksbox_bg_sync') {
    syncInBackground();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'SYNC_WORKSBOX_SESSION') {
    if (message.session) {
      chrome.storage.local.set({ worksbox_user_session: message.session, worksbox_google_user: message.session });
    }
    if (message.courses && Array.isArray(message.courses)) {
      chrome.storage.local.set({ worksbox_live_courses: message.courses });
    }
    sendResponse({ status: 'ok', time: Date.now() });
  }
  return true;
});

async function syncInBackground() {
  try {
    const response = await fetch(`${DEFAULT_SITE_URL}/api/latest-courses`);
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.courses) && data.courses.length > 0) {
        chrome.storage.local.set({ worksbox_live_courses: data.courses, worksbox_last_bg_sync: Date.now() });
      }
    }
  } catch(e) {
    console.log('Background fetch fallback');
  }
}
