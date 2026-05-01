/**
 * 라이선스 키 유틸리티
 * BUG-003 수정: 라이선스 키 형식 하드코딩 제거
 * 
 * 라이선스 키 형식 검증, 생성, 포맷팅을 중앙 집중화합니다.
 */

/**
 * 라이선스 키 형식 상수
 */
export const LICENSE_KEY_FORMAT = {
    // 기본 형식: GENIE-XXXX-XXXX-XXXX-XXXX
    PATTERN: /^GENIE-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    PREFIX: 'GENIE',
    SEPARATOR: '-',
    SEGMENT_LENGTH: 4,
    SEGMENT_COUNT: 4,
    TOTAL_LENGTH: 24, // GENIE-XXXX-XXXX-XXXX-XXXX (5 + 1 + 4 + 1 + 4 + 1 + 4 + 1 + 4)

    // 플레이스홀더
    PLACEHOLDER: 'GENIE-XXXX-XXXX-XXXX-XXXX',
    EXAMPLE: 'GENIE-A1B2-C3D4-E5F6-G7H8',
};

/**
 * 라이선스 키 형식이 유효한지 검증합니다.
 * 
 * @param {string} key - 검증할 라이선스 키
 * @returns {boolean} 유효하면 true, 아니면 false
 */
export function isValidLicenseKey(key) {
    if (!key || typeof key !== 'string') {
        return false;
    }

    return LICENSE_KEY_FORMAT.PATTERN.test(key.trim().toUpperCase());
}

/**
 * 라이선스 키를 표준 형식으로 포맷팅합니다.
 * 
 * @param {string} key - 포맷팅할 라이선스 키 (구분자 없이 입력 가능)
 * @returns {string} 포맷팅된 라이선스 키 또는 빈 문자열
 */
export function formatLicenseKey(key) {
    if (!key || typeof key !== 'string') {
        return '';
    }

    // 구분자 제거 및 대문자 변환
    const cleaned = key.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    // GENIE 접두사 확인
    if (!cleaned.startsWith(LICENSE_KEY_FORMAT.PREFIX)) {
        return '';
    }

    // GENIE 제거 후 나머지 부분
    const segments = cleaned.substring(LICENSE_KEY_FORMAT.PREFIX.length);

    // 16자 (4 segments * 4 chars) 확인
    if (segments.length !== LICENSE_KEY_FORMAT.SEGMENT_LENGTH * LICENSE_KEY_FORMAT.SEGMENT_COUNT) {
        return '';
    }

    // 4자씩 분할하여 조합
    const formatted = LICENSE_KEY_FORMAT.PREFIX + LICENSE_KEY_FORMAT.SEPARATOR +
        segments.match(/.{1,4}/g).join(LICENSE_KEY_FORMAT.SEPARATOR);

    return formatted;
}

/**
 * 라이선스 키 입력 중 자동 포맷팅을 위한 함수
 * 
 * @param {string} input - 사용자 입력
 * @returns {string} 자동 포맷팅된 문자열
 */
export function autoFormatLicenseKey(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }

    // 영문 대문자와 숫자만 허용
    const cleaned = input.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    // GENIE 접두사 자동 추가
    let formatted = '';
    if (cleaned.length === 0) {
        return '';
    }

    // GENIE로 시작하지 않으면 추가
    const withPrefix = cleaned.startsWith(LICENSE_KEY_FORMAT.PREFIX)
        ? cleaned
        : LICENSE_KEY_FORMAT.PREFIX + cleaned;

    // GENIE 이후 부분만 추출
    const afterPrefix = withPrefix.substring(LICENSE_KEY_FORMAT.PREFIX.length);

    // 최대 16자까지만 (4 segments * 4 chars)
    const limited = afterPrefix.substring(0, LICENSE_KEY_FORMAT.SEGMENT_LENGTH * LICENSE_KEY_FORMAT.SEGMENT_COUNT);

    // 4자씩 구분자 추가
    if (limited.length > 0) {
        const segments = limited.match(/.{1,4}/g) || [];
        formatted = LICENSE_KEY_FORMAT.PREFIX + LICENSE_KEY_FORMAT.SEPARATOR + segments.join(LICENSE_KEY_FORMAT.SEPARATOR);
    } else {
        formatted = LICENSE_KEY_FORMAT.PREFIX + LICENSE_KEY_FORMAT.SEPARATOR;
    }

    return formatted;
}

/**
 * 라이선스 키 생성 (클라이언트 측 - 데모/테스트용)
 * 실제 프로덕션에서는 백엔드에서 생성해야 합니다.
 * 
 * @returns {string} 생성된 라이선스 키
 */
export function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];

    for (let i = 0; i < LICENSE_KEY_FORMAT.SEGMENT_COUNT; i++) {
        let segment = '';
        for (let j = 0; j < LICENSE_KEY_FORMAT.SEGMENT_LENGTH; j++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        segments.push(segment);
    }

    return LICENSE_KEY_FORMAT.PREFIX + LICENSE_KEY_FORMAT.SEPARATOR + segments.join(LICENSE_KEY_FORMAT.SEPARATOR);
}

/**
 * 라이선스 키를 마스킹합니다 (보안 표시용)
 * 
 * @param {string} key - 마스킹할 라이선스 키
 * @param {boolean} showLast - 마지막 세그먼트를 표시할지 여부
 * @returns {string} 마스킹된 라이선스 키
 */
export function maskLicenseKey(key, showLast = true) {
    if (!isValidLicenseKey(key)) {
        return '****-****-****-****';
    }

    const parts = key.split(LICENSE_KEY_FORMAT.SEPARATOR);

    if (showLast) {
        // GENIE-****-****-****-XXXX
        return `${parts[0]}-****-****-****-${parts[4]}`;
    } else {
        // GENIE-****-****-****-****
        return `${parts[0]}-****-****-****-****`;
    }
}

/**
 * 라이선스 키 검증 에러 메시지를 반환합니다.
 * 
 * @param {string} key - 검증할 라이선스 키
 * @param {string} lang - 언어 코드 (ko, en 등)
 * @returns {string|null} 에러 메시지 또는 null (유효한 경우)
 */
export function getLicenseKeyError(key, lang = 'ko') {
    if (!key || key.trim() === '') {
        return lang === 'ko' ? '라이선스 키를 입력해주세요.' : 'Please enter a license key.';
    }

    if (!isValidLicenseKey(key)) {
        return lang === 'ko'
            ? `올바른 형식이 아닙니다. (형식: ${LICENSE_KEY_FORMAT.PLACEHOLDER})`
            : `Invalid format. (Format: ${LICENSE_KEY_FORMAT.PLACEHOLDER})`;
    }

    return null;
}

export default {
    LICENSE_KEY_FORMAT,
    isValidLicenseKey,
    formatLicenseKey,
    autoFormatLicenseKey,
    generateLicenseKey,
    maskLicenseKey,
    getLicenseKeyError,
};
