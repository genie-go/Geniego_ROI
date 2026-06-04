<?php
declare(strict_types=1);

namespace Genie;

use PDO;

/**
 * 중앙 이메일 발송 게이트웨이 (190차 Sprint4 — 이메일 발송 인프라 통합).
 *
 * 종전: Alerting/NotifyEngine/EmailMarketing 이 제각각 raw @mail() 또는 mock_sent.
 * 본 클래스로 단일화 — 설정 해석(DB email_settings > env) 후:
 *   ① SMTP 설정 존재 → SmtpClient(AUTH+STARTTLS) 실발송
 *   ② 미설정 + GENIE_MAIL_USE_SENDMAIL=1 → PHP mail() (로컬 sendmail/postfix)
 *   ③ 그 외 → 정직한 미발송(ok=false, mode=unconfigured) — 가짜 성공 금지
 *
 * 모든 호출은 best-effort: 예외를 던지지 않고 결과 배열 반환.
 */
final class Mailer
{
    /**
     * @param array $opts pdo?:PDO, from?:string, from_name?:string, tenant?:string, config?:array
     *   - tenant: 지정 시 email_settings(테넌트 캠페인 SMTP) 조회. 미지정=플랫폼 트랜잭션(env).
     *   - config: SMTP 설정 직접 주입(host/port/user/pass/from/from_name) — DB/env 조회 생략.
     * @return array{ok:bool, mode:string, detail:string}
     */
    public static function send(string $to, string $subject, string $html, array $opts = []): array
    {
        $to = trim($to);
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'mode' => 'invalid', 'detail' => 'invalid recipient'];
        }

        if (!empty($opts['config']) && is_array($opts['config'])) {
            $cfg = array_merge(self::resolveConfig(null), $opts['config']);
            if (($cfg['secure'] ?? '') === '') $cfg['secure'] = ((int)($cfg['port'] ?? 587) === 465) ? 'ssl' : 'tls';
        } else {
            $pdo = $opts['pdo'] ?? null;
            $tenant = isset($opts['tenant']) ? (string)$opts['tenant'] : null;
            $cfg = self::resolveConfig($pdo instanceof PDO ? $pdo : null, $tenant);
        }
        if (!empty($opts['from']))      $cfg['from'] = (string)$opts['from'];
        if (!empty($opts['from_name'])) $cfg['from_name'] = (string)$opts['from_name'];

        // ① SMTP 경로
        if ($cfg['host'] !== '' && $cfg['from'] !== '') {
            try {
                $r = SmtpClient::send($cfg, $to, $subject, $html);
                return ['ok' => (bool)$r['ok'], 'mode' => 'smtp', 'detail' => (string)$r['detail']];
            } catch (\Throwable $e) {
                return ['ok' => false, 'mode' => 'smtp', 'detail' => 'smtp exception: ' . $e->getMessage()];
            }
        }

        // ② 로컬 sendmail 폴백 (명시적 opt-in)
        if (self::truthy(getenv('GENIE_MAIL_USE_SENDMAIL'))) {
            $from = $cfg['from'] !== '' ? $cfg['from'] : 'noreply@roi.genie-go.com';
            $headers  = 'From: ' . ($cfg['from_name'] ?: 'Geniego-ROI') . " <{$from}>\r\n";
            $headers .= "Reply-To: {$from}\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $enc = '=?UTF-8?B?' . base64_encode($subject) . '?=';
            $ok = @mail($to, $enc, $html, $headers);
            return ['ok' => (bool)$ok, 'mode' => 'sendmail', 'detail' => $ok ? 'queued via mail()' : 'mail() failed'];
        }

        // ③ 미설정 — 정직한 실패
        return ['ok' => false, 'mode' => 'unconfigured', 'detail' => 'no SMTP configured (email_settings/env)'];
    }

    /** 발송 가능 여부(설정 존재). UI/핸들러가 토큰 노출 폴백 결정에 사용. */
    public static function isConfigured(?PDO $pdo = null): bool
    {
        $cfg = self::resolveConfig($pdo);
        if ($cfg['host'] !== '' && $cfg['from'] !== '') return true;
        return self::truthy(getenv('GENIE_MAIL_USE_SENDMAIL'));
    }

    /**
     * 설정 해석. $tenant 지정 시 해당 테넌트 email_settings(캠페인 SMTP), 미지정 시 env(플랫폼 트랜잭션).
     * secret 은 반환하되 로깅 금지.
     */
    public static function resolveConfig(?PDO $pdo, ?string $tenant = null): array
    {
        $cfg = [
            'host' => '', 'port' => 587, 'user' => '', 'pass' => '',
            'from' => '', 'from_name' => 'Geniego-ROI', 'secure' => '', 'timeout' => 15,
        ];

        // 1) DB email_settings — 테넌트 지정 시에만(캠페인). 트랜잭션(tenant=null)은 env 전용.
        if ($pdo instanceof PDO && $tenant !== null && $tenant !== '') {
            try {
                $st = $pdo->prepare("SELECT * FROM email_settings WHERE tenant_id=? ORDER BY id DESC LIMIT 1");
                $st->execute([$tenant]);
                $row = $st->fetch(PDO::FETCH_ASSOC);
                if (is_array($row)) {
                    if (!empty($row['smtp_host']))  $cfg['host'] = (string)$row['smtp_host'];
                    if (!empty($row['smtp_port']))  $cfg['port'] = (int)$row['smtp_port'];
                    if (!empty($row['smtp_user']))  $cfg['user'] = (string)$row['smtp_user'];
                    if (!empty($row['smtp_pass']))  $cfg['pass'] = (string)$row['smtp_pass'];
                    if (!empty($row['from_email'])) $cfg['from'] = (string)$row['from_email'];
                    if (!empty($row['from_name']))  $cfg['from_name'] = (string)$row['from_name'];
                }
            } catch (\Throwable $e) { /* 테이블 부재 등 → env 폴백 */ }
        }

        // 2) env 폴백 (DB 미설정 필드만 채움)
        $env = fn(string $k) => ($v = getenv($k)) !== false && $v !== '' ? $v : null;
        if ($cfg['host'] === '' && ($v = $env('GENIE_SMTP_HOST'))) $cfg['host'] = $v;
        if (($v = $env('GENIE_SMTP_PORT'))) $cfg['port'] = (int)$v;
        if ($cfg['user'] === '' && ($v = $env('GENIE_SMTP_USER'))) $cfg['user'] = $v;
        if ($cfg['pass'] === '' && ($v = $env('GENIE_SMTP_PASS'))) $cfg['pass'] = $v;
        if ($cfg['from'] === '' && ($v = $env('SMTP_FROM') ?? $env('GENIE_SMTP_FROM'))) $cfg['from'] = $v;
        if (($v = $env('GENIE_SMTP_FROM_NAME'))) $cfg['from_name'] = $v;
        if (($v = $env('GENIE_SMTP_SECURE'))) $cfg['secure'] = $v;

        if ($cfg['secure'] === '') $cfg['secure'] = ($cfg['port'] === 465) ? 'ssl' : 'tls';
        return $cfg;
    }

    /** 단순 텍스트 블록을 브랜드 HTML 셸로 감싼다(재설정 메일 등 공용). XSS 방지 escape 는 호출측 책임. */
    public static function wrapHtml(string $title, string $bodyHtml, string $ctaText = '', string $ctaUrl = ''): string
    {
        $cta = '';
        if ($ctaText !== '' && $ctaUrl !== '') {
            $u = htmlspecialchars($ctaUrl, ENT_QUOTES, 'UTF-8');
            $t = htmlspecialchars($ctaText, ENT_QUOTES, 'UTF-8');
            $cta = "<div style=\"margin-top:24px\"><a href=\"{$u}\" style=\"background:#667eea;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600\">{$t}</a></div>";
        }
        $h = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
        return <<<HTML
<!DOCTYPE html><html><body style="font-family:Arial,'Apple SD Gothic Neo',sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#4f8ef7,#6366f1);color:#fff;padding:20px"><h2 style="margin:0">{$h}</h2></div>
    <div style="padding:24px;color:#333;line-height:1.6">{$bodyHtml}{$cta}</div>
    <div style="padding:14px 24px;color:#999;font-size:12px;border-top:1px solid #eee">© 2026 Geniego-ROI · 본 메일은 발신 전용입니다.</div>
  </div>
</body></html>
HTML;
    }

    private static function truthy($v): bool
    {
        $s = strtolower(trim((string)$v));
        return $s === '1' || $s === 'true' || $s === 'yes' || $s === 'on';
    }
}
