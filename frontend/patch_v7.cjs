const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const REMOTE_CSS = '/home/wwwroot/roidemo.geniego.com/frontend/dist/assets/index-DFdG7yoA.css';
const REMOTE_HTML = '/home/wwwroot/roidemo.geniego.com/frontend/dist/index.html';
const LOCAL_CSS = path.join(__dirname, '_tmp_css7.css');
const LOCAL_HTML = path.join(__dirname, '_tmp_html7.html');

// Additional CSS fixes for:
// 1. Active tab with gradient bg → white text
// 2. Layout full width
const CSS_ADDON = `

/* ═══════════════════════════════════════════════════════════════
   PATCH v7.0 — Active Tab + Layout Width Fix
   ═══════════════════════════════════════════════════════════════ */

/* Active tab with gradient background needs WHITE text */
[data-theme="arctic_white"] .tab.active,
[data-theme="pearl_office"] .tab.active {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}

[data-theme="arctic_white"] .tabs button.active,
[data-theme="pearl_office"] .tabs button.active {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}

/* Any button/tab with active gradient background needs white text */
[data-theme="arctic_white"] button[style*="linear-gradient"],
[data-theme="pearl_office"] button[style*="linear-gradient"] {
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}

/* Inactive tabs should be dark text */
[data-theme="arctic_white"] .tab:not(.active),
[data-theme="pearl_office"] .tab:not(.active) {
  color: #64748b !important;
  -webkit-text-fill-color: #64748b !important;
}

[data-theme="arctic_white"] .tabs button:not(.active),
[data-theme="pearl_office"] .tabs button:not(.active) {
  color: #64748b !important;
  -webkit-text-fill-color: #64748b !important;
}

/* LAYOUT: Force full width content */
[data-theme="arctic_white"] main,
[data-theme="pearl_office"] main,
[data-theme="arctic_white"] main > div,
[data-theme="pearl_office"] main > div {
  max-width: 100% !important;
  width: 100% !important;
}

[data-theme="arctic_white"] .fade-up,
[data-theme="pearl_office"] .fade-up {
  max-width: 100% !important;
}

/* Grid layouts should use full width */
[data-theme="arctic_white"] .grid2,
[data-theme="pearl_office"] .grid2,
[data-theme="arctic_white"] .grid3,
[data-theme="pearl_office"] .grid3,
[data-theme="arctic_white"] .grid4,
[data-theme="pearl_office"] .grid4 {
  max-width: 100% !important;
  width: 100% !important;
}

/* Cards should use full width */
[data-theme="arctic_white"] .card,
[data-theme="pearl_office"] .card {
  max-width: 100% !important;
}

/* Hero full width */
[data-theme="arctic_white"] .hero,
[data-theme="pearl_office"] .hero {
  max-width: 100% !important;
  width: 100% !important;
}

/* Content container full width */
[data-theme="arctic_white"] [style*="max-width"],
[data-theme="pearl_office"] [style*="max-width"] {
  max-width: 100% !important;
}

/* ═══════════════════════════════════════════════════════════════
   END PATCH v7.0
   ═══════════════════════════════════════════════════════════════ */
`;

// Updated JS that also handles active tabs
const JS_UPDATE = `
<script>
// Light Theme Text Visibility Fix v2
(function(){
  function fixLightTheme(){
    var theme = document.documentElement.getAttribute('data-theme');
    if(theme !== 'arctic_white' && theme !== 'pearl_office') return;
    
    // Fix all elements with -webkit-text-fill-color: transparent
    var all = document.querySelectorAll('*');
    for(var i = 0; i < all.length; i++){
      var el = all[i];
      var cs = window.getComputedStyle(el);
      if(cs.webkitTextFillColor === 'transparent'){
        // Check if this is a button with gradient background (active tab)
        var bg = cs.backgroundImage || '';
        if(bg.includes('linear-gradient') && (el.tagName === 'BUTTON' || el.classList.contains('tab'))){
          // Active tab with gradient - make text WHITE
          el.style.setProperty('-webkit-text-fill-color', '#fff', 'important');
          el.style.setProperty('color', '#fff', 'important');
        } else {
          // Regular element - make text DARK
          el.style.setProperty('-webkit-text-fill-color', 'inherit', 'important');
          el.style.setProperty('background-image', 'none', 'important');
          el.style.setProperty('-webkit-background-clip', 'initial', 'important');
          el.style.setProperty('background-clip', 'initial', 'important');
        }
      }
    }
    
    // Fix hero elements
    var heroes = document.querySelectorAll('.hero-title, .hero-desc, .hero-meta');
    heroes.forEach(function(el){
      el.style.setProperty('-webkit-text-fill-color', '#0f172a', 'important');
      el.style.setProperty('background', 'none', 'important');
      el.style.setProperty('color', '#0f172a', 'important');
    });
    var descs = document.querySelectorAll('.hero-desc');
    descs.forEach(function(el){
      el.style.setProperty('color', '#475569', 'important');
      el.style.setProperty('-webkit-text-fill-color', '#475569', 'important');
    });
    
    // Fix all gradient text within hero divs
    var heroInner = document.querySelectorAll('.hero div, .hero span');
    heroInner.forEach(function(el){
      var s = el.style;
      if(s.background && s.background.includes('linear-gradient') && 
         (s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text')){
        s.setProperty('background', 'none', 'important');
        s.setProperty('-webkit-background-clip', 'initial', 'important');
        s.setProperty('-webkit-text-fill-color', '#0f172a', 'important');
        s.setProperty('color', '#0f172a', 'important');
      }
    });
    
    // Fix section titles with gradient text  
    var titles = document.querySelectorAll('[class*="title"], .section-title');
    titles.forEach(function(el){
      var s = el.style;
      if(s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text'){
        s.setProperty('background', 'none', 'important');
        s.setProperty('-webkit-background-clip', 'initial', 'important');
        s.setProperty('-webkit-text-fill-color', '#0f172a', 'important');
        s.setProperty('color', '#0f172a', 'important');
      }
    });
    
    // Fix active tabs: buttons with gradient background need white text
    var buttons = document.querySelectorAll('button, .tab');
    buttons.forEach(function(btn){
      var cs2 = window.getComputedStyle(btn);
      var bgImg = cs2.backgroundImage || '';
      var bgColor = cs2.backgroundColor || '';
      
      if(bgImg.includes('linear-gradient') || 
         (btn.classList.contains('active') && bgImg.includes('gradient'))){
        // Active/gradient button → white text
        btn.style.setProperty('color', '#fff', 'important');
        btn.style.setProperty('-webkit-text-fill-color', '#fff', 'important');
      } else if(!bgImg.includes('gradient') && !btn.classList.contains('btn-primary')){
        // Inactive button → dark text
        if(btn.style.color === '' || cs2.color === 'rgb(255, 255, 255)' || cs2.color === 'rgba(255, 255, 255, 0.9)'){
          btn.style.setProperty('color', '#374151', 'important');
          btn.style.setProperty('-webkit-text-fill-color', '#374151', 'important');
        }
      }
    });
    
    // Fix layout width
    var main = document.querySelector('main');
    if(main){
      main.style.setProperty('max-width', '100%', 'important');
      var mainChild = main.firstElementChild;
      if(mainChild) mainChild.style.setProperty('max-width', '100%', 'important');
    }
  }
  
  // Run after DOM ready and on changes
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(fixLightTheme, 500); });
  } else {
    setTimeout(fixLightTheme, 500);
  }
  
  // MutationObserver for SPA navigation
  var debounce = null;
  var observer = new MutationObserver(function(){
    clearTimeout(debounce);
    debounce = setTimeout(fixLightTheme, 200);
  });
  observer.observe(document.documentElement, { 
    attributes: true, attributeFilter: ['data-theme'],
    childList: true, subtree: true
  });
  
  // Periodic check
  setInterval(fixLightTheme, 2000);
})();
</script>`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected!');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    // 1. Update CSS
    sftp.fastGet(REMOTE_CSS, LOCAL_CSS, (err2) => {
      if (err2) { console.error('CSS download error:', err2.message); conn.end(); return; }
      
      let css = fs.readFileSync(LOCAL_CSS, 'utf8');
      console.log(`CSS: ${(css.length/1024).toFixed(0)} KB`);
      
      // Append new patch (keep existing v6 patch)
      css += CSS_ADDON;
      fs.writeFileSync(LOCAL_CSS, css, 'utf8');
      
      sftp.fastPut(LOCAL_CSS, REMOTE_CSS, (err3) => {
        if (err3) { console.error('CSS upload error:', err3.message); conn.end(); return; }
        console.log('✅ CSS v7 patch appended');
        fs.unlinkSync(LOCAL_CSS);
        
        // 2. Update HTML (replace JS)
        sftp.fastGet(REMOTE_HTML, LOCAL_HTML, (err4) => {
          if (err4) { console.error('HTML download error:', err4.message); conn.end(); return; }
          
          let html = fs.readFileSync(LOCAL_HTML, 'utf8');
          
          // Remove old JS fix
          html = html.replace(/<script>\s*\/\/ Light Theme Text Visibility Fix[\s\S]*?<\/script>/, '');
          
          // Insert new JS fix
          html = html.replace('</body>', JS_UPDATE + '\n</body>');
          
          fs.writeFileSync(LOCAL_HTML, html, 'utf8');
          
          sftp.fastPut(LOCAL_HTML, REMOTE_HTML, (err5) => {
            if (err5) { console.error('HTML upload error:', err5.message); conn.end(); return; }
            console.log('✅ JS v2 fix updated in index.html');
            fs.unlinkSync(LOCAL_HTML);
            conn.end();
          });
        });
      });
    });
  });
});

conn.on('error', err => { console.error('Error:', err.message); });
conn.connect({ host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!', readyTimeout: 10000 });
