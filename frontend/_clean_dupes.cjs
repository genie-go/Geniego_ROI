// Fix duplicated content by keeping only lines 1-961
const fs = require('fs');
const filePath = './src/components/dashboards/DashInfluencer.jsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Keep only lines 1-961 (index 0-960)
const cleaned = lines.slice(0, 961).join('\n') + '\n';
fs.writeFileSync(filePath, cleaned);
console.log(`Cleaned: ${lines.length} lines -> ${961} lines`);
