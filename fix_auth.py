import sys

with open(r'd:\project\GeniegoROI\frontend\src\pages\AuthPage.jsx', 'r', encoding='utf8') as f:
    content = f.read()

missing_part = r'''function AuthLanguageSelector() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANG_OPTIONS.find(l => l.code === lang) || LANG_OPTIONS[0];

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(99,140,255,0.15)",
          color: "var(--text-1)", fontSize: 12, fontWeight: 600,
          cursor: "pointer", transition: "all 200ms",
          backdropFilter: "blur(12px)",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,140,255,0.08)"; e.currentTarget.style.borderColor = "rgba(99,140,255,0.3)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(99,140,255,0.15)"; }}
      >
        <span style={{ fontSize: 16 }}>{current.flag}</span>
        <span>{current.label}</span>
        <span style={{ fontSize: 10, opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>▼</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            minWidth: 200, zIndex: 1000,
            background: "rgba(15,20,35,0.97)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(99,140,255,0.15)",
            borderRadius: 14, padding: 6,
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            animation: "fadeInDown 150ms ease-out",
          }}>
            <div style={{ padding: "6px 10px 8px", fontSize: 10, fontWeight: 700, color: "var(--text-3)", borderBottom: "1px solid rgba(99,140,255,0.08)", marginBottom: 4 }}>
              🌐 Language / 언어 선택
            </div>
            {LANG_OPTIONS.map(opt => (
              <button
                key={opt.code}
                onClick={() => { setLang(opt.code); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 12px", borderRadius: 9,
                  border: "none", cursor: "pointer",
                  background: lang === opt.code ? "rgba(79,142,247,0.12)" : "transparent",
                  transition: "background 120ms",
                }}
                onMouseEnter={e => { if (lang !== opt.code) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (lang !== opt.code) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{opt.flag}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: lang === opt.code ? 700 : 500, color: lang === opt.code ? "#4f8ef7" : "var(--text-1)" }}>{opt.label}</div>
                  <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>{opt.name}</div>
                </div>
                {lang === opt.code && <span style={{ color: "#4f8ef7", fontSize: 14, fontWeight: 800 }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}'''

content = content.replace('function AuthLanguageSelector() {undefined', missing_part)
with open(r'd:\project\GeniegoROI\frontend\src\pages\AuthPage.jsx', 'w', encoding='utf8') as f:
    f.write(content)
print("Done")
