# WorksBox - Documentation & Récapitulatif de la Plateforme

WorksBox est une application web moderne de partage, d'accès et de consultation de cours et de ressources pédagogiques, spécialement conçue pour les élèves de lycée (notamment STI2D, BTS, Seconde/Première) et adaptée à la consultation numérique et aux calculatrices **Casio Graph 35+EII**.

---

## 1. Objectifs & Fonctionnalités Principales

### 📚 Consultation des Cours & Documents
- **Organisation hiérarchique par Lycée, Classe, Matière et Chapitre** :
  - Sélection de l'établissement (ex: Lycée François Bazin, Lycée Gaspard Monge) et de la classe (ex: Terminale STI2D, BTS SIO 1).
  - Navigation par cartes de matières avec comptage en direct des cours disponibles.
  - Regroupement des cours par chapitres avec accordéons pliables/dépliables.
- **Double format de consultation** :
  - **Version Numérique (Drive / PDF)** : Visualiseur intégré dans l'application avec mode plein écran, zoom, rotation et téléchargement direct.
  - **Version Casio Graph 35+EII (.txt / .g1m)** : Fichiers formatés spécifiquement pour le petit écran des calculatrices Casio (sans coupure de mots, lisibilité optimisée).
- **Moteur de Recherche Instantané** : Recherche globale en temps réel par titre de cours, nom de chapitre ou matière.
- **Compteurs de Vues** : Statistiques anonymes incrémentées à chaque consultation (vues numériques et vues Casio).

---

## 2. Système de Favoris & Gestion des Comptes

### ⭐ Favoris
- **Accès sécurisé et conditionné** :
  - Par défaut, chaque utilisateur arrive en tant que visiteur libre sans compte imposé.
  - Pour ajouter un cours en favoris ou accéder à l'onglet **Mes Favoris**, l'utilisateur est invité à se connecter.
  - Un écran explicatif et engageant guide l'utilisateur pour activer son espace et synchroniser ses révisions.
- **Sauvegarde & Synchronisation** :
  - Avec un compte Google : synchronisation cloud sécurisée sur Firestore.
  - Avec un profil élève personnalisé : conservation locale sur le navigateur.

### 👤 Authentification & Espaces Utilisateurs
- **Connexion Google (OAuth / Firebase Auth)** : Connexion en un clic, synchronisation multi-appareils.
- **Profil Élève Personnalisé (Sans compte Google)** : Permet aux élèves ne disposant pas de compte Google de définir leur prénom/pseudo et de gérer leurs favoris localement.
- **Gestionnaire de Compte** : Modale permettant de voir ses informations, changer d'établissement ou de classe, et se déconnecter proprement.
- **Gestion des erreurs Firebase** : Détection intelligente et guidage pas-à-pas en cas d'erreur de configuration (ex: domaine non autorisé, activation du fournisseur Google).

---

## 3. Guide Casio & Pédagogie

### 📟 Tutoriel Casio Graph 35+EII
- Page dédiée expliquant pas-à-pas comment transférer les cours formatés sur calculatrice :
  1. Matériel requis (câble Mini USB, ordinateur).
  2. Téléchargement des fichiers `.txt` ou `.g1m`.
  3. Connexion USB en mode lecteur `@MainMem/PROGRAM`.
  4. Lecture via le menu `PROGR` de la calculatrice.
- Contenu modifiable en temps réel depuis le panneau d'administration.

### ⚖️ Conditions d'Utilisation
- Précisions légales sur l'usage des cours sur calculatrice en classe vs en épreuves officielles (Mode Examen obligatoire au BAC).
- Avertissement et mentions sur les demandes d'hébergement de nouveaux cours.
- Transparence sur l'adaptation des textes assistée par IA.

---

## 4. Panneau d'Administration (Dashboard Admin)

Un panneau complet accessible aux administrateurs (`/admin` ou via icône Paramètres) :
- **Gestion des Cours** :
  - Ajout, modification, suppression et réorganisation des cours.
  - Définition des liens Numériques (Drive) et Casio, sélection du tag (Cours, TP, TD, Fiche, Formulaire...), attribution de couleur personnalisée.
  - Bascule de visibilité (afficher/masquer un cours en un clic).
- **Gestion des Établissements & Classes** : Ajout et gestion dynamique des lycées et classes partenaires.
- **Fil d'Actualités & Annonces** :
  - Publication d'articles avec épinglage prioritaire.
  - Support des images d'illustration et des vidéos YouTube intégrées directement.
  - Bannière d'alerte défilante en haut du site pour les messages urgents.
- **Éditeur des Textes Réglementaires** : Modification en direct du Tutoriel Casio et des Conditions d'utilisation.
- **Personnalisation Visuelle** : Palette de couleurs des tags et ordre d'affichage des matières.
- **Statistiques Globales** : Nombre total de cours, vues numériques cumulées, vues Casio cumulées.

---

## 5. Architecture Technique

- **Frontend** : Single Page Application réactive (React 18, Babel standalone, Tailwind CSS).
- **Backend Serveur** : Node.js / Express servant l'application et gérant les routes statiques et le fallback SPA.
- **Base de Données & Auth** : Firebase Firestore & Firebase Authentication avec fallback gracieux hors-ligne ou sans configuration.
- **Icônes & Identité Visuelle** : Icônes vectorielles SVG soignées et Favicon personnalisé WorksBox (Livre ouvert / Cloud tech bleu).
