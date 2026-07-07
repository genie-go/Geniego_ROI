/**
 * xlangFetch.js — 전역 fetch 인터셉터: 모든 동일출처 API 요청에 X-Lang 헤더 자동 주입. [270차]
 *
 * 배경: 백엔드 i18n 계층(\Genie\I18n)은 X-Lang 헤더로 서버 생성 문자열(이상감지·컴플라이언스·추천 사유 등)을
 *   현지어화한다. services/apiClient.js 헬퍼는 X-Lang 을 넣지만, 일부 페이지(Audit·AutoCampaignLaunch 등)는
 *   raw fetch() 를 써서 X-Lang 이 빠지고 → 백엔드가 ko 기본값 → 비한국어 UI 에서 한글 누출.
 *   전역 인터셉터로 현재·미래의 모든 raw fetch 까지 일괄 보장(페이지별 수정 불필요).
 *
 * 안전장치: ①동일출처(상대경로/현재host)만 — 외부 도메인은 CORS preflight 유발 회피 위해 제외.
 *   ②이미 X-Lang 있으면 건드리지 않음. ③실패 시 원본 fetch 그대로(무해).
 * 반드시 앱 부팅 최상단에서 import(다른 모듈이 fetch 하기 전).
 */
(() => {
  if (typeof window === 'undefined' || window.__xlangPatched) return;
  const orig = window.fetch;
  if (typeof orig !== 'function') return;
  window.__xlangPatched = true;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const host = (typeof location !== 'undefined' && location.host) || '';
      const isAbsExternal = /^https?:\/\//i.test(url) && !(host && url.includes(host));
      const isSameOrigin = !isAbsExternal && (url.startsWith('/') || url.startsWith('./') || (host && url.includes(host)));
      if (isSameOrigin) {
        const base = (init && init.headers) || (typeof input !== 'string' && input && input.headers) || {};
        const h = new Headers(base);
        if (!h.has('X-Lang')) {
          h.set('X-Lang', localStorage.getItem('genie_roi_lang') || 'ko');
          init = Object.assign({}, init, { headers: h });
        }
      }
    } catch (e) { /* 안전: 원본 그대로 진행 */ }
    return orig.call(this, input, init);
  };
})();
