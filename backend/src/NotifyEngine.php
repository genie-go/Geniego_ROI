<?php
declare(strict_types=1);

namespace Genie;

/**
 * NotifyEngine  ─  쿠폰 발급 알림 (이메일 / SMS / 카카오 알림톡)
 *
 * 실서버 연동 준비 클래스.
 * 현재는 이메일만 PHP mail()로 실발송, SMS/카카오는 로그 기록 + 향후 외부 API 연동.
 */
final class NotifyEngine
{
    // ─────────────────────────────────────────────────────────────────────────
    // 메인 진입점
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * 쿠폰 발급 알림 발송
     *
     * @param array  $coupon  { code, plan, duration_days, expires_at, message }
     * @param array  $user    { id, email, name, phone? }
     * @param array  $channels  ['email'=>true, 'sms'=>false, 'kakao'=>false]
     */
    public static function sendCouponNotification(array $coupon, array $user, array $channels = []): array
    {
        // 기본 채널: 이메일만
        if (empty($channels)) {
            $channels = ['email' => true, 'sms' => false, 'kakao' => false];
        }

        $results = [];

        if (!empty($channels['email']) && !empty($user['email'])) {
            $results['email'] = self::sendEmail($coupon, $user);
        }
        if (!empty($channels['sms']) && !empty($user['phone'])) {
            $results['sms'] = self::sendSms($coupon, $user);
        }
        if (!empty($channels['kakao']) && !empty($user['email'])) {
            $results['kakao'] = self::sendKakao($coupon, $user);
        }

        return $results;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 이메일
    // ─────────────────────────────────────────────────────────────────────────

    private static function sendEmail(array $coupon, array $user): array
    {
        try {
            $to      = $user['email'];
            $name    = $user['name'] ?? '회원';
            $code    = $coupon['code']          ?? '';
            $plan    = strtoupper($coupon['plan'] ?? 'STARTER');
            $days    = (int)($coupon['duration_days'] ?? 0);
            $months  = self::daysToMonthLabel($days);
            $expires = isset($coupon['expires_at'])
                ? date('Y년 m월 d일', strtotime($coupon['expires_at']))
                : '';

            $subject = "🎁 [Geniego ROI] {$plan} 플랜 {$months} 무료 이용권이 발급되었습니다!";

            $body = self::emailHtml($name, $code, $plan, $months, $days, $expires);

            $headers  = "MIME-Version: 1.0\r\n";
            $headers .= "Content-type: text/html; charset=UTF-8\r\n";
            $headers .= "From: Geniego ROI <noreply@genie-go.com>\r\n";
            $headers .= "Reply-To: support@genie-go.com\r\n";

            $sent = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

            // DB 로그 저장
            self::logNotification('email', $user, $coupon, $sent ? 'sent' : 'failed');

            return ['ok' => $sent, 'channel' => 'email', 'to' => $to];
        } catch (\Throwable $e) {
            error_log('[NotifyEngine] email error: ' . $e->getMessage());
            return ['ok' => false, 'channel' => 'email', 'error' => $e->getMessage()];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SMS (향후 외부 API 연동 예정 - 현재 로그 전용)
    // ─────────────────────────────────────────────────────────────────────────

    private static function sendSms(array $coupon, array $user): array
    {
        try {
            $code   = $coupon['code']          ?? '';
            $plan   = strtoupper($coupon['plan'] ?? 'STARTER');
            $days   = (int)($coupon['duration_days'] ?? 0);
            $months = self::daysToMonthLabel($days);
            $phone  = $user['phone'] ?? '';
            $name   = $user['name']  ?? '회원';

            $text = "[Geniego ROI] {$name}님, {$plan} {$months} 무료쿠폰 발급!\n쿠폰코드: {$code}\n앱에서 즉시 사용 가능합니다.";

            // TODO: 실 SMS API 연동 (예: 알리고, 솔라피, 카카오비즈메시지)
            // $result = self::callSmsApi($phone, $text);

            self::logNotification('sms', $user, $coupon, 'queued', $text);

            return ['ok' => true, 'channel' => 'sms', 'to' => $phone, 'note' => 'queued_for_sms_api'];
        } catch (\Throwable $e) {
            error_log('[NotifyEngine] sms error: ' . $e->getMessage());
            return ['ok' => false, 'channel' => 'sms', 'error' => $e->getMessage()];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 카카오 알림톡 (향후 외부 API 연동 예정)
    // ─────────────────────────────────────────────────────────────────────────

    private static function sendKakao(array $coupon, array $user): array
    {
        try {
            $code   = $coupon['code']          ?? '';
            $plan   = strtoupper($coupon['plan'] ?? 'STARTER');
            $days   = (int)($coupon['duration_days'] ?? 0);
            $months = self::daysToMonthLabel($days);
            $name   = $user['name']  ?? '회원';

            $message = "[Geniego ROI]\n{$name}님 안녕하세요!\n{$plan} {$months} 무료 이용권이 발급되었습니다.\n\n쿠폰번호: {$code}\n\n지금 바로 사용해보세요!\nhttps://roi.genie-go.com";

            // TODO: 카카오 알림톡 API 연동 (비즈메시지 API)
            // $result = self::callKakaoApi($user, $message, $code);

            self::logNotification('kakao', $user, $coupon, 'queued', $message);

            return ['ok' => true, 'channel' => 'kakao', 'note' => 'queued_for_kakao_api'];
        } catch (\Throwable $e) {
            error_log('[NotifyEngine] kakao error: ' . $e->getMessage());
            return ['ok' => false, 'channel' => 'kakao', 'error' => $e->getMessage()];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 유틸
    // ─────────────────────────────────────────────────────────────────────────

    /** 일수 → 개월/년 레이블 */
    public static function daysToMonthLabel(int $days): string
    {
        if ($days >= 365) return ($days >= 730 ? (round($days / 365)) . '년' : '1년');
        if ($days >= 180) return '6개월';
        if ($days >= 90)  return '3개월';
        if ($days >= 60)  return '2개월';
        if ($days >= 30)  return '1개월';
        return "{$days}일";
    }

    /** months/years → days 변환 */
    public static function periodToDays(?int $months, ?int $years): int
    {
        if ($years && $years > 0) return $years * 365;
        if ($months && $months > 0) return $months * 30;
        return 30; // 기본 1개월
    }

    /** 알림 이력 DB 기록 */
    private static function logNotification(
        string $channel, array $user, array $coupon, string $status, string $body = ''
    ): void {
        try {
            $pdo = Db::pdo();
            $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);

            // 테이블 없으면 생성
            if ($driver === 'mysql') {
                $pdo->exec("CREATE TABLE IF NOT EXISTS coupon_notifications (
                    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    channel     VARCHAR(20) NOT NULL,
                    user_id     BIGINT UNSIGNED NULL,
                    email       VARCHAR(255) NULL,
                    coupon_code VARCHAR(50) NULL,
                    status      VARCHAR(20) NOT NULL DEFAULT 'sent',
                    body        TEXT NULL,
                    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS coupon_notifications (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel     TEXT NOT NULL,
                    user_id     INTEGER NULL,
                    email       TEXT NULL,
                    coupon_code TEXT NULL,
                    status      TEXT NOT NULL DEFAULT 'sent',
                    body        TEXT NULL,
                    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
                )");
            }

            $pdo->prepare("INSERT INTO coupon_notifications
                (channel, user_id, email, coupon_code, status, body)
                VALUES (?,?,?,?,?,?)")
                ->execute([
                    $channel,
                    $user['id'] ?? null,
                    $user['email'] ?? null,
                    $coupon['code'] ?? null,
                    $status,
                    $body ?: null,
                ]);
        } catch (\Throwable $e) {
            error_log('[NotifyEngine] log failed: ' . $e->getMessage());
        }
    }

    /** 이메일 HTML 본문 */
    private static function emailHtml(
        string $name, string $code, string $plan, string $months, int $days, string $expires
    ): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>Geniego ROI 쿠폰 발급</title></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1f2e,#0f1117);border:1px solid rgba(79,142,247,0.2);border-radius:16px;overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#4f8ef7,#6366f1);padding:30px 40px;text-align:center;">
        <div style="font-size:32px;">🎁</div>
        <h1 style="color:#fff;margin:10px 0 5px;font-size:22px;font-weight:800;">무료 이용권이 발급되었습니다!</h1>
        <p style="color:rgba(255,255,255,0.8);margin:0;font-size:14px;">Geniego ROI에서 특별한 선물을 드립니다.</p>
      </td></tr>
      <tr><td style="padding:40px;">
        <p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0 0 24px;">안녕하세요, <strong style="color:#4f8ef7;">{$name}</strong>님!</p>
        <div style="background:rgba(79,142,247,0.08);border:1.5px solid rgba(79,142,247,0.3);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
          <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">쿠폰코드</div>
          <div style="color:#4f8ef7;font-size:28px;font-weight:900;letter-spacing:3px;font-family:monospace;">{$code}</div>
          <div style="margin-top:12px;display:inline-block;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);border-radius:6px;padding:4px 14px;">
            <span style="color:#4ade80;font-size:13px;font-weight:700;">{$plan} 플랜 {$months} 이용권</span>
          </div>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr>
            <td style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px 16px;width:48%;">
              <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-bottom:4px;">이용 기간</div>
              <div style="color:#fff;font-size:15px;font-weight:700;">{$months} ({$days}일)</div>
            </td>
            <td style="width:4%;"></td>
            <td style="background:rgba(255,255,255,0.04);border-radius:8px;padding:12px 16px;width:48%;">
              <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-bottom:4px;">만료일</div>
              <div style="color:#fff;font-size:15px;font-weight:700;">{$expires}</div>
            </td>
          </tr>
        </table>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="https://roi.genie-go.com/my-coupons" style="display:inline-block;background:linear-gradient(135deg,#4f8ef7,#6366f1);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:800;font-size:15px;">보유쿠폰 확인 →</a>
        </div>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;margin:0;">이 이메일은 Geniego ROI에서 자동 발송된 알림입니다.<br>문의: support@genie-go.com</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
HTML;
    }
}
