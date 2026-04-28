const fs=require('fs');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');

// Fix JobHistoryTab: replace broken version with complete one
const oldJob=`function JobHistoryTab({ jobs }) {\r
    const { t } = useI18n();\r
    const statusBadge = s => s === "done" ? "badge-green" : s === "running" ? "badge-blue" : "badge-red";\r
    return (\r
        <div className="card">\r
            <table className="table">\r
                <thead>\r
                    <tr><th>{t('catalogSync.jobId')}</th><th>{t('catalogSync.type')}</th><th>{t('catalogSync.colChannels')}</th><th>{t('catalogSync.scope')}</th><th>{t('catalogSync.processed')}</th><th>{t('catalogSync.errors')}</th><th>{t('catalogSync.progress')}</th><th>Status</th><th>{t('catalogSync.startTime')}</th><th>{t('catalogSync.duration')}</th></tr>\r
                </thead>\r
                <tbody>\r
                    {jobs.slice().reverse().map(j => (\r
                        <tr key={j.id}>\r
            </table>\r
            {jobs.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>{t('catalogSync.noHistory')}</div>}\r
        </div>\r
    );\r
}`;

const newJob=`function JobHistoryTab({ jobs }) {
    const { t } = useI18n();
    return (
        <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.jobId')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.type')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.colChannels')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.scope')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.processed')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.errors')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.progress')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>Status</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.startTime')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.duration')}</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.slice().reverse().map(j => (
                        <tr key={j.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 11, color: "#4f8ef7" }}>{j.id}</td>
                            <td style={{ padding: "8px" }}><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "#dbeafe", color: "#2563eb" }}>{j.type === "full" ? t('catalogSync.fullLabel') : t('catalogSync.incrementalLabel')}</span></td>
                            <td style={{ padding: "8px", fontSize: 11 }}>{j.channels.map(c => ch(c).icon).join(" ")}</td>
                            <td style={{ padding: "8px", fontSize: 10, color: "#6b7280" }}>{j.scope.join(", ")}</td>
                            <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 11 }}>{j.done?.toLocaleString()} / {j.total?.toLocaleString()}</td>
                            <td style={{ padding: "8px", color: j.errors > 0 ? "#ef4444" : "#22c55e", fontFamily: "monospace", fontSize: 11 }}>{j.errors}</td>
                            <td style={{ padding: "8px", minWidth: 80 }}><ProgressBar pct={j.progress} color={j.status === "done" ? "#22c55e" : "#4f8ef7"} /></td>
                            <td style={{ padding: "8px" }}><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: j.status === "done" ? "#d1fae5" : j.status === "running" ? "#dbeafe" : "#fee2e2", color: j.status === "done" ? "#22c55e" : j.status === "running" ? "#2563eb" : "#ef4444" }}>{j.status === "done" ? t('catalogSync.done') : j.status === "running" ? t('catalogSync.runningStatus') : t('catalogSync.statusError')}</span></td>
                            <td style={{ padding: "8px", fontSize: 11, color: "#6b7280" }}>{j.startedAt}</td>
                            <td style={{ padding: "8px", fontSize: 11, color: "#6b7280" }}>{j.duration}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {jobs.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>{t('catalogSync.noHistory')}</div>}
        </div>
    );
}`;

// Try to find the broken pattern
const patterns=[
  'function JobHistoryTab({ jobs }) {\r\n    const { t } = useI18n();\r\n    const statusBadge',
  'function JobHistoryTab({ jobs }) {\n    const { t } = useI18n();\n    const statusBadge',
];

let found=false;
for(const pat of patterns){
  const idx=src.indexOf(pat);
  if(idx!==-1){
    // Find end of function
    const funcEnd=src.indexOf('\n\n/* ─── Tab: Category Mapping',idx);
    if(funcEnd!==-1){
      const oldContent=src.substring(idx,funcEnd);
      console.log('Found JobHistoryTab, length:',oldContent.length);
      src=src.substring(0,idx)+newJob+src.substring(funcEnd);
      found=true;
      break;
    }
  }
}

if(!found){
  // Try just finding function start and end
  const start=src.indexOf('function JobHistoryTab');
  if(start!==-1){
    const nextFunc=src.indexOf('\n/* ─── Tab: Category',start);
    if(nextFunc===-1){
      const nextFunc2=src.indexOf('\nfunction CategoryMappingTab',start);
      if(nextFunc2!==-1){
        src=src.substring(0,start)+newJob+'\n\n'+src.substring(nextFunc2);
        found=true;
      }
    } else {
      src=src.substring(0,start)+newJob+src.substring(nextFunc);
      found=true;
    }
  }
}

if(found){
  fs.writeFileSync(FILE,src,'utf8');
  console.log('✅ JobHistoryTab fixed');
} else {
  console.log('❌ Could not find JobHistoryTab');
}

// Verify
const final=fs.readFileSync(FILE,'utf8');
const flines=final.split(/\r?\n/);
let fd=0;
for(let i=0;i<flines.length;i++){for(const c of flines[i]){if(c==='{')fd++;if(c==='}')fd--;}if(fd<0){console.log('❌',i+1,fd);break;}}
console.log('Final depth:',fd);
