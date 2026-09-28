// WorksBox Constants & Default Data
const DEFAULT_TERMS_FALLBACK = `Bienvenue sur WorksBox, la plateforme pour récupérer ses cours ou revevoir une version calculatrice. En utilisant ce site, vous acceptez les conditions suivantes :

1. Utilisation des cours sur calculatrice Casio Graph 35+EII
L'utilisation des cours sur calculatrice est autorisée lors de simples exercices en classe ou d'évaluations (seulement si l'enseignant n'exige pas le "MODE EXAMEN"), lors d'épreuves nationales comme le BAC par exemple, l'utilisation des logiciels seront interdits et le "MODE EXAMEN" est obligatoire, pour tout utilisation de programmes sur calculatrice lors d'épreuves, le site WorksBox ne sera pas tenu responsable des conséquences arrivés lors de ces épreuves.

2. Contenu des cours sur WorksBox
WorksBox ne peut pas garantir la possession de l'entièreté des cours fournis par le lycée François Bazin. Dans ce genre de cas, l'utilisation de vos cours personnelles est recommandée.

3. Demande d'hébergement d'un fichier
Il est possible que vous possédiez un fichier comme un cours ou un autre type de document que WorksBox ne possède pas, si vous souhaiteriez son hébergement sur la plateforme, veuillez nous contacter via par mail : roman.ferriere4@gmail.com

4. Utilisation de l'Intelligence Artificielle (IA)
La version des cours sur calculatrice Casio Graph 35+EII à été adaptée par l'IA Gemini 3 pro pour une compatibilité optimale des cours en mode calculatrice.`;

        const DEFAULT_CASIO_FALLBACK = `Comment mettre des cours sur calculatrice Casio Graph 35+EII ?

1. Le matériel pré-requis pour démarrer
Vous aurez besoin d'une calculatrice Casio Graph 35+EII, d'un câble Mini USB (Souvent fourni avec la calculatrice) et d'un ordinateur avec un port USB 2.0 ou supérieur.

2. Télécharger les fichiers adaptés pour calculatrice
Téléchargez les fichiers au format .txt ou .g1m depuis WorksBox (en cliquant sur "Version Casio"). Ces fichiers ont déjà été formatés spécifiquement pour être parfaitement lisibles sur le petit écran de votre calculatrice, sans couper les mots.

3. Mettre le fichier dans sa calculatrice
• Branchez votre calculatrice à votre ordinateur via le câble USB.
• Sur l'écran de la calculatrice, un menu apparaît. Choisissez Mode connexion : Clé USB (appuyer sur F1 pour sélectionner).
• La calculatrice va apparaître sur votre ordinateur comme une clé USB classique.
• Ouvrez ce lecteur depuis votre ordinateur, et allez dans le dossier @MainMem, une fois dedans, vous devriez voir un dossier PROGRAM (si vous ne le voyez pas, créé le vous même).
• Une fois dans le dossier PROGRAM, copiez-collez les fichiers téléchargés depuis WorksBox. Attendez que le transfert soit terminé avant de déconnecter la calculatrice.
• Une fois terminé, déconnectez proprement le câble. Sur la calculatrice, allez dans le menu et sélectionnez "PROGR" et appuyez sur F2 pour lire vos cours.`;

        const COLOR_PALETTES = {
            blue: 'bg-blue-100 text-blue-700 border-blue-200',
            purple: 'bg-purple-100 text-purple-700 border-purple-200',
            orange: 'bg-orange-100 text-orange-700 border-orange-200',
            rose: 'bg-rose-100 text-rose-700 border-rose-200',
            red: 'bg-red-100 text-red-700 border-red-200',
            green: 'bg-green-100 text-green-700 border-green-200',
            teal: 'bg-teal-100 text-teal-700 border-teal-200',
            slate: 'bg-slate-100 text-slate-700 border-slate-200'
        };

        const DEFAULT_SUBJECTS = [
            "Allemand", "Anglais", "Enseignement technologique en anglais", 
            "Histoire Géographie", "Ingénierie et développement durable", 
            "Mathématiques", "Philosophie", "Physique Chimie", "SIN",
            "Français", "SVT", "Sciences Numériques et Technologiques", "Histoire-Géographie et EMC",
            "BLOC 3 CYBER (DALLA-ROSA)", "CULTURE ECO JUR MANAG"
        ];
        const DEFAULT_SCHOOLS = ["Lycée François Bazin", "Lycée Gaspard Monge"];
        const DEFAULT_CLASSES = ["Terminale STI2D", "Première STI2D", "BTS SIO 1", "BTS CPRP", "Seconde Générale/Technologique"];

        const DEFAULT_SCHOOL_CLASSES = {
            "Lycée François Bazin": ["Terminale STI2D", "Première STI2D", "BTS CPRP", "Seconde Générale/Technologique"],
            "Lycée Gaspard Monge": ["BTS SIO 1"]
        };

        const DEFAULT_SCHOOL_CLASS_SUBJECTS = {
            "Lycée François Bazin__Terminale STI2D": [
                "Mathématiques", "Physique Chimie", "Ingénierie et développement durable", 
                "Philosophie", "Anglais", "Enseignement technologique en anglais", "SIN", "Allemand"
            ],
            "Lycée François Bazin__Première STI2D": [
                "Mathématiques", "Physique Chimie", "Ingénierie et développement durable", 
                "Français", "Histoire Géographie", "Anglais", "Allemand"
            ],
            "Lycée François Bazin__BTS CPRP": [
                "Anglais", "Mathématiques", "Conception et Industrialisation", "Usinage et FAO"
            ],
            "Lycée François Bazin__Seconde Générale/Technologique": [
                "Mathématiques", "Français", "Histoire-Géographie et EMC", "SVT", 
                "Physique Chimie", "Sciences Numériques et Technologiques", "Anglais", "Allemand"
            ],
            "Lycée Gaspard Monge__BTS SIO 1": [
                "BLOC 3 CYBER (DALLA-ROSA)", "CULTURE ECO JUR MANAG", "Mathématiques", "Anglais"
            ]
        };

        const DEFAULT_CLASS_SUBJECTS = {
            "Terminale STI2D": [
                "Mathématiques", "Physique Chimie", "Ingénierie et développement durable", 
                "Philosophie", "Anglais", "Enseignement technologique en anglais", "SIN", "Allemand"
            ],
            "Première STI2D": [
                "Mathématiques", "Physique Chimie", "Ingénierie et développement durable", 
                "Français", "Histoire Géographie", "Anglais", "Allemand"
            ],
            "BTS CPRP": [
                "Anglais", "Mathématiques", "Conception et Industrialisation", "Usinage et FAO"
            ],
            "BTS SIO 1": [
                "BLOC 3 CYBER (DALLA-ROSA)", "CULTURE ECO JUR MANAG", "Mathématiques", "Anglais"
            ],
            "Seconde Générale/Technologique": [
                "Mathématiques", "Français", "Histoire-Géographie et EMC", "SVT", 
                "Physique Chimie", "Sciences Numériques et Technologiques", "Anglais", "Allemand"
            ]
        };

        const DEFAULT_SAMPLE_COURSES = [
          // ==================== TERMINALE STI2D ====================
          {
            id: "sample-term-anglais-1",
            title: "Technical English: Sustainable Technologies & Eco-Design",
            subject: "Anglais",
            chapter: "Unit 1: Eco-Design & Smart Technologies",
            school: "Lycée François Bazin",
            classe: "Terminale STI2D",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            casioLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Cours",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 68,
            viewsCasio: 34,
            isVisible: true
          },
          {
            id: "sample-math-1",
            title: "Suites géométriques, arithmétiques et limites",
            subject: "Mathématiques",
            chapter: "Chapitre 1 : Les Suites numériques",
            school: "Lycée François Bazin",
            classe: "Terminale STI2D",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            casioLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Cours",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 42,
            viewsCasio: 28,
            isVisible: true
          },
          {
            id: "sample-math-2",
            title: "Formulaire complet dérivées, primitives et intégrales",
            subject: "Mathématiques",
            chapter: "Chapitre 2 : Analyse et Dérivation",
            school: "Lycée François Bazin",
            classe: "Terminale STI2D",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            casioLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Fiche",
            chapterOrder: 2,
            courseOrder: 1,
            viewsDigital: 85,
            viewsCasio: 64,
            isVisible: true
          },
          {
            id: "sample-pc-1",
            title: "Premier principe de la thermodynamique et transferts thermiques",
            subject: "Physique Chimie",
            chapter: "Chapitre 1 : Énergie et Matière",
            school: "Lycée François Bazin",
            classe: "Terminale STI2D",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            casioLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Cours",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 31,
            viewsCasio: 19,
            isVisible: true
          },
          {
            id: "sample-sin-1",
            title: "Architecture réseau, adressage IPv4 et trames CAN",
            subject: "SIN",
            chapter: "Chapitre 1 : Réseaux & Protocoles",
            school: "Lycée François Bazin",
            classe: "Terminale STI2D",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "TP",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 57,
            viewsCasio: 12,
            isVisible: true
          },
          {
            id: "sample-philo-1",
            title: "La technique, la liberté et la responsabilité humaine",
            subject: "Philosophie",
            chapter: "Notions du BAC : La Liberté & La Technique",
            school: "Lycée François Bazin",
            classe: "Terminale STI2D",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            casioLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Résumé",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 63,
            viewsCasio: 45,
            isVisible: true
          },

          // ==================== PREMIÈRE STI2D ====================
          {
            id: "sample-prem-anglais-1",
            title: "General & Technical English B1: Workshop Safety & Tools",
            subject: "Anglais",
            chapter: "Unit 1: In the Lab & Safety First",
            school: "Lycée François Bazin",
            classe: "Première STI2D",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            casioLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Cours",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 51,
            viewsCasio: 22,
            isVisible: true
          },
          {
            id: "sample-prem-math-1",
            title: "Polynômes du second degré, discriminant et racines",
            subject: "Mathématiques",
            chapter: "Chapitre 1 : Le Second Degré",
            school: "Lycée François Bazin",
            classe: "Première STI2D",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            casioLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Cours",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 44,
            viewsCasio: 30,
            isVisible: true
          },
          {
            id: "sample-prem-francais-1",
            title: "La littérature d'idées et le combat des Lumières",
            subject: "Français",
            chapter: "Objet d'étude EAF : La Littérature d'Idées",
            school: "Lycée François Bazin",
            classe: "Première STI2D",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Fiche",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 39,
            viewsCasio: 14,
            isVisible: true
          },

          // ==================== BTS SIO 1 ====================
          {
            id: "sample-bts-anglais-1",
            title: "Professional English: IT Support, Cybersecurity & Tech Reporting",
            subject: "Anglais",
            chapter: "Unit 1: IT Infrastructures & Helpdesk",
            school: "Lycée Gaspard Monge",
            classe: "BTS SIO 1",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            casioLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Cours",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 40,
            viewsCasio: 18,
            isVisible: true
          },
          {
            id: "sample-bts-cyber-1",
            title: "Sécurisation des accès, cryptographie et analyse de vulnérabilités",
            subject: "BLOC 3 CYBER (DALLA-ROSA)",
            chapter: "Chapitre 1 : Sécurité des Systèmes d'Information",
            school: "Lycée Gaspard Monge",
            classe: "BTS SIO 1",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "TP",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 62,
            viewsCasio: 15,
            isVisible: true
          },
          {
            id: "sample-bts-cejm-1",
            title: "L'intégration de l'entreprise dans son environnement numérique",
            subject: "CULTURE ECO JUR MANAG",
            chapter: "Thème 1 : L'entreprise et son écosystème",
            school: "Lycée Gaspard Monge",
            classe: "BTS SIO 1",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Cours",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 33,
            viewsCasio: 10,
            isVisible: true
          },

          // ==================== BTS CPRP ====================
          {
            id: "sample-bts-cprp-anglais-1",
            title: "Technical English: Machining Operations, Safety & Quality Standards",
            subject: "Anglais",
            chapter: "Unit 1: Industrial Machining & Safety Standards",
            school: "Lycée François Bazin",
            classe: "BTS CPRP",
            digitalLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            casioLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
            tag: "Cours",
            chapterOrder: 1,
            courseOrder: 1,
            viewsDigital: 29,
            viewsCasio: 14,
            isVisible: true
          }
        ];

        const DEFAULT_SHARED_CLOUD_CONFIG = {
            enabled: true,
            name: "Cloud Partagé de l'Établissement",
            description: "Espace officiel de ressources partagées par l'administration (annales du BAC, sujets de BTS, logiciels calculatrices et fiches de révision).",
            quotaBytes: 5 * 1024 * 1024 * 1024 // 5 Go par défaut
        };

        const DEFAULT_SHARED_CLOUD_FILES = [];

        if (typeof window !== 'undefined') {
            window.DEFAULT_TERMS_FALLBACK = DEFAULT_TERMS_FALLBACK;
            window.DEFAULT_CASIO_FALLBACK = DEFAULT_CASIO_FALLBACK;
            window.COLOR_PALETTES = COLOR_PALETTES;
            window.DEFAULT_SUBJECTS = DEFAULT_SUBJECTS;
            window.DEFAULT_SCHOOLS = DEFAULT_SCHOOLS;
            window.DEFAULT_CLASSES = DEFAULT_CLASSES;
            window.DEFAULT_SCHOOL_CLASSES = DEFAULT_SCHOOL_CLASSES;
            window.DEFAULT_SCHOOL_CLASS_SUBJECTS = DEFAULT_SCHOOL_CLASS_SUBJECTS;
            window.DEFAULT_CLASS_SUBJECTS = DEFAULT_CLASS_SUBJECTS;
            window.DEFAULT_SAMPLE_COURSES = DEFAULT_SAMPLE_COURSES;
            window.DEFAULT_SHARED_CLOUD_CONFIG = DEFAULT_SHARED_CLOUD_CONFIG;
            window.DEFAULT_SHARED_CLOUD_FILES = DEFAULT_SHARED_CLOUD_FILES;
        }

        