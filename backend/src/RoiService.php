<?php
declare(strict_types=1);

namespace Genie;

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
     * [현 차수] marketing_roi 런타임 자가치유.
     *
     * 이 테이블은 Db.php migrate()·migrations/ 어디에도 CREATE 가 없는 유령이었다(전역 grep 0건).
     * 현재 RoiService 는 라우트/호출자가 0건인 데드코드라 무증상이지만, 누군가 배선하는 순간
     * calculateAndSave() 의 INSERT 가 예외 → 재throw 로 500 이 된다. 다른 핸들러의 ensure* 패턴에 맞춘다.
     */
    private static bool $ensured = false;

    private static function ensureTable(PDO $pdo): void
    {
        if (self::$ensured) return;
        self::$ensured = true;

        $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        // 멱등키 = (tenant_id, channel, analysis_date) — 같은 날 같은 채널 재계산 시 upsert.
        $sql = $mysql
            ? "CREATE TABLE IF NOT EXISTS marketing_roi (
                 id BIGINT AUTO_INCREMENT PRIMARY KEY,
                 tenant_id VARCHAR(64) NOT NULL,
                 channel VARCHAR(64) NOT NULL,
                 ad_spend DECIMAL(18,2) NOT NULL DEFAULT 0,
                 revenue DECIMAL(18,2) NOT NULL DEFAULT 0,
                 roi_percent DECIMAL(12,2) NOT NULL DEFAULT 0,
                 roas_percent DECIMAL(12,2) NOT NULL DEFAULT 0,
                 analysis_date DATE NOT NULL,
                 created_at DATETIME NULL,
                 UNIQUE KEY uq_marketing_roi (tenant_id, channel, analysis_date)
               ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS marketing_roi (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 tenant_id TEXT NOT NULL,
                 channel TEXT NOT NULL,
                 ad_spend REAL NOT NULL DEFAULT 0,
                 revenue REAL NOT NULL DEFAULT 0,
                 roi_percent REAL NOT NULL DEFAULT 0,
                 roas_percent REAL NOT NULL DEFAULT 0,
                 analysis_date TEXT NOT NULL,
                 created_at TEXT NULL,
                 UNIQUE (tenant_id, channel, analysis_date)
               )";
        try { $pdo->exec($sql); } catch (\Throwable $e) { error_log('[RoiService.ensureTable] ' . $e->getMessage()); }
    }

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
            self::ensureTable($pdo);

            // [현 차수] ON DUPLICATE KEY 는 MySQL 전용이라 SQLite 폴백에서 구문오류였다 → 드라이버 분기.
            $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
            $upsert = $mysql
                ? "ON DUPLICATE KEY UPDATE
                     ad_spend = VALUES(ad_spend),
                     revenue = VALUES(revenue),
                     roi_percent = VALUES(roi_percent),
                     roas_percent = VALUES(roas_percent)"
                : "ON CONFLICT(tenant_id, channel, analysis_date) DO UPDATE SET
                     ad_spend = excluded.ad_spend,
                     revenue = excluded.revenue,
                     roi_percent = excluded.roi_percent,
                     roas_percent = excluded.roas_percent";

            $sql = "INSERT INTO marketing_roi
                    (tenant_id, channel, ad_spend, revenue, roi_percent, roas_percent, analysis_date, created_at)
                    VALUES (:tenant_id, :channel, :ad_spend, :revenue, :roi_percent, :roas_percent, :analysis_date, :created_at)
                    $upsert";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($analysisResult);

            return [
                'status' => 'success',
                'data' => $analysisResult
            ];
        } catch (\Throwable $e) {
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
            self::ensureTable($pdo);
            // [현 차수] AVG(roi_percent) 는 일자별 ROI 의 단순평균이라 지출 규모를 무시한다
            //   (지출 1만원 날의 ROI 와 1억원 날의 ROI 를 같은 무게로 평균 → 왜곡).
            //   기간 ROI 는 비율-합(ratio of sums)으로 산출한다: (Σ매출 − Σ지출) / Σ지출 × 100.
            $stmt = $pdo->prepare("
                SELECT channel,
                       SUM(ad_spend) as total_spend,
                       SUM(revenue)  as total_revenue,
                       CASE WHEN SUM(ad_spend) > 0
                            THEN (SUM(revenue) - SUM(ad_spend)) / SUM(ad_spend) * 100
                            ELSE 0 END as avg_roi
                FROM marketing_roi
                WHERE tenant_id = ? AND analysis_date BETWEEN ? AND ?
                GROUP BY channel
            ");
            $stmt->execute([$tenantId, $startDate, $endDate]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return [];
        }
    }
}