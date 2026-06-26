/**
 * teamApi.js — 팀·권한 관리(231차) API 클라이언트.
 *
 * 백엔드 TeamPermissions(/auth/team/*) 연동. 세션 토큰(genie_token) self-auth.
 * 데모 모드(IS_DEMO)는 백엔드 없이 tenant 스코프 localStorage 로 시뮬레이션(체험=운영 동등).
 *
 * 응답 표준: { success, data, message, error, meta } (+ 레거시 ok). data 만 반환, 실패 시 throw.
 */
import { IS_DEMO } from '../utils/demoEnv';
import { tGetJSON, tSetJSON } from '../utils/tenantStorage.js';

const API = import.meta.env.VITE_API_BASE || '';
const TOKEN_KEY = IS_DEMO ? 'demo_genie_token' : 'genie_token';

/** 권한 매트릭스 메타(서버 MENU_CATALOG 정합 — 데모/폴백용 로컬 사본). */
export const MENU_CATALOG = [
  { key: 'dashboard',             group: 'core',      ko: '대시보드',                en: 'Dashboard' },
  { key: 'ai_command_center',     group: 'core',      ko: 'AI 에이전트 커맨드센터',    en: 'AI Agent Command Center' },
  { key: 'marketing',             group: 'marketing', ko: '마케팅 ROI',              en: 'Marketing ROI' },
  { key: 'campaign',              group: 'marketing', ko: '캠페인',                  en: 'Campaign' },
  { key: 'customer',              group: 'marketing', ko: '고객 관리',               en: 'Customer Management' },
  { key: 'commerce',              group: 'commerce',  ko: '커머스 ROI',              en: 'Commerce ROI' },
  { key: 'product',               group: 'commerce',  ko: '상품 관리',               en: 'Product Management' },
  { key: 'live_commerce',         group: 'commerce',  ko: '라이브 커머스',            en: 'Live Commerce' },
  { key: 'sales_pipeline',        group: 'sales',     ko: '세일즈 파이프라인',         en: 'Sales Pipeline' },
  { key: 'logistics',             group: 'ops',       ko: '물류 ROI',                en: 'Logistics ROI' },
  { key: 'inventory',             group: 'ops',       ko: '재고',                    en: 'Inventory' },
  { key: 'warehouse',             group: 'ops',       ko: '창고',                    en: 'Warehouse' },
  { key: 'delivery',              group: 'ops',       ko: '배송',                    en: 'Delivery' },
  { key: 'returns',               group: 'ops',       ko: '반품',                    en: 'Return' },
  { key: 'finance',               group: 'finance',   ko: '재무',                    en: 'Finance' },
  { key: 'billing',               group: 'finance',   ko: '결제·청구',               en: 'Billing' },
  { key: 'settlement',            group: 'finance',   ko: '정산',                    en: 'Settlement' },
  { key: 'connector_hub',         group: 'data',      ko: '연동 허브',               en: 'Connector Hub' },
  { key: 'supplier_portal',       group: 'partner',   ko: '공급 파트너 포털',          en: 'Supplier Portal' },
  { key: 'distribution_portal',   group: 'partner',   ko: '유통 파트너 포털',          en: 'Distribution Partner Portal' },
  { key: 'team_management',       group: 'admin',     ko: '팀 관리',                 en: 'Team Management' },
  { key: 'member_management',     group: 'admin',     ko: '멤버 관리',               en: 'Member Management' },
  { key: 'permission_management', group: 'admin',     ko: '권한 관리',               en: 'Permission Management' },
  { key: 'audit_log',             group: 'admin',     ko: '감사 로그',               en: 'Audit Log' },
  { key: 'admin_settings',        group: 'admin',     ko: '관리자 설정',             en: 'Admin Settings' },
  { key: 'security_settings',     group: 'admin',     ko: '보안 설정',               en: 'Security Settings' },
];
export const ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'export', 'execute', 'manage'];
export const DATA_SCOPES = ['company', 'brand', 'team', 'campaign', 'product', 'channel', 'warehouse', 'partner', 'own'];
export const TEAM_TYPES = [
  'internal_super', 'brand', 'marketing', 'marketing_global', 'marketing_domestic',
  'sales', 'sales_global', 'sales_domestic', 'sales_enterprise', 'sales_channel',
  'logistics', 'finance',
  'partner_agency', 'partner_live', 'partner_supplier', 'partner_distribution', 'custom',
];
const MENU_KEYS = MENU_CATALOG.map(m => m.key);

/** 'view' 자동 포함 + ACTIONS 순서 정렬 + 부분집합화. */
export function normActions(arr) {
  const set = new Set((arr || []).filter(a => ACTIONS.includes(a)));
  if (!set.size) return [];
  set.add('view');
  return ACTIONS.filter(a => set.has(a));
}
/** cap(상한)에 manage 있으면 전동작 허용. action 포함 여부. */
export function actionsCover(cap, action) {
  return (cap || []).includes('manage') || (cap || []).includes(action);
}

function headers() {
  const t = localStorage.getItem(TOKEN_KEY) || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}
async function call(method, path, body) {
  const r = await fetch(`${API}${path}`, { method, headers: headers(), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  let d = {};
  try { d = await r.json(); } catch { /* non-json */ }
  const okFlag = d.success === true || d.ok === true || r.ok;
  if (!okFlag) {
    const msg = (d.error && (d.error.detail || d.error.code)) || d.message || d.error || `HTTP ${r.status}`;
    const e = new Error(typeof msg === 'string' ? msg : 'Request failed');
    e.status = r.status; e.code = d.error?.code; throw e;
  }
  return d.data !== undefined ? d.data : d;
}

/* ════════════════ 데모 시뮬레이션 (tenant 스코프) ════════════════ */
const D = {
  teams: 'demo_teams_v1',
  members: 'demo_team_members',      // TeamMembers.jsx 와 공유
  perms: 'demo_acl_perms_v1',        // { 'team:1': {menu:[acts]}, 'member:tm_2': {...} }
  scope: 'demo_scope_v1',            // { 'team:1': {scope_type, values}, ... }
};
function dTeams() {
  let v = tGetJSON(D.teams, null);
  if (!v) {
    v = [
      { id: 1, name: '마케팅팀', description: '국내·글로벌 광고 운영', team_type: 'marketing', manager_user_id: 'tm_1', status: 'active', created_at: '2026-02-01' },
      { id: 2, name: '커머스팀', description: '오픈마켓·자사몰 운영', team_type: 'sales', manager_user_id: null, status: 'active', created_at: '2026-03-01' },
    ];
    tSetJSON(D.teams, v);
    // 기존 데모 권한 시드
    const p = {
      'team:1': { dashboard: ['view'], marketing: ['view', 'create', 'update', 'approve', 'export'], campaign: ['view', 'create', 'update'], customer: ['view', 'export'] },
      'team:2': { dashboard: ['view'], commerce: ['view', 'create', 'update', 'export'], product: ['view', 'create', 'update'], settlement: ['view', 'export'] },
    };
    tSetJSON(D.perms, p);
    tSetJSON(D.scope, { 'team:1': { scope_type: 'campaign', values: [] }, 'team:2': { scope_type: 'team', values: [] } });
  }
  return v;
}
function dSaveTeams(v) { tSetJSON(D.teams, v); }
function dPerms() { return tGetJSON(D.perms, {}) || {}; }
function dSavePerms(v) { tSetJSON(D.perms, v); }
function dScope() { return tGetJSON(D.scope, {}) || {}; }
function dSaveScope(v) { tSetJSON(D.scope, v); }
function dMembers() { return tGetJSON(D.members, []) || []; }
function dSaveMembers(v) { tSetJSON(D.members, v); }
function dNextTeamId() { const t = dTeams(); return (t.reduce((m, x) => Math.max(m, +x.id || 0), 0) || 0) + 1; }

/* ════════════════ 공개 API ════════════════ */
export async function getMenuCatalog() {
  if (IS_DEMO) return { menus: MENU_CATALOG, actions: ACTIONS, dataScopes: DATA_SCOPES, teamTypes: TEAM_TYPES };
  try { return await call('GET', '/auth/team/menu-catalog'); }
  catch { return { menus: MENU_CATALOG, actions: ACTIONS, dataScopes: DATA_SCOPES, teamTypes: TEAM_TYPES }; }
}

export async function listTeams() {
  if (IS_DEMO) {
    const teams = dTeams(); const perms = dPerms(); const members = dMembers();
    const out = teams.map(t => {
      const mgr = members.find(m => String(m.id) === String(t.manager_user_id));
      return {
        ...t,
        member_count: members.filter(m => String(m.team_id || '') === String(t.id) && (m.is_active ?? 1)).length,
        permission_count: Object.keys(perms[`team:${t.id}`] || {}).length,
        manager_name: mgr ? (mgr.name || mgr.email) : null,
      };
    });
    return { teams: out, caller_role: 'owner', can_manage: true };
  }
  return call('GET', '/auth/team/teams');
}

export async function createTeam(payload) {
  if (IS_DEMO) {
    const teams = dTeams(); const id = dNextTeamId();
    teams.push({ id, name: payload.name, description: payload.description || '', team_type: payload.team_type || 'custom', manager_user_id: payload.manager_user_id || null, status: 'active', created_at: new Date().toISOString().slice(0, 10) });
    dSaveTeams(teams);
    if (payload.manager_user_id) _demoPromote(payload.manager_user_id, id);
    return { id };
  }
  return call('POST', '/auth/team/teams', payload);
}
export async function updateTeam(id, payload) {
  if (IS_DEMO) {
    const teams = dTeams().map(t => String(t.id) === String(id) ? { ...t, ...payload } : t);
    dSaveTeams(teams);
    if (payload.manager_user_id !== undefined && payload.manager_user_id) _demoPromote(payload.manager_user_id, id);
    return { id };
  }
  return call('PATCH', `/auth/team/teams/${id}`, payload);
}
export async function deleteTeam(id, opts = {}) {
  if (IS_DEMO) {
    if (opts.hard) {
      dSaveTeams(dTeams().filter(t => String(t.id) !== String(id)));
      dSaveMembers(dMembers().map(m => String(m.team_id) === String(id) ? { ...m, team_id: null } : m));
      const p = dPerms(); delete p[`team:${id}`]; dSavePerms(p);
    } else {
      dSaveTeams(dTeams().map(t => String(t.id) === String(id) ? { ...t, status: 'archived' } : t));
    }
    return { id };
  }
  return call('DELETE', `/auth/team/teams/${id}${opts.hard ? '?hard=1' : ''}`);
}
export async function restoreTeam(id) {
  if (IS_DEMO) { dSaveTeams(dTeams().map(t => String(t.id) === String(id) ? { ...t, status: 'active' } : t)); return { id }; }
  return call('POST', `/auth/team/teams/${id}/restore`);
}

export async function getTeamPermissions(id) {
  if (IS_DEMO) {
    const team = dTeams().find(t => String(t.id) === String(id));
    const members = dMembers().filter(m => String(m.team_id || '') === String(id));
    return { team, menus: dPerms()[`team:${id}`] || {}, scope: dScope()[`team:${id}`] || { scope_type: 'team', values: [] }, members };
  }
  return call('GET', `/auth/team/teams/${id}/permissions`);
}
export async function putTeamPermissions(id, body) {
  if (IS_DEMO) {
    const p = dPerms(); p[`team:${id}`] = _normMap(body.menus || {}); dSavePerms(p);
    if (body.scope) { const s = dScope(); s[`team:${id}`] = body.scope; dSaveScope(s); }
    return { id };
  }
  return call('PUT', `/auth/team/teams/${id}/permissions`, body);
}
export async function getMemberPermissions(id) {
  if (IS_DEMO) {
    const members = dMembers(); const m = members.find(x => String(x.id) === String(id));
    const explicit = _normMap(dPerms()[`member:${id}`] || {});
    const teamMap = m && m.team_id ? (dPerms()[`team:${m.team_id}`] || {}) : {};
    const assignable = null; // 데모 호출자=owner → 무제한
    return {
      member: m ? { id: m.id, name: m.name, email: m.email, team_role: m.team_role, team_id: m.team_id || null } : null,
      explicit,
      effective: { full: m && m.team_role === 'owner', menus: explicit, scope: dScope()[`member:${id}`] || { scope_type: 'own', values: [] } },
      scope: dScope()[`member:${id}`] || null,
      assignable,
      _teamCap: _normMap(teamMap),
    };
  }
  return call('GET', `/auth/team/members/${id}/permissions`);
}
export async function putMemberPermissions(id, body) {
  if (IS_DEMO) {
    const p = dPerms(); p[`member:${id}`] = _normMap(body.menus || {}); dSavePerms(p);
    if (body.scope) { const s = dScope(); s[`member:${id}`] = body.scope; dSaveScope(s); }
    return { id };
  }
  return call('PUT', `/auth/team/members/${id}/permissions`, body);
}
export async function getEffectivePermissions() {
  if (IS_DEMO) return { full: true, menus: Object.fromEntries(MENU_KEYS.map(k => [k, ACTIONS])), scope: { scope_type: 'company', values: [] }, role: 'owner' };
  return call('GET', '/auth/team/effective-permissions');
}
export async function getAssignablePermissions() {
  if (IS_DEMO) return { assignable: null, unlimited: true, role: 'owner' };
  return call('GET', '/auth/team/assignable-permissions');
}
/** 표준 조직 구조 일괄 생성 (스펙 내부조직 + 외부 파트너 + 유형별 기본 권한/범위). */
const ORG_PRESET = [
  { name: '브랜드팀', team_type: 'brand', scope: 'brand', perms: { dashboard: ['view'], marketing: ['view', 'export'], commerce: ['view'], product: ['view', 'update'] } },
  { name: '마케팅팀', team_type: 'marketing', scope: 'campaign', perms: { dashboard: ['view'], marketing: ['view', 'create', 'update', 'approve', 'export'], campaign: ['view', 'create', 'update', 'approve'], customer: ['view', 'export'] } },
  { name: '마케팅 글로벌팀', team_type: 'marketing_global', scope: 'campaign', perms: { dashboard: ['view'], marketing: ['view', 'create', 'update', 'export'], campaign: ['view', 'create', 'update'] } },
  { name: '마케팅 국내팀', team_type: 'marketing_domestic', scope: 'campaign', perms: { dashboard: ['view'], marketing: ['view', 'create', 'update', 'export'], campaign: ['view', 'create', 'update'] } },
  { name: '영업팀', team_type: 'sales', scope: 'team', perms: { dashboard: ['view'], sales_pipeline: ['view', 'create', 'update', 'approve'], customer: ['view', 'update'], commerce: ['view'] } },
  { name: '해외영업팀', team_type: 'sales_global', scope: 'own', perms: { dashboard: ['view'], sales_pipeline: ['view', 'create', 'update'], customer: ['view'] } },
  { name: '국내영업팀', team_type: 'sales_domestic', scope: 'own', perms: { dashboard: ['view'], sales_pipeline: ['view', 'create', 'update'], customer: ['view'] } },
  { name: '대기업영업팀', team_type: 'sales_enterprise', scope: 'own', perms: { dashboard: ['view'], sales_pipeline: ['view', 'create', 'update', 'approve'], customer: ['view', 'update'] } },
  { name: '유통/총판영업팀', team_type: 'sales_channel', scope: 'team', perms: { dashboard: ['view'], sales_pipeline: ['view', 'create', 'update'], commerce: ['view'], settlement: ['view'] } },
  { name: '물류팀', team_type: 'logistics', scope: 'warehouse', perms: { dashboard: ['view'], logistics: ['view', 'create', 'update'], inventory: ['view', 'update'], warehouse: ['view', 'create', 'update'], delivery: ['view', 'update'], returns: ['view', 'update', 'approve'] } },
  { name: '재무팀', team_type: 'finance', scope: 'company', perms: { dashboard: ['view'], finance: ['view', 'export', 'approve'], billing: ['view', 'export'], settlement: ['view', 'export', 'approve'] } },
  { name: '외부 대행사', team_type: 'partner_agency', scope: 'campaign', perms: { dashboard: ['view'], marketing: ['view', 'export'], campaign: ['view', 'create', 'update'] } },
  { name: '라이브커머스 파트너', team_type: 'partner_live', scope: 'own', perms: { dashboard: ['view'], live_commerce: ['view', 'create', 'update'], commerce: ['view'] } },
  { name: '공급 파트너', team_type: 'partner_supplier', scope: 'partner', perms: { supplier_portal: ['view', 'create', 'update'], product: ['view'], settlement: ['view'] } },
  { name: '유통 파트너', team_type: 'partner_distribution', scope: 'partner', perms: { distribution_portal: ['view'], commerce: ['view'], product: ['view'], settlement: ['view'] } },
];
export async function seedOrg() {
  if (IS_DEMO) {
    const teams = dTeams(); const perms = dPerms(); const scope = dScope();
    const have = new Set(teams.map(t => t.name));
    const created = [], skipped = [];
    let id = dNextTeamId();
    for (const p of ORG_PRESET) {
      if (have.has(p.name)) { skipped.push(p.name); continue; }
      teams.push({ id, name: p.name, description: '', team_type: p.team_type, manager_user_id: null, status: 'active', created_at: new Date().toISOString().slice(0, 10) });
      perms[`team:${id}`] = _normMap(p.perms);
      scope[`team:${id}`] = { scope_type: p.scope, values: [] };
      created.push(p.name); id++;
    }
    dSaveTeams(teams); dSavePerms(perms); dSaveScope(scope);
    return { created, skipped };
  }
  return call('POST', '/auth/team/teams/seed-org');
}

export async function getTeamAudit() {
  if (IS_DEMO) return { logs: tGetJSON('demo_team_audit_v1', []) || [], count: 0 };
  return call('GET', '/auth/team/audit');
}

function _normMap(map) {
  const out = {};
  for (const k of Object.keys(map || {})) { const a = normActions(map[k]); if (a.length) out[k] = a; }
  return out;
}
function _demoPromote(userId, teamId) {
  dSaveMembers(dMembers().map(m => String(m.id) === String(userId) && m.team_role !== 'owner' ? { ...m, team_role: 'manager', team_id: teamId } : m));
}
