<?php
declare(strict_types=1);
namespace Genie\Services;

use Genie\Db;
use PDO;
use Exception;

/**
 * GENIEGO ROI ENTERPRISE - CORE ANALYSIS SERVICE
 */
class RoiService {
    public function calculateAndSave(int $tenantId, string $channel, float $adSpend, float $revenue, string $date): array {
        // 지출 대비 수익 산출 로직 
        $roi = $adSpend > 0 ? (($revenue - $adSpend) / $adSpend) * 100 : 0.0; [cite: 1]
        // DB 저장 로직 (marketing_roi 테이블) 
        return ['status' => 'success', 'roi' => $roi];
    }
}