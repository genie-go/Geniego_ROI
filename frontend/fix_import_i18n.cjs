const fs = require('fs');
let c = fs.readFileSync('src/pages/Pricing.jsx', 'utf8');
// Fix import: react-i18next → ../i18n/index.js useT
c = c.replace(
  'import { useTranslation } from "react-i18next";',
  'import { useT } from "../i18n/index.js";'
);
// Fix all useTranslation() calls => useT()
c = c.replace(/const \{ t \} = useTranslation\(\);/g, 'const t = useT();');
fs.writeFileSync('src/pages/Pricing.jsx', c, 'utf8');
const count = (c.match(/useT\(\)/g) || []).length;
console.log('Done. useT() calls:', count);
