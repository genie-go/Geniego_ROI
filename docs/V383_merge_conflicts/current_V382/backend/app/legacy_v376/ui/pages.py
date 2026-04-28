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
  <h1>GENIE_ROI V374 Demo</h1>
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


RBAC_HTML = """<!doctype html>
<html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/>
<title>RBAC</title>
<style>
body{font-family:ui-sans-serif,system-ui;max-width:1100px;margin:24px auto;padding:0 12px}
.card{border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin:12px 0}
.row{display:flex;gap:12px;flex-wrap:wrap}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#f3f4f6}
button{padding:10px 12px;border:0;border-radius:10px;background:#111827;color:#fff;cursor:pointer}
select,input{padding:10px;border:1px solid #e5e7eb;border-radius:10px}
.small{color:#6b7280;font-size:13px}
.grid{display:grid;grid-template-columns:260px 1fr;gap:16px}
.perms{columns:2;column-gap:24px}
</style></head>
<body>
<h1>RBAC 매트릭스</h1>
<div class='small'>역할(Role)별 권한(Permission)을 설정합니다. 변경은 감사로그에 기록됩니다.</div>
<div class='card'>
  <div class='row'>
    <label>API Base <input id='base' value='' placeholder='예: http://localhost:8000'/></label>
    <label>JWT <input id='jwt' style='min-width:420px' placeholder='로그인 후 토큰을 붙여넣으세요'/></label>
    <button onclick='loadAll()'>불러오기</button>
  </div>
</div>

<div class='grid'>
  <div class='card'>
    <h3>역할 선택</h3>
    <select id='roleSel' style='width:100%' onchange='renderPerms()'></select>
    <div class='small' style='margin-top:8px'>owner는 기본적으로 모든 권한(*)을 가집니다.</div>
  </div>
  <div class='card'>
    <h3>권한 목록</h3>
    <div id='permBox' class='perms'></div>
    <div class='row' style='margin-top:12px'>
      <button onclick='save()'>저장</button>
      <span id='status' class='small'></span>
    </div>
  </div>
</div>

<script>
let roles=[], perms=[], matrix={}
function apiBase(){ const b=document.getElementById('base').value.trim(); return b||'' }
function hdr(){ const t=document.getElementById('jwt').value.trim(); return t? {'Authorization':'Bearer '+t,'Content-Type':'application/json'}:{'Content-Type':'application/json'} }
async function loadAll(){
  const r1=await fetch(apiBase()+'/v372/rbac/roles'); const j1=await r1.json(); roles=j1.roles; perms=j1.permissions;
  const r2=await fetch(apiBase()+'/v372/rbac/matrix',{headers:hdr()}); const j2=await r2.json(); matrix=j2.matrix||{};
  const sel=document.getElementById('roleSel'); sel.innerHTML='';
  roles.forEach(r=>{const o=document.createElement('option'); o.value=r; o.textContent=r; sel.appendChild(o);});
  sel.value=roles.includes('admin')?'admin':roles[0];
  renderPerms();
}
function renderPerms(){
  const role=document.getElementById('roleSel').value;
  const box=document.getElementById('permBox'); box.innerHTML='';
  const set=new Set(matrix[role]||[]);
  perms.forEach(p=>{
    const id='p_'+p.replace(/[:]/g,'_');
    const d=document.createElement('div');
    d.innerHTML = `<label><input type="checkbox" id="${id}" ${set.has(p)?'checked':''}/> <span class="badge">${p}</span></label>`;
    box.appendChild(d);
  });
}
async function save(){
  const role=document.getElementById('roleSel').value;
  matrix[role]=perms.filter(p=>document.getElementById('p_'+p.replace(/[:]/g,'_')).checked);
  const res=await fetch(apiBase()+'/v372/rbac/matrix',{method:'POST',headers:hdr(),body:JSON.stringify({matrix})});
  const st=document.getElementById('status');
  if(res.ok){st.textContent='저장 완료';} else {st.textContent='저장 실패: '+(await res.text());}
}
</script>
</body></html>"""

@router.get("/ui/rbac", response_class=HTMLResponse)
def rbac_page():
    return HTMLResponse(RBAC_HTML)


ONBOARD_HTML = """<!doctype html>
<html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/>
<title>Onboarding Wizard</title>
<style>
body{font-family:ui-sans-serif,system-ui;max-width:1100px;margin:24px auto;padding:0 12px}
.card{border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin:12px 0}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
button{padding:10px 12px;border:0;border-radius:10px;background:#111827;color:#fff;cursor:pointer}
button.secondary{background:#4b5563}
select,input,textarea{padding:10px;border:1px solid #e5e7eb;border-radius:10px}
.small{color:#6b7280;font-size:13px}
pre{white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px}
textarea{width:100%; min-height:140px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
</style></head>
<body>
<h1>채널 온보딩 위저드 (V373)</h1>
<div class='small'>실계정 연결 폼 + 자동 테스트까지 한 화면에서 수행합니다. (체크리스트 + 설정 저장 + 테스트 실행)</div>

<div class='card'>
  <div class='row'>
    <label>API Base <input id='base' value='' placeholder='예: http://localhost:8000'/></label>
    <label style='flex:1'>JWT <input id='jwt' style='width:100%' placeholder='로그인 후 토큰(Access Token)을 붙여넣으세요'/></label>
    <button onclick='init()'>불러오기</button>
  </div>
</div>

<div class='grid'>
  <div class='card'>
    <h3>1) 채널 선택</h3>
    <div class='row'>
      <select id='ch'></select>
      <button class='secondary' onclick='loadChecklist()'>체크리스트</button>
      <button onclick='loadSchema()'>연동 폼 불러오기</button>
    </div>
    <pre id='md' class='small'>채널을 선택하고 체크리스트/연동 폼을 불러오세요.</pre>
  </div>

  <div class='card'>
    <h3>2) 실계정 연결 폼 (config JSON)</h3>
    <div class='small'>아래 JSON을 채우고 저장합니다. (required 필드는 꼭 입력)</div>
    <textarea id='cfg'></textarea>
    <div class='row' style='margin-top:10px'>
      <button onclick='saveConnect()'>설정 저장</button>
      <button class='secondary' onclick='runTests()'>자동 테스트</button>
    </div>
    <pre id='out' class='small'></pre>
  </div>
</div>

<script>
function apiBase(){ const b=document.getElementById('base').value.trim(); return b||''; }
function token(){ return document.getElementById('jwt').value.trim() || localStorage.getItem('genie_token') || ''; }
function hdr(){
  const t=token();
  return {'Content-Type':'application/json', 'Authorization':'Bearer '+t};
}
async function init(){
  const r=await fetch(apiBase()+'/v372/onboarding/channels');
  const j=await r.json();
  const sel=document.getElementById('ch'); sel.innerHTML='';
  j.channels.forEach(c=>{const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o);});
  document.getElementById('out').textContent='채널 목록 로드 완료';
}
async function loadChecklist(){
  const c=document.getElementById('ch').value;
  const r=await fetch(apiBase()+'/v372/onboarding/checklist/'+c);
  const j=await r.json();
  document.getElementById('md').textContent=j.markdown||'';
}
async function loadSchema(){
  const c=document.getElementById('ch').value;
  const r=await fetch(apiBase()+'/v373/onboarding/credential_schema/'+c,{headers:hdr()});
  const j=await r.json();
  document.getElementById('cfg').value=JSON.stringify(j.example||{}, null, 2);
  document.getElementById('out').textContent='required: '+(j.required||[]).join(', ');
}
function readCfg(){
  try{ return JSON.parse(document.getElementById('cfg').value||'{}'); }catch(e){ return null; }
}
async function saveConnect(){
  const c=document.getElementById('ch').value;
  const cfg=readCfg();
  if(!cfg){ alert('config JSON 파싱 실패'); return; }
  const r=await fetch(apiBase()+'/v373/onboarding/connect/'+c,{method:'POST',headers:hdr(),body:JSON.stringify({config:cfg})});
  const txt=await r.text();
  document.getElementById('out').textContent=txt;
}
async function runTests(){
  const c=document.getElementById('ch').value;
  const cfg=readCfg();
  if(!cfg){ alert('config JSON 파싱 실패'); return; }
  const r=await fetch(apiBase()+'/v373/onboarding/test/'+c,{method:'POST',headers:hdr(),body:JSON.stringify({config:cfg})});
  const txt=await r.text();
  document.getElementById('out').textContent=txt;
}
</script>
</body></html>"""

@router.get("/ui/onboarding", response_class=HTMLResponse)
def onboarding_page():
    return HTMLResponse(ONBOARD_HTML)


IAM_HTML = """<!doctype html>
<html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/>
<title>IAM</title>
<style>
body{font-family:ui-sans-serif,system-ui;max-width:1100px;margin:24px auto;padding:0 12px}
.card{border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin:12px 0}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
button{padding:10px 12px;border:0;border-radius:10px;background:#111827;color:#fff;cursor:pointer}
button.secondary{background:#4b5563}
select,input,textarea{padding:10px;border:1px solid #e5e7eb;border-radius:10px}
.small{color:#6b7280;font-size:13px}
table{width:100%;border-collapse:collapse}
th,td{font-size:13px;padding:8px;border-bottom:1px solid #f1f5f9;text-align:left}
pre{white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px}
</style></head>
<body>
<h1>사용자/그룹 관리 (IAM) — V373</h1>
<div class='small'>초대 → 가입(토큰) → 역할/그룹 부여 → 비활성화까지. (RBAC 매트릭스와 함께 사용)</div>

<div class='card'>
  <div class='row'>
    <label>API Base <input id='base' value='' placeholder='예: http://localhost:8000'/></label>
    <label style='flex:1'>JWT <input id='jwt' style='width:100%' placeholder='로그인 토큰을 붙여넣거나 localStorage에 저장된 토큰을 사용'/></label>
    <button onclick='loadAll()'>불러오기</button>
  </div>
</div>

<div class='card'>
  <h3>초대(Invite)</h3>
  <div class='row'>
    <input id='inv_email' placeholder='email'/>
    <select id='inv_role'>
      <option>viewer</option><option>analyst</option><option>legal</option><option>manager</option><option>admin</option><option>owner</option>
    </select>
    <input id='inv_groups' placeholder='group_ids 예: 1,2'/>
    <button onclick='invite()'>초대 생성</button>
  </div>
  <pre id='inv_out' class='small'></pre>
</div>

<div class='card'>
  <h3>그룹(Group)</h3>
  <div class='row'>
    <input id='g_name' placeholder='group name'/>
    <input id='g_role' placeholder='group role (optional)'/>
    <input id='g_perms' placeholder='extra perms (comma) optional'/>
    <button onclick='createGroup()'>그룹 생성</button>
  </div>
  <pre id='g_out' class='small'></pre>
</div>

<div class='card'>
  <h3>사용자 목록</h3>
  <table><thead><tr><th>ID</th><th>Email</th><th>Role</th><th>Active</th><th>Groups</th><th>Actions</th></tr></thead>
  <tbody id='u_body'></tbody></table>
</div>

<script>
function apiBase(){ const b=document.getElementById('base').value.trim(); return b||''; }
function token(){ return document.getElementById('jwt').value.trim() || localStorage.getItem('genie_token') || ''; }
function hdr(){ return {'Content-Type':'application/json','Authorization':'Bearer '+token()}; }
let groups=[];
async function loadAll(){
  const r=await fetch(apiBase()+'/v373/iam/users',{headers:hdr()});
  const j=await r.json();
  groups=j.groups||[];
  const body=document.getElementById('u_body'); body.innerHTML='';
  (j.items||[]).forEach(u=>{
    const tr=document.createElement('tr');
    const gs=(u.group_ids||[]).join(',');
    tr.innerHTML=`<td>${u.id}</td><td>${u.email}</td><td>${u.role}</td>
      <td>${u.is_active}</td><td><input data-uid='${u.id}' value='${gs}' style='width:140px'/></td>
      <td>
        <button class='secondary' onclick='setGroups(${u.id})'>그룹저장</button>
        <button class='secondary' onclick='setActive(${u.id}, ${!u.is_active})'>${u.is_active?'비활성':'활성'}</button>
      </td>`;
    body.appendChild(tr);
  });
}
function readGroups(uid){
  const inp=document.querySelector(`input[data-uid='${uid}']`);
  const v=(inp?inp.value:'').trim();
  if(!v) return [];
  return v.split(',').map(x=>parseInt(x.trim())).filter(x=>!isNaN(x));
}
async function setGroups(uid){
  const gids=readGroups(uid);
  const r=await fetch(apiBase()+`/v373/iam/users/${uid}/set_groups`,{method:'POST',headers:hdr(),body:JSON.stringify({group_ids:gids})});
  alert(await r.text());
}
async function setActive(uid, active){
  const r=await fetch(apiBase()+`/v373/iam/users/${uid}/set_active`,{method:'POST',headers:hdr(),body:JSON.stringify({is_active:active})});
  alert(await r.text());
  loadAll();
}
async function invite(){
  const gids=(inv_groups.value||'').split(',').map(x=>parseInt(x.trim())).filter(x=>!isNaN(x));
  const r=await fetch(apiBase()+'/v373/iam/invite',{method:'POST',headers:hdr(),body:JSON.stringify({email:inv_email.value, role:inv_role.value, group_ids:gids})});
  inv_out.textContent=await r.text();
}
async function createGroup(){
  const perms=(g_perms.value||'').split(',').map(x=>x.trim()).filter(x=>x);
  const r=await fetch(apiBase()+'/v373/iam/groups',{method:'POST',headers:hdr(),body:JSON.stringify({name:g_name.value, role:g_role.value, permissions:perms})});
  g_out.textContent=await r.text();
  loadAll();
}
</script>
</body></html>"""


INVITE_HTML = """<!doctype html>
<html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/>
<title>Accept Invite</title>
<style>
body{font-family:ui-sans-serif,system-ui;max-width:720px;margin:24px auto;padding:0 12px}
.card{border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin:12px 0}
button{padding:10px 12px;border:0;border-radius:10px;background:#111827;color:#fff;cursor:pointer}
input{padding:10px;border:1px solid #e5e7eb;border-radius:10px;width:100%}
.small{color:#6b7280;font-size:13px}
pre{white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px}
</style></head>
<body>
<h1>초대 수락(가입)</h1>
<div class='small'>초대 링크로 들어오면 토큰이 자동 적용됩니다.</div>
<div class='card'>
  <label>Token <input id='tok'/></label>
  <label>Password <input id='pw' type='password'/></label>
  <button onclick='accept()' style='margin-top:10px'>가입 완료</button>
  <pre id='out' class='small'></pre>
</div>
<script>
function apiBase(){ return ''; } // same origin
function getTokenFromQS(){
  const u=new URL(window.location.href);
  return u.searchParams.get('token')||'';
}
tok.value=getTokenFromQS();
async function accept(){
  const r=await fetch('/v373/iam/accept',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:tok.value,password:pw.value})});
  out.textContent=await r.text();
}
</script>
</body></html>"""

@router.get("/ui/iam", response_class=HTMLResponse)
def iam_page():
    return HTMLResponse(IAM_HTML)

@router.get("/ui/invite", response_class=HTMLResponse)
def invite_page():
    return HTMLResponse(INVITE_HTML)
