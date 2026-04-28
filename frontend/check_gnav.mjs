import ko from './src/i18n/locales/ko.js';
console.log('gNav type:', typeof ko.gNav);
console.log('gNav.crmLabel:', ko.gNav?.crmLabel);
console.log('gNav.dashboardLabel:', ko.gNav?.dashboardLabel);
console.log('top-level crmLabel:', ko.crmLabel);
console.log('gNav keys count:', Object.keys(ko.gNav || {}).length);
// Check if crmLabel ended up at top level
const topKeys = Object.keys(ko).filter(k => k.endsWith('Label'));
console.log('Top-level *Label keys:', topKeys.slice(0, 10));
