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
$logDays = 90; // [279차 감사 J-P1] append-only 로그 테이블 보존기간(일). 종결 상태 + 이 기간 초과분만 정리.
foreach (array_slice($argv, 1) as $a) {
    if ($a === '--apply') $apply = true;
    if (preg_match('/^--grace-days=(\d+)$/', $a, $m)) $graceDays = max(1, (int)$m[1]);
    if (preg_match('/^--log-days=(\d+)$/', $a, $m)) $logDays = max(7, (int)$m[1]);
}

/**
 * [279차 감사 J-P1] append-only 로그/딜리버리 테이블 무한성장 차단(278차 dist.bak 루트FS 100% 사고의 DB 판).
 *   media_gc 는 파일만 정리했고 DB 로그 테이블(rule_engine_log·webhook_delivery·catalog_writeback_job 등)은
 *   회수 경로가 전무했다. "종결 상태 + 보존기간 초과" 행만 삭제한다(진행중 행은 절대 미삭제). 각 테이블은
 *   독립 try/catch(테이블·컬럼 부재 환경 무해). dry-run 에선 건수만 보고.
 */
function pruneLogTables(\PDO $pdo, int $days, bool $apply): void
{
    $cut = gmdate('Y-m-d H:i:s', time() - $days * 86400);
    $cutIso = gmdate('Y-m-d\TH:i:s\Z', time() - $days * 86400);
    // [table, timestampCol, terminalWhere] — terminalWhere 는 진행중 행 보호(종결 상태만 대상).
    $specs = [
        ['rule_engine_log',        'created_at', ''],
        ['webhook_delivery',       'created_at', "status IN ('delivered','failed','dead','sent')"],
        ['catalog_writeback_job',  'created_at', "status IN ('done','superseded','failed')"],
        ['server_conversion_log',  'created_at', ''],
    ];
    foreach ($specs as [$tbl, $tsCol, $term]) {
        foreach ([$cut, $cutIso] as $cutVal) { // VARCHAR(ISO) / DATETIME 양쪽 대응
            try {
                $where = "$tsCol < ?" . ($term !== '' ? " AND $term" : '');
                if (!$apply) {
                    $cs = $pdo->prepare("SELECT COUNT(*) FROM $tbl WHERE $where");
                    $cs->execute([$cutVal]);
                    $n = (int)$cs->fetchColumn();
                    if ($n > 0) { echo "  (dry-run) {$tbl}: {$n}행 정리 대상(> {$days}d)\n"; }
                } else {
                    $ds = $pdo->prepare("DELETE FROM $tbl WHERE $where");
                    $ds->execute([$cutVal]);
                    $n = $ds->rowCount();
                    if ($n > 0) { echo "  {$tbl}: {$n}행 삭제(> {$days}d)\n"; }
                }
                break; // 성공한 포맷에서 종료(중복 실행 방지)
            } catch (\Throwable $e) { /* 다음 포맷 시도 또는 테이블/컬럼 부재 무해 */ }
        }
    }
}

try {
    $env = Db::envLabel();
    $pdo = Db::pdo();

    $before = MediaHost::usage();
    echo "=== media_gc env={$env} files={$before['files']} size={$before['mb']}MB grace={$graceDays}d apply=" . ($apply ? 'yes' : 'no(dry-run)') . "\n";

    if (!$apply) {
        // dry-run: 유예기간을 그대로 두되 삭제하지 않는다. 무엇이 고아인지 세기 위해 큰 유예로 재호출하지 않는다
        //   — 실제 삭제 결정은 --apply 에서만 내린다(실수로 지워지는 경로를 만들지 않는다).
        echo "  (dry-run) 파일은 삭제하지 않습니다. 실제 정리는 --apply 로 실행하세요.\n";
        echo "--- DB 로그 테이블 retention(dry-run, > {$logDays}d) ---\n";
        pruneLogTables($pdo, $logDays, false);
        exit(0);
    }

    $r = MediaHost::gc($pdo, $graceDays);
    $after = MediaHost::usage();
    printf(
        "  scanned=%d referenced=%d deleted=%d kept_recent=%d freed=%.1fMB\n  after: files=%d size=%sMB\n",
        $r['scanned'], $r['referenced'], $r['deleted'], $r['kept_recent'], $r['freed_bytes'] / 1048576,
        $after['files'], $after['mb']
    );
    echo "--- DB 로그 테이블 retention(> {$logDays}d) ---\n";
    pruneLogTables($pdo, $logDays, true);
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[media_gc_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
