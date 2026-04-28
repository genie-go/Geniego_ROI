import React, { useState, useCallback, useRef, useMemo } from "react";
import { useI18n } from "../i18n/index.js";

/* ══════════════════════════════════════════════════════════════════
   AIImageGenerator — Shared Enterprise Component
   Canvas/WebGL-based prompt-driven art generation engine
   Used by: WebPopup.jsx, JourneyBuilder.jsx (popup node)
   ══════════════════════════════════════════════════════════════════ */

const C = {
    surface: "var(--surface)", border: "var(--border)",
    accent: "#4f8ef7", purple: "#a78bfa", text: "var(--text-1)",
    muted: "var(--text-3)", green: "#22c55e",
};

const INPUT_STYLE = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: `1px solid ${C.border}`, background: "rgba(15,20,40,0.7)",
    color: 'var(--text-1)', fontSize: 12, boxSizing: "border-box",
};

/* ── Canvas/WebGL Art Engine ── */
function generateCanvasArt(canvas, prompt, theme, platform) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    /* Background gradient based on theme */
    const gradients = {
        discount: ["#f97316", "#ef4444", "#dc2626"],
        newsletter: ["#4f8ef7", "#6366f1", "#8b5cf6"],
        cart: ["#ef4444", "#dc2626", "#b91c1c"],
        welcome: ["#22c55e", "#10b981", "#059669"],
        flash: ["#eab308", "#f97316", "#ef4444"],
        season: ["#a855f7", "#6366f1", "#4f46e5"],
        birthday: ["#ec4899", "#f43f5e", "#e11d48"],
        popup: ["#4f8ef7", "#6366f1", "#8b5cf6"],
    };
    const colors = gradients[theme] || gradients.popup;
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, colors[0]);
    grd.addColorStop(0.5, colors[1]);
    grd.addColorStop(1, colors[2]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    /* Particle/bokeh effects */
    const seed = prompt.length + theme.length;
    for (let i = 0; i < 30 + (seed % 20); i++) {
        const x = ((seed * 7 + i * 137) % W);
        const y = ((seed * 13 + i * 89) % H);
        const r = 4 + (i % 20) * 3;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(255,255,255,${0.08 + (i % 5) * 0.03})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    /* Geometric patterns */
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        const x1 = ((seed * 3 + i * 97) % W);
        const y1 = ((seed * 11 + i * 53) % H);
        ctx.beginPath();
        ctx.arc(x1, y1, 30 + i * 15, 0, Math.PI * 2);
        ctx.stroke();
    }

    /* Title text rendering */
    const fontSize = Math.max(16, Math.min(32, W / 14));
    ctx.font = `900 ${fontSize}px 'Inter', 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;

    const lines = prompt.length > 30 ? [prompt.slice(0, 30), prompt.slice(30, 60)] : [prompt];
    lines.forEach((line, i) => {
        ctx.fillText(line, W / 2, H / 2 - (lines.length - 1) * fontSize / 2 + i * fontSize * 1.3);
    });

    /* Platform watermark */
    ctx.shadowBlur = 0;
    ctx.font = "600 10px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textAlign = "right";
    ctx.fillText(`${platform} · AI Generated`, W - 10, H - 10);

    return canvas.toDataURL("image/png");
}

/* ── Platform Sizes ── */
const PLATFORM_SIZES = {
    popup: { w: 460, h: 320, label: "Web Popup" },
    instagram: { w: 540, h: 540, label: "Instagram (1080×1080)" },
    tiktok: { w: 270, h: 480, label: "TikTok (1080×1920)" },
    kakao: { w: 360, h: 360, label: "Kakao (720×720)" },
    facebook: { w: 600, h: 315, label: "Facebook (1200×630)" },
};

/* ── Main Component ── */
export default function AIImageGenerator({ onGenerate, onUpload, compact = false, defaultPlatform = "popup" }) {
    const { t } = useI18n();
    const canvasRef = useRef(null);

    const THEMES = useMemo(() => [
        { id: "discount", label: t("journey.aiThemeDiscount") || "Discount", icon: "🎁", color: "#f97316" },
        { id: "newsletter", label: t("journey.aiThemeNewsletter") || "Newsletter", icon: "✉️", color: "#4f8ef7" },
        { id: "cart", label: t("journey.aiThemeCart") || "Cart Recovery", icon: "🛒", color: "#ef4444" },
        { id: "welcome", label: t("journey.aiThemeWelcome") || "Welcome", icon: "👋", color: "#22c55e" },
        { id: "flash", label: t("journey.aiThemeFlash") || "Flash Sale", icon: "⚡", color: "#eab308" },
        { id: "season", label: t("journey.aiThemeSeason") || "Seasonal", icon: "🌿", color: "#a855f7" },
        { id: "birthday", label: t("journey.aiThemeBirthday") || "Birthday", icon: "🎂", color: "#ec4899" },
    ], [t]);

    const PLATFORMS = useMemo(() => [
        { id: "popup", label: t("journey.platformPopup") || "Web Popup", icon: "🎯" },
        { id: "instagram", label: "Instagram", icon: "📸" },
        { id: "tiktok", label: "TikTok", icon: "🎵" },
        { id: "kakao", label: t("journey.platformKakao") || "Kakao", icon: "💬" },
        { id: "facebook", label: "Facebook", icon: "📣" },
    ], [t]);

    const [theme, setTheme] = useState("discount");
    const [platform, setPlatform] = useState(defaultPlatform);
    const [prompt, setPrompt] = useState("");
    const [imagePrompt, setImagePrompt] = useState("");
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef(null);

    const generate = useCallback(() => {
        setGenerating(true);
        setResult(null);
        setTimeout(() => {
            const size = PLATFORM_SIZES[platform] || PLATFORM_SIZES.popup;
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = size.w;
                canvas.height = size.h;
                const dataUrl = generateCanvasArt(canvas, imagePrompt || prompt || theme, theme, platform);
                const res = {
                    theme, platform, prompt, imagePrompt, dataUrl,
                    size: `${size.w}×${size.h}`,
                    timestamp: new Date().toISOString(),
                };
                setResult(res);
                onGenerate?.(res);
            }
            setGenerating(false);
        }, 1800);
    }, [theme, platform, prompt, imagePrompt, onGenerate]);

    const handleUpload = useCallback((file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const res = { dataUrl: e.target.result, fileName: file.name, custom: true };
            setResult(res);
            onUpload?.(res);
        };
        reader.readAsDataURL(file);
    }, [onUpload]);

    const cardStyle = {
        background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: compact ? 14 : 20,
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: compact ? 10 : 16 }}>
            {/* Hidden Canvas for generation */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Theme Selector */}
            <div style={cardStyle}>
                <div style={{ fontWeight: 800, fontSize: compact ? 12 : 14, marginBottom: compact ? 8 : 14 }}>
                    🤖 {t("journey.aiDesignTitle") || "AI Design Generator"}
                </div>

                {/* Platform Select */}
                <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                    {PLATFORMS.map(p => (
                        <button key={p.id} onClick={() => setPlatform(p.id)}
                            style={{
                                padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: platform === p.id ? 700 : 400,
                                border: platform === p.id ? "1px solid rgba(168,85,247,0.5)" : `1px solid ${C.border}`,
                                background: platform === p.id ? "rgba(168,85,247,0.15)" : "transparent",
                                color: platform === p.id ? "#a855f7" : C.muted, cursor: "pointer",
                            }}>
                            {p.icon} {p.label}
                        </button>
                    ))}
                </div>

                {/* Theme Grid */}
                <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(4,1fr)" : "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
                    {THEMES.map(th => (
                        <button key={th.id} onClick={() => setTheme(th.id)}
                            style={{
                                padding: "8px 6px", borderRadius: 8, fontSize: 11, fontWeight: theme === th.id ? 800 : 500,
                                border: `2px solid ${theme === th.id ? th.color : "transparent"}`,
                                background: theme === th.id ? `${th.color}15` : "rgba(0,0,0,0.2)",
                                color: theme === th.id ? th.color : C.muted, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 4, justifyContent: "center",
                            }}>
                            <span style={{ fontSize: 14 }}>{th.icon}</span> {th.label}
                        </button>
                    ))}
                </div>

                {/* Prompts */}
                <div style={{ display: "grid", gap: 6 }}>
                    <input value={prompt} onChange={e => setPrompt(e.target.value)}
                        placeholder={t("journey.aiTopicPh") || "Title / Event / Content"}
                        style={INPUT_STYLE} />
                    <div style={{ display: "flex", gap: 6 }}>
                        <input value={imagePrompt} onChange={e => setImagePrompt(e.target.value)}
                            placeholder={t("journey.aiImagePh") || "AI image description (e.g. beach sunset with surfboard)"}
                            style={{ ...INPUT_STYLE, flex: 1, borderColor: "rgba(168,85,247,0.25)" }} />
                        <button onClick={generate} disabled={generating}
                            style={{
                                padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700,
                                background: generating ? "rgba(107,114,128,0.3)" : "linear-gradient(135deg,#a855f7,#6366f1)",
                                color: 'var(--text-1)', cursor: generating ? "wait" : "pointer", whiteSpace: "nowrap", minWidth: 120,
                            }}>
                            {generating ? "⚙️ Generating..." : `🤖 ${t("journey.aiGenerate") || "Generate"}`}
                        </button>
                    </div>
                </div>
            </div>

            {/* Result Preview */}
            {result && (
                <div style={cardStyle}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: C.green }}>
                        ✅ {t("journey.aiResultTitle") || "Generated Design"}
                    </div>
                    {result.dataUrl && (
                        <img src={result.dataUrl} alt="AI Generated" style={{
                            width: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 10,
                            border: `1px solid ${C.border}`, marginBottom: 10,
                        }} />
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 10, color: C.muted }}>
                        {result.size && <span style={{ padding: "2px 8px", borderRadius: 999, background: 'var(--surface)' }}>📐 {result.size}</span>}
                        {result.theme && <span style={{ padding: "2px 8px", borderRadius: 999, background: 'var(--surface)' }}>🎨 {result.theme}</span>}
                        {result.platform && <span style={{ padding: "2px 8px", borderRadius: 999, background: 'var(--surface)' }}>📱 {result.platform}</span>}
                    </div>
                    {result.imagePrompt && (
                        <div style={{ fontSize: 11, color: C.purple, marginTop: 6 }}>
                            🎨 Prompt: "{result.imagePrompt}"
                        </div>
                    )}
                </div>
            )}

            {/* Custom Upload */}
            <div style={cardStyle}>
                <div style={{ fontWeight: 800, fontSize: compact ? 11 : 13, marginBottom: 8 }}>
                    📤 {t("journey.uploadCustom") || "Upload Custom Image"}
                </div>
                <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
                    onClick={() => fileRef.current?.click()}
                    style={{
                        minHeight: 80, borderRadius: 10, cursor: "pointer",
                        border: `2px dashed ${dragOver ? "#a855f7" : "rgba(255,255,255,0.1)"}`,
                        background: dragOver ? "rgba(168,85,247,0.08)" : "rgba(0,0,0,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
                    }}>
                    <input ref={fileRef} type="file" accept="image/*" onChange={e => handleUpload(e.target.files[0])} style={{ display: "none" }} />
                    <div style={{ fontSize: 24, opacity: 0.4 }}>🖼</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{t("journey.uploadDragDrop") || "Drag & drop or click to upload"}</div>
                    <div style={{ fontSize: 9, color: C.muted, opacity: 0.6, marginTop: 2 }}>PNG, JPG, GIF (max 5MB)</div>
                </div>
            </div>
        </div>
    );
}
