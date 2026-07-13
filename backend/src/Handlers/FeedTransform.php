<?php
/**
 * FeedTransform — 채널 피드 변환 엔진(순수 함수·DB 무의존·테스트 가능). [282차 R3 신설]
 *
 * 배경: FeedTemplate 은 매핑 규칙을 저장/승인/발행만 하고 **실제 피드 출력에 적용하지 않는**
 *   inert 껍데기였다(전수감사 G1). 이 엔진이 발행된 스펙을 상품 페이로드에 실제로 적용한다.
 *
 * 설계: 선언형 스펙(JSON) — 필드별 [source|value|template] → 순서있는 transform 파이프라인.
 *   ★안전: eval/코드실행 없음. transform op 화이트리스트만 허용(정규식은 검증 후 실행·실패 시 원복).
 *   경쟁사(ChannelAdvisor/Linnworks/Playauto) 설정형 피드 규칙엔진 이상의 op 폭을 목표.
 *
 * 스펙 정규형:
 *   [ 'version'=>2, 'fields'=>[
 *       [ 'target'=>'price', 'source'=>'price', 'required'=>false, 'default'=>null,
 *         'transforms'=>[ ['op'=>'multiply','by'=>1.1], ['op'=>'round','to'=>10] ] ],
 *       [ 'target'=>'item_name', 'template'=>'[{brand}] {title}', 'transforms'=>[['op'=>'truncate','len'=>100]] ],
 *       [ 'target'=>'brand', 'value'=>'GenieGo' ],
 *   ] ]
 */

declare(strict_types=1);

namespace Genie\Handlers;

final class FeedTransform
{
    /** 지원 transform op 목록(프론트 에디터 노출·검증용). */
    public const OPS = [
        'trim', 'upper', 'lower', 'ucfirst', 'truncate', 'prefix', 'suffix', 'replace',
        'regex_replace', 'strip_html', 'map', 'number_format', 'multiply', 'divide', 'add',
        'subtract', 'round', 'ceil', 'floor', 'pad', 'substring', 'default_if_empty',
        'date_format', 'concat', 'coalesce', 'clamp',
    ];

    /**
     * 스펙을 상품 배열에 적용. 반환: ['mapped'=>[target=>value], 'errors'=>[], 'warnings'=>[]].
     * mapped 는 호출측이 상품에 오버레이(canonical=price/title 등이면 실전송에 즉시 반영).
     */
    public static function apply(array $spec, array $product): array
    {
        $fields = isset($spec['fields']) && is_array($spec['fields']) ? $spec['fields'] : [];
        $mapped = []; $errors = []; $warnings = [];
        foreach ($fields as $f) {
            if (!is_array($f)) continue;
            $target = trim((string)($f['target'] ?? ''));
            if ($target === '') continue;

            // ── 기저값 결정: value(상수) > template(보간) > source(상품필드) ──
            if (array_key_exists('value', $f) && $f['value'] !== null) {
                $val = $f['value'];
            } elseif (!empty($f['template'])) {
                $val = self::interpolate((string)$f['template'], $product);
            } else {
                $src = trim((string)($f['source'] ?? $target));
                $val = $product[$src] ?? null;
            }

            // ── transform 파이프라인 ──
            foreach ((array)($f['transforms'] ?? []) as $tr) {
                if (!is_array($tr) || empty($tr['op'])) continue;
                $op = (string)$tr['op'];
                if (!in_array($op, self::OPS, true)) { $warnings[] = "unknown_op:{$op}@{$target}"; continue; }
                try { $val = self::applyOp($op, $val, $tr, $product); }
                catch (\Throwable $e) { $warnings[] = "op_failed:{$op}@{$target}"; }
            }

            // ── 기본값/필수 검사 ──
            $empty = ($val === null || $val === '' || (is_array($val) && count($val) === 0));
            if ($empty && array_key_exists('default', $f) && $f['default'] !== null) { $val = $f['default']; $empty = false; }
            if (!empty($f['required']) && $empty) { $errors[] = $target; continue; }
            if ($empty && empty($f['keep_empty'])) continue; // 빈 값은 오버레이 생략(기존 값 보존)

            $mapped[$target] = $val;
        }
        return ['mapped' => $mapped, 'errors' => array_values(array_unique($errors)), 'warnings' => array_values(array_unique($warnings))];
    }

    /** '{field}' 토큰을 상품값으로 치환(중첩 없음·단일 패스). */
    private static function interpolate(string $tpl, array $product): string
    {
        return (string)preg_replace_callback('/\{([a-zA-Z0-9_\.]+)\}/', function ($m) use ($product) {
            $k = $m[1];
            return isset($product[$k]) && !is_array($product[$k]) ? (string)$product[$k] : '';
        }, $tpl);
    }

    /** 단일 transform op 적용. 예외는 상위에서 catch(원본 유지). */
    private static function applyOp(string $op, $val, array $a, array $product)
    {
        $s = is_scalar($val) ? (string)$val : '';
        switch ($op) {
            case 'trim':    return trim($s);
            case 'upper':   return mb_strtoupper($s, 'UTF-8');
            case 'lower':   return mb_strtolower($s, 'UTF-8');
            case 'ucfirst': return $s === '' ? '' : mb_strtoupper(mb_substr($s, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($s, 1, null, 'UTF-8');
            case 'truncate': {
                $len = max(0, (int)($a['len'] ?? 100));
                if (mb_strlen($s, 'UTF-8') <= $len) return $s;
                $suf = (string)($a['suffix'] ?? '');
                return mb_substr($s, 0, max(0, $len - mb_strlen($suf, 'UTF-8')), 'UTF-8') . $suf;
            }
            case 'prefix':  return (string)($a['text'] ?? '') . $s;
            case 'suffix':  return $s . (string)($a['text'] ?? '');
            case 'replace': return str_replace((string)($a['from'] ?? ''), (string)($a['to'] ?? ''), $s);
            case 'regex_replace': {
                $pat = (string)($a['pattern'] ?? '');
                if ($pat === '' || strlen($pat) > 500) return $s;
                $delim = '~' . str_replace('~', '\\~', $pat) . '~u';
                if (@preg_match($delim, '') === false) return $s; // 잘못된 정규식 → 원복
                $out = @preg_replace($delim, (string)($a['replacement'] ?? ''), $s);
                return $out === null ? $s : $out;
            }
            case 'strip_html': { $s = (string)preg_replace('#<(script|style)\b[^>]*>.*?</\1>#is', '', $s); return trim((string)preg_replace('/\s+/u', ' ', strip_tags($s))); }
            case 'map': {
                $table = (array)($a['table'] ?? []);
                if (array_key_exists($s, $table)) return $table[$s];
                $fb = $a['fallback'] ?? 'keep';
                return $fb === 'keep' ? $val : ($fb === 'empty' ? '' : $fb);
            }
            case 'number_format': return number_format((float)$val, (int)($a['decimals'] ?? 0), (string)($a['dec_point'] ?? '.'), (string)($a['thousands_sep'] ?? ''));
            case 'multiply': return (float)$val * (float)($a['by'] ?? 1);
            case 'divide':   { $by = (float)($a['by'] ?? 1); return $by == 0.0 ? $val : (float)$val / $by; }
            case 'add':      return (float)$val + (float)($a['by'] ?? 0);
            case 'subtract': return (float)$val - (float)($a['by'] ?? 0);
            case 'round':    { $to = (float)($a['to'] ?? 1); return $to <= 0 ? round((float)$val) : round((float)$val / $to) * $to; }
            case 'ceil':     { $to = (float)($a['to'] ?? 1); return $to <= 0 ? ceil((float)$val) : ceil((float)$val / $to) * $to; }
            case 'floor':    { $to = (float)($a['to'] ?? 1); return $to <= 0 ? floor((float)$val) : floor((float)$val / $to) * $to; }
            case 'clamp':    { $v = (float)$val; if (isset($a['min'])) $v = max((float)$a['min'], $v); if (isset($a['max'])) $v = min((float)$a['max'], $v); return $v; }
            case 'pad':      { $len = (int)($a['len'] ?? 0); $ch = (string)($a['char'] ?? '0'); $side = (string)($a['side'] ?? 'left'); return str_pad($s, $len, $ch === '' ? '0' : $ch, $side === 'right' ? STR_PAD_RIGHT : STR_PAD_LEFT); }
            case 'substring': { $start = (int)($a['start'] ?? 0); $len = isset($a['len']) ? (int)$a['len'] : null; return $len === null ? mb_substr($s, $start, null, 'UTF-8') : mb_substr($s, $start, $len, 'UTF-8'); }
            case 'default_if_empty': return ($s === '' || $val === null) ? ($a['value'] ?? '') : $val;
            case 'date_format': { $ts = is_numeric($s) ? (int)$s : strtotime($s); return $ts === false ? $s : gmdate((string)($a['format'] ?? 'Y-m-d'), $ts); }
            case 'concat':   { $field = (string)($a['field'] ?? ''); $sep = (string)($a['sep'] ?? ' '); $other = $field !== '' && isset($product[$field]) && !is_array($product[$field]) ? (string)$product[$field] : (string)($a['text'] ?? ''); return $s === '' ? $other : $s . $sep . $other; }
            case 'coalesce': { foreach ((array)($a['fields'] ?? []) as $fld) { if (isset($product[$fld]) && $product[$fld] !== '' && !is_array($product[$fld])) return $product[$fld]; } return ($s !== '') ? $val : ($a['default'] ?? ''); }
        }
        return $val;
    }
}
