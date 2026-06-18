/**
 * pmApi.js — PM 초엔터프라이즈(231차) 엔드포인트 클라이언트.
 * 기존 PM 페이지의 fetch 패턴(Bearer genie_token, /api/v425/pm/*) 통일.
 */
import { IS_DEMO } from '../utils/demoEnv';

const base = import.meta.env.VITE_API_BASE || '';
const TOKEN_KEY = IS_DEMO ? 'demo_genie_token' : 'genie_token';
function tok() { return localStorage.getItem(TOKEN_KEY) || ''; }
function hdr(json) { const t = tok(); return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) }; }

async function req(method, path, body) {
  const res = await fetch(`${base}/api/v425/pm${path}`, { method, headers: hdr(body !== undefined), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  let j = {}; try { j = await res.json(); } catch { /* */ }
  if (!res.ok) { const e = new Error(j?.error || `HTTP ${res.status}`); e.status = res.status; throw e; }
  return j;
}

// 포트폴리오
export const listPortfolios = () => req('GET', '/portfolios');
export const createPortfolio = (b) => req('POST', '/portfolios', b);
export const patchPortfolio = (id, b) => req('PATCH', `/portfolios/${encodeURIComponent(id)}`, b);
export const deletePortfolio = (id) => req('DELETE', `/portfolios/${encodeURIComponent(id)}`);
export const attachProject = (id, b) => req('POST', `/portfolios/${encodeURIComponent(id)}/attach`, b);
export const portfolioRollup = (id) => req('GET', `/portfolios/${encodeURIComponent(id)}/rollup`);
// EVM / 베이스라인
export const projectEvm = (id) => req('GET', `/projects/${encodeURIComponent(id)}/evm`);
export const listBaselines = (id) => req('GET', `/projects/${encodeURIComponent(id)}/baselines`);
export const createBaseline = (id, b) => req('POST', `/projects/${encodeURIComponent(id)}/baselines`, b);
// RAID
export const listRaid = (q = {}) => req('GET', `/raid${q.project_id ? `?project_id=${encodeURIComponent(q.project_id)}` : ''}`);
export const createRaid = (b) => req('POST', '/raid', b);
export const patchRaid = (id, b) => req('PATCH', `/raid/${encodeURIComponent(id)}`, b);
export const deleteRaid = (id) => req('DELETE', `/raid/${encodeURIComponent(id)}`);
// 타임시트
export const listTime = (q = {}) => req('GET', `/time${q.project_id ? `?project_id=${encodeURIComponent(q.project_id)}` : ''}`);
export const createTime = (b) => req('POST', '/time', b);
export const deleteTime = (id) => req('DELETE', `/time/${encodeURIComponent(id)}`);
// 리소스
export const resourceCapacity = () => req('GET', '/resources');
// 프로젝트(포트폴리오 배정 드롭다운용)
export const listProjects = () => req('GET', '/projects?limit=200');
