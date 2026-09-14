import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
        const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
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

// Serve static files from the root directory
app.use(express.static(__dirname));

// Admin Dashboard route
app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Fallback to index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WorksBox server running on http://0.0.0.0:${PORT}`);
});

