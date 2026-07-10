<?php

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * [현 차수] 상품 이미지 공개 호스팅.
 *
 * 왜 필요한가 — 277차에 네이버·Shopify 만 이미지를 실을 수 있었던 근본원인:
 *   상품등록 폼은 이미지를 base64 dataURL 로 보관하는데, 채널 상품 API 는 거의 전부 **공개 URL** 을 요구한다.
 *   네이버는 자체 이미지 업로드 API 가 있어 URL 을 받아왔고(naverUploadImages), Shopify 는 attachment(base64)를
 *   직접 받는다. 나머지 17개 채널은 업로드 경로가 없어 ChannelSync::uploadImagesForChannel 이 dataURL 을
 *   **버렸고**(dropped), 그래서 어댑터에는 애초에 보낼 이미지가 없었다.
 *
 * 해법 — 채널마다 업로드 API 를 추측하지 않는다(추측=400 의 원인). 우리가 공개 URL 을 발급한다.
 *   dataURL → 내용주소(sha256) 파일 저장 → `{publicBase}/api/media/{sha}.{ext}` 반환.
 *   채널 서버가 이 URL 을 가져가 자기 CDN 에 복사한다(모든 채널의 공통 계약).
 *
 * 설계 제약
 *   - 인증 없음: 채널 서버가 토큰 없이 가져갈 수 있어야 한다. 상품 이미지는 어차피 채널에 공개될 자산이다.
 *   - 내용주소: 같은 이미지는 같은 URL(중복 저장 0·큐 재시도 시 URL 안정). 파일명 추측 불가.
 *   - dist 바깥 저장: 프론트 dist 는 배포 때 `rsync --delete` 로 통째 교체된다. 거기 두면 배포마다 이미지가 사라진다.
 *   - PII 없음: 상품 이미지만. 업로드 주체는 인증된 writeback 경로(Catalog)뿐이며 이 클래스는 공개 write 를 열지 않는다.
 */
final class MediaHost
{
    /** 채널이 실제로 받아주는 형식만 허용(허용목록 — 확장자 위조로 임의 파일을 심을 수 없다). */
    private const ALLOWED = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
    ];
    private const MIME_BY_EXT = [
        'jpg'  => 'image/jpeg',
        'png'  => 'image/png',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
    ];
    /** 장당 상한. 채널 대부분이 10MB 내외를 거부한다. */
    private const MAX_BYTES = 8 * 1024 * 1024;

    /** 저장 루트 = repo-루트 `data/media` (backend/src → ../../data). dist 스왑과 무관하게 영속. */
    private static function root(): string
    {
        return __DIR__ . '/../../../data/media';
    }

    /**
     * 공개 베이스 URL — 운영/데모를 가른다. 데모가 운영 URL 을 발급하면 채널이 **운영 도메인**에서 데모 이미지를
     * 가져간다(환경 혼입) → 반드시 분리한다.
     *
     * ★`Db::env()` 를 쓰면 안 된다: 그것은 `GENIE_ENV` 환경변수를 보는데 운영·데모 어느 .env 에도 없어
     *   데모에서도 'production' 을 반환한다(실측 확인). 실제 구분자는 연결 DB명(`geniego_roi_demo`)이며
     *   그것을 보는 것이 `Db::envLabel()` 이다.
     */
    private static function publicBase(): string
    {
        $b = getenv('APP_PUBLIC_URL');
        if (is_string($b) && $b !== '') return rtrim($b, '/');
        return (Db::envLabel() === 'demo') ? 'https://demo.genieroi.com' : 'https://www.genieroi.com';
    }

    /**
     * dataURL(또는 이미 공개 URL)을 공개 URL 로 만든다.
     *   - http(s) 로 시작하면 그대로 통과(이미 호스팅됨).
     *   - data:image/*;base64,... 이면 저장 후 URL 발급.
     *   - 그 외/실패는 null(호출부가 "버렸다"고 정직하게 알린다 — 가짜 URL 을 만들지 않는다).
     */
    public static function store(string $src): ?string
    {
        $src = trim($src);
        if ($src === '') return null;
        if (str_starts_with($src, 'http://') || str_starts_with($src, 'https://')) return $src;

        if (!preg_match('#^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$#s', $src, $m)) return null;
        $mime = strtolower($m[1]);
        if (!isset(self::ALLOWED[$mime])) return null;

        $bin = base64_decode($m[2], true);
        if ($bin === false || strlen($bin) < 64 || strlen($bin) > self::MAX_BYTES) return null;

        // 확장자를 신뢰하지 않는다 — 실제 바이트로 이미지인지 확인(위장 파일 차단).
        $info = @getimagesizefromstring($bin);
        if ($info === false || empty($info['mime']) || !isset(self::ALLOWED[strtolower((string)$info['mime'])])) return null;
        $ext = self::ALLOWED[strtolower((string)$info['mime'])];

        $sha = hash('sha256', $bin);
        $dir = self::root() . '/' . substr($sha, 0, 2);
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) return null;
        $path = $dir . '/' . $sha . '.' . $ext;

        if (!is_file($path)) {
            // 원자적 쓰기 — 부분 파일이 공개 URL 로 노출되면 채널이 깨진 이미지를 가져간다.
            $tmp = $path . '.tmp' . getmypid();
            if (@file_put_contents($tmp, $bin) === false) { @unlink($tmp); return null; }
            if (!@rename($tmp, $path)) { @unlink($tmp); return null; }
            @chmod($path, 0644);
        }
        return self::publicBase() . '/api/media/' . $sha . '.' . $ext;
    }

    /** 여러 장 일괄. 실패분은 제외하고, 몇 장 버렸는지 함께 돌려준다. */
    public static function storeMany(array $images): array
    {
        $urls = []; $dropped = 0;
        foreach ($images as $img) {
            $u = self::store((string)$img);
            if ($u === null) { $dropped++; continue; }
            $urls[] = $u;
        }
        return ['urls' => $urls, 'dropped' => $dropped];
    }

    /**
     * 우리가 발급한 URL 이면 대응하는 로컬 파일 경로를 돌려준다(아니면 null).
     * 채널이 파일 본문을 요구할 때 자기 자신에게 HTTP 요청을 걸지 않기 위해 필요하다
     * (같은 FPM 풀에 재진입하면 워커 고갈로 교착될 수 있다).
     */
    public static function localPath(string $url): ?string
    {
        if (!preg_match('#/(?:api/)?media/([a-f0-9]{64})\.(jpg|png|gif|webp)$#', $url, $m)) return null;
        $path = self::root() . '/' . substr($m[1], 0, 2) . '/' . $m[1] . '.' . $m[2];
        return is_file($path) ? $path : null;
    }

    /** 저장 가능한 상태인지(디렉터리 생성·쓰기 권한). 실패 시 사유를 문자열로. */
    public static function writable(): array
    {
        $root = self::root();
        if (!is_dir($root) && !@mkdir($root, 0755, true) && !is_dir($root)) {
            return ['ok' => false, 'error' => 'media 디렉터리를 만들 수 없습니다: ' . $root];
        }
        if (!is_writable($root)) {
            return ['ok' => false, 'error' => 'media 디렉터리에 쓸 수 없습니다(소유권 확인 필요): ' . $root];
        }
        return ['ok' => true, 'root' => $root];
    }

    /** 저장소 사용량(파일 수·바이트). 디스크 모니터링용. */
    public static function usage(): array
    {
        $files = 0; $bytes = 0;
        foreach (glob(self::root() . '/*/*.{jpg,png,gif,webp}', GLOB_BRACE) ?: [] as $f) {
            $files++; $bytes += (int)@filesize($f);
        }
        return ['files' => $files, 'bytes' => $bytes, 'mb' => round($bytes / 1048576, 1)];
    }

    /**
     * 고아 이미지 청소. **참조된 파일은 절대 지우지 않는다.**
     *
     * 왜 필요한가 — 이 저장소는 상품을 등록할 때마다 커진다. 삭제 경로가 없으면 무한 증가하고,
     * 실제로 이 서버는 누적 배포 백업으로 루트 파일시스템이 100% 찬 적이 있다(같은 실패 유형).
     *
     * 안전장치 2중:
     *   ① 참조 수집 — catalog_listing / channel_products 의 image_url·images_json 에 등장하는 sha 는 보존.
     *   ② 유예기간 — 방금 저장됐지만 아직 어느 테이블에도 반영되지 않은 파일을 지우지 않도록
     *      mtime 이 $graceDays 보다 오래된 파일만 후보로 삼는다.
     *
     * @return array{scanned:int, referenced:int, deleted:int, freed_bytes:int, kept_recent:int}
     */
    public static function gc(\PDO $pdo, int $graceDays = 7): array
    {
        $referenced = [];
        $collect = static function (?string $s) use (&$referenced): void {
            if ($s === null || $s === '') return;
            if (preg_match_all('/([a-f0-9]{64})\.(?:jpg|png|gif|webp)/', $s, $m)) {
                foreach ($m[1] as $sha) $referenced[$sha] = true;
            }
        };
        foreach ([
            "SELECT image_url, images_json FROM catalog_listing",
            "SELECT image_url, images_json FROM channel_products",
        ] as $sql) {
            try {
                foreach ($pdo->query($sql) ?: [] as $row) {
                    $collect(isset($row['image_url']) ? (string)$row['image_url'] : null);
                    $collect(isset($row['images_json']) ? (string)$row['images_json'] : null);
                }
            } catch (\Throwable $e) { /* 테이블 부재 = 참조 없음 */ }
        }
        // 큐에 남아 아직 전송되지 않은 잡의 payload 도 참조로 본다(전송 전에 파일이 사라지면 이미지 없이 등록된다).
        try {
            $st = $pdo->query("SELECT payload FROM catalog_writeback_job WHERE status IN ('queued','awaiting_credentials','running')");
            foreach ($st ?: [] as $row) $collect(isset($row['payload']) ? (string)$row['payload'] : null);
        } catch (\Throwable $e) {}

        $cutoff = time() - max(1, $graceDays) * 86400;
        $scanned = 0; $deleted = 0; $freed = 0; $keptRecent = 0;
        foreach (glob(self::root() . '/*/*.{jpg,png,gif,webp}', GLOB_BRACE) ?: [] as $f) {
            $scanned++;
            $sha = pathinfo($f, PATHINFO_FILENAME);
            if (isset($referenced[$sha])) continue;
            if ((int)@filemtime($f) > $cutoff) { $keptRecent++; continue; }
            $size = (int)@filesize($f);
            if (@unlink($f)) { $deleted++; $freed += $size; }
        }
        return ['scanned' => $scanned, 'referenced' => count($referenced), 'deleted' => $deleted, 'freed_bytes' => $freed, 'kept_recent' => $keptRecent];
    }

    /**
     * GET /api/media/{name} — 공개 서빙(무인증). 채널 서버가 이 URL 을 가져간다.
     * ★경로 조작 차단: 이름은 sha256 64자 + 허용 확장자만. `..`·슬래시는 정규식에서 이미 불가능하다.
     */
    public static function serve(Request $req, Response $res, array $args): Response
    {
        $name = (string)($args['name'] ?? '');
        if (!preg_match('/^([a-f0-9]{64})\.(jpg|png|gif|webp)$/', $name, $m)) {
            return $res->withStatus(404);
        }
        [$_, $sha, $ext] = $m;
        $path = self::root() . '/' . substr($sha, 0, 2) . '/' . $sha . '.' . $ext;
        if (!is_file($path)) return $res->withStatus(404);

        $body = @file_get_contents($path);
        if ($body === false) return $res->withStatus(404);
        $res->getBody()->write($body);
        return $res
            ->withHeader('Content-Type', self::MIME_BY_EXT[$ext])
            ->withHeader('Content-Length', (string)strlen($body))
            // 내용주소라 내용이 바뀌면 URL 도 바뀐다 → 영구 캐시 안전.
            ->withHeader('Cache-Control', 'public, max-age=31536000, immutable')
            ->withHeader('X-Content-Type-Options', 'nosniff');
    }
}
