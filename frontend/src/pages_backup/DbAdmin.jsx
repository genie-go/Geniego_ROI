import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useI18n } from "../i18n";
import { useT } from '../i18n/index.js';

const API = (path) => `/v423/dbadmin${path}`;
const ADMIN_KEY = "process.env.API_KEY || ''";

async function apiFetch(path, opts = {}) {
    const r = await fetch(API(path), {
        headers: { Authorization: `Bearer ${ADMIN_KEY}`, "Content-Type": "application/json", ...opts.headers },
        ...opts,
    });
    return r.json();
}

/* ── helpers ─────────────────────────────────────────── */
function fmtBytes(b) {
    if (!b) return "0 B";
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / 1024 / 1024).toFixed(2) + " MB";
}

function Badge({ color, children }) {
    return (
        <span style={{
            padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 700,
            background: `${color}15`, color, border: `1px solid ${color}30`,
        }}>{children}</span>
    );
}

/* ── 보안: 위험 쿼리 패턴 감지 ── */
const DANGER_PATTERNS = [
    { pattern: /DROP\s+DATABASE/i, level: "critical", msg: "DROP DATABASE 명령은 차단됩니다." },
    { pattern: /DROP\s+TABLE/i, level: "danger", msg: "DROP TABLE 명령이 감지되었습니다." },
    { pattern: /TRUNCATE\s+TABLE/i, level: "danger", msg: "TRUNCATE TABLE 명령이 감지되었습니다." },
    { pattern: /DELETE\s+FROM\s+\w+\s*$/i, level: "warn", msg: "WHERE 없는 DELETE 명령이 감지되었습니다." },
    { pattern: /UPDATE\s+\w+\s+SET\s+.*(?<!WHERE\s+\S)/i, level: "warn", msg: "WHERE 없는 UPDATE 명령이 감지되었습니다." },
    { pattern: /INFORMATION_SCHEMA/i, level: "warn", msg: "시스템 테이블 접근이 감지되었습니다." },
    { pattern: /mysql\.\w+/i, level: "critical", msg: "MySQL 시스템 DB 접근은 차단됩니다." },
    { pattern: /INTO\s+OUTFILE/i, level: "critical", msg: "파일 출력 명령은 차단됩니다." },
    { pattern: /LOAD\s+DATA/i, level: "critical", msg: "외부 데이터 로드 명령은 차단됩니다." },
    { pattern: /GRANT\s+/i, level: "critical", msg: "권한 부여 명령은 차단됩니다." },
];

function checkSqlSecurity(sql) {
    const threats = [];
    for (const p of DANGER_PATTERNS) {
        if (p.pattern.test(sql)) threats.push(p);
    }
    return threats;
}

/* ── 쿼리 이력 관리 ── */
function getQueryHistory() {
    try { return JSON.parse(localStorage.getItem('db_query_history') || '[]'); } catch { return []; }
}
function addQueryHistory(sql, result, elapsed) {
    const h = getQueryHistory();
    h.unshift({ sql, time: new Date().toLocaleString('ko-KR'), result, elapsed });
    localStorage.setItem('db_query_history', JSON.stringify(h.slice(0, 100)));
}

/* ── 보안 로그 ── */
function getSecurityLog() {
    try { return JSON.parse(localStorage.getItem('db_security_log') || '[]'); } catch { return []; }
}
function addSecurityLog(type, msg, level) {
    const h = getSecurityLog();
    h.unshift({ time: new Date().toLocaleString('ko-KR'), type, msg, level });
    localStorage.setItem('db_security_log', JSON.stringify(h.slice(0, 200)));
}

/* ── SQL Editor ─────────────────────────────────────── */
function SqlEditor({ onSecAlert }) {
    const [sql, setSql] = useState("SELECT * FROM app_user LIMIT 10;");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [history, setHistory] = useState(getQueryHistory());
    const [showHistory, setShowHistory] = useState(false);

    const run = async () => {
        if (!sql.trim()) return;
        /* 보안 검사 */
        const threats = checkSqlSecurity(sql);
        if (threats.some(t => t.level === "critical")) {
            const blocked = threats.filter(t => t.level === "critical");
            setErr("🚨 차단됨: " + blocked.map(t => t.msg).join("; "));
            blocked.forEach(t => { addSecurityLog("쿼리 차단", t.msg, "danger"); onSecAlert?.(t.msg); });
            return;
        }
        if (threats.length > 0) {
            const msgs = threats.map(t => t.msg).join("\n");
            if (!window.confirm(`⚠️ 보안 경고:\n${msgs}\n\n정말 실행하시겠습니까?`)) {
                threats.forEach(t => addSecurityLog("위험 쿼리 감지", t.msg, "warn"));
                return;
            }
        }
        /* DML 확인 */
        const isDml = /^(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE)/i.test(sql.trim());
        if (isDml && !window.confirm("⚠️ 데이터 변경 쿼리입니다. 실행하시겠습니까?")) return;

        setLoading(true); setErr(""); setResult(null);
        const d = await apiFetch("/query", { method: "POST", body: JSON.stringify({ sql }) });
        setLoading(false);
        if (!d.ok) { setErr(d.error || "오류 발생"); addQueryHistory(sql, "ERROR: " + (d.error || ""), 0); return; }
        setResult(d);
        addQueryHistory(sql, d.type === "SELECT" ? `${d.count}건` : `영향 ${d.affected}건`, d.elapsed_ms);
        setHistory(getQueryHistory());
    };

    const exportResult = (fmt) => {
        if (!result || result.type !== "SELECT" || !result.rows.length) return;
        let content, type, ext;
        if (fmt === "csv") {
            content = "\uFEFF" + result.columns.join(",") + "\n" + result.rows.map(r => result.columns.map(c => String(r[c] ?? "")).join(",")).join("\n");
            type = "text/csv;charset=utf-8"; ext = "csv";
        } else {
            content = JSON.stringify(result.rows, null, 2);
            type = "application/json"; ext = "json";
        }
        const blob = new Blob([content], { type });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `query_result.${ext}`; a.click();
    };

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <div style={{ position: "relative" }}>
                <textarea
                    value={sql}
                    onChange={e => setSql(e.target.value)}
                    onKeyDown={e => { if (e.ctrlKey && e.key === "Enter") run(); }}
                    style={{
                        width: "100%", minHeight: 120, padding: "12px 14px", borderRadius: 10,
                        border: "1px solid rgba(99,140,255,0.25)", background: "rgba(0,0,0,0.3)",
                        color: "#4f8ef7", fontFamily: "'SF Mono',Monaco,monospace", fontSize: 12,
                        resize: "vertical", outline: "none", boxSizing: "border-box",
                    }}
                    placeholder="SELECT * FROM table_name LIMIT 10;&#10;&#10;Ctrl+Enter 로 실행"
                />
                <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, color: "#7c8fa8" }}>Ctrl+Enter</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={run} disabled={loading} style={{
                    padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: loading ? "rgba(79,142,247,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
                    color: 'var(--text-1)', fontWeight: 800, fontSize: 11,
                }}>▶ {loading ? "실행 중..." : "실행"}</button>
                <button onClick={() => { setSql(""); setResult(null); setErr(""); }} style={{
                    padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)",
                    background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 11,
                }}>초기화</button>
                <button onClick={() => setShowHistory(!showHistory)} style={{
                    padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)",
                    background: showHistory ? "rgba(79,142,247,0.1)" : "transparent",
                    color: showHistory ? "#4f8ef7" : "#94a3b8", cursor: "pointer", fontSize: 11,
                }}>📜 이력 ({history.length})</button>
                {result && result.type === "SELECT" && result.rows.length > 0 && <>
                    <button onClick={() => exportResult("csv")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)", background: "transparent", color: "#22c55e", cursor: "pointer", fontSize: 10 }}>📥 CSV</button>
                    <button onClick={() => exportResult("json")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(168,85,247,0.2)", background: "transparent", color: "#a855f7", cursor: "pointer", fontSize: 10 }}>📥 JSON</button>
                </>}
                {result && <span style={{ fontSize: 10, color: "#22c55e" }}>
                    {result.type === "SELECT" ? `${result.count}건 · ${result.elapsed_ms}ms` : `영향 ${result.affected}건 · ${result.elapsed_ms}ms`}
                </span>}
                {err && <span style={{ fontSize: 10, color: "#ef4444" }}>⚠ {err}</span>}
            </div>

            {/* 쿼리 이력 */}
            {showHistory && <div style={{ display: "grid", gap: 4, maxHeight: 200, overflowY: "auto", padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(99,140,255,0.1)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>📜 최근 쿼리 이력 ({history.length}건)</div>
                {history.length === 0 ? <div style={{ fontSize: 10, color: "#3b4d6e", textAlign: "center", padding: 10 }}>이력 없음</div> : history.slice(0, 20).map((h, i) => (
                    <div key={i} onClick={() => { setSql(h.sql); setShowHistory(false); }} style={{ padding: "6px 10px", borderRadius: 6, cursor: "pointer", background: 'var(--surface)', fontSize: 10, transition: "background 100ms" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}>
                        <div style={{ fontFamily: "monospace", color: "#4f8ef7", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.sql}</div>
                        <div style={{ fontSize: 8, color: "#7c8fa8" }}>{h.time} · {h.result} · {h.elapsed}ms</div>
                    </div>
                ))}
                {history.length > 0 && <button onClick={() => { localStorage.removeItem('db_query_history'); setHistory([]); }} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 9, marginTop: 4 }}>🗑 이력 전체 삭제</button>}
            </div>}

            {result && result.type === "SELECT" && result.rows.length > 0 && (
                <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid rgba(99,140,255,0.15)" }}>
                    <table className="table" style={{ fontSize: 10, minWidth: "max-content" }}>
                        <thead>
                            <tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr>
                        </thead>
                        <tbody>
                            {result.rows.map((r, i) => (
                                <tr key={i}>{result.columns.map(c => (
                                    <td key={c} style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {r[c] === null ? <em style={{ color: "#3b4d6e" }}>NULL</em>
                                            : (c.includes("password") || c.includes("token") || c.includes("hash") || c.includes("secret"))
                                                ? <span style={{ color: "#3b4d6e" }}>••••••••</span>
                                                : String(r[c])}
                                    </td>
                                ))}</tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {result && result.type === "WRITE" && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, color: "#22c55e" }}>
                    ✅ 쿼리 성공 — 영향 행 수: <strong>{result.affected}</strong>{result.last_insert_id ? ` · INSERT ID: ${result.last_insert_id}` : ""}
                </div>
            )}
        </div>
    );
}

/* ── Table Data Browser ─────────────────────────────── */
function TableData({ table }) {
    const [data, setData] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [orderBy, setOrderBy] = useState("id");
    const [orderDir, setOrderDir] = useState("DESC");
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const searchRef = useRef();

    const load = useCallback(async () => {
        setLoading(true);
        const d = await apiFetch(
            `/tables/${table}/rows?page=${page}&limit=50&search=${encodeURIComponent(search)}&order_by=${orderBy}&order_dir=${orderDir}`
        );
        setLoading(false);
        if (d.ok) setData(d);
    }, [table, page, search, orderBy, orderDir]);

    useEffect(() => { setPage(1); }, [table, search, orderBy, orderDir]);
    useEffect(() => { load(); }, [load]);

    const handleSort = (col) => {
        if (orderBy === col) setOrderDir(d => d === "ASC" ? "DESC" : "ASC");
        else { setOrderBy(col); setOrderDir("DESC"); }
    };

    const deleteRow = async (id) => {
        if (!window.confirm(`ID ${id} 행을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
        setDeleting(id);
        await apiFetch(`/tables/${table}/rows/${id}`, { method: "DELETE" });
        setDeleting(null);
        load();
    };

    const exportCsv = () => {
        if (!data || !data.rows.length) return;
        const h = data.columns.join(",") + "\n";
        const r = data.rows.map(row => data.columns.map(c => String(row[c] ?? "")).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + h + r], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${table}_data.csv`; a.click();
    };

    if (!data && loading) return <div style={{ padding: 20, color: "#3b4d6e", fontSize: 11 }}>로딩 중...</div>;

    return (
        <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: "1 1 150px" }}>
                    <input ref={searchRef} placeholder="검색어 입력..." style={{
                        padding: "7px 12px 7px 28px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)",
                        background: "rgba(0,0,0,0.2)", color: "var(--text-1)", fontSize: 11, outline: "none", width: "100%", boxSizing: "border-box",
                    }} onKeyDown={e => { if (e.key === "Enter") setSearch(e.target.value); }} />
                    <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12 }}>🔍</span>
                </div>
                <button onClick={() => setSearch(searchRef.current?.value || "")} style={{
                    padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)",
                    background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 11,
                }}>검색</button>
                <button onClick={exportCsv} style={{
                    padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)",
                    background: "transparent", color: "#22c55e", cursor: "pointer", fontSize: 10,
                }}>📥 CSV</button>
                {data && <span style={{ fontSize: 10, color: "#7c8fa8" }}>총 {data.total.toLocaleString()}건 · {data.page}/{data.pages} 페이지</span>}
                {loading && <span style={{ fontSize: 10, color: "#4f8ef7" }}>⟳ 갱신 중...</span>}
                <button onClick={load} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "#7c8fa8", cursor: "pointer", fontSize: 10 }}>🔄 새로고침</button>
            </div>

            {data && data.rows.length > 0 ? (
                <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid rgba(99,140,255,0.12)" }}>
                    <table className="table" style={{ fontSize: 10, minWidth: "max-content" }}>
                        <thead>
                            <tr>
                                <th style={{ width: 36 }}>#</th>
                                {data.columns.map(c => (
                                    <th key={c} onClick={() => handleSort(c)} style={{ cursor: "pointer", userSelect: "none" }}>
                                        {c} {orderBy === c ? (orderDir === "DESC" ? "↓" : "↑") : ""}
                                    </th>
                                ))}
                                <th>액션</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row, i) => (
                                <tr key={i} style={{ transition: "background 100ms" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <td style={{ color: "#3b4d6e" }}>{(data.page - 1) * 50 + i + 1}</td>
                                    {data.columns.map(c => (
                                        <td key={c} title={row[c] !== null ? String(row[c]) : "NULL"}
                                            style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {row[c] === null ? <em style={{ color: "#3b4d6e" }}>NULL</em>
                                                : (c.includes("password") || c.includes("token") || c.includes("hash") || c.includes("secret") || c.includes("api_key"))
                                                    ? <span style={{ color: "#3b4d6e" }}>••••••••</span>
                                                    : String(row[c]).length > 60 ? String(row[c]).slice(0, 60) + "…" : String(row[c])}
                                        </td>
                                    ))}
                                    <td>
                                        <button onClick={() => deleteRow(row.id)} disabled={!!deleting}
                                            style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer", fontSize: 9 }}>
                                            {deleting === row.id ? "..." : "🗑 삭제"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ padding: 20, textAlign: "center", color: "#3b4d6e", fontSize: 11 }}>📭 데이터 없음</div>
            )}

            {data && data.pages > 1 && (
                <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                    <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: "4px 10px", borderRadius: 6, border: '1px solid var(--border)', background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 10 }}>«</button>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "4px 10px", borderRadius: 6, border: '1px solid var(--border)', background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 10 }}>‹</button>
                    {Array.from({ length: Math.min(7, data.pages) }, (_, i) => {
                        const p = Math.max(1, Math.min(data.pages - 6, page - 3)) + i;
                        return (
                            <button key={p} onClick={() => setPage(p)} style={{
                                padding: "4px 10px", borderRadius: 6, border: "1px solid",
                                borderColor: page === p ? "#4f8ef7" : "rgba(255,255,255,0.06)",
                                background: page === p ? "rgba(79,142,247,0.15)" : "transparent",
                                color: page === p ? "#4f8ef7" : "#94a3b8", cursor: "pointer", fontSize: 10,
                            }}>{p}</button>
                        );
                    })}
                    <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} style={{ padding: "4px 10px", borderRadius: 6, border: '1px solid var(--border)', background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 10 }}>›</button>
                    <button onClick={() => setPage(data.pages)} disabled={page === data.pages} style={{ padding: "4px 10px", borderRadius: 6, border: '1px solid var(--border)', background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 10 }}>»</button>
                </div>
            )}
        </div>
    );
}

/* ── Table Structure ─────────────────────────────────── */
function TableStructure({ table }) {
    const [data, setData] = useState(null);
    const [truncating, setTruncating] = useState(false);
    const [showDdl, setShowDdl] = useState(false);

    useEffect(() => {
        apiFetch(`/tables/${table}`).then(d => { if (d.ok) setData(d); });
    }, [table]);

    const truncate = async () => {
        if (!window.confirm(`⚠️ '${table}' 테이블의 모든 데이터를 삭제합니다. 계속하시겠습니까?`)) return;
        if (!window.confirm(`🚨 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다!`)) return;
        setTruncating(true);
        const d = await apiFetch(`/tables/${table}/truncate`, { method: "POST" });
        setTruncating(false);
        alert(d.ok ? "✅ 테이블을 비웠습니다." : (d.error || "오류 발생"));
    };

    const keyTypeColor = (Non_unique, Key_name) => {
        if (Key_name === "PRIMARY") return "#f59e0b";
        if (!Non_unique) return "#4f8ef7";
        return "#22c55e";
    };

    if (!data) return <div style={{ padding: 20, color: "#3b4d6e", fontSize: 11 }}>로딩 중...</div>;

    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Badge color="#4f8ef7">총 {data.row_count.toLocaleString()}건</Badge>
                <Badge color="#a855f7">{data.columns.length}개 컬럼</Badge>
                <Badge color="#22c55e">{data.indexes.length}개 인덱스</Badge>
                <button onClick={() => setShowDdl(s => !s)} style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 10 }}>
                    {showDdl ? "DDL 숨기기" : "📄 CREATE TABLE DDL"}
                </button>
                <button onClick={truncate} disabled={truncating} style={{
                    padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer", fontSize: 10,
                }}>{truncating ? "처리 중..." : "🗑 TRUNCATE"}</button>
            </div>

            {showDdl && (
                <pre style={{
                    padding: 14, borderRadius: 10, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(99,140,255,0.15)",
                    fontSize: 10, color: "#4f8ef7", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
                }}>{data.create_sql}</pre>
            )}

            <div style={{ fontWeight: 800, fontSize: 11, color: "var(--text-1)" }}>📐 컬럼 구조</div>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid rgba(99,140,255,0.12)" }}>
                <table className="table" style={{ fontSize: 10 }}>
                    <thead>
                        <tr><th>#</th><th>컬럼명</th><th>타입</th><th>Null</th><th>키</th><th>기본값</th><th>추가</th><th>코멘트</th></tr>
                    </thead>
                    <tbody>
                        {data.columns.map((col, i) => (
                            <tr key={col.Field}>
                                <td style={{ color: "#3b4d6e" }}>{i + 1}</td>
                                <td><code style={{ color: "#4f8ef7", fontSize: 10 }}>{col.Field}</code></td>
                                <td><code style={{ color: "#a855f7", fontSize: 9 }}>{col.Type}</code></td>
                                <td style={{ textAlign: "center", color: col.Null === "YES" ? "#f59e0b" : "#22c55e" }}>
                                    {col.Null === "YES" ? "Y" : "N"}
                                </td>
                                <td>
                                    {col.Key === "PRI" && <Badge color="#f59e0b">PRI</Badge>}
                                    {col.Key === "UNI" && <Badge color="#4f8ef7">UNI</Badge>}
                                    {col.Key === "MUL" && <Badge color="#22c55e">IDX</Badge>}
                                </td>
                                <td style={{ color: "#3b4d6e", fontStyle: "italic", fontSize: 9 }}>
                                    {col.Default !== null ? String(col.Default) : "NULL"}
                                </td>
                                <td style={{ fontSize: 9, color: "#f59e0b" }}>{col.Extra || "—"}</td>
                                <td style={{ fontSize: 9, color: "#7c8fa8" }}>{col.Comment || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data.indexes.length > 0 && (
                <>
                    <div style={{ fontWeight: 800, fontSize: 11, color: "var(--text-1)" }}>🔑 인덱스</div>
                    <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid rgba(99,140,255,0.12)" }}>
                        <table className="table" style={{ fontSize: 10 }}>
                            <thead>
                                <tr><th>인덱스명</th><th>컬럼</th><th>타입</th><th>카디널리티</th></tr>
                            </thead>
                            <tbody>
                                {data.indexes.map((idx, i) => (
                                    <tr key={i}>
                                        <td style={{ color: keyTypeColor(idx.Non_unique, idx.Key_name), fontWeight: 700 }}>{idx.Key_name}</td>
                                        <td><code style={{ fontSize: 9 }}>{idx.Column_name}</code></td>
                                        <td>
                                            {idx.Key_name === "PRIMARY" && <Badge color="#f59e0b">PRIMARY</Badge>}
                                            {idx.Key_name !== "PRIMARY" && !idx.Non_unique && <Badge color="#4f8ef7">UNIQUE</Badge>}
                                            {idx.Non_unique === 1 && idx.Key_name !== "PRIMARY" && <Badge color="#22c55e">INDEX</Badge>}
                                        </td>
                                        <td style={{ color: "#7c8fa8" }}>{idx.Cardinality ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

/* ── 보안 모니터링 탭 ── */
function SecurityMonitor() {
    const [secLog, setSecLog] = useState(getSecurityLog());
    const reload = () => setSecLog(getSecurityLog());
    useEffect(() => { const iv = setInterval(reload, 5000); return () => clearInterval(iv); }, []);

    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-1)" }}>🛡️ DB 보안 모니터링</div>
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", fontSize: 11, color: "#22c55e", lineHeight: 1.7 }}>
                ✅ <strong>SQL 인젝션 방지 시스템</strong>이 활성화되어 있습니다.<br/>
                DROP DATABASE, 시스템 테이블 접근, 파일 출력, 권한 변경 명령이 자동 차단됩니다.<br/>
                위험 쿼리(DROP TABLE/TRUNCATE/WHERE 없는 DELETE) 실행 시 경고를 표시합니다.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {[{l:"총 이벤트",v:secLog.length,c:"#4f8ef7"},{l:"위험 경고",v:secLog.filter(x=>x.level==="danger").length,c:"#ef4444"},{l:"주의 알림",v:secLog.filter(x=>x.level==="warn").length,c:"#f59e0b"}].map(({l,v,c})=>(
                    <div key={l} style={{padding:14,borderRadius:12,background: 'var(--surface)',border: '1px solid var(--border)',textAlign:"center"}}>
                        <div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div>
                        <div style={{fontSize:11,color:"#94a3b8",marginTop:3}}>{l}</div>
                    </div>
                ))}
            </div>
            {secLog.length===0?<div style={{textAlign:"center",padding:"30px 0",color:"#22c55e",fontSize:12}}>✅ 보안 위협이 감지되지 않았습니다.</div>:secLog.slice(0,30).map((log,i)=>(
                <div key={i} style={{padding:"10px 14px",borderRadius:8,fontSize:11,background:log.level==="danger"?"rgba(239,68,68,0.05)":"rgba(245,158,11,0.05)",border:`1px solid ${log.level==="danger"?"rgba(239,68,68,0.2)":"rgba(245,158,11,0.2)"}`,color:log.level==="danger"?"#ef4444":"#f59e0b"}}>
                    <strong>[{log.time}] {log.type}</strong> — {log.msg}
                </div>
            ))}
            {secLog.length>0&&<button onClick={()=>{localStorage.removeItem('db_security_log');setSecLog([]);}} style={{padding:"6px 14px",borderRadius:6,border:"1px solid rgba(239,68,68,0.2)",background:"transparent",color:"#ef4444",cursor:"pointer",fontSize:10,justifySelf:"start"}}>🗑 보안 로그 초기화</button>}
        </div>
    );
}

/* ── GeniegoROI 전체 메뉴 구조도 (Enhanced) ── */
function MenuStructureMap() {
    const [filterMain, setFilterMain] = useState("");
    const [filterMid, setFilterMid] = useState("");
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedTab, setSelectedTab] = useState(null);
    const [viewMode, setViewMode] = useState("tree");
    const [diagramScope, setDiagramScope] = useState("all");
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    const toggleExpand = (id) => { setExpandedNodes(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; }); };
    const expandAll = () => { const all = new Set(); const walk = (nodes) => nodes.forEach(n => { all.add(n.id||n.label); if(n.children) walk(n.children); }); walk(MENU_TREE); setExpandedNodes(all); };
    const collapseAll = () => setExpandedNodes(new Set());

    /* ── 전체 메뉴 구조 데이터 ── */
    const MENU_TREE = useMemo(() => [
        { id:"home", icon:"🏠", label:"홈", color:"#4f8ef7", desc:"플랫폼 메인 대시보드 — 실시간 KPI·알림·이벤트를 한눈에 확인", planAccess:"Growth+", dataSource:"GlobalDataContext", children:[
            { id:"dashboard", label:"📊 통합 대시보드", desc:"전체 매출·마케팅·재고 KPI 위젯, 실시간 모니터", path:"/dashboard", planAccess:"Growth+", dataSource:"BroadcastChannel + REST API", sync:["홈 > 알림 피드","AI마케팅 > 캠페인","광고채널 > 성과분석"], tabs:[
                { label:"KPI 위젯", desc:"매출/마케팅/고객 핵심 지표 카드", fields:["총 매출","주문 건수","신규 고객","전환율","ROAS","객단가"], dataSource:"REST /api/dashboard/kpi", refreshRate:"30초", planAccess:"Growth+" },
                { label:"실시간 모니터", desc:"이벤트·채널별 실시간 데이터 스트림", fields:["실시간 주문","채널별 트래픽","에러 알림","서버 상태"], dataSource:"WebSocket /ws/realtime", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"알림 피드", desc:"자동화·보안·시스템 알림 타임라인", fields:["알림 유형","발생 시각","심각도","상태","처리자"], dataSource:"REST /api/alerts", refreshRate:"10초", planAccess:"Growth+" },
            ]},
            { id:"rollup", label:"🗂️ 롤업 대시보드", desc:"채널·기간별 데이터 롤업 요약", path:"/rollup", planAccess:"Growth+", dataSource:"REST API", sync:["광고채널 > 계정별 성과","커머스 > 옴니채널"], tabs:[
                { label:"일별 롤업", desc:"일자별 매출·주문·마진 요약", fields:["날짜","총매출","주문수","마진율"], dataSource:"REST /api/rollup/daily", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"채널별 롤업", desc:"판매채널별 실적 비교", fields:["채널","매출","주문수","반품율","수수료"], dataSource:"REST /api/rollup/channel", refreshRate:"1시간", planAccess:"Growth+" },
            ]},
        ]},
        { id:"ai_marketing", icon:"💎", label:"AI마케팅 자동화", color:"#a855f7", desc:"AI 기반 마케팅 자동화·캠페인·여정·예측을 통합 관리", planAccess:"Growth+", children:[
            { id:"auto_marketing", label:"💎 AI 자동화 마케팅", desc:"AI 룰 기반 자동 마케팅 실행 엔진", path:"/auto-marketing", planAccess:"Growth+", dataSource:"REST + BroadcastChannel", sync:["홈 > 대시보드","광고채널 > 예산추적","연동허브 > API키"], tabs:[
                { label:"전략 미리보기", desc:"AI가 생성한 마케팅 전략 프리뷰", fields:["전략명","타겟 세그먼트","예상 ROI","실행 채널","예산"], dataSource:"REST /api/ai/strategy", refreshRate:"요청 시", planAccess:"Growth+" },
                { label:"캠페인 설정", desc:"자동화 캠페인 파라미터 설정", fields:["캠페인명","시작/종료일","타겟 오디언스","예산","입찰전략"], dataSource:"REST /api/campaigns/setup", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"캠페인 관리", desc:"진행 중 캠페인 모니터링·제어", fields:["상태","소진예산","노출수","클릭수","전환수","ROAS"], dataSource:"REST /api/campaigns/manage", refreshRate:"5분", planAccess:"Growth+" },
                { label:"AI 소재 생성", desc:"AI 기반 광고 크리에이티브 자동 생성", fields:["소재 유형","카피","이미지/영상","A/B 변형","성과점수"], dataSource:"REST /api/ai/creative", refreshRate:"요청 시", planAccess:"Pro+" },
            ]},
            { id:"campaign", label:"🎯 캠페인 관리자", desc:"마케팅 캠페인 생성·실행·성과 분석", path:"/campaign-manager", planAccess:"Growth+", dataSource:"REST API", sync:["AI마케팅 > 자동화","광고채널 > 예산"], tabs:[
                { label:"캠페인 목록", desc:"전체 캠페인 CRUD·상태 관리", fields:["캠페인 ID","이름","채널","상태","예산","시작일","종료일"], dataSource:"REST /api/campaigns", refreshRate:"30초", planAccess:"Growth+" },
                { label:"A/B 테스트", desc:"캠페인 A/B 테스트 설정·결과", fields:["테스트 ID","변형 A/B","노출비율","전환율","통계적 유의성"], dataSource:"REST /api/campaigns/ab", refreshRate:"1시간", planAccess:"Pro+" },
                { label:"소재 관리", desc:"광고 크리에이티브 에셋 관리", fields:["소재 ID","유형","미리보기","CTR","사용 캠페인"], dataSource:"REST /api/creatives", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"캠페인 리포트", desc:"캠페인 성과 종합 리포트", fields:["노출","클릭","CPC","전환","CPA","ROAS","매출"], dataSource:"REST /api/campaigns/report", refreshRate:"1시간", planAccess:"Growth+" },
            ]},
            { id:"journey", label:"🗺️ 고객 여정 빌더", desc:"고객 라이프사이클 여정 자동화 설계", path:"/journey-builder", planAccess:"Pro+", dataSource:"REST API", sync:["고객CRM > 고객 데이터","AI마케팅 > 자동화"], tabs:[
                { label:"여정 캔버스", desc:"드래그&드롭 여정 설계 UI", fields:["노드 유형","트리거","조건분기","액션","대기시간"], dataSource:"REST /api/journeys/canvas", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"트리거 설정", desc:"여정 시작 조건 설정", fields:["트리거 유형","이벤트","세그먼트","스케줄","조건식"], dataSource:"REST /api/journeys/triggers", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"액션 노드", desc:"여정 내 실행 액션 관리", fields:["액션 유형","채널","메시지 템플릿","딜레이","조건"], dataSource:"REST /api/journeys/actions", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"여정 통계", desc:"여정 퍼널 분석·이탈 추적", fields:["진입수","완료수","이탈율","평균소요시간","전환율"], dataSource:"REST /api/journeys/stats", refreshRate:"1시간", planAccess:"Pro+" },
            ]},
            { id:"influencer", label:"🤝 인플루언서 허브", desc:"인플루언서 관리·성과 추적·UGC 수집", path:"/influencer", planAccess:"Pro+", dataSource:"REST API", sync:["콘텐츠 > 캘린더","광고채널 > 성과"], tabs:[
                { label:"인플루언서 DB", desc:"인플루언서 데이터베이스 관리", fields:["이름","팔로워수","플랫폼","카테고리","참여율","연락처"], dataSource:"REST /api/influencers", refreshRate:"일별", planAccess:"Pro+" },
                { label:"캠페인 관리", desc:"인플루언서 캠페인 생성·추적", fields:["캠페인명","인플루언서","일정","콘텐츠 유형","보상","상태"], dataSource:"REST /api/influencer/campaigns", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"성과 추적", desc:"인플루언서 콘텐츠 성과 분석", fields:["조회수","좋아요","댓글","공유","전환수","EMV"], dataSource:"REST /api/influencer/performance", refreshRate:"6시간", planAccess:"Pro+" },
                { label:"정산 관리", desc:"인플루언서 보상 정산", fields:["인플루언서","캠페인","보상 유형","금액","정산 상태","지급일"], dataSource:"REST /api/influencer/settlements", refreshRate:"실시간", planAccess:"Pro+" },
            ]},
            { id:"ai_recommend", label:"🧠 AI 추천 엔진", desc:"AI 기반 상품·콘텐츠 추천 최적화", path:"/ai-recommend", planAccess:"Pro+", dataSource:"ML Pipeline + REST", sync:["커머스 > 카탈로그","데이터 > 데이터 스키마"], tabs:[
                { label:"상품 추천", desc:"개인화 상품 추천 알고리즘", fields:["모델명","정확도","추천수","클릭율","전환율"], dataSource:"REST /api/ai/recommendations", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"모델 성능", desc:"추천 모델 A/B 성능 비교", fields:["모델 버전","NDCG","MAP","Recall","학습 일시"], dataSource:"REST /api/ai/models", refreshRate:"일별", planAccess:"Pro+" },
            ]},
        ]},
        { id:"ad_channel", icon:"📣", label:"광고·채널 분석", color:"#f59e0b", desc:"광고 채널별 성과·예산·기여도를 종합 분석", planAccess:"Growth+", children:[
            { id:"marketing", label:"📣 광고 성과 분석", desc:"채널별 광고 성과·ROAS·CPA 분석", path:"/marketing", planAccess:"Growth+", dataSource:"ConnectorSync + REST", sync:["AI마케팅 > 캠페인","홈 > 대시보드"], tabs:[
                { label:"성과 요약", desc:"전체 광고 성과 KPI 대시보드", fields:["총 광고비","노출수","클릭수","CTR","전환수","ROAS","CPA"], dataSource:"REST /api/ads/summary", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"채널별 성과", desc:"Google/Meta/Naver 등 채널별 비교", fields:["채널명","광고비","노출","클릭","전환","ROAS","CPA"], dataSource:"REST /api/ads/channels", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"상품별 성과", desc:"상품 단위 광고 성과 분석", fields:["상품명","SKU","광고비","매출","ROAS","전환수"], dataSource:"REST /api/ads/products", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"ROAS 분석", desc:"채널·캠페인별 ROAS 추이", fields:["기간","채널","캠페인","광고비","매출","ROAS"], dataSource:"REST /api/ads/roas", refreshRate:"일별", planAccess:"Growth+" },
            ]},
            { id:"budget_tracker", label:"💰 예산 추적기", desc:"광고 예산 실시간 소진·최적화 추적", path:"/budget-tracker", planAccess:"Growth+", dataSource:"REST API", sync:["AI마케팅 > 캠페인","재무 > 정산"], tabs:[
                { label:"예산 배분", desc:"채널별 예산 배분 현황", fields:["채널","배정 예산","소진 예산","소진율","잔여 예산"], dataSource:"REST /api/budget/alloc", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"예산 리포트", desc:"예산 집행 종합 리포트", fields:["기간","총 예산","총 소진","효율성","ROI"], dataSource:"REST /api/budget/report", refreshRate:"일별", planAccess:"Growth+" },
                { label:"ROI 계산기", desc:"예산 대비 수익률 시뮬레이션", fields:["투입 예산","예상 매출","예상 ROI","손익분기점"], dataSource:"클라이언트 계산", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"소진 예측", desc:"AI 기반 예산 소진 속도 예측", fields:["채널","일 소진율","예상 소진일","추천 조정액"], dataSource:"REST /api/budget/forecast", refreshRate:"6시간", planAccess:"Pro+" },
            ]},
            { id:"ai_budget", label:"💡 AI 예산 배분기", desc:"AI 기반 채널별 최적 예산 자동 배분", path:"/ai-budget-allocator", planAccess:"Pro+", dataSource:"ML + REST", sync:["광고채널 > 예산추적","AI마케팅 > 자동화"] },
            { id:"account_perf", label:"🏢 계정별 성과", desc:"광고 계정별 세부 성과 분석", path:"/account-performance", planAccess:"Growth+", dataSource:"REST API", sync:["광고채널 > 광고분석","연동허브 > API키"] },
            { id:"attribution", label:"🔗 기여도 분석", desc:"멀티터치 어트리뷰션 모델 분석", path:"/attribution", planAccess:"Pro+", dataSource:"Attribution Engine", sync:["광고채널 > 광고분석","데이터분석 > AI인사이트"], tabs:[
                { label:"채널 기여도", desc:"채널별 전환 기여 비중", fields:["채널","First Touch","Last Touch","Linear","Time Decay"], dataSource:"REST /api/attribution/channels", refreshRate:"일별", planAccess:"Pro+" },
                { label:"전환 경로", desc:"고객 전환 경로 분석", fields:["경로 ID","터치포인트","소요 시간","전환 여부"], dataSource:"REST /api/attribution/paths", refreshRate:"일별", planAccess:"Pro+" },
                { label:"ROAS 모델", desc:"어트리뷰션 기반 ROAS 재계산", fields:["채널","기존 ROAS","보정 ROAS","기여 매출"], dataSource:"REST /api/attribution/roas", refreshRate:"일별", planAccess:"Pro+" },
                { label:"터치 모델", desc:"어트리뷰션 모델 설정·비교", fields:["모델명","가중치","정확도","적용 기간"], dataSource:"REST /api/attribution/models", refreshRate:"실시간", planAccess:"Pro+" },
            ]},
            { id:"channel_kpi", label:"📊 채널 KPI", desc:"채널별 핵심 KPI 대시보드", path:"/channel-kpi", planAccess:"Growth+", dataSource:"BroadcastChannel + REST", sync:["홈 > 대시보드","광고채널 > 광고분석"], tabs:[
                { label:"노출·도달", desc:"채널별 노출/도달 KPI", fields:["채널","노출수","도달율","CPM","빈도"], dataSource:"REST /api/kpi/impressions", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"CPC·CPA", desc:"클릭/전환 비용 분석", fields:["채널","CPC","CPA","CTR","CVR"], dataSource:"REST /api/kpi/costs", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"전환율", desc:"채널별 전환 퍼널 분석", fields:["채널","방문","장바구니","결제","전환율"], dataSource:"REST /api/kpi/conversion", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"채널 비교", desc:"채널 간 교차 비교 차트", fields:["지표","채널A","채널B","차이","추이"], dataSource:"REST /api/kpi/compare", refreshRate:"일별", planAccess:"Growth+" },
            ]},
            { id:"graph_score", label:"🕸️ 그래프 스코어", desc:"채널 간 연관 그래프 스코어링", path:"/graph-score", planAccess:"Pro+", dataSource:"Graph Engine", sync:["광고채널 > 기여도","데이터분석 > AI인사이트"], tabs:[
                { label:"그래프 스코어", desc:"채널 간 영향도 스코어", fields:["소스 채널","타겟 채널","영향도 점수","신뢰도"], dataSource:"REST /api/graph/scores", refreshRate:"일별", planAccess:"Pro+" },
                { label:"AI 인사이트", desc:"그래프 기반 AI 분석", fields:["인사이트","중요도","액션 추천","영향 범위"], dataSource:"REST /api/graph/insights", refreshRate:"일별", planAccess:"Pro+" },
                { label:"NBA 추천", desc:"Next Best Action 추천", fields:["액션","예상 효과","우선순위","실행 채널"], dataSource:"REST /api/graph/nba", refreshRate:"일별", planAccess:"Pro+" },
                { label:"모델 성능", desc:"그래프 모델 정확도 추적", fields:["모델 버전","정확도","Recall","F1","학습일"], dataSource:"REST /api/graph/model", refreshRate:"일별", planAccess:"Pro+" },
                { label:"상품 추천", desc:"그래프 기반 상품 교차 추천", fields:["소스 상품","추천 상품","연관도","전환 예측"], dataSource:"REST /api/graph/products", refreshRate:"일별", planAccess:"Pro+" },
            ]},
        ]},
        { id:"customer", icon:"👥", label:"고객·CRM", color:"#22c55e", desc:"고객 관계 관리·카카오·이메일·SMS·인스타그램 통합 마케팅", planAccess:"Growth+", children:[
            { id:"crm", label:"👥 CRM 관리", desc:"고객 데이터 통합 관리·세그먼트", path:"/crm", planAccess:"Growth+", dataSource:"REST API", sync:["AI마케팅 > 여정빌더","광고채널 > 분석"], tabs:[
                { label:"고객 DB", desc:"전체 고객 데이터베이스", fields:["고객 ID","이름","이메일","가입일","LTV","세그먼트"], dataSource:"REST /api/crm/customers", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"고객 360", desc:"고객 통합 프로필 뷰", fields:["구매 이력","행동 로그","세그먼트","LTV","이탈 위험도"], dataSource:"REST /api/crm/360", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"고객 가져오기", desc:"외부 데이터 CSV/API 가져오기", fields:["소스","형식","매핑","검증","결과"], dataSource:"REST /api/crm/import", refreshRate:"요청 시", planAccess:"Growth+" },
                { label:"태그 관리", desc:"고객 태그·세분화 관리", fields:["태그명","조건식","대상 수","생성일"], dataSource:"REST /api/crm/tags", refreshRate:"실시간", planAccess:"Growth+" },
            ]},
            { id:"kakao", label:"💬 카카오 채널", desc:"카카오톡 채널 메시지·알림톡 발송", path:"/kakao-channel", planAccess:"Growth+", dataSource:"Kakao API + REST", sync:["고객CRM > CRM","연동허브 > API키"], tabs:[
                { label:"발송", desc:"카카오 메시지 즉시/예약 발송", fields:["수신자","메시지 유형","템플릿","발송 시각","상태"], dataSource:"REST /api/kakao/send", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"설정", desc:"카카오 채널 연동 설정", fields:["채널 ID","API키","발신 프로필","수신 동의"], dataSource:"REST /api/kakao/settings", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"통계", desc:"발송 성과 통계", fields:["발송수","도달수","열람수","클릭수","전환수"], dataSource:"REST /api/kakao/stats", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"알림톡", desc:"알림톡 템플릿 관리", fields:["템플릿 ID","유형","내용","승인 상태"], dataSource:"Kakao Biz API", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"친구톡", desc:"친구톡 메시지 관리", fields:["메시지 ID","수신자","이미지","버튼","발송 상태"], dataSource:"Kakao Biz API", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"비즈보드", desc:"카카오 비즈보드 광고 관리", fields:["캠페인","노출수","클릭수","전환수","CPC"], dataSource:"Kakao Biz API", refreshRate:"1시간", planAccess:"Pro+" },
            ]},
            { id:"email_mkt", label:"✉️ 이메일 마케팅", desc:"이메일 캠페인 작성·발송·성과 추적", path:"/email-marketing", planAccess:"Growth+", dataSource:"REST API", sync:["고객CRM > CRM","콘텐츠 > 캘린더"], tabs:[
                { label:"메일 발송", desc:"이메일 즉시/예약 발송", fields:["수신자","제목","본문","발송 시각","상태"], dataSource:"REST /api/email/send", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"A/B 테스트", desc:"이메일 A/B 테스트", fields:["제목 A/B","본문 변형","발송 비율","승리 기준"], dataSource:"REST /api/email/ab", refreshRate:"1시간", planAccess:"Pro+" },
                { label:"바운스 관리", desc:"바운스/수신거부 관리", fields:["이메일","바운스 유형","횟수","최근일","상태"], dataSource:"REST /api/email/bounce", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"예약 발송", desc:"예약 발송 관리", fields:["제목","예약 시각","수신자수","상태","취소"], dataSource:"REST /api/email/schedule", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"통계", desc:"이메일 성과 통계", fields:["발송수","열람율","클릭율","바운스율","구독취소율"], dataSource:"REST /api/email/stats", refreshRate:"1시간", planAccess:"Growth+" },
            ]},
            { id:"sms", label:"📱 SMS 마케팅", desc:"문자 메시지 캠페인 발송·관리", path:"/sms-marketing", planAccess:"Growth+", dataSource:"REST API", sync:["고객CRM > CRM","연동허브 > API키"], tabs:[
                { label:"문자 발송", desc:"SMS/LMS/MMS 발송", fields:["수신자","유형","내용","발송 시각","상태"], dataSource:"REST /api/sms/send", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"통계", desc:"문자 발송 성과 통계", fields:["발송수","성공율","실패율","비용"], dataSource:"REST /api/sms/stats", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"템플릿", desc:"문자 템플릿 관리", fields:["템플릿명","유형","내용","사용수"], dataSource:"REST /api/sms/templates", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"080 수신거부", desc:"080 수신거부 관리", fields:["번호","거부일","거부 경로","상태"], dataSource:"REST /api/sms/reject", refreshRate:"실시간", planAccess:"Growth+" },
            ]},
            { id:"popup", label:"🎯 웹 팝업", desc:"사이트 내 이벤트 팝업 관리·타겟팅", path:"/web-popup", planAccess:"Growth+", dataSource:"REST API", sync:["AI마케팅 > 자동화","고객CRM > CRM"], tabs:[
                { label:"팝업 목록", desc:"전체 팝업 CRUD", fields:["팝업 ID","제목","유형","노출 조건","상태","생성일"], dataSource:"REST /api/popups", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"팝업 에디터", desc:"비주얼 팝업 편집기", fields:["디자인","콘텐츠","CTA 버튼","배경","애니메이션"], dataSource:"클라이언트", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"트리거 설정", desc:"팝업 노출 조건 설정", fields:["트리거 유형","URL 조건","체류 시간","스크롤%","세그먼트"], dataSource:"REST /api/popups/triggers", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"A/B 테스트", desc:"팝업 A/B 테스트", fields:["변형 A/B","노출 비율","전환율","통계적 유의성"], dataSource:"REST /api/popups/ab", refreshRate:"1시간", planAccess:"Pro+" },
                { label:"노출 통계", desc:"팝업별 노출/클릭 통계", fields:["팝업","노출수","클릭수","전환수","CTR"], dataSource:"REST /api/popups/stats", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"이탈 팝업", desc:"이탈 방지 팝업 관리", fields:["팝업","트리거","노출수","이탈 방지율"], dataSource:"REST /api/popups/exit", refreshRate:"1시간", planAccess:"Growth+" },
            ]},
            { id:"calendar", label:"📅 콘텐츠 캘린더", desc:"마케팅 콘텐츠 일정 관리", path:"/content-calendar", planAccess:"Growth+", dataSource:"REST API", sync:["AI마케팅 > 캠페인","고객CRM > 이메일"] },
            { id:"reviews", label:"⭐ 리뷰·UGC", desc:"고객 리뷰·사용자 생성 콘텐츠 관리", path:"/reviews-ugc", planAccess:"Growth+", dataSource:"REST API", sync:["커머스 > 카탈로그","고객CRM > CRM"] },
        ]},
        { id:"commerce", icon:"🛒", label:"커머스·정산", color:"#06b6d4", desc:"옴니채널 커머스·카탈로그·주문·물류·가격·반품을 통합 관리", planAccess:"Growth+", children:[
            { id:"omni", label:"🌐 옴니채널", desc:"멀티채널 통합 커머스 관리", path:"/omni-channel", planAccess:"Growth+", dataSource:"ConnectorSync", sync:["연동허브 > API키","커머스 > 주문허브"], tabs:[
                { label:"채널 현황", desc:"연결 채널 목록·상태", fields:["채널명","연결 상태","마지막 동기화","주문수","매출"], dataSource:"ConnectorSyncContext", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"통합 주문", desc:"전 채널 주문 통합 뷰", fields:["주문 ID","채널","상품명","결제금액","상태","주문일"], dataSource:"REST /api/omni/orders", refreshRate:"5분", planAccess:"Growth+" },
                { label:"채널 동기화", desc:"채널별 동기화 설정·로그", fields:["채널","동기화 유형","주기","최근 결과","에러"], dataSource:"REST /api/omni/sync", refreshRate:"실시간", planAccess:"Growth+" },
            ]},
            { id:"catalog", label:"📂 카탈로그 동기화", desc:"채널별 상품 카탈로그 동기화", path:"/catalog-sync", planAccess:"Growth+", dataSource:"REST API", sync:["커머스 > 옴니채널","연동허브 > API키"], tabs:[
                { label:"상품 목록", desc:"전체 상품 관리", fields:["상품 ID","상품명","카테고리","가격","재고","상태"], dataSource:"REST /api/catalog/products", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"상품 등록", desc:"신규 상품 등록", fields:["상품명","설명","이미지","가격","SKU","카테고리"], dataSource:"REST /api/catalog/register", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"가격 관리", desc:"상품 가격 일괄 관리", fields:["상품","판매가","원가","마진율","채널별 가격"], dataSource:"REST /api/catalog/prices", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"재고 알림", desc:"재고 부족 알림 설정", fields:["상품","현재 재고","최소 재고","알림 상태"], dataSource:"REST /api/catalog/stock-alert", refreshRate:"10분", planAccess:"Growth+" },
                { label:"엑셀 관리", desc:"상품 데이터 엑셀 가져오기/내보내기", fields:["작업 유형","파일명","상태","처리 건수","오류"], dataSource:"REST /api/catalog/excel", refreshRate:"요청 시", planAccess:"Growth+" },
                { label:"채널 동기화", desc:"채널별 상품 동기화 상태", fields:["채널","동기화 상태","마지막 동기화","차이 건수"], dataSource:"REST /api/catalog/sync", refreshRate:"실시간", planAccess:"Growth+" },
            ]},
            { id:"order", label:"📦 주문 허브", desc:"전체 채널 주문 통합 관리", path:"/order-hub", planAccess:"Growth+", dataSource:"REST + BroadcastChannel", sync:["커머스 > 옴니채널","커머스 > 물류"], tabs:[
                { label:"전체 주문", desc:"전 채널 주문 목록", fields:["주문 ID","채널","고객","상품","결제금액","주문일","상태"], dataSource:"REST /api/orders", refreshRate:"5분", planAccess:"Growth+" },
                { label:"채널별 주문", desc:"채널별 주문 필터 뷰", fields:["채널","주문수","매출","취소율","반품율"], dataSource:"REST /api/orders/channels", refreshRate:"5분", planAccess:"Growth+" },
                { label:"엑셀 관리", desc:"주문 데이터 내보내기", fields:["기간","채널","형식","파일명","상태"], dataSource:"REST /api/orders/export", refreshRate:"요청 시", planAccess:"Growth+" },
                { label:"클레임 관리", desc:"교환·반품·클레임 처리", fields:["클레임 ID","주문 ID","유형","사유","상태","처리일"], dataSource:"REST /api/orders/claims", refreshRate:"실시간", planAccess:"Growth+" },
            ]},
            { id:"wms", label:"🏭 물류 관리(WMS)", desc:"창고·재고·입출고 관리 시스템", path:"/wms-manager", planAccess:"Pro+", dataSource:"REST API", sync:["커머스 > 주문허브","커머스 > 공급망"], tabs:[
                { label:"입고 관리", desc:"입고 예정·완료 관리", fields:["입고 ID","공급처","상품","수량","입고일","상태"], dataSource:"REST /api/wms/inbound", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"출고 관리", desc:"출고 요청·처리 관리", fields:["출고 ID","주문 ID","상품","수량","택배사","운송장"], dataSource:"REST /api/wms/outbound", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"재고 현황", desc:"실시간 재고 현황", fields:["상품","LOT","위치","가용재고","안전재고","상태"], dataSource:"REST /api/wms/inventory", refreshRate:"5분", planAccess:"Pro+" },
                { label:"위치 관리", desc:"창고 로케이션 관리", fields:["위치 코드","구역","선반","상품","용량"], dataSource:"REST /api/wms/locations", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"바코드", desc:"바코드 스캔·발행", fields:["바코드","상품","유형","인쇄 상태"], dataSource:"REST /api/wms/barcode", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"재고 조정", desc:"재고 실사·조정", fields:["조정 ID","상품","변경전","변경후","사유","승인"], dataSource:"REST /api/wms/adjust", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"재고 알림", desc:"재고 임계치 알림", fields:["상품","현재","최소","알림 유형","발생일"], dataSource:"REST /api/wms/alerts", refreshRate:"10분", planAccess:"Pro+" },
            ]},
            { id:"price_opt", label:"💡 가격 최적화", desc:"AI 기반 동적 가격 결정·최적화", path:"/price-opt", planAccess:"Enterprise", dataSource:"ML Pipeline", sync:["커머스 > 카탈로그","데이터분석 > AI인사이트"], tabs:[
                { label:"가격 추천", desc:"AI 최적가 추천", fields:["상품","현재가","추천가","예상 매출증가","신뢰도"], dataSource:"REST /api/price/recommendations", refreshRate:"일별", planAccess:"Enterprise" },
                { label:"탄력성 분석", desc:"가격 탄력성 분석", fields:["상품","가격 범위","수요 변화","탄력성 계수"], dataSource:"REST /api/price/elasticity", refreshRate:"일별", planAccess:"Enterprise" },
                { label:"가격 규칙", desc:"자동 가격 조정 규칙", fields:["규칙명","조건","조정 로직","적용 상품","상태"], dataSource:"REST /api/price/rules", refreshRate:"실시간", planAccess:"Enterprise" },
                { label:"시뮬레이션", desc:"가격 변경 시뮬레이션", fields:["시나리오","가격 변경","예상 수요","예상 매출","예상 마진"], dataSource:"REST /api/price/simulate", refreshRate:"요청 시", planAccess:"Enterprise" },
            ]},
            { id:"supply", label:"🔭 공급망 관리", desc:"공급망·물류 네트워크 최적화", path:"/supply-chain", planAccess:"Enterprise", dataSource:"REST API", sync:["커머스 > 물류","커머스 > 공급자"], tabs:[
                { label:"공급처 관리", desc:"공급처 목록·평가", fields:["공급처명","카테고리","리드타임","품질 점수","계약 상태"], dataSource:"REST /api/supply/suppliers", refreshRate:"실시간", planAccess:"Enterprise" },
                { label:"리드타임 분석", desc:"공급 리드타임 추적·최적화", fields:["공급처","상품","주문일","입고일","리드타임","편차"], dataSource:"REST /api/supply/leadtime", refreshRate:"일별", planAccess:"Enterprise" },
                { label:"리스크 감지", desc:"공급망 리스크 모니터링", fields:["리스크 유형","심각도","영향 범위","감지일","상태"], dataSource:"REST /api/supply/risk", refreshRate:"6시간", planAccess:"Enterprise" },
                { label:"타임라인", desc:"공급망 전체 일정 뷰", fields:["이벤트","일시","관련 공급처","상태","메모"], dataSource:"REST /api/supply/timeline", refreshRate:"실시간", planAccess:"Enterprise" },
            ]},
            { id:"returns", label:"🔄 반품 포털", desc:"반품·교환 통합 처리 시스템", path:"/returns-portal", planAccess:"Growth+", dataSource:"REST API", sync:["커머스 > 주문허브","커머스 > 물류"] },
        ]},
        { id:"analytics", icon:"📊", label:"데이터 분석", color:"#8b5cf6", desc:"성과·리포트·손익·AI인사이트·데이터 제품을 종합 분석", planAccess:"Growth+", children:[
            { id:"performance", label:"📊 성과 허브", desc:"전체 성과 KPI 통합 대시보드", path:"/performance", planAccess:"Growth+", dataSource:"REST + BroadcastChannel", sync:["홈 > 대시보드","광고채널 > 분석"], tabs:[
                { label:"성과 요약", desc:"통합 성과 KPI", fields:["매출","주문수","전환율","ROAS","고객수","객단가"], dataSource:"REST /api/perf/summary", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"채널별 성과", desc:"채널별 성과 비교", fields:["채널","매출","주문수","전환율","이익률"], dataSource:"REST /api/perf/channels", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"상품별 성과", desc:"상품 단위 성과 분석", fields:["상품","매출","판매수","마진","재구매율"], dataSource:"REST /api/perf/products", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"캠페인 성과", desc:"마케팅 캠페인 성과", fields:["캠페인","노출","클릭","전환","ROAS"], dataSource:"REST /api/perf/campaigns", refreshRate:"1시간", planAccess:"Growth+" },
                { label:"코호트 분석", desc:"고객 코호트 분석", fields:["코호트","가입 월","재구매율","LTV","이탈율"], dataSource:"REST /api/perf/cohort", refreshRate:"일별", planAccess:"Pro+" },
                { label:"멀티팀 분석", desc:"팀별 성과 비교", fields:["팀","매출","목표달성율","성장률"], dataSource:"REST /api/perf/teams", refreshRate:"일별", planAccess:"Pro+" },
            ]},
            { id:"report", label:"📋 리포트 빌더", desc:"맞춤형 리포트 생성·공유", path:"/report-builder", planAccess:"Growth+", dataSource:"REST API", sync:["데이터분석 > 성과허브","광고채널 > 분석"], tabs:[
                { label:"커스텀 리포트", desc:"맞춤형 리포트 생성기", fields:["리포트명","데이터소스","필터","차트 유형","공유 설정"], dataSource:"REST /api/reports/custom", refreshRate:"요청 시", planAccess:"Growth+" },
                { label:"엑셀 내보내기", desc:"리포트 엑셀 다운로드", fields:["리포트","형식","기간","파일명"], dataSource:"REST /api/reports/export", refreshRate:"요청 시", planAccess:"Growth+" },
                { label:"대시보드 공유", desc:"리포트 공유·권한 관리", fields:["리포트","공유 대상","권한","링크","만료일"], dataSource:"REST /api/reports/share", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"정기 리포트", desc:"정기 자동 리포트 발송", fields:["리포트명","주기","수신자","형식","마지막 발송"], dataSource:"REST /api/reports/scheduled", refreshRate:"일별", planAccess:"Pro+" },
                { label:"API 내보내기", desc:"리포트 API 스트리밍", fields:["엔드포인트","인증","형식","조건","사용량"], dataSource:"REST /api/reports/api", refreshRate:"실시간", planAccess:"Enterprise" },
            ]},
            { id:"pnl", label:"🌊 손익 분석", desc:"채널별 손익 계산서·마진 분석", path:"/pnl", planAccess:"Growth+", dataSource:"REST API", sync:["재무 > 정산","커머스 > 주문허브"], tabs:[
                { label:"손익 개요", desc:"전체 손익 대시보드", fields:["매출","원가","매출총이익","운영비","영업이익","순이익"], dataSource:"REST /api/pnl/overview", refreshRate:"일별", planAccess:"Growth+" },
                { label:"채널별 손익", desc:"채널별 손익 분석", fields:["채널","매출","원가","수수료","마진율"], dataSource:"REST /api/pnl/channels", refreshRate:"일별", planAccess:"Growth+" },
                { label:"상품별 손익", desc:"상품별 수익성 분석", fields:["상품","매출","원가","마진","회전율"], dataSource:"REST /api/pnl/products", refreshRate:"일별", planAccess:"Growth+" },
                { label:"손익 추이", desc:"기간별 손익 트렌드", fields:["기간","매출 추이","마진 추이","성장률"], dataSource:"REST /api/pnl/trends", refreshRate:"일별", planAccess:"Growth+" },
            ]},
            { id:"ai_insights", label:"🤖 AI 인사이트", desc:"AI 기반 데이터 인사이트·예측", path:"/ai-insights", planAccess:"Pro+", dataSource:"ML Pipeline", sync:["데이터분석 > 성과허브","AI마케팅 > 추천엔진"], tabs:[
                { label:"인사이트 피드", desc:"AI 자동 인사이트 요약", fields:["인사이트","카테고리","중요도","액션 추천","생성일"], dataSource:"REST /api/insights/feed", refreshRate:"6시간", planAccess:"Pro+" },
                { label:"이상 감지", desc:"데이터 이상치 자동 감지", fields:["지표","기대값","실제값","편차","심각도"], dataSource:"REST /api/insights/anomaly", refreshRate:"1시간", planAccess:"Pro+" },
                { label:"자동 리포트", desc:"AI가 생성한 자동 분석 리포트", fields:["리포트명","요약","핵심 인사이트","생성일"], dataSource:"REST /api/insights/auto-report", refreshRate:"일별", planAccess:"Pro+" },
                { label:"경쟁사 AI", desc:"경쟁사 동향 AI 분석", fields:["경쟁사","지표","추이","위협도","기회"], dataSource:"REST /api/insights/competitor", refreshRate:"일별", planAccess:"Pro+" },
            ]},
            { id:"data_product", label:"🗂️ 데이터 제품", desc:"데이터 제품 카탈로그·API 관리", path:"/data-product", planAccess:"Enterprise", dataSource:"Data Warehouse", sync:["데이터수집 > 데이터스키마","연동허브 > API키"] },
        ]},
        { id:"automation", icon:"🤖", label:"자동화 및 AI 규칙", color:"#ec4899", desc:"AI 규칙 엔진·승인·라이트백·온보딩 자동화", planAccess:"Growth+", children:[
            { id:"rule_engine", label:"🧠 AI 규칙 엔진", desc:"AI 기반 비즈니스 규칙 자동화", path:"/ai-rule-engine", planAccess:"Pro+", dataSource:"Rule Engine", sync:["AI마케팅 > 자동화","자동화 > 승인"], tabs:[
                { label:"규칙 목록", desc:"전체 자동화 규칙 관리", fields:["규칙명","트리거","조건","액션","상태","마지막 실행"], dataSource:"REST /api/rules", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"AI 정책", desc:"AI 기반 정책 자동 생성", fields:["정책명","AI 신뢰도","적용 범위","효과 예측"], dataSource:"REST /api/rules/ai-policy", refreshRate:"일별", planAccess:"Pro+" },
                { label:"실행 로그", desc:"규칙 실행 이력·결과", fields:["규칙","실행일","트리거","결과","영향 범위"], dataSource:"REST /api/rules/log", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"테스트", desc:"규칙 드라이런 테스트", fields:["규칙","입력 데이터","예상 결과","실제 결과","일치 여부"], dataSource:"REST /api/rules/test", refreshRate:"요청 시", planAccess:"Pro+" },
            ]},
            { id:"approvals", label:"✅ 승인 관리", desc:"작업 승인 워크플로우 관리", path:"/approvals", planAccess:"Pro+", dataSource:"REST API", sync:["자동화 > 규칙엔진","자동화 > 라이트백"], tabs:[
                { label:"정책 목록", desc:"승인 정책 관리", fields:["정책명","대상","승인자","자동/수동","상태"], dataSource:"REST /api/approvals/policies", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"승인 평가", desc:"대기 중 승인 요청", fields:["요청 ID","유형","요청자","승인자","상태","기한"], dataSource:"REST /api/approvals/evaluate", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"승인 로그", desc:"승인 이력 조회", fields:["요청","승인자","결과","일시","코멘트"], dataSource:"REST /api/approvals/log", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"액션 프리셋", desc:"승인 후 자동 액션 설정", fields:["프리셋명","트리거","액션","대상","상태"], dataSource:"REST /api/approvals/presets", refreshRate:"실시간", planAccess:"Pro+" },
            ]},
            { id:"writeback", label:"↩ 라이트백", desc:"데이터 역동기화·채널 라이트백", path:"/writeback", planAccess:"Enterprise", dataSource:"Writeback Engine", sync:["연동허브 > API키","자동화 > 규칙엔진"], tabs:[
                { label:"설정", desc:"라이트백 채널 설정", fields:["채널","대상","데이터 유형","주기","상태"], dataSource:"REST /api/writeback/config", refreshRate:"실시간", planAccess:"Enterprise" },
                { label:"실행 로그", desc:"라이트백 실행 이력", fields:["실행 ID","채널","건수","성공/실패","일시"], dataSource:"REST /api/writeback/log", refreshRate:"실시간", planAccess:"Enterprise" },
                { label:"롤백", desc:"라이트백 롤백 관리", fields:["실행 ID","롤백 대상","건수","상태","일시"], dataSource:"REST /api/writeback/rollback", refreshRate:"요청 시", planAccess:"Enterprise" },
            ]},
            { id:"onboarding", label:"🗺️ 온보딩", desc:"신규 사용자 온보딩 가이드 자동화", path:"/onboarding", planAccess:"Growth+", dataSource:"REST API", sync:["멤버 > 워크스페이스","시스템 > 관리자"], tabs:[
                { label:"시작하기", desc:"온보딩 첫 단계 가이드", fields:["단계","완료 여부","소요 시간"], dataSource:"localStorage", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"빠른 설정", desc:"필수 설정 빠른 완료", fields:["설정 항목","상태","필수 여부"], dataSource:"REST /api/onboarding/quick", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"설정 마법사", desc:"단계별 설정 마법사", fields:["단계","진행률","완료 일시"], dataSource:"REST /api/onboarding/wizard", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"튜토리얼", desc:"기능별 튜토리얼", fields:["모듈","완료율","소요 시간","퀴즈 점수"], dataSource:"REST /api/onboarding/tutorial", refreshRate:"실시간", planAccess:"Growth+" },
            ]},
        ]},
        { id:"data_collect", icon:"🔗", label:"데이터 및 수집", color:"#14b8a6", desc:"연동 허브·데이터 스키마·데이터 신뢰성을 통합 관리", planAccess:"Growth+", children:[
            { id:"integration", label:"🔗 연동 허브", desc:"API 키 등록·채널 연동 관리", path:"/integration-hub", planAccess:"Growth+", dataSource:"ConnectorSyncContext", sync:["전체 메뉴 > 채널 자동 동기화","커머스 > 옴니채널","광고채널 > 분석"], tabs:[
                { label:"쿠팡 연동", desc:"쿠팡 API 키 등록·연동", fields:["Access Key","Secret Key","Vendor ID","상태","마지막 동기화"], dataSource:"REST /api/connectors/coupang", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"네이버 연동", desc:"네이버 광고 API 연동", fields:["API Key","Secret","Customer ID","상태"], dataSource:"REST /api/connectors/naver", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"Meta 연동", desc:"Meta (Facebook/Instagram) 연동", fields:["App ID","Access Token","Ad Account","상태"], dataSource:"REST /api/connectors/meta", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"Google 연동", desc:"Google Ads 연동", fields:["Client ID","Refresh Token","Customer ID","상태"], dataSource:"REST /api/connectors/google", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"카카오 연동", desc:"카카오 모먼트 연동", fields:["App Key","Ad Account","상태"], dataSource:"REST /api/connectors/kakao", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"TikTok 연동", desc:"TikTok Ads 연동", fields:["App ID","Secret","Advertiser ID","상태"], dataSource:"REST /api/connectors/tiktok", refreshRate:"실시간", planAccess:"Growth+" },
            ]},
            { id:"data_schema", label:"📋 데이터 스키마", desc:"데이터 정규화·스키마 관리", path:"/data-schema", planAccess:"Pro+", dataSource:"Data Pipeline", sync:["데이터수집 > 연동허브","데이터분석 > 데이터제품"], tabs:[
                { label:"이벤트 수집", desc:"이벤트 데이터 수집 관리", fields:["이벤트명","소스","스키마","수집건수","에러율"], dataSource:"REST /api/schema/events", refreshRate:"5분", planAccess:"Pro+" },
                { label:"데이터 매핑", desc:"소스-타겟 필드 매핑", fields:["소스 필드","타겟 필드","변환 규칙","매핑 상태"], dataSource:"REST /api/schema/mapping", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"스키마 정의", desc:"데이터 스키마 정의·버전관리", fields:["스키마명","버전","필드수","변경일"], dataSource:"REST /api/schema/definitions", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"정규화", desc:"데이터 정규화 파이프라인", fields:["파이프라인","소스","규칙수","처리건수","상태"], dataSource:"REST /api/schema/normalize", refreshRate:"1시간", planAccess:"Enterprise" },
                { label:"데이터 마트", desc:"데이터 마트 관리", fields:["마트명","소스 테이블","업데이트 주기","용량"], dataSource:"REST /api/schema/marts", refreshRate:"일별", planAccess:"Enterprise" },
            ]},
            { id:"data_trust", label:"🔬 데이터 신뢰성", desc:"데이터 품질·정합성 모니터링", path:"/data-trust", planAccess:"Pro+", dataSource:"REST API", sync:["데이터수집 > 스키마","데이터분석 > AI인사이트"] },
            { id:"pixel", label:"🎯 픽셀 추적", desc:"웹사이트 추적 픽셀 관리", path:"/pixel-tracking", planAccess:"Pro+", dataSource:"REST API", sync:["데이터수집 > 연동허브","광고채널 > 기여도"], tabs:[
                { label:"픽셀 설정", desc:"추적 픽셀 설치·관리", fields:["픽셀 ID","유형","도메인","상태"], dataSource:"REST /api/pixel/config", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"스니펫 코드", desc:"설치 코드 생성", fields:["픽셀","코드","설치 위치","상태"], dataSource:"REST /api/pixel/snippet", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"수집 통계", desc:"픽셀 데이터 수집 현황", fields:["픽셀","이벤트수","페이지뷰","전환수","에러율"], dataSource:"REST /api/pixel/stats", refreshRate:"1시간", planAccess:"Pro+" },
                { label:"검증", desc:"픽셀 설치 검증", fields:["도메인","검증 결과","누락 이벤트","경고"], dataSource:"REST /api/pixel/verify", refreshRate:"요청 시", planAccess:"Pro+" },
            ]},
            { id:"api_keys", label:"🔑 API 키 관리", desc:"외부 API 키 발급·관리", path:"/api-keys", planAccess:"Pro+", dataSource:"REST API", sync:["연동허브 > 채널 연동","관리자 > API 사용량"], tabs:[
                { label:"키 목록", desc:"발급된 API 키 현황", fields:["키 ID","이름","권한","생성일","마지막 사용","상태"], dataSource:"REST /api/keys/list", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"키 발급", desc:"새 API 키 생성", fields:["이름","권한 범위","만료일","IP 제한"], dataSource:"REST /api/keys/create", refreshRate:"요청 시", planAccess:"Pro+" },
                { label:"사용 로그", desc:"API 호출 이력", fields:["키 ID","엔드포인트","응답코드","응답시간","일시"], dataSource:"REST /api/keys/log", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"OAuth 관리", desc:"OAuth 2.0 클라이언트 관리", fields:["Client ID","Redirect URI","Grant Type","상태"], dataSource:"REST /api/keys/oauth", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"Webhook", desc:"Webhook 엔드포인트 관리", fields:["URL","이벤트","상태","마지막 전송","성공률"], dataSource:"REST /api/keys/webhook", refreshRate:"실시간", planAccess:"Pro+" },
            ]},
        ]},
        { id:"billing", icon:"💰", label:"재무 및 정산", color:"#f97316", desc:"정산·대사·구독 요금제·감사 로그를 통합 관리", planAccess:"Growth+", children:[
            { id:"settlements", label:"📋 정산 관리", desc:"채널별 정산 내역 관리", path:"/settlements", planAccess:"Growth+", dataSource:"REST API", sync:["커머스 > 주문허브","재무 > 대사"], tabs:[
                { label:"정산 목록", desc:"전체 정산 내역", fields:["정산 ID","채널","기간","금액","수수료","상태"], dataSource:"REST /api/settlements/list", refreshRate:"일별", planAccess:"Growth+" },
                { label:"엑셀 내보내기", desc:"정산 데이터 내보내기", fields:["기간","채널","형식","파일명"], dataSource:"REST /api/settlements/export", refreshRate:"요청 시", planAccess:"Growth+" },
                { label:"정산 승인", desc:"정산 승인 워크플로우", fields:["정산 ID","금액","승인자","상태","일시"], dataSource:"REST /api/settlements/approve", refreshRate:"실시간", planAccess:"Pro+" },
                { label:"세금계산서", desc:"세금계산서 발행·관리", fields:["발행 ID","거래처","금액","발행일","상태"], dataSource:"REST /api/settlements/tax", refreshRate:"실시간", planAccess:"Pro+" },
            ]},
            { id:"reconciliation", label:"💰 대사 관리", desc:"입출금 대사·불일치 추적", path:"/reconciliation", planAccess:"Growth+", dataSource:"REST API", sync:["재무 > 정산","커머스 > 주문허브"], tabs:[
                { label:"대사 목록", desc:"대사 건별 관리", fields:["대사 ID","채널","주문 금액","정산 금액","차이","상태"], dataSource:"REST /api/recon/list", refreshRate:"일별", planAccess:"Growth+" },
                { label:"채널별 대사", desc:"채널별 대사 현황", fields:["채널","일치율","불일치 건수","금액 차이"], dataSource:"REST /api/recon/channels", refreshRate:"일별", planAccess:"Growth+" },
                { label:"월별 대사", desc:"월별 대사 요약", fields:["월","매출","정산","차이","일치율"], dataSource:"REST /api/recon/monthly", refreshRate:"월별", planAccess:"Growth+" },
                { label:"엑셀 내보내기", desc:"대사 데이터 내보내기", fields:["기간","채널","형식"], dataSource:"REST /api/recon/export", refreshRate:"요청 시", planAccess:"Growth+" },
            ]},
            { id:"pricing", label:"💳 구독 요금제", desc:"플랫폼 구독 요금제 관리", path:"/app-pricing", planAccess:"Growth+", dataSource:"REST API", sync:["관리자 > 구독관리","관리자 > 결제내역"], tabs:[
                { label:"내 플랜", desc:"현재 구독 플랜 정보", fields:["플랜","가격","기간","시작일","갱신일"], dataSource:"REST /api/pricing/my-plan", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"플랜 업그레이드", desc:"플랜 변경·업그레이드", fields:["현재 플랜","대상 플랜","가격 차이","변경 일시"], dataSource:"REST /api/pricing/upgrade", refreshRate:"요청 시", planAccess:"Growth+" },
                { label:"결제 내역", desc:"구독 결제 이력", fields:["결제 ID","금액","결제일","수단","상태"], dataSource:"REST /api/pricing/payments", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"인보이스", desc:"세금계산서·인보이스", fields:["인보이스 ID","기간","금액","발행일","상태"], dataSource:"REST /api/pricing/invoices", refreshRate:"월별", planAccess:"Growth+" },
            ]},
            { id:"audit", label:"🧾 감사 로그", desc:"재무 감사 로그 조회", path:"/audit", planAccess:"Pro+", dataSource:"REST API", sync:["보안감사 > 감사로그","관리자 > 보안"] },
        ]},
        { id:"member", icon:"👤", label:"멤버 구성형 도구", color:"#06b6d4", desc:"팀 워크스페이스·운영 도구·사례 연구를 관리", planAccess:"Growth+", children:[
            { id:"workspace", label:"👥 팀 워크스페이스", desc:"팀원 초대·역할 관리·협업", path:"/workspace", planAccess:"Growth+", dataSource:"REST API", sync:["관리자 > 사용자권한","시스템 > 관리자"], tabs:[
                { label:"팀원 관리", desc:"팀원 목록·역할 관리", fields:["이름","이메일","역할","가입일","마지막 접속"], dataSource:"REST /api/team/members", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"초대 관리", desc:"팀원 초대 발송·관리", fields:["이메일","역할","초대일","상태","만료일"], dataSource:"REST /api/team/invites", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"활동 로그", desc:"팀 활동 이력", fields:["팀원","액션","대상","일시","IP"], dataSource:"REST /api/team/activity", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"역할 관리", desc:"커스텀 역할·권한 정의", fields:["역할명","권한 수","사용자 수","생성일"], dataSource:"REST /api/team/roles", refreshRate:"실시간", planAccess:"Enterprise" },
            ]},
            { id:"case_study", label:"🏆 사례 연구", desc:"성공 사례 관리·공유", path:"/case-study", planAccess:"Growth+", dataSource:"REST API", sync:["멤버 > 운영허브"] },
            { id:"help", label:"📚 도움말 센터", desc:"도움말·FAQ·가이드", path:"/help", planAccess:"Growth+", dataSource:"Static + REST", sync:["시스템 > 관리자"], tabs:[
                { label:"시작 가이드", desc:"플랫폼 시작 가이드", fields:["단계","제목","완료율"], dataSource:"Static Content", refreshRate:"배포 시", planAccess:"Growth+" },
                { label:"FAQ", desc:"자주 묻는 질문", fields:["카테고리","질문","조회수"], dataSource:"REST /api/help/faq", refreshRate:"일별", planAccess:"Growth+" },
                { label:"릴리스 노트", desc:"버전별 업데이트 내역", fields:["버전","날짜","변경 사항","유형"], dataSource:"REST /api/help/releases", refreshRate:"배포 시", planAccess:"Growth+" },
                { label:"문의 티켓", desc:"고객 지원 티켓 관리", fields:["티켓 ID","제목","카테고리","상태","담당자"], dataSource:"REST /api/help/tickets", refreshRate:"실시간", planAccess:"Growth+" },
                { label:"영상 튜토리얼", desc:"기능별 영상 가이드", fields:["제목","모듈","시간","조회수"], dataSource:"Static Content", refreshRate:"배포 시", planAccess:"Growth+" },
            ]},
            { id:"feedback", label:"💬 피드백 센터", desc:"사용자 피드백 제출·추적", path:"/feedback", planAccess:"Growth+", dataSource:"REST API", sync:["관리자 > 피드백관리"] },
            { id:"developer", label:"⚙️ 개발자 허브", desc:"API 문서·SDK·개발자 도구", path:"/developer-hub", planAccess:"Pro+", dataSource:"REST + Static", sync:["데이터수집 > 연동허브","관리자 > API사용량"] },
        ]},
        { id:"system_mgmt", icon:"⚙️", label:"시스템 관리", color:"#64748b", desc:"관리자 설정·DB 스키마·결제(PG) 설정", planAccess:"Admin", children:[
            { id:"admin", label:"⚙️ 관리자 설정", desc:"플랫폼 관리자 종합 설정", path:"/admin", planAccess:"Admin", dataSource:"REST API", sync:["관리자 > 모든 하위 메뉴"],
              children:[
                { id:"admin_users", label:"👥 사용자·권한", desc:"회원·관리자·피드백·가이드 관리", children:[
                  { id:"admin_mgmt", label:"🛡️ 관리자 관리", desc:"관리자 계정 CRUD·역할 부여", fields:["관리자 ID","이름","이메일","역할","상태","마지막 접속"], dataSource:"REST /api/admin/admins", refreshRate:"실시간", planAccess:"Admin" },
                  { id:"member_mgmt", label:"👥 회원 관리", desc:"전체 회원 조회·상태 변경", fields:["회원 ID","이름","이메일","플랜","가입일","상태"], dataSource:"REST /api/admin/members", refreshRate:"실시간", planAccess:"Admin" },
                  { id:"feedback_mgmt", label:"💬 피드백 관리", desc:"사용자 피드백 답변·상태 관리", fields:["피드백 ID","작성자","내용","카테고리","상태","답변"], dataSource:"REST /api/admin/feedback", refreshRate:"실시간", planAccess:"Admin" },
                  { id:"guide_mgmt", label:"📖 이용 가이드", desc:"가이드 항목 한국어로 상세 설명", fields:["항목","내용","언어","수정일"], dataSource:"REST /api/admin/guide", refreshRate:"배포 시", planAccess:"Admin" },
                ]},
                { id:"admin_billing", label:"💳 구독·결제·메뉴", desc:"구독·쿠폰·팝업·라이선스·약관·결제 관리", children:[
                  { id:"sub_plan_mgmt", label:"💳 구독 및 요금제", desc:"플랜 가격·기능·할인율 설정", fields:["플랜명","가격","기능수","할인율","상태"], dataSource:"REST /api/admin/plans", refreshRate:"실시간", planAccess:"Admin" },
                  { id:"menu_access_mgmt", label:"🔐 메뉴 접근 권한", desc:"플랜별 메뉴 접근 제어", fields:["메뉴","Growth","Pro","Enterprise","상태"], dataSource:"REST /api/admin/menu-access", refreshRate:"실시간", planAccess:"Admin" },
                  { id:"coupon_mgmt", label:"🎁 쿠폰 발급", desc:"무료 쿠폰 여정 관리", fields:["쿠폰 코드","할인","유효기간","사용 횟수","상태"], dataSource:"REST /api/admin/coupons", refreshRate:"실시간", planAccess:"Admin" },
                  { id:"popup_admin", label:"📣 팝업 관리", desc:"이벤트 팝업 CRUD·통계·보안", tabs:[
                    { label:"팝업 목록", desc:"관리자 팝업 목록", fields:["팝업 ID","제목","유형","상태","노출수"], dataSource:"REST /api/admin/popups", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"팝업 등록", desc:"새 팝업 등록", fields:["제목","내용","대상","시작일","종료일"], dataSource:"REST /api/admin/popups/create", refreshRate:"요청 시", planAccess:"Admin" },
                    { label:"노출 통계", desc:"팝업 노출/클릭 통계", fields:["팝업","노출수","클릭수","CTR"], dataSource:"REST /api/admin/popups/stats", refreshRate:"1시간", planAccess:"Admin" },
                    { label:"보안", desc:"팝업 보안 모니터링", fields:["위협 유형","심각도","감지일","상태"], dataSource:"REST /api/admin/popups/security", refreshRate:"실시간", planAccess:"Admin" },
                  ]},
                  { id:"license_mgmt", label:"🎟 라이선스", desc:"라이선스 발급·관리", fields:["라이선스 키","플랜","발급일","만료일","상태"], dataSource:"REST /api/admin/licenses", refreshRate:"실시간", planAccess:"Admin" },
                  { id:"terms_mgmt", label:"📜 약관 관리", desc:"이용약관·개인정보처리방침", fields:["약관명","버전","시행일","상태"], dataSource:"REST /api/admin/terms", refreshRate:"실시간", planAccess:"Admin" },
                  { id:"payment_mgmt", label:"💰 결제 내역", desc:"구독료 결제 내역 조회·관리", tabs:[
                    { label:"결제 이력", desc:"전체 결제 내역", fields:["결제 ID","회원","금액","수단","상태","일시"], dataSource:"REST /api/admin/payments", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"구독 이벤트", desc:"구독 변경 이벤트 로그", fields:["이벤트","회원","변경 전","변경 후","일시"], dataSource:"REST /api/admin/sub-events", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"채널별 수수료", desc:"채널별 수수료율 설정", fields:["채널","수수료율","정산 주기","적용일"], dataSource:"REST /api/admin/fees", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"보안", desc:"결제 보안 모니터링", fields:["이벤트","심각도","IP","일시","상태"], dataSource:"REST /api/admin/payment-security", refreshRate:"실시간", planAccess:"Admin" },
                  ]},
                ]},
                { id:"admin_content", label:"📢 콘텐츠·소통", desc:"공지사항·이메일 발송 관리", children:[
                  { id:"notice_mgmt", label:"📢 공지사항", desc:"공지 작성·발송·보안 모니터링", tabs:[
                    { label:"공지 목록", desc:"전체 공지 관리", fields:["공지 ID","제목","카테고리","상태","조회수"], dataSource:"REST /api/admin/notices", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"공지 작성", desc:"공지 작성·수정", fields:["제목","내용","카테고리","공개일"], dataSource:"REST /api/admin/notices/create", refreshRate:"요청 시", planAccess:"Admin" },
                    { label:"보안", desc:"공지 보안 모니터링", fields:["위협","심각도","감지일","상태"], dataSource:"REST /api/admin/notices/security", refreshRate:"실시간", planAccess:"Admin" },
                  ]},
                  { id:"email_admin", label:"✉️ 이메일 발송", desc:"이메일 캠페인·템플릿·통계", tabs:[
                    { label:"템플릿", desc:"이메일 템플릿 관리", fields:["템플릿 ID","이름","유형","사용수"], dataSource:"REST /api/admin/email/templates", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"메일 작성", desc:"이메일 작성·발송", fields:["제목","본문","수신자","발송 시각"], dataSource:"REST /api/admin/email/compose", refreshRate:"요청 시", planAccess:"Admin" },
                    { label:"발송 통계", desc:"이메일 발송 성과", fields:["발송수","열람율","클릭율","바운스율"], dataSource:"REST /api/admin/email/stats", refreshRate:"1시간", planAccess:"Admin" },
                    { label:"보안", desc:"이메일 보안 모니터링", fields:["이벤트","심각도","일시","상태"], dataSource:"REST /api/admin/email/security", refreshRate:"실시간", planAccess:"Admin" },
                  ]},
                ]},
                { id:"admin_system", label:"⚙️ 시스템·운영", desc:"API 사용량·백업·복원 관리", children:[
                  { id:"api_usage", label:"📊 API 사용량", desc:"API 호출량·채널별·에러·할당량·보안", tabs:[
                    { label:"종합 현황", desc:"API 호출 종합 대시보드", fields:["총 호출수","성공률","평균 응답시간","에러수"], dataSource:"REST /api/admin/api/overview", refreshRate:"5분", planAccess:"Admin" },
                    { label:"채널별", desc:"채널별 API 호출량", fields:["채널","호출수","성공률","에러율"], dataSource:"REST /api/admin/api/channels", refreshRate:"1시간", planAccess:"Admin" },
                    { label:"에러 분석", desc:"API 에러 유형 분석", fields:["에러 코드","발생 수","엔드포인트","마지막 발생"], dataSource:"REST /api/admin/api/errors", refreshRate:"1시간", planAccess:"Admin" },
                    { label:"할당량 설정", desc:"API 할당량 관리", fields:["플랜","일 한도","월 한도","현재 사용량"], dataSource:"REST /api/admin/api/quotas", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"보안", desc:"API 보안 모니터링", fields:["위협 유형","소스 IP","심각도","상태"], dataSource:"REST /api/admin/api/security", refreshRate:"실시간", planAccess:"Admin" },
                  ]},
                  { id:"backup_mgmt", label:"💾 백업·복원", desc:"자동 백업·스케줄·복원·보안", tabs:[
                    { label:"백업 관리", desc:"백업 목록·실행", fields:["백업 ID","유형","크기","일시","상태"], dataSource:"REST /api/admin/backup/list", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"스케줄·정책", desc:"자동 백업 스케줄 설정", fields:["스케줄","주기","보관기간","상태"], dataSource:"REST /api/admin/backup/schedule", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"복원 이력", desc:"복원 실행 이력", fields:["복원 ID","백업 원본","일시","결과"], dataSource:"REST /api/admin/backup/restore", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"보안", desc:"백업 보안 모니터링", fields:["이벤트","심각도","일시","상태"], dataSource:"REST /api/admin/backup/security", refreshRate:"실시간", planAccess:"Admin" },
                  ]},
                ]},
                { id:"admin_security", label:"🔒 보안·감사", desc:"감사 로그·로그인 보안 관리", children:[
                  { id:"audit_log", label:"📋 감사 로그", desc:"전체 활동 로그·채널 감사·보안", tabs:[
                    { label:"로그 목록", desc:"전체 감사 로그", fields:["일시","사용자","액션","대상","IP","결과"], dataSource:"REST /api/admin/audit/logs", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"활동 통계", desc:"활동 유형별 통계", fields:["액션 유형","건수","사용자수","최근 발생"], dataSource:"REST /api/admin/audit/stats", refreshRate:"1시간", planAccess:"Admin" },
                    { label:"채널 감사", desc:"채널별 감사 이력", fields:["채널","이벤트 수","최근 이벤트","위험도"], dataSource:"REST /api/admin/audit/channels", refreshRate:"1시간", planAccess:"Admin" },
                    { label:"보안 모니터링", desc:"보안 위협 감지·대응", fields:["위협","심각도","감지일","상태","대응"], dataSource:"REST /api/admin/audit/security", refreshRate:"실시간", planAccess:"Admin" },
                  ]},
                  { id:"security_log", label:"🔒 보안 로그", desc:"로그인 시도·IP분석·차단·위협감지", tabs:[
                    { label:"로그인 시도", desc:"로그인 시도 내역", fields:["사용자","IP","일시","결과","장치"], dataSource:"REST /api/admin/security/login", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"IP 분석", desc:"접속 IP 분석", fields:["IP","국가","접속수","위험도","차단 여부"], dataSource:"REST /api/admin/security/ip", refreshRate:"1시간", planAccess:"Admin" },
                    { label:"차단 관리", desc:"IP/사용자 차단 관리", fields:["대상","유형","사유","차단일","해제일"], dataSource:"REST /api/admin/security/block", refreshRate:"실시간", planAccess:"Admin" },
                    { label:"위협 모니터링", desc:"실시간 위협 감지", fields:["위협 유형","소스","심각도","감지일","상태"], dataSource:"REST /api/admin/security/threats", refreshRate:"실시간", planAccess:"Admin" },
                  ]},
                ]},
              ]
            },
            { id:"db_admin", label:"🗄️ DB 스키마", desc:"데이터베이스 테이블·구조·SQL·보안·구조도 관리", path:"/db-admin", planAccess:"Admin", dataSource:"MySQL Direct", sync:["데이터수집 > 데이터스키마","관리자 > 시스템운영"], tabs:[
                { label:"데이터", desc:"테이블 데이터 브라우저", fields:["테이블","행 수","검색","정렬","필터"], dataSource:"MySQL Query", refreshRate:"실시간", planAccess:"Admin" },
                { label:"구조", desc:"컬럼·인덱스·DDL", fields:["컬럼명","타입","NULL","키","기본값","코멘트"], dataSource:"SHOW COLUMNS/INDEXES", refreshRate:"실시간", planAccess:"Admin" },
                { label:"SQL 에디터", desc:"쿼리 실행·이력·내보내기", fields:["SQL 입력","실행 결과","이력","내보내기"], dataSource:"MySQL Query Engine", refreshRate:"실시간", planAccess:"Admin" },
                { label:"보안", desc:"SQL 인젝션 방지·보안 로그", fields:["위협 유형","쿼리","감지일","심각도","상태"], dataSource:"Security Engine", refreshRate:"실시간", planAccess:"Admin" },
                { label:"구조도", desc:"전체 메뉴 구조도·동기화 구조도", fields:["메뉴 트리","동기화 맵","도식화"], dataSource:"Static Config", refreshRate:"배포 시", planAccess:"Admin" },
            ]},
            { id:"pg_config", label:"💳 결제(PG) 설정", desc:"PG 결제 게이트웨이 설정", path:"/pg-config", planAccess:"Admin", dataSource:"REST API", sync:["관리자 > 결제내역","재무 > 정산"] },
        ]},
    ], []);

    /* ── 플랫 노드 목록 (검색·통계용) ── */
    const flatNodes = useMemo(() => {
        const arr = [];
        const walk = (nodes, depth=0, parentPath="", parentColor="") => {
            nodes.forEach(n => {
                const lbl = n.label||"";
                const path = parentPath ? `${parentPath} > ${lbl}` : lbl;
                const color = n.color || parentColor || "#4f8ef7";
                arr.push({ ...n, depth, fullPath:path, color });
                if (n.children) walk(n.children, depth+1, path, color);
            });
        };
        walk(MENU_TREE);
        return arr;
    }, [MENU_TREE]);

    /* ── 총 탭 수 계산 ── */
    const totalTabs = useMemo(() => {
        let count = 0;
        const walk = (nodes) => { nodes.forEach(n => { if(n.tabs) count += Array.isArray(n.tabs) ? n.tabs.length : 0; if(n.children) walk(n.children); }); };
        walk(MENU_TREE);
        return count;
    }, [MENU_TREE]);

    const mainMenus = MENU_TREE;
    const filteredTree = useMemo(() => {
        if (!filterMain) return MENU_TREE;
        const main = MENU_TREE.find(m => m.id === filterMain);
        if (!main) return MENU_TREE;
        if (!filterMid) return [main];
        const mid = (main.children||[]).find(c => c.id === filterMid);
        return mid ? [{ ...main, children:[mid] }] : [main];
    }, [MENU_TREE, filterMain, filterMid]);
    const midMenus = useMemo(() => { if(!filterMain) return []; return MENU_TREE.find(m=>m.id===filterMain)?.children||[]; }, [MENU_TREE, filterMain]);

    /* ── 검색 필터 ── */
    const searchFiltered = useMemo(() => {
        if (!searchTerm) return null;
        const term = searchTerm.toLowerCase();
        return flatNodes.filter(n => (n.label||"").toLowerCase().includes(term) || (n.desc||"").toLowerCase().includes(term) || (n.path||"").toLowerCase().includes(term));
    }, [flatNodes, searchTerm]);

    /* ── 노드 네비게이션: 동기화 링크 클릭 시 해당 노드로 이동 ── */
    const navigateToNode = (label) => {
        const cleanLabel = label.replace(/^→\s*/, "").replace(/^\s*/, "");
        const parts = cleanLabel.split(" > ");
        const target = parts[parts.length - 1];
        const found = flatNodes.find(n => {
            const nl = (n.label||"").replace(/^[\p{Emoji}\s]+/u,"").trim();
            return nl.includes(target) || (n.label||"").includes(target);
        });
        if (found) { setSelectedNode(found); setSelectedTab(null); }
    };

    /* ── 노드 렌더 (확장/축소 지원) ── */
    const renderNode = (node, depth=0, rootColor="") => {
        const nodeKey = node.id||node.label;
        const isExpanded = expandedNodes.has(nodeKey);
        const hasChildren = node.children && node.children.length > 0;
        const hasTabs = node.tabs && node.tabs.length > 0;
        const isSelected = selectedNode?.id === node.id && selectedNode?.label === node.label;
        const borderColor = node.color || rootColor || (depth===0?"#4f8ef7":depth===1?"#a855f7":depth===2?"#22c55e":"#f59e0b");
        const indent = depth * 16;
        const depthLabels = ["대메뉴","중메뉴","하위메뉴","최하위메뉴","sub-tab"];
        const depthLabel = depthLabels[Math.min(depth, depthLabels.length-1)];
        const planColor = node.planAccess === "Enterprise" ? "#f59e0b" : node.planAccess === "Pro+" ? "#a855f7" : node.planAccess === "Admin" ? "#ef4444" : "#22c55e";

        return (
            <React.Fragment key={nodeKey}>
                <div style={{
                    marginLeft: indent, padding: depth<2 ? "10px 14px" : "7px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 3,
                    background: isSelected ? `${borderColor}14` : "var(--surface)",
                    border: `1px solid ${isSelected ? borderColor+"55" : "rgba(255,255,255,0.04)"}`,
                    borderLeft: depth>0 ? `3px solid ${borderColor}44` : undefined,
                    transition: "all 150ms",
                }}
                onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background="rgba(79,142,247,0.04)"; e.currentTarget.style.borderColor=borderColor+"44"; }}
                onMouseLeave={e => { if(!isSelected) { e.currentTarget.style.background="var(--surface)"; e.currentTarget.style.borderColor=isSelected?borderColor+"55":"rgba(255,255,255,0.04)"; } }}
                >
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        {(hasChildren || hasTabs) && <span onClick={(e) => { e.stopPropagation(); toggleExpand(nodeKey); }} style={{ fontSize:10, color:borderColor, cursor:"pointer", userSelect:"none", width:14, textAlign:"center", transition:"transform 150ms", transform:isExpanded?"rotate(90deg)":"rotate(0)" }}>▶</span>}
                        {!hasChildren && !hasTabs && <span style={{width:14}}/>}
                        {depth===0 && <span style={{fontSize:16}}>{node.icon}</span>}
                        <span onClick={() => { setSelectedNode(isSelected?null:node); setSelectedTab(null); }} style={{ fontWeight: depth===0?900:depth===1?700:depth===2?600:500, fontSize: depth===0?14:depth===1?12:depth===2?11:10, color: isSelected?borderColor:"#e2e8f0", cursor:"pointer", flex:1 }}>{node.label}</span>
                        <span style={{ fontSize:8, padding:"1px 5px", borderRadius:4, background:`${planColor}12`, color:planColor, border:`1px solid ${planColor}22` }}>{depthLabel}</span>
                        {node.planAccess && <span style={{ fontSize:7, padding:"1px 5px", borderRadius:4, background:`${planColor}10`, color:planColor, border:`1px solid ${planColor}22` }}>{node.planAccess}</span>}
                        {hasTabs && <Badge color="#a855f7">{node.tabs.length}탭</Badge>}
                        {node.sync && <Badge color="#22c55e">{node.sync.length}연동</Badge>}
                        {hasChildren && <span style={{fontSize:8,color:"#3b4d6e"}}>{node.children.length}하위</span>}
                    <div onClick={() => { setSelectedNode(isSelected?null:node); setSelectedTab(null); }} style={{fontSize:9,color:"#7c8fa8",marginTop:2, marginLeft:hasChildren||hasTabs?20:14}}>{node.desc}</div>
                    {node.path && <div style={{fontSize:8,color:"#3b4d6e",fontFamily:"monospace",marginTop:1,marginLeft:hasChildren||hasTabs?20:14}}>{node.path}</div>}
                {/* 하위 메뉴 */}
                {isExpanded && hasChildren && node.children.map(c => renderNode(c, depth+1, borderColor))}
                {/* sub-tab 렌더 */}
                {isExpanded && hasTabs && !hasChildren && node.tabs.map((t,i) => {
                    const tabObj = typeof t === "string" ? { label:t } : t;
                    const isTabSel = selectedTab === i && selectedNode?.id === node.id;
                    const tabHasSubs = tabObj.tabs && tabObj.tabs.length > 0;
                    return (
                        <React.Fragment key={i}>
                            <div onClick={() => { setSelectedNode(node); setSelectedTab(isTabSel?null:i); }}
                                style={{ marginLeft:indent+16, padding:"5px 10px", borderRadius:6, cursor:"pointer", marginBottom:2,
                                    background: isTabSel ? "rgba(168,85,247,0.08)" : "rgba(168,85,247,0.015)",
                                    border: `1px solid ${isTabSel?"rgba(168,85,247,0.25)":"rgba(168,85,247,0.06)"}`,
                                    borderLeft: "3px solid rgba(168,85,247,0.3)", transition:"all 100ms" }}
                                onMouseEnter={e => e.currentTarget.style.background="rgba(168,85,247,0.06)"}
                                onMouseLeave={e => { if(!isTabSel) e.currentTarget.style.background="rgba(168,85,247,0.015)"; }}>
                                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                    <span style={{fontSize:8,color:"#a855f7"}}>◆</span>
                                    <span style={{ fontSize:10, fontWeight:isTabSel?700:500, color:isTabSel?"#a855f7":"#c4b5fd" }}>{tabObj.label}</span>
                                    <span style={{ fontSize:7, padding:"1px 4px", borderRadius:3, background:"rgba(168,85,247,0.08)", color:"#a855f7", border:"1px solid rgba(168,85,247,0.15)" }}>sub-tab</span>
                                    {tabHasSubs && <Badge color="#ec4899">{tabObj.tabs.length}탭</Badge>}
                                {tabObj.desc && <div style={{fontSize:8,color:"#7c8fa8",marginTop:1,marginLeft:13}}>{tabObj.desc}</div>}
                            {/* sub-tab의 하위 탭 (최하위) */}
                            {isTabSel && tabHasSubs && tabObj.tabs.map((st,si) => {
                                const stObj = typeof st === "string" ? { label:st } : st;
                                return (
                                    <div key={si} style={{ marginLeft:indent+32, padding:"4px 8px", borderRadius:5, marginBottom:1,
                                        background:"rgba(236,72,153,0.04)", borderLeft:"2px solid rgba(236,72,153,0.3)", border:"1px solid rgba(236,72,153,0.08)" }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                                            <span style={{fontSize:7,color:"#ec4899"}}>●</span>
                                            <span style={{ fontSize:9, color:"#f9a8d4" }}>{stObj.label}</span>
                                            <span style={{ fontSize:6, padding:"1px 3px", borderRadius:2, background:"rgba(236,72,153,0.08)", color:"#ec4899" }}>최하위</span>
                                        {stObj.desc && <div style={{fontSize:7,color:"#6b7280",marginLeft:11}}>{stObj.desc}</div>}
                                
                                  </div>
);
                            })}
                        </React.Fragment>
                    
                          </div>
                        </div>
                      </div>
);
                })}
            </React.Fragment>lanColor = node.planAccess === "Enterprise" ? "#f59e0b" : node.planAccess === "Pro+" ? "#a855f7" : node.planAccess === "Admin" ? "#ef4444" : "#22c55e";
        const tabData = selectedTab !== null && node.tabs ? (typeof node.tabs[selectedTab] === "string" ? { label:node.tabs[selectedTab] } : node.tabs[selectedTab]) : null;

        return (
            <div style={{ padding:16, borderRadius:12, background: 'var(--surface)', border:`1px solid ${borderColor}22`, maxHeight:700, overflowY:"auto" }}>
                {/* 헤더 */}
                <div style={{ marginBottom:12, paddingBottom:10, borderBottom:`1px solid ${borderColor}18` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{fontSize:18}}>{node.icon||"📄"}</span>
                        <div style={{flex:1}}>
                            <div style={{ fontWeight:900, fontSize:16, color:borderColor }}>{node.label}</div>
                            <div style={{ fontSize:10, color:"#7c8fa8", marginTop:2 }}>{node.desc}</div>
                        {node.planAccess && <span style={{ padding:"3px 8px", borderRadius:5, fontSize:9, fontWeight:700, background:`${planColor}12`, color:planColor, border:`1px solid ${planColor}28` }}>{node.planAccess}</span>}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
                        {node.path && <span style={{ fontSize:9, padding:"2px 8px", borderRadius:5, background:"rgba(79,142,247,0.08)", color:"#4f8ef7", fontFamily:"monospace" }}>📍 {node.path}</span>}
                        {node.dataSource && <span style={{ fontSize:9, padding:"2px 8px", borderRadius:5, background:"rgba(20,184,166,0.08)", color:"#14b8a6" }}>💾 {node.dataSource}</span>}
                </div>

                {/* 선택된 탭 상세 */}
                {tabData && (
                    <div style={{ marginBottom:14, padding:12, borderRadius:10, background:"rgba(168,85,247,0.05)", border:"1px solid rgba(168,85,247,0.15)" }}>
                        <div style={{ fontSize:12, fontWeight:800, color:"#a855f7", marginBottom:6 }}>◆ {tabData.label}</div>
                        {tabData.desc && <div style={{ fontSize:10, color:"#94a3b8", marginBottom:8 }}>{tabData.desc}</div>}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                            {tabData.dataSource && <div style={{ padding:"6px 8px", borderRadius:6, background:"rgba(0,0,0,0.15)", fontSize:9 }}>
                                <div style={{color:"#7c8fa8",marginBottom:2}}>📡 데이터 소스</div>
                                <div style={{color:"#14b8a6",fontFamily:"monospace",fontSize:8}}>{tabData.dataSource}</div>
                            </div>}
                            {tabData.refreshRate && <div style={{ padding:"6px 8px", borderRadius:6, background:"rgba(0,0,0,0.15)", fontSize:9 }}>
                                <div style={{color:"#7c8fa8",marginBottom:2}}>🔄 갱신 주기</div>
                                <div style={{color:"#f59e0b"}}>{tabData.refreshRate}</div>
                            </div>}
                            {tabData.planAccess && <div style={{ padding:"6px 8px", borderRadius:6, background:"rgba(0,0,0,0.15)", fontSize:9 }}>
                                <div style={{color:"#7c8fa8",marginBottom:2}}>🔑 플랜 접근</div>
                                <div style={{color:planColor}}>{tabData.planAccess}</div>
                            </div>}
                        {tabData.fields && tabData.fields.length > 0 && <div style={{ marginTop:8 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:"#a855f7", marginBottom:4 }}>📋 필드 구성 ({tabData.fields.length}개)</div>
                            <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                                {tabData.fields.map((f,i) => <span key={i} style={{ padding:"2px 6px", borderRadius:4, fontSize:8, background:"rgba(168,85,247,0.06)", border:"1px solid rgba(168,85,247,0.12)", color:"#c4b5fd" }}>{f}</span>)}
                        </div>}
                        {/* sub-tab의 하위 탭 */}
                        {tabData.tabs && <div style={{ marginTop:8 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:"#ec4899", marginBottom:4 }}>🔽 하위 탭 ({tabData.tabs.length}개)</div>
                            {tabData.tabs.map((st,si) => {
                                const stObj = typeof st === "string" ? { label:st } : st;
                                return (
                                    <div key={si} style={{ padding:"5px 8px", borderRadius:5, background:"rgba(236,72,153,0.04)", border:"1px solid rgba(236,72,153,0.1)", marginBottom:2 }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                                            <span style={{fontSize:7,color:"#ec4899"}}>●</span>
                                            <span style={{ fontSize:9, fontWeight:600, color:"#f9a8d4" }}>{stObj.label}</span>
                                        {stObj.desc && <div style={{ fontSize:8, color:"#7c8fa8", marginLeft:11 }}>{stObj.desc}</div>}
                                        {stObj.fields && <div style={{ display:"flex", gap:2, flexWrap:"wrap", marginTop:3, marginLeft:11 }}>
                                            {stObj.fields.map((f,fi) => <span key={fi} style={{ padding:"1px 4px", borderRadius:3, fontSize:7, background:"rgba(236,72,153,0.06)", color:"#f9a8d4" }}>{f}</span>)}
                                        </div>}
                                
                                  </div>
);
                            })}
                        </div>}
                )}

                {/* 서브 탭 목록 */}
                {node.tabs && !tabData && <div style={{ marginBottom:12 }}>
                    <div style={{ fontWeight:700, fontSize:11, color:"#a855f7", marginBottom:6 }}>📑 서브 탭 ({node.tabs.length}개)</div>
                    {node.tabs.map((t,i) => {
                        const tObj = typeof t === "string" ? { label:t } : t;
                        return (
                            <div key={i} onClick={() => setSelectedTab(i)} style={{ padding:"8px 12px", borderRadius:8, background:"rgba(168,85,247,0.03)", border:"1px solid rgba(168,85,247,0.1)", marginBottom:4, cursor:"pointer", transition:"all 100ms" }}
                                onMouseEnter={e => e.currentTarget.style.background="rgba(168,85,247,0.07)"}
                                onMouseLeave={e => e.currentTarget.style.background="rgba(168,85,247,0.03)"}>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{fontSize:9,color:"#a855f7"}}>◆</span>
                                    <strong style={{color:"#a855f7",fontSize:11}}>{tObj.label}</strong>
                                    {tObj.refreshRate && <span style={{fontSize:8,color:"#f59e0b",marginLeft:"auto"}}>🔄 {tObj.refreshRate}</span>}
                                    {tObj.tabs && <Badge color="#ec4899">{tObj.tabs.length}</Badge>}
                                {tObj.desc && <div style={{color:"#7c8fa8",fontSize:9,marginTop:2,marginLeft:15}}>{tObj.desc}</div>}
                                {tObj.fields && <div style={{ display:"flex", gap:2, flexWrap:"wrap", marginTop:4, marginLeft:15 }}>
                                    {tObj.fields.slice(0,6).map((f,fi) => <span key={fi} style={{ padding:"1px 5px", borderRadius:3, fontSize:7, background:"rgba(168,85,247,0.06)", color:"#c4b5fd", border:"1px solid rgba(168,85,247,0.1)" }}>{f}</span>)}
                                    {tObj.fields.length > 6 && <span style={{ fontSize:7, color:"#7c8fa8" }}>+{tObj.fields.length-6}</span>}
                                </div>}
                        
                          </div>
);
                    })}
                </div>}

                {/* 필드 정보 (개별 노드) */}
                {node.fields && !node.tabs && <div style={{ marginBottom:12 }}>
                    <div style={{ fontWeight:700, fontSize:11, color:"#14b8a6", marginBottom:6 }}>📋 필드 구성 ({node.fields.length}개)</div>
                    <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                        {node.fields.map((f,i) => <span key={i} style={{ padding:"3px 8px", borderRadius:5, fontSize:9, background:"rgba(20,184,166,0.06)", border:"1px solid rgba(20,184,166,0.12)", color:"#5eead4" }}>{f}</span>)}
                    {node.dataSource && <div style={{ marginTop:6, fontSize:9, color:"#14b8a6" }}>💾 데이터 소스: <code style={{ background:"rgba(20,184,166,0.08)", padding:"2px 6px", borderRadius:4, fontSize:8 }}>{node.dataSource}</code></div>}
                    {node.refreshRate && <div style={{ fontSize:9, color:"#f59e0b", marginTop:3 }}>🔄 갱신: {node.refreshRate}</div>}
                </div>}

                {/* 하위 메뉴 */}
                {node.children && <div style={{ marginBottom:12 }}>
                    <div style={{ fontWeight:700, fontSize:11, color:"#22c55e", marginBottom:6 }}>📂 하위 메뉴 ({node.children.length}개)</div>
                    {node.children.map((c,i) => (
                        <div key={i} style={{ padding:"7px 10px", borderRadius:7, background:"rgba(34,197,94,0.03)", border:"1px solid rgba(34,197,94,0.1)", marginBottom:3, cursor:"pointer", transition:"all 100ms" }}
                            onClick={(e) => { e.stopPropagation(); setSelectedNode(c); setSelectedTab(null); toggleExpand(c.id||c.label); }}
                            onMouseEnter={e => e.currentTarget.style.background="rgba(34,197,94,0.07)"}
                            onMouseLeave={e => e.currentTarget.style.background="rgba(34,197,94,0.03)"}>
                            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                <strong style={{color:"#22c55e",fontSize:11}}>{c.label}</strong>
                                {c.tabs && <Badge color="#a855f7">{Array.isArray(c.tabs)?c.tabs.length:0}탭</Badge>}
                                {c.children && <Badge color="#22c55e">{c.children.length}하위</Badge>}
                                {c.planAccess && <span style={{ fontSize:7, padding:"1px 4px", borderRadius:3, background:"rgba(148,163,184,0.08)", color:"#94a3b8" }}>{c.planAccess}</span>}
                            <div style={{color:"#7c8fa8",fontSize:9,marginTop:1}}>{c.desc}</div>
                    ))}
                </div>}

                {/* 동기화 연결 */}
                {node.sync && <div>
                    <div style={{ fontWeight:700, fontSize:11, color:"#f59e0b", marginBottom:6 }}>🔗 동기화 연결 ({node.sync.length}개)</div>
                    <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(245,158,11,0.03)", border:"1px solid rgba(245,158,11,0.12)", fontSize:10, lineHeight:1.8 }}>
                        {node.sync.map((s,i) => (
                            <div key={i} onClick={() => navigateToNode(s)} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"3px 4px", borderRadius:5, transition:"background 100ms" }}
                                onMouseEnter={e => e.currentTarget.style.background="rgba(245,158,11,0.08)"}
                                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                                <span style={{color:"#f59e0b",fontWeight:700}}>→</span>
                                <span style={{color:"#fbbf24",textDecoration:"underline",textUnderlineOffset:2}}>{s}</span>
                                <span style={{color:"#7c8fa8",fontSize:8}}>| 클릭하여 이동</span>
                        ))}
                    <div style={{ marginTop:6, padding:"6px 10px", borderRadius:6, background:"rgba(79,142,247,0.04)", border:"1px solid rgba(79,142,247,0.08)", fontSize:9, color:"#94a3b8" }}>
                        💡 <strong>{node.label}</strong>에서 데이터 변경 시 위 연결 메뉴로 실시간 BroadcastChannel 이벤트가 전파됩니다.
                </div>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
pe==="main" ? filteredTree.map(m=>({...m,children:undefined})) : (filterMain ? (filteredTree[0]?.children||[]).map(c=>({...c,color:filteredTree[0]?.color})) : filteredTree.flatMap(m=>(m.children||[]).map(c=>({...c,color:m.color}))));
        const NW=175, NH=46, GX=30, GY=14, TW=140, TH=28, TGY=6;
        const positions = [], lines = [];
        let rowY = 10;
        scopeData.forEach(main => {
            const mx = 10, my = rowY;
            positions.push({ node:main, x:mx, y:my, w:NW, h:NH, depth:0 });
            const kids = main.children || [];
            let kidRowY = my;
            kids.forEach((kid, ki) => {
                const kx = mx + NW + GX + 20;
                const ky = kidRowY;
                positions.push({ node:kid, x:kx, y:ky, w:NW, h:NH, depth:1 });
                lines.push({ x1:mx+NW, y1:my+NH/2, x2:kx, y2:ky+NH/2, color:main.color||"#4f8ef7" });
                // tabs
                const tabs = kid.tabs || [];
                const gkids = kid.children || [];
                let subRowY = ky;
                if (diagramScope === "all" && tabs.length > 0 && !gkids.length) {
                    tabs.forEach((t,ti) => {
                        const tLabel = typeof t === "string" ? t : t.label;
                        const tx = kx + NW + GX;
                        const ty = subRowY;
                        positions.push({ node:{ label:tLabel, desc:(typeof t!=="string"?t.desc:""), color:main.color }, x:tx, y:ty, w:TW, h:TH, depth:2, isTab:true });
                        lines.push({ x1:kx+NW, y1:ky+NH/2, x2:tx, y2:ty+TH/2, color:"#a855f7"+"66" });
                        subRowY += TH + TGY;
                    });
                }
                if (gkids.length > 0) {
                    gkids.forEach(gk => {
                        const gx = kx + NW + GX;
                        const gy = subRowY;
                        positions.push({ node:gk, x:gx, y:gy, w:TW+10, h:TH+6, depth:2 });
                        lines.push({ x1:kx+NW, y1:ky+NH/2, x2:gx, y2:gy+(TH+6)/2, color:main.color||"#a855f7" });
                        subRowY += TH + TGY + 6;
                    });
                }
                kidRowY = Math.max(kidRowY + NH + GY + 4, subRowY + 4);
            });
            rowY = Math.max(rowY + NH + GY + 10, kidRowY + 10);
        });
        const svgW = Math.max(700, ...positions.map(p=>p.x+p.w+30));
        const svgH = Math.max(300, rowY + 20);
        return (
            <div>
                <div style={{display:"flex",gap:4,marginBottom:10}}>
                    {[{s:"all",l:"📐 전체 (탭 포함)"},{s:"main",l:"🏠 대메뉴만"},{s:"sub",l:"📂 중메뉴까지"}].map(({s,l})=>(
                        <button key={s} onClick={()=>setDiagramScope(s)} style={{padding:"5px 12px",borderRadius:7,fontSize:10,fontWeight:700,cursor:"pointer",background:diagramScope===s?"rgba(245,158,11,0.12)":"transparent",border:`1px solid ${diagramScope===s?"#f59e0b":"rgba(255,255,255,0.06)"}`,color:diagramScope===s?"#f59e0b":"#94a3b8"}}>{l}</button>
                    ))}
                <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:600, borderRadius:12, border:"1px solid rgba(99,140,255,0.1)", background:"rgba(0,0,0,0.3)", padding:10 }}>
                    <svg width={svgW} height={svgH} style={{minWidth:svgW}}>
                        <defs>
                            <marker id="arrowhead2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#7c8fa8" /></marker>
                        </defs>
                        {lines.map((l,i) => <line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={1.2} markerEnd="url(#arrowhead2)" />)}
                        {positions.map((p,i) => {
                            const isSel = selectedNode?.label===p.node.label;
                            const bc = p.node.color || (p.depth<2?"#4f8ef7":"#a855f7");
                            const cl = (p.node.label||"").replace(/^[\p{Emoji}\s]+/u,"").trim();
                            return (
                                <g key={`n${i}`} onClick={()=>{ if(!p.isTab) setSelectedNode(p.node); setSelectedTab(null); }} style={{cursor:"pointer"}}>
                                    <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.isTab?5:7} ry={p.isTab?5:7}
                                        fill={isSel?`${bc}20`:"rgba(10,22,40,0.85)"}
                                        stroke={isSel?bc:`${bc}33`} strokeWidth={isSel?2:1} strokeDasharray={p.isTab?"3,2":""} />
                                    {p.depth===0 && p.node.icon && <text x={p.x+8} y={p.y+18} fontSize={13} fill="#fff">{p.node.icon}</text>}
                                    <text x={p.x+(p.depth===0?26:8)} y={p.y+p.h/2} fontSize={p.depth===0?11:p.depth===1?9.5:8} fontWeight={p.depth<2?"800":"600"} fill={isSel?bc:"#e2e8f0"}
                                        dominantBaseline="middle">{cl.length>(p.isTab?15:16)?cl.slice(0,p.isTab?15:16)+"…":cl}</text>
                                    {p.node.tabs && !p.isTab && <text x={p.x+p.w-6} y={p.y+12} fontSize={7} fill="#a855f7" textAnchor="end">{Array.isArray(p.node.tabs)?p.node.tabs.length:0}탭</text>}
                                </g>
                            );
                        })}
                    </svg>
            </div>
        </div>
    </div>
);
    };

    /* ── 동기화 구조 다이어그램 ── */
    const [syncDiagramMode, setSyncDiagramMode] = useState("diagram"); // diagram | list
    const [focusedSyncNode, setFocusedSyncNode] = useState(null); // 상세 보기용 선택 노드

    const renderSyncDiagram = () => {
        const syncNodes = flatNodes.filter(n => n.sync && n.sync.length > 0);
        const filtered = filterMain ? syncNodes.filter(n => n.fullPath?.includes(MENU_TREE.find(x=>x.id===filterMain)?.label||"")) : syncNodes;
        const syncColors = ["#22c55e","#4f8ef7","#a855f7","#f59e0b","#ec4899","#14b8a6","#ef4444","#06b6d4"];

        /* ───── 상세 보기 (focusedSyncNode 가 선택된 경우) ───── */
        if (focusedSyncNode) {
            const fn = focusedSyncNode;
            const cleanLabel = (l) => (l||"").replace(/^[\p{Emoji}\s]+/u,"").trim();
            const fnLabel = cleanLabel(fn.label);

            // 1) 나(소스)가 보내는 대상 (outgoing)
            const outgoing = fn.sync || [];
            // 2) 나(타겟)에게 보내는 소스 (incoming) — 다른 노드의 sync 배열에 내 label이 포함된 경우
            const incoming = flatNodes.filter(n => n.sync && n.sync.some(s => s === fnLabel || s === fn.label) && n.label !== fn.label);

            // 레이아웃 계산 — 중앙에 메인 노드, 좌측에 incoming, 우측에 outgoing
            const CX = 310, CY_BASE = 30, MW = 200, MH = 56;
            const SW = 170, SH = 36, SGY = 10;
            const outH = outgoing.length * (SH + SGY);
            const inH = incoming.length * (SH + SGY);
            const maxSideH = Math.max(outH, inH, 120);
            const CY = CY_BASE + maxSideH / 2 - MH / 2 + 40;
            const svgW = 820, svgH = Math.max(300, CY + maxSideH / 2 + MH + 60);

            const outStartY = CY + MH/2 - outH/2;
            const inStartY = CY + MH/2 - inH/2;

            // sub-tab 정보
            const tabs = fn.tabs || [];

            return (
                <div>
                    {/* 상세 헤더 */}
                    <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
                        <button onClick={() => setFocusedSyncNode(null)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid rgba(148,163,184,0.2)", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:10 }}>← 전체 맵으로 돌아가기</button>
                        <span style={{ fontSize:13, fontWeight:800, color:fn.color||"#22c55e" }}>{fn.icon||"🔗"} {fn.label}</span>
                        <span style={{ fontSize:10, color:"#7c8fa8" }}>동기화 상세 구조도</span>
                        {fn.planAccess && <span style={{ fontSize:8, padding:"2px 6px", borderRadius:4, background:"rgba(168,85,247,0.08)", color:"#a855f7" }}>{fn.planAccess}</span>}

                    {/* KPI 카드 */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:14 }}>
                        {[
                            { l:"수신 소스", v:incoming.length, c:"#4f8ef7", icon:"📥" },
                            { l:"발신 타겟", v:outgoing.length, c:"#f59e0b", icon:"📤" },
                            { l:"서브 탭", v:tabs.length, c:"#a855f7", icon:"📑" },
                            { l:"총 연결", v:incoming.length+outgoing.length, c:"#22c55e", icon:"🔗" },
                        ].map(({l,v,c,icon}) => (
                            <div key={l} style={{ padding:"8px 10px", borderRadius:8, background:`${c}08`, border:`1px solid ${c}20`, textAlign:"center" }}>
                                <div style={{ fontSize:16, fontWeight:900, color:c }}>{icon} {v}</div>
                                <div style={{ fontSize:8, color:"#7c8fa8" }}>{l}</div>
                        ))}

                    {/* SVG 다이어그램 */}
                    <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:500, borderRadius:12, border:"1px solid rgba(34,197,94,0.15)", background:"rgba(0,0,0,0.35)", padding:14 }}>
                        <svg width={svgW} height={svgH} style={{minWidth:svgW}}>
                            <defs>
                                <marker id="detArrowOut" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" fillOpacity="0.8" /></marker>
                                <marker id="detArrowIn" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="#4f8ef7" fillOpacity="0.8" /></marker>
                                {syncColors.map((c,i) => (
                                    <marker key={`da${i}`} id={`detArrow${i}`} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={c} fillOpacity="0.8" /></marker>
                                ))}
                                <filter id="glowCenter"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                            </defs>

                            {/* 레이블 */}
                            <text x={60} y={18} fontSize={9} fill="#4f8ef766" fontWeight="700">📥 수신 소스 (Incoming)</text>
                            <text x={CX + MW/2} y={18} fontSize={9} fill="#22c55e66" fontWeight="700" textAnchor="middle">🎯 선택 메뉴</text>
                            <text x={svgW - 100} y={18} fontSize={9} fill="#f59e0b66" fontWeight="700">📤 발신 타겟 (Outgoing)</text>

                            {/* Incoming 곡선 + 노드 */}
                            {incoming.map((inc, i) => {
                                const iy = inStartY + i * (SH + SGY);
                                const ix = 20;
                                const x1 = ix + SW, y1 = iy + SH/2;
                                const x2 = CX, y2 = CY + MH/2;
                                const cx1 = x1 + (x2-x1)*0.45, cx2 = x2 - (x2-x1)*0.45;
                                const cc = syncColors[i % syncColors.length];
                                const icl = cleanLabel(inc.label);
                                return (
                                    <g key={`in${i}`}>
                                        <path d={`M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`} fill="none" stroke={cc} strokeWidth={1.8} strokeOpacity={0.55} markerEnd={`url(#detArrow${i % syncColors.length})`}
                                            style={{ transition:"all 200ms" }}
                                            onMouseEnter={e=>{e.currentTarget.style.strokeOpacity="1";e.currentTarget.style.strokeWidth="3";}}
                                            onMouseLeave={e=>{e.currentTarget.style.strokeOpacity="0.55";e.currentTarget.style.strokeWidth="1.8";}} />
                                        <g onClick={() => { const found = flatNodes.find(n=>n.label===inc.label); if(found) setFocusedSyncNode(found); }} style={{cursor:"pointer"}}>
                                            <rect x={ix} y={iy} width={SW} height={SH} rx={6} fill="rgba(79,142,247,0.06)" stroke={`${cc}55`} strokeWidth={1} />
                                            <circle cx={ix+10} cy={iy+SH/2} r={3.5} fill={cc} fillOpacity={0.6} />
                                            <text x={ix+18} y={iy+SH/2} fontSize={9} fontWeight="700" fill="#e2e8f0" dominantBaseline="middle">{icl.length>16?icl.slice(0,16)+"…":icl}</text>
                                            <text x={ix+SW-6} y={iy+SH/2} fontSize={7} fill="#4f8ef788" textAnchor="end" dominantBaseline="middle">{inc.sync?.length||0}↗</text>
                                        </g>
                                    </g>
                                );
                            })}

                            {/* 중앙 메인 노드 */}
                            <rect x={CX-4} y={CY-4} width={MW+8} height={MH+8} rx={14} fill="none" stroke={fn.color||"#22c55e"} strokeWidth={1} strokeOpacity={0.15} filter="url(#glowCenter)" />
                            <rect x={CX} y={CY} width={MW} height={MH} rx={10} fill={`${fn.color||"#22c55e"}15`} stroke={fn.color||"#22c55e"} strokeWidth={2} />
                            <text x={CX+MW/2} y={CY+22} fontSize={12} fontWeight="900" fill={fn.color||"#22c55e"} textAnchor="middle">{fnLabel.length>18?fnLabel.slice(0,18)+"…":fnLabel}</text>
                            <text x={CX+MW/2} y={CY+38} fontSize={8} fill="#94a3b8" textAnchor="middle">{fn.desc?fn.desc.slice(0,28):fn.fullPath||""}</text>
                            {fn.dataSource && <text x={CX+MW/2} y={CY+MH+14} fontSize={7} fill="#14b8a688" textAnchor="middle">💾 {fn.dataSource}</text>}
                            {fn.refreshRate && <text x={CX+MW/2} y={CY+MH+24} fontSize={7} fill="#f59e0b88" textAnchor="middle">🔄 {fn.refreshRate}</text>}

                            {/* Outgoing 곡선 + 노드 */}
                            {outgoing.map((tgt, i) => {
                                const oy = outStartY + i * (SH + SGY);
                                const ox = svgW - SW - 20;
                                const x1 = CX + MW, y1 = CY + MH/2;
                                const x2 = ox, y2 = oy + SH/2;
                                const cx1 = x1 + (x2-x1)*0.45, cx2 = x2 - (x2-x1)*0.45;
                                const cc = syncColors[(i+3) % syncColors.length];
                                // 타겟의 상세 정보 조회
                                const tgtNode = flatNodes.find(n => cleanLabel(n.label) === tgt || n.label === tgt);
                                return (
                                    <g key={`out${i}`}>
                                        <path d={`M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`} fill="none" stroke={cc} strokeWidth={1.8} strokeOpacity={0.55} markerEnd={`url(#detArrow${(i+3) % syncColors.length})`}
                                            style={{ transition:"all 200ms" }}
                                            onMouseEnter={e=>{e.currentTarget.style.strokeOpacity="1";e.currentTarget.style.strokeWidth="3";}}
                                            onMouseLeave={e=>{e.currentTarget.style.strokeOpacity="0.55";e.currentTarget.style.strokeWidth="1.8";}} />
                                        <g onClick={() => { if(tgtNode&&tgtNode.sync) setFocusedSyncNode(tgtNode); }} style={{cursor:"pointer"}}>
                                            <rect x={ox} y={oy} width={SW} height={SH} rx={6} fill="rgba(245,158,11,0.06)" stroke={`${cc}55`} strokeWidth={1} strokeDasharray="4,2" />
                                            <text x={ox+8} y={oy+SH/2} fontSize={9} fontWeight="600" fill="#fbbf24" dominantBaseline="middle">{tgt.length>16?tgt.slice(0,16)+"…":tgt}</text>
                                            <text x={ox+SW-6} y={oy+SH/2} fontSize={7} fill="#f59e0b55" textAnchor="end" dominantBaseline="middle">↙수신</text>
                                        </g>
                                    </g>
                                );
                            })}

                            {/* 범례 */}
                            <rect x={10} y={svgH-30} width={8} height={8} rx={2} fill="rgba(79,142,247,0.2)" stroke="#4f8ef755" />
                            <text x={22} y={svgH-23} fontSize={7} fill="#7c8fa8">수신 소스</text>
                            <rect x={90} y={svgH-30} width={8} height={8} rx={2} fill={`${fn.color||"#22c55e"}20`} stroke={fn.color||"#22c55e"} strokeWidth={1.5} />
                            <text x={102} y={svgH-23} fontSize={7} fill="#7c8fa8">선택 메뉴</text>
                            <rect x={170} y={svgH-30} width={8} height={8} rx={2} fill="rgba(245,158,11,0.1)" stroke="#f59e0b55" strokeDasharray="2,1" />
                            <text x={182} y={svgH-23} fontSize={7} fill="#7c8fa8">발신 타겟</text>
                        </svg>

                    {/* 하단 메타데이터 패널 */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14 }}>
                        {/* 서브 탭 */}
                        <div style={{ padding:12, borderRadius:10, background:"rgba(168,85,247,0.04)", border:"1px solid rgba(168,85,247,0.12)" }}>
                            <div style={{ fontSize:11, fontWeight:800, color:"#a855f7", marginBottom:8 }}>📑 서브 탭 ({tabs.length}개)</div>
                            {tabs.length === 0 && <div style={{ fontSize:9, color:"#7c8fa8" }}>서브 탭 없음</div>}
                            {tabs.map((t, i) => {
                                const tObj = typeof t === "string" ? { label: t } : t;
                                return (
                                    <div key={i} style={{ padding:"6px 8px", borderRadius:6, background:"rgba(168,85,247,0.03)", border:"1px solid rgba(168,85,247,0.08)", marginBottom:3 }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                            <span style={{ fontSize:8, color:"#a855f7" }}>◆</span>
                                            <span style={{ fontSize:10, fontWeight:700, color:"#c4b5fd" }}>{tObj.label}</span>
                                            {tObj.refreshRate && <span style={{ fontSize:7, color:"#f59e0b", marginLeft:"auto" }}>🔄 {tObj.refreshRate}</span>}
                                        {tObj.desc && <div style={{ fontSize:8, color:"#7c8fa8", marginLeft:13, marginTop:2 }}>{tObj.desc}</div>}
                                        {tObj.fields && <div style={{ display:"flex", gap:2, flexWrap:"wrap", marginTop:3, marginLeft:13 }}>
                                            {tObj.fields.slice(0,8).map((f,fi) => <span key={fi} style={{ padding:"1px 4px", borderRadius:3, fontSize:7, background:"rgba(168,85,247,0.06)", color:"#c4b5fd" }}>{f}</span>)}
                                            {tObj.fields.length > 8 && <span style={{ fontSize:7, color:"#7c8fa8" }}>+{tObj.fields.length-8}</span>}
                                        </div>}
                                
                                  </div>
);
                            })}
                        {/* 동기화 흐름 상세 */}
                        <div style={{ padding:12, borderRadius:10, background:"rgba(34,197,94,0.04)", border:"1px solid rgba(34,197,94,0.12)" }}>
                            <div style={{ fontSize:11, fontWeight:800, color:"#22c55e", marginBottom:8 }}>🔗 동기화 흐름 상세</div>
                            {outgoing.length > 0 && <div style={{ marginBottom:8 }}>
                                <div style={{ fontSize:9, fontWeight:700, color:"#f59e0b", marginBottom:4 }}>📤 발신 ({outgoing.length}개) — 이 메뉴에서 데이터를 전송</div>
                                {outgoing.map((s,i) => (
                                    <div key={i} style={{ padding:"4px 8px", borderRadius:5, background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.1)", marginBottom:2, display:"flex", alignItems:"center", gap:6 }}>
                                        <span style={{ fontSize:9, color:"#fbbf24", fontWeight:600 }}>→ {s}</span>
                                        <span style={{ fontSize:7, color:"#7c8fa8", marginLeft:"auto" }}>BroadcastChannel</span>
                                ))}
                            </div>}
                            {incoming.length > 0 && <div>
                                <div style={{ fontSize:9, fontWeight:700, color:"#4f8ef7", marginBottom:4 }}>📥 수신 ({incoming.length}개) — 이 메뉴로 데이터를 전송하는 소스</div>
                                {incoming.map((inc,i) => {
                                    const icl = cleanLabel(inc.label);
                                    return (
                                        <div key={i} onClick={() => setFocusedSyncNode(inc)} style={{ padding:"4px 8px", borderRadius:5, background:"rgba(79,142,247,0.04)", border:"1px solid rgba(79,142,247,0.1)", marginBottom:2, display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}
                                            onMouseEnter={e=>e.currentTarget.style.background="rgba(79,142,247,0.1)"}
                                            onMouseLeave={e=>e.currentTarget.style.background="rgba(79,142,247,0.04)"}>
                                            <span style={{ fontSize:9, color:"#60a5fa", fontWeight:600 }}>← {icl}</span>
                                            <span style={{ fontSize:7, color:"#7c8fa8", marginLeft:"auto" }}>클릭하여 이동</span>
                                    
);
                                })}
                            </div>}
                            {fn.fields && <div style={{ marginTop:8 }}>
                                <div style={{ fontSize:9, fontWeight:700, color:"#14b8a6", marginBottom:4 }}>📋 필드 구성 ({fn.fields.length}개)</div>
                                <div style={{ display:"flex", gap:2, flexWrap:"wrap" }}>
                                    {fn.fields.slice(0,12).map((f,i) => <span key={i} style={{ padding:"2px 5px", borderRadius:3, fontSize:7, background:"rgba(20,184,166,0.06)", color:"#5eead4" }}>{f}</span>)}
                                    {fn.fields.length > 12 && <span style={{ fontSize:7, color:"#7c8fa8" }}>+{fn.fields.length-12}</span>}
                            </div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
 = 460, TW = 160, TH = 28;
        const positions = [], curves = [];
        const targetLabels = new Set();
        filtered.forEach(n => n.sync.forEach(s => targetLabels.add(s)));
        const targetArr = [...targetLabels];
        
        filtered.forEach((n, i) => {
            positions.push({ node:n, x:MARGIN_LEFT, y:10 + i*(NH+GY), w:NW, h:NH, isSource:true });
        });
        const totalSourceH = filtered.length * (NH+GY);
        const totalTargetH = targetArr.length * (TH+GY-2);
        const targetStartY = Math.max(10, (totalSourceH - totalTargetH) / 2);
        targetArr.forEach((t, i) => {
            positions.push({ node:{ label:t, desc:"동기화 타겟", color:"#f59e0b" }, x:COL2_X, y:targetStartY + i*(TH+GY-2), w:TW, h:TH, isTarget:true });
        });
        
        filtered.forEach((n, si) => {
            const srcPos = positions.find(p => p.isSource && p.node === n);
            if (!srcPos) return;
            n.sync.forEach((s, syncIdx) => {
                const tgtPos = positions.find(p => p.isTarget && p.node.label === s);
                if (!tgtPos) return;
                const x1 = srcPos.x + srcPos.w, y1 = srcPos.y + srcPos.h / 2;
                const x2 = tgtPos.x, y2 = tgtPos.y + tgtPos.h / 2;
                const cx1 = x1 + (x2-x1)*0.4, cx2 = x2 - (x2-x1)*0.4;
                const color = syncColors[(si + syncIdx) % syncColors.length];
                curves.push({ x1, y1, x2, y2, cx1, cx2, color, srcLabel:(n.label||"").replace(/^[\p{Emoji}\s]+/u,"").trim(), tgtLabel:s });
            });
        });
        
        const svgW = COL2_X + TW + 40;
        const svgH = Math.max(300, totalSourceH + 30, targetStartY + totalTargetH + 30);
        
        return (
            <div>
                <div style={{ display:"flex", gap:4, marginBottom:10, alignItems:"center" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#22c55e", marginRight:8 }}>🔗 동기화 흐름 다이어그램</span>
                    <span style={{ fontSize:9, color:"#7c8fa8" }}>소스 메뉴 → 타겟 메뉴 실시간 BroadcastChannel 이벤트 흐름 | {filtered.length}개 소스 · {targetArr.length}개 타겟 · {curves.length}개 연결</span>
                    <span style={{ fontSize:9, color:"#a855f7", marginLeft:8 }}>💡 메뉴를 클릭하면 상세 동기화 구조도를 확인할 수 있습니다</span>
                <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:650, borderRadius:12, border:"1px solid rgba(34,197,94,0.15)", background:"rgba(0,0,0,0.3)", padding:12 }}>
                    <svg width={svgW} height={svgH} style={{minWidth:svgW}}>
                        <defs>
                            <marker id="syncArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#22c55e" fillOpacity="0.6" /></marker>
                            {syncColors.map((c,i) => (
                                <marker key={`ma${i}`} id={`syncArrow${i}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill={c} fillOpacity="0.7" /></marker>
                            ))}
                        </defs>
                        <text x={MARGIN_LEFT + NW/2} y={svgH - 6} fontSize={9} fill="#22c55e55" textAnchor="middle" fontWeight="700">소스 메뉴 (데이터 발생)</text>
                        <text x={COL2_X + TW/2} y={svgH - 6} fontSize={9} fill="#f59e0b55" textAnchor="middle" fontWeight="700">타겟 메뉴 (데이터 수신)</text>
                        {curves.map((c, i) => {
                            const ci = i % syncColors.length;
                            return <path key={`c${i}`} d={`M${c.x1},${c.y1} C${c.cx1},${c.y1} ${c.cx2},${c.y2} ${c.x2},${c.y2}`}
                                fill="none" stroke={c.color} strokeWidth={1.3} strokeOpacity={0.5}
                                markerEnd={`url(#syncArrow${ci})`}
                                style={{ transition:"stroke-opacity 200ms" }}
                                onMouseEnter={e => { e.currentTarget.style.strokeOpacity="1"; e.currentTarget.style.strokeWidth="2.5"; }}
                                onMouseLeave={e => { e.currentTarget.style.strokeOpacity="0.5"; e.currentTarget.style.strokeWidth="1.3"; }} />;
                        })}
                        {positions.filter(p=>p.isSource).map((p, i) => {
                            const cl = (p.node.label||"").replace(/^[\p{Emoji}\s]+/u,"").trim();
                            const bc = p.node.color || "#22c55e";
                            return (
                                <g key={`s${i}`} onClick={() => setFocusedSyncNode(p.node)} style={{cursor:"pointer"}}>
                                    <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={7} ry={7}
                                        fill="rgba(10,22,40,0.85)" stroke={`${bc}44`} strokeWidth={1} />
                                    <circle cx={p.x+10} cy={p.y+p.h/2} r={4} fill={bc} fillOpacity={0.6} />
                                    <text x={p.x+18} y={p.y+p.h/2} fontSize={9.5} fontWeight="700" fill="#e2e8f0" dominantBaseline="middle">{cl.length>18?cl.slice(0,18)+"…":cl}</text>
                                    <text x={p.x+p.w-8} y={p.y+p.h/2} fontSize={7} fill="#f59e0b88" textAnchor="end" dominantBaseline="middle">{p.node.sync?.length||0}↗</text>
                                </g>
                            );
                        })}
                        {positions.filter(p=>p.isTarget).map((p, i) => {
                            const cl = (p.node.label||"");
                            const tgtNode = flatNodes.find(n => (n.label||"").replace(/^[\p{Emoji}\s]+/u,"").trim() === cl || n.label === cl);
                            return (
                                <g key={`t${i}`} onClick={() => { if(tgtNode&&tgtNode.sync) setFocusedSyncNode(tgtNode); else navigateToNode(cl); }} style={{cursor:"pointer"}}>
                                    <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={5} ry={5}
                                        fill="rgba(245,158,11,0.06)" stroke="#f59e0b33" strokeWidth={1} strokeDasharray="4,2" />
                                    <text x={p.x+8} y={p.y+p.h/2} fontSize={8.5} fontWeight="600" fill="#fbbf24" dominantBaseline="middle">{cl.length>16?cl.slice(0,16)+"…":cl}</text>
                                    <text x={p.x+p.w-8} y={p.y+p.h/2} fontSize={7} fill="#f59e0b55" textAnchor="end" dominantBaseline="middle">↙수신</text>
                                </g>
                            );
                        })}
                    </svg>
            </div>
        </div>
    </div>
);
    };

    return (
        <div style={{ display:"grid", gap:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                <div>
                    <div style={{ fontWeight:900, fontSize:17, color: "var(--text-1)" }}>🗺️ GeniegoROI 전체 메뉴 구조도</div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>대메뉴 → 중메뉴 → 하위메뉴 → 최하위메뉴 → sub-tab까지 전체 구조와 동기화 흐름을 확인합니다.</div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {[{m:"tree",l:"🌳 메뉴 구조",c:"#4f8ef7"},{m:"sync",l:"🔗 동기화 구조",c:"#22c55e"},{m:"diagram",l:"📐 도식화 구조도",c:"#f59e0b"}].map(({m,l,c})=>(
                        <button key={m} onClick={()=>{setViewMode(m);setSelectedTab(null);}} style={{ padding:"6px 14px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", background:viewMode===m?`${c}18`:"transparent", border:`1px solid ${viewMode===m?c:"rgba(255,255,255,0.06)"}`, color:viewMode===m?c:"#94a3b8" }}>{l}</button>
                    ))}
            </div>

            {/* KPI 요약 */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:7 }}>
                {[{l:"대메뉴",v:MENU_TREE.length,c:"#4f8ef7"},{l:"중메뉴",v:MENU_TREE.reduce((s,m)=>s+(m.children?.length||0),0),c:"#a855f7"},{l:"전체 노드",v:flatNodes.length,c:"#22c55e"},{l:"서브 탭",v:totalTabs,c:"#ec4899"},{l:"동기화",v:flatNodes.filter(n=>n.sync).reduce((s,n)=>s+n.sync.length,0),c:"#f59e0b"}].map(({l,v,c})=>(
                    <div key={l} style={{padding:8,borderRadius:9,background:`${c}06`,border:`1px solid ${c}18`,textAlign:"center"}}>
                        <div style={{fontSize:18,fontWeight:900,color:c}}>{v}</div>
                        <div style={{fontSize:8,color:"#7c8fa8"}}>{l}</div>
                ))}

            {/* 검색 + 필터 */}
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <div style={{ position:"relative", flex:"0 0 200px" }}>
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="🔍 메뉴 검색..." style={{ width:"100%", padding:"7px 10px 7px 8px", borderRadius:7, border:"1px solid #1e3a5f", background:"#0a1628", color: "var(--text-1)", fontSize:10, outline:"none", boxSizing:"border-box" }} />
                <select value={filterMain} onChange={e=>{setFilterMain(e.target.value);setFilterMid("");setSelectedNode(null);setSelectedTab(null);}} style={{background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:7,color: "var(--text-1)",padding:"7px 10px",fontSize:11}}>
                    <option value="">전체 대메뉴</option>
                    {mainMenus.map(m=><option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
                </select>
                {filterMain && midMenus.length>0 && <select value={filterMid} onChange={e=>{setFilterMid(e.target.value);setSelectedNode(null);setSelectedTab(null);}} style={{background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:7,color: "var(--text-1)",padding:"7px 10px",fontSize:11}}>
                    <option value="">전체 중메뉴</option>
                    {midMenus.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
                </select>}
                {viewMode==="tree" && <>
                    <button onClick={expandAll} style={{padding:"5px 10px",borderRadius:6,border:"1px solid rgba(79,142,247,0.2)",background:"transparent",color:"#4f8ef7",cursor:"pointer",fontSize:9}}>⊞ 모두 펼치기</button>
                    <button onClick={collapseAll} style={{padding:"5px 10px",borderRadius:6,border:"1px solid rgba(148,163,184,0.2)",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:9}}>⊟ 모두 접기</button>
                </>}
                {(filterMain||filterMid||searchTerm)&&<button onClick={()=>{setFilterMain("");setFilterMid("");setSearchTerm("");setSelectedNode(null);setSelectedTab(null);}} style={{padding:"5px 10px",borderRadius:6,border:"1px solid rgba(239,68,68,0.2)",background:"transparent",color:"#ef4444",cursor:"pointer",fontSize:9}}>✕ 초기화</button>}

            {/* 검색 결과 */}
            {searchFiltered && <div style={{ maxHeight:200, overflowY:"auto", padding:8, borderRadius:8, background:"rgba(79,142,247,0.04)", border:"1px solid rgba(79,142,247,0.12)" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#4f8ef7", marginBottom:6 }}>🔍 검색 결과: {searchFiltered.length}건</div>
                {searchFiltered.map((n,i) => (
                    <div key={i} onClick={() => { setSelectedNode(n); setSelectedTab(null); setSearchTerm(""); }} style={{ padding:"5px 8px", borderRadius:5, cursor:"pointer", marginBottom:2, fontSize:10, transition:"background 100ms" }}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(79,142,247,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                        <span style={{color:n.color||"#4f8ef7",fontWeight:700}}>{n.label}</span>
                        <span style={{color:"#7c8fa8",fontSize:8,marginLeft:6}}>{n.fullPath}</span>
                ))}
            </div>}

            {/* 도식화 구조도 */}
            {viewMode==="diagram" && renderDiagram()}

            {/* 동기화 구조 - 다이어그램 + 목록 */}
            {viewMode==="sync" && <div>
                <div style={{ display:"flex", gap:4, marginBottom:10 }}>
                    {[{s:"diagram",l:"🗺️ 동기화 맵 (다이어그램)",c:"#22c55e"},{s:"list",l:"📋 동기화 목록",c:"#4f8ef7"}].map(({s,l,c})=>(
                        <button key={s} onClick={()=>setSyncDiagramMode(s)} style={{padding:"5px 14px",borderRadius:7,fontSize:10,fontWeight:700,cursor:"pointer",background:syncDiagramMode===s?`${c}15`:"transparent",border:`1px solid ${syncDiagramMode===s?c:"rgba(255,255,255,0.06)"}`,color:syncDiagramMode===s?c:"#94a3b8"}}>{l}</button>
                    ))}
                {syncDiagramMode==="diagram" && renderSyncDiagram()}
                {syncDiagramMode==="list" && <div style={{ display:"grid", gridTemplateColumns: selectedNode ? "1fr 1fr" : "1fr", gap:12 }}>
                    <div style={{ display:"grid", gap:3, maxHeight:700, overflowY:"auto", paddingRight:4 }}>
                        {flatNodes.filter(n=>n.sync&&n.sync.length>0&&(!filterMain||n.fullPath?.includes(MENU_TREE.find(x=>x.id===filterMain)?.label||""))).map((n,i) => (
                            <div key={i} onClick={()=>{setSelectedNode(n);setSelectedTab(null);}} style={{ padding:"10px 14px", borderRadius:8, background:selectedNode?.id===n.id?"rgba(34,197,94,0.06)":"rgba(255,255,255,0.02)", border:`1px solid ${selectedNode?.id===n.id?"rgba(34,197,94,0.2)":"rgba(255,255,255,0.04)"}`, cursor:"pointer" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{ fontWeight:700, fontSize:11, color: "var(--text-1)" }}>{n.label}</span>
                                    {n.planAccess && <span style={{ fontSize:7, padding:"1px 4px", borderRadius:3, background:"rgba(148,163,184,0.08)", color:"#94a3b8" }}>{n.planAccess}</span>}
                                <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:4 }}>
                                    {n.sync.map((s,j)=><span key={j} onClick={(e)=>{e.stopPropagation();navigateToNode(s);}} style={{padding:"2px 6px",borderRadius:4,fontSize:8,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",color:"#22c55e",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(34,197,94,0.18)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(34,197,94,0.08)"}>→ {s}</span>)}
                            </div>
                        ))}
                    {renderDetailPanel()}
                </div>}
            </div>}

            {/* 메뉴 구조 트리 뷰 */}
            {viewMode==="tree" && <div style={{ display:"grid", gridTemplateColumns: selectedNode ? "1fr 1fr" : "1fr", gap:12 }}>
                <div style={{ display:"grid", gap:3, maxHeight:700, overflowY:"auto", paddingRight:4 }}>
                    {filteredTree.map(m => renderNode(m, 0))}
                {renderDetailPanel()}
            </div>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}
export default function DbAdmin() {
    const { t } = useI18n();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [tab, setTab] = useState("data");
    const [tableSearch, setTableSearch] = useState("");
    const [dbInfo, setDbInfo] = useState({ name: "genie_roi", size: 0 });
    const [secAlert, setSecAlert] = useState(null);

    const loadTables = useCallback(() => {
        apiFetch("/tables").then(d => {
            setLoading(false);
            if (d.ok) {
                setTables(d.tables || []);
                const totalSize = (d.tables || []).reduce((s, t) => s + (t.total_bytes || 0), 0);
                setDbInfo({ name: "genie_roi", size: totalSize });
                if (d.tables?.length > 0 && !selected) setSelected(d.tables[0].table_name);
            }
        });
    }, []);

    useEffect(() => { setLoading(true); loadTables(); }, []);
    useEffect(() => { const iv = setInterval(loadTables, 30000); return () => clearInterval(iv); }, [loadTables]);

    const handleSecAlert = (msg) => {
        setSecAlert(msg);
        setTimeout(() => setSecAlert(null), 6000);
    };

    const filtered = tables.filter(t => t.table_name.toLowerCase().includes(tableSearch.toLowerCase()));
    const totalRows = tables.reduce((s, t) => s + (t.row_count || 0), 0);

    const TABS = [
        { id: "data", icon: "📋", label: "데이터" },
        { id: "structure", icon: "🏗", label: "구조" },
        { id: "sql", icon: "⌨️", label: "SQL 에디터" },
        { id: "security", icon: "🛡️", label: "보안" },
        { id: "sitemap", icon: "🗺️", label: "구조도" },
    ];

    return (
        <div style={{ display: "flex", gap: 0, height: "calc(100vh - 80px)", overflow: "hidden" }}>
            {/* 보안 경고 알림 */}
            {secAlert && <div style={{ position: "fixed", top: 80, right: 20, zIndex: 9999, padding: "14px 20px", borderRadius: 12, background: "rgba(239,68,68,0.95)", backdropFilter: "blur(8px)", color: 'var(--text-1)', fontWeight: 700, fontSize: 12, boxShadow: "0 8px 30px rgba(239,68,68,0.3)", animation: "slideIn 300ms ease" }}>🚨 보안 경고: {secAlert}</div>}

            {/* 좌측 사이드바 */}
            <div style={{
                width: 230, flexShrink: 0, display: "flex", flexDirection: "column",
                background: "rgba(0,0,0,0.25)", borderRight: "1px solid rgba(99,140,255,0.12)",
                borderRadius: "12px 0 0 12px", overflow: "hidden",
            }}>
                {/* DB 정보 */}
                <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid rgba(99,140,255,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>🗄</span>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 11, color: "#4f8ef7" }}>genie_roi</div>
                            <div style={{ fontSize: 9, color: "#7c8fa8" }}>MySQL · utf8mb4 · 30초 자동 갱신</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                        <div style={{ padding: "4px 6px", borderRadius: 6, background: "rgba(79,142,247,0.08)", textAlign: "center" }}>
                            <div style={{ fontWeight: 900, fontSize: 12, color: "#4f8ef7" }}>{tables.length}</div>
                            <div style={{ fontSize: 8, color: "#7c8fa8" }}>테이블</div>
                        <div style={{ padding: "4px 6px", borderRadius: 6, background: "rgba(34,197,94,0.06)", textAlign: "center" }}>
                            <div style={{ fontWeight: 900, fontSize: 11, color: "#22c55e" }}>{fmtBytes(dbInfo.size)}</div>
                            <div style={{ fontSize: 8, color: "#7c8fa8" }}>용량</div>
                        <div style={{ padding: "4px 6px", borderRadius: 6, background: "rgba(168,85,247,0.06)", textAlign: "center" }}>
                            <div style={{ fontWeight: 900, fontSize: 11, color: "#a855f7" }}>{totalRows.toLocaleString()}</div>
                            <div style={{ fontSize: 8, color: "#7c8fa8" }}>전체 행</div>
                    </div>

                {/* 테이블 검색 */}
                <div style={{ padding: "8px 10px 0" }}>
                    <div style={{ position: "relative" }}>
                        <input
                            value={tableSearch} onChange={e => setTableSearch(e.target.value)}
                            placeholder="테이블 검색..."
                            style={{
                                width: "100%", padding: "6px 10px 6px 26px", borderRadius: 7, border: "1px solid rgba(99,140,255,0.15)",
                                background: "rgba(0,0,0,0.2)", color: "var(--text-1)", fontSize: 10, outline: "none", boxSizing: "border-box",
                            }}
                        />
                        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11 }}>🔍</span>
                </div>

                {/* 테이블 목록 */}
                <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>
                    {loading ? (
                        <div style={{ padding: 14, textAlign: "center", color: "#3b4d6e", fontSize: 10 }}>로딩 중...</div>
                    ) : filtered.map(t => (
                        <div key={t.table_name} onClick={() => { setSelected(t.table_name); setTab("data"); }}
                            style={{
                                padding: "7px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 2,
                                background: selected === t.table_name ? "rgba(79,142,247,0.12)" : "transparent",
                                borderLeft: `2px solid ${selected === t.table_name ? "#4f8ef7" : "transparent"}`,
                                transition: "all 100ms",
                            }}>
                            <div style={{ fontWeight: selected === t.table_name ? 800 : 500, fontSize: 10, color: selected === t.table_name ? "#4f8ef7" : "#e2e8f0" }}>
                                🗋 {t.table_name}
                            <div style={{ fontSize: 9, color: "#7c8fa8", marginTop: 1 }}>
                                {(t.row_count || 0).toLocaleString()}건 · {fmtBytes(t.total_bytes)}
                        </div>
                    ))}
            </div>

            {/* 우측 패널 */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "0 12px 12px 0", background: 'var(--surface)' }}>
                {/* 헤더 */}
                <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(99,140,255,0.1)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13 }}>🗋</span>
                    <span style={{ fontWeight: 900, fontSize: 13, color: "#4f8ef7" }}>{selected || "테이블을 선택하세요"}</span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)} style={{
                                padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                                background: tab === t.id ? "rgba(79,142,247,0.12)" : "transparent",
                                color: tab === t.id ? "#4f8ef7" : "#7c8fa8", fontWeight: tab === t.id ? 800 : 500, fontSize: 10,
                            }}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                </div>

                {/* 콘텐츠 */}
                <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                    {!selected && tab !== "sql" && tab !== "security" && tab !== "sitemap" && (
                        <div style={{ textAlign: "center", paddingTop: 60, color: "#3b4d6e" }}>
                            <div style={{ fontSize: 36, marginBottom: 12 }}>🗄</div>
                            <div style={{ fontSize: 12 }}>좌측에서 테이블을 선택하세요</div>
                    )}
                    {selected && tab === "data" && <TableData key={selected} table={selected} />}
                    {selected && tab === "structure" && <TableStructure key={selected} table={selected} />}
                    {tab === "sql" && <SqlEditor onSecAlert={handleSecAlert} />}
                    {tab === "security" && <SecurityMonitor />}
                    {tab === "sitemap" && <MenuStructureMap />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}
