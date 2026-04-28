<?php
declare(strict_types=1);

namespace Genie\Services;

use Genie\Db;
use PDO;
use Exception;

/**
 * GENIEGO ROI ENTERPRISE - CORE ANALYSIS SERVICE
 * 역할: 마케팅 채널별 지출 대비 수익 분석 및 DB 저장
 */
class RoiService
{
    /**
     * ROI 계산 및 결과 저장
     * * @param int $tenantId 테넌트(고객) ID
     * @param string $channel 마케팅 채널 (예: Google, Meta, Naver)
     * @param float $adSpend 광고 지출액
     * @param float $revenue 발생 매출액
     * @param string $date 분석 일자 (YYYY-MM-DD)
     * @return array 분석 결과 리포트
     */
    public function calculateAndSave(int $tenantId, string $channel, float $adSpend, float $revenue, string $date): array
    {
        // 1. ROI 및 ROAS 산출 로직 (엔터프라이즈 표준 수식)
        // ROI = ((매출 - 지출) / 지출) * 100
        // ROAS = (매출 / 지출) * 100
        $roi = 0.0;
        $roas = 0.0;

        if ($adSpend > 0) {
            $roi = (($revenue - $adSpend) / $adSpend) * 100;
            $roas = ($revenue / $adSpend) * 100;
        }

        // 2. 결과 데이터 구조화
        $analysisResult = [
            'tenant_id' => $tenantId,
            'channel' => $channel,
            'ad_spend' => round($adSpend, 2),
            'revenue' => round($revenue, 2),
            'roi_percent' => round($roi, 2),
            'roas_percent' => round($roas, 2),
            'analysis_date' => $date,
            'created_at' => date('Y-m-d H:i:s')
        ];

        // 3. 데이터베이스 저장 (Atomic Transaction 권장)
        try {
            $pdo = Db::pdo();
            $sql = "INSERT INTO marketing_roi 
                    (tenant_id, channel, ad_spend, revenue, roi_percent, roas_percent, analysis_date, created_at)
                    VALUES (:tenant_id, :channel, :ad_spend, :revenue, :roi_percent, :roas_percent, :analysis_date, :created_at)
                    ON DUPLICATE KEY UPDATE 
                    ad_spend = VALUES(ad_spend), 
                    revenue = VALUES(revenue), 
                    roi_percent = VALUES(roi_percent), 
                    roas_percent = VALUES(roas_percent)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($analysisResult);

            return [
                'status' => 'success',
                'data' => $analysisResult
            ];
        } catch (Exception $e) {
            // 에러 로깅 및 예외 처리
            error_log("ROI Save Error: " . $e->getMessage());
            throw new Exception("데이터 저장 중 오류가 발생했습니다: " . $e->getMessage());
        }
    }

    /**
     * 특정 기간의 ROI 리포트 조회
     */
    public function getReport(int $tenantId, string $startDate, string $endDate): array
    {
        try {
            $pdo = Db::pdo();
            $stmt = $pdo->prepare("
                SELECT channel, SUM(ad_spend) as total_spend, SUM(revenue) as total_revenue,
                       AVG(roi_percent) as avg_roi
                FROM marketing_roi
                WHERE tenant_id = ? AND analysis_date BETWEEN ? AND ?
                GROUP BY channel
            ");
            $stmt->execute([$tenantId, $startDate, $endDate]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return [];
        }
    }
}