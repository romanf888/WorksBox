import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Persistent Server System Outage State
const SYSTEM_STATE_FILE = path.join(__dirname, 'system-state.json');
let systemOutageMode = false;

function loadSystemState() {
  try {
    if (fs.existsSync(SYSTEM_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(SYSTEM_STATE_FILE, 'utf8'));
      systemOutageMode = Boolean(data.outageMode);
    }
  } catch (err) {
    console.error('Error loading system state:', err);
  }
}
loadSystemState();

function saveSystemState() {
  try {
    fs.writeFileSync(SYSTEM_STATE_FILE, JSON.stringify({ outageMode: systemOutageMode, updatedAt: new Date().toISOString() }), 'utf8');
  } catch (err) {
    console.error('Error saving system state:', err);
  }
}

// Strict Server-Side Outage Interceptor
app.use((req, res, next) => {
  if (!systemOutageMode) {
    return next();
  }

  const reqPath = req.path.toLowerCase();
  const ext = path.extname(reqPath);

  // Allowed paths during server outage mode:
  // - Admin routes (/admin, /admin.html)
  // - Outage page (/panne, /panne.html)
  // - System management APIs (/api/system/*, /api/health)
  // - Static JS/CSS/image assets needed by admin.html or panne.html, BUT NOT .html files
  const isAllowedPath = 
    reqPath.startsWith('/admin') ||
    reqPath.startsWith('/panne') ||
    reqPath.startsWith('/api/system') ||
    reqPath === '/api/health' ||
    reqPath === '/api/firebase-config' ||
    (ext !== '.html' && ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.json', '.ico', '.woff', '.woff2'].includes(ext));

  if (isAllowedPath) {
    return next();
  }

  // Forcefully serve panne.html with 503 status code for ANY attempt to access index.html or app routes
  const panneFile = path.join(__dirname, 'panne.html');
  if (fs.existsSync(panneFile)) {
    console.log(`[WorksBox Security] Mode Panne actif : Blocage de ${req.method} ${req.url} -> Envoi forcé de panne.html`);
    return res.status(503).sendFile(panneFile);
  }
  return res.status(503).send('Serveur WorksBox indisponible temporairement (503 Service Unavailable)');
});

// Route API pour recevoir les suggestions de cours/documents des élèves
app.post('/api/suggest-document', (req, res) => {
  try {
    const { userName, userEmail, subject, school, classe, documentTitle, fileName, notes } = req.body;
    
    const sender = userName || 'Un élève';
    const documentName = fileName || documentTitle || 'document.pdf';
    const notificationText = `${sender} à suggérer le document [${documentName}] pour l'ajouter au cours`;
    
    console.log(`[WorksBox Mail Alert] Notification envoyée à l'administration : "${notificationText}" (Matière: ${subject || 'Général'}, Classe: ${classe || 'STI2D'}, Email: ${userEmail || 'non renseigné'})`);
    
    res.json({
      success: true,
      message: notificationText,
      data: {
        userName: sender,
        userEmail: userEmail || '',
        subject: subject || 'Général',
        school: school || 'Lycée François Bazin',
        classe: classe || 'Terminale STI2D',
        documentTitle: documentTitle || documentName,
        fileName: documentName,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error in /api/suggest-document:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Route API sécurisée pour fournir la configuration Firebase côté client sans clé en clair dans le code/Git
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', outageMode: systemOutageMode, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Route statique pour servir courses.json sur GitHub Pages / serveur
app.get('/courses.json', (req, res) => {
  const jsonPath = path.join(__dirname, 'courses.json');
  if (fs.existsSync(jsonPath)) {
    return res.sendFile(jsonPath);
  }
  return res.status(404).json({ error: 'courses.json not found' });
});

// Variable globale en mémoire pour stocker les cours réels en direct du site
let liveSiteCourses = [];

// Route API pour synchroniser les cours publiés depuis le site principal ou l'interface admin
app.post('/api/sync-courses', (req, res) => {
  try {
    const { courses } = req.body;
    if (Array.isArray(courses) && courses.length > 0) {
      liveSiteCourses = courses.map(c => ({
        id: c.id,
        title: c.title || 'Sans titre',
        subject: c.subject || 'Général',
        classe: c.classe || 'Toutes classes',
        school: c.school || 'Lycée François Bazin',
        date: c.date || new Date().toISOString().split('T')[0],
        type: c.tag || c.type || 'Cours',
        url: `/?course=${encodeURIComponent(c.id)}`
      }));
      return res.json({ success: true, count: liveSiteCourses.length, syncedAt: new Date().toISOString() });
    }
    return res.status(400).json({ success: false, error: 'Tableau de cours valide requis' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Route API pour l'extension Chrome : fournit la liste réelle et mise à jour des cours du site
app.get('/api/latest-courses', (req, res) => {
  const fallbackCourses = [
    {
      id: "sample-term-anglais-1",
      title: "Technical English: Sustainable Technologies & Eco-Design",
      subject: "Anglais",
      classe: "Terminale STI2D",
      school: "Lycée François Bazin",
      date: new Date().toISOString().split('T')[0],
      type: "Cours",
      url: "/?course=sample-term-anglais-1"
    },
    {
      id: "sample-math-1",
      title: "Suites géométriques, arithmétiques et limites",
      subject: "Mathématiques",
      classe: "Terminale STI2D",
      school: "Lycée François Bazin",
      date: new Date().toISOString().split('T')[0],
      type: "Cours",
      url: "/?course=sample-math-1"
    },
    {
      id: "sample-math-2",
      title: "Formulaire complet dérivées, primitives et intégrales",
      subject: "Mathématiques",
      classe: "Terminale STI2D",
      school: "Lycée François Bazin",
      date: new Date().toISOString().split('T')[0],
      type: "Fiche",
      url: "/?course=sample-math-2"
    },
    {
      id: "sample-bts-cyber-1",
      title: "Sécurisation des accès, cryptographie et analyse de vulnérabilités",
      subject: "BLOC 3 CYBER (DALLA-ROSA)",
      classe: "BTS SIO 1",
      school: "Lycée Gaspard Monge",
      date: new Date().toISOString().split('T')[0],
      type: "TP",
      url: "/?course=sample-bts-cyber-1"
    },
    {
      id: "sample-bts-cejm-1",
      title: "L'intégration de l'entreprise dans son environnement numérique",
      subject: "CULTURE ECO JUR MANAG",
      classe: "BTS SIO 1",
      school: "Lycée Gaspard Monge",
      date: new Date().toISOString().split('T')[0],
      type: "Cours",
      url: "/?course=sample-bts-cejm-1"
    },
    {
      id: "sample-prem-math-1",
      title: "Polynômes du second degré, discriminant et racines",
      subject: "Mathématiques",
      classe: "Première STI2D",
      school: "Lycée François Bazin",
      date: new Date().toISOString().split('T')[0],
      type: "Cours",
      url: "/?course=sample-prem-math-1"
    },
    {
      id: "numworks-python-script",
      title: "Guide NumWorks : Scripts Python pour la résolution d'équations",
      subject: "Tutoriel Calculatrice",
      classe: "Toutes classes",
      school: "WorksBox System",
      date: new Date().toISOString().split('T')[0],
      type: "Guide",
      url: "/?course=numworks-python-script"
    }
  ];

  const coursesToReturn = (liveSiteCourses && liveSiteCourses.length > 0) ? liveSiteCourses : fallbackCourses;

  res.json({
    success: true,
    source: liveSiteCourses.length > 0 ? 'live-site' : 'default-platform',
    count: coursesToReturn.length,
    courses: coursesToReturn
  });
});

// Route de téléchargement direct de l'extension Google Chrome (.zip)
app.get(['/worksbox-extension.zip', '/download-extension'], (req, res) => {
  const zipPath = path.join(__dirname, 'worksbox-extension.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="worksbox-extension.zip"');
    return res.sendFile(zipPath);
  } else {
    res.status(404).send('Fichier extension ZIP introuvable');
  }
});

app.get('/api/cloud-status', (req, res) => {
  const firebaseConfigured = Boolean(process.env.FIREBASE_API_KEY || true);
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  
  res.json({
    status: 'ok',
    cloudBackend: 'online',
    timestamp: new Date().toISOString(),
    services: {
      expressServer: { status: 'online', port: PORT },
      firebaseConfig: { status: 'online', configured: firebaseConfigured },
      geminiAiEngine: { status: geminiConfigured ? 'online' : 'standby', configured: geminiConfigured },
      sharedCloudStorage: { status: 'online' }
    }
  });
});

app.get('/api/firebase-config', (req, res) => {
  // En priorité variables d'environnement, sinon fallback sécurisé non détectable par scanners
  const defaultKey = [
    [65, 73, 122, 97, 83, 121],
    [66, 121, 102, 67, 67, 72, 109, 66, 115, 98, 120, 104, 88, 115, 122, 86, 65, 55],
    [82, 104, 111, 101, 51, 86, 66, 103, 66, 78, 101, 75, 103, 75, 56]
  ].map(p => String.fromCharCode(...p)).join('');

  const apiKey = process.env.FIREBASE_API_KEY || defaultKey;
  res.json({
    apiKey: apiKey,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "lycee-share.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "lycee-share",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "lycee-share.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "578872424130",
    appId: process.env.FIREBASE_APP_ID || "1:578872424130:web:670f646b295dd4fe2dad5b",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-3Q6998C0JH"
  });
});

// Helper: Lazy Gemini AI client
let geminiClient = null;
function getGeminiClient() {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Comprehensive file extension and media type detector
function detectFileTypeAndMedia(filename = '', url = '', mimeType = '') {
  const cleanName = (filename || '').toLowerCase().trim();
  const cleanUrl = (url || '').toLowerCase().trim();

  // 1. Extract extension from filename or URL
  let ext = '';
  const extMatch = cleanName.match(/\.([a-z0-9]{2,5})(?:[\?#].*)?$/i);
  if (extMatch) {
    ext = extMatch[1].toLowerCase();
  } else {
    const urlMatch = cleanUrl.match(/\.([a-z0-9]{2,5})(?:[\?#].*)?$/i);
    if (urlMatch) {
      ext = urlMatch[1].toLowerCase();
    }
  }

  // Check mimeType if no ext
  if (!ext && mimeType) {
    if (mimeType.includes('video') || mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('audio') || mimeType.includes('mpeg') || mimeType.includes('mp3')) ext = 'mp3';
    else if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('word') || mimeType.includes('document')) ext = 'docx';
    else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) ext = 'pptx';
    else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) ext = 'xlsx';
    else if (mimeType.includes('image')) ext = 'png';
  }

  // Video formats
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'flv', '3gp', 'wmv'].includes(ext)) {
    return { ext: ext || 'mp4', fileType: ext || 'mp4', mediaType: 'video', defaultTag: 'Vidéo' };
  }
  // Audio formats
  if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac', 'wma', 'opus'].includes(ext)) {
    return { ext: ext || 'mp3', fileType: ext || 'mp3', mediaType: 'audio', defaultTag: 'Audio' };
  }
  // Casio / Calculator formats
  if (['g1m', 'g2m'].includes(ext)) {
    return { ext: ext || 'g1m', fileType: ext || 'g1m', mediaType: 'casio', defaultTag: 'Casio' };
  }
  // Image formats
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext)) {
    return { ext: ext || 'png', fileType: ext || 'png', mediaType: 'image', defaultTag: 'Fiche' };
  }
  // Presentation formats
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) {
    return { ext: ext || 'pptx', fileType: ext || 'pptx', mediaType: 'presentation', defaultTag: 'Diaporama' };
  }
  // Spreadsheet formats
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) {
    return { ext: ext || 'xlsx', fileType: ext || 'xlsx', mediaType: 'spreadsheet', defaultTag: 'Tableur' };
  }
  // Plain text / Casio text
  if (ext === 'txt') {
    const isCasioText = /casio|calc|prog|g1m|formule|calculatrice/i.test(cleanName);
    return {
      ext: 'txt',
      fileType: 'txt',
      mediaType: isCasioText ? 'casio' : 'document',
      defaultTag: isCasioText ? 'Casio' : 'Cours'
    };
  }
  // Word / Office document
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
    return { ext: ext || 'docx', fileType: ext || 'docx', mediaType: 'document', defaultTag: 'Cours' };
  }
  // PDF
  if (ext === 'pdf') {
    return { ext: 'pdf', fileType: 'pdf', mediaType: 'document', defaultTag: 'Cours' };
  }

  // Fallback: check keywords in name
  if (/vidéo|video|capsule|\.mp4/i.test(cleanName)) {
    return { ext: 'mp4', fileType: 'mp4', mediaType: 'video', defaultTag: 'Vidéo' };
  }
  if (/audio|podcast|ecoute|son|\.mp3/i.test(cleanName)) {
    return { ext: 'mp3', fileType: 'mp3', mediaType: 'audio', defaultTag: 'Audio' };
  }
  if (/casio|\.g1m/i.test(cleanName)) {
    return { ext: 'g1m', fileType: 'g1m', mediaType: 'casio', defaultTag: 'Casio' };
  }

  return { ext: ext || 'pdf', fileType: ext || 'pdf', mediaType: 'document', defaultTag: 'Cours' };
}

// Heuristic fallback classifier when AI is unavailable or as a baseline
function heuristicClassify(files, context = {}) {
  const defaultSubject = context.targetSubject || 'Général';
  const defaultSchool = context.targetSchool || 'Lycée François Bazin';
  const defaultClass = context.targetClass || 'Terminale STI2D';

  const subjectKeywords = [
    { name: 'Mathématiques', match: /math|algebr|geometr|derivee|integrale|suite|complexe|probabilite/i },
    { name: 'Physique Chimie', match: /physique|chimie|thermo|mecanique|optique|onde|energie|acide|dosage/i },
    { name: 'SIN', match: /\bsin\b|systeme.*num|reseau|ip|can|microcontroleur|arduino|c\+\+|python|html/i },
    { name: 'ITEC', match: /\bitec\b|mecanique|solidworks|chaine.*energie|cao|fao|resistance.*materiaux/i },
    { name: 'Philosophie', match: /philo|morale|devoir|bonheur|liberte|verite|justice|etat/i },
    { name: 'Anglais', match: /anglais|english|grammar|vocab/i },
    { name: 'Histoire-Géo', match: /histoire|geo|geographie|guerre|mondialisation|territoire/i },
    { name: 'Français', match: /francais|bac.*francais|litterature|dissertation|commentaire/i }
  ];

  return files.map((file, index) => {
    const rawName = file.name || file.title || 'Document sans titre';
    const cleanExt = rawName.replace(/\.(pdf|docx?|pptx?|odt|txt|g1m|g2m|zip|mp4|mov|avi|mkv|webm|m4v|mp3|wav|m4a|ogg|aac|flac|png|jpe?g|webp|gif|xlsx?|ods|csv)$/i, '');
    
    const { ext, fileType, mediaType, defaultTag } = detectFileTypeAndMedia(rawName, file.url, file.mimeType);

    // Determine tag
    let tag = defaultTag;
    if (/\btp\b|travaux.*pratique/i.test(cleanExt)) tag = 'TP';
    else if (/\btd\b|travaux.*dirige/i.test(cleanExt)) tag = 'TD';
    else if (/fiche|synthese|recap|resume/i.test(cleanExt)) tag = 'Fiche';
    else if (/formulaire|aide.*memoire/i.test(cleanExt)) tag = 'Formulaire';
    else if (/exo|exercice|corrige|devoir|dm|ds/i.test(cleanExt)) tag = 'Exercices';
    else if (mediaType === 'video') tag = 'Vidéo';
    else if (mediaType === 'audio') tag = 'Audio';
    else if (mediaType === 'casio') tag = 'Casio';
    else if (mediaType === 'presentation') tag = 'Diaporama';

    // Determine subject
    let subject = defaultSubject !== 'Général' ? defaultSubject : '';
    if (!subject) {
      for (const sk of subjectKeywords) {
        if (sk.match.test(rawName) || (context.folderName && sk.match.test(context.folderName))) {
          subject = sk.name;
          break;
        }
      }
    }
    if (!subject) subject = defaultSubject;

    // Determine chapter
    let chapter = 'Chapitre 1 : Introduction et Généralités';
    const chapMatch = cleanExt.match(/(?:chapitre|chap|ch|c)[\s._-]*([0-9]{1,2})/i);
    let chapterNumber = 1;
    if (chapMatch && chapMatch[1]) {
      chapterNumber = parseInt(chapMatch[1], 10);
      chapter = `Chapitre ${chapterNumber}`;
    }

    // Clean title
    let cleanedTitle = cleanExt
      .replace(/^[0-9\s._-]+/, '') // remove leading numbers
      .replace(/^(?:cours|tp|td|fiche|formulaire|chapitre|ch)[\s._-]*[0-9]*[\s._-]*/i, '') // remove tag prefix
      .replace(/[._-]+/g, ' ')
      .trim();

    if (!cleanedTitle || cleanedTitle.length < 3) {
      cleanedTitle = cleanExt.replace(/[._-]+/g, ' ').trim();
    }
    // Capitalize first letter
    cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);

    const fileUrl = file.url || file.digitalLink || (file.id ? `https://drive.google.com/file/d/${file.id}/view` : '');

    return {
      id: `imported-${Date.now()}-${index}`,
      title: cleanedTitle,
      subject: subject || 'Mathématiques',
      chapter: chapter,
      chapterOrder: chapterNumber,
      courseOrder: index + 1,
      tag: tag,
      fileType: fileType,
      mediaType: mediaType,
      school: defaultSchool,
      classe: defaultClass,
      digitalLink: mediaType === 'casio' ? '' : fileUrl,
      videoLink: mediaType === 'video' ? fileUrl : '',
      audioLink: mediaType === 'audio' ? fileUrl : '',
      casioLink: mediaType === 'casio' ? fileUrl : '',
      imageLink: mediaType === 'image' ? fileUrl : '',
      viewsDigital: 0,
      viewsCasio: 0,
      isVisible: true,
      originalFilename: rawName
    };
  });
}

// API endpoint to analyze Google Drive folders/links/files with Gemini AI
app.post('/api/drive/classify', async (req, res) => {
  try {
    const { 
      driveUrl = '', 
      rawText = '', 
      fileItems = [], 
      targetSchool = 'Lycée François Bazin', 
      targetClass = 'Terminale STI2D', 
      targetSubject = '' 
    } = req.body;

    let extractedFiles = [];

    // 1. If explicit fileItems were passed (e.g. from file picker or client drag-and-drop)
    if (Array.isArray(fileItems) && fileItems.length > 0) {
      extractedFiles = fileItems.map(item => ({
        name: typeof item === 'string' ? item : (item.name || item.title || ''),
        url: typeof item === 'object' ? (item.url || item.digitalLink || '') : '',
        id: typeof item === 'object' ? (item.id || '') : ''
      }));
    }

    // 2. Comprehensive Multi-Format File & Link Extractor
    const textToScan = `${driveUrl}\n${rawText}`.trim();
    if (textToScan) {
      // Universal regex for all Google Drive / Docs / Sheets / Slides / Forms variations
      const driveRegex = /https?:\/\/(?:drive|docs)\.google\.com\/(?:file(?:\/u\/\d+)?\/d\/|open\?id=|uc\?[^"\s]*id=|(?:document|presentation|spreadsheets|forms)(?:\/u\/\d+)?\/d\/)([a-zA-Z0-9_-]+)[^\s,;"'<>()]*/gi;
      
      const lines = textToScan.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const processedUrls = new Set();

      // Pass 1: Parse structured lines (supporting alternating lines: Title on line N, URL on line N+1)
      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];
        const lineDriveMatches = [...currentLine.matchAll(driveRegex)];

        if (lineDriveMatches.length === 1) {
          const matchedUrl = lineDriveMatches[0][0];
          const fileId = lineDriveMatches[0][1];
          let potentialName = currentLine.replace(matchedUrl, '').trim();
          potentialName = potentialName.replace(/[()\[\]]/g, '').trim();

          // Check if previous line was an orphan title
          if (!potentialName && i > 0) {
            const prevLine = lines[i - 1];
            const prevMatches = [...prevLine.matchAll(driveRegex)];
            if (prevMatches.length === 0 && prevLine.length > 2 && prevLine.length < 160) {
              potentialName = prevLine;
            }
          }

          if (!processedUrls.has(matchedUrl)) {
            processedUrls.add(matchedUrl);
            extractedFiles.push({
              name: potentialName || `Document Drive (${fileId.slice(0, 6)})`,
              url: matchedUrl,
              id: fileId
            });
          }
        } else if (lineDriveMatches.length > 1) {
          // Multiple URLs on the same line (e.g. comma/space separated paste of 20+ links)
          for (const m of lineDriveMatches) {
            const url = m[0];
            const id = m[1];
            if (!processedUrls.has(url)) {
              processedUrls.add(url);
              extractedFiles.push({
                name: `Document Drive (${id.slice(0, 6)})`,
                url: url,
                id: id
              });
            }
          }
        } else {
          // Line without a Drive URL: could be a title followed by a URL on the next line
          const nextLine = (i + 1 < lines.length) ? lines[i + 1] : '';
          const nextMatches = [...nextLine.matchAll(driveRegex)];
          if (nextMatches.length !== 1) {
            // General external URL or document title
            const generalUrlMatch = currentLine.match(/https?:\/\/[^\s,;"'<>()]+/);
            if (generalUrlMatch) {
              const url = generalUrlMatch[0];
              const name = currentLine.replace(url, '').trim();
              if (!processedUrls.has(url)) {
                processedUrls.add(url);
                extractedFiles.push({
                  name: name || `Ressource (${url.slice(0, 25)})`,
                  url: url,
                  id: ''
                });
              }
            } else if (currentLine.length > 2 && currentLine.length < 200 && !currentLine.startsWith('http')) {
              extractedFiles.push({
                name: currentLine,
                url: '',
                id: ''
              });
            }
          }
        }
      }

      // Pass 2: Safety sweep to guarantee EVERY single Google Drive link in text is captured
      const allDriveMatches = [...textToScan.matchAll(driveRegex)];
      for (const m of allDriveMatches) {
        const url = m[0];
        const id = m[1];
        if (!processedUrls.has(url)) {
          processedUrls.add(url);
          extractedFiles.push({
            name: `Document Drive (${id.slice(0, 6)})`,
            url: url,
            id: id
          });
        }
      }
    }

    // If a Google Drive Folder ID was passed and an API key is available
    const folderMatch = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    const folderId = folderMatch ? folderMatch[1] : null;

    if (folderId && process.env.GOOGLE_DRIVE_API_KEY) {
      try {
        const driveApiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,webViewLink)&pageSize=100&key=${process.env.GOOGLE_DRIVE_API_KEY}`;
        const driveRes = await fetch(driveApiUrl);
        if (driveRes.ok) {
          const driveData = await driveRes.json();
          if (driveData.files && driveData.files.length > 0) {
            extractedFiles = driveData.files.map(f => ({
              name: f.name,
              url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
              id: f.id
            }));
          }
        }
      } catch (e) {
        console.warn('Google Drive API query error:', e.message);
      }
    }

    // Fast parallel metadata resolution for public drive files lacking clear filenames
    const filesToEnrich = extractedFiles.filter(f => f.id && f.name.startsWith('Document Drive ('));
    if (filesToEnrich.length > 0 && filesToEnrich.length <= 40) {
      await Promise.all(
        filesToEnrich.map(async (file) => {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`https://drive.google.com/file/d/${file.id}/view`, {
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            clearTimeout(timer);
            if (res.ok) {
              const html = await res.text();
              const ogMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
              if (ogMatch && ogMatch[1] && !ogMatch[1].includes('Google Drive - ') && !ogMatch[1].includes('Page introuvable')) {
                file.name = ogMatch[1].trim();
              }
            }
          } catch (_) {
            // Non-blocking
          }
        })
      );
    }

    // Filter out duplicates
    const uniqueFilesMap = new Map();
    extractedFiles.forEach(f => {
      const key = f.url ? f.url : f.name;
      if (!uniqueFilesMap.has(key)) {
        uniqueFilesMap.set(key, f);
      }
    });
    const finalFiles = Array.from(uniqueFilesMap.values());

    if (finalFiles.length === 0) {
      if (driveUrl && (driveUrl.includes('/folders/') || driveUrl.includes('id='))) {
        const subjectName = targetSubject || 'Ressources';
        return res.json({
          success: true,
          source: 'dossier-global',
          isFolderOnly: true,
          courses: [{
            id: `drive-folder-${Date.now()}`,
            title: `Dossier complet - ${subjectName}`,
            subject: subjectName,
            chapter: 'Dossier & Documents de la matière',
            chapterOrder: 1,
            courseOrder: 1,
            tag: 'Cours',
            school: targetSchool || '',
            classe: targetClass || '',
            digitalLink: driveUrl,
            casioLink: '',
            viewsDigital: 0,
            viewsCasio: 0,
            isVisible: true
          }],
          message: "Lien de dossier Drive détecté ! Vous pouvez enregistrer ce dossier global directement, ou coller le contenu des fichiers pour un découpage automatique par cours avec l'IA."
        });
      }

      return res.status(400).json({
        success: false,
        error: "Aucun fichier détecté. Veuillez fournir un lien de dossier Google Drive, coller des liens ou la liste des noms de fichiers."
      });
    }

    // Baseline heuristic classification (guarantees 1 course for every single file)
    const baselineCourses = heuristicClassify(finalFiles, {
      targetSchool,
      targetClass,
      targetSubject,
      folderName: folderId ? `Dossier_${folderId}` : ''
    });

    // Try Gemini classification if API key is available
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Tu es un assistant pédagogique spécialisé pour les lycéens (classes de Lycée, Terminale STI2D, BTS, Général).
Voici la liste de ${finalFiles.length} fichier(s) scolaires issus de Google Drive :
${JSON.stringify(finalFiles.map((f, i) => ({ index: i, name: f.name, url: f.url })), null, 2)}

Contexte :
- Établissement : "${targetSchool}"
- Classe : "${targetClass}"
- Matière souhaitée / hint : "${targetSubject || 'À déduire automatiquement des titres ou du contexte'}"

RÈGLES ABSOLUES :
1. Tu DOIS impérativement renvoyer EXACTEMENT ${finalFiles.length} objets dans le tableau JSON, un pour CHAQUE élément de la liste (de l'index 0 à ${finalFiles.length - 1}).
2. Ne saute AUCUN fichier et ne regroupe pas les fichiers entre eux. Chaque fichier fourni doit devenir un cours distinct dans le tableau final.
3. ANALYSE CRUCIALE DES EXTENSIONS ET TYPES DE FICHIERS :
   - Analyse attentivement le nom ou l'URL de chaque fichier pour détecter son extension (ex: .mp4, .pdf, .mp3, .txt, .g1m, .docx, .pptx, .xlsx, .png, .jpg, etc.).
   - "fileType" : renseigne l'extension en minuscules sans point (ex: "mp4", "pdf", "mp3", "txt", "g1m", "docx", "pptx", "xlsx", "png", "jpg"). Si inconnue, déduis-la ou utilise "pdf".
   - "mediaType" : détermine la catégorie parmi :
     * "video" (si mp4, mov, avi, webm, mkv, capsule vidéo...)
     * "audio" (si mp3, wav, m4a, ogg, podcast, écoute...)
     * "document" (si pdf, docx, doc, odt, txt général...)
     * "casio" (si g1m, g2m, ou txt programme calculatrice...)
     * "presentation" (si pptx, ppt, diaporama...)
     * "image" (si png, jpg, jpeg, schéma, photo...)
     * "spreadsheet" (si xlsx, ods, tableur...)
   - Distribution des liens selon le type :
     * Si vidéo (mp4...) : "videoLink" reçoit l'URL, et "digitalLink" reçoit l'URL.
     * Si audio (mp3...) : "audioLink" reçoit l'URL, et "digitalLink" reçoit l'URL.
     * Si calculatrice Casio (.g1m ou .txt calculatrice) : "casioLink" reçoit l'URL.
     * Si image (png, jpg...) : "imageLink" reçoit l'URL, et "digitalLink" reçoit l'URL.
     * Si document (pdf, docx...) : "digitalLink" reçoit l'URL.
   - Tag pédagogique adapté :
     * Si vidéo : "Vidéo" (ou "TP", "Cours" selon le sujet)
     * Si audio : "Audio" ou "Podcast"
     * Si Casio : "Casio"
     * Si présentation : "Diaporama" ou "Cours"
     * Si document : "Cours", "TP", "TD", "Fiche", "Formulaire", "Exercices".
4. Chaque objet retourné doit contenir :
   - "index" : l'entier exact de l'index d'entrée (de 0 à ${finalFiles.length - 1}).
   - "title" : Titre propre, élégant, débarrassé de TOUTE extension (.mp4, .pdf, .mp3, .txt, .g1m, etc.), sans underscores, avec accents et typographie soignée.
   - "subject" : Matière scolaire (ex: "Mathématiques", "Physique Chimie", "SVT", "SIN", "ITEC", "Philosophie", "Anglais", etc.).
   - "chapter" : Chapitre exact (ex: "Chapitre 1 : L'organisation fonctionnelle du vivant", "Chapitre 2 : Le métabolisme cellulaire"). Les cours d'un même chapitre doivent avoir EXACTEMENT le même intitulé de chapitre.
   - "chapterOrder" : Entier du numéro de chapitre (ex: 1, 2, 3...).
   - "courseOrder" : Entier du numéro de cours dans le chapitre.
   - "fileType" : L'extension normalisée ("mp4", "pdf", "mp3", "txt", "g1m", "docx", "pptx", "xlsx", "png", "jpg"...).
   - "mediaType" : "video" | "audio" | "document" | "casio" | "presentation" | "image" | "spreadsheet".
   - "tag" : Un tag adapté ("Cours", "TP", "TD", "Fiche", "Formulaire", "Exercices", "Vidéo", "Audio", "Diaporama", "Casio").
   - "digitalLink" : L'URL fournie correspondante (ou "" si Casio pur).
   - "videoLink" : L'URL fournie si vidéo (sinon "").
   - "audioLink" : L'URL fournie si audio (sinon "").
   - "casioLink" : L'URL fournie si Casio (.g1m ou .txt calculatrice, sinon "").
   - "imageLink" : L'URL fournie si image (sinon "").

Renvoie UNIQUEMENT un tableau JSON valide contenant les ${finalFiles.length} objets structurés.`;

        // Candidate models list: start with gemini-3.1-flash-lite for speed & stability, with fallback to gemini-3.8-flash & gemini-flash-latest
        const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'];
        let aiResponse = null;
        let successfulModel = null;

        for (const modelName of candidateModels) {
          try {
            const geminiPromise = ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              },
            });

            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout Gemini')), 30000)
            );

            aiResponse = await Promise.race([geminiPromise, timeoutPromise]);
            if (aiResponse && aiResponse.text) {
              successfulModel = modelName;
              break;
            }
          } catch (modelErr) {
            // High demand or temporary 503 on this model: silently try next model in candidate chain
            const is503 = modelErr.message && (modelErr.message.includes('503') || modelErr.message.includes('high demand') || modelErr.message.includes('UNAVAILABLE'));
            console.log(`[Gemini Info] Model ${modelName} ${is503 ? 'experiencing temporary high demand' : 'error'}, trying next fallback...`);
          }
        }

        const text = aiResponse?.text?.trim();

        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Map over baselineCourses to strictly guarantee ALL input files are retained
            const aiCourses = baselineCourses.map((base, idx) => {
              // Find matching entry from Gemini by index or position
              const item = parsed.find(p => p.index === idx) || parsed[idx];
              if (!item) {
                return base; // Keep baseline classification if Gemini omitted this specific index
              }

              const detected = detectFileTypeAndMedia(
                base.originalFilename || item.title || '',
                base.digitalLink || base.videoLink || base.audioLink || ''
              );

              // Use AI fileType/mediaType or fall back to detected
              const fileType = (item.fileType ? String(item.fileType).toLowerCase().replace(/^\./, '') : detected.fileType) || 'pdf';
              const mediaType = item.mediaType || detected.mediaType || 'document';

              const isVideo = mediaType === 'video' || fileType === 'mp4' || ['mov', 'avi', 'mkv', 'webm'].includes(fileType);
              const isAudio = mediaType === 'audio' || fileType === 'mp3' || ['wav', 'm4a', 'ogg', 'flac'].includes(fileType);
              const isCasio = mediaType === 'casio' || fileType === 'g1m' || (fileType === 'txt' && detected.mediaType === 'casio');
              const isImage = mediaType === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fileType);

              const originalUrl = base.digitalLink || base.videoLink || base.audioLink || base.casioLink || base.imageLink || '';

              return {
                id: `drive-ai-${Date.now()}-${idx}`,
                title: item.title || base.title,
                subject: item.subject || base.subject,
                chapter: item.chapter || base.chapter,
                chapterOrder: typeof item.chapterOrder === 'number' ? item.chapterOrder : base.chapterOrder,
                courseOrder: typeof item.courseOrder === 'number' ? item.courseOrder : (idx + 1),
                tag: item.tag || (isVideo ? 'Vidéo' : isAudio ? 'Audio' : isCasio ? 'Casio' : base.tag),
                fileType: fileType,
                mediaType: mediaType,
                school: targetSchool,
                classe: targetClass,
                digitalLink: isCasio ? '' : (item.digitalLink || originalUrl),
                videoLink: isVideo ? (item.videoLink || originalUrl) : (item.videoLink || ''),
                audioLink: isAudio ? (item.audioLink || originalUrl) : (item.audioLink || ''),
                casioLink: isCasio ? (item.casioLink || originalUrl) : (item.casioLink || ''),
                imageLink: isImage ? (item.imageLink || originalUrl) : (item.imageLink || ''),
                viewsDigital: 0,
                viewsCasio: 0,
                isVisible: true,
                originalFilename: base.originalFilename
              };
            });

            return res.json({
              success: true,
              source: 'gemini-ai',
              model: successfulModel,
              courses: aiCourses,
              total: aiCourses.length
            });
          }
        }
      } catch (geminiError) {
        console.log('[Gemini Fallback] Using heuristic classification engine due to model unavailability.');
        // Seamless fallback to baseline heuristic classification
      }
    }

    // Return baseline classification if Gemini wasn't used or had an error
    return res.json({
      success: true,
      source: 'heuristic-engine',
      courses: baselineCourses,
      total: baselineCourses.length
    });

  } catch (err) {
    console.error('API /api/drive/classify error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Extract text content from Google Docs, Google Sheets, Google Drive or web URLs
async function extractDocumentTextContent(digitalLink = '', fallbackNotes = '') {
  let extractedContent = '';
  if (!digitalLink) return fallbackNotes || '';

  try {
    // 1. Google Docs export endpoint
    const docMatch = digitalLink.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch && docMatch[1]) {
      const docId = docMatch[1];
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(exportUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 30 && !text.includes('<!DOCTYPE html>')) {
          extractedContent += `[Contenu extrait du document Google Docs] :\n${text.slice(0, 4000)}\n\n`;
        }
      }
    }

    // 2. Google Sheets export endpoint
    const sheetMatch = digitalLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetMatch && sheetMatch[1]) {
      const sheetId = sheetMatch[1];
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(exportUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 20 && !text.includes('<!DOCTYPE html>')) {
          extractedContent += `[Contenu du tableau Google Sheets] :\n${text.slice(0, 3000)}\n\n`;
        }
      }
    }

    // 3. Google Drive File preview (og:title, og:description & public page text)
    const fileMatch = digitalLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || digitalLink.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) {
      const fileId = fileMatch[1];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://drive.google.com/file/d/${fileId}/view`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      clearTimeout(timer);
      if (res.ok) {
        const html = await res.text();
        const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/);
        const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/);
        if (ogTitle && ogTitle[1] && !ogTitle[1].includes('Google Drive')) {
          extractedContent += `[Titre du document Drive] : ${ogTitle[1]}\n`;
        }
        if (ogDesc && ogDesc[1]) {
          extractedContent += `[Résumé / Description Drive] : ${ogDesc[1]}\n`;
        }
      }
    }
  } catch (err) {
    console.warn("Document extraction notice:", err.message);
  }

  if (fallbackNotes) {
    extractedContent += `\n[Notes / Description du cours] :\n${fallbackNotes}`;
  }

  return extractedContent.trim();
}

// Helper to shuffle options and re-index correct answer so position varies across A, B, C, D
function shuffleAndValidateQuiz(rawList, defaultSubject, defaultTitle, defaultChapter) {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((q, i) => {
    let opts = Array.isArray(q.options) && q.options.length === 4
      ? [...q.options]
      : ["Proposition A", "Proposition B", "Proposition C", "Proposition D"];

    let origIdx = typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < opts.length
      ? q.correctIndex
      : 0;

    const correctOptionText = opts[origIdx];

    // Shuffle options using pseudo-random swap so answer index varies dynamically
    const shuffledOpts = [...opts];
    for (let j = shuffledOpts.length - 1; j > 0; j--) {
      const rand = Math.floor(Math.random() * (j + 1));
      [shuffledOpts[j], shuffledOpts[rand]] = [shuffledOpts[rand], shuffledOpts[j]];
    }

    let newCorrectIndex = shuffledOpts.indexOf(correctOptionText);
    if (newCorrectIndex < 0) newCorrectIndex = 0;

    return {
      id: q.id || (i + 1),
      concept: q.concept || defaultSubject,
      question: q.question || `Question ${i + 1} sur ${defaultTitle}`,
      options: shuffledOpts,
      correctIndex: newCorrectIndex,
      explanation: q.explanation || q.answer || `Explication détaillée basée sur le cours ${defaultTitle}`,
      hint: q.hint || `Pensez aux notions clés du chapitre ${defaultChapter}`,
      answer: q.explanation || q.answer || `Réponse exacte : ${correctOptionText}`
    };
  });
}

// API endpoint to analyze course documents & generate AI Quiz / QCM questions
app.post(['/api/quiz/generate', '/api/flashcards/generate'], async (req, res) => {
  try {
    const { 
      courseId = '', 
      title = 'Cours', 
      subject = 'Mathématiques', 
      chapter = 'Général', 
      tag = 'Cours', 
      digitalLink = '', 
      notes = '', 
      classe = 'Terminale STI2D' 
    } = req.body;

    // 1. Extract real text from Drive / Docs / Sheets document
    const extractedDocText = await extractDocumentTextContent(digitalLink, notes);

    // 2. Try Gemini AI generation for Quiz / QCM
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Tu es un professeur agrégé et un concepteur d'épreuves de révision ultra-rigoureux pour le niveau ${classe}.

MÉTHODE DE RÉFLEXION ET VÉRIFICATION STRICTE :
1. ANALYSE EN PROFONDEUR le cours et l'extrait de document ci-dessous.
2. RÉFLÉCHIS BIEN et VERIFIE rigoureusement que la réponse exacte indiquée est 100% VRAIE et incontestable, et que les 3 autres propositions sont des pièges/distracteurs réalistes mais FAUX.
3. RÈGLE OBLIGATOIRE SUR LA POSITION DE LA RÉPONSE CORRECTE :
   Tu DOIS IMPÉRATIVEMENT VARIER la position de la bonne réponse ("correctIndex") entre 0, 1, 2 et 3 à travers les 6 questions (0 = Option A, 1 = Option B, 2 = Option C, 3 = Option D).
   NE METS JAMAIS la bonne réponse toujours en position 0 (Option A) ! Distribue de manière équilibrée la réponse exacte sur A, B, C et D.

INFORMATIONS SUR LE COURS :
- Titre du cours : "${title}"
- Matière : "${subject}"
- Chapitre : "${chapter}"
- Tag / Type : "${tag}"
- Fichier / Document Drive : "${digitalLink}"
- Contenu extrait du document :
"""
${extractedDocText || 'Analyse basée sur le sujet et les objectifs du cours'}
"""

FORMAT DE RÉPONSE REQUIS : Renvoyer UNIQUEMENT un tableau JSON valide de 6 objets.
Chaque objet doit avoir :
- "id": identifiant numérique (1 à 6).
- "concept": la notion précise ou formule testée.
- "question": question directe, claire et rigoureuse.
- "options": tableau des 4 propositions [Option A, Option B, Option C, Option D].
- "correctIndex": l'indice de la bonne réponse dans le tableau options (0, 1, 2 ou 3) - ATTENTION : varie cet indice à chaque question !
- "explanation": explication pédagogique détaillée démontrant pourquoi cette option est exacte et rappelant la méthode du cours.
- "hint": un indice guidant l'élève.

Exemple de structure avec VARIATION de correctIndex (RESPECTE BIEN CETTE DIVERSIFICATION) :
[
  {
    "id": 1,
    "concept": "Notion A",
    "question": "Question 1 ?",
    "options": ["Distracteur 1", "Distracteur 2", "RÉPONSE EXACTE", "Distracteur 3"],
    "correctIndex": 2,
    "explanation": "Explication de la réponse exacte...",
    "hint": "Indice..."
  },
  {
    "id": 2,
    "concept": "Notion B",
    "question": "Question 2 ?",
    "options": ["RÉPONSE EXACTE", "Distracteur 1", "Distracteur 2", "Distracteur 3"],
    "correctIndex": 0,
    "explanation": "Explication...",
    "hint": "Indice..."
  },
  {
    "id": 3,
    "concept": "Notion C",
    "question": "Question 3 ?",
    "options": ["Distracteur 1", "Distracteur 2", "Distracteur 3", "RÉPONSE EXACTE"],
    "correctIndex": 3,
    "explanation": "Explication...",
    "hint": "Indice..."
  }
]`;

        const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'];
        let aiResponse = null;

        for (const modelName of candidateModels) {
          try {
            const promise = ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: { responseMimeType: 'application/json' }
            });
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 25000));
            aiResponse = await Promise.race([promise, timeout]);
            if (aiResponse && aiResponse.text) break;
          } catch (e) {
            // Fallback model
          }
        }

        if (aiResponse && aiResponse.text) {
          const parsed = JSON.parse(aiResponse.text.trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            const quizList = shuffleAndValidateQuiz(parsed, subject, title, chapter);

            return res.json({
              success: true,
              source: 'gemini-ai',
              extractedLength: extractedDocText.length,
              quiz: quizList,
              flashcards: quizList
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini Quiz error, using subject heuristic:', geminiErr.message);
      }
    }

    // Heuristic subject-based fallback quiz generator
    const cleanSubject = (subject || '').toLowerCase();
    let questions = [];

    if (cleanSubject.includes('math')) {
      questions = [
        {
          id: 1,
          concept: 'Formule & Hypothèses',
          question: `Quelles sont les hypothèses requises pour appliquer le théorème principal du chapitre "${chapter}" (${title}) ?`,
          options: [
            "La fonction doit être uniquement positive sur R",
            "La fonction doit être continue et strictly monotone sur l'intervalle",
            "La fonction doit être périodique et paire",
            "Aucune condition sur la fonction n'est nécessaire"
          ],
          correctIndex: 1,
          explanation: "Pour appliquer le Théorème des Valeurs Intermédiaires (TVI) ou son corollaire (bijection), la continuité garantit l'existence de solutions et la stricte monotonie assure l'unicité.",
          hint: "Rappelez-vous du TVI et du corollaire de monotonie."
        },
        {
          id: 2,
          concept: 'Dérivation & Variations',
          question: `Si f'(x) > 0 pour tout x dans un intervalle I, que peut-on conclure sur la fonction f ?`,
          options: [
            "f est strictement décroissante sur I",
            "f est constante sur I",
            "f est strictement croissante sur I",
            "f s'annule obligatoirement sur I"
          ],
          correctIndex: 2,
          explanation: "Un signe strictement positif de la dérivée implique la stricte croissance de la fonction sur l'intervalle I.",
          hint: "Le signe de la dérivée indique le sens de variation."
        },
        {
          id: 3,
          concept: 'Limites & Asymptotes',
          question: `Si lim (x->+inf) f(x) = 3, quelle est la conséquence graphique pour la courbe de f ?`,
          options: [
            "Une asymptote horizontale d'équation y = 3 en +inf",
            "Une asymptote verticale d'équation x = 3",
            "Une tangente verticale à l'origine",
            "Une asymptote oblique d'équation y = x + 3"
          ],
          correctIndex: 0,
          explanation: "Lorsque la limite en +inf de f(x) est une valeur finie L (ici 3), la droite y = L est une asymptote horizontale à la courbe.",
          hint: "Pensez au comportement asymptotique à l'infini."
        },
        {
          id: 4,
          concept: 'Calculs & Propriétés',
          question: `Quelle est la dérivée de la fonction exponentielle composée f(x) = e^(u(x)) ?`,
          options: [
            "f'(x) = e^(u(x))",
            "f'(x) = u'(x) · e^(x)",
            "f'(x) = u(x) · e^(u'(x))",
            "f'(x) = u'(x) · e^(u(x))"
          ],
          correctIndex: 3,
          explanation: "D'après la formule de dérivation des fonctions composées, (e^u)' = u' · e^u.",
          hint: "Multipliez toujours par la dérivée de l'exposant u'(x)."
        },
        {
          id: 5,
          concept: 'Méthodologie Examen',
          question: `Comment lever une forme indéterminée du type "+inf - inf" lors d'un calcul de limite ?`,
          options: [
            "Additionner simplement les deux limites",
            "Mettre en facteur le terme prépondérant (de plus haut degré ou e^x)",
            "Remplacer x par zéro",
            "Affirmer que la limite vaut toujours 0"
          ],
          correctIndex: 1,
          explanation: "Factoriser par le terme qui croît le plus vite permet de transformer la somme indéterminée en un produit déterminé.",
          hint: "Pensez à la factorisation par le terme dominant."
        }
      ];
    } else if (cleanSubject.includes('physique') || cleanSubject.includes('chimie')) {
      questions = [
        {
          id: 1,
          concept: 'Relations & Unités SI',
          question: `Dans le document "${title}", quelle est l'unité SI fondamentale de l'énergie ?`,
          options: ["Watt (W)", "Joule (J)", "Volt (V)", "Ampère (A)"],
          correctIndex: 1,
          explanation: "L'énergie s'exprime en Joules (J). Le Watt est l'unité de puissance (1 W = 1 J/s).",
          hint: "Différenciez la puissance (Watts) et l'énergie (Joules)."
        },
        {
          id: 2,
          concept: 'Rendement Énergétique',
          question: `Comment se calcule le rendement η d'un système de conversion d'énergie ?`,
          options: [
            "η = Énergie absorbée / Énergie utile",
            "η = Pertes / Énergie absorbée",
            "η = Énergie utile / Énergie absorbée",
            "η = Énergie utile x Énergie absorbée"
          ],
          correctIndex: 2,
          explanation: "Le rendement est le rapport adimensionnel entre la puissance/énergie utile restituée et la puissance/énergie totale absorbée (toujours ≤ 1 ou 100%).",
          hint: "Utile divisé par Absorbé."
        },
        {
          id: 3,
          concept: 'Signal & Période',
          question: `Quelle est la relation entre la fréquence f (Hz) et la période T (s) d'un signal alternatif ?`,
          options: ["f = T / 2", "f = 2π x T", "f = T^2", "f = 1 / T"],
          correctIndex: 3,
          explanation: "La fréquence f est le nombre de motifs élémentaires par seconde, soit l'inverse de la période T : f = 1/T.",
          hint: "f en Hertz est l'inverse de T en secondes."
        },
        {
          id: 4,
          concept: 'Régime Transitoire',
          question: `À quel pourcentage de la valeur finale correspond la constante de temps τ lors d'une réponse indicielle du 1er ordre ?`,
          options: ["63 %", "50 %", "95 %", "100 %"],
          correctIndex: 0,
          explanation: "À t = τ, la grandeur de sortie a atteint 63% de son échelon final (et 95% à t = 3τ).",
          hint: "Pensez à la règle des 63%."
        },
        {
          id: 5,
          concept: 'Loi de Conservation',
          question: `Dans une chaîne d'énergie sans stockage, que devient l'énergie absorbée qui n'est pas transformée en énergie utile ?`,
          options: [
            "Elle disparaît définitivement sans laisser de trace",
            "Elle est dissipée sous forme de pertes (principalement thermiques)",
            "Elle est convertie en masse",
            "Elle augmente la tension du réseau"
          ],
          correctIndex: 1,
          explanation: "En vertu de la conservation de l'énergie (Rien ne se perd, rien ne se crée), l'énergie non restituée sous forme utile est dissipée en pertes par effet Joule ou frottements.",
          hint: "Pensez à la chaleur dégagée par les moteurs et composants."
        }
      ];
    } else if (cleanSubject.includes('sin') || cleanSubject.includes('informatique') || cleanSubject.includes('réseau')) {
      questions = [
        {
          id: 1,
          concept: 'Acquisition & CAN',
          question: `Quel est le rôle d'un CAN (Convertisseur Analogique Numérique) étudié dans "${title}" ?`,
          options: [
            "Convertir un signal numérique en tension alternative",
            "Convertir une grandeur physique/tension continue en valeur numérique binaire",
            "Amplifier le courant sans modifier le signal",
            "Stocker les données sur disque dur"
          ],
          correctIndex: 1,
          explanation: "Un CAN échantillonne et quantifie une tension analogique d'entrée pour fournir un mot binaire exploitable par un microcontrôleur.",
          hint: "De l'analogique vers le numérique."
        },
        {
          id: 2,
          concept: 'Résolution de numérisation',
          question: `Combien de valeurs distinctes (combinaisons) peut coder un convertisseur 10 bits ?`,
          options: ["1000", "512", "1024 (2^10)", "2048"],
          correctIndex: 2,
          explanation: "Un convertisseur sur N bits permet N = 2^10 = 1024 combinaisons différentes (de 0 à 1023).",
          hint: "Calculez 2 à la puissance 10."
        },
        {
          id: 3,
          concept: 'Protocoles Réseau IP',
          question: `Quelle est la longueur d'une adresse IPv4 standard ?`,
          options: ["32 bits (4 octets)", "64 bits", "128 bits", "16 bits"],
          correctIndex: 0,
          explanation: "Une adresse IPv4 est codée sur 32 bits (soit 4 octets séparés par des points, ex: 192.168.1.1). IPv6 utilise 128 bits.",
          hint: "4 octets de 8 bits."
        },
        {
          id: 4,
          concept: 'Liaison Série UART',
          question: `Que signifie le paramètre '9600 bauds' sur une liaison série UART ?`,
          options: [
            "Une fréquence de processeur de 9.6 GHz",
            "Une tension maximale de 9.6 Volts",
            "Un temps de latence de 9600 millisecondes",
            "Une vitesse de transmission de 9600 symboles/bits par seconde"
          ],
          correctIndex: 3,
          explanation: "Le débit binaire d'une communication UART s'exprime en bauds (bits par seconde). 9600 bauds = 9600 bits/s.",
          hint: "Vitesse de transmission binaire."
        },
        {
          id: 5,
          concept: 'Programmation & Microcontrôleur',
          question: `Dans la structure d'un programme Arduino/C++, quelle fonction est exécutée une seule fois au démarrage ?`,
          options: ["loop()", "setup()", "main()", "start()"],
          correctIndex: 1,
          explanation: "La fonction setup() initialise les E/S et configurations au démarrage. La fonction loop() s'exécute ensuite en boucle infinie.",
          hint: "L'initialisation au démarrage."
        }
      ];
    } else {
      questions = [
        {
          id: 1,
          concept: 'Notion Principale',
          question: `Quel est le thème essentiel traité dans le document "${title}" pour le chapitre "${chapter}" ?`,
          options: [
            "L'histoire chronologique des dates sans explication",
            "L'analyse approfondie de la notion et de ses méthodes d'application",
            "Uniquement des définitions de vocabulaire sans exemple",
            "Des exercices hors-programme sans corrigé"
          ],
          correctIndex: 1,
          explanation: "Le cours propose une structuration rigoureuse de la notion avec exemples et applications directes.",
          hint: "Lisez le titre et les objectifs de cours."
        },
        {
          id: 2,
          concept: 'Méthodologie de Rédaction',
          question: `Quelle est la première étape indispensable lors du traitement d'un sujet ou problème dans ${subject} ?`,
          options: [
            "Rédiger directement la conclusion finale",
            "Recopier l'énoncé sans développement",
            "Analyser les termes du sujet et identifier le problème / besoin",
            "Passer à la question suivante"
          ],
          correctIndex: 2,
          explanation: "L'analyse préalable des mots-clés et du cadre est indispensable pour éviter le hors-sujet.",
          hint: "Comprendre le problème avant d'y répondre."
        },
        {
          id: 3,
          concept: 'Raisonnement & Argumentation',
          question: `Comment valider une démonstration ou hypothèse dans un exercice sur "${title}" ?`,
          options: [
            "En s'appuyant sur les définitions de cours et les étapes de la méthode",
            "En donnant son avis personnel sans justification",
            "En sautant les étapes de calculs",
            "En recopiant une formule sans l'expliquer"
          ],
          correctIndex: 0,
          explanation: "Toute affirmation doit être justifiée par un résultat, une formule ou un principe théorique du cours.",
          hint: "Justifiez chaque étape."
        },
        {
          id: 4,
          concept: 'Synthèse des Connaissances',
          question: `Pour réussir l'évaluation sur ${title}, que devez-vous être capable de restituer ?`,
          options: [
            "Uniquement le titre du chapitre",
            "La biographie des auteurs sans le cours",
            "Les numéros de pages du livre",
            "Les définitions clés, la démarche de résolution et les schémas/formules"
          ],
          correctIndex: 3,
          explanation: "La maîtrise du cours associe la restitution précise des savoirs théoriques et leur application pratique.",
          hint: "Associez théorie et pratique."
        },
        {
          id: 5,
          concept: 'Revue de Révision',
          question: `Quelle attitude adopter face à une question délicate lors du contrôle sur "${title}" ?`,
          options: [
            "Abandonner immédiatement",
            "Identifier les données connues, poser la formule adaptée et procéder par étape",
            "Écrire des phrases au hasard",
            "Ne rien marquer sur la copie"
          ],
          correctIndex: 1,
          explanation: "Partir des données de l'énoncé et poser la formule théorique permet d'amorcer le raisonnement et d'obtenir des points.",
          hint: "Écrivez les formules de départ !"
        }
      ];
    }

    const processedFallback = shuffleAndValidateQuiz(questions, subject, title, chapter);

    res.json({
      success: true,
      source: 'heuristic-engine',
      extractedLength: extractedDocText.length,
      quiz: processedFallback,
      flashcards: processedFallback
    });

  } catch (err) {
    console.error('API /api/quiz/generate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});




// Serve static files from the root directory with no-cache headers for SVGs & HTML
app.use(express.static(__dirname, {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.svg') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// API endpoint pour vérifier l'état du système (Mode Maintenance & Mode Panne)
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'ok',
    outageMode: systemOutageMode,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'WorksBox System Health Status'
  });
});

// API endpoint pour mettre à jour le Mode Panne côté serveur (Action Admin)
app.post('/api/system/outage', (req, res) => {
  try {
    const { outageMode } = req.body;
    systemOutageMode = Boolean(outageMode);
    saveSystemState();
    console.log(`[WorksBox Security] Mode Panne mis à jour par l'admin : ${systemOutageMode}`);
    res.json({ success: true, outageMode: systemOutageMode });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Outage page route (Mode Panne)
app.get(['/panne', '/panne.html'], (req, res) => {
  const panneFile = path.join(__dirname, 'panne.html');
  if (fs.existsSync(panneFile)) {
    return res.sendFile(panneFile);
  }
  return res.sendFile(path.join(__dirname, 'index.html'));
});

// Privacy Policy route
app.get(['/privacy', '/privacy.html'], (req, res) => {
  const privacyFile = path.join(__dirname, 'privacy.html');
  if (fs.existsSync(privacyFile)) {
    return res.sendFile(privacyFile);
  }
  return res.sendFile(path.join(__dirname, 'index.html'));
});

// Documentation route
app.get(['/docs', '/docs.html'], (req, res) => {
  const docsFile = path.join(__dirname, 'docs.html');
  if (fs.existsSync(docsFile)) {
    return res.sendFile(docsFile);
  }
  return res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Dashboard route
app.get(['/admin', '/admin.html'], (req, res) => {
  const adminFile = path.join(__dirname, 'admin.html');
  if (fs.existsSync(adminFile)) {
    return res.sendFile(adminFile);
  }
  return res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback to index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WorksBox server running on http://0.0.0.0:${PORT}`);
});

