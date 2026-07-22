<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v422 – Claude AI Marketing Analysis Engine
 *
 * POST /v422/ai/analyze   → Claude API 분석 요청 + DB 저장
 * GET  /v422/ai/analyses  → 분석 이력 조회
 */
final class ClaudeAI {

    private const MODEL   = 'claude-sonnet-4-6';
    private const API_URL = 'https://api.anthropic.com/v1/messages';
    private const MAX_TOKENS = 4096;
    // [283차 P1] 코파일럿 대화 메모리 상한 — 토큰 폭주/비용 방지(agenticAsk 에서만 사용).
    private const HIST_MAX_TURNS = 10;    // 최근 10턴(user+assistant 합산)
    private const HIST_MAX_CHARS = 4000;  // 턴당 문자 상한

    /**
     * [282차 F-P1 저장형 XSS 심층방어] 클라이언트가 제출한 소재 SVG 에서 활성 콘텐츠(스크립트/이벤트핸들러)를
     *   저장 전에 제거한다. 프론트 렌더는 DOMPurify 로 이미 방어되나(근본), 서버 저장측도 정화해 이중방어.
     *   정상 크리에이티브 SVG(도형/텍스트/gradient)는 보존하고 <script>/<foreignObject>/on*=/javascript: 만 제거.
     */
    public static function stripActiveSvg(string $svg): string {
        if ($svg === '') return '';
        // data:image (base64 래스터)는 마크업이 아니므로 그대로 통과.
        if (stripos($svg, '<svg') === false && stripos($svg, '<script') === false) return $svg;
        $s = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $svg);
        $s = preg_replace('#<foreignObject\b[^>]*>.*?</foreignObject>#is', '', (string)$s);
        // 인라인 이벤트 핸들러 속성 제거(onload/onerror/onclick 등).
        $s = preg_replace('#\son[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)#i', '', (string)$s);
        // href/xlink:href 내 javascript: 스킴 무력화.
        $s = preg_replace('#(href\s*=\s*["\']?)\s*javascript:#i', '$1#', (string)$s);
        return (string)$s;
    }

    /* ── 환경변수 or 하드코딩 fallback ─────────────────────── */
    private static function apiKey(): string {
        $env = getenv('CLAUDE_API_KEY');
        if ($env && strlen($env) > 10) return $env;
        // 196차: 관리자 설정(app_setting claude_api_key) — admin이 UI에서 Anthropic 키 등록 시 실 AI 활성.
        try {
            $pdo = Db::pdo();
            $st  = $pdo->query("SELECT svalue FROM app_setting WHERE skey='claude_api_key'");
            $v   = \Genie\Crypto::decrypt($st ? (string)($st->fetchColumn() ?: '') : ''); // 204차 P1: AES-256-GCM 복호화(평문 passthrough)
            if (strlen($v) > 10) return $v;
        } catch (\Throwable $e) {}
        // fallback: 미설정(키 없으면 호출 401 → 내장 템플릿 폴백으로 항상 동작)
        return 'sk-ant-api03-***MASKED_FOR_GITHUB***';
    }

    /** 196차: 플랫폼 AI(Claude) 키 설정 여부(UI 게이트용). */
    public static function aiKeyConfigured(): bool {
        $k = self::apiKey();
        return strpos($k, 'MASKED_FOR_GITHUB') === false && strlen($k) > 10;
    }

    /**
     * [228차 R2] 공용 텍스트 완성 헬퍼 — 타 핸들러(Reviews 등)가 중앙화된 키 해석 + quota 게이트로
     *   Claude 를 호출하기 위한 얇은 public 래퍼. 키 미설정/에러/quota 시 null 반환(호출측 graceful 폴백).
     */
    public static function complete(string $systemPrompt, string $userMsg, int $timeout = 12, string $tenant = ''): ?string {
        if (!self::aiKeyConfigured()) return null;
        try {
            $r = self::callClaude($systemPrompt, $userMsg, $timeout, $tenant);
            return (string)($r['text'] ?? '');
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** [현 차수] "무엇이든 물어보세요" GeniegoROI 상담 챗봇 — 메뉴·기능·사용법 전문 응답(15개국 현지 자연어).
     *   v422/ai/* 공개 bypass. 실 Claude(키 설정 시) + 미설정 시 ai:false 반환(프론트 로컬 KB 폴백). */
    public static function assistant(Request $req, Response $res): Response {
        @set_time_limit(75); // [현 차수] 초보자 단계별 상세 안내는 출력이 길어 생성시간↑ → PHP 실행시간 확보(curl 타임아웃과 정합).
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $messages = is_array($body['messages'] ?? null) ? $body['messages'] : [];
        $lang = trim((string)($body['lang'] ?? 'ko')) ?: 'ko';
        $q = trim((string)($body['question'] ?? ''));
        if ($q === '') { foreach (array_reverse($messages) as $m) { if ((string)($m['role'] ?? '') === 'user') { $q = trim((string)($m['content'] ?? '')); break; } } }
        if ($q === '') {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'empty question'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(422);
        }
        if (!self::aiKeyConfigured()) {
            // 데모/키 미설정 — 프론트 로컬 KB 폴백 신호
            $res->getBody()->write(json_encode(['ok' => true, 'ai' => false, 'answer' => null], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json');
        }
        // 최근 대화 맥락(최대 8턴) 평탄화
        $ctx = '';
        foreach (array_slice($messages, -8) as $m) {
            $role = ((string)($m['role'] ?? '') === 'user') ? 'User' : 'Assistant';
            $ctx .= $role . ': ' . trim((string)($m['content'] ?? '')) . "\n";
        }
        $sys = self::geniegoSystemPrompt($lang) . "\n\n" . self::geniegoTermsBlock() . "\n\n" . self::geniegoKnowledgeBlock();
        // [현 차수] 질문과 관련된 기능의 상세 인벤토리만 선별 주입(소형 결정적 검색 — 모델 호출 없음).
        //   전량(약 100KB)을 상시 주입하면 매 질문 토큰이 폭증하므로 상위 3개만 넣는다.
        //   대화 맥락도 매칭 근거에 포함 → "그거 어떻게 설정해?" 같은 후속 질문도 직전 기능을 유지한다.
        // [289차 후속 055 D-3] Citation 승격 — 선별된 근거를 구조화 수집해 응답에 함께 실어보낸다.
        $srcs = [];
        $sys .= self::geniegoFeatureDetails($q . "\n" . $ctx, 3, $srcs);
        $userMsg = ($ctx ? "[대화 맥락]\n{$ctx}\n" : '') . "[질문]\n{$q}";
        // [289차 후속 P0 귀속] ★tenant 전달 누락 수정 — 저장소 전 AI 진입점 15곳 중 **여기 하나만** 빠져 있었다.
        //   결과: 챗봇 호출이 전부 공용 'unknown' quota 버킷에 누적돼
        //     ① 테넌트별 일일 캡(225차 P1-4)이 이 경로에서 무력화되고
        //     ② 한 테넌트가 챗봇을 과다 호출하면 **다른 테넌트까지 함께 차단**되며
        //     ③ 사용량이 실제 테넌트에 귀속되지 않았다(감사·과금 근거 상실).
        //   ※`/v422/ai/*` 는 공개 bypass 경로지만 세션 Bearer 가 오면 index.php 게이트가
        //     auth_tenant 를 주입하므로 self::tenant($req) 로 정상 해석된다(289차 후속 세션 hash 정정으로 실효).
        //     미인증 호출은 종전대로 'unknown' — 이는 정상(귀속할 테넌트가 실제로 없다).
        $ans = self::complete($sys, $userMsg, 60, self::tenant($req)); // [현 차수] 상세 단계별 답변 생성시간 여유(기존 22초→초과로 ai:false 나던 것 해소).
        if ($ans === null || $ans === '') {
            $res->getBody()->write(json_encode(['ok' => true, 'ai' => false, 'answer' => null], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json');
        }
        // [289차 후속 055 D-3] sources — AI 답변의 근거가 된 기능 블록(ns·title·진입경로).
        //   ★AI 가 생성한 것이 아니라 **검색 단계에서 결정론적으로 선별된 실제 코퍼스 항목**이라
        //     환각이 섞이지 않는다(설명가능성의 핵심). 근거가 없으면 빈 배열 — 지어내지 않는다.
        $res->getBody()->write(json_encode(['ok' => true, 'ai' => true, 'answer' => $ans, 'sources' => $srcs], JSON_UNESCAPED_UNICODE));
        return $res->withHeader('Content-Type', 'application/json');
    }

    private static function geniegoSystemPrompt(string $lang): string {
        $langName = [
            'ko' => 'Korean (한국어)', 'en' => 'English', 'ja' => 'Japanese (日本語)', 'zh' => 'Simplified Chinese (简体中文)',
            'zh-TW' => 'Traditional Chinese (繁體中文)', 'de' => 'German', 'th' => 'Thai', 'vi' => 'Vietnamese', 'id' => 'Indonesian',
            'ar' => 'Arabic', 'es' => 'Spanish', 'fr' => 'French', 'hi' => 'Hindi', 'pt' => 'Portuguese (Brazil)', 'ru' => 'Russian',
        ][$lang] ?? 'Korean (한국어)';
        return <<<SYS
You are "GenieGo Assistant", the official in-app product expert and support consultant for **GeniegoROI** — a multi-tenant e-commerce ROI / marketing / commerce-logistics analytics SaaS (deployed at www.genieroi.com).

YOUR JOB: Answer ANY question about GeniegoROI — what each menu does, how to use a feature step by step, where to find something, what a metric means, and how to accomplish a goal. Be a perfect, friendly, concise consultant.

RESPONSE LANGUAGE: Always reply in {$langName}, in natural, native-level phrasing. Mirror the user's language if it differs.

STYLE: Concise and actionable. Use short steps (1·2·3) for how-to. Name the exact menu path (e.g., "광고 및 채널 분석 › 광고성과"). Bold key menu names. If unsure which menu, suggest the closest one. Never invent features that don't exist; if a capability isn't in GeniegoROI, say so and suggest the nearest alternative. Keep answers focused on GeniegoROI.

GENIEGOROI MENU & FEATURE MAP (use this as ground truth):
• 종합 대시보드(/dashboard): 8탭 — 통합현황(KPI·채널매출), 마케팅성과, 채널KPI, 커머스정산, 글로벌매출(세계지도), AI인플루언서, 시스템현황, 이용가이드. 상단 기간선택(일/주/월/분기/연), 상품 조회바(특정 상품 선택 시 전 메뉴 동기화).
• 롤업 뷰(/rollup): SKU·캠페인·크리에이터·플랫폼·상품성과·채널×상품 매트릭스를 일/주/월/분기/연 기간으로 집계.
• AI 마케팅: 자동화 전략(/auto-marketing 한계ROAS·증분성·예산최적화), 캠페인 관리(/campaign-manager), 여정 빌더(/journey-builder 드래그 캔버스).
• 광고 및 채널 분석: 광고성과(/marketing), 예산 관리(/budget-tracker), 어카운트 성과(/performance, /account-performance), 어트리뷰션(/attribution 6모델), 마케팅 믹스 모델(/marketing-mix — 반응곡선·베이지안MMM·★이익 효율 프론티어[적정 총예산·손익분기ROAS]), 채널 KPI(/channel-kpi), 그래프 스코어(/graph-score).
• 고객/CRM: CRM 대시보드(/crm RFM·세그먼트), 카카오 비즈니스, 이메일 마케팅(/email-marketing), SMS 마케팅(/sms-marketing), 라인/WhatsApp/인스타 DM.
• 커머스 및 물류: 주문 허브(/order-hub), 옴니채널(/omni-channel 채널연동·주문·재고), 정산(/settlements), 정산 대조(/reconciliation), 한국 채널(/kr-channel), WMS 재고관리(/wms-manager 창고·입출고·재고·LOT/유통기한·피킹·발주·임가공·정기리포트·물류대시보드), 수요예측(/demand-forecast), 반품 포털(/returns-portal), 공급망(/supply-chain), 카탈로그 동기화(/catalog-sync), 가격 최적화(/price-opt), 라이브 커머스(/live-commerce).
• 성과 및 리포팅: P&L 손익(/pnl 워터폴·순이익), 성과 허브(/performance), 리포트 빌더(/report-builder 예약리포트), 픽셀 트래킹(/pixel-tracking).
• 데이터 및 수집: 연동 허브(/integration-hub API키·채널연동), 데이터 신뢰도(/data-trust).
• 결제/구독: 결제수단(/payment-methods 광고비 카드·월예산·결제내역), 구독 플랜(/app-pricing).
• 팀·계정: 팀원·권한(/team-members 팀·역할·권한매트릭스·파트너 계정·거래처 등록).
공통 기능: 대부분 거래/수집/로그 화면에 기간 선택(전체/7·30·90일/사용자지정)으로 값이 그 기간으로 정확 재산출됩니다. 특정 상품을 선택하면 대시보드·마케팅·정산 등 관련 메뉴가 그 상품으로 동기화됩니다. 15개 언어 지원.

GENIEGOROI 마케팅 예산 배분 기준 (사용자가 "어떤 기준으로 예산을 정하나 / 얼마를 써야 하나 / 어느 채널에 더 써야 하나"를 물으면 반드시 이 기준들로 구체적·단계적으로 설명):
1) 한계 ROAS(marginal ROAS) 균등화 — 채널마다 "광고비 1원 더 쓸 때 늘어나는 매출"(한계효율)을 반응곡선(포화 반영)으로 계산. 단순 평균 ROAS가 아니라 추가 투입분의 효율. 모든 채널의 한계 ROAS가 같아지는 지점이 이론적 최적 배분점이며, 한계 ROAS 높은 채널로 예산을 먼저 이동한다.
2) 증분성(incrementality/uplift) — 홀드아웃(광고 미노출 그룹) 대비 증분 매출로 "광고 때문에 실제로 생긴 매출"만 인정. ROAS가 높아도 증분이 낮으면 착시(어차피 살 사람) → 감액.
3) ★이익 효율 프론티어(메뉴: 광고 및 채널 분석 › 마케팅 믹스 모델[/marketing-mix]. GeniegoROI 고유 차별화): 매출이 아니라 SKU 실원가 기반 공헌마진을 반응곡선에 융합해 "한계이익=0"이 되는 이익 최대 총지출(T*)을 계산한다 → "예산을 얼마나 써야 하는가"에 직접 답한다. 제공 값: 적정 총 일 광고비(T*), 현재 대비 증액 여력(더 써도 순이익이 느는 여력)/과지출 경고, 채널별 손익분기 ROAS(=1÷공헌마진 — 현재 한계 ROAS가 이 값보다 높으면 증액할수록 이익), 이익(순이익) 곡선. 경쟁사는 '주어진 예산의 배분'만 최적화하지만 GeniegoROI는 '이익이 최대가 되는 총지출'까지 답하는 점이 결정적 차이다.
4) 순이익 기준(핵심 철학) — 매출 ROAS가 아니라 광고비·원가·물류비·반품비·수수료·다통화를 모두 뺀 실제 순이익 ROI로 최적화한다. ROAS가 5배여도 반품이 많으면 순이익이 마이너스일 수 있고 GeniegoROI는 그 지점을 잡는다.
5) 자동 실행(오토파일럿) — /marketing-mix 이익 효율 프론티어 패널의 "자율 최적화 목표: 매출 최대 / 이익 최대" 토글을 '이익 최대'로 켜면, 자동 예산 재배분이 평균 ROAS가 아니라 공헌이익 효율(공헌마진 × 진실 ROAS) 기준으로 캠페인 간 예산을 자동 조정한다(상품 원가 등록 시 활성화·미등록 시 매출 기준으로 안전 동작). /auto-marketing에서 한계 ROAS 임계값·킬스위치·승인큐(사람 확인 후 집행)도 설정할 수 있다.
6) 그 밖의 종합 변수 — 채널 포화도, 시즌/외부 요인, 채널 시너지(Pairwise Lift), 월 예산 상한(cap), 데이파팅(요일·시간대), 빈도캡(과노출 방지)을 함께 반영한다.
설명 시: 위 기준을 나열만 하지 말고 "왜 그 기준이 예산 결정에 쓰이는지 + 어느 메뉴에서 확인/설정하는지"를 함께 안내하라.

If the user asks something unrelated to GeniegoROI, politely steer back to how GeniegoROI can help with their goal.
SYS;
    }

    /**
     * [현 차수 P1] 용어 설명 전문가 지시 + 용어집 컨텍스트 주입.
     *  - 50선 용어집(GeniegoGlossary)은 "참고자료(깊이·구조의 본보기 + 권위 정의)"이며, 이 50개에 한정하지 않는다.
     *  - GeniegoROI에서 쓰이는 **모든** 마케팅/데이터/물류/CRM/실험/손익/커머스 용어를 같은 수준으로 상세히,
     *    사용자가 자연스럽고 복잡하게 물어도 자연스럽게, 그리고 응답 언어(15개국)의 현지 자연어로 설명한다.
     */
    private static function geniegoTermsBlock(): string {
        $glossary = '';
        try { $glossary = \Genie\GeniegoGlossary::text(); } catch (\Throwable $e) { $glossary = ''; }
        $block = <<<TERMS

────────────────────────────────────────
TERMINOLOGY EXPERT MODE (핵심 역할)
You are also the definitive **terminology explainer** for GeniegoROI. Users will ask "What is X?" or phrase it naturally/indirectly/conversationally (e.g. "광고비 대비 매출이 얼마나 나오는지 보는 그 지표가 뭐였더라?", "재고를 유통기한 순으로 빼는 거 GeniegoROI에서 뭐라고 해?"). Always recognise which term they mean and explain it.

RULES FOR TERM EXPLANATIONS:
1. SCOPE: Explain ANY term used anywhere in GeniegoROI — marketing, ads, attribution, statistics/ML, data engineering, CRM, commerce, logistics/WMS, P&L/finance, subscription/billing, experiment design. The glossary below is a REFERENCE SAMPLE of 50 terms showing the expected DEPTH and STYLE — you are NOT limited to it. If a user asks about a GeniegoROI term not in the list, explain it at the SAME depth using your expert knowledge and the GeniegoROI menu map above.
2. STRUCTURE: Use the 3-part structure of the reference glossary, localised to the response language:
   (1) "What it is" — precise definition.
   (2) "In simple terms" — a plain, concrete everyday example.
   (3) "In GeniegoROI" — how this term/metric is actually used inside GeniegoROI (which menu, what it drives), tying back to real net profit where relevant.
3. LANGUAGE: The reference glossary is written in Korean, but you MUST answer in the user's response language with NATIVE, natural phrasing — translate the concept, never paste Korean. Localise the section labels too (e.g. KO: "무엇이다 / 쉽게 말하면 / GeniegoROI에서는"; EN: "What it is / In simple terms / In GeniegoROI"; JA: "〜とは / かんたんに言うと / GeniegoROIでは"; etc.).
4. FIDELITY: When a term IS in the glossary, stay faithful to that authoritative definition (don't contradict it); enrich with examples. When it is NOT, never invent GeniegoROI features that don't exist — describe the general meaning + the closest real GeniegoROI menu/usage.
5. STYLE: Friendly, clear, beginner-safe. Keep it readable (short paragraphs / the 3 labelled parts). If the user asks for several terms at once, explain each briefly with the same structure.

REFERENCE GLOSSARY (50 terms — depth and definition reference, Korean source of truth; do NOT limit yourself to these):
{$glossary}
────────────────────────────────────────
TERMS;
        return $block;
    }

    /**
     * [현 차수] 질문과 관련된 **기능 상세 인벤토리**만 선별해 시스템프롬프트에 주입.
     *
     * 배경: 기존 LIVE FEATURE MAP 은 App.jsx 라우트만 담아, 페이지 **내부** 기능(예: WMS 안의 CCTV 실시간 조회)은
     *   존재조차 몰랐고, 알아도 "라벨(경로)" 한 줄뿐이라 "CCTV 설정 진행순서" 같은 절차 질문에 답할 재료가 없었다.
     *   tools/gen_chatbot_knowledge.mjs 가 i18n 네임스페이스(= 그 기능의 실제 UI 어휘)에서
     *   진입경로·행동(버튼)·입력 필드·상태·주의사항을 기계 추출해 chatbot_feature_details.json 을 만든다.
     *   → 신규 기능은 i18n 키만 추가하면(이미 저장소 필수 규칙) 챗봇이 자동으로 상세 설명하게 된다.
     *
     * 전량(약 100KB)을 상시 주입하면 매 질문 토큰이 폭증하므로, 여기서 결정적(비-AI) 점수화로 상위 N개만 넣는다.
     * 다국어: 별칭에 15개 로케일의 기능명 + 라틴 대문자 토큰(CCTV·RTSP·HLS…)이 들어 있어 어떤 언어로 물어도 매칭된다.
     * 매칭 실패 시 빈 문자열 → 기존 FEATURE MAP 만으로 동작(무회귀).
     */
    /**
     * [289차 후속 / MEA 055 D-3] ★Citation 승격 — 선별된 근거 블록을 **구조화해 함께 반환**한다.
     *
     * 종전엔 선별 결과가 **프롬프트 문자열 안에만** 존재해, 응답을 받은 쪽은 "AI가 무엇을 근거로
     * 답했는지" 알 수 없었다(설명가능성 공백). 055 ADR D-3 이 명시한 대로 **블록→출처 매핑
     * (`ns`·`title`·`paths`)이 이미 코퍼스에 존재**하므로 **신규 수집 없이 반환 계약만 추가**한다.
     * → 헌법 V4 §15 Explainable AI("근거 표시") 직접 충족 · 신규 provider·비용·인프라 0.
     *
     * ★테넌트 안전: 이 코퍼스는 **제품 기능 설명(전역·테넌트 무관)**이라 출처를 노출해도
     *   크로스테넌트 누출이 없다. 테넌트 문서가 코퍼스에 편입되는 순간부터는
     *   **055 ADR D-4(테넌트 격리·Knowledge ACL)가 선행 조건**이며 그 전엔 편입 금지.
     *
     * @param array|null $sources out — [['ns'=>..,'title'=>..,'paths'=>[..],'score'=>int], ...]
     */
    private static function geniegoFeatureDetails(string $question, int $topN = 3, ?array &$sources = null): string {
        $sources = [];
        $raw = null;
        try { $raw = @file_get_contents(__DIR__ . '/../../data/chatbot_feature_details.json'); } catch (\Throwable $e) {}
        if (!is_string($raw) || $raw === '') return '';
        $j = json_decode($raw, true);
        $feats = is_array($j['features'] ?? null) ? $j['features'] : [];
        if (!$feats) return '';

        $q = mb_strtolower($question);
        $scored = [];
        foreach ($feats as $ns => $ft) {
            $s = 0;
            // 강한 단서: 기능명(15개 로케일). 일반 명사('제목' 등)는 생성기가 이미 제외했다.
            //   전체 일치(+6)뿐 아니라 **토큰 부분일치**(+5)도 인정한다. 사용자는 "CCTV 실시간 조회" 대신
            //   "CCTV 설정 진행순서"처럼 기능명을 통째로 쓰지 않기 때문이다.
            foreach (($ft['names'] ?? []) as $n) {
                $n = trim((string)$n);
                if ($n === '' || mb_strlen($n) < 2) continue;
                if (mb_stripos($q, mb_strtolower($n)) !== false) { $s += 6; continue; }
                $toks = preg_split('/[\s·\/()\[\]]+/u', $n, -1, PREG_SPLIT_NO_EMPTY) ?: [];
                $toks = array_values(array_filter($toks, fn($t) => mb_strlen($t) >= 2));
                if (count($toks) >= 2) {
                    $hit = 0;
                    foreach ($toks as $t) if (mb_stripos($q, mb_strtolower($t)) !== false) $hit++;
                    if ($hit / count($toks) >= 0.6) $s += 5;
                }
            }
            foreach (($ft['paths'] ?? []) as $pth) {
                if ($pth !== '' && mb_stripos($q, (string)$pth) !== false) $s += 4;
            }
            // 약한 단서: 변별력 있는 어휘만(흔한 '저장/취소/테스트/API' 는 생성기가 df 로 제거).
            foreach (($ft['match'] ?? []) as $m) {
                $m = trim((string)$m);
                if ($m === '' || mb_strlen($m) < 3) continue;
                if (mb_stripos($q, mb_strtolower($m)) !== false) $s += 2;
            }
            if ($s > 0) $scored[$ns] = $s;
        }
        if (!$scored) return '';
        arsort($scored);
        /* [289차 후속 / MEA 055] ★절대 최소 점수 게이트 — 허위 근거 방지.
         * 종전엔 `$s > 0` 이면 후보에 남아, **약한 단서(match 어휘 +2)만 걸린 항목이 근거로 승격**됐다.
         * Citation 승격(D-3) 전에는 프롬프트 안에서만 소비돼 눈에 안 띄었으나, 근거를 화면에
         * 표시하는 순간 **"반품 포털"을 물었는데 옴니채널·P&L 이 근거로 붙는** 형태로 드러났다(실측).
         * 점수 체계: 기능명 완전일치 +6 / 기능명 토큰일치 +5 / 진입경로 일치 +4 / 변별어휘 +2.
         *   → 5점 미만은 **강한 단서가 하나도 없다**는 뜻이므로 근거로 내보내지 않는다.
         *   (경로 일치 4 + 어휘 2 = 6 은 통과 / 어휘 2개만 = 4 는 탈락)
         * ★근거가 없으면 없는 대로 빈 결과를 반환한다 — 지어내지 않는다(정직 미산출 원칙).
         *   모델은 일반 지식으로 답하되 **허위 출처가 붙지 않는다**. */
        $scored = array_filter($scored, fn($v) => $v >= 5);
        if (!$scored) return '';
        // 압도적 1위가 있으면 잡음 후보를 버린다(상위 점수의 40% 미만은 제외).
        $best = reset($scored);
        $scored = array_filter($scored, fn($v) => $v >= max(5, (int)floor($best * 0.4)));

        $blocks = [];
        foreach (array_slice(array_keys($scored), 0, max(1, $topN)) as $ns) {
            $ft = $feats[$ns];
            $line = function (string $label, $arr): string {
                $arr = array_values(array_filter(array_map('strval', (array)$arr), fn($v) => trim($v) !== ''));
                return $arr ? "- {$label}: " . implode(' / ', $arr) . "\n" : '';
            };
            // [289차 후속 055 D-3] 프롬프트에 넣는 것과 **동일한 선별 결과**를 출처로 반환(불일치 방지).
            $sources[] = [
                'ns'    => (string)$ns,
                'title' => (string)($ft['title'] ?? $ns),
                'paths' => array_values(array_filter(array_map('strval', (array)($ft['paths'] ?? [])), fn($p) => trim($p) !== '')),
                'score' => (int)($scored[$ns] ?? 0),
            ];
            $b  = "### {$ft['title']}  (진입 경로: " . implode(', ', (array)($ft['paths'] ?? [])) . ")\n";
            if (trim((string)($ft['subtitle'] ?? '')) !== '') $b .= "- 한 줄 요약: {$ft['subtitle']}\n";
            $b .= $line('화면에서 할 수 있는 행동(버튼)', $ft['actions'] ?? []);
            $b .= $line('입력/선택 항목', $ft['fields'] ?? []);
            $b .= $line('상태 표시', $ft['states'] ?? []);
            $b .= $line('주의·안내 문구(원문)', $ft['notes'] ?? []);
            $blocks[] = $b;
        }

        return "\n\n─── RELEVANT FEATURE DETAILS (i18n 정본에서 자동 추출한 **실제 화면의 라벨**) ───\n"
             . "이 인벤토리는 실제로 화면에 존재하는 버튼·필드·안내문이다. 아래 지침을 따르라:\n"
             . "1. 사용자가 절차/진행순서를 물으면, 위 라벨을 근거로 **번호가 매겨진 단계별 안내**를 하라.\n"
             . "   권장 흐름: ①진입 경로로 이동 → ②시작 버튼 클릭 → ③입력 항목을 순서대로 채움(각 항목이 무엇인지 설명)\n"
             . "   → ④검증 버튼(예: 연결 테스트)으로 확인 → ⑤저장 → ⑥상태 표시로 성공 확인.\n"
             . "2. 여기 없는 버튼·필드를 지어내지 마라. 모르는 부분은 모른다고 말하고 해당 화면을 열어보라고 안내하라.\n"
             . "3. 주의·안내 문구는 사용자에게 꼭 전달하라(보안·과금·성능 관련이 많다).\n"
             . "4. 라벨은 한국어 원문이다. 반드시 사용자의 응답 언어로 **자연스럽게 번역**해 제시하고,\n"
             . "   원문 라벨을 괄호로 함께 보여줘 화면에서 찾기 쉽게 하라. 예: \"Register camera credentials(카메라 자격등록)\".\n\n"
             . implode("\n", $blocks);
    }

    /**
     * [현 차수] 챗봇 초고도화 — 메뉴 이용법(초보자 단계별)·채널 API 키 발급(링크 포함)·플랫폼 소개(강점) 지식 주입.
     *  KO 원본을 주입하고 AI 가 응답 언어(15개국)의 현지 자연어로 렌더한다. ChatGPT 수준의 친절·상세·단계별 안내.
     */
    private static function geniegoKnowledgeBlock(): string {
        $issuance = ''; $menus = ''; $pitch = '';
        try { $issuance = \Genie\GeniegoKnowledge::issuance(); } catch (\Throwable $e) {}
        try { $menus = \Genie\GeniegoKnowledge::menuGuides(); } catch (\Throwable $e) {}
        try { $pitch = \Genie\GeniegoKnowledge::platformPitch(); } catch (\Throwable $e) {}
        // [270차] 라이브 라우트에서 자동 생성된 전체 기능 맵(tools/gen_chatbot_knowledge.mjs·매 배포 재생성).
        //   신규 기능이 추가(라우트 등록)되면 이 파일이 자동 갱신돼 챗봇이 즉시 그 기능을 인지·설명한다.
        $featureMap = '';
        try { $fm = @file_get_contents(__DIR__ . '/../../data/chatbot_feature_map.md'); if (is_string($fm)) $featureMap = trim($fm); } catch (\Throwable $e) {}
        $featureBlock = $featureMap !== '' ? ("─── LIVE FEATURE MAP (자동 생성·정본·전 메뉴 실재) ───\n" . $featureMap . "\n\n") : '';
        return <<<KB
{$featureBlock}
════════════════════════════════════════
BEGINNER HOW-TO MODE (ChatGPT 수준의 아주 상세한 단계별 안내 — 핵심 역할)

When the user asks HOW TO USE a menu/feature, HOW TO ISSUE an API key for a channel, or WHAT GeniegoROI is, you MUST answer like a patient expert teaching a complete beginner. Rules:

A. ASSUME ZERO KNOWLEDGE. The user may not know any term. Briefly explain any jargon inline (one short clause) the first time it appears, then continue. Never assume they know where a button is.

B. STEP-BY-STEP, ONE BY ONE, IN ORDER. Always answer how-to as a NUMBERED ordered list (1, 2, 3 …). For EACH step state: (a) exactly WHERE to go (the precise menu path in GeniegoROI — bold it — or the external site URL), (b) WHAT to click/enter, and (c) a CHECKPOINT — what the user should see when that step is done ("이 단계가 끝나면 ~~ 화면이 보입니다") so they know to move to the next step. Tell them what comes first and what comes next, explicitly.

C. PROVIDE LINKS. For API key / channel connection questions, give the EXACT official URL to visit at each step (e.g. business.facebook.com, developers.tiktok.com, console.cloud.google.com, searchad.naver.com …) from the ISSUANCE GUIDE below, and finish with where to paste the keys in GeniegoROI ("연동 허브 › 해당 채널 › [등록]"). Render URLs as plain clickable text.

D. "GeniegoROI가 뭐야 / What is GeniegoROI" → use the PLATFORM PITCH below. Describe what kind of platform it is, its menus & features broadly, AND emphasize the STRENGTHS ONLY: that unlike competitors which show only a slice, GeniegoROI integrates everything end-to-end so not a single data point is missed, and it computes the REAL net profit (광고비·원가·물류비·반품비·수수료·다통화 반영). Be detailed and confident. Do NOT volunteer weaknesses.

E. LANGUAGE. The knowledge below is Korean source; ALWAYS answer in the user's response language with native, natural phrasing — translate it, never paste Korean. Localise step labels and checkpoints too.

F. COMPLETENESS. You can explain ANY of GeniegoROI's menus/features at this beginner depth. If a menu is not in the MENU GUIDES list below, derive beginner steps from the MENU & FEATURE MAP above. If a channel is not in the ISSUANCE GUIDE, give the closest general OAuth/API-key steps and point to the channel's official developer portal. Never invent a feature or a URL that does not exist; if unsure of an exact URL, name the official portal generically.

─── PLATFORM PITCH (GeniegoROI 소개 — 강점 중심) ───
{$pitch}

─── MENU GUIDES (메뉴별 초보자 이용가이드) ───
{$menus}

─── ISSUANCE GUIDE (채널별 API 키 발급 따라하기 — 단계 + 공식 링크) ───
{$issuance}
════════════════════════════════════════
KB;
    }

    /** 196차: 실사 이미지 생성 API 설정(provider + key). [현 차수] 구독회원별 BYO 우선 + app_setting 전역 폴백. */
    private static function imgGenConfig(string $tenant = ''): array {
        // [현 차수] ★구독회원별 BYO: ai_settings 테넌트 행에 imggen_* 가 있으면 그 키 사용(없으면 전역 폴백=기존동작, 무위험).
        if ($tenant !== '' && $tenant !== 'demo') {
            try {
                $s = Db::pdo()->prepare("SELECT imggen_provider, imggen_key FROM ai_settings WHERE tenant_id=? LIMIT 1");
                $s->execute([$tenant]);
                $r = $s->fetch(\PDO::FETCH_ASSOC);
                if ($r) {
                    $k = \Genie\Crypto::decrypt((string)($r['imggen_key'] ?? ''));
                    if (strlen($k) > 10) return ['provider' => (trim((string)($r['imggen_provider'] ?? '')) ?: 'openai'), 'key' => $k];
                }
            } catch (\Throwable $e) { /* 컬럼 미존재 등 → 전역 폴백 */ }
        }
        $provider = 'openai'; $key = '';
        $envK = getenv('IMGGEN_API_KEY');
        if ($envK && strlen($envK) > 10) $key = $envK;
        try {
            $pdo = Db::pdo();
            $p = $pdo->query("SELECT svalue FROM app_setting WHERE skey='imggen_provider'");
            $pv = $p ? trim((string)($p->fetchColumn() ?: '')) : '';
            if ($pv !== '') $provider = $pv;
            if ($key === '') {
                $k = $pdo->query("SELECT svalue FROM app_setting WHERE skey='imggen_api_key'");
                $kv = \Genie\Crypto::decrypt($k ? (string)($k->fetchColumn() ?: '') : ''); // 204차 P1: 복호화
                if (strlen($kv) > 10) $key = $kv;
            }
        } catch (\Throwable $e) {}
        return ['provider' => $provider, 'key' => $key];
    }

    /** 실사 이미지 생성 API 설정 여부(UI 게이트용). */
    public static function imgGenConfigured(): bool {
        $c = self::imgGenConfig();
        return strlen($c['key']) > 10;
    }

    /** 196차: AI 동영상 생성 API 설정(provider/key/model). [현 차수] 구독회원별 BYO 우선 + app_setting 전역 폴백. */
    private static function videoGenConfig(string $tenant = ''): array {
        // [현 차수] ★구독회원별 BYO: ai_settings 테넌트 행에 videogen_* 가 있으면 그 키 사용(없으면 전역 폴백).
        if ($tenant !== '' && $tenant !== 'demo') {
            try {
                $s = Db::pdo()->prepare("SELECT videogen_provider, videogen_key, videogen_model FROM ai_settings WHERE tenant_id=? LIMIT 1");
                $s->execute([$tenant]);
                $r = $s->fetch(\PDO::FETCH_ASSOC);
                if ($r) {
                    $k = \Genie\Crypto::decrypt((string)($r['videogen_key'] ?? ''));
                    if (strlen($k) > 10) return ['provider' => (trim((string)($r['videogen_provider'] ?? '')) ?: 'replicate'), 'key' => $k, 'model' => trim((string)($r['videogen_model'] ?? ''))];
                }
            } catch (\Throwable $e) { /* 컬럼 미존재 등 → 전역 폴백 */ }
        }
        $provider = 'replicate'; $key = ''; $model = '';
        $envK = getenv('VIDEOGEN_API_KEY');
        if ($envK && strlen($envK) > 10) $key = $envK;
        try {
            $pdo = Db::pdo();
            $p = $pdo->query("SELECT svalue FROM app_setting WHERE skey='videogen_provider'");
            $pv = $p ? trim((string)($p->fetchColumn() ?: '')) : ''; if ($pv !== '') $provider = $pv;
            $mm = $pdo->query("SELECT svalue FROM app_setting WHERE skey='videogen_model'");
            $model = $mm ? trim((string)($mm->fetchColumn() ?: '')) : '';
            if ($key === '') {
                $k = $pdo->query("SELECT svalue FROM app_setting WHERE skey='videogen_api_key'");
                $kv = \Genie\Crypto::decrypt($k ? (string)($k->fetchColumn() ?: '') : ''); // 204차 P1: 복호화
                if (strlen($kv) > 10) $key = $kv;
            }
        } catch (\Throwable $e) {}
        return ['provider' => $provider, 'key' => $key, 'model' => $model];
    }

    public static function videoGenConfigured(): bool {
        $c = self::videoGenConfig();
        return strlen($c['key']) > 10;
    }

    /** [현 차수] ai_settings 에 구독회원별 이미지/동영상 생성 API 컬럼 보강(멱등). */
    private static function ensureCreativeApiCols(PDO $pdo): void {
        try { Db::ensureAiSettings($pdo); } catch (\Throwable $e) {} // SSOT: Db::ensureAiSettings 일원화
        foreach (['imggen_provider VARCHAR(32)', 'imggen_key TEXT', 'videogen_provider VARCHAR(32)', 'videogen_key TEXT', 'videogen_model VARCHAR(64)'] as $col) {
            try { $pdo->exec("ALTER TABLE ai_settings ADD COLUMN $col"); } catch (\Throwable $e) {}
        }
    }

    /** GET /v422/ai/creative-api — 구독회원의 이미지/동영상 생성 API 설정 상태(키 마스킹, 세션 테넌트). */
    public static function creativeApiGet(Request $req, Response $res): Response {
        $tenant = self::tenant($req);
        $out = ['ok' => true, 'tenant' => $tenant,
            'img' => ['provider' => 'openai', 'configured' => false],
            'video' => ['provider' => 'replicate', 'model' => '', 'configured' => false],
            'global_img' => self::imgGenConfigured(), 'global_video' => self::videoGenConfigured()];
        if ($tenant !== '' && $tenant !== 'unknown' && $tenant !== 'demo') {
            try {
                $s = Db::pdo()->prepare("SELECT imggen_provider, imggen_key, videogen_provider, videogen_key, videogen_model FROM ai_settings WHERE tenant_id=? LIMIT 1");
                $s->execute([$tenant]);
                if ($r = $s->fetch(\PDO::FETCH_ASSOC)) {
                    $ik = \Genie\Crypto::decrypt((string)($r['imggen_key'] ?? ''));
                    $vk = \Genie\Crypto::decrypt((string)($r['videogen_key'] ?? ''));
                    $out['img'] = ['provider' => (trim((string)($r['imggen_provider'] ?? '')) ?: 'openai'), 'configured' => strlen($ik) > 10];
                    $out['video'] = ['provider' => (trim((string)($r['videogen_provider'] ?? '')) ?: 'replicate'), 'model' => trim((string)($r['videogen_model'] ?? '')), 'configured' => strlen($vk) > 10];
                }
            } catch (\Throwable $e) {}
        }
        $res->getBody()->write(json_encode($out, JSON_UNESCAPED_UNICODE));
        return $res->withHeader('Content-Type', 'application/json');
    }

    /** POST /v422/ai/creative-api — 구독회원의 이미지/동영상 생성 API 키 저장(AES 암호화, 세션 테넌트). */
    public static function creativeApiSave(Request $req, Response $res): Response {
        $tenant = self::tenant($req);
        if ($tenant === '' || $tenant === 'unknown' || $tenant === 'demo') {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => '로그인된 구독회원만 저장할 수 있습니다(데모 제외).'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $imgProvider = trim((string)($body['img_provider'] ?? ''));
        $imgKey      = trim((string)($body['img_key'] ?? ''));
        $vidProvider = trim((string)($body['video_provider'] ?? ''));
        $vidKey      = trim((string)($body['video_key'] ?? ''));
        $vidModel    = trim((string)($body['video_model'] ?? ''));
        try {
            $pdo = Db::pdo();
            self::ensureCreativeApiCols($pdo);
            $now = gmdate('c');
            $ex = $pdo->prepare("SELECT 1 FROM ai_settings WHERE tenant_id=? LIMIT 1"); $ex->execute([$tenant]);
            if (!$ex->fetchColumn()) $pdo->prepare("INSERT INTO ai_settings(tenant_id, is_active, updated_at) VALUES(?,?,?)")->execute([$tenant, 1, $now]);
            $sets = []; $vals = [];
            if ($imgProvider !== '') { $sets[] = 'imggen_provider=?'; $vals[] = $imgProvider; }
            if ($imgKey !== '')      { $sets[] = 'imggen_key=?'; $vals[] = \Genie\Crypto::encrypt($imgKey); } // 키 입력시에만 덮어씀(마스킹 유지)
            if ($vidProvider !== '') { $sets[] = 'videogen_provider=?'; $vals[] = $vidProvider; }
            if ($vidKey !== '')      { $sets[] = 'videogen_key=?'; $vals[] = \Genie\Crypto::encrypt($vidKey); }
            $sets[] = 'videogen_model=?'; $vals[] = $vidModel; // model 은 빈값(해제)도 허용
            $sets[] = 'updated_at=?'; $vals[] = $now; $vals[] = $tenant;
            $pdo->prepare("UPDATE ai_settings SET " . implode(',', $sets) . " WHERE tenant_id=?")->execute($vals);
            $res->getBody()->write(json_encode(['ok' => true], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /* ── DB 스키마 자동 생성 ─────────────────────────────────── */
    private static function migrate(PDO $pdo): void {
        // MySQL 호환 스키마 (SQLite 시 AUTOINCREMENT → MySQL AUTO_INCREMENT)
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $pdo->exec("CREATE TABLE IF NOT EXISTS ai_analyses (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id     TEXT    NOT NULL DEFAULT 'unknown',
                context       TEXT    NOT NULL DEFAULT 'general',
                question      TEXT    NOT NULL,
                data_snapshot TEXT,
                summary       TEXT,
                bullets       TEXT,
                recommendation TEXT,
                model         TEXT,
                tokens_used   INTEGER DEFAULT 0,
                status        TEXT    NOT NULL DEFAULT 'ok',
                error_msg     TEXT,
                created_at    TEXT    NOT NULL
            )");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS ai_analyses (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id     VARCHAR(100)  NOT NULL DEFAULT 'unknown',
                context       VARCHAR(64)   NOT NULL DEFAULT 'general',
                question      TEXT          NOT NULL,
                data_snapshot MEDIUMTEXT,
                summary       TEXT,
                bullets       TEXT,
                recommendation TEXT,
                model         VARCHAR(128),
                tokens_used   INT           DEFAULT 0,
                status        VARCHAR(16)   NOT NULL DEFAULT 'ok',
                error_msg     TEXT,
                created_at    VARCHAR(32)   NOT NULL
            )");
        }
        // 191차 보안(P1): 기존 테이블에 tenant_id 보강(크로스테넌트 누출 차단). 이미 존재 시 무시.
        try { $pdo->exec("ALTER TABLE ai_analyses ADD COLUMN tenant_id VARCHAR(100) NOT NULL DEFAULT 'unknown'"); } catch (\Throwable $e) {}
    }

    /** 191차: 인증 세션 테넌트(/v422/ai/* 는 세션/ api_key 혼용). 미식별 시 'unknown'. */
    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        if ($t === null || $t === '') $t = (string)($req->getAttribute('auth_tenant') ?? '');
        return $t !== '' ? $t : 'unknown';
    }

    /* ── [225차 P1-4] AI 공용키 비용남용 방지: 테넌트별 일일 호출/토큰 quota ──────────
     *   인증게이트(index.php)는 viewer/free/demo 세션도 통과시키고 테넌트별 호출·토큰 캡이
     *   전무 → 인증된 저권한 1명이 서버 공용 Claude/DALL·E/Replicate 키 비용을 무제한 소진
     *   가능했다. provider 호출 前 quotaGate 로 캡을 강제하고 성공 後 quotaConsume 로 누적.
     *   캡 초과: 텍스트=throw(핸들러가 내장 템플릿으로 폴백, 무비용) / 이미지·영상=429.
     *   가용성 우선: quota 인프라 실패(테이블/DB) 시 통과(기존 동작 보존). 테넌트별 격리. */
    private const Q_CALL_CAP  = 600;      // 텍스트 분석 호출/일/테넌트
    private const Q_TOKEN_CAP = 3000000;  // 토큰/일/테넌트
    private const Q_IMG_CAP   = 100;      // 이미지+영상 생성/일/테넌트

    private static function quotaCap(string $envKey, int $def): int {
        $v = getenv($envKey);
        if ($v !== false && is_numeric($v) && (int)$v > 0) return (int)$v;
        return $def;
    }

    private static function ensureQuotaTable(PDO $pdo): void {
        static $done = false; if ($done) return; $done = true;
        try {
            $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
            if ($isSqlite) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS ai_usage_quota (tenant_id TEXT NOT NULL, usage_date TEXT NOT NULL, calls INTEGER DEFAULT 0, tokens INTEGER DEFAULT 0, img_calls INTEGER DEFAULT 0, updated_at TEXT, PRIMARY KEY(tenant_id, usage_date))");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS ai_usage_quota (tenant_id VARCHAR(100) NOT NULL, usage_date VARCHAR(10) NOT NULL, calls INT DEFAULT 0, tokens BIGINT DEFAULT 0, img_calls INT DEFAULT 0, updated_at VARCHAR(32), PRIMARY KEY(tenant_id, usage_date))");
            }
        } catch (\Throwable $e) {}
    }

    /** provider 호출 前. 캡 초과 시 사람이 읽는 사유 문자열, 통과 시 null. */
    private static function quotaGate(string $tenant, string $kind = 'text'): ?string {
        $tenant = trim($tenant) !== '' ? trim($tenant) : 'unknown';
        try {
            $pdo = Db::pdo();
            self::ensureQuotaTable($pdo);
            $day = gmdate('Y-m-d');
            $s = $pdo->prepare("SELECT calls, tokens, img_calls FROM ai_usage_quota WHERE tenant_id=? AND usage_date=? LIMIT 1");
            $s->execute([$tenant, $day]);
            $r = $s->fetch(\PDO::FETCH_ASSOC) ?: ['calls' => 0, 'tokens' => 0, 'img_calls' => 0];
            if ($kind === 'image') {
                if ((int)$r['img_calls'] >= self::quotaCap('AI_DAILY_IMG_CAP', self::Q_IMG_CAP))
                    return '일일 AI 이미지/영상 생성 한도를 초과했습니다. 내일 다시 시도하거나 [API 연동]에서 본인 생성 API 키를 등록하세요.';
            } else {
                if ((int)$r['calls']  >= self::quotaCap('AI_DAILY_CALL_CAP',  self::Q_CALL_CAP)
                 || (int)$r['tokens'] >= self::quotaCap('AI_DAILY_TOKEN_CAP', self::Q_TOKEN_CAP))
                    return '일일 AI 분석 한도를 초과했습니다. 잠시 후 다시 시도하세요.';
            }
        } catch (\Throwable $e) { /* quota 인프라 실패 → 통과(가용성 우선) */ }
        return null;
    }

    /**
     * [289차 후속 / MEA 057 D-1] AI 게이트웨이 관측 스냅샷 — 관측 정본(`SystemMetrics`)이 quota 상태를
     *   읽기 위한 유일한 공개 접근자. ★캡·테이블 지식을 외부로 복제하지 않기 위한 단일 출처(헌법 V4).
     *
     * ★정직 미산출 승계(057 SystemMetrics null · 058 Mmm optimized:false · 059 PriceOpt null/422):
     *   quota 인프라(테이블/DB)가 없거나 조회 실패 시 사용량을 **0이 아니라 null** 로 반환하고
     *   `measured=false` + `reason` 을 함께 준다. **0은 "호출이 없었다"로 오독되지만 실제로는
     *   "측정 자체가 불가"이므로 완전히 다른 사실이다.**
     *
     * ★provider 를 호출하지 않는다(비용 0·지연 0) — DB 읽기 전용.
     * @param string $tenant 빈 문자열이면 플랫폼 전체 합계(테넌트별 내역은 반환하지 않는다 — 격리).
     */
    public static function quotaSnapshot(string $tenant = ''): array {
        $caps = [
            'calls'  => self::quotaCap('AI_DAILY_CALL_CAP',  self::Q_CALL_CAP),
            'tokens' => self::quotaCap('AI_DAILY_TOKEN_CAP', self::Q_TOKEN_CAP),
            'img'    => self::quotaCap('AI_DAILY_IMG_CAP',   self::Q_IMG_CAP),
        ];
        $out = [
            'measured' => false,
            'reason'   => null,
            'date'     => gmdate('Y-m-d'),
            'scope'    => trim($tenant) !== '' ? 'tenant' : 'platform',
            'caps'     => $caps,
            'used'     => ['calls' => null, 'tokens' => null, 'img_calls' => null],
        ];
        try {
            $pdo = Db::pdo();
            self::ensureQuotaTable($pdo);
            $day = gmdate('Y-m-d');
            if (trim($tenant) !== '') {
                $s = $pdo->prepare("SELECT COALESCE(calls,0) c, COALESCE(tokens,0) t, COALESCE(img_calls,0) i FROM ai_usage_quota WHERE tenant_id=? AND usage_date=? LIMIT 1");
                $s->execute([trim($tenant), $day]);
            } else {
                // 플랫폼 합계만(테넌트 식별자 미반환 — 교차 노출 금지).
                $s = $pdo->prepare("SELECT COALESCE(SUM(calls),0) c, COALESCE(SUM(tokens),0) t, COALESCE(SUM(img_calls),0) i FROM ai_usage_quota WHERE usage_date=?");
                $s->execute([$day]);
            }
            $r = $s->fetch(\PDO::FETCH_ASSOC);
            // 행이 없으면 "오늘 호출 0" 이 실제 사실이다(테이블은 정상 조회됨) → 0 으로 확정.
            $out['measured'] = true;
            $out['used'] = [
                'calls'     => (int)($r['c'] ?? 0),
                'tokens'    => (int)($r['t'] ?? 0),
                'img_calls' => (int)($r['i'] ?? 0),
            ];
        } catch (\Throwable $e) {
            // ★측정 불가 — 0 으로 위장하지 않는다.
            $out['reason'] = 'quota_store_unavailable';
        }
        return $out;
    }

    /** 성공한 provider 호출 後. 사용량 누적(driver-aware upsert). */
    private static function quotaConsume(string $tenant, string $kind = 'text', int $tokens = 0): void {
        $tenant = trim($tenant) !== '' ? trim($tenant) : 'unknown';
        try {
            $pdo = Db::pdo();
            self::ensureQuotaTable($pdo);
            $day = gmdate('Y-m-d');
            $now = gmdate('c');
            $dCalls = $kind === 'image' ? 0 : 1;
            $dImg   = $kind === 'image' ? 1 : 0;
            $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
            if ($isSqlite) {
                $pdo->prepare(
                    "INSERT INTO ai_usage_quota(tenant_id, usage_date, calls, tokens, img_calls, updated_at)
                     VALUES(?,?,?,?,?,?)
                     ON CONFLICT(tenant_id, usage_date) DO UPDATE SET
                       calls = calls + ?, tokens = tokens + ?, img_calls = img_calls + ?, updated_at = ?"
                )->execute([$tenant, $day, $dCalls, $tokens, $dImg, $now,  $dCalls, $tokens, $dImg, $now]);
            } else {
                $pdo->prepare(
                    "INSERT INTO ai_usage_quota(tenant_id, usage_date, calls, tokens, img_calls, updated_at)
                     VALUES(?,?,?,?,?,?)
                     ON DUPLICATE KEY UPDATE calls = calls + ?, tokens = tokens + ?, img_calls = img_calls + ?, updated_at = ?"
                )->execute([$tenant, $day, $dCalls, $tokens, $dImg, $now,  $dCalls, $tokens, $dImg, $now]);
            }
        } catch (\Throwable $e) {}
    }

    /** 이미지/영상 핸들러: 사용 키가 전역 공용 키인지(BYO 아님) 판정 — BYO 사용자는 quota 비대상. */
    private static function usingGlobalKey(string $byoKey, array $globalCfg): bool {
        return ($globalCfg['key'] ?? '') !== '' && $byoKey === ($globalCfg['key'] ?? '');
    }

    /* ── Claude API 호출 ─────────────────────────────────────── */
    /* ══════════════════════════════════════════════════════════════════════════════
     * [289차 후속 / MEA 053 D-2 + 056 D-4] ★★Anthropic Messages API 단일 통과점(Gateway)
     *
     * 종전엔 Claude 전송 지점이 **4곳에 흩어져** 각자 quota 게이트·키 해석·cURL·누적을
     * 중복 구현했고(callClaude / callClaudeTools / callClaudeLong / marketingIntelligence
     * 인라인), `AiGenerate` 는 아예 별도 cURL 이었다. 그 결과:
     *   ① 감사: AI 호출을 한곳에서 볼 수 없다(056 "감사 구멍")
     *   ② 계측: 프로브를 붙이려면 N곳을 고쳐야 한다(057)
     *   ③ 규율: 새 경로가 생길 때마다 quota 우회 가능(실제로 marketingIntelligence 가
     *      quotaGate 없이 전역 키를 쓰고 있었다 — 미배선이라 도달 불가였으나 잠재 결함)
     * → **전송을 이 함수 하나로 모으면 감사·계측이 자동으로 확보된다**(053 판정의 핵심).
     *
     * ★승계 4조건(053 D-2 명시)
     *   1) **quota 게이트** — 전역 공용 키 사용 시에만 강제
     *   2) **BYO 우선**    — 테넌트 자기 키(`ai_settings`)는 본인 비용이므로 **플랫폼 quota 비대상**
     *                        (기존 `AiGenerate` 동작이 설계상 정상이었음 — 무회귀로 보존)
     *   3) **Crypto 복호** — 전역 키는 `apiKey()` 가 `Crypto::decrypt` 수행 / BYO 는 호출측이 복호해 전달
     *   4) **감사 스키마** — 성공·실패 모두 `ai_call_log` 1행(★메타데이터만·프롬프트/응답 본문 미저장)
     *
     * ★페이로드는 호출측이 완성해 넘긴다 — max_tokens·system 형식(배열+cache_control vs 평문)·
     *   tools 유무가 경로마다 다르므로, 게이트웨이가 임의로 통일하면 동작이 바뀐다(무회귀 원칙).
     * ★에러 처리도 호출측 책임 — 각 경로의 기존 예외 메시지를 그대로 보존한다.
     * ★이미지/영상 provider(OpenAI·Stability·Replicate)는 **별도 축**이라 본 게이트웨이 범위 밖
     *   (quota kind='image' 로 이미 분리돼 있다).
     *
     * @param array $payload Anthropic Messages API 요청 본문(완성본)
     * @param array $opt     tenant, op(감사 라벨), timeout, connect_timeout, api_key(BYO·있으면 우선)
     * @return array{status:int,err:string,raw:string,json:array,tokens_input:int,tokens_output:int,ms:float}
     * ══════════════════════════════════════════════════════════════════════════════ */
    public static function gateway(array $payload, array $opt = []): array
    {
        $tenant  = (string)($opt['tenant'] ?? '');
        $op      = (string)($opt['op'] ?? 'unknown');
        $timeout = (int)($opt['timeout'] ?? 8);
        $connect = (int)($opt['connect_timeout'] ?? 4);
        $byoKey  = isset($opt['api_key']) ? trim((string)$opt['api_key']) : '';
        $isByo   = $byoKey !== '';

        // ① + ② quota 게이트는 **전역 공용 키일 때만**(BYO 우선 — 본인 비용은 플랫폼이 막지 않는다)
        if (!$isByo) {
            $qErr = self::quotaGate($tenant, 'text');
            if ($qErr !== null) throw new \RuntimeException('AI_QUOTA: ' . $qErr);
        }
        // ③ 전역 키는 apiKey() 내부에서 Crypto::decrypt 됨. BYO 는 호출측이 복호해 전달.
        $apiKey = $isByo ? $byoKey : self::apiKey();

        $t0 = microtime(true);
        $ch = curl_init(self::API_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => $connect,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'x-api-key: ' . $apiKey,
                'anthropic-version: 2023-06-01',
            ],
        ]);
        $raw    = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err    = (string)curl_error($ch);
        curl_close($ch);
        $ms = round((microtime(true) - $t0) * 1000, 1);

        $resp = is_string($raw) ? (json_decode($raw, true) ?: []) : [];
        $tIn  = (int)($resp['usage']['input_tokens']  ?? 0);
        $tOut = (int)($resp['usage']['output_tokens'] ?? 0);

        // 성공 + 전역 키일 때만 누적(기존 3경로와 동일 조건 — 무회귀)
        if ($err === '' && $status === 200 && !$isByo) {
            self::quotaConsume($tenant, 'text', $tIn + $tOut);
        }
        // ④ 감사 — 성공/실패 모두 기록. best-effort(감사 실패가 원 호출을 막지 않는다·SecurityAudit 철학 동형)
        self::auditCall($tenant, $op, (string)($payload['model'] ?? ''), $isByo, $status, $tIn, $tOut, $ms, $err);

        return ['status'=>$status, 'err'=>$err, 'raw'=>(string)$raw, 'json'=>$resp,
                'tokens_input'=>$tIn, 'tokens_output'=>$tOut, 'ms'=>$ms];
    }

    /**
     * [289차 후속] AI 호출 감사 1행 — **메타데이터만** 기록한다.
     * ★프롬프트/응답 본문은 저장하지 않는다: PII 유입 위험 + 용량 폭증 + 테넌트 기밀.
     *   내용 기반 분석이 필요하면 기존 `ai_analyses`(분석 결과 저장)를 쓴다 — 역할 분리.
     * ★best-effort — 감사 실패가 AI 호출 자체를 막지 않는다.
     */
    private static function auditCall(string $tenant, string $op, string $model, bool $isByo,
                                      int $status, int $tIn, int $tOut, float $ms, string $err): void
    {
        try {
            $pdo = Db::pdo();
            self::ensureAiCallLog($pdo);
            $pdo->prepare("INSERT INTO ai_call_log(tenant_id,op,model,byo,status,tokens_input,tokens_output,duration_ms,error,created_at)
                           VALUES(?,?,?,?,?,?,?,?,?,?)")
                ->execute([
                    trim($tenant) !== '' ? trim($tenant) : 'unknown',
                    substr($op, 0, 60), substr($model, 0, 60), $isByo ? 1 : 0,
                    $status, $tIn, $tOut, $ms,
                    $err !== '' ? substr($err, 0, 190) : null,
                    gmdate('Y-m-d H:i:s'),
                ]);
        } catch (\Throwable $e) { /* 감사 실패는 삼킨다(가용성 우선) */ }
    }

    /** `ai_call_log` 자가치유(멱등). 마이그레이션은 172차에서 멈췄고 이후 스키마는 핸들러 자가치유가 정본. */
    private static function ensureAiCallLog(\PDO $pdo): void
    {
        static $done = [];
        $k = spl_object_id($pdo);
        if (isset($done[$k])) return;
        $done[$k] = true;
        try {
            if ($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql') {
                $pdo->exec("CREATE TABLE IF NOT EXISTS ai_call_log (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, op VARCHAR(60),
                    model VARCHAR(60), byo TINYINT(1) DEFAULT 0, status INT, tokens_input INT DEFAULT 0,
                    tokens_output INT DEFAULT 0, duration_ms DOUBLE DEFAULT 0, error VARCHAR(190),
                    created_at VARCHAR(32), KEY idx_acl (tenant_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS ai_call_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, op TEXT, model TEXT,
                    byo INTEGER DEFAULT 0, status INTEGER, tokens_input INTEGER DEFAULT 0,
                    tokens_output INTEGER DEFAULT 0, duration_ms REAL DEFAULT 0, error TEXT, created_at TEXT)");
            }
        } catch (\Throwable $e) {}
    }

    private static function callClaude(string $systemPrompt, string $userMsg, int $timeout = 8, string $tenant = ''): array {
        // [현 차수] 프롬프트 캐싱(GA): 대형 정적 시스템 프롬프트(메뉴맵·용어집·발급가이드)를 ephemeral 캐시 →
        //   동일 시스템 반복 호출 시 입력토큰 비용 대폭 절감(5분 TTL). 배열 형식은 전 호출자 후방호환.
        // [289차 후속] 전송·quota·감사는 gateway() 로 일원화. 페이로드/에러 메시지는 기존 그대로 보존.
        $r = self::gateway([
            'model'      => self::MODEL,
            'max_tokens' => self::MAX_TOKENS,
            'system'     => [['type' => 'text', 'text' => $systemPrompt, 'cache_control' => ['type' => 'ephemeral']]],
            'messages'   => [
                ['role' => 'user', 'content' => $userMsg]
            ],
        ], ['tenant' => $tenant, 'op' => 'complete', 'timeout' => $timeout, 'connect_timeout' => 4]);

        if ($r['err'] !== '') throw new \RuntimeException('curl error: ' . $r['err']);
        $resp = $r['json'];
        if ($r['status'] !== 200 || !isset($resp['content'][0]['text'])) {
            $msg = $resp['error']['message'] ?? $r['raw'];
            throw new \RuntimeException("Claude API error ({$r['status']}): {$msg}");
        }
        return [
            'text'         => $resp['content'][0]['text'],
            'tokens_input' => $r['tokens_input'],
            'tokens_output'=> $r['tokens_output'],
        ];
    }

    /** [255차 심화] tool-use 지원 Claude 호출(에이전틱 코파일럿). tools 정의 + messages 멀티턴 → 전체 응답(content blocks+stop_reason). */
    private static function callClaudeTools(string $system, array $messages, array $tools, int $timeout, string $tenant): array {
        // [289차 후속] 전송·quota·감사 gateway() 일원화. tools 포함 페이로드·에러 메시지는 기존 보존.
        $r = self::gateway(['model' => self::MODEL, 'max_tokens' => self::MAX_TOKENS,
            'system' => [['type' => 'text', 'text' => $system, 'cache_control' => ['type' => 'ephemeral']]],
            'tools' => $tools, 'messages' => $messages],
            ['tenant' => $tenant, 'op' => 'tools', 'timeout' => $timeout, 'connect_timeout' => 4]);
        if ($r['err'] !== '') throw new \RuntimeException('curl error: ' . $r['err']);
        $resp = $r['json'];
        if ($r['status'] !== 200 || !isset($resp['content'])) { $msg = $resp['error']['message'] ?? $r['raw']; throw new \RuntimeException("Claude API error ({$r['status']}): {$msg}"); }
        return $resp;
    }

    /** [255차 심화] bi_query 도구 — 읽기전용 광고성과 집계(테넌트 스코프·화이트리스트 차원). 액션 없음=안전. */
    private static function biQueryTool(\PDO $pdo, string $tenant, array $args): array {
        $period = max(1, min(365, (int)($args['period_days'] ?? 30)));
        $since = gmdate('Y-m-d', time() - $period * 86400);
        $dim = in_array(($args['dimension'] ?? 'channel'), ['channel', 'campaign_ext_id', 'date'], true) ? (string)($args['dimension'] ?? 'channel') : 'channel';
        try {
            $st = $pdo->prepare("SELECT {$dim} AS dim, ROUND(SUM(spend)) spend, ROUND(SUM(revenue)) revenue, SUM(conversions) conversions, ROUND(SUM(revenue)/NULLIF(SUM(spend),0),2) roas
                FROM performance_metrics WHERE tenant_id=? AND date>=? AND {$dim} IS NOT NULL AND {$dim}<>'' GROUP BY {$dim} ORDER BY spend DESC LIMIT 50");
            $st->execute([$tenant, $since]); $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $tot = ['spend' => 0.0, 'revenue' => 0.0, 'conversions' => 0.0];
            foreach ($rows as $r) { $tot['spend'] += (float)$r['spend']; $tot['revenue'] += (float)$r['revenue']; $tot['conversions'] += (float)$r['conversions']; }
            $tot['roas'] = $tot['spend'] > 0 ? round($tot['revenue'] / $tot['spend'], 2) : 0;
            return ['period_days' => $period, 'dimension' => $dim, 'rows' => $rows, 'totals' => $tot];
        } catch (\Throwable $e) { return ['error' => 'query_failed', 'rows' => []]; }
    }

    /* ═══════════════════════════════════════════════════════════════════════════════════
     * [283차 P1] 코파일럿 읽기전용 도구 증설 — 최대 갭 해소.
     *
     * 종전 코파일럿은 bi_query(performance_metrics 광고 1테이블·3차원)만 볼 수 있어
     *   "VIP 고객 재구매율은?" · "악성재고 얼마나?" · "채널별 순이익은?" 같은 질문에 답할 수 없었다
     *   (ThoughtSpot·Triple Whale Willy 대비 최대 열세). 아래 5개 도구로 CRM·P&L·재고·주문·리뷰를 개통한다.
     *
     * 안전 규약(전 도구 공통 · biQueryTool 패턴 그대로):
     *   ①읽기 전용(SELECT) — 쓰기·DDL 없음   ②tenant_id 는 항상 prepared 바인딩(테넌트 격리)
     *   ③차원은 화이트리스트 매칭된 상수만 SQL 에 삽입 — 사용자/모델 입력을 SQL 문자열에 절대 조립하지 않음
     *   ④LIMIT 필수   ⑤PII 미반환(집계만 — 이메일·이름·전화 컬럼은 SELECT 하지 않는다)
     *   ⑥실패는 error 로 정직 반환(빈 결과로 위장하지 않음 — 모델이 "조회 실패"를 사용자에게 말할 수 있게)
     * 신규 엔드포인트 0 · 신규 메뉴 0 — 기존 /v422/ai/agentic 의 tools 배열에만 증설.
     * ═══════════════════════════════════════════════════════════════════════════════════ */

    /** crm_query — CRM 세그먼트/RFM/LTV/재구매 집계. ★PII 미반환(집계 전용). */
    private static function crmQueryTool(\PDO $pdo, string $tenant, array $args): array {
        $dim = in_array(($args['dimension'] ?? 'grade'), ['grade', 'rfm_r', 'rfm_f', 'rfm_m'], true) ? (string)($args['dimension'] ?? 'grade') : 'grade';
        try {
            $st = $pdo->prepare("SELECT {$dim} AS dim, COUNT(*) customers, ROUND(AVG(ltv)) avg_ltv, ROUND(SUM(ltv)) total_ltv,
                    ROUND(AVG(rfm_score),2) avg_rfm_score, SUM(CASE WHEN rfm_f>=2 THEN 1 ELSE 0 END) repeat_customers
                FROM crm_customers WHERE tenant_id=? GROUP BY {$dim} ORDER BY total_ltv DESC LIMIT 50");
            $st->execute([$tenant]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $tot = ['customers' => 0, 'total_ltv' => 0.0, 'repeat_customers' => 0];
            foreach ($rows as &$r) {
                $c = (int)$r['customers'];
                // 재구매율 = 구매 2회 이상(rfm_f>=2) 고객 비중. crm_customers.rfm_f 는 CRM 이 갱신하는 SSOT 빈도값.
                $r['repeat_rate_pct'] = $c > 0 ? round(((int)$r['repeat_customers']) / $c * 100, 1) : 0;
                $tot['customers'] += $c; $tot['total_ltv'] += (float)$r['total_ltv']; $tot['repeat_customers'] += (int)$r['repeat_customers'];
            }
            unset($r);
            $tot['repeat_rate_pct'] = $tot['customers'] > 0 ? round($tot['repeat_customers'] / $tot['customers'] * 100, 1) : 0;
            $tot['avg_ltv'] = $tot['customers'] > 0 ? round($tot['total_ltv'] / $tot['customers']) : 0;
            return ['dimension' => $dim, 'rows' => $rows, 'totals' => $tot,
                'note' => '집계 전용(개인정보 미포함). repeat_rate_pct=구매 2회 이상 고객 비중(%). grade 예: vip/normal.'];
        } catch (\Throwable $e) { return ['error' => 'crm_query_failed: ' . substr($e->getMessage(), 0, 160), 'rows' => []]; }
    }

    /** pnl_query — 채널/월별 손익(정산 SSOT). net_profit 공식은 Reports 커스텀분석과 동일(값 단일소스). */
    private static function pnlQueryTool(\PDO $pdo, string $tenant, array $args): array {
        $dim = in_array(($args['dimension'] ?? 'channel'), ['channel', 'period'], true) ? (string)($args['dimension'] ?? 'channel') : 'channel';
        try {
            $st = $pdo->prepare("SELECT {$dim} AS dim, ROUND(SUM(gross_sales)) gross_sales, ROUND(SUM(net_payout)) net_payout,
                    ROUND(SUM(platform_fee)) platform_fee, ROUND(SUM(ad_fee)) ad_fee, ROUND(SUM(coupon_discount)) coupon_discount,
                    ROUND(SUM(return_fee)) return_fee, SUM(orders_count) orders, SUM(returns_count) returns_count,
                    ROUND(SUM(net_payout)-SUM(ad_fee)) net_profit
                FROM orderhub_settlements WHERE tenant_id=? GROUP BY {$dim} ORDER BY gross_sales DESC LIMIT 50");
            $st->execute([$tenant]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $tot = ['gross_sales' => 0.0, 'net_payout' => 0.0, 'ad_fee' => 0.0, 'platform_fee' => 0.0, 'net_profit' => 0.0, 'orders' => 0];
            foreach ($rows as $r) {
                $tot['gross_sales'] += (float)$r['gross_sales']; $tot['net_payout'] += (float)$r['net_payout'];
                $tot['ad_fee'] += (float)$r['ad_fee']; $tot['platform_fee'] += (float)$r['platform_fee'];
                $tot['net_profit'] += (float)$r['net_profit']; $tot['orders'] += (int)$r['orders'];
            }
            $tot['net_margin_pct'] = $tot['gross_sales'] > 0 ? round($tot['net_profit'] / $tot['gross_sales'] * 100, 2) : 0;
            return ['dimension' => $dim, 'rows' => $rows, 'totals' => $tot,
                'note' => 'orderhub_settlements(정산 SSOT) 기준. net_profit=정산수령액-광고비차감. COGS·배송비는 이 테이블에 없으므로 미포함(과장 금지).'];
        } catch (\Throwable $e) { return ['error' => 'pnl_query_failed: ' . substr($e->getMessage(), 0, 160), 'rows' => []]; }
    }

    /** inventory_query — 재고 요약 / 악성재고(기간 내 판매 0 + 재고>0) / 재고 상위. */
    private static function inventoryQueryTool(\PDO $pdo, string $tenant, array $args): array {
        $period = max(1, min(365, (int)($args['period_days'] ?? 60)));
        $since = gmdate('Y-m-d', time() - $period * 86400);
        $mode = in_array(($args['mode'] ?? 'summary'), ['summary', 'deadstock', 'top'], true) ? (string)($args['mode'] ?? 'summary') : 'summary';
        try {
            $s = $pdo->prepare("SELECT COUNT(*) sku_rows, ROUND(SUM(on_hand)) total_on_hand,
                    SUM(CASE WHEN on_hand<=0 THEN 1 ELSE 0 END) out_of_stock_rows FROM wms_stock WHERE tenant_id=?");
            $s->execute([$tenant]);
            $summary = $s->fetch(\PDO::FETCH_ASSOC) ?: [];
            $rows = [];
            if ($mode === 'deadstock') {
                // 악성재고 후보 = 재고 보유 중 + 최근 {period}일 판매 이력 0건.
                $st = $pdo->prepare("SELECT sku, MAX(name) name, ROUND(SUM(on_hand)) on_hand FROM wms_stock
                    WHERE tenant_id=? AND on_hand>0 AND sku IS NOT NULL AND sku<>''
                      AND sku NOT IN (SELECT sku FROM channel_orders WHERE tenant_id=? AND ordered_at>=? AND sku IS NOT NULL AND sku<>'')
                    GROUP BY sku ORDER BY on_hand DESC LIMIT 30");
                $st->execute([$tenant, $tenant, $since]);
                $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            } elseif ($mode === 'top') {
                $st = $pdo->prepare("SELECT sku, MAX(name) name, ROUND(SUM(on_hand)) on_hand FROM wms_stock
                    WHERE tenant_id=? GROUP BY sku ORDER BY on_hand DESC LIMIT 30");
                $st->execute([$tenant]);
                $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            }
            return ['mode' => $mode, 'period_days' => $period, 'summary' => $summary, 'rows' => $rows,
                'note' => $mode === 'deadstock' ? "악성재고 후보 = 재고>0 이면서 최근 {$period}일 판매 0건(수량 기준·금액 아님)." : '수량(on_hand) 기준. 금액 환산 아님.'];
        } catch (\Throwable $e) { return ['error' => 'inventory_query_failed: ' . substr($e->getMessage(), 0, 160), 'rows' => []]; }
    }

    /** orders_query — 채널/상태/SKU/일자별 주문·취소·반품 집계. */
    private static function ordersQueryTool(\PDO $pdo, string $tenant, array $args): array {
        $period = max(1, min(365, (int)($args['period_days'] ?? 30)));
        $since = gmdate('Y-m-d', time() - $period * 86400);
        $dim = in_array(($args['dimension'] ?? 'channel'), ['channel', 'status', 'sku', 'date'], true) ? (string)($args['dimension'] ?? 'channel') : 'channel';
        // 'date' 만 표현식 — 나머지는 화이트리스트 통과한 컬럼명 상수.
        $expr = $dim === 'date' ? 'SUBSTR(ordered_at,1,10)' : $dim;
        try {
            // ★취소 판정은 OrderHub::cancelExclusion() SSOT 재사용(event_type + status 토큰 2축).
            //   자체 LIKE '%cancel%' 로 조립하면 Pnl/Rollup 과 취소 정의가 갈라져 코파일럿만 다른 숫자를 말하게 된다.
            [$cancelSql, $cancelTokens] = OrderHub::cancelExclusion();
            $st = $pdo->prepare("SELECT {$expr} AS dim,
                    SUM(CASE WHEN NOT {$cancelSql} THEN 1 ELSE 0 END) orders,
                    SUM(CASE WHEN {$cancelSql} THEN 1 ELSE 0 END) cancels,
                    SUM(CASE WHEN COALESCE(event_type,'order')='return' THEN 1 ELSE 0 END) returns_count,
                    ROUND(SUM(CASE WHEN NOT {$cancelSql} THEN qty ELSE 0 END)) units,
                    ROUND(SUM(CASE WHEN NOT {$cancelSql} THEN total_price ELSE 0 END)) revenue
                FROM channel_orders WHERE tenant_id=? AND ordered_at>=? GROUP BY {$expr} ORDER BY revenue DESC LIMIT 50");
            // 플레이스홀더 순서 = SQL 텍스트 등장 순서(orders, cancels, units, revenue) → 취소토큰 4벌 + tenant + since.
            $st->execute(array_merge($cancelTokens, $cancelTokens, $cancelTokens, $cancelTokens, [$tenant, $since]));
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $tot = ['orders' => 0, 'units' => 0, 'revenue' => 0.0, 'cancels' => 0, 'returns_count' => 0];
            foreach ($rows as $r) {
                $tot['orders'] += (int)$r['orders']; $tot['units'] += (int)$r['units']; $tot['revenue'] += (float)$r['revenue'];
                $tot['cancels'] += (int)$r['cancels']; $tot['returns_count'] += (int)$r['returns_count'];
            }
            $tot['aov'] = $tot['orders'] > 0 ? round($tot['revenue'] / $tot['orders']) : 0;
            $tot['return_rate_pct'] = $tot['orders'] > 0 ? round($tot['returns_count'] / $tot['orders'] * 100, 2) : 0;
            return ['dimension' => $dim, 'period_days' => $period, 'rows' => $rows, 'totals' => $tot,
                'note' => 'channel_orders 기준. orders/units/revenue 는 취소 제외(반품은 Pnl 머니경로 정합상 매출에 포함·반품비로 별도 반영). 취소 판정=OrderHub SSOT(event_type+status).'];
        } catch (\Throwable $e) { return ['error' => 'orders_query_failed: ' . substr($e->getMessage(), 0, 160), 'rows' => []]; }
    }

    /** review_query — 채널/감성/카테고리/SKU별 리뷰 집계(평점·긍부정). */
    private static function reviewQueryTool(\PDO $pdo, string $tenant, array $args): array {
        $period = max(1, min(365, (int)($args['period_days'] ?? 90)));
        $since = gmdate('Y-m-d', time() - $period * 86400);
        $dim = in_array(($args['dimension'] ?? 'channel'), ['channel', 'sentiment', 'category', 'sku'], true) ? (string)($args['dimension'] ?? 'channel') : 'channel';
        try {
            $st = $pdo->prepare("SELECT {$dim} AS dim, COUNT(*) reviews, ROUND(AVG(rating),2) avg_rating,
                    SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END) positive,
                    SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END) negative,
                    SUM(CASE WHEN sentiment='neutral' THEN 1 ELSE 0 END) neutral
                FROM product_review WHERE tenant_id=? AND COALESCE(reviewed_at,collected_at)>=?
                GROUP BY {$dim} ORDER BY reviews DESC LIMIT 50");
            $st->execute([$tenant, $since]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            $tot = ['reviews' => 0, 'positive' => 0, 'negative' => 0];
            foreach ($rows as &$r) {
                $n = (int)$r['reviews'];
                $r['negative_rate_pct'] = $n > 0 ? round(((int)$r['negative']) / $n * 100, 1) : 0;
                $tot['reviews'] += $n; $tot['positive'] += (int)$r['positive']; $tot['negative'] += (int)$r['negative'];
            }
            unset($r);
            $tot['negative_rate_pct'] = $tot['reviews'] > 0 ? round($tot['negative'] / $tot['reviews'] * 100, 1) : 0;
            return ['dimension' => $dim, 'period_days' => $period, 'rows' => $rows, 'totals' => $tot,
                'note' => 'product_review 기준. sentiment=positive|negative|neutral. 리뷰 본문·작성자는 미반환(집계 전용).'];
        } catch (\Throwable $e) { return ['error' => 'review_query_failed: ' . substr($e->getMessage(), 0, 160), 'rows' => []]; }
    }

    /**
     * [255차 심화] POST /v422/ai/agentic — 에이전틱 코파일럿(tool-use). 읽기도구(bi_query)로 실데이터 조회 +
     *   액션도구(예산/일시정지/세그먼트)는 ★제안만 생성(자동집행 금지). 제안은 agenticExecute(휴먼-인-루프 승인) 로만 집행.
     *   Salesforce Einstein Copilot 정합 — 단, 실광고비 영향 액션은 사용자 승인 없이 절대 실행하지 않는다(은행급 안전).
     */
    public static function agenticAsk(Request $req, Response $res): Response {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []); if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $q = trim((string)($body['question'] ?? $body['q'] ?? ''));
        $w = function (array $x, int $c = 200) use ($res) { $res->getBody()->write(json_encode($x, JSON_UNESCAPED_UNICODE)); return $res->withHeader('Content-Type', 'application/json')->withStatus($c); };
        if ($q === '') return $w(['ok' => false, 'error' => 'question required'], 422);
        if (self::apiKey() === '') return $w(['ok' => true, 'configured' => false, 'answer' => 'AI 코파일럿 키가 설정되지 않았습니다(관리자 AI 설정에서 등록하세요).']);
        $pdo = \Genie\Db::pdo();
        $obj = fn($p, $r = []) => ['type' => 'object', 'properties' => $p, 'required' => $r];
        $tools = [
            ['name' => 'bi_query', 'description' => '광고 성과 데이터를 채널/캠페인/일자 차원으로 집계 조회(spend/revenue/conversions/roas).',
                'input_schema' => $obj(['dimension' => ['type' => 'string', 'enum' => ['channel', 'campaign_ext_id', 'date']], 'period_days' => ['type' => 'integer']])],
            // ── [283차 P1] 읽기전용 도구 증설 — 광고 외 도메인(CRM·P&L·재고·주문·리뷰) 개통. 액션 없음=안전.
            ['name' => 'crm_query', 'description' => '고객 CRM 집계 조회 — 등급/RFM 차원별 고객수·평균LTV·총LTV·재구매율(구매 2회 이상 비중). VIP 재구매율 같은 질문에 사용. 개인정보는 반환되지 않는다(집계 전용).',
                'input_schema' => $obj(['dimension' => ['type' => 'string', 'enum' => ['grade', 'rfm_r', 'rfm_f', 'rfm_m']]])],
            ['name' => 'pnl_query', 'description' => '손익(P&L) 집계 조회 — 채널별/월별 매출·정산수령액·플랫폼수수료·광고비·쿠폰·반품비·순이익(net_profit=정산수령액-광고비). 채널별 순이익·수익성 질문에 사용.',
                'input_schema' => $obj(['dimension' => ['type' => 'string', 'enum' => ['channel', 'period']]])],
            ['name' => 'inventory_query', 'description' => '재고 조회 — mode=summary(총재고·품절), deadstock(악성재고: 재고>0 이면서 기간 내 판매 0건), top(재고 상위 SKU). 재고회전·악성재고 질문에 사용.',
                'input_schema' => $obj(['mode' => ['type' => 'string', 'enum' => ['summary', 'deadstock', 'top']], 'period_days' => ['type' => 'integer']])],
            ['name' => 'orders_query', 'description' => '주문 집계 조회 — 채널/상태/SKU/일자 차원별 주문수·수량·매출·취소·반품·객단가(AOV)·반품률.',
                'input_schema' => $obj(['dimension' => ['type' => 'string', 'enum' => ['channel', 'status', 'sku', 'date']], 'period_days' => ['type' => 'integer']])],
            ['name' => 'review_query', 'description' => '리뷰 집계 조회 — 채널/감성/카테고리/SKU 차원별 리뷰수·평균평점·긍정/부정 건수·부정비율. 상품 불만·감성 질문에 사용.',
                'input_schema' => $obj(['dimension' => ['type' => 'string', 'enum' => ['channel', 'sentiment', 'category', 'sku']], 'period_days' => ['type' => 'integer']])],
            // ── 액션 도구(제안만·자동집행 금지) ──
            ['name' => 'propose_pause_campaign', 'description' => '낭비 캠페인 일시정지를 제안한다(실행 아님·사용자 승인 필요). 전환 없이 지출 큰 캠페인 등.',
                'input_schema' => $obj(['channel' => ['type' => 'string'], 'campaign_ext_id' => ['type' => 'string'], 'reason' => ['type' => 'string']], ['channel', 'campaign_ext_id'])],
            ['name' => 'propose_budget_change', 'description' => '캠페인 일예산 변경을 제안한다(실행 아님·승인 필요). new_daily_krw=신규 일예산(원).',
                'input_schema' => $obj(['channel' => ['type' => 'string'], 'campaign_ext_id' => ['type' => 'string'], 'new_daily_krw' => ['type' => 'integer'], 'reason' => ['type' => 'string']], ['channel', 'campaign_ext_id', 'new_daily_krw'])],
            ['name' => 'propose_create_segment', 'description' => 'CRM 세그먼트 생성을 제안한다(실행 아님·승인 필요). rules=[{field,op,value}].',
                'input_schema' => $obj(['name' => ['type' => 'string'], 'rules' => ['type' => 'array']], ['name'])],
        ];
        $system = "당신은 GeniegoROI 커머스 ROI·CRM 자동화 코파일럿입니다. 데이터가 필요하면 반드시 도구로 실제 수치를 조회하세요. "
            . "도구 선택: 광고성과=bi_query, 고객/RFM/LTV/재구매=crm_query, 손익/순이익=pnl_query, 재고/악성재고=inventory_query, "
            . "주문/취소/반품/AOV=orders_query, 리뷰/감성=review_query. 한 질문에 여러 도구를 조합해도 됩니다. "
            . "예산 변경·캠페인 정지·세그먼트 생성 같은 액션은 propose_* 도구로 '제안'만 하세요(절대 직접 실행 아님). "
            . "한국어로 간결·정확하게 근거(수치) 기반 답하고, 제안한 액션은 사용자가 승인해야 실행됨을 명시하세요. "
            . "도구가 error 를 반환하면 수치를 지어내지 말고 조회 실패를 그대로 알리세요. 추측 금지.";

        // [283차 P1] 대화 메모리 — 종전엔 매 요청이 단발($messages=[현재 질문]) 이라 "그럼 그 캠페인 예산 올려줘" 같은
        //   후속 질문이 맥락을 잃었다. 프론트가 보낸 이전 턴을 수용하되, 토큰 폭주를 막기 위해 상한을 둔다.
        //   ★안전: 과거 턴은 text 로만 재구성한다(assistant 의 tool_use 블록을 그대로 신뢰해 재주입하지 않음 —
        //     tool_use/tool_result 짝이 깨지면 API 400 이 나고, 위조된 tool_result 주입 경로도 차단된다).
        $messages = [];
        $hist = $body['history'] ?? $body['messages'] ?? [];
        if (is_array($hist)) {
            $clean = [];
            foreach ($hist as $m) {
                if (!is_array($m)) continue;
                $role = ($m['role'] ?? '') === 'assistant' ? 'assistant' : (($m['role'] ?? '') === 'user' ? 'user' : '');
                $txt = trim((string)($m['content'] ?? $m['text'] ?? ''));
                if ($role === '' || $txt === '') continue;
                $clean[] = ['role' => $role, 'content' => mb_substr($txt, 0, self::HIST_MAX_CHARS)];
            }
            // 최근 N턴만 유지 + 반드시 user 로 시작(Claude API 규약: 첫 메시지는 user).
            if (count($clean) > self::HIST_MAX_TURNS) $clean = array_slice($clean, -self::HIST_MAX_TURNS);
            while ($clean && $clean[0]['role'] !== 'user') array_shift($clean);
            // 연속 동일 role 병합(API 는 role 교대를 요구) — 방어적.
            foreach ($clean as $m) {
                if ($messages && end($messages)['role'] === $m['role']) { $messages[count($messages) - 1]['content'] .= "\n" . $m['content']; }
                else { $messages[] = $m; }
            }
            if ($messages && end($messages)['role'] === 'user') $messages[] = ['role' => 'assistant', 'content' => '(이전 답변)'];
        }
        $messages[] = ['role' => 'user', 'content' => $q];
        $usedData = null; $proposals = [];
        // [283차 P1] 도구 반복 한도 4→6 — 읽기도구가 1개(bi_query)에서 6개로 늘어 다중홉 질문
        //   ("VIP 재구매율과 그 세그먼트의 채널별 순이익 비교")이 4라운드에서 조기 종료되던 것 방지.
        for ($i = 0; $i < 6; $i++) {
            try { $resp = self::callClaudeTools($system, $messages, $tools, 22, $tenant); }
            catch (\Throwable $e) { return $w(['ok' => false, 'error' => $e->getMessage()]); }
            $content = $resp['content'] ?? [];
            if ((string)($resp['stop_reason'] ?? '') === 'tool_use') {
                $messages[] = ['role' => 'assistant', 'content' => $content];
                $results = [];
                foreach ($content as $blk) {
                    if (($blk['type'] ?? '') !== 'tool_use') continue;
                    $name = (string)($blk['name'] ?? ''); $in = (array)($blk['input'] ?? []); $tid = $blk['id'];
                    // [283차 P1] 읽기전용 도구 디스패치 — 전부 집계·테넌트 스코프·LIMIT 내장(액션 없음).
                    //   usedData 는 마지막 조회 결과가 아니라 도구별로 누적해 프론트가 근거 데이터를 모두 볼 수 있게 한다.
                    $readTools = [
                        'bi_query'        => fn() => self::biQueryTool($pdo, $tenant, $in),
                        'crm_query'       => fn() => self::crmQueryTool($pdo, $tenant, $in),
                        'pnl_query'       => fn() => self::pnlQueryTool($pdo, $tenant, $in),
                        'inventory_query' => fn() => self::inventoryQueryTool($pdo, $tenant, $in),
                        'orders_query'    => fn() => self::ordersQueryTool($pdo, $tenant, $in),
                        'review_query'    => fn() => self::reviewQueryTool($pdo, $tenant, $in),
                    ];
                    if (isset($readTools[$name])) {
                        $out = ($readTools[$name])();
                        if (!is_array($usedData)) $usedData = [];
                        $usedData[$name] = $out;
                        $results[] = ['type' => 'tool_result', 'tool_use_id' => $tid, 'content' => json_encode($out, JSON_UNESCAPED_UNICODE)];
                    } elseif (str_starts_with($name, 'propose_')) {
                        $action = substr($name, 8); // pause_campaign|budget_change|create_segment
                        $proposals[] = ['action' => $action, 'params' => $in];
                        // ★집행하지 않음 — 제안만 기록. AI 에게는 "승인 대기 중" 통지.
                        $results[] = ['type' => 'tool_result', 'tool_use_id' => $tid, 'content' => json_encode(['status' => 'proposed', 'note' => '사용자 승인 후 실행됩니다(자동집행 안 함).'], JSON_UNESCAPED_UNICODE)];
                    } else {
                        $results[] = ['type' => 'tool_result', 'tool_use_id' => $tid, 'content' => json_encode(['error' => 'unknown_tool'])];
                    }
                }
                if (!$results) break;
                $messages[] = ['role' => 'user', 'content' => $results];
                continue;
            }
            $text = ''; foreach ($content as $blk) { if (($blk['type'] ?? '') === 'text') $text .= $blk['text']; }
            return $w(['ok' => true, 'answer' => $text, 'data' => $usedData, 'proposed_actions' => $proposals]);
        }
        return $w(['ok' => true, 'answer' => '분석을 완료하지 못했습니다(도구 반복 한도).', 'data' => $usedData, 'proposed_actions' => $proposals]);
    }

    /**
     * [255차 심화] POST /v422/ai/agentic/execute — 코파일럿 제안 액션의 휴먼-인-루프 집행.
     *   사용자가 명시 승인한 단일 액션만 실행. 기존 가드레일 핸들러(AdAdapters killswitch/card·CRM) 재사용 → 안전.
     *   body: {action: pause_campaign|budget_change|create_segment, params:{...}}.
     */
    public static function agenticExecute(Request $req, Response $res): Response {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = self::tenant($req);
        $w = function (array $x, int $c = 200) use ($res) { $res->getBody()->write(json_encode($x, JSON_UNESCAPED_UNICODE)); return $res->withHeader('Content-Type', 'application/json')->withStatus($c); };
        $body = (array)($req->getParsedBody() ?? []); if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $action = (string)($body['action'] ?? ''); $p = (array)($body['params'] ?? []);
        $pdo = \Genie\Db::pdo();
        try {
            if ($action === 'pause_campaign') {
                $ch = (string)($p['channel'] ?? ''); $ext = (string)($p['campaign_ext_id'] ?? '');
                if ($ch === '' || $ext === '') return $w(['ok' => false, 'error' => 'channel·campaign_ext_id 필요'], 422);
                $r = AdAdapters::pause($pdo, $tenant, $ch, $ext); // killswitch/자격 게이트 내장
                return $w(['ok' => !empty($r['ok']), 'action' => $action, 'result' => $r]);
            }
            if ($action === 'budget_change') {
                $ch = (string)($p['channel'] ?? ''); $ext = (string)($p['campaign_ext_id'] ?? ''); $nd = (int)($p['new_daily_krw'] ?? 0);
                if ($ch === '' || $ext === '' || $nd <= 0) return $w(['ok' => false, 'error' => 'channel·campaign_ext_id·new_daily_krw 필요'], 422);
                $r = AdAdapters::updateBudget($pdo, $tenant, $ch, $ext, $nd); // 통화환산·killswitch 내장
                return $w(['ok' => !empty($r['ok']), 'action' => $action, 'result' => $r]);
            }
            if ($action === 'create_segment') {
                $name = trim((string)($p['name'] ?? '')); $rules = is_array($p['rules'] ?? null) ? $p['rules'] : [];
                if ($name === '') return $w(['ok' => false, 'error' => 'name 필요'], 422);
                CRM::ensureTables();
                $now = gmdate('Y-m-d H:i:s');
                $pdo->prepare("INSERT INTO crm_segments (tenant_id,name,description,rules,color,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
                    ->execute([$tenant, mb_substr($name, 0, 100), 'AI 코파일럿 제안', json_encode($rules, JSON_UNESCAPED_UNICODE), '#8b5cf6', $now, $now]);
                $sid = (int)$pdo->lastInsertId();
                $cnt = CRM::refreshSegmentForSend($pdo, $tenant, $sid); // 룰 있으면 멤버 산출
                return $w(['ok' => true, 'action' => $action, 'segment_id' => $sid, 'member_count' => $cnt]);
            }
            return $w(['ok' => false, 'error' => 'unknown action: ' . $action], 422);
        } catch (\Throwable $e) { return $w(['ok' => false, 'error' => $e->getMessage()]); }
    }

    /* ── 응답 텍스트 → 구조화 파싱 ─────────────────────────── */
    private static function parseAnalysis(string $text): array {
        // Claude에게 JSON 형식으로 응답하도록 프롬프트하므로 JSON 파싱 시도
        // 마크다운 코드블럭 제거
        $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $text);
        $clean = trim($clean ?? $text);

        $data = json_decode($clean, true);
        if (is_array($data)) {
            return [
                'summary'        => $data['summary']        ?? $text,
                'bullets'        => is_array($data['bullets']) ? $data['bullets'] : [],
                'risks'          => is_array($data['risks'] ?? null) ? $data['risks'] : [], // [266차 계약불일치] 프론트 insight.risks 소비(프롬프트가 생성 지시하나 파서가 드롭했음)
                'recommendation' => $data['recommendation'] ?? null,
            ];
        }

        // JSON 파싱 실패 시 텍스트 그대로 summary에 저장
        return [
            'summary'        => $text,
            'bullets'        => [],
            'recommendation' => null,
        ];
    }

    /* ── 시스템 프롬프트 ─────────────────────────────────────── */
    private static function systemPrompt(string $context): string {
        $ctx = match($context) {
            'roas'    => 'ROAS(광고 투자 수익률) 및 채널별 광고 성과',
            'returns' => '반품률, SKU별 반품 데이터',
            'pnl'     => 'P&L(손익), 순이익, 광고비, 인플루언서 비용',
            default   => '마케팅 통합 성과(광고비, ROAS, 캠페인, 채널)',
        };

        return <<<PROMPT
당신은 한국 이커머스 마케팅 데이터 전문 AI 분석가입니다.
분석 컨텍스트: {$ctx}

사용자의 질문과 함께 제공된 데이터를 바탕으로 분석하고,
반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이 순수 JSON):

{
  "summary": "핵심 분석 요약 (2-3문장, 한국어)",
  "bullets": [
    "구체적 인사이트 1",
    "구체적 인사이트 2",
    "구체적 인사이트 3"
  ],
  "recommendation": "가장 우선적으로 실행할 액션 제안 (1문장)"
}

규칙:
- 수치를 구체적으로 언급하세요
- 긍정/부정 측면 모두 다루세요
- 실행 가능한 인사이트를 제공하세요
- 반드시 한국어로 응답하세요
PROMPT;
    }

    /* ── 마케팅 평가 시스템 프롬프트 ───────────────────────── */
    private static function marketingEvalPrompt(): string {
        return <<<PROMPT
당신은 글로벌 이커머스 광고 성과 전문 AI 평가 엔진입니다.
제공된 마케팅 채널과 캠페인 데이터를 분석하여 100점 만점 기준으로 평가합니다.

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 마크다운 코드블록 없이):

{
  "overall_score": 숫자(0-100),
  "grade": "S|A|B|C|D",
  "summary": "전체 마케팅 성과 핵심 요약 (2-3문장)",
  "channels": [
    {
      "name": "채널명",
      "score": 숫자(0-100),
      "grade": "S|A|B|C|D",
      "breakdown": {
        "roas_score": 숫자(0-35, ROAS 효율),
        "ctr_score": 숫자(0-25, 클릭률),
        "conversion_score": 숫자(0-25, 전환 규모),
        "cpc_score": 숫자(0-15, CPC 효율)
      },
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "ai_recommendation": "이 채널에 대한 구체적 액션 한 문장"
    }
  ],
  "campaigns": [
    {
      "name": "캠페인명",
      "channel": "채널명",
      "score": 숫자(0-100),
      "grade": "S|A|B|C|D",
      "breakdown": {
        "roas_score": 숫자(0-35),
        "burn_rate_score": 숫자(0-25),
        "ctr_score": 숫자(0-25),
        "status_score": 숫자(0-15)
      },
      "ai_insight": "캠페인 핵심 인사이트 한 문장",
      "action": "즉시 실행 권고 액션"
    }
  ],
  "budget_reallocation": [
    {
      "channel": "채널명",
      "current_pct": 숫자,
      "recommended_pct": 숫자,
      "rationale": "이유"
    }
  ],
  "anomalies": [
    {
      "metric": "지표명(매출|주문수|객단가|반품률|전환 등)",
      "severity": "high|mid|info",
      "change": 숫자(변화율% 또는 %p),
      "note": "이상 징후 설명 한 문장"
    }
  ],
  "change_analysis": {
    "period_days": 숫자,
    "revenue_change_pct": 숫자,
    "orders_change_pct": 숫자,
    "aov_change_pct": 숫자,
    "return_rate_change_pp": 숫자,
    "interpretation": "직전 동일기간 대비 변화 원인 해석(매출=주문수×객단가 분해, ROAS 변화 동인)"
  },
  "top_insight": "가장 중요한 단일 인사이트",
  "immediate_action": "즉시 실행해야 할 최우선 액션"
}

※ 입력 data 에 comparison(current/previous 기간 지표)이 있으면 반드시 anomalies 와 change_analysis 를
  채우세요(직전 동일기간 대비 급변 지표 탐지 + 원인 해석). comparison 이 없으면 두 필드는 빈 배열/생략 가능.

평가 기준:
- ROAS 5.0x 이상: 최상급, 4.0x: 우수, 3.0x: 보통, 2.0x 미만: 개선 필요
- CTR 3.0% 이상: 우수, 2.0%: 보통, 1.0% 미만: 소재 개선 필요
- CPC ₩1,000 미만: 우수, ₩2,000: 보통, ₩3,000 초과: 개선 필요
- 예산 소진율 70-90%: 최적, 과소(50% 미만): 노출 부족, 과다(95% 초과): 조기소진 위험
- 반드시 한국어로 응답하세요
PROMPT;
    }

    /* ── 인플루언서 평가 시스템 프롬프트 ───────────────────── */
    private static function influencerEvalPrompt(): string {
        return <<<PROMPT
당신은 인플루언서 마케팅 ROI 전문 AI 평가 엔진입니다.
제공된 크리에이터 데이터를 분석하여 100점 만점 기준 종합 평가와 적정 수수료를 추천합니다.

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 마크다운 코드블록 없이):

{
  "overall_summary": "인플루언서 포트폴리오 전체 요약 (2-3문장)",
  "creators": [
    {
      "id": "크리에이터ID",
      "name": "크리에이터명",
      "score": 숫자(0-100),
      "grade": "S|A|B|C|D",
      "breakdown": {
        "roi_score": 숫자(0-30, 투자수익률),
        "conversion_score": 숫자(0-25, 전환 효율),
        "engagement_score": 숫자(0-20, 참여율),
        "content_quality_score": 숫자(0-15, 콘텐츠 품질),
        "reliability_score": 숫자(0-10, 신뢰도/계약 준수)
      },
      "roi": 숫자(배수),
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "ai_insight": "이 크리에이터에 대한 핵심 인사이트",
      "fee_recommendation": {
        "current_fee": 숫자(현재 지급 총액),
        "recommended_flat_fee": 숫자(권장 고정 단가),
        "recommended_perf_rate": 숫자(권장 성과 요율, 0.00~0.10),
        "recommended_total_est": 숫자(권장 예상 총액),
        "contract_type": "flat|perf|flat+perf",
        "fee_rationale": "수수료 추천 근거 (한 문장)",
        "negotiation_tip": "협상 팁"
      },
      "renewal_recommendation": "계약 갱신 권고: 강력 갱신|갱신 권장|조건부 갱신|재검토 필요|종료 권고"
    }
  ],
  "portfolio_insights": ["포트폴리오 인사이트1", "인사이트2", "인사이트3"],
  "budget_optimization": "전체 인플루언서 예산 최적화 제안",
  "top_performer": "최고 성과 크리에이터명",
  "immediate_action": "즉시 실행 최우선 액션"
}

평가 기준:
- ★각 크리에이터의 objective(캠페인 목표)에 따라 '성공'의 정의와 점수 가중치를 다르게 적용하세요. 기업마다 목표가 다르므로 같은 수치도 목표에 따라 성공/실패 판정이 달라집니다:
  · awareness(인지도): 도달·노출·참여·콘텐츠 품질을 성공으로 봅니다. ROI가 낮아도 도달/인지가 크면 우수입니다.
  · engagement(참여): 좋아요·댓글·공유·저장 등 참여율을 핵심 성공 지표로 봅니다.
  · traffic(유입): 클릭·방문·조회 트래픽 창출을 성공으로 봅니다.
  · conversion(전환·매출): 실제 주문·매출·ROI를 성공으로 봅니다(아래 ROI 등급 적용).
  입력 데이터의 objective_weights(roi/conversion/engagement/quality/reliability 가중치, 합 100)를 breakdown 점수 배분의 기준으로 삼으세요.
- conversion 목표일 때만 ROI 등급 적용: 100x 이상 S, 50x A, 20x B, 10x C, 10x 미만 D. conversion이 아닌 목표(awareness/engagement/traffic)는 ROI가 낮다는 이유만으로 등급을 낮추지 마세요.
- 전환율(주문/조회) 0.1% 이상 우수 / 참여율 7% 이상 우수, 5% 보통, 3% 미만 개선 필요.
- ★attribution_method가 'manual'인 크리에이터(전용 쿠폰/링크 없는 단순 협찬·홍보)는 매출/전환이 실측이 아닌 추정치입니다. ROI를 과신하지 말고 측정 가능한 지표(인지도·참여) 위주로 평가하고, weaknesses에 '전용 쿠폰/링크 미발급으로 주문 직접 귀속 불가 — 측정 정밀화 필요'를 명시하세요.
- activation_type(paid_amplification=원본영상 광고 / affiliate=어필리에잇 / sponsored=협찬 / organic=단순홍보)별 특성을 반영하세요. paid_amplification은 ad_spend(미디어 집행비)를 비용에 포함해 ROI를 계산합니다.
- 수수료 추천: 목표·ROI·tier 기반으로 공정한 성과 연동 구조를 권장하세요.
- 반드시 한국어로 응답하세요
PROMPT;
    }

    /* ── 규칙 기반 마케팅 평가 폴백 ──────────────────────────────
       Claude API 키 미설정·호출 실패 시 500 대신 결정론적 분석 산출.
       marketingEvalPrompt 과 동일 루브릭(ROAS35/CTR25/전환25/CPC15)을 코드로 재현.
       ★실 AI 아님 → engine='rule-based' 로 정직 표기. 운영은 키 설정 시 실 AI 우선. */
    private static function marketingEvalFallback(array $data): array {
        $channels  = is_array($data['channels'] ?? null)  ? $data['channels']  : [];
        $campaigns = is_array($data['campaigns'] ?? null) ? $data['campaigns'] : [];

        $gradeOf = function (float $s): string {
            if ($s >= 85) return 'S'; if ($s >= 70) return 'A';
            if ($s >= 55) return 'B'; if ($s >= 40) return 'C'; return 'D';
        };
        // 단일 지표 → 구간 점수
        $band = function (float $v, array $tiers, float $floor): float {
            foreach ($tiers as [$th, $pt]) { if ($v >= $th) return (float)$pt; }
            return $floor;
        };

        $chOut = [];
        $totSpend = 0.0; $totRev = 0.0; $totConv = 0.0; $weightedScore = 0.0;
        foreach ($channels as $c) {
            $name  = (string)($c['channel'] ?? $c['name'] ?? '채널');
            $spend = (float)($c['ad_spend'] ?? $c['spend'] ?? 0);
            $rev   = (float)($c['revenue'] ?? 0);
            $roas  = (float)($c['roas'] ?? ($spend > 0 ? $rev / $spend : 0));
            $ctr   = (float)($c['ctr'] ?? 0);
            $cpc   = (float)($c['cpc'] ?? 0);
            $cvr   = (float)($c['conv_rate'] ?? 0);
            $conv  = (float)($c['conversions'] ?? 0);

            $roasS = $band($roas, [[5,35],[4,30],[3,23],[2,15],[1,8]], 3);
            $ctrS  = $band($ctr,  [[3,25],[2,18],[1,10]], 4);
            $convS = $band($cvr,  [[5,25],[3,18],[1.5,12],[0.5,7]], 3);
            $cpcS  = $cpc <= 0 ? 8 : $band(-$cpc, [[-1000,15],[-2000,10],[-3000,5]], 2);
            $score = round($roasS + $ctrS + $convS + $cpcS);

            $strengths = []; $weak = [];
            if ($roas >= 4) $strengths[] = "ROAS {$roas}x — 광고비 효율 우수"; elseif ($roas < 2 && $spend > 0) $weak[] = "ROAS {$roas}x — 수익 효율 저조";
            if ($ctr >= 2)  $strengths[] = "CTR {$ctr}% — 소재 반응 양호"; elseif ($ctr > 0 && $ctr < 1) $weak[] = "CTR {$ctr}% — 소재/타겟 개선 필요";
            if ($cpc > 0 && $cpc <= 1000) $strengths[] = "CPC ₩" . number_format($cpc) . " — 클릭 단가 저렴"; elseif ($cpc > 3000) $weak[] = "CPC ₩" . number_format($cpc) . " — 클릭 단가 과다";
            if ($cvr >= 3)  $strengths[] = "전환율 {$cvr}% — 랜딩/오퍼 효과적"; elseif ($cvr > 0 && $cvr < 1) $weak[] = "전환율 {$cvr}% — 전환 동선 점검 필요";
            if (!$strengths) $strengths[] = "데이터 수집 중 — 추세 관찰 권장";
            if (!$weak)      $weak[]      = "큰 약점 없음 — 현 전략 유지";

            $rec = $roas < 2 && $spend > 0
                ? "{$name}: ROAS가 낮아 예산 축소 또는 타겟·소재 교체 검토"
                : ($roas >= 4 ? "{$name}: 고효율 채널 — 예산 증액 여력 검토" : "{$name}: 전환 동선·소재 A/B로 점진 개선");

            $chOut[] = [
                'name' => $name, 'score' => (int)$score, 'grade' => $gradeOf($score),
                'breakdown' => ['roas_score'=>(int)$roasS,'ctr_score'=>(int)$ctrS,'conversion_score'=>(int)$convS,'cpc_score'=>(int)$cpcS],
                'strengths' => array_slice($strengths, 0, 2),
                'weaknesses'=> array_slice($weak, 0, 2),
                'ai_recommendation' => $rec,
                '_spend' => $spend, '_roas' => $roas,
            ];
            $totSpend += $spend; $totRev += $rev; $totConv += $conv;
            $weightedScore += $score * max($spend, 1);
        }

        $spendBase = array_sum(array_map(fn($c) => max($c['_spend'], 1), $chOut)) ?: 1;
        $overall = $chOut ? (int)round($weightedScore / $spendBase) : 0;
        $blendRoas = $totSpend > 0 ? round($totRev / $totSpend, 2) : 0;

        // 예산 재배분: 평균 ROAS 대비 채널별 가감
        $reallocation = [];
        if ($chOut && $totSpend > 0) {
            $avgRoas = $blendRoas ?: 1;
            foreach ($chOut as $c) {
                $cur = round($c['_spend'] / $totSpend * 100);
                $delta = $c['_roas'] >= $avgRoas * 1.15 ? 5 : ($c['_roas'] <= $avgRoas * 0.85 ? -5 : 0);
                $rec = max(0, min(100, $cur + $delta));
                if ($delta !== 0) $reallocation[] = [
                    'channel' => $c['name'], 'current_pct' => $cur, 'recommended_pct' => $rec,
                    'rationale' => $delta > 0 ? "ROAS {$c['_roas']}x (평균 {$avgRoas}x 상회) — 비중 확대" : "ROAS {$c['_roas']}x (평균 {$avgRoas}x 하회) — 비중 축소",
                ];
            }
        }

        // 캠페인 점수(있을 때만)
        $campOut = [];
        foreach (array_slice($campaigns, 0, 20) as $cp) {
            $cs = (float)($cp['spent'] ?? $cp['spend'] ?? 0);
            $cr = (float)($cp['revenue'] ?? 0);
            $cro = (float)($cp['actual_roas'] ?? ($cs > 0 ? $cr / $cs : 0));
            $sc = round($band($cro, [[5,100],[4,85],[3,70],[2,55],[1,40]], 25));
            $campOut[] = [
                'name' => (string)($cp['name'] ?? '캠페인'), 'channel' => (string)($cp['channel'] ?? ''),
                'score' => (int)$sc, 'grade' => $gradeOf($sc),
                'ai_insight' => "ROAS " . round($cro, 2) . "x · 광고비 ₩" . number_format($cs),
                'action' => $cro < 2 && $cs > 0 ? "저효율 — 예산 축소/중단 검토" : ($cro >= 4 ? "고효율 — 예산 증액 검토" : "유지하며 소재 최적화"),
            ];
        }

        // 베스트/워스트
        $best = null; $worst = null;
        foreach ($chOut as $c) {
            if ($best === null || $c['score'] > $best['score']) $best = $c;
            if ($worst === null || $c['score'] < $worst['score']) $worst = $c;
        }
        $summary = $chOut
            ? count($chOut) . "개 채널 통합 ROAS {$blendRoas}x, 총 광고비 ₩" . number_format($totSpend) . " · 총 광고매출 ₩" . number_format($totRev) . ". 종합 " . $overall . "점(" . $gradeOf($overall) . "등급)."
            : "분석할 채널 데이터가 없습니다. 광고 채널을 연동해 주세요.";
        $topInsight = ($best && $worst && $best['name'] !== $worst['name'])
            ? "최고 효율 '{$best['name']}'({$best['score']}점) vs 최저 '{$worst['name']}'({$worst['score']}점) — 예산을 효율 채널로 이동 시 전체 ROAS 개선 여지."
            : ($best ? "'{$best['name']}' 채널이 현재 성과를 주도하고 있습니다." : "데이터 수집 후 인사이트가 제공됩니다.");
        $immediate = $worst && $worst['_roas'] < 2 && $worst['_spend'] > 0
            ? "'{$worst['name']}' 채널 ROAS {$worst['_roas']}x — 소재 교체 또는 예산 축소를 우선 검토하세요."
            : ($reallocation ? "예산 재배분 추천에 따라 효율 채널 비중을 단계적으로 높이세요." : "현 전략을 유지하며 주간 추세를 모니터링하세요.");

        // [항목5] 기간 대비 변화 & 이상 징후(주문 단일소스 — 날짜 보유 지표만 정직 비교).
        $anomalies = []; $changeAnalysis = null;
        $cmp = $data['comparison'] ?? null;
        if (is_array($cmp) && isset($cmp['current']) && isset($cmp['previous'])) {
            $cur = $cmp['current']; $prev = $cmp['previous'];
            $pct = function ($c, $p) { return $p > 0 ? round(($c - $p) / $p * 100, 1) : ($c > 0 ? 100.0 : 0.0); };
            $revD = $pct((float)($cur['revenue'] ?? 0),    (float)($prev['revenue'] ?? 0));
            $ordD = $pct((float)($cur['orders'] ?? 0),     (float)($prev['orders'] ?? 0));
            $aovD = $pct((float)($cur['aov'] ?? 0),        (float)($prev['aov'] ?? 0));
            $retD = round((float)($cur['returnRate'] ?? 0) - (float)($prev['returnRate'] ?? 0), 1); // %p 차
            $cnvD = $pct((float)($cur['conversions'] ?? $cur['orders'] ?? 0), (float)($prev['conversions'] ?? $prev['orders'] ?? 0));

            $mk = function ($metric, $sev, $change, $note) { return ['metric'=>$metric,'severity'=>$sev,'change'=>$change,'note'=>$note]; };
            if ($revD <= -15)      $anomalies[] = $mk('매출', 'high', $revD, "매출이 직전 기간 대비 {$revD}% 급감 — 즉시 원인 점검 필요");
            elseif ($revD >= 30)   $anomalies[] = $mk('매출', 'info', $revD, "매출이 {$revD}% 급증 — 호조 요인 파악 후 확대");
            if ($ordD <= -20)      $anomalies[] = $mk('주문수', 'high', $ordD, "주문수 {$ordD}% 감소 — 유입/전환 동선 점검");
            if ($aovD <= -10)      $anomalies[] = $mk('객단가', 'mid', $aovD, "객단가 {$aovD}% 하락 — 할인 과다·상품믹스 변화 점검");
            elseif ($aovD >= 15)   $anomalies[] = $mk('객단가', 'info', $aovD, "객단가 {$aovD}% 상승 — 업셀/번들 효과 가능");
            if ($retD >= 2)        $anomalies[] = $mk('반품률', 'high', $retD, "반품률 +{$retD}%p 상승 — 품질/배송/오배송 점검");
            if ($cnvD <= -20)      $anomalies[] = $mk('전환', 'mid', $cnvD, "전환 {$cnvD}% 감소 — 랜딩/오퍼 점검");

            // 매출 변화 분해: 매출 = 주문수 × 객단가 → 주도 요인 식별
            $driver = abs($ordD) >= abs($aovD)
                ? "주문수 변화({$ordD}%)가 주도(객단가 {$aovD}%)"
                : "객단가 변화({$aovD}%)가 주도(주문수 {$ordD}%)";
            $dir = $revD > 0 ? '증가' : ($revD < 0 ? '감소' : '보합');
            $changeAnalysis = [
                'period_days'          => (int)($cmp['days'] ?? 0),
                'revenue_change_pct'   => $revD,
                'orders_change_pct'    => $ordD,
                'aov_change_pct'       => $aovD,
                'conversions_change_pct'=> $cnvD,
                'return_rate_change_pp'=> $retD,
                'interpretation'       => "직전 동일기간 대비 매출 {$revD}% {$dir} — {$driver}. (매출=주문수×객단가 분해)"
                                          . ($retD >= 1 ? " 반품률 +{$retD}%p 동반 상승." : ""),
                'note'                 => "주문 단일소스(날짜 보유) 기준 정확 비교. 광고 채널별 CTR/CPC/CVR 일별 변화는 매체 연동·시계열 적재 후 제공.",
            ];
        }

        return [
            'overall_score' => $overall, 'grade' => $gradeOf($overall),
            'summary' => $summary,
            'channels' => array_map(fn($c) => array_diff_key($c, ['_spend'=>1,'_roas'=>1]), $chOut),
            'campaigns' => $campOut,
            'budget_reallocation' => $reallocation,
            'anomalies' => $anomalies,
            'change_analysis' => $changeAnalysis,
            'top_insight' => $topInsight,
            'immediate_action' => $immediate,
            'engine' => 'rule-based',
        ];
    }

    /* ── POST /v422/ai/marketing-eval ───────────────────────── */
    public static function marketingEval(Request $req, Response $res, array $args = []): Response {
        $pdo  = Db::pdo();
        self::migrate($pdo);

        $body    = (string)$req->getBody();
        $payload = json_decode($body, true) ?: [];
        $data    = $payload['data'] ?? [];

        if (empty($data)) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'data is required'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $dataStr  = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $userMsg  = "다음 마케팅 채널 및 캠페인 데이터를 분석하여 종합 평가 점수와 인사이트를 제공해주세요:\n\n" . $dataStr;
        $question = "마케팅 채널 효과 종합 평가";
        $now      = gmdate('c');

        try {
            $result = self::callClaude(self::marketingEvalPrompt() . self::langDirective(self::reqLang($req)), $userMsg, 8, self::tenant($req));
            $parsed = self::parseAnalysis($result['text']);
            $tokens = $result['tokens_input'] + $result['tokens_output'];

            // raw 분석 결과도 DB에 저장
            $evalData = json_decode($result['text'], true);
            if (!$evalData) {
                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $result['text']);
                $evalData = json_decode(trim($clean), true) ?: ['summary' => $result['text']];
            }
            $evalData['engine'] = 'genie-ai';
            $usedModel = self::MODEL;

        } catch (\Throwable $e) {
            // ★Claude 키 미설정·API 실패 → 500 대신 규칙 기반 결정론적 분석 폴백(항상 결과 제공).
            $evalData  = self::marketingEvalFallback($data);
            $tokens    = 0;
            $usedModel = 'rule-based';
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (tenant_id, context, question, data_snapshot, summary, bullets, recommendation, model, tokens_used, status, created_at)
                VALUES (:tenant, :ctx, :q, :snap, :sum, :bul, :rec, :model, :tok, 'ok', :now)");
            $stmt->execute([
                ':tenant'=> self::tenant($req),
                ':ctx'   => 'marketing_eval',
                ':q'     => $question,
                ':snap'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                ':sum'   => $evalData['overall_summary'] ?? ($evalData['summary'] ?? ''),
                ':bul'   => json_encode($evalData['portfolio_insights'] ?? [], JSON_UNESCAPED_UNICODE),
                ':rec'   => $evalData['immediate_action'] ?? ($evalData['recommendation'] ?? ''),
                ':model' => $usedModel,
                ':tok'   => $tokens,
                ':now'   => $now,
            ]);
            $analysisId = (int)$pdo->lastInsertId();
        } catch (\Throwable $e2) {
            $analysisId = 0;   // 저장 실패해도 분석 결과는 반환(체험 비차단).
        }

        return TemplateResponder::json($res, [
            'ok'          => true,
            'analysis_id' => $analysisId,
            'result'      => $evalData,
            'model'       => $usedModel,
            'tokens_used' => $tokens,
            'created_at'  => $now,
        ]);
    }

    /* ── POST /v422/ai/influencer-eval ──────────────────────── */
    public static function influencerEval(Request $req, Response $res, array $args = []): Response {
        $pdo  = Db::pdo();
        self::migrate($pdo);

        $body    = (string)$req->getBody();
        $payload = json_decode($body, true) ?: [];
        $data    = $payload['data'] ?? [];

        if (empty($data)) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'data is required'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $dataStr  = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $userMsg  = "다음 인플루언서(크리에이터) 데이터를 분석하여 종합 평가 점수, 수수료 추천, 계약 갱신 의견을 제공해주세요:\n\n" . $dataStr;
        $question = "인플루언서 효과 종합 평가 및 수수료 추천";
        $now      = gmdate('c');

        try {
            $result = self::callClaude(self::influencerEvalPrompt() . self::langDirective(self::reqLang($req)), $userMsg, 8, self::tenant($req));
            $tokens = $result['tokens_input'] + $result['tokens_output'];

            $evalData = json_decode($result['text'], true);
            if (!$evalData) {
                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $result['text']);
                $evalData = json_decode(trim($clean), true) ?: ['summary' => $result['text']];
            }

            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (tenant_id, context, question, data_snapshot, summary, bullets, recommendation, model, tokens_used, status, created_at)
                VALUES (:tenant, :ctx, :q, :snap, :sum, :bul, :rec, :model, :tok, 'ok', :now)");
            $stmt->execute([
                ':tenant'=> self::tenant($req),
                ':ctx'   => 'influencer_eval',
                ':q'     => $question,
                ':snap'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                ':sum'   => $evalData['overall_summary'] ?? '',
                ':bul'   => json_encode($evalData['portfolio_insights'] ?? [], JSON_UNESCAPED_UNICODE),
                ':rec'   => $evalData['immediate_action'] ?? '',
                ':model' => self::MODEL,
                ':tok'   => $tokens,
                ':now'   => $now,
            ]);

            return TemplateResponder::json($res, [
                'ok'          => true,
                'analysis_id' => (int)$pdo->lastInsertId(),
                'result'      => $evalData,
                'model'       => self::MODEL,
                'tokens_used' => $tokens,
                'created_at'  => $now,
            ]);

        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /* ── POST /v422/ai/analyze ───────────────────────────────── */
    /**
     * [237차] 자연어 AI 에이전트(Geniego AI Agency) 실데이터 그라운딩 — 서버측 종합 메트릭 스냅샷.
     *   기존 analyze() 는 프론트가 넘긴 고정 데이터(pnlStats 등)만 봐서 채널/캠페인 단위 질문에 약했다.
     *   서버가 실 performance_metrics/channel_orders/orderhub_settlements 를 집계해 항상 신선한 종합 컨텍스트를
     *   제공(Moby급 질의응답). ★기존 테이블 집계 재사용(중복 핸들러 신설 없음)·테넌트 격리·데모 제외.
     *   토큰 보호: 원시행이 아닌 압축 집계만(채널별·상위캠페인·30/90일 요약).
     */
    private static function buildAgentContext(\PDO $pdo, string $tenant): array
    {
        if ($tenant === '' || $tenant === 'unknown' || str_starts_with($tenant, 'demo')) return [];
        $ctx = [];
        $d30 = gmdate('Y-m-d', time() - 30 * 86400);
        $d90 = gmdate('Y-m-d', time() - 90 * 86400);
        // 광고 성과 — 채널별(최근 30일). performance_metrics 는 spend/revenue KRW 정규화 적재.
        try {
            $st = $pdo->prepare("SELECT channel, SUM(spend) sp, SUM(revenue) rv, SUM(impressions) imp, SUM(clicks) clk, SUM(conversions) cv
                                   FROM performance_metrics WHERE tenant_id=? AND date>=? AND channel IS NOT NULL AND channel<>''
                                  GROUP BY channel ORDER BY rv DESC");
            $st->execute([$tenant, $d30]);
            $byCh = []; $tSp = 0.0; $tRv = 0.0; $tCv = 0;
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $sp = (float)$r['sp']; $rv = (float)$r['rv']; $imp = (int)$r['imp']; $clk = (int)$r['clk']; $cv = (int)$r['cv'];
                $tSp += $sp; $tRv += $rv; $tCv += $cv;
                $byCh[] = ['channel' => (string)$r['channel'], 'spend' => round($sp), 'revenue' => round($rv),
                    'roas' => $sp > 0 ? round($rv / $sp, 2) : 0, 'conversions' => $cv,
                    'ctr_pct' => $imp > 0 ? round($clk / $imp * 100, 2) : 0, 'cpa' => $cv > 0 ? round($sp / $cv) : 0];
            }
            if ($byCh) $ctx['ad_performance_30d'] = ['total_spend' => round($tSp), 'total_revenue' => round($tRv),
                'overall_roas' => $tSp > 0 ? round($tRv / $tSp, 2) : 0, 'total_conversions' => $tCv, 'by_channel' => $byCh];
        } catch (\Throwable $e) {}
        // 상위 캠페인(최근 30일, 매출순 5)
        try {
            $st = $pdo->prepare("SELECT campaign_ext_id, SUM(spend) sp, SUM(revenue) rv, SUM(conversions) cv
                                   FROM performance_metrics WHERE tenant_id=? AND date>=? AND campaign_ext_id IS NOT NULL AND campaign_ext_id<>''
                                  GROUP BY campaign_ext_id ORDER BY rv DESC LIMIT 5");
            $st->execute([$tenant, $d30]);
            $tc = [];
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
                $sp = (float)$r['sp']; $tc[] = ['campaign' => (string)$r['campaign_ext_id'], 'spend' => round($sp),
                    'revenue' => round((float)$r['rv']), 'roas' => $sp > 0 ? round((float)$r['rv'] / $sp, 2) : 0, 'conversions' => (int)$r['cv']];
            }
            if ($tc) $ctx['top_campaigns_30d'] = $tc;
        } catch (\Throwable $e) {}
        // 주문/매출(channel_orders, KRW 정규화·취소 제외) — 채널별 30일
        // [현 차수] 인라인 6토큰(취소요청/취소접수/Cancel요청 누락 + event_type 축 부재) → OrderHub SSOT 재사용.
        try {
            [$cancelExpr, $cancelTokens] = OrderHub::cancelExclusion();
            $st = $pdo->prepare("SELECT channel, COUNT(*) cnt, COALESCE(SUM(total_price),0) gmv
                                   FROM channel_orders WHERE tenant_id=? AND ordered_at >= ?
                                     AND NOT $cancelExpr
                                  GROUP BY channel ORDER BY gmv DESC LIMIT 12");
            $st->execute(array_merge([$tenant, $d30 . ' 00:00:00'], $cancelTokens));
            $oc = []; $tCnt = 0; $tGmv = 0.0;
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) { $tCnt += (int)$r['cnt']; $tGmv += (float)$r['gmv'];
                $oc[] = ['channel' => (string)$r['channel'], 'orders' => (int)$r['cnt'], 'gmv_krw' => round((float)$r['gmv'])]; }
            if ($oc) $ctx['commerce_orders_30d'] = ['total_orders' => $tCnt, 'total_gmv_krw' => round($tGmv), 'by_channel' => $oc];
        } catch (\Throwable $e) {}
        // 90일 주간 매출 추이(광고 매출 기준, 간단)
        try {
            $st = $pdo->prepare("SELECT date, SUM(spend) sp, SUM(revenue) rv FROM performance_metrics WHERE tenant_id=? AND date>=? GROUP BY date ORDER BY date");
            $st->execute([$tenant, $d90]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
            if (count($rows) >= 7) $ctx['trend_note'] = '90일 일자별 spend/revenue ' . count($rows) . '일치 보유(추세 분석 가능)';
        } catch (\Throwable $e) {}
        return $ctx;
    }

    public static function analyze(Request $req, Response $res, array $args = []): Response {
        $pdo  = Db::pdo();
        self::migrate($pdo);

        $body    = (string)$req->getBody();
        $payload = json_decode($body, true) ?: [];

        $context  = trim($payload['context']  ?? 'marketing');
        $question = trim($payload['question'] ?? '');
        $data     = $payload['data'] ?? [];

        if ($question === '') {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'question is required'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        // [237차] 서버측 실데이터 종합 스냅샷을 우선 주입(프론트 고정 데이터보다 권위 — Moby급 그라운딩).
        $tenantId = self::tenant($req);
        $liveCtx = self::buildAgentContext($pdo, $tenantId);
        if (!empty($liveCtx)) {
            $data = array_merge(['live_metrics' => $liveCtx], is_array($data) ? $data : []);
        }

        // 데이터를 사람이 읽기 좋은 형태로 변환
        $dataStr = '';
        if (!empty($data)) {
            $dataStr = "\n\n[분석 데이터]\n" . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        }

        $userMsg = "질문: {$question}{$dataStr}";

        $now = gmdate('c');
        $analysisId = null;
        @set_time_limit(45); // [237차] 자연어 에이전트 신뢰성 — 복잡한 분석 질문이 8초 타임아웃 초과로 500 나던 것 완화.

        try {
            // [237차] 타임아웃 8→24초 상향(실데이터 종합 컨텍스트 분석은 더 긴 추론 필요 — 복잡질문 500 방지).
            $result  = self::callClaude(self::systemPrompt($context) . self::langDirective(self::reqLang($req)), $userMsg, 24, self::tenant($req));
            $parsed  = self::parseAnalysis($result['text']);
            $tokens  = $result['tokens_input'] + $result['tokens_output'];

            // DB 저장
            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (tenant_id, context, question, data_snapshot, summary, bullets, recommendation, model, tokens_used, status, created_at)
                VALUES (:tenant, :context, :question, :data_snap, :summary, :bullets, :rec, :model, :tokens, 'ok', :now)");
            $stmt->execute([
                ':tenant'   => self::tenant($req),
                ':context'  => $context,
                ':question' => $question,
                ':data_snap'=> json_encode($data, JSON_UNESCAPED_UNICODE),
                ':summary'  => $parsed['summary'],
                ':bullets'  => json_encode($parsed['bullets'], JSON_UNESCAPED_UNICODE),
                ':rec'      => $parsed['recommendation'],
                ':model'    => self::MODEL,
                ':tokens'   => $tokens,
                ':now'      => $now,
            ]);
            $analysisId = (int)$pdo->lastInsertId();

            return TemplateResponder::json($res, [
                'ok'             => true,
                'analysis_id'    => $analysisId,
                'context'        => $context,
                'summary'        => $parsed['summary'],
                'bullets'        => $parsed['bullets'],
                'recommendation' => $parsed['recommendation'],
                'model'          => self::MODEL,
                'tokens_used'    => $tokens,
                'created_at'     => $now,
            ]);

        } catch (\Throwable $e) {
            // 실패도 DB에 기록
            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (tenant_id, context, question, data_snapshot, status, error_msg, model, tokens_used, created_at)
                VALUES (:tenant, :context, :question, :data_snap, 'error', :err, :model, 0, :now)");
            $stmt->execute([
                ':tenant'   => self::tenant($req),
                ':context'  => $context,
                ':question' => $question,
                ':data_snap'=> json_encode($data, JSON_UNESCAPED_UNICODE),
                ':err'      => $e->getMessage(),
                ':model'    => self::MODEL,
                ':now'      => $now,
            ]);

            $res->getBody()->write(json_encode([
                'ok'    => false,
                'error' => $e->getMessage(),
            ], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /* ── GET /v422/ai/analyses ───────────────────────────────── */
    public static function analyses(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        self::migrate($pdo);

        $q       = $req->getQueryParams();
        $limit   = max(1, min(50, (int)($q['limit'] ?? 20)));
        $context = trim($q['context'] ?? '');

        // 191차 보안(P1): 테넌트 스코핑 강제(크로스테넌트 AI분석/제출데이터 누출 차단).
        $tenant = self::tenant($req);
        // 192차 보안 P1: 테넌트 미식별('unknown') 시 공유 버킷 노출 차단 — 빈 결과 반환.
        //   여러 미인증 사용자가 'unknown' 버킷을 상호 열람하던 누출 가능성 제거.
        if ($tenant === 'unknown') {
            return TemplateResponder::json($res, ['ok' => true, 'total' => 0, 'analyses' => []]);
        }
        $where  = "WHERE tenant_id = :tenant" . ($context ? " AND context = :ctx" : "");
        $params = [':tenant' => $tenant];
        if ($context) $params[':ctx'] = $context;

        $stmt = $pdo->prepare("SELECT id, context, question, summary, bullets, recommendation,
            model, tokens_used, status, error_msg, created_at
            FROM ai_analyses {$where}
            ORDER BY id DESC LIMIT :lim");
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        // bullets JSON 디코딩
        foreach ($rows as &$row) {
            $row['bullets'] = json_decode($row['bullets'] ?? '[]', true) ?: [];
        }
        unset($row);

        return TemplateResponder::json($res, [
            'ok'       => true,
            'total'    => count($rows),
            'analyses' => $rows,
        ]);
    }

    /* ── 마케팅 인텔리전스: 유입/전환/기여도 분석 + AI 추천 ───────── */
    public function marketingIntelligence(Request $req, Response $res): Response {
        $body = (array)($req->getParsedBody() ?? []);
        $data = $body['data'] ?? null;
        if (!$data) {
            return TemplateResponder::json($res, ['ok'=>false,'error'=>'data required'], 400);
        }
        // [227차 감사 P2] AI 키 선검사 — 기존엔 미설정/마스킹 키로 직접 호출해 타임아웃·502 낭비(callClaude 정합).
        if (!self::aiKeyConfigured()) {
            return TemplateResponder::json($res, ['ok'=>false,'error'=>'AI 키 미설정 — 관리자 설정 필요','configured'=>false], 200);
        }

        $channels    = json_encode($data['channels']     ?? [], JSON_UNESCAPED_UNICODE);
        $influencers = json_encode($data['influencers']  ?? [], JSON_UNESCAPED_UNICODE);
        $contrib     = json_encode($data['contribution'] ?? [], JSON_UNESCAPED_UNICODE);

        $prompt = "당신은 전문 디지털 마케팅 전략가입니다.\n채널 성과: $channels\n인플루언서: $influencers\n기여도 분석: $contrib\n\n위 데이터를 기반으로 마케팅 전략 추천 5건을 아래 JSON 형식으로만 반환하세요:\n{\"recommendations\":[{\"id\":1,\"title\":\"제목\",\"category\":\"분류\",\"confidence\":85,\"expectedROAS\":\"4.2x\",\"effort\":\"낮음\",\"reason\":\"근거\",\"actions\":[\"액션1\",\"액션2\"],\"color\":\"#4f8ef7\"}],\"summary\":\"요약\",\"top_priority\":\"최우선항목\"}";

        $payload = [
            'model'      => self::MODEL,
            'max_tokens' => self::MAX_TOKENS,
            'messages'   => [['role'=>'user','content'=>$prompt]],
        ];

        // [289차 후속 / MEA 053 D-2] ★이 경로는 종전에 quotaGate 없이 전역 키로 직접 cURL 했다.
        //   미배선(routes.php 미등록·non-static)이라 도달 불가였으나 **잠재 quota 우회**였으므로
        //   gateway() 로 흡수한다 — 이후 배선되더라도 quota·감사가 자동 적용된다.
        $g = self::gateway($payload, ['tenant'=>self::tenant($req), 'op'=>'marketing_intel', 'timeout'=>90, 'connect_timeout'=>4]);
        $raw  = $g['raw'];
        $code = $g['status'];

        if ($code !== 200) {
            return TemplateResponder::json($res, ['ok'=>false,'error'=>"Claude API $code"], 502);
        }

        $claudeResp = json_decode($raw, true);
        $text = $claudeResp['content'][0]['text'] ?? '';

        if (preg_match('/\{[\s\S]*\}/u', $text, $m)) {
            $result = json_decode($m[0], true);
            if ($result) {
                return TemplateResponder::json($res, ['ok'=>true,'result'=>$result]);
            }
        }
        return TemplateResponder::json($res, ['ok'=>true,'result'=>['raw'=>$text]]);
    }
    /* ── 채널 KPI 평가 시스템 프롬프트 ─────────────────────── */
    private static function channelKpiPrompt(): string {
        return <<<PROMPT
당신은 한국 디지털 마케팅 채널 KPI 전문 AI 분석가입니다.
제공된 채널별 KPI 목표와 실적 데이터를 분석하여 종합 평가합니다.

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 마크다운 없이):

{
  "overall_score": 숫자(0-100),
  "grade": "S|A|B|C|D",
  "summary": "전체 채널 KPI 달성 현황 핵심 요약 (2-3문장, 한국어)",
  "channels": [
    {
      "name": "채널명 (검색광고|SNS광고|블로그|커뮤니티)",
      "score": 숫자(0-100),
      "grade": "S|A|B|C|D",
      "kpi_status": {
        "achieved": ["달성 KPI 목록"],
        "missed": ["미달 KPI 목록"]
      },
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"],
      "action": "이 채널에 대한 즉시 실행 개선 액션"
    }
  ],
  "improvements": [
    {
      "title": "개선 과제 제목",
      "detail": "구체적 개선 방법"
    }
  ],
  "weekly_focus": "이번 주 가장 집중해야 할 채널과 이유",
  "budget_advice": "예산 배분 조정 제안",
  "top_insight": "가장 중요한 단일 인사이트",
  "immediate_action": "즉시 실행해야 할 최우선 액션"
}

채널별 평가 기준:
- 검색광고: CTR≥3%, 전환율≥5%, ROAS≥300%, CPA 목표 이하
- SNS광고: Reach 증가율, Engagement Rate≥3%, CTR≥1%, 영상조회율≥30%
- 블로그: 월간 방문자 증가, 체류시간≥180초, 검색유입 비율≥50%
- 커뮤니티: 댓글/조회 비율≥2%, 신규회원 월간 증가, 문의 전환율≥5%
- 반드시 한국어로 응답하세요
PROMPT;
    }

    /* ── POST /v422/ai/channel-kpi-eval ─────────────────────── */
    public static function channelKpiEval(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        self::migrate($pdo);

        $body    = (string)$req->getBody();
        $payload = json_decode($body, true) ?: [];
        $data    = $payload['data'] ?? [];

        if (empty($data)) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'data is required'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $dataStr = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $period  = $data['period'] === 'monthly' ? '월간' : '주간';
        $userMsg = "다음 채널별 KPI 목표와 실적 데이터를 분석하여 {$period} KPI 달성 평가 및 채널별 개선 액션을 제공해주세요:\n\n" . $dataStr;
        $now     = gmdate('c');

        try {
            $result = self::callClaude(self::channelKpiPrompt() . self::langDirective(self::reqLang($req)), $userMsg, 8, self::tenant($req));
            $tokens = $result['tokens_input'] + $result['tokens_output'];

            $evalData = json_decode($result['text'], true);
            if (!$evalData) {
                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $result['text']);
                $evalData = json_decode(trim($clean), true) ?: ['summary' => $result['text']];
            }

            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (tenant_id, context, question, data_snapshot, summary, bullets, recommendation, model, tokens_used, status, created_at)
                VALUES (:tenant, :ctx, :q, :snap, :sum, :bul, :rec, :model, :tok, 'ok', :now)");
            $stmt->execute([
                ':tenant'=> self::tenant($req),
                ':ctx'   => 'channel_kpi_eval',
                ':q'     => "채널 KPI {$period} 평가",
                ':snap'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                ':sum'   => $evalData['summary'] ?? '',
                ':bul'   => json_encode($evalData['improvements'] ?? [], JSON_UNESCAPED_UNICODE),
                ':rec'   => $evalData['immediate_action'] ?? '',
                ':model' => self::MODEL,
                ':tok'   => $tokens,
                ':now'   => $now,
            ]);

            return TemplateResponder::json($res, [
                'ok'          => true,
                'analysis_id' => (int)$pdo->lastInsertId(),
                'result'      => $evalData,
                'model'       => self::MODEL,
                'tokens_used' => $tokens,
                'created_at'  => $now,
            ]);

        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }
    /* -- 캠페인 마케팅 추천 시스템 프롬프트 */
    private static function campaignRecommendPrompt(): string {
        return <<<PROMPT
당신은 한국 이커머스 및 물류 서비스 전문 디지털 마케팅 AI 전략가입니다.
배송대행 또는 구매대행 서비스에 최적화된 광고 마케팅 채널 전략과 예산을 추천합니다.
반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 마크다운 없이):
{
  "summary": "전체 마케팅 전략 요약 3-4문장",
  "strategy": "핵심 전략 한 문장",
  "expected_roas": "예상 ROAS (예: 3.5x)",
  "expected_conversions": "예상 전환/문의 수",
  "expected_cpa": "예상 CPA (예: 12000원)",
  "channels": [
    {
      "channel_id": "채널ID(google_search|naver_search|meta|instagram|tiktok|youtube|kakao|blog)",
      "channel_name": "채널명",
      "priority": 1,
      "ad_type": "광고 유형",
      "ad_format": "광고 형태",
      "targeting": "타겟팅 방법",
      "budget": 0,
      "budget_pct": 35,
      "expected_roas": "채널 예상 ROAS",
      "kpi_goal": "KPI 목표",
      "reason": "채널 선택 이유",
      "action_plan": "구체적 집행 계획"
    }
  ],
  "timeline": [
    { "phase": "1-2주차", "title": "단계명", "detail": "실행 내용" }
  ],
  "immediate_action": "즉시 실행 첫번째 액션"
}
가이드: 배송/구매대행은 검색광고 최우선, SNS 인지도, YouTube 후기영상.
예산합계 100%, 채널 3-5개, 반드시 한국어로.
PROMPT;
    }

    /* -- POST /v422/ai/campaign-recommend */
    public static function campaignRecommend(Request $req, Response $res, array $args = []): Response {
        $pdo = Db::pdo();
        self::migrate($pdo);
        $body    = (string)$req->getBody();
        $payload = json_decode($body, true) ?: [];
        $data    = $payload['data'] ?? [];
        if (empty($data)) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => 'data is required'], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(400);
        }
        $svcType  = $data['service_type']   ?? '배송대행';
        $budget   = (int)($data['total_budget'] ?? 5000000);
        $period   = $data['campaign_period'] ?? '1개월';
        $region   = $data['target_region']  ?? '전국';
        $age      = $data['target_age']     ?? '25-44';
        $keyword  = $data['keyword']        ?? '';
        $keywords = implode(', ', (array)($data['keywords'] ?? []));
        $userMsg  = "다음 조건에 맞는 {$svcType} 서비스의 최적 광고 채널 전략과 예산 배분을 추천해주세요:\n"
            . "- 서비스: {$svcType}\n- 총 예산: ₩{$budget} ({$period})\n"
            . "- 타겟: {$region} / {$age}세\n- 키워드: {$keyword}\n- 관련어: {$keywords}\n\n"
            . "채널 우선순위, 예산 배분, 광고 집행 계획, 예상 성과, 타임라인을 제공해주세요.";
        $now = gmdate('c');
        try {
            $result = self::callClaude(self::campaignRecommendPrompt() . self::langDirective(self::reqLang($req)), $userMsg, 8, self::tenant($req));
            $tokens = $result['tokens_input'] + $result['tokens_output'];
            $evalData = json_decode($result['text'], true);
            if (!$evalData) {
                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $result['text']);
                $evalData = json_decode(trim($clean), true) ?: ['summary' => $result['text'], 'channels' => []];
            }
            $channels = $evalData['channels'] ?? [];
            foreach ($channels as &$ch) {
                if (empty($ch['budget']) && !empty($ch['budget_pct']))
                    $ch['budget'] = (int)round($budget * $ch['budget_pct'] / 100);
            }
            unset($ch);
            $evalData['channels'] = $channels;
            $stmt = $pdo->prepare("INSERT INTO ai_analyses
                (tenant_id, context, question, data_snapshot, summary, bullets, recommendation, model, tokens_used, status, created_at)
                VALUES (:tenant, :ctx, :q, :snap, :sum, :bul, :rec, :model, :tok, 'ok', :now)");
            $stmt->execute([
                ':tenant'=> self::tenant($req),
                ':ctx'   => 'campaign_recommend',
                ':q'     => "{$svcType} 마케팅 채널 추천 (₩{$budget})",
                ':snap'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                ':sum'   => $evalData['summary'] ?? '',
                ':bul'   => json_encode(array_column($channels, 'channel_name'), JSON_UNESCAPED_UNICODE),
                ':rec'   => $evalData['immediate_action'] ?? '',
                ':model' => self::MODEL,
                ':tok'   => $tokens,
                ':now'   => $now,
            ]);
            return TemplateResponder::json($res, [
                'ok'          => true,
                'analysis_id' => (int)$pdo->lastInsertId(),
                'result'      => $evalData,
                'model'       => self::MODEL,
                'tokens_used' => $tokens,
                'created_at'  => $now,
            ]);
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /* -- 캠페인 광고 소재(크리에이티브) 생성 프롬프트 */
    private static function campaignAdCreativePrompt(): string {
        return <<<PROMPT
당신은 한국 디지털 광고 크리에이티브 전문 카피라이터이자 마케팅 AI입니다.
배송대행 또는 구매대행 서비스의 채널별 광고 소재(헤드라인, 카피, CTA, 포맷)를 생성합니다.

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON):
{
  "creatives": [
    {
      "channel_id": "채널ID (google_search|naver_search|meta|instagram|tiktok|youtube|kakao|blog)",
      "headline": "광고 헤드라인 (채널 특성에 맞게, 임팩트 있게)",
      "copy": "광고 카피 본문 (서비스 혜택 강조, 2-3문장)",
      "cta": "행동유도 버튼 문구",
      "format": "광고 포맷 (검색텍스트/피드이미지/스토리/영상/배너 등)",
      "spec": "권장 사이즈/규격",
      "tone": "광고 톤앤매너",
      "keywords": ["검색키워드1", "키워드2"],
      "tips": "이 채널 소재 운영 팁"
    }
  ]
}

채널별 소재 가이드:
- google_search/naver_search: 키워드 기반 텍스트, 혜택+수치 강조, 확장 소재
- meta/instagram: 비주얼 임팩트, 스와이프형, 후기/신뢰 강조
- tiktok: 짧고 강렬한 훅, 트렌디한 표현, 해시태그
- youtube: 스킵 전 5초 훅 중요, 스토리텔링, 상세 설명
- kakao: 친근한 톤, 이모지 활용, 카카오채널 특성 반영
- blog: SEO 중심, 정보성 제목, 롱테일 키워드
- 배송대행: 출발국(한국) 강조, 국제특송, 빠른 배송, 관세 편의성
- 구매대행: 해외상품 접근성, 안전한 거래, 통관 편의성
- 반드시 한국어로 작성
PROMPT;
    }


    /* -- 캠페인 검색 기반 AI 분석 프롬프트 (강화버전) */
    private static function campaignSearchPrompt(): string {
        return <<<PROMPT
당신은 한국 배송대행·구매대행 전문 디지털 마케팅 전략가 AI입니다.
배송대행(한국→해외 국제특송)과 구매대행(해외→한국 통관대행) 서비스에 특화된 광고 마케팅 전략을 제공합니다.

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 코드블록 없이):
{
  "summary": "검색 쿼리 분석 요약 (4-5문장, 서비스 특성·경쟁 현황·핵심 기회 설명)",
  "strategy": "핵심 마케팅 전략 한 문장 (구체적 수치 포함)",
  "total_monthly_budget": 8000000,
  "monthly_budget": "월간 추천 예산 표시 (예: ₩800만)",
  "annual_budget": "연간 추천 예산 표시 (예: ₩9,600만)",
  "expected_roas": "전체 예상 ROAS (예: 4.2x)",
  "expected_conversions": "월간 예상 신규 고객 수 (예: 120명)",
  "budget_rationale": "예산 추천 근거 (왜 이 금액인지 2-3문장 설명)",
  "channels": [
    {
      "channel_id": "google_search|naver_search|meta|instagram|tiktok|youtube|kakao|blog",
      "channel_name": "채널명 (예: 네이버 검색광고)",
      "priority": 1,
      "effectiveness_score": 92,
      "ad_type": "광고 유형 (예: 키워드 검색광고)",
      "ad_format": "광고 형태 (예: 텍스트 + 이미지 확장소재)",
      "targeting": "구체적 타겟팅 방법",
      "monthly_budget": 3000000,
      "budget_pct": 38,
      "expected_roas": "채널 예상 ROAS",
      "expected_cpa": "예상 고객 획득 비용",
      "kpi_goal": "KPI 수치 목표 (예: CTR 4% 이상, 전환율 3%)",
      "key_metric": "핵심 성과 지표",
      "reason": "이 채널 선택 이유 (배송대행/구매대행 서비스 특성 연계)",
      "efficiency_tips": [
        "효율 극대화 팁 1 (구체적 실행 방법)",
        "효율 극대화 팁 2",
        "효율 극대화 팁 3"
      ],
      "keywords": ["핵심키워드1", "키워드2", "키워드3"],
      "action_plan": "구체적 광고 집행 계획 (단계별)"
    }
  ],
  "efficiency_maximization": {
    "overall_tips": [
      "전체 효율 극대화 방법 1",
      "방법 2",
      "방법 3"
    ],
    "ab_test_ideas": "A/B 테스트 제안",
    "funnel_strategy": "고객 획득 퍼널 전략 (인지→관심→구매 단계별)",
    "retargeting": "리타겟팅 전략"
  },
  "timeline": [
    { "phase": "1-2주차", "title": "단계명", "detail": "구체적 실행 내용 (KPI 목표 포함)" }
  ],
  "immediate_action": "지금 당장 해야 할 첫 번째 실행 액션"
}

배송대행 서비스 마케팅 전문 지식:
- 배송대행(한국→해외): 네이버 검색광고 필수 (배송대행, 국제특송, DHL대행 등), 카카오 모먼트 보조, 블로그 SEO 병행
- 구매대행(해외→한국): 구글/네이버 검색 + SNS 비주얼 광고 (인스타그램, 페이스북) 강함
- 핵심 키워드: 배송대행, 구매대행, 해외직구, 국제특송, 세관대행, Amazon대행
- 타겟: 20-40대 직구족, 해외거주 교포, 소상공인, 크로스보더 이커머스
- 시즌 피크: 블랙프라이데이, 아마존프라임데이, 연말 연시
- 효율 극대화 핵심: 검색광고 키워드 매칭타입 최적화, 브랜드 검색어 확보, 후기/리뷰 콘텐츠 활용
- 월간 적정 예산: 소규모 ₩200-500만, 중규모 ₩600-1200만, 대규모 ₩1500만+
- 채널 배분 원칙: 검색광고 40-50%, SNS 20-30%, 콘텐츠 20-30%
- 반드시 한국어로 응답
PROMPT;
    }


    // ─────────────────────────────────────────────────────────────────────
    // POST /v422/ai/campaign-search
    // 마케팅 채널 AI 추천 (전체 카테고리 + 상품 데이터 지원)
    // Body: { data: { query, service_type, service_route, category_id, products? } }
    // ─────────────────────────────────────────────────────────────────────
    /**
     * 208차 #6: 라이브 커머스 AI 어시스트(실시간 번역/자막/상품설명·쇼호스트/FAQ).
     *   서버 공용 Claude 사용(외부 추가 자격증명 불요). 키 미설정 시 ok:false+안내(가짜응답 금지).
     *   POST /v422/ai/live-assist  body: { task, text?, lang?, product? }
     *   task = translate | subtitle | describe | showhost | faq
     */
    public static function liveAssist(Request $req, Response $res): Response
    {
        try {
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
            $task    = trim((string)($body['task'] ?? ''));
            $text    = trim((string)($body['text'] ?? ''));
            $lang    = trim((string)($body['lang'] ?? '한국어'));
            $product = trim((string)($body['product'] ?? ''));
            if ($task === '') return self::liveJson($res, ['ok' => false, 'error' => 'task 가 필요합니다.'], 422);

            if (!self::aiKeyConfigured()) {
                return self::liveJson($res, ['ok' => false, 'ai' => false, 'error' => 'AI 키가 설정되지 않았습니다. [연동 허브]에서 OpenAI/Gemini/Claude 키를 등록하면 활성화됩니다.'], 200);
            }
            [$sys, $user] = self::livePrompt($task, $text, $lang, $product);
            if ($task !== 'translate') $sys .= self::langDirective(self::reqLang($req, $body)); // FAQ/멘트/설명도 사용자 언어로(번역 task는 자체 타깃언어 유지)
            if (trim($user) === '') return self::liveJson($res, ['ok' => false, 'error' => '입력 내용이 필요합니다.'], 422);
            $timeout = in_array($task, ['describe', 'showhost'], true) ? 24 : 12; // 멘트 생성은 길게, 번역/자막/FAQ는 12초
            $r = self::callClaude($sys, $user, $timeout, self::tenant($req));
            return self::liveJson($res, ['ok' => true, 'ai' => true, 'task' => $task, 'text' => trim((string)$r['text']), 'tokens' => (int)($r['tokens_output'] ?? 0)]);
        } catch (\Throwable $e) {
            return self::liveJson($res, ['ok' => false, 'error' => $e->getMessage()], 200);
        }
    }

    private static function livePrompt(string $task, string $text, string $lang, string $product): array
    {
        switch ($task) {
            case 'translate':
                return ["You are a professional live-commerce interpreter. Translate the user's message into {$lang}. Output ONLY the translation — no preamble, notes, or quotation marks.", $text];
            case 'subtitle':
                return ["You convert raw live-broadcast speech into clean, concise on-screen subtitles written in {$lang}. Fix punctuation, drop filler words, keep it short. Output only the subtitle text.", $text];
            case 'faq':
                return ["당신은 라이브 커머스 고객 응대 AI입니다. 아래 상품 정보를 바탕으로 시청자 질문에 친절하고 간결하게(2~3문장) 답하세요. 정보가 없으면 솔직히 안내하고 과장/허위는 금지합니다.\n[상품 정보]\n" . ($product !== '' ? $product : '(상품 정보 없음)'), $text];
            case 'describe':
            case 'showhost':
            default:
                return ["당신은 라이브 커머스 전문 쇼호스트 카피라이터입니다. 주어진 상품에 대해 (1) 핵심 셀링포인트 3가지(각 1문장) (2) 라이브 소개 멘트(3~4문장) 를 한국어로 간결하고 신뢰감 있게 작성하세요. 군더더기·과장·허위 금지. 8초 내 완료되도록 짧게.", ($product !== '' ? $product : $text)];
        }
    }

    private static function liveJson(Response $res, array $d, int $s = 200): Response
    {
        $res->getBody()->write(json_encode($d, JSON_UNESCAPED_UNICODE));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($s);
    }

    public static function campaignSearch(Request $req, Response $res): Response
    {
        try {
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) {
                $raw = (string)$req->getBody();
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) $body = $decoded;
            }
            $data     = $body['data'] ?? $body;
            $query    = trim((string)($data['query']       ?? ''));
            $svcType  = trim((string)($data['service_type'] ?? ''));
            $svcRoute = trim((string)($data['service_route'] ?? ''));
            $catId    = trim((string)($data['category_id']  ?? 'general'));

            if (!$query) {
                $res->getBody()->write(json_encode(['ok' => false, 'error' => '검색어를 입력해 주세요.'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type', 'application/json')->withStatus(422);
            }

            $systemPrompt = <<<PROMPT
당신은 대한민국 최고의 디지털 마케팅 전문가 AI입니다.
카테고리: {$svcType}
판매/서비스 형태: {$svcRoute}

사용자의 질문과 상품 데이터를 분석하여 최적의 광고 마케팅 채널과 전략을 추천하세요.
반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON, 마크다운 코드블록/```json 없이):

{
  "summary": "전체 마케팅 전략 요약 (2-3문장, 카테고리·상품 특성 반영)",
  "strategy": "핵심 전략 한 문장 (구체적 수치와 채널 포함)",
  "total_monthly_budget": 숫자(원),
  "monthly_budget": "월간 추천 예산 표시 (예: ₩800만)",
  "annual_budget": "연간 추천 예산 표시 (예: ₩9,600만)",
  "expected_roas": "전체 예상 ROAS (예: 3.5x)",
  "expected_conversions": "월간 예상 고객/전환 수 (예: 150명)",
  "budget_rationale": "예산 추천 근거 상세 설명 (SKU 수·단가·마진율·매출 목표 기반의 광고비 계산 논리, 2-3문장, 반드시 구체적 수치 포함)",
  "product_analysis": "상품 데이터 기반 광고 효율 예측 (단가대·경쟁강도·마진 구조별 채널 효율 분석)",
  "channels": [
    {
      "channel_id": "google_search|naver_search|meta|instagram|tiktok|youtube|kakao|blog",
      "channel_name": "채널명",
      "priority": 1,
      "ad_type": "광고 유형",
      "ad_format": "광고 형태",
      "effectiveness_score": 숫자(0-100),
      "monthly_budget": 숫자(원),
      "budget_pct": 숫자(0-100),
      "expected_roas": "예상 ROAS",
      "expected_cpa": "예상 CPA",
      "kpi_goal": "KPI 목표 (구체적 수치 포함)",
      "targeting": "타겟팅 전략 (상품 특성·가격대 기반)",
      "key_metric": "핵심 지표",
      "reason": "이 채널 추천 이유 (카테고리·상품 특성·단가 기반, 구체적 수치 포함)",
      "action_plan": "구체적 집행 계획 (단계별)",
      "efficiency_tips": ["효율 극대화 팁1", "팁2", "팁3"],
      "keywords": ["핵심 키워드1", "키워드2", "키워드3"]
    }
  ],
  "efficiency_maximization": {
    "overall_tips": ["전체 효율 극대화 방법1", "방법2", "방법3"],
    "ab_test_ideas": "A/B 테스트 제안",
    "funnel_strategy": "고객 획득 퍼널 전략 (인지→관심→구매 단계별)",
    "retargeting": "리타겟팅 전략"
  },
  "timeline": [
    {"phase": "1-2주차", "title": "단계명", "detail": "실행 내용 (KPI 목표 포함)"}
  ],
  "immediate_action": "즉시 실행 최우선 액션"
}

카테고리별 채널 우선순위:
- 뷰티·코스메틱: Instagram > TikTok > Meta > 네이버 > YouTube
- 패션·의류: Instagram > Meta > TikTok > 네이버 > 카카오
- 생활·잡화: 쿠팡광고 > 네이버 > 카카오 > Meta > Google
- 식품·건강: 네이버 > 카카오 > YouTube > Meta > 쿠팡광고
- 전자·IT: Google > 네이버 > YouTube > Meta > 커뮤니티
- 배송대행: Google > 네이버 > 커뮤니티 > Meta > YouTube
- 구매대행: 네이버 > Google > 커뮤니티 > Meta
- 스포츠·레저: Instagram > YouTube > Meta > 네이버 > TikTok

예산 추천 계산 기준 (상품 데이터 있을 때):
- 광고비/매출 비율(A/S ratio) 목표: 뷰티 15-25%, 전자 8-15%, 식품 10-20%, 패션 20-30%
- 광고비 상한: 마진의 40-60% 이내여야 수익성 유지
- SKU 수가 많을수록 → 네이버·Google 검색광고 비중 증가
- 단가가 높을수록(₩50,000 이상) → 리타겟팅·비교검색 채널 중요
- 단가가 낮을수록(₩30,000 이하) → TikTok·SNS 임펄스 구매 채널 중요
- 반드시 한국어로 응답하고, 상품 데이터 기반의 구체적 수치를 포함하세요.
PROMPT;

            // ── 상품 정보 파라미터 처리
            $products = $data['products'] ?? null;
            $productContext = '';
            if ($products && is_array($products) && !in_array($catId, ['forwarding', 'purchasing'])) {
                $skuCount    = (int)($products['sku_count']      ?? 0);
                $monthlyQty  = (int)($products['monthly_qty']    ?? 0);
                $avgPrice    = (int)($products['avg_price']      ?? 0);
                $marginRate  = (int)($products['margin_rate']    ?? 0);
                $targetRev   = (int)($products['target_revenue'] ?? 0);
                $period      = (string)($products['period']      ?? 'monthly');
                $salesChList = implode(', ', (array)($products['sales_channels'] ?? []));
                $dataSource  = (string)($products['data_source'] ?? 'user_input');

                $estMonthlyRev = ($avgPrice > 0 && $monthlyQty > 0) ? $avgPrice * $monthlyQty : 0;
                $marginAmt     = ($estMonthlyRev > 0) ? (int)round($estMonthlyRev * $marginRate / 100) : 0;
                $srcLabel      = ($dataSource === 'catalog_auto') ? '카탈로그 자동 집계' : '사용자 입력';

                $productContext = "\n\n=== 판매 상품 데이터 ({$srcLabel}) ===\n"
                    . "- SKU 수: {$skuCount}개\n"
                    . "- 월 판매 목표: {$monthlyQty}개\n"
                    . "- 평균 단가: ₩" . number_format($avgPrice) . "\n"
                    . "- 마진율: {$marginRate}%\n";
                if ($estMonthlyRev > 0) $productContext .= "- 예상 월 매출: ₩" . number_format($estMonthlyRev) . "\n";
                if ($marginAmt     > 0) $productContext .= "- 예상 월 마진: ₩" . number_format($marginAmt) . "\n";
                if ($targetRev     > 0) {
                    $pLabel = ($period === 'monthly') ? '월간' : '연간';
                    $productContext .= "- 목표 {$pLabel} 매출: ₩" . number_format($targetRev) . "\n";
                }
                if ($salesChList) $productContext .= "- 주요 판매 채널: {$salesChList}\n";

                $topProds = (array)($products['top_products'] ?? []);
                if (!empty($topProds)) {
                    $topStr = implode(', ', array_map(
                        fn($p) => "{$p['name']}(월{$p['monthly_sales']}개·₩" . number_format((int)$p['price']) . ")",
                        array_slice($topProds, 0, 3)
                    ));
                    $productContext .= "- 주요 상품: {$topStr}\n";
                }

                $productContext .= "\n위 상품 데이터를 반드시 기반으로:\n"
                    . "1. budget_rationale에 SKU 수 × 단가 × 마진율 기반 적정 광고비 계산 근거를 상세히 제시\n"
                    . "2. product_analysis에 단가대·마진 구조별 채널 효율 예측 제공\n"
                    . "3. 각 채널의 reason에 상품 특성(단가·마진·SKU 수)을 연계한 구체적 근거 포함\n";
            }

            $userMsg = "카테고리: {$svcType}\n질문: {$query}{$productContext}\n\n위 카테고리, 질문, 상품 데이터에 맞는 최적 마케팅 채널 3~5개와 예산 배분 전략을 추천해 주세요.";

            // ── Claude API 시도 → 실패 시 내장 지식 베이스 폴백 ─────────────
            $evalData    = null;
            $tokens      = 0;
            $dataSource  = 'ai';
            try {
                $claude = self::callClaude($systemPrompt . self::langDirective(self::reqLang($req)), $userMsg, 8, self::tenant($req));
                $text   = $claude['text'];
                $tokens = ($claude['tokens_input'] ?? 0) + ($claude['tokens_output'] ?? 0);

                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $text);
                $clean = trim($clean ?? $text);
                $evalData = json_decode($clean, true);
                if (!is_array($evalData)) {
                    $evalData = null; // 파싱 실패 시 폴백으로
                } else {
                    // monthly_budget / annual_budget 문자열 정규화
                    if (!isset($evalData['monthly_budget']) && isset($evalData['total_monthly_budget'])) {
                        $tmb = (int)$evalData['total_monthly_budget'];
                        $evalData['monthly_budget'] = '₩' . number_format($tmb);
                        $evalData['annual_budget']  = '₩' . number_format($tmb * 12);
                    }
                    $evalData['data_source'] = 'ai';
                }
            } catch (\Throwable $claudeEx) {
                // Claude API 실패 → 내장 지식 베이스로 즉시 폴백
                $evalData   = null;
                $dataSource = 'fallback';
            }

            // 내장 지식 베이스 폴백 (Claude 실패 또는 JSON 파싱 실패 시)
            if (!is_array($evalData)) {
                $products  = $data['products'] ?? [];
                $period    = trim((string)($products['period'] ?? 'monthly'));
                $evalData  = self::generateFallbackResponse($catId, $svcType, $query, $products, $period);
                $dataSource = 'fallback';
            }

            // DB 저장 시도 (실패해도 응답은 반환)
            try {
                $pdo = \Genie\Db::pdo();
                self::migrate($pdo);
                $now = gmdate('Y-m-d\TH:i:s\Z');
                $stmt = $pdo->prepare(
                    'INSERT INTO ai_analyses (tenant_id,context,question,data_snapshot,summary,bullets,recommendation,model,tokens_used,status,created_at)
                     VALUES (:tenant,:ctx,:q,:snap,:sum,:bul,:rec,:model,:tok,"ok",:now)'
                );
                $stmt->execute([
                    ':tenant'=> self::tenant($req),
                    ':ctx'   => 'campaign_search_' . $catId,
                    ':q'     => "{$svcType}: {$query}",
                    ':snap'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                    ':sum'   => $evalData['summary'] ?? '',
                    ':bul'   => json_encode(array_column($evalData['channels'] ?? [], 'channel_name'), JSON_UNESCAPED_UNICODE),
                    ':rec'   => $evalData['immediate_action'] ?? '',
                    ':model' => $dataSource === 'ai' ? self::MODEL : 'knowledge_base_v1',
                    ':tok'   => $tokens,
                    ':now'   => $now,
                ]);
            } catch (\Throwable $dbEx) { /* silent */ }

            // [233차 감사 P1] AI 폴백 라벨 정직화 — 기존 '전문가 지식 베이스' 는 규칙/벤치마크 폴백을 실 AI 로 오인하게 했다.
            //   top-level ai 플래그 + 솔직한 note 로 표준화(marketingInsight 패턴 정합, 소비측이 '규칙 기반' 배지 표기 가능).
            $isAi = $dataSource === 'ai';
            $res->getBody()->write(json_encode([
                'ok'          => true,
                'ai'          => $isAi,
                'result'      => $evalData,
                'model'       => $isAi ? self::MODEL : '규칙 기반(벤치마크)',
                'tokens_used' => $tokens,
                'data_source' => $dataSource,
                'note'        => $isAi ? null : 'AI 키 미설정 또는 호출 실패 — 업종 벤치마크 기반 규칙 분석으로 응답했습니다.',
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return $res->withHeader('Content-Type', 'application/json');
        } catch (\Throwable $e) {
            // 최후 방어: 어떤 오류도 JSON으로 반환
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }


    // ─────────────────────────────────────────────────────────────────────
    // POST /v422/ai/campaign-ad-creative
    // 채널별 광고 소재(헤드라인·카피·CTA) 자동 생성
    // ─────────────────────────────────────────────────────────────────────
    public static function campaignAdCreative(Request $req, Response $res): Response
    {
        try {
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) {
                $raw = (string)$req->getBody();
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) $body = $decoded;
            }
            $data     = $body['data'] ?? $body;
            $svcType  = trim((string)($data['service_type'] ?? ''));
            $svcRoute = trim((string)($data['service_route'] ?? ''));
            $keyword  = trim((string)($data['keyword']      ?? ''));
            $channels = $data['channels'] ?? [];

            if (empty($channels)) {
                $res->getBody()->write(json_encode(['ok' => false, 'error' => 'channels 필드가 필요합니다.'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type', 'application/json')->withStatus(422);
            }

            $chList = json_encode($channels, JSON_UNESCAPED_UNICODE);
            $systemPrompt = <<<PROMPT
당신은 대한민국 광고 카피 전문가입니다.
서비스/카테고리: {$svcType} ({$svcRoute})
키워드: {$keyword}

각 채널에 맞는 광고 소재를 생성하세요.
반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON):

{
  "creatives": [
    {
      "channel_id": "채널ID",
      "headline": "광고 헤드라인 (임팩트 있게, 20자 이내)",
      "copy": "광고 본문 카피 (혜택·서비스 설명 2문장)",
      "cta": "CTA 문구 (예: 지금 신청, 무료 상담)",
      "main_title": "광고 대제목",
      "sub_title": "광고 중제목",
      "tips": "이 채널 광고 운영 핵심 팁"
    }
  ]
}
PROMPT;

            $userMsg = "채널 목록: {$chList}\n\n각 채널에 맞게 '{$keyword}' 광고 소재를 생성해 주세요.";

            // ── Claude API 시도 → 실패 시 내장 소재 폴백 ─────────────────────
            $result     = null;
            $dataSource = 'ai';
            try {
                $claude = self::callClaude($systemPrompt . self::langDirective(self::reqLang($req)), $userMsg, 8, self::tenant($req));
                $text   = $claude['text'];
                $clean  = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $text);
                $clean  = trim($clean ?? $text);
                $result = json_decode($clean, true);
                if (!is_array($result) || empty($result['creatives'])) {
                    $result = null;
                } else {
                    $result['data_source'] = 'ai';
                }
            } catch (\Throwable $claudeEx) {
                $result     = null;
                $dataSource = 'fallback';
            }

            if (!is_array($result)) {
                $catId  = trim((string)($data['category_id'] ?? 'general'));
                $result = self::generateFallbackCreatives($catId, $svcType, $keyword, $channels);
                $dataSource = 'fallback';
            }

            $res->getBody()->write(json_encode([
                'ok'         => true,
                'result'     => $result,
                'data_source'=> $dataSource,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return $res->withHeader('Content-Type', 'application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /v422/ai/campaign-ad-design  (196차 — AI 디자인 스튜디오)
    // 상품설명+카테고리+채널 → 채널별 완성 광고 디자인 스펙(카피·컬러팔레트·레이아웃·규격).
    // feedback 전달 시 이전 디자인을 피드백 반영해 재생성(미리보기→수정→적용 워크플로우).
    // ─────────────────────────────────────────────────────────────────────
    /**
     * [254차 초고도화 ⑥] 생성형 DCO — 소재 피로 시 AbTesting 이 호출하는 프로그램형 신소재 자동생성.
     *   Claude(실 API·운영 키 보유)로 채널 광고 카피를 생성·ad_design 영속(status=active)→ 다음 집행이 A/B 변형 편입.
     *   키 미설정/API오류 = honest 0(수동 안내 유지). buildDelivery(플랫폼 광고 생성)는 매체 자격증명 게이트(별도).
     */
    public static function autoGenerateAdDesign(\PDO $pdo, string $tenant, string $channel, string $category = '일반', string $product = ''): int
    {
        if ($tenant === '' || $channel === '') return 0;
        if ($product === '') $product = ($category !== '' && $category !== '일반') ? "{$category} 신규 프로모션" : '신규 프로모션';
        $sys = "당신은 퍼포먼스 광고 크리에이티브 디렉터입니다. 채널({$channel})·카테고리({$category})에 맞춰 CTR/전환을 극대화하는 광고 1개를 설계합니다. 반드시 아래 JSON만 출력(설명·마크다운 금지): {\"channel\":\"{$channel}\",\"headline\":\"임팩트 헤드라인 16자내\",\"subheadline\":\"보조문구 24자내\",\"body\":\"혜택중심 본문 1~2문장\",\"cta\":\"행동유도 버튼문구\"}";
        try {
            $r = self::callClaude($sys, "상품: {$product}\n위 채널 광고 1개를 JSON으로 설계하세요.", 8, $tenant);
            $txt = (string)($r['text'] ?? '');
            if ($txt === '') return 0;
            if (preg_match('/\{.*\}/s', $txt, $mm)) $txt = $mm[0];
            $design = json_decode($txt, true);
            if (!is_array($design) || empty($design['headline'])) return 0;
            $design['channel'] = $channel; $design['_dco_generated'] = true;
            // [255차 심화 A] 생성형 이미지 DCO — 카피와 함께 광고 배경 이미지도 자동생성(이미지 API 등록 시).
            //   loadDesign 이 svg 의 base64 를 추출 → metaUploadImage/kakaoDeliver/lineDeliver 가 매체 이미지 변형으로 배포(업로드 파이프 기존·수정0).
            //   이미지 API 미설정/오류 = graceful '' (기존 텍스트 전용 DCO 유지·회귀0). register-then-execute.
            $svg = '';
            try {
                $imgPrompt = trim((string)($design['headline'] ?? '') . ' ' . ($category !== '일반' ? $category : '') . ' ' . $product);
                if ($imgPrompt !== '') { $ig = self::generateImage($tenant, $imgPrompt, '1:1'); if (!empty($ig['ok']) && !empty($ig['image'])) { $svg = (string)$ig['image']; $design['_dco_image'] = true; } }
            } catch (\Throwable $e) {}
            self::migrateAdDesign($pdo);
            $now = gmdate('Y-m-d H:i:s');
            $st = $pdo->prepare('INSERT INTO ad_design(tenant_id,category,product,channel,spec_json,svg,status,created_at) VALUES(?,?,?,?,?,?,?,?)');
            $st->execute([$tenant, mb_substr($category, 0, 120), mb_substr($product, 0, 2000), $channel, json_encode($design, JSON_UNESCAPED_UNICODE), $svg, 'active', $now]);
            return (int)$pdo->lastInsertId();
        } catch (\Throwable $e) { return 0; }
    }

    public static function campaignAdDesign(Request $req, Response $res): Response
    {
        try {
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
            $data     = $body['data'] ?? $body;
            $product  = trim((string)($data['product_description'] ?? $data['product'] ?? ''));
            $category = trim((string)($data['category'] ?? '일반'));
            $channels = $data['channels'] ?? [];
            $feedback = trim((string)($data['feedback'] ?? ''));
            if (!is_array($channels) || empty($channels)) $channels = ['tiktok','meta','instagram','kakao','youtube'];
            if ($product === '') {
                $res->getBody()->write(json_encode(['ok'=>false,'error'=>'상품 설명을 입력하세요.'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(422);
            }
            $chList = implode(', ', array_map('strval', $channels));
            $fbLine = $feedback !== '' ? "수정 요청(이전 디자인을 이 피드백에 맞게 개선): {$feedback}\n" : '';
            $systemPrompt = <<<PROMPT
당신은 세계 최고 수준의 퍼포먼스 광고 크리에이티브 디렉터입니다. 상품 설명·카테고리·채널 특성에 맞춰 클릭률(CTR)과 전환을 극대화하는 채널별 광고 디자인을 설계합니다.

카테고리: {$category}
{$fbLine}
채널 특성 가이드:
- tiktok: 역동적 숏폼(9:16), 첫 3초 후킹, 트렌디·자막 중심
- meta / instagram: 감각적 비주얼 피드(1:1 또는 4:5)·스토리(9:16), 브랜드 무드
- youtube: 영상(16:9), 인트로 후킹+스토리텔링
- kakao: 친근한 메시지형(1:1), 혜택·CTA 명확

반드시 아래 JSON만 출력(설명·마크다운 금지):
{
  "designs": [
    {
      "channel": "tiktok|meta|instagram|kakao|youtube 중 하나",
      "format": "포맷명(예: 숏폼 영상, 피드 이미지, 스토리, 카루셀, 인스트림 영상)",
      "ratio": "9:16|1:1|4:5|16:9 중 하나",
      "headline": "임팩트 헤드라인(공백 포함 16자 이내)",
      "subheadline": "보조 문구(24자 이내)",
      "body": "본문 카피(1~2문장, 혜택 중심)",
      "cta": "행동유도 버튼 문구(예: 지금 구매, 무료 체험)",
      "hashtags": ["#관련태그", "#카테고리태그"],
      "palette": {"bg": "#배경HEX", "primary": "#주색HEX", "accent": "#강조HEX", "text": "#글자HEX(배경 대비 가독)"},
      "layout": "요소 배치 설명(헤드라인/CTA 위치 등)",
      "visual": "비주얼 디렉션(이미지·영상 연출 가이드 1문장)",
      "mood": "톤(예: 역동적, 미니멀, 럭셔리, 따뜻한)"
    }
  ]
}
요청된 채널 각각에 대해 정확히 하나씩 생성하세요. palette 색상은 카테고리·무드에 어울리고 text는 bg 위에서 반드시 잘 보이게 하세요.
PROMPT;
            $userMsg = "상품 설명: {$product}\n\n대상 채널: {$chList}\n\n각 채널에 맞는 광고 디자인을 생성해 주세요.";

            $result = null; $dataSource = 'ai';
            try {
                $claude = self::callClaudeLong($systemPrompt . self::langDirective(self::reqLang($req)), $userMsg, 22, [], self::tenant($req)); // 다채널 디자인 생성 → 여유 타임아웃
                $clean  = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $claude['text']);
                $parsed = json_decode(trim($clean ?? $claude['text']), true);
                if (is_array($parsed) && !empty($parsed['designs']) && is_array($parsed['designs'])) {
                    $result = $parsed['designs'];
                }
            } catch (\Throwable $e) { $dataSource = 'fallback'; }

            if (!is_array($result)) { $result = self::fallbackAdDesigns($product, $category, $channels, $feedback); $dataSource = 'fallback'; }

            $res->getBody()->write(json_encode(['ok'=>true,'designs'=>$result,'data_source'=>$dataSource], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return $res->withHeader('Content-Type','application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type','application/json')->withStatus(500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /v422/ai/campaign-ad-chat  (196차 — 대화형 AI 디자인)
    // 사용자가 자유 자연어로 대화하며 광고 디자인 생성·수정. messages[] + 현재 design →
    // Claude 가 대화 응답(reply) + 업데이트된 design 스펙 반환.
    // ─────────────────────────────────────────────────────────────────────
    public static function campaignAdChat(Request $req, Response $res): Response
    {
        try {
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
            $data = $body['data'] ?? $body;
            $messages = is_array($data['messages'] ?? null) ? $data['messages'] : [];
            $curDesign = is_array($data['design'] ?? null) ? $data['design'] : null;
            // 196차++ 참고 이미지 업로드: data URI(이미지) → Claude 비전 멀티모달 참고 입력
            $refImages = [];
            $ref = trim((string)($data['reference_image'] ?? ''));
            if ($ref !== '' && preg_match('#^data:image/(?:png|jpe?g|gif|webp);base64,#i', $ref)) $refImages[] = $ref;
            if (empty($messages)) {
                $res->getBody()->write(json_encode(['ok'=>false,'error'=>'메시지를 입력하세요.'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(422);
            }
            // 대화 히스토리 텍스트화(최근 12턴)
            $convo = '';
            foreach (array_slice($messages, -12) as $m) {
                $role = (($m['role'] ?? 'user') === 'assistant') ? 'AI' : '사용자';
                $convo .= "{$role}: " . trim((string)($m['content'] ?? '')) . "\n";
            }
            $curJson = $curDesign ? json_encode($curDesign, JSON_UNESCAPED_UNICODE) : '없음(첫 생성)';

            // 196차++ #4 여러 컷(캐러셀): cuts>1 → designs 배열(연속 컷) 요청
            $cuts = (int)($data['cuts'] ?? 1); if ($cuts < 1) $cuts = 1; if ($cuts > 6) $cuts = 6;
            // 196차++ #5 URL 참고: 붙여넣은 URL 서버 분석(SSRF 가드) → 콘텐츠 요약 + og:image 비전 반영
            $urlCtx = '';
            $refUrl = trim((string)($data['reference_url'] ?? ''));
            if ($refUrl !== '') {
                try {
                    $uc = self::fetchUrlContext($refUrl);
                    $urlCtx = (string)($uc['summary'] ?? '');
                    if (!empty($uc['image']) && count($refImages) < 4) $refImages[] = $uc['image'];
                } catch (\Throwable $e) { $urlCtx = ''; }
            }

            $designSchema = '  "design": {' . "\n"
                . '    "channel": "tiktok|meta|instagram|kakao|youtube|popup 중 추론(미지정 instagram)",' . "\n"
                . '    "format": "포맷명", "ratio": "9:16|1:1|4:5|16:9 중 하나",' . "\n"
                . '    "headline": "광고 헤드라인(16자 이내)", "subheadline": "보조문구", "body": "본문 카피(1~2문장)",' . "\n"
                . '    "cta": "행동유도 버튼 문구", "hashtags": ["#태그1","#태그2"],' . "\n"
                . '    "palette": {"bg":"#배경HEX","primary":"#주색HEX","accent":"#강조HEX","text":"#글자HEX(배경 대비 가독)"},' . "\n"
                . '    "layout": "요소 배치", "visual": "비주얼 연출 가이드 1문장", "mood": "톤(럭셔리/역동적/미니멀 등)",' . "\n"
                . '    "image_prompt": "광고 배경 비주얼 생성용 상세 영문 프롬프트(텍스트 없는 고급 상업사진/추상 배경, 오버레이 공간 확보)"' . "\n"
                . '  }';
            if ($cuts > 1) {
                $schemaBlock = "{\n  \"reply\": \"대화 응답(한국어 1~2문장)\",\n  \"designs\": [ 위 design 객체를 정확히 {$cuts}개 ]\n}";
                $narrative = "designs 는 손가락으로 넘겨보는(스와이프) 캐러셀 광고의 연속 컷입니다. 서사 순서: ①후킹 표지 ②핵심 문제/혜택 ③증거·수치 ④기능/방법 ⑤신뢰/후기 ⑥강한 CTA (컷 수에 맞게 배분). 모든 컷은 channel·ratio·palette·브랜드 톤을 일관되게 유지하고, headline·subheadline·body·image_prompt 는 컷마다 다르게(서사 진행). 마지막 컷은 반드시 명확한 CTA.";
            } else {
                $schemaBlock = "{\n  \"reply\": \"대화 응답(한국어, 짧고 친근하게 1~2문장)\",\n{$designSchema}\n}";
                $narrative = '사용자가 수정만 요청하면 현재 디자인에서 해당 부분만 바꾸고 나머지는 유지하세요.';
            }

            $systemPrompt = "당신은 세계 최고의 퍼포먼스 광고 크리에이티브 디렉터입니다. 사용자와 자유롭게 대화하며 광고 디자인을 만들고 다듬습니다.\n"
                . "대화 맥락과 사용자 요청(생성/수정)을 반영하세요. GeniegoROI(마케팅 ROI 분석 SaaS) 자사 광고도 가능합니다.\n\n"
                . "현재 디자인: {$curJson}\n\n"
                . ($cuts > 1 ? "위 design 객체 스키마:\n{$designSchema}\n\n" : '')
                . "반드시 아래 JSON만 출력(설명·마크다운·코드펜스 금지):\n{$schemaBlock}\n\n{$narrative}";

            if (!empty($refImages)) {
                $systemPrompt .= "\n\n[참고 이미지 첨부됨] 이미지의 색감(팔레트)·구도·분위기·스타일·소재를 면밀히 분석해 palette·mood·image_prompt 에 적극 반영하세요. palette는 이미지 주조색에서 추출하고, reply에 무엇을 반영했는지 1문장 포함하세요.";
            }
            if ($urlCtx !== '') {
                $systemPrompt .= "\n\n[참고 URL 분석 결과] 아래 URL 콘텐츠를 분석해 브랜드/제품 톤·핵심 메시지·색감·키워드를 디자인(headline·body·palette·image_prompt)에 반영하세요:\n{$urlCtx}";
            }

            $userMsg = "대화 내용:\n{$convo}\n위 대화를 바탕으로 광고 디자인을 생성/수정하고 JSON으로 응답하세요."
                . ($cuts > 1 ? "\n이번엔 넘겨보는 캐러셀용으로 정확히 {$cuts}개의 연속 컷(designs 배열)을 만들어 주세요." : '')
                . (!empty($refImages) ? "\n첨부된 참고 이미지의 스타일·색감·분위기를 반영하세요." : '')
                . ($urlCtx !== '' ? "\n참고 URL의 내용·브랜드 톤을 반영하세요." : '');

            $hasExtra = !empty($refImages) || $urlCtx !== '' || $cuts > 1;
            $reply = null; $design = null; $frames = null; $dataSource = 'ai';
            try {
                $claude = self::callClaudeLong($systemPrompt . self::langDirective(self::reqLang($req)), $userMsg, $hasExtra ? 50 : 30, $refImages, self::tenant($req));
                $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/', '$1', $claude['text']);
                $parsed = json_decode(trim($clean ?? $claude['text']), true);
                if (is_array($parsed)) {
                    if ($cuts > 1 && !empty($parsed['designs']) && is_array($parsed['designs'])) {
                        $frames = array_values(array_filter($parsed['designs'], 'is_array'));
                        $design = $frames[0] ?? null;
                        $reply = (string)($parsed['reply'] ?? "{$cuts}컷 캐러셀을 만들었어요. 좌우로 넘겨보세요!");
                    } elseif (!empty($parsed['design'])) {
                        $design = $parsed['design'];
                        $reply = (string)($parsed['reply'] ?? '디자인을 업데이트했어요. 미리보기를 확인해 주세요!');
                    }
                }
            } catch (\Throwable $e) { $dataSource = 'fallback'; }

            if (!is_array($design)) {
                // 폴백: 마지막 사용자 메시지로 기본 디자인
                $last = '';
                foreach (array_reverse($messages) as $m) { if (($m['role'] ?? 'user') !== 'assistant') { $last = (string)($m['content'] ?? ''); break; } }
                $fb = self::fallbackAdDesigns($last, '광고', ['instagram'], '');
                $design = $curDesign ?: ($fb[0] ?? null);
                $reply = 'AI 엔진이 일시적으로 응답하지 않아 기본 디자인을 적용했어요. 다시 시도하거나 수정 요청을 입력해 주세요.';
                $dataSource = 'fallback';
            }

            $out = ['ok'=>true,'reply'=>$reply,'design'=>$design,'data_source'=>$dataSource];
            if (is_array($frames) && count($frames) > 1) $out['frames'] = $frames;
            $res->getBody()->write(json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return $res->withHeader('Content-Type','application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type','application/json')->withStatus(500);
        }
    }

    /** Claude 실패 시 카테고리·채널 기반 구조화 디자인 폴백(항상 실사용 가능한 결과 보장). */
    private static function fallbackAdDesigns(string $product, string $category, array $channels, string $feedback): array
    {
        $palettes = [
            ['bg'=>'#0f172a','primary'=>'#4f8ef7','accent'=>'#22d3ee','text'=>'#ffffff'],
            ['bg'=>'#1a1030','primary'=>'#a855f7','accent'=>'#f472b6','text'=>'#ffffff'],
            ['bg'=>'#fff7ed','primary'=>'#f97316','accent'=>'#ef4444','text'=>'#1e293b'],
            ['bg'=>'#052e2b','primary'=>'#14d9b0','accent'=>'#22c55e','text'=>'#ffffff'],
            ['bg'=>'#fef2f2','primary'=>'#e11d48','accent'=>'#fb7185','text'=>'#1e293b'],
        ];
        $meta = [
            'tiktok'    => ['format'=>'숏폼 영상','ratio'=>'9:16','mood'=>'역동적'],
            'meta'      => ['format'=>'피드 이미지','ratio'=>'1:1','mood'=>'감각적'],
            'instagram' => ['format'=>'스토리','ratio'=>'9:16','mood'=>'트렌디'],
            'kakao'     => ['format'=>'메시지 카드','ratio'=>'1:1','mood'=>'친근한'],
            'youtube'   => ['format'=>'인스트림 영상','ratio'=>'16:9','mood'=>'스토리텔링'],
        ];
        $short = mb_substr($product, 0, 14);
        $out = []; $i = 0;
        foreach ($channels as $ch) {
            $ch = (string)$ch; $m = $meta[$ch] ?? ['format'=>'이미지','ratio'=>'1:1','mood'=>'모던'];
            $p = $palettes[$i % count($palettes)]; $i++;
            $out[] = [
                'channel'=>$ch, 'format'=>$m['format'], 'ratio'=>$m['ratio'],
                'headline'=> $short !== '' ? $short : "{$category} 신상품",
                'subheadline'=> "{$category} 베스트셀러",
                'body'=> mb_substr($product, 0, 60),
                'cta'=> $ch==='kakao' ? '혜택 받기' : '지금 구매',
                'hashtags'=> ['#'.$category, '#'.$ch, '#추천'],
                'palette'=> $p,
                'layout'=> '상단 헤드라인 · 중앙 상품 비주얼 · 하단 CTA 버튼',
                'visual'=> "{$category} 상품을 {$m['mood']} 무드로 강조한 비주얼",
                'mood'=> $m['mood'],
            ];
        }
        return $out;
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /v422/ai/campaign-ad-render  (196차 — AI가 실제 디자인된 SVG 광고 생성)
    // 디자인 스펙 1건(채널) → Claude 가 완성 폴리시드 SVG 광고 크리에이티브 코드를 생성.
    // 외부 이미지 API 없이도 벡터 기반 실 광고 디자인(미리보기·적용). 보안 sanitize 필수.
    // ─────────────────────────────────────────────────────────────────────
    public static function campaignAdRender(Request $req, Response $res): Response
    {
        @set_time_limit(75); // 프리미엄 SVG 생성 Claude 호출(최대 50초) 동안 PHP max_execution_time 초과 방지
        try {
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
            $data    = $body['data'] ?? $body;
            $product = trim((string)($data['product_description'] ?? ''));
            $design  = is_array($data['design'] ?? null) ? $data['design'] : [];
            $feedback= trim((string)($data['feedback'] ?? ''));
            $renderType = (string)($data['render_type'] ?? $design['render_type'] ?? 'svg'); // svg|animated|chart
            $channel = (string)($design['channel'] ?? 'meta');
            $ratio   = (string)($design['ratio'] ?? '1:1');
            // viewBox 규격
            $dims = ['9:16'=>[1080,1920],'1:1'=>[1080,1080],'4:5'=>[1080,1350],'16:9'=>[1920,1080]];
            [$w,$h] = $dims[$ratio] ?? [1080,1080];
            $pal = json_encode($design['palette'] ?? ['bg'=>'#0f172a','primary'=>'#4f8ef7','accent'=>'#22d3ee','text'=>'#ffffff'], JSON_UNESCAPED_UNICODE);
            $specJson = json_encode([
                'channel'=>$channel,'headline'=>$design['headline']??'','subheadline'=>$design['subheadline']??'',
                'body'=>$design['body']??'','cta'=>$design['cta']??'','mood'=>$design['mood']??'','layout'=>$design['layout']??'',
            ], JSON_UNESCAPED_UNICODE);
            $fbLine = $feedback !== '' ? "수정 요청(반드시 반영): {$feedback}\n" : '';
            $typeInstr = '';
            if ($renderType === 'animated') {
                $typeInstr = "[★애니메이션 모드 — 반드시 SMIL 애니메이션 포함]\n"
                  . "- <animate>·<animateTransform>·<animateMotion> 으로 생동감을 부여하세요.\n"
                  . "- 입장: 헤드라인 fade+slide-in(opacity 0→1, y 이동), CTA scale-in(begin 지연). 강조: 은은한 pulse/glow, 그라데이션 shimmer(animateTransform translate). 앰비언트: 장식 도형 회전/부유(repeatCount='indefinite').\n"
                  . "- dur 1~3s, 자연스럽고 고급스럽게(과한 깜빡임 금지). SMIL이 SVG 내부에서 실제 동작해야 함.\n";
            } elseif ($renderType === 'chart') {
                $typeInstr = "[★그래프/차트 모드 — 데이터 시각화 광고]\n"
                  . "- 막대/선/도넛/영역 차트를 SVG로 정밀하게(축·격자·레이블·범례, 막대/선/호 정확). 수치는 광고 맥락에 맞게 임팩트 있는 예시값.\n"
                  . "- 헤드라인 + 핵심 지표(예: '매출 +247%')를 차트와 함께 배치. 차트 색은 팔레트 기반·고가독.\n";
            }
            $systemPrompt = <<<PROMPT
당신은 Apple·Nike·삼성·샤넬 광고를 디자인하는 세계 최정상 아트디렉터이자 SVG 마스터입니다.
주어진 스펙으로 즉시 게재 가능한 럭셔리 브랜드급 광고 크리에이티브를 순수 SVG로 디자인합니다. 밋밋하거나 빈약한 결과는 절대 금지 — 초프리미엄 완성도를 목표로 합니다.

[디자인 품질 — 초프리미엄/SaaS 엔터프라이즈급]
1. 깊이감: <defs>의 linearGradient·radialGradient 를 2~3개 이상 다층 사용. feGaussianBlur 필터로 부드러운 그림자·글로우. 반투명 도형 겹침으로 입체감.
2. 레이아웃: 넉넉한 여백과 시각적 균형(황금비 감각). 명확한 위계 — 헤드라인(초대형, font-weight 800~900) > 서브헤드라인 > 본문 > CTA.
3. 장식: 무드에 맞는 세련된 추상 요소(blob·원호·라인·기하 패턴·점선)를 배경에 은은하게 배치. 고급스럽고 과하지 않게.
4. CTA: 입체적인 버튼(그라데이션 + 미세 그림자/하이라이트 + 둥근 모서리)으로 시선 집중.
5. 타이포: 큰 폰트 크기 대비, 적절한 letter-spacing, 헤드라인에 포인트 컬러·굵기 강조.
6. 색: 팔레트 기반 + 톤온톤/보색 악센트. 럭셔리=딥톤+골드/메탈릭, 역동=비비드 그라데이션.

[기술 규칙]
- viewBox="0 0 {$w} {$h}" (채널 규격 준수). <defs>에 gradient·filter 정의 후 재사용.
- 텍스트는 배경 대비 반드시 가독. font-family 'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif.
- 외부 리소스(image href·외부폰트·script) 절대 금지. <script>·on*=·foreignObject 금지. 순수 벡터/텍스트만.
- ★반드시 닫는 </svg> 까지 완결(전체 5000자 이내로 압축하되 품질 유지). 출력은 오직 <svg>...</svg> 코드만(설명·마크다운·코드펜스 금지).
{$typeInstr}{$fbLine}
PROMPT;
            $userMsg = "상품: {$product}\n디자인 스펙: {$specJson}\n팔레트: {$pal}\n\n이 광고의 완성 SVG를 디자인하세요. 닫는 </svg> 까지 반드시 완결하세요.";

            $svg = null; $dataSource = 'ai';
            try {
                $claude = self::callClaudeLong($systemPrompt, $userMsg, 50, [], self::tenant($req)); // 프리미엄 SVG 생성 → 50초
                $svg = self::extractSvg($claude['text']);
            } catch (\Throwable $e) { $dataSource = 'fallback'; }
            if (!$svg) { $svg = self::fallbackSvg($design, $w, $h); $dataSource = 'fallback'; }
            $svg = self::sanitizeSvg($svg);

            $res->getBody()->write(json_encode(['ok'=>true,'svg'=>$svg,'width'=>$w,'height'=>$h,'data_source'=>$dataSource], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return $res->withHeader('Content-Type','application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type','application/json')->withStatus(500);
        }
    }

    /** 호스트 SSRF 안전성 검사 — http/https + 사설/루프백/링크로컬/메타데이터 IP 차단. */
    private static function urlSafe(string $url): bool {
        if (!preg_match('#^https?://#i', $url)) return false;
        $host = strtolower((string)(parse_url($url, PHP_URL_HOST) ?? ''));
        if ($host === '' || $host === 'localhost' || str_ends_with($host, '.localhost') || str_ends_with($host, '.internal') || str_ends_with($host, '.local')) return false;
        // 호스트가 IP면 직접, 아니면 DNS 해석 후 사설/예약 대역 차단
        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) $ips[] = $host;
        else { $r = @gethostbynamel($host); if (is_array($r)) $ips = $r; }
        foreach ($ips as $ip) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
            if ($ip === '169.254.169.254') return false; // 클라우드 메타데이터
        }
        return !empty($ips);
    }

    /** 196차++ #5 URL 참고: 페이지를 서버에서 안전하게 가져와 제목/설명/헤딩/본문/og:image 추출. */
    private static function fetchUrlContext(string $url): array {
        $url = trim($url);
        if (!self::urlSafe($url)) return ['summary' => '', 'image' => null];
        $scheme = (string)(parse_url($url, PHP_URL_SCHEME) ?? 'https');
        $host   = (string)(parse_url($url, PHP_URL_HOST) ?? '');
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3,
            CURLOPT_TIMEOUT => 9, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; GeniegoROI-AIDesign/1.0)',
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        ]);
        $html = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if (!$html || $status >= 400) return ['summary' => '', 'image' => null];
        $html = substr($html, 0, 600000);
        $title = ''; $desc = ''; $og = ''; $heads = [];
        if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $m)) $title = trim(html_entity_decode(strip_tags($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if (preg_match('/<meta[^>]+(?:name|property)=["\'](?:description|og:description)["\'][^>]*\bcontent=["\']([^"\']+)/i', $html, $m)) $desc = trim(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if (preg_match('/<meta[^>]+property=["\']og:image["\'][^>]*\bcontent=["\']([^"\']+)/i', $html, $m)) $og = trim($m[1]);
        if (preg_match_all('/<h[12][^>]*>(.*?)<\/h[12]>/is', $html, $mm)) { foreach (array_slice($mm[1], 0, 6) as $h) { $h = trim(html_entity_decode(strip_tags($h), ENT_QUOTES | ENT_HTML5, 'UTF-8')); if ($h !== '') $heads[] = mb_substr($h, 0, 80); } }
        $text = preg_replace('/<(script|style|noscript)[^>]*>.*?<\/\1>/is', ' ', $html);
        $text = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags((string)$text), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
        $text = mb_substr($text, 0, 1400);
        $summary = "URL: {$url}\n제목: {$title}\n설명: {$desc}\n주요 헤딩: " . implode(' | ', $heads) . "\n본문 발췌: {$text}";
        // og:image → data URI(비전 참고). 절대/프로토콜상대/루트상대 보정 + SSRF 재검사.
        $imgUri = null;
        if ($og !== '') {
            if (strpos($og, '//') === 0) $og = $scheme . ':' . $og;
            elseif (isset($og[0]) && $og[0] === '/') $og = $scheme . '://' . $host . $og;
            if (self::urlSafe($og)) {
                $ich = curl_init($og);
                curl_setopt_array($ich, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 2,
                    CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; GeniegoROI-AIDesign/1.0)',
                    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS]);
                $raw = curl_exec($ich); $ct = (string)curl_getinfo($ich, CURLINFO_CONTENT_TYPE); $ist = curl_getinfo($ich, CURLINFO_HTTP_CODE); curl_close($ich);
                if ($raw && $ist < 400 && preg_match('#^image/(png|jpe?g|gif|webp)#i', $ct) && strlen($raw) < 4500000) {
                    $mt = strtolower(trim(explode(';', $ct)[0])); if ($mt === 'image/jpg') $mt = 'image/jpeg';
                    $imgUri = 'data:' . $mt . ';base64,' . base64_encode($raw);
                }
            }
        }
        return ['summary' => $summary, 'image' => $imgUri];
    }

    /** SVG 생성은 토큰·시간이 더 필요 → max_tokens 상향 + 타임아웃 여유.
     *  $images: data URI(예: "data:image/png;base64,....") 배열 → Claude 비전 멀티모달 입력(참고 이미지). */
    private static function callClaudeLong(string $systemPrompt, string $userMsg, int $timeout = 22, array $images = [], string $tenant = ''): array {
        $content = $userMsg;
        if (!empty($images)) {
            $blocks = [];
            foreach (array_slice($images, 0, 4) as $img) {
                if (preg_match('#^data:(image/(?:png|jpeg|jpg|gif|webp));base64,(.+)$#is', (string)$img, $mm)) {
                    $mt = strtolower($mm[1]) === 'image/jpg' ? 'image/jpeg' : strtolower($mm[1]);
                    $blocks[] = ['type'=>'image','source'=>['type'=>'base64','media_type'=>$mt,'data'=>$mm[2]]];
                }
            }
            if (!empty($blocks)) { $blocks[] = ['type'=>'text','text'=>$userMsg]; $content = $blocks; }
        }
        // [289차 후속] 전송·quota·감사 gateway() 일원화.
        //   ★이 경로만 max_tokens=8192 · system=평문 문자열 · connect_timeout=6 이다(비전 멀티모달·장문).
        //     게이트웨이가 임의 통일하지 않도록 페이로드를 그대로 넘긴다(무회귀).
        $r = self::gateway(['model'=>self::MODEL,'max_tokens'=>8192,'system'=>$systemPrompt,'messages'=>[['role'=>'user','content'=>$content]]],
            ['tenant'=>$tenant, 'op'=>'long', 'timeout'=>$timeout, 'connect_timeout'=>6]);
        if ($r['err'] !== '') throw new \RuntimeException('curl error: '.$r['err']);
        $resp = $r['json'];
        if ($r['status'] !== 200 || !isset($resp['content'][0]['text'])) throw new \RuntimeException('Claude error '.$r['status']);
        return ['text'=>$resp['content'][0]['text']];
    }

    private static function extractSvg(string $text): ?string {
        if (preg_match('/<svg[\s\S]*<\/svg>/i', $text, $m)) return $m[0];
        return null;
    }

    /** SVG 보안 정화: script/이벤트핸들러/외부참조/foreignObject 제거(XSS 차단). */
    private static function sanitizeSvg(string $svg): string {
        $svg = preg_replace('/<script[\s\S]*?<\/script>/i', '', $svg);
        $svg = preg_replace('/<foreignObject[\s\S]*?<\/foreignObject>/i', '', $svg);
        $svg = preg_replace('/\son[a-z]+\s*=\s*"[^"]*"/i', '', $svg);
        $svg = preg_replace("/\son[a-z]+\s*=\s*'[^']*'/i", '', $svg);
        // 외부 리소스(href/xlink:href 의 http/javascript) 제거
        $svg = preg_replace('/(?:xlink:)?href\s*=\s*"(?:https?:|javascript:|data:text\/html)[^"]*"/i', '', $svg);
        $svg = preg_replace('/<!ENTITY[\s\S]*?>/i', '', $svg);
        return trim($svg);
    }

    private static function fallbackSvg(array $d, int $w, int $h): string {
        $p = $d['palette'] ?? ['bg'=>'#0f172a','primary'=>'#4f8ef7','accent'=>'#22d3ee','text'=>'#ffffff'];
        $bg=$p['bg']??'#0f172a'; $pr=$p['primary']??'#4f8ef7'; $ac=$p['accent']??'#22d3ee'; $tx=$p['text']??'#ffffff';
        $head = htmlspecialchars(mb_substr((string)($d['headline']??'신상품 출시'),0,16), ENT_QUOTES);
        $sub  = htmlspecialchars(mb_substr((string)($d['subheadline']??''),0,24), ENT_QUOTES);
        $cta  = htmlspecialchars(mb_substr((string)($d['cta']??'지금 구매'),0,12), ENT_QUOTES);
        $cx=$w/2; $hy=$h*0.42; $sy=$h*0.52; $by=$h*0.72; $fs=intval($w*0.085); $sfs=intval($w*0.04);
        $bw=$w*0.5; $bx=$cx-$bw/2; $bh=$h*0.08;
        return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {$w} {$h}'>"
          ."<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='{$bg}'/><stop offset='1' stop-color='{$pr}'/></linearGradient></defs>"
          ."<rect width='{$w}' height='{$h}' fill='url(#g)'/>"
          ."<circle cx='".($w*0.85)."' cy='".($h*0.18)."' r='".($w*0.22)."' fill='{$ac}' opacity='0.25'/>"
          ."<text x='{$cx}' y='{$hy}' font-family='Pretendard,Apple SD Gothic Neo,Noto Sans KR,sans-serif' font-size='{$fs}' font-weight='800' fill='{$tx}' text-anchor='middle'>{$head}</text>"
          ."<text x='{$cx}' y='{$sy}' font-family='Pretendard,sans-serif' font-size='{$sfs}' fill='{$tx}' opacity='0.85' text-anchor='middle'>{$sub}</text>"
          ."<rect x='{$bx}' y='{$by}' width='{$bw}' height='{$bh}' rx='".($bh/2)."' fill='{$ac}'/>"
          ."<text x='{$cx}' y='".($by+$bh*0.66)."' font-family='Pretendard,sans-serif' font-size='".intval($w*0.038)."' font-weight='700' fill='{$bg}' text-anchor='middle'>{$cta}</text>"
          ."</svg>";
    }

    /**
     * [237차 Creative AI Studio] 재사용 가능한 이미지 생성 — imgGenConfig + imgGenOpenAI/Stability + 공용키 quota.
     *   campaignAdImage 핸들러의 코어를 추출(중복0). CreativeStudio 대량 변형 생성이 직접 호출한다.
     *   반환: ['ok'=>bool, 'image'=>base64 data-URI, 'provider'=>str] | ['ok'=>false, 'error'/'configured'/'quota'].
     */
    public static function generateImage(string $tenant, string $prompt, string $ratio = '1:1'): array
    {
        $prompt = trim($prompt);
        if ($prompt === '') return ['ok' => false, 'error' => 'empty_prompt'];
        $cfg = self::imgGenConfig($tenant);
        if (strlen((string)$cfg['key']) < 10) return ['ok' => false, 'configured' => false, 'error' => 'image_api_not_configured'];
        $usingGlobal = self::usingGlobalKey($cfg['key'], self::imgGenConfig(''));
        if ($usingGlobal && ($qErr = self::quotaGate($tenant, 'image')) !== null) return ['ok' => false, 'quota' => true, 'error' => $qErr];
        $full = $prompt . ". Premium advertising background visual, high-end commercial photography, cinematic lighting, no text, no words, no letters, clean composition with empty space for overlay.";
        try {
            $img = ($cfg['provider'] === 'stability') ? self::imgGenStability($cfg['key'], $full, $ratio) : self::imgGenOpenAI($cfg['key'], $full, $ratio);
        } catch (\Throwable $e) { return ['ok' => false, 'error' => 'imggen_failed:' . $e->getMessage()]; }
        if ($usingGlobal) self::quotaConsume($tenant, 'image');
        return ['ok' => true, 'image' => $img, 'provider' => $cfg['provider']];
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /v422/ai/campaign-ad-image  (196차 — 실사 이미지 생성: DALL·E 3 등)
    // 이미지 생성 프롬프트 → 외부 이미지 생성 API → base64 이미지(광고 배경/비주얼).
    // 관리자가 imggen_api_key 등록 시 활성(미설정 시 configured:false 안내).
    // ─────────────────────────────────────────────────────────────────────
    public static function campaignAdImage(Request $req, Response $res): Response
    {
        @set_time_limit(75);
        try {
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
            $data   = $body['data'] ?? $body;
            $prompt = trim((string)($data['prompt'] ?? $data['image_prompt'] ?? ''));
            $ratio  = (string)($data['ratio'] ?? '1:1');
            if ($prompt === '') {
                $res->getBody()->write(json_encode(['ok'=>false,'error'=>'이미지 생성 프롬프트가 필요합니다.'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(422);
            }
            $tenant = self::tenant($req);
            $cfg = self::imgGenConfig($tenant);
            if (strlen($cfg['key']) < 10) {
                $res->getBody()->write(json_encode(['ok'=>false,'configured'=>false,'error'=>'실사 이미지 생성 API가 설정되지 않았습니다. [AI 광고 디자인 > API 연동]에서 본인 이미지 생성 API 키를 등록하세요(관리자 전역 설정도 가능).'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(200);
            }
            // [225차 P1-4] 전역 공용 키 사용 시(BYO 아님)만 일일 quota 강제 — 공용 DALL·E/Stability 비용남용 차단.
            $usingGlobal = self::usingGlobalKey($cfg['key'], self::imgGenConfig(''));
            if ($usingGlobal && ($qErr = self::quotaGate($tenant, 'image')) !== null) {
                $res->getBody()->write(json_encode(['ok'=>false,'error'=>$qErr,'quota'=>true], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(429);
            }
            // 텍스트 없는 광고 배경/비주얼로 유도(텍스트는 디자인에서 오버레이)
            $fullPrompt = $prompt . ". Premium advertising background visual, high-end commercial photography, cinematic lighting, no text, no words, no letters, clean composition with empty space for overlay.";

            try {
                if ($cfg['provider'] === 'stability') {
                    $img = self::imgGenStability($cfg['key'], $fullPrompt, $ratio);
                } else {
                    $img = self::imgGenOpenAI($cfg['key'], $fullPrompt, $ratio);
                }
            } catch (\Throwable $e) {
                $res->getBody()->write(json_encode(['ok'=>false,'error'=>'이미지 생성 실패: '.$e->getMessage()], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(502);
            }
            if ($usingGlobal) self::quotaConsume($tenant, 'image'); // [225차 P1-4] 공용 키 생성 1건 누적
            $res->getBody()->write(json_encode(['ok'=>true,'image'=>$img,'provider'=>$cfg['provider']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return $res->withHeader('Content-Type','application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type','application/json')->withStatus(500);
        }
    }

    /** OpenAI DALL·E 3 → base64 data URI. */
    private static function imgGenOpenAI(string $key, string $prompt, string $ratio): string
    {
        $size = ($ratio === '9:16' || $ratio === '4:5') ? '1024x1792' : (($ratio === '16:9') ? '1792x1024' : '1024x1024');
        $payload = json_encode(['model'=>'dall-e-3','prompt'=>mb_substr($prompt,0,3900),'n'=>1,'size'=>$size,'quality'=>'hd','response_format'=>'b64_json'], JSON_UNESCAPED_UNICODE);
        $ch = curl_init('https://api.openai.com/v1/images/generations');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$payload,CURLOPT_TIMEOUT=>60,CURLOPT_CONNECTTIMEOUT=>6,
            CURLOPT_HTTPHEADER=>['Content-Type: application/json','Authorization: Bearer '.$key]]);
        $raw = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
        if ($err) throw new \RuntimeException('curl: '.$err);
        $j = json_decode($raw, true);
        if ($status !== 200 || empty($j['data'][0]['b64_json'])) {
            throw new \RuntimeException(($j['error']['message'] ?? ('OpenAI error '.$status)));
        }
        return 'data:image/png;base64,' . $j['data'][0]['b64_json'];
    }

    /** Stability AI(Stable Diffusion) → base64 data URI. */
    private static function imgGenStability(string $key, string $prompt, string $ratio): string
    {
        $ar = ($ratio === '9:16') ? '9:16' : (($ratio === '4:5') ? '4:5' : (($ratio === '16:9') ? '16:9' : '1:1'));
        $boundary = '----geniego'.bin2hex(random_bytes(8));
        $parts = '';
        foreach (['prompt'=>mb_substr($prompt,0,1900),'aspect_ratio'=>$ar,'output_format'=>'png'] as $k=>$v) {
            $parts .= "--{$boundary}\r\nContent-Disposition: form-data; name=\"{$k}\"\r\n\r\n{$v}\r\n";
        }
        $parts .= "--{$boundary}--\r\n";
        $ch = curl_init('https://api.stability.ai/v2beta/stable-image/generate/core');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$parts,CURLOPT_TIMEOUT=>60,CURLOPT_CONNECTTIMEOUT=>6,
            CURLOPT_HTTPHEADER=>['Content-Type: multipart/form-data; boundary='.$boundary,'Authorization: Bearer '.$key,'Accept: image/*']]);
        $raw = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
        if ($err) throw new \RuntimeException('curl: '.$err);
        if ($status !== 200) { $j = json_decode($raw, true); throw new \RuntimeException($j['errors'][0] ?? ('Stability error '.$status)); }
        return 'data:image/png;base64,' . base64_encode($raw);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 동영상 생성 (196차) — 비동기 job 생성 + 상태 폴링(영상은 수 분 소요).
    // POST /v422/ai/campaign-ad-video        → {job_id, status:'processing'}
    // GET  /v422/ai/campaign-ad-video-status → {status, video_url}
    // Replicate prediction API(영상 모델). 관리자가 videogen_api_key 등록 시 활성.
    // ─────────────────────────────────────────────────────────────────────
    public static function campaignAdVideo(Request $req, Response $res): Response
    {
        @set_time_limit(40);
        try {
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
            $data = $body['data'] ?? $body;
            $prompt = trim((string)($data['prompt'] ?? $data['video_prompt'] ?? $data['image_prompt'] ?? ''));
            if ($prompt === '') {
                $res->getBody()->write(json_encode(['ok'=>false,'error'=>'동영상 생성 프롬프트가 필요합니다.'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(422);
            }
            $tenant = self::tenant($req);
            $cfg = self::videoGenConfig($tenant);
            if (strlen($cfg['key']) < 10) {
                $res->getBody()->write(json_encode(['ok'=>false,'configured'=>false,'error'=>'AI 동영상 생성 API가 설정되지 않았습니다. 관리자 설정에서 동영상 생성 API 키를 등록하세요.'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(200);
            }
            // [225차 P1-4] 전역 공용 키 사용 시(BYO 아님)만 일일 quota 강제 — 공용 Replicate 비용남용 차단.
            $usingGlobal = self::usingGlobalKey($cfg['key'], self::videoGenConfig(''));
            if ($usingGlobal && ($qErr = self::quotaGate($tenant, 'image')) !== null) {
                $res->getBody()->write(json_encode(['ok'=>false,'error'=>$qErr,'quota'=>true], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(429);
            }
            $fullPrompt = $prompt . ", cinematic advertising video, premium commercial, smooth camera motion, high quality";
            // Replicate prediction 생성
            $model = $cfg['model'] !== '' ? $cfg['model'] : 'minimax/video-01'; // 관리자 미지정 시 기본 모델
            $payload = json_encode(['input'=>['prompt'=>mb_substr($fullPrompt,0,1400)]], JSON_UNESCAPED_UNICODE);
            $url = (strpos($model, '/') !== false && strpos($model, ':') === false)
                ? "https://api.replicate.com/v1/models/{$model}/predictions"   // owner/name → 최신 버전
                : 'https://api.replicate.com/v1/predictions';
            if ($url === 'https://api.replicate.com/v1/predictions') { $payload = json_encode(['version'=>$model,'input'=>['prompt'=>mb_substr($fullPrompt,0,1400)]], JSON_UNESCAPED_UNICODE); }
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$payload,CURLOPT_TIMEOUT=>30,CURLOPT_CONNECTTIMEOUT=>6,
                CURLOPT_HTTPHEADER=>['Content-Type: application/json','Authorization: Bearer '.$cfg['key'],'Prefer: respond-async']]);
            $raw = curl_exec($ch); $st = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
            if ($err) { $res->getBody()->write(json_encode(['ok'=>false,'error'=>'동영상 생성 요청 실패: '.$err], JSON_UNESCAPED_UNICODE)); return $res->withHeader('Content-Type','application/json')->withStatus(502); }
            $j = json_decode($raw, true);
            if (($st !== 200 && $st !== 201) || empty($j['id'])) {
                $msg = $j['detail'] ?? $j['error'] ?? ('Replicate error '.$st);
                $res->getBody()->write(json_encode(['ok'=>false,'error'=>'동영상 생성 실패: '.$msg], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(502);
            }
            if ($usingGlobal) self::quotaConsume($tenant, 'image'); // [225차 P1-4] 공용 키 영상 1건 누적
            $res->getBody()->write(json_encode(['ok'=>true,'job_id'=>$j['id'],'status'=>($j['status']??'processing')], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type','application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type','application/json')->withStatus(500);
        }
    }

    /** GET /v422/ai/campaign-ad-video-status?job_id=X — 동영상 생성 상태 폴링. */
    public static function campaignAdVideoStatus(Request $req, Response $res): Response
    {
        try {
            $jobId = trim((string)($req->getQueryParams()['job_id'] ?? ''));
            if ($jobId === '') { $res->getBody()->write(json_encode(['ok'=>false,'error'=>'job_id가 필요합니다.'], JSON_UNESCAPED_UNICODE)); return $res->withHeader('Content-Type','application/json')->withStatus(422); }
            $cfg = self::videoGenConfig(self::tenant($req));
            if (strlen($cfg['key']) < 10) { $res->getBody()->write(json_encode(['ok'=>false,'configured'=>false], JSON_UNESCAPED_UNICODE)); return $res->withHeader('Content-Type','application/json'); }
            $ch = curl_init('https://api.replicate.com/v1/predictions/'.rawurlencode($jobId));
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15,CURLOPT_CONNECTTIMEOUT=>6,
                CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$cfg['key']]]);
            $raw = curl_exec($ch); $err = curl_error($ch); curl_close($ch);
            if ($err) { $res->getBody()->write(json_encode(['ok'=>false,'error'=>$err], JSON_UNESCAPED_UNICODE)); return $res->withHeader('Content-Type','application/json')->withStatus(502); }
            $j = json_decode($raw, true);
            $status = (string)($j['status'] ?? 'unknown'); // starting|processing|succeeded|failed|canceled
            $out = $j['output'] ?? null;
            $videoUrl = is_array($out) ? (string)($out[0] ?? '') : (string)($out ?? '');
            $res->getBody()->write(json_encode(['ok'=>true,'status'=>$status,'video_url'=>$videoUrl,'error'=>$j['error']??null], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return $res->withHeader('Content-Type','application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type','application/json')->withStatus(500);
        }
    }

    /** 196차 — 승인 디자인 저장 테이블(테넌트 스코프). Phase 2 캠페인 자동실행이 소비. */
    /** [251차] public — AdminGrowth(플랫폼 성장)가 platform_growth 소재 저장 시 동일 ad_design 스키마 재사용(중복0). */
    public static function migrateAdDesign(PDO $pdo): void {
        $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $auto = $isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
        $txt  = $isSqlite ? 'TEXT' : 'MEDIUMTEXT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS ad_design (
                id $auto,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'unknown',
                category VARCHAR(120),
                product TEXT,
                channel VARCHAR(40),
                spec_json $txt,
                svg $txt,
                status VARCHAR(20) NOT NULL DEFAULT 'approved',
                created_at VARCHAR(32) NOT NULL
            )" . ($isSqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'));
        } catch (\Throwable $e) {}
        // [현 차수] 채널별 기간 등록 — 기존 테이블에 기간 컬럼 idempotent 보강(YYYY-MM-DD).
        foreach ([
            "ALTER TABLE ad_design ADD COLUMN period_start VARCHAR(10) NULL",
            "ALTER TABLE ad_design ADD COLUMN period_end VARCHAR(10) NULL",
        ] as $sql) { try { $pdo->exec($sql); } catch (\Throwable $e) {} }
    }

    /** POST /v422/ai/ad-design/save — 미리보기 만족 시 '적용'(저장). 인증 테넌트 필요. */
    public static function adDesignSave(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            if ($tenant === 'unknown') {
                $res->getBody()->write(json_encode(['ok'=>false,'error'=>'로그인이 필요합니다.'], JSON_UNESCAPED_UNICODE));
                return $res->withHeader('Content-Type','application/json')->withStatus(401);
            }
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
            $data = $body['data'] ?? $body;
            $design = is_array($data['design'] ?? null) ? $data['design'] : [];
            $status = (string)($data['status'] ?? 'approved');
            if (!in_array($status, ['draft', 'approved'], true)) $status = 'approved';
            $pdo = Db::pdo(); self::migrateAdDesign($pdo);
            // [251차] ★광고디자인(이미지=svg base64 서버저장) 저장 한도 강제 — 상품·이미지 호스팅과 일원화(유효 상품한도=디자인한도).
            //   초과 시 402 + 추가팩 옵션/거부. 무제한 플랜은 통과. AI 광고이미지가 곧 ad_design 이므로 이미지도 함께 통제.
            $dov = \Genie\PlanLimits::adDesignOverage($pdo, $tenant, \Genie\PlanLimits::adDesignCount($pdo, $tenant));
            if ($dov !== null) { $res->getBody()->write(json_encode($dov, JSON_UNESCAPED_UNICODE)); return $res->withHeader('Content-Type','application/json')->withStatus(402); }
            $now = gmdate('Y-m-d\TH:i:s\Z');
            // [현 차수] 채널별 기간 등록 — 기간(YYYY-MM-DD) 정규화(미입력 허용).
            $normDate = function ($v) {
                $s = trim((string)$v);
                return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) ? $s : null;
            };
            $periodStart = $normDate($data['period_start'] ?? ($design['period_start'] ?? ''));
            $periodEnd   = $normDate($data['period_end'] ?? ($design['period_end'] ?? ''));
            $st = $pdo->prepare('INSERT INTO ad_design(tenant_id,category,product,channel,spec_json,svg,status,created_at,period_start,period_end) VALUES(?,?,?,?,?,?,?,?,?,?)');
            $st->execute([
                $tenant,
                mb_substr((string)($data['category'] ?? ''),0,120),
                mb_substr((string)($data['product_description'] ?? ''),0,2000),
                (string)($design['channel'] ?? ''),
                json_encode($design, JSON_UNESCAPED_UNICODE),
                self::stripActiveSvg((string)($data['svg'] ?? $data['image'] ?? '')),
                $status, $now, $periodStart, $periodEnd,
            ]);
            $msg = $status === 'draft'
                ? '임시저장되었습니다. 저장 디자인 목록에서 이어서 편집하거나 적용할 수 있습니다.'
                : '디자인이 저장(적용)되었습니다. 캠페인 자동화에서 활용할 수 있습니다.';
            $res->getBody()->write(json_encode(['ok'=>true,'id'=>(int)$pdo->lastInsertId(),'status'=>$status,'message'=>$msg], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type','application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type','application/json')->withStatus(500);
        }
    }

    /** GET /v422/ai/ad-design/list — 본 테넌트 저장 디자인 목록(최신순). */
    public static function adDesignList(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            $pdo = Db::pdo(); self::migrateAdDesign($pdo);
            $rows = [];
            if ($tenant !== 'unknown') {
                // [현 차수] 선택적 채널 필터(?channel=meta_feed 등) — 채널별 광고물 조회.
                $qp = (array)($req->getQueryParams() ?? []);
                $chFilter = trim((string)($qp['channel'] ?? ''));
                $sql = 'SELECT id,category,product,channel,spec_json,svg,status,created_at,period_start,period_end FROM ad_design WHERE tenant_id=?';
                $args = [$tenant];
                if ($chFilter !== '') { $sql .= ' AND channel=?'; $args[] = $chFilter; }
                $sql .= ' ORDER BY id DESC LIMIT 120';
                $st = $pdo->prepare($sql);
                $st->execute($args);
                foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                    $r['design'] = json_decode((string)($r['spec_json'] ?? '{}'), true); unset($r['spec_json']);
                    $rows[] = $r;
                }
            }
            $res->getBody()->write(json_encode(['ok'=>true,'designs'=>$rows], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return $res->withHeader('Content-Type','application/json');
        } catch (\Throwable $e) {
            $res->getBody()->write(json_encode(['ok'=>false,'error'=>$e->getMessage(),'designs'=>[]], JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type','application/json');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 내장 마케팅 전문가 지식 베이스 (Claude API 실패 시 폴백)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * 카테고리별 채널 마케팅 전문가 데이터
     * 각 항목: [channel_id, channel_name, score, budget_pct, roas, cpa, ad_type, ad_format, targeting, key_metric, tips[], keywords[]]
     */
    private static function getChannelKnowledgeBase(): array {
        return [
            'beauty' => [
                'channels' => [
                    ['id'=>'instagram','name'=>'Instagram','score'=>95,'pct'=>30,'roas'=>'4.2x','cpa'=>'₩18,000','type'=>'이미지/릴스 광고','format'=>'스토리·피드','target'=>'18-35세 여성, 뷰티 관심사, 스킨케어·메이크업 팔로워','metric'=>'전환율·ROAS','tips'=>['비포·애프터 콘텐츠로 효과 극대화','인플루언서 협업 UGC 활용','쇼핑 태그 연동으로 즉시 구매 유도'],'keywords'=>['스킨케어','뷰티','화장품','피부 미백']],
                    ['id'=>'tiktok','name'=>'TikTok','score'=>90,'pct'=>25,'roas'=>'3.8x','cpa'=>'₩15,000','type'=>'숏폼 동영상','format'=>'인피드·탑뷰','target'=>'16-28세 Z세대, 뷰티 챌린지 참여자','metric'=>'조회수·클릭률','tips'=>['15초 이내 강렬한 효과 시연','#뷰티챌린지 해시태그 활용','DM 전환 유도 CTA 삽입'],'keywords'=>['뷰티 추천','화장품 리뷰','스킨케어 루틴']],
                    ['id'=>'naver_search','name'=>'네이버 검색광고','score'=>82,'pct'=>20,'roas'=>'3.5x','cpa'=>'₩22,000','type'=>'검색 CPC','format'=>'파워링크·쇼핑검색','target'=>'뷰티 상품 검색자, 성분·브랜드 검색','metric'=>'CTR·전환수','tips'=>['브랜드명+카테고리 키워드 필수','파워콘텐츠로 정보성 광고 운영','쇼핑 검색광고 이미지 최적화'],'keywords'=>['토너 추천','세럼 효과','선크림 추천']],
                    ['id'=>'meta','name'=>'Meta(Facebook)','score'=>75,'pct'=>15,'roas'=>'3.2x','cpa'=>'₩25,000','type'=>'다이나믹 광고','format'=>'피드·메신저','target'=>'25-44세 여성, 구매 의도 높은 Lookalike','metric'=>'구매전환·CPA','tips'=>['동적 카탈로그 광고로 개인화','리타겟팅 필수(장바구니 이탈)','UGC·리뷰 이미지 활용'],'keywords'=>['화장품 추천','뷰티 세일']],
                    ['id'=>'youtube','name'=>'YouTube','score'=>68,'pct'=>10,'roas'=>'2.8x','cpa'=>'₩30,000','type'=>'인스트림·범퍼','format'=>'스킵형 15/30초','target'=>'뷰티 관련 콘텐츠 시청자','metric'=>'조회율·브랜드 인지도','tips'=>['5초 내 핵심 훅 제시','튜토리얼 형식으로 효과 시연','유명 뷰티 채널 스폰서십 연계'],'keywords'=>['화장품 리뷰','뷰티 하울','스킨케어 루틴']],
                ],
                'a_s_ratio' => 20, 'label' => '뷰티·코스메틱', 'strategy_tip' => '비주얼 임팩트와 인플루언서 신뢰도 활용, 체험·리뷰 콘텐츠로 구매 전환 극대화',
            ],
            'fashion' => [
                'channels' => [
                    ['id'=>'instagram','name'=>'Instagram','score'=>92,'pct'=>35,'roas'=>'3.9x','cpa'=>'₩20,000','type'=>'이미지/릴스','format'=>'피드·스토리·쇼핑','target'=>'18-39세 패션 관심층, 스타일링 팔로워','metric'=>'전환율·ROAS','tips'=>['시즌별 룩북 콘텐츠 제작','인스타그램 쇼핑 기능 적극 활용','트렌드 해시태그 일 2-3개 삽입'],'keywords'=>['OOD','패션 코디','스타일링']],
                    ['id'=>'meta','name'=>'Meta','score'=>80,'pct'=>25,'roas'=>'3.4x','cpa'=>'₩23,000','type'=>'다이나믹 제품광고','format'=>'카탈로그·컬렉션','target'=>'구매 이력 기반 리타겟팅','metric'=>'구매전환·CTR','tips'=>['SKU 카탈로그 자동 동기화','신상품 출시마다 컬렉션 광고 갱신','남녀 타겟 분리 운영'],'keywords'=>['패션 쇼핑','트렌드 의류']],
                    ['id'=>'naver_search','name'=>'네이버 쇼핑광고','score'=>76,'pct'=>20,'roas'=>'3.2x','cpa'=>'₩25,000','type'=>'쇼핑검색','format'=>'이미지 쇼핑검색','target'=>'스타일 검색 국내 쇼핑몰 이용자','metric'=>'노출·전환','tips'=>['상품명에 브랜드+모델명+색상 포함','UGC 리뷰 이미지 업로드','쿠폰+포인트 혜택 노출'],'keywords'=>['원피스 추천','트렌치코트','청바지 코디']],
                    ['id'=>'tiktok','name'=>'TikTok','score'=>70,'pct'=>12,'roas'=>'2.8x','cpa'=>'₩18,000','type'=>'숏폼 영상','format'=>'인피드·해시태그챌린지','target'=>'16-25세 MZ세대 패션 관심층','metric'=>'조회·공유·팔로워','tips'=>['패션 챌린지 트렌드 탑승','음악과 함께 착용 시연','10초 룩북 숏폼'],'keywords'=>['패션 하울','코디 추천']],
                    ['id'=>'kakao','name'=>'카카오 광고','score'=>62,'pct'=>8,'roas'=>'2.5x','cpa'=>'₩28,000','type'=>'카카오 비즈보드','format'=>'읽기/비즈보드','target'=>'카카오톡 사용 30-50대','metric'=>'클릭·전환','tips'=>['카카오 채널 연동 팔로워 확보','톡보드 이미지 고품질 제작','카카오쇼핑 연계'],'keywords'=>['의류 쇼핑','패션몰']],
                ],
                'a_s_ratio' => 25, 'label' => '패션·의류', 'strategy_tip' => '비주얼 중심 SNS 플랫폼 집중, 시즌·트렌드 반응 콘텐츠로 즉시 구매 유도',
            ],
            'food' => [
                'channels' => [
                    ['id'=>'naver_search','name'=>'네이버 검색광고','score'=>88,'pct'=>30,'roas'=>'4.0x','cpa'=>'₩12,000','type'=>'파워링크+쇼핑','format'=>'검색+쇼핑검색','target'=>'식품 검색 성인, 건강식품 관심층','metric'=>'CPC·전환율','tips'=>['성분·효능 키워드 우선 입찰','파워콘텐츠로 정보 제공','리뷰 별점 관리 필수'],'keywords'=>['단백질 보충제','다이어트 식품','건강식']],
                    ['id'=>'youtube','name'=>'YouTube','score'=>80,'pct'=>22,'roas'=>'3.2x','cpa'=>'₩16,000','type'=>'인스트림','format'=>'스킵형 광고','target'=>'건강·요리·다이어트 콘텐츠 시청자','metric'=>'조회율·브랜드 인지','tips'=>['전문가·영양사 출연 신뢰도 강화','레시피 형식 자연스러운 노출','건강 정보 채널 협업'],'keywords'=>['건강식품 추천','다이어트']],
                    ['id'=>'kakao','name'=>'카카오 광고','score'=>76,'pct'=>18,'roas'=>'3.0x','cpa'=>'₩14,000','type'=>'비즈보드+친구추가','format'=>'카카오채널','target'=>'30-55세 건강 관심 주부·직장인','metric'=>'채널 팔로워·주문','tips'=>['정기배송 할인 쿠폰 제공','채널에서 레시피 콘텐츠 발행','카카오쇼핑 연동'],'keywords'=>['건강식품','영양제 추천']],
                    ['id'=>'meta','name'=>'Meta','score'=>70,'pct'=>18,'roas'=>'2.8x','cpa'=>'₩18,000','type'=>'리드광고+전환','format'=>'카탈로그·리드','target'=>'건강·운동 관심 25-50대','metric'=>'리드수·CPA','tips'=>['무료샘플·체험 이벤트 광고','타겟 세분화(다이어터·운동인)','동영상 리뷰 광고 효과'],'keywords'=>['건강기능식품','다이어트 식품']],
                    ['id'=>'instagram','name'=>'Instagram','score'=>65,'pct'=>12,'roas'=>'2.6x','cpa'=>'₩20,000','type'=>'이미지/영상','format'=>'피드·스토리','target'=>'건강·다이어트 팔로워 20-40대','metric'=>'참여율·클릭','tips'=>['비포애프터 결과 이미지 강력','해시태그 식품 커뮤니티 공략','릴스로 조리/섭취 방법 시연'],'keywords'=>['건강식이요법','영양제']],
                ],
                'a_s_ratio' => 15, 'label' => '식품·건강', 'strategy_tip' => '신뢰성 콘텐츠와 전문가 추천으로 구매 장벽 낮추기, 정기구독·리뷰 전략 필수',
            ],
            'electronics' => [
                'channels' => [
                    ['id'=>'google_search','name'=>'Google 검색광고','score'=>90,'pct'=>30,'roas'=>'4.5x','cpa'=>'₩35,000','type'=>'검색 CPC','format'=>'확장 텍스트','target'=>'전자제품 비교·구매 검색자','metric'=>'CTR·전환율','tips'=>['모델명+스펙 키워드 정밀 타겟','쇼핑 캠페인 병행 운영','경쟁사 브랜드 키워드 입찰 검토'],'keywords'=>['버즈이어폰 추천','노트북 비교','스마트폰 할인']],
                    ['id'=>'naver_search','name'=>'네이버 쇼핑광고','score'=>85,'pct'=>25,'roas'=>'4.0x','cpa'=>'₩32,000','type'=>'쇼핑검색','format'=>'이미지 쇼핑','target'=>'전자제품 검색·비교 국내 소비자','metric'=>'노출수·전환','tips'=>['상품명에 정확한 모델·스펙 기재','최저가·당일배송 혜택 노출','카테고리 광고 연동'],'keywords'=>['가성비 이어폰','태블릿 추천']],
                    ['id'=>'youtube','name'=>'YouTube','score'=>78,'pct'=>20,'roas'=>'3.0x','cpa'=>'₩40,000','type'=>'인스트림·예약','format'=>'스킵형·범퍼','target'=>'IT 리뷰 채널 구독자','metric'=>'조회율·브랜드인지','tips'=>['언박싱·사용기 형식 효과적','테크 유튜버 협업 리뷰','비교 영상 스폰서십'],'keywords'=>['전자기기 리뷰','IT 제품']],
                    ['id'=>'meta','name'=>'Meta','score'=>65,'pct'=>15,'roas'=>'2.6x','cpa'=>'₩42,000','type'=>'카탈로그 광고','format'=>'다이나믹·리드','target'=>'30-50대 남성, IT 관심층','metric'=>'전환율·리드','tips'=>['할부·무이자 혜택 강조','리타겟팅(상세페이지 방문자)','전문가 추천 형식 광고'],'keywords'=>['가전제품 쇼핑']],
                    ['id'=>'blog','name'=>'블로그·커뮤니티','score'=>60,'pct'=>10,'roas'=>'2.8x','cpa'=>'₩28,000','type'=>'네이버 블로그 SEO','format'=>'정보성 콘텐츠','target'=>'구매 전 정보 탐색자','metric'=>'방문자·전환','tips'=>['비교리뷰 정보성 콘텐츠 제작','디시·클리앙 등 커뮤니티 마케팅','SEO 키워드 최적화'],'keywords'=>['전자제품 추천','스펙 비교']],
                ],
                'a_s_ratio' => 10, 'label' => '전자·IT', 'strategy_tip' => '검색 의도 기반 정밀 타겟팅, 스펙·가격 비교 콘텐츠와 리뷰 신뢰도 구축이 핵심',
            ],
            'lifestyle' => [
                'channels' => [
                    ['id'=>'naver_search','name'=>'네이버 쇼핑광고','score'=>82,'pct'=>28,'roas'=>'3.6x','cpa'=>'₩16,000','type'=>'쇼핑검색','format'=>'이미지 쇼핑','target'=>'생활용품 검색 주부·직장인','metric'=>'전환율·노출','tips'=>['시즌별 기획전 연동','리뷰 이미지 활용','번들 상품 할인 강조'],'keywords'=>['주방용품 추천','생활용품 세트']],
                    ['id'=>'kakao','name'=>'카카오 광고','score'=>76,'pct'=>22,'roas'=>'3.2x','cpa'=>'₩14,000','type'=>'비즈보드','format'=>'배너·채널','target'=>'카카오톡 30-55세 주부','metric'=>'클릭·주문','tips'=>['카카오 선물하기 연동','정기배송 구독 프로그램','채널 팔로워 쿠폰 지급'],'keywords'=>['생활용품 세일','인테리어 소품']],
                    ['id'=>'meta','name'=>'Meta','score'=>70,'pct'=>20,'roas'=>'2.9x','cpa'=>'₩18,000','type'=>'다이나믹+컬렉션','format'=>'카탈로그·컬렉션','target'=>'인테리어·라이프스타일 관심층','metric'=>'전환·CPA','tips'=>['인테리어 스타일링 이미지 고퀄리티','가족·홈리빙 라이프스타일 타겟','재구매 리타겟팅'],'keywords'=>['인테리어 쇼핑','홈데코']],
                    ['id'=>'instagram','name'=>'Instagram','score'=>65,'pct'=>18,'roas'=>'2.7x','cpa'=>'₩20,000','type'=>'이미지·릴스','format'=>'피드·스토리','target'=>'인테리어·라이프스타일 팔로워','metric'=>'참여율·클릭','tips'=>['홈스타일링 인플루언서 협업','공간 연출 이미지 컨셉 통일','릴스로 제품 사용 장면 시연'],'keywords'=>['홈인테리어','생활용품 추천']],
                    ['id'=>'blog','name'=>'블로그 SEO','score'=>58,'pct'=>12,'roas'=>'2.5x','cpa'=>'₩15,000','type'=>'정보성 콘텐츠','format'=>'네이버 블로그','target'=>'구매 전 정보 탐색자','metric'=>'방문자·전환','tips'=>['인기 상품 리뷰 콘텐츠 발행','SEO 홈인테리어 키워드 공략','상품 사용 후기 블로그 마케팅'],'keywords'=>['생활용품 리뷰','주방용품 추천']],
                ],
                'a_s_ratio' => 12, 'label' => '생활·잡화', 'strategy_tip' => '카카오·네이버 쇼핑 중심, 주부 타겟 쿠폰·정기구독 프로그램으로 LTV 극대화',
            ],
            'sports' => [
                'channels' => [
                    ['id'=>'instagram','name'=>'Instagram','score'=>88,'pct'=>30,'roas'=>'3.7x','cpa'=>'₩22,000','type'=>'이미지·릴스','format'=>'피드·스토리','target'=>'20-45세 운동 관심층, 스포츠 팔로워','metric'=>'전환율·참여율','tips'=>['운동 영상·결과 비포애프터','스포츠 인플루언서 협업','챌린지 해시태그 참여 유도'],'keywords'=>['운동용품 추천','헬스 장비']],
                    ['id'=>'youtube','name'=>'YouTube','score'=>82,'pct'=>25,'roas'=>'3.2x','cpa'=>'₩26,000','type'=>'인스트림','format'=>'스킵형·협찬','target'=>'피트니스·스포츠 채널 구독자','metric'=>'조회율·전환','tips'=>['운동 유튜버 스폰서십','사용법·훈련 영상 노출','성과 리뷰 형식 효과적'],'keywords'=>['헬스용품','운동화 추천']],
                    ['id'=>'naver_search','name'=>'네이버 쇼핑광고','score'=>76,'pct'=>20,'roas'=>'3.5x','cpa'=>'₩24,000','type'=>'쇼핑검색','format'=>'이미지 쇼핑','target'=>'스포츠용품 검색자','metric'=>'노출·전환','tips'=>['종목별 키워드 세분화','시즌 스포츠 기획전','인기 브랜드 가격비교 출연'],'keywords'=>['러닝화 추천','요가매트','헬스글러브']],
                    ['id'=>'meta','name'=>'Meta','score'=>68,'pct'=>15,'roas'=>'2.8x','cpa'=>'₩28,000','type'=>'다이나믹+리드','format'=>'카탈로그·피드','target'=>'스포츠·피트니스 관심 25-50대','metric'=>'전환·리드','tips'=>['운동 목표 달성 스토리 광고','성별·종목 세분화 타겟','리타겟팅 장바구니 이탈자'],'keywords'=>['스포츠 용품']],
                    ['id'=>'tiktok','name'=>'TikTok','score'=>62,'pct'=>10,'roas'=>'2.5x','cpa'=>'₩18,000','type'=>'숏폼','format'=>'인피드','target'=>'MZ세대 헬스·트렌드 운동','metric'=>'조회·팔로워','tips'=>['15초 워크아웃 챌린지','에너제틱한 음악과 편집','트렌드 운동 해시태그'],'keywords'=>['헬스챌린지','운동 루틴']],
                ],
                'a_s_ratio' => 18, 'label' => '스포츠·레저', 'strategy_tip' => '운동 커뮤니티·인플루언서 협업, 동기부여 콘텐츠로 감성 브랜드 이미지 구축',
            ],
            'forwarding' => [
                'channels' => [
                    ['id'=>'google_search','name'=>'Google 검색광고','score'=>92,'pct'=>35,'roas'=>'4.8x','cpa'=>'₩28,000','type'=>'검색 CPC','format'=>'확장 텍스트','target'=>'해외거주 교포·유학생, 국제배송 검색자','metric'=>'CTR·신규가입','tips'=>['해외 배송비·통관 키워드 집중','국가별 랜딩페이지 최적화','브랜드 인지도 검색광고 병행'],'keywords'=>['배송대행','해외배송 대행','한국직구']],
                    ['id'=>'naver_search','name'=>'네이버 검색광고','score'=>85,'pct'=>25,'roas'=>'4.2x','cpa'=>'₩25,000','type'=>'파워링크','format'=>'검색 상단','target'=>'국내 해외쇼핑 관심자','metric'=>'클릭·가입','tips'=>['배송대행지 주소 제공 서비스 강조','해외직구 절차 간편함 어필','배송비 계산기 랜딩 연동'],'keywords'=>['해외직구 방법','배송대행지','아마존 직구']],
                    ['id'=>'blog','name'=>'블로그·커뮤니티','score'=>75,'pct'=>18,'roas'=>'3.8x','cpa'=>'₩18,000','type'=>'SEO 콘텐츠','format'=>'정보성 블로그','target'=>'해외직구 방법 탐색자','metric'=>'유입·가입','tips'=>['해외직구 가이드 콘텐츠 발행','관세 계산·배송비 비교 정보 제공','커뮤니티(카페·오픈채팅) 활동'],'keywords'=>['해외직구 방법','배송대행 추천','관세 계산']],
                    ['id'=>'meta','name'=>'Meta','score'=>65,'pct'=>12,'roas'=>'3.0x','cpa'=>'₩32,000','type'=>'트래픽·전환','format'=>'피드·재타겟','target'=>'해외 거주 한국인·유학생 커뮤니티','metric'=>'가입·이용','tips'=>['해외 한인 타겟 지역설정','한인 커뮤니티 그룹 광고','첫 이용 할인 이벤트 강조'],'keywords'=>['배송대행 서비스','해외배송']],
                    ['id'=>'youtube','name'=>'YouTube','score'=>58,'pct'=>10,'roas'=>'2.5x','cpa'=>'₩35,000','type'=>'인스트림','format'=>'스킵형','target'=>'해외직구 방법 탐색 유튜브 시청자','metric'=>'조회율·가입','tips'=>['해외직구 따라하기 영상 시리즈','이용 후기·절약 팁 구독자 채널','서비스 비교 영상 스폰서십'],'keywords'=>['해외직구 방법','배송대행 후기']],
                ],
                'a_s_ratio' => 12, 'label' => '배송대행', 'strategy_tip' => 'Google·네이버 검색광고로 구매 의도층 직접 포착, 블로그 정보성 콘텐츠로 자연유입 확보',
            ],
            'purchasing' => [
                'channels' => [
                    ['id'=>'naver_search','name'=>'네이버 검색광고','score'=>90,'pct'=>32,'roas'=>'4.5x','cpa'=>'₩20,000','type'=>'파워링크+블로그','format'=>'검색+콘텐츠','target'=>'해외상품 구매대행 검색자','metric'=>'클릭·주문','tips'=>['상품명+구매대행 키워드 필수','통관·관세 포함 가격 강조','카카오채널 상담 연동'],'keywords'=>['구매대행','해외상품 구매','아마존 구매대행']],
                    ['id'=>'google_search','name'=>'Google 검색광고','score'=>85,'pct'=>25,'roas'=>'4.2x','cpa'=>'₩22,000','type'=>'검색 CPC','format'=>'확장 텍스트','target'=>'해외 쇼핑몰 이용 경험자','metric'=>'전환·가입','tips'=>['해외 쇼핑몰별 키워드 공략','편의성·안전성 강조','브랜드 검색 보호 확보'],'keywords'=>['구매대행 추천','해외직구 쇼핑']],
                    ['id'=>'blog','name'=>'블로그·카페 SEO','score'=>80,'pct'=>20,'roas'=>'3.8x','cpa'=>'₩15,000','type'=>'정보성 콘텐츠','format'=>'네이버 블로그·카페','target'=>'상품 정보 탐색 구매 의도자','metric'=>'유입·문의','tips'=>['상품 구매 가이드 시리즈 발행','해외쇼핑 카페 커뮤니티 활동','관세·배송비 절약 팁 콘텐츠'],'keywords'=>['구매대행 방법','해외직구 site','관세 계산']],
                    ['id'=>'kakao','name'=>'카카오 광고','score'=>70,'pct'=>13,'roas'=>'3.2x','cpa'=>'₩18,000','type'=>'비즈보드','format'=>'배너·채널','target'=>'카카오톡 사용 30-50대 쇼핑 관심자','metric'=>'채널팔로우·문의','tips'=>['카카오 채널 상담 봇 운영','단체 구매 프로그램 홍보','카카오 쇼핑 연계 검토'],'keywords'=>['구매대행 서비스']],
                    ['id'=>'meta','name'=>'Meta','score'=>60,'pct'=>10,'roas'=>'2.8x','cpa'=>'₩26,000','type'=>'트래픽','format'=>'피드·메신저','target'=>'해외 명품·브랜드 관심층','metric'=>'클릭·가입','tips'=>['특정 해외 브랜드 관심자 타겟','첫 주문 수수료 할인 광고','신뢰도 후기 광고 활용'],'keywords'=>['해외 쇼핑','명품 구매대행']],
                ],
                'a_s_ratio' => 10, 'label' => '구매대행', 'strategy_tip' => '네이버·Google 검색 및 블로그 정보성 콘텐츠로 신뢰 기반 포착, 카카오 상담 연동으로 전환율 제고',
            ],
            'general' => [
                'channels' => [
                    ['id'=>'naver_search','name'=>'네이버 검색광고','score'=>80,'pct'=>30,'roas'=>'3.5x','cpa'=>'₩22,000','type'=>'파워링크+쇼핑','format'=>'검색+쇼핑','target'=>'국내 검색 사용자','metric'=>'CTR·전환','tips'=>['핵심 키워드 집중 입찰','브랜드 검색 보호 캠페인','쇼핑검색 연동'],'keywords'=>['신제품 출시','할인 쇼핑']],
                    ['id'=>'meta','name'=>'Meta','score'=>72,'pct'=>25,'roas'=>'3.0x','cpa'=>'₩25,000','type'=>'전환·트래픽','format'=>'피드·카탈로그','target'=>'관심사 기반타겟','metric'=>'전환·ROAS','tips'=>['Lookalike 대상 확장','리타겟팅 필수 운영','동영상 20초 이내'],'keywords'=>['추천 상품','할인 이벤트']],
                    ['id'=>'google_search','name'=>'Google 검색광고','score'=>70,'pct'=>20,'roas'=>'3.2x','cpa'=>'₩28,000','type'=>'검색CPC','format'=>'텍스트+쇼핑','target'=>'고구매의도 검색자','metric'=>'CTR·전환','tips'=>['정확히 일치 키워드 우선','전환 추적 설치 필수','스마트 캠페인 활용'],'keywords'=>['상품 추천','최저가']],
                    ['id'=>'instagram','name'=>'Instagram','score'=>65,'pct'=>15,'roas'=>'2.8x','cpa'=>'₩22,000','type'=>'이미지·영상','format'=>'피드·스토리','target'=>'SNS 활성 이용자','metric'=>'참여율·클릭','tips'=>['고품질 제품 이미지 필수','릴스로 사용법 시연','인플루언서 협업 검토'],'keywords'=>['제품 추천','쇼핑']],
                    ['id'=>'kakao','name'=>'카카오 광고','score'=>60,'pct'=>10,'roas'=>'2.6x','cpa'=>'₩24,000','type'=>'비즈보드','format'=>'배너','target'=>'카카오톡 전 연령층','metric'=>'클릭·도달','tips'=>['비즈보드 고품질 소재','카카오채널 팔로워 확보','카카오쇼핑 연동 검토'],'keywords'=>['쇼핑 할인','이벤트']],
                ],
                'a_s_ratio' => 15, 'label' => '일반', 'strategy_tip' => '네이버·메타 검색+SNS 병행, 리타겟팅으로 전환율 최대화',
            ],
        ];
    }

    /**
     * MarketingDataHub 기반 마케팅 분석 응답 생성
     * Claude API 실패 시 폴백으로 사용 (16개 전 플랫폼 데이터 활용)
     */
    private static function generateFallbackResponse(
        string $catId, string $svcType, string $query, array $products = [], string $period = 'monthly') {
        $labelMap = ['beauty'=>'뷰티', 'fashion'=>'패션', 'food'=>'식품'];
        $label = $labelMap[$catId] ?? $svcType ?: '일반';

        // A/S ratio (광고비/매출 비율)
        $asRatioMap = ['beauty'=>20,'fashion'=>25,'food'=>15,'electronics'=>10,
                       'lifestyle'=>12,'sports'=>18,'forwarding'=>12,'purchasing'=>10];
        $asRatio = $asRatioMap[$catId] ?? 15;

        // 예산 계산
        $skuCount   = (int)($products['sku_count']     ?? 0);
        $monthlyQty = (int)($products['monthly_qty']   ?? 0);
        $avgPrice   = (int)($products['avg_price']     ?? 0);
        $marginRate = (int)($products['margin_rate']   ?? 0);
        $targetRev  = (int)($products['target_revenue']?? 0);

        $estMonthlyRev = ($avgPrice > 0 && $monthlyQty > 0) ? $avgPrice * $monthlyQty : 0;
        $marginAmt     = ($estMonthlyRev > 0 && $marginRate > 0) ? (int)($estMonthlyRev * $marginRate / 100) : 0;

        $stdBudgets = ['beauty'=>3000000,'fashion'=>4000000,'food'=>2500000,'electronics'=>2000000,
                       'lifestyle'=>1500000,'sports'=>2000000,'forwarding'=>1500000,'purchasing'=>1200000];

        if ($estMonthlyRev > 0) {
            $baseFromRev   = (int)($estMonthlyRev * $asRatio / 100);
            $maxFromMargin = $marginAmt > 0 ? (int)($marginAmt * 0.5) : $baseFromRev;
            $totalMonthly  = max(min($baseFromRev, $maxFromMargin ?: $baseFromRev), 1000000);
            $budgetRationale = "{$label} 카테고리 A/S ratio {$asRatio}% 적용. 예상 월 매출 ₩".number_format($estMonthlyRev)
                ." × {$asRatio}% = ₩".number_format($baseFromRev)
                .($marginAmt > 0 ? ". 마진(₩".number_format($marginAmt).")의 50% 상한 적용" : "")
                .". 최종 월 광고비: ₩".number_format($totalMonthly);
            $productAnalysis = "단가 ₩".number_format($avgPrice)." × 마진율 {$marginRate}% 구조. "
                .($avgPrice >= 50000 ? "고단가 상품 → 검색·리타겟팅 채널 집중." : "중저가 상품 → SNS 임펄스 구매 채널 집중.")
                .($skuCount >= 20 ? " SKU {$skuCount}개 → 쇼핑광고·카탈로그 광고 권장." : "");
        } elseif ($targetRev > 0) {
            $totalMonthly    = max((int)($targetRev * $asRatio / 100 / ($period === 'annual' ? 12 : 1)), 1000000);
            $budgetRationale = "목표 매출 ₩".number_format($targetRev)." × {$asRatio}% = 월 ₩".number_format($totalMonthly);
            $productAnalysis = "{$label} 업종 평균 기준 분석. 상품 정보 입력 시 더 정밀한 계산 가능.";
        } else {
            $totalMonthly    = $stdBudgets[$catId] ?? 2000000;
            $budgetRationale = "{$label} 소규모 브랜드 표준 예산. 상품 데이터 입력 시 맞춤 계산 제공.";
            $productAnalysis = "상품 정보 없음 → 업종 표준값 사용. 좌측 판매 상품 정보 패널에서 데이터를 입력하세요.";
        }

        $annualBudget = $totalMonthly * 12;
        $monthlyFmt   = '₩'.number_format((int)round($totalMonthly/10000)).'만';
        $annualFmt    = '₩'.number_format((int)round($annualBudget/10000)).'만';

        // MarketingDataHub에서 채널 데이터 획득
        $topPlatforms = \Genie\Handlers\MarketingDataHub::getTopPlatformsForCategory($catId, 5);

        $chResult = [];
        $priority = 1;
        $budgetPcts = [35, 25, 18, 13, 9]; // 우선순위별 예산 배분
        foreach ($topPlatforms as $id => $p) {
            $pct    = $budgetPcts[$priority - 1] ?? 8;
            $budget = (int)($totalMonthly * $pct / 100);
            $bm     = $p['benchmark'] ?? [];
            $cpaNum = (int)preg_replace('/[^0-9]/', '', $bm['avg_cpa'] ?? '20000') ?: 20000;
            $chResult[] = [
                'channel_id'          => $id,
                'channel_name'        => $p['name'],
                'priority'            => $priority,
                'ad_type'             => $p['ad_format'],
                'ad_format'           => $p['type'],
                'effectiveness_score' => $p['score'] ?? 70,
                'monthly_budget'      => $budget,
                'budget_pct'          => $pct,
                'expected_roas'       => $bm['roas'] ?? $bm['avg_roas'] ?? '3.0x',
                'expected_cpa'        => $bm['avg_cpa'] ?? '₩25,000',
                'kpi_goal'            => "월 ".number_format((int)($budget / $cpaNum))."건 전환 목표 | CTR ".($bm['avg_ctr'] ?? '-'),
                'targeting'           => "국내 {$p['kr_users']} 중 {$label} 관심층",
                'key_metric'          => "ROAS ".($bm['roas'] ?? $bm['avg_roas'] ?? '3.0x')." | CTR ".($bm['avg_ctr'] ?? '-'),
                'reason'              => "{$p['name']} 효과점수 ".($p['score']??70)."점. {$p['strength']} | {$p['kr_trend']}",
                'action_plan'         => "1. {$p['name']} 계정 셋업 → 2. {$p['ad_format']} 테스트 캠페인 → 3. 데이터 기반 최적화",
                'efficiency_tips'     => $p['tips'] ?? [],
                'keywords'            => [],
                'data_source_name'    => $p['name'],
                'data_source_ref'     => $p['source'],
                'monthly_users_global'=> $p['monthly_users'],
                'kr_users'            => $p['kr_users'],
                'kr_trend'            => $p['kr_trend'],
            ];
            $priority++;
        }

        // 가중평균 ROAS
        $scores = array_column($chResult, 'effectiveness_score');
        $totalScore = array_sum($scores) ?: 1;
        $weightedRoas = 0;
        foreach ($chResult as $i => $ch) {
            $r = (float)str_replace('x','', $ch['expected_roas']);
            $weightedRoas += $r * $scores[$i] / $totalScore;
        }
        $roasFmt = number_format($weightedRoas, 1).'x';

        // 플랫폼 출처 목록
        $allPlatforms = \Genie\Handlers\MarketingDataHub::getAllPlatforms();
        $sourceList   = array_map(fn($p) => $p['name'].' ('.$p['source'].')', array_values($allPlatforms));

        $timeline = [
            ['phase'=>'1-2주차','title'=>'계정 셋업 및 소재 제작','detail'=>'상위 3개 채널 광고 계정 생성·픽셀 설치, 이미지·영상 소재 3종 이상 제작, 랜딩페이지 최적화'],
            ['phase'=>'3-4주차','title'=>'테스트 캠페인 런칭','detail'=>'전체 예산 30%로 A/B 테스트, CTR·전환율 기준 소재 선별, 채널별 CPA 비교'],
            ['phase'=>'2달차','title'=>'데이터 기반 최적화','detail'=>'상위 채널 예산 확대, 하위 채널 조정, 리타겟팅 캠페인 추가'],
            ['phase'=>'3달차+','title'=>'스케일업','detail'=>'Lookalike 오디언스 확장, 자동입찰 전환, 월별 성과 리포트 기반 재배분'],
        ];

        $topCh = $chResult[0] ?? [];
        return [
            'summary'               => "{$label} 카테고리 최적 마케팅 채널 분석. ".count($chResult)."개 채널(ChatGPT·Google·Meta·TikTok·유튜브·아마존·쇼피파이·네이버·카카오 등 16개 플랫폼 데이터 기반)에 월 {$monthlyFmt}을 분산 투자 시 예상 ROAS {$roasFmt} 달성 가능.",
            'strategy'              => "{$label} 특성 최적화 멀티채널 전략. ".($topCh['channel_name'] ?? '')." 중심 월 {$monthlyFmt} 투자 시 ROAS {$roasFmt} 목표",
            'total_monthly_budget'  => $totalMonthly,
            'monthly_budget'        => $monthlyFmt,
            'annual_budget'         => $annualFmt,
            'expected_roas'         => $roasFmt,
            'expected_conversions'  => '월 '.number_format((int)($totalMonthly / 20000)).'명 예상',
            'budget_rationale'      => $budgetRationale,
            'product_analysis'      => $productAnalysis,
            'channels'              => $chResult,
            'data_sources'          => array_slice($sourceList, 0, 8),
            'efficiency_maximization'=> [
                'overall_tips'   => ['초기 1개월 테스트 예산(30%)으로 채널별 CPA 측정','전환율 2% 이상 채널에 집중 예산 배분','리타겟팅으로 전환율 30-50% 향상 가능'],
                'ab_test_ideas'  => '소재(이미지 vs 동영상), 헤드라인(혜택형 vs 정보형), CTA(지금 구매 vs 자세히 보기) A/B 테스트',
                'funnel_strategy'=> '인지(SNS·유튜브) → 관심(검색광고·리타겟팅) → 구매(전환 최적화·쿠폰) → 재구매(이메일·카카오채널)',
                'retargeting'    => '상세페이지 방문 후 미구매 고객에게 3-7일 내 리타겟팅 → 전환율 대폭 상승',
            ],
            'timeline'              => $timeline,
            'immediate_action'      => ($topCh['channel_name'] ?? '네이버')." 광고 계정 개설 후 ₩".number_format((int)($totalMonthly * ($budgetPcts[0]/100)))." 예산으로 테스트 캠페인 즉시 시작",
            'data_source'           => 'fallback',
        ];
    }

    /**
     * 내장 광고 소재 폴백 (Creative) 생성
        $channels = $cd['channels'];
        $asRatio  = (int)($cd['a_s_ratio'] ?? 15);
        $label    = $cd['label'] ?? $svcType;

        // ── 예산 계산 (상품 데이터 기반)
        $skuCount   = (int)($products['sku_count']      ?? 0);
        $monthlyQty = (int)($products['monthly_qty']     ?? 0);
        $avgPrice   = (int)($products['avg_price']       ?? 0);
        $marginRate = (int)($products['margin_rate']     ?? 0);
        $targetRev  = (int)($products['target_revenue']  ?? 0);

        $estMonthlyRev = ($avgPrice > 0 && $monthlyQty > 0) ? $avgPrice * $monthlyQty : 0;
        $marginAmt     = ($estMonthlyRev > 0 && $marginRate > 0) ? (int)($estMonthlyRev * $marginRate / 100) : 0;

        // 예산 결정 로직
        if ($estMonthlyRev > 0) {
            // 상품 데이터 있으면 → A/S ratio 기반 계산, 마진의 50% 상한
            $baseFromRev    = (int)($estMonthlyRev * $asRatio / 100);
            $maxFromMargin  = $marginAmt > 0 ? (int)($marginAmt * 0.5) : $baseFromRev;
            $totalMonthly   = min($baseFromRev, $maxFromMargin > 0 ? $maxFromMargin : $baseFromRev);
            $totalMonthly   = max($totalMonthly, 1000000); // 최소 100만원
            $budgetRationale = "{$label} 카테고리의 광고비/매출 비율(A/S ratio) 기준 {$asRatio}%를 적용했습니다. "
                . "예상 월 매출 ₩" . number_format($estMonthlyRev) . " × {$asRatio}% = ₩" . number_format($baseFromRev) . " 이며, "
                . ($marginAmt > 0 ? "수익성 보존을 위해 마진(₩" . number_format($marginAmt) . ")의 50% 상한(₩" . number_format($maxFromMargin) . ")을 적용하여 " : "")
                . "월 적정 광고비를 ₩" . number_format($totalMonthly) . "으로 산정했습니다.";
            $productAnalysis = "평균 단가 ₩" . number_format($avgPrice) . " × 마진율 {$marginRate}% 구조에서 "
                . ($avgPrice >= 50000 ? "고단가 상품이므로 리타겟팅·비교검색 채널이 효율적입니다." : "저중단가 상품이므로 SNS·임펄스 구매 채널이 효율적입니다.")
                . ($skuCount >= 20 ? " SKU 수({$skuCount}개)가 많아 쇼핑광고·카탈로그 광고 활용을 권장합니다." : "");
        } elseif ($targetRev > 0) {
            $totalMonthly = (int)($targetRev * $asRatio / 100 / ($period === 'annual' ? 12 : 1));
            $totalMonthly = max($totalMonthly, 1000000);
            $budgetRationale = "목표 " . ($period === 'annual' ? '연간' : '월간') . " 매출 ₩" . number_format($targetRev)
                . "에 {$label} 업종 평균 광고비율 {$asRatio}%를 적용, 월 광고비 ₩" . number_format($totalMonthly) . "으로 산정했습니다.";
            $productAnalysis = "{$label} 카테고리 업종 평균 기준으로 채널별 효율을 분석했습니다. 상품 정보 입력 시 더 정밀한 예산 계산이 가능합니다.";
        } else {
            // 기본값: 카테고리별 표준 예산 (소규모/중규모/대규모)
            $stdBudgets = ['beauty'=>3000000,'fashion'=>4000000,'food'=>2500000,'electronics'=>2000000,
                           'lifestyle'=>1500000,'sports'=>2000000,'forwarding'=>1500000,'purchasing'=>1200000,'general'=>2000000];
            $totalMonthly = $stdBudgets[$catId] ?? 2000000;
            $budgetRationale = "{$label} 카테고리 소규모 브랜드 기준 월 표준 광고 예산입니다. 상품 판매 데이터(SKU 수·단가·마진율)를 입력하면 더 정확한 예산 계산이 가능합니다.";
            $productAnalysis = "상품 정보가 없어 업종 표준값을 사용했습니다. 좌측 '📦 판매 상품 정보 입력' 패널에서 상품 데이터를 입력하면 맞춤 분석이 제공됩니다.";
        }

        $annualBudget = $totalMonthly * 12;
        $monthlyFmt   = '₩' . number_format((int)round($totalMonthly / 10000)) . '만';
        $annualFmt    = '₩' . number_format((int)round($annualBudget / 10000)) . '만';

        // ── 채널별 예산 배분 계산
        $chResult = [];
        foreach ($channels as $ch) {
            $budget = (int)($totalMonthly * $ch['pct'] / 100);
            $chResult[] = [
                'channel_id'         => $ch['id'],
                'channel_name'       => $ch['name'],
                'priority'           => count($chResult) + 1,
                'ad_type'            => $ch['type'],
                'ad_format'          => $ch['format'],
                'effectiveness_score'=> $ch['score'],
                'monthly_budget'     => $budget,
                'budget_pct'         => $ch['pct'],
                'expected_roas'      => $ch['roas'],
                'expected_cpa'       => $ch['cpa'],
                'kpi_goal'           => "월 " . number_format((int)($budget / (str_replace(['₩',',','원'], '', $ch['cpa']) ?: 20000))) . "건 전환 달성",
                'targeting'          => $ch['target'],
                'key_metric'         => $ch['metric'],
                'reason'             => "{$label} 카테고리에서 효과 점수 {$ch['score']}점의 핵심 채널입니다. " . $ch['tips'][0],
                'action_plan'        => "1단계: 계정 설정 및 소재 제작 → 2단계: {$ch['type']} 테스트 광고 집행 → 3단계: 데이터 분석 후 예산 최적화",
                'efficiency_tips'    => $ch['tips'],
                'keywords'           => $ch['keywords'],
            ];
        }

        // ── 전체 예상 ROAS 가중평균
        $totalScore = array_sum(array_column($channels, 'score')) ?: 1;
        $weightedRoas = 0;
        foreach ($channels as $ch) {
            $roasNum = (float)str_replace('x', '', $ch['roas']);
            $weightedRoas += $roasNum * $ch['score'] / $totalScore;
        }
        $roasFmt = number_format($weightedRoas, 1) . 'x';

        // ── 타임라인
        $timeline = [
            ['phase' => '1-2주차', 'title' => '광고 계정 셋업 및 소재 제작',
             'detail' => '광고 계정 생성·픽셀 설치, 상위 3개 채널 소재(이미지·카피) 제작, 랜딩페이지 최적화'],
            ['phase' => '3-4주차', 'title' => '테스트 캠페인 런칭',
             'detail' => '소규모 예산으로 A/B 테스트, CTR·전환율 기준 소재 선별, 채널별 CPA 측정'],
            ['phase' => '2달차', 'title' => '성과 데이터 기반 최적화',
             'detail' => '상위 채널 예산 확대, 하위 채널 조정, 리타겟팅 캠페인 추가, ROAS 목표 달성 집중'],
            ['phase' => '3달차+', 'title' => '스케일업 및 자동화',
             'detail' => '전환 데이터 기반 Lookalike 확장, 자동입찰 전환, 월별 성과 리포트 기반 예산 재배분'],
        ];

        return [
            'summary'               => "{$label} 카테고리를 위한 최적 마케팅 채널 분석 결과입니다. {$cd['strategy_tip']} 월 광고 예산 {$monthlyFmt}으로 " . count($channels) . "개 채널에 분산 투자하여 예상 ROAS {$roasFmt}을 달성할 수 있습니다.",
            'strategy'              => "{$label} 업종 특성에 최적화된 " . $channels[0]['name'] . " 중심 멀티채널 전략으로 월 광고비 {$monthlyFmt} 투자 시 ROAS {$roasFmt} 달성 목표",
            'total_monthly_budget'  => $totalMonthly,
            'monthly_budget'        => $monthlyFmt,
            'annual_budget'         => $annualFmt,
            'expected_roas'         => $roasFmt,
            'expected_conversions'  => '월 ' . number_format((int)($totalMonthly / 20000)) . '명 예상',
            'budget_rationale'      => $budgetRationale,
            'product_analysis'      => $productAnalysis,
            'channels'              => $chResult,
            'efficiency_maximization' => [
                'overall_tips' => [
                    '초기 1개월은 테스트 예산(30%)으로 채널별 CPA를 측정하세요',
                    '전환율이 2% 이상인 채널에 집중 예산 배분하세요',
                    '구매 이탈자 리타겟팅으로 전환율을 30-50% 높일 수 있습니다',
                ],
                'ab_test_ideas'  => '광고 소재(이미지 vs 동영상), 헤드라인(혜택형 vs 정보형), CTA 문구(지금 구매 vs 자세히 보기) A/B 테스트를 진행하세요',
                'funnel_strategy'=> '인지(SNS 광고) → 관심(리타겟팅·검색광고) → 구매(전환 최적화·쿠폰) → 재구매(이메일·카카오채널) 4단계 퍼널을 구축하세요',
                'retargeting'    => '상세페이지 방문 후 구매하지 않은 고객에게 3-7일 내 리타겟팅 광고를 표시하면 전환율이 크게 상승합니다',
            ],
            'timeline'              => $timeline,
            'immediate_action'      => $channels[0]['name'] . " 광고 계정 개설 및 픽셀 설치 후, ₩" . number_format((int)($totalMonthly * $channels[0]['pct'] / 100)) . " 예산으로 테스트 캠페인을 즉시 시작하세요",
            'data_source'           => 'fallback',
        ];
    }

    /**
     * 내장 광고 소재 폴백 (Creative) 생성
     */
    private static function generateFallbackCreatives(string $catId, string $svcType, string $keyword, array $channels): array {
        $kb = self::getChannelKnowledgeBase();
        $cd = $kb[$catId] ?? $kb['general'];
        $label = $cd['label'] ?? $svcType;
        $kw = $keyword ?: $label;

        $templates = [
            'google_search' => ['headline'=>"{$kw} 공식 스토어 | 특가 할인", 'copy'=>"정품 보장 {$label} {$kw}. 오늘 주문 시 무료 배송 적용. 지금 바로 확인하세요.", 'cta'=>'지금 구매하기', 'main_title'=>"{$kw} 특가 세일", 'sub_title'=>'정품 보장 · 빠른 배송'],
            'naver_search'  => ['headline'=>"{$kw} 최저가 | 오늘만 이벤트", 'copy'=>"검증된 {$label} 브랜드. 네이버페이 포인트 적립, 당일 배송 가능. 후기를 확인해보세요.", 'cta'=>'최저가 보기', 'main_title'=>"{$kw} 네이버 최저가", 'sub_title'=>'오늘 주문 · 내일 도착'],
            'instagram'     => ['headline'=>"✨ {$kw}로 달라진 일상", 'copy'=>"진짜 후기로 증명된 {$kw}. 첫 구매 20% 할인 쿠폰 증정. 지금 프로필 링크를 확인하세요 🔗", 'cta'=>'프로필 링크 확인', 'main_title'=>"{$kw} 첫 구매 20% OFF", 'sub_title'=>'한정 수량 · 오늘 마감'],
            'tiktok'        => ['headline'=>"이거 써봤어? {$kw} 진짜 후기 🔥", 'copy'=>"틱톡에서 난리난 {$kw}. 나도 써봤는데 진짜 달라. #무조건구매 #추천", 'cta'=>'자세히 보기', 'main_title'=>"틱톡 인기 {$kw}", 'sub_title'=>'HOT 아이템 · 한정특가'],
            'youtube'       => ['headline'=>"[솔직리뷰] {$kw} 한 달 사용 후기", 'copy'=>"광고 없이 솔직하게 리뷰합니다. {$kw}의 진짜 효과와 가격 대비 만족도를 확인하세요.", 'cta'=>'전체 리뷰 보기', 'main_title'=>"{$kw} 솔직 리뷰", 'sub_title'=>'진짜 사용자 후기'],
            'meta'          => ['headline'=>"{$kw} 지금 놓치면 후회할 혜택", 'copy'=>"매일 {$kw}를 사용하는 사람이 늘고 있습니다. 첫 구매 2+1 혜택과 무료 배송으로 지금 시작하세요.", 'cta'=>'지금 시작하기', 'main_title'=>"{$kw} 2+1 EVENT", 'sub_title'=>'오늘만 · 무료배송'],
            'kakao'         => ['headline'=>"[카카오 단독] {$kw} 특가 🎁", 'copy'=>"카카오 친구만을 위한 {$kw} 특별 할인. 채널 추가하고 쿠폰 받으세요! 오늘 자정 종료", 'cta'=>'채널 추가하기', 'main_title'=>"채널 친구 전용 할인", 'sub_title'=>"{$kw} 단독 특가"],
            'blog'          => ['headline'=>"{$kw} 사용 전 꼭 알아야 할 것들", 'copy'=>"{$kw} 구매 전 체크리스트와 실제 사용 후기를 솔직하게 정리했습니다. 후회없는 선택을 위한 가이드.", 'cta'=>'자세히 읽기', 'main_title'=>"{$kw} 구매 가이드", 'sub_title'=>'전문가 추천 · 비교 분석'],
        ];

        $creatives = [];
        foreach ($channels as $ch) {
            $chId = is_array($ch) ? ($ch['channel_id'] ?? $ch['id'] ?? '') : '';
            $tpl  = $templates[$chId] ?? $templates['meta'];
            $kbCh = null;
            foreach (($cd['channels'] ?? []) as $kbcItem) {
                if ($kbcItem['id'] === $chId) { $kbCh = $kbcItem; break; }
            }
            $creatives[] = [
                'channel_id'  => $chId,
                'headline'    => $tpl['headline'],
                'copy'        => $tpl['copy'],
                'cta'         => $tpl['cta'],
                'main_title'  => $tpl['main_title'],
                'sub_title'   => $tpl['sub_title'],
                'tips'        => $kbCh ? implode(' / ', array_slice($kbCh['tips'], 0, 2)) : "{$chId} 광고 최적화를 위해 소재 A/B 테스트를 진행하세요",
                'format'      => $kbCh['format'] ?? '',
                'spec'        => $chId === 'instagram' || $chId === 'tiktok' ? '1080×1920px (9:16)' : ($chId === 'youtube' ? '1920×1080px (16:9)' : '1200×628px (1.91:1)'),
            ];
        }

        return ['creatives' => $creatives, 'data_source' => 'fallback'];
    }

    /* ── [현 차수] 채널 KPI 설정(목표·KPI 타깃) 테넌트별 영속 ──────────────────
       ChannelKPI 페이지의 goals/kpiTargets 가 프론트 useState 로만 존재해 새로고침 시 소실됐다.
       테넌트 스코프 저장/조회로 영속화(인증 Bearer → self::tenant 로 실 테넌트 해석). */
    private static function ensureKpiConfigTable(\PDO $pdo): void
    {
        if ($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql') {
            $pdo->exec("CREATE TABLE IF NOT EXISTS channel_kpi_config (tenant_id VARCHAR(100) NOT NULL PRIMARY KEY, config_json LONGTEXT, updated_at VARCHAR(40)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS channel_kpi_config (tenant_id TEXT NOT NULL PRIMARY KEY, config_json TEXT, updated_at TEXT)");
        }
    }

    // GET /v422/ai/channel-kpi-config — 저장된 KPI 설정 조회(테넌트 스코프)
    public static function getChannelKpiConfig(Request $req, Response $res, array $args = []): Response
    {
        $pdo = Db::pdo();
        self::ensureKpiConfigTable($pdo);
        $tenant = self::tenant($req);
        $cfg = [];
        try {
            $st = $pdo->prepare("SELECT config_json FROM channel_kpi_config WHERE tenant_id=? LIMIT 1");
            $st->execute([$tenant]);
            $v = $st->fetchColumn();
            if ($v) { $d = json_decode((string)$v, true); if (is_array($d)) $cfg = $d; }
        } catch (\Throwable $e) {}
        return TemplateResponder::respond($res, ['ok' => true, 'config' => $cfg]);
    }

    // POST /v422/ai/channel-kpi-config — KPI 설정 저장(테넌트 스코프). body: { config: {...} }
    public static function saveChannelKpiConfig(Request $req, Response $res, array $args = []): Response
    {
        $pdo = Db::pdo();
        self::ensureKpiConfigTable($pdo);
        $tenant = self::tenant($req);
        if ($tenant === 'unknown' || $tenant === '') {
            return TemplateResponder::respond($res->withStatus(401), ['ok' => false, 'error' => 'unauthorized']);
        }
        $body   = (array)($req->getParsedBody() ?? []);
        $config = $body['config'] ?? $body;
        $json   = json_encode($config, JSON_UNESCAPED_UNICODE);
        if ($json === false || strlen($json) > 100000) {
            return TemplateResponder::respond($res->withStatus(413), ['ok' => false, 'error' => 'too_large']);
        }
        $now  = gmdate('c');
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        $sql  = $isMy
            ? "INSERT INTO channel_kpi_config(tenant_id,config_json,updated_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE config_json=VALUES(config_json), updated_at=VALUES(updated_at)"
            : "INSERT INTO channel_kpi_config(tenant_id,config_json,updated_at) VALUES(?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET config_json=excluded.config_json, updated_at=excluded.updated_at";
        $pdo->prepare($sql)->execute([$tenant, $json, $now]);
        return TemplateResponder::respond($res, ['ok' => true, 'saved' => true, 'updated_at' => $now]);
    }

    /* ───────────── [현 차수] ② 자연어 인사이트(AI 리포트) — MMM·성과 종합 ───────────── */

    /** POST /v422/ai/marketing-insight — 광고·채널 분석 자연어 종합. 실데이터 기반, AI 미가용 시 결정적 폴백. */
    /** 리포트 생성 언어(15개국). 알 수 없으면 ko. */
    private const REPORT_LANGS = ['ko' => 'Korean', 'en' => 'English', 'ja' => 'Japanese', 'zh' => 'Simplified Chinese', 'zh-TW' => 'Traditional Chinese', 'de' => 'German', 'th' => 'Thai', 'vi' => 'Vietnamese', 'id' => 'Indonesian', 'ar' => 'Arabic', 'es' => 'Spanish', 'fr' => 'French', 'hi' => 'Hindi', 'pt' => 'Portuguese', 'ru' => 'Russian'];
    private static function normReportLang($l): string { $l = (string)$l; return isset(self::REPORT_LANGS[$l]) ? $l : 'ko'; }
    /** 요청에서 출력 언어 해석: body.lang → X-Lang 헤더 → ?lang → ko. */
    public static function reqLang(Request $req, array $body = []): string {
        $l = $body['lang'] ?? '';
        if ($l === '') $l = $req->getHeaderLine('X-Lang');
        if ($l === '') $l = (string)($req->getQueryParams()['lang'] ?? 'ko');
        return self::normReportLang($l);
    }
    /** 시스템 프롬프트 뒤에 붙이는 출력 언어 강제 지시(ko=무변경). 모든 생성기 공용. */
    public static function langDirective(string $lang): string {
        if ($lang === 'ko') return '';
        $name = self::REPORT_LANGS[$lang] ?? 'Korean';
        return "\n\n[OUTPUT LANGUAGE — HIGHEST PRIORITY] Ignore ALL earlier language rules (including any Korean-only/'한국어로' instruction). Write EVERY output value — all JSON string fields, summaries, bullet points, ad copy, replies, recommendations — in {$name}. Keep JSON keys, numeric values, currency symbols, units, and provided proper nouns/brand names unchanged.";
    }
    /** 결정론적 폴백 템플릿 1건 조회(MmmReportI18n, 누락 시 ko). */
    private static function rtpl(string $lang, string $key): string { return \Genie\Handlers\MmmReportI18n::tpl($lang, $key); }

    public static function marketingInsight(Request $req, Response $res, array $args = []): Response {
        $tenant = self::tenant($req);
        if ($tenant === 'unknown') {
            return TemplateResponder::respond($res->withStatus(401), ['ok' => false, 'error' => '로그인이 필요합니다.']);
        }
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $lang = self::reqLang($req, $body);
        $langName = self::REPORT_LANGS[$lang];

        try { $facts = self::gatherMarketingFacts(Db::pdo(), $tenant); }
        catch (\Throwable $e) { $facts = ['window_days' => 60, 'channels' => [], 'totals' => ['spend' => 0, 'revenue' => 0, 'roas' => 0]]; }

        if (empty($facts['channels'])) {
            return TemplateResponder::respond($res, ['ok' => true, 'ai' => false, 'lang' => $lang, 'insight' => [
                'summary' => self::rtpl($lang, 'emptySummary'),
                'bullets' => [], 'recommendation' => self::rtpl($lang, 'emptyRecommendation'), 'risks' => [],
            ], 'facts' => $facts]);
        }
        // 시스템 프롬프트: 출력 언어를 사용자 로케일로 지정(Claude가 해당 언어로 작성).
        $system = "You are a senior performance-marketing analyst. Based ONLY on the given measured data, write a concise, actionable executive insight in {$langName}. No exaggeration, speculation, or fabricated numbers. Respond ONLY as JSON {\"summary\":\"3-4 sentences\",\"bullets\":[\"key point\",\"...\"],\"recommendation\":\"1-2 priority actions\",\"risks\":[\"risk\",\"...\"]}. All field values MUST be written in {$langName}.";
        $userMsg = "Advertiser's measured marketing data for the last " . (int)$facts['window_days'] . " days:\n" . json_encode($facts, JSON_UNESCAPED_UNICODE) . "\nSynthesize channel efficiency, budget allocation, and anomaly signals into an executive summary. Write every value in {$langName}.";
        try {
            $r = self::callClaude($system, $userMsg, 14, self::tenant($req));
            $parsed = self::parseAnalysis($r['text']);
            return TemplateResponder::respond($res, ['ok' => true, 'ai' => true, 'lang' => $lang, 'insight' => $parsed, 'facts' => $facts]);
        } catch (\Throwable $e) {
            return TemplateResponder::respond($res, ['ok' => true, 'ai' => false, 'lang' => $lang, 'insight' => self::deterministicInsight($facts, $lang), 'facts' => $facts, 'note' => self::rtpl($lang, 'aiUnavailableNote')]);
        }
    }

    private static function insightIsDemo(): bool {
        try { if (\Genie\Db::env() === 'demo') return true; } catch (\Throwable $e) {}
        try { $d = strtolower((string)Db::pdo()->query('SELECT DATABASE()')->fetchColumn()); if ($d !== '' && strpos($d, 'demo') !== false) return true; } catch (\Throwable $e) {}
        return false;
    }

    private static function gatherMarketingFacts(\PDO $pdo, string $tenant): array {
        $window = 60;
        if (self::insightIsDemo() || $tenant === 'demo' || str_starts_with($tenant, 'demo')) return self::demoFacts($window);
        $since = gmdate('Y-m-d', time() - $window * 86400);
        $st = $pdo->prepare("SELECT channel, SUM(spend) spend, SUM(revenue) revenue, SUM(conversions) conv FROM performance_metrics WHERE tenant_id=? AND date>=? AND channel IS NOT NULL AND channel<>'' GROUP BY channel ORDER BY spend DESC");
        $st->execute([$tenant, $since]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $channels = []; $ts = 0; $tr = 0; $tc = 0;
        foreach ($rows as $r) {
            $sp = (float)$r['spend']; $rv = (float)$r['revenue']; $cv = (float)$r['conv'];
            if ($sp <= 0) continue;
            $ts += $sp; $tr += $rv; $tc += $cv;
            $channels[] = ['channel' => $r['channel'], 'spend' => round($sp), 'revenue' => round($rv), 'roas' => round($rv / $sp, 2), 'conversions' => (int)$cv, 'cpa' => $cv > 0 ? round($sp / $cv) : null];
        }
        $channels = array_slice($channels, 0, 8);
        $best = null; $worst = null;
        foreach ($channels as $c) { if ($best === null || $c['roas'] > $best['roas']) $best = $c; if ($worst === null || $c['roas'] < $worst['roas']) $worst = $c; }
        return ['window_days' => $window, 'totals' => ['spend' => round($ts), 'revenue' => round($tr), 'roas' => $ts > 0 ? round($tr / $ts, 2) : 0, 'conversions' => (int)$tc], 'channels' => $channels, 'best_roas' => $best, 'worst_roas' => $worst];
    }

    private static function demoFacts(int $window): array {
        $channels = [
            ['channel' => 'naver_sa', 'spend' => 10800000, 'revenue' => 46440000, 'roas' => 4.3, 'conversions' => 540, 'cpa' => 20000],
            ['channel' => 'google_ads', 'spend' => 18000000, 'revenue' => 70200000, 'roas' => 3.9, 'conversions' => 720, 'cpa' => 25000],
            ['channel' => 'meta_ads', 'spend' => 15000000, 'revenue' => 51000000, 'roas' => 3.4, 'conversions' => 600, 'cpa' => 25000],
            ['channel' => 'tiktok_business', 'spend' => 7200000, 'revenue' => 19440000, 'roas' => 2.7, 'conversions' => 240, 'cpa' => 30000],
            ['channel' => 'kakao_moment', 'spend' => 5400000, 'revenue' => 12960000, 'roas' => 2.4, 'conversions' => 180, 'cpa' => 30000],
        ];
        $ts = 0; $tr = 0; $tc = 0; foreach ($channels as $c) { $ts += $c['spend']; $tr += $c['revenue']; $tc += $c['conversions']; }
        return ['window_days' => $window, 'totals' => ['spend' => $ts, 'revenue' => $tr, 'roas' => round($tr / $ts, 2), 'conversions' => $tc], 'channels' => $channels, 'best_roas' => $channels[0], 'worst_roas' => $channels[4], 'anomaly_hint' => 'meta_ads ROAS 최근 급락(−3.6σ) 신호'];
    }

    private static function deterministicInsight(array $f, string $lang = 'ko'): array {
        $fmt = fn($n) => '₩' . number_format((int)$n);
        $rep = fn($key, $vars) => strtr(self::rtpl($lang, $key), $vars);
        $t = $f['totals']; $best = $f['best_roas'] ?? null; $worst = $f['worst_roas'] ?? null;
        $summary = $rep('summaryHead', ['{days}' => (int)$f['window_days'], '{spend}' => $fmt($t['spend']), '{revenue}' => $fmt($t['revenue']), '{roas}' => $t['roas']]);
        if ($best) $summary .= $rep('summaryBest', ['{ch}' => $best['channel'], '{roas}' => $best['roas']]);
        if ($worst) $summary .= $rep('summaryWorst', ['{ch}' => $worst['channel'], '{roas}' => $worst['roas']]);
        $bullets = [];
        foreach (array_slice($f['channels'], 0, 4) as $c) {
            $b = $rep('bullet', ['{ch}' => $c['channel'], '{spend}' => $fmt($c['spend']), '{roas}' => $c['roas']]);
            if (!empty($c['cpa'])) $b .= $rep('bulletCpa', ['{cpa}' => $fmt($c['cpa'])]);
            $bullets[] = $b;
        }
        if (!empty($f['anomaly_hint'])) $bullets[] = "⚠ " . $f['anomaly_hint'];
        $rec = $worst ? $rep('recommendation', ['{worst}' => $worst['channel'], '{best}' => ($best ? $best['channel'] : '')]) : self::rtpl($lang, 'recommendationNoBest');
        $risks = ($worst && (float)$worst['roas'] < 1.5) ? [$rep('risk', ['{worst}' => $worst['channel']])] : [];
        return ['summary' => $summary, 'bullets' => $bullets, 'recommendation' => $rec, 'risks' => $risks];
    }

}
