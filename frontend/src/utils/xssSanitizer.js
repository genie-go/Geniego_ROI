/**
 * XSS Sanitizer Utility
 * 
 * DOMPurify를 사용하여 강력한 XSS 방어를 제공하는 유틸리티
 * BUG-005 XSS 취약점 완전 수정을 위해 DOMPurify 도입
 * 
 * @module xssSanitizer
 */

import DOMPurify from 'dompurify';

/**
 * HTML 문자열에서 위험한 태그와 속성을 제거합니다.
 * DOMPurify를 사용하여 안전하게 정제합니다.
 * 
 * @param {string} html - 정제할 HTML 문자열
 * @returns {string} 정제된 HTML 문자열
 */
export function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';

    // DOMPurify 설정: 안전한 태그와 속성만 허용
    const config = {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 'a', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
        ],
        ALLOWED_ATTR: [
            'href', 'title', 'target', 'rel', 'class', 'id', 'style', 'src', 'alt', 'width', 'height'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        KEEP_CONTENT: true,
        RETURN_TRUSTED_TYPE: false
    };

    return DOMPurify.sanitize(html, config);
}

/**
 * 텍스트를 HTML 엔티티로 이스케이프합니다.
 * 
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
export function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';

    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * 안전한 HTML 속성 값을 생성합니다.
 * 
 * @param {string} value - 속성 값
 * @returns {string} 안전한 속성 값
 */
export function sanitizeAttribute(value) {
    if (!value || typeof value !== 'string') return '';

    // 따옴표와 위험한 문자 제거
    return value
        .replace(/["'`]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
}

/**
 * URL이 안전한지 검증합니다.
 * 
 * @param {string} url - 검증할 URL
 * @returns {boolean} 안전하면 true, 위험하면 false
 */
export function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;

    const dangerous = /^(javascript|data|vbscript):/i;
    return !dangerous.test(url.trim());
}

/**
 * 안전한 URL을 반환합니다. 위험한 URL은 '#'으로 대체합니다.
 * 
 * @param {string} url - 검증할 URL
 * @returns {string} 안전한 URL
 */
export function getSafeUrl(url) {
    return isSafeUrl(url) ? url : '#';
}

/**
 * React dangerouslySetInnerHTML에 사용할 안전한 객체를 생성합니다.
 * 
 * @param {string} html - HTML 문자열
 * @returns {object} { __html: sanitizedHtml }
 */
export function createSafeHtml(html) {
    return { __html: sanitizeHtml(html) };
}

/**
 * 허용된 태그만 남기고 나머지는 제거합니다.
 * 
 * @param {string} html - HTML 문자열
 * @param {string[]} allowedTags - 허용할 태그 배열 (예: ['p', 'br', 'strong', 'em'])
 * @returns {string} 필터링된 HTML
 */
export function sanitizeWithWhitelist(html, allowedTags = ['p', 'br', 'strong', 'em', 'u', 'a', 'span', 'div']) {
    if (!html || typeof html !== 'string') return '';

    // 먼저 기본 sanitize 적용
    let cleaned = sanitizeHtml(html);

    // 허용되지 않은 태그 제거
    const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    cleaned = cleaned.replace(tagPattern, (match, tagName) => {
        if (allowedTags.includes(tagName.toLowerCase())) {
            return match;
        }
        return '';
    });

    return cleaned;
}

/**
 * XSS 공격 패턴을 감지합니다.
 * 
 * @param {string} input - 검사할 입력 문자열
 * @returns {boolean} XSS 패턴이 감지되면 true
 */
export function detectXss(input) {
    if (!input || typeof input !== 'string') return false;

    const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /eval\(/i,
        /expression\(/i,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * 기본 export: sanitizeHtml
 */
export default sanitizeHtml;
