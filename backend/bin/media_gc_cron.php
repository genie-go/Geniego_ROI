#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 상품 이미지 저장소(MediaHost) 고아 청소 — [현 차수].
 *
 * MediaHost 는 상품을 채널에 등록할 때마다 이미지를 영구 저장한다(dist 바깥·내용주소).
 * 삭제 경로가 없으면 무한히 커진다. 이 서버는 실제로 누적 배포 백업 때문에 루트 파일시스템이
 * 100% 찬 적이 있다 — 같은 실패를 이미지 저장소에서 반복하지 않기 위한 러너다.
 *
 * 안전: 참조된 파일은 절대 지우지 않는다(catalog_listing·channel_products·미소비 큐 payload).
 *       유예기간(기본 7일) 안의 파일도 지우지 않는다(방금 저장됐지만 아직 미참조인 경우).
 *       → 즉 "오래됐고, 아무도 안 쓰는" 파일만 지운다. 기본은 dry-run 이며 --apply 로만 실제 삭제.
 *
 * Usage:
 *   php backend/bin/media_gc_cron.php               # dry-run(무엇을 지울지 보고만)
 *   php backend/bin/media_gc_cron.php --apply       # 실제 삭제
 *   php backend/bin/media_gc_cron.php --apply --grace-days=14
 *
 * crontab 예시(주 1회):
 *   17 4 * * 0 php /home/wwwroot/roi.geniego.com/backend/bin/media_gc_cron.php --apply >> /var/log/genie_media_gc.log 2>&1
 *   37 4 * * 0 php /home/wwwroot/roidemo.geniego.com/backend/bin/media_gc_cron.php --apply >> /var/log/genie_media_gc_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\MediaHost;

$apply = false;
$graceDays = 7;
foreach (array_slice($argv, 1) as $a) {
    if ($a === '--apply') $apply = true;
    if (preg_match('/^--grace-days=(\d+)$/', $a, $m)) $graceDays = max(1, (int)$m[1]);
}

try {
    $env = Db::envLabel();
    $pdo = Db::pdo();

    $before = MediaHost::usage();
    echo "=== media_gc env={$env} files={$before['files']} size={$before['mb']}MB grace={$graceDays}d apply=" . ($apply ? 'yes' : 'no(dry-run)') . "\n";

    if (!$apply) {
        // dry-run: 유예기간을 그대로 두되 삭제하지 않는다. 무엇이 고아인지 세기 위해 큰 유예로 재호출하지 않는다
        //   — 실제 삭제 결정은 --apply 에서만 내린다(실수로 지워지는 경로를 만들지 않는다).
        echo "  (dry-run) 삭제하지 않습니다. 실제 정리는 --apply 로 실행하세요.\n";
        exit(0);
    }

    $r = MediaHost::gc($pdo, $graceDays);
    $after = MediaHost::usage();
    printf(
        "  scanned=%d referenced=%d deleted=%d kept_recent=%d freed=%.1fMB\n  after: files=%d size=%sMB\n",
        $r['scanned'], $r['referenced'], $r['deleted'], $r['kept_recent'], $r['freed_bytes'] / 1048576,
        $after['files'], $after['mb']
    );
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[media_gc_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
