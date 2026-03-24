<?php
// 30계정 레코드 즉시 비활성화 스크립트
// 사용 후 반드시 삭제할 것
$bsPath = '/home/ec2-user/roi.genie-go.com/backend/src/bootstrap.php';
if (!file_exists($bsPath)) {
    // Apache 환경에서 실행 시 경로 탐색
    $bsPath = realpath(__DIR__ . '/../src/bootstrap.php');
}
require_once $bsPath;
try {
    $pdo = Genie\Db::pdo();
    $stmt = $pdo->prepare(
        "UPDATE menu_tier_pricing SET is_active=0 WHERE menu_key LIKE '%__30' AND is_active=1"
    );
    $stmt->execute();
    $cnt = $stmt->rowCount();
    echo json_encode(['ok' => true, 'deactivated' => $cnt, 'msg' => "30계정 레코드 {$cnt}건 비활성화 완료"]);
} catch (\Throwable $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
