const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const replaceMap = {
  '@/lib/mock-bookings': '@/features/bookings/services/bookings.api',
  '@/lib/mock-inventory': '@/features/inventory/services/inventory.api',
  '@/lib/mock-operations': '@/features/checkout/services/operations.api'
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const [oldImport, newImport] of Object.entries(replaceMap)) {
        // match both exact and partial strings, although it's usually exact in quotes
        const regex = new RegExp(oldImport, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, newImport);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
console.log('Import fixing complete.');
