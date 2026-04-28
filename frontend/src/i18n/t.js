/**
 * Module-level translation helper
 * ────────────────────────────────
 * Some JSX files use t() at module-level (outside React components)
 * for constants like CHANNEL_GROUPS. The React-based useI18n/useT hooks
 * cannot work at module level. This module provides a static t() function
 * that reads from the Korean locale as a fallback.
 */
import ko from './locales/ko.js';

const t = (key, fallback) => {
    if (typeof key !== 'string') return fallback || '';
    let val = key.split('.').reduce((o, k) => o?.[k], ko);
    // Fallback: try under "pages." prefix
    if (val === undefined && !key.startsWith('pages.')) {
        val = ('pages.' + key).split('.').reduce((o, k) => o?.[k], ko);
    }
    return val || fallback || key;
};

export default t;
