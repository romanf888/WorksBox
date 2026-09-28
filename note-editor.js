// WorksBox Note Editor Component
function WorksBoxNoteEditor({ 
            note, 
            activeSubjects = [], 
            cloudBreadcrumbs = [], 
            cloudFiles = [],
            onCreateCloudFolder,
            driveToken, 
            activeUser, 
            autosaveStatus, 
            lastSavedTime, 
            notesList = [], 
            onSave, 
            onClose, 
            onDelete, 
            onCreateNew, 
            onOpenNote, 
            onExportPDF, 
            onExportFile,
            showToast 
        }) {
            const [activeTab, setActiveTab] = useState('Accueil');
            const [title, setTitle] = useState(note?.title || 'Nouvelle note');
            const [subject, setSubject] = useState(note?.subject || (activeSubjects[0]?.name || 'Général'));
            const [chapter, setChapter] = useState(note?.chapter || '');
            const [selectedFolder, setSelectedFolder] = useState(note?.folderName || 'WorksBox Cloud');
            const [newFolderNameInput, setNewFolderNameInput] = useState('');
            const [wordCount, setWordCount] = useState(0);
            const [charCount, setCharCount] = useState(0);
            const [editorMode, setEditorMode] = useState('edit'); // 'edit', 'read', 'review'
            const [showComments, setShowComments] = useState(false);
            const [comments, setComments] = useState(() => note?.comments || []);
            const [newCommentText, setNewCommentText] = useState('');
            const [showShareModal, setShowShareModal] = useState(false);
            const [showSearchModal, setShowSearchModal] = useState(false);
            const [searchQuery, setSearchQuery] = useState('');
            const [replaceQuery, setReplaceQuery] = useState('');
            const [isListening, setIsListening] = useState(false);
            const [fontFamily, setFontFamily] = useState('Aptos');
            const [fontSize, setFontSize] = useState('12');
            const [pageZoom, setPageZoom] = useState(100);
            const [pageColor, setPageColor] = useState('#ffffff');
            const [pageWatermark, setPageWatermark] = useState('');
            const [showNotesDrawer, setShowNotesDrawer] = useState(false);
            const editorRef = React.useRef(null);
            const saveDebounceRef = React.useRef(null);
            const recognitionRef = React.useRef(null);

            const noteContentRef = React.useRef(note?.content || '<p>Commencez à rédiger vos notes ici...</p>');

            useEffect(() => {
                if (note) {
                    setTitle(note.title || 'Nouvelle note');
                    setSubject(note.subject || (activeSubjects[0]?.name || 'Général'));
                    setChapter(note.chapter || '');
                    setSelectedFolder(note.folderName || 'WorksBox Cloud');
                    setComments(note.comments || []);
                    noteContentRef.current = note.content || '<p>Commencez à rédiger vos notes ici...</p>';
                }
            }, [note?.id]);

            // Synchronisation et initialisation garantie du contenu et du curseur
            useEffect(() => {
                if (activeTab !== 'Fichier' && editorRef.current) {
                    if (!editorRef.current.innerHTML || editorRef.current.innerHTML.trim() === '') {
                        editorRef.current.innerHTML = noteContentRef.current;
                    }
                    calculateCounts(editorRef.current.innerHTML);
                    // Focus automatique pour faire apparaître le curseur noir clignotant immédiatement
                    if (editorMode !== 'read') {
                        setTimeout(() => {
                            try {
                                editorRef.current?.focus();
                            } catch (e) {}
                        }, 50);
                    }
                }
            }, [activeTab, note?.id, editorMode]);

            const calculateCounts = (html) => {
                const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                setCharCount(text.length);
                setWordCount(text ? text.split(/\s+/).length : 0);
            };

            const triggerAutoSave = (updatedHtml, customTitle = title, customSubj = subject, customChap = chapter, customFolder = selectedFolder, customComments = comments) => {
                calculateCounts(updatedHtml);
                if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
                saveDebounceRef.current = setTimeout(() => {
                    const payload = {
                        ...note,
                        title: customTitle,
                        subject: customSubj,
                        chapter: customChap,
                        content: updatedHtml,
                        folderName: customFolder,
                        comments: customComments,
                        updatedAt: new Date().toISOString()
                    };
                    onSave(payload, true);
                }, 1000);
            };

            const handleEditorInput = () => {
                if (!editorRef.current) return;
                triggerAutoSave(editorRef.current.innerHTML);
            };

            const exec = (cmd, val = null) => {
                document.execCommand(cmd, false, val);
                if (editorRef.current) {
                    editorRef.current.focus();
                    triggerAutoSave(editorRef.current.innerHTML);
                }
            };

            const applyStyleBlock = (tag, color = null, fontSizeStyle = null, weight = null) => {
                if (tag === 'p') {
                    exec('formatBlock', '<p>');
                } else if (tag.startsWith('h')) {
                    exec('formatBlock', `<${tag}>`);
                } else if (tag === 'blockquote') {
                    exec('formatBlock', '<blockquote>');
                }
                if (color) exec('foreColor', color);
            };

            const insertHtmlSnippet = (snippet) => {
                if (window.getSelection) {
                    const sel = window.getSelection();
                    if (sel.getRangeAt && sel.rangeCount) {
                        let range = sel.getRangeAt(0);
                        range.deleteContents();
                        const el = document.createElement("div");
                        el.innerHTML = snippet;
                        const frag = document.createDocumentFragment();
                        let node, lastNode;
                        while ((node = el.firstChild)) {
                            lastNode = frag.appendChild(node);
                        }
                        range.insertNode(frag);
                        if (lastNode) {
                            range = range.cloneRange();
                            range.setStartAfter(lastNode);
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                    }
                } else {
                    document.execCommand('insertHTML', false, snippet);
                }
                if (editorRef.current) {
                    editorRef.current.focus();
                    triggerAutoSave(editorRef.current.innerHTML);
                }
            };

            const insertTable = (rows = 3, cols = 3) => {
                let tbl = `<table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:13px;"><thead><tr>`;
                for (let j = 0; j < cols; j++) {
                    tbl += `<th style="border:1px solid #cbd5e1; padding:8px 12px; background:#f1f5f9; text-align:left; font-weight:bold; color:#1e293b;">En-tête ${j + 1}</th>`;
                }
                tbl += `</tr></thead><tbody>`;
                for (let i = 0; i < rows - 1; i++) {
                    tbl += `<tr>`;
                    for (let j = 0; j < cols; j++) {
                        tbl += `<td style="border:1px solid #cbd5e1; padding:8px 12px; color:#334155;">Donnée</td>`;
                    }
                    tbl += `</tr>`;
                }
                tbl += `</tbody></table><p><br></p>`;
                insertHtmlSnippet(tbl);
            };

            const insertCallout = (type) => {
                let html = '';
                if (type === 'def') {
                    html = `<div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:12px 16px; border-radius:8px; margin:14px 0; color:#1e3a8a;"><strong style="font-size:13px;">📘 Définition :</strong> <p style="margin:4px 0 0 0;">Saisissez la définition ici...</p></div><p><br></p>`;
                } else if (type === 'tip') {
                    html = `<div style="background:#ecfdf5; border-left:4px solid #10b981; padding:12px 16px; border-radius:8px; margin:14px 0; color:#064e3b;"><strong style="font-size:13px;">💡 À retenir :</strong> <p style="margin:4px 0 0 0;">Propriété clé du cours...</p></div><p><br></p>`;
                } else if (type === 'key') {
                    html = `<div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:8px; margin:14px 0; color:#78350f;"><strong style="font-size:13px;">⚡ Formule clé :</strong> <p style="margin:4px 0 0 0;">Ex: f'(x) = 2ax + b ou E = ½ m v²</p></div><p><br></p>`;
                } else if (type === 'warn') {
                    html = `<div style="background:#fff1f2; border-left:4px solid #f43f5e; padding:12px 16px; border-radius:8px; margin:14px 0; color:#881337;"><strong style="font-size:13px;">⚠️ Attention :</strong> <p style="margin:4px 0 0 0;">Attention aux cas particuliers et unités...</p></div><p><br></p>`;
                }
                insertHtmlSnippet(html);
            };

            const generateTableOfContents = () => {
                if (!editorRef.current) return;
                const headings = editorRef.current.querySelectorAll('h1, h2, h3');
                if (headings.length === 0) {
                    if (showToast) showToast('Aucun titre (Titre 1, Titre 2) détecté dans la note pour générer un sommaire.', 'info');
                    return;
                }
                let tocHtml = `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px 20px; margin:16px 0;"><h3 style="margin:0 0 10px 0; font-size:15px; color:#1e40af; font-weight:bold;">📑 Sommaire du document</h3><ul style="list-style:none; padding-left:0; margin:0;">`;
                headings.forEach((h, idx) => {
                    const level = h.tagName.toLowerCase();
                    const indent = level === 'h1' ? '0px' : (level === 'h2' ? '18px' : '36px');
                    const num = level === 'h1' ? `${idx + 1}. ` : '';
                    tocHtml += `<li style="padding:4px 0; margin-left:${indent}; font-size:13px; color:#334155; border-bottom:1px dotted #cbd5e1;">${num}<strong>${h.innerText}</strong></li>`;
                });
                tocHtml += `</ul></div><p><br></p>`;
                insertHtmlSnippet(tocHtml);
                if (showToast) showToast('Sommaire inséré avec succès !', 'success');
            };

            const toggleSpeechRecognition = () => {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    if (showToast) showToast('La reconnaissance vocale n\'est pas supportée par votre navigateur.', 'error');
                    return;
                }
                if (isListening) {
                    if (recognitionRef.current) recognitionRef.current.stop();
                    setIsListening(false);
                } else {
                    try {
                        const rec = new SpeechRecognition();
                        rec.lang = 'fr-FR';
                        rec.continuous = true;
                        rec.interimResults = false;
                        rec.onresult = (e) => {
                            const transcript = e.results[e.results.length - 1][0].transcript;
                            insertHtmlSnippet(`<span>${transcript} </span>`);
                        };
                        rec.onerror = (err) => {
                            console.warn('Speech error:', err);
                            setIsListening(false);
                        };
                        rec.onend = () => setIsListening(false);
                        rec.start();
                        recognitionRef.current = rec;
                        setIsListening(true);
                        if (showToast) showToast('Dictée vocale active : Parlez distinctement...', 'info');
                    } catch (e) {
                        setIsListening(false);
                    }
                }
            };

            const handleSearchReplace = () => {
                if (!searchQuery || !editorRef.current) return;
                const html = editorRef.current.innerHTML;
                const reg = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                const newHtml = html.replace(reg, replaceQuery);
                editorRef.current.innerHTML = newHtml;
                triggerAutoSave(newHtml);
                if (showToast) showToast(`Remplacement effectué pour "${searchQuery}"`, 'success');
                setShowSearchModal(false);
            };

            const handleAddComment = () => {
                if (!newCommentText.trim()) return;
                const newC = {
                    id: Date.now().toString(),
                    author: activeUser?.displayName || 'Élève',
                    text: newCommentText.trim(),
                    createdAt: new Date().toISOString(),
                    resolved: false
                };
                const updated = [...comments, newC];
                setComments(updated);
                setNewCommentText('');
                if (editorRef.current) triggerAutoSave(editorRef.current.innerHTML, title, subject, chapter, selectedFolder, updated);
            };

            const availableFolders = useMemo(() => {
                const set = new Set(['WorksBox Cloud (Racine)', 'Mathématiques', 'Physique-Chimie', 'NSI', 'SVT', 'Histoire-Géographie', 'Français', 'Philosophie', 'Langues']);
                (cloudFiles || []).filter(f => f.mimeType === 'application/vnd.google-apps.folder').forEach(f => set.add(f.name));
                return Array.from(set);
            }, [cloudFiles]);

            const tabs = ['Accueil', 'Insertion', 'Conception', 'Mise en page', 'Références', 'Publipostage', 'Révision', 'Affichage', 'Aide'];

            return (
                <div className="space-y-3 view-transition pb-16 font-sans">
                    {/* BARRE SUPÉRIEURE WORD 365 (Nom du document & État de sauvegarde au-dessus) */}
                    <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-3 sm:px-6 sm:py-3 shadow-md border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3 min-w-0">
                            <button 
                                onClick={onClose}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer flex-shrink-0"
                                title="Retour à WorksBox"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            
                            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm flex-shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="text" 
                                        value={title}
                                        onChange={(e) => {
                                            setTitle(e.target.value);
                                            if (editorRef.current) triggerAutoSave(editorRef.current.innerHTML, e.target.value);
                                        }}
                                        placeholder="Nom du document (ex: Cours de Dérivées...)"
                                        className="text-sm sm:text-base font-extrabold text-white bg-transparent outline-none border-b border-transparent focus:border-sky-400 transition-colors w-full max-w-sm sm:max-w-md truncate"
                                    />
                                </div>
                                <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-400">
                                    {/* Statut de sauvegarde Cloud dynamique */}
                                    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        autosaveStatus === 'saving'
                                            ? 'bg-amber-500/20 text-amber-300'
                                            : driveToken && activeUser && !activeUser.isLocal
                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                : 'bg-sky-500/20 text-sky-300'
                                    }`}>
                                        {autosaveStatus === 'saving' ? (
                                            <>
                                                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                                <span>Enregistrement en cours...</span>
                                            </>
                                        ) : driveToken && activeUser && !activeUser.isLocal ? (
                                            <>
                                                <Cloud className="w-2.5 h-2.5 text-emerald-400" />
                                                <span>Enregistré sur WorksBox Cloud ({lastSavedTime ? new Date(lastSavedTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Synchronisé'})</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-2.5 h-2.5 text-sky-400" />
                                                <span>Enregistré localement</span>
                                            </>
                                        )}
                                    </span>
                                    <span className="hidden sm:inline">•</span>
                                    <button 
                                        onClick={() => setActiveTab('Fichier')}
                                        className="hidden sm:inline-flex items-center text-[11px] text-slate-300 hover:text-sky-300 transition"
                                        title="Changer de dossier dans l'onglet Fichier"
                                    >
                                        <Folder className="w-3 h-3 mr-1 text-indigo-400" />
                                        <span>Dossier : <strong>{selectedFolder}</strong></span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Actions Rapides Supérieures (Commentaires, Mode, Partager, Enregistrer) */}
                        <div className="flex items-center justify-end space-x-2 flex-shrink-0">
                            <button 
                                onClick={() => setShowComments(!showComments)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                                    showComments ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                }`}
                                title="Afficher les commentaires et annotations"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Commentaires</span>
                                {comments.length > 0 && <span className="px-1.5 py-0.2 bg-indigo-500 text-white rounded-full text-[10px]">{comments.length}</span>}
                            </button>

                            <select 
                                value={editorMode}
                                onChange={(e) => setEditorMode(e.target.value)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 outline-none cursor-pointer"
                            >
                                <option value="edit">✏️ Modification</option>
                                <option value="review">📝 Révision</option>
                                <option value="read">👁️ Lecture</option>
                            </select>

                            <button 
                                onClick={() => setShowShareModal(true)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Partager</span>
                            </button>
                        </div>
                    </div>

                    {/* BARRE D'ONGLETS DU RUBAN OFFICE */}
                    <div className="bg-slate-800/90 text-slate-300 rounded-t-2xl px-3 pt-2 border border-b-0 border-slate-700 flex flex-wrap items-center gap-1">
                        <button 
                            onClick={() => setActiveTab('Fichier')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-lg transition flex items-center space-x-1.5 ${
                                activeTab === 'Fichier'
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-blue-700/80 hover:bg-blue-600 text-white'
                            }`}
                        >
                            <span>Fichier</span>
                        </button>
                        {tabs.map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3.5 py-2 text-xs font-bold transition rounded-t-lg ${
                                    activeTab === tab 
                                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold border-b-2 border-blue-600'
                                        : 'hover:bg-slate-700/60 text-slate-300'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* VUE BACKSTAGE : ONGLET FICHIER (CHOISIR NOM, EMPLACEMENT CLOUD, NOUVEAU, OUVRIR, EXPORTER) */}
                    {activeTab === 'Fichier' && (
                        <div className="bg-white dark:bg-slate-900 rounded-b-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl animate-in fade-in space-y-8">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center space-x-3">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl">
                                        <FolderOpen className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Gestion du document & Emplacement Cloud</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Définissez le nom, le dossier Google Drive et les paramètres de votre note.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setActiveTab('Accueil')}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
                                >
                                    <span>⬅ Retour au document</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Panneau 1 : Nom et Emplacement Cloud */}
                                <div className="space-y-6 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center">
                                        <FolderPlus className="w-4 h-4 mr-2 text-blue-500" />
                                        Nom & Emplacement de stockage
                                    </h3>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Nom du document :
                                        </label>
                                        <input 
                                            type="text" 
                                            value={title}
                                            onChange={(e) => {
                                                setTitle(e.target.value);
                                                if (editorRef.current) triggerAutoSave(editorRef.current.innerHTML, e.target.value);
                                            }}
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                                            placeholder="Ex: Chapitre 3 - Suites Numériques"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Dossier de destination (WorksBox Cloud / Google Drive) :
                                        </label>
                                        <select 
                                            value={selectedFolder}
                                            onChange={(e) => {
                                                setSelectedFolder(e.target.value);
                                                if (editorRef.current) triggerAutoSave(editorRef.current.innerHTML, title, subject, chapter, e.target.value);
                                            }}
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                                        >
                                            {availableFolders.map(f => (
                                                <option key={f} value={f}>📁 {f}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Créer un nouveau sous-dossier Cloud :
                                        </label>
                                        <div className="flex space-x-2">
                                            <input 
                                                type="text" 
                                                value={newFolderNameInput}
                                                onChange={(e) => setNewFolderNameInput(e.target.value)}
                                                placeholder="Nom du nouveau dossier..."
                                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-blue-500"
                                            />
                                            <button 
                                                onClick={async () => {
                                                    if (!newFolderNameInput.trim()) return;
                                                    if (onCreateCloudFolder) await onCreateCloudFolder(newFolderNameInput.trim());
                                                    setSelectedFolder(newFolderNameInput.trim());
                                                    if (editorRef.current) triggerAutoSave(editorRef.current.innerHTML, title, subject, chapter, newFolderNameInput.trim());
                                                    setNewFolderNameInput('');
                                                    if (showToast) showToast(`Dossier "${newFolderNameInput.trim()}" créé et sélectionné !`, 'success');
                                                }}
                                                className="px-3.5 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
                                            >
                                                Créer
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Matière :
                                            </label>
                                            <select 
                                                value={subject}
                                                onChange={(e) => {
                                                    setSubject(e.target.value);
                                                    if (editorRef.current) triggerAutoSave(editorRef.current.innerHTML, title, e.target.value);
                                                }}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                                            >
                                                <option value="Général">Général</option>
                                                {activeSubjects.map(s => <option key={s.name || s} value={s.name || s}>{s.name || s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Chapitre / Thème :
                                            </label>
                                            <input 
                                                type="text" 
                                                value={chapter}
                                                onChange={(e) => {
                                                    setChapter(e.target.value);
                                                    if (editorRef.current) triggerAutoSave(editorRef.current.innerHTML, title, subject, e.target.value);
                                                }}
                                                placeholder="Ex: Chapitre 2"
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Panneau 2 : Actions et Exportations */}
                                <div className="space-y-6 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center">
                                        <FileDown className="w-4 h-4 mr-2 text-indigo-500" />
                                        Actions & Exportations
                                    </h3>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => onCreateNew()}
                                            className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-left transition flex items-center space-x-2.5 cursor-pointer shadow-2xs"
                                        >
                                            <FilePlus className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                            <div>
                                                <strong className="block text-xs font-bold text-slate-900 dark:text-white">Nouveau</strong>
                                                <span className="text-[11px] text-slate-500">Document vierge</span>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => setShowNotesDrawer(true)}
                                            className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-left transition flex items-center space-x-2.5 cursor-pointer shadow-2xs"
                                        >
                                            <FolderOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                            <div>
                                                <strong className="block text-xs font-bold text-slate-900 dark:text-white">Ouvrir</strong>
                                                <span className="text-[11px] text-slate-500">{notesList.length} notes</span>
                                            </div>
                                        </button>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="text-xs font-bold text-slate-400 block mb-2">Télécharger / Exporter sous :</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button 
                                                onClick={() => onExportFile(note, 'html')}
                                                className="p-2.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold rounded-xl text-xs flex flex-col items-center justify-center text-center transition"
                                            >
                                                <FileText className="w-4 h-4 mb-1" />
                                                <span>Word (.docx/html)</span>
                                            </button>
                                            <button 
                                                onClick={() => onExportPDF(note)}
                                                className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs flex flex-col items-center justify-center text-center transition"
                                            >
                                                <Printer className="w-4 h-4 mb-1" />
                                                <span>PDF Imprimable</span>
                                            </button>
                                            <button 
                                                onClick={() => onExportFile(note, 'txt')}
                                                className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-xs flex flex-col items-center justify-center text-center transition"
                                            >
                                                <Calculator className="w-4 h-4 mb-1" />
                                                <span>Casio (.txt)</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200 dark:border-slate-700">
                                        <div>
                                            <span>Mots : <strong>{wordCount}</strong></span>
                                            <span className="mx-2">•</span>
                                            <span>Caractères : <strong>{charCount}</strong></span>
                                        </div>
                                        <button 
                                            onClick={() => onDelete(note.id)}
                                            className="text-rose-500 hover:text-rose-700 font-bold transition flex items-center space-x-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Supprimer la note</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONTENU DU RUBAN SELON L'ONGLET ACTIF (ACCUEIL, INSERTION, CONCEPTION, ETC.) */}
                    {activeTab !== 'Fichier' && (
                        <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-sm backdrop-blur-md sticky top-16 z-20 overflow-x-auto">
                            {/* ONGLET ACCUEIL (RUBAN WORD COMPLET DU SCREENSHOT) */}
                            {activeTab === 'Accueil' && (
                                <div className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-200 min-w-max">
                                    {/* SECTION 1 : PRESSE-PAPIERS */}
                                    <div className="flex flex-col items-center justify-between border-r border-slate-200 dark:border-slate-700 pr-2 space-y-1">
                                        <div className="flex items-center space-x-1">
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        const text = await navigator.clipboard.readText();
                                                        insertHtmlSnippet(`<span>${text}</span>`);
                                                    } catch(e) {
                                                        exec('paste');
                                                    }
                                                }}
                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex flex-col items-center" 
                                                title="Coller (Ctrl+V)"
                                            >
                                                <Clipboard className="w-4 h-4 text-amber-600" />
                                                <span className="text-[9px] font-bold mt-0.5">Coller</span>
                                            </button>
                                            <div className="flex flex-col space-y-0.5">
                                                <button onClick={() => exec('cut')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Couper (Ctrl+X)"><Scissors className="w-3.5 h-3.5 text-slate-500" /></button>
                                                <button onClick={() => exec('copy')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Copier (Ctrl+C)"><Copy className="w-3.5 h-3.5 text-slate-500" /></button>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400">Presse-papiers</span>
                                    </div>

                                    {/* SECTION 2 : POLICE */}
                                    <div className="flex flex-col justify-between border-r border-slate-200 dark:border-slate-700 px-2 space-y-1">
                                        <div className="flex items-center space-x-1.5">
                                            <select 
                                                value={fontFamily}
                                                onChange={(e) => {
                                                    setFontFamily(e.target.value);
                                                    exec('fontName', e.target.value);
                                                }}
                                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none"
                                            >
                                                <option value="Aptos">Aptos (Corps)</option>
                                                <option value="Arial">Arial</option>
                                                <option value="Calibri">Calibri</option>
                                                <option value="Times New Roman">Times New Roman</option>
                                                <option value="Roboto">Roboto</option>
                                                <option value="Georgia">Georgia</option>
                                                <option value="Courier New">Courier New</option>
                                            </select>

                                            <select 
                                                value={fontSize}
                                                onChange={(e) => {
                                                    setFontSize(e.target.value);
                                                    exec('fontSize', e.target.value === '12' ? '3' : (parseInt(e.target.value, 10) > 16 ? '5' : '2'));
                                                }}
                                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none"
                                            >
                                                {['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '36', '48', '72'].map(sz => (
                                                    <option key={sz} value={sz}>{sz}</option>
                                                ))}
                                            </select>

                                            <button onClick={() => exec('removeFormat')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Effacer la mise en forme"><Eraser className="w-3.5 h-3.5 text-rose-500" /></button>
                                        </div>

                                        <div className="flex items-center space-x-1">
                                            <button onClick={() => exec('bold')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-black" title="Gras (Ctrl+B)"><strong>G</strong></button>
                                            <button onClick={() => exec('italic')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded italic font-serif" title="Italique (Ctrl+I)"><em>I</em></button>
                                            <button onClick={() => exec('underline')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded underline" title="Souligné (Ctrl+U)"><u>S</u></button>
                                            <button onClick={() => exec('strikeThrough')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded line-through" title="Barré">ab</button>
                                            <button onClick={() => exec('subscript')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[11px]" title="Indice">x₂</button>
                                            <button onClick={() => exec('superscript')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[11px]" title="Exposant">x²</button>
                                            
                                            {/* Surlignage */}
                                            <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                                <Highlighter className="w-3 h-3 text-slate-500 mr-0.5" />
                                                {['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8'].map(c => (
                                                    <button key={c} onClick={() => exec('hiliteColor', c)} style={{ backgroundColor: c }} className="w-3 h-3 rounded-full border border-black/10" />
                                                ))}
                                            </div>

                                            {/* Couleur de texte */}
                                            <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                                <span className="font-extrabold text-[11px] mr-0.5">A</span>
                                                {['#1e293b', '#2563eb', '#dc2626', '#16a34a'].map(c => (
                                                    <button key={c} onClick={() => exec('foreColor', c)} style={{ backgroundColor: c }} className="w-3 h-3 rounded-full" />
                                                ))}
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 text-center">Police</span>
                                    </div>

                                    {/* SECTION 3 : PARAGRAPHE */}
                                    <div className="flex flex-col justify-between border-r border-slate-200 dark:border-slate-700 px-2 space-y-1">
                                        <div className="flex items-center space-x-1">
                                            <button onClick={() => exec('insertUnorderedList')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Puces"><List className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => exec('insertOrderedList')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Numérotation"><ListOrdered className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => exec('outdent')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Diminuer le retrait">⬅</button>
                                            <button onClick={() => exec('indent')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Augmenter le retrait">➡</button>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <button onClick={() => exec('justifyLeft')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Aligner à gauche"><AlignLeft className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => exec('justifyCenter')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Centrer"><AlignCenter className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => exec('justifyRight')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Aligner à droite"><AlignRight className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => exec('justifyFull')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Justifier"><AlignJustify className="w-3.5 h-3.5" /></button>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 text-center">Paragraphe</span>
                                    </div>

                                    {/* SECTION 4 : GALERIE DE STYLES WORD */}
                                    <div className="flex flex-col justify-between border-r border-slate-200 dark:border-slate-700 px-2 space-y-1">
                                        <div className="flex items-center space-x-1.5">
                                            <button 
                                                onClick={() => applyStyleBlock('p')}
                                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                            >
                                                Normal
                                            </button>
                                            <button 
                                                onClick={() => applyStyleBlock('h1', '#2B579A')}
                                                className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 text-[#2B579A] dark:text-blue-300 font-extrabold rounded-lg text-xs border border-blue-200 dark:border-blue-800"
                                            >
                                                Titre 1
                                            </button>
                                            <button 
                                                onClick={() => applyStyleBlock('h2', '#41719C')}
                                                className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/70 hover:bg-sky-100 text-[#41719C] dark:text-sky-300 font-bold rounded-lg text-xs border border-sky-200 dark:border-sky-800"
                                            >
                                                Titre 2
                                            </button>
                                            <button 
                                                onClick={() => applyStyleBlock('blockquote')}
                                                className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 italic rounded-lg text-xs border border-slate-200 dark:border-slate-700"
                                            >
                                                Citation
                                            </button>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 text-center">Styles</span>
                                    </div>

                                    {/* SECTION 5 : ÉDITION & RECHERCHE */}
                                    <div className="flex flex-col justify-between border-r border-slate-200 dark:border-slate-700 px-2 space-y-1">
                                        <div className="flex flex-col space-y-1">
                                            <button onClick={() => setShowSearchModal(true)} className="flex items-center space-x-1 text-[11px] font-bold hover:text-blue-600 transition">
                                                <Search className="w-3 h-3 text-blue-500" />
                                                <span>Rechercher</span>
                                            </button>
                                            <button onClick={() => setShowSearchModal(true)} className="flex items-center space-x-1 text-[11px] font-bold hover:text-blue-600 transition">
                                                <RefreshCw className="w-3 h-3 text-emerald-500" />
                                                <span>Remplacer</span>
                                            </button>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 text-center">Édition</span>
                                    </div>

                                    {/* SECTION 6 : VOIX (DICTÉE VOCALE) */}
                                    <div className="flex flex-col items-center justify-between border-r border-slate-200 dark:border-slate-700 px-2 space-y-1">
                                        <button 
                                            onClick={toggleSpeechRecognition}
                                            className={`p-2 rounded-xl flex flex-col items-center transition ${
                                                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                                            }`}
                                            title="Dicter du texte au micro (Speech-to-Text)"
                                        >
                                            <Mic className="w-4 h-4 text-blue-500" />
                                            <span className="text-[9px] font-bold mt-0.5">{isListening ? 'Écoute...' : 'Dicter'}</span>
                                        </button>
                                        <span className="text-[9px] font-bold text-slate-400">Voix</span>
                                    </div>

                                    {/* SECTION 7 : RÉDACTEUR & ENCADRÉS */}
                                    <div className="flex flex-col justify-between px-2 space-y-1">
                                        <div className="flex items-center space-x-1">
                                            <button onClick={() => insertCallout('def')} className="px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded text-[11px]">📘 Définition</button>
                                            <button onClick={() => insertCallout('tip')} className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded text-[11px]">💡 À retenir</button>
                                            <button onClick={() => insertCallout('key')} className="px-2 py-1 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold rounded text-[11px]">⚡ Formule</button>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 text-center">Rédacteur & Étude</span>
                                    </div>
                                </div>
                            )}

                            {/* ONGLET INSERTION */}
                            {activeTab === 'Insertion' && (
                                <div className="flex items-center space-x-3 text-xs text-slate-700 dark:text-slate-300 min-w-max">
                                    <button onClick={() => insertTable(3, 3)} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold flex items-center space-x-1.5">
                                        <TableIcon className="w-4 h-4 text-blue-500" />
                                        <span>Tableau 3x3</span>
                                    </button>
                                    <button onClick={() => {
                                        const url = prompt('URL de l\'image :');
                                        if (url) insertHtmlSnippet(`<img src="${url}" style="max-width:100%; border-radius:8px; margin:12px 0;" alt="Illustration" /><p><br></p>`);
                                    }} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold flex items-center space-x-1.5">
                                        <ImageIcon className="w-4 h-4 text-emerald-500" />
                                        <span>Image</span>
                                    </button>
                                    <button onClick={() => {
                                        const url = prompt('Lien web :');
                                        if (url) insertHtmlSnippet(`<a href="${url}" target="_blank" style="color:#2563eb; text-decoration:underline;">${url}</a> `);
                                    }} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold flex items-center space-x-1.5">
                                        <ExternalLink className="w-4 h-4 text-sky-500" />
                                        <span>Lien</span>
                                    </button>
                                    <button onClick={() => insertHtmlSnippet('<hr style="border:0; border-top:1px solid #cbd5e1; margin:20px 0;"/><p><br></p>')} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold flex items-center space-x-1.5">
                                        <span>Séparateur</span>
                                    </button>
                                    <button onClick={() => insertHtmlSnippet(`<span>${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span> `)} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold flex items-center space-x-1.5">
                                        <Clock className="w-4 h-4 text-amber-500" />
                                        <span>Date du jour</span>
                                    </button>
                                    <button onClick={() => insertHtmlSnippet('<div style="page-break-after:always; border-bottom:2px dashed #94a3b8; margin:30px 0; text-align:center; color:#94a3b8; font-size:11px;">--- Saut de page ---</div><p><br></p>')} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold flex items-center space-x-1.5">
                                        <span>Saut de page</span>
                                    </button>
                                </div>
                            )}

                            {/* ONGLET RÉFÉRENCES */}
                            {activeTab === 'Références' && (
                                <div className="flex items-center space-x-3 text-xs text-slate-700 dark:text-slate-300 min-w-max">
                                    <button onClick={generateTableOfContents} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm">
                                        <BookMarked className="w-4 h-4" />
                                        <span>Générer Table des matières automatique</span>
                                    </button>
                                    <button onClick={() => insertHtmlSnippet('<sup style="color:#2563eb; font-weight:bold;">[1]</sup>')} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold">
                                        Note de bas de page [1]
                                    </button>
                                </div>
                            )}

                            {/* ONGLET CONCEPTION */}
                            {activeTab === 'Conception' && (
                                <div className="flex items-center space-x-3 text-xs text-slate-700 dark:text-slate-300 min-w-max">
                                    <span className="font-bold text-slate-400">Fond de page :</span>
                                    {['#ffffff', '#f8fafc', '#fefce8', '#f1f5f9', '#1e293b'].map(bg => (
                                        <button key={bg} onClick={() => setPageColor(bg)} style={{ backgroundColor: bg }} className="w-6 h-6 rounded-full border border-slate-400 shadow-xs" title="Couleur de page" />
                                    ))}
                                    <div className="h-4 w-px bg-slate-300 dark:border-slate-700 mx-2"></div>
                                    <span className="font-bold text-slate-400">Filigrane :</span>
                                    {['', 'BROUILLON', 'URGENT', 'CONFIDENTIEL'].map(wm => (
                                        <button key={wm} onClick={() => setPageWatermark(wm)} className={`px-2.5 py-1 rounded-lg font-bold ${pageWatermark === wm ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            {wm || 'Aucun'}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* ONGLET AFFICHAGE */}
                            {activeTab === 'Affichage' && (
                                <div className="flex items-center space-x-3 text-xs text-slate-700 dark:text-slate-300 min-w-max">
                                    <span className="font-bold text-slate-400">Zoom du document :</span>
                                    {[75, 90, 100, 125, 150].map(z => (
                                        <button key={z} onClick={() => setPageZoom(z)} className={`px-2.5 py-1 rounded-lg font-bold ${pageZoom === z ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            {z}%
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* AUTRES ONGLETS (PUBLIPOSTAGE, RÉVISION, MISE EN PAGE, AIDE) */}
                            {['Mise en page', 'Publipostage', 'Révision', 'Aide'].includes(activeTab) && (
                                <div className="flex items-center space-x-3 text-xs text-slate-700 dark:text-slate-300 min-w-max">
                                    {activeTab === 'Publipostage' && (
                                        <>
                                            <button onClick={() => insertCallout('def')} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 font-bold rounded-lg text-blue-600">Modèle Fiche Révision Bac</button>
                                            <button onClick={() => insertCallout('key')} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950 font-bold rounded-lg text-amber-700">Modèle Formulaire Maths</button>
                                        </>
                                    )}
                                    {activeTab === 'Révision' && (
                                        <div className="flex items-center space-x-4">
                                            <span>Mots : <strong>{wordCount}</strong></span>
                                            <span>Caractères : <strong>{charCount}</strong></span>
                                            <span>Temps de lecture estimé : <strong>{Math.ceil(wordCount / 200)} min</strong></span>
                                        </div>
                                    )}
                                    {activeTab === 'Mise en page' && (
                                        <div className="flex items-center space-x-2">
                                            <span className="font-bold text-slate-400">Orientation :</span>
                                            <button className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold">📄 Portrait (A4)</button>
                                        </div>
                                    )}
                                    {activeTab === 'Aide' && (
                                        <div className="text-xs text-slate-500">
                                            Raccourcis : <strong>Ctrl+B</strong> (Gras), <strong>Ctrl+I</strong> (Italique), <strong>Ctrl+U</strong> (Souligné), <strong>Ctrl+Z</strong> (Annuler).
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FEUILLE DE RÉDACTION DOCUMENT WORD (STYLE FEUILLE A4 RÉALISTE) */}
                    {activeTab !== 'Fichier' && (
                        <div className="bg-slate-100 dark:bg-slate-950/70 p-2 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 flex justify-center items-start gap-6 relative min-h-[700px]">
                            {/* FEUILLE WORD */}
                            <div 
                                onClick={() => {
                                    if (editorMode !== 'read' && editorRef.current) {
                                        editorRef.current.focus();
                                    }
                                }}
                                style={{ 
                                    backgroundColor: pageColor, 
                                    transform: `scale(${pageZoom / 100})`, 
                                    transformOrigin: 'top center',
                                    cursor: editorMode !== 'read' ? 'text' : 'default'
                                }}
                                className="w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-14 min-h-[750px] flex flex-col justify-between relative transition-transform cursor-text"
                            >
                                {pageWatermark && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 select-none">
                                        <span className="text-7xl sm:text-9xl font-black rotate-[-35deg] text-slate-900 dark:text-white uppercase tracking-widest">{pageWatermark}</span>
                                    </div>
                                )}

                                <div 
                                    ref={editorRef}
                                    contentEditable={editorMode !== 'read'}
                                    onInput={handleEditorInput}
                                    suppressContentEditableWarning={true}
                                    tabIndex={0}
                                    className="outline-none text-slate-900 dark:text-slate-900 text-sm sm:text-base leading-relaxed min-h-[600px] w-full block focus:outline-none"
                                    style={{ 
                                        wordBreak: 'break-word', 
                                        fontFamily: fontFamily,
                                        fontSize: `${fontSize}pt`,
                                        caretColor: '#000000',
                                        cursor: 'text',
                                        userSelect: 'text',
                                        WebkitUserSelect: 'text'
                                    }}
                                />

                                {/* Pied de page Word */}
                                <div className="pt-6 mt-8 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 dark:text-slate-500 gap-3">
                                    <div>
                                        <span>Page 1 / 1</span>
                                        <span className="mx-2">•</span>
                                        <span>{wordCount} mots</span>
                                        <span className="mx-2">•</span>
                                        <span>{charCount} caractères</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span>Français (France)</span>
                                        <span>•</span>
                                        <span>WorksBox Note</span>
                                    </div>
                                </div>
                            </div>

                            {/* VOLET LATÉRAL DE COMMENTAIRES */}
                            {showComments && (
                                <div className="w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-lg space-y-4 animate-in slide-in-from-right flex-shrink-0">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center">
                                            <MessageSquare className="w-4 h-4 mr-1.5 text-blue-500" />
                                            Commentaires ({comments.length})
                                        </h4>
                                        <button onClick={() => setShowComments(false)} className="text-slate-400 hover:text-slate-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                                        {comments.length === 0 ? (
                                            <p className="text-xs text-slate-400 py-6 text-center">Aucun commentaire sur cette note.</p>
                                        ) : (
                                            comments.map(c => (
                                                <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 text-xs space-y-1">
                                                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                                                        <span>{c.author}</span>
                                                        <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
                                                    </div>
                                                    <p className="text-slate-600 dark:text-slate-300">{c.text}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                        <textarea 
                                            value={newCommentText}
                                            onChange={(e) => setNewCommentText(e.target.value)}
                                            placeholder="Ajouter une remarque..."
                                            className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500 resize-none h-18"
                                        />
                                        <button 
                                            onClick={handleAddComment}
                                            className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition"
                                        >
                                            Publier le commentaire
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MODAL RECHERCHER & REMPLACER */}
                    {showSearchModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                                        <Search className="w-4 h-4 mr-2 text-blue-500" />
                                        Rechercher & Remplacer
                                    </h3>
                                    <button onClick={() => setShowSearchModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Texte à rechercher :</label>
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Remplacer par :</label>
                                    <input type="text" value={replaceQuery} onChange={(e) => setReplaceQuery(e.target.value)} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold outline-none" />
                                </div>
                                <div className="flex justify-end space-x-2 pt-2">
                                    <button onClick={() => setShowSearchModal(false)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">Annuler</button>
                                    <button onClick={handleSearchReplace} className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold">Remplacer tout</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL PARTAGER */}
                    {showShareModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                                        <Share2 className="w-4 h-4 mr-2 text-blue-500" />
                                        Partager la note
                                    </h3>
                                    <button onClick={() => setShowShareModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Copiez le lien ou le contenu pour le partager avec vos camarades de classe.</p>
                                <div className="space-y-2">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/#note=${note.id}`);
                                            if (showToast) showToast('Lien copié dans le presse-papiers !', 'success');
                                            setShowShareModal(false);
                                        }}
                                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copier le lien direct</span>
                                    </button>
                                    <button 
                                        onClick={() => {
                                            onExportPDF(note);
                                            setShowShareModal(false);
                                        }}
                                        className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>Exporter en PDF propre</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TIROIR DE LA LISTE DE TOUTES LES NOTES */}
                    {showNotesDrawer && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                                        <FileText className="w-5 h-5 text-blue-500 mr-2" />
                                        Mes Notes ({notesList.length})
                                    </h3>
                                    <button onClick={() => setShowNotesDrawer(false)}><X className="w-5 h-5 text-slate-400" /></button>
                                </div>
                                <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                                    {notesList.length === 0 ? (
                                        <p className="py-8 text-center text-xs text-slate-400">Aucune note pour l'instant.</p>
                                    ) : (
                                        notesList.map(n => (
                                            <div key={n.id} className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-3 rounded-xl transition">
                                                <div className="min-w-0 pr-3 cursor-pointer" onClick={() => { onOpenNote(n); setShowNotesDrawer(false); setActiveTab('Accueil'); }}>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{n.title}</h4>
                                                    <span className="text-[11px] text-slate-400">{n.subject} • 📁 {n.folderName || 'WorksBox Cloud'}</span>
                                                </div>
                                                <button onClick={() => { onOpenNote(n); setShowNotesDrawer(false); setActiveTab('Accueil'); }} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">Ouvrir</button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // === HUB DE LOGICIELS WORKSBOX (Inspiré de l'application Microsoft 365 / Windows Office Hub) ===
        
window.WorksBoxNoteEditor = WorksBoxNoteEditor;
