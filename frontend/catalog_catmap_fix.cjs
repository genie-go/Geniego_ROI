const fs = require('fs');
const esbuild = require('esbuild');
const FILE = './src/pages/CatalogSync.jsx';
let src = fs.readFileSync(FILE, 'utf8');

// 1. Fix CategoryMappingTab: restore missing functions, return(), toast, wrapper
const catMapTarget = '        } catch {}\r\n    };\r\n\r\n            <div style={{ display: "flex", justifyContent: "space-between"';
const catMapIdx = src.indexOf(catMapTarget);

if (catMapIdx !== -1) {
  console.log('Found broken CatMap at', catMapIdx);
  
  // Replace from "} catch {}\n    };\n\n" to the start of the table overflowX div
  const restoreStart = src.indexOf('        } catch {}\r\n    };\r\n\r\n            <div style={{ display: "flex"');
  const restoreEnd = src.indexOf('            <div style={{ overflowX: "auto" }}>', restoreStart);
  
  if (restoreStart !== -1 && restoreEnd !== -1) {
    const replacement = `        } catch {}
    };

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
                <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 10, background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 13, zIndex: 500 }}>
                    {toast}
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1f2937" }}>{t('catalogSync.catMapTitle')}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{t('catalogSync.catMapDesc')}</div>
                </div>
                <button onClick={handleSave} style={{ padding: "8px 20px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    {t('catalogSync.save')}
                </button>
            </div>
            <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid rgba(99,140,255,0.15)", padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 16 }}>➕</span>
                <input style={{ ...inputStyle, flex: 1, maxWidth: 200 }} placeholder={t('catalogSync.addCategoryPh')} value={newCatId} onChange={e => setNewCatId(e.target.value)} />
                <input style={{ ...inputStyle, flex: 1, maxWidth: 250 }} placeholder={t('catalogSync.addCategoryLabelPh')} value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} />
                <button onClick={handleAddCategory} style={{ padding: "6px 14px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {t('catalogSync.addCustomCategory')}
                </button>
            </div>
`;
    
    src = src.substring(0, restoreStart) + replacement + src.substring(restoreEnd);
    console.log('✅ CatMap functions + return restored');
  }
}

// 2. Fix any remaining duplicate style attributes
src = src.replace(/style=\{\{([^}]+)\}\}\s*style=\{\{([^}]+)\}\}/g, 
  (m, a, b) => `style={{ ${a.trim()}, ${b.trim()} }}`);

// 3. Replace remaining CSS vars
src = src.replace(/var\(--text-1\)/g, '#1f2937');
src = src.replace(/var\(--text-2\)/g, '#374151');
src = src.replace(/var\(--text-3\)/g, '#6b7280');

fs.writeFileSync(FILE, src, 'utf8');

// Verify
esbuild.transform(fs.readFileSync(FILE, 'utf8'), { loader: 'jsx' })
  .then(() => console.log('✅ esbuild OK!'))
  .catch(e => {
    const m = e.message.match(/:(\d+):(\d+):.*?ERROR:\s*(.+)/);
    console.log(`❌ ${m ? `line ${m[1]}:${m[2]} ${m[3]}` : e.message.slice(0, 300)}`);
  });
