const fs = require('fs');
const walk = function(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.html')) results.push(file);
    }
  });
  return results;
}

const files = [
  'index.html',
  ...walk('pages')
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // Remove pricing nav link
  content = content.replace(/<a href="[^"]*pricing\.html"[^>]*>Pricing<\/a>\s*/g, '');
  content = content.replace(/<li><a href="[^"]*pricing\.html">Pricing<\/a><\/li>\s*/g, '');
  fs.writeFileSync(f, content);
});
console.log('Removed pricing links from HTML files.');
