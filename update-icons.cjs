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
  // target basic icons and make them thinner
  content = content.replace(/<([A-Z][a-zA-Z]+)([^>]*)className="([^"]*?)w-([0-9]) h-([0-9])([^"]*?)"([^>]*)>/g, '<$1$2className="$3w-$4 h-$5$6" strokeWidth={1.25}$7>');
  // target icons that have w- md:w- variants
  content = content.replace(/<([A-Z][a-zA-Z]+)([^>]*)className="([^"]*?)w-([0-9]+) md:w-([0-9]+)([^"]*?)"([^>]*)>/g, '<$1$2className="$3w-$4 md:w-$5$6" strokeWidth={1.25}$7>');
  fs.writeFileSync(f, content);
});
console.log('done');
