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
  var BASE = (function () {
    var s = D.currentScript;
    if (!s) { var all = D.getElementsByTagName('script'); s = all[all.length - 1]; }
    var origin = '';
    try { var a = D.createElement('a'); a.href = s.src; origin = a.protocol + '//' + a.host; } catch (e) {}
    return origin || '';
  })();
  var ENDPOINT = BASE + '/api/pixel/collect';
  /* [283차 R2] 스토어프론트 웹푸시 구독(공개) — collect 와 동일한 /pixel/ 접두라 CORS·공개 bypass 를 그대로 상속. */
  var PUSH_CFG_URL = BASE + '/api/pixel/push/config';
  var PUSH_SUB_URL = BASE + '/api/pixel/push/subscribe';

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
    // [281차 P2] UTM 라스트터치도 클릭ID 와 동일하게 ATTR_TTL(90일) 만료 적용. 종전엔 _gnr_utm_ts 를
    //   쓰기만 하고 안 읽어(dead write) UTM 이 무기한 붙어, 2년 전 캠페인으로 들어온 방문자의 모든 이벤트에
    //   utm_source=meta 가 영구 귀속됐다(만료 캠페인 과대귀속). ts 초과 시 UTM 을 버린다.
    var utmTs = parseInt(get('_gnr_utm_ts') || '0', 10);
    if (utmTs && (now - utmTs) < ATTR_TTL) {
      for (var i = 0; i < UTMS.length; i++) { var u = get('_gnr_' + UTMS[i]); if (u) out[UTMS[i]] = u; }
    }

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

  /* ── [283차 R2] 웹푸시 구독 (opt-in — 고객사가 명시 호출할 때만 권한 요청) ──────
   *
   * ★왜 필요한가: 종전 유일한 구독 경로는 대시보드 로그인 사용자용(/v426/push/subscribe, requirePro)이라
   *   고객사 **상점 방문자(진짜 소비자)** 가 구독할 길이 없었다 → push_subscription.customer_id 가 전부 0 →
   *   행별 동의 게이트·빈도캡·저니 푸시 노드가 전부 미실행. 이 API 가 그 정문을 연다.
   *
   * ★서비스워커는 same-origin 만 등록 가능하다 — 우리 도메인의 push-sw.js 를 고객사 사이트에 등록할 수 없다.
   *   따라서 고객사가 자기 도메인 루트에 push-sw.js(푸시 표시 전용, fetch 핸들러 없음)를 올려야 하며,
   *   그 경로를 swPath 로 넘긴다(기본 '/push-sw.js'). 등록 실패 시 조용히 false — 가짜 성공 금지.
   *
   * 사용:  genie('pushSubscribe', { swPath: '/push-sw.js' })   // 반드시 사용자 클릭 핸들러 안에서 호출
   *        (구독 전 GeniePixel.identify({email}) 를 호출해 두면 서버가 CRM 고객에 결속 = 개인 타겟팅/수신거부 적용)
   */
  function pushSubscribe(opts) {
    opts = opts || {};
    var swPath = opts.swPath || '/push-sw.js';
    var fail = function () { return (W.Promise ? W.Promise.resolve(false) : false); };
    if (optedOut()) return fail();
    if (!W.Promise || !W.fetch) return fail();
    if (!('serviceWorker' in W.navigator) || !('PushManager' in W) || !('Notification' in W)) return fail();

    return W.fetch(PUSH_CFG_URL + '?pixel_id=' + encodeURIComponent(PID), { mode: 'cors', credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (!cfg || !cfg.enabled || !cfg.public_key) return false;   // 서버 VAPID 미설정 → no-op(정직)
        return W.Notification.requestPermission().then(function (perm) {
          if (perm !== 'granted') return false;                      // 거부 = 조용히 종료(재요청 스팸 금지)
          return W.navigator.serviceWorker.register(swPath)
            .then(function () { return W.navigator.serviceWorker.ready; })
            .then(function (reg) {
              return reg.pushManager.getSubscription().then(function (sub) {
                if (sub) return sub;
                return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(cfg.public_key) });
              });
            })
            .then(function (sub) {
              var j = sub.toJSON();
              // 신원(identify 규약)을 동봉 — 서버가 crm_customers 로 해상(미매칭이면 익명 구독으로 정직 저장).
              var body = JSON.stringify({
                pixel_id: PID, endpoint: j.endpoint, keys: j.keys || {},
                email: opts.email || get('_gnr_em') || '', phone: opts.phone || get('_gnr_ph') || ''
              });
              // CORS-simple(text/plain) — 프리플라이트 없음(collect 와 동일 규약).
              return W.fetch(PUSH_SUB_URL, {
                method: 'POST', body: body, mode: 'cors', credentials: 'omit',
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
              }).then(function (r) { return r.json(); }).then(function (d) { return !!(d && d.ok); });
            });
        });
      })['catch'](function () { return false; });
  }

  /* base64url(VAPID 공개키) → Uint8Array(applicationServerKey 규약). */
  function urlB64ToUint8(b64) {
    var s = String(b64).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';   // ES5 안전(String.repeat 미사용 — 이 파일의 무의존 규약 유지)
    var raw = W.atob(s), arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  /* ── 스니펫이 쌓아둔 큐 배수 + 실 구현으로 교체 ──────────────────────────── */
  captureAttribution();
  var queued = (G.q && G.q.slice) ? G.q.slice(0) : [];
  G.track = track;
  G.pushSubscribe = pushSubscribe;
  /* [283차 R2] 큐/스니펫 호출 디스패치 — 'pushSubscribe' 는 이벤트가 아니라 명령이다.
     (종전엔 track() 으로 흘러 서버 화이트리스트에서 'custom' 이벤트로 오인 기록됐을 것 — 무해하나 무의미.) */
  function dispatch(a) {
    if (!a) return;
    if (a[0] === 'pushSubscribe') { try { pushSubscribe(a[1]); } catch (e) {} return; }
    /* [283차 R2 P0] 'identify' 도 이벤트가 아니라 명령이다.
       스니펫 stub 이 identify 를 정의하지 않아, 고객사 주문완료 페이지의
       `GeniePixel.identify({email}); GeniePixel.track('purchase',…)` 가 콜드캐시(=첫 구매자)에서
       TypeError 로 죽고 **purchase 비콘이 통째로 유실**됐다(아이덴티티·CAPI·CRM동기화 동반 사망).
       큐는 순서대로 소비되므로 identify 가 뒤따르는 purchase 보다 먼저 적용된다. */
    if (a[0] === 'identify') { try { G.identify(a[1]); } catch (e) {} return; }
    track(a[0], a[1]);
  }
  G.q = { push: function (a) { dispatch(a); } };   // 늦게 로드된 스니펫 호출도 흡수
  for (var i = 0; i < queued.length; i++) {
    try { dispatch(queued[i]); } catch (e) {}
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
