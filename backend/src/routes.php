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
        'GET /v382/connectors' => 'Genie\\Handlers\\V382::listConnectors',
        'POST /v382/connectors/{connector}/configure' => 'Genie\\Handlers\\V382::configureConnector',
        'POST /v382/connectors/{provider}/fetch' => 'Genie\\Handlers\\V382::fetchFromConnector',
        'GET /v382/writeback/jobs' => 'Genie\\Handlers\\V382::listWritebackJobs',
        'POST /v382/writeback/{channel}/{sku}/prepare' => 'Genie\\Handlers\\V382::writebackPrepare',
        'POST /v382/writeback/{channel}/{sku}/execute' => 'Genie\\Handlers\\V382::writebackExecute',
        'POST /v382/approvals' => 'Genie\\Handlers\\V382::approvalsCreate',
        'POST /v382/approvals/{approval_id}/decide' => 'Genie\\Handlers\\V382::approvalsDecide',
        'GET /v382/settlements' => 'Genie\\Handlers\\V382::listSettlements',
        'POST /v382/settlements/import' => 'Genie\\Handlers\\V382::importSettlement',
        'GET /v382/audit' => 'Genie\\Handlers\\V382::listAudit',

        // v386 connectors (Shopify/Meta/TikTok) + quickstart sync
        'GET /v386/shopify/products' => 'Genie\\Handlers\\V386::shopifyProducts',
        'GET /v386/shopify/orders' => 'Genie\\Handlers\\V386::shopifyOrders',
        'GET /v386/meta/insights' => 'Genie\\Handlers\\V386::metaInsights',
        'GET /v386/tiktok/report' => 'Genie\\Handlers\\V386::tiktokReport',
        'POST /v386/sync/quickstart' => 'Genie\\Handlers\\V386::quickstartSync',

        // v422 AI 마케팅 추천 (전체 카테고리 지원)
        'POST /v422/ai/campaign-search'      => 'Genie\\Handlers\\ClaudeAI::campaignSearch',
        'POST /v422/ai/campaign-ad-creative' => 'Genie\\Handlers\\ClaudeAI::campaignAdCreative',

        // ── CRM (고객관계관리) ──────────────────────────────────────────
        'GET /api/crm/customers'                   => 'Genie\\Handlers\\CRM::listCustomers',
        'POST /api/crm/customers'                  => 'Genie\\Handlers\\CRM::createCustomer',
        'GET /api/crm/customers/{id}'              => 'Genie\\Handlers\\CRM::getCustomer',
        'PUT /api/crm/customers/{id}'              => 'Genie\\Handlers\\CRM::updateCustomer',
        'POST /api/crm/activities'                 => 'Genie\\Handlers\\CRM::addActivity',
        'GET /api/crm/rfm'                         => 'Genie\\Handlers\\CRM::rfmAnalysis',
        'GET /api/crm/segments'                    => 'Genie\\Handlers\\CRM::listSegments',
        'POST /api/crm/segments'                   => 'Genie\\Handlers\\CRM::createSegment',
        'POST /api/crm/segments/{id}/refresh'      => 'Genie\\Handlers\\CRM::refreshSegment',
        'GET /api/crm/stats'                       => 'Genie\\Handlers\\CRM::stats',

        // ── 이메일 마케팅 ────────────────────────────────────────────────
        'GET /api/email/settings'                  => 'Genie\\Handlers\\EmailMarketing::getSettings',
        'PUT /api/email/settings'                  => 'Genie\\Handlers\\EmailMarketing::saveSettings',
        'POST /api/email/settings'                 => 'Genie\\Handlers\\EmailMarketing::saveSettings',
        'GET /api/email/templates'                 => 'Genie\\Handlers\\EmailMarketing::listTemplates',
        'POST /api/email/templates'                => 'Genie\\Handlers\\EmailMarketing::createTemplate',
        'GET /api/email/templates/{id}'            => 'Genie\\Handlers\\EmailMarketing::getTemplate',
        'PUT /api/email/templates/{id}'            => 'Genie\\Handlers\\EmailMarketing::updateTemplate',
        'DELETE /api/email/templates/{id}'         => 'Genie\\Handlers\\EmailMarketing::deleteTemplate',
        'GET /api/email/campaigns'                 => 'Genie\\Handlers\\EmailMarketing::listCampaigns',
        'POST /api/email/campaigns'                => 'Genie\\Handlers\\EmailMarketing::createCampaign',
        'POST /api/email/campaigns/{id}/send'      => 'Genie\\Handlers\\EmailMarketing::sendCampaign',
        'GET /api/email/campaigns/{id}/stats'      => 'Genie\\Handlers\\EmailMarketing::campaignStats',
        'POST /api/email/track/open'               => 'Genie\\Handlers\\EmailMarketing::trackOpen',

        // ── 카카오 채널 (알림톡) ─────────────────────────────────────────
        'GET /api/kakao/settings'                  => 'Genie\\Handlers\\KakaoChannel::getSettings',
        'PUT /api/kakao/settings'                  => 'Genie\\Handlers\\KakaoChannel::saveSettings',
        'POST /api/kakao/settings'                 => 'Genie\\Handlers\\KakaoChannel::saveSettings',
        'GET /api/kakao/templates'                 => 'Genie\\Handlers\\KakaoChannel::listTemplates',
        'POST /api/kakao/templates'                => 'Genie\\Handlers\\KakaoChannel::createTemplate',
        'PUT /api/kakao/templates/{id}'            => 'Genie\\Handlers\\KakaoChannel::updateTemplate',
        'DELETE /api/kakao/templates/{id}'         => 'Genie\\Handlers\\KakaoChannel::deleteTemplate',
        'POST /api/kakao/templates/{code}/test'    => 'Genie\\Handlers\\KakaoChannel::testSend',
        'GET /api/kakao/campaigns'                 => 'Genie\\Handlers\\KakaoChannel::listCampaigns',
        'POST /api/kakao/campaigns'                => 'Genie\\Handlers\\KakaoChannel::createCampaign',
        'POST /api/kakao/campaigns/{id}/send'      => 'Genie\\Handlers\\KakaoChannel::sendCampaign',
        'GET /api/kakao/campaigns/{id}/stats'      => 'Genie\\Handlers\\KakaoChannel::campaignStats',

        // ── 1st-Party Pixel Tracking ───────────────────────────────────────
        'POST /api/pixel/collect'                  => 'Genie\\Handlers\\PixelTracking::collect',
        'GET /api/pixel/configs'                   => 'Genie\\Handlers\\PixelTracking::listConfigs',
        'POST /api/pixel/configs'                  => 'Genie\\Handlers\\PixelTracking::createConfig',
        'DELETE /api/pixel/configs/{id}'           => 'Genie\\Handlers\\PixelTracking::deleteConfig',
        'GET /api/pixel/analytics'                 => 'Genie\\Handlers\\PixelTracking::analytics',
        'GET /api/pixel/snippet/{pixel_id}'        => 'Genie\\Handlers\\PixelTracking::getSnippet',

        // ── 고객 여정 빌더 ────────────────────────────────────────────────
        'GET /api/journey/journeys'                => 'Genie\\Handlers\\JourneyBuilder::listJourneys',
        'POST /api/journey/journeys'               => 'Genie\\Handlers\\JourneyBuilder::createJourney',
        'PUT /api/journey/journeys/{id}'           => 'Genie\\Handlers\\JourneyBuilder::updateJourney',
        'DELETE /api/journey/journeys/{id}'        => 'Genie\\Handlers\\JourneyBuilder::deleteJourney',
        'POST /api/journey/journeys/{id}/enroll'   => 'Genie\\Handlers\\JourneyBuilder::enrollCustomer',
        'POST /api/journey/journeys/{id}/launch'   => 'Genie\\Handlers\\JourneyBuilder::launchJourney',
        'GET /api/journey/journeys/{id}/stats'     => 'Genie\\Handlers\\JourneyBuilder::journeyStats',
        'GET /api/journey/templates'               => 'Genie\\Handlers\\JourneyBuilder::listTemplates',

        // ── Customer AI (이탈 예측 + LTV + 구매확률 + 상품추천 + 모델성능) ────
        'GET /api/customer-ai/churn-scores'        => 'Genie\\Handlers\\CustomerAI::churnScores',
        'GET /api/customer-ai/ltv-segments'        => 'Genie\\Handlers\\CustomerAI::ltvSegments',
        'POST /api/customer-ai/auto-action'        => 'Genie\\Handlers\\CustomerAI::autoAction',
        'GET /api/customer-ai/next-best-action'    => 'Genie\\Handlers\\CustomerAI::nextBestAction',
        'GET /api/customer-ai/model-performance'   => 'Genie\\Handlers\\CustomerAI::modelPerformance',
        'GET /api/customer-ai/product-recommendations' => 'Genie\\Handlers\\CustomerAI::productRecommendations',
        'GET /api/customer-ai/integrated-summary'  => 'Genie\\Handlers\\CustomerAI::integratedSummary',


        // ── 이메일 마케팅 확장 (A/B 테스트) ─────────────────────────────
        'POST /api/email/campaigns/{id}/ab-test'   => 'Genie\\Handlers\\EmailMarketing::createAbTest',
        'GET /api/email/campaigns/{id}/ab-result'  => 'Genie\\Handlers\\EmailMarketing::abTestResult',
        'POST /api/email/campaigns/{id}/duplicate' => 'Genie\\Handlers\\EmailMarketing::duplicateCampaign',
        'GET /api/email/analytics'                 => 'Genie\\Handlers\\EmailMarketing::analytics',

        // ── 카카오 채널 확장 (친구톡 + SMS) ─────────────────────────────
        'POST /api/kakao/friendtalk'               => 'Genie\\Handlers\\KakaoChannel::sendFriendtalk',
        'POST /api/kakao/sms'                      => 'Genie\\Handlers\\KakaoChannel::sendSms',
        'GET /api/kakao/analytics'                 => 'Genie\\Handlers\\KakaoChannel::analytics',

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
        'POST /v418/events/ingest' => 'Genie\\Handlers\\V418::ingest',
        'POST /v418/events/normalize' => 'Genie\\Handlers\\V418::normalize',
        'POST /v418/rollups/compute' => 'Genie\\Handlers\\V418::rollupsCompute',
        'POST /v418/rollups/persist' => 'Genie\\Handlers\\V418::rollupsPersist',
        'GET /v418/ai/policies/suggest' => 'Genie\\Handlers\\V418::aiSuggestPolicies',
        // v418.1 - aggregated decisioning (ads + influencer + commerce; no PII)
        'POST /v4181/ingest/ad-insights' => 'Genie\\Handlers\\Decisioning::ingestAdInsights',
        'POST /v4181/ingest/influencer-insights' => 'Genie\\Handlers\\Decisioning::ingestInfluencerInsights',
        'POST /v4181/ingest/commerce-agg' => 'Genie\\Handlers\\Decisioning::ingestCommerceAgg',
        'GET /v4181/decisioning/segments' => 'Genie\\Handlers\\Decisioning::segments',
        'GET /v4181/decisioning/recommendations' => 'Genie\\Handlers\\Decisioning::recommendations',
        'GET /v4181/decisioning/segment/{gender}/{age}/{region}/affinity' => 'Genie\\Handlers\\Decisioning::segmentAffinity',

        // ── WhatsApp Business API ──────────────────────────────────────────
        'GET /api/whatsapp/settings'              => 'Genie\\Handlers\\WhatsApp::getSettings',
        'POST /api/whatsapp/settings'             => 'Genie\\Handlers\\WhatsApp::saveSettings',
        'POST /api/whatsapp/send'                 => 'Genie\\Handlers\\WhatsApp::send',
        'POST /api/whatsapp/broadcast'            => 'Genie\\Handlers\\WhatsApp::broadcast',
        'GET /api/whatsapp/templates'             => 'Genie\\Handlers\\WhatsApp::templates',
        'GET /api/whatsapp/messages'              => 'Genie\\Handlers\\WhatsApp::messages',
        'POST /api/whatsapp/webhooks'             => 'Genie\\Handlers\\WhatsApp::webhook',

        // ── SMS Marketing (NHN Cloud bizMessage) ──────────────────────────
        'GET /api/sms/settings'                   => 'Genie\\Handlers\\SmsMarketing::getSettings',
        'POST /api/sms/settings'                  => 'Genie\\Handlers\\SmsMarketing::saveSettings',
        'POST /api/sms/send'                      => 'Genie\\Handlers\\SmsMarketing::send',
        'POST /api/sms/broadcast'                 => 'Genie\\Handlers\\SmsMarketing::broadcast',
        'GET /api/sms/messages'                   => 'Genie\\Handlers\\SmsMarketing::messages',
        'GET /api/sms/stats'                      => 'Genie\\Handlers\\SmsMarketing::stats',

        // ── GDPR / 개인정보 동의 관리 ─────────────────────────────────────
        'POST /api/gdpr/consent'                  => 'Genie\\Handlers\\GdprConsent::save',
        'GET /api/gdpr/consent'                   => 'Genie\\Handlers\\GdprConsent::get',
        'DELETE /api/gdpr/consent'                => 'Genie\\Handlers\\GdprConsent::withdraw',
        'GET /api/gdpr/stats'                     => 'Genie\\Handlers\\GdprConsent::stats',

        // ── ML 모델 모니터 (드리프트 감지 + 자동 재학습) ─────────────────
        'GET /api/models'                         => 'Genie\\Handlers\\ModelMonitor::listModels',
        'GET /api/models/{id}/metrics'            => 'Genie\\Handlers\\ModelMonitor::modelMetrics',
        'POST /api/models/{id}/retrain'           => 'Genie\\Handlers\\ModelMonitor::retrain',
        'GET /api/models/drift-report'            => 'Genie\\Handlers\\ModelMonitor::driftReport',
        'POST /api/models/drift-check'            => 'Genie\\Handlers\\ModelMonitor::driftCheck',

        // ── Instagram / Facebook DM (Meta Messaging API) ──────────────────
        'GET /api/instagram/settings'             => 'Genie\\Handlers\\InstagramDM::getSettings',
        'POST /api/instagram/settings'            => 'Genie\\Handlers\\InstagramDM::saveSettings',
        'GET /api/instagram/conversations'        => 'Genie\\Handlers\\InstagramDM::conversations',
        'POST /api/instagram/send'                => 'Genie\\Handlers\\InstagramDM::send',
        'GET /api/instagram/stats'                => 'Genie\\Handlers\\InstagramDM::stats',
        'POST /api/instagram/webhooks'            => 'Genie\\Handlers\\InstagramDM::webhook',

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

        // ── Auth — 회원가입 / 로그인 / 플랜 ──────────────────────────────────
        'POST /auth/register' => 'Genie\\Handlers\\UserAuth::register',
        'POST /auth/login'    => 'Genie\\Handlers\\UserAuth::login',
        'GET /auth/me'        => 'Genie\\Handlers\\UserAuth::me',
        'POST /auth/logout'   => 'Genie\\Handlers\\UserAuth::logout',
        'POST /auth/upgrade'  => 'Genie\\Handlers\\UserAuth::upgrade',
        'GET /auth/subscription'      => 'Genie\\Handlers\\UserAuth::subscription',

        'GET /auth/plan-check'     => 'Genie\\Handlers\\UserAuth::planCheck',    // 현재 플랜 확인
        'POST /auth/license'       => 'Genie\\Handlers\\UserAuth::activateLicense', // 라이선스 키 활성화
        'GET /auth/license/list'   => 'Genie\\Handlers\\UserAuth::listLicenseKeys', // 라이선스 목록 (admin)

        // ── Payment (Toss PG) ──────────────────────────────────────────────
        'GET /auth/payment/config'    => 'Genie\\Handlers\\Payment::config',
        'GET /auth/payment/plans'     => 'Genie\\Handlers\\Payment::plans',
        'POST /auth/payment/confirm'  => 'Genie\\Handlers\\Payment::confirm',
        'POST /auth/payment/cancel'   => 'Genie\\Handlers\\Payment::cancel',
        'POST /payment/webhook/toss'  => 'Genie\\Handlers\\Payment::tossWebhook',

        // ── PG Config Admin ──────────────────────────────────────────────
        'GET /auth/pg/config'             => 'Genie\\Handlers\\Payment::getPgConfig',
        'POST /auth/pg/config'            => 'Genie\\Handlers\\Payment::savePgConfig',
        'DELETE /auth/pg/config/{provider}' => 'Genie\\Handlers\\Payment::deletePgConfig',

        // ── Pricing Config Admin ──────────────────────────────────────────
        'GET /auth/pricing/config'   => 'Genie\\Handlers\\Payment::getPricingConfig',
        'POST /auth/pricing/config'  => 'Genie\\Handlers\\Payment::savePricingConfig',

        // ── Menu-based Tier Pricing ───────────────────────────────────────
        'GET /auth/pricing/plans'              => 'Genie\\Handlers\\Payment::getMenuPricingPlans',
        'POST /auth/pricing/plans'             => 'Genie\\Handlers\\Payment::saveMenuPricingPlans',
        'DELETE /auth/pricing/plans/{id}'      => 'Genie\\Handlers\\Payment::deleteMenuPricingPlan',
        'POST /auth/pricing/paddle-sync'       => 'Genie\\Handlers\\Payment::paddleSyncAll',

        // ── 공개 구독요금 조회 (인증 불요 — 가입 화면용) ───────────────────
        'GET /auth/pricing/public-plans'       => 'Genie\\Handlers\\Payment::getPublicPricingPlans',

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

        // ── v423 Real Channel API Connectors (Meta / Google / Naver / Coupang) ─
        'GET /v423/connectors/meta/insights'    => 'Genie\\Handlers\\Connectors::metaInsights',
        'GET /v423/connectors/google/report'    => 'Genie\\Handlers\\Connectors::googleReport',
        'GET /v423/connectors/naver/report'     => 'Genie\\Handlers\\Connectors::naverReport',
        'GET /v423/connectors/coupang/orders'   => 'Genie\\Handlers\\Connectors::coupangOrders',
        'GET /v423/connectors/status-all'       => 'Genie\\Handlers\\Connectors::statusAll',

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
    $register('GET', '/v382/connectors');
    $register('POST', '/v382/connectors/{connector}/configure');
    $register('POST', '/v382/connectors/{provider}/fetch');
    $register('POST', '/v382/sync/{channel}/{source}/run');
    $register('POST', '/v382/products');
    $register('GET', '/v382/products');
    $register('POST', '/v382/writeback/{channel}/{sku}/prepare');
    $register('POST', '/v382/approvals');
    $register('POST', '/v382/approvals/{approval_id}/decide');
    $register('POST', '/v382/writeback/{channel}/{sku}/execute');
    $register('GET', '/v382/writeback/jobs');
    $register('POST', '/v382/settlements/import');
    $register('GET', '/v382/settlements');
    $register('GET', '/v382/audit');
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
    $register('GET', '/v386/shopify/products');
    $register('GET', '/v386/shopify/orders');
    $register('GET', '/v386/meta/insights');
    $register('GET', '/v386/tiktok/report');
    $register('POST', '/v386/sync/quickstart');
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
    $register('POST', '/v410/action_requests/{action_id}/decide');
    $register('POST', '/v410/action_requests/{action_id}/execute');
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
    $register('POST', '/v418/events/ingest');
    $register('POST', '/v418/events/normalize');
    $register('POST', '/v418/rollups/compute');
    $register('POST', '/v418/rollups/persist');
    $register('GET', '/v418/alert_policies');
    $register('POST', '/v418/alert_policies');
    $register('PUT', '/v418/alert_policies/{policy_id}');
    $register('DELETE', '/v418/alert_policies/{policy_id}');
    $register('POST', '/v418/alerts/evaluate');
    $register('GET', '/v418/alerts');
    $register('GET', '/v418/actions/presets');
    $register('GET', '/v418/ai/policies/suggest');
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

    // ── v422 AI 마케팅 추천 (전체 카테고리) ─────────────────────────
    $register('POST', '/v422/ai/campaign-search');
    $register('POST', '/v422/ai/campaign-ad-creative');

    // ── Auth ────────────────────────────────────────────────────────
    $register('POST', '/auth/register');
    $register('POST', '/auth/login');
    $register('GET',  '/auth/me');
    $register('POST', '/auth/logout');
    $register('POST', '/auth/upgrade');
    $register('GET',  '/auth/subscription');
    $register('POST', '/auth/demo');        // 데모 세션 발급 (24h)
    $register('GET',  '/auth/plan-check'); // 현재 플랜 + 기능 접근 목록


    // ── Payment (Toss PG) ────────────────────────────────────────────
    $register('GET',  '/auth/payment/config');
    $register('GET',  '/auth/payment/plans');
    $register('POST', '/auth/payment/confirm');
    $register('POST', '/auth/payment/cancel');
    $register('POST', '/payment/webhook/toss');

    // ── PG Config Admin ──────────────────────────────────────────────
    $register('GET',  '/auth/pg/config');
    $register('POST', '/auth/pg/config');
    $register('DELETE', '/auth/pg/config/{provider}');

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

    // ── v423 Channel Credential Management (API 키 저장/조회/테스트) ────
    // (이전에 여기에 있던 $app->get 라우트들은 위쪽의 $register로 통합되었습니다)
    
    // SmartConnect: 채널 스캔 / 자동 연동 테스트 / 발급신청
    $register('POST', '/v423/connectors/{channel}/test');
    $register('POST', '/v423/connectors/apply');


    // ── v423 Alert notifications ──────────────────────────────────────
    $register('POST', '/v423/alerts/test-notify');

    // ── Auth: License Key Activation ─────────────────────────────────
    $app->post('/auth/license', [\Genie\Handlers\UserAuth::class, 'activateLicense']);

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
            if (!$admin || !in_array($admin['plan'], ['admin', 'enterprise'], true)) {
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
            if (!$admin || !in_array($admin['plan'], ['admin', 'enterprise'], true)) {
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
    $register('GET',    '/api/crm/customers');
    $register('POST',   '/api/crm/customers');
    $register('GET',    '/api/crm/customers/{id}');
    $register('PUT',    '/api/crm/customers/{id}');
    $register('POST',   '/api/crm/activities');
    $register('GET',    '/api/crm/rfm');
    $register('GET',    '/api/crm/segments');
    $register('POST',   '/api/crm/segments');
    $register('POST',   '/api/crm/segments/{id}/refresh');
    $register('GET',    '/api/crm/stats');
    // Email Marketing
    $register('GET',    '/api/email/settings');
    $register('PUT',    '/api/email/settings');
    $register('POST',   '/api/email/settings');
    $register('GET',    '/api/email/templates');
    $register('POST',   '/api/email/templates');
    $register('GET',    '/api/email/templates/{id}');
    $register('PUT',    '/api/email/templates/{id}');
    $register('DELETE', '/api/email/templates/{id}');
    $register('GET',    '/api/email/campaigns');
    $register('POST',   '/api/email/campaigns');
    $register('POST',   '/api/email/campaigns/{id}/send');
    $register('GET',    '/api/email/campaigns/{id}/stats');
    $register('POST',   '/api/email/track/open');
    $register('POST',   '/api/email/campaigns/{id}/ab-test');
    $register('GET',    '/api/email/campaigns/{id}/ab-result');
    $register('POST',   '/api/email/campaigns/{id}/duplicate');
    $register('GET',    '/api/email/analytics');
    // Kakao
    $register('GET',    '/api/kakao/settings');
    $register('PUT',    '/api/kakao/settings');
    $register('POST',   '/api/kakao/settings');
    $register('GET',    '/api/kakao/templates');
    $register('POST',   '/api/kakao/templates');
    $register('PUT',    '/api/kakao/templates/{id}');
    $register('DELETE', '/api/kakao/templates/{id}');
    $register('POST',   '/api/kakao/templates/{code}/test');
    $register('GET',    '/api/kakao/campaigns');
    $register('POST',   '/api/kakao/campaigns');
    $register('POST',   '/api/kakao/campaigns/{id}/send');
    $register('GET',    '/api/kakao/campaigns/{id}/stats');
    $register('POST',   '/api/kakao/friendtalk');
    $register('POST',   '/api/kakao/sms');
    $register('GET',    '/api/kakao/analytics');
    // 1st-Party Pixel Tracking
    $register('POST',   '/api/pixel/collect');
    $register('GET',    '/api/pixel/configs');
    $register('POST',   '/api/pixel/configs');
    $register('DELETE', '/api/pixel/configs/{id}');
    $register('GET',    '/api/pixel/analytics');
    $register('GET',    '/api/pixel/snippet/{pixel_id}');
    // Journey Builder
    $register('GET',    '/api/journey/journeys');
    $register('POST',   '/api/journey/journeys');
    $register('PUT',    '/api/journey/journeys/{id}');
    $register('DELETE', '/api/journey/journeys/{id}');
    $register('POST',   '/api/journey/journeys/{id}/enroll');
    $register('POST',   '/api/journey/journeys/{id}/launch');
    $register('GET',    '/api/journey/journeys/{id}/stats');
    $register('GET',    '/api/journey/templates');
    // Customer AI
    $register('GET',    '/api/customer-ai/churn-scores');
    $register('GET',    '/api/customer-ai/ltv-segments');
    $register('POST',   '/api/customer-ai/auto-action');
    $register('GET',    '/api/customer-ai/next-best-action');
    $register('GET',    '/api/customer-ai/model-performance');
    $register('GET',    '/api/customer-ai/product-recommendations');
    $register('GET',    '/api/customer-ai/integrated-summary');
    // WhatsApp
    $register('GET',    '/api/whatsapp/settings');
    $register('POST',   '/api/whatsapp/settings');
    $register('POST',   '/api/whatsapp/send');
    $register('POST',   '/api/whatsapp/broadcast');
    $register('GET',    '/api/whatsapp/templates');
    $register('GET',    '/api/whatsapp/messages');
    $register('POST',   '/api/whatsapp/webhooks');
    // SMS
    $register('GET',    '/api/sms/settings');
    $register('POST',   '/api/sms/settings');
    $register('POST',   '/api/sms/send');
    $register('POST',   '/api/sms/broadcast');
    $register('GET',    '/api/sms/messages');
    $register('GET',    '/api/sms/stats');
    // GDPR
    $register('POST',   '/api/gdpr/consent');
    $register('GET',    '/api/gdpr/consent');
    $register('DELETE', '/api/gdpr/consent');
    $register('GET',    '/api/gdpr/stats');
    // ML Model Monitor
    $register('GET',    '/api/models');
    $register('GET',    '/api/models/{id}/metrics');
    $register('POST',   '/api/models/{id}/retrain');
    $register('GET',    '/api/models/drift-report');
    $register('POST',   '/api/models/drift-check');
    // Instagram DM
    $register('GET',    '/api/instagram/settings');
    $register('POST',   '/api/instagram/settings');
    $register('GET',    '/api/instagram/conversations');
    $register('POST',   '/api/instagram/send');
    $register('GET',    '/api/instagram/stats');
    $register('POST',   '/api/instagram/webhooks');
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
    $register('GET',    '/api/performance', ['Genie\\Controllers\\PerformanceController', 'getMetrics']);
    $register('POST', '/v422/ai/analyze');
    $register('GET', '/v422/ai/analyses');
    $register('POST', '/v422/ai/marketing-eval');
    $register('POST', '/v422/ai/influencer-eval');
    $register('POST', '/v422/ai/channel-kpi-eval');
    $register('POST', '/v422/ai/campaign-recommend');
    $register('POST',   '/api/performance', ['Genie\\Controllers\\PerformanceController', 'ingestMetrics']);
    $register('GET',    '/api/performance/recommendations', ['Genie\\Controllers\\PerformanceController', 'getRecommendations']);

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

    };
