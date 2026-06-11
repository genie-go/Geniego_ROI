<?php
declare(strict_types=1);

use Slim\App;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\TemplateResponder;

return function (App $app): void {
    $templatesPath = __DIR__ . '/../data/templates.json';
    $templates = file_exists($templatesPath) ? json_decode((string)file_get_contents($templatesPath), true) : [];
    if (!is_array($templates)) $templates = [];

    $custom = [
        'POST /v378/ai/risk/predict' => 'Genie\\Handlers\\Risk::predictSingle',
        'POST /v378/ai/risk/batch-run' => 'Genie\\Handlers\\Risk::batchRun',
        'POST /v378/admin/seed' => 'Genie\\Handlers\\Risk::seed',
        'GET /v378/admin/model-registry' => 'Genie\\Handlers\\Risk::adminModels',
        'GET /v378/admin/predictions' => 'Genie\\Handlers\\Risk::adminPredictions',
        'GET /v378/admin/connector-health' => 'Genie\\Handlers\\Risk::adminConnectorHealth',
        'GET /v378/admin/ingestion-runs' => 'Genie\\Handlers\\Risk::adminIngestionRuns',
        'GET /v378/admin/billing' => 'Genie\\Handlers\\Risk::adminBilling',
        'POST /v379/ai/risk/predict' => 'Genie\\Handlers\\Risk::predictSingle',
        'POST /v379/ai/risk/batch-run' => 'Genie\\Handlers\\Risk::batchRun',
        'POST /v379/admin/seed' => 'Genie\\Handlers\\Risk::seed',
        'GET /v379/admin/model-registry' => 'Genie\\Handlers\\Risk::adminModels',
        'GET /v379/admin/predictions' => 'Genie\\Handlers\\Risk::adminPredictions',
        'GET /v379/admin/connector-health' => 'Genie\\Handlers\\Risk::adminConnectorHealth',
        'GET /v379/admin/ingestion-runs' => 'Genie\\Handlers\\Risk::adminIngestionRuns',
        'GET /v379/admin/billing' => 'Genie\\Handlers\\Risk::adminBilling',
        'POST /v380/ai/risk/predict' => 'Genie\\Handlers\\Risk::predictSingle',
        'POST /v380/ai/risk/batch-run' => 'Genie\\Handlers\\Risk::batchRun',
        'POST /v380/admin/seed' => 'Genie\\Handlers\\Risk::seed',
        'GET /v380/admin/model-registry' => 'Genie\\Handlers\\Risk::adminModels',
        'GET /v380/admin/predictions' => 'Genie\\Handlers\\Risk::adminPredictions',
        'GET /v380/admin/connector-health' => 'Genie\\Handlers\\Risk::adminConnectorHealth',
        'GET /v380/admin/ingestion-runs' => 'Genie\\Handlers\\Risk::adminIngestionRuns',
        'GET /v380/admin/billing' => 'Genie\\Handlers\\Risk::adminBilling',
        // 191차: 팬텀 핸들러 V382(클래스 부재) 매핑 11개 제거 → 404(기존 api_key hit 시 500 class-not-found).
        //   /v382/products·/v382/sync 는 템플릿 백킹이라 유지($custom 엔트리 없음). 미구현 connectors/
        //   writeback-engine/approvals/settlements/audit(프론트 Writeback/CatalogSync/Settlements 호출하나
        //   세션토큰=401·api_key=500 으로 비기능) → 라우트·$register 동반 제거(아래 register 블록 참조).

        // 191차: 팬텀 핸들러 V386(클래스 부재) connectors 매핑 5개 제거 → 404(프론트 미사용·미구현).

        // v422 AI 마케팅 추천 (전체 카테고리 지원)
        'POST /v422/ai/campaign-search'      => 'Genie\\Handlers\\ClaudeAI::campaignSearch',
        'POST /v422/ai/live-assist'          => 'Genie\\Handlers\\ClaudeAI::liveAssist',
        'POST /v422/ai/campaign-ad-creative' => 'Genie\\Handlers\\ClaudeAI::campaignAdCreative',

        // ── CRM (고객관계관리) ──────────────────────────────────────────
        'GET /crm/customers'                   => 'Genie\\Handlers\\CRM::listCustomers',
        'POST /crm/customers'                  => 'Genie\\Handlers\\CRM::createCustomer',
        'GET /crm/customers/{id}'              => 'Genie\\Handlers\\CRM::getCustomer',
        'PUT /crm/customers/{id}'              => 'Genie\\Handlers\\CRM::updateCustomer',
        'DELETE /crm/customers/{id}'           => 'Genie\\Handlers\\CRM::deleteCustomer',
        'POST /crm/activities'                 => 'Genie\\Handlers\\CRM::addActivity',
        'GET /crm/rfm'                         => 'Genie\\Handlers\\CRM::rfmAnalysis',
        'GET /crm/segments'                    => 'Genie\\Handlers\\CRM::listSegments',
        'POST /crm/segments'                   => 'Genie\\Handlers\\CRM::createSegment',
        'DELETE /crm/segments/{id}'            => 'Genie\\Handlers\\CRM::deleteSegment',
        'POST /crm/segments/{id}/refresh'      => 'Genie\\Handlers\\CRM::refreshSegment',
        'GET /crm/stats'                       => 'Genie\\Handlers\\CRM::stats',

        // ── 상품 카탈로그 writeback (192차: 일괄 등록/가격수정 실배선, dead-route 404 대체) ──
        'POST /catalog/writeback/{channel}/{sku}' => 'Genie\\Handlers\\Catalog::writeback',
        'POST /catalog/bulk-price'                => 'Genie\\Handlers\\Catalog::bulkPrice',
        'GET /catalog/listings'                   => 'Genie\\Handlers\\Catalog::listings',
        'GET /catalog/price-history'              => 'Genie\\Handlers\\Catalog::priceHistory', // 193차 Sprint4 #6
        // [현 차수] Writeback Console 실배선 — 구 /v382/*(404)·/v401·/v398(api_key 401) 세션 기반 통합
        'POST /catalog/writeback/policy'                  => 'Genie\\Handlers\\Catalog::policyValidate',
        'POST /catalog/writeback/category'               => 'Genie\\Handlers\\Catalog::categorySuggest',
        'POST /catalog/writeback/preview'                => 'Genie\\Handlers\\Catalog::preview',
        'GET /catalog/writeback/jobs'                     => 'Genie\\Handlers\\Catalog::jobs',
        'POST /catalog/writeback/{channel}/{sku}/prepare' => 'Genie\\Handlers\\Catalog::prepare',
        'POST /catalog/approvals'                        => 'Genie\\Handlers\\Catalog::approvalCreate',

        // ── 이메일 마케팅 ────────────────────────────────────────────────
        'GET /email/settings'                  => 'Genie\\Handlers\\EmailMarketing::getSettings',
        'PUT /email/settings'                  => 'Genie\\Handlers\\EmailMarketing::saveSettings',
        'POST /email/settings'                 => 'Genie\\Handlers\\EmailMarketing::saveSettings',
        'GET /email/templates'                 => 'Genie\\Handlers\\EmailMarketing::listTemplates',
        'POST /email/templates'                => 'Genie\\Handlers\\EmailMarketing::createTemplate',
        'GET /email/templates/{id}'            => 'Genie\\Handlers\\EmailMarketing::getTemplate',
        'PUT /email/templates/{id}'            => 'Genie\\Handlers\\EmailMarketing::updateTemplate',
        'DELETE /email/templates/{id}'         => 'Genie\\Handlers\\EmailMarketing::deleteTemplate',
        'GET /email/campaigns'                 => 'Genie\\Handlers\\EmailMarketing::listCampaigns',
        'POST /email/campaigns'                => 'Genie\\Handlers\\EmailMarketing::createCampaign',
        'POST /email/campaigns/{id}/send'      => 'Genie\\Handlers\\EmailMarketing::sendCampaign',
        'GET /email/campaigns/{id}/stats'      => 'Genie\\Handlers\\EmailMarketing::campaignStats',
        'POST /email/track/open'               => 'Genie\\Handlers\\EmailMarketing::trackOpen',

        // ── 카카오 채널 (알림톡) ─────────────────────────────────────────
        'GET /kakao/settings'                  => 'Genie\\Handlers\\KakaoChannel::getSettings',
        'PUT /kakao/settings'                  => 'Genie\\Handlers\\KakaoChannel::saveSettings',
        'POST /kakao/settings'                 => 'Genie\\Handlers\\KakaoChannel::saveSettings',
        'GET /kakao/templates'                 => 'Genie\\Handlers\\KakaoChannel::listTemplates',
        'POST /kakao/templates'                => 'Genie\\Handlers\\KakaoChannel::createTemplate',
        'PUT /kakao/templates/{id}'            => 'Genie\\Handlers\\KakaoChannel::updateTemplate',
        'DELETE /kakao/templates/{id}'         => 'Genie\\Handlers\\KakaoChannel::deleteTemplate',
        'POST /kakao/templates/{code}/test'    => 'Genie\\Handlers\\KakaoChannel::testSend',
        'GET /kakao/campaigns'                 => 'Genie\\Handlers\\KakaoChannel::listCampaigns',
        'POST /kakao/campaigns'                => 'Genie\\Handlers\\KakaoChannel::createCampaign',
        'DELETE /kakao/campaigns/{id}'         => 'Genie\\Handlers\\KakaoChannel::deleteCampaign',
        'POST /kakao/campaigns/{id}/send'      => 'Genie\\Handlers\\KakaoChannel::sendCampaign',
        'GET /kakao/campaigns/{id}/stats'      => 'Genie\\Handlers\\KakaoChannel::campaignStats',

        // ── 1st-Party Pixel Tracking ───────────────────────────────────────
        'POST /pixel/collect'                  => 'Genie\\Handlers\\PixelTracking::collect',
        'GET /pixel/configs'                   => 'Genie\\Handlers\\PixelTracking::listConfigs',
        'POST /pixel/configs'                  => 'Genie\\Handlers\\PixelTracking::createConfig',
        'DELETE /pixel/configs/{id}'           => 'Genie\\Handlers\\PixelTracking::deleteConfig',
        'GET /pixel/analytics'                 => 'Genie\\Handlers\\PixelTracking::analytics',
        'GET /pixel/snippet/{pixel_id}'        => 'Genie\\Handlers\\PixelTracking::getSnippet',

        // ── 고객 여정 빌더 ────────────────────────────────────────────────
        'GET /journey/journeys'                => 'Genie\\Handlers\\JourneyBuilder::listJourneys',
        'POST /journey/journeys'               => 'Genie\\Handlers\\JourneyBuilder::createJourney',
        'PUT /journey/journeys/{id}'           => 'Genie\\Handlers\\JourneyBuilder::updateJourney',
        'DELETE /journey/journeys/{id}'        => 'Genie\\Handlers\\JourneyBuilder::deleteJourney',
        'POST /journey/journeys/{id}/enroll'   => 'Genie\\Handlers\\JourneyBuilder::enrollCustomer',
        'POST /journey/journeys/{id}/launch'   => 'Genie\\Handlers\\JourneyBuilder::launchJourney',
        'GET /journey/journeys/{id}/stats'     => 'Genie\\Handlers\\JourneyBuilder::journeyStats',
        'GET /journey/templates'               => 'Genie\\Handlers\\JourneyBuilder::listTemplates',

        // ── 수요예측 서버측 실모델 — 206차 #5(Holt-Winters/Holt/이동평균) ────
        'GET /demand/summary'     => 'Genie\\Handlers\\DemandForecast::summary',
        'GET /demand/forecast'    => 'Genie\\Handlers\\DemandForecast::forecastEndpoint',
        'GET /demand/seasonality' => 'Genie\\Handlers\\DemandForecast::seasonality',
        'POST /demand/auto-replenish' => 'Genie\\Handlers\\DemandForecast::autoReplenish', // [현 차수] 자동발주

        // ── 창고 관리(WMS) 영속화 — 205차 신설(useState→백엔드) ────────────
        'GET /wms/warehouses'                  => 'Genie\\Handlers\\Wms::listWarehouses',
        'POST /wms/warehouses'                 => 'Genie\\Handlers\\Wms::saveWarehouse',
        'PUT /wms/warehouses/{id}'             => 'Genie\\Handlers\\Wms::saveWarehouse',
        'DELETE /wms/warehouses/{id}'          => 'Genie\\Handlers\\Wms::deleteWarehouse',
        'GET /wms/carriers'                    => 'Genie\\Handlers\\Wms::listCarriers',
        'POST /wms/carriers'                   => 'Genie\\Handlers\\Wms::saveCarrier',
        'PUT /wms/carriers/{id}'               => 'Genie\\Handlers\\Wms::saveCarrier',
        'DELETE /wms/carriers/{id}'            => 'Genie\\Handlers\\Wms::deleteCarrier',
        'GET /wms/permissions'                 => 'Genie\\Handlers\\Wms::listPermissions',
        'POST /wms/permissions'                => 'Genie\\Handlers\\Wms::savePermission',
        'DELETE /wms/permissions/{id}'         => 'Genie\\Handlers\\Wms::deletePermission',
        'GET /wms/movements'                   => 'Genie\\Handlers\\Wms::listMovements',
        'POST /wms/movements'                  => 'Genie\\Handlers\\Wms::createMovement',
        'GET /wms/stock'                       => 'Genie\\Handlers\\Wms::listStock',
        'GET /wms/picking'                     => 'Genie\\Handlers\\Wms::listPicking',
        'POST /wms/picking'                    => 'Genie\\Handlers\\Wms::savePicking',
        'PUT /wms/picking/{id}'                => 'Genie\\Handlers\\Wms::savePicking',
        'GET /wms/supply-orders'               => 'Genie\\Handlers\\Wms::listSupplyOrders',
        'POST /wms/supply-orders'              => 'Genie\\Handlers\\Wms::saveSupplyOrder',
        'PUT /wms/supply-orders/{id}'          => 'Genie\\Handlers\\Wms::saveSupplyOrder',
        'GET /wms/lots'                        => 'Genie\\Handlers\\Wms::listLots',
        'POST /wms/lots'                       => 'Genie\\Handlers\\Wms::createLot',
        'DELETE /wms/lots/{id}'                => 'Genie\\Handlers\\Wms::deleteLot',
        // 212차 #3: 매입처(suppliers) registry
        'GET /wms/suppliers'                   => 'Genie\\Handlers\\Wms::listSuppliers',
        'POST /wms/suppliers'                  => 'Genie\\Handlers\\Wms::saveSupplier',
        'PUT /wms/suppliers/{id}'              => 'Genie\\Handlers\\Wms::saveSupplier',
        'DELETE /wms/suppliers/{id}'           => 'Genie\\Handlers\\Wms::deleteSupplier',
        // 212차 #3-B: 파트너 서브계정 — 관리자(본사) 계정 발급
        'GET /auth/partners'                   => 'Genie\\Handlers\\PartnerPortal::listAccounts',
        'POST /auth/partners'                  => 'Genie\\Handlers\\PartnerPortal::createAccount',
        'PUT /auth/partners/{id}'              => 'Genie\\Handlers\\PartnerPortal::updateAccount',
        'DELETE /auth/partners/{id}'           => 'Genie\\Handlers\\PartnerPortal::deleteAccount',
        // 212차 #3-B: 파트너 포털(파트너 토큰 자가인증)
        'POST /partner/login'                  => 'Genie\\Handlers\\PartnerPortal::login',
        'POST /partner/logout'                 => 'Genie\\Handlers\\PartnerPortal::logout',
        'GET /partner/me'                      => 'Genie\\Handlers\\PartnerPortal::me',
        'GET /partner/data'                    => 'Genie\\Handlers\\PartnerPortal::data',
        'POST /partner/action'                 => 'Genie\\Handlers\\PartnerPortal::action',

        // ── 라이브 커머스(Live Commerce) — 208차 신설(세션/상품/구매/채팅/연동/SSE) ────
        'GET /v425/live/sessions'                      => 'Genie\\Handlers\\LiveCommerce::listSessions',
        'POST /v425/live/sessions'                     => 'Genie\\Handlers\\LiveCommerce::saveSession',
        'PUT /v425/live/sessions/{id}'                 => 'Genie\\Handlers\\LiveCommerce::saveSession',
        'DELETE /v425/live/sessions/{id}'              => 'Genie\\Handlers\\LiveCommerce::deleteSession',
        'POST /v425/live/sessions/{id}/go-live'        => 'Genie\\Handlers\\LiveCommerce::goLive',
        'POST /v425/live/sessions/{id}/end'            => 'Genie\\Handlers\\LiveCommerce::endSession',
        'GET /v425/live/sessions/{id}/products'        => 'Genie\\Handlers\\LiveCommerce::listProducts',
        'POST /v425/live/sessions/{id}/products'       => 'Genie\\Handlers\\LiveCommerce::saveProduct',
        'DELETE /v425/live/products/{id}'              => 'Genie\\Handlers\\LiveCommerce::deleteProduct',
        'POST /v425/live/products/{id}/feature'        => 'Genie\\Handlers\\LiveCommerce::featureProduct',
        'GET /v425/live/sessions/{id}/orders'          => 'Genie\\Handlers\\LiveCommerce::listOrders',
        'POST /v425/live/sessions/{id}/orders'         => 'Genie\\Handlers\\LiveCommerce::placeOrder',
        'GET /v425/live/sessions/{id}/chat'            => 'Genie\\Handlers\\LiveCommerce::listChat',
        'POST /v425/live/sessions/{id}/chat'           => 'Genie\\Handlers\\LiveCommerce::postChat',
        'POST /v425/live/sessions/{id}/heartbeat'      => 'Genie\\Handlers\\LiveCommerce::heartbeat',
        'GET /v425/live/sessions/{id}/stats'           => 'Genie\\Handlers\\LiveCommerce::stats',
        'GET /v425/live/overview'                      => 'Genie\\Handlers\\LiveCommerce::overview',
        'GET /v425/live/integrations'                  => 'Genie\\Handlers\\LiveCommerce::listIntegrations',
        'POST /v425/live/integrations'                 => 'Genie\\Handlers\\LiveCommerce::saveIntegration',
        'DELETE /v425/live/integrations/{channel}'     => 'Genie\\Handlers\\LiveCommerce::deleteIntegration',
        'GET /v425/live/stream'                        => 'Genie\\Handlers\\LiveCommerce::stream',
        // 범용 OAuth 2.0 연결 프레임워크 — 208차 #2(활성화 준비)
        'GET /v425/oauth/status'                       => 'Genie\\Handlers\\OAuth::status',
        'GET /v425/oauth/{provider}/authorize'         => 'Genie\\Handlers\\OAuth::authorize',
        'GET /v425/oauth/{provider}/callback'          => 'Genie\\Handlers\\OAuth::callback',
        'POST /v425/admin/oauth/{provider}/config'     => 'Genie\\Handlers\\OAuth::saveConfig',
        // 멀티 송출 대상(RTMP) — 208차 #1
        'GET /v425/live/sessions/{id}/destinations'    => 'Genie\\Handlers\\LiveCommerce::listDestinations',
        'POST /v425/live/sessions/{id}/destinations'   => 'Genie\\Handlers\\LiveCommerce::saveDestination',
        'DELETE /v425/live/destinations/{id}'          => 'Genie\\Handlers\\LiveCommerce::deleteDestination',
        'POST /v425/live/destinations/{id}/toggle'     => 'Genie\\Handlers\\LiveCommerce::toggleDestination',
        'POST /v425/live/sessions/{id}/multicast/{action}' => 'Genie\\Handlers\\LiveCommerce::multicast',

        // ── Customer AI (이탈 예측 + LTV + 구매확률 + 상품추천 + 모델성능) ────
        'GET /customer-ai/churn-scores'        => 'Genie\\Handlers\\CustomerAI::churnScores',
        'GET /customer-ai/ltv-segments'        => 'Genie\\Handlers\\CustomerAI::ltvSegments',
        'POST /customer-ai/auto-action'        => 'Genie\\Handlers\\CustomerAI::autoAction',
        'GET /customer-ai/next-best-action'    => 'Genie\\Handlers\\CustomerAI::nextBestAction',
        'GET /customer-ai/model-performance'   => 'Genie\\Handlers\\CustomerAI::modelPerformance',
        'GET /customer-ai/product-recommendations' => 'Genie\\Handlers\\CustomerAI::productRecommendations',
        'GET /customer-ai/integrated-summary'  => 'Genie\\Handlers\\CustomerAI::integratedSummary',

        // ── Reports — 리포트 빌더 + 예약 발송 (193차 Sprint4 신규 실구현, 세션 self-auth) ──
        'GET /reports/schedules'         => 'Genie\\Handlers\\Reports::listSchedules',
        'POST /reports/schedules'        => 'Genie\\Handlers\\Reports::createSchedule',
        'PATCH /reports/schedules/{id}'  => 'Genie\\Handlers\\Reports::updateSchedule',
        'DELETE /reports/schedules/{id}' => 'Genie\\Handlers\\Reports::deleteSchedule',
        'POST /reports/run/{id}'         => 'Genie\\Handlers\\Reports::runNow',
        'GET /reports/preview'           => 'Genie\\Handlers\\Reports::preview',
        'GET /reports/history'           => 'Genie\\Handlers\\Reports::history',


        // ── 이메일/카카오 확장(A/B·중복·analytics·친구톡·SMS) — 183차 P0: 핸들러 미구현으로
        //    호출 시 500 나던 죽은 매핑 7건 제거(활성 UI 미참조). 향후 기능화 시 핸들러와 함께 재등록.
        //    (백로그: EmailMarketing A/B·duplicate·analytics, KakaoChannel friendtalk·sms·analytics)

        // webhooks / parsers (v402-v404)
        'POST /v402/influencer/settlements/parse' => 'Genie\\Handlers\\Webhooks::influencerSettlementParse',
        'POST /v402/webhooks/{vendor}' => 'Genie\\Handlers\\Webhooks::vendorWebhook',
        'POST /v403/influencer/settlements/parse' => 'Genie\\Handlers\\Webhooks::influencerSettlementParse',
        'POST /v403/webhooks/{vendor}' => 'Genie\\Handlers\\Webhooks::vendorWebhook',
        'POST /v403/esign/webhooks/{provider}' => 'Genie\\Handlers\\Webhooks::esignWebhook',
        'POST /v404/influencer/settlements/parse' => 'Genie\\Handlers\\Webhooks::influencerSettlementParse',
        'POST /v404/webhooks/{vendor}' => 'Genie\\Handlers\\Webhooks::vendorWebhook',
        'POST /v404/esign/webhooks/{provider}' => 'Genie\\Handlers\\Webhooks::esignWebhook',
        'GET /v410/actions/presets' => 'Genie\\Handlers\\Alerting::actionPresets',
        'GET /v410/alert_policies' => 'Genie\\Handlers\\Alerting::listPolicies',
        'POST /v410/alert_policies' => 'Genie\\Handlers\\Alerting::createPolicy',
        'PUT /v410/alert_policies/{policy_id}' => 'Genie\\Handlers\\Alerting::updatePolicy',
        'DELETE /v410/alert_policies/{policy_id}' => 'Genie\\Handlers\\Alerting::deletePolicy',
        'POST /v410/alerts/evaluate' => 'Genie\\Handlers\\Alerting::evaluate',
        'GET /v410/alerts' => 'Genie\\Handlers\\Alerting::listAlerts',
        'GET /v410/action_requests' => 'Genie\\Handlers\\Alerting::listActionRequests',
        'POST /v410/action_requests/{id}/decide' => 'Genie\\Handlers\\Alerting::decideAction',
        'POST /v410/action_requests/{id}/execute' => 'Genie\\Handlers\\Alerting::executeAction',
        'GET /v410/audit_logs' => 'Genie\\Handlers\\Alerting::auditLogs',
        'GET /v418/actions/presets' => 'Genie\\Handlers\\Alerting::actionPresets',
        'GET /v418/alert_policies' => 'Genie\\Handlers\\Alerting::listPolicies',
        'POST /v418/alert_policies' => 'Genie\\Handlers\\Alerting::createPolicy',
        'PUT /v418/alert_policies/{policy_id}' => 'Genie\\Handlers\\Alerting::updatePolicy',
        'DELETE /v418/alert_policies/{policy_id}' => 'Genie\\Handlers\\Alerting::deletePolicy',
        'POST /v418/alerts/evaluate' => 'Genie\\Handlers\\Alerting::evaluate',
        'GET /v418/alerts' => 'Genie\\Handlers\\Alerting::listAlerts',
        'GET /v418/mappings' => 'Genie\\Handlers\\Mapping::listMappings',
        'POST /v418/mappings' => 'Genie\\Handlers\\Mapping::upsertMapping',
        'PUT /v418/mappings/{mapping_id}' => 'Genie\\Handlers\\Mapping::updateMapping',
        'DELETE /v418/mappings/{mapping_id}' => 'Genie\\Handlers\\Mapping::deleteMapping',
        'POST /v418/mappings/proposals' => 'Genie\\Handlers\\Mapping::propose',
        'GET /v418/mappings/proposals' => 'Genie\\Handlers\\Mapping::listProposals',
        'POST /v418/mappings/proposals/{req_id}/approve' => 'Genie\\Handlers\\Mapping::approve',
        'POST /v418/mappings/proposals/{req_id}/apply' => 'Genie\\Handlers\\Mapping::apply',
        'POST /v418/mappings/impact_preview' => 'Genie\\Handlers\\Mapping::impactPreview',
        'POST /v418/mappings/validate' => 'Genie\\Handlers\\Mapping::validate',
        'GET /v418/mappings/validation_rules' => 'Genie\\Handlers\\Mapping::listRules',
        'POST /v418/mappings/validation_rules' => 'Genie\\Handlers\\Mapping::createRule',
        'PUT /v418/mappings/validation_rules/{rule_id}' => 'Genie\\Handlers\\Mapping::updateRule',
        'DELETE /v418/mappings/validation_rules/{rule_id}' => 'Genie\\Handlers\\Mapping::deleteRule',
        // 191차: 팬텀 핸들러 V418(클래스 부재) 매핑 5개(events/rollups/ai-policies) 제거 → 404.
        //   동일 v418 prefix 의 Mapping/Insights/Alerting 라우트는 실 핸들러라 유지.
        // v418.1 - aggregated decisioning (ads + influencer + commerce; no PII)
        'POST /v4181/ingest/ad-insights' => 'Genie\\Handlers\\Decisioning::ingestAdInsights',
        'POST /v4181/ingest/influencer-insights' => 'Genie\\Handlers\\Decisioning::ingestInfluencerInsights',
        'POST /v4181/ingest/commerce-agg' => 'Genie\\Handlers\\Decisioning::ingestCommerceAgg',
        'GET /v4181/decisioning/segments' => 'Genie\\Handlers\\Decisioning::segments',
        'GET /v4181/decisioning/recommendations' => 'Genie\\Handlers\\Decisioning::recommendations',
        'GET /v4181/decisioning/segment/{gender}/{age}/{region}/affinity' => 'Genie\\Handlers\\Decisioning::segmentAffinity',

        // ── WhatsApp Business API ──────────────────────────────────────────
        // 191차 부활: /api strip 정합 위해 /whatsapp 등록(세션 self-auth, webhook 만 무인증).
        'GET /whatsapp/settings'                  => 'Genie\\Handlers\\WhatsApp::getSettings',
        'POST /whatsapp/settings'                 => 'Genie\\Handlers\\WhatsApp::saveSettings',
        'POST /whatsapp/send'                     => 'Genie\\Handlers\\WhatsApp::send',
        'POST /whatsapp/broadcast'                => 'Genie\\Handlers\\WhatsApp::broadcast',
        'GET /whatsapp/templates'                 => 'Genie\\Handlers\\WhatsApp::templates',
        'GET /whatsapp/messages'                  => 'Genie\\Handlers\\WhatsApp::messages',
        'POST /whatsapp/webhooks'                 => 'Genie\\Handlers\\WhatsApp::webhook',

        // ── SMS Marketing (NHN Cloud bizMessage) ──────────────────────────
        // 191차 부활: /api strip(basePath) 정합 위해 /sms 로 등록(프론트 /api/sms 호출→strip→/sms 매칭). 세션 self-auth(bypass).
        'GET /sms/settings'                       => 'Genie\\Handlers\\SmsMarketing::getSettings',
        'POST /sms/settings'                      => 'Genie\\Handlers\\SmsMarketing::saveSettings',
        'POST /sms/send'                          => 'Genie\\Handlers\\SmsMarketing::send',
        'POST /sms/broadcast'                     => 'Genie\\Handlers\\SmsMarketing::broadcast',
        'GET /sms/messages'                       => 'Genie\\Handlers\\SmsMarketing::messages',
        'GET /sms/stats'                          => 'Genie\\Handlers\\SmsMarketing::stats',
        // 209차 P1: Templates·Campaigns (프론트 탭 백엔드 부재 해소)
        'GET /sms/templates'                      => 'Genie\\Handlers\\SmsMarketing::listTemplates',
        'POST /sms/templates'                     => 'Genie\\Handlers\\SmsMarketing::saveTemplate',
        'PUT /sms/templates/{id}'                 => 'Genie\\Handlers\\SmsMarketing::updateTemplate',
        'DELETE /sms/templates/{id}'              => 'Genie\\Handlers\\SmsMarketing::deleteTemplate',
        'GET /sms/campaigns'                      => 'Genie\\Handlers\\SmsMarketing::listCampaigns',
        'POST /sms/campaigns'                     => 'Genie\\Handlers\\SmsMarketing::saveCampaign',
        'POST /sms/campaigns/{id}/{action}'       => 'Genie\\Handlers\\SmsMarketing::campaignAction',

        // ── GDPR / 개인정보 동의 관리 ─────────────────────────────────────
        // 204차: /api 접두 없이 등록(basePath '/api' strip 후 매칭). 과거 '/api/gdpr/*' 등록은
        //   strip 후 '/gdpr/*' 와 불일치하여 동의 저장이 404 였다(email/crm/channel-sync 와 동일 정정).
        'POST /gdpr/consent'                      => 'Genie\\Handlers\\GdprConsent::save',
        'GET /gdpr/consent'                       => 'Genie\\Handlers\\GdprConsent::get',
        'DELETE /gdpr/consent'                    => 'Genie\\Handlers\\GdprConsent::withdraw',
        'GET /gdpr/stats'                         => 'Genie\\Handlers\\GdprConsent::stats',

        // ── ML 모델 모니터 (드리프트 감지 + 자동 재학습) ─────────────────
        'GET /api/models'                         => 'Genie\\Handlers\\ModelMonitor::listModels',
        'GET /api/models/{id}/metrics'            => 'Genie\\Handlers\\ModelMonitor::modelMetrics',
        'POST /api/models/{id}/retrain'           => 'Genie\\Handlers\\ModelMonitor::retrain',
        'GET /api/models/drift-report'            => 'Genie\\Handlers\\ModelMonitor::driftReport',
        'POST /api/models/drift-check'            => 'Genie\\Handlers\\ModelMonitor::driftCheck',

        // ── Instagram / Facebook DM (Meta Messaging API) ──────────────────
        // 191차 부활: /api strip 정합 위해 /instagram 등록(세션 self-auth, webhook 만 무인증).
        'GET /instagram/settings'                 => 'Genie\\Handlers\\InstagramDM::getSettings',
        'POST /instagram/settings'                => 'Genie\\Handlers\\InstagramDM::saveSettings',
        'GET /instagram/conversations'            => 'Genie\\Handlers\\InstagramDM::conversations',
        'POST /instagram/send'                    => 'Genie\\Handlers\\InstagramDM::send',
        'POST /instagram/broadcast'               => 'Genie\\Handlers\\InstagramDM::broadcast', // [현차수] DM 단체발송 실배선
        'GET /instagram/stats'                    => 'Genie\\Handlers\\InstagramDM::stats',
        'POST /instagram/webhooks'                => 'Genie\\Handlers\\InstagramDM::webhook',

        // ── LINE Messaging API (191차 신설: 프론트 호출하나 백엔드 부재였음) ──
        'GET /line/settings'                      => 'Genie\\Handlers\\Line::getSettings',
        'POST /line/settings'                     => 'Genie\\Handlers\\Line::saveSettings',
        'GET /line/templates'                     => 'Genie\\Handlers\\Line::listTemplates',
        'POST /line/templates'                    => 'Genie\\Handlers\\Line::createTemplate',
        'DELETE /line/templates/{id}'             => 'Genie\\Handlers\\Line::deleteTemplate',
        'GET /line/campaigns'                     => 'Genie\\Handlers\\Line::listCampaigns',
        'POST /line/campaigns'                    => 'Genie\\Handlers\\Line::createCampaign',
        'POST /line/campaigns/{id}/send'          => 'Genie\\Handlers\\Line::sendCampaign',
        'DELETE /line/campaigns/{id}'             => 'Genie\\Handlers\\Line::deleteCampaign',
        'GET /line/stats'                         => 'Genie\\Handlers\\Line::stats',
        'POST /line/webhooks'                     => 'Genie\\Handlers\\Line::webhook',

        // ── AI Content Generator (Claude API) ────────────────────────────
        'GET /api/ai/settings'                    => 'Genie\\Handlers\\AiGenerate::getSettings',
        'POST /api/ai/settings'                   => 'Genie\\Handlers\\AiGenerate::saveSettings',
        'POST /api/ai/generate/email'             => 'Genie\\Handlers\\AiGenerate::generateEmail',
        'POST /api/ai/generate/segment'           => 'Genie\\Handlers\\AiGenerate::generateSegment',
        'POST /api/ai/generate/ad-copy'           => 'Genie\\Handlers\\AiGenerate::generateAdCopy',

        // ── 채널 실연동 동기화 (인증키 → 상품/주문/재고 자동 수집) ──────────
        'GET /api/channel-sync/status'                    => 'Genie\\Handlers\\ChannelSync::status',
        'POST /api/channel-sync/credentials'              => 'Genie\\Handlers\\ChannelSync::saveCredential',
        'DELETE /api/channel-sync/credentials/{id}'       => 'Genie\\Handlers\\ChannelSync::deleteCredential',
        'POST /api/channel-sync/{channel}/test'           => 'Genie\\Handlers\\ChannelSync::testChannel',
        'POST /api/channel-sync/{channel}/sync'           => 'Genie\\Handlers\\ChannelSync::syncChannel',
        'GET /api/channel-sync/products'                  => 'Genie\\Handlers\\ChannelSync::products',
        'GET /api/channel-sync/orders'                    => 'Genie\\Handlers\\ChannelSync::orders',
        'GET /api/channel-sync/inventory'                 => 'Genie\\Handlers\\ChannelSync::inventory',
        'POST /api/channel-sync/webhooks/{channel}'       => 'Genie\\Handlers\\ChannelSync::webhook',
        // 202차 항목2c: Apache Alias /api(setBasePath) 환경에서 /api 가 strip 되어 매칭되도록
        //   no-/api 변형도 등록(OmniChannel/CatalogSync 가 /api/channel-sync/* 호출 → 404 해소).
        'GET /channel-sync/status'                        => 'Genie\\Handlers\\ChannelSync::status',
        'POST /channel-sync/credentials'                  => 'Genie\\Handlers\\ChannelSync::saveCredential',
        'DELETE /channel-sync/credentials/{id}'           => 'Genie\\Handlers\\ChannelSync::deleteCredential',
        'POST /channel-sync/{channel}/test'               => 'Genie\\Handlers\\ChannelSync::testChannel',
        'POST /channel-sync/{channel}/sync'               => 'Genie\\Handlers\\ChannelSync::syncChannel',
        'GET /channel-sync/products'                      => 'Genie\\Handlers\\ChannelSync::products',
        'GET /channel-sync/orders'                        => 'Genie\\Handlers\\ChannelSync::orders',
        'GET /channel-sync/inventory'                     => 'Genie\\Handlers\\ChannelSync::inventory',
        'POST /channel-sync/webhooks/{channel}'           => 'Genie\\Handlers\\ChannelSync::webhook',

        // [현 차수] 통합 채널 레지스트리(DB 동적) — 등록 UI 동적 로드 + admin CRUD
        'GET /v426/channels'                   => 'Genie\\Handlers\\ChannelRegistry::listChannels',
        'GET /api/v426/channels'               => 'Genie\\Handlers\\ChannelRegistry::listChannels',
        'GET /v426/admin/channels'             => 'Genie\\Handlers\\ChannelRegistry::adminList',
        'GET /api/v426/admin/channels'         => 'Genie\\Handlers\\ChannelRegistry::adminList',
        'POST /v426/admin/channels'            => 'Genie\\Handlers\\ChannelRegistry::upsert',
        'POST /api/v426/admin/channels'        => 'Genie\\Handlers\\ChannelRegistry::upsert',
        'DELETE /v426/admin/channels/{key}'    => 'Genie\\Handlers\\ChannelRegistry::remove',
        'DELETE /api/v426/admin/channels/{key}'=> 'Genie\\Handlers\\ChannelRegistry::remove',
        // [현 차수] v427 Logistics 배송추적(물류/특송 실어댑터)
        'GET /v427/logistics/carriers'         => 'Genie\\Handlers\\Logistics::carriers',
        'GET /api/v427/logistics/carriers'     => 'Genie\\Handlers\\Logistics::carriers',
        'GET /v427/logistics/shipments'        => 'Genie\\Handlers\\Logistics::shipments',
        'GET /api/v427/logistics/shipments'    => 'Genie\\Handlers\\Logistics::shipments',
        'POST /v427/logistics/track'           => 'Genie\\Handlers\\Logistics::track',
        'POST /api/v427/logistics/track'       => 'Genie\\Handlers\\Logistics::track',
        'POST /v427/logistics/refresh'         => 'Genie\\Handlers\\Logistics::refresh',
        'POST /api/v427/logistics/refresh'     => 'Genie\\Handlers\\Logistics::refresh',
        'DELETE /v427/logistics/shipments/{id}'    => 'Genie\\Handlers\\Logistics::remove',
        'DELETE /api/v427/logistics/shipments/{id}'=> 'Genie\\Handlers\\Logistics::remove',
        // [현 차수] v427 PG 정산(결제 게이트웨이 실어댑터)
        'GET /v427/pg/providers'               => 'Genie\\Handlers\\PgSettlement::providers',
        'GET /api/v427/pg/providers'           => 'Genie\\Handlers\\PgSettlement::providers',
        'GET /v427/pg/settlements'             => 'Genie\\Handlers\\PgSettlement::settlements',
        'GET /api/v427/pg/settlements'         => 'Genie\\Handlers\\PgSettlement::settlements',
        'POST /v427/pg/sync'                   => 'Genie\\Handlers\\PgSettlement::sync',
        'POST /api/v427/pg/sync'               => 'Genie\\Handlers\\PgSettlement::sync',


// v418.1 additive marketing insights (aggregated-only, no PII)
'POST /v418/insights/audience-breakdowns' => 'Genie\\Handlers\\Insights::ingestAdAudience',
'POST /v418/insights/influencer-audience' => 'Genie\\Handlers\\Insights::ingestInfluencerAudience',
'POST /v418/insights/commerce-aggregates' => 'Genie\\Handlers\\Insights::ingestCommerceDaily',
'POST /v418/insights/creative-sku-map' => 'Genie\\Handlers\\Insights::upsertCreativeSkuMap',
'GET /v418/insights/target-performance' => 'Genie\\Handlers\\Insights::targetPerformance',

// also exposed as v4181 (explicit minor version)
'POST /v4181/insights/audience-breakdowns' => 'Genie\\Handlers\\Insights::ingestAdAudience',
'POST /v4181/insights/influencer-audience' => 'Genie\\Handlers\\Insights::ingestInfluencerAudience',
'POST /v4181/insights/commerce-aggregates' => 'Genie\\Handlers\\Insights::ingestCommerceDaily',
'POST /v4181/insights/creative-sku-map' => 'Genie\\Handlers\\Insights::upsertCreativeSkuMap',
'GET /v4181/insights/target-performance' => 'Genie\\Handlers\\Insights::targetPerformance',

// v418.2 - aliases for v418.1 endpoints (superset, backward compatible)
'POST /v4182/ingest/ad-insights' => 'Genie\Handlers\Decisioning::ingestAdInsights',
'POST /v4182/ingest/influencer-insights' => 'Genie\Handlers\Decisioning::ingestInfluencerInsights',
'POST /v4182/ingest/commerce-agg' => 'Genie\Handlers\Decisioning::ingestCommerceAgg',
'GET /v4182/decisioning/segments' => 'Genie\Handlers\Decisioning::segments',
'GET /v4182/decisioning/recommendations' => 'Genie\Handlers\Decisioning::recommendations',
'GET /v4182/decisioning/segment/{gender}/{age}/{region}/affinity' => 'Genie\Handlers\Decisioning::segmentAffinity',

'POST /v4182/insights/audience-breakdowns' => 'Genie\Handlers\Insights::ingestAdAudience',
'POST /v4182/insights/influencer-audience' => 'Genie\Handlers\Insights::ingestInfluencerAudience',
'GET /v4182/decisioning/segment/{gender}/{age}/{region}/affinity' => 'Genie\\Handlers\\Decisioning::segmentAffinity',

'POST /v4182/insights/audience-breakdowns' => 'Genie\\Handlers\\Insights::ingestAdAudience',
'POST /v4182/insights/influencer-audience' => 'Genie\\Handlers\\Insights::ingestInfluencerAudience',
'POST /v4182/insights/commerce-aggregates' => 'Genie\\Handlers\\Insights::ingestCommerceDaily',
'POST /v4182/insights/creative-sku-map' => 'Genie\\Handlers\\Insights::upsertCreativeSkuMap',
'GET /v4182/insights/target-performance' => 'Genie\\Handlers\\Insights::targetPerformance',


// v418.3 - highest spec aliases for v418.2 endpoints (fully backward compatible)
        'POST /v4183/ingest/ad-insights' => 'Genie\\Handlers\\Decisioning::ingestAdInsights',
        'POST /v4183/ingest/influencer-insights' => 'Genie\\Handlers\\Decisioning::ingestInfluencerInsights',
        'POST /v4183/ingest/commerce-agg' => 'Genie\\Handlers\\Decisioning::ingestCommerceAgg',
        'GET /v4183/decisioning/segments' => 'Genie\\Handlers\\Decisioning::segments',
        'GET /v4183/decisioning/recommendations' => 'Genie\\Handlers\\Decisioning::recommendations',
        'GET /v4183/decisioning/segment/{gender}/{age}/{region}/affinity' => 'Genie\\Handlers\\Decisioning::segmentAffinity',

        'POST /v4183/insights/audience-breakdowns' => 'Genie\\Handlers\\Insights::ingestAdAudience',
        'POST /v4183/insights/influencer-audience' => 'Genie\\Handlers\\Insights::ingestInfluencerAudience',
        'POST /v4183/insights/commerce-aggregates' => 'Genie\\Handlers\\Insights::ingestCommerceDaily',
        'POST /v4183/insights/creative-sku-map' => 'Genie\\Handlers\\Insights::upsertCreativeSkuMap',
        'GET /v4183/insights/target-performance' => 'Genie\\Handlers\\Insights::targetPerformance',

        // ── v419 Semi-Attribution ──────────────────────────────────────────
        'POST /v419/attribution/coupons'    => 'Genie\\Handlers\\Attribution::createCoupon',
        'GET /v419/attribution/coupons'     => 'Genie\\Handlers\\Attribution::listCoupons',
        'POST /v419/attribution/deeplinks'  => 'Genie\\Handlers\\Attribution::createDeeplink',
        'GET /v419/attribution/deeplinks'   => 'Genie\\Handlers\\Attribution::listDeeplinks',
        'POST /v419/attribution/touch'      => 'Genie\\Handlers\\Attribution::recordTouch',
        'POST /v419/attribution/score'      => 'Genie\\Handlers\\Attribution::score',
        'GET /v419/attribution/results'     => 'Genie\\Handlers\\Attribution::results',
        'GET /v419/attribution/summary'     => 'Genie\\Handlers\\Attribution::summary',

        // ── v419 Graph Scoring ────────────────────────────────────────────
        'POST /v419/graph/nodes'                       => 'Genie\\Handlers\\GraphScore::upsertNode',
        'GET /v419/graph/nodes'                        => 'Genie\\Handlers\\GraphScore::listNodes',
        'POST /v419/graph/edges'                       => 'Genie\\Handlers\\GraphScore::upsertEdge',
        'GET /v419/graph/edges'                        => 'Genie\\Handlers\\GraphScore::listEdges',
        'GET /v419/graph/score/influencer/{id}'        => 'Genie\\Handlers\\GraphScore::scoreInfluencer',
        'GET /v419/graph/score/sku/{sku}'              => 'Genie\\Handlers\\GraphScore::scoreSku',
        'GET /v419/graph/score/order/{id}'             => 'Genie\\Handlers\\GraphScore::scoreOrder',
        'GET /v419/graph/summary'                      => 'Genie\\Handlers\\GraphScore::summary',

        // ── v419 Korean Domestic Channel ──────────────────────────────────────
        'GET /v419/kr/channels'                        => 'Genie\\Handlers\\KrChannel::listChannels',
        'GET /v419/kr/channels/{key}'                  => 'Genie\\Handlers\\KrChannel::getChannel',
        'POST /v419/kr/fee-rules'                      => 'Genie\\Handlers\\KrChannel::upsertFeeRule',
        'GET /v419/kr/fee-rules/{key}'                 => 'Genie\\Handlers\\KrChannel::listFeeRules',
        'POST /v419/kr/settle/ingest'                  => 'Genie\\Handlers\\KrChannel::ingestLines',
        'POST /v419/kr/settle/ingest-raw/{key}'        => 'Genie\\Handlers\\KrChannel::ingestRaw',
        'GET /v419/kr/settle/lines'                    => 'Genie\\Handlers\\KrChannel::listLines',
        'GET /v419/kr/settle/summary'                  => 'Genie\\Handlers\\KrChannel::summary',
        'POST /v419/kr/recon/run'                      => 'Genie\\Handlers\\KrChannel::runRecon',
        'GET /v419/kr/recon/reports'                   => 'Genie\\Handlers\\KrChannel::listReports',
        'GET /v419/kr/recon/reports/{id}'              => 'Genie\\Handlers\\KrChannel::getReport',
        'PATCH /v419/kr/recon/tickets/{id}'            => 'Genie\\Handlers\\KrChannel::patchTicket',


        // ── v420 Price Optimisation ───────────────────────────────────────────
        'POST /v420/price/products'          => 'Genie\\Handlers\\PriceOpt::createProduct',
        'GET /v420/price/products'           => 'Genie\\Handlers\\PriceOpt::listProducts',
        'PUT /v420/price/products/{sku}'     => 'Genie\\Handlers\\PriceOpt::updateProduct',
        'DELETE /v420/price/products/{sku}'  => 'Genie\\Handlers\\PriceOpt::deleteProduct',
        'POST /v420/price/elasticity'        => 'Genie\\Handlers\\PriceOpt::addElasticity',
        'POST /v420/price/elasticity/bulk'   => 'Genie\\Handlers\\PriceOpt::bulkElasticity',
        'POST /v420/price/optimize'          => 'Genie\\Handlers\\PriceOpt::optimize',
        'POST /v420/price/optimize/batch'    => 'Genie\\Handlers\\PriceOpt::optimizeBatch',
        'GET /v420/price/recommendations'    => 'Genie\\Handlers\\PriceOpt::listRecommendations',
        'POST /v420/price/simulate'          => 'Genie\\Handlers\\PriceOpt::simulate',
        'GET /v420/price/summary'            => 'Genie\\Handlers\\PriceOpt::summary',
        'POST /v420/channel-mix/simulate'    => 'Genie\\Handlers\\PriceOpt::channelMixSimulate',
        'GET /v420/channel-mix/results'      => 'Genie\\Handlers\\PriceOpt::channelMixResults',
        // competitor monitoring
        'GET /v420/price/competitor'          => 'Genie\\Handlers\\PriceOpt::listCompetitors',
        'POST /v420/price/competitor'         => 'Genie\\Handlers\\PriceOpt::upsertCompetitor',
        // dynamic repricer
        'GET /v420/price/repricer/rules'      => 'Genie\\Handlers\\PriceOpt::listRepricerRules',
        'POST /v420/price/repricer/rules'     => 'Genie\\Handlers\\PriceOpt::createRepricerRule',
        'GET /v420/price/repricer/history'    => 'Genie\\Handlers\\PriceOpt::repricerHistory',
        'POST /v420/price/repricer/rules/{id}/toggle' => 'Genie\\Handlers\\PriceOpt::toggleRepricerRule',
        // promo calendar
        'GET /v420/price/calendar'            => 'Genie\\Handlers\\PriceOpt::listCalendar',
        'POST /v420/price/calendar'           => 'Genie\\Handlers\\PriceOpt::createCalendarEvent',
        'DELETE /v420/price/calendar/{id}'    => 'Genie\\Handlers\\PriceOpt::deleteCalendarEvent',

        // ── v420 Supply Chain Visibility ───────────────────────────────────────
        'GET /v420/supply/lines'              => 'Genie\\Handlers\\SupplyChain::listLines',
        'POST /v420/supply/lines'             => 'Genie\\Handlers\\SupplyChain::createLine',
        'PUT /v420/supply/lines/{id}'         => 'Genie\\Handlers\\SupplyChain::updateLine',
        'DELETE /v420/supply/lines/{id}'      => 'Genie\\Handlers\\SupplyChain::deleteLine',
        'POST /v420/supply/lines/{id}/stage'  => 'Genie\\Handlers\\SupplyChain::updateStage',
        'GET /v420/supply/suppliers'           => 'Genie\\Handlers\\SupplyChain::listSuppliers',
        'POST /v420/supply/suppliers'          => 'Genie\\Handlers\\SupplyChain::createSupplier',
        'PUT /v420/supply/suppliers/{id}'      => 'Genie\\Handlers\\SupplyChain::updateSupplier',
        'DELETE /v420/supply/suppliers/{id}'   => 'Genie\\Handlers\\SupplyChain::deleteSupplier',
        'GET /v420/supply/risk-rules'          => 'Genie\\Handlers\\SupplyChain::listRiskRules',
        'POST /v420/supply/risk-rules'         => 'Genie\\Handlers\\SupplyChain::createRiskRule',
        'POST /v420/supply/risk-rules/{id}/toggle' => 'Genie\\Handlers\\SupplyChain::toggleRiskRule',
        'GET /v420/supply/summary'             => 'Genie\\Handlers\\SupplyChain::summary',

        // ── v420 Returns Portal ──────────────────────────────────────────────
        'GET /v420/returns/list'                => 'Genie\\Handlers\\ReturnsPortal::list',
        'POST /v420/returns'                    => 'Genie\\Handlers\\ReturnsPortal::create',
        'POST /v420/returns/{id}/status'        => 'Genie\\Handlers\\ReturnsPortal::updateStatus',
        'POST /v420/returns/{id}/wms-link'      => 'Genie\\Handlers\\ReturnsPortal::wmsLink',
        'DELETE /v420/returns/{id}'             => 'Genie\\Handlers\\ReturnsPortal::delete',
        'GET /v420/returns/summary'             => 'Genie\\Handlers\\ReturnsPortal::summary',
        'GET /v420/returns/settings'            => 'Genie\\Handlers\\ReturnsPortal::getSettings',
        'POST /v420/returns/settings'           => 'Genie\\Handlers\\ReturnsPortal::saveSettings',
        'POST /v420/returns/automation/toggle'  => 'Genie\\Handlers\\ReturnsPortal::toggleAutomation',

        // ── v422 Claude AI Marketing Analysis ─────────────────────────────────
        'POST /v422/ai/analyze'              => 'Genie\\Handlers\\ClaudeAI::analyze',
        'GET /v422/ai/analyses'              => 'Genie\\Handlers\\ClaudeAI::analyses',
        'POST /v422/ai/marketing-eval'       => 'Genie\\Handlers\\ClaudeAI::marketingEval',
        'POST /v422/ai/influencer-eval'      => 'Genie\\Handlers\\ClaudeAI::influencerEval',
        'POST /v422/ai/channel-kpi-eval'     => 'Genie\\Handlers\\ClaudeAI::channelKpiEval',
        'POST /v422/ai/campaign-recommend'   => 'Genie\\Handlers\\ClaudeAI::campaignRecommend',
        'POST /v422/ai/campaign-ad-creative'  => 'Genie\\Handlers\\ClaudeAI::campaignAdCreative',
        'POST /v422/ai/campaign-ad-design'    => 'Genie\\Handlers\\ClaudeAI::campaignAdDesign',
        'POST /v422/ai/campaign-ad-chat'      => 'Genie\\Handlers\\ClaudeAI::campaignAdChat',
        'POST /v422/ai/campaign-ad-render'    => 'Genie\\Handlers\\ClaudeAI::campaignAdRender',
        'POST /v422/ai/campaign-ad-image'     => 'Genie\\Handlers\\ClaudeAI::campaignAdImage',
        'POST /v422/ai/campaign-ad-video'     => 'Genie\\Handlers\\ClaudeAI::campaignAdVideo',
        'GET /v422/ai/campaign-ad-video-status' => 'Genie\\Handlers\\ClaudeAI::campaignAdVideoStatus',
        'POST /v422/ai/ad-design/save'        => 'Genie\\Handlers\\ClaudeAI::adDesignSave',
        'GET /v422/ai/ad-design/list'         => 'Genie\\Handlers\\ClaudeAI::adDesignList',
        'POST /v423/auto-campaign/launch'     => 'Genie\\Handlers\\AutoCampaign::launch',
        'GET /v423/auto-campaign/list'        => 'Genie\\Handlers\\AutoCampaign::list',
        'POST /v423/auto-campaign/status'     => 'Genie\\Handlers\\AutoCampaign::setStatus',
        'POST /v423/auto-campaign/optimize'   => 'Genie\\Handlers\\AutoCampaign::optimize',
        'GET /v423/auto-campaign/optimize-history' => 'Genie\\Handlers\\AutoCampaign::optimizeHistory',
        'GET /v423/auto-campaign/ab-status'   => 'Genie\\Handlers\\AbTesting::status',
        'POST /v422/ai/campaign-search'        => 'Genie\\Handlers\\ClaudeAI::campaignSearch',

        // ── v421 API Key Management (admin:keys scope) ─────────────────────────
        'GET /v421/keys/whoami'              => 'Genie\\Handlers\\Keys::whoami',
        'GET /v421/keys'                     => 'Genie\\Handlers\\Keys::list',
        'POST /v421/keys'                    => 'Genie\\Handlers\\Keys::create',
        'DELETE /v421/keys/{id}'             => 'Genie\\Handlers\\Keys::revoke',
        'POST /v421/keys/{id}/rotate'        => 'Genie\\Handlers\\Keys::rotate',

        // ── v421 Connectors — TikTok + Amazon real calls ───────────────────────
        'GET /v421/connectors/status'            => 'Genie\\Handlers\\Connectors::status',
        'GET /v421/connectors/tiktok/report'     => 'Genie\\Handlers\\Connectors::tiktokReport',
        'POST /v421/connectors/tiktok/token'     => 'Genie\\Handlers\\Connectors::tiktokExchangeToken',
        'GET /v421/connectors/amazon/reports'    => 'Genie\\Handlers\\Connectors::amazonReports',
        'POST /v421/connectors/amazon/orders'    => 'Genie\\Handlers\\Connectors::amazonOrders',
        'POST /v421/connectors/amazon/token'     => 'Genie\\Handlers\\Connectors::amazonStoreToken',

        // ── v422 Trends + AI Insight ───────────────────────────────────────────
        'GET /v422/trends/pnl'     => 'Genie\\Handlers\\Trends::pnl',
        'GET /v422/trends/roas'    => 'Genie\\Handlers\\Trends::roas',
        'GET /v422/trends/returns' => 'Genie\\Handlers\\Trends::returnRates',
        'POST /v422/ai/insight'    => 'Genie\\Handlers\\Trends::aiInsight',

        // ── v423 Two-Layer Event Schema ────────────────────────────────────────
        'POST /v423/events/ingest-raw'  => 'Genie\\Handlers\\EventNorm::ingestRaw',
        'POST /v423/events/normalize'   => 'Genie\\Handlers\\EventNorm::normalize',
        'GET /v423/events/raw'          => 'Genie\\Handlers\\EventNorm::listRaw',
        'GET /v423/events/normalized'   => 'Genie\\Handlers\\EventNorm::listNormalized',
        'GET /v423/events/summary'      => 'Genie\\Handlers\\EventNorm::summary',
        'GET /v423/schema'              => 'Genie\\Handlers\\EventNorm::getSchema',

        // ── v423 Rollup Aggregation Layer ─────────────────────────────────────
        'GET /v423/rollup/summary'   => 'Genie\\Handlers\\Rollup::summary',
        'GET /v423/rollup/sku'       => 'Genie\\Handlers\\Rollup::sku',
        'GET /v423/rollup/campaign'  => 'Genie\\Handlers\\Rollup::campaign',
        'GET /v423/rollup/creator'   => 'Genie\\Handlers\\Rollup::creator',
        'GET /v423/rollup/platform'  => 'Genie\\Handlers\\Rollup::platform',

        // ── v423 Paddle Billing v2 ────────────────────────────────────────────
        // webhook: NO auth (Paddle posts here directly, signed with HMAC-SHA256)
        'POST /v423/paddle/webhook'      => 'Genie\\Handlers\\Paddle::webhook',
        // config: public — returns clientToken + env for frontend Paddle.js init
        'GET /v423/paddle/config'        => 'Genie\\Handlers\\Paddle::config',
        // plans: public — plan list with price IDs
        'GET /v423/paddle/plans'         => 'Genie\\Handlers\\Paddle::plans',
        // subscription/cancel: auth required
        'GET /v423/paddle/subscription'  => 'Genie\\Handlers\\Paddle::subscription',
        'POST /v423/paddle/cancel'       => 'Genie\\Handlers\\Paddle::cancel',
        // one-time DB migration (restrict in production after first use)
        'GET /v423/paddle/migrate'       => 'Genie\\Handlers\\Paddle::migrate',

        // ── v424 OrderHub Aggregator (PM Phase 2, spec: docs/spec/backend_orderhub_aggregator_165.md) ─
        'GET /v424/orderhub/orders'      => 'Genie\\Handlers\\OrderHub::orders',
        'GET /v424/orderhub/claims'      => 'Genie\\Handlers\\OrderHub::claims',
        'GET /v424/orderhub/settlements' => 'Genie\\Handlers\\OrderHub::settlements',
        'GET /api/v424/orderhub/orders'      => 'Genie\\Handlers\\OrderHub::orders',
        'GET /api/v424/orderhub/claims'      => 'Genie\\Handlers\\OrderHub::claims',
        'GET /api/v424/orderhub/settlements' => 'Genie\\Handlers\\OrderHub::settlements',
        // 206차 #3: claims/settlements 인제스트 라이터(CSV/API) + 정산 롤업
        'POST /v424/orderhub/claims'             => 'Genie\\Handlers\\OrderHub::ingestClaims',
        'POST /v424/orderhub/settlements'        => 'Genie\\Handlers\\OrderHub::ingestSettlements',
        'POST /v424/orderhub/settlements/rollup' => 'Genie\\Handlers\\OrderHub::rollupSettlements',
        'POST /api/v424/orderhub/claims'             => 'Genie\\Handlers\\OrderHub::ingestClaims',
        'POST /api/v424/orderhub/settlements'        => 'Genie\\Handlers\\OrderHub::ingestSettlements',
        'POST /api/v424/orderhub/settlements/rollup' => 'Genie\\Handlers\\OrderHub::rollupSettlements',

        // ── v424 enterprise health endpoint (167차 5순위, U-166-E) ──
        'GET /v424/health'      => 'Genie\\Handlers\\Health::check',
        'GET /api/v424/health'  => 'Genie\\Handlers\\Health::check',

        // ── v424 system metrics — DashSystem 시스템 서브탭 실측 (176차) ──
        'GET /v424/system/metrics'     => 'Genie\\Handlers\\SystemMetrics::metrics',
        'GET /api/v424/system/metrics' => 'Genie\\Handlers\\SystemMetrics::metrics',

        // ── v424 attribution/marketing 실 API (176차 PM7) — mock 제거용 ──
        'GET /v424/attribution/touches'      => 'Genie\\Handlers\\AttributionMetrics::touches',
        'GET /api/v424/attribution/touches'  => 'Genie\\Handlers\\AttributionMetrics::touches',
        'GET /v424/attribution/journeys'     => 'Genie\\Handlers\\AttributionMetrics::journeys',
        'GET /api/v424/attribution/journeys' => 'Genie\\Handlers\\AttributionMetrics::journeys',
        'GET /v424/attribution/time-series'     => 'Genie\\Handlers\\AttributionMetrics::timeSeries',
        'GET /api/v424/attribution/time-series' => 'Genie\\Handlers\\AttributionMetrics::timeSeries',
        'GET /v424/attribution/channels'     => 'Genie\\Handlers\\AttributionMetrics::channels',
        'GET /api/v424/attribution/channels' => 'Genie\\Handlers\\AttributionMetrics::channels',
        'GET /v424/marketing/daily-trends'     => 'Genie\\Handlers\\AttributionMetrics::dailyTrends',
        'GET /api/v424/marketing/daily-trends' => 'Genie\\Handlers\\AttributionMetrics::dailyTrends',
        // 203차 — 서버측 멀티터치 어트리뷰션(MTA) 엔진: 6모델(last/first/linear/time-decay/position/markov-removal-effect)
        'GET /v424/attribution/models'     => 'Genie\\Handlers\\AttributionEngine::models',
        'GET /api/v424/attribution/models' => 'Genie\\Handlers\\AttributionEngine::models',
        // 201차 — 마케팅 자동화 채널 추천/예산배분(벤치마크 cold-start → 실측 warm 블렌드)
        'POST /v424/marketing/auto-recommend'     => 'Genie\\Handlers\\AutoRecommend::recommend',
        'POST /api/v424/marketing/auto-recommend' => 'Genie\\Handlers\\AutoRecommend::recommend',
        'GET /v424/marketing/benchmarks'          => 'Genie\\Handlers\\AutoRecommend::benchmarks',
        'GET /api/v424/marketing/benchmarks'      => 'Genie\\Handlers\\AutoRecommend::benchmarks',
        'PUT /v424/marketing/benchmarks'          => 'Genie\\Handlers\\AutoRecommend::updateBenchmarks',
        'PUT /api/v424/marketing/benchmarks'      => 'Genie\\Handlers\\AutoRecommend::updateBenchmarks',

        // ── v424 admin plans (169차 사용자 발견 issue fix — 플랜별 구독요금 설정) ──
        'GET /v424/admin/plans'                         => 'Genie\\Handlers\\AdminPlans::list',
        'PUT /v424/admin/plans/{id}'                    => 'Genie\\Handlers\\AdminPlans::upsert',
        'DELETE /v424/admin/plans/{id}'                 => 'Genie\\Handlers\\AdminPlans::delete',
        'GET /v424/admin/plans-menu-access'             => 'Genie\\Handlers\\AdminPlans::menuAccessAll',
        'PUT /v424/admin/plans/{id}/menu-access'        => 'Genie\\Handlers\\AdminPlans::menuAccessUpsert',
        // 171차 — 4-tier 기간별 구독 가격 (1/3/6/12개월)
        'GET /v424/admin/plans-period-pricing'          => 'Genie\\Handlers\\AdminPlans::periodPricingAll',
        'PUT /v424/admin/plans/{id}/period-pricing'     => 'Genie\\Handlers\\AdminPlans::periodPricingUpsert',
        'GET /api/v424/admin/plans-period-pricing'      => 'Genie\\Handlers\\AdminPlans::periodPricingAll',
        'PUT /api/v424/admin/plans/{id}/period-pricing' => 'Genie\\Handlers\\AdminPlans::periodPricingUpsert',
        // 187차 Phase2 — 회사소개/연혁/운영진 (SiteIntro). 공개=/auth/site/intro, admin=/v424/admin/site/*
        'GET /auth/site/intro'                  => 'Genie\\Handlers\\SiteIntro::publicIntro',
        'GET /api/auth/site/intro'              => 'Genie\\Handlers\\SiteIntro::publicIntro',
        'GET /v424/admin/site/intro'            => 'Genie\\Handlers\\SiteIntro::adminGet',
        'PUT /v424/admin/site/company'          => 'Genie\\Handlers\\SiteIntro::saveCompany',
        'PUT /v424/admin/site/visibility'       => 'Genie\\Handlers\\SiteIntro::saveVisibility',
        'POST /v424/admin/site/team'            => 'Genie\\Handlers\\SiteIntro::teamSave',
        'DELETE /v424/admin/site/team/{id}'     => 'Genie\\Handlers\\SiteIntro::teamDelete',
        'POST /v424/admin/site/history'         => 'Genie\\Handlers\\SiteIntro::historySave',
        'DELETE /v424/admin/site/history/{id}'  => 'Genie\\Handlers\\SiteIntro::historyDelete',
        'GET /api/v424/admin/site/intro'           => 'Genie\\Handlers\\SiteIntro::adminGet',
        'PUT /api/v424/admin/site/company'         => 'Genie\\Handlers\\SiteIntro::saveCompany',
        'PUT /api/v424/admin/site/visibility'      => 'Genie\\Handlers\\SiteIntro::saveVisibility',
        'POST /api/v424/admin/site/team'           => 'Genie\\Handlers\\SiteIntro::teamSave',
        'DELETE /api/v424/admin/site/team/{id}'    => 'Genie\\Handlers\\SiteIntro::teamDelete',
        'POST /api/v424/admin/site/history'        => 'Genie\\Handlers\\SiteIntro::historySave',
        'DELETE /api/v424/admin/site/history/{id}' => 'Genie\\Handlers\\SiteIntro::historyDelete',
        // 172차 P0-C — 쿠폰 사용 (user)
        'POST /auth/coupon/redeem'      => 'Genie\\Handlers\\CouponRedeem::redeem',
        'GET /auth/coupon/preview'      => 'Genie\\Handlers\\CouponRedeem::preview',
        'POST /api/auth/coupon/redeem'  => 'Genie\\Handlers\\CouponRedeem::redeem',
        'GET /api/auth/coupon/preview'  => 'Genie\\Handlers\\CouponRedeem::preview',
        // 172차 P0-C — 쿠폰 관리 (admin 자율 발행 + 룰 토글 + 통계)
        'GET /v424/admin/coupons/overview'                  => 'Genie\\Handlers\\CouponAdmin::overview',
        'PUT /v424/admin/coupons/rules/{name}'              => 'Genie\\Handlers\\CouponAdmin::updateRule',
        'POST /v424/admin/coupons/issue'                    => 'Genie\\Handlers\\CouponAdmin::issue',
        'GET /v424/admin/coupons/list'                      => 'Genie\\Handlers\\CouponAdmin::listCoupons',
        'POST /v424/admin/coupons/{code}/revoke'            => 'Genie\\Handlers\\CouponAdmin::revoke',
        'GET /api/v424/admin/coupons/overview'              => 'Genie\\Handlers\\CouponAdmin::overview',
        'PUT /api/v424/admin/coupons/rules/{name}'          => 'Genie\\Handlers\\CouponAdmin::updateRule',
        'POST /api/v424/admin/coupons/issue'                => 'Genie\\Handlers\\CouponAdmin::issue',
        'GET /api/v424/admin/coupons/list'                  => 'Genie\\Handlers\\CouponAdmin::listCoupons',
        'POST /api/v424/admin/coupons/{code}/revoke'        => 'Genie\\Handlers\\CouponAdmin::revoke',
        // 172차 Task #22 — 메뉴 권한 ↔ 가격 자동 sync (초고도화)
        'GET /v424/admin/menu-pricing-sync'                  => 'Genie\\Handlers\\MenuPricingSync::syncAll',
        'PUT /v424/admin/menu-value-score'                   => 'Genie\\Handlers\\MenuPricingSync::upsertScores',
        'PUT /v424/admin/plans/{id}/apply-recommended'       => 'Genie\\Handlers\\MenuPricingSync::applyRecommended',
        'GET /api/v424/admin/menu-pricing-sync'              => 'Genie\\Handlers\\MenuPricingSync::syncAll',
        'PUT /api/v424/admin/menu-value-score'               => 'Genie\\Handlers\\MenuPricingSync::upsertScores',
        'PUT /api/v424/admin/plans/{id}/apply-recommended'   => 'Genie\\Handlers\\MenuPricingSync::applyRecommended',
        'GET /v424/admin/paddle/stats'                  => 'Genie\\Handlers\\AdminPlans::paddleStats',
        'GET /api/v424/admin/paddle/stats'              => 'Genie\\Handlers\\AdminPlans::paddleStats',
        'GET /v424/admin/db/stats'                      => 'Genie\\Handlers\\AdminPlans::dbStats',
        'GET /api/v424/admin/db/stats'                  => 'Genie\\Handlers\\AdminPlans::dbStats',
        'GET /api/v424/admin/plans'                     => 'Genie\\Handlers\\AdminPlans::list',
        'PUT /api/v424/admin/plans/{id}'                => 'Genie\\Handlers\\AdminPlans::upsert',
        'DELETE /api/v424/admin/plans/{id}'             => 'Genie\\Handlers\\AdminPlans::delete',
        'GET /api/v424/admin/plans-menu-access'         => 'Genie\\Handlers\\AdminPlans::menuAccessAll',
        'PUT /api/v424/admin/plans/{id}/menu-access'    => 'Genie\\Handlers\\AdminPlans::menuAccessUpsert',

        // ── v425 PM-Core (168차 N-152-F Task/Milestone/Gantt, spec: docs/spec/n152f_pm_features_spec.md §4) ─
        // Projects
        'GET /v425/pm/projects'                  => 'Genie\\Handlers\\PM\\Projects::list',
        'POST /v425/pm/projects'                 => 'Genie\\Handlers\\PM\\Projects::create',
        'GET /v425/pm/projects/{id}'             => 'Genie\\Handlers\\PM\\Projects::get',
        'PATCH /v425/pm/projects/{id}'           => 'Genie\\Handlers\\PM\\Projects::patch',
        'DELETE /v425/pm/projects/{id}'          => 'Genie\\Handlers\\PM\\Projects::delete',
        'GET /v425/pm/projects/{id}/tasks'       => 'Genie\\Handlers\\PM\\Projects::listTasks',
        'GET /v425/pm/projects/{id}/gantt'       => 'Genie\\Handlers\\PM\\Gantt::view',
        'GET /v425/pm/projects/{id}/kpi'         => 'Genie\\Handlers\\PM\\Kpi::projectKpi',
        // Tasks
        'POST /v425/pm/tasks'                    => 'Genie\\Handlers\\PM\\Tasks::create',
        'GET /v425/pm/tasks/{id}'                => 'Genie\\Handlers\\PM\\Tasks::get',
        'PATCH /v425/pm/tasks/{id}'              => 'Genie\\Handlers\\PM\\Tasks::patch',
        'DELETE /v425/pm/tasks/{id}'             => 'Genie\\Handlers\\PM\\Tasks::delete',
        'POST /v425/pm/tasks/{id}/assignees'     => 'Genie\\Handlers\\PM\\Assignees::add',
        'DELETE /v425/pm/tasks/{id}/assignees/{userId}' => 'Genie\\Handlers\\PM\\Assignees::remove',
        'POST /v425/pm/tasks/{id}/comments'      => 'Genie\\Handlers\\PM\\Comments::create',
        'GET /v425/pm/tasks/{id}/comments'       => 'Genie\\Handlers\\PM\\Comments::listByTask',
        // Dependencies
        'POST /v425/pm/dependencies'             => 'Genie\\Handlers\\PM\\Dependencies::create',
        'DELETE /v425/pm/dependencies/{id}'      => 'Genie\\Handlers\\PM\\Dependencies::delete',
        // Milestones
        'GET /v425/pm/milestones'                => 'Genie\\Handlers\\PM\\Milestones::list',
        'POST /v425/pm/milestones'               => 'Genie\\Handlers\\PM\\Milestones::create',
        'PATCH /v425/pm/milestones/{id}'         => 'Genie\\Handlers\\PM\\Milestones::patch',
        'DELETE /v425/pm/milestones/{id}'        => 'Genie\\Handlers\\PM\\Milestones::delete',
        // Attachments
        'POST /v425/pm/attachments/sign'         => 'Genie\\Handlers\\PM\\Attachments::signUpload',
        'POST /v425/pm/attachments'              => 'Genie\\Handlers\\PM\\Attachments::create',
        // Events (SSE) + Audit
        'GET /v425/pm/events/stream'             => 'Genie\\Handlers\\PM\\Events::stream',
        'GET /v425/pm/audit'                     => 'Genie\\Handlers\\PM\\Audit::list',
        // /api/ alias (Apache Alias /api 환경 호환)
        'GET /api/v425/pm/projects'                  => 'Genie\\Handlers\\PM\\Projects::list',
        'POST /api/v425/pm/projects'                 => 'Genie\\Handlers\\PM\\Projects::create',
        'GET /api/v425/pm/projects/{id}'             => 'Genie\\Handlers\\PM\\Projects::get',
        'PATCH /api/v425/pm/projects/{id}'           => 'Genie\\Handlers\\PM\\Projects::patch',
        'DELETE /api/v425/pm/projects/{id}'          => 'Genie\\Handlers\\PM\\Projects::delete',
        'GET /api/v425/pm/projects/{id}/tasks'       => 'Genie\\Handlers\\PM\\Projects::listTasks',
        'GET /api/v425/pm/projects/{id}/gantt'       => 'Genie\\Handlers\\PM\\Gantt::view',
        'GET /api/v425/pm/projects/{id}/kpi'         => 'Genie\\Handlers\\PM\\Kpi::projectKpi',
        'POST /api/v425/pm/tasks'                    => 'Genie\\Handlers\\PM\\Tasks::create',
        'GET /api/v425/pm/tasks/{id}'                => 'Genie\\Handlers\\PM\\Tasks::get',
        'PATCH /api/v425/pm/tasks/{id}'              => 'Genie\\Handlers\\PM\\Tasks::patch',
        'DELETE /api/v425/pm/tasks/{id}'             => 'Genie\\Handlers\\PM\\Tasks::delete',
        'POST /api/v425/pm/tasks/{id}/assignees'     => 'Genie\\Handlers\\PM\\Assignees::add',
        'DELETE /api/v425/pm/tasks/{id}/assignees/{userId}' => 'Genie\\Handlers\\PM\\Assignees::remove',
        'POST /api/v425/pm/tasks/{id}/comments'      => 'Genie\\Handlers\\PM\\Comments::create',
        'GET /api/v425/pm/tasks/{id}/comments'       => 'Genie\\Handlers\\PM\\Comments::listByTask',
        'POST /api/v425/pm/dependencies'             => 'Genie\\Handlers\\PM\\Dependencies::create',
        'DELETE /api/v425/pm/dependencies/{id}'      => 'Genie\\Handlers\\PM\\Dependencies::delete',
        'GET /api/v425/pm/milestones'                => 'Genie\\Handlers\\PM\\Milestones::list',
        'POST /api/v425/pm/milestones'               => 'Genie\\Handlers\\PM\\Milestones::create',
        'PATCH /api/v425/pm/milestones/{id}'         => 'Genie\\Handlers\\PM\\Milestones::patch',
        'DELETE /api/v425/pm/milestones/{id}'        => 'Genie\\Handlers\\PM\\Milestones::delete',
        'POST /api/v425/pm/attachments/sign'         => 'Genie\\Handlers\\PM\\Attachments::signUpload',
        'POST /api/v425/pm/attachments'              => 'Genie\\Handlers\\PM\\Attachments::create',
        'GET /api/v425/pm/events/stream'             => 'Genie\\Handlers\\PM\\Events::stream',
        'GET /api/v425/pm/audit'                     => 'Genie\\Handlers\\PM\\Audit::list',

        // ── v425 Admin/User 메뉴 가시성 토글 (168차 N-152-F F2/F3 = T3, spec: docs/spec/n152f_consolidated_pm_track.md §4) ─
        'GET /v425/admin/menu-tree'             => 'Genie\\Handlers\\AdminMenu::getAdminTree',
        'GET /v425/menu-tree'                   => 'Genie\\Handlers\\AdminMenu::getTree',
        'PATCH /v425/admin/menu-tree/{menu_id:.+}' => 'Genie\\Handlers\\AdminMenu::patch',
        'POST /v425/admin/menu-tree/reorder'    => 'Genie\\Handlers\\AdminMenu::reorder',
        'POST /v425/admin/menu-tree/reset'      => 'Genie\\Handlers\\AdminMenu::reset',
        'GET /v425/admin/menu-tree/audit-log'   => 'Genie\\Handlers\\AdminMenu::auditLog',
        'GET /api/v425/admin/menu-tree'             => 'Genie\\Handlers\\AdminMenu::getAdminTree',
        'GET /api/v425/menu-tree'                   => 'Genie\\Handlers\\AdminMenu::getTree',
        'PATCH /api/v425/admin/menu-tree/{menu_id:.+}' => 'Genie\\Handlers\\AdminMenu::patch',
        'POST /api/v425/admin/menu-tree/reorder'    => 'Genie\\Handlers\\AdminMenu::reorder',
        'POST /api/v425/admin/menu-tree/reset'      => 'Genie\\Handlers\\AdminMenu::reset',
        'GET /api/v425/admin/menu-tree/audit-log'   => 'Genie\\Handlers\\AdminMenu::auditLog',

        // ── Auth — 회원가입 / 로그인 / 플랜 ──────────────────────────────────
        'POST /auth/register' => 'Genie\\Handlers\\UserAuth::register',
        'POST /auth/login'    => 'Genie\\Handlers\\UserAuth::login',
        'GET /auth/me'        => 'Genie\\Handlers\\UserAuth::me',
        'PATCH /auth/profile' => 'Genie\\Handlers\\UserAuth::profile', // 175차 S3.2
        // 188차 계정 자기관리 — 비밀번호 변경 / 아이디·비밀번호 찾기
        'POST /auth/change-password' => 'Genie\\Handlers\\UserAuth::changePassword',
        'POST /auth/find-id'         => 'Genie\\Handlers\\UserAuth::findId',
        'POST /auth/forgot-password' => 'Genie\\Handlers\\UserAuth::forgotPassword',
        'POST /auth/reset-password'  => 'Genie\\Handlers\\UserAuth::resetPassword',
        // 188차 관리자 보안강화 — 접속키 검증/변경
        'POST /auth/admin/verify-access-key' => 'Genie\\Handlers\\UserAuth::verifyAdminKey',
        'POST /auth/admin/access-key'        => 'Genie\\Handlers\\UserAuth::adminChangeAccessKey',
        'GET /auth/admin/smtp'               => 'Genie\\Handlers\\UserAuth::smtpGet',
        'POST /auth/admin/smtp'              => 'Genie\\Handlers\\UserAuth::smtpSave',
        'POST /auth/admin/smtp/test'         => 'Genie\\Handlers\\UserAuth::smtpTest',
        // 203차 — 네이버 SENS SMS 설정(관리자)
        'GET /auth/admin/sms'                => 'Genie\\Handlers\\UserAuth::smsGet',
        'POST /auth/admin/sms'               => 'Genie\\Handlers\\UserAuth::smsSave',
        'POST /auth/admin/sms/test'          => 'Genie\\Handlers\\UserAuth::smsTest',
        'GET /auth/admin/ai-key'             => 'Genie\\Handlers\\UserAuth::aiKeyGet',
        'POST /auth/admin/ai-key'            => 'Genie\\Handlers\\UserAuth::aiKeySave',
        'GET /auth/admin/img-key'            => 'Genie\\Handlers\\UserAuth::imgKeyGet',
        'POST /auth/admin/img-key'           => 'Genie\\Handlers\\UserAuth::imgKeySave',
        'GET /auth/admin/video-key'          => 'Genie\\Handlers\\UserAuth::vidKeyGet',
        'POST /auth/admin/video-key'         => 'Genie\\Handlers\\UserAuth::vidKeySave',
        // 189차+ 인증 감사로그
        'GET /auth/audit-logs'   => 'Genie\\Handlers\\UserAuth::auditLogs',
        // 189차+ 세션/기기 관리
        'GET /auth/sessions'              => 'Genie\\Handlers\\UserAuth::listSessions',
        'POST /auth/sessions/revoke-others' => 'Genie\\Handlers\\UserAuth::revokeOtherSessions',
        // 189차+ API 키 관리(세션 인증·소유자 전용)
        'GET /auth/api-keys'              => 'Genie\\Handlers\\UserAuth::apiKeysList',
        'POST /auth/api-keys'             => 'Genie\\Handlers\\UserAuth::apiKeysCreate',
        'DELETE /auth/api-keys/{id}'      => 'Genie\\Handlers\\UserAuth::apiKeysRevoke',
        'POST /auth/api-keys/{id}/rotate' => 'Genie\\Handlers\\UserAuth::apiKeysRotate',
        // 189차+ 인앱 알림센터(서버백킹)
        'GET /auth/notifications'         => 'Genie\\Handlers\\UserAuth::notifList',
        'POST /auth/notifications'        => 'Genie\\Handlers\\UserAuth::notifCreate',
        'POST /auth/notifications/read'   => 'Genie\\Handlers\\UserAuth::notifRead',
        'POST /auth/notifications/clear'  => 'Genie\\Handlers\\UserAuth::notifClear',
        'DELETE /auth/notifications/{id}' => 'Genie\\Handlers\\UserAuth::notifDelete',
        // 189차 MFA/2FA (TOTP) — 모두 세션 토큰 자체검증(핸들러 내부)
        'GET /auth/mfa/status'   => 'Genie\\Handlers\\UserAuth::mfaStatus',
        'POST /auth/mfa/setup'   => 'Genie\\Handlers\\UserAuth::mfaSetup',
        'POST /auth/mfa/enable'  => 'Genie\\Handlers\\UserAuth::mfaEnable',
        'POST /auth/mfa/disable' => 'Genie\\Handlers\\UserAuth::mfaDisable',
        'POST /auth/mfa/otp/send'   => 'Genie\\Handlers\\UserAuth::mfaOtpSend',
        'POST /auth/mfa/otp/enable' => 'Genie\\Handlers\\UserAuth::mfaOtpEnable',
        // 180차 Phase2 멤버구성원 — 팀/팀원 하위계정(상위 owner tenant 종속)
        'GET /auth/team/members'         => 'Genie\\Handlers\\UserAuth::listTeamMembers',
        'POST /auth/team/members'        => 'Genie\\Handlers\\UserAuth::createTeamMember',
        'PATCH /auth/team/members/{id}'  => 'Genie\\Handlers\\UserAuth::updateTeamMember',
        'DELETE /auth/team/members/{id}' => 'Genie\\Handlers\\UserAuth::deleteTeamMember',
        'POST /auth/logout'   => 'Genie\\Handlers\\UserAuth::logout',
        'POST /auth/upgrade'  => 'Genie\\Handlers\\UserAuth::upgrade',
        'GET /auth/subscription'      => 'Genie\\Handlers\\UserAuth::subscription',

        'GET /auth/plan-check'     => 'Genie\\Handlers\\UserAuth::planCheck',    // 현재 플랜 확인
        'POST /auth/license'       => 'Genie\\Handlers\\UserAuth::activateLicense', // 라이선스 키 활성화
        'GET /auth/license/list'   => 'Genie\\Handlers\\UserAuth::listLicenseKeys', // 라이선스 목록 (admin)

        // ── Payment (Toss PG) — 168차 DEPRECATED (N-152-F USD/Paddle 단일 정책)
        //    spec: docs/spec/n152f_billing_usd_card_only.md §2.2
        //    Handler 코드는 보존, routing 만 차단 (404). 운영 cleanup 은 N-152-G 트랙.
        // 'GET /auth/payment/config'    => 'Genie\\Handlers\\Payment::config',
        // 'GET /auth/payment/plans'     => 'Genie\\Handlers\\Payment::plans',
        // 'POST /auth/payment/confirm'  => 'Genie\\Handlers\\Payment::confirm',
        // 'POST /auth/payment/cancel'   => 'Genie\\Handlers\\Payment::cancel',
        // 'POST /payment/webhook/toss'  => 'Genie\\Handlers\\Payment::tossWebhook',

        // ── PG Config Admin — 168차 DEPRECATED (Toss/직접 PG 경로 전체 차단) ─
        // 'GET /auth/pg/config'             => 'Genie\\Handlers\\Payment::getPgConfig',
        // 'POST /auth/pg/config'            => 'Genie\\Handlers\\Payment::savePgConfig',
        // 'DELETE /auth/pg/config/{provider}' => 'Genie\\Handlers\\Payment::deletePgConfig',

        // ── Pricing Config Admin ──────────────────────────────────────────
        'GET /auth/pricing/config'   => 'Genie\\Handlers\\Payment::getPricingConfig',
        'POST /auth/pricing/config'  => 'Genie\\Handlers\\Payment::savePricingConfig',

        // ── Menu-based Tier Pricing ───────────────────────────────────────
        'GET /auth/pricing/plans'              => 'Genie\\Handlers\\Payment::getMenuPricingPlans',
        'POST /auth/pricing/plans'             => 'Genie\\Handlers\\Payment::saveMenuPricingPlans',
        'DELETE /auth/pricing/plans/{id}'      => 'Genie\\Handlers\\Payment::deleteMenuPricingPlan',
        'POST /auth/pricing/paddle-sync'       => 'Genie\\Handlers\\Payment::paddleSyncAll',

        // ── 공개 구독요금 조회 (인증 불요 — 가입 화면용) ───────────────────
        // 169차 P4: AdminPlans::publicPlans 로 redirect — plan_config + plan_menu_access JOIN 응답
        'GET /auth/pricing/public-plans'       => 'Genie\\Handlers\\AdminPlans::publicPlans',
        'GET /api/auth/pricing/public-plans'   => 'Genie\\Handlers\\AdminPlans::publicPlans',

        // ── 메뉴 접근권한 저장/조회 (관리자 전용 — MenuAccessTab) ───────
        'GET /auth/pricing/menu-access'        => 'Genie\\Handlers\\Payment::getMenuAccess',
        'POST /auth/pricing/menu-access'       => 'Genie\\Handlers\\Payment::saveMenuAccess',

        // ── Subscription Packages ────────────────────────────────────
        'GET /auth/pricing/packages'           => 'Genie\\Handlers\\Payment::getSubscriptionPackages',
        'POST /auth/pricing/packages'          => 'Genie\\Handlers\\Payment::saveSubscriptionPackage',
        'DELETE /auth/pricing/packages/{id}'   => 'Genie\\Handlers\\Payment::deleteSubscriptionPackage',

        // ── Subscriber & Coupon Management ──────────────────────────────────
        'GET /auth/admin/subscribers'             => 'Genie\\Handlers\\Payment::listSubscribers',
        'GET /auth/admin/subscribers/{id}'        => 'Genie\\Handlers\\Payment::getSubscriber',
        'PATCH /auth/admin/subscribers/{id}'      => 'Genie\\Handlers\\Payment::updateSubscriber',
        'GET /auth/admin/coupons'                 => 'Genie\\Handlers\\Payment::listCoupons',
        'POST /auth/admin/coupons'                => 'Genie\\Handlers\\Payment::grantCoupon',
        'DELETE /auth/admin/coupons/{id}'         => 'Genie\\Handlers\\Payment::cancelCoupon',

        // ── v423 User & Member Admin (admin plan only) ─────────────────────────
        'GET /v423/admin/users'                          => 'Genie\\Handlers\\UserAdmin::listUsers',
        'POST /v423/admin/users'                         => 'Genie\\Handlers\\UserAdmin::createUser',
        'GET /v423/admin/users/{id}'                     => 'Genie\\Handlers\\UserAdmin::getUser',
        'PATCH /v423/admin/users/{id}/plan'              => 'Genie\\Handlers\\UserAdmin::updatePlan',
        'PATCH /v423/admin/users/{id}/active'            => 'Genie\\Handlers\\UserAdmin::setActive',
        'POST /v423/admin/users/{id}/reset-password'     => 'Genie\\Handlers\\UserAdmin::resetPassword',
        'GET /v423/admin/stats'                          => 'Genie\\Handlers\\UserAdmin::stats',

        // ── v423 Subscription Plan Pricing (period-based) ─────────────────────
        'GET /v423/admin/plan-prices'                    => 'Genie\\Handlers\\UserAdmin::listPlanPrices',
        'POST /v423/admin/plan-prices'                   => 'Genie\\Handlers\\UserAdmin::upsertPlanPrice',
        'DELETE /v423/admin/plan-prices/{plan}/{period}' => 'Genie\\Handlers\\UserAdmin::deletePlanPrice',
        'GET /v423/admin/migrate'                        => 'Genie\\Handlers\\UserAdmin::migrate',
        'GET /v423/admin/roles'                          => 'Genie\\Handlers\\UserAdmin::listRoles',
        'POST /v423/admin/roles'                         => 'Genie\\Handlers\\UserAdmin::upsertRole',
        'DELETE /v423/admin/roles/{role_key}'            => 'Genie\\Handlers\\UserAdmin::deleteRole',
        'GET /v423/admin/users/{id}/roles'               => 'Genie\\Handlers\\UserAdmin::getUserRoles',
        'PATCH /v423/admin/users/{id}/role'              => 'Genie\\Handlers\\UserAdmin::assignRole',
        'DELETE /v423/admin/users/{id}/roles/{role_key}' => 'Genie\\Handlers\\UserAdmin::revokeRole',
        'GET /v423/admin/billing'                        => 'Genie\\Handlers\\UserAdmin::billingList',
        'GET /v423/admin/audit-logs'                     => 'Genie\\Handlers\\UserAdmin::auditLogs',

        // ── v423 Coupon Management (UserAdmin) ───────────────────────
        'POST /v423/admin/coupons'                       => 'Genie\\Handlers\\UserAdmin::issueCoupon',
        'GET /v423/admin/coupons'                        => 'Genie\\Handlers\\UserAdmin::listCoupons',
        'POST /v423/admin/coupons/{id}/revoke'           => 'Genie\\Handlers\\UserAdmin::revokeCoupon',
        'POST /v423/coupons/redeem'                      => 'Genie\\Handlers\\UserAdmin::redeemCoupon',
        'GET /v423/coupons/mine'                         => 'Genie\\Handlers\\UserAdmin::myCoupons',
        'GET /v423/admin/coupon-migrate'                 => 'Genie\\Handlers\\UserAdmin::migrateCoupons',
        'GET /v423/admin/demo-users'                     => 'Genie\\Handlers\\UserAdmin::listDemoUsers',
        'POST /v423/coupon/profile'                      => 'Genie\\Handlers\\UserAdmin::registerCouponProfile',
        // ── v423 자동 쿠폰 발급 규칙 (신규가입/유료전환/갱신) ─────────────
        'GET /v423/admin/coupon-rules'                   => 'Genie\\Handlers\\UserAdmin::getCouponRules',
        'POST /v423/admin/coupon-rules'                  => 'Genie\\Handlers\\UserAdmin::saveCouponRules',
        'POST /v423/admin/coupons/batch-issue'           => 'Genie\\Handlers\\UserAdmin::batchIssueCoupons',

        // ── DbAdmin — phpMyAdmin 스타일 DB 관리 ──────────────────────────────
        'GET /v423/dbadmin/tables'                       => 'Genie\\Handlers\\DbAdmin::tables',
        'GET /v423/dbadmin/tables/{table}'               => 'Genie\\Handlers\\DbAdmin::tableStructure',
        'GET /v423/dbadmin/tables/{table}/rows'          => 'Genie\\Handlers\\DbAdmin::tableRows',
        'POST /v423/dbadmin/query'                       => 'Genie\\Handlers\\DbAdmin::runQuery',
        'POST /v423/dbadmin/tables/{table}/truncate'     => 'Genie\\Handlers\\DbAdmin::truncateTable',
        'DELETE /v423/dbadmin/tables/{table}/rows/{id}'  => 'Genie\\Handlers\\DbAdmin::deleteRow',

        // ── v423 Channel Credential Management ────────────────────────────────
        'GET /v423/creds'              => 'Genie\\Handlers\\ChannelCreds::list',
        'POST /v423/creds'             => 'Genie\\Handlers\\ChannelCreds::upsert',
        'GET /v423/creds/scan'         => 'Genie\\Handlers\\ChannelCreds::scan',
        'GET /v423/creds/summary'      => 'Genie\\Handlers\\ChannelCreds::summary',
        'DELETE /v423/creds/{id}'      => 'Genie\\Handlers\\ChannelCreds::delete',
        'POST /v423/creds/{id}/test'   => 'Genie\\Handlers\\ChannelCreds::test',
        // [현 차수] H4: InfluencerUGC 라이브 데이터 — 4 kind GET/POST(테넌트 격리 영속). 세션 self-auth.
        'GET /v423/influencer/creators'       => 'Genie\\Handlers\\Influencer::creators',
        'GET /v423/influencer/ugc-reviews'    => 'Genie\\Handlers\\Influencer::ugcReviews',
        'GET /v423/influencer/channel-stats'  => 'Genie\\Handlers\\Influencer::channelStats',
        'GET /v423/influencer/neg-keywords'   => 'Genie\\Handlers\\Influencer::negKeywords',
        'POST /v423/influencer/creators'      => 'Genie\\Handlers\\Influencer::saveCreators',
        'POST /v423/influencer/ugc-reviews'   => 'Genie\\Handlers\\Influencer::saveUgcReviews',
        'POST /v423/influencer/channel-stats' => 'Genie\\Handlers\\Influencer::saveChannelStats',
        'POST /v423/influencer/neg-keywords'  => 'Genie\\Handlers\\Influencer::saveNegKeywords',
        // 175차 S3.1 — SmartConnect channel test handler (라우트는 등록됐으나 custom 매핑 누락)
        'POST /v423/connectors/{channel}/test' => 'Genie\\Handlers\\ChannelCreds::channelTest',
        'POST /v423/connectors/apply'  => 'Genie\\Handlers\\ChannelCreds::apply',

        // ── v423 Real Channel API Connectors (Meta / Google / Naver / Coupang) ─
        'GET /v423/connectors/meta/insights'    => 'Genie\\Handlers\\Connectors::metaInsights',
        'GET /v423/connectors/google/report'    => 'Genie\\Handlers\\Connectors::googleReport',
        'GET /v423/connectors/naver/report'     => 'Genie\\Handlers\\Connectors::naverReport',
        'GET /v423/connectors/coupang/orders'   => 'Genie\\Handlers\\Connectors::coupangOrders',
        'GET /v423/connectors/status-all'       => 'Genie\\Handlers\\Connectors::statusAll',
        // 191차 — 광고 메트릭 ingest 브릿지(연결 채널 라이브 fetch → performance_metrics 적재)
        'POST /v423/connectors/sync'            => 'Genie\\Handlers\\Connectors::sync',

        // ── v423 Alert Notification Test ──────────────────────────────────────
        'POST /v423/alerts/test-notify'         => 'Genie\\Handlers\\Alerting::testNotify',

        // ── v423 이벤트 팝업 관리 (관리자 CRUD + 사용자용 공개 active 조회) ────
        'GET /v423/popups/active'                   => 'Genie\\Handlers\\EventPopup::listActive',   // 인증 불요 (로그인 후 자동 표시용)
        'GET /v423/admin/popups'                    => 'Genie\\Handlers\\EventPopup::list',
        'POST /v423/admin/popups'                   => 'Genie\\Handlers\\EventPopup::create',
        'PUT /v423/admin/popups/{id}'               => 'Genie\\Handlers\\EventPopup::update',
        'DELETE /v423/admin/popups/{id}'            => 'Genie\\Handlers\\EventPopup::delete',
        'POST /v423/admin/popups/{id}/toggle'       => 'Genie\\Handlers\\EventPopup::toggle',

        // ── Ad Performance (Multi-Team Analysis) ───────────────────────────
        'GET /api/v1/ad-performance/summary'        => 'Genie\\Controllers\\PerformanceController::getSummary',
        // 175차 S3.3 — Meta 광고 campaign 데이터 (AccountPerformance.jsx)
        'GET /performance/meta-ads'                 => 'Genie\\Handlers\\AdPerformance::metaAds',
        'GET /api/performance/meta-ads'             => 'Genie\\Handlers\\AdPerformance::metaAds',


        // ── V424 AI Creative Store (서버 저장 + 중복 방지) ─────────────────
        'GET /api/creatives'                        => 'Genie\\Handlers\\CreativeStore::list',
        'GET /api/creatives/{id}'                   => 'Genie\\Handlers\\CreativeStore::get',
        'POST /api/creatives'                       => 'Genie\\Handlers\\CreativeStore::create',
        'PUT /api/creatives/{id}'                   => 'Genie\\Handlers\\CreativeStore::update',
        'DELETE /api/creatives/{id}'                => 'Genie\\Handlers\\CreativeStore::delete',
        'POST /api/creatives/check-duplicate'       => 'Genie\\Handlers\\CreativeStore::checkDuplicate',
        // V424 Creative Store — non-prefixed (basePath=/api strips the /api prefix)
        'GET /creatives'                        => 'Genie\\Handlers\\CreativeStore::list',
        'GET /creatives/{id}'                   => 'Genie\\Handlers\\CreativeStore::get',
        'POST /creatives'                       => 'Genie\\Handlers\\CreativeStore::create',
        'PUT /creatives/{id}'                   => 'Genie\\Handlers\\CreativeStore::update',
        'DELETE /creatives/{id}'                => 'Genie\\Handlers\\CreativeStore::delete',
        'POST /creatives/check-duplicate'       => 'Genie\\Handlers\\CreativeStore::checkDuplicate',
];




    $templateHandler = function (Request $request, Response $response, array $args) use (&$templates): Response {
        $method = strtoupper($request->getMethod());
        $route = $request->getAttribute('route');
        $path = $route ? $route->getPattern() : $request->getUri()->getPath();
        $key = $method . ' ' . $path;
        $tpl = $templates[$key] ?? null;
        if ($tpl === null) {
            $payload = ["detail" => "Not implemented (no template)", "method"=>$method, "path"=>$path];
            return TemplateResponder::respond($response->withStatus(501), $payload);
        }
        $vars = TemplateResponder::varsFrom($request, $args);
        $vars["method"] = $method;
        $vars["path"] = $path;

        $filled = TemplateResponder::fill($tpl, $vars);
        return TemplateResponder::respond($response, $filled);
    };

    $notImpl = function (Request $request, Response $response, array $args): Response {
        $payload = ["detail" => "Not implemented in PHP port", "method"=>strtoupper($request->getMethod()), "path"=>$request->getUri()->getPath()];
        return TemplateResponder::respond($response->withStatus(501), $payload);
    };

    $register = function (string $method, string $path) use ($app, &$custom, $templateHandler, $notImpl): void {
        $key = strtoupper($method) . ' ' . $path;
        if (isset($custom[$key])) {
            $callable = $custom[$key];
            $app->map([strtoupper($method)], $path, $callable);
            return;
        }
        // Use template if it exists; otherwise fall back to not-implemented
        $app->map([strtoupper($method)], $path, $templateHandler);
    };

    $register('GET', '/v377/health');
    $register('GET', '/v377/ops/unified/overview');
    $register('GET', '/v378/health');
    $register('POST', '/v378/ai/risk/predict');
    $register('POST', '/v378/ai/risk/batch-run');
    $register('GET', '/v378/admin/model-registry');
    $register('GET', '/v378/admin/predictions');
    $register('GET', '/v378/admin/connector-health');
    $register('GET', '/v378/admin/ingestion-runs');
    $register('GET', '/v378/admin/billing');
    $register('POST', '/v378/admin/seed');
    $register('GET', '/v379/health');
    $register('POST', '/v379/ai/risk/predict');
    $register('POST', '/v379/ai/risk/batch-run');
    $register('GET', '/v379/admin/model-registry');
    $register('GET', '/v379/admin/predictions');
    $register('GET', '/v379/admin/connector-health');
    $register('GET', '/v379/admin/ingestion-runs');
    $register('GET', '/v379/admin/billing');
    $register('POST', '/v379/admin/seed');
    $register('GET', '/v380/health');
    $register('POST', '/v380/ai/risk/predict');
    $register('POST', '/v380/ai/risk/batch-run');
    $register('GET', '/v380/admin/model-registry');
    $register('GET', '/v380/admin/predictions');
    $register('GET', '/v380/admin/connector-health');
    $register('GET', '/v380/admin/ingestion-runs');
    $register('GET', '/v380/admin/billing');
    $register('POST', '/v380/admin/seed');
    // 191차: 팬텀 V382 라우트 제거(connectors/writeback-engine/approvals/settlements/audit).
    //   템플릿 백킹 /v382/sync·/v382/products 만 유지.
    $register('POST', '/v382/sync/{channel}/{source}/run');
    $register('POST', '/v382/products');
    $register('GET', '/v382/products');
    $register('GET', '/v384/ads/mappings');
    $register('POST', '/v384/ads/mappings');
    $register('POST', '/v384/budget/plan');
    $register('POST', '/v384/budget/requests');
    $register('POST', '/v384/budget/requests/{request_id}/approve');
    $register('POST', '/v384/budget/requests/{request_id}/execute');
    $register('GET', '/v384/recommendations/traffic-cost');
    $register('POST', '/v385/ingest/metrics');
    $register('GET', '/v385/recommendations/traffic-cost');
    $register('GET', '/v385/recommendations/budget-allocation');
    // 191차: 팬텀 V386 라우트 5개 제거(클래스 부재·프론트 미사용).
    $register('GET', '/v387/recommendations/rule');
    $register('GET', '/v387/recommendations/goal');
    $register('GET', '/v387/recommendations/incrementality');
    $register('POST', '/v388/ingest/unified');
    $register('GET', '/v388/schema/examples');
    $register('POST', '/v389/ingest/unified');
    $register('POST', '/v389/ingest/shopify/orders');
    $register('GET', '/v389/schema/standard');
    $register('POST', '/v390/actions/ads/from-recommendations');
    $register('POST', '/v390/shopify/checklists/generate');
    $register('GET', '/v392/healthz');
    $register('GET', '/v392/metrics');
    $register('POST', '/v392/feeds/preview');
    $register('POST', '/v392/feeds/export');
    $register('POST', '/v392/writeback/enqueue');
    $register('POST', '/v392/worker/run-once');
    $register('GET', '/v393/healthz');
    $register('GET', '/v393/metrics');
    $register('POST', '/v393/feeds/preview');
    $register('POST', '/v393/feeds/export');
    $register('GET', '/v393/templates/v2');
    $register('GET', '/v393/templates/v2/{channel}');
    $register('PUT', '/v393/templates/v2/{channel}');
    $register('POST', '/v393/validate/v2');
    $register('POST', '/v393/writeback/enqueue');
    $register('POST', '/v393/worker/run-once');
    $register('GET', '/v394/healthz');
    $register('GET', '/v394/metrics');
    $register('POST', '/v394/feeds/preview');
    $register('POST', '/v394/feeds/export');
    $register('GET', '/v394/templates/v2');
    $register('GET', '/v394/templates/v2/{channel}');
    $register('PUT', '/v394/templates/v2/{channel}');
    $register('POST', '/v394/validate/v2');
    $register('POST', '/v394/writeback/enqueue');
    $register('POST', '/v394/worker/run-once');
    $register('GET', '/v395/healthz');
    $register('GET', '/v395/metrics');
    $register('POST', '/v395/feeds/preview');
    $register('POST', '/v395/feeds/export');
    $register('POST', '/v395/writeback/enqueue');
    $register('POST', '/v395/worker/run-once');
    $register('GET', '/v395/templates/v2/{channel}/versions');
    $register('GET', '/v395/templates/v2/{channel}/current');
    $register('POST', '/v395/templates/v2/{channel}/drafts');
    $register('GET', '/v395/templates/v2/{channel}/drafts/{draft_id}');
    $register('PUT', '/v395/templates/v2/{channel}/drafts/{draft_id}');
    $register('POST', '/v395/templates/v2/{channel}/drafts/{draft_id}/submit');
    $register('POST', '/v395/templates/v2/{channel}/drafts/{draft_id}/approve');
    $register('POST', '/v395/templates/v2/{channel}/drafts/{draft_id}/publish');
    $register('POST', '/v395/validate/v2');
    $register('GET', '/v397/admin/dlq');
    $register('POST', '/v397/admin/dlq/replay');
    $register('POST', '/v398/writeback/preview');
    $register('POST', '/v398/writeback/bulk_preview');
    $register('GET', '/v398/admin/dlq');
    $register('POST', '/v398/admin/dlq/replay');
    $register('POST', '/v398/admin/dlq/replay_bulk');
    $register('DELETE', '/v398/admin/dlq');
    $register('GET', '/v398/admin/dlq/schedule');
    $register('PUT', '/v398/admin/dlq/schedule');
    $register('GET', '/v399/recon/reports');
    $register('GET', '/v399/recon/reports/{report_id}');
    $register('POST', '/v399/recon/orders/import');
    $register('POST', '/v399/recon/settlements/import_lines');
    $register('POST', '/v399/recon/fee_rules/upsert');
    $register('POST', '/v399/recon/fx_rates/upsert');
    $register('POST', '/v399/recon/reports/run');
    $register('POST', '/v399/recon/reports/{report_id}/approve');
    $register('POST', '/v399/recon/reports/{report_id}/lock');
    $register('GET', '/v400/recon/reports');
    $register('GET', '/v400/recon/reports/{report_id}');
    $register('POST', '/v400/recon/orders/import');
    $register('POST', '/v400/recon/settlements/import_lines');
    $register('POST', '/v400/recon/fee_rules/upsert');
    $register('POST', '/v400/recon/fee_rules/upsert_legacy');
    $register('POST', '/v400/recon/fx_rates/upsert');
    $register('POST', '/v400/recon/reports/run');
    $register('POST', '/v400/recon/reports/{report_id}/approve');
    $register('POST', '/v400/recon/reports/{report_id}/lock');
    $register('GET', '/v400/recon/ledger');
    $register('GET', '/v400/recon/tickets');
    $register('POST', '/v400/recon/tickets/create');
    $register('POST', '/v400/recon/tickets/{ticket_id}/update');
    $register('GET', '/v401/recon/reports');
    $register('GET', '/v401/recon/reports/{report_id}');
    $register('POST', '/v401/recon/orders/import');
    $register('POST', '/v401/recon/settlements/import_lines');
    $register('POST', '/v401/recon/fee_rules/upsert');
    $register('GET', '/v401/recon/fee_rules/{channel}');
    $register('POST', '/v401/recon/fx_rates/upsert');
    $register('POST', '/v401/recon/reports/run');
    $register('POST', '/v401/recon/reports/{report_id}/approve');
    $register('POST', '/v401/recon/reports/{report_id}/lock');
    $register('GET', '/v401/recon/ledger');
    $register('GET', '/v401/recon/tickets');
    $register('POST', '/v401/recon/tickets/{ticket_id}/update');
    $register('POST', '/v401/recon/tickets/sla/upsert');
    $register('GET', '/v401/recon/tickets/sla/{reason}');
    $register('POST', '/v401/recon/tickets/sla/sweep');
    $register('GET', '/v401/recon/tickets/retry_schedule');
    $register('PUT', '/v401/recon/tickets/retry_schedule');
    $register('POST', '/v401/recon/tickets/retry_once');
    $register('POST', '/v401/writeback/policy_validate');
    $register('POST', '/v401/writeback/category/suggest');
    $register('POST', '/v401/writeback/category_map/upsert');
    $register('GET', '/v401/writeback/category_map/{channel}');
    $register('POST', '/v401/influencer/contracts/upsert');
    $register('GET', '/v401/influencer/contracts');
    $register('POST', '/v401/influencer/posts/import');
    $register('GET', '/v401/influencer/posts');
    $register('POST', '/v401/influencer/settlements/import');
    $register('GET', '/v401/influencer/settlements');
    $register('GET', '/v401/influencer/dashboard');
    $register('GET', '/v402/recon/reports');
    $register('GET', '/v402/recon/reports/{report_id}');
    $register('POST', '/v402/recon/orders/import');
    $register('POST', '/v402/recon/settlements/import_lines');
    $register('POST', '/v402/recon/fee_rules/upsert');
    $register('GET', '/v402/recon/fee_rules/{channel}');
    $register('POST', '/v402/recon/fx_rates/upsert');
    $register('GET', '/v402/recon/fx_rates/{base}/{quote}/{day}');
    $register('POST', '/v402/recon/reports/run');
    $register('POST', '/v402/recon/reports/{report_id}/approve');
    $register('POST', '/v402/recon/reports/{report_id}/lock');
    $register('GET', '/v402/recon/ledger');
    $register('GET', '/v402/recon/tickets');
    $register('POST', '/v402/recon/tickets/update');
    $register('POST', '/v402/recon/tickets/sla/upsert');
    $register('GET', '/v402/recon/tickets/sla/{reason}');
    $register('POST', '/v402/recon/tickets/sla/sweep');
    $register('GET', '/v402/recon/tickets/retry_schedule');
    $register('PUT', '/v402/recon/tickets/retry_schedule');
    $register('POST', '/v402/recon/tickets/retry_once');
    $register('POST', '/v402/writeback/policy_validate');
    $register('POST', '/v402/writeback/category/suggest');
    $register('POST', '/v402/writeback/category_map/upsert');
    $register('GET', '/v402/writeback/category_map/{channel}');
    $register('POST', '/v402/influencer/contracts/upsert');
    $register('GET', '/v402/influencer/contracts');
    $register('POST', '/v402/influencer/posts/import');
    $register('GET', '/v402/influencer/posts');
    $register('POST', '/v402/influencer/settlements/import');
    $register('GET', '/v402/influencer/settlements');
    $register('GET', '/v402/influencer/dashboard');
    $register('GET', '/v402/influencer/vendors');
    $register('GET', '/v402/oauth/{vendor}/authorize_url');
    $register('POST', '/v402/oauth/{vendor}/manual_token');
    $register('POST', '/v402/oauth/{vendor}/refresh');
    $register('GET', '/v402/influencer/contracts/template/{vendor}');
    $register('POST', '/v402/influencer/settlements/parse');
    $register('POST', '/v402/webhooks/{vendor}');
    $register('POST', '/v402/notify/slack/test');
    $register('GET', '/v403/influencer/vendors');
    $register('GET', '/v403/oauth/{vendor}/authorize_url');
    $register('POST', '/v403/oauth/{vendor}/exchange_code');
    $register('POST', '/v403/oauth/{vendor}/manual_token');
    $register('POST', '/v403/oauth/{vendor}/refresh');
    $register('GET', '/v403/influencer/contracts/template/{vendor}');
    $register('POST', '/v403/webhooks/{vendor}');
    $register('POST', '/v403/influencer/settlements/parse');
    $register('POST', '/v403/influencer/contracts/upsert');
    $register('GET', '/v403/influencer/contracts');
    $register('POST', '/v403/influencer/posts/import');
    $register('GET', '/v403/influencer/posts');
    $register('POST', '/v403/influencer/settlements/import');
    $register('GET', '/v403/influencer/settlements');
    $register('GET', '/v403/influencer/dashboard');
    $register('GET', '/v403/influencer/rights/expiring');
    $register('POST', '/v403/creators/upsert');
    $register('GET', '/v403/creators');
    $register('POST', '/v403/creators/resolve');
    $register('POST', '/v403/creators/merge');
    $register('POST', '/v403/esign/{provider}/envelopes/create');
    $register('GET', '/v403/esign/envelopes');
    $register('GET', '/v403/esign/envelopes/{envelope_id}');
    $register('POST', '/v403/esign/webhooks/{provider}');
    $register('GET', '/v403/notify/routes');
    $register('PUT', '/v403/notify/routes');
    $register('POST', '/v403/notify/slack/test');
    $register('GET', '/v403/recon/reports');
    $register('GET', '/v403/recon/reports/{report_id}');
    $register('POST', '/v403/recon/reports/run');
    $register('POST', '/v403/recon/orders/import');
    $register('POST', '/v403/recon/settlements/import_lines');
    $register('POST', '/v403/recon/fee_rules/upsert');
    $register('GET', '/v403/recon/fee_rules/{channel}');
    $register('POST', '/v403/recon/fx_rates/upsert');
    $register('GET', '/v403/recon/fx_rates/{pair}');
    $register('POST', '/v403/recon/reports/{report_id}/approve');
    $register('POST', '/v403/recon/reports/{report_id}/lock');
    $register('GET', '/v403/recon/ledger');
    $register('GET', '/v403/recon/tickets');
    $register('POST', '/v403/recon/tickets/{ticket_id}/update');
    $register('POST', '/v403/recon/tickets/sla/upsert');
    $register('GET', '/v403/recon/tickets/sla/{reason}');
    $register('POST', '/v403/recon/tickets/sla/sweep');
    $register('GET', '/v403/recon/tickets/retry_schedule');
    $register('PUT', '/v403/recon/tickets/retry_schedule');
    $register('POST', '/v403/recon/tickets/retry_once');
    $register('GET', '/v404/influencer/vendors');
    $register('GET', '/v404/oauth/{vendor}/authorize_url');
    $register('POST', '/v404/oauth/{vendor}/exchange_code');
    $register('POST', '/v404/oauth/{vendor}/manual_token');
    $register('POST', '/v404/oauth/{vendor}/refresh');
    $register('GET', '/v404/influencer/contracts/template/{vendor}');
    $register('POST', '/v404/webhooks/{vendor}');
    $register('POST', '/v404/influencer/settlements/parse');
    $register('POST', '/v404/influencer/contracts/upsert');
    $register('GET', '/v404/influencer/contracts');
    $register('POST', '/v404/influencer/posts/import');
    $register('GET', '/v404/influencer/posts');
    $register('POST', '/v404/influencer/settlements/import');
    $register('GET', '/v404/influencer/settlements');
    $register('GET', '/v404/influencer/dashboard');
    $register('GET', '/v404/influencer/rights/expiring');
    $register('POST', '/v404/creators/upsert');
    $register('GET', '/v404/creators');
    $register('POST', '/v404/creators/resolve');
    $register('POST', '/v404/creators/merge');
    $register('GET', '/v404/esign/providers');
    $register('GET', '/v404/esign/{provider}/authorize_url');
    $register('POST', '/v404/esign/{provider}/exchange_code');
    $register('POST', '/v404/esign/dropboxsign/store_api_key');
    $register('POST', '/v404/esign/{provider}/envelopes/create');
    $register('GET', '/v404/esign/envelopes');
    $register('GET', '/v404/esign/envelopes/{envelope_id}');
    $register('POST', '/v404/esign/envelopes/{envelope_id}/sync');
    $register('POST', '/v404/esign/webhooks/{provider}');
    $register('GET', '/v404/notify/routes');
    $register('PUT', '/v404/notify/routes');
    $register('POST', '/v404/notify/slack/test');
    $register('GET', '/v404/recon/reports');
    $register('GET', '/v404/recon/reports/{report_id}');
    $register('POST', '/v404/recon/reports/run');
    $register('GET', '/v405/health');
    $register('GET', '/v405/spec/activity_event_schema');
    $register('POST', '/v405/events/ingest');
    $register('POST', '/v405/events/normalize');
    $register('POST', '/v405/metrics/compute');
    $register('POST', '/v405/recommendations/generate');
    $register('GET', '/v406/health');
    $register('GET', '/v406/spec/activity_event_schema');
    $register('POST', '/v406/events/normalize');
    $register('POST', '/v406/metrics/compute');
    $register('POST', '/v406/recommendations/generate');
    $register('POST', '/v406/rollups/compute');
    $register('POST', '/v406/rollups/persist');
    $register('GET', '/v406/alert_policies');
    $register('POST', '/v406/alert_policies');
    $register('PUT', '/v406/alert_policies/{policy_id}');
    $register('DELETE', '/v406/alert_policies/{policy_id}');
    $register('POST', '/v406/alerts/evaluate');
    $register('GET', '/v406/alerts');
    $register('GET', '/v407/health');
    $register('GET', '/v407/spec/activity_event_schema');
    $register('POST', '/v407/events/normalize');
    $register('POST', '/v407/rollups/compute');
    $register('POST', '/v407/rollups/persist');
    $register('GET', '/v407/alert_policies');
    $register('POST', '/v407/alert_policies');
    $register('PUT', '/v407/alert_policies/{policy_id}');
    $register('DELETE', '/v407/alert_policies/{policy_id}');
    $register('POST', '/v407/alerts/evaluate');
    $register('GET', '/v407/alerts');
    $register('GET', '/v408/health');
    $register('GET', '/v408/spec/activity_event_schema');
    $register('POST', '/v408/events/normalize');
    $register('POST', '/v408/rollups/compute');
    $register('POST', '/v408/rollups/persist');
    $register('GET', '/v408/alert_policies');
    $register('POST', '/v408/alert_policies');
    $register('PUT', '/v408/alert_policies/{policy_id}');
    $register('DELETE', '/v408/alert_policies/{policy_id}');
    $register('POST', '/v408/alerts/evaluate');
    $register('GET', '/v408/alerts');
    $register('GET', '/v408/action_requests');
    $register('POST', '/v408/action_requests/{action_request_id}/decide');
    $register('POST', '/v408/action_requests/{action_request_id}/execute');
    $register('GET', '/v408/audit_logs');
    $register('GET', '/v409/health');
    $register('GET', '/v409/spec/activity_event_schema');
    $register('POST', '/v409/events/normalize');
    $register('POST', '/v409/rollups/compute');
    $register('POST', '/v409/rollups/persist');
    $register('GET', '/v409/alert_policies');
    $register('POST', '/v409/alert_policies');
    $register('DELETE', '/v409/alert_policies/{policy_id}');
    $register('POST', '/v409/alerts/evaluate');
    $register('GET', '/v409/alerts');
    $register('GET', '/v409/action_requests');
    $register('POST', '/v409/action_requests/{action_request_id}/decide');
    $register('POST', '/v409/action_requests/{action_request_id}/execute');
    $register('GET', '/v409/audit_logs');
    $register('GET', '/v410/health');
    $register('GET', '/v410/actions/presets');
    $register('POST', '/v410/events/normalize');
    $register('POST', '/v410/rollups/compute');
    $register('POST', '/v410/rollups/persist');
    $register('GET', '/v410/alert_policies');
    $register('POST', '/v410/alert_policies');
    $register('PUT', '/v410/alert_policies/{policy_id}');
    $register('DELETE', '/v410/alert_policies/{policy_id}');
    $register('POST', '/v410/alerts/evaluate');
    $register('GET', '/v410/alerts');
    $register('GET', '/v410/action_requests');
    // 168차 deploy fix: {action_id} ↔ {id} wildcard 충돌 (FastRoute "Cannot register two routes")
    // L1809-1810 의 {id} 와일드카드 가 167차 ec139ed 의 정합 보강 결과 ($custom L159-160 정합).
    // $register('POST', '/v410/action_requests/{action_id}/decide');
    // $register('POST', '/v410/action_requests/{action_id}/execute');
    $register('GET', '/v410/audit_logs');
    $register('GET', '/v410/ai/policies/suggest');
    $register('POST', '/v411/events/ingest');
    $register('POST', '/v411/events/normalize');
    $register('POST', '/v411/rollups/compute');
    $register('POST', '/v411/rollups/persist');
    $register('GET', '/v411/alert_policies');
    $register('POST', '/v411/alert_policies');
    $register('PUT', '/v411/alert_policies/{policy_id}');
    $register('DELETE', '/v411/alert_policies/{policy_id}');
    $register('POST', '/v411/alerts/evaluate');
    $register('GET', '/v411/alerts');
    $register('GET', '/v411/actions/presets');
    $register('GET', '/v411/ai/policies/suggest');
    $register('POST', '/v412/events/ingest');
    $register('POST', '/v412/events/normalize');
    $register('POST', '/v412/rollups/compute');
    $register('POST', '/v412/rollups/persist');
    $register('GET', '/v412/alert_policies');
    $register('POST', '/v412/alert_policies');
    $register('PUT', '/v412/alert_policies/{policy_id}');
    $register('DELETE', '/v412/alert_policies/{policy_id}');
    $register('POST', '/v412/alerts/evaluate');
    $register('GET', '/v412/alerts');
    $register('GET', '/v412/actions/presets');
    $register('GET', '/v412/ai/policies/suggest');
    $register('POST', '/v413/events/ingest');
    $register('POST', '/v413/events/normalize');
    $register('POST', '/v413/rollups/compute');
    $register('POST', '/v413/rollups/persist');
    $register('GET', '/v413/alert_policies');
    $register('POST', '/v413/alert_policies');
    $register('PUT', '/v413/alert_policies/{policy_id}');
    $register('DELETE', '/v413/alert_policies/{policy_id}');
    $register('POST', '/v413/alerts/evaluate');
    $register('GET', '/v413/alerts');
    $register('GET', '/v413/actions/presets');
    $register('GET', '/v413/ai/policies/suggest');
    $register('POST', '/v414/events/ingest');
    $register('POST', '/v414/events/normalize');
    $register('POST', '/v414/rollups/compute');
    $register('POST', '/v414/rollups/persist');
    $register('GET', '/v414/alert_policies');
    $register('POST', '/v414/alert_policies');
    $register('PUT', '/v414/alert_policies/{policy_id}');
    $register('DELETE', '/v414/alert_policies/{policy_id}');
    $register('POST', '/v414/alerts/evaluate');
    $register('GET', '/v414/alerts');
    $register('GET', '/v414/actions/presets');
    $register('GET', '/v414/ai/policies/suggest');
    $register('POST', '/v415/events/ingest');
    $register('POST', '/v415/events/normalize');
    $register('POST', '/v415/rollups/compute');
    $register('POST', '/v415/rollups/persist');
    $register('GET', '/v415/alert_policies');
    $register('POST', '/v415/alert_policies');
    $register('PUT', '/v415/alert_policies/{policy_id}');
    $register('DELETE', '/v415/alert_policies/{policy_id}');
    $register('POST', '/v415/alerts/evaluate');
    $register('GET', '/v415/alerts');
    $register('GET', '/v415/actions/presets');
    $register('GET', '/v415/ai/policies/suggest');
    $register('POST', '/v416/events/ingest');
    $register('POST', '/v416/events/normalize');
    $register('POST', '/v416/rollups/compute');
    $register('POST', '/v416/rollups/persist');
    $register('GET', '/v416/alert_policies');
    $register('POST', '/v416/alert_policies');
    $register('PUT', '/v416/alert_policies/{policy_id}');
    $register('DELETE', '/v416/alert_policies/{policy_id}');
    $register('POST', '/v416/alerts/evaluate');
    $register('GET', '/v416/alerts');
    $register('GET', '/v416/actions/presets');
    $register('GET', '/v416/ai/policies/suggest');
    $register('POST', '/v417/events/ingest');
    $register('POST', '/v417/events/normalize');
    $register('POST', '/v417/rollups/compute');
    $register('POST', '/v417/rollups/persist');
    $register('GET', '/v417/alert_policies');
    $register('POST', '/v417/alert_policies');
    $register('PUT', '/v417/alert_policies/{policy_id}');
    $register('DELETE', '/v417/alert_policies/{policy_id}');
    $register('POST', '/v417/alerts/evaluate');
    $register('GET', '/v417/alerts');
    $register('GET', '/v417/actions/presets');
    $register('GET', '/v417/ai/policies/suggest');
    $register('GET', '/v417/mappings');
    $register('POST', '/v417/mappings');
    $register('PUT', '/v417/mappings/{mapping_id}');
    $register('DELETE', '/v417/mappings/{mapping_id}');
    // 191차: 팬텀 V418 라우트 제거(events/ingest·normalize, rollups/compute·persist).
    $register('GET', '/v418/alert_policies');
    $register('POST', '/v418/alert_policies');
    $register('PUT', '/v418/alert_policies/{policy_id}');
    $register('DELETE', '/v418/alert_policies/{policy_id}');
    $register('POST', '/v418/alerts/evaluate');
    $register('GET', '/v418/alerts');
    $register('GET', '/v418/actions/presets');
    // 191차: 팬텀 V418::aiSuggestPolicies 제거.
    $register('GET', '/v418/mappings');
    $register('POST', '/v418/mappings');
    $register('PUT', '/v418/mappings/{mapping_id}');
    $register('DELETE', '/v418/mappings/{mapping_id}');
    $register('POST', '/v418/mappings/proposals');
    $register('GET', '/v418/mappings/proposals');
    $register('POST', '/v418/mappings/proposals/{req_id}/approve');
    $register('POST', '/v418/mappings/proposals/{req_id}/apply');
    $register('POST', '/v418/mappings/impact_preview');
    $register('POST', '/v418/mappings/validate');
    $register('GET', '/v418/mappings/validation_rules');
    $register('POST', '/v418/mappings/validation_rules');
    $register('PUT', '/v418/mappings/validation_rules/{rule_id}');
    $register('DELETE', '/v418/mappings/validation_rules/{rule_id}');

    // ── v419 Semi-Attribution ──────────────────────────────────────────────
    $register('POST', '/v419/attribution/coupons');
    $register('GET',  '/v419/attribution/coupons');
    $register('POST', '/v419/attribution/deeplinks');
    $register('GET',  '/v419/attribution/deeplinks');
    $register('POST', '/v419/attribution/touch');
    $register('POST', '/v419/attribution/score');
    $register('GET',  '/v419/attribution/results');
    $register('GET',  '/v419/attribution/summary');

    // ── v419 Graph Scoring ─────────────────────────────────────────────────
    $register('POST', '/v419/graph/nodes');
    $register('GET',  '/v419/graph/nodes');
    $register('POST', '/v419/graph/edges');
    $register('GET',  '/v419/graph/edges');
    $register('GET',  '/v419/graph/score/influencer/{id}');
    $register('GET',  '/v419/graph/score/sku/{sku}');
    $register('GET',  '/v419/graph/score/order/{id}');
    $register('GET',  '/v419/graph/summary');

    // ── v419 Korean Domestic Channel ──────────────────────────────────────────
    $register('GET',   '/v419/kr/channels');
    $register('GET',   '/v419/kr/channels/{key}');
    $register('POST',  '/v419/kr/fee-rules');
    $register('GET',   '/v419/kr/fee-rules/{key}');
    $register('POST',  '/v419/kr/settle/ingest');
    $register('POST',  '/v419/kr/settle/ingest-raw/{key}');
    $register('GET',   '/v419/kr/settle/lines');
    $register('GET',   '/v419/kr/settle/summary');
    $register('POST',  '/v419/kr/recon/run');
    $register('GET',   '/v419/kr/recon/reports');
    $register('GET',   '/v419/kr/recon/reports/{id}');
    $register('PATCH', '/v419/kr/recon/tickets/{id}');

    // ── v420 Price Optimisation Engine ─────────────────────────────────────────
    $register('GET',  '/v420/price/summary');
    $register('GET',  '/v420/price/products');
    $register('POST', '/v420/price/products');
    $register('POST', '/v420/price/elasticity');
    $register('POST', '/v420/price/optimize');
    $register('GET',  '/v420/price/recommendations');
    $register('POST', '/v420/price/simulate');
    $register('GET',  '/v420/channel-mix/results');
    $register('POST', '/v420/channel-mix/simulate');

    // ── v421 API Key Management ────────────────────────────────────────────
    $register('GET',    '/v421/keys/whoami');
    $register('GET',    '/v421/keys');
    $register('POST',   '/v421/keys');
    $register('DELETE', '/v421/keys/{id}');
    $register('POST',   '/v421/keys/{id}/rotate');

    // ── v421 Connectors — TikTok + Amazon ─────────────────────────────────
    $register('GET',  '/v421/connectors/status');
    $register('GET',  '/v421/connectors/tiktok/report');
    $register('POST', '/v421/connectors/tiktok/token');
    $register('GET',  '/v421/connectors/amazon/reports');
    $register('POST', '/v421/connectors/amazon/orders');
    $register('POST', '/v421/connectors/amazon/token');

    // ── v422 Trends + AI Insight ───────────────────────────────────────────
    $register('GET',  '/v422/trends/pnl');
    $register('GET',  '/v422/trends/roas');
    $register('GET',  '/v422/trends/returns');
    $register('POST', '/v422/ai/insight');

    // ── v423 Two-Layer Event Schema ───────────────────────────────────
    $register('POST', '/v423/events/ingest-raw');
    $register('POST', '/v423/events/normalize');
    $register('GET',  '/v423/events/raw');
    $register('GET',  '/v423/events/normalized');
    $register('GET',  '/v423/events/summary');
    $register('GET',  '/v423/schema');

    // ── v423 Rollup Aggregation Layer ─────────────────────────────────────
    $register('GET', '/v423/rollup/summary');
    $register('GET', '/v423/rollup/sku');
    $register('GET', '/v423/rollup/campaign');
    $register('GET', '/v423/rollup/creator');
    $register('GET', '/v423/rollup/platform');

    // ── v423 DbAdmin — phpMyAdmin 스타일 DB 관리 ──────────────────────
    $register('GET',    '/v423/dbadmin/tables');
    $register('GET',    '/v423/dbadmin/tables/{table}');
    $register('GET',    '/v423/dbadmin/tables/{table}/rows');
    $register('POST',   '/v423/dbadmin/query');
    $register('POST',   '/v423/dbadmin/tables/{table}/truncate');
    $register('DELETE', '/v423/dbadmin/tables/{table}/rows/{id}');

    // ── v423 Channel Credential Management ──────────────────────────
    $register('GET',    '/v423/creds');
    $register('POST',   '/v423/creds');
    $register('GET',    '/v423/creds/scan');
    $register('GET',    '/v423/creds/summary');
    $register('DELETE', '/v423/creds/{id}');
    $register('POST',   '/v423/creds/{id}/test');
    // [현 차수] H4: InfluencerUGC 라이브 데이터
    $register('GET',    '/v423/influencer/creators');
    $register('GET',    '/v423/influencer/ugc-reviews');
    $register('GET',    '/v423/influencer/channel-stats');
    $register('GET',    '/v423/influencer/neg-keywords');
    $register('POST',   '/v423/influencer/creators');
    $register('POST',   '/v423/influencer/ugc-reviews');
    $register('POST',   '/v423/influencer/channel-stats');
    $register('POST',   '/v423/influencer/neg-keywords');

    // ── v422 AI 마케팅 추천 (전체 카테고리) ─────────────────────────
    $register('POST', '/v422/ai/campaign-search');
    $register('POST', '/v422/ai/live-assist');
    $register('POST', '/v422/ai/campaign-ad-creative');
    $register('POST', '/v422/ai/campaign-ad-design');
    $register('POST', '/v422/ai/campaign-ad-chat');
    $register('POST', '/v422/ai/campaign-ad-render');
    $register('POST', '/v422/ai/campaign-ad-image');
    $register('POST', '/v422/ai/campaign-ad-video');
    $register('GET',  '/v422/ai/campaign-ad-video-status');
    $register('POST', '/v422/ai/ad-design/save');
    $register('GET',  '/v422/ai/ad-design/list');
    $register('POST', '/v423/auto-campaign/launch');
    $register('GET',  '/v423/auto-campaign/list');
    $register('POST', '/v423/auto-campaign/status');
    $register('POST', '/v423/auto-campaign/optimize');
    $register('GET',  '/v423/auto-campaign/optimize-history');
    $register('GET',  '/v423/auto-campaign/ab-status');

    // ── Auth ────────────────────────────────────────────────────────
    $register('POST', '/auth/register');
    $register('POST', '/auth/login');
    $register('GET',  '/auth/me');
    $register('PATCH', '/auth/profile'); // 175차 S3.2
    // 188차 계정 자기관리
    $register('POST', '/auth/change-password');
    $register('POST', '/auth/find-id');
    $register('POST', '/auth/forgot-password');
    $register('POST', '/auth/reset-password');
    $register('POST', '/auth/admin/verify-access-key');
    $register('POST', '/auth/admin/access-key');
    $register('GET',  '/auth/admin/smtp');
    $register('POST', '/auth/admin/smtp');
    $register('POST', '/auth/admin/smtp/test');
    $register('GET',  '/auth/admin/sms');
    $register('POST', '/auth/admin/sms');
    $register('POST', '/auth/admin/sms/test');
    $register('GET',  '/auth/admin/ai-key');
    $register('POST', '/auth/admin/ai-key');
    $register('GET',  '/auth/admin/img-key');
    $register('POST', '/auth/admin/img-key');
    $register('GET',  '/auth/admin/video-key');
    $register('POST', '/auth/admin/video-key');
    // 189차+ 인증 감사로그
    $register('GET',  '/auth/audit-logs');
    // 189차+ 세션/기기 관리
    $register('GET',  '/auth/sessions');
    $register('POST', '/auth/sessions/revoke-others');
    // 189차+ API 키 관리(세션 인증·소유자 전용)
    $register('GET',    '/auth/api-keys');
    $register('POST',   '/auth/api-keys');
    $register('DELETE', '/auth/api-keys/{id}');
    $register('POST',   '/auth/api-keys/{id}/rotate');
    // 189차+ 인앱 알림센터(서버백킹)
    $register('GET',    '/auth/notifications');
    $register('POST',   '/auth/notifications');
    $register('POST',   '/auth/notifications/read');
    $register('POST',   '/auth/notifications/clear');
    $register('DELETE', '/auth/notifications/{id}');
    // 189차 MFA/2FA (TOTP)
    $register('GET',  '/auth/mfa/status');
    $register('POST', '/auth/mfa/setup');
    $register('POST', '/auth/mfa/enable');
    $register('POST', '/auth/mfa/disable');
    $register('POST', '/auth/mfa/otp/send');
    $register('POST', '/auth/mfa/otp/enable');
    // 180차 Phase2 멤버구성원 팀/팀원 하위계정
    $register('GET',    '/auth/team/members');
    $register('POST',   '/auth/team/members');
    $register('PATCH',  '/auth/team/members/{id}');
    $register('DELETE', '/auth/team/members/{id}');
    $register('POST', '/auth/logout');
    $register('POST', '/auth/upgrade');
    $register('GET',  '/auth/subscription');
    $register('POST', '/auth/demo');        // 데모 세션 발급 (24h)
    $register('GET',  '/auth/plan-check'); // 현재 플랜 + 기능 접근 목록


    // ── Payment (Toss PG) — 168차 DEPRECATED (N-152-F USD/Paddle 단일) ──
    //    spec: docs/spec/n152f_billing_usd_card_only.md
    // $register('GET',  '/auth/payment/config');
    // $register('GET',  '/auth/payment/plans');
    // $register('POST', '/auth/payment/confirm');
    // $register('POST', '/auth/payment/cancel');
    // $register('POST', '/payment/webhook/toss');

    // ── PG Config Admin — 168차 DEPRECATED ───────────────────────────
    // $register('GET',  '/auth/pg/config');
    // $register('POST', '/auth/pg/config');
    // $register('DELETE', '/auth/pg/config/{provider}');

    // ── Pricing Config Admin ─────────────────────────────────────────
    $register('GET',  '/auth/pricing/config');
    $register('POST', '/auth/pricing/config');

    // ── Menu-based Tier Pricing ──────────────────────────────────────
    $register('GET',    '/auth/pricing/plans');
    $register('POST',   '/auth/pricing/plans');
    $register('DELETE', '/auth/pricing/plans/{id}');
    $register('POST',   '/auth/pricing/paddle-sync');

    // ── 공개 구독요금 조회 (인증 불요 — 가입 화면용) ─────────────────
    $register('GET',    '/auth/pricing/public-plans');
    $register('GET',    '/api/auth/pricing/public-plans');

    // ── 187차 Phase2 — SiteIntro (회사소개/연혁/운영진) ───────────────
    $register('GET',    '/auth/site/intro');
    $register('GET',    '/api/auth/site/intro');
    $register('GET',    '/v424/admin/site/intro');
    $register('PUT',    '/v424/admin/site/company');
    $register('PUT',    '/v424/admin/site/visibility');
    $register('POST',   '/v424/admin/site/team');
    $register('DELETE', '/v424/admin/site/team/{id}');
    $register('POST',   '/v424/admin/site/history');
    $register('DELETE', '/v424/admin/site/history/{id}');
    $register('GET',    '/api/v424/admin/site/intro');
    $register('PUT',    '/api/v424/admin/site/company');
    $register('PUT',    '/api/v424/admin/site/visibility');
    $register('POST',   '/api/v424/admin/site/team');
    $register('DELETE', '/api/v424/admin/site/team/{id}');
    $register('POST',   '/api/v424/admin/site/history');
    $register('DELETE', '/api/v424/admin/site/history/{id}');

    // ── Subscription Packages ────────────────────────────────────────
    $register('GET',    '/auth/pricing/packages');
    $register('POST',   '/auth/pricing/packages');
    $register('DELETE', '/auth/pricing/packages/{id}');

    // ── Subscriber & Coupon Management ───────────────────────────────
    $register('GET',    '/auth/admin/subscribers');
    $register('GET',    '/auth/admin/subscribers/{id}');
    $register('PATCH',  '/auth/admin/subscribers/{id}');
    $register('GET',    '/auth/admin/coupons');
    $register('POST',   '/auth/admin/coupons');
    $register('DELETE', '/auth/admin/coupons/{id}');

    // ── v423 Paddle Billing v2 ───────────────────────────────────────
    $register('POST', '/v423/paddle/webhook');
    $register('GET',  '/v423/paddle/config');
    $register('GET',  '/v423/paddle/plans');
    $register('GET',  '/v423/paddle/subscription');
    $register('POST', '/v423/paddle/cancel');
    $register('GET',  '/v423/paddle/migrate');

    // ── v423 User & Member Admin ─────────────────────────────────────
    $register('GET',    '/v423/admin/users');
    $register('POST',   '/v423/admin/users');
    $register('GET',    '/v423/admin/users/{id}');
    $register('PATCH',  '/v423/admin/users/{id}/plan');
    $register('PATCH',  '/v423/admin/users/{id}/active');
    $register('POST',   '/v423/admin/users/{id}/reset-password');
    $register('GET',    '/v423/admin/stats');
    $register('GET',    '/v423/admin/plan-prices');
    $register('POST',   '/v423/admin/plan-prices');
    $register('DELETE', '/v423/admin/plan-prices/{plan}/{period}');
    $register('GET',    '/v423/admin/migrate');
    $register('GET',    '/v423/admin/roles');
    $register('POST',   '/v423/admin/roles');
    $register('DELETE', '/v423/admin/roles/{role_key}');
    $register('GET',    '/v423/admin/users/{id}/roles');
    $register('PATCH',  '/v423/admin/users/{id}/role');
    $register('DELETE', '/v423/admin/users/{id}/roles/{role_key}');
    $register('GET',    '/v423/admin/billing');
    $register('GET',    '/v423/admin/audit-logs');

    // ── v423 Coupon Management (UserAdmin) ───────────────────────────
    $register('POST',   '/v423/admin/coupons');
    $register('GET',    '/v423/admin/coupons');
    $register('POST',   '/v423/admin/coupons/{id}/revoke');
    $register('POST',   '/v423/coupons/redeem');
    $register('GET',    '/v423/coupons/mine');
    $register('GET',    '/v423/admin/coupon-migrate');
    $register('GET',    '/v423/admin/demo-users');   // 무료회원 목록 (쿠폰 발급 대상)
    $register('POST',   '/v423/coupon/profile');      // 쿠폰 활성화 전 비즈니스 프로필 등록

    // ── v423 Real Channel API Connectors ─────────────────────────────
    $register('GET',  '/v423/connectors/meta/insights');
    $register('GET',  '/v423/connectors/google/report');
    $register('GET',  '/v423/connectors/naver/report');
    $register('GET',  '/v423/connectors/coupang/orders');
    $register('GET',  '/v423/connectors/status-all');
    $register('POST', '/v423/connectors/sync');

    // ── v423 Channel Credential Management (API 키 저장/조회/테스트) ────
    // (이전에 여기에 있던 $app->get 라우트들은 위쪽의 $register로 통합되었습니다)
    
    // SmartConnect: 채널 스캔 / 자동 연동 테스트 / 발급신청
    $register('POST', '/v423/connectors/{channel}/test');
    $register('POST', '/v423/connectors/apply');


    // ── v423 Alert notifications ──────────────────────────────────────
    $register('POST', '/v423/alerts/test-notify');

    // ── Auth: License Key Activation ─────────────────────────────────
    // 168차 deploy fix: $register 'POST /auth/license' (L1892, $custom L543 정합) 와 중복.
    // FastRoute "Cannot register two routes matching /auth/license POST" → 직접 호출 주석.
    // $app->post('/auth/license', [\Genie\Handlers\UserAuth::class, 'activateLicense']);

    // ── Admin: License Key Management ────────────────────────────────
    // POST /admin/license/generate  — 새 라이선스 키 발급   (admin only)
    // GET  /admin/license/list      — 발급된 키 목록 조회
    // DELETE /admin/license/{id}    — 키 비활성화
    $app->post('/admin/license/generate', function (
        \Psr\Http\Message\ServerRequestInterface $req,
        \Psr\Http\Message\ResponseInterface $res
    ) {
        $json = fn($data, $status = 200) => (function() use ($res, $data, $status) {
            $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
        })();

        // Verify admin session
        $authHeader = $req->getHeaderLine('Authorization');
        $token = preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m) ? $m[1] : '';
        if (!$token) return $json(['ok' => false, 'error' => '관리자 인증 필요'], 401);

        try {
            $pdo = \Genie\Db::pdo();
            $now = gmdate('Y-m-d\TH:i:s\Z');

            // Check admin
            $stmt = $pdo->prepare(
                "SELECT u.plan FROM user_session s JOIN app_user u ON u.id=s.user_id
                 WHERE s.token=? AND s.expires_at>? AND u.is_active=1 LIMIT 1"
            );
            $stmt->execute([$token, $now]);
            $admin = $stmt->fetch(\PDO::FETCH_ASSOC);
            // 192차 보안 P0: 라이선스 관리(발급/조회)는 admin 전용 — enterprise 자가발급·키열람 권한상승 차단.
            if (!$admin || $admin['plan'] !== 'admin') {
                return $json(['ok' => false, 'error' => '관리자 권한 필요'], 403);
            }

            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) {
                $raw = (string)$req->getBody();
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) $body = $decoded;
            }

            $targetEmail = trim((string)($body['email'] ?? ''));
            $plan        = in_array($body['plan'] ?? 'enterprise', ['pro', 'enterprise'], true)
                           ? $body['plan'] : 'enterprise';
            $expireDays  = max(30, min(3650, (int)($body['expire_days'] ?? 3650)));
            $expiresAt   = gmdate('Y-m-d\TH:i:s\Z', time() + $expireDays * 86400);

            // 라이선스 키 생성: GENIE-XXXX-XXXX-XXXX-XXXX
            $raw = strtoupper(bin2hex(random_bytes(8)));
            $licKey = 'GENIE-' . substr($raw, 0, 4) . '-' . substr($raw, 4, 4)
                             . '-' . substr($raw, 8, 4) . '-' . substr($raw, 12, 4);
            $keyHash = hash('sha256', $licKey);

            // Ensure license_key table exists
            $pdo->exec(
                "CREATE TABLE IF NOT EXISTS license_key (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    key_hash VARCHAR(64) NOT NULL UNIQUE,
                    plan VARCHAR(20) NOT NULL DEFAULT 'enterprise',
                    issued_to_email VARCHAR(200),
                    issued_by INT,
                    expires_at DATETIME,
                    used_by INT,
                    used_at DATETIME,
                    use_count INT DEFAULT 0,
                    is_active TINYINT(1) NOT NULL DEFAULT 1,
                    note TEXT,
                    created_at DATETIME NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            );

            $pdo->prepare(
                "INSERT INTO license_key (key_hash, plan, issued_to_email, expires_at, is_active, created_at)
                 VALUES (?, ?, ?, ?, 1, ?)"
            )->execute([$keyHash, $plan, $targetEmail ?: null, $expiresAt, $now]);

            return $json([
                'ok'          => true,
                'license_key' => $licKey,
                'plan'        => $plan,
                'issued_to'   => $targetEmail ?: '(지정 없음)',
                'expires_at'  => $expiresAt,
                'expire_days' => $expireDays,
            ]);

        } catch (\Throwable $e) {
            return $json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    });

    $app->get('/admin/license/list', function (
        \Psr\Http\Message\ServerRequestInterface $req,
        \Psr\Http\Message\ResponseInterface $res
    ) {
        $json = fn($data, $status = 200) => (function() use ($res, $data, $status) {
            $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
        })();

        $authHeader = $req->getHeaderLine('Authorization');
        $token = preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m) ? $m[1] : '';
        if (!$token) return $json(['ok' => false, 'error' => '인증 필요'], 401);

        try {
            $pdo = \Genie\Db::pdo();
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $pdo->prepare(
                "SELECT u.plan FROM user_session s JOIN app_user u ON u.id=s.user_id
                 WHERE s.token=? AND s.expires_at>? LIMIT 1"
            );
            $stmt->execute([$token, $now]);
            $admin = $stmt->fetch(\PDO::FETCH_ASSOC);
            // 192차 보안 P0: 라이선스 관리(발급/조회)는 admin 전용 — enterprise 자가발급·키열람 권한상승 차단.
            if (!$admin || $admin['plan'] !== 'admin') {
                return $json(['ok' => false, 'error' => '관리자 권한 필요'], 403);
            }

            try {
                $rows = $pdo->query(
                    "SELECT id, plan, issued_to_email, expires_at, used_by, used_at,
                            use_count, is_active, note, created_at
                       FROM license_key ORDER BY created_at DESC LIMIT 200"
                )->fetchAll(\PDO::FETCH_ASSOC);
                return $json(['ok' => true, 'keys' => $rows]);
            } catch (\Throwable $e2) {
                return $json(['ok' => true, 'keys' => [], 'note' => 'license_key table not yet created']);
            }
        } catch (\Throwable $e) {
            return $json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    });

    $app->delete('/admin/license/{id}', function (
        \Psr\Http\Message\ServerRequestInterface $req,
        \Psr\Http\Message\ResponseInterface $res,
        array $args
    ) {
        $json = fn($data, $status = 200) => (function() use ($res, $data, $status) {
            $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
            return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
        })();
        try {
            $pdo = \Genie\Db::pdo();
            $pdo->prepare("UPDATE license_key SET is_active=0 WHERE id=?")->execute([(int)$args['id']]);
            return $json(['ok' => true]);
        } catch (\Throwable $e) {
            return $json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    });

    // ── 이벤트 팝업 라우트 등록 ───────────────────────────────────────────
    $register('GET',    '/v423/popups/active');
    $register('GET',    '/v423/admin/popups');
    $register('POST',   '/v423/admin/popups');
    $register('PUT',    '/v423/admin/popups/{id}');
    $register('DELETE', '/v423/admin/popups/{id}');
    $register('POST',   '/v423/admin/popups/{id}/toggle');

    // ── 쿠폰 관리 라우트 ─────────────────────────────────────────────────
    $register('POST',   '/v423/admin/coupons/create');
    // GET /v423/admin/coupons -- 이미 line 1224에 등록됨 (중복 제거)
    $register('POST',   '/v423/admin/coupon-rules');
    $register('GET',    '/v423/admin/coupon-rules');
    $register('POST',   '/v423/admin/coupons/batch-issue');
    $register('GET',    '/v423/user/my-coupons');
    $register('POST',   '/v423/user/redeem-coupon');

    // ── 메뉴 접근권한 저장/조회 (관리자 전용 — MenuAccessTab) ────────────
    $register('GET', '/auth/pricing/menu-access');
    $register('POST', '/auth/pricing/menu-access');

    // ── /api/* 경로 등록 (CRM, Email, Kakao, Pixel, Journey, CustomerAI 등) ─
    // CRM
    $register('GET',    '/crm/customers');
    $register('POST',   '/crm/customers');
    $register('GET',    '/crm/customers/{id}');
    $register('PUT',    '/crm/customers/{id}');
    $register('DELETE', '/crm/customers/{id}');
    $register('POST',   '/crm/activities');
    $register('GET',    '/crm/rfm');
    $register('GET',    '/crm/segments');
    $register('POST',   '/crm/segments');
    $register('DELETE', '/crm/segments/{id}');
    $register('POST',   '/crm/segments/{id}/refresh');
    $register('GET',    '/crm/stats');

    // 상품 카탈로그 writeback (192차)
    $register('POST',   '/catalog/writeback/{channel}/{sku}');
    $register('POST',   '/catalog/bulk-price');
    $register('GET',    '/catalog/listings');
    $register('GET',    '/catalog/price-history'); // 193차 Sprint4 #6
    // [현 차수] Writeback Console 실배선 ($custom 맵 + $register 동반 필수)
    $register('POST',   '/catalog/writeback/policy');
    $register('POST',   '/catalog/writeback/category');
    $register('POST',   '/catalog/writeback/preview');
    $register('GET',    '/catalog/writeback/jobs');
    $register('POST',   '/catalog/writeback/{channel}/{sku}/prepare');
    $register('POST',   '/catalog/approvals');
    // Email Marketing
    $register('GET',    '/email/settings');
    $register('PUT',    '/email/settings');
    $register('POST',   '/email/settings');
    $register('GET',    '/email/templates');
    $register('POST',   '/email/templates');
    $register('GET',    '/email/templates/{id}');
    $register('PUT',    '/email/templates/{id}');
    $register('DELETE', '/email/templates/{id}');
    $register('GET',    '/email/campaigns');
    $register('POST',   '/email/campaigns');
    $register('POST',   '/email/campaigns/{id}/send');
    $register('GET',    '/email/campaigns/{id}/stats');
    $register('POST',   '/email/track/open');
    // 183차 P0: email ab-test/ab-result/duplicate/analytics 죽은 매핑 제거(핸들러 미구현)
    // Kakao
    $register('GET',    '/kakao/settings');
    $register('PUT',    '/kakao/settings');
    $register('POST',   '/kakao/settings');
    $register('GET',    '/kakao/templates');
    $register('POST',   '/kakao/templates');
    $register('PUT',    '/kakao/templates/{id}');
    $register('DELETE', '/kakao/templates/{id}');
    $register('POST',   '/kakao/templates/{code}/test');
    $register('GET',    '/kakao/campaigns');
    $register('POST',   '/kakao/campaigns');
    $register('DELETE', '/kakao/campaigns/{id}');
    $register('POST',   '/kakao/campaigns/{id}/send');
    $register('GET',    '/kakao/campaigns/{id}/stats');
    // 183차 P0: kakao friendtalk/sms/analytics 죽은 매핑 제거(핸들러 미구현)
    // 1st-Party Pixel Tracking
    $register('POST',   '/pixel/collect');
    $register('GET',    '/pixel/configs');
    $register('POST',   '/pixel/configs');
    $register('DELETE', '/pixel/configs/{id}');
    $register('GET',    '/pixel/analytics');
    $register('GET',    '/pixel/snippet/{pixel_id}');
    // Journey Builder
    $register('GET',    '/journey/journeys');
    $register('POST',   '/journey/journeys');
    $register('PUT',    '/journey/journeys/{id}');
    $register('DELETE', '/journey/journeys/{id}');
    $register('POST',   '/journey/journeys/{id}/enroll');
    $register('POST',   '/journey/journeys/{id}/launch');
    $register('GET',    '/journey/journeys/{id}/stats');
    $register('GET',    '/journey/templates');
    // 수요예측 서버측 실모델 — 206차 #5
    $register('GET',    '/demand/summary');
    $register('GET',    '/demand/forecast');
    $register('GET',    '/demand/seasonality');
    $register('POST',   '/demand/auto-replenish');
    // 창고 관리(WMS) 영속화 — 205차
    $register('GET',    '/wms/warehouses');
    $register('POST',   '/wms/warehouses');
    $register('PUT',    '/wms/warehouses/{id}');
    $register('DELETE', '/wms/warehouses/{id}');
    $register('GET',    '/wms/carriers');
    $register('POST',   '/wms/carriers');
    $register('PUT',    '/wms/carriers/{id}');
    $register('DELETE', '/wms/carriers/{id}');
    $register('GET',    '/wms/permissions');
    $register('POST',   '/wms/permissions');
    $register('DELETE', '/wms/permissions/{id}');
    $register('GET',    '/wms/movements');
    $register('POST',   '/wms/movements');
    $register('GET',    '/wms/stock');
    $register('GET',    '/wms/picking');
    $register('POST',   '/wms/picking');
    $register('PUT',    '/wms/picking/{id}');
    $register('GET',    '/wms/supply-orders');
    $register('POST',   '/wms/supply-orders');
    $register('PUT',    '/wms/supply-orders/{id}');
    $register('GET',    '/wms/lots');
    $register('POST',   '/wms/lots');
    $register('DELETE', '/wms/lots/{id}');
    // 212차 #3: 매입처(suppliers) registry
    $register('GET',    '/wms/suppliers');
    $register('POST',   '/wms/suppliers');
    $register('PUT',    '/wms/suppliers/{id}');
    $register('DELETE', '/wms/suppliers/{id}');
    // 212차 #3-B: 파트너 서브계정 — 관리자 발급 + 파트너 포털
    $register('GET',    '/auth/partners');
    $register('POST',   '/auth/partners');
    $register('PUT',    '/auth/partners/{id}');
    $register('DELETE', '/auth/partners/{id}');
    $register('POST',   '/partner/login');
    $register('POST',   '/partner/logout');
    $register('GET',    '/partner/me');
    $register('GET',    '/partner/data');
    $register('POST',   '/partner/action');
    // 라이브 커머스(Live Commerce) — 208차
    $register('GET',    '/v425/live/sessions');
    $register('POST',   '/v425/live/sessions');
    $register('PUT',    '/v425/live/sessions/{id}');
    $register('DELETE', '/v425/live/sessions/{id}');
    $register('POST',   '/v425/live/sessions/{id}/go-live');
    $register('POST',   '/v425/live/sessions/{id}/end');
    $register('GET',    '/v425/live/sessions/{id}/products');
    $register('POST',   '/v425/live/sessions/{id}/products');
    $register('DELETE', '/v425/live/products/{id}');
    $register('POST',   '/v425/live/products/{id}/feature');
    $register('GET',    '/v425/live/sessions/{id}/orders');
    $register('POST',   '/v425/live/sessions/{id}/orders');
    $register('GET',    '/v425/live/sessions/{id}/chat');
    $register('POST',   '/v425/live/sessions/{id}/chat');
    $register('POST',   '/v425/live/sessions/{id}/heartbeat');
    $register('GET',    '/v425/live/sessions/{id}/stats');
    $register('GET',    '/v425/live/overview');
    $register('GET',    '/v425/live/integrations');
    $register('POST',   '/v425/live/integrations');
    $register('DELETE', '/v425/live/integrations/{channel}');
    $register('GET',    '/v425/live/stream');
    $register('GET',    '/v425/oauth/status');
    $register('GET',    '/v425/oauth/{provider}/authorize');
    $register('GET',    '/v425/oauth/{provider}/callback');
    $register('POST',   '/v425/admin/oauth/{provider}/config');
    $register('GET',    '/v425/live/sessions/{id}/destinations');
    $register('POST',   '/v425/live/sessions/{id}/destinations');
    $register('DELETE', '/v425/live/destinations/{id}');
    $register('POST',   '/v425/live/destinations/{id}/toggle');
    $register('POST',   '/v425/live/sessions/{id}/multicast/{action}');
    // Customer AI
    $register('GET',    '/customer-ai/churn-scores');
    $register('GET',    '/customer-ai/ltv-segments');
    $register('POST',   '/customer-ai/auto-action');
    $register('GET',    '/customer-ai/next-best-action');
    $register('GET',    '/customer-ai/model-performance');
    $register('GET',    '/customer-ai/product-recommendations');
    $register('GET',    '/customer-ai/integrated-summary');
    // Reports — 리포트 빌더 + 예약 발송 (193차 Sprint4)
    $register('GET',    '/reports/schedules');
    $register('POST',   '/reports/schedules');
    $register('PATCH',  '/reports/schedules/{id}');
    $register('DELETE', '/reports/schedules/{id}');
    $register('POST',   '/reports/run/{id}');
    $register('GET',    '/reports/preview');
    $register('GET',    '/reports/history');
    // WhatsApp
    $register('GET',    '/whatsapp/settings');
    $register('POST',   '/whatsapp/settings');
    $register('POST',   '/whatsapp/send');
    $register('POST',   '/whatsapp/broadcast');
    $register('GET',    '/whatsapp/templates');
    $register('GET',    '/whatsapp/messages');
    $register('POST',   '/whatsapp/webhooks');
    // SMS
    $register('GET',    '/sms/settings');
    $register('POST',   '/sms/settings');
    $register('POST',   '/sms/send');
    $register('POST',   '/sms/broadcast');
    $register('GET',    '/sms/messages');
    $register('GET',    '/sms/stats');
    $register('GET',    '/sms/templates');
    $register('POST',   '/sms/templates');
    $register('PUT',    '/sms/templates/{id}');
    $register('DELETE', '/sms/templates/{id}');
    $register('GET',    '/sms/campaigns');
    $register('POST',   '/sms/campaigns');
    $register('POST',   '/sms/campaigns/{id}/{action}');
    // GDPR (204차: /api 접두 제거 — basePath strip 정합)
    $register('POST',   '/gdpr/consent');
    $register('GET',    '/gdpr/consent');
    $register('DELETE', '/gdpr/consent');
    $register('GET',    '/gdpr/stats');
    // ML Model Monitor
    $register('GET',    '/api/models');
    $register('GET',    '/api/models/{id}/metrics');
    $register('POST',   '/api/models/{id}/retrain');
    $register('GET',    '/api/models/drift-report');
    $register('POST',   '/api/models/drift-check');
    // Instagram DM
    $register('GET',    '/instagram/settings');
    $register('POST',   '/instagram/settings');
    $register('GET',    '/instagram/conversations');
    $register('POST',   '/instagram/send');
    $register('POST',   '/instagram/broadcast'); // [현차수] DM 단체발송 실배선
    $register('GET',    '/instagram/stats');
    $register('POST',   '/instagram/webhooks');
    // ── LINE (191차 신설) ──
    $register('GET',    '/line/settings');
    $register('POST',   '/line/settings');
    $register('GET',    '/line/templates');
    $register('POST',   '/line/templates');
    $register('DELETE', '/line/templates/{id}');
    $register('GET',    '/line/campaigns');
    $register('POST',   '/line/campaigns');
    $register('POST',   '/line/campaigns/{id}/send');
    $register('DELETE', '/line/campaigns/{id}');
    $register('GET',    '/line/stats');
    $register('POST',   '/line/webhooks');
    // AI Generate
    $register('GET',    '/api/ai/settings');
    $register('POST',   '/api/ai/settings');
    $register('POST',   '/api/ai/generate/email');
    $register('POST',   '/api/ai/generate/segment');
    $register('POST',   '/api/ai/generate/ad-copy');
    // Channel Sync
    $register('GET',    '/api/channel-sync/status');
    $register('POST',   '/api/channel-sync/credentials');
    $register('DELETE', '/api/channel-sync/credentials/{id}');
    $register('POST',   '/api/channel-sync/{channel}/test');
    $register('POST',   '/api/channel-sync/{channel}/sync');
    $register('GET',    '/api/channel-sync/products');
    $register('GET',    '/api/channel-sync/orders');
    $register('GET',    '/api/channel-sync/inventory');
    $register('POST',   '/api/channel-sync/webhooks/{channel}');
    // 202차 항목2c: no-/api 변형(basePath strip 환경)
    $register('GET',    '/channel-sync/status');
    $register('POST',   '/channel-sync/credentials');
    $register('DELETE', '/channel-sync/credentials/{id}');
    $register('POST',   '/channel-sync/{channel}/test');
    $register('POST',   '/channel-sync/{channel}/sync');
    $register('GET',    '/channel-sync/products');
    $register('GET',    '/channel-sync/orders');
    $register('GET',    '/channel-sync/inventory');
    $register('POST',   '/channel-sync/webhooks/{channel}');
    // [현 차수] 통합 채널 레지스트리
    $register('GET',    '/v426/channels');        $register('GET',    '/api/v426/channels');
    $register('GET',    '/v426/admin/channels');  $register('GET',    '/api/v426/admin/channels');
    $register('POST',   '/v426/admin/channels');  $register('POST',   '/api/v426/admin/channels');
    $register('DELETE', '/v426/admin/channels/{key}'); $register('DELETE', '/api/v426/admin/channels/{key}');
    // [현 차수] v427 Logistics 배송추적
    $register('GET',    '/v427/logistics/carriers');   $register('GET',    '/api/v427/logistics/carriers');
    $register('GET',    '/v427/logistics/shipments');  $register('GET',    '/api/v427/logistics/shipments');
    $register('POST',   '/v427/logistics/track');      $register('POST',   '/api/v427/logistics/track');
    $register('POST',   '/v427/logistics/refresh');    $register('POST',   '/api/v427/logistics/refresh');
    $register('DELETE', '/v427/logistics/shipments/{id}'); $register('DELETE', '/api/v427/logistics/shipments/{id}');
    // [현 차수] v427 PG 정산
    $register('GET',    '/v427/pg/providers');    $register('GET',    '/api/v427/pg/providers');
    $register('GET',    '/v427/pg/settlements');  $register('GET',    '/api/v427/pg/settlements');
    $register('POST',   '/v427/pg/sync');         $register('POST',   '/api/v427/pg/sync');
    $register('GET',    '/api/performance', ['Genie\\Controllers\\PerformanceController', 'getMetrics']);
    $register('POST', '/v422/ai/analyze');
    $register('GET', '/v422/ai/analyses');
    $register('POST', '/v422/ai/marketing-eval');
    $register('POST', '/v422/ai/influencer-eval');
    $register('POST', '/v422/ai/channel-kpi-eval');
    $register('POST', '/v422/ai/campaign-recommend');
    $register('POST',   '/api/performance', ['Genie\\Controllers\\PerformanceController', 'ingestMetrics']);
    $register('GET',    '/api/performance/recommendations', ['Genie\\Controllers\\PerformanceController', 'getRecommendations']);
    // 175차 S3.3 — Meta 광고
    $register('GET',    '/performance/meta-ads');
    $register('GET',    '/api/performance/meta-ads');

    // ── V424 Creative Store ──
    $register('GET', '/api/creatives');
    $register('GET', '/api/creatives/{id}');
    $register('POST', '/api/creatives');
    $register('PUT', '/api/creatives/{id}');
    $register('DELETE', '/api/creatives/{id}');
    $register('POST', '/api/creatives/check-duplicate');

    // V424 Creative Store — non-prefixed
    $register('GET', '/creatives');
    $register('GET', '/creatives/{id}');
    $register('POST', '/creatives');
    $register('PUT', '/creatives/{id}');
    $register('DELETE', '/creatives/{id}');
    $register('POST', '/creatives/check-duplicate');

    // ── V424 OrderHub Aggregator (165차 deploy + 167차 register 매핑 보강) ──
    $register('GET', '/v424/orderhub/orders');
    $register('GET', '/v424/orderhub/claims');
    $register('GET', '/v424/orderhub/settlements');
    $register('GET', '/api/v424/orderhub/orders');
    $register('GET', '/api/v424/orderhub/claims');
    $register('GET', '/api/v424/orderhub/settlements');
    // 206차 #3: OrderHub writer (claims/settlements ingest + rollup)
    $register('POST', '/v424/orderhub/claims');
    $register('POST', '/v424/orderhub/settlements');
    $register('POST', '/v424/orderhub/settlements/rollup');
    $register('POST', '/api/v424/orderhub/claims');
    $register('POST', '/api/v424/orderhub/settlements');
    $register('POST', '/api/v424/orderhub/settlements/rollup');

    // ── V424 enterprise health (167차 5순위) ──
    $register('GET', '/v424/health');
    $register('GET', '/api/v424/health');

    // ── V424 system metrics (176차 — DashSystem 시스템 서브탭 실측) ──
    $register('GET', '/v424/system/metrics');
    $register('GET', '/api/v424/system/metrics');

    // ── V424 attribution/marketing 실 API (176차 PM7) ──
    $register('GET', '/v424/attribution/touches');
    $register('GET', '/api/v424/attribution/touches');
    $register('GET', '/v424/attribution/journeys');
    $register('GET', '/api/v424/attribution/journeys');
    $register('GET', '/v424/attribution/time-series');
    $register('GET', '/api/v424/attribution/time-series');
    $register('GET', '/v424/attribution/channels');
    $register('GET', '/api/v424/attribution/channels');
    $register('GET', '/v424/marketing/daily-trends');
    $register('GET', '/api/v424/marketing/daily-trends');
    // 203차 — 서버측 멀티터치 어트리뷰션(MTA) 엔진 ($custom 등록 + $register 필수)
    $register('GET', '/v424/attribution/models');
    $register('GET', '/api/v424/attribution/models');
    // 201차 — 마케팅 자동화 추천/벤치마크 ($custom 등록 + $register 필수)
    $register('POST', '/v424/marketing/auto-recommend');
    $register('POST', '/api/v424/marketing/auto-recommend');
    $register('GET', '/v424/marketing/benchmarks');
    $register('GET', '/api/v424/marketing/benchmarks');
    $register('PUT', '/v424/marketing/benchmarks');
    $register('PUT', '/api/v424/marketing/benchmarks');

    // ── V424 admin plans (169차 사용자 발견 issue) ──
    $register('GET',    '/v424/admin/plans');
    $register('PUT',    '/v424/admin/plans/{id}');
    $register('DELETE', '/v424/admin/plans/{id}');
    $register('GET',    '/v424/admin/plans-menu-access');
    $register('PUT',    '/v424/admin/plans/{id}/menu-access');
    // 171차 — 4-tier 기간별 구독 가격
    $register('GET',    '/v424/admin/plans-period-pricing');
    $register('PUT',    '/v424/admin/plans/{id}/period-pricing');
    $register('GET',    '/api/v424/admin/plans-period-pricing');
    $register('PUT',    '/api/v424/admin/plans/{id}/period-pricing');
    // 172차 P0-C — coupon redeem (user)
    $register('POST',   '/auth/coupon/redeem');
    $register('GET',    '/auth/coupon/preview');
    $register('POST',   '/api/auth/coupon/redeem');
    $register('GET',    '/api/auth/coupon/preview');
    // 172차 P0-C — coupon admin
    $register('GET',    '/v424/admin/coupons/overview');
    $register('PUT',    '/v424/admin/coupons/rules/{name}');
    $register('POST',   '/v424/admin/coupons/issue');
    $register('GET',    '/v424/admin/coupons/list');
    $register('POST',   '/v424/admin/coupons/{code}/revoke');
    $register('GET',    '/api/v424/admin/coupons/overview');
    $register('PUT',    '/api/v424/admin/coupons/rules/{name}');
    $register('POST',   '/api/v424/admin/coupons/issue');
    $register('GET',    '/api/v424/admin/coupons/list');
    $register('POST',   '/api/v424/admin/coupons/{code}/revoke');
    // 172차 Task #22 — menu pricing sync
    $register('GET',    '/v424/admin/menu-pricing-sync');
    $register('PUT',    '/v424/admin/menu-value-score');
    $register('PUT',    '/v424/admin/plans/{id}/apply-recommended');
    $register('GET',    '/api/v424/admin/menu-pricing-sync');
    $register('PUT',    '/api/v424/admin/menu-value-score');
    $register('PUT',    '/api/v424/admin/plans/{id}/apply-recommended');
    $register('GET',    '/v424/admin/paddle/stats');
    $register('GET',    '/api/v424/admin/paddle/stats');
    $register('GET',    '/v424/admin/db/stats');
    $register('GET',    '/api/v424/admin/db/stats');
    $register('GET',    '/api/v424/admin/plans');
    $register('PUT',    '/api/v424/admin/plans/{id}');
    $register('DELETE', '/api/v424/admin/plans/{id}');
    $register('GET',    '/api/v424/admin/plans-menu-access');
    $register('PUT',    '/api/v424/admin/plans/{id}/menu-access');

    // ── V425 PM-Core (168차 N-152-F Task/Milestone/Gantt) ──
    $register('GET',    '/v425/pm/projects');
    $register('POST',   '/v425/pm/projects');
    $register('GET',    '/v425/pm/projects/{id}');
    $register('PATCH',  '/v425/pm/projects/{id}');
    $register('DELETE', '/v425/pm/projects/{id}');
    $register('GET',    '/v425/pm/projects/{id}/tasks');
    $register('GET',    '/v425/pm/projects/{id}/gantt');
    $register('GET',    '/v425/pm/projects/{id}/kpi');
    $register('POST',   '/v425/pm/tasks');
    $register('GET',    '/v425/pm/tasks/{id}');
    $register('PATCH',  '/v425/pm/tasks/{id}');
    $register('DELETE', '/v425/pm/tasks/{id}');
    $register('POST',   '/v425/pm/tasks/{id}/assignees');
    $register('DELETE', '/v425/pm/tasks/{id}/assignees/{userId}');
    $register('POST',   '/v425/pm/tasks/{id}/comments');
    $register('GET',    '/v425/pm/tasks/{id}/comments');
    $register('POST',   '/v425/pm/dependencies');
    $register('DELETE', '/v425/pm/dependencies/{id}');
    $register('GET',    '/v425/pm/milestones');
    $register('POST',   '/v425/pm/milestones');
    $register('PATCH',  '/v425/pm/milestones/{id}');
    $register('DELETE', '/v425/pm/milestones/{id}');
    $register('POST',   '/v425/pm/attachments/sign');
    $register('POST',   '/v425/pm/attachments');
    $register('GET',    '/v425/pm/events/stream');
    $register('GET',    '/v425/pm/audit');
    $register('GET',    '/api/v425/pm/projects');
    $register('POST',   '/api/v425/pm/projects');
    $register('GET',    '/api/v425/pm/projects/{id}');
    $register('PATCH',  '/api/v425/pm/projects/{id}');
    $register('DELETE', '/api/v425/pm/projects/{id}');
    $register('GET',    '/api/v425/pm/projects/{id}/tasks');
    $register('GET',    '/api/v425/pm/projects/{id}/gantt');
    $register('GET',    '/api/v425/pm/projects/{id}/kpi');
    $register('POST',   '/api/v425/pm/tasks');
    $register('GET',    '/api/v425/pm/tasks/{id}');
    $register('PATCH',  '/api/v425/pm/tasks/{id}');
    $register('DELETE', '/api/v425/pm/tasks/{id}');
    $register('POST',   '/api/v425/pm/tasks/{id}/assignees');
    $register('DELETE', '/api/v425/pm/tasks/{id}/assignees/{userId}');
    $register('POST',   '/api/v425/pm/tasks/{id}/comments');
    $register('GET',    '/api/v425/pm/tasks/{id}/comments');
    $register('POST',   '/api/v425/pm/dependencies');
    $register('DELETE', '/api/v425/pm/dependencies/{id}');
    $register('GET',    '/api/v425/pm/milestones');
    $register('POST',   '/api/v425/pm/milestones');
    $register('PATCH',  '/api/v425/pm/milestones/{id}');
    $register('DELETE', '/api/v425/pm/milestones/{id}');
    $register('POST',   '/api/v425/pm/attachments/sign');
    $register('POST',   '/api/v425/pm/attachments');
    $register('GET',    '/api/v425/pm/events/stream');
    $register('GET',    '/api/v425/pm/audit');

    // ── V425 Admin/User 메뉴 가시성 (168차 N-152-F F2/F3 = T3) ──
    $register('GET',   '/v425/admin/menu-tree');
    $register('GET',   '/v425/menu-tree');
    $register('PATCH', '/v425/admin/menu-tree/{menu_id:.+}');
    $register('POST',  '/v425/admin/menu-tree/reorder');
    $register('POST',  '/v425/admin/menu-tree/reset');
    $register('GET',   '/v425/admin/menu-tree/audit-log');
    $register('GET',   '/api/v425/admin/menu-tree');
    $register('GET',   '/api/v425/menu-tree');
    $register('PATCH', '/api/v425/admin/menu-tree/{menu_id:.+}');
    $register('POST',  '/api/v425/admin/menu-tree/reorder');
    $register('POST',  '/api/v425/admin/menu-tree/reset');
    $register('GET',   '/api/v425/admin/menu-tree/audit-log');

    // ── 167차 routes audit 일괄 정합 보강 ($custom 정의되었으나 $register 미호출 78건) ──
    // backend/bin/audit_routes.php 로 재검출 가능. v410/v418*/v420 광범위.
    // v410 Alerting action_requests
    $register('POST', '/v410/action_requests/{id}/decide');
    $register('POST', '/v410/action_requests/{id}/execute');
    // v418 / v418.1 Insights + Decisioning ingest
    $register('POST', '/v418/insights/audience-breakdowns');
    $register('POST', '/v418/insights/influencer-audience');
    $register('POST', '/v418/insights/commerce-aggregates');
    $register('POST', '/v418/insights/creative-sku-map');
    $register('GET',  '/v418/insights/target-performance');
    $register('POST', '/v4181/ingest/ad-insights');
    $register('POST', '/v4181/ingest/influencer-insights');
    $register('POST', '/v4181/ingest/commerce-agg');
    $register('GET',  '/v4181/decisioning/segments');
    $register('GET',  '/v4181/decisioning/recommendations');
    $register('GET',  '/v4181/decisioning/segment/{gender}/{age}/{region}/affinity');
    $register('POST', '/v4181/insights/audience-breakdowns');
    $register('POST', '/v4181/insights/influencer-audience');
    $register('POST', '/v4181/insights/commerce-aggregates');
    $register('POST', '/v4181/insights/creative-sku-map');
    $register('GET',  '/v4181/insights/target-performance');
    // v418.2 / v418.3 Insights + Decisioning ingest
    $register('POST', '/v4182/ingest/ad-insights');
    $register('POST', '/v4182/ingest/influencer-insights');
    $register('POST', '/v4182/ingest/commerce-agg');
    $register('GET',  '/v4182/decisioning/segments');
    $register('GET',  '/v4182/decisioning/recommendations');
    $register('GET',  '/v4182/decisioning/segment/{gender}/{age}/{region}/affinity');
    $register('POST', '/v4182/insights/audience-breakdowns');
    $register('POST', '/v4182/insights/influencer-audience');
    $register('POST', '/v4182/insights/commerce-aggregates');
    $register('POST', '/v4182/insights/creative-sku-map');
    $register('GET',  '/v4182/insights/target-performance');
    $register('POST', '/v4183/ingest/ad-insights');
    $register('POST', '/v4183/ingest/influencer-insights');
    $register('POST', '/v4183/ingest/commerce-agg');
    $register('GET',  '/v4183/decisioning/segments');
    $register('GET',  '/v4183/decisioning/recommendations');
    $register('GET',  '/v4183/decisioning/segment/{gender}/{age}/{region}/affinity');
    $register('POST', '/v4183/insights/audience-breakdowns');
    $register('POST', '/v4183/insights/influencer-audience');
    $register('POST', '/v4183/insights/commerce-aggregates');
    $register('POST', '/v4183/insights/creative-sku-map');
    $register('GET',  '/v4183/insights/target-performance');
    // v420 PriceOpt
    $register('PUT',    '/v420/price/products/{sku}');
    $register('DELETE', '/v420/price/products/{sku}');
    $register('POST',   '/v420/price/elasticity/bulk');
    $register('POST',   '/v420/price/optimize/batch');
    $register('GET',    '/v420/price/competitor');
    $register('POST',   '/v420/price/competitor');
    $register('GET',    '/v420/price/repricer/rules');
    $register('POST',   '/v420/price/repricer/rules');
    $register('GET',    '/v420/price/repricer/history');
    $register('POST',   '/v420/price/repricer/rules/{id}/toggle');
    $register('GET',    '/v420/price/calendar');
    $register('POST',   '/v420/price/calendar');
    $register('DELETE', '/v420/price/calendar/{id}');
    // v420 SupplyChain
    $register('GET',    '/v420/supply/lines');
    $register('POST',   '/v420/supply/lines');
    $register('PUT',    '/v420/supply/lines/{id}');
    $register('DELETE', '/v420/supply/lines/{id}');
    $register('POST',   '/v420/supply/lines/{id}/stage');
    $register('GET',    '/v420/supply/suppliers');
    $register('POST',   '/v420/supply/suppliers');
    $register('PUT',    '/v420/supply/suppliers/{id}');
    $register('DELETE', '/v420/supply/suppliers/{id}');
    $register('GET',    '/v420/supply/risk-rules');
    $register('POST',   '/v420/supply/risk-rules');
    $register('POST',   '/v420/supply/risk-rules/{id}/toggle');
    $register('GET',    '/v420/supply/summary');
    // v420 ReturnsPortal
    $register('GET',    '/v420/returns/list');
    $register('POST',   '/v420/returns');
    $register('POST',   '/v420/returns/{id}/status');
    $register('POST',   '/v420/returns/{id}/wms-link');
    $register('DELETE', '/v420/returns/{id}');
    $register('GET',    '/v420/returns/summary');
    $register('GET',    '/v420/returns/settings');
    $register('POST',   '/v420/returns/settings');
    $register('POST',   '/v420/returns/automation/toggle');
    // auth license (UserAuth)
    $register('POST',   '/auth/license');
    $register('GET',    '/auth/license/list');
    // api/v1 (AdPerformance)
    $register('GET',    '/api/v1/ad-performance/summary');

    };
