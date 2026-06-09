const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const appDir = path.join(__dirname, '..', 'src', 'app');

walkDir(appDir, filePath => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Regex matches: from '../../...' or from '../../../../...'
    content = content.replace(/(from\s+['"])(\.\.\/(?:\.\.\/)+)([^'"]+['"])/g, (match, prefix, dots, suffix) => {
      const count = dots.split('../').length - 1;
      if (count > 1) {
        const newDots = '../'.repeat(count - 1);
        return `${prefix}${newDots}${suffix}`;
      }
      return match;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated imports in: ${filePath}`);
    }
  }
});
