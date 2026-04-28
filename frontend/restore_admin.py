import os

path = 'D:/project/GeniegoROI/frontend/src/pages/Admin.jsx'

with open(path, 'r', encoding='utf-8') as f:
    orig = f.read()

start_marker = r'                  <div style={{ fontSize:10, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.title}</div>'
end_marker = r'/* ── 관리 패널 (엔터프라이즈급) ─────────────────────────────── */'

idx1 = orig.find(start_marker)
idx2 = orig.find(end_marker)

if idx1 == -1 or idx2 == -1:
    print("Markers not found!")
    exit(1)

# GOOD CONTENT
good = r'''                  <div style={{ fontSize:10, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.title}</div>
                  <div style={{ fontSize:9, color:"var(--text-3)", marginTop:2 }}>
                    {d.type === "upload" ? "📤 직접 업로드" : "🤖 AI 생성"} · {d.platform} · {d.animation}
                  </div>
                  <div style={{ display:"flex", gap:4, marginTop:6 }}>
                    <span style={{ fontSize:8, padding:"2px 6px", borderRadius:99, background:"rgba(168,85,247,0.1)", color:"#a855f7", fontWeight:700 }}>{d.width}×{d.height}</span>
                    <span style={{ fontSize:8, padding:"2px 6px", borderRadius:99, background:"rgba(34,197,94,0.1)", color:"#22c55e", fontWeight:700 }}>{d.created_at?.slice(0,10)}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeDesign(d.id); }} style={{
                      marginLeft:"auto", fontSize:8, padding:"2px 6px", borderRadius:99,
                      background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.2)",
                      fontWeight:700, cursor:"pointer",
                    }}>삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes slideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:none} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.85;transform:scale(1.03)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes gradWave { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes typing { from{width:0} to{width:100%} }
      `}</style>
    </div>
  </div>
);
}

function CouponMgmtPanel() {
  const { token } = useAuth();
  const { pushNotification } = useNotification();
  const authKey = token || _ADMIN_KEY;
  const hdrs = { "Content-Type":"application/json", Authorization:`Bearer ${authKey}` };
  const is = !token || token === _ADMIN_KEY;

  const [users,   setUsers]   = useState(_USERS);
  const [coupons, setCoupons] = useState(_Coups);
  const [search,  setSearch]  = useState("");
  const [selUser, setSelUser] = useState(null);
  const [form,    setForm]    = useState({ plan:"pro", duration_days:30, max_uses:1, note:"", customMonth:"" });
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState(null);
  const [view,    setView]    = useState("issue"); // "issue" | "list" | "rules"

  // 자동 발급 규칙 state — localStorage에서 복원
  const [rules, setRules]     = useState(() => {
    try { const s = localStorage.getItem('coupon_auto_rules'); return s ? JSON.parse(s) : DEFAULT_RULES; } catch { return DEFAULT_RULES; }
  });
  const [rulesBusy, setRulesBusy] = useState(false);

  const flash = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg(null),4000); };

  // 회원 List 불러오기 (All 유저 Search — plan 컬럼으로 free/ 구분)
  useEffect(()=>{
    if (is) return;
    fetch(`/api/v423/admin/users?limit=200`, { headers:hdrs })
      .then(r=>r.json()).then(d=>{ if(d.명) setUsers(d.명); }).catch(()=>{});
  }, []);


  // Coupon List
  useEffect(()=>{
    if (is) { setCoupons(_Coups); return; }
    fetch(`/api/v423/admin/coupons?limit=50`, { headers:hdrs })
      .then(r=>r.json()).then(d=>{ if(d.coupons) setCoupons(d.coupons); }).catch(()=>{});
  }, [view]);

  const filtered = users.filter(u =>
    !search || u.email.includes(search) || (u.name||'').includes(search)
  );

  const handleIssue = async () => {
    if (!selUser) { flash("회원을 선택하세요",false); return; }
    setBusy(true);
    try {
      if (is) {
        await new Promise(r=>setTimeout(r,700));
        const code = 'GENIE-FREE-' + Math.random().toString(36).slice(2,10).toUpperCase();
        const isFreeMember = !selUser.plan;
        const c = { id:_Coups.length+1, code, plan:form.plan,
          duration_days:form.duration_days, max_uses:form.max_uses, use_count:0,
          issued_to_email:selUser.email,
          note: isFreeMember ? (form.note ? form.note + ' [profile_required]' : '[profile_required]') : form.note,
          is_revoked:0, redeemed_at:null, created_at:new Date().toISOString().slice(0,10) };
        _Coups = [c,..._Coups];
        setCoupons([c,...coupons]);
        const extraMsg = isFreeMember
          ? `\n⚠️ 무료회원 → 쿠폰 [${code}] 사용 전 비즈니스 정보를 반드시 등록해야 합니다.`
          : '';
        flash(`✓ 쿠폰 발급 완료: ${code}${extraMsg}`);
        pushNotification({ type:"alert", title:"쿠폰 발급", body:`${selUser.email}님께 ${form.plan} ${form.duration_days >= 30 ? Math.round(form.duration_days/30)+"개월" : form.duration_days+"일"} 쿠폰이 발급되었습니다.`, link:"/admin" });
        setSelUser(null);
      } else {
        const r = await fetch(`/api/v423/admin/coupons`, {
          method:"POST", headers:hdrs,
          body:JSON.stringify({ user_id:selUser.id, plan:form.plan, duration_days:form.duration_days, max_uses:form.max_uses, note:form.note }),
        });
        const d = await r.json();
        if (!d.ok) { flash(d.error||'Error',false); return; }
        const extraMsg = d.requires_profile
          ? `\n⚠️ 무료회원 → 쿠폰 [${d.code}] 사용 전 비즈니스 정보 등록이 필요합니다.`
          : '';
        flash(`✓ 쿠폰 발급 완료: ${d.code}${extraMsg}`);
        pushNotification({ type:"alert", title:"쿠폰 발급", body:`${selUser.email}`, link:"/admin" });
        setSelUser(null);
      }
    } finally { setBusy(false); }
  };


  const handleRevoke = async (coupon) => {
    if (!confirm(`쿠폰 ${coupon.code}를 취소하시겠습니까?`)) return;
    if (is) {
      _Coups = _Coups.map(c => c.id===coupon.id ? {...c,is_revoked:1} : c);
      setCoupons(prev=>prev.map(c=>c.id===coupon.id?{...c,is_revoked:1}:c));
      flash('쿠폰이 취소되었습니다');
      return;
    }
    const r = await fetch(`/api/v423/admin/coupons/${coupon.id}/revoke`, { method:"POST", headers:hdrs });
    const d = await r.json();
    if (d.ok) { flash(d.message); setCoupons(prev=>prev.map(c=>c.id===coupon.id?{...c,is_revoked:1}:c)); }
    else flash(d.error||'오류 발생',false);
  };

  const kpis = useMemo (()=>[
    { l:"전체 발급", v:coupons.length,                                          c:"#4f8ef7" },
    { l:"사용 가능", v:coupons.filter(c=>!c.is_revoked&&!c.redeemed_at).length, c:"#22c55e" },
    { l:"사용 완료", v:coupons.filter(c=>c.redeemed_at).length,                c:"#a855f7" },
    { l:"취소됨",   v:coupons.filter(c=>c.is_revoked).length,                  c:"#ef4444" },
  ],[coupons]);

  return (
    <div style={{ display:"grid", gap:16 }}>
      {/* KPI */}
      <div className="grid4">
        {kpis.map(({l,v,c})=>(
          <div key={l} className="kpi-card" style={{"--accent":c}}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ padding:"10px 14px", borderRadius:8, fontSize:12, fontWeight:700,
          background: msg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${msg.ok?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,
          color: msg.ok ? "#22c55e" : "#ef4444" }}>{msg.text}</div>
      )}

      {/* Tab */}
      <div style={{ display:"flex", gap:0, background:"rgba(0,0,0,0.3)", borderRadius:10, overflow:"hidden", border:"1px solid rgba(99,140,255,0.15)" }}>
        {[
          {k:"issue", l:"🎁 쿠폰 발급"},
          {k:"list",  l:"📋 발급 내역"},
          {k:"rules", l:"⚙️ 자동 발급 규칙"},
          {k:"promo", l:"🎨 프로모션 디자인"},
        ].map(t=>(
          <button key={t.k} onClick={()=>setView(t.k)} style={{
            flex:1, padding:"10px 0", fontSize:12, fontWeight:700, cursor:"pointer",
            background: view===t.k ? "rgba(79,142,247,0.15)" : "transparent",
            border:"none", color: view===t.k ? "#4f8ef7" : "var(--text-3)",
            borderBottom: view===t.k ? "2px solid #4f8ef7" : "2px solid transparent",
          }}>{t.l}</button>
        ))}
      </div>

      {/* ── Coupon Issue 폼 ── */}
      {view==="issue" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* 좌: 회원 Search */}
          <div className="card card-glass" style={{ padding:"16px 18px" }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:12 }}>👤 회원 선택</div>
            <input className="input" placeholder="이메일 또는 이름 검색..." value={search}
              onChange={e=>setSearch(e.target.value)}
              style={{ width:"100%", padding:"7px 10px", fontSize:11, marginBottom:8 }} />
            <div style={{ display:"grid", gap:5, maxHeight:280, overflowY:"auto" }}>
              {filtered.length===0 && <div style={{ fontSize:11, color:"var(--text-3)", textAlign:"center", padding:20 }}>검색 결과가 없습니다</div>}
              {filtered.map(u=>(
                <div key={u.id} onClick={()=>setSelUser(selUser?.id===u.id?null:u)}
                  style={{
                    padding:"9px 12px", borderRadius:9, cursor:"pointer",
                    background: selUser?.id===u.id ? "rgba(79,142,247,0.15)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selUser?.id===u.id ? "rgba(79,142,247,0.4)" : "rgba(255,255,255,0.06)"}`,
                    display:"flex", alignItems:"center", gap:10, transition:"all 150ms",
                  }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(79,142,247,0.15)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                    {(u.name||u.email)[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.name||'(이름없음)'}</div>
                    <div style={{ fontSize:10, color:"#4f8ef7", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize:9, padding:"2px 7px", borderRadius:99, fontWeight:700,
                    background: u.plan==="pro"||u.plan==="enterprise" ? "rgba(168,85,247,0.15)" : "rgba(234,179,8,0.15)",
                    color:       u.plan==="pro"||u.plan==="enterprise" ? "#a855f7" : "#eab308",
                  }}>{u.plan||"free"}</span>
                  {selUser?.id===u.id && <span style={{color:"#4f8ef7",fontSize:16}}>✓</span>}
                </div>
              ))}
            </div>
            {selUser && (
              <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:"rgba(34,197,94,0.07)", border:"1px solid rgba(34,197,94,0.25)", fontSize:11 }}>
                ✅ <strong style={{color:"#22c55e"}}>{selUser.name}</strong> ({selUser.email}) 선택됨
              </div>
            )}
            {/* Free회원 Pro필 필Count 안내 */}
            {selUser && !selUser.plan && (
              <div style={{ marginTop:8, padding:"10px 12px", borderRadius:8, background:"rgba(234,179,8,0.08)", border:"1px solid rgba(234,179,8,0.25)", fontSize:11, color:"#ca8a04", lineHeight:1.6 }}>
                ⚠️ <strong>무료회원 쿠폰 조건:</strong> 이 회원이 쿠폰을 사용하려면 <strong>비즈니스 정보(회사명·전화번호·대표자명)</strong>를 먼저 등록해야 합니다. 미등록 시 쿠폰 활성화가 자동 차단됩니다.
              </div>
            )}
          </div>

          {/* 우: Coupon Issue 폼 */}
          <div className="card card-glass" style={{ padding:"16px 18px", display:"grid", gap:14 }}>
            <div style={{ fontWeight:800, fontSize:13 }}>🎁 쿠폰 설정</div>

            <div>
              <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:6 }}>적용 플랜</label>
              <div style={{ display:"grid", gap:6 }}>
                {[
                  { v:"growth",      l:"Growth",      sub:"핵심 기능 이용권",    c:"#22c55e" },
                  { v:"pro",         l:"Pro",         sub:"전체 기능 이용권",    c:"#a855f7" },
                  { v:"enterprise",  l:"Enterprise",  sub:"엔터프라이즈 이용권", c:"#f59e0b" },
                ].map(p=>(
                  <button key={p.v} onClick={()=>setForm(f=>({...f,plan:p.v}))}
                    style={{
                      padding:"10px 14px", borderRadius:9, cursor:"pointer", textAlign:"left",
                      background: form.plan===p.v ? `${p.c}1A` : "rgba(255,255,255,0.02)",
                      border: `1.5px solid ${form.plan===p.v ? p.c : "rgba(99,140,255,0.1)"}`,
                      display:"flex", alignItems:"center", gap:10,
                    }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:p.c, display:"inline-block", flexShrink:0 }}/>
                    <div>
                      <div style={{ fontWeight:700, fontSize:12 }}>{p.l}</div>
                      <div style={{ fontSize:10, color:"var(--text-3)" }}>{p.sub}</div>
                    </div>
                    {form.plan===p.v && <span style={{ marginLeft:"auto", color:p.c }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:6 }}>이용 기간</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                {MONTH_OPTS.map(m=>(
                  <button key={m.days} onClick={()=>setForm(f=>({...f,duration_days:m.days,customMonth:""}))}
                    style={{
                      padding:"6px 14px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer",
                      background: form.duration_days===m.days && !form.customMonth ? "rgba(79,142,247,0.2)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${form.duration_days===m.days && !form.customMonth?"#4f8ef7":"rgba(99,140,255,0.12)"}`,
                      color: form.duration_days===m.days && !form.customMonth ? "#4f8ef7" : "var(--text-3)",
                    }}>{m.label}</button>
                ))}
                <span style={{ fontSize:10, color:"var(--text-3)", margin:"0 4px" }}>또는</span>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <input className="input" type="number" min={1} max={36} placeholder="직접 입력"
                    value={form.customMonth||""}
                    onChange={e=>{
                      const v = parseInt(e.target.value) || "";
                      setForm(f=>({...f, customMonth: v, duration_days: v ? v*30 : 30 }));
                    }}
                    style={{ width:70, padding:"5px 8px", fontSize:11, textAlign:"center",
                      border: form.customMonth ? "1.5px solid #4f8ef7" : "1px solid rgba(99,140,255,0.12)",
                      background: form.customMonth ? "rgba(79,142,247,0.1)" : "rgba(255,255,255,0.03)",
                    }} />
                  <span style={{ fontSize:10, color: form.customMonth ? "#4f8ef7" : "var(--text-3)", fontWeight:700 }}>개월</span>
              </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:6 }}>발급 메모 (내부용)</label>
              <input className="input" placeholder="예: 2026년 3월 이벤트 당첨자 쿠폰"
                value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}
                style={{ width:"100%", padding:"8px 10px", fontSize:11 }} />
            </div>

            {/* 미리보기 */}
            <div style={{ padding:"12px 14px", borderRadius:10,
              background:"linear-gradient(135deg,rgba(79,142,247,0.06),rgba(168,85,247,0.04))",
              border:"1px solid rgba(79,142,247,0.2)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#4f8ef7", marginBottom:6 }}>📋 발급 미리보기</div>
              <div style={{ fontSize:11, color:"var(--text-2)", lineHeight:1.8 }}>
                <div>수신자: <strong style={{color: "var(--text-1)"}}>{selUser ? `${selUser.name} (${selUser.email})` : "미선택"}</strong></div>
                <div>플랜: <strong style={{color:"#a855f7"}}>{form.plan}</strong> · 기간: <strong style={{color:"#4f8ef7"}}>{form.duration_days >= 30 ? Math.round(form.duration_days/30)+"개월" : form.duration_days+"일"} ({form.duration_days}일)</strong></div>
                <div>코드: <code style={{fontFamily:"monospace",color:"#f59e0b",fontSize:10}}>GENIE-FREE-XXXXXXXX</code> 형식으로 자동 생성</div>
              </div>
            </div>

            <button onClick={handleIssue} disabled={busy||!selUser}
              style={{
                padding:"13px 0", borderRadius:12, border:"none",
                background: selUser ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "rgba(99,140,255,0.1)",
                color: selUser ? "#fff" : "var(--text-3)",
                fontWeight:800, fontSize:14, cursor: selUser?"pointer":"not-allowed",
                boxShadow: selUser ? "0 6px 20px rgba(79,142,247,0.3)" : "none",
              }}>
              {busy ? "⏳ 발급 중..." : "🎁 무료 이용 쿠폰 발급"}
            </button>
          </div>
        </div>
      )}

      {/* ── 에서 List ── */}
      {view==="list" && (
        <div style={{ display:"grid", gap:8 }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 70px 60px 60px 80px 80px 60px auto",
            gap:8, padding:"6px 12px", fontSize:10, fontWeight:700, color:"#7c8fa8",
            background: 'var(--surface)', borderRadius:8 }}>
            <span>코드 / 수신자</span><span>플랜</span><span>기간</span><span>사용</span><span>상태</span><span>발급일</span><span>소진</span><span>관리</span>
          </div>
          {coupons.length===0 && <div style={{textAlign:"center",padding:40,color:"var(--text-3)",fontSize:12}}>발급된 쿠폰이 없습니다</div>}
          {coupons.map(c=>{
            const status = c.is_revoked ? {l:"취소됨",col:"#ef4444"}
              : c.redeemed_at ? {l:"사용됨",col:"#a855f7"}
              : {l:"유효",col:"#22c55e"};
            return (
              <div key={c.id} style={{
                display:"grid", gridTemplateColumns:"2fr 70px 60px 60px 80px 80px 60px auto",
                gap:8, padding:"11px 13px", borderRadius:10, alignItems:"center",
                background: 'var(--surface)', border:`1px solid ${c.is_revoked?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.06)"}`,
              }}>
                <div>
                  <div style={{ fontFamily:"monospace", fontSize:10, color:"#f59e0b", fontWeight:700 }}>{c.code}</div>
                  <div style={{ fontSize:10, color:"#4f8ef7", marginTop:2 }}>{c.issued_to_email||"범용"}</div>
                  {c.note && <div style={{ fontSize:9, color:"var(--text-3)", marginTop:1 }}>{c.note}</div>}
                </div>
                <span style={{ fontSize:10, fontWeight:700, color:"#a855f7" }}>{c.plan}</span>
                <span style={{ fontSize:10, color:"var(--text-2)" }}>{c.duration_days >= 30 ? Math.round(c.duration_days/30)+"개월" : c.duration_days+"일"}</span>
                <span style={{ fontSize:10 }}>{c.use_count}/{c.max_uses}</span>
                <span style={{ fontSize:9, padding:"2px 8px", borderRadius:99, fontWeight:700,
                  background:`${status.col}18`, color:status.col, border:`1px solid ${status.col}33`,
                  textAlign:"center" }}>{status.l}</span>
                <span style={{ fontSize:10, color:"var(--text-3)" }}>{c.created_at?.slice(0,10)}</span>
                <span style={{ fontSize:10, color:c.redeemed_at?"#a855f7":"var(--text-3)" }}>
                  {c.redeemed_at ? "✓" : "-"}
                </span>
                {!c.is_revoked && !c.redeemed_at ? (
                  <button onClick={()=>handleRevoke(c)} style={{
                    fontSize:9, color:"#ef4444", background:"rgba(239,68,68,0.07)",
                    border:"1px solid rgba(239,68,68,0.25)", borderRadius:5,
                    cursor:"pointer", padding:"3px 8px", fontWeight:700,
                  }}>취소</button>
                ) : <span/>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Auto Issue 규칙 Tab ── */}
      {view==="rules" && (
        <div style={{ display:"grid", gap:16 }}>

          {/* 안내 Banner */}
          <div style={{ padding:"14px 18px", borderRadius:12,
            background:"linear-gradient(135deg,rgba(79,142,247,0.06),rgba(168,85,247,0.04))",
            border:"1px solid rgba(79,142,247,0.2)" }}>
            <div style={{ fontWeight:800, fontSize:13, marginBottom:6 }}>⚙️ 자동 쿠폰 발급 규칙 설정</div>
            <div style={{ fontSize:11, color:"var(--text-2)", lineHeight:1.7 }}>
              아래 3가지 이벤트 발생 시 회원에게 자동으로 무료 쿠폰이 발급됩니다.<br/>
              각 규칙을 활성화하고 발급할 플랜과 기간을 설정하세요.
            </div>
          </div>

          {/* 규칙 Card List */}
          {rules.map((rule, idx) => (
            <div key={rule.trigger} className="card card-glass" style={{
              padding:"18px 20px",
              border:`1.5px solid ${rule.is_active ? "rgba(34,197,94,0.3)" : "rgba(99,140,255,0.12)"}`,
              transition:"border-color 200ms",
            }}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:22 }}>{rule.trigger_icon}</span>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color: rule.is_active ? "#22c55e" : "var(--text-1)" }}>
                      {rule.trigger_label}
                    </div>
                    <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>{rule.trigger_desc}</div>
                  </div>
                </div>
                {/* ON/OFF Toggle */}
                <button
                  onClick={() => setRules(prev => prev.map((r,i) => i===idx ? {...r, is_active:!r.is_active} : r))}
                  style={{
                    padding:"7px 18px", borderRadius:99, fontSize:12, fontWeight:800, cursor:"pointer",
                    background: rule.is_active ? "rgba(34,197,94,0.15)" : "rgba(99,140,255,0.08)",
                    border: `1.5px solid ${rule.is_active ? "#22c55e" : "rgba(99,140,255,0.2)"}`,
                    color: rule.is_active ? "#22c55e" : "var(--text-3)",
                    transition:"all 150ms",
                  }}
                >
                  {rule.is_active ? "✓ 활성" : "비활성"}
                </button>
              </div>

              {/* Settings 영역 */}
              <div style={{
                display:"grid", gridTemplateColumns:"1fr 1fr", gap:14,
                opacity: rule.is_active ? 1 : 0.4, pointerEvents: rule.is_active ? "all" : "none",
                transition:"opacity 200ms",
              }}>
                {/* Plan to Issue */}
                <div>
                  <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:8 }}>발급할 플랜</label>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {[
                      {v:"growth", l:"Growth", c:"#22c55e"},
                      {v:"pro",    l:"Pro",    c:"#a855f7"},
                      {v:"enterprise",l:"ENT", c:"#f59e0b"},
                    ].map(p=>(
                      <button key={p.v}
                        onClick={() => setRules(prev => prev.map((r,i) => i===idx ? {...r, plan:p.v} : r))}
                        style={{
                          padding:"5px 12px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer",
                          background: rule.plan===p.v ? `${p.c}1A` : "rgba(255,255,255,0.03)",
                          border:`1px solid ${rule.plan===p.v ? p.c : "rgba(99,140,255,0.12)"}`,
                          color: rule.plan===p.v ? p.c : "var(--text-3)",
                        }}
                      >{p.l}</button>
                    ))}
                  </div>
                </div>

                {/* Issue Period */}
                <div>
                  <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:8 }}>이용 기간</label>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                    {MONTH_OPTS.map(m=>(
                      <button key={m.days}
                        onClick={() => setRules(prev => prev.map((r,i) => i===idx ? {...r, duration_days:m.days, customMonth:""} : r))}
                        style={{
                          padding:"5px 12px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer",
                          background: rule.duration_days===m.days && !rule.customMonth ? "rgba(79,142,247,0.18)" : "rgba(255,255,255,0.03)",
                          border:`1px solid ${rule.duration_days===m.days && !rule.customMonth ? "#4f8ef7" : "rgba(99,140,255,0.12)"}`,
                          color: rule.duration_days===m.days && !rule.customMonth ? "#4f8ef7" : "var(--text-3)",
                        }}
                      >{m.label}</button>
                    ))}
                    <span style={{ fontSize:10, color:"var(--text-3)", margin:"0 2px" }}>또는</span>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <input className="input" type="number" min={1} max={36} placeholder="직접"
                        value={rule.customMonth||""}
                        onChange={e=>{
                          const v = parseInt(e.target.value) || "";
                          setRules(prev => prev.map((r,i) => i===idx ? {...r, customMonth:v, duration_days: v ? v*30 : 30} : r));
                        }}
                        style={{ width:55, padding:"4px 6px", fontSize:11, textAlign:"center",
                          border: rule.customMonth ? "1.5px solid #4f8ef7" : "1px solid rgba(99,140,255,0.12)",
                          background: rule.customMonth ? "rgba(79,142,247,0.1)" : "rgba(255,255,255,0.03)",
                        }} />
                      <span style={{ fontSize:10, color: rule.customMonth ? "#4f8ef7" : "var(--text-3)", fontWeight:700 }}>개월</span>
                  </div>
                  </div>
                </div>

                {/* Note */}
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={{ fontSize:11, color:"var(--text-3)", fontWeight:700, display:"block", marginBottom:6 }}>발급 메모 (쿠폰 메모 필드)</label>
                  <input className="input" value={rule.note}
                    onChange={e => setRules(prev => prev.map((r,i) => i===idx ? {...r, note:e.target.value} : r))}
                    placeholder="예: 신규가입 환영 7일 무료 체험"
                    style={{ width:"100%", padding:"7px 10px", fontSize:11 }} />
                </div>
              </div>

              {/* 규칙 미리보기 */}
              {rule.is_active && (
                <div style={{ marginTop:12, padding:"9px 12px", borderRadius:8,
                  background:"rgba(34,197,94,0.05)", border:"1px solid rgba(34,197,94,0.2)",
                  fontSize:11, color:"var(--text-2)", lineHeight:1.7 }}>
                  ✅ <strong style={{color:"#22c55e"}}>{t('super.aaActive')}</strong> · {rule.trigger_label}에 <strong>{rule.plan}</strong> 플랜 <strong>{rule.duration_days >= 30 ? Math.round(rule.duration_days/30)+"개월" : rule.duration_days+"일"}</strong> 쿠폰(GENIE-FREE-XXXXXX) 자동 발급
                </div>
              )}
            </div>
          ))}

          {/* 대량 Issue / Save Button */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <button
              onClick={async () => {
                setRulesBusy(true);
                try {
                  localStorage.setItem('coupon_auto_rules', JSON.stringify(rules));
                  window.dispatchEvent(new CustomEvent('coupon-rules-saved', { detail: rules }));
                  if (is) {
                    await new Promise(r=>setTimeout(r,800));
                    flash("✓ 자동 발급 규칙이 저장되었습니다");
                  } else {
                    const r = await fetch(`/api/v423/admin/coupon-rules`, {
                      method:"POST", headers:hdrs,
                      body:JSON.stringify({ rules }),
                    });
                    const d = await r.json();
                    if (d.ok) flash("✓ 자동 발급 규칙 저장 완료");
                    else flash(d.error||"저장 실패", false);
                  }
                } finally { setRulesBusy(false); }
              }}
              disabled={rulesBusy}
              style={{
                padding:"11px 28px", borderRadius:12, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#22c55e,#16a34a)",
                color: 'var(--text-1)', fontWeight:800, fontSize:13,
                boxShadow:"0 6px 20px rgba(34,197,94,0.25)",
                opacity: rulesBusy ? 0.7 : 1,
              }}
            >
              {rulesBusy ? "⏳ 저장 중..." : "💾 규칙 저장"}
            </button>

            {/* Active 규칙 기반 일괄 Issue */}
            <button
              onClick={async () => {
                const activeRules = rules.filter(r=>r.is_active);
                if (activeRules.length===0) { flash("활성화된 규칙이 없습니다. 먼저 규칙을 활성화하세요.", false); return; }
                if (!confirm(`현재 활성 규칙(${activeRules.map(r=>r.trigger_label).join(", ")})을 기반으로 대상 회원에게 일괄 쿠폰을 발급하시겠습니까?`)) return;
                setBusy(true);
                try {
                  if (is) {
                    await new Promise(r=>setTimeout(r,1000));
                    const newCoupons = users.slice(0,3).map((u,i) => ({
                      id:_Coups.length+i+1,
                      code:`GENIE-FREE-${Math.random().toString(36).slice(2,10).toUpperCase()}`,
                      plan:activeRules[0].plan, duration_days:activeRules[0].duration_days,
                      max_uses:1, use_count:0, issued_to_email:u.email,
                      note:activeRules[0].note, is_revoked:0, redeemed_at:null,
                      created_at:new Date().toISOString().slice(0,10),
                    }));
                    _Coups = [...newCoupons, ..._Coups];
                    setCoupons(prev => [...newCoupons, ...prev]);
                    flash(`✓ ${newCoupons.length}명에게 쿠폰이 일괄 발급되었습니다`);
                    pushNotification({type:"alert",title:"일괄 쿠폰 발급",body:`${newCoupons.length}명 대상 자동 발급 완료`,link:"/admin"});
                  } else {
                    const r = await fetch(`/api/v423/admin/coupons/batch-issue`, {
                      method:"POST", headers:hdrs,
                      body:JSON.stringify({ rules: activeRules }),
                    });
                    const d = await r.json();
                    if (d.ok) flash(`✓ ${d.issued_count||"??"}건 일괄 발급 완료`);
                    else flash(d.error||"발급 실패", false);
                  }
                } finally { setBusy(false); }
              }}
              disabled={busy}
              style={{
                padding:"11px 28px", borderRadius:12, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#4f8ef7,#6366f1)",
                color: 'var(--text-1)', fontWeight:800, fontSize:13,
                boxShadow:"0 6px 20px rgba(79,142,247,0.25)",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "⏳ 발급 중..." : "🚀 대상 회원 일괄 쿠폰 발급"}
            </button>
          </div>

          {/* 현재 규칙 Summary */}
          <div style={{ padding:"14px 18px", borderRadius:12,
            background: 'var(--surface)', border:"1px solid rgba(99,140,255,0.1)" }}>
            <div style={{ fontWeight:700, fontSize:12, marginBottom:10, color:"var(--text-2)" }}>📋 현재 규칙 요약</div>
            <div style={{ display:"grid", gap:6 }}>
              {rules.map(r=>(
                <div key={r.trigger} style={{
                  display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
                  borderRadius:8, background: 'var(--surface)',
                  border:`1px solid ${r.is_active?"rgba(34,197,94,0.2)":"rgba(99,140,255,0.08)"}`,
                }}>
                  <span>{r.trigger_icon}</span>
                  <span style={{ flex:1, fontSize:12, fontWeight:700, color:r.is_active?"var(--text-1)":"var(--text-3)" }}>{r.trigger_label}</span>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:700,
                    background:r.is_active?"rgba(34,197,94,0.1)":"rgba(99,140,255,0.07)",
                    color:r.is_active?"#22c55e":"var(--text-3)",
                    border:`1px solid ${r.is_active?"rgba(34,197,94,0.25)":"rgba(99,140,255,0.15)"}`,
                  }}>{r.is_active?`${r.plan} · ${r.duration_days >= 30 ? Math.round(r.duration_days/30)+"개월" : r.duration_days+"일"}`:"비활성"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ── 🎨 프로모션 디자인 생성기 ── */}
      {view==="promo" && (
        <PromoDesignTab flash={flash} />
      )}
    </div>
  );
}

'''

res = orig[:idx1] + good + orig[idx2:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(res)

print("Admin.jsx recovered successfully!")
