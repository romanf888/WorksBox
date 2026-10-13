import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function generateZip() {
  const zip = new JSZip();
  const extDir = path.resolve('extension');
  const files = fs.readdirSync(extDir);

  for (const file of files) {
    const filePath = path.join(extDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile() && !file.endsWith('.zip')) {
      const content = fs.readFileSync(filePath);
      zip.file(file, content);
    }
  }

  // Add README.txt
  const readmeContent = `===================================================================
   EXTENSION GOOGLE CHROME WORKSBOX - GUIDE D'INSTALLATION (BETA)
===================================================================

Cette extension officielle vous permet de consulter les derniers cours
publiés sur WorksBox et d'y accéder en un seul clic !

Procédure d'installation dans Google Chrome :
1. Décompressez ce fichier ZIP dans un dossier sur votre ordinateur.
2. Ouvrez Google Chrome et accédez à : chrome://extensions/
3. Activez le "Mode développeur" (interrupteur en haut à droite).
4. Cliquez sur le bouton "Charger l'extension non empaquetée".
5. Sélectionnez le dossier décompressé (qui contient manifest.json, popup.html, etc.).
6. L'icône WorksBox est désormais épinglée dans votre barre d'outils !
`;
  zip.file('README.txt', readmeContent);

  const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

  // Save to root, extension folder, and public folder
  fs.writeFileSync('worksbox-extension.zip', zipContent);
  fs.writeFileSync('extension/worksbox-extension.zip', zipContent);

  console.log('Successfully generated worksbox-extension.zip (Size: ' + zipContent.length + ' bytes)');
}

generateZip().catch(err => {
  console.error('Error generating zip:', err);
  process.exit(1);
});
