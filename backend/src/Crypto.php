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

    private static function key(): string
    {
        if (self::$key !== null) return self::$key;
        $env = getenv('CRED_ENC_KEY');
        if (is_string($env) && $env !== '') { return self::$key = self::normalizeKey($env); }
        try {
            $pdo = Db::pdo();
            $pdo->exec("CREATE TABLE IF NOT EXISTS app_setting (k VARCHAR(120) PRIMARY KEY, v TEXT, updated_at VARCHAR(32))");
            $s = $pdo->prepare("SELECT v FROM app_setting WHERE k='cred_enc_key' LIMIT 1");
            $s->execute();
            $v = $s->fetchColumn();
            if ($v) { return self::$key = self::normalizeKey((string)$v); }
            $gen = base64_encode(random_bytes(32));
            $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            if ($driver === 'mysql') {
                $pdo->prepare("INSERT INTO app_setting(k,v,updated_at) VALUES('cred_enc_key',?,?) ON DUPLICATE KEY UPDATE v=v")->execute([$gen, gmdate('c')]);
            } else {
                $pdo->prepare("INSERT OR IGNORE INTO app_setting(k,v,updated_at) VALUES('cred_enc_key',?,?)")->execute([$gen, gmdate('c')]);
            }
            // 재조회(경쟁 상황에서 타 프로세스가 먼저 넣었을 수 있음 → 항상 DB값 사용)
            $s->execute();
            $stored = (string)($s->fetchColumn() ?: $gen);
            return self::$key = self::normalizeKey($stored);
        } catch (\Throwable $e) {
            error_log('[Crypto] key fallback (derived): ' . $e->getMessage());
            return self::$key = self::normalizeKey('genie-roi-cred-' . (getenv('GENIE_DB_NAME') ?: 'geniego_roi'));
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
        return is_string($v) && strncmp($v, self::PREFIX, strlen(self::PREFIX)) === 0;
    }

    /** 평문 → "enc:v1:..." (실패 시 평문 그대로 — decrypt 가 passthrough). */
    public static function encrypt(?string $plain): string
    {
        $plain = (string)$plain;
        if ($plain === '') return '';
        if (self::isEncrypted($plain)) return $plain; // 이미 암호문
        if (!function_exists('openssl_encrypt')) return $plain;
        try {
            $iv = random_bytes(12);
            $tag = '';
            $ct = openssl_encrypt($plain, 'aes-256-gcm', self::key(), OPENSSL_RAW_DATA, $iv, $tag, '', 16);
            if ($ct === false) return $plain;
            return self::PREFIX . base64_encode($iv . $tag . $ct);
        } catch (\Throwable $e) {
            return $plain;
        }
    }

    /** "enc:v1:..." → 평문. 평문 입력은 그대로 반환(하위호환). 복호화 실패는 '' . */
    public static function decrypt(?string $stored): string
    {
        $stored = (string)$stored;
        if ($stored === '') return '';
        if (!self::isEncrypted($stored)) return $stored; // 평문 passthrough
        if (!function_exists('openssl_decrypt')) return '';
        try {
            $raw = base64_decode(substr($stored, strlen(self::PREFIX)), true);
            if ($raw === false || strlen($raw) < 28) return '';
            $iv = substr($raw, 0, 12);
            $tag = substr($raw, 12, 16);
            $ct = substr($raw, 28);
            $pt = openssl_decrypt($ct, 'aes-256-gcm', self::key(), OPENSSL_RAW_DATA, $iv, $tag);
            return $pt === false ? '' : $pt;
        } catch (\Throwable $e) {
            return '';
        }
    }
}
