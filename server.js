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
    const cleanExt = rawName.replace(/\.(pdf|docx?|pptx?|odt|txt|g1m|zip)$/i, '');
    
    // Determine tag
    let tag = 'Cours';
    if (/\btp\b|travaux.*pratique/i.test(cleanExt)) tag = 'TP';
    else if (/\btd\b|travaux.*dirige/i.test(cleanExt)) tag = 'TD';
    else if (/fiche|synthese|recap|resume/i.test(cleanExt)) tag = 'Fiche';
    else if (/formulaire|aide.*memoire/i.test(cleanExt)) tag = 'Formulaire';
    else if (/exo|exercice|corrige|devoir|dm|ds/i.test(cleanExt)) tag = 'Exercices';

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

    const digitalLink = file.url || file.digitalLink || (file.id ? `https://drive.google.com/file/d/${file.id}/view` : '');
    const isCasioFile = /\.g1m$|\.txt$/i.test(rawName);

    return {
      id: `imported-${Date.now()}-${index}`,
      title: cleanedTitle,
      subject: subject || 'Mathématiques',
      chapter: chapter,
      chapterOrder: chapterNumber,
      courseOrder: index + 1,
      tag: tag,
      school: defaultSchool,
      classe: defaultClass,
      digitalLink: isCasioFile ? '' : digitalLink,
      casioLink: isCasioFile ? digitalLink : '',
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

    // 2. Extract files / links from raw text or Google Drive URLs
    const textToScan = `${driveUrl}\n${rawText}`.trim();
    if (textToScan) {
      const lines = textToScan.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      
      // Look for Google Drive file links in the text
      const driveFileRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g;
      const allDriveFileMatches = [...textToScan.matchAll(driveFileRegex)];

      lines.forEach(line => {
        // Check if line is just a link or has filename + link
        const driveMatch = line.match(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        const url = driveMatch ? driveMatch[0] + '/view' : '';
        const id = driveMatch ? driveMatch[1] : '';

        // Remove URL from line to get filename
        let potentialName = line.replace(/https:\/\/drive\.google\.com\S+/g, '').trim();
        potentialName = potentialName.replace(/[()\[\]]/g, '').trim();

        if (!potentialName && driveMatch) {
          potentialName = `Document Drive (${id.slice(0, 6)})`;
        }

        if (potentialName || url) {
          extractedFiles.push({
            name: potentialName || `Document ${extractedFiles.length + 1}`,
            url: url,
            id: id
          });
        }
      });
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

    // Filter out duplicates and empty items
    const uniqueFilesMap = new Map();
    extractedFiles.forEach(f => {
      const key = `${f.name}__${f.url}`;
      if (f.name && !uniqueFilesMap.has(key)) {
        uniqueFilesMap.set(key, f);
      }
    });
    const finalFiles = Array.from(uniqueFilesMap.values());

    if (finalFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Aucun fichier détecté. Veuillez fournir un lien de dossier Google Drive, coller des liens ou la liste des noms de fichiers."
      });
    }

    // Baseline heuristic classification
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
Voici la liste brute de ${finalFiles.length} fichier(s) scolaires issus de Google Drive :
${JSON.stringify(finalFiles.map((f, i) => ({ index: i, name: f.name, url: f.url })), null, 2)}

Contexte :
- Établissement : "${targetSchool}"
- Classe : "${targetClass}"
- Matière souhaitée / hint : "${targetSubject || 'À déduire automatiquement des titres ou du contenu'}"

Pour CHAQUE fichier, analyse scrupuleusement le nom et le contexte pour produire :
1. "title" : Titre propre, élégant, débarrassé des extensions (.pdf, .g1m, .txt, etc.), sans underscores, avec accents et typographie soignée.
2. "subject" : Matière scolaire (ex: "Mathématiques", "Physique Chimie", "SIN", "ITEC", "Philosophie", "Anglais", etc.).
3. "chapter" : Chapitre exact (ex: "Chapitre 1 : Les Suites numériques", "Chapitre 2 : Cinématique et Mouvements"). Tous les cours d'un même chapitre doivent avoir EXACTEMENT le même intitulé de chapitre.
4. "tag" : Un tag parmi "Cours", "TP", "TD", "Fiche", "Formulaire", "Exercices".
5. "digitalLink" : Le lien Google Drive (ou conserve l'URL fournie).
6. "casioLink" : Si le fichier est un fichier calculatrice (.txt ou .g1m), mettre le lien ici.
7. "chapterOrder" : Entier du numéro de chapitre (ex: 1, 2, 3...).
8. "courseOrder" : Entier du numéro de cours dans le chapitre.

Renvoie UNIQUEMENT un tableau JSON valide contenant les objets structurés.`;

        // Add 12s timeout for safety
        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout Gemini')), 12000)
        );

        const aiResponse = await Promise.race([geminiPromise, timeoutPromise]);
        const text = aiResponse.text?.trim();

        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const aiCourses = parsed.map((item, idx) => {
              const base = baselineCourses[idx] || baselineCourses[0];
              const isCasio = /\.g1m$|\.txt$/i.test(item.originalFilename || base.originalFilename || '');
              return {
                id: `drive-ai-${Date.now()}-${idx}`,
                title: item.title || base.title,
                subject: item.subject || base.subject,
                chapter: item.chapter || base.chapter,
                chapterOrder: typeof item.chapterOrder === 'number' ? item.chapterOrder : base.chapterOrder,
                courseOrder: typeof item.courseOrder === 'number' ? item.courseOrder : (idx + 1),
                tag: item.tag || base.tag,
                school: targetSchool,
                classe: targetClass,
                digitalLink: item.digitalLink || (isCasio ? '' : base.digitalLink),
                casioLink: item.casioLink || (isCasio ? base.digitalLink : ''),
                viewsDigital: 0,
                viewsCasio: 0,
                isVisible: true,
                originalFilename: base.originalFilename
              };
            });

            return res.json({
              success: true,
              source: 'gemini-ai',
              courses: aiCourses,
              total: aiCourses.length
            });
          }
        }
      } catch (geminiError) {
        console.warn('Gemini classification notice:', geminiError.message);
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

