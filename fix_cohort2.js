const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/Attribution.jsx', 'utf8');

c = c.split('\n').map(line => {
  if (line.includes('const cohorts = weeks.map')) {
    return "  const cohorts = weeks.map((w, wi) => ({ cohort: w, size: 0, retention: weeks.map(() => null) }));";
  }
  return line;
}).join('\n');

fs.writeFileSync('frontend/src/pages/Attribution.jsx', c);
console.log('done');
