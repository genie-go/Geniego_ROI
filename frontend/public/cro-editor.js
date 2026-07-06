/* [257차→260차] GeniegoROI 온사이트 CRO 비주얼 WYSIWYG 오버레이 에디터 v2 (standalone).
 * 머천트 라이브 사이트에서 북마클릿으로 주입 → 요소를 시각적으로 선택·편집(라이브 프리뷰) → 변형B 체인지셋 저장.
 * 260차 완전 패리티(Optimizely/VWO급): prompt() 제거 → 인라인 액션 패널 · 라이브 프리뷰(즉시 DOM 반영) ·
 *   되돌리기(원복) · 요소 인스펙터(브레드크럼 부모탐색) · 전체 액션(text/html/hide/remove/css/attr/class/insert/img/redirect).
 * 저장 스키마는 lib/onsiteCro.js applyChanges + Onsite.php editSave 화이트리스트와 3자 정합.
 * 크로스오리진: www.genieroi.com 서빙, edit-save 는 CORS + 단기 edit-token 인증.
 */
(function () {
  if (window.__GENIE_CRO_EDITOR__) { alert('GenieGo CRO 에디터가 이미 실행 중입니다.'); return; }
  window.__GENIE_CRO_EDITOR__ = true;

  var cur = document.currentScript || document.querySelector('script[data-genie-cro]');
  var qs = {};
  try { new URL(cur.src).searchParams.forEach(function (v, k) { qs[k] = v; }); } catch (e) {}
  var TOKEN = qs.t || '', EXP = qs.exp || '', API = (qs.api || '').replace(/\/$/, '');
  if (!TOKEN || !API) { alert('CRO 에디터: 편집 토큰이 없습니다. GeniegoROI에서 다시 실행하세요.'); return; }

  var changes = [];        // {selector, action, value?, prop?, _undo, _label}
  var picking = false;
  var selEl = null, selSelector = '';
  var EDITOR_ID = '__genie_cro_ui__';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

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
    picking = false; hl.style.display = 'none'; setPickBtn();
    selectElement(e.target);
  }
  document.addEventListener('mouseover', onOver, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && picking) { picking = false; hl.style.display = 'none'; setPickBtn(); } });

  // ── UI 골격 ──
  var ui = document.createElement('div');
  ui.id = EDITOR_ID;
  ui.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;width:340px;max-height:92vh;overflow:auto;background:#0f172a;color:#e2e8f0;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.45);font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ui.innerHTML =
    '<div style="padding:12px 14px;background:linear-gradient(135deg,#22c55e,#4f8ef7);font-weight:800;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:2">'
    + '<span>🎨 GenieGo CRO 에디터</span><span id="__gc_close" style="cursor:pointer;font-size:16px">✕</span></div>'
    + '<div style="padding:12px 14px;display:grid;gap:10px">'
    + '<div style="font-size:11.5px;color:#94a3b8">실험 <b style="color:#e2e8f0">' + esc(EXP || '-') + '</b> · <b style="color:#22c55e">변형 B</b> 를 편집합니다. 변경은 즉시 미리보기되고, 저장 전까지 원본에 영향 없습니다.</div>'
    + '<button id="__gc_pick" style="padding:9px;border:none;border-radius:8px;background:#22c55e;color:#fff;font-weight:800;cursor:pointer">👆 요소 선택 시작</button>'
    + '<div id="__gc_inspector"></div>'
    + '<div id="__gc_panel"></div>'
    + '<div style="font-size:11px;color:#64748b;border-top:1px solid #1e293b;padding-top:8px">변경 목록 (<span id="__gc_cnt">0</span>)</div>'
    + '<div id="__gc_list" style="display:grid;gap:4px;max-height:180px;overflow:auto"></div>'
    + '<button id="__gc_save" style="padding:10px;border:none;border-radius:8px;background:#4f8ef7;color:#fff;font-weight:800;cursor:pointer">💾 변형 B 저장</button>'
    + '<div id="__gc_msg" style="font-size:11.5px;min-height:16px"></div></div>';
  document.body.appendChild(ui);

  function setPickBtn() { var b = document.getElementById('__gc_pick'); b.textContent = picking ? '⏳ 요소를 클릭하세요 (ESC 취소)' : '👆 요소 선택 시작'; b.style.background = picking ? '#d97706' : '#22c55e'; }
  document.getElementById('__gc_pick').onclick = function () { picking = !picking; hl.style.display = 'none'; setPickBtn(); };
  document.getElementById('__gc_close').onclick = function () { cleanup(); };

  // ── 요소 인스펙터(브레드크럼 부모탐색 + 선택자) ──
  function selectElement(el) {
    selEl = el; selSelector = cssPath(el);
    renderInspector(); renderPanel();
  }
  function renderInspector() {
    var box = document.getElementById('__gc_inspector');
    if (!selEl) { box.innerHTML = ''; return; }
    // 브레드크럼: 현재→부모 3단계
    var chain = [], e = selEl, depth = 0;
    while (e && e.nodeType === 1 && e.tagName.toLowerCase() !== 'html' && depth < 4) { chain.unshift(e); e = e.parentNode; depth++; }
    var crumb = chain.map(function (n, i) {
      var tag = n.tagName.toLowerCase() + (n.id ? '#' + n.id : (n.className && typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/)[0] : ''));
      var isCur = n === selEl;
      return '<span data-gc-crumb="' + i + '" style="cursor:pointer;padding:2px 6px;border-radius:5px;background:' + (isCur ? '#22c55e' : '#1e293b') + ';color:' + (isCur ? '#04210f' : '#94a3b8') + ';font-weight:' + (isCur ? '800' : '600') + '">' + esc(tag) + '</span>';
    }).join('<span style="color:#475569"> ›</span> ');
    box.innerHTML = '<div style="background:#0b1220;border:1px solid #1e293b;border-radius:8px;padding:8px 10px;display:grid;gap:6px">'
      + '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">' + crumb + '</div>'
      + '<input id="__gc_sel" value="' + esc(selSelector) + '" style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:5px 8px;font:11px monospace" />'
      + '<div style="font-size:10.5px;color:#64748b">일치 요소 <b id="__gc_match" style="color:#e2e8f0">' + matchCount(selSelector) + '</b>개 · 셀렉터 직접 수정 가능</div>'
      + '</div>';
    // 브레드크럼 클릭 → 조상 선택
    Array.prototype.forEach.call(box.querySelectorAll('[data-gc-crumb]'), function (sp) {
      sp.onclick = function () { var idx = +sp.getAttribute('data-gc-crumb'); if (chain[idx]) { selEl = chain[idx]; selSelector = cssPath(chain[idx]); moveHl(selEl); setTimeout(function () { hl.style.display = 'none'; }, 600); renderInspector(); renderPanel(); } };
    });
    var si = document.getElementById('__gc_sel');
    si.oninput = function () { selSelector = si.value.trim(); var m = document.getElementById('__gc_match'); if (m) m.textContent = matchCount(selSelector); };
  }
  function matchCount(sel) { try { return sel ? document.querySelectorAll(sel).length : 0; } catch (e) { return '오류'; } }

  // ── 액션 패널(인라인 폼) ──
  var ACTIONS = [
    ['text', '✏️ 텍스트 변경'], ['html', '📝 HTML 변경'], ['css', '🎨 스타일(CSS)'],
    ['attr', '🔧 속성(attribute)'], ['class', '🏷️ 클래스 add/remove'], ['img', '🖼️ 이미지 교체'],
    ['insert', '➕ HTML 삽입'], ['hide', '🙈 숨기기'], ['remove', '🗑️ 제거'], ['redirect', '↪️ 페이지 이동(스플릿)']
  ];
  function renderPanel() {
    var box = document.getElementById('__gc_panel');
    if (!selEl) { box.innerHTML = '<div style="font-size:11.5px;color:#64748b">요소를 선택하면 편집 옵션이 표시됩니다.</div>'; return; }
    var opts = ACTIONS.map(function (a) { return '<option value="' + a[0] + '">' + a[1] + '</option>'; }).join('');
    box.innerHTML = '<div style="background:#0b1220;border:1px solid #1e293b;border-radius:8px;padding:10px;display:grid;gap:8px">'
      + '<select id="__gc_act" style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:7px 8px;font-weight:700">' + opts + '</select>'
      + '<div id="__gc_inputs" style="display:grid;gap:6px"></div>'
      + '<button id="__gc_apply" style="padding:8px;border:none;border-radius:8px;background:#22c55e;color:#04210f;font-weight:800;cursor:pointer">＋ 적용(미리보기)</button>'
      + '</div>';
    document.getElementById('__gc_act').onchange = renderInputs;
    document.getElementById('__gc_apply').onclick = onApply;
    renderInputs();
  }
  function inp(id, ph, val, area) {
    var st = 'width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:6px 8px;font:12px -apple-system,sans-serif';
    return area ? '<textarea id="' + id + '" placeholder="' + esc(ph) + '" style="' + st + ';min-height:56px;resize:vertical">' + esc(val || '') + '</textarea>'
      : '<input id="' + id + '" placeholder="' + esc(ph) + '" value="' + esc(val || '') + '" style="' + st + '" />';
  }
  function renderInputs() {
    var act = document.getElementById('__gc_act').value;
    var box = document.getElementById('__gc_inputs');
    var curText = (selEl.textContent || '').trim().slice(0, 200);
    if (act === 'text') box.innerHTML = inp('__gc_v', '새 텍스트', curText, true);
    else if (act === 'html') box.innerHTML = inp('__gc_v', '새 HTML', (selEl.innerHTML || '').slice(0, 500), true);
    else if (act === 'css') box.innerHTML = inp('__gc_p', 'CSS 속성 (예: color, font-size, background)', 'color') + inp('__gc_v', '값 (예: #ff0000, 18px, bold)', '');
    else if (act === 'attr') box.innerHTML = inp('__gc_p', '속성명 (예: href, title, alt, data-x)', '') + inp('__gc_v', '값', '');
    else if (act === 'class') box.innerHTML = '<select id="__gc_p" style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:6px 8px"><option value="add">클래스 추가(add)</option><option value="remove">클래스 제거(remove)</option></select>' + inp('__gc_v', '클래스명 (공백구분 다중 가능)', '');
    else if (act === 'img') box.innerHTML = inp('__gc_v', '새 이미지 URL (https://…)', (selEl.getAttribute && selEl.getAttribute('src')) || '');
    else if (act === 'insert') box.innerHTML = '<select id="__gc_p" style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:6px 8px"><option value="after">뒤에(after)</option><option value="before">앞에(before)</option><option value="append">내부 끝(append)</option><option value="prepend">내부 앞(prepend)</option></select>' + inp('__gc_v', '삽입할 HTML', '', true);
    else if (act === 'redirect') box.innerHTML = inp('__gc_v', '이동할 URL (변형 B 방문자 리디렉트)', '');
    else box.innerHTML = '<div style="font-size:11px;color:#94a3b8">' + (act === 'hide' ? '선택 요소를 숨깁니다.' : '선택 요소를 제거합니다.') + '</div>';
  }
  function onApply() {
    var act = document.getElementById('__gc_act').value;
    var vEl = document.getElementById('__gc_v'), pEl = document.getElementById('__gc_p');
    var value = vEl ? vEl.value : '', prop = pEl ? pEl.value : '';
    if (act === 'redirect') {
      if (!value.trim()) return flash('URL을 입력하세요.', '#fbbf24');
      addChange({ action: 'redirect', value: value.trim() }); return;
    }
    if (!selSelector) return flash('선택자가 비어 있습니다.', '#fbbf24');
    if ((act === 'css' || act === 'attr') && !prop.trim()) return flash((act === 'css' ? 'CSS 속성' : '속성명') + '을 입력하세요.', '#fbbf24');
    if ((act === 'class' || act === 'img' || act === 'insert' || act === 'text' || act === 'html' || act === 'attr') && act !== 'text' && act !== 'html' && !value.trim() && act !== 'css') {
      // 값이 필요한 액션들: class/img/insert/attr — 빈값 방지(text/html 은 빈값 허용)
      if (act === 'class' || act === 'img' || act === 'insert') return flash('값을 입력하세요.', '#fbbf24');
    }
    var change = { selector: selSelector, action: act };
    if (act === 'css' || act === 'attr' || act === 'class' || act === 'insert') change.prop = prop;
    if (act !== 'hide' && act !== 'remove') change.value = value;
    addChange(change);
  }
  function flash(m, c) { var msg = document.getElementById('__gc_msg'); msg.style.color = c || '#94a3b8'; msg.textContent = m; }

  // ── 라이브 프리뷰 적용 + 되돌리기(원복 함수 반환) ──
  function applyLive(c) {
    if (c.action === 'redirect') return function () {}; // 리디렉트는 미리보기 안 함(저장 시만)
    var els;
    try { els = c.selector ? Array.prototype.slice.call(document.querySelectorAll(c.selector)) : []; } catch (e) { els = []; }
    var undos = [];
    els.forEach(function (el) {
      try {
        if (c.action === 'text') { var o = el.textContent; el.textContent = String(c.value == null ? '' : c.value); undos.push(function () { el.textContent = o; }); }
        else if (c.action === 'html') { var oh = el.innerHTML; el.innerHTML = String(c.value == null ? '' : c.value); undos.push(function () { el.innerHTML = oh; }); }
        else if (c.action === 'hide') { var od = el.style.display; el.style.display = 'none'; undos.push(function () { el.style.display = od; }); }
        else if (c.action === 'remove') { var par = el.parentNode, nx = el.nextSibling; if (par) { par.removeChild(el); undos.push(function () { par.insertBefore(el, nx); }); } }
        else if (c.action === 'css' && c.prop) { var op = el.style.getPropertyValue(c.prop); el.style.setProperty(c.prop, String(c.value == null ? '' : c.value)); undos.push(function () { if (op) el.style.setProperty(c.prop, op); else el.style.removeProperty(c.prop); }); }
        else if (c.action === 'attr' && c.prop) { var had = el.hasAttribute(c.prop), oa = el.getAttribute(c.prop); el.setAttribute(c.prop, String(c.value == null ? '' : c.value)); undos.push(function () { if (had) el.setAttribute(c.prop, oa); else el.removeAttribute(c.prop); }); }
        else if (c.action === 'class') { var cls = String(c.value || '').trim().split(/\s+/).filter(Boolean); var added = [], removed = []; cls.forEach(function (k) { if (c.prop === 'remove') { if (el.classList.contains(k)) { el.classList.remove(k); removed.push(k); } } else { if (!el.classList.contains(k)) { el.classList.add(k); added.push(k); } } }); undos.push(function () { added.forEach(function (k) { el.classList.remove(k); }); removed.forEach(function (k) { el.classList.add(k); }); }); }
        else if (c.action === 'img') { var os = el.getAttribute('src'), oss = el.getAttribute('srcset'); el.setAttribute('src', String(c.value || '')); el.removeAttribute('srcset'); undos.push(function () { if (os != null) el.setAttribute('src', os); if (oss != null) el.setAttribute('srcset', oss); }); }
        else if (c.action === 'insert') { var pos = { before: 'beforebegin', after: 'afterend', prepend: 'afterbegin', append: 'beforeend' }[c.prop] || 'afterend'; var before = pos === 'beforebegin' ? el : (pos === 'afterend' ? el.nextSibling : null); var refCount = el.childNodes.length; el.insertAdjacentHTML(pos, String(c.value || '')); // track inserted nodes(간이): 재조회로 원복
          var inserted = []; if (pos === 'beforebegin') { var p = el.previousSibling; inserted.push(p); } else if (pos === 'afterend') { var n = el.nextSibling; inserted.push(n); } else if (pos === 'afterbegin') { inserted.push(el.firstChild); } else { inserted.push(el.lastChild); }
          undos.push(function () { inserted.forEach(function (nd) { if (nd && nd.parentNode) nd.parentNode.removeChild(nd); }); }); }
      } catch (e) {}
    });
    return function () { undos.reverse().forEach(function (u) { try { u(); } catch (e) {} }); };
  }

  function labelOf(c) {
    if (c.action === 'redirect') return '이동 → ' + c.value;
    var base = { text: '텍스트', html: 'HTML', hide: '숨기기', remove: '제거', css: 'CSS', attr: '속성', class: '클래스', img: '이미지', insert: '삽입' }[c.action] || c.action;
    var extra = c.prop ? (' ' + c.prop) : '';
    var val = (c.value != null && c.action !== 'hide' && c.action !== 'remove') ? (' = ' + String(c.value).slice(0, 24)) : '';
    return base + extra + ' · ' + (c.selector || '') + val;
  }

  function addChange(c) {
    c._undo = applyLive(c);
    c._label = labelOf(c);
    changes.push(c);
    renderList();
    flash('✓ 적용됨(미리보기). 저장 전까지 원본 영향 없음.', '#22c55e');
  }
  function removeChange(i) { try { changes[i]._undo && changes[i]._undo(); } catch (e) {} changes.splice(i, 1); renderList(); }

  function renderList() {
    var box = document.getElementById('__gc_list'); box.innerHTML = '';
    changes.forEach(function (c, i) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;align-items:center;background:#1e293b;border-radius:6px;padding:5px 8px;font-size:11px';
      row.innerHTML = '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c._label || labelOf(c)) + '</span>';
      var del = document.createElement('span'); del.textContent = '↩ 취소'; del.title = '되돌리기'; del.style.cssText = 'cursor:pointer;color:#f87171;font-weight:700';
      del.onclick = function () { removeChange(i); };
      row.appendChild(del); box.appendChild(row);
    });
    document.getElementById('__gc_cnt').textContent = changes.length;
  }

  // ── 저장 ──
  document.getElementById('__gc_save').onclick = function () {
    if (!changes.length) return flash('추가된 변경이 없습니다.', '#fbbf24');
    flash('저장 중…', '#94a3b8');
    var payload = changes.map(function (c) { var o = { selector: c.selector, action: c.action }; if (c.prop != null) o.prop = c.prop; if (c.value != null) o.value = c.value; return o; });
    fetch(API + '/api/v424/cro/edit-save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, changes: payload })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok) flash('✓ 저장됨 (' + d.saved + '개). 변형 B에 반영되었습니다.', '#22c55e');
      else flash('저장 실패: ' + ((d && d.error) || '토큰 만료/오류'), '#f87171');
    }).catch(function (e) { flash('저장 실패(네트워크/CORS): ' + e, '#f87171'); });
  };

  renderPanel(); // 초기 안내

  function cleanup() {
    // 미리보기 원복(저장 여부와 무관하게 편집 종료 시 원본 복원 — 실제 변형은 저장된 체인지셋이 방문자에 적용)
    changes.slice().reverse().forEach(function (c) { try { c._undo && c._undo(); } catch (e) {} });
    document.removeEventListener('mouseover', onOver, true);
    document.removeEventListener('click', onClick, true);
    if (hl.parentNode) hl.parentNode.removeChild(hl);
    if (ui.parentNode) ui.parentNode.removeChild(ui);
    window.__GENIE_CRO_EDITOR__ = false;
  }
})();
