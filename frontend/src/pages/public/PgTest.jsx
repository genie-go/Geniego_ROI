import React, { useState, useEffect } from "react";


/* ══════════════════════════════════════════════════════════════════════
   💳 PG 결제·웹훅 테스트 페이지  (/pg-test)
   ── 로그인 없이 접근 가능
   ── Paddle Sandbox / Toss Payments 테스트 모드
   ══════════════════════════════════════════════════════════════════════ */

const API = "/api";

// ─── 색상/스타일 토큰 ─────────────────────────────────────────────────
const C = {
    bg: "var(--bg)",
    card: "rgba(10,20,40,0.95)",
    border: "rgba(99,140,255,0.15)",
    blue: "#4f8ef7",
    green: "#22c55e",
    orange: "#f59e0b",
    red: "#ef4444",
    purple: "#a855f7",
    text: "var(--text-1)",
    muted: "rgba(226,232,240,0.45)",
};

const card = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "20px 24px",
};

function Dot({ color }) {
    return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 6 }} />;
}

function Tag({ color, children }) {
    return (
        <span style={{
            fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99,
            background: color + "18", border: `1px solid ${color}44`, color,
        }}>{children}</span>
    );
}

function Alert({ type, children }) {
    const map = { ok: { color: C.green, bg: "rgba(34,197,94,0.06)" }, err: { color: C.red, bg: "rgba(239,68,68,0.06)" }, info: { color: C.blue, bg: "rgba(79,142,247,0.06)" }, warn: { color: C.orange, bg: "rgba(245,158,11,0.06)" } };
    const { color, bg } = map[type] || map.info;
    return (
        <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, color, background: bg, border: `1px solid ${color}33`, whiteSpace: "pre-wrap" }}>
            {children}
        </div>
    );
}

// ─── Paddle 섹션 ─────────────────────────────────────────────────────
function PaddleSection() {
    const [clientToken, setClientToken] = useState("");
    const [priceId, setPriceId] = useState("");
    const [email, setEmail] = useState("test@example.com");
    const [loading, setLoading] = useState(false);
    const [log, setLog] = useState([]);
    const [planResult, setPlanResult] = useState(null);
    const [autoLoaded, setAutoLoaded] = useState(false);
    const [paddleEnv, setPaddleEnv] = useState("sandbox");

    const addLog = (type, text) => setLog(l => [{ type, text, ts: new Date().toLocaleTimeString() }, ...l].slice(0, 30));

    // ── 마운트 시 자동으로 config + plans 조회 및 Paddle.js 초기화 ──────────
    useEffect(() => {
        (async () => {
            setLoading(true);
            addLog("info", "🔄 Paddle 설정 자동 로드 중...");
            try {
                // 1) config 조회 (clientToken + env)
                const cfgRes = await fetch(`${API}/v423/paddle/config`);
                const cfg = await cfgRes.json();

                if (cfg.ok && cfg.clientToken) {
                    setClientToken(cfg.clientToken);
                    setPaddleEnv(cfg.env || "sandbox");
                    addLog("ok", `✅ Client Token 로드: ${cfg.clientToken.slice(0, 16)}...  (${cfg.env})`);

                    // Paddle.js 자동 초기화
                    await loadPaddleScript(cfg.clientToken, cfg.env || "sandbox", addLog);
                } else {
                    addLog("warn", "⚠️ Config API 응답이 없습니다. 수동으로 입력하세요.");
                }

                // 2) plans 조회 (price_id 자동 선택)
                const plansRes = await fetch(`${API}/v423/paddle/plans`);
                const plansData = await plansRes.json();
                setPlanResult(plansData);

                if (plansData.plans?.length) {
                    // Pro 플랜 monthly price_id를 기본으로 선택
                    const pro = plansData.plans.find(p => p.id === "pro") || plansData.plans[0];
                    const pid = pro?.price_id_monthly || "";
                    if (pid) {
                        setPriceId(pid);
                        addLog("ok", `✅ Price ID 자동 선택: ${pid} (${pro?.name || "Pro"} Monthly)`);
                    } else {
                        addLog("warn", "⚠️ Price ID가 비어있습니다 — Paddle 대시보드에서 Price ID를 만들어 직접 입력하세요.");
                    }
                    addLog("ok", `✅ Plans 조회 완료: ${plansData.plans.length}개`);
                }
                setAutoLoaded(true);
            } catch (e) {
                addLog("err", `❌ 자동 로드 실패: ${e.message}`);
            }
            setLoading(false);
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Paddle.js 로드 헬퍼 (재사용 가능)
    const loadPaddleScript = (token, env, logger) => new Promise(resolve => {
        if (window.Paddle) {
            window.Paddle.Environment.set(env === "live" ? "production" : "sandbox");
            if (token) window.Paddle.Initialize({ token });
            logger?.("ok", "✅ Paddle.js 이미 로드됨 — 재초기화");
            return resolve();
        }
        const s = document.createElement("script");
        s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        s.onload = () => {
            window.Paddle.Environment.set(env === "live" ? "production" : "sandbox");
            if (token) window.Paddle.Initialize({ token });
            logger?.("ok", `✅ Paddle.js 로드 완료 (${env})`);
            resolve();
        };
        s.onerror = () => { logger?.("err", "❌ Paddle.js 로드 실패"); resolve(); };
        document.head.appendChild(s);
    });

    // Paddle Plans 수동 재조회
    const fetchPlans = async () => {
        setLoading(true);
        addLog("info", "Paddle Plans 재조회...");
        try {
            const r = await fetch(`${API}/v423/paddle/plans`);
            const d = await r.json();
            setPlanResult(d);
            if (d.data?.length) {
                addLog("ok", `✅ Plans 조회 성공: ${d.data.length}개 플랜`);
            } else {
                addLog("warn", `Plans 응답: ${JSON.stringify(d).slice(0, 200)}`);
            }
        } catch (e) {
            addLog("err", `❌ Plans 조회 실패: ${e.message}`);
        }
        setLoading(false);
    };

    // Paddle Checkout 열기
    const openCheckout = () => {
        if (!window.Paddle) {
            addLog("err", "❌ Paddle.js가 로드되지 않았습니다. 잠시 후 다시 시도하세요.");
            return;
        }
        if (!priceId) {
            addLog("warn", "⚠️ Price ID를 입력하세요.");
            return;
        }
        addLog("info", `Paddle Checkout 시작 (priceId: ${priceId})`);
        try {
            window.Paddle.Checkout.open({
                items: [{ priceId, quantity: 1 }],
                customer: email ? { email } : undefined,
                successUrl: `${window.location.origin}/payment/success`,
                settings: { displayMode: "overlay", theme: "dark" },
            });
            addLog("ok", "✅ Checkout overlay 열림");
        } catch (e) {
            addLog("err", `❌ Checkout 오류: ${e.message}`);
        }
    };

    // Webhook 시뮬레이션
    const testWebhook = async () => {
        setLoading(true);
        addLog("info", "웹훅 시뮬레이션 요청...");
        try {
            const r = await fetch(`${API}/v423/paddle/webhook-test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_type: "subscription.activated", test: true }),
            });
            const d = await r.json();
            addLog(d.ok ? "ok" : "warn", JSON.stringify(d, null, 2).slice(0, 400));
        } catch (e) {
            addLog("err", `웹훅 테스트 오류: ${e.message}`);
        }
        setLoading(false);
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Paddle 토큰/설정 */}
            <div style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#a78bfa" }}>🟣 Paddle Sandbox 설정</div>
                    {autoLoaded && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.green, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 20, padding: "3px 10px" }}>
                            <span>✅</span> 자동 로드 완료 <Tag color={paddleEnv === "live" ? C.green : C.orange}>{paddleEnv}</Tag>
                        </div>
                    )}
                    {loading && !autoLoaded && (
                        <div style={{ fontSize: 11, color: C.orange }}>⏳ 설정 로드 중...</div>
                    )}
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                    <div>
                        <label style={lbl}>Client-Side Token (자동 로드됨)</label>
                        <input style={{ ...inp, borderColor: clientToken ? "rgba(34,197,94,0.4)" : C.border }} value={clientToken} onChange={e => setClientToken(e.target.value)} placeholder="서버에서 자동 로드..." />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                            <label style={lbl}>Price ID (Plans에서 자동 선택)</label>
                            <input style={{ ...inp, borderColor: priceId ? "rgba(34,197,94,0.4)" : C.border }} value={priceId} onChange={e => setPriceId(e.target.value)} placeholder="서버 환경변수 미설정 시 직접 입력..." />
                        </div>
                        <div>
                            <label style={lbl}>테스트 이메일</label>
                            <input style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="test@example.com" />
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                    <Btn color={C.purple} onClick={() => loadPaddleScript(clientToken, paddleEnv, addLog)} disabled={loading}>🔌 Paddle.js 재초기화</Btn>
                    <Btn color={C.blue} onClick={fetchPlans} disabled={loading}>📋 Plans 재조회</Btn>
                    <Btn color={C.green} onClick={openCheckout} disabled={loading || !priceId}>💳 Checkout 열기</Btn>
                    <Btn color={C.orange} onClick={testWebhook} disabled={loading}>🔔 웹훅 시뮬레이션</Btn>
                </div>
                {!priceId && autoLoaded && (
                    <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 11, color: C.orange }}>
                        ⚠️ Price ID가 비어있습니다. EC2 서버의 <code>PADDLE_PRICE_PRO_MONTHLY</code> 환경변수를 설정하거나 위 Plans 목록에서 직접 선택하세요.
                    </div>
                )}
            </div>

            {/* Plans 결과 */}
            {planResult && (
                <div style={card}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: C.muted, marginBottom: 10 }}>📋 Plans (Paddle Price ID 목록)</div>
                    {planResult.plans?.length ? (
                        <div style={{ display: "grid", gap: 8 }}>
                            {planResult.plans.map(p => (
                                <div key={p.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(167,139,250,0.05)", border: `1px solid rgba(167,139,250,0.2)`, fontSize: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, color: "#a78bfa" }}>{p.name} (${p.price_usd}/mo)</span>
                                        <Tag color={C.purple}>{p.id}</Tag>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                                        {[
                                            { label: "Monthly Price ID", val: p.price_id_monthly },
                                            { label: "Annual Price ID", val: p.price_id_annual },
                                        ].map(({ label, val }) => (
                                            <div key={label} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "6px 8px" }}>
                                                <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{label}</div>
                                                {val ? (
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <code style={{ fontSize: 10, color: C.green, flex: 1 }}>{val}</code>
                                                        <button onClick={() => { setPriceId(val); addLog("ok", `Price ID 선택: ${val}`); }}
                                                            style={{ padding: "2px 7px", borderRadius: 5, border: "none", background: "rgba(34,197,94,0.2)", color: C.green, fontSize: 9, cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>
                                                            선택
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 10, color: C.red }}>환경변수 미설정</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Alert type="warn">Plans 없음: {JSON.stringify(planResult).slice(0, 300)}</Alert>
                    )}
                </div>
            )}

            <LogPanel log={log} setLog={setLog} />
        </div>
    );
}



// ─── Toss 섹션 ───────────────────────────────────────────────────────
const TOSS_TEST_CK = "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";

function TossSection() {
    const [ck, setCk] = useState(TOSS_TEST_CK);
    const [amount, setAmount] = useState(1000);
    const [orderId] = useState("order_" + Date.now());
    const [log, setLog] = useState([]);
    const [loading, setLoading] = useState(false);

    const addLog = (type, text) => setLog(l => [{ type, text, ts: new Date().toLocaleTimeString() }, ...l].slice(0, 30));

    const loadTossJs = () => {
        if (window.TossPayments) { addLog("ok", "TossPayments.js 이미 로드됨"); return; }
        addLog("info", "TossPayments.js 로딩 중...");
        const s = document.createElement("script");
        s.src = "https://js.tosspayments.com/v1/payment";
        s.onload = () => addLog("ok", "✅ TossPayments.js 로드 완료");
        s.onerror = () => addLog("err", "❌ TossPayments.js 로드 실패");
        document.head.appendChild(s);
    };

    const requestPay = async () => {
        if (!window.TossPayments) {
            addLog("err", "❌ TossPayments.js가 로드되지 않았습니다.");
            return;
        }
        setLoading(true);
        addLog("info", `Toss 결제 요청 중 (${amount.toLocaleString()}원)`);
        try {
            const tp = window.TossPayments(ck);
            await tp.requestPayment("카드", {
                amount,
                orderId,
                orderName: "GeniegoROI PRO 플랜 테스트",
                customerName: "테스트 유저",
                successUrl: `${window.location.origin}/payment/success`,
                failUrl: `${window.location.origin}/payment/fail`,
            });
        } catch (e) {
            addLog("err", `Toss 결제 오류: ${e.message || JSON.stringify(e)}`);
        }
        setLoading(false);
    };

    const checkConfig = async () => {
        setLoading(true);
        addLog("info", "PG 설정 API 조회...");
        try {
            const r = await fetch(`${API}/v423/pg/status`);
            const d = await r.json();
            addLog(d.ok ? "ok" : "warn", JSON.stringify(d, null, 2).slice(0, 500));
        } catch (e) {
            addLog("err", `${e.message}`);
        }
        setLoading(false);
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={card}>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.blue, marginBottom: 16 }}>💳 Toss Payments 테스트</div>
                <div style={{ display: "grid", gap: 12 }}>
                    <div>
                        <label style={lbl}>Client Key (test_ck_...)</label>
                        <input style={inp} value={ck} onChange={e => setCk(e.target.value)} />
                    </div>
                    <div>
                        <label style={lbl}>결제 금액 (원)</label>
                        <input type="number" style={inp} value={amount} onChange={e => setAmount(Number(e.target.value))} min={100} step={100} />
                    </div>
                    <div>
                        <label style={lbl}>Order ID (자동생성)</label>
                        <input style={{ ...inp, opacity: 0.5 }} value={orderId} readOnly />
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                    <Btn color={C.blue} onClick={loadTossJs}>🔌 Toss.js 로드</Btn>
                    <Btn color={C.green} onClick={requestPay} disabled={loading}>💳 카드결제 테스트</Btn>
                    <Btn color={C.orange} onClick={checkConfig} disabled={loading}>🔍 PG 설정 확인</Btn>
                </div>
                <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 11, color: C.orange }}>
                    ⚠️ 테스트 카드: <b>4242 4242 4242 4242</b> · 만료 <b>12/26</b> · CVC <b>100</b> · 비밀번호 <b>00</b>
                </div>
            </div>

            <LogPanel log={log} setLog={setLog} />
        </div>
    );
}

// ─── 웹훅 로그 섹션 ──────────────────────────────────────────────────
function WebhookSection() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [log, setLog] = useState([]);

    const addLog = (type, text) => setLog(l => [{ type, text, ts: new Date().toLocaleTimeString() }, ...l].slice(0, 30));

    const fetchWebhookLog = async () => {
        setLoading(true);
        addLog("info", "웹훅 이벤트 로그 조회...");
        try {
            const r = await fetch(`${API}/v423/paddle/webhook-log`);
            const d = await r.json();
            if (d.ok && d.events) {
                setEvents(d.events);
                addLog("ok", `✅ ${d.events.length}개 웹훅 이벤트 로드`);
            } else {
                addLog("warn", JSON.stringify(d).slice(0, 200));
            }
        } catch (e) {
            addLog("err", e.message);
        }
        setLoading(false);
    };

    const eventTypeColors = {
        "subscription.activated": C.green,
        "subscription.updated": C.blue,
        "subscription.canceled": C.red,
        "transaction.completed": C.green,
        "transaction.payment_failed": C.red,
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={card}>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.orange, marginBottom: 16 }}>🔔 웹훅 이벤트 로그</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <Btn color={C.orange} onClick={fetchWebhookLog} disabled={loading}>🔄 로그 새로고침</Btn>
                </div>
                {events.length === 0 ? (
                    <Alert type="info">웹훅 이벤트가 없습니다. 결제를 완료하면 여기에 로그가 표시됩니다.</Alert>
                ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                        {events.map((ev, i) => {
                            const col = eventTypeColors[ev.event_type] || C.muted;
                            return (
                                <div key={i} style={{ padding: "10px 14px", borderRadius: 10, background: `${col}07`, border: `1px solid ${col}33`, fontSize: 11 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontWeight: 800, color: col }}>{ev.event_type}</span>
                                        <span style={{ color: C.muted, fontSize: 10 }}>{ev.occurred_at || ev.created_at}</span>
                                    </div>
                                    {ev.subscription_id && <div style={{ color: C.muted }}>Sub: {ev.subscription_id}</div>}
                                    {ev.customer_email && <div style={{ color: C.muted }}>Email: {ev.customer_email}</div>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <LogPanel log={log} setLog={setLog} />
        </div>
    );
}

// ─── 공통 컴포넌트 ────────────────────────────────────────────────────
function Btn({ children, onClick, color = C.blue, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: "9px 16px", borderRadius: 9, cursor: disabled ? "not-allowed" : "pointer",
                background: disabled ? "rgba(255,255,255,0.05)" : `${color}20`,
                border: `1px solid ${disabled ? "rgba(255,255,255,0.1)" : color + "55"}`,
                color: disabled ? C.muted : color,
                fontSize: 12, fontWeight: 700, transition: "all 150ms",
            }}
        >
            {children}
        </button>
    );
}

function LogPanel({ log, setLog }) {
    if (!log.length) return null;
    const typeColor = { ok: C.green, err: C.red, warn: C.orange, info: C.blue };
    return (
        <div style={{ ...card, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: C.muted }}>📋 로그</div>
                <button onClick={() => setLog([])} style={{ fontSize: 10, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>지우기</button>
            </div>
            <div style={{ display: "grid", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                {log.map((l, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, fontFamily: "monospace" }}>
                        <span style={{ color: C.muted, flexShrink: 0 }}>{l.ts}</span>
                        <span style={{ color: typeColor[l.type] || C.text }}>{l.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const lbl = { fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 5 };
const inp = {
    width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${C.border}`,
    background: "rgba(7,15,26,0.8)", color: C.text, fontSize: 12, fontFamily: "monospace", boxSizing: "border-box",
};

// ─── 메인 페이지 ──────────────────────────────────────────────────────
const TABS = [
    { id: "paddle", label: "🟣 Paddle Sandbox", color: "#a78bfa" },
    { id: "toss", label: "💳 Toss Payments", color: C.blue },
    { id: "webhook", label: "🔔 웹훅 로그", color: C.orange },
];

export default function PgTest() {
    const [tab, setTab] = useState("paddle");

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter','Pretendard',sans-serif" }}>
            {/* 상단바 */}
            <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 28px", display: "flex", alignItems: "center", gap: 14, background: "rgba(7,15,26,0.97)" }}>
                <span style={{ fontSize: 24 }}>💳</span>
                <div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: C.text }}>PG 결제 테스트</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Paddle Sandbox · Toss Payments · 웹훅 시뮬레이션 — 로그인 불필요</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <Tag color={C.orange}>Sandbox</Tag>
                    <Tag color={C.green}>No Auth Required</Tag>
                </div>
            </div>

            <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
                {/* 경고 바 */}
                <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.06)", border: `1px solid rgba(239,68,68,0.2)`, fontSize: 12, color: "#fca5a5" }}>
                    ⚠️ <b>주의</b>: 이 페이지는 Sandbox/테스트 환경 전용입니다. <b>실제 결제는 발생하지 않습니다.</b> 운영 환경에서 이 URL은 반드시 IP로 접근을 제한하세요.
                </div>

                {/* 탭 */}
                <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            flex: 1, padding: "10px 8px", borderRadius: 9, border: "none", cursor: "pointer",
                            fontSize: 12, fontWeight: 700, transition: "all 150ms",
                            background: tab === t.id ? `${t.color}18` : "transparent",
                            color: tab === t.id ? t.color : C.muted,
                            borderBottom: tab === t.id ? `2px solid ${t.color}` : "2px solid transparent",
                        }}>{t.label}</button>
                    ))}
                </div>

                {/* 탭 콘텐츠 */}
                {tab === "paddle" && <PaddleSection />}
                {tab === "toss" && <TossSection />}
                {tab === "webhook" && <WebhookSection />}
            </div>
        </div>
    );
}
