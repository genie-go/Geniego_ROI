import React, { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "../i18n";

import { useT } from '../i18n/index.js';
const API = (path) => `/v423/dbadmin${path}`;
const ADMIN_KEY = "genie_live_demo_key_00000000";

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

/* ── SQL Editor ─────────────────────────────────────── */
function SqlEditor({ onRun }) {
    const [sql, setSql] = useState("SELECT * FROM app_user LIMIT 10;");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const run = async () => {
        if (!sql.trim()) return;
        setLoading(true); setErr(""); setResult(null);
        const d = await apiFetch("/query", { method: "POST", body: JSON.stringify({ sql }) });
        setLoading(false);
        if (!d.ok) { setErr(d.error || "Error"); return; }
        setResult(d);
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
                        color: "#4f8ef7", fontFamily: "monospace", fontSize: 12,
                        resize: "vertical", outline: "none", boxSizing: "border-box",
                    }}
                    placeholder="SELECT * FROM table_name LIMIT 10;&#10;&#10;Ctrl+Enter 로 Run"
                />
                <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, color: "var(--text-3)" }}>Ctrl+Enter</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={run} disabled={loading} style={{
                    padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: loading ? "rgba(79,142,247,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
                    color: "#fff", fontWeight: 800, fontSize: 11,
                }}>▶ {loading ? "Run in progress..." : "Run"}</button>
                <button onClick={() => { setSql(""); setResult(null); setErr(""); }} style={{
                    padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)",
                    background: "transparent", color: "var(--text-3)", cursor: "pointer", fontSize: 11,
                }}>Reset</button>
                {result && <span style={{ fontSize: 10, color: "#22c55e" }}>
                    {result.type === "SELECT" ? `${result.count}Row · ${result.elapsed_ms}ms` : `영향 ${result.affected}Row · ${result.elapsed_ms}ms`}
                </span>}
                {err && <span style={{ fontSize: 10, color: "#ef4444" }}>⚠ {err}</span>}
            </div>

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
                                        {r[c] === null ? <em style={{ color: "var(--text-3)" }}>NULL</em> : String(r[c])}
                                    </td>
                                ))}</tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {result && result.type === "WRITE" && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, color: "#22c55e" }}>
                    ✅ 쿼리 Success — 영향 RowCount: <strong>{result.affected}</strong>{result.last_insert_id ? ` · INSERT ID: ${result.last_insert_id}` : ""}
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
        if (!window.confirm(`ID ${id} Row을 Delete하나요?`)) return;
        setDeleting(id);
        await apiFetch(`/tables/${table}/rows/${id}`, { method: "DELETE" });
        setDeleting(null);
        load();
    };

    if (!data && loading) return <div style={{ padding: 20, color: "var(--text-3)", fontSize: 11 }}>Loading...</div>;

    return (
        <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                    ref={searchRef}
                    placeholder="Search어..."
                    style={{
                        padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)",
                        background: "rgba(0,0,0,0.2)", color: "var(--text-1)", fontSize: 11, outline: "none",
                    }}
                    onKeyDown={e => { if (e.key === "Enter") setSearch(e.target.value); }}
                />
                <button onClick={() => setSearch(searchRef.current?.value || "")} style={{
                    padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)",
                    background: "transparent", color: "var(--text-2)", cursor: "pointer", fontSize: 11,
                }}>🔍</button>
                {data && <span style={{ fontSize: 10, color: "var(--text-3)" }}>Total {data.total.toLocaleString()}Row · Page {data.page}/{data.pages}</span>}
                {loading && <span style={{ fontSize: 10, color: "#4f8ef7" }}>⟳ 갱신 in progress...</span>}
                <button onClick={load} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "var(--text-3)", cursor: "pointer", fontSize: 10 }}>Refresh</button>
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
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row, i) => (
                                <tr key={i}>
                                    <td style={{ color: "var(--text-3)" }}>{(data.page - 1) * 50 + i + 1}</td>
                                    {data.columns.map(c => (
                                        <td key={c} title={row[c] !== null ? String(row[c]) : "NULL"}
                                            style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {row[c] === null
                                                ? <em style={{ color: "var(--text-3)" }}>NULL</em>
                                                : c.includes("password") || c.includes("token") || c.includes("hash")
                                                    ? <span style={{ color: "var(--text-3)" }}>••••••••</span>
                                                    : String(row[c]).length > 60
                                                        ? String(row[c]).slice(0, 60) + "…"
                                                        : String(row[c])}
                                        </td>
                                    ))}
                                    <td>
                                        <button onClick={() => deleteRow(row.id)} disabled={!!deleting}
                                            style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer", fontSize: 9 }}>
                                            {deleting === row.id ? "..." : "Delete"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ padding: 20, textAlign: "center", color: "var(--text-3)", fontSize: 11 }}>No data</div>
            )}

            {data && data.pages > 1 && (
                <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                    <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", cursor: "pointer", fontSize: 10 }}>«</button>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", cursor: "pointer", fontSize: 10 }}>‹</button>
                    {Array.from({ length: Math.min(7, data.pages) }, (_, i) => {
                        const p = Math.max(1, Math.min(data.pages - 6, page - 3)) + i;
                        return (
                            <button key={p} onClick={() => setPage(p)} style={{
                                padding: "4px 10px", borderRadius: 6, border: "1px solid",
                                borderColor: page === p ? "#4f8ef7" : "var(--border)",
                                background: page === p ? "rgba(79,142,247,0.15)" : "transparent",
                                color: page === p ? "#4f8ef7" : "var(--text-2)", cursor: "pointer", fontSize: 10,
                            }}>{p}</button>
                        );
                    })}
                    <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", cursor: "pointer", fontSize: 10 }}>›</button>
                    <button onClick={() => setPage(data.pages)} disabled={page === data.pages} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", cursor: "pointer", fontSize: 10 }}>»</button>
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
        if (!window.confirm(`⚠️ '${table}' Table의 All 데이터를 Delete합니다. 계속하시겠습니까?`)) return;
        setTruncating(true);
        const d = await apiFetch(`/tables/${table}/truncate`, { method: "POST" });
        setTruncating(false);
        alert(d.ok ? "Table을 비웠습니다." : (d.error || "Error"));
    };

    const keyTypeColor = (Non_unique, Key_name) => {
        if (Key_name === "PRIMARY") return "#f59e0b";
        if (!Non_unique) return "#4f8ef7";
        return "#22c55e";
    };

    if (!data) return <div style={{ padding: 20, color: "var(--text-3)", fontSize: 11 }}>Loading...</div>;

    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge color="#4f8ef7">Total {data.row_count.toLocaleString()}Row</Badge>
                <Badge color="#a855f7">{data.columns.length}개 컬럼</Badge>
                <Badge color="#22c55e">{data.indexes.length}개 인덱스</Badge>
                <button onClick={() => setShowDdl(s => !s)} style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "var(--text-2)", cursor: "pointer", fontSize: 10 }}>
                    {showDdl ? "DDL 숨기기" : "CREATE TABLE DDL"}
                </button>
                <button onClick={truncate} disabled={truncating} style={{
                    padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer", fontSize: 10,
                }}>{truncating ? "Processing..." : "🗑 TRUNCATE"}</button>
            </div>

            {showDdl && (
                <pre style={{
                    padding: 14, borderRadius: 10, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(99,140,255,0.15)",
                    fontSize: 10, color: "#4f8ef7", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
                }}>{data.create_sql}</pre>
            )}

            <div style={{ fontWeight: 800, fontSize: 11, color: "var(--text-2)" }}>컬럼 구조</div>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid rgba(99,140,255,0.12)" }}>
                <table className="table" style={{ fontSize: 10 }}>
                    <thead>
                        <tr><th>#</th><th>컬럼명</th><th>타입</th><th>Null</th><th>Key</th><th>BasicValue</th><th>Extra</th><th>Comment</th></tr>
                    </thead>
                    <tbody>
                        {data.columns.map((col, i) => (
                            <tr key={col.Field}>
                                <td style={{ color: "var(--text-3)" }}>{i + 1}</td>
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
                                <td style={{ color: "var(--text-3)", fontStyle: "italic", fontSize: 9 }}>
                                    {col.Default !== null ? String(col.Default) : "NULL"}
                                </td>
                                <td style={{ fontSize: 9, color: "#f59e0b" }}>{col.Extra || "—"}</td>
                                <td style={{ fontSize: 9, color: "var(--text-3)" }}>{col.Comment || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data.indexes.length > 0 && (
                <>
                    <div style={{ fontWeight: 800, fontSize: 11, color: "var(--text-2)" }}>인덱스</div>
                    <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid rgba(99,140,255,0.12)" }}>
                        <table className="table" style={{ fontSize: 10 }}>
                            <thead>
                                <tr><th>인덱스명</th><th>컬럼</th><th>Type</th><th>Cardinality</th></tr>
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
                                        <td style={{ color: "var(--text-3)" }}>{idx.Cardinality ?? "—"}</td>
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

/* ── MAIN PAGE ───────────────────────────────────────── */
export default function DbAdmin() {
    const { t } = useI18n();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [tab, setTab] = useState("data");
    const [tableSearch, setTableSearch] = useState("");
    const [dbInfo, setDbInfo] = useState({ name: "genie_roi", size: 0 });

    useEffect(() => {
        setLoading(true);
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

    const filtered = tables.filter(t => t.table_name.toLowerCase().includes(tableSearch.toLowerCase()));

    return (
        <div style={{ display: "flex", gap: 0, height: "calc(100vh - 80px)", overflow: "hidden" }}>
            {/* Left Sidebar */}
            <div style={{
                width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
                background: "rgba(0,0,0,0.25)", borderRight: "1px solid rgba(99,140,255,0.12)",
                borderRadius: "12px 0 0 12px", overflow: "hidden",
            }}>
                {/* DB Info */}
                <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid rgba(99,140,255,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>🗄</span>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 11, color: "#4f8ef7" }}>genie_roi</div>
                            <div style={{ fontSize: 9, color: "var(--text-3)" }}>MySQL · utf8mb4</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <div style={{ flex: 1, padding: "4px 8px", borderRadius: 6, background: "rgba(79,142,247,0.08)", textAlign: "center" }}>
                            <div style={{ fontWeight: 900, fontSize: 12, color: "#4f8ef7" }}>{tables.length}</div>
                            <div style={{ fontSize: 8, color: "var(--text-3)" }}>Table</div>
                        </div>
                        <div style={{ flex: 1, padding: "4px 8px", borderRadius: 6, background: "rgba(34,197,94,0.06)", textAlign: "center" }}>
                            <div style={{ fontWeight: 900, fontSize: 11, color: "#22c55e" }}>{fmtBytes(dbInfo.size)}</div>
                            <div style={{ fontSize: 8, color: "var(--text-3)" }}>All Size</div>
                        </div>
                    </div>
                </div>

                {/* Table search */}
                <div style={{ padding: "8px 10px 0" }}>
                    <input
                        value={tableSearch} onChange={e => setTableSearch(e.target.value)}
                        placeholder="Table Search..."
                        style={{
                            width: "100%", padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(99,140,255,0.15)",
                            background: "rgba(0,0,0,0.2)", color: "var(--text-1)", fontSize: 10, outline: "none", boxSizing: "border-box",
                        }}
                    />
                </div>

                {/* Table list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>
                    {loading ? (
                        <div style={{ padding: 14, textAlign: "center", color: "var(--text-3)", fontSize: 10 }}>Loading...</div>
                    ) : filtered.map(t => (
                        <div key={t.table_name} onClick={() => { setSelected(t.table_name); setTab("data"); }}
                            style={{
                                padding: "7px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 2,
                                background: selected === t.table_name ? "rgba(79,142,247,0.12)" : "transparent",
                                borderLeft: `2px solid ${selected === t.table_name ? "#4f8ef7" : "transparent"}`,
                                transition: "all 100ms",
                            }}>
                            <div style={{ fontWeight: selected === t.table_name ? 800 : 500, fontSize: 10, color: selected === t.table_name ? "#4f8ef7" : "var(--text-1)" }}>
                                🗋 {t.table_name}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>
                                {(t.row_count || 0).toLocaleString()}Row · {fmtBytes(t.total_bytes)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "0 12px 12px 0", background: "rgba(255,255,255,0.02)" }}>
                {/* Header */}
                <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(99,140,255,0.1)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13 }}>🗋</span>
                    <span style={{ fontWeight: 900, fontSize: 13, color: "#4f8ef7" }}>{selected || "Table Select"}</span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                        {["data", "structure", "sql"].map(t => (
                            <button key={t} onClick={() => setTab(t)} style={{
                                padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                                background: tab === t ? "rgba(79,142,247,0.12)" : "transparent",
                                color: tab === t ? "#4f8ef7" : "var(--text-3)", fontWeight: tab === t ? 800 : 500, fontSize: 10,
                            }}>
                                {t === "data" ? "📋 데이터" : t === "structure" ? "🏗 구조" : "⌨️ SQL"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                    {!selected && (
                        <div style={{ textAlign: "center", paddingTop: 60, color: "var(--text-3)" }}>
                            <div style={{ fontSize: 36, marginBottom: 12 }}>🗄</div>
                            <div style={{ fontSize: 12 }}>Left에서 Table을 Select하세요</div>
                        </div>
                    )}
                    {selected && tab === "data" && <TableData key={selected} table={selected} />}
                    {selected && tab === "structure" && <TableStructure key={selected} table={selected} />}
                    {tab === "sql" && <SqlEditor />}
                </div>
            </div>
        </div>
    );
}
