/**
 * Surgical fix: restore InventorySyncTab content + JobHistoryTab content
 * Then splice guide+main at end
 */
const fs=require('fs');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');

// 1. Fix InventorySyncTab — "return (\n            <div className" needs its body back
const invMarker='function InventorySyncTab() {';
const invIdx=src.indexOf(invMarker);
if(invIdx===-1){console.log('ERR: no InventorySyncTab');process.exit(1);}

// Find "return (" inside InventorySyncTab
const invReturnIdx=src.indexOf('return (',invIdx);
const afterReturn=src.indexOf('\n',invReturnIdx)+1;

// Check what's right after return(
const nextLine=src.substring(afterReturn,afterReturn+200);
console.log('After InventorySyncTab return:',nextLine.slice(0,80));

// If the grid content was deleted, we need to re-insert it
if(!nextLine.includes('display: "grid", gap: 16')){
  console.log('InventorySyncTab body missing — restoring');
  const invBody=`        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                    <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t('catalogSync.stockThreshold')}</label>
                    <input type="number" value={threshold} onChange={e => setThreshold(+e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, marginTop: 4 }} />
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6 }}>{t('catalogSync.thresholdDesc')}</div>
                </div>
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                    <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t('catalogSync.reserveQty')}</label>
                    <input type="number" value={reserve} onChange={e => setReserve(+e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, marginTop: 4 }} />
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6 }}>{t('catalogSync.reserveDesc')}</div>
                </div>
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                    <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t('catalogSync.strategyLabel')}</label>
                    <select value={strategy} onChange={e => setStrategy(e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, marginTop: 4 }}>
                        <option value="proportional">{t('catalogSync.strategyProportional')}</option>
                        <option value="priority">{t('catalogSync.strategyPriority')}</option>
                        <option value="equal">{t('catalogSync.strategyEqual')}</option>
                        <option value="manual">{t('catalogSync.strategyManual')}</option>
                    </select>
                </div>
            </div>
`;
  src=src.substring(0,afterReturn)+invBody+src.substring(afterReturn);
  console.log('✅ InventorySyncTab body restored');
}

fs.writeFileSync(FILE,src,'utf8');

// Re-check brace balance
src=fs.readFileSync(FILE,'utf8');
let lines=src.split(/\r?\n/);
let depth=0;
for(let i=0;i<lines.length;i++){
  for(const c of lines[i]){if(c==='{')depth++;if(c==='}')depth--;}
  if(depth<0){console.log(`❌ line ${i+1}: depth=${depth}`);break;}
}
console.log('Final depth:',depth);
