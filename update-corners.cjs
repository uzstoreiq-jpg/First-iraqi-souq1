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
  content = content.replace(/rounded-\[1\.5rem\]/g, 'rounded-sm');
  content = content.replace(/rounded-\[2rem\]/g, 'rounded-sm');
  fs.writeFileSync(f, content);
});
