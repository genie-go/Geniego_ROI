const fs = require('fs');
const path = 'd:/project/GeniegoROI/frontend/dist/index.html';
let html = fs.readFileSync(path, 'utf8');

// Find the cache bust section and replace it completely
const startMarker = '(function() {';
const endMarker = '// --- CRASH LOGGER ---';

const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const newCacheBust = `(function() {
        var v = "v5.8.0"; // fixed reload loop
        var stored = localStorage.getItem("roi_help_ver");
        var rc = parseInt(localStorage.getItem("roi_rc") || "0");
        // Safety: max 2 reloads
        if (rc > 2) {
          localStorage.removeItem("roi_rc");
          stored = v;
          localStorage.setItem("roi_help_ver", v);
        }
        if (stored !== v) {
          localStorage.setItem("roi_help_ver", v);
          localStorage.setItem("roi_rc", String(rc + 1));
          var tasks = [];
          if ('serviceWorker' in navigator) {
            tasks.push(navigator.serviceWorker.getRegistrations().then(function(regs) {
              return Promise.all(regs.map(function(r) { return r.unregister(); }));
            }));
          }
          if ('caches' in window) {
            tasks.push(caches.keys().then(function(names) {
              return Promise.all(names.map(function(n) { return caches.delete(n); }));
            }));
          }
          Promise.all(tasks).then(function() {
            window.location.reload(true);
          }).catch(function() {
            window.location.reload(true);
          });
          return;
        } else {
          localStorage.removeItem("roi_rc");
        }
        
        `;

html = html.substring(0, startIdx) + newCacheBust + html.substring(endIdx);

fs.writeFileSync(path, html, 'utf8');
console.log('Done! Cache bust replaced.');

// Verify
const check = fs.readFileSync(path, 'utf8');
console.log('Version:', check.match(/var v = "([^"]+)"/)?.[1]);
console.log('Has setTimeout?', check.includes('setTimeout'));
console.log('Has Phase 2?', check.includes('cache_phase'));
console.log('Lines:', check.split('\n').length);
