const fs = require('fs');
const src = 'd:/project/GeniegoROI/frontend/src/pages/DataProduct.jsx';
let content = fs.readFileSync(src, 'utf8');

// The issue: SCHEMA, PLATFORM_MAPPING, METRICS, RULES have `t(`

// 1. Convert definitions to generators
content = content.replace(/const SCHEMA = \[/, "const get_SCHEMA = (t) => [");
content = content.replace(/const PLATFORM_MAPPING = \[/, "const get_PLATFORM_MAPPING = (t) => [");
content = content.replace(/const METRICS = \[/, "const get_METRICS = (t) => [");
content = content.replace(/const RULES = \[/, "const get_RULES = (t) => [");

// 2. Inject getter calls inside DataProduct()
const dpRegex = /export default function DataProduct\(\) \{(?:\n\s*const t = useT\(\);)?/;
content = content.replace(dpRegex, "export default function DataProduct() {\n  const t = useT();\n  const SCHEMA = React.useMemo(() => get_SCHEMA(t), [t]);\n  const PLATFORM_MAPPING = React.useMemo(() => get_PLATFORM_MAPPING(t), [t]);\n  const METRICS = React.useMemo(() => get_METRICS(t), [t]);\n  const RULES = React.useMemo(() => get_RULES(t), [t]);\n");

// Ensure React.useMemo works (React is imported)

fs.writeFileSync(src, content, 'utf8');
console.log("DataProduct fixed.");
