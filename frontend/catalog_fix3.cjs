const fs=require('fs');
const FILE='./src/pages/CatalogSync.jsx';
let src=fs.readFileSync(FILE,'utf8');

// Find the problem: after broadcastUpdate closing, JSX starts without return
const target='        } catch {}\n    };\r\n\r\n            <div style={{ display: "flex", justifyContent: "space-between"';
const idx=src.indexOf('} catch {}\r\n    };\r\n\r\n            <div style={{ display: "flex", justifyContent: "space-between"');
if(idx===-1){console.log('Pattern not found, trying alt');
  // Try finding broadcastUpdate closing + immediate JSX
  const alt=src.indexOf('bc.close();\r\n        } catch {}\r\n    };\r\n\r\n            <div');
  if(alt===-1){console.log('Alt pattern not found either');process.exit(1);}
  console.log('Found alt at',alt);
}

// Insert the missing functions + return statement
const insertPoint=src.indexOf('            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>');
if(insertPoint===-1){console.log('Insert point not found');process.exit(1);}

const missingCode=`
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

src=src.substring(0,insertPoint)+missingCode+src.substring(insertPoint);
fs.writeFileSync(FILE,src,'utf8');

// Also need to add the table opening before the category mapping table
// Find overflowX:auto for the table
let src2=fs.readFileSync(FILE,'utf8');
const catMapTable='                {t(\'catalogSync.addCustomCategory\')}';
const catMapIdx=src2.indexOf(catMapTable);
if(catMapIdx!==-1){
  // After the add button div, we need the table
  const afterAddBtn=src2.indexOf('</div>\r\n',catMapIdx+catMapTable.length);
  if(afterAddBtn!==-1){
    // Check if overflowX table exists
    const checkArea=src2.substring(afterAddBtn,afterAddBtn+400);
    if(!checkArea.includes('<table') && !checkArea.includes('overflowX')){
      console.log('Need to add table wrapper');
      const tableStart=`
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280", minWidth: 160 }}>{t('catalogSync.internalCategory')}</th>
                            {connectedChs.map(ch => (
                                <th key={ch.id} style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280", minWidth: 140 }}>
                                    <span style={{ fontSize: 14 }}>{ch.icon}</span> {ch.name} {ch.connected && <span style={{fontSize:8,color:'#22c55e'}}>✅</span>}
                                </th>
                            ))}
                            <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280", width: 80 }}>{t('catalogSync.mappingStatus')}</th>
                            <th style={{ width: 50 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {mappings.map(m => {
                            const mappedCount = Object.values(m.channels).filter(v => v).length;
                            const isMapped = mappedCount > 0;
                            const displayLabel = m.labelKey ? t(\`catalogSync.\${m.labelKey}\`) : (m.label || m.internal);
                            return (
                                <tr key={m.internal} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "8px" }}>
                                        <div style={{ fontWeight: 600, fontSize: 12, color: "#1f2937" }}>
                                            {displayLabel}
                                            {m.isCustom && <span style={{ fontSize: 8, marginLeft: 6, padding: "1px 5px", borderRadius: 4, background: "#dbeafe", color: "#2563eb" }}>{t('catalogSync.customCategoryLabel')}</span>}
                                        </div>
                                        <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>{m.internal}</div>
                                    </td>
                                    {connectedChs.map(ch => (
                                        <td key={ch.id} style={{ padding: "8px" }}>
                                            <input
`;
      // Find next '</div>' after addBtn
      const insertPt2=src2.indexOf('</div>\r\n',catMapIdx+catMapTable.length)+7;
      src2=src2.substring(0,insertPt2)+tableStart+src2.substring(insertPt2);
      fs.writeFileSync(FILE,src2,'utf8');
      console.log('✅ Table wrapper added');
    }
  }
}

// Verify
const final=fs.readFileSync(FILE,'utf8');
const flines=final.split(/\r?\n/);
let fd=0;
for(let i=0;i<flines.length;i++){for(const c of flines[i]){if(c==='{')fd++;if(c==='}')fd--;}if(fd<0){console.log('❌',i+1,fd);break;}}
console.log('Final depth:',fd);
