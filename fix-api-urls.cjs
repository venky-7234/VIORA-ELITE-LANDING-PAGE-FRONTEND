const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function fixApiUrls(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixApiUrls(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let changed = false;

      // Replace fetch('http://localhost:8080/api/...') with fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/...`)
      
      const newContent = content.replace(/['"]http:\/\/localhost:8080\/api([^'"]*)['"]/g, (match, p1) => {
        changed = true;
        return `\`\${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}${p1}\``;
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated API URLs in ${fullPath}`);
      }
    }
  }
}

fixApiUrls(srcDir);
console.log('API URLs fix complete!');
