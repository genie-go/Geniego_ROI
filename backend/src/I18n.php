<?php
declare(strict_types=1);

namespace Genie;

use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * 백엔드 i18n 계층 [270차 신설]
 * ─────────────────────────────────────────────────────────────
 * 프론트 i18n 오버레이는 프론트 UI 라벨만 번역한다. 그러나 핸들러가 reason/action/message 등을
 * 하드코딩 한글로 "생성"해 반환하면, 프론트는 그 한글을 그대로 렌더 → 비한국어 UI 에서 누출된다.
 *
 * 이 계층은 핸들러가 X-Lang 헤더(프론트 apiClient 가 전역 전송)로 언어를 받아, 코드 기반 사전
 * (backend/data/backend_i18n.json)에서 현지어 문자열을 emit 하게 한다. 사전은 ko(SSOT)만 손으로
 * 채우면 tools/i18n_autofill.mjs(AUTOFILL_TARGET=backend)가 Claude 로 14개국 자동 번역·병합한다
 * (프론트 오버레이와 동일 자동화). 신규 서버측 사용자향 문자열도 ko 코드만 추가하면 자동 15국화.
 *
 * 사용:
 *   $lang = \Genie\I18n::lang($req);
 *   $msg  = \Genie\I18n::t('anom.action.roas', [], $lang);
 *   $tpl  = \Genie\I18n::t('anom.reason.bad', ['label'=>$l, 'dir'=>$d], $lang);
 */
final class I18n
{
    private static ?array $dict = null;

    /** 지원 15개국(프론트 LOCALES 와 일치). */
    public const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id','ar','es','fr','hi','pt','ru'];

    private static function load(): array
    {
        if (self::$dict === null) {
            $f = __DIR__ . '/../data/backend_i18n.json';
            $j = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
            self::$dict = is_array($j) ? $j : [];
        }
        return self::$dict;
    }

    /** 요청의 X-Lang(또는 X-Language) 헤더 → 지원 언어코드. 미식별 시 'ko'. */
    public static function lang(Request $req): string
    {
        $l = trim($req->getHeaderLine('X-Lang'));
        if ($l === '') $l = trim($req->getHeaderLine('X-Language'));
        if ($l === '') return 'ko';
        // zh_TW → zh-TW, 대소문자 정규화
        $l = str_replace('_', '-', $l);
        foreach (self::LANGS as $cand) {
            if (strcasecmp($cand, $l) === 0) return $cand;
        }
        // ko-KR → ko
        $base = strtolower(explode('-', $l)[0]);
        foreach (self::LANGS as $cand) {
            if (strcasecmp($cand, $base) === 0) return $cand;
        }
        return 'ko';
    }

    /**
     * 코드 → 현지어. 해석 순서: dict[lang][code] → dict[en][code] → dict[ko][code] → code.
     * $vars 로 {{key}} 치환.
     */
    public static function t(string $code, array $vars = [], string $lang = 'ko'): string
    {
        $d = self::load();
        $s = $d[$lang][$code] ?? ($d['en'][$code] ?? ($d['ko'][$code] ?? $code));
        if (!is_string($s)) $s = $code;
        foreach ($vars as $k => $v) {
            $s = str_replace('{{' . $k . '}}', (string)$v, $s);
        }
        return $s;
    }
}
