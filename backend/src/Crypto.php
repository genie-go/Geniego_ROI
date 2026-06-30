<?php
declare(strict_types=1);

namespace Genie;

/**
 * 자격증명 암호화 (202차 — 은행급).
 *
 * channel_credential.key_value 등 민감 비밀을 AES-256-GCM(인증 암호화)으로 저장/복호화한다.
 * - 저장: encrypt() → "enc:v1:" + base64(iv|tag|ciphertext). GCM 태그로 변조 감지.
 * - 읽기: decrypt() → "enc:v1:" 접두면 복호화, 아니면 평문 그대로 반환(기존 평문 행 하위호환).
 * - 키: 환경변수 CRED_ENC_KEY 우선, 없으면 app_setting('cred_enc_key')에 1회 생성·보관(안정).
 *   둘 다 불가 시 DB명 파생 키(기능 유지·약함, 로그). 키 회전 시 재암호화 필요.
 *
 * ★ 평문 fallback: 암호화 실패(openssl 부재 등) 시 원문 저장 → decrypt passthrough 로 무중단.
 */
final class Crypto
{
    private const PREFIX = 'enc:v1:';
    private static ?string $key = null;
    /** [255차 심화] 버전별 KEK 캐시(무파괴 키회전). v1=기존 cred_enc_key, v2+=app_setting cred_kek_vN. */
    private static array $verKeys = [];

    /** 현재 활성 키 버전(신규 암호화에 사용). 미설정=v1(기존 동작 보존). */
    private static function activeVersion(): string
    {
        try { $pdo = Db::pdo(); $s = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey='cred_kek_active' LIMIT 1"); $s->execute(); $v = $s->fetchColumn(); if ($v) return (string)$v; }
        catch (\Throwable $e) {}
        return 'v1';
    }

    /** 버전별 KEK 조회. v1=기존 key()(cred_enc_key·하위호환 불변), v2+=app_setting cred_kek_vN. */
    private static function keyForVersion(string $ver): string
    {
        if ($ver === '' || $ver === 'v1') return self::key();
        if (isset(self::$verKeys[$ver])) return self::$verKeys[$ver];
        try { $pdo = Db::pdo(); $s = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey=? LIMIT 1"); $s->execute(['cred_kek_' . $ver]); $v = $s->fetchColumn();
            if ($v) return self::$verKeys[$ver] = self::normalizeKey((string)$v); }
        catch (\Throwable $e) {}
        return self::key(); // 미등록 버전 → 현재키 폴백(graceful)
    }

    /** 레거시 파생 키(앱 부팅 초기·DB 미가용 시 사용했던 폴백). 이중키 복호화 호환용. */
    private static function derivedKey(): string
    {
        return self::normalizeKey('genie-roi-cred-' . (getenv('GENIE_DB_NAME') ?: 'geniego_roi'));
    }

    private static function key(): string
    {
        if (self::$key !== null) return self::$key;
        $env = getenv('CRED_ENC_KEY');
        if (is_string($env) && $env !== '') { return self::$key = self::normalizeKey($env); }
        try {
            $pdo = Db::pdo();
            // 플랫폼 정본 app_setting 스키마(skey/svalue) 사용(196차 smtp 등과 공유).
            Db::ensureAppSetting($pdo); // SSOT: 전역 KV 스토어 단일 정의(Db::ensureAppSetting)
            $sel = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey='cred_enc_key' LIMIT 1");
            $sel->execute();
            $v = $sel->fetchColumn();
            if ($v) { return self::$key = self::normalizeKey((string)$v); }
            $gen = base64_encode(random_bytes(32));
            $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            if ($driver === 'mysql') {
                $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES('cred_enc_key',?,?) ON DUPLICATE KEY UPDATE svalue=svalue")->execute([$gen, gmdate('c')]);
            } else {
                $pdo->prepare("INSERT OR IGNORE INTO app_setting(skey,svalue,updated_at) VALUES('cred_enc_key',?,?)")->execute([$gen, gmdate('c')]);
            }
            $sel->execute();
            $stored = (string)($sel->fetchColumn() ?: $gen);
            return self::$key = self::normalizeKey($stored);
        } catch (\Throwable $e) {
            error_log('[Crypto] key fallback (derived): ' . $e->getMessage());
            return self::$key = self::derivedKey();
        }
    }

    /** base64 32바이트면 그대로, 아니면 sha256 으로 32바이트 유도. */
    private static function normalizeKey(string $raw): string
    {
        $d = base64_decode($raw, true);
        if ($d !== false && strlen($d) === 32) return $d;
        return hash('sha256', $raw, true);
    }

    public static function isEncrypted(?string $v): bool
    {
        // [255차 심화] 버전태그 봉투(enc:v1:·enc:v2: …) 전부 인식(무파괴 키회전).
        return is_string($v) && preg_match('/^enc:v\d+:/', $v) === 1;
    }

    /**
     * 공개 식별자(예: 1st-party pixel_id) 무결성 서명용 HMAC 태그.
     * cred 키에서 용도분리(purpose) 파생 서브키를 써서 키 재사용을 피한다.
     * 비밀(키)을 노출하지 않고, 위변조된 식별자를 서버측에서 거부하는 데 쓴다.
     * 검증 시 반드시 hash_equals 로 비교(타이밍 공격 방어).
     */
    public static function hmacTag(string $data, string $purpose = 'general', int $len = 16): string
    {
        $subKey = hash_hmac('sha256', 'purpose:' . $purpose, self::key(), true);
        $hex = hash_hmac('sha256', $data, $subKey);
        $len = max(8, min(64, $len));
        return substr($hex, 0, $len);
    }

    /** 평문 → "enc:v1:..." (실패 시 평문 그대로 — decrypt 가 passthrough). */
    public static function encrypt(?string $plain): string
    {
        $plain = (string)$plain;
        if ($plain === '') return '';
        if (self::isEncrypted($plain)) return $plain; // 이미 암호문
        if (!function_exists('openssl_encrypt')) return $plain;
        try {
            // [255차 심화] 활성 버전 KEK 로 암호화·버전태그 봉투(키회전 후 신규 쓰기만 신버전·기존 암호문 불변).
            $ver = self::activeVersion();
            $iv = random_bytes(12);
            $tag = '';
            $ct = openssl_encrypt($plain, 'aes-256-gcm', self::keyForVersion($ver), OPENSSL_RAW_DATA, $iv, $tag, '', 16);
            if ($ct === false) return $plain;
            return 'enc:' . $ver . ':' . base64_encode($iv . $tag . $ct);
        } catch (\Throwable $e) {
            return $plain;
        }
    }

    /**
     * [255차 심화] KEK 무파괴 회전 — 신규 버전 KEK 생성·활성화. 기존 암호문(enc:vN)은 해당 버전 키로 계속 복호화(재암호화 0·운영중단 0).
     *   회전 후 신규 쓰기만 새 버전으로 암호화. 점진적 자연 재암호화(저장 시). admin 전용 호출.
     *   @return array{ok:bool, active?:string, previous?:string, note?:string, error?:string}
     */
    public static function rotateKek(): array
    {
        if (!function_exists('openssl_encrypt')) return ['ok' => false, 'error' => 'openssl 미지원'];
        try {
            $pdo = Db::pdo(); Db::ensureAppSetting($pdo);
            $cur = self::activeVersion();
            $n = (int)ltrim($cur, 'v'); if ($n < 1) $n = 1;
            $next = 'v' . ($n + 1);
            $newKey = base64_encode(random_bytes(32));
            self::putSetting($pdo, 'cred_kek_' . $next, $newKey);
            self::putSetting($pdo, 'cred_kek_active', $next);
            self::$verKeys = []; self::$key = null; // 캐시 무효화
            return ['ok' => true, 'active' => $next, 'previous' => $cur,
                'note' => '신규 쓰기부터 ' . $next . ' 키로 암호화. 기존 ' . $cur . ' 암호문은 계속 복호화됩니다(무파괴·운영중단 0).'];
        } catch (\Throwable $e) { return ['ok' => false, 'error' => $e->getMessage()]; }
    }

    private static function putSetting(\PDO $pdo, string $k, string $v): void
    {
        $now = gmdate('c');
        if ($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql') {
            $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE svalue=VALUES(svalue),updated_at=VALUES(updated_at)")->execute([$k, $v, $now]);
        } else {
            $u = $pdo->prepare("UPDATE app_setting SET svalue=?,updated_at=? WHERE skey=?"); $u->execute([$v, $now, $k]);
            if ($u->rowCount() === 0) { try { $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES(?,?,?)")->execute([$k, $v, $now]); } catch (\Throwable $e) {} }
        }
    }

    /** "enc:vN:..." → 평문. 평문 입력은 그대로 반환(하위호환). 복호화 실패는 '' . */
    public static function decrypt(?string $stored): string
    {
        $stored = (string)$stored;
        if ($stored === '') return '';
        if (!preg_match('/^enc:(v\d+):/', $stored, $m)) return $stored; // 평문 passthrough
        if (!function_exists('openssl_decrypt')) return '';
        try {
            $ver = $m[1]; $pfx = 'enc:' . $ver . ':'; // 'v1'·'v2'…
            $raw = base64_decode(substr($stored, strlen($pfx)), true);
            if ($raw === false || strlen($raw) < 28) return '';
            $iv = substr($raw, 0, 12);
            $tag = substr($raw, 12, 16);
            $ct = substr($raw, 28);
            // [255차 심화] 버전별 KEK 로 복호화(무파괴 키회전). v1 은 레거시 파생키까지 폴백(전환기 호환).
            $pt = openssl_decrypt($ct, 'aes-256-gcm', self::keyForVersion($ver), OPENSSL_RAW_DATA, $iv, $tag);
            if ($pt === false && ($ver === 'v1' || $ver === '')) {
                $pt = openssl_decrypt($ct, 'aes-256-gcm', self::key(), OPENSSL_RAW_DATA, $iv, $tag);
                if ($pt === false) $pt = openssl_decrypt($ct, 'aes-256-gcm', self::derivedKey(), OPENSSL_RAW_DATA, $iv, $tag);
            }
            return $pt === false ? '' : $pt;
        } catch (\Throwable $e) {
            return '';
        }
    }
}
