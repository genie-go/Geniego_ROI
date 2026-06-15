// ══════════════════════════════════════════════════════════════════════
//  influencerIngest.js — 외부 채널(메타·틱톡·유튜브) 인사이트 수집 프레임워크
//  ──────────────────────────────────────────────────────────────────────
//  현재 인플루언서 stats(views/engagement/adSpend)는 저장값이다. 이 모듈은 각 SNS·광고
//  플랫폼의 OAuth + 인사이트 API 로부터 그 값을 자동 적재(ingest)하기 위한 어댑터 골격이다.
//
//  ★실 연동(실제 API 호출)은 플랫폼별 앱 심사 + OAuth 자격증명 등록 후 활성화된다.
//   자격증명이 없으면 syncChannel() 은 외부를 호출하지 않고 'pending_credentials' 상태를
//   반환한다(안전). 자격증명이 준비되면 백엔드 엔드포인트(아래 endpoint)만 구현하면 된다.
//
//  데이터 흐름:
//   외부 인사이트 응답 → mapInsightToStats(공통 스키마 정규화) → creator.stats 갱신
//   → influencerAttribution.applyAttribution(주문 귀속)과 결합해 ROI/성과 산출.
// ══════════════════════════════════════════════════════════════════════

import { postJson } from './apiClient.js';

// 채널별 ingest 어댑터 정의. scopes/endpoint 는 백엔드 OAuth·수집 구현의 명세.
export const INGEST_ADAPTERS = {
  meta: {
    label: 'Meta (Instagram)',
    // Instagram Graph API: 콘텐츠·인사이트 + 광고비(원본영상 광고/화이트리스트)
    scopes: ['instagram_basic', 'instagram_manage_insights', 'ads_read', 'pages_read_engagement'],
    endpoint: '/api/influencer/ingest/meta',
  },
  tiktok: {
    label: 'TikTok',
    // TikTok for Business / Display API: 영상 통계 + 광고(스파크애드)
    scopes: ['user.info.stats', 'video.list', 'video.insights'],
    endpoint: '/api/influencer/ingest/tiktok',
  },
  youtube: {
    label: 'YouTube',
    // YouTube Data API + Analytics API: 채널·영상 통계
    scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly'],
    endpoint: '/api/influencer/ingest/youtube',
  },
};

/**
 * 외부 인사이트 응답을 내부 공통 stats 스키마로 정규화.
 * 각 플랫폼의 상이한 필드명을 { followers, views, likes, comments, shares, saves, engagement, adSpend } 로 매핑.
 * (실 응답 형태는 플랫폼 문서 기준 골격 — 자격증명 연동 시 필드 검증/보정.)
 */
export function mapInsightToStats(platform, raw) {
  const r = raw || {};
  if (platform === 'meta' || platform === 'instagram') {
    const ins = r.insights || {};
    const reach = Number(ins.reach) || Number(ins.impressions) || 0;
    const interactions = (Number(ins.likes) || 0) + (Number(ins.comments) || 0) + (Number(ins.saved) || 0) + (Number(ins.shares) || 0);
    return {
      followers: Number(r.followers_count) || 0,
      views: Number(ins.impressions) || reach,
      likes: Number(ins.likes) || 0, comments: Number(ins.comments) || 0,
      saves: Number(ins.saved) || 0, shares: Number(ins.shares) || 0,
      engagement: reach > 0 ? interactions / reach : 0,
      adSpend: Number(r.ad_spend) || 0,
    };
  }
  if (platform === 'tiktok') {
    const v = r.video || r.stats || {};
    const views = Number(v.view_count) || 0;
    const interactions = (Number(v.like_count) || 0) + (Number(v.comment_count) || 0) + (Number(v.share_count) || 0);
    return {
      followers: Number(r.follower_count) || 0,
      views, likes: Number(v.like_count) || 0, comments: Number(v.comment_count) || 0,
      shares: Number(v.share_count) || 0, saves: 0,
      engagement: views > 0 ? interactions / views : 0,
      adSpend: Number(r.ad_spend) || 0,
    };
  }
  if (platform === 'youtube') {
    const s = r.statistics || r;
    const views = Number(s.viewCount) || 0;
    const interactions = (Number(s.likeCount) || 0) + (Number(s.commentCount) || 0);
    return {
      followers: Number(s.subscriberCount) || 0,
      views, likes: Number(s.likeCount) || 0, comments: Number(s.commentCount) || 0,
      shares: 0, saves: 0,
      engagement: views > 0 ? interactions / views : 0,
      adSpend: Number(r.ad_spend) || 0,
    };
  }
  return { followers: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 0, adSpend: 0 };
}

/**
 * 채널 동기화 상태 판정(자격증명 연동 여부 + 마지막 동기화).
 * @returns {{ status:'connected'|'pending_credentials'|'never', lastSyncedAt:string|null, label:string }}
 */
export function ingestStatus(identity) {
  const id = identity || {};
  const sync = id.sync || {};
  if (sync.lastSyncedAt) return { status: 'connected', lastSyncedAt: sync.lastSyncedAt, label: 'connected' };
  // verified 채널이지만 아직 인사이트 자격증명 미연동
  return { status: 'pending_credentials', lastSyncedAt: null, label: 'pending_credentials' };
}

/**
 * 실 동기화 트리거(백엔드 OAuth 경유). 자격증명 미설정 시 외부 호출 없이 안전 반환.
 * @returns {Promise<{ok:boolean, status:string, stats?:object, error?:string}>}
 */
export async function syncChannel(platform, creatorId, opts = {}) {
  const adapter = INGEST_ADAPTERS[platform];
  if (!adapter) return { ok: false, status: 'unsupported', error: `unsupported platform: ${platform}` };
  try {
    const res = await postJson(adapter.endpoint, { creatorId, ...opts });
    // 백엔드가 자격증명 미설정을 알리면 그대로 전달(프론트는 안내만)
    if (res && res.pending) return { ok: false, status: 'pending_credentials' };
    if (res && res.ok) {
      return { ok: true, status: 'connected', stats: mapInsightToStats(platform, res.insight || res.data) };
    }
    return { ok: false, status: 'error', error: (res && res.error) || 'sync failed' };
  } catch (e) {
    // 엔드포인트 미구현(자격증명 대기) 등은 치명 오류가 아니라 '미연동'으로 취급
    return { ok: false, status: 'pending_credentials', error: String(e && e.message || e) };
  }
}
