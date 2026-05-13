import React, { useCallback, useState, useEffect } from 'react';
import { getJsonAuth, postJsonAuth, requestJsonAuth } from '../services/apiClient.js';
const _PC  = { pro:"#a855f7", enterprise:"#f59e0b", starter:"#4f8ef7", growth:"#22c55e", demo:"#64748b" };
const _PL  = { pro:"Pro", enterprise:"Enterprise", starter:"Starter", growth:"Growth", demo:"" };
const _CL  = { monthly:"Monthly", quarterly:"Quarter", biannual:"6개월", yearly:"Annual" };
const _fd  = s => s ? s.slice(0, 10) : "-";
const _fk  = v => (parseInt(v) || 0) > 0 ? (parseInt(v)).toLocaleString() : "-"; // ₩ removed - useCurrency handles
const INP  = { background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:7, color: '#fff', padding:"8px 10px", fontSize:12, outline:"none", width:"100%", boxSizing:"border-box" };

/* ══════════════════════════════════════════════════════════════════════════
   MembersTab — Paid Member Management (List/Search/Edit)
   ══════════════════════════════════════════════════════════════════════════ */
export function MembersTab() {
  const [rows,    setRows]    = React.useState([]);
  const [total,   setTotal]   = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [search,  setSearch]  = React.useState("");
  const [planFlt, setPlanFlt] = React.useState("");
  const [page,    setPage]    = React.useState(1);
  const [detail,  setDetail]  = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  const [msg,     setMsg]     = React.useState("");
  const LMT = 15;

  const load = React.useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ search, plan: planFlt, page, limit: LMT });
    getJsonAuth(`/api/auth/admin/subscribers?${p}`)
      .then(d => { if (d.ok) { setRows(d.rows || []); setTotal(d.total || 0); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, planFlt, page]);

  React.useEffect(() => { load(); }, [load]);

  const save = () => {
    if (!editing) return;
    requestJsonAuth(`/api/auth/admin/subscribers/${editing.id}`, "PATCH", editing)
      .then(() => {
        setMsg("✅ Save Done"); load(); setDetail(null); setEditing(null);
      })
      .catch(e => setMsg("❌ " + e.message));
  };

  const totPages = Math.ceil(total / LMT);

  return (
    <div style={{ display:"grid", gap:12 }}>
      {/* Search Filter */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="🔍 Name / Email / 회사명 Search"
          style={{ ...INP, flex:1, minWidth:200 }} />
        <select value={planFlt} onChange={e => { setPlanFlt(e.target.value); setPage(1); }} style={{ background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:7, color:"#94a3b8", padding:"8px 10px", fontSize:12 }}>
          <option value="">All 플랜</option>
          {Object.entries(_PL).filter(([k]) => k !== "").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={load} style={{ padding:"8px 14px", background:"rgba(79,142,247,0.15)", border:"1px solid rgba(79,142,247,0.3)", borderRadius:7, color:"#4f8ef7", cursor:"pointer", fontSize:12 }}>🔄 Refresh</button>
      </div>

      {msg && (
        <div style={{ padding:"8px 12px", borderRadius:7, fontSize:12, background:msg.startsWith("✅")?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)", color:msg.startsWith("✅")?"#22c55e":"#ef4444", border:`1px solid ${msg.startsWith("✅")?"#22c55e33":"#ef444433"}` }}>
          {msg}<button onClick={() => setMsg("")} style={{ float:"right", background:"none", border:"none", color:"inherit", cursor:"pointer" }}>✕</button>
        </div>
      )}

      <div style={{ fontSize:12, color: '#fff' }} >Total <strong>{total.toLocaleString()}</strong>명의 Paid 회원</div>

      {/* Table Header */}
      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1.3fr 70px 90px 90px 90px 80px 55px", gap:6, padding:"7px 10px", background: 'var(--surface)', borderRadius:8, fontSize:10, fontWeight:700, color:"#7c8fa8" }}>
        <span>회사명 / Name</span><span>Email / 대표</span><span>플랜</span>
        <span>Join Date</span><span>SubscriptionStart</span><span>SubscriptionExpired</span><span>갱신일</span><span>Management</span>
      </div>

      {loading && <div style={{ textAlign:"center", padding:"32px 0", color:"#64748b" }}>⏳ Loading...</div>}
      {!loading && rows.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#3b4d6e", fontSize:13 }}>📭 Paid 회원이 없습니다.</div>
      )}

      {rows.map(u => (
        <div key={u.id} style={{ display:"grid", gridTemplateColumns:"1.2fr 1.3fr 70px 90px 90px 90px 80px 55px", gap:6, padding:"9px 10px", background: 'var(--surface)', border: '1px solid var(--border)', borderRadius:8, alignItems:"center", fontSize:11 }}>
          <div>
            <div style={{ fontWeight:700, color: '#fff' }}>{u.company || "-"}</div>
            <div style={{ color:"#7c8fa8", fontSize:10 }}>{u.name}</div>
          </div>
          <div>
            <div style={{ color:"#94a3b8" }}>{u.email}</div>
            <div style={{ color:"#64748b", fontSize:10 }}>{u.representative || "-"}</div>
          </div>
          <span style={{ padding:"2px 7px", borderRadius:99, fontSize:9, fontWeight:700, background:`${_PC[u.plan]||"#666"}22`, color:_PC[u.plan]||"#666", border:`1px solid ${_PC[u.plan]||"#666"}44` }}>{_PL[u.plan] || u.plan}</span>
          <span style={{ color:"#7c8fa8" }}>{_fd(u.created_at)}</span>
          <span style={{ color:"#22c55e" }}>{_fd(u.subscription_started_at)}</span>
          <span style={{ color: u.subscription_expires_at && u.subscription_expires_at > new Date().toISOString() ? "#4f8ef7" : "#ef4444" }}>{_fd(u.subscription_expires_at)}</span>
          <span style={{ color:"#7c8fa8" }}>{_fd(u.subscription_renewed_at)}</span>
          <button onClick={() => { setDetail(u); setEditing({ ...u }); }} style={{ padding:"4px 7px", background:"rgba(79,142,247,0.1)", border:"1px solid rgba(79,142,247,0.3)", borderRadius:6, color:"#4f8ef7", cursor:"pointer", fontSize:10 }}>
            ✏️ 상세
          </button>
        </div>
      ))}

      {/* Page네이션 */}
      {totPages > 1 && (
        <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding:"5px 12px", borderRadius:6, background:"rgba(79,142,247,0.1)", border:"1px solid rgba(79,142,247,0.2)", color:page===1?"#3b4d6e":"#4f8ef7", cursor:page===1?"not-allowed":"pointer" }}>◀</button>
          <span style={{ padding:"5px 10px", color:"#94a3b8", fontSize:12 }}>{page} / {totPages}</span>
          <button onClick={() => setPage(p => Math.min(totPages, p + 1))} disabled={page === totPages}
            style={{ padding:"5px 12px", borderRadius:6, background:"rgba(79,142,247,0.1)", border:"1px solid rgba(79,142,247,0.2)", color:page===totPages?"#3b4d6e":"#4f8ef7", cursor:page===totPages?"not-allowed":"pointer" }}>▶</button>
        </div>
      )}

      {/* 상세 / Edit Modal */}
      {detail && editing && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => { setDetail(null); setEditing(null); }}>
          <div style={{ background:"#0d1526", border:"1px solid #1c2842", borderRadius:14, padding:24, width:"min(580px,95vw)", maxHeight:"85vh", overflowY:"auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:16 }}>👤 회원 상세 / Edit</div>

            {/* 읽기 전용 Info */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:6, fontSize:11, marginBottom:14, padding:10, background:"rgba(0,0,0,0.2)", borderRadius:8, color:"#64748b" }}>
              <span>Email:</span><span style={{ color:"#94a3b8" }}>{detail.email}</span>
              <span>Join Date:</span><span style={{ color:"#94a3b8" }}>{_fd(detail.created_at)}</span>
              <span>Payment 횟Count:</span><span style={{ color:"#94a3b8" }}>{detail.payment_count || 0}회</span>
              <span>Total Payment액:</span><span style={{ color:"#22c55e" }}>{_fk(detail.total_paid)}</span>
            </div>

            {/* Edit 가능 필드 */}
            {[
              ["회사명",         "company"],
              ["대표자",         "representative"],
              ["Phone",       "phone"],
              ["Subscription Start일",    "subscription_started_at"],
              ["Subscription Expiry Date",    "subscription_expires_at"],
            ].map(([label, key]) => (
              <div key={key} style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:3 }}>{label}</div>
                <input value={editing[key] || ""} onChange={e => setEditing(p => ({ ...p, [key]: e.target.value }))} style={INP} />
              </div>
            ))}

            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:3 }}>플랜</div>
              <select value={editing.plan || "pro"} onChange={e => setEditing(p => ({ ...p, plan: e.target.value }))} style={INP}>
                {Object.entries(_PL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:3 }}>Subscription 주기</div>
              <select value={editing.subscription_cycle || "monthly"} onChange={e => setEditing(p => ({ ...p, subscription_cycle: e.target.value }))} style={INP}>
                {Object.entries(_CL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={save} style={{ flex:1, padding:10, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", border:"none", borderRadius:8, color: '#fff', fontWeight:700, cursor:"pointer", fontSize:13 }}>💾 Save</button>
              <button onClick={() => { setDetail(null); setEditing(null); }} style={{ padding:"10px 16px", background: 'var(--surface)', border: '1px solid var(--border)', borderRadius:8, color:"#94a3b8", cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FreeCouponProfileModal — Free회원 비즈니스 Info Register Modal
   Coupon Activate 전 필Count Info를 입력받는 것과 동일한 UI
   ══════════════════════════════════════════════════════════════════════════ */
export function FreeCouponProfileModal({ couponCode, onClose, onSuccess }) {
  const [form, setForm] = React.useState({
    company: "", phone: "", representative: "",
    business_type: "", website: "", monthly_sales: "",
    ad_channels: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [msg,    setMsg]    = React.useState("");

  const save = async () => {
    if (!form.company || !form.phone || !form.representative) {
      setMsg("❌ 회사명, Phone, 대표자명은 필Count입니다.");
      return;
    }
    setSaving(true);
    try {
      const d = await postJsonAuth(`/api/v423/coupon/profile`, form);
      if (d.ok) {
        // Pro필 Save Success → Coupon Use 재시도
        const d2 = await postJsonAuth(`/api/v423/coupons/redeem`, { code: couponCode });
        if (d2.ok) {
          onSuccess && onSuccess(d2);
        } else {
          setMsg("❌ " + (d2.message || d2.error));
        }
      } else {
        setMsg("❌ " + (d.error || "Save Failed"));
      }
    } catch {
      setMsg("❌ Error 발생");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:99999, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ background:"#0d1526", border:"1px solid #1c2842", borderRadius:16, padding:28, width:"min(560px,95vw)", maxHeight:"92vh", overflowY:"auto" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#4f8ef7,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>📋</div>
          <div>
            <div style={{ fontWeight:900, fontSize:16, color: '#fff' }}>비즈니스 Info Register</div>
            <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>Free Coupon Use을 위해 Add Info를 Register해주세요</div>
          </div>
        </div>

        {/* Coupon Code 표시 */}
        {couponCode && (
          <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(79,142,247,0.08)", border:"1px solid rgba(79,142,247,0.2)", marginBottom:18, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:16 }}>🎟</span>
            <div>
              <div style={{ fontSize:9, color:"#7c8fa8", fontWeight:700 }}>사용할 Coupon Code</div>
              <div style={{ fontSize:13, color:"#4f8ef7", fontWeight:800, letterSpacing:2 }}>{couponCode}</div>
            </div>
          </div>
        )}

        {/* 안내 Banner */}
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(234,179,8,0.08)", border:"1px solid rgba(234,179,8,0.2)", marginBottom:20, fontSize:11, color:"#ca8a04", lineHeight:1.6 }}>
          ⚠️ Free Coupon은 Paid 서비스와 동일한 Count준의 이용이 가능하므로, 비즈니스 Info를 먼저 Register하셔야 Coupon을 Activate할 Count 있습니다. Info는 안전하게 보관됩니다.
        </div>

        {/* 필Count Info */}
        <div style={{ fontSize:10, color:"#4f8ef7", fontWeight:800, marginBottom:10 }}>✅ 필Count Info</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          {[
            ["회사명 *", "company", "text", "(주)회사명"],
            ["대표자명 *", "representative", "text", "John Doe"],
            ["Phone *", "phone", "tel", "010-1234-5678"],
            ["업종", "business_type", "text", "이커머스 / 패션 / 뷰티"],
          ].map(([label, key, type, placeholder]) => (
            <div key={key} style={{ gridColumn: key === "company" || key === "representative" ? undefined : undefined }}>
              <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:4 }}>{label}</div>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ ...INP, border: (key === "company" || key === "phone" || key === "representative") && !form[key] ? "1px solid rgba(239,68,68,0.4)" : INP.border }}
              />
            </div>
          ))}
        </div>

        {/* Select Info */}
        <div style={{ fontSize:10, color:"#7c8fa8", fontWeight:800, marginBottom:10 }}>📌 Add Info (Select)</div>
        <div style={{ display:"grid", gap:10, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:4 }}>웹사이트 / 쇼핑몰 URL</div>
            <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
              placeholder="https://myshop.co.kr" style={INP} />
          </div>
          <div>
            <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:4 }}>월 Average Revenue 규모</div>
            <select value={form.monthly_sales} onChange={e => setForm(p => ({ ...p, monthly_sales: e.target.value }))} style={INP}>
              <option value="">Select (Select사항)</option>
              <option value="under_1B">1억 미만</option>
              <option value="1B_to_5B">1억~5억</option>
              <option value="5B_to_20B">5억~20억</option>
              <option value="20B_to_100B">20억~100억</option>
              <option value="over_100B">100억 이상</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:4 }}>주요 Ad Channel (복Count 입력 가능)</div>
            <input value={form.ad_channels} onChange={e => setForm(p => ({ ...p, ad_channels: e.target.value }))}
              placeholder="Meta, Google, Naver, Kakao, TikTok, Coupang ..." style={INP} />
          </div>
        </div>

        {msg && (
          <div style={{ padding:"8px 12px", borderRadius:8, fontSize:12, background:msg.startsWith("✅")?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)", color:msg.startsWith("✅")?"#22c55e":"#ef4444", border:`1px solid ${msg.startsWith("✅")?"#22c55e33":"#ef444433"}`, marginBottom:14 }}>
            {msg}
          </div>
        )}

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={save} disabled={saving} style={{ flex:1, padding:14, borderRadius:10, background: saving ? "rgba(79,142,247,0.2)" : "linear-gradient(135deg,#4f8ef7,#6366f1)", border:"none", color: '#fff', fontWeight:800, fontSize:14, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : "0 4px 16px rgba(79,142,247,0.4)" }}>
            {saving ? "⏳ Save 및 Coupon Activate in progress..." : "📋 Info Register 후 Coupon Activate"}
          </button>
          <button onClick={onClose} style={{ padding:"14px 18px", background: 'var(--surface)', border: '1px solid var(--border)', borderRadius:10, color:"#94a3b8", cursor:"pointer", fontSize:13 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CouponsGrantTab — Free 이용권 지급 Management (Free회원 대상 지원)
   ══════════════════════════════════════════════════════════════════════════ */
const TRIGGER_TYPES = [
  { value: "manual",   label: "Count동 지급 (Management자)" },
  { value: "new_paid", label: "신규 Paid 가입" },
  { value: "renew_3m", label: "3개월 갱신" },
  { value: "renew_6m", label: "6개월 갱신" },
  { value: "renew_1y", label: "Annual 갱신" },
];
const COUPON_PLANS = [
  { id: "growth",     label: "Growth",     color: "#22c55e" },
  { id: "pro",        label: "Pro",        color: "#a855f7" },
  { id: "enterprise", label: "Enterprise", color: "#f59e0b" },
];
const SC = { pending:"#eab308", applied:"#22c55e", expired:"#64748b", cancelled:"#ef4444" };
const SL = { pending:"Pending", applied:"Apply됨", expired:"Expired", cancelled:"Cancel" };

export function CouponsGrantTab() {
  const [subs,        setSubs]        = React.useState([]);   // Paid Member
  const [Users,   setUsers]   = React.useState([]);   // Free회원
  const [coupons,     setCoupons]     = React.useState([]);
  const [total,       setTotal]       = React.useState(0);
  const [loading,     setLoading]     = React.useState(false);
  const [targetType,  setTargetType]  = React.useState("free"); // "free" | "paid"
  const [form,        setForm]        = React.useState({
    user_id:"", plan:"pro", months:1, reason:"", trigger_type:"manual", expires_days:90,
  });
  const [msg,         setMsg]         = React.useState("");
  const [msgType,     setMsgType]     = React.useState("ok");
  const [fltStatus,   setFltStatus]   = React.useState("");
  const [page,        setPage]        = React.useState(1);
  const [Search,  setSearch]  = React.useState("");
  const LMT = 15;

  const loadCoupons = React.useCallback(() => {
    const p = new URLSearchParams({ status: fltStatus, page, limit: LMT });
    getJsonAuth(`/api/v423/admin/coupons?${p}`)
      .then(d => { if (d.ok) { setCoupons(d.coupons || []); setTotal(d.total || 0); } })
      .catch(() => {});
  }, [fltStatus, page]);

  const loadSubs = React.useCallback(() => {
    getJsonAuth(`/api/auth/admin/subscribers?limit=200`)
      .then(d => { if (d.ok) setSubs(d.rows || []); }).catch(() => {});
  }, []);

  const loadUsers = React.useCallback(() => {
    const p = new URLSearchParams(Search ? { search: Search } : {});
    getJsonAuth(`/api/v423/admin/-users?${p}`)
      .then(d => { if (d.ok) setUsers(d.rows || []); }).catch(() => {});
  }, [Search]);

  React.useEffect(() => { loadCoupons(); loadSubs(); loadUsers(); }, [loadCoupons, loadSubs, loadUsers]);

  const grant = async () => {
    if (!form.user_id) {
      setMsg("❌ 대상 회원을 Select해주세요."); setMsgType("err"); return;
    }
    setLoading(true);
    try {
      const payload = {
        user_id: Number(form.user_id),
        plan: form.plan,
        duration_days: Number(form.months) * 30,
        max_uses: 1,
        note: form.reason,
      };
      const d = await postJsonAuth(`/api/v423/admin/coupons`, payload);
      if (d.ok) {
        const extraMsg = d.requires_profile
          ? `\n⚠️ Free회원이므로 Coupon Code [${d.code}] 사용 시 비즈니스 Info Register이 필Count입니다.`
          : "";
        setMsg(`✅ Coupon Issue Done [${d.code}]${extraMsg}`);
        setMsgType("ok"); loadCoupons(); setForm(f => ({ ...f, reason: "" }));
      } else { setMsg("❌ " + d.error); setMsgType("err"); }
    } catch (e) { setMsg("❌ Error 발생"); setMsgType("err"); }
    finally { setLoading(false); }
  };

  const revoke = async (id) => {
    if (!window.confirm("이 이용권을 Cancel하시겠습니까?")) return;
    const d = await postJsonAuth(`/api/v423/admin/coupons/${id}/revoke`, {});
    if (d.ok) { setMsg("✅ Cancel Done"); setMsgType("ok"); loadCoupons(); }
  };

  const totPages = Math.ceil(total / LMT);
  const selectedUser = [...subs, ...Users].find(u => String(u.id) === String(form.user_id));

  return (
    <div style={{ display:"grid", gap:16 }}>

      {/* 지급 폼 */}
      <div style={{ background:"rgba(79,142,247,0.05)", border:"1px solid rgba(79,142,247,0.15)", borderRadius:12, padding:18 }}>
        <div style={{ fontWeight:800, fontSize:14, marginBottom:16, color:"#4f8ef7" }}>🎟 Free Subscription 이용권 지급</div>

        {/* 대상 Type Select */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {[
            { val: "free", label: "🌱 Free회원 대상", color: "#22c55e", sub: "비즈니스 Info Register 조건부" },
            { val: "paid", label: "💎 Paid Member 대상", color: "#a855f7", sub: "즉시 Apply 가능" },
          ].map(opt => (
            <button key={opt.val} type="button" onClick={() => { setTargetType(opt.val); setForm(f => ({ ...f, user_id: "" })); }} style={{ flex:1, padding:"12px 14px", borderRadius:10, cursor:"pointer", textAlign:"left",
                background: targetType === opt.val ? `${opt.color}12` : "rgba(255,255,255,0.02)",
                border: `2px solid ${targetType === opt.val ? opt.color : "rgba(99,140,255,0.12)"}`,
                transition:"all 150ms" }}>
              <div style={{ fontWeight:800, fontSize:12, color: opt.color }}>{opt.label}</div>
              <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>{opt.sub}</div>
            </button>
          ))}
        </div>

        {/* Free회원 Select */}
        {targetType === "free" && (
          <>
            {/* 안내 Banner */}
            <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(234,179,8,0.07)", border:"1px solid rgba(234,179,8,0.2)", marginBottom:12, fontSize:11, color:"#ca8a04", lineHeight:1.6 }}>
              ⚠️ <strong>Free회원 Coupon 지급 시 주의:</strong> Free회원이 Coupon을 사용하려면 <strong>비즈니스 Info(회사명·Phone·대표자명)</strong>를 먼저 Register해야 합니다. Info 미Register 시 Coupon Activate가 Block됩니다.
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginBottom:12 }}>
              <input value={Search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Name / Email / 회사명 Search..." style={{ ...INP }} />
              <button onClick={loadUsers} style={{ padding:"8px 12px", background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:7, color:"#22c55e", cursor:"pointer", fontSize:11 }}>
                🔄
              </button>
            </div>
            <div>
              <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:6 }}>
                Free회원 Select <span style={{ color:"#64748b" }}>({Users.length}명)</span>
              </div>
              <select value={form.user_id}
                onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                style={{ ...INP, color: form.user_id ? "#e2e8f0" : "#64748b" }}>
                <option value="">-- 대상 Free회원 Select --</option>
                {Users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.company ? `[${u.company}] ` : ""}{u.name || u.email} — {u.email}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Paid Member Select */}
        {targetType === "paid" && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:"#64748b", marginBottom:4 }} >대상 Paid Member <span>(비워두면 All)</span></div>
            <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} style={INP}>
              <option value="">📢 All Paid 회원</option>
              {subs.map(s => (
                <option key={s.id} value={s.id}>{s.company || s.name} ({s.email}) [{_PL[s.plan] || s.plan}]</option>
              ))}
            </select>
          </div>
        )}

        {/* Coupon 플랜 Select */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:8 }}>지급할 플랜</div>
          <div style={{ display:"flex", gap:6 }}>
            {COUPON_PLANS.map(p => (
              <button key={p.id} type="button" onClick={() => setForm(f => ({ ...f, plan: p.id }))}
                style={{
                  flex:1, padding:"9px 8px", borderRadius:8, cursor:"pointer", textAlign:"center",
                  background: form.plan === p.id ? `${p.color}18` : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${form.plan === p.id ? p.color : "rgba(99,140,255,0.15)"}`,
                  color: form.plan === p.id ? p.color : "#7c8fa8", fontWeight: form.plan === p.id ? 800 : 400,
                  fontSize:12, transition:"all 150ms" }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:6 }}>Free Period (1~6개월)</div>
            <div style={{ display:"flex", gap:4 }}>
              {[1,2,3,4,5,6].map(m => (
                <button key={m} onClick={() => setForm(f => ({ ...f, months: m }))}
                  style={{ flex:1, padding:"8px 2px", borderRadius:7, border:`2px solid ${form.months===m?"#4f8ef7":"rgba(79,142,247,0.2)"}`, background:form.months===m?"rgba(79,142,247,0.2)":"transparent", color:form.months===m?"#4f8ef7":"#7c8fa8", fontWeight:form.months===m?800:400, cursor:"pointer", fontSize:11 }}>
                  {m}개
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:4 }}>이용권 Valid Period (days)</div>
            <input type="number" value={form.expires_days} onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))} min={1} max={365} style={INP} />
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, color:"#7c8fa8", marginBottom:4 }}>지급 Note</div>
          <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="지급 이유 (예: 신규 체험 Coupon 1개월)" style={INP} />
        </div>

        {/* 미리보기 */}
        <div style={{ marginBottom:12, padding:"10px 14px", background:"rgba(0,0,0,0.2)", borderRadius:8, fontSize:12 }}>
          <span style={{ color:"#7c8fa8" }}>지급 예정: </span>
          <strong style={{ color: targetType === "free" ? "#22c55e" : "#e2e8f0" }}>
            {selectedUser ? `${selectedUser.company || selectedUser.name || selectedUser.email}` : targetType === "free" ? "Free회원 Select 필요" : "All Paid 회원"}
          </strong>
          <span style={{ color:"#7c8fa8" }}> → </span>
          <strong style={{ color:"#4f8ef7" }}>{form.months}개월 {COUPON_PLANS.find(p=>p.id===form.plan)?.label || form.plan} 플랜 Free</strong>
          {targetType === "free" && form.user_id && (
            <span style={{ color:"#ca8a04", fontSize:10 }}> · ⚠️ Info Register 후 사용 가능</span>
          )}
        </div>

        {msg && (
          <div style={{ marginBottom:12, padding:"10px 14px", borderRadius:8, fontSize:12, background:msgType==="ok"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)", color:msgType==="ok"?"#22c55e":"#ef4444", border:`1px solid ${msgType==="ok"?"#22c55e33":"#ef444433"}`, lineHeight:1.6, whiteSpace:"pre-line" }}>
            {msg}
          </div>
        )}

        <button onClick={grant} disabled={loading}
          style={{ width:"100%", padding:13, background:loading?"rgba(79,142,247,0.2)":"linear-gradient(135deg,#4f8ef7,#6366f1)", border:"none", borderRadius:10, color: '#fff', fontWeight:800, fontSize:14, cursor:loading?"not-allowed":"pointer", boxShadow:loading?"none":"0 4px 16px rgba(79,142,247,0.4)", transition:"all 200ms" }}>
          {loading ? "⏳ Issue in progress..." : `🎟 이용권 Issue (${form.months}개월 ${COUPON_PLANS.find(p=>p.id===form.plan)?.label || form.plan})`}
        </button>
      </div>

      {/* 이용권 List */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontWeight:400, fontSize:11, color:"#7c8fa8" }} >📋 Issue 내역 <span>({total}건)</span></div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <select value={fltStatus} onChange={e => { setFltStatus(e.target.value); setPage(1); }} style={{ background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:7, color:"#94a3b8", padding:"6px 10px", fontSize:11 }}>
              <option value="">All Status</option>
              {Object.entries(SL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={loadCoupons} style={{ padding:"6px 10px", background:"rgba(79,142,247,0.1)", border:"1px solid rgba(79,142,247,0.2)", borderRadius:6, color:"#4f8ef7", cursor:"pointer", fontSize:11 }}>🔄</button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 80px 70px 65px 90px 80px 70px 50px", gap:5, padding:"7px 10px", background: 'var(--surface)', borderRadius:8, fontSize:10, fontWeight:700, color:"#7c8fa8" }}>
          <span>회원</span><span>사유</span><span>플랜</span><span>Period</span><span>대상</span><span>Issue일</span><span>사용일</span><span>Status</span><span />
        </div>

        {coupons.length === 0 && (
          <div style={{ textAlign:"center", padding:"30px 0", color:"#3b4d6e", fontSize:13 }}>📭 Issue 내역이 없습니다.</div>
        )}

        {coupons.map(c => (
          <div key={c.id} style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 80px 70px 65px 90px 80px 70px 50px", gap:5, padding:"8px 10px", background: 'var(--surface)', border: '1px solid var(--border)', borderRadius:7, alignItems:"center", fontSize:11, marginBottom:3 }}>
            <div>
              <div style={{ color: '#fff', fontWeight:600 }}>{c.issued_to_email || c.redeemer_name || "-"}</div>
              <div style={{ color:"#4f8ef7", fontSize:9, fontWeight:700, letterSpacing:1 }}>{c.code}</div>
            </div>
            <div style={{ color:"#94a3b8", fontSize:10, lineHeight:1.4 }}>{c.note?.replace("[profile_required]", "") || "-"}</div>
            <span style={{ padding:"2px 6px", borderRadius:99, fontSize:9, fontWeight:700, background:`${_PC[c.plan]||"#666"}22`, color:_PC[c.plan]||"#666", border:`1px solid ${_PC[c.plan]||"#666"}44` }}>{_PL[c.plan] || c.plan}</span>
            <span style={{ color:"#4f8ef7", fontWeight:700 }}>{c.duration_days}일</span>
            <span style={{ fontSize:9, padding:"2px 5px", borderRadius:99, background: c.issued_to_user_id ? "rgba(234,179,8,0.1)" : "rgba(34,197,94,0.1)", color: c.issued_to_user_id ? "#eab308" : "#22c55e" }}>
              {c.issued_to_user_id ? "지정" : "범용"}
              {(c.note||"").includes("[profile_required]") && <span title="비즈니스 Info Register 필요"> ⚠️</span>}
            </span>
            <span style={{ color:"#7c8fa8", fontSize:10 }}>{_fd(c.created_at)}</span>
            <span style={{ color:"#22c55e", fontSize:10 }}>{c.redeemed_at ? _fd(c.redeemed_at) : "-"}</span>
            <span style={{ padding:"2px 6px", borderRadius:99, fontSize:9, fontWeight:700, background:`${c.is_revoked ? "#ef4444" : (c.use_count >= c.max_uses ? "#22c55e" : "#eab308")}22`, color: c.is_revoked ? "#ef4444" : (c.use_count >= c.max_uses ? "#22c55e" : "#eab308") }}>
              {c.is_revoked ? "Cancel" : c.use_count >= c.max_uses ? "사용됨" : "Pending"}
            </span>
            {!c.is_revoked && c.use_count < c.max_uses ? (
              <button onClick={() => revoke(c.id)}
                style={{ padding:"3px 6px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:5, color:"#ef4444", cursor:"pointer", fontSize:9 }}>
                Cancel
              </button>
            ) : <span />}
          </div>
        ))}

        {totPages > 1 && (
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:10 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding:"5px 12px", borderRadius:6, background:"rgba(79,142,247,0.1)", border:"1px solid rgba(79,142,247,0.2)", color:page===1?"#3b4d6e":"#4f8ef7", cursor:page===1?"not-allowed":"pointer" }}>◀</button>
            <span style={{ padding:"5px 10px", color:"#94a3b8", fontSize:12 }}>{page} / {totPages}</span>
            <button onClick={() => setPage(p => Math.min(totPages, p + 1))} disabled={page === totPages}
              style={{ padding:"5px 12px", borderRadius:6, background:"rgba(79,142,247,0.1)", border:"1px solid rgba(79,142,247,0.2)", color:page===totPages?"#3b4d6e":"#4f8ef7", cursor:page===totPages?"not-allowed":"pointer" }}>▶</button>
          </div>
        )}
      </div>
    </div>
  );
}
