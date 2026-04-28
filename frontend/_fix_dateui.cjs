const fs = require('fs');
const file = 'd:\\project\\GeniegoROI\\frontend\\src\\pages\\Marketing.jsx';
let c = fs.readFileSync(file, 'utf8');

// The date filter UI and chart container div were deleted.
// Need to restore them before the KPI cards section.
// Current broken: card-glass div opens, then directly has KPI cards inside it.
// Should be: card-glass (date filter) closes, then a NEW card-glass (chart area) opens with KPI cards.

const broken = `            <div className="card card-glass" style={{ padding: "16px 22px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", borderLeft: "4px solid #22c55e" }}>\r
                \r
                {/* 5 Dropdown KPI Cards */}`;

const fixed = `            <div className="card card-glass" style={{ padding: "16px 22px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", borderLeft: "4px solid #22c55e" }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-1)", marginBottom: 4 }}>
                        {t('marketing.strictDateFilter', "📅 Campaign Active Period (Strict Date Filter)")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {t('marketing.strictDateDesc', "Ignores cache and fetches live operational data instantly.")}
                    </div>
                </div>
                
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                           style={{ background: "#f0f4ff", border: "2px solid #4f8ef7", borderRadius: 8, padding: "8px 12px", color: "#1a1a2e", outline: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }} />
                    <span style={{ color: "var(--text-3)", fontWeight: 700 }}>~</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                           style={{ background: "#f0f4ff", border: "2px solid #4f8ef7", borderRadius: 8, padding: "8px 12px", color: "#1a1a2e", outline: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }} />
                </div>
            </div>

            {/* Amazon-Style Top Visualization Area */}
            <div className="card card-glass fade-up" style={{ padding: 24, paddingBottom: 0, animationDelay: "100ms" }}>
                
                {/* 5 Dropdown KPI Cards */}`;

if (c.includes(broken)) {
    c = c.replace(broken, fixed);
    fs.writeFileSync(file, c, 'utf8');
    console.log('✅ Date filter UI restored with bright styling!');
} else {
    // Try without \r
    const broken2 = broken.replace(/\r\n/g, '\n').replace(/\r/g, '');
    if (c.includes(broken2)) {
        c = c.replace(broken2, fixed);
        fs.writeFileSync(file, c, 'utf8');
        console.log('✅ Date filter UI restored (LF mode)!');
    } else {
        console.log('❌ Cannot find broken section');
        const idx = c.indexOf('card card-glass" style={{ padding: "16px 22px"');
        if (idx > 0) {
            console.log('Found card-glass at:', idx);
            console.log('Context:', c.substring(idx, idx+300));
        }
    }
}
