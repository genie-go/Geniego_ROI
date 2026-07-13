/**
 * XSS Sanitizer Utility
 * 
 * DOMPurify를 사용하여 강력한 XSS 방어를 제공하는 유틸리티
 * BUG-005 XSS 취약점 완전 수정을 위해 DOMPurify 도입
 * 
 * @module xssSanitizer
 */

import DOMPurify from 'dompurify';

// [282차 R3] SMIL href 하이재킹 차단 — sanitizeSvg 가 <animate> 를 허용하므로,
//   <a><animate attributeName="href" to="javascript:..."/> 로 링크를 탈취하는 SMIL 벡터를 봉쇄한다.
//   attributeName 이 href/xlink:href 를 겨냥하는 animate/set/animateTransform 요소를 제거(전역 1회 등록).
let _smilHookAdded = false;
function ensureSmilHook() {
    if (_smilHookAdded || typeof DOMPurify.addHook !== 'function') return;
    _smilHookAdded = true;
    DOMPurify.addHook('uponSanitizeElement', (node) => {
        try {
            const tag = (node.nodeName || '').toLowerCase();
            if (tag === 'animate' || tag === 'set' || tag === 'animatetransform' || tag === 'animatemotion') {
                const an = node.getAttribute && (node.getAttribute('attributeName') || node.getAttribute('attributename') || '');
                if (an && /^(xlink:)?href$/i.test(an.trim())) {
                    node.parentNode && node.parentNode.removeChild(node);
                }
            }
        } catch (e) { /* 방어적: 훅 오류는 무시(정상 살균은 계속) */ }
    });
}

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
 * SVG 마크업을 안전하게 정제합니다(크리에이티브 렌더용).
 * [282차 F-P1 저장형 XSS] AI 소재 SVG 는 사용자/클라 제공 필드(ad_design.svg)라
 *   `<svg><script>...</script>` 로 세션토큰(genie_token) 탈취가 가능했다. SVG 그래픽은 보존하되
 *   script/foreignObject/이벤트핸들러(on*)를 제거한다. sanitizeHtml 은 svg 태그를 불허하므로 전용 프로파일 사용.
 *
 * @param {string} svg - 정제할 SVG 문자열
 * @returns {string} script/이벤트핸들러가 제거된 SVG
 */
export function sanitizeSvg(svg) {
    if (!svg || typeof svg !== 'string') return '';
    ensureSmilHook();
    return DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        // [282차 R2 회귀수정] DOMPurify svg 프로파일은 plain <animate> 를 svgDisallowed 로 차단한다
        //   (animateColor/Motion/Transform 만 허용). AI 소재 샘플이 plain <animate>(펄스/페이드/라인드로우)를
        //   13곳 사용 → 정지이미지로 후퇴하던 것을 복구. 동일오리진 생성 SVG 이고 XSS 벡터(script/foreignObject/on*/js:)는
        //   아래에서 여전히 차단하므로 <animate> 허용은 안전.
        ADD_TAGS: ['animate'],
        FORBID_TAGS: ['script', 'foreignObject'],
        FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover'],
        ADD_ATTR: ['viewBox', 'preserveAspectRatio'],
    });
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
