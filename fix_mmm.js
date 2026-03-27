const fs = require('fs');
let c = fs.readFileSync('frontend/src/lib/mlAttribution.js', 'utf8');

c = c.replace(
  /export function bayesianMMM\(channelData, revenue, config = \{\}\) \{/g,
  `export function bayesianMMM(channelData, revenue, config = {}) {\n  const sumRev = revenue.reduce((s, v) => s + v, 0);\n  if (sumRev === 0 || revenue.length === 0) {\n    return {\n      channelResults: Object.keys(channelData).map(ch => ({ ch, coefficient: 0, contribution: 0, ci95: [0, 0], roi: 0, saturation: 0, decay: 0, share: 0 })),\n      intercept: 0, r2: 0, rmse: 0, optimiseBudget: (b) => Object.fromEntries(Object.keys(channelData).map(c => [c, b / Object.keys(channelData).length]))\n    };\n  }`
);

fs.writeFileSync('frontend/src/lib/mlAttribution.js', c);
console.log('done');
