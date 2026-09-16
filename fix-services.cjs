const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function fixServicesImport(dir, level) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixServicesImport(fullPath, level + 1);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Calculate correct relative path to services
      const relativeToSrc = path.relative(srcDir, path.dirname(fullPath));
      const depth = relativeToSrc === '' ? 0 : relativeToSrc.split(path.sep).length;
      
      let prefix = '';
      if (depth === 0) prefix = './';
      else prefix = '../'.repeat(depth);

      const servicesPath = prefix + 'services/api';
      
      const newContent = content.replace(/from\s+['"](?:\.\.\/)+services\/api['"]/g, `from '${servicesPath}'`);
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated services import in ${fullPath}`);
      }
    }
  }
}

fixServicesImport(srcDir, 0);
console.log('Services import fix complete!');
