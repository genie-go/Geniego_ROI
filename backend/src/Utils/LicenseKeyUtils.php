<?php
/**
 * 라이선스 키 유틸리티
 * BUG-003 수정: 라이선스 키 형식 하드코딩 제거
 * 
 * 라이선스 키 형식 검증, 생성, 포맷팅을 중앙 집중화합니다.
 */

namespace GeniegoROI\Utils;

class LicenseKeyUtils
{
    /**
     * 라이선스 키 형식 상수
     */
    const PREFIX = 'GENIE';
    const SEPARATOR = '-';
    const SEGMENT_LENGTH = 4;
    const SEGMENT_COUNT = 4;
    const PATTERN = '/^GENIE-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/';
    const PLACEHOLDER = 'GENIE-XXXX-XXXX-XXXX-XXXX';
    const EXAMPLE = 'GENIE-A1B2-C3D4-E5F6-G7H8';

    /**
     * 라이선스 키 형식이 유효한지 검증합니다.
     * 
     * @param string|null $key 검증할 라이선스 키
     * @return bool 유효하면 true, 아니면 false
     */
    public static function isValid(?string $key): bool
    {
        if (empty($key)) {
            return false;
        }

        return preg_match(self::PATTERN, strtoupper(trim($key))) === 1;
    }

    /**
     * 라이선스 키를 생성합니다.
     * 
     * @return string 생성된 라이선스 키
     */
    public static function generate(): string
    {
        $raw = strtoupper(bin2hex(random_bytes(8)));
        $segments = str_split($raw, self::SEGMENT_LENGTH);
        
        return self::PREFIX . self::SEPARATOR . implode(self::SEPARATOR, $segments);
    }

    /**
     * 라이선스 키를 표준 형식으로 포맷팅합니다.
     * 
     * @param string|null $key 포맷팅할 라이선스 키
     * @return string 포맷팅된 라이선스 키 또는 빈 문자열
     */
    public static function format(?string $key): string
    {
        if (empty($key)) {
            return '';
        }

        // 구분자 제거 및 대문자 변환
        $cleaned = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $key));

        // GENIE 접두사 확인
        if (strpos($cleaned, self::PREFIX) !== 0) {
            return '';
        }

        // GENIE 제거 후 나머지 부분
        $segments = substr($cleaned, strlen(self::PREFIX));

        // 16자 (4 segments * 4 chars) 확인
        if (strlen($segments) !== self::SEGMENT_LENGTH * self::SEGMENT_COUNT) {
            return '';
        }

        // 4자씩 분할하여 조합
        $parts = str_split($segments, self::SEGMENT_LENGTH);
        return self::PREFIX . self::SEPARATOR . implode(self::SEPARATOR, $parts);
    }

    /**
     * 라이선스 키를 마스킹합니다 (보안 표시용)
     * 
     * @param string|null $key 마스킹할 라이선스 키
     * @param bool $showLast 마지막 세그먼트를 표시할지 여부
     * @return string 마스킹된 라이선스 키
     */
    public static function mask(?string $key, bool $showLast = true): string
    {
        if (!self::isValid($key)) {
            return '****-****-****-****';
        }

        $parts = explode(self::SEPARATOR, $key);

        if ($showLast) {
            // GENIE-****-****-****-XXXX
            return $parts[0] . '-****-****-****-' . $parts[4];
        } else {
            // GENIE-****-****-****-****
            return $parts[0] . '-****-****-****-****';
        }
    }

    /**
     * 라이선스 키 검증 에러 메시지를 반환합니다.
     * 
     * @param string|null $key 검증할 라이선스 키
     * @param string $lang 언어 코드 (ko, en 등)
     * @return string|null 에러 메시지 또는 null (유효한 경우)
     */
    public static function getError(?string $key, string $lang = 'ko'): ?string
    {
        if (empty($key) || trim($key) === '') {
            return $lang === 'ko' ? '라이선스 키를 입력해주세요.' : 'Please enter a license key.';
        }

        if (!self::isValid($key)) {
            $format = self::PLACEHOLDER;
            return $lang === 'ko'
                ? "올바른 형식이 아닙니다. (형식: {$format})"
                : "Invalid format. (Format: {$format})";
        }

        return null;
    }

    /**
     * 라이선스 키 형식 정보를 배열로 반환합니다.
     * 
     * @return array 형식 정보
     */
    public static function getFormatInfo(): array
    {
        return [
            'prefix' => self::PREFIX,
            'separator' => self::SEPARATOR,
            'segment_length' => self::SEGMENT_LENGTH,
            'segment_count' => self::SEGMENT_COUNT,
            'pattern' => self::PATTERN,
            'placeholder' => self::PLACEHOLDER,
            'example' => self::EXAMPLE,
        ];
    }
}
