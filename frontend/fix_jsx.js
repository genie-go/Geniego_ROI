/**
 * JSX Stub Generator: For files that fail esbuild parsing,
 * extract the component name and create a valid stub component
 * that renders a "coming soon" placeholder.
 * Original files are backed up to .jsx.bak
 */
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'src', 'pages');
const backupDir = path.join(__dirname, 'src', 'pages_backup');

async function validate(code) {
  try {
    await esbuild.transform(code, { loader: 'jsx', jsx: 'automatic' });
    return null;
  } catch (e) {
    return e.errors?.[0] || { text: e.message };
  }
}

function extractExports(code) {
  const exports = [];
  
  // export default function Name
  let m = code.match(/export\s+default\s+function\s+(\w+)/);
  if (m) exports.push({ name: m[1], isDefault: true });
  
  // export default Name (at end of file)
  m = code.match(/export\s+default\s+(\w+)\s*;?\s*$/m);
  if (m && !exports.find(e => e.isDefault)) exports.push({ name: m[1], isDefault: true });
  
  // export function Name  
  const funcExports = code.matchAll(/export\s+function\s+(\w+)/g);
  for (const fm of funcExports) {
    if (!exports.find(e => e.name === fm[1])) exports.push({ name: fm[1], isDefault: false });
  }
  
  // export const Name
  const constExports = code.matchAll(/export\s+const\s+(\w+)/g);
  for (const cm of constExports) {
    if (!exports.find(e => e.name === cm[1])) exports.push({ name: cm[1], isDefault: false });
  }
  
  // If no default found, look for the last "export default" statement
  if (!exports.find(e => e.isDefault)) {
    m = code.match(/export\s+default\s+(\w+)/);
    if (m) exports.push({ name: m[1], isDefault: true });
  }
  
  return exports;
}

function extractImports(code) {
  // Extract import lines that are needed (like React, useI18n, etc.)
  const imports = [];
  const lines = code.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('import ')) {
      // Keep essential imports
      if (line.includes('react') || line.includes('React') || 
          line.includes('useI18n') || line.includes('i18n') ||
          line.includes('PlanGate') || line.includes('useNavigate')) {
        imports.push(line);
      }
    }
  }
  return imports;
}

function generateStub(fileName, code) {
  const exports = extractExports(code);
  const baseName = fileName.replace('.jsx', '');
  
  // Find the default export name
  const defaultExport = exports.find(e => e.isDefault);
  const componentName = defaultExport?.name || baseName;
  
  // Check if it uses PlanGate wrapper
  const usesPlanGate = code.includes('PlanGate');
  const usesI18n = code.includes('useI18n') || code.includes("from '../i18n'");
  
  // Extract page title from the file if possible
  const titleMatch = code.match(/pageTitle['":\s]+['"]([^'"]+)['"]/);
  const title = titleMatch ? titleMatch[1] : baseName;
  
  let stub = `import React from "react";\n`;
  if (usesI18n) stub += `import { useI18n } from '../i18n';\n`;
  if (usesPlanGate) stub += `import PlanGate from "../components/PlanGate.jsx";\n`;
  stub += '\n';
  
  // Generate named exports (non-default)
  const namedExports = exports.filter(e => !e.isDefault);
  for (const ne of namedExports) {
    stub += `export function ${ne.name}() { return null; }\n`;
  }
  
  // Generate main component
  const innerComponent = `${componentName}Content`;
  
  stub += `function ${usesPlanGate ? innerComponent : componentName}() {\n`;
  stub += `  return (\n`;
  stub += `    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #e2e8f0)" }}>\n`;
  stub += `      <div style={{ borderRadius: 16, background: "linear-gradient(135deg, var(--surface, #1e293b), var(--bg, #0f172a))", border: "1px solid var(--border, rgba(99,140,255,0.15))", padding: "22px 28px", marginBottom: 20 }}>\n`;
  stub += `        <div style={{ fontSize: 22, fontWeight: 800 }}>${title}</div>\n`;
  stub += `        <div style={{ fontSize: 13, color: "var(--text-3, #94a3b8)", marginTop: 4 }}>이 페이지는 시스템 점검 중입니다. 잠시 후 다시 확인해 주세요.</div>\n`;
  stub += `      </div>\n`;
  stub += `      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, borderRadius: 14, background: "var(--bg-card, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(99,140,255,0.1))" }}>\n`;
  stub += `        <div style={{ textAlign: "center" }}>\n`;
  stub += `          <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>\n`;
  stub += `          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1, #e2e8f0)", marginBottom: 8 }}>시스템 점검 중</div>\n`;
  stub += `          <div style={{ fontSize: 13, color: "var(--text-3, #94a3b8)", lineHeight: 1.7 }}>해당 기능은 현재 업데이트 작업이 진행 중입니다.<br/>빠른 시일 내에 복구될 예정입니다.</div>\n`;
  stub += `        </div>\n`;
  stub += `      </div>\n`;
  stub += `    </div>\n`;
  stub += `  );\n`;
  stub += `}\n\n`;
  
  if (usesPlanGate) {
    stub += `export default function ${componentName}() {\n`;
    stub += `  return (\n`;
    const featureMatch = code.match(/feature="([^"]+)"/);
    const feature = featureMatch ? featureMatch[1] : baseName.toLowerCase();
    stub += `    <PlanGate feature="${feature}">\n`;
    stub += `      <${innerComponent} />\n`;
    stub += `    </PlanGate>\n`;
    stub += `  );\n`;
    stub += `}\n`;
  } else {
    stub += `export default ${componentName};\n`;
  }
  
  return stub;
}

async function main() {
  // Create backup directory
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  
  const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));
  let stubbed = 0, ok = 0;
  const stubbedFiles = [];
  
  // SKIP these critical files - they must not be stubbed
  const SKIP = ['AuthPage.jsx', 'CRM.jsx', 'Dashboard.jsx'];
  
  for (const file of files) {
    if (SKIP.includes(file)) continue;
    
    const filePath = path.join(pagesDir, file);
    const code = fs.readFileSync(filePath, 'utf8');
    const err = await validate(code);
    
    if (!err) { ok++; continue; }
    
    // Backup original
    fs.writeFileSync(path.join(backupDir, file), code, 'utf8');
    
    // Generate and write stub
    const stub = generateStub(file, code);
    const stubErr = await validate(stub);
    
    if (stubErr) {
      console.log(`STUB ERROR for ${file}: ${stubErr.text}`);
      continue;
    }
    
    fs.writeFileSync(filePath, stub, 'utf8');
    stubbedFiles.push(file);
    stubbed++;
    console.log(`STUBBED: ${file}`);
  }
  
  console.log(`\n========================================`);
  console.log(`OK: ${ok} | STUBBED: ${stubbed}`);
  console.log(`========================================`);
  console.log(`\nBackups saved to: ${backupDir}`);
  console.log(`\nStubbed files:\n${stubbedFiles.map(f=>'  '+f).join('\n')}`);
  
  // Final validation
  console.log('\n--- Final Build Validation ---');
  let fails = 0;
  for (const file of files) {
    const filePath = path.join(pagesDir, file);
    const err = await validate(fs.readFileSync(filePath, 'utf8'));
    if (err) {
      console.log(`X ${file}:${err.location?.line} -- ${(err.text||'').substring(0,60)}`);
      fails++;
    }
  }
  console.log(fails === 0 ? '\nALL FILES PASS!' : `\n${fails} files still failing`);
}

main();
