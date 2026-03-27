const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/Attribution.jsx', 'utf8');

c = c.replace(
  /const cohorts = weeks\.map\(\(w, wi\) => \(\{ cohort: w, size: 200 \+ wi \* 15, retention: weeks\.map\(\(\_, \di\) => di <= wi \? \(100 \* Math\.pow\(0\.72, di\)\)\.toFixed\(0\) : null\) \}\)\);/g,
  "const cohorts = weeks.map((w, wi) => ({ cohort: w, size: 0, retention: weeks.map(() => null) }));"
);

fs.writeFileSync('frontend/src/pages/Attribution.jsx', c);
console.log('done');
