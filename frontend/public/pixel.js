/* [280차 P0] GeniegoROI 1st-Party Pixel 로더 (standalone, 무의존, ES5 안전).
 *
 * ★ 이 파일은 279차까지 "부재"였다 — getSnippet() 이 고객사에 <script src="{base}/pixel.js"> 를 배포해 왔으나
 *   파일이 git 히스토리·디스크·라우트 어디에도 없어 nginx 가 SPA index.html 을 반환(text/html + nosniff)했다.
 *   → 스니펫의 GeniePixel.q 에 이벤트만 쌓이고 POST /pixel/collect 는 한 번도 호출되지 않음.
 *   → 픽셀 이벤트 0 → CAPI 서버전환 7종·attribution_touch(markov)·CRM 구매동기화가 전부 빈 파이프라인 위에 있었다.
 *   이 로더가 그 정문을 연다.
 *
 * 엔드포인트는 반드시 /api 접두(`/api/pixel/collect`) — nginx 는 무접두 /pixel/* 을 정적 location 으로 잡아
 * POST 에 405 를 준다(라이브 실측). 스크립트 src origin 에서 도출한다.
 *
 * 전송은 CORS-simple(text/plain) — 프리플라이트를 만들지 않아 고객사 임의 도메인에서 차단 없이 나간다.
 * 서버 collect() 는 원시 바디 JSON 폴백으로 이를 파싱한다. 이탈 직전 purchase 는 sendBeacon 이 보장.
 */
(function () {
  'use strict';
  var W = window, D = document;
  var G = W.GeniePixel = W.GeniePixel || {};
  if (G.__loaded) return;           // 중복 삽입 방어(고객사가 스니펫을 2회 붙이는 사고 흔함)
  G.__loaded = true;

  var PID = G.pixelId || '';
  if (!PID) return;                 // 스니펫이 pixelId 를 안 심었으면 조용히 no-op

  /* ── 수집 엔드포인트: 이 스크립트를 내려준 오리진 + /api 접두 ───────────────── */
  var ENDPOINT = (function () {
    var s = D.currentScript;
    if (!s) { var all = D.getElementsByTagName('script'); s = all[all.length - 1]; }
    var origin = '';
    try { var a = D.createElement('a'); a.href = s.src; origin = a.protocol + '//' + a.host; } catch (e) {}
    return (origin || '') + '/api/pixel/collect';
  })();

  /* ── 저장소 (localStorage 불가 환경=프라이빗모드·쿠키차단 → 메모리 폴백) ───── */
  var mem = {};
  function get(k) { try { var v = W.localStorage.getItem(k); return v === null ? (k in mem ? mem[k] : null) : v; } catch (e) { return k in mem ? mem[k] : null; } }
  function set(k, v) { try { W.localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  function del(k) { try { W.localStorage.removeItem(k); } catch (e) {} delete mem[k]; }
  function cookie(name) {
    var m = D.cookie.match('(^|;)\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m[2]) : null;
  }

  /* ── 옵트아웃 (DNT/GPC 존중 + 명시 API) ─────────────────────────────────── */
  function optedOut() {
    if (get('_gnr_optout') === '1') return true;
    try { if (W.navigator && (W.navigator.globalPrivacyControl === true)) return true; } catch (e) {}
    return false;
  }
  G.optOut = function () { set('_gnr_optout', '1'); };
  G.optIn = function () { del('_gnr_optout'); };

  /* ── 세션 (30분 롤링) ─────────────────────────────────────────────────── */
  var SESSION_MS = 30 * 60 * 1000;
  function rnd(n) {
    var s = '', c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * c.length));
    return s;
  }
  function sessionId() {
    var now = Date.now();
    var sid = get('_gnr_sid'), last = parseInt(get('_gnr_sts') || '0', 10);
    if (!sid || !last || (now - last) > SESSION_MS) { sid = 's' + now.toString(36) + rnd(8); }
    set('_gnr_sid', sid); set('_gnr_sts', String(now));
    return sid;
  }

  /* ── 클릭ID·UTM 캡처 (매체 어트리뷰션 신호. URL 에 1회 등장 후 사라지므로 영속) ─ */
  var CLICK_IDS = {          // URL 파라미터 → 서버 필드
    fbclid: 'fbclid', ttclid: 'ttclid', gclid: 'gclid', wbraid: 'wbraid', gbraid: 'gbraid',
    rdt_cid: 'rdt_cid', epik: 'epik', ScCid: 'sc_cid', li_fat_id: 'li_fat_id', msclkid: 'msclkid'
  };
  var UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var ATTR_TTL = 90 * 24 * 3600 * 1000; // 90일(매체 표준 어트리뷰션 윈도우 상한)

  function qs() {
    var out = {}, q = W.location.search;
    if (!q || q.length < 2) return out;
    var parts = q.substring(1).split('&');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      if (!kv[0]) continue;
      try { out[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); } catch (e) {}
    }
    return out;
  }

  function captureAttribution() {
    var p = qs(), now = Date.now(), k;
    for (k in CLICK_IDS) {
      if (!CLICK_IDS.hasOwnProperty(k)) continue;
      if (p[k]) { set('_gnr_cid_' + CLICK_IDS[k], p[k]); set('_gnr_cid_' + CLICK_IDS[k] + '_ts', String(now)); }
    }
    // UTM 은 라스트터치가 광고비 귀속의 기준(서버 attribution_touch 와 동일 규약)
    var hasUtm = false;
    for (var i = 0; i < UTMS.length; i++) if (p[UTMS[i]]) hasUtm = true;
    if (hasUtm) {
      for (var j = 0; j < UTMS.length; j++) set('_gnr_' + UTMS[j], p[UTMS[j]] || '');
      set('_gnr_utm_ts', String(now));
    }
  }

  function attribution() {
    var out = {}, now = Date.now(), k;
    for (k in CLICK_IDS) {
      if (!CLICK_IDS.hasOwnProperty(k)) continue;
      var f = CLICK_IDS[k], v = get('_gnr_cid_' + f), ts = parseInt(get('_gnr_cid_' + f + '_ts') || '0', 10);
      if (v && ts && (now - ts) < ATTR_TTL) out[f] = v;
    }
    for (var i = 0; i < UTMS.length; i++) { var u = get('_gnr_' + UTMS[i]); if (u) out[UTMS[i]] = u; }

    // 매체 네이티브 쿠키(브라우저 픽셀이 심어둔 것) — 서버전환 매칭품질 직결
    var fbp = cookie('_fbp'); if (fbp) out.fbp = fbp;
    var fbc = cookie('_fbc');
    if (!fbc && out.fbclid) {                       // _fbc 쿠키 부재 시 Meta 규약대로 합성
      var fts = parseInt(get('_gnr_cid_fbclid_ts') || '0', 10) || now;
      fbc = 'fb.1.' + fts + '.' + out.fbclid;
    }
    if (fbc) out.fbc = fbc;
    var rdt = cookie('_rdt_uuid'); if (rdt) out.rdt_uuid = rdt;
    var ga = cookie('_ga'); if (ga) out.ga_client_id = ga.replace(/^GA\d+\.\d+\./, '');
    return out;
  }

  /* ── 신원 (identify) — 서버가 sha256 해싱(평문 저장 안 함, collect() 규약) ──── */
  G.identify = function (traits) {
    if (!traits) return;
    if (traits.email) set('_gnr_em', String(traits.email).toLowerCase().trim());
    if (traits.phone) set('_gnr_ph', String(traits.phone));
    if (traits.user_id) set('_gnr_uid', String(traits.user_id));
  };
  G.reset = function () { del('_gnr_em'); del('_gnr_ph'); del('_gnr_uid'); del('_gnr_sid'); del('_gnr_sts'); };

  /* ── 전송: CORS-simple(text/plain) → 프리플라이트 없음 → 임의 고객 도메인 통과 ── */
  function send(payload) {
    var body = JSON.stringify(payload);
    try {
      if (W.navigator && W.navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
        if (W.navigator.sendBeacon(ENDPOINT, blob)) return;   // 이탈 직전 purchase 보장
      }
    } catch (e) {}
    try {
      if (W.fetch) {
        W.fetch(ENDPOINT, {
          method: 'POST', body: body, keepalive: true, mode: 'cors', credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
        })['catch'](function () {});
        return;
      }
    } catch (e) {}
    try {                                                     // 구형 브라우저 최후 폴백
      var x = new XMLHttpRequest();
      x.open('POST', ENDPOINT, true);
      x.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
      x.send(body);
    } catch (e) {}
  }

  /* ── 이벤트 ID (서버 dedup 정규식 ^[A-Za-z0-9._-]{8,64}$ 정합) ────────────── */
  function eventId() { return 'e' + Date.now().toString(36) + rnd(12); }

  /* ── track ─────────────────────────────────────────────────────────────── */
  function track(name, data) {
    if (optedOut()) return;
    data = data || {};
    var attr = attribution();
    var payload = {
      pixel_id: PID,
      event_name: String(name || 'page_view'),
      event_id: data.event_id || eventId(),
      session_id: sessionId(),
      page_url: (W.location && W.location.href) ? W.location.href.substring(0, 500) : '',
      referrer: D.referrer ? D.referrer.substring(0, 500) : '',
      user_agent: W.navigator ? W.navigator.userAgent : '',
      value: data.value != null ? data.value : 0,
      currency: data.currency || 'KRW',
      product_ids: data.product_ids || [],
      email: data.email || get('_gnr_em') || '',
      phone: data.phone || get('_gnr_ph') || '',
      user_id: data.user_id || get('_gnr_uid') || '',
      item_count: data.item_count != null ? data.item_count : undefined,
      custom_data: data.custom_data || {}
    };
    for (var k in attr) if (attr.hasOwnProperty(k) && payload[k] === undefined) payload[k] = attr[k];
    // 호출자가 명시한 utm_* 는 저장된 라스트터치보다 우선
    for (var d in data) if (data.hasOwnProperty(d) && payload[d] === undefined) payload[d] = data[d];
    send(payload);
  }

  /* ── 스니펫이 쌓아둔 큐 배수 + 실 구현으로 교체 ──────────────────────────── */
  captureAttribution();
  var queued = (G.q && G.q.slice) ? G.q.slice(0) : [];
  G.track = track;
  G.q = { push: function (a) { track(a[0], a[1]); } };   // 늦게 로드된 스니펫 호출도 흡수
  for (var i = 0; i < queued.length; i++) {
    try { track(queued[i][0], queued[i][1]); } catch (e) {}
  }

  /* ── SPA 라우트 변경 자동 page_view (고객사 다수가 React/Vue 상점) ─────────── */
  var lastUrl = W.location.href;
  function onNav() {
    if (W.location.href === lastUrl) return;
    lastUrl = W.location.href;
    captureAttribution();          // 새 URL 의 클릭ID/UTM 도 캡처
    track('page_view', {});
  }
  try {
    var H = W.history;
    ['pushState', 'replaceState'].forEach(function (m) {
      var orig = H[m];
      if (typeof orig !== 'function') return;
      H[m] = function () { var r = orig.apply(this, arguments); try { setTimeout(onNav, 0); } catch (e) {} return r; };
    });
    W.addEventListener('popstate', function () { setTimeout(onNav, 0); });
  } catch (e) {}
})();
