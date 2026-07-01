<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * [237차] Creative AI Studio — Smartly AI Studio 급 "대량 변형 생성 + Creative Insights".
 *
 * 글로벌 경쟁(Smartly AI Studio·Madgicx Creative Insights) 대비 갭이던 ①대량 카피/비주얼 변형 생성
 * ②소재별 성과 스코어링(승자/패자)을 기존 인프라 재사용으로 구현(중복0):
 *   - 텍스트 변형     : ClaudeAI::complete (쿼터·테넌트격리 내장)
 *   - 비주얼 생성     : ClaudeAI::generateImage (imgGenConfig·DALL·E/Stability·공용키 quota 재사용)
 *   - 저장            : ad_design 테이블(ClaudeAI adDesignSave 와 동일 스키마, 캠페인 자동화가 그대로 소비)
 *   - 소재↔매체 매핑  : creative_variant(신규, 경량) — AutoCampaign::launch 가 design_id↔ad_ext_id 적재
 *   - 성과 소스       : ad_insight_agg(ad_id, 소재단위) 조인 → CTR/CVR/ROAS 스코어
 *
 * 라우트(/v422/ai/studio/* — index.php 세션게이트가 /v422/ai/ 를 이미 커버, authedTenant 격리):
 *   POST /v422/ai/studio/batch     대량 변형 생성 → ad_design draft N건
 *   GET  /v422/ai/studio/insights  소재별 성과 스코어(승자/패자 랭킹)
 */
final class CreativeStudio
{
    private const MAX_VARIANTS = 8;   // 1회 생성 상한(비용·쿼터 보호)

    /** 세션 인증 테넌트(위조불가 — auth_tenant/authedTenant). 미인증 시 'unknown'. */
    private static function tenant(Request $req): string
    {
        $t = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($t !== '') return $t;
        $u = UserAuth::authedTenant($req);
        return ($u !== null && $u !== '') ? $u : 'unknown';
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json; charset=utf-8')->withStatus($status);
    }

    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        return isset($b['data']) && is_array($b['data']) ? $b['data'] : $b;
    }

    /** creative_variant(+ad_design 보강) 멱등 생성 — driver-aware(MySQL/SQLite). */
    public static function migrate(\PDO $pdo): void
    {
        static $done = false;
        if ($done) return; $done = true;
        $isMy = false;
        try { $isMy = strtolower((string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)) === 'mysql'; } catch (\Throwable $e) {}
        $auto = $isMy ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS creative_variant (
                id $auto,
                tenant_id VARCHAR(100) NOT NULL,
                campaign_id INT,
                design_id INT NOT NULL,
                channel VARCHAR(40),
                ad_ext_id VARCHAR(255),
                adset_ext_id VARCHAR(255),
                label VARCHAR(80),
                created_at VARCHAR(32)
            )");
        } catch (\Throwable $e) {}
        // 멱등: 동일 (tenant, ad_ext_id) 중복 적재 방지(재집행 시 갱신은 앱계층 upsert).
        try { $pdo->exec("CREATE UNIQUE INDEX uq_cv_ad ON creative_variant(tenant_id, ad_ext_id)"); } catch (\Throwable $e) {}
        // ad_design 부재 환경(신규/데모) 대비 — ClaudeAI adDesignSave 와 동일 스키마(IF NOT EXISTS=기존 무영향).
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS ad_design (
                id $auto,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'unknown',
                category VARCHAR(120), product TEXT, channel VARCHAR(40),
                spec_json MEDIUMTEXT, svg MEDIUMTEXT,
                status VARCHAR(20) DEFAULT 'approved', created_at VARCHAR(32) NOT NULL,
                period_start VARCHAR(10), period_end VARCHAR(10)
            )");
        } catch (\Throwable $e) {}
    }

    /** ```json 펜스/잡텍스트를 벗겨 JSON 디코드(LLM 출력 방어적 파싱). */
    private static function parseJson(?string $raw)
    {
        $s = trim((string)$raw);
        if ($s === '') return null;
        if (preg_match('/```(?:json)?\s*(.+?)```/is', $s, $m)) $s = trim($m[1]);
        $j = json_decode($s, true);
        if ($j !== null) return $j;
        // 배열/객체 본문만 추출 재시도
        if (preg_match('/(\[.*\]|\{.*\})/s', $s, $m2)) return json_decode($m2[1], true);
        return null;
    }

    /**
     * POST /v422/ai/studio/batch — 대량 카피 변형(+선택 공유 비주얼) 생성 → ad_design draft N건.
     * body: { product, category, channel, tone, audience, count(1..8), with_image(bool), ratio('1:1'|'9:16'|'16:9') }
     */
    public static function batch(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        $d = self::body($req);

        $product  = trim((string)($d['product'] ?? $d['product_description'] ?? ''));
        $category = trim((string)($d['category'] ?? ''));
        $channel  = trim((string)($d['channel'] ?? 'meta_feed')) ?: 'meta_feed';
        $tone     = trim((string)($d['tone'] ?? '신뢰감 있고 전환 지향적인'));
        $audience = trim((string)($d['audience'] ?? ''));
        $count    = max(1, min(self::MAX_VARIANTS, (int)($d['count'] ?? 3)));
        $withImg  = !empty($d['with_image']);
        $ratio    = in_array(($d['ratio'] ?? '1:1'), ['1:1', '9:16', '16:9', '4:5'], true) ? (string)$d['ratio'] : '1:1';
        // [현 차수 초고도화 ①] 조합형 DCO — 이미지 M종 × 카피 N종 데카르트곱(Smartly식 multivariate).
        //   image_count=1(기본) 이면 기존 1×N copy-DCO 동작 그대로 보존(회귀0). 2 이상이면 조합 생성.
        $imageCount = $withImg ? max(1, min(4, (int)($d['image_count'] ?? 1))) : 0;
        // [현 차수 초고도화 ①-3] 멀티 종횡비 — ratios 제공 시 이미지 슬롯을 여러 비율에 '분산'(폭주 방지: 총 이미지수 불변, 캡16 유지).
        //   ratios 미제공 = 단일 $ratio(기존 동작 보존). 제공 시 imageCount 를 비율 수 이상으로 자동 보정(캡 4).
        $ratios = [];
        if (isset($d['ratios']) && is_array($d['ratios'])) {
            foreach ($d['ratios'] as $rr) { $rr = (string)$rr; if (in_array($rr, ['1:1', '9:16', '16:9', '4:5'], true) && !in_array($rr, $ratios, true)) $ratios[] = $rr; }
        }
        if (empty($ratios)) $ratios = [$ratio];
        if (count($ratios) > 1 && $imageCount >= 1) $imageCount = max($imageCount, min(4, count($ratios)));

        if ($product === '' && $category === '') {
            return self::json($res, ['ok' => false, 'error' => '상품 또는 카테고리를 입력하세요.'], 422);
        }

        // 1) 카피 변형 N종 — 단일 ClaudeAI::complete 호출(쿼터 1콜로 N변형, 비용효율). JSON 배열 요청.
        $sys = '당신은 퍼포먼스 광고 카피라이터입니다. 주어진 상품/타겟/채널/톤에 맞춰 서로 충분히 다른(헤드라인·앵글·CTA가 겹치지 않는) 광고 소재 변형을 생성합니다. 반드시 JSON 배열만 출력하세요(설명·코드펜스 금지).';
        $usr = "채널: {$channel}\n카테고리: {$category}\n상품: {$product}\n타겟: {$audience}\n톤앤매너: {$tone}\n"
             . "위 조건으로 서로 다른 광고 소재 {$count}종을 생성하세요. 각 항목은 한국어. 출력 형식(JSON 배열, 정확히 {$count}개):\n"
             . '[{"headline":"30자내 강한 헤드라인","subheadline":"보조문구","copy":"본문 1~2문장","cta":"행동유도 버튼문구","angle":"소구 앵글 한단어"}]';
        $raw = ClaudeAI::complete($sys, $usr, 20, $tenant);
        if ($raw === null) {
            return self::json($res, ['ok' => false, 'error' => 'AI 카피 생성 실패(쿼터 초과 또는 AI 키 미설정). [AI 설정]을 확인하세요.'], 502);
        }
        $variants = self::parseJson($raw);
        if (!is_array($variants) || !$variants) {
            return self::json($res, ['ok' => false, 'error' => 'AI 응답 파싱 실패', 'raw' => mb_substr((string)$raw, 0, 300)], 502);
        }
        $variants = array_slice(array_values($variants), 0, $count);

        // 2) 비주얼 M종(조합형 DCO — 비주얼 M × 카피 N). image_count=1 이면 표준 1×N. 미설정/실패 시 카피 전용(정직 진행).
        //   이미지 다양성: M>1 이면 스타일 힌트로 서로 다른 M종 생성(동일 프롬프트 중복 방지). 각 이미지=쿼터 1콜.
        $images = []; $imageRatios = []; $imgNote = '';
        if ($imageCount >= 1) {
            $base = trim(($product !== '' ? $product : $category) . ' ' . ($audience !== '' ? "for {$audience}" : ''));
            $styleHints = ['제품 클로즈업, 스튜디오 조명', '라이프스타일 사용 장면', '미니멀 단색 배경', '대담한 컬러 그래픽'];
            for ($k = 0; $k < $imageCount; $k++) {
                $rk = $ratios[$k % count($ratios)]; // [①-3] 슬롯별 종횡비 분산(멀티 플레이스먼트 커버)
                $hint = $imageCount > 1 ? (', ' . $styleHints[$k % count($styleHints)]) : '';
                $ig = ClaudeAI::generateImage($tenant, $base . $hint, $rk);
                if (!empty($ig['ok']) && !empty($ig['image'])) { $images[] = (string)$ig['image']; $imageRatios[] = $rk; }
                elseif ($imgNote === '') { $imgNote = '이미지 생성 일부/전부 미수행(' . (string)($ig['error'] ?? 'n/a') . ') — 가능한 조합만 저장. [AI 광고 디자인 > API 연동]에서 이미지 API 키 등록 시 비주얼 동반 생성.'; }
            }
        }
        if (empty($images)) { $images = ['']; $imageRatios = [$ratio]; } // 이미지 없음 = 카피 전용 1트랙(기존 동작 보존)

        // 3) ad_design draft 저장(캠페인 자동화가 그대로 소비). 조합형 = 이미지 M × 카피 N (총 상한 16 — 폭주 방지).
        $pdo = Db::pdo(); self::migrate($pdo);
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $st = $pdo->prepare('INSERT INTO ad_design(tenant_id,category,product,channel,spec_json,svg,status,created_at,period_start,period_end) VALUES(?,?,?,?,?,?,?,?,?,?)');
        $created = [];
        $MAX_DRAFTS = 16;
        foreach ($images as $imgIdx => $img) {
            foreach ($variants as $i => $v) {
                if (count($created) >= $MAX_DRAFTS) break 2;
                if (!is_array($v)) continue;
                $design = [
                    'headline'    => mb_substr((string)($v['headline'] ?? ''), 0, 120),
                    'subheadline' => mb_substr((string)($v['subheadline'] ?? ''), 0, 200),
                    'copy'        => mb_substr((string)($v['copy'] ?? ''), 0, 500),
                    'cta'         => mb_substr((string)($v['cta'] ?? '자세히 보기'), 0, 40),
                    'angle'       => mb_substr((string)($v['angle'] ?? ''), 0, 40),
                    'channel'     => $channel,
                    'format'      => 'single',
                    'source'      => 'studio_batch',
                    'variant_idx' => $i + 1,
                    'image_idx'   => (int)$imgIdx + 1,
                    'aspect'      => $imageRatios[$imgIdx] ?? $ratio, // [①-3] 슬롯 종횡비(플레이스먼트)
                ];
                try {
                    $st->execute([$tenant, mb_substr($category, 0, 120), mb_substr($product, 0, 2000), $channel,
                        json_encode($design, JSON_UNESCAPED_UNICODE), (string)$img, 'draft', $now, null, null]);
                    $design['id'] = (int)$pdo->lastInsertId();
                    $created[] = $design;
                } catch (\Throwable $e) { /* 개별 실패는 건너뜀 */ }
            }
        }

        $imgOk = count(array_filter($images, fn($x) => $x !== ''));
        return self::json($res, [
            'ok'        => true,
            'generated' => count($created),
            'channel'   => $channel,
            'images'    => $imgOk,
            'copies'    => count($variants),
            'has_image' => $imgOk > 0,
            'combinatorial' => ($imgOk > 1),
            'note'      => $imgNote ?: (($imgOk > 1 ? '조합형 DCO(이미지×카피) ' : '변형 ') . count($created) . '종을 임시저장했습니다. [저장 디자인]에서 검토 후 캠페인에 적용하세요.'),
            'designs'   => $created,
        ]);
    }

    /**
     * [237차] AutoCampaign::launch 가 호출 — design_id ↔ 매체 ad_ext_id 매핑 영속화(Creative Insights 조인 키).
     * $variants: list<['design_id'=>int,'ad_ext_id'=>str,'adset_ext_id'=>str,'channel'=>str,'label'=>str]>
     */
    public static function recordVariants(\PDO $pdo, string $tenant, int $campaignId, array $variants): int
    {
        if ($tenant === '' || !$variants) return 0;
        self::migrate($pdo);
        $now = gmdate('Y-m-d\TH:i:s\Z'); $n = 0;
        $sel = $pdo->prepare('SELECT id FROM creative_variant WHERE tenant_id=? AND ad_ext_id=? LIMIT 1');
        $ins = $pdo->prepare('INSERT INTO creative_variant(tenant_id,campaign_id,design_id,channel,ad_ext_id,adset_ext_id,label,created_at) VALUES(?,?,?,?,?,?,?,?)');
        $upd = $pdo->prepare('UPDATE creative_variant SET campaign_id=?, design_id=?, channel=?, adset_ext_id=?, label=? WHERE tenant_id=? AND ad_ext_id=?');
        foreach ($variants as $v) {
            $adExt = trim((string)($v['ad_ext_id'] ?? ''));
            $did   = (int)($v['design_id'] ?? 0);
            if ($adExt === '' || $did <= 0) continue;
            $ch = (string)($v['channel'] ?? ''); $asid = (string)($v['adset_ext_id'] ?? ''); $label = (string)($v['label'] ?? '');
            try {
                $sel->execute([$tenant, $adExt]);
                if ($sel->fetchColumn()) { $upd->execute([$campaignId, $did, $ch, $asid, $label, $tenant, $adExt]); }
                else { $ins->execute([$tenant, $campaignId, $did, $ch, $adExt, $asid, $label, $now]); }
                $n++;
            } catch (\Throwable $e) { /* 레이스/멱등 — 무시 */ }
        }
        return $n;
    }

    /**
     * GET /v422/ai/studio/insights — 소재별 성과 스코어(승자/패자). ad_design ← creative_variant → ad_insight_agg(ad_id).
     * 실 광고 집행(creative_variant 적재 + ad_insight_agg 인제스트) 전이면 빈배열(정직). query: ?days=30
     */
    public static function insights(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::migrate($pdo);
        $q = $req->getQueryParams();
        $days = max(1, min(365, (int)($q['days'] ?? 30)));
        $since = gmdate('Y-m-d', time() - $days * 86400);

        $rows = [];
        try {
            // [237차] creative_variant 와 ad_insight_agg 의 collation 이 달라(utf8mb4_unicode_ci vs 0900_ai_ci)
            //   ad_id='='ad_ext_id 조인이 1267 에러 → MySQL 에선 명시 COLLATE 로 강제 정합(SQLite 는 미적용).
            $isMy = false;
            try { $isMy = strtolower((string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)) === 'mysql'; } catch (\Throwable $e) {}
            $coll = $isMy ? ' COLLATE utf8mb4_unicode_ci' : '';
            $sql = "SELECT d.id AS design_id, d.channel, d.spec_json, d.status, d.created_at,
                           COUNT(DISTINCT v.ad_ext_id) AS ad_count,
                           COALESCE(SUM(a.impressions),0) AS imp, COALESCE(SUM(a.clicks),0) AS clk,
                           COALESCE(SUM(a.spend),0) AS spend, COALESCE(SUM(a.conversions),0) AS conv,
                           COALESCE(SUM(a.revenue),0) AS rev
                    FROM ad_design d
                    LEFT JOIN creative_variant v ON v.design_id = d.id AND v.tenant_id = d.tenant_id{$coll}
                    LEFT JOIN ad_insight_agg a ON a.ad_id = v.ad_ext_id{$coll} AND a.tenant_id = d.tenant_id{$coll} AND a.date >= ?
                    WHERE d.tenant_id = ?
                    GROUP BY d.id
                    ORDER BY rev DESC, d.id DESC
                    LIMIT 200";
            $st = $pdo->prepare($sql); $st->execute([$since, $tenant]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'insights_query_failed'], 500);
        }

        $designs = [];
        foreach ($rows as $r) {
            $spec = json_decode((string)($r['spec_json'] ?? '{}'), true) ?: [];
            $imp = (int)$r['imp']; $clk = (int)$r['clk']; $spend = (float)$r['spend'];
            $conv = (int)$r['conv']; $rev = (float)$r['rev'];
            $ctr  = $imp > 0 ? round($clk / $imp * 100, 2) : 0.0;
            $cvr  = $clk > 0 ? round($conv / $clk * 100, 2) : 0.0;
            $roas = $spend > 0 ? round($rev / $spend, 2) : 0.0;
            $cpa  = $conv > 0 ? round($spend / $conv, 0) : 0.0;
            $designs[] = [
                'design_id' => (int)$r['design_id'],
                'channel'   => (string)$r['channel'],
                'headline'  => (string)($spec['headline'] ?? ''),
                'angle'     => (string)($spec['angle'] ?? ''),
                'status'    => (string)$r['status'],
                'ad_count'  => (int)$r['ad_count'],
                'impressions' => $imp, 'clicks' => $clk, 'spend' => round($spend, 0),
                'conversions' => $conv, 'revenue' => round($rev, 0),
                'ctr' => $ctr, 'cvr' => $cvr, 'roas' => $roas, 'cpa' => $cpa,
                'has_data' => $imp > 0,
            ];
        }
        // 성과 데이터 보유 소재만 승자/패자 판정(ROAS 우선, 동률 CTR). 데이터 없으면 빈 랭킹(정직).
        $withData = array_values(array_filter($designs, fn($x) => $x['has_data']));
        usort($withData, fn($a, $b) => ($b['roas'] <=> $a['roas']) ?: ($b['ctr'] <=> $a['ctr']));
        $winners = array_slice($withData, 0, 5);
        $losers  = array_slice(array_reverse($withData), 0, 5);

        return self::json($res, [
            'ok'       => true,
            'period'   => ['since' => $since, 'days' => $days],
            'total'    => count($designs),
            'measured' => count($withData),
            'designs'  => $designs,
            'winners'  => $winners,
            'losers'   => $losers,
            'note'     => count($withData) === 0
                ? '집행된 소재의 성과 데이터가 아직 없습니다. 캠페인 활성화 후 매체 성과(ad_insight_agg)가 수집되면 소재별 ROAS/CTR 랭킹이 표시됩니다.'
                : (count($withData) . '개 소재의 실측 성과로 승자/패자를 산출했습니다.'),
        ]);
    }

    /**
     * [245차 P1-2] GET /v422/ai/studio/cockpit?days=14 — 크리에이티브 코크핏(Triple Whale 대응).
     * insights 의 소재별 성과에 ①광고 피로도(최근½ vs 이전½ 윈도우 CTR 감쇠) ②신뢰도/성숙도 배지(노출·수집일)
     * ③소재 나이(launch 경과일) ④크리에이티브 스코어(성과+콘텐츠 합성) ⑤차원 롤업(채널×포맷×앵글)을 더한다.
     * 실 집행/수집 전이면 빈 결과(정직). ad_insight_agg(ad_id=ad_ext_id) 단일 쿼리로 윈도우 분할 집계.
     */
    public static function cockpit(Request $req, Response $res): Response
    {
        $tenant = self::tenant($req);
        if ($tenant === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        $pdo = Db::pdo(); self::migrate($pdo);
        $q = $req->getQueryParams();
        $days = max(2, min(180, (int)($q['days'] ?? 14)));
        $since = gmdate('Y-m-d', time() - $days * 86400);
        $mid   = gmdate('Y-m-d', time() - intdiv($days, 2) * 86400); // 최근½ 경계

        $rows = [];
        try {
            $isMy = false;
            try { $isMy = strtolower((string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)) === 'mysql'; } catch (\Throwable $e) {}
            $coll = $isMy ? ' COLLATE utf8mb4_unicode_ci' : '';
            $sql = "SELECT d.id AS design_id, d.channel, d.spec_json, d.status, d.created_at,
                           COUNT(DISTINCT v.ad_ext_id) AS ad_count,
                           COALESCE(SUM(a.impressions),0) AS imp, COALESCE(SUM(a.clicks),0) AS clk,
                           COALESCE(SUM(a.spend),0) AS spend, COALESCE(SUM(a.conversions),0) AS conv,
                           COALESCE(SUM(a.revenue),0) AS rev,
                           COALESCE(SUM(CASE WHEN a.date >= ? THEN a.impressions ELSE 0 END),0) AS imp_recent,
                           COALESCE(SUM(CASE WHEN a.date >= ? THEN a.clicks ELSE 0 END),0) AS clk_recent,
                           COALESCE(SUM(CASE WHEN a.date <  ? THEN a.impressions ELSE 0 END),0) AS imp_prior,
                           COALESCE(SUM(CASE WHEN a.date <  ? THEN a.clicks ELSE 0 END),0) AS clk_prior,
                           MIN(a.date) AS first_date, MAX(a.date) AS last_date, COUNT(DISTINCT a.date) AS active_days
                    FROM ad_design d
                    LEFT JOIN creative_variant v ON v.design_id = d.id AND v.tenant_id = d.tenant_id{$coll}
                    LEFT JOIN ad_insight_agg a ON a.ad_id = v.ad_ext_id{$coll} AND a.tenant_id = d.tenant_id{$coll} AND a.date >= ?
                    WHERE d.tenant_id = ?
                    GROUP BY d.id
                    ORDER BY rev DESC, d.id DESC
                    LIMIT 200";
            $st = $pdo->prepare($sql);
            $st->execute([$mid, $mid, $mid, $mid, $since, $tenant]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'cockpit_query_failed'], 500);
        }

        $designs = [];
        $byChannel = []; $byFormat = []; $byAngle = [];
        $nowTs = time();
        foreach ($rows as $r) {
            $spec = json_decode((string)($r['spec_json'] ?? '{}'), true) ?: [];
            $imp = (int)$r['imp']; $clk = (int)$r['clk']; $spend = (float)$r['spend'];
            $conv = (int)$r['conv']; $rev = (float)$r['rev'];
            $ctr  = $imp > 0 ? $clk / $imp * 100 : 0.0;
            $cvr  = $clk > 0 ? $conv / $clk * 100 : 0.0;
            $roas = $spend > 0 ? $rev / $spend : 0.0;
            $cpa  = $conv > 0 ? $spend / $conv : 0.0;
            $hasData = $imp > 0;

            // ── 피로도: 최근½ vs 이전½ CTR 감쇠(양수=하락). 표본부족(<500 노출)이면 미판정.
            $impR = (int)$r['imp_recent']; $clkR = (int)$r['clk_recent'];
            $impP = (int)$r['imp_prior'];  $clkP = (int)$r['clk_prior'];
            $ctrR = $impR > 0 ? $clkR / $impR * 100 : 0.0;
            $ctrP = $impP > 0 ? $clkP / $impP * 100 : 0.0;
            $fatiguePct = ($ctrP > 0 && $impR >= 200 && $impP >= 200) ? round(($ctrP - $ctrR) / $ctrP * 100, 1) : 0.0;
            if ($imp < 500 || $impR < 200 || $impP < 200) $fatigueStatus = 'insufficient';
            elseif ($fatiguePct >= 25)  $fatigueStatus = 'fatigued';   // 교체 권고
            elseif ($fatiguePct >= 10)  $fatigueStatus = 'fatiguing';
            elseif ($fatiguePct <= -10) $fatigueStatus = 'rising';
            else $fatigueStatus = 'stable';

            // ── 소재 나이(첫 노출일 우선, 없으면 created_at).
            $launch = (string)($r['first_date'] ?? '') ?: substr((string)($r['created_at'] ?? ''), 0, 10);
            $ageDays = $launch ? max(0, (int)floor(($nowTs - strtotime($launch . ' 00:00:00')) / 86400)) : 0;
            $activeDays = (int)$r['active_days'];

            // ── 신뢰도/성숙도 배지(노출 누적 + 수집일).
            if (!$hasData) $confidence = 0;
            elseif ($imp >= 10000 && $activeDays >= 5) $confidence = 3;
            elseif ($imp >= 2000 && $activeDays >= 3) $confidence = 2;
            elseif ($imp >= 300) $confidence = 1;
            else $confidence = 0;

            // ── 크리에이티브 스코어(0~100): 성과(60%)+콘텐츠(40%). 성과 무 → 콘텐츠 예측치.
            $content = self::contentScore($spec);
            if ($hasData) {
                $perf = 0.45 * min(100, $roas / 4 * 100) + 0.35 * min(100, $ctr / 2 * 100) + 0.20 * min(100, $cvr / 5 * 100);
                $score = (int)round(0.6 * $perf + 0.4 * $content);
                $scoreKind = 'measured';
            } else { $score = (int)round($content); $scoreKind = 'predicted'; }

            $format = (string)($spec['format'] ?? $spec['ratio'] ?? 'unknown');
            $angle  = (string)($spec['angle'] ?? '미지정');
            $row = [
                'design_id' => (int)$r['design_id'], 'channel' => (string)$r['channel'],
                'headline' => (string)($spec['headline'] ?? ''), 'angle' => $angle, 'format' => $format,
                'status' => (string)$r['status'], 'ad_count' => (int)$r['ad_count'],
                'impressions' => $imp, 'clicks' => $clk, 'spend' => round($spend, 0), 'conversions' => $conv, 'revenue' => round($rev, 0),
                'ctr' => round($ctr, 2), 'cvr' => round($cvr, 2), 'roas' => round($roas, 2), 'cpa' => round($cpa, 0),
                'ctr_recent' => round($ctrR, 2), 'ctr_prior' => round($ctrP, 2),
                'fatigue_pct' => $fatiguePct, 'fatigue_status' => $fatigueStatus,
                'age_days' => $ageDays, 'active_days' => $activeDays, 'confidence' => $confidence,
                'score' => $score, 'score_kind' => $scoreKind, 'has_data' => $hasData,
                'launched_at' => $launch,
            ];
            $designs[] = $row;

            // ── 차원 롤업.
            self::rollupAdd($byChannel, (string)$r['channel'] ?: 'unknown', $imp, $clk, $spend, $conv, $rev);
            self::rollupAdd($byFormat, $format ?: 'unknown', $imp, $clk, $spend, $conv, $rev);
            self::rollupAdd($byAngle, $angle ?: '미지정', $imp, $clk, $spend, $conv, $rev);
        }

        $measured = array_values(array_filter($designs, fn($x) => $x['has_data']));
        $needRefresh = array_values(array_filter($designs, fn($x) => $x['fatigue_status'] === 'fatigued'));
        usort($needRefresh, fn($a, $b) => $b['fatigue_pct'] <=> $a['fatigue_pct']);
        $avgScore = $designs ? (int)round(array_sum(array_map(fn($x) => $x['score'], $designs)) / count($designs)) : 0;

        return self::json($res, [
            'ok' => true,
            'period' => ['since' => $since, 'days' => $days, 'recent_since' => $mid],
            'summary' => [
                'total' => count($designs), 'measured' => count($measured), 'avg_score' => $avgScore,
                'fatigued' => count($needRefresh),
                'fatigue_breakdown' => self::countBy($designs, 'fatigue_status'),
            ],
            'designs' => $designs,
            'need_refresh' => array_slice($needRefresh, 0, 10),
            'by_channel' => self::rollupFinalize($byChannel),
            'by_format'  => self::rollupFinalize($byFormat),
            'by_angle'   => self::rollupFinalize($byAngle),
            'note' => count($measured) === 0
                ? '집행된 소재 성과가 아직 없습니다. 캠페인 활성화 후 매체 성과(ad_insight_agg) 수집 시 피로도·스코어·차원분석이 표시됩니다.'
                : (count($measured) . '개 소재 실측 — 피로도/스코어/차원분석 산출. 교체권고 ' . count($needRefresh) . '건.'),
        ]);
    }

    /** 콘텐츠 휴리스틱 스코어(0~100) — 성과 데이터 없을 때 예측 대용(투명 합성, AI날조 아님). */
    private static function contentScore(array $spec): float
    {
        $s = 45.0;
        $hl = trim((string)($spec['headline'] ?? '')); $hlLen = mb_strlen($hl);
        if ($hlLen >= 8 && $hlLen <= 30) $s += 16; elseif ($hlLen > 0) $s += 6;
        if (trim((string)($spec['cta'] ?? '')) !== '') $s += 15;
        if (trim((string)($spec['angle'] ?? '')) !== '') $s += 10;
        $copyLen = mb_strlen(trim((string)($spec['copy'] ?? '')));
        if ($copyLen >= 20 && $copyLen <= 140) $s += 10; elseif ($copyLen > 0) $s += 4;
        if (trim((string)($spec['subheadline'] ?? '')) !== '') $s += 4;
        return min(100.0, $s);
    }

    private static function rollupAdd(array &$acc, string $key, int $imp, int $clk, float $spend, int $conv, float $rev): void
    {
        if (!isset($acc[$key])) $acc[$key] = ['key' => $key, 'imp' => 0, 'clk' => 0, 'spend' => 0.0, 'conv' => 0, 'rev' => 0.0, 'count' => 0];
        $acc[$key]['imp'] += $imp; $acc[$key]['clk'] += $clk; $acc[$key]['spend'] += $spend;
        $acc[$key]['conv'] += $conv; $acc[$key]['rev'] += $rev; $acc[$key]['count'] += 1;
    }
    private static function rollupFinalize(array $acc): array
    {
        $out = [];
        foreach ($acc as $a) {
            $imp = (int)$a['imp']; $clk = (int)$a['clk']; $spend = (float)$a['spend']; $rev = (float)$a['rev'];
            $out[] = [
                'key' => $a['key'], 'creatives' => (int)$a['count'], 'impressions' => $imp, 'spend' => round($spend, 0), 'revenue' => round($rev, 0),
                'ctr' => $imp > 0 ? round($clk / $imp * 100, 2) : 0.0, 'roas' => $spend > 0 ? round($rev / $spend, 2) : 0.0,
                'conversions' => (int)$a['conv'],
            ];
        }
        usort($out, fn($x, $y) => $y['revenue'] <=> $x['revenue']);
        return $out;
    }
    private static function countBy(array $rows, string $field): array
    {
        $c = [];
        foreach ($rows as $r) { $k = (string)($r[$field] ?? ''); $c[$k] = ($c[$k] ?? 0) + 1; }
        return $c;
    }
}
