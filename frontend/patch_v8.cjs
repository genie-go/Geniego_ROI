const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const REMOTE_CSS = '/home/wwwroot/roidemo.geniego.com/frontend/dist/assets/index-DFdG7yoA.css';
const REMOTE_HTML = '/home/wwwroot/roidemo.geniego.com/frontend/dist/index.html';
const LOCAL_CSS = path.join(__dirname, '_tmp_css8.css');
const LOCAL_HTML = path.join(__dirname, '_tmp_html8.html');

// FULL theme unification — override ALL dark CSS variables to light values
const CSS_FULL_OVERRIDE = `

/* ═══════════════════════════════════════════════════════════════
   FULL LIGHT THEME UNIFICATION v8.0
   Override ALL background/surface/card CSS variables
   ═══════════════════════════════════════════════════════════════ */

[data-theme="arctic_white"] {
  --bg: #f0f4f8 !important;
  --surface: #ffffff !important;
  --surface-2: #f8fafc !important;
  --card: #ffffff !important;
  --card-hover: #f8fafc !important;
  --border: #e2e8f0 !important;
  --border-2: #cbd5e1 !important;
  --text-1: #0f172a !important;
  --text-2: #475569 !important;
  --text-3: #94a3b8 !important;
  --heading: #0f172a !important;
  --sidebar-bg: #1e293b !important;
  --sidebar-text: #e2e8f0 !important;
  --sidebar-hover: #334155 !important;
  --table-header: #f1f5f9 !important;
  --table-row: #ffffff !important;
  --table-row-alt: #f8fafc !important;
  --input-bg: #ffffff !important;
  --input-border: #cbd5e1 !important;
  --shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
  --shadow-lg: 0 4px 12px rgba(0,0,0,0.1) !important;
}

[data-theme="pearl_office"] {
  --bg: #f5f0ec !important;
  --surface: #ffffff !important;
  --surface-2: #faf8f6 !important;
  --card: #ffffff !important;
  --card-hover: #faf8f6 !important;
  --border: #e7e0d8 !important;
  --border-2: #d4ccc4 !important;
  --text-1: #1a1612 !important;
  --text-2: #5c534a !important;
  --text-3: #9a8f84 !important;
  --heading: #1a1612 !important;
  --table-header: #f5f0ec !important;
  --table-row: #ffffff !important;
  --table-row-alt: #faf8f6 !important;
  --input-bg: #ffffff !important;
  --input-border: #d4ccc4 !important;
}

/* Force white backgrounds on key elements */
[data-theme="arctic_white"] .card,
[data-theme="pearl_office"] .card,
[data-theme="arctic_white"] .card-glass,
[data-theme="pearl_office"] .card-glass {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  color: var(--text-1) !important;
}

[data-theme="arctic_white"] .kpi-card,
[data-theme="pearl_office"] .kpi-card {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  color: #1e293b !important;
}

/* Hero section light styling */
[data-theme="arctic_white"] .hero,
[data-theme="pearl_office"] .hero {
  background: linear-gradient(135deg, rgba(79,142,247,0.04), rgba(99,102,241,0.03)) !important;
  border: 1px solid rgba(79,142,247,0.12) !important;
  color: #1e293b !important;
  max-width: 100% !important;
  width: 100% !important;
}

/* Sub-tab bar background → white */
[data-theme="arctic_white"] .tabs,
[data-theme="pearl_office"] .tabs {
  background: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

/* Active tab → keep gradient background with white text */
[data-theme="arctic_white"] .tab.active,
[data-theme="pearl_office"] .tab.active,
[data-theme="arctic_white"] .tabs button.active,
[data-theme="pearl_office"] .tabs button.active {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}

/* Inactive tab → dark text */
[data-theme="arctic_white"] .tab:not(.active),
[data-theme="pearl_office"] .tab:not(.active),
[data-theme="arctic_white"] .tabs button:not(.active),
[data-theme="pearl_office"] .tabs button:not(.active) {
  color: #64748b !important;
  -webkit-text-fill-color: #64748b !important;
  background: transparent !important;
}

/* Table styling */
[data-theme="arctic_white"] table,
[data-theme="pearl_office"] table {
  background: #ffffff !important;
}

[data-theme="arctic_white"] thead,
[data-theme="pearl_office"] thead {
  background: #f1f5f9 !important;
}

[data-theme="arctic_white"] th,
[data-theme="pearl_office"] th {
  background: #f1f5f9 !important;
  color: #475569 !important;
  -webkit-text-fill-color: #475569 !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

[data-theme="arctic_white"] td,
[data-theme="pearl_office"] td {
  color: #1e293b !important;
  -webkit-text-fill-color: #1e293b !important;
  border-bottom: 1px solid #f1f5f9 !important;
}

[data-theme="arctic_white"] tr:hover,
[data-theme="pearl_office"] tr:hover {
  background: #f8fafc !important;
}

/* Section backgrounds → white */
[data-theme="arctic_white"] section,
[data-theme="pearl_office"] section {
  background: transparent !important;
}

/* Empty state / placeholder areas */
[data-theme="arctic_white"] .empty-state,
[data-theme="pearl_office"] .empty-state {
  background: #f8fafc !important;
  color: #64748b !important;
}

/* Fix inline rgba dark backgrounds */
[data-theme="arctic_white"] [style*="background: rgba(0"],
[data-theme="pearl_office"] [style*="background: rgba(0"],
[data-theme="arctic_white"] [style*="background:rgba(0"],
[data-theme="pearl_office"] [style*="background:rgba(0"],
[data-theme="arctic_white"] [style*="background: rgb(15"],
[data-theme="pearl_office"] [style*="background: rgb(15"],
[data-theme="arctic_white"] [style*="background: rgb(30"],
[data-theme="pearl_office"] [style*="background: rgb(30"] {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
}

/* Fix surfaces with var(--surface) that were dark */
[data-theme="arctic_white"] [style*="background: var(--surface)"],
[data-theme="pearl_office"] [style*="background: var(--surface)"] {
  background: #ffffff !important;
}

[data-theme="arctic_white"] [style*="var(--card)"],
[data-theme="pearl_office"] [style*="var(--card)"] {
  background: #ffffff !important;
}

/* Select/dropdown styling */
[data-theme="arctic_white"] select,
[data-theme="pearl_office"] select {
  background: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
  color: #1e293b !important;
}

[data-theme="arctic_white"] input,
[data-theme="pearl_office"] input {
  background: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
  color: #1e293b !important;
}

/* Badge refinement */
[data-theme="arctic_white"] .badge,
[data-theme="pearl_office"] .badge {
  border: 1px solid #e2e8f0 !important;
}

/* Progress bars should be visible */
[data-theme="arctic_white"] [style*="background: var(--border)"],
[data-theme="pearl_office"] [style*="background: var(--border)"] {
  background: #e2e8f0 !important;
}

/* Scrollbar light styling */
[data-theme="arctic_white"] ::-webkit-scrollbar-track {
  background: #f1f5f9 !important;
}
[data-theme="arctic_white"] ::-webkit-scrollbar-thumb {
  background: #cbd5e1 !important;
}
[data-theme="arctic_white"] ::-webkit-scrollbar-thumb:hover {
  background: #94a3b8 !important;
}

/* Main content area full width */
[data-theme="arctic_white"] main,
[data-theme="pearl_office"] main,
[data-theme="arctic_white"] main > div,
[data-theme="pearl_office"] main > div {
  max-width: 100% !important;
  width: 100% !important;
}

/* Gradient text → dark text */
[data-theme="arctic_white"] .hero-title,
[data-theme="pearl_office"] .hero-title {
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
  background: none !important;
  -webkit-background-clip: initial !important;
  background-clip: initial !important;
}

[data-theme="arctic_white"] .hero-desc,
[data-theme="pearl_office"] .hero-desc {
  color: #475569 !important;
  -webkit-text-fill-color: #475569 !important;
}

/* Global text fill fix */
[data-theme="arctic_white"] *,
[data-theme="pearl_office"] * {
  -webkit-text-fill-color: inherit !important;
}

/* Gradient buttons keep white */
[data-theme="arctic_white"] button[style*="linear-gradient"],
[data-theme="pearl_office"] button[style*="linear-gradient"],
[data-theme="arctic_white"] .btn-primary,
[data-theme="pearl_office"] .btn-primary {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}

/* Regular buttons → dark text */
[data-theme="arctic_white"] button:not([style*="linear-gradient"]):not(.btn-primary):not(.active):not(.tab),
[data-theme="pearl_office"] button:not([style*="linear-gradient"]):not(.btn-primary):not(.active):not(.tab) {
  color: #374151 !important;
  -webkit-text-fill-color: #374151 !important;
}

/* Sidebar stays dark (intended) */
[data-theme="arctic_white"] aside *,
[data-theme="pearl_office"] aside *,
[data-theme="arctic_white"] nav *,
[data-theme="pearl_office"] nav * {
  -webkit-text-fill-color: inherit !important;
}

/* Chart labels */
[data-theme="arctic_white"] .recharts-text,
[data-theme="pearl_office"] .recharts-text {
  fill: #475569 !important;
}
[data-theme="arctic_white"] .recharts-cartesian-axis-tick text,
[data-theme="pearl_office"] .recharts-cartesian-axis-tick text {
  fill: #64748b !important;
}

/* Accent color preservation */
[data-theme="arctic_white"] [style*="color: #ef4444"],
[data-theme="pearl_office"] [style*="color: #ef4444"] { color: #ef4444 !important; -webkit-text-fill-color: #ef4444 !important; }
[data-theme="arctic_white"] [style*="color: #22c55e"],
[data-theme="pearl_office"] [style*="color: #22c55e"] { color: #22c55e !important; -webkit-text-fill-color: #22c55e !important; }
[data-theme="arctic_white"] [style*="color: #4f8ef7"],
[data-theme="pearl_office"] [style*="color: #4f8ef7"] { color: #4f8ef7 !important; -webkit-text-fill-color: #4f8ef7 !important; }
[data-theme="arctic_white"] [style*="color: #f97316"],
[data-theme="pearl_office"] [style*="color: #f97316"] { color: #f97316 !important; -webkit-text-fill-color: #f97316 !important; }
[data-theme="arctic_white"] [style*="color: #a855f7"],
[data-theme="pearl_office"] [style*="color: #a855f7"] { color: #a855f7 !important; -webkit-text-fill-color: #a855f7 !important; }

/* ═══════════════════════════════════════════════════════════════
   END FULL LIGHT THEME UNIFICATION v8.0
   ═══════════════════════════════════════════════════════════════ */
`;

const JS_V3 = `
<script>
// Light Theme Visibility Fix v3
(function(){
  function fixLightTheme(){
    var theme = document.documentElement.getAttribute('data-theme');
    if(theme !== 'arctic_white' && theme !== 'pearl_office') return;
    
    // Fix gradient text
    var all = document.querySelectorAll('*');
    for(var i = 0; i < all.length; i++){
      var el = all[i];
      try {
        var cs = window.getComputedStyle(el);
        if(cs.webkitTextFillColor === 'transparent'){
          var bgImg = cs.backgroundImage || '';
          if(bgImg.includes('linear-gradient') && (el.tagName === 'BUTTON' || el.classList.contains('tab') || el.classList.contains('active'))){
            el.style.setProperty('-webkit-text-fill-color', '#fff', 'important');
            el.style.setProperty('color', '#fff', 'important');
          } else {
            el.style.setProperty('-webkit-text-fill-color', 'inherit', 'important');
            if (el.style.backgroundClip === 'text' || el.style.webkitBackgroundClip === 'text') {
              el.style.setProperty('background', 'none', 'important');
              el.style.setProperty('-webkit-background-clip', 'initial', 'important');
              el.style.setProperty('background-clip', 'initial', 'important');
              el.style.setProperty('color', '#0f172a', 'important');
            }
          }
        }
        
        // Fix dark inline backgrounds
        var bg = cs.backgroundColor;
        if(bg && !el.closest('aside') && !el.closest('nav') && !el.closest('[class*="sidebar"]')){
          var match = bg.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
          if(match){
            var r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
            // If background is very dark (average < 60) and not a button/badge
            if((r+g+b)/3 < 60 && el.tagName !== 'BUTTON' && !el.classList.contains('badge') && !el.classList.contains('btn-primary')){
              el.style.setProperty('background-color', '#ffffff', 'important');
              el.style.setProperty('border', '1px solid #e2e8f0', 'important');
            }
          }
        }
      } catch(e){}
    }
    
    // Fix hero
    document.querySelectorAll('.hero-title').forEach(function(el){
      el.style.setProperty('-webkit-text-fill-color', '#0f172a', 'important');
      el.style.setProperty('background', 'none', 'important');
      el.style.setProperty('color', '#0f172a', 'important');
    });
    document.querySelectorAll('.hero-desc').forEach(function(el){
      el.style.setProperty('color', '#475569', 'important');
      el.style.setProperty('-webkit-text-fill-color', '#475569', 'important');
    });
    
    // Fix gradient text in hero
    document.querySelectorAll('.hero div, .hero span').forEach(function(el){
      var s = el.style;
      if(s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text'){
        s.setProperty('background', 'none', 'important');
        s.setProperty('-webkit-background-clip', 'initial', 'important');
        s.setProperty('-webkit-text-fill-color', '#0f172a', 'important');
        s.setProperty('color', '#0f172a', 'important');
      }
    });
    
    // Fix active tabs: ensure white text on gradient
    document.querySelectorAll('button.active, .tab.active').forEach(function(btn){
      var cs2 = window.getComputedStyle(btn);
      var bgImg = cs2.backgroundImage || '';
      if(bgImg.includes('linear-gradient')){
        btn.style.setProperty('color', '#fff', 'important');
        btn.style.setProperty('-webkit-text-fill-color', '#fff', 'important');
      }
    });
    
    // Fix inactive buttons with white text
    document.querySelectorAll('button:not(.active):not(.btn-primary), .tab:not(.active)').forEach(function(btn){
      try{
        var cs3 = window.getComputedStyle(btn);
        var bgImg = cs3.backgroundImage || '';
        if(!bgImg.includes('linear-gradient') && !btn.style.background?.includes('linear-gradient')){
          if(cs3.color === 'rgb(255, 255, 255)' || cs3.color === 'rgba(255, 255, 255, 0.9)'){
            btn.style.setProperty('color', '#374151', 'important');
            btn.style.setProperty('-webkit-text-fill-color', '#374151', 'important');
          }
        }
      }catch(e){}
    });
    
    // Fix layout width
    var main = document.querySelector('main');
    if(main){
      main.style.setProperty('max-width', '100%', 'important');
      if(main.firstElementChild) main.firstElementChild.style.setProperty('max-width', '100%', 'important');
    }
  }
  
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(fixLightTheme, 500); });
  } else {
    setTimeout(fixLightTheme, 500);
  }
  
  var debounce = null;
  var observer = new MutationObserver(function(){
    clearTimeout(debounce);
    debounce = setTimeout(fixLightTheme, 200);
  });
  observer.observe(document.documentElement, { 
    attributes: true, attributeFilter: ['data-theme'],
    childList: true, subtree: true
  });
  
  setInterval(fixLightTheme, 2000);
})();
</script>`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected!');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    sftp.fastGet(REMOTE_CSS, LOCAL_CSS, (err2) => {
      if (err2) { console.error(err2.message); conn.end(); return; }
      
      let css = fs.readFileSync(LOCAL_CSS, 'utf8');
      
      // Remove ALL previous patches (v6, v7, etc.)
      const markers = [
        '/* ═══════════════════════════',
        '/* === Sub-Tab Visibility',
        '/* PATCH v7',
      ];
      let cutoff = css.length;
      for (const m of markers) {
        const idx = css.indexOf(m);
        if (idx > -1 && idx > css.length * 0.7) cutoff = Math.min(cutoff, idx);
      }
      if (cutoff < css.length) {
        css = css.substring(0, cutoff).trimEnd();
        console.log('Removed previous patches');
      }
      
      css += CSS_FULL_OVERRIDE;
      fs.writeFileSync(LOCAL_CSS, css, 'utf8');
      console.log(`CSS: ${(css.length/1024).toFixed(0)} KB`);
      
      sftp.fastPut(LOCAL_CSS, REMOTE_CSS, (err3) => {
        if (err3) { console.error(err3.message); conn.end(); return; }
        console.log('✅ CSS v8 uploaded');
        fs.unlinkSync(LOCAL_CSS);
        
        sftp.fastGet(REMOTE_HTML, LOCAL_HTML, (err4) => {
          if (err4) { console.error(err4.message); conn.end(); return; }
          let html = fs.readFileSync(LOCAL_HTML, 'utf8');
          
          // Remove old JS (v1 or v2)
          html = html.replace(/<script>\s*\/\/ Light Theme Text Visibility Fix[^]*?<\/script>/g, '');
          html = html.replace(/<script>\s*\/\/ Light Theme Visibility Fix[^]*?<\/script>/g, '');
          
          html = html.replace('</body>', JS_V3 + '\n</body>');
          fs.writeFileSync(LOCAL_HTML, html, 'utf8');
          
          sftp.fastPut(LOCAL_HTML, REMOTE_HTML, (err5) => {
            if (err5) { console.error(err5.message); conn.end(); return; }
            console.log('✅ JS v3 uploaded');
            fs.unlinkSync(LOCAL_HTML);
            conn.end();
          });
        });
      });
    });
  });
});

conn.on('error', err => { console.error(err.message); });
conn.connect({ host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!', readyTimeout: 10000 });
