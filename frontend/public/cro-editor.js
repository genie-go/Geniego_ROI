/* [257차] GeniegoROI 온사이트 CRO 비주얼 WYSIWYG 오버레이 에디터 (standalone).
 * 머천트 라이브 사이트에서 북마클릿으로 주입 → 요소를 시각적으로 선택·편집 → 변형B 체인지셋을 GeniegoROI에 저장.
 * 저장 스키마는 lib/onsiteCro.js applyChanges 와 정합(selector/action:text|html|css|hide|redirect/value/prop).
 * 크로스오리진: 이 스크립트는 roi.genie-go.com 서빙, edit-save 는 CORS + 단기 edit-token 인증.
 */
(function () {
  if (window.__GENIE_CRO_EDITOR__) { alert('GenieGo CRO 에디터가 이미 실행 중입니다.'); return; }
  window.__GENIE_CRO_EDITOR__ = true;

  // ── 파라미터(스크립트 src 쿼리) ──
  var cur = document.currentScript || document.querySelector('script[data-genie-cro]');
  var qs = {};
  try { new URL(cur.src).searchParams.forEach(function (v, k) { qs[k] = v; }); } catch (e) {}
  var TOKEN = qs.t || '', EXP = qs.exp || '', API = (qs.api || '').replace(/\/$/, '');
  if (!TOKEN || !API) { alert('CRO 에디터: 편집 토큰이 없습니다. GeniegoROI에서 다시 실행하세요.'); return; }

  var changes = [];
  var picking = false;
  var EDITOR_ID = '__genie_cro_ui__';

  // ── 견고한 CSS 선택자 생성 ──
  function cssPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) return '#' + el.id;
    var parts = [];
    while (el && el.nodeType === 1 && el.tagName.toLowerCase() !== 'html') {
      var sel = el.tagName.toLowerCase();
      if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) { parts.unshift('#' + el.id); break; }
      var cls = (el.className && typeof el.className === 'string')
        ? el.className.trim().split(/\s+/).filter(function (c) { return c && !/genie/i.test(c) && /^[a-zA-Z][\w-]*$/.test(c); }).slice(0, 2) : [];
      if (cls.length) sel += '.' + cls.join('.');
      var par = el.parentNode;
      if (par) {
        var sibs = Array.prototype.filter.call(par.children, function (c) { return c.tagName === el.tagName; });
        if (sibs.length > 1) sel += ':nth-of-type(' + (Array.prototype.indexOf.call(sibs, el) + 1) + ')';
      }
      parts.unshift(sel);
      if (document.querySelectorAll(parts.join(' > ')).length === 1) break;
      el = par;
    }
    return parts.join(' > ');
  }

  function inUI(el) { var u = document.getElementById(EDITOR_ID); return u && (el === u || u.contains(el)); }

  // ── 하이라이트 오버레이 ──
  var hl = document.createElement('div');
  hl.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #22c55e;background:rgba(34,197,94,0.12);display:none;border-radius:3px;transition:all .05s';
  document.body.appendChild(hl);
  function moveHl(el) {
    var r = el.getBoundingClientRect();
    hl.style.display = 'block'; hl.style.left = r.left + 'px'; hl.style.top = r.top + 'px';
    hl.style.width = r.width + 'px'; hl.style.height = r.height + 'px';
  }

  function onOver(e) { if (!picking) return; if (inUI(e.target)) { hl.style.display = 'none'; return; } moveHl(e.target); }
  function onClick(e) {
    if (!picking) return; if (inUI(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    var el = e.target, sel = cssPath(el);
    picking = false; hl.style.display = 'none'; setPickBtn();
    openActionPanel(el, sel);
  }
  document.addEventListener('mouseover', onOver, true);
  document.addEventListener('click', onClick, true);

  // ── UI ──
  var ui = document.createElement('div');
  ui.id = EDITOR_ID;
  ui.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;width:320px;background:#0f172a;color:#e2e8f0;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden';
  ui.innerHTML =
    '<div style="padding:12px 14px;background:linear-gradient(135deg,#22c55e,#4f8ef7);font-weight:800;display:flex;justify-content:space-between;align-items:center">'
    + '<span>🎨 GenieGo CRO 에디터</span><span id="__gc_close" style="cursor:pointer;font-size:16px">✕</span></div>'
    + '<div style="padding:12px 14px;display:grid;gap:8px">'
    + '<div style="font-size:11.5;color:#94a3b8">실험 <b style="color:#e2e8f0">' + (EXP || '-') + '</b> · 변형 B 를 편집합니다. 요소를 클릭해 변경을 추가하세요.</div>'
    + '<button id="__gc_pick" style="padding:8px;border:none;border-radius:8px;background:#22c55e;color:#fff;font-weight:800;cursor:pointer">👆 요소 선택 시작</button>'
    + '<div id="__gc_list" style="display:grid;gap:4px;max-height:180px;overflow:auto"></div>'
    + '<div style="display:flex;gap:6px">'
    + '<button id="__gc_save" style="flex:1;padding:8px;border:none;border-radius:8px;background:#4f8ef7;color:#fff;font-weight:800;cursor:pointer">💾 저장(<span id="__gc_cnt">0</span>)</button>'
    + '</div>'
    + '<div id="__gc_msg" style="font-size:11.5;min-height:16px"></div></div>';
  document.body.appendChild(ui);

  function setPickBtn() { var b = document.getElementById('__gc_pick'); b.textContent = picking ? '⏳ 요소를 클릭하세요 (ESC 취소)' : '👆 요소 선택 시작'; b.style.background = picking ? '#d97706' : '#22c55e'; }
  document.getElementById('__gc_pick').onclick = function () { picking = !picking; hl.style.display = 'none'; setPickBtn(); };
  document.getElementById('__gc_close').onclick = function () { cleanup(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && picking) { picking = false; hl.style.display = 'none'; setPickBtn(); } });

  function renderList() {
    var box = document.getElementById('__gc_list'); box.innerHTML = '';
    changes.forEach(function (c, i) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;align-items:center;background:#1e293b;border-radius:6px;padding:4px 8px;font-size:11';
      var label = c.action === 'redirect' ? ('이동→' + c.value) : (c.action + ' · ' + (c.selector || '') + (c.value ? ' = ' + c.value : ''));
      row.innerHTML = '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(label) + '</span>';
      var del = document.createElement('span'); del.textContent = '✕'; del.style.cssText = 'cursor:pointer;color:#f87171';
      del.onclick = function () { changes.splice(i, 1); renderList(); };
      row.appendChild(del); box.appendChild(row);
    });
    document.getElementById('__gc_cnt').textContent = changes.length;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  function openActionPanel(el, sel) {
    var cur = (el.textContent || '').trim().slice(0, 80);
    var act = prompt('변경 유형을 선택하세요:\n1=텍스트  2=숨기기  3=CSS스타일  4=HTML\n\n대상: ' + sel + '\n현재 텍스트: ' + cur, '1');
    if (act === null) return;
    act = act.trim();
    if (act === '2') { changes.push({ selector: sel, action: 'hide' }); }
    else if (act === '3') { var prop = prompt('CSS 속성 (예: color, font-size, background)', 'color'); if (!prop) return; var val = prompt('값 (예: #ff0000, 18px)', ''); if (val === null) return; changes.push({ selector: sel, action: 'css', prop: prop.trim(), value: val }); }
    else if (act === '4') { var html = prompt('새 HTML', el.innerHTML.slice(0, 500)); if (html === null) return; changes.push({ selector: sel, action: 'html', value: html }); }
    else { var txt = prompt('새 텍스트', cur); if (txt === null) return; changes.push({ selector: sel, action: 'text', value: txt }); }
    renderList();
  }

  document.getElementById('__gc_save').onclick = function () {
    var msg = document.getElementById('__gc_msg');
    if (!changes.length) { msg.style.color = '#fbbf24'; msg.textContent = '추가된 변경이 없습니다.'; return; }
    msg.style.color = '#94a3b8'; msg.textContent = '저장 중…';
    fetch(API + '/api/v424/cro/edit-save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, changes: changes })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok) { msg.style.color = '#22c55e'; msg.textContent = '✓ 저장됨 (' + d.saved + '개). 변형 B에 반영되었습니다.'; }
      else { msg.style.color = '#f87171'; msg.textContent = '저장 실패: ' + ((d && d.error) || '토큰 만료/오류'); }
    }).catch(function (e) { msg.style.color = '#f87171'; msg.textContent = '저장 실패(네트워크/CORS): ' + e; });
  };

  function cleanup() {
    document.removeEventListener('mouseover', onOver, true);
    document.removeEventListener('click', onClick, true);
    if (hl.parentNode) hl.parentNode.removeChild(hl);
    if (ui.parentNode) ui.parentNode.removeChild(ui);
    window.__GENIE_CRO_EDITOR__ = false;
  }
})();
