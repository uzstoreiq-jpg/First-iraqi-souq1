const fs = require('fs');

const filesToProcess = [
  'src/pages/Home.tsx',
  'src/pages/BestSellers.tsx',
  'src/pages/LatestProducts.tsx'
];

filesToProcess.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/<header[\s\S]*?<\/header>\s*/, '');
  content = content.replace(/<div className="flex items-center justify-between mb-5 px-1">[\s\S]*?<\/div>[\s]*<\/div>\s*/, '');
  fs.writeFileSync(f, content);
});
console.log('done');
