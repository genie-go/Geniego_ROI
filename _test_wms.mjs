// Test: Evaluate ko.js to see what wms resolves to
import ko from './frontend/src/i18n/locales/ko.js';

function deepGet(obj, path) {
    return path.split('.').reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
        obj
    );
}

const wmsVal = deepGet(ko, 'wms');
console.log('typeof wms:', typeof wmsVal);

if (typeof wmsVal === 'object' && wmsVal !== null) {
    const keys = Object.keys(wmsVal);
    console.log('wms keys count:', keys.length);
    console.log('First 10 keys:', keys.slice(0,10).join(', '));
    console.log('Has wmsHeroTitle:', 'wmsHeroTitle' in wmsVal);
    
    const heroVal = deepGet(ko, 'wms.wmsHeroTitle');
    console.log('wms.wmsHeroTitle:', heroVal);
} else {
    console.log('wms value:', wmsVal);
}
