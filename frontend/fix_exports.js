/**
 * Fix named vs default export mismatches in stubs.
 * If a file imports { ComponentName } from a stub that only has export default,
 * add a named export for ComponentName.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');

function walk(dir, results = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.includes('node_modules') && e.name !== 'pages_backup') {
      walk(full, results);
    } else if (e.name.endsWith('.jsx') || e.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

const allFiles = walk(srcDir);

// Collect all named imports: { from_file -> [names] }
const namedImports = {};

for (const f of allFiles) {
  const code = fs.readFileSync(f, 'utf8');
  // Match: import { Name1, Name2 } from './path/File'
  const re = /import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const names = m[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    const importPath = m[2];
    
    // Resolve the import path relative to the source file
    const fileDir = path.dirname(f);
    let resolved;
    if (importPath.startsWith('.')) {
      resolved = path.resolve(fileDir, importPath);
      // Try with .jsx extension
      if (!fs.existsSync(resolved) && !resolved.endsWith('.jsx') && !resolved.endsWith('.js')) {
        if (fs.existsSync(resolved + '.jsx')) resolved += '.jsx';
        else if (fs.existsSync(resolved + '.js')) resolved += '.js';
      }
    } else {
      continue; // skip node_modules imports
    }
    
    if (!fs.existsSync(resolved)) continue;
    
    if (!namedImports[resolved]) namedImports[resolved] = new Set();
    names.forEach(n => namedImports[resolved].add(n));
  }
}

// Now check each file that has named imports - does it actually export those names?
let fixCount = 0;
for (const [filePath, names] of Object.entries(namedImports)) {
  let code = fs.readFileSync(filePath, 'utf8');
  const missing = [];
  
  for (const name of names) {
    // Check if this name is exported (named export)
    const exportPatterns = [
      new RegExp(`export\\s+function\\s+${name}\\b`),
      new RegExp(`export\\s+const\\s+${name}\\b`),
      new RegExp(`export\\s+let\\s+${name}\\b`),
      new RegExp(`export\\s+var\\s+${name}\\b`),
      new RegExp(`export\\s+class\\s+${name}\\b`),
      new RegExp(`export\\s*{[^}]*\\b${name}\\b[^}]*}`),
    ];
    
    const isExported = exportPatterns.some(p => p.test(code));
    if (!isExported) {
      // Check if it's defined but not exported
      const defPatterns = [
        new RegExp(`function\\s+${name}\\b`),
        new RegExp(`const\\s+${name}\\b`),
        new RegExp(`class\\s+${name}\\b`),
      ];
      const isDefined = defPatterns.some(p => p.test(code));
      
      if (isDefined) {
        // It's defined but not exported as named - add named export
        missing.push({ name, type: 'add_export' });
      } else {
        // Not defined at all - need to create it
        missing.push({ name, type: 'create' });
      }
    }
  }
  
  if (missing.length === 0) continue;
  
  const relPath = path.relative(srcDir, filePath);
  console.log(`${relPath}: fixing ${missing.length} exports: ${missing.map(m => `${m.name}(${m.type})`).join(', ')}`);
  
  for (const m of missing) {
    if (m.type === 'add_export') {
      // Add at the end: export { Name }
      code += `\nexport { ${m.name} };\n`;
    } else {
      // Create a stub function/const
      if (m.name[0] === m.name[0].toUpperCase()) {
        code += `\nexport function ${m.name}() { return null; }\n`;
      } else {
        code += `\nexport const ${m.name} = null;\n`;
      }
    }
  }
  
  fs.writeFileSync(filePath, code, 'utf8');
  fixCount += missing.length;
}

console.log(`\nTotal fixes: ${fixCount}`);
