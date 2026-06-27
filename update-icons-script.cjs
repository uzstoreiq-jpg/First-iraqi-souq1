const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  // 1. Loader Replacement
  if (content.includes('Loader2')) {
    // Replace imports
    content = content.replace(/Loader2,\s*/g, '');
    content = content.replace(/Loader2\s*}/g, '}');
    content = content.replace(/import\s*{\s*}\s*from\s*["']lucide-react["'];\n/g, ''); // cleanup empty imports
    
    if (!content.includes('import DotsLoader')) {
      // Find the first import and add our DotsLoader after it
      const importMatch = content.match(/import.*?;\n/);
      if (importMatch) {
         content = content.replace(importMatch[0], importMatch[0] + `import DotsLoader from "${f.includes('components') ? '.' : '../components'}/DotsLoader";\n`);
      }
    }
    
    // Replace Loader2 component usage. Keep classname if possible
    // Note: <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" strokeWidth={1.25} />
    content = content.replace(/<Loader2([^>]*?)(?:strokeWidth={1\.25})?([^>]*)>/g, (match, p1, p2) => {
        let clsMatch = match.match(/className=(["'])(.*?)\1/);
        let currentClasses = clsMatch ? clsMatch[2] : '';
        // modify classes: remove animate-spin, adjust dimensions
        let newClasses = currentClasses.replace(/animate-spin|w-\d+|h-\d+|mx-auto/g, '').trim();
        return `<DotsLoader className="${newClasses}" />`;
    });
    changed = true;
  }

  // 2. Icon Changes
  const substitutions = {
    'Search': 'Sparkles',
    'Menu': 'Grip',
    'Home': 'Store',
    'Grid': 'Compass',
    'Zap': 'Flame',
    'Star': 'Trophy',
  };

  Object.entries(substitutions).forEach(([oldIcon, newIcon]) => {
     let importRegex = new RegExp(`\\b${oldIcon}\\b`, 'g');
     let componentRegex = new RegExp(`<${oldIcon}\\b`, 'g');
     if (content.match(importRegex) && !content.includes(`import { ${oldIcon} `)) { // simplistic check
        // Replace in imports from lucide-react
        const lucideImportMatch = content.match(/import\s*{([^}]+)}\s*from\s+['"]lucide-react['"]/);
        if (lucideImportMatch) {
             let inner = lucideImportMatch[1];
             if (inner.includes(oldIcon)) {
                 let newInner = inner.replace(new RegExp(`\\b${oldIcon}\\b`), newIcon);
                 content = content.replace(lucideImportMatch[0], `import {${newInner}} from "lucide-react"`);
                 changed = true;
             }
        }
        
        // Replace component usages
        if (content.match(componentRegex)) {
           content = content.replace(componentRegex, `<${newIcon}`);
           changed = true;
        }
     }
  });


  if (changed) {
    fs.writeFileSync(f, content);
  }
});
