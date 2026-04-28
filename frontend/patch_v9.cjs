const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const REMOTE_CSS = '/home/wwwroot/roidemo.geniego.com/frontend/dist/assets/index-DFdG7yoA.css';
const REMOTE_HTML = '/home/wwwroot/roidemo.geniego.com/frontend/dist/index.html';
const LOCAL_CSS = path.join(__dirname, '_tmp_css9.css');
const LOCAL_HTML = path.join(__dirname, '_tmp_html9.html');

// The fix: Don't blindly set active tab to white.
// Instead, check if the tab has a DARK gradient background.
// If yes → white text. If no (light/white bg) → dark text.
const CSS_FIX = `

/* ═══════════════════════════════════════════════════════════════
   ACTIVE TAB FIX v9.0
   Remove the blanket white-text rule for active tabs.
   Let JS handle it dynamically based on actual background.
   ═══════════════════════════════════════════════════════════════ */

/* Remove previous active tab rules — let JS decide */
[data-theme="arctic_white"] .tab.active,
[data-theme="pearl_office"] .tab.active,
[data-theme="arctic_white"] .tabs button.active,
[data-theme="pearl_office"] .tabs button.active {
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
  font-weight: 700 !important;
}

/* Tabs with explicit gradient inline style → white */
[data-theme="arctic_white"] .tab.active[style*="linear-gradient"],
[data-theme="pearl_office"] .tab.active[style*="linear-gradient"],
[data-theme="arctic_white"] button.active[style*="linear-gradient"],
[data-theme="pearl_office"] button.active[style*="linear-gradient"],
[data-theme="arctic_white"] button[style*="linear-gradient"],
[data-theme="pearl_office"] button[style*="linear-gradient"] {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}

/* Inactive tabs dark */
[data-theme="arctic_white"] .tab:not(.active),
[data-theme="pearl_office"] .tab:not(.active),
[data-theme="arctic_white"] .tabs button:not(.active),
[data-theme="pearl_office"] .tabs button:not(.active) {
  color: #64748b !important;
  -webkit-text-fill-color: #64748b !important;
}

/* Active tab with border-bottom indicator → dark text, not white */
[data-theme="arctic_white"] button[style*="border-bottom"],
[data-theme="pearl_office"] button[style*="border-bottom"],
[data-theme="arctic_white"] button[style*="borderBottom"],
[data-theme="pearl_office"] button[style*="borderBottom"] {
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
}

/* ═══════════════════════════════════════════════════════════════
   END ACTIVE TAB FIX v9.0
   ═══════════════════════════════════════════════════════════════ */
`;

// Updated JS v4 with smarter tab detection
const JS_V4 = `
<script>
// Light Theme Visibility Fix v4
(function(){
  function isLightBg(bgColor) {
    if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') return true;
    var m = bgColor.match(/rgb[a]?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (!m) return true;
    return (parseInt(m[1]) + parseInt(m[2]) + parseInt(m[3])) / 3 > 128;
  }
  
  function fixLightTheme(){
    var theme = document.documentElement.getAttribute('data-theme');
    if(theme !== 'arctic_white' && theme !== 'pearl_office') return;
    
    // Fix gradient text (hero titles etc)
    document.querySelectorAll('.hero-title, .hero div[style], .hero span[style]').forEach(function(el){
      var s = el.style;
      if(s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text'){
        s.setProperty('background', 'none', 'important');
        s.setProperty('-webkit-background-clip', 'initial', 'important');
        s.setProperty('background-clip', 'initial', 'important');
        s.setProperty('-webkit-text-fill-color', '#0f172a', 'important');
        s.setProperty('color', '#0f172a', 'important');
      }
    });
    document.querySelectorAll('.hero-desc').forEach(function(el){
      el.style.setProperty('color', '#475569', 'important');
      el.style.setProperty('-webkit-text-fill-color', '#475569', 'important');
    });
    document.querySelectorAll('.hero-title').forEach(function(el){
      el.style.setProperty('-webkit-text-fill-color', '#0f172a', 'important');
      el.style.setProperty('background', 'none', 'important');
      el.style.setProperty('color', '#0f172a', 'important');
    });
    
    // Fix section titles with gradient text
    document.querySelectorAll('[class*="title"], .section-title').forEach(function(el){
      var s = el.style;
      if(s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text'){
        s.setProperty('background', 'none', 'important');
        s.setProperty('-webkit-background-clip', 'initial', 'important');
        s.setProperty('-webkit-text-fill-color', '#0f172a', 'important');
        s.setProperty('color', '#0f172a', 'important');
      }
    });
    
    // Fix ALL buttons and tabs
    document.querySelectorAll('button, [class*="tab"]').forEach(function(btn){
      try{
        var cs = window.getComputedStyle(btn);
        var bgImg = cs.backgroundImage || '';
        var bgColor = cs.backgroundColor || '';
        var isGradient = bgImg.includes('linear-gradient');
        var isLight = isLightBg(bgColor);
        var isBtnPrimary = btn.classList.contains('btn-primary');
        var isActive = btn.classList.contains('active') || btn.getAttribute('data-active') === 'true';
        
        // Skip sidebar buttons
        if(btn.closest('aside') || btn.closest('nav') || btn.closest('[class*="sidebar"]')) return;
        
        if(isGradient && !isLight){
          // Dark gradient → white text
          btn.style.setProperty('color', '#fff', 'important');
          btn.style.setProperty('-webkit-text-fill-color', '#fff', 'important');
        } else if(isBtnPrimary){
          btn.style.setProperty('color', '#fff', 'important');
          btn.style.setProperty('-webkit-text-fill-color', '#fff', 'important');
        } else if(isActive && isGradient){
          // Active with gradient → white
          btn.style.setProperty('color', '#fff', 'important');
          btn.style.setProperty('-webkit-text-fill-color', '#fff', 'important');
        } else if(isActive && !isGradient && isLight){
          // Active with light bg → dark text + add underline indicator
          btn.style.setProperty('color', '#0f172a', 'important');
          btn.style.setProperty('-webkit-text-fill-color', '#0f172a', 'important');
          btn.style.setProperty('font-weight', '700', 'important');
        } else {
          // Inactive → ensure dark text
          if(cs.color === 'rgb(255, 255, 255)' || cs.color === 'rgba(255, 255, 255, 0.9)'){
            btn.style.setProperty('color', '#475569', 'important');
            btn.style.setProperty('-webkit-text-fill-color', '#475569', 'important');
          }
        }
        
        // Fix transparent text fill
        if(cs.webkitTextFillColor === 'transparent'){
          if(isGradient && !isLight){
            btn.style.setProperty('-webkit-text-fill-color', '#fff', 'important');
          } else {
            btn.style.setProperty('-webkit-text-fill-color', 'inherit', 'important');
          }
        }
      }catch(e){}
    });
    
    // Fix remaining transparent text-fill elements
    document.querySelectorAll('*').forEach(function(el){
      try{
        if(el.closest('aside') || el.closest('nav')) return;
        var cs = window.getComputedStyle(el);
        if(cs.webkitTextFillColor === 'transparent'){
          var bgImg = cs.backgroundImage || '';
          if(bgImg.includes('linear-gradient') && el.tagName === 'BUTTON'){
            return; // Already handled above
          }
          el.style.setProperty('-webkit-text-fill-color', 'inherit', 'important');
          if(el.style.backgroundClip === 'text' || el.style.webkitBackgroundClip === 'text'){
            el.style.setProperty('background', 'none', 'important');
            el.style.setProperty('-webkit-background-clip', 'initial', 'important');
            el.style.setProperty('color', '#0f172a', 'important');
          }
        }
      }catch(e){}
    });
    
    // Fix dark inline backgrounds (not sidebar, not buttons with gradient)
    document.querySelectorAll('div, section, span, article').forEach(function(el){
      try{
        if(el.closest('aside') || el.closest('nav') || el.closest('[class*="sidebar"]')) return;
        var cs = window.getComputedStyle(el);
        var bg = cs.backgroundColor;
        if(!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return;
        var m = bg.match(/rgb[a]?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
        if(!m) return;
        var avg = (parseInt(m[1]) + parseInt(m[2]) + parseInt(m[3])) / 3;
        if(avg < 50) {
          // Very dark background → lighten
          el.style.setProperty('background-color', '#ffffff', 'important');
          el.style.setProperty('color', '#1e293b', 'important');
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
  new MutationObserver(function(){
    clearTimeout(debounce);
    debounce = setTimeout(fixLightTheme, 150);
  }).observe(document.documentElement, { 
    attributes: true, attributeFilter: ['data-theme', 'class'],
    childList: true, subtree: true
  });
  
  setInterval(fixLightTheme, 1500);
})();
</script>`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected!');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // Update CSS
    sftp.fastGet(REMOTE_CSS, LOCAL_CSS, (err2) => {
      if (err2) { console.error(err2.message); conn.end(); return; }
      let css = fs.readFileSync(LOCAL_CSS, 'utf8');
      
      // Remove only the v7 active tab patch (keep v8)
      const v7start = css.indexOf('/* PATCH v7');
      if (v7start > -1) {
        const v7end = css.indexOf('END PATCH v7');
        if (v7end > -1) {
          const afterV7 = css.indexOf('*/', v7end);
          css = css.substring(0, v7start) + css.substring(afterV7 + 2);
        }
      }
      
      // Also fix the v8 active tab rules
      css = css.replace(
        /\[data-theme="arctic_white"\] \.tab\.active,\s*\[data-theme="pearl_office"\] \.tab\.active,\s*\[data-theme="arctic_white"\] \.tabs button\.active,\s*\[data-theme="pearl_office"\] \.tabs button\.active \{\s*color: #fff !important;\s*-webkit-text-fill-color: #fff !important;\s*\}/g,
        `[data-theme="arctic_white"] .tab.active,
[data-theme="pearl_office"] .tab.active,
[data-theme="arctic_white"] .tabs button.active,
[data-theme="pearl_office"] .tabs button.active {
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
  font-weight: 700 !important;
}`
      );
      
      css += CSS_FIX;
      fs.writeFileSync(LOCAL_CSS, css, 'utf8');
      console.log(`CSS: ${(css.length/1024).toFixed(0)} KB`);
      
      sftp.fastPut(LOCAL_CSS, REMOTE_CSS, (err3) => {
        if (err3) { console.error(err3.message); conn.end(); return; }
        console.log('✅ CSS v9 uploaded');
        fs.unlinkSync(LOCAL_CSS);
        
        // Update HTML
        sftp.fastGet(REMOTE_HTML, LOCAL_HTML, (err4) => {
          if (err4) { console.error(err4.message); conn.end(); return; }
          let html = fs.readFileSync(LOCAL_HTML, 'utf8');
          
          // Remove old JS
          html = html.replace(/<script>\s*\/\/ Light Theme[^]*?<\/script>/g, '');
          html = html.replace('</body>', JS_V4 + '\n</body>');
          
          fs.writeFileSync(LOCAL_HTML, html, 'utf8');
          sftp.fastPut(LOCAL_HTML, REMOTE_HTML, (err5) => {
            if (err5) { console.error(err5.message); conn.end(); return; }
            console.log('✅ JS v4 uploaded');
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
