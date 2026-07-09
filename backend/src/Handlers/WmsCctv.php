<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Crypto;

/**
 * WMS CCTV — 창고/사용자지정 장소 카메라 자격등록 + 원격 실시간 조회 (현 차수 신설).
 *
 * 착수 전 부재증명(CHANGE_GATE): `cctv|rtsp|nvr|onvif|m3u8|hls` 소스 전수 grep 매치 0건.
 *   (ClaudeAI 의 "smooth camera motion" 프롬프트, WmsManager 바코드 웹캠 getUserMedia,
 *    LiveCommerce 방송 송출은 모두 감시카메라와 무관.) → 확장 대상 없음, 신설 확정.
 *
 * ── 등록 모델 ────────────────────────────────────────────────────────────────
 * 현장 DVR/NVR CMS(JWC HDVR·Hikvision·Dahua·한화 Wisenet …)는 URL 이 아니라
 *   프로그램 / 도메인 / 포트 / 아이디 / 비번  형태로 배포된다. 이 형식을 1급 입력으로 받고,
 *   벤더 프리셋이 RTSP·스냅샷 URL 템플릿을 만든다. 프로그램이 목록에 없으면 vendor='custom'
 *   으로 템플릿({host}{port}{user}{pass}{channel})을 직접 입력한다 — 임의 기종 수용.
 * 클라우드 카메라처럼 이미 HLS/WHEP/임베드 URL 이 있으면 vendor='url' 로 그 URL 을 그대로 쓴다.
 *
 * ── 재생 경로(자격증명은 브라우저로 나가지 않는다) ───────────────────────────
 *   hls      : 서버가 m3u8 취득 → 세그먼트/키/변형 URI 를 HMAC 서명 프록시 경로로 재작성.
 *   rtsp     : 서버 ffmpeg 가 RTSP→HLS 리먹스(재인코딩 없음, -c copy). 시청자 없으면 자동 종료.
 *   snapshot : 서버가 JPEG 프레임을 받아 전달(<img> 폴링). ffmpeg 없어도 항상 동작하는 최후 경로.
 *   webrtc   : WHEP SDP 시그널링만 중계. 미디어는 ICE 로 브라우저↔장비 직결.
 *   iframe   : 벤더 임베드 페이지(벤더 자체 인증) — 서버 미개입.
 *
 * ── 보안 ────────────────────────────────────────────────────────────────────
 * 자격증명은 Crypto(AES-256-GCM, CRED_ENC_KEY, fail-closed) 저장. 조회 응답은 mask(), 원문 미반환.
 * SSRF: 등록·재생 양 시점에 공인 IP 로 해석되는지 재검증(DNS rebinding 대비). 사설(10/172.16/192.168)·
 *   루프백·링크로컬(169.254.169.254 메타데이터)·예약대역 거부. DVR 은 https 가 드물어 http 를
 *   허용하되 위 IP 정책은 동일하게 fail-closed 적용한다.
 * 재생 인가: <video>/<img> 는 Authorization 헤더를 실을 수 없으므로 POST .../session 이 발급한
 *   단기(1h) HMAC 재생토큰(tenant|camId|exp)을 쿼리로 검증한다. 토큰은 해당 카메라 1대만 연다.
 * 세그먼트 프록시는 서명된 절대 URL 만 받는다(임의 URL 대입 = SSRF 차단).
 *
 * 라우팅: /api/wms/cameras* (index.php 의 /wms/ bypass 포함, 세션 self-auth requirePro).
 *   ★ basePath '/api' strip 트랩: routes.php 에는 '/api' 없이 등록해야 매칭(204차 정본).
 */
class WmsCctv
{
    private const PROTOCOLS = ['rtsp', 'hls', 'snapshot', 'webrtc', 'iframe'];
    private const TOKEN_TTL = 3600;
    private const MAX_BYTES = 25 * 1024 * 1024; // 응답 상한(메모리 폭주 차단)
    private const IDLE_KILL = 90;               // 무시청 N초 후 ffmpeg 종료

    /**
     * 벤더 프리셋 — {host} {port} {rtspPort} {user} {pass} {channel} 치환.
     * 프로그램이 바뀔 수 있으므로 이 표는 '기본값'일 뿐이고, vendor='custom' 이면 사용자가
     * rtsp_template / snapshot_template 를 직접 넣는다(같은 치환 문법).
     */
    private const VENDORS = [
        'jwc_hdvr' => [
            'label' => 'JWC HDVR CMS', 'port' => 8601, 'rtsp_port' => 554,
            'rtsp' => 'rtsp://{user}:{pass}@{host}:{rtspPort}/live/ch{channel}/main',
            'snapshot' => 'http://{host}:{port}/cgi-bin/snapshot.cgi?channel={channel}',
        ],
        'hikvision' => [
            'label' => 'Hikvision (iVMS/NVR)', 'port' => 80, 'rtsp_port' => 554,
            'rtsp' => 'rtsp://{user}:{pass}@{host}:{rtspPort}/Streaming/Channels/{channel}01',
            'snapshot' => 'http://{host}:{port}/ISAPI/Streaming/channels/{channel}01/picture',
        ],
        'dahua' => [
            'label' => 'Dahua (SmartPSS/NVR)', 'port' => 80, 'rtsp_port' => 554,
            'rtsp' => 'rtsp://{user}:{pass}@{host}:{rtspPort}/cam/realmonitor?channel={channel}&subtype=0',
            'snapshot' => 'http://{host}:{port}/cgi-bin/snapshot.cgi?channel={channel}',
        ],
        'hanwha' => [
            'label' => 'Hanwha Wisenet', 'port' => 80, 'rtsp_port' => 554,
            'rtsp' => 'rtsp://{user}:{pass}@{host}:{rtspPort}/profile2/media.smp',
            'snapshot' => 'http://{host}:{port}/stw-cgi/video.cgi?msubmenu=snapshot&action=view&Channel={channel}',
        ],
        'onvif' => [
            'label' => 'ONVIF 표준 (범용)', 'port' => 80, 'rtsp_port' => 554,
            'rtsp' => 'rtsp://{user}:{pass}@{host}:{rtspPort}/onvif/profile{channel}/media.smp',
            'snapshot' => 'http://{host}:{port}/onvif/snapshot?channel={channel}',
        ],
        'custom' => ['label' => '직접 입력(기타 프로그램)', 'port' => 80, 'rtsp_port' => 554, 'rtsp' => '', 'snapshot' => ''],
        'url'    => ['label' => 'HLS/WebRTC/임베드 URL 직접', 'port' => 443, 'rtsp_port' => 554, 'rtsp' => '', 'snapshot' => ''],
    ];

    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) {
            $decoded = json_decode((string)$req->getBody(), true);
            if (is_array($decoded)) $b = $decoded;
        }
        return $b;
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    /** 자격증명 표시용 마스킹(ChannelCreds::mask 규칙). 원문은 반환하지 않는다. */
    private static function mask(string $val): string
    {
        if ($val === '') return '';
        $len = mb_strlen($val);
        if ($len <= 8) return str_repeat('*', $len);
        return mb_substr($val, 0, 4) . str_repeat('*', max(0, $len - 8)) . mb_substr($val, -4);
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_cameras (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                wh_id VARCHAR(64) NOT NULL DEFAULT '',
                name VARCHAR(160) NOT NULL,
                place VARCHAR(190) DEFAULT '',
                vendor VARCHAR(32) NOT NULL DEFAULT 'custom',
                protocol VARCHAR(16) NOT NULL DEFAULT 'rtsp',
                host VARCHAR(255) DEFAULT '',
                port INT DEFAULT 0,
                rtsp_port INT DEFAULT 554,
                channel VARCHAR(16) DEFAULT '1',
                direct_url VARCHAR(1024) DEFAULT '',
                rtsp_template VARCHAR(1024) DEFAULT '',
                snapshot_template VARCHAR(1024) DEFAULT '',
                username TEXT, password TEXT,
                active TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 0,
                source VARCHAR(16) NOT NULL DEFAULT 'direct',
                bridge_id INT DEFAULT 0,
                model VARCHAR(160) DEFAULT '',
                last_tested_at VARCHAR(32) DEFAULT '',
                test_status VARCHAR(16) DEFAULT '',
                test_message VARCHAR(255) DEFAULT '',
                created_at DATETIME, updated_at DATETIME,
                KEY idx_wms_cam_tenant (tenant_id), KEY idx_wms_cam_wh (tenant_id, wh_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_cctv_bridges (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(160) NOT NULL,
                place VARCHAR(190) DEFAULT '',
                pair_code VARCHAR(32) DEFAULT '',
                token_hash VARCHAR(80) DEFAULT '',
                status VARCHAR(16) DEFAULT 'pending',
                agent_version VARCHAR(32) DEFAULT '',
                discovered TEXT,
                last_seen_at VARCHAR(32) DEFAULT '',
                created_at DATETIME, updated_at DATETIME,
                KEY idx_wms_brg_tenant (tenant_id), KEY idx_wms_brg_pair (pair_code), KEY idx_wms_brg_tok (token_hash)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_cameras (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                wh_id TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, place TEXT DEFAULT '',
                vendor TEXT NOT NULL DEFAULT 'custom', protocol TEXT NOT NULL DEFAULT 'rtsp',
                host TEXT DEFAULT '', port INTEGER DEFAULT 0, rtsp_port INTEGER DEFAULT 554,
                channel TEXT DEFAULT '1', direct_url TEXT DEFAULT '',
                rtsp_template TEXT DEFAULT '', snapshot_template TEXT DEFAULT '',
                username TEXT, password TEXT, active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
                source TEXT NOT NULL DEFAULT 'direct', bridge_id INTEGER DEFAULT 0, model TEXT DEFAULT '',
                last_tested_at TEXT DEFAULT '', test_status TEXT DEFAULT '', test_message TEXT DEFAULT '',
                created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_cctv_bridges (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                name TEXT NOT NULL, place TEXT DEFAULT '', pair_code TEXT DEFAULT '', token_hash TEXT DEFAULT '',
                status TEXT DEFAULT 'pending', agent_version TEXT DEFAULT '', discovered TEXT,
                last_seen_at TEXT DEFAULT '', created_at TEXT, updated_at TEXT)");
        }
        // 기 배포 테이블 보강(멱등) — 브리지 컬럼. ★MySQL TEXT DEFAULT 거부 회피(VARCHAR·무DEFAULT 또는 숫자만).
        foreach ([
            'source VARCHAR(16)', 'bridge_id INT', 'model VARCHAR(160)',
        ] as $col) { try { $pdo->exec("ALTER TABLE wms_cameras ADD COLUMN {$col}"); } catch (\Throwable $e) {} }
    }

    /* ════════════════ SSRF 방어 ════════════════ */

    /**
     * 호스트가 공인 IP 로 해석되는지 검증. 등록·재생 양 시점 호출(DNS rebinding 대비).
     * DVR 은 https 가 드물어 스킴은 http/https/rtsp 를 모두 허용하되, IP 정책은 fail-closed.
     */
    private static function isPublicHost(string $host): bool
    {
        if ($host === '') return false;
        $lh = strtolower($host);
        if (in_array($lh, ['localhost', 'metadata.google.internal'], true)) return false;
        if (substr($lh, -6) === '.local' || substr($lh, -9) === '.internal') return false;

        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $ips = [$host];
        } else {
            $recs = @dns_get_record($host, DNS_A | DNS_AAAA);
            if (is_array($recs)) {
                foreach ($recs as $r) {
                    if (!empty($r['ip']))   $ips[] = $r['ip'];
                    if (!empty($r['ipv6'])) $ips[] = $r['ipv6'];
                }
            }
            if (!$ips) { $h = @gethostbyname($host); if ($h && $h !== $host) $ips[] = $h; }
        }
        if (!$ips) return false; // 해석 불가 → 안전측 거부
        foreach ($ips as $ip) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
        }
        return true;
    }

    private static function isPublicUrl(string $url, array $schemes = ['http', 'https']): bool
    {
        $p = parse_url($url);
        if (!$p || !in_array(strtolower((string)($p['scheme'] ?? '')), $schemes, true)) return false;
        return self::isPublicHost((string)($p['host'] ?? ''));
    }

    /* ════════════════ 재생 토큰(HMAC, tenant+camera+exp 바인딩) ════════════════ */

    private static function b64u(string $raw): string { return rtrim(strtr(base64_encode($raw), '+/', '-_'), '='); }
    private static function b64uDec(string $s): string
    {
        $p = strtr($s, '-_', '+/');
        return (string)base64_decode(str_pad($p, (int)ceil(strlen($p) / 4) * 4, '='), true);
    }

    private static function issuePlayToken(string $tenant, int $camId): string
    {
        $payload = $tenant . '|' . $camId . '|' . (time() + self::TOKEN_TTL);
        return self::b64u($payload) . '.' . Crypto::hmacTag($payload, 'wms_cctv_play', 32);
    }

    /** 유효하면 tenant 반환, 아니면 null. 미디어 엔드포인트의 유일한 인가 수단. */
    private static function verifyPlayToken(string $tk, int $camId): ?string
    {
        $parts = explode('.', $tk, 2);
        if (count($parts) !== 2) return null;
        $payload = self::b64uDec($parts[0]);
        if ($payload === '') return null;
        if (!hash_equals(Crypto::hmacTag($payload, 'wms_cctv_play', 32), $parts[1])) return null;
        $seg = explode('|', $payload);
        if (count($seg) !== 3 || (int)$seg[1] !== $camId || time() > (int)$seg[2]) return null;
        return $seg[0];
    }

    private static function authorizeByToken(Request $req, int $camId): ?array
    {
        $tk = (string)($req->getQueryParams()['tk'] ?? '');
        if ($tk === '') return null;
        $tenant = self::verifyPlayToken($tk, $camId);
        if ($tenant === null) return null;
        return self::row($tenant, $camId);
    }

    /* ════════════════ URL 조립 ════════════════ */

    /** 템플릿 치환. $withCreds=false 면 비밀번호를 ***** 로 — 로그·에러메시지 노출 방지. */
    private static function buildUrl(array $cam, string $template, bool $withCreds = true): string
    {
        if ($template === '') return '';
        $user = Crypto::decrypt((string)($cam['username'] ?? ''));
        $pass = Crypto::decrypt((string)($cam['password'] ?? ''));
        return strtr($template, [
            '{host}'     => (string)($cam['host'] ?? ''),
            '{port}'     => (string)((int)($cam['port'] ?? 0)),
            '{rtspPort}' => (string)((int)($cam['rtsp_port'] ?? 554)),
            '{channel}'  => (string)($cam['channel'] ?? '1'),
            '{user}'     => $withCreds ? rawurlencode($user) : 'user',
            '{pass}'     => $withCreds ? rawurlencode($pass) : '*****',
        ]);
    }

    private static function templateFor(array $cam, string $kind): string
    {
        $vendor = (string)($cam['vendor'] ?? 'custom');
        $col = $kind . '_template';
        $own = (string)($cam[$col] ?? '');
        if ($own !== '') return $own;
        return (string)(self::VENDORS[$vendor][$kind] ?? '');
    }

    /** 프로토콜별 실제 업스트림 URL(자격증명 포함). */
    private static function upstreamUrl(array $cam, bool $withCreds = true): string
    {
        return match ((string)$cam['protocol']) {
            'rtsp'     => self::buildUrl($cam, self::templateFor($cam, 'rtsp'), $withCreds),
            'snapshot' => self::buildUrl($cam, self::templateFor($cam, 'snapshot'), $withCreds),
            default    => (string)($cam['direct_url'] ?? ''),
        };
    }

    /* ════════════════ 조회/저장/삭제 ════════════════ */

    private static function row(string $tenant, int $id): ?array
    {
        $st = self::db()->prepare("SELECT * FROM wms_cameras WHERE id=? AND tenant_id=? LIMIT 1");
        $st->execute([$id, $tenant]);
        return $st->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /** 클라이언트 노출용 — 비밀은 마스킹. 미리보기 URL 도 비밀번호를 가린다. */
    private static function publicView(array $r): array
    {
        $user = Crypto::decrypt((string)($r['username'] ?? ''));
        return [
            'id'         => (int)$r['id'],
            'wh_id'      => (string)($r['wh_id'] ?? ''),
            'name'       => (string)($r['name'] ?? ''),
            'place'      => (string)($r['place'] ?? ''),
            'vendor'     => (string)($r['vendor'] ?? 'custom'),
            'vendor_label' => (string)(self::VENDORS[(string)($r['vendor'] ?? '')]['label'] ?? ''),
            'protocol'   => (string)($r['protocol'] ?? 'rtsp'),
            'host'       => (string)($r['host'] ?? ''),
            'port'       => (int)($r['port'] ?? 0),
            'rtsp_port'  => (int)($r['rtsp_port'] ?? 554),
            'channel'    => (string)($r['channel'] ?? '1'),
            'direct_url' => (string)($r['direct_url'] ?? ''),
            'rtsp_template'     => (string)($r['rtsp_template'] ?? ''),
            'snapshot_template' => (string)($r['snapshot_template'] ?? ''),
            'username'     => self::mask($user),
            'has_password' => (string)($r['password'] ?? '') !== '',
            'preview_url'  => self::upstreamUrl($r, false),
            'source'       => (string)($r['source'] ?? 'direct'),
            'bridge_id'    => (int)($r['bridge_id'] ?? 0),
            'model'        => (string)($r['model'] ?? ''),
            'active'       => (int)($r['active'] ?? 1) === 1,
            'sort_order'   => (int)($r['sort_order'] ?? 0),
            'last_tested_at' => (string)($r['last_tested_at'] ?? ''),
            'test_status'    => (string)($r['test_status'] ?? ''),
            'test_message'   => (string)($r['test_message'] ?? ''),
        ];
    }

    // ── GET /wms/cctv/vendors — 프리셋 + 서버 ffmpeg 가용여부(프론트 폼이 이걸로 적응) ──
    public static function vendors(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $out = [];
        foreach (self::VENDORS as $k => $v) {
            $out[] = [
                'id' => $k, 'label' => $v['label'], 'port' => $v['port'], 'rtsp_port' => $v['rtsp_port'],
                'rtsp' => $v['rtsp'], 'snapshot' => $v['snapshot'],
            ];
        }
        return self::json($res, ['ok' => true, 'vendors' => $out, 'ffmpeg' => self::ffmpegPath() !== null]);
    }

    // ── GET /wms/cameras[?wh_id=W001] ───────────────────────────────────────
    public static function listCameras(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t  = self::tenant($req);
        $wh = (string)($req->getQueryParams()['wh_id'] ?? '');

        $sql = "SELECT * FROM wms_cameras WHERE tenant_id=:t";
        $p   = [':t' => $t];
        if ($wh !== '') { $sql .= " AND wh_id=:wh"; $p[':wh'] = $wh; }
        $sql .= " ORDER BY sort_order ASC, id ASC";
        $st = self::db()->prepare($sql);
        $st->execute($p);

        $out = [];
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) $out[] = self::publicView($r);
        return self::json($res, ['ok' => true, 'cameras' => $out, 'ffmpeg' => self::ffmpegPath() !== null]);
    }

    // ── POST /wms/cameras · PUT /wms/cameras/{id} ────────────────────────────
    public static function saveCamera(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req);
        $b = self::body($req);
        $id = isset($args['id']) ? (int)$args['id'] : 0;

        $name     = trim((string)($b['name'] ?? ''));
        $vendor   = (string)($b['vendor'] ?? 'custom');
        $protocol = (string)($b['protocol'] ?? 'rtsp');
        $host     = trim((string)($b['host'] ?? ''));
        $direct   = trim((string)($b['direct_url'] ?? ''));
        $source   = (string)($b['source'] ?? 'direct');
        $bridgeId = (int)($b['bridge_id'] ?? 0);

        if ($name === '')                                 return self::json($res, ['ok' => false, 'error' => '카메라 이름을 입력하세요'], 400);
        if (!isset(self::VENDORS[$vendor]))               return self::json($res, ['ok' => false, 'error' => '지원하지 않는 프로그램입니다'], 400);
        if (!in_array($protocol, self::PROTOCOLS, true))  return self::json($res, ['ok' => false, 'error' => '지원하지 않는 프로토콜입니다'], 400);
        if (!in_array($source, ['direct', 'bridge'], true)) $source = 'direct';

        // ── 브리지 경유: 현장 에이전트가 LAN 안에서 접속하므로 사설/LAN 주소(192.168.x)를 허용한다.
        //   우리 클라우드는 카메라에 직접 접속하지 않는다 → SSRF 검증 스킵(대신 브리지 소속·소유권 검증).
        if ($source === 'bridge') {
            $brg = self::bridgeRow($t, $bridgeId);
            if (!$brg) return self::json($res, ['ok' => false, 'error' => '브리지를 먼저 등록·연결하세요'], 400);
            $urlMode = in_array($protocol, ['hls', 'webrtc', 'iframe'], true);
            if (!$urlMode && $host === '')
                return self::json($res, ['ok' => false, 'error' => 'LAN 주소(또는 IP)를 입력하세요'], 400);
            if ($urlMode && $direct === '')
                return self::json($res, ['ok' => false, 'error' => '스트림 URL을 입력하세요'], 400);
        } else {
            // 직접(클라우드) 접속: URL 계열(hls/webrtc/iframe)과 장비 계열(rtsp/snapshot)의 필수 입력이 다르다.
            $urlMode = in_array($protocol, ['hls', 'webrtc', 'iframe'], true);
            if ($urlMode) {
                if ($direct === '') return self::json($res, ['ok' => false, 'error' => '스트림 URL을 입력하세요'], 400);
                if ($protocol === 'iframe') {
                    if (stripos($direct, 'https://') !== 0) return self::json($res, ['ok' => false, 'error' => '임베드 URL은 https만 허용됩니다'], 400);
                } elseif (!self::isPublicUrl($direct, ['https'])) {
                    return self::json($res, ['ok' => false, 'error' => '공개 https URL만 등록할 수 있습니다(사설·내부 주소 거부)'], 400);
                }
            } else {
                if ($host === '')                  return self::json($res, ['ok' => false, 'error' => '도메인(또는 IP)을 입력하세요'], 400);
                if (!self::isPublicHost($host))    return self::json($res, ['ok' => false, 'error' => '공인 주소만 등록할 수 있습니다(사설·내부 IP 거부). 사설망 카메라는 브리지 경유로 등록하세요.'], 400);
                if (self::templateFor(['vendor' => $vendor, $protocol . '_template' => (string)($b[$protocol . '_template'] ?? '')], $protocol) === '') {
                    return self::json($res, ['ok' => false, 'error' => '이 프로그램의 ' . strtoupper($protocol) . ' 주소 템플릿을 입력하세요'], 400);
                }
            }
        }

        $pdo = self::db();
        $now = self::now();
        $cols = [
            ':t' => $t, ':wh' => (string)($b['wh_id'] ?? ''), ':name' => $name,
            ':place' => (string)($b['place'] ?? ''), ':vendor' => $vendor, ':proto' => $protocol,
            ':host' => $host,
            ':port' => (int)($b['port'] ?? self::VENDORS[$vendor]['port']),
            ':rport' => (int)($b['rtsp_port'] ?? self::VENDORS[$vendor]['rtsp_port']),
            ':ch' => (string)($b['channel'] ?? '1'),
            ':durl' => $direct,
            ':rtpl' => (string)($b['rtsp_template'] ?? ''),
            ':stpl' => (string)($b['snapshot_template'] ?? ''),
            ':active' => !empty($b['active']) ? 1 : 0,
            ':sort' => (int)($b['sort_order'] ?? 0),
            ':source' => $source,
            ':bridge' => $source === 'bridge' ? $bridgeId : 0,
            ':model' => (string)($b['model'] ?? ''),
            ':ua' => $now,
        ];

        // 비밀 2종: 빈 문자열 전송 = 기존값 보존(ChannelCreds upsert 규약).
        $secrets = [];
        foreach (['username', 'password'] as $k) {
            $v = (string)($b[$k] ?? '');
            if ($v !== '') $secrets[$k] = Crypto::encrypt($v);
        }

        if ($id > 0) {
            $set = "wh_id=:wh, name=:name, place=:place, vendor=:vendor, protocol=:proto, host=:host,
                    port=:port, rtsp_port=:rport, channel=:ch, direct_url=:durl,
                    rtsp_template=:rtpl, snapshot_template=:stpl, active=:active, sort_order=:sort,
                    source=:source, bridge_id=:bridge, model=:model, updated_at=:ua";
            foreach ($secrets as $k => $_) { $set .= ", $k=:$k"; $cols[":$k"] = $secrets[$k]; }
            $st = $pdo->prepare("UPDATE wms_cameras SET $set WHERE id=:id AND tenant_id=:t");
            $cols[':id'] = $id;
            $st->execute($cols);
            if ($st->rowCount() === 0 && !self::row($t, $id)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
            self::stopStream($t, $id); // 접속정보 변경 → 기존 트랜스코더 폐기
            return self::json($res, ['ok' => true, 'camera' => self::publicView(self::row($t, $id) ?? [])]);
        }

        $cols[':ca'] = $now;
        $cols[':username'] = $secrets['username'] ?? null;
        $cols[':password'] = $secrets['password'] ?? null;
        $st = $pdo->prepare("INSERT INTO wms_cameras
            (tenant_id, wh_id, name, place, vendor, protocol, host, port, rtsp_port, channel, direct_url,
             rtsp_template, snapshot_template, username, password, active, sort_order,
             source, bridge_id, model, created_at, updated_at)
            VALUES (:t,:wh,:name,:place,:vendor,:proto,:host,:port,:rport,:ch,:durl,:rtpl,:stpl,
                    :username,:password,:active,:sort,:source,:bridge,:model,:ca,:ua)");
        $st->execute($cols);
        $newId = (int)$pdo->lastInsertId();
        return self::json($res, ['ok' => true, 'camera' => self::publicView(self::row($t, $newId) ?? [])], 201);
    }

    // ── DELETE /wms/cameras/{id} ─────────────────────────────────────────────
    public static function deleteCamera(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req);
        $id = (int)$args['id'];
        self::stopStream($t, $id);
        $st = self::db()->prepare("DELETE FROM wms_cameras WHERE id=? AND tenant_id=?");
        $st->execute([$id, $t]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ════════════════ 업스트림 HTTP(자격증명 주입) ════════════════ */

    /** 반환 [status, body, contentType, error]. 리다이렉트 미추종(SSRF 우회 차단), 응답 상한 적용. */
    private static function fetchUpstream(array $cam, string $url, array $headers = [], ?string $postBody = null, string $postType = ''): array
    {
        if (!self::isPublicUrl($url)) return [0, '', '', '내부/사설 주소로 해석되어 차단되었습니다'];

        $user = Crypto::decrypt((string)($cam['username'] ?? ''));
        $pass = Crypto::decrypt((string)($cam['password'] ?? ''));

        $ch = curl_init($url);
        $buf = '';
        curl_setopt_array($ch, [
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT      => 'GenieROI-WMS-CCTV/1.0',
            CURLOPT_WRITEFUNCTION  => function ($_c, $chunk) use (&$buf) {
                $buf .= $chunk;
                return strlen($buf) > self::MAX_BYTES ? 0 : strlen($chunk); // 0 = abort
            },
        ]);
        if ($user !== '' || $pass !== '') {
            curl_setopt($ch, CURLOPT_USERPWD, $user . ':' . $pass);
            curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_ANY); // DVR 은 Digest 가 흔함
        }
        if ($postBody !== null) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postBody);
            if ($postType !== '') $headers[] = 'Content-Type: ' . $postType;
        }
        if ($headers) curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $ctype  = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $err    = curl_errno($ch) ? curl_error($ch) : '';
        curl_close($ch);
        if ($status === 0 && $err === '') $err = '응답 없음';
        return [$status, $buf, $ctype, $err];
    }

    /* ════════════════ RTSP → HLS 트랜스코더(ffmpeg) ════════════════ */

    private static function ffmpegPath(): ?string
    {
        static $cached = false, $path = null;
        if ($cached) return $path;
        $cached = true;
        foreach (['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'] as $p) {
            if (@is_executable($p)) { $path = $p; return $path; }
        }
        if (function_exists('shell_exec')) {
            $w = @shell_exec('command -v ffmpeg 2>/dev/null');
            if (is_string($w) && trim($w) !== '' && @is_executable(trim($w))) { $path = trim($w); return $path; }
        }
        return $path;
    }

    private static function streamDir(string $tenant, int $camId): string
    {
        $safe = preg_replace('/[^A-Za-z0-9_-]/', '_', $tenant);
        return rtrim(sys_get_temp_dir(), '/\\') . '/genie_cctv/' . $safe . '_' . $camId;
    }

    private static function stopStream(string $tenant, int $camId): void
    {
        $dir = self::streamDir($tenant, $camId);
        $pidFile = $dir . '/ffmpeg.pid';
        if (is_file($pidFile)) {
            $pid = (int)@file_get_contents($pidFile);
            if ($pid > 0 && function_exists('posix_kill')) @posix_kill($pid, 15);
            @unlink($pidFile);
        }
        foreach ((array)@glob($dir . '/*') as $f) @unlink($f);
    }

    private static function isRunning(string $dir): bool
    {
        $pidFile = $dir . '/ffmpeg.pid';
        if (!is_file($pidFile)) return false;
        $pid = (int)@file_get_contents($pidFile);
        if ($pid <= 0) return false;
        if (function_exists('posix_kill')) return @posix_kill($pid, 0);
        return is_dir('/proc/' . $pid);
    }

    /**
     * RTSP 리먹스 시작(재인코딩 없음 -c copy → CPU 거의 0). 이미 돌고 있으면 재사용.
     * 무시청 IDLE_KILL 초 뒤 자동 종료 — reaper 는 session/hls 진입 시 touch 파일로 판정.
     */
    private static function ensureStream(array $cam, string $tenant, int $camId): array
    {
        $ff = self::ffmpegPath();
        if ($ff === null) return [false, 'ffmpeg 미설치 — 스냅샷 모드로 전환하세요'];

        $dir = self::streamDir($tenant, $camId);
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return [false, '스트림 디렉터리 생성 실패'];
        @touch($dir . '/last_access');

        if (self::isRunning($dir)) return [true, ''];

        $rtsp = self::upstreamUrl($cam, true);
        if ($rtsp === '' || !self::isPublicUrl($rtsp, ['rtsp', 'rtsps'])) return [false, 'RTSP 주소가 비었거나 사설 주소로 해석됩니다'];

        $args = [
            $ff, '-nostdin', '-loglevel', 'error',
            // -rw_timeout: 소켓 읽기/쓰기 정체 시 5초에 포기. (구 -stimeout 은 ffmpeg 5 에서 제거됨.)
            '-rtsp_transport', 'tcp', '-rw_timeout', '5000000',
            '-i', $rtsp,
            '-an', '-c:v', 'copy',
            '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6',
            '-hls_flags', 'delete_segments+omit_endlist+independent_segments',
            '-hls_segment_filename', $dir . '/seg%05d.ts',
            $dir . '/index.m3u8',
        ];
        // ★ffmpeg 는 요청보다 오래 살아야 하므로 sh 로 detach 한다.
        //   proc_open 에 ffmpeg 를 직접 물리면 proc_close() 가 자식 종료까지 블로킹해 요청이 영구 정지한다.
        //   sh 는 nohup 으로 자식을 띄우고 즉시 종료 → proc_close 가 곧바로 반환하고 ffmpeg 는 init 이 수거.
        //   전 인자 escapeshellarg → 셸 인젝션 불가. 단, RTSP 자격증명이 ps 목록에 보일 수 있으므로
        //   운영 호스트는 /proc hidepid=2 권장(docs/WMS_CCTV.md 기재).
        $cmd = 'nohup ' . implode(' ', array_map('escapeshellarg', $args))
             . ' >> ' . escapeshellarg($dir . '/ffmpeg.log') . ' 2>&1 & echo $!';
        $desc = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $proc = @proc_open(['/bin/sh', '-c', $cmd], $desc, $pipes, $dir);
        if (!is_resource($proc)) return [false, 'ffmpeg 실행 실패'];
        $pid = (int)trim((string)stream_get_contents($pipes[1]));
        foreach ($pipes as $p) { if (is_resource($p)) fclose($p); }
        proc_close($proc); // sh 는 이미 종료 → 즉시 반환
        if ($pid <= 0) return [false, 'ffmpeg 기동 실패'];
        @file_put_contents($dir . '/ffmpeg.pid', (string)$pid);

        // 첫 세그먼트가 나올 때까지 최대 8초 대기 — 즉시 200 을 주면 플레이어가 404 로 죽는다.
        for ($i = 0; $i < 40; $i++) {
            if (is_file($dir . '/index.m3u8') && filesize($dir . '/index.m3u8') > 0) return [true, ''];
            usleep(200000);
        }
        $log = @file_get_contents($dir . '/ffmpeg.log');
        return [false, 'RTSP 연결 실패' . (is_string($log) && $log !== '' ? ' · ' . mb_substr(trim($log), 0, 160) : '')];
    }

    /** 유휴 스트림 수거 — session 호출마다 전 테넌트 스캔(카메라 수가 적어 비용 무시 가능). */
    private static function reapIdle(): void
    {
        $base = rtrim(sys_get_temp_dir(), '/\\') . '/genie_cctv';
        foreach ((array)@glob($base . '/*', GLOB_ONLYDIR) as $dir) {
            $last = @filemtime($dir . '/last_access');
            if ($last === false || (time() - $last) < self::IDLE_KILL) continue;
            $pidFile = $dir . '/ffmpeg.pid';
            if (is_file($pidFile)) {
                $pid = (int)@file_get_contents($pidFile);
                if ($pid > 0 && function_exists('posix_kill')) @posix_kill($pid, 15);
                @unlink($pidFile);
            }
            foreach ((array)@glob($dir . '/*') as $f) @unlink($f);
        }
    }

    /* ════════════════ 세션 발급 · 연결 테스트 ════════════════ */

    // ── POST /wms/cameras/{id}/session → 단기 재생 URL(자격증명 미포함) ──────
    public static function session(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        self::reapIdle();

        $t = self::tenant($req);
        $id = (int)$args['id'];
        $cam = self::row($t, $id);
        if (!$cam) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
        if ((int)($cam['active'] ?? 1) !== 1) return self::json($res, ['ok' => false, 'error' => '비활성 카메라입니다'], 409);

        $proto = (string)$cam['protocol'];
        $tk = self::issuePlayToken($t, $id);
        $base = '/api/wms/cameras/' . $id;

        // ── 브리지 경유: 현장 에이전트가 세그먼트를 올린다. 우리는 요청 신호(want)만 남기고 HLS 를 서빙.
        if ((string)($cam['source'] ?? 'direct') === 'bridge') {
            $brg = self::bridgeRow($t, (int)($cam['bridge_id'] ?? 0));
            if (!$brg || !self::bridgeOnline($brg)) {
                return self::json($res, ['ok' => false, 'error' => '브리지가 오프라인입니다. 현장 에이전트 실행을 확인하세요.'], 503);
            }
            @self::wantStream($t, $id); // poll 이 이 카메라를 "송출 요청됨"으로 읽는다
            return self::json($res, [
                'ok' => true, 'protocol' => 'hls', 'play_url' => $base . '/hls?tk=' . rawurlencode($tk),
                'expires_in' => self::TOKEN_TTL, 'via_bridge' => true, 'warming' => true,
                'name' => (string)$cam['name'], 'place' => (string)$cam['place'],
            ]);
        }

        if ($proto === 'rtsp') {
            [$ok, $msg] = self::ensureStream($cam, $t, $id);
            if (!$ok) return self::json($res, ['ok' => false, 'error' => $msg, 'fallback' => 'snapshot'], 502);
        }

        $play = match ($proto) {
            'iframe'   => (string)$cam['direct_url'],
            'rtsp'     => $base . '/hls?tk=' . rawurlencode($tk),
            'hls'      => $base . '/hls?tk=' . rawurlencode($tk),
            'snapshot' => $base . '/snapshot?tk=' . rawurlencode($tk),
            'webrtc'   => $base . '/whep?tk=' . rawurlencode($tk),
            default    => '',
        };
        return self::json($res, [
            'ok' => true, 'protocol' => $proto, 'play_url' => $play, 'expires_in' => self::TOKEN_TTL,
            'name' => (string)$cam['name'], 'place' => (string)$cam['place'],
        ]);
    }

    // ── POST /wms/cameras/{id}/keepalive?tk= — 시청 중 신호(유휴 수거 방지) ──
    public static function keepalive(Request $req, Response $res, array $args): Response
    {
        $camId = (int)$args['id'];
        $tk = (string)($req->getQueryParams()['tk'] ?? '');
        $tenant = $tk !== '' ? self::verifyPlayToken($tk, $camId) : null;
        if ($tenant === null) return self::json($res, ['ok' => false], 403);
        @touch(self::streamDir($tenant, $camId) . '/last_access');
        @self::wantStream($tenant, $camId); // 브리지 카메라면 계속 송출 요청 유지
        return self::json($res, ['ok' => true]);
    }

    /**
     * POST /wms/cameras/{id}/test — 저장된 자격증명으로 실제 접속 확인.
     *   rtsp     : ffmpeg 로 실제 스트림 개시 여부
     *   snapshot : JPEG 매직바이트 확인
     *   hls      : #EXTM3U 확인
     */
    public static function testCamera(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req);
        $id = (int)$args['id'];
        $cam = self::row($t, $id);
        if (!$cam) return self::json($res, ['ok' => false, 'error' => '없음'], 404);

        $proto = (string)$cam['protocol'];
        $status = 0;

        if ((string)($cam['source'] ?? 'direct') === 'bridge') {
            $brg = self::bridgeRow($t, (int)($cam['bridge_id'] ?? 0));
            $online = $brg && self::bridgeOnline($brg);
            $ok = $online;
            $msg = $online
                ? '브리지 온라인 — 현장 에이전트가 이 카메라를 재생합니다. "실시간 보기"로 확인하세요.'
                : '브리지 오프라인 — 현장 PC에서 에이전트 실행을 확인하세요.';
        } elseif ($proto === 'iframe') {
            $ok = true; $msg = '임베드 URL(벤더 자체 인증) — 서버 검증 대상 아님';
        } elseif ($proto === 'webrtc') {
            $ok = self::isPublicUrl((string)$cam['direct_url'], ['https']);
            $msg = $ok ? 'WHEP 엔드포인트 형식 정상 — 실제 협상은 재생 시 확인됩니다' : '공개 https WHEP URL 이 아닙니다';
        } elseif ($proto === 'rtsp') {
            self::stopStream($t, $id); // 이전 세션 잔재 제거 후 실측
            [$ok, $err] = self::ensureStream($cam, $t, $id);
            $msg = $ok ? 'RTSP 연결 성공 · HLS 리먹스 개시' : $err;
            self::stopStream($t, $id);
        } else {
            $url = self::upstreamUrl($cam, true);
            [$status, $body, $ctype, $err] = self::fetchUpstream($cam, $url);
            $ok = ($status >= 200 && $status < 300 && $body !== '');
            $msg = $ok ? ('연결 성공 · ' . ($ctype ?: 'unknown') . ' · ' . strlen($body) . 'B')
                       : ('연결 실패 · HTTP ' . $status . ($err !== '' ? ' · ' . $err : ''));
            if ($ok && $proto === 'hls' && strpos($body, '#EXTM3U') !== 0) { $ok = false; $msg = 'HLS 매니페스트가 아닙니다(#EXTM3U 없음)'; }
            if ($ok && $proto === 'snapshot' && strncmp($body, "\xFF\xD8", 2) !== 0) { $ok = false; $msg = 'JPEG 이미지가 아닙니다 — 스냅샷 주소를 확인하세요'; }
        }

        $st = self::db()->prepare("UPDATE wms_cameras SET last_tested_at=?, test_status=?, test_message=? WHERE id=? AND tenant_id=?");
        $st->execute([self::now(), $ok ? 'ok' : 'fail', mb_substr($msg, 0, 240), $id, $t]);
        return self::json($res, ['ok' => $ok, 'status' => $status, 'message' => $msg]);
    }

    /* ════════════════ 미디어 중계(재생토큰 인가) ════════════════ */

    /** 상대 URI 를 매니페스트 기준 절대 URL 로 해석. */
    private static function resolveUrl(string $base, string $rel): string
    {
        if ($rel === '') return '';
        if (preg_match('#^https?://#i', $rel)) return $rel;
        $p = parse_url($base);
        if (!$p || empty($p['scheme']) || empty($p['host'])) return '';
        $origin = $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
        if ($rel[0] === '/') return $origin . $rel;
        $dir = isset($p['path']) ? substr($p['path'], 0, (int)strrpos($p['path'], '/') + 1) : '/';
        return $origin . $dir . $rel;
    }

    /** 절대 URL 을 서명해 프록시 경로로. 서명 없는 임의 URL 은 seg 가 거부(SSRF 차단). */
    private static function proxyUri(int $camId, string $absUrl, string $tk, string $endpoint): string
    {
        $sig = Crypto::hmacTag($camId . '|' . $absUrl, 'wms_cctv_seg', 32);
        return '/api/wms/cameras/' . $camId . '/' . $endpoint
             . '?u=' . rawurlencode(self::b64u($absUrl)) . '&s=' . rawurlencode($sig) . '&tk=' . rawurlencode($tk);
    }

    /**
     * GET /wms/cameras/{id}/hls — m3u8 제공.
     *   protocol=rtsp  → ffmpeg 가 만든 로컬 index.m3u8 의 세그먼트를 /local 경로로 재작성.
     *   protocol=hls   → 원격 m3u8 중계 + 세그먼트/키/변형 URI 를 서명 프록시로 재작성.
     */
    public static function hls(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $camId = (int)$args['id'];
        $q  = $req->getQueryParams();
        $tk = (string)($q['tk'] ?? '');
        $tenant = $tk !== '' ? self::verifyPlayToken($tk, $camId) : null;
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '재생 권한 없음'], 403);
        $cam = self::row($tenant, $camId);
        if (!$cam) return self::json($res, ['ok' => false, 'error' => '없음'], 404);

        $proto = (string)$cam['protocol'];
        $isBridge = (string)($cam['source'] ?? 'direct') === 'bridge';

        if ($proto === 'rtsp' || $isBridge) {
            $dir = self::streamDir($tenant, $camId);
            @touch($dir . '/last_access');
            if ($isBridge) {
                // 브리지가 올린 세그먼트를 서빙. 없으면 아직 워밍업(에이전트가 ffmpeg 기동 중).
                @self::wantStream($tenant, $camId); // want 갱신(에이전트가 계속 송출하도록)
            } elseif (!self::isRunning($dir)) {
                [$ok, $msg] = self::ensureStream($cam, $tenant, $camId);
                if (!$ok) return self::json($res, ['ok' => false, 'error' => $msg], 502);
            }
            $m3u8 = @file_get_contents($dir . '/index.m3u8');
            if ($m3u8 === false) return self::json($res, ['ok' => false, 'error' => $isBridge ? '브리지 스트림 준비 중(에이전트 연결 대기)' : '스트림 준비 중'], 503);
            $out = [];
            foreach (preg_split('/\r\n|\n|\r/', $m3u8) as $line) {
                $trim = trim($line);
                if ($trim === '' || $trim[0] === '#') { $out[] = $line; continue; }
                // ffmpeg 가 쓴 파일명(seg00001.ts)만 허용 — 경로 탈출 차단.
                $out[] = '/api/wms/cameras/' . $camId . '/local?f=' . rawurlencode(basename($trim)) . '&tk=' . rawurlencode($tk);
            }
            $res->getBody()->write(implode("\n", $out));
            return $res->withHeader('Content-Type', 'application/vnd.apple.mpegurl')->withHeader('Cache-Control', 'no-store');
        }

        if ($proto !== 'hls') return self::json($res, ['ok' => false, 'error' => 'HLS 카메라가 아닙니다'], 400);

        $target = (string)$cam['direct_url'];
        if (!empty($q['u'])) { // 변형 플레이리스트 — 서명 필수
            $abs = self::b64uDec((string)$q['u']);
            if ($abs === '' || !hash_equals(Crypto::hmacTag($camId . '|' . $abs, 'wms_cctv_seg', 32), (string)($q['s'] ?? ''))) {
                return self::json($res, ['ok' => false, 'error' => '서명 불일치'], 403);
            }
            $target = $abs;
        }

        [$status, $body, , $err] = self::fetchUpstream($cam, $target);
        if ($status < 200 || $status >= 300) return self::json($res, ['ok' => false, 'error' => '업스트림 오류 HTTP ' . $status . ($err ? ' · ' . $err : '')], 502);

        $out = [];
        foreach (preg_split('/\r\n|\n|\r/', $body) as $line) {
            $trim = trim($line);
            if ($trim === '') { $out[] = $line; continue; }
            if ($trim[0] === '#') { // EXT-X-KEY / EXT-X-MAP 의 URI="..."
                $out[] = preg_replace_callback('/URI="([^"]+)"/', function ($m) use ($target, $camId, $tk) {
                    $abs = self::resolveUrl($target, $m[1]);
                    return $abs === '' ? $m[0] : 'URI="' . self::proxyUri($camId, $abs, $tk, 'seg') . '"';
                }, $line);
                continue;
            }
            $abs = self::resolveUrl($target, $trim);
            if ($abs === '') { $out[] = $line; continue; }
            $isVariant = (bool)preg_match('/\.m3u8$/i', (string)parse_url($abs, PHP_URL_PATH));
            $out[] = self::proxyUri($camId, $abs, $tk, $isVariant ? 'hls' : 'seg');
        }
        $res->getBody()->write(implode("\n", $out));
        return $res->withHeader('Content-Type', 'application/vnd.apple.mpegurl')->withHeader('Cache-Control', 'no-store');
    }

    /** GET /wms/cameras/{id}/local?f=segNNNNN.ts&tk= — ffmpeg 로컬 세그먼트. basename 강제로 경로탈출 차단. */
    public static function localSegment(Request $req, Response $res, array $args): Response
    {
        $camId = (int)$args['id'];
        $q = $req->getQueryParams();
        $tenant = isset($q['tk']) ? self::verifyPlayToken((string)$q['tk'], $camId) : null;
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '재생 권한 없음'], 403);

        $f = basename((string)($q['f'] ?? ''));
        if (!preg_match('/^seg\d+\.ts$/', $f)) return self::json($res, ['ok' => false, 'error' => '잘못된 세그먼트'], 400);
        $dir = self::streamDir($tenant, $camId);
        @touch($dir . '/last_access');
        $path = $dir . '/' . $f;
        if (!is_file($path)) return self::json($res, ['ok' => false, 'error' => '세그먼트 없음'], 404);

        $res->getBody()->write((string)@file_get_contents($path));
        return $res->withHeader('Content-Type', 'video/mp2t')->withHeader('Cache-Control', 'no-store');
    }

    /** GET /wms/cameras/{id}/seg?u=&s=&tk= — 원격 세그먼트/키 중계. 서명된 URL 만 허용. */
    public static function segment(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $camId = (int)$args['id'];
        $cam = self::authorizeByToken($req, $camId);
        if (!$cam) return self::json($res, ['ok' => false, 'error' => '재생 권한 없음'], 403);

        $q = $req->getQueryParams();
        $abs = self::b64uDec((string)($q['u'] ?? ''));
        if ($abs === '' || !hash_equals(Crypto::hmacTag($camId . '|' . $abs, 'wms_cctv_seg', 32), (string)($q['s'] ?? ''))) {
            return self::json($res, ['ok' => false, 'error' => '서명 불일치'], 403);
        }
        [$status, $body, $ctype, $err] = self::fetchUpstream($cam, $abs);
        if ($status < 200 || $status >= 300) return self::json($res, ['ok' => false, 'error' => '업스트림 오류 HTTP ' . $status . ($err ? ' · ' . $err : '')], 502);

        $res->getBody()->write($body);
        return $res->withHeader('Content-Type', $ctype ?: 'application/octet-stream')->withHeader('Cache-Control', 'no-store');
    }

    /** GET /wms/cameras/{id}/snapshot?tk= — JPEG 1프레임 중계(<img> 폴링). */
    public static function snapshot(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $camId = (int)$args['id'];
        $cam = self::authorizeByToken($req, $camId);
        if (!$cam) return self::json($res, ['ok' => false, 'error' => '재생 권한 없음'], 403);

        $url = self::buildUrl($cam, self::templateFor($cam, 'snapshot'), true);
        if ($url === '') $url = (string)$cam['direct_url'];
        [$status, $body, $ctype, $err] = self::fetchUpstream($cam, $url);
        if ($status < 200 || $status >= 300) return self::json($res, ['ok' => false, 'error' => '업스트림 오류 HTTP ' . $status . ($err ? ' · ' . $err : '')], 502);

        $res->getBody()->write($body);
        return $res->withHeader('Content-Type', $ctype ?: 'image/jpeg')->withHeader('Cache-Control', 'no-store');
    }

    /**
     * POST /wms/cameras/{id}/whep?tk= — WebRTC(WHEP) 시그널링 중계.
     *   SDP offer 를 자격증명과 함께 장비/미디어서버에 전달하고 answer 를 되돌려준다.
     *   미디어는 ICE 로 브라우저↔장비 직결 — 서버는 SDP 만 만진다(대역폭 소모 없음).
     */
    public static function whep(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $camId = (int)$args['id'];
        $cam = self::authorizeByToken($req, $camId);
        if (!$cam) return self::json($res, ['ok' => false, 'error' => '재생 권한 없음'], 403);
        if ((string)$cam['protocol'] !== 'webrtc') return self::json($res, ['ok' => false, 'error' => 'WebRTC 카메라가 아닙니다'], 400);

        $offer = (string)$req->getBody();
        if (strpos($offer, 'v=0') !== 0) return self::json($res, ['ok' => false, 'error' => 'SDP offer 가 아닙니다'], 400);

        [$status, $body, , $err] = self::fetchUpstream($cam, (string)$cam['direct_url'], ['Accept: application/sdp'], $offer, 'application/sdp');
        if ($status < 200 || $status >= 300) return self::json($res, ['ok' => false, 'error' => '업스트림 오류 HTTP ' . $status . ($err ? ' · ' . $err : '')], 502);

        $res->getBody()->write($body);
        return $res->withHeader('Content-Type', 'application/sdp')->withHeader('Cache-Control', 'no-store');
    }

    /* ════════════════════════════════════════════════════════════════════════
       온프렘 브리지 — 현장 LAN 에이전트 (P2P·ActiveX·독자VMS 포함 범용 재생)
       ────────────────────────────────────────────────────────────────────────
       왜 필요한가: 국내 중소 CCTV(DVR/NVR)는 인터넷 쪽으로 표준 스트림을 열지 않는다
         (ActiveX 독자 프로토콜, P2P 시리얼 클라우드, 벤더 VMS 바이너리). 그러나 장비 대부분은
         같은 LAN 안에서는 RTSP/ONVIF 를 노출한다. 브리지 에이전트가 현장 PC 에서 돌며 LAN 으로
         장비를 물어(ONVIF 로 모델·RTSP URI 자동발견) ffmpeg 로 HLS 를 만들고, 아웃바운드로
         이 클라우드에 세그먼트를 업로드한다 → 포트포워딩·방화벽 변경 없이 브라우저 재생.

       인증: 브리지는 최초 pair_code(사용자 발급 API키)로 페어링 → 영구 토큰 수령.
         이후 poll/heartbeat/ingest 는 Authorization: Bearer <token> 자체검증(세션 아님).
       ════════════════════════════════════════════════════════════════════════ */

    private const BRIDGE_ONLINE_SEC = 90;
    private const WANT_TTL = 90; // session/keepalive 후 N초간 브리지가 이 카메라를 송출

    private static function bridgeRow(string $tenant, int $id): ?array
    {
        if ($id <= 0) return null;
        $st = self::db()->prepare("SELECT * FROM wms_cctv_bridges WHERE id=? AND tenant_id=? LIMIT 1");
        $st->execute([$id, $tenant]);
        return $st->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    private static function bridgeOnline(array $brg): bool
    {
        $seen = strtotime((string)($brg['last_seen_at'] ?? '')) ?: 0;
        return (string)($brg['status'] ?? '') === 'active' && (time() - $seen) < self::BRIDGE_ONLINE_SEC;
    }

    /** 브리지 카메라 송출 요청 신호 — want 파일 mtime 으로 poll 이 on-demand 판정. */
    private static function wantStream(string $tenant, int $camId): void
    {
        $dir = self::streamDir($tenant, $camId);
        if (!is_dir($dir)) @mkdir($dir, 0700, true);
        @touch($dir . '/want');
    }

    private static function wantActive(string $tenant, int $camId): bool
    {
        $m = @filemtime(self::streamDir($tenant, $camId) . '/want');
        return $m !== false && (time() - $m) < self::WANT_TTL;
    }

    /** Authorization: Bearer <token> → 브리지 행. 실패 시 null. poll/heartbeat/ingest 의 인가. */
    private static function authorizeBridge(Request $req): ?array
    {
        $hdr = $req->getHeaderLine('Authorization');
        $tok = (stripos($hdr, 'Bearer ') === 0) ? trim(substr($hdr, 7)) : '';
        if ($tok === '') { $tok = (string)($req->getQueryParams()['token'] ?? ''); }
        if ($tok === '' || strlen($tok) < 24) return null;
        $hash = hash('sha256', $tok);
        $st = self::db()->prepare("SELECT * FROM wms_cctv_bridges WHERE token_hash=? LIMIT 1");
        $st->execute([$hash]);
        return $st->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    private static function bridgeView(array $r): array
    {
        return [
            'id' => (int)$r['id'], 'name' => (string)$r['name'], 'place' => (string)($r['place'] ?? ''),
            'status' => (string)($r['status'] ?? 'pending'),
            'online' => self::bridgeOnline($r),
            'paired' => (string)($r['token_hash'] ?? '') !== '',
            'pair_code' => (string)($r['token_hash'] ?? '') === '' ? (string)($r['pair_code'] ?? '') : '', // 페어링 전에만 노출
            'agent_version' => (string)($r['agent_version'] ?? ''),
            'last_seen_at' => (string)($r['last_seen_at'] ?? ''),
            'discovered' => json_decode((string)($r['discovered'] ?? '[]'), true) ?: [],
        ];
    }

    // ── GET /wms/cctv/bridges (세션) ─────────────────────────────────────────
    public static function listBridges(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_cctv_bridges WHERE tenant_id=? ORDER BY id ASC");
        $st->execute([self::tenant($req)]);
        $out = [];
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) $out[] = self::bridgeView($r);
        return self::json($res, ['ok' => true, 'bridges' => $out]);
    }

    // ── POST /wms/cctv/bridges (세션) → 브리지 생성 + 페어코드(API키) 발급 ────
    public static function createBridge(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return self::json($res, ['ok' => false, 'error' => '브리지 이름을 입력하세요'], 400);
        // 페어코드: 사람이 옮겨적기 쉬운 대문자+숫자 12자(혼동문자 제외).
        $code = self::randToken(12, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
        $now = self::now();
        $st = self::db()->prepare("INSERT INTO wms_cctv_bridges (tenant_id,name,place,pair_code,status,created_at,updated_at)
                                   VALUES (?,?,?,?,'pending',?,?)");
        $st->execute([$t, $name, (string)($b['place'] ?? ''), $code, $now, $now]);
        $id = (int)self::db()->lastInsertId();
        return self::json($res, ['ok' => true, 'bridge' => self::bridgeView(self::bridgeRow($t, $id) ?? []), 'pair_code' => $code], 201);
    }

    // ── DELETE /wms/cctv/bridges/{id} (세션) ─────────────────────────────────
    public static function deleteBridge(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $id = (int)$args['id'];
        // 이 브리지에 매인 카메라는 direct 로 되돌리지 않고 그대로 두되(사용자가 재배정), 브리지만 제거.
        $st = self::db()->prepare("DELETE FROM wms_cctv_bridges WHERE id=? AND tenant_id=?");
        $st->execute([$id, $t]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    // ── POST /wms/cctv/bridges/{id}/rotate (세션) → 페어코드 재발급(분실/교체) ─
    public static function rotateBridge(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $id = (int)$args['id'];
        if (!self::bridgeRow($t, $id)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
        $code = self::randToken(12, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
        $st = self::db()->prepare("UPDATE wms_cctv_bridges SET pair_code=?, token_hash='', status='pending', updated_at=? WHERE id=? AND tenant_id=?");
        $st->execute([$code, self::now(), $id, $t]);
        return self::json($res, ['ok' => true, 'pair_code' => $code]);
    }

    // ── POST /wms/cctv/bridge/pair (공개, 페어코드) → 영구 토큰 발급 ──────────
    //    에이전트 최초 실행 시 1회. 페어코드는 소진(교체). 세션 불필요(index.php /wms/ bypass).
    public static function pairBridge(Request $req, Response $res): Response
    {
        self::ensureTables();
        $b = self::body($req);
        $code = trim((string)($b['pair_code'] ?? ''));
        if (strlen($code) < 8) return self::json($res, ['ok' => false, 'error' => 'invalid pair code'], 400);
        $st = self::db()->prepare("SELECT * FROM wms_cctv_bridges WHERE pair_code=? LIMIT 1");
        $st->execute([$code]);
        $brg = $st->fetch(\PDO::FETCH_ASSOC);
        if (!$brg) return self::json($res, ['ok' => false, 'error' => 'pair code not found'], 404);

        $token = self::randToken(40);
        $up = self::db()->prepare("UPDATE wms_cctv_bridges SET token_hash=?, pair_code='', status='active', agent_version=?, last_seen_at=?, updated_at=? WHERE id=?");
        $up->execute([hash('sha256', $token), (string)($b['version'] ?? ''), self::now(), self::now(), (int)$brg['id']]);
        // 토큰은 이 응답 1회만 평문 반환(에이전트가 저장). 서버는 해시만 보관.
        return self::json($res, ['ok' => true, 'token' => $token, 'bridge_id' => (int)$brg['id'], 'name' => (string)$brg['name'], 'poll_interval' => 5]);
    }

    // ── POST /wms/cctv/bridge/heartbeat (브리지 토큰) ────────────────────────
    //    liveness + ONVIF 로 발견한 장비 목록(모델/제조사/RTSP URI) 보고 → 콘솔에서 클릭 등록.
    public static function heartbeatBridge(Request $req, Response $res): Response
    {
        self::ensureTables();
        $brg = self::authorizeBridge($req);
        if (!$brg) return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $b = self::body($req);
        $disc = isset($b['discovered']) && is_array($b['discovered']) ? json_encode(array_slice($b['discovered'], 0, 64), JSON_UNESCAPED_UNICODE) : null;
        $sql = "UPDATE wms_cctv_bridges SET last_seen_at=?, status='active', agent_version=?" . ($disc !== null ? ", discovered=?" : "") . " WHERE id=?";
        $params = [self::now(), (string)($b['version'] ?? ($brg['agent_version'] ?? ''))];
        if ($disc !== null) $params[] = $disc;
        $params[] = (int)$brg['id'];
        self::db()->prepare($sql)->execute($params);
        return self::json($res, ['ok' => true]);
    }

    // ── GET /wms/cctv/bridge/poll (브리지 토큰) ──────────────────────────────
    //    이 브리지에 매인 활성 카메라 목록 + 지금 송출해야 할지(want). RTSP URL 은 자격증명 포함
    //    복호화 반환(TLS + 페어링된 신뢰 에이전트). 표준 스트림 없는 P2P/독자장비는 host 가 LAN 주소.
    public static function pollBridge(Request $req, Response $res): Response
    {
        self::ensureTables();
        $brg = self::authorizeBridge($req);
        if (!$brg) return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $t = (string)$brg['tenant_id'];
        self::db()->prepare("UPDATE wms_cctv_bridges SET last_seen_at=?, status='active' WHERE id=?")->execute([self::now(), (int)$brg['id']]);

        $st = self::db()->prepare("SELECT * FROM wms_cameras WHERE tenant_id=? AND source='bridge' AND bridge_id=? AND active=1");
        $st->execute([$t, (int)$brg['id']]);
        $cams = [];
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $c) {
            $id = (int)$c['id'];
            $rtsp = self::buildUrl($c, self::templateFor($c, 'rtsp'), true);
            $snap = self::buildUrl($c, self::templateFor($c, 'snapshot'), true);
            $cams[] = [
                'id' => $id, 'name' => (string)$c['name'],
                'protocol' => (string)$c['protocol'],
                'rtsp_url' => $rtsp,                          // 자격증명 포함(에이전트가 로컬 접속)
                'snapshot_url' => $snap,
                'direct_url' => (string)($c['direct_url'] ?? ''),
                'ingest_path' => '/api/wms/cctv/bridge/ingest/' . $id, // 여기로 HLS 업로드
                'wanted' => self::wantActive($t, $id),        // true 인 것만 송출(CPU 절약)
            ];
        }
        return self::json($res, ['ok' => true, 'cameras' => $cams, 'poll_interval' => 5, 'want_ttl' => self::WANT_TTL]);
    }

    // ── POST /wms/cctv/bridge/ingest/{id}?file=index.m3u8|segNNN.ts (브리지 토큰) ─
    //    에이전트가 만든 HLS 를 업로드. 파일명 화이트리스트로 경로탈출 차단. 카메라 소유권 검증.
    public static function ingestBridge(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $brg = self::authorizeBridge($req);
        if (!$brg) return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $t = (string)$brg['tenant_id'];
        $camId = (int)$args['id'];

        // 카메라가 이 브리지 소속인지 확인(테넌트 + bridge_id 바인딩).
        $cam = self::row($t, $camId);
        if (!$cam || (string)($cam['source'] ?? '') !== 'bridge' || (int)($cam['bridge_id'] ?? 0) !== (int)$brg['id']) {
            return self::json($res, ['ok' => false, 'error' => 'forbidden'], 403);
        }

        $file = basename((string)($req->getQueryParams()['file'] ?? ''));
        if ($file !== 'index.m3u8' && !preg_match('/^seg\d+\.ts$/', $file)) {
            return self::json($res, ['ok' => false, 'error' => 'bad file'], 400);
        }
        $dir = self::streamDir($t, $camId);
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return self::json($res, ['ok' => false, 'error' => 'dir'], 500);

        $data = (string)$req->getBody();
        if (strlen($data) > self::MAX_BYTES) return self::json($res, ['ok' => false, 'error' => 'too large'], 413);
        @file_put_contents($dir . '/' . $file . '.tmp', $data);
        @rename($dir . '/' . $file . '.tmp', $dir . '/' . $file); // 원자적 교체(부분읽기 방지)
        @touch($dir . '/last_access');
        return self::json($res, ['ok' => true, 'wanted' => self::wantActive($t, $camId)]);
    }

    /** 혼동 없는 랜덤 토큰. Math.random 아님 — random_bytes(암호학적). */
    private static function randToken(int $len, ?string $alphabet = null): string
    {
        if ($alphabet === null) {
            return substr(bin2hex(random_bytes((int)ceil($len / 2))), 0, $len);
        }
        $out = ''; $n = strlen($alphabet);
        $bytes = random_bytes($len);
        for ($i = 0; $i < $len; $i++) $out .= $alphabet[ord($bytes[$i]) % $n];
        return $out;
    }
}
