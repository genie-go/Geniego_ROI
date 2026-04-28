// Load locale module as Vite would (ESM)
delete require.cache[require.resolve('./src/i18n/locales/ko.js')];
const ko = require('./src/i18n/locales/ko.js');
const locale = ko.default || ko;

// Check pages.performance
const pp = locale.pages && locale.pages.performance;
if (pp) {
  console.log('pages.performance exists, keys:', Object.keys(pp).length);
  console.log('Sample keys:', Object.keys(pp).slice(0, 5));
  console.log('tabGuide:', pp.tabGuide);
  console.log('pageTitle:', pp.pageTitle);
  console.log('team:', pp.team);
} else {
  console.log('pages.performance MISSING');
  if (locale.pages) {
    console.log('pages keys:', Object.keys(locale.pages).slice(0, 20));
  }
}

// Check root performance  
if (locale.performance) {
  console.log('\nroot performance exists, keys:', Object.keys(locale.performance).length);
  console.log('tabGuide:', locale.performance.tabGuide);
}
