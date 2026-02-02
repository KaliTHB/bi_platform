const fs = require('fs');
const path = require('path');

// Read tsconfig.json
const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
let tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

// Force all paths to use forward slashes
if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
  Object.keys(tsconfig.compilerOptions.paths).forEach(key => {
    tsconfig.compilerOptions.paths[key] = tsconfig.compilerOptions.paths[key].map(p => 
      p.replace(/\\/g, '/')
    );
  });
}

// Write back
fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
console.log('Fixed paths in tsconfig.json');