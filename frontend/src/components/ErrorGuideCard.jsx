import React from "react";

import ko from '../i18n/locales/ko.js';
const t = (k) => k.split('.').reduce((o,i)=>o?.[i], {auto: ko?.auto}) || k;


function Pill({ children }) {
  return (
    <span className="pill" style={{ fontSize: 12, padding: "4px 10px" }}>
      {children}
    </span>
  );
}

export default function ErrorGuideCard({ errorDetail }) {
  if (!errorDetail) return null;
  const d = errorDetail;

  const guide = d?.detail?.guide_ko || d?.guide_ko || d?.detail?.guide || d?.guide || "";
  const guideLines = String(guide || "")
    .split(/\n|\r\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const msg = d?.message || d?.detail?.message || d?.detail?.error || d?.error || "요청 실패";
  const category = d?.category || d?.detail?.category || "UNKNOWN";
  const provider = d?.provider || d?.detail?.provider || "";
  const retryable = (d?.retryable ?? d?.detail?.retryable);
  const httpStatus = d?.http_status || d?.detail?.http_status;

  return (
    <div className="card" style={{ borderRadius: 18 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Troubleshooting Guide</div>
        <Pill>{category}</Pill>
        {provider ? <Pill>{provider}</Pill> : null}
        {httpStatus ? <Pill>HTTP {httpStatus}</Pill> : null}
        {retryable === true ? <Pill>retryable</Pill> : null}
        {retryable === false ? <Pill>non-retryable</Pill> : null}
      </div>

      <div style={{ marginTop: 10, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 700 }}>{msg}</div>
        <div className="sub" style={{ marginTop: 6 }}>
          If the same error repeats: Check token/permissions → required fields → policy/quota → temporary outage.
        </div>
      </div>

      {guideLines.length > 0 ? (
        <div style={{ marginTop: 12 }} className="guideGrid">
          {guideLines.map((line, idx) => (
            <div key={idx} className="guideItem">
              <div className="guideDot">•</div>
              <div>{line}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sub" style={{ marginTop: 12, opacity: 0.75 }}>
          가이드 정보가 없습니다. (provider 에러 바디/코드가 더 필요할 수 있어요)
        </div>
      )}

      {d?.detail ? (
        <details style={{ marginTop: 12 }}>
          <summary className="sub">Raw detail</summary>
          <pre className="code">{JSON.stringify(d, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
