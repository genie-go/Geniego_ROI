/**
 * Remove misplaced code blocks from CatalogSync.jsx
 * The fix3 script incorrectly inserted CategoryMappingTab functions inside CatalogTab
 */
const fs=require('fs');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');

// 1. Remove misplaced code at ~line 1140-1210 (inserted inside CatalogTab)
// Find the exact block: starts with "    const updateMapping" after "{/* Stock + Sync */}"
const misplacedStart=src.indexOf('                {/* Stock + Sync */}\r\n                    \n    const updateMapping');
if(misplacedStart===-1){
  // Try alternate
  const alt=src.indexOf('{/* Stock + Sync */}\r\n                    \n    const updateMapping');
  if(alt!==-1){
    console.log('Found alt misplaced block at',alt);
  } else {
    console.log('Misplaced block pattern not found, trying direct search');
  }
}

// More robust: find the inserted block markers
const insertStart=src.indexOf('\n    const updateMapping = (catId, chId, value) => {\n');
const insertEndMarker='            {toast && (\n';
const insertEnd=src.indexOf(insertEndMarker);

if(insertStart!==-1 && insertEnd!==-1 && insertEnd > insertStart){
  // Check if this is inside CatalogTab (before CategoryMappingTab)
  const catMapMarker='function CategoryMappingTab()';
  const catMapIdx=src.indexOf(catMapMarker);
  
  if(insertStart < catMapIdx){
    console.log(`Misplaced block found: chars ${insertStart}-${insertEnd+insertEndMarker.length}`);
    // Also need to remove the table wrapper that was added after addCustomCategory
    // But first, just remove the functions block
    const blockEnd=src.indexOf('            )}',insertEnd+insertEndMarker.length);
    const fullEnd=src.indexOf('\n',blockEnd)+1;
    
    // The misplaced code is from \n before updateMapping to end of toast block
    // Actually, let's find the clean boundary:
    // Before: "{/* Stock + Sync */}\r\n" + whitespace
    // After the misplaced block: the original code continues

    // Find exact end of misplaced block (after the toast closing)
    const afterToastBlock=src.indexOf('\n            <div style={{ display: "flex", justifyContent: "space-between"', insertEnd);
    if(afterToastBlock!==-1){
      // Also need to find where original code should resume
      // The line "                    \n" before updateMapping is the break point
      const breakLine=src.lastIndexOf('\n',insertStart);
      
      console.log('Removing from char',breakLine,'to',afterToastBlock);
      // But we need to keep what was after "Stock + Sync" comment
      // The original code had more product detail rendering here
      
      // Actually, more carefully: the original line after "{/* Stock + Sync */}" was actual JSX content
      // that got replaced. We'll just remove the misplaced functions and see.
      
      // Find the end of the inserted block
      // It ends right before a line that was original to CatalogTab
      // Look for the pattern that follows in CatalogTab
    }
  }
}

// Simpler approach: find and remove the exact inserted text
// The inserted text starts with "\n    const updateMapping" and ends with "            )}\n"
// It was inserted at a specific character position

// Let's find the exact boundaries
const lines=src.split('\n');
let blockStart=-1,blockEnd=-1;
for(let i=0;i<lines.length;i++){
  if(lines[i].trim()==='const updateMapping = (catId, chId, value) => {' && blockStart===-1){
    // Check if this is inside a function that shouldn't have it (before CategoryMappingTab)
    // Count function declarations before this line
    let funcs=0;
    for(let j=0;j<i;j++){
      if(lines[j].match(/^function\s|^export\s+default\s+function/)) funcs++;
    }
    const afterLines=lines.slice(i).join('\n');
    // If the next CategoryMappingTab is less than 500 lines away, this is misplaced
    const catMapDist=afterLines.indexOf('function CategoryMappingTab()');
    if(catMapDist!==-1 && catMapDist < 50000){
      // This is the first occurrence, likely misplaced
      blockStart=i;
      console.log(`Found misplaced updateMapping at line ${i+1}`);
    }
  }
}

if(blockStart!==-1){
  // Find the end: look for the toast closing div + the original code resuming
  // The inserted block ends with "            )}\n"  then original code continues
  // In our case, the original code had stock/sync content
  
  // Count lines: the inserted block is about 60-70 lines
  // Find where "{/* Stock + Sync */}" comment is (a few lines before)
  let stockSyncLine=-1;
  for(let i=blockStart-5;i<blockStart;i++){
    if(i>=0 && lines[i].includes('Stock + Sync')) stockSyncLine=i;
  }
  
  // Find the end of inserted block - it ends with the table wrapper JSX
  let endLine=-1;
  for(let i=blockStart;i<blockStart+200 && i<lines.length;i++){
    // The original code resumes with something from CatalogTab
    if(lines[i].includes('style={inputStyle}') && lines[i].includes('placeholder')){
      // This is part of the table wrapper that was also misplaced
      continue;
    }
    // Find where the misplaced CategoryMappingTab code ends
    // Look for resumption of CatalogTab content
    if(lines[i].trim().startsWith('<div style={{ display: "flex", gap: 6,') ||
       lines[i].trim().startsWith('{/* Delta Indicators */}') ||
       lines[i].trim().startsWith('</div>') && i > blockStart + 10){
      // Check if this looks like CatalogTab content
    }
  }
  
  // Better: just find the end of the toast JSX block
  for(let i=blockStart;i<blockStart+100 && i<lines.length;i++){
    if(lines[i].trim()===')}' && lines[i-1] && lines[i-1].includes('</div>')){
      // Check if next line looks like original CatalogTab code
      if(i+1<lines.length){
        const nextTrimmed=lines[i+1].trim();
        if(nextTrimmed.startsWith('<div style') || nextTrimmed.startsWith('{/*')){
          endLine=i+1;
          break;
        }
      }
    }
  }
  
  if(endLine===-1){
    // Fallback: remove from the whitespace line before updateMapping
    // to just before the first line that's clearly CatalogTab content
    // Count how many lines to remove
    for(let i=blockStart;i<lines.length;i++){
      // The misplaced code block ends when we see a line that was original
      // Original CatalogTab content would have things like:
      // "                                <div style={{" or similar deep indentation
      if(lines[i].trim().includes('display: "flex", justifyContent: "space-between"') &&
         lines[i].includes('<div style')){
        // This is the start of the misplaced catmap JSX
        // Continue looking
      }
      // Find where CategoryMappingTab function actually starts
      if(lines[i].includes('function CategoryMappingTab()')){
        // Everything from blockStart to the line before categoryMappingTab  
        // But we also need to check what's between
        break;
      }
    }
  }
}

console.log('Manual inspection needed. Lines around problem area:');
for(let i=1138;i<1145 && i<lines.length;i++){
  console.log(`${i+1}: ${lines[i].slice(0,80)}`);
}

// Actually let's just use a precise removal
// The inserted text was exactly the content we added in catalog_fix3.cjs
const toRemove=`
    const updateMapping = (catId, chId, value) => {
        setMappings(prev => prev.map(m =>
            m.internal === catId ? { ...m, channels: { ...m.channels, [chId]: value } } : m
        ));
    };

    const handleAddCategory = () => {
        if (!newCatId.trim() || !newCatLabel.trim()) return;
        if (allCategories.some(c => c.id === newCatId.trim())) return;
        const nc = { id: newCatId.trim(), label: newCatLabel.trim() };
        const updatedCats = [...customCats, nc];
        setCustomCats(updatedCats);
        const newMapping = { internal: nc.id, labelKey: null, label: nc.label, isCustom: true, channels: Object.fromEntries(connectedChs.map(ch => [ch.id, ''])) };
        setMappings(prev => [...prev, newMapping]);
        broadcastUpdate(updatedCats, [...mappings, newMapping]);
        setNewCatId(''); setNewCatLabel('');
        setToast(t('catalogSync.categoryAdded'));
        setTimeout(() => setToast(null), 3000);
    };

    const handleDeleteCategory = (catId) => {
        const updatedCats = customCats.filter(c => c.id !== catId);
        setCustomCats(updatedCats);
        const updatedMappings = mappings.filter(m => m.internal !== catId);
        setMappings(updatedMappings);
        broadcastUpdate(updatedCats, updatedMappings);
        setToast(t('catalogSync.categoryDeleted'));
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = () => {
        localStorage.setItem('genie_catalog_mappings', JSON.stringify(mappings));
        broadcastUpdate(customCats, mappings);
        setToast(t('catalogSync.catMapSaved'));
        setTimeout(() => setToast(null), 3000);
    };

    const inputStyle = { width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#ffffff", color: "#1f2937", fontSize: 11 };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {toast && (
                <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 10, background: "#22c55e", color: '#fff', fontWeight: 700, fontSize: 13, zIndex: 500 }}>
                    {toast}
                </div>
            )}
`;

const removeIdx=src.indexOf(toRemove);
if(removeIdx!==-1){
  // Check: is it before CategoryMappingTab function definition?
  const catMapFnIdx=src.indexOf('function CategoryMappingTab()');
  if(removeIdx < catMapFnIdx){
    console.log('Found exact misplaced block at char',removeIdx,'- removing');
    src=src.substring(0,removeIdx)+src.substring(removeIdx+toRemove.length);
    fs.writeFileSync(FILE,src,'utf8');
    console.log('✅ Misplaced block removed');
  } else {
    console.log('Block is in correct location (after CategoryMappingTab) - keeping');
  }
} else {
  console.log('Exact block not found');
}

// Verify
const final=fs.readFileSync(FILE,'utf8');
const flines=final.split(/\r?\n/);
let fd=0;
for(let i=0;i<flines.length;i++){for(const c of flines[i]){if(c==='{')fd++;if(c==='}')fd--;}if(fd<0){console.log('❌',i+1,fd);break;}}
console.log('Final depth:',fd);
