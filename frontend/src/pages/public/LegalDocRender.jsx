import React, { useState, useEffect } from "react";
import { siteLang } from "./siteI18n.js";

/**
 * [239차+] 공개 법적 페이지(약관/개인정보/환불) DB 콘텐츠 조회 훅 + 안전 렌더러.
 *   admin(LegalDocsAdmin)이 편집한 다국어 콘텐츠를 /auth/legal/{key} 에서 조회.
 *   콘텐츠 없으면 null → 호출 페이지가 기존 하드코딩으로 graceful 폴백(무회귀).
 */
export function useLegalDoc(key) {
    const [doc, setDoc] = useState(null);
    const [lang, setLang] = useState(siteLang());
    useEffect(() => {
        const onL = (e) => { if (e?.detail?.lang) setLang(e.detail.lang); };
        window.addEventListener("genie-lang-change", onL);
        return () => window.removeEventListener("genie-lang-change", onL);
    }, []);
    useEffect(() => {
        const base = import.meta.env.VITE_API_BASE || "";
        const L = lang || "en";
        let alive = true;
        setDoc(null); // 언어 전환 시 폴백(하드코딩) 잠깐 노출 후 DB 콘텐츠로 교체
        fetch(`${base}/auth/legal/${encodeURIComponent(key)}?lang=${encodeURIComponent(L)}`)
            .then(r => r.json())
            .then(d => { if (alive && d && d.ok && d.doc && (d.doc.body || "").trim()) setDoc(d.doc); })
            .catch(() => {});
        return () => { alive = false; };
    }, [key, lang]);
    return doc;
}

// inline **bold** → <strong> (안전: React 엘리먼트, innerHTML 미사용)
function inlineBold(text, S) {
    const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
        /^\*\*[^*]+\*\*$/.test(p)
            ? <strong key={i} style={{ color: "#fff" }}>{p.slice(2, -2)}</strong>
            : <React.Fragment key={i}>{p}</React.Fragment>
    );
}

/**
 * lite-markdown 안전 파서/렌더러:
 *   "## 제목" → h2, "### 제목" → h3, "- 항목" 연속 → ul, 빈 줄 구분 문단 → p, **굵게** → strong.
 *   HTML 주입 없음(React 엘리먼트만 생성) → XSS 없음.
 */
function renderBody(body, S) {
    const lines = String(body).replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let para = [];
    let list = [];
    const flushPara = (k) => { if (para.length) { out.push(<p key={"p" + k} style={S.p}>{inlineBold(para.join(" "), S)}</p>); para = []; } };
    const flushList = (k) => { if (list.length) { out.push(<ul key={"u" + k} style={S.ul}>{list.map((li, j) => <li key={j} style={S.li}>{inlineBold(li, S)}</li>)}</ul>); list = []; } };
    lines.forEach((raw, i) => {
        const line = raw.trimEnd();
        if (/^###\s+/.test(line)) { flushPara(i); flushList(i); out.push(<h3 key={"h3" + i} style={S.h3}>{inlineBold(line.replace(/^###\s+/, ""), S)}</h3>); }
        else if (/^##\s+/.test(line)) { flushPara(i); flushList(i); out.push(<h2 key={"h2" + i} style={S.h2}>{inlineBold(line.replace(/^##\s+/, ""), S)}</h2>); }
        else if (/^[-*]\s+/.test(line)) { flushPara(i); list.push(line.replace(/^[-*]\s+/, "")); }
        else if (line.trim() === "") { flushPara(i); flushList(i); }
        else { flushList(i); para.push(line.trim()); }
    });
    flushPara("end"); flushList("end");
    return out;
}

export default function LegalDocRender({ doc, S }) {
    return (
        <>
            <section style={S.hero}>
                <div style={S.badge}>Legal</div>
                <h1 style={S.title}>{doc.title || ""}</h1>
                {doc.subtitle ? <p style={S.subtitle}>{doc.subtitle}</p> : null}
            </section>
            <div style={S.wrap}>
                <div style={S.section}>{renderBody(doc.body || "", S)}</div>
            </div>
        </>
    );
}
