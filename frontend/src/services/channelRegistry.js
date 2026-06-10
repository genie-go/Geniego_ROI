/**
 * channelRegistry.js — 통합 채널 레지스트리 SSOT 소비 서비스 (212차 #4)
 *
 * 백엔드 GET /api/v426/channels (ChannelRegistry::listChannels) 의 전역 채널 카탈로그를
 * 한 번 로드해 모듈 캐시로 공유한다. ApiKeys/OmniChannel/AdChannelConnect/ConnectorSync 등
 * 그동안 각자 하드코딩하던 채널 목록을 이 SSOT 로 additive merge 한다.
 *
 * ★ 안전: 하드코딩 베이스를 제거하지 않고 "레지스트리에만 있는 신규 채널"을 추가만 한다.
 *   레지스트리 fetch 실패 시 빈 결과를 반환 → 소비처는 기존 하드코딩 목록 그대로 동작(회귀 0).
 *
 * 응답 채널 스키마: { channel_key, name, group_type, icon, color, fields[], sync_kind, is_active, display_order }
 *   group_type: sales | marketing | logistics | pg | messaging
 *   sync_kind : commerce | ad | messaging | none
 */
import { getJsonAuth } from './apiClient.js';

let _cache = null;     // { channels: [...], fields: {channel_key: [...]} }
let _promise = null;

const EMPTY = { channels: [], fields: {} };

/** 레지스트리 로드(캐시·중복요청 합치기). 항상 resolve(실패 시 빈 결과). */
export function loadChannelRegistry() {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;
  _promise = getJsonAuth('/api/v426/channels')
    .then((r) => {
      if (!r?.ok || !Array.isArray(r.channels)) { _promise = null; return EMPTY; }
      const fields = {};
      for (const c of r.channels) {
        if (Array.isArray(c.fields) && c.fields.length) fields[c.channel_key] = c.fields;
      }
      _cache = { channels: r.channels, fields };
      return _cache;
    })
    .catch(() => { _promise = null; return EMPTY; });
  return _promise;
}

/** 캐시 무효화(admin 이 채널 추가/수정 후 재로드용). */
export function invalidateChannelRegistry() { _cache = null; _promise = null; }

/** sync_kind 필터(문자열 또는 배열). 미지정 시 전체. 활성 채널만. */
export function registryBySyncKind(reg, kinds) {
  const list = reg?.channels || [];
  if (!kinds) return list;
  const set = new Set(Array.isArray(kinds) ? kinds : [kinds]);
  return list.filter((c) => set.has(c.sync_kind));
}

/**
 * 하드코딩 베이스에 레지스트리 신규 채널을 additive merge.
 * @param base       하드코딩 채널 배열
 * @param baseKeyOf  base 항목 → 키 추출 함수(기본 c.key)
 * @param reg        loadChannelRegistry() 결과
 * @param mapEntry   레지스트리 채널 → base 형식으로 변환하는 함수
 * @param kinds      포함할 sync_kind 필터(선택)
 * @returns          [...base, ...신규 레지스트리 채널]
 */
export function mergeRegistry(base, baseKeyOf, reg, mapEntry, kinds) {
  const have = new Set((base || []).map(baseKeyOf));
  const extra = [];
  for (const c of registryBySyncKind(reg, kinds)) {
    if (!have.has(c.channel_key)) extra.push(mapEntry(c));
  }
  return [...(base || []), ...extra];
}
