/**
 * Fix all JSX files: onClick/onChange handler merged with style via comma
 * Pattern: }; ,  styleProp: -> }} style={{ styleProp:
 * Also: ); ,  styleProp: -> )} style={{ styleProp:
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'src/pages');
const STYLE_PROPS = 'display|flex|padding|width|height|margin|border|background|color|font|align|justify|gap|grid|position|cursor|overflow|opacity|transition|transform|whiteSpace|letterSpacing|textAlign|textDecoration|textTransform|boxShadow|boxSizing|minWidth|minHeight|maxWidth|maxHeight|lineHeight|zIndex|top|left|right|bottom|inset|borderRadius|outline|resize|verticalAlign|float|clear|content|listStyle|tableLayout|borderCollapse|wordBreak|overflowWrap|flexShrink|flexGrow|flexWrap|flexDirection|order|alignSelf|justifySelf|gridTemplate|gridColumn|gridRow|placeItems|accentColor';

let totalFixes = 0;

fs.readdirSync(DIR).filter(f => f.endsWith('.jsx')).forEach(f => {
  const filePath = path.join(DIR, f);
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;

  // Pattern 1: onClick={() => { ...code; ,  styleProp: value ... }}> 
  // Should be: onClick={() => { ...code; }} style={{ styleProp: value ... }}>
  const re1 = new RegExp(`(;)\\s*,\\s{0,3}((?:${STYLE_PROPS})\\s*:)`, 'g');
  let count = 0;
  code = code.replace(re1, (match, semi, prop) => {
    count++;
    return `; }} style={{ ${prop}`;
  });

  if (count > 0) {
    fs.writeFileSync(filePath, code, 'utf8');
    totalFixes += count;
    console.log(`✅ ${f}: ${count} fixes`);
  }
});

console.log(`\n✅ Total: ${totalFixes} fixes across all files`);
