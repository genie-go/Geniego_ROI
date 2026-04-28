from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models import AuditLog
from app.security.auth import decode_token

router = APIRouter(tags=["ui"])
security = HTTPBearer()


def require_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return decode_token(creds.credentials)
    except Exception:
        raise HTTPException(401, "Invalid token")


LOGIN_HTML = """<!doctype html>
<html>
<head>
  <meta charset='utf-8'/>
  <meta name='viewport' content='width=device-width, initial-scale=1'/>
  <title>GENIE_ROI Demo Login</title>
  <style>
    body{font-family:Arial, sans-serif; max-width:980px; margin:0 auto; padding:24px;}
    .card{border:1px solid #e5e7eb; border-radius:16px; padding:18px; box-shadow:0 6px 16px rgba(0,0,0,.06)}
    input{width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:10px; margin:6px 0 12px;}
    button{padding:10px 14px; border:0; border-radius:12px; background:#4f46e5; color:#fff; cursor:pointer}
    .row{display:grid; grid-template-columns: 1fr 1fr; gap:16px}
    code{background:#f3f4f6; padding:2px 6px; border-radius:8px}
    .muted{color:#6b7280}
  </style>
</head>
<body>
  <h1>GENIE_ROI V371 Demo</h1>
  <p class='muted'>데모는 <b>회원가입/로그인</b> 후, 가상 샘플 데이터(실전 스키마/실전 기능 흐름 기반)로 체험합니다.</p>

  <div class='row'>
    <div class='card'>
      <h3>1) 회원가입 (Demo Seed 포함)</h3>
      <p class='muted'>가입 시 <code>demo=true</code>로 샘플 데이터가 자동 생성됩니다.</p>
      <input id='r_email' placeholder='email'/>
      <input id='r_pw' placeholder='password' type='password'/>
      <input id='r_tenant' placeholder='tenant_name (예: MyBrand Demo)'/>
      <button onclick='register()'>회원가입 + 데모 데이터 생성</button>
      <pre id='r_out' class='muted'></pre>
    </div>
    <div class='card'>
      <h3>2) 로그인</h3>
      <input id='l_email' placeholder='email'/>
      <input id='l_pw' placeholder='password' type='password'/>
      <button onclick='login()'>로그인</button>
      <pre id='l_out' class='muted'></pre>
      <p class='muted'>로그인 후 <a href='/ui/console' onclick='return goConsole(event)'>운영 콘솔</a>로 이동합니다.</p>
    </div>
  </div>

<script>
async function register(){
  const body={email: r_email.value, password: r_pw.value, tenant_name: r_tenant.value||'Demo Workspace', demo:true};
  const res=await fetch('/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  r_out.textContent=await res.text();
}
async function login(){
  const body={email: l_email.value, password: l_pw.value};
  const res=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const txt=await res.text();
  l_out.textContent=txt;
  if(res.ok){
    const j=JSON.parse(txt);
    localStorage.setItem('genie_token', j.access_token);
  }
}
function goConsole(e){
  e.preventDefault();
  const t=localStorage.getItem('genie_token');
  if(!t){alert('먼저 로그인해 주세요.'); return false;}
  window.location.href='/ui/console';
  return false;
}
</script>
</body>
</html>"""


CONSOLE_HTML = """<!doctype html>
<html>
<head>
  <meta charset='utf-8'/>
  <meta name='viewport' content='width=device-width, initial-scale=1'/>
  <title>GENIE_ROI Ops Console</title>
  <style>
    body{font-family:Arial, sans-serif; max-width:1100px; margin:0 auto; padding:24px;}
    .grid{display:grid; grid-template-columns: 1fr 1fr 1fr; gap:16px}
    .card{border:1px solid #e5e7eb; border-radius:16px; padding:16px; box-shadow:0 6px 16px rgba(0,0,0,.06)}
    .muted{color:#6b7280}
    h1{margin-bottom:4px}
    table{width:100%; border-collapse:collapse;}
    th,td{font-size:13px; padding:8px; border-bottom:1px solid #f1f5f9; text-align:left}
    .pill{display:inline-block; padding:2px 8px; border-radius:999px; background:#f3f4f6; font-size:12px}
    button{padding:8px 12px; border:0; border-radius:12px; background:#111827; color:#fff; cursor:pointer}
  </style>
</head>
<body>
  <h1>운영 콘솔 (V371)</h1>
  <p class='muted'>한 화면에서 <b>롤백</b> / <b>정책 차단</b> / <b>피드 실패 Top</b>을 확인합니다.</p>
  <button onclick='refresh()'>새로고침</button>
  <div class='grid' style='margin-top:16px'>
    <div class='card'>
      <h3>피드 실패 Top</h3>
      <div id='feed'></div>
    </div>
    <div class='card'>
      <h3>정책 위반 차단/마스킹</h3>
      <div id='gov'></div>
    </div>
    <div class='card'>
      <h3>롤백 이벤트</h3>
      <div id='rb'></div>
    </div>
  </div>

<script>
function token(){return localStorage.getItem('genie_token')||''}
async function refresh(){
  const res=await fetch('/ui/ops/summary',{headers:{'Authorization':'Bearer '+token()}});
  if(res.status===401){alert('로그인이 필요합니다. /ui/demo 로 이동해 로그인하세요.'); window.location.href='/ui/demo'; return;}
  const j=await res.json();
  renderTable('feed', j.feed_failures, ['channel','count','top_reason']);
  renderTable('gov', j.governance, ['event','count','top_field']);
  renderTable('rb', j.rollbacks, ['source','count','last_kind']);
}
function renderTable(id, rows, cols){
  const el=document.getElementById(id);
  if(!rows||rows.length===0){el.innerHTML="<p class='muted'>No data</p>"; return;}
  let html='<table><thead><tr>'+cols.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>';
  for(const r of rows){html+='<tr>'+cols.map(c=>`<td>${r[c]??''}</td>`).join('')+'</tr>'}
  html+='</tbody></table>';
  el.innerHTML=html;
}
refresh();
</script>
</body>
</html>"""


@router.get("/ui/demo", response_class=HTMLResponse)
def demo_login_page():
    return HTMLResponse(LOGIN_HTML)


@router.get("/ui/console", response_class=HTMLResponse)
def ops_console_page():
    return HTMLResponse(CONSOLE_HTML)


@router.get("/ui/ops/summary")
def ops_summary(db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])

    # Feed failures
    feed_q = (
        db.query(AuditLog.source.label("channel"), func.count(AuditLog.id).label("count"))
        .filter(AuditLog.tenant_id == tenant_id, AuditLog.event_type == "FEED_SUBMIT_FAILED")
        .group_by(AuditLog.source)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
        .all()
    )
    feed_items = []
    for ch, cnt in feed_q:
        top = (
            db.query(AuditLog.detail)
            .filter(AuditLog.tenant_id == tenant_id, AuditLog.event_type == "FEED_SUBMIT_FAILED", AuditLog.source == ch)
            .order_by(AuditLog.created_at.desc())
            .first()
        )
        feed_items.append({"channel": ch, "count": int(cnt), "top_reason": (top[0] or {}).get("reason", "") if top else ""})

    # Governance
    gov_q = (
        db.query(AuditLog.event_type.label("event"), func.count(AuditLog.id).label("count"))
        .filter(AuditLog.tenant_id == tenant_id, AuditLog.event_type.like("GOVERNANCE_%"))
        .group_by(AuditLog.event_type)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
        .all()
    )
    gov_items = []
    for ev, cnt in gov_q:
        top = (
            db.query(AuditLog.detail)
            .filter(AuditLog.tenant_id == tenant_id, AuditLog.event_type == ev)
            .order_by(AuditLog.created_at.desc())
            .first()
        )
        gov_items.append({"event": ev, "count": int(cnt), "top_field": (top[0] or {}).get("field", "") if top else ""})

    # Rollbacks
    rb_q = (
        db.query(AuditLog.source.label("source"), func.count(AuditLog.id).label("count"))
        .filter(AuditLog.tenant_id == tenant_id, AuditLog.event_type.in_(["SAGA_ROLLBACK_OK", "SAGA_ROLLBACK_FAILED"]))
        .group_by(AuditLog.source)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
        .all()
    )
    rb_items = []
    for src, cnt in rb_q:
        last = (
            db.query(AuditLog.detail)
            .filter(AuditLog.tenant_id == tenant_id, AuditLog.event_type == "SAGA_ROLLBACK_OK", AuditLog.source == src)
            .order_by(AuditLog.created_at.desc())
            .first()
        )
        rb_items.append({"source": src, "count": int(cnt), "last_kind": (last[0] or {}).get("kind", "") if last else ""})

    return {"ok": True, "feed_failures": feed_items, "governance": gov_items, "rollbacks": rb_items}
