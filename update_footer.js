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

const files = walk('frontend');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // Add to footer Services list
  content = content.replace(/(<li><a href="[^"]*services\.html#saas"[^>]*>.*?<\/a><\/li>)/, '$1\n          <li><a href="services.html#full-stack">Full Stack App Dev</a></li>');
  // Update any existing "View Pricing" CTAs
  content = content.replace(/href="[^"]*pricing\.html"[^>]*>View Pricing/g, 'href="contact.html">Get a Quote');
  content = content.replace(/href="[^"]*pricing\.html"[^>]*>See Plans/g, 'href="contact.html">Get a Quote');
  
  fs.writeFileSync(f, content);
});
console.log('Added Full Stack to footer and updated CTAs.');
