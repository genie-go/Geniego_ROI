import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../auth/AuthContext.jsx";

const _AK = "process.env.API_KEY || ''";

/* ══════════════════════════════════════════════════════════════════
   FULL MENU TREE (system 관리자 센터 제외 — 플랜 구독에 절대 포함 불가)
   5단계: 대메뉴 → 중메뉴 → 하위메뉴 → 최하위메뉴(leafItems)
   ══════════════════════════════════════════════════════════════════ */
const MENU_TREE = [
  { key:"home", label:"🏠 홈 대시보드", items:[
    { key:"dashboard", label:"대시보드", subitems:[
      { key:"summary", label:"요약 대시보드", leafItems:[
        { key:"kpi_widgets", label:"핵심 지표 위젯" },
        { key:"realtime_mon", label:"실시간 모니터링" },
        { key:"quick_links", label:"빠른 링크" },
        { key:"alert_feed", label:"알림 피드" },
      ]},
    ]},
  ]},
  { key:"ai_marketing", label:"🚀 AI 마케팅 자동화", items:[
    { key:"auto_marketing", label:"AI 전략 생성기", subitems:[
      { key:"ai_strategy_gen", label:"전략 생성", leafItems:[
        { key:"ai_ad_creative", label:"AI 광고 소재 생성" },
        { key:"campaign_setup", label:"캠페인 설정" },
        { key:"ai_strategy_preview", label:"AI 전략 미리보기" },
        { key:"campaign_mgmt", label:"캠페인 관리" },
      ]},
    ]},
    { key:"campaign_manager", label:"캠페인 관리", subitems:[
      { key:"campaign_list_mgmt", label:"캠페인 목록", leafItems:[
        { key:"campaign_list", label:"캠페인 목록" },
        { key:"ab_test", label:"A/B 테스트" },
        { key:"ad_creative_mgmt", label:"광고 소재 관리" },
        { key:"campaign_report", label:"캠페인 성과 보고서" },
      ]},
    ]},
    { key:"journey_builder", label:"고객 여정 빌더", subitems:[
      { key:"journey_canvas", label:"여정 캔버스", leafItems:[
        { key:"journey_canvas_main", label:"고객 여정 캔버스" },
        { key:"trigger_setting", label:"트리거 설정" },
        { key:"action_nodes", label:"액션 노드 관리" },
        { key:"journey_stat", label:"여정 성과 분석" },
      ]},
    ]},
    { key:"ai_prediction", label:"AI 예측 & 스코어", subitems:[
      { key:"churn_ltv", label:"이탈률 & LTV 예측", leafItems:[
        { key:"churn_pred", label:"고객 이탈 예측" },
        { key:"ltv_predict", label:"LTV 예측" },
        { key:"purchase_prob", label:"구매 확률 예측" },
      ]},
      { key:"graph_ai", label:"그래프 스코어 & AI", leafItems:[
        { key:"graph_score", label:"그래프 스코어" },
        { key:"next_action", label:"최적 행동 추천(NBA)" },
        { key:"product_reco", label:"상품 추천" },
        { key:"ai_insight_ad", label:"AI 광고 인사이트" },
        { key:"model_perf", label:"AI 모델 성과" },
      ]},
    ]},
    { key:"content_calendar", label:"콘텐츠 캘린더", subitems:[
      { key:"content_mgmt", label:"콘텐츠 관리", leafItems:[
        { key:"content_plan", label:"콘텐츠 기획" },
        { key:"publish_schedule", label:"발행 스케줄" },
        { key:"sns_connect", label:"소셜 미디어 연동" },
        { key:"content_stat", label:"콘텐츠 성과" },
      ]},
    ]},
    { key:"budget_planner", label:"예산 플래너", subitems:[
      { key:"budget_main", label:"예산 설정", leafItems:[
        { key:"budget_alloc", label:"예산 할당" },
        { key:"spend_forecast", label:"지출 예측" },
        { key:"roi_calc", label:"ROI 계산기" },
        { key:"budget_report", label:"예산 보고서" },
      ]},
    ]},
  ]},
  { key:"ad_analytics", label:"📣 광고·채널 성과 분석", items:[
    { key:"ad_performance", label:"광고 성과 분석", subitems:[
      { key:"ad_overview", label:"광고 오버뷰", leafItems:[
        { key:"ad_summary", label:"성과 요약" },
        { key:"ad_channel", label:"채널별 분석" },
        { key:"ad_product", label:"상품별 분석" },
        { key:"ad_roas", label:"ROAS 분석" },
      ]},
    ]},
    { key:"marketing_intel", label:"마케팅 인텔리전스", subitems:[
      { key:"intel_main", label:"인텔리전스", leafItems:[
        { key:"keyword_analysis", label:"키워드 분석" },
        { key:"competitor_ana", label:"경쟁사 분석" },
        { key:"trend_analysis", label:"트렌드 분석" },
        { key:"market_share", label:"시장 점유율" },
      ]},
    ]},
    { key:"attribution_ana", label:"어트리뷰션 분석", subitems:[
      { key:"attr_model", label:"기여도 모델", leafItems:[
        { key:"touch_model", label:"접점 모델 설정" },
        { key:"channel_attr", label:"채널 기여도" },
        { key:"roas_calc_m", label:"기여 기반 ROAS" },
        { key:"conv_path", label:"전환 경로 분석" },
      ]},
    ]},
    { key:"channel_kpi", label:"채널 KPI", subitems:[
      { key:"kpi_dashboard", label:"KPI 대시보드", leafItems:[
        { key:"impressions", label:"노출수·CTR" },
        { key:"conv_rate", label:"전환율(CVR)" },
        { key:"cpa_cpc", label:"CPA/CPC" },
        { key:"channel_compare", label:"채널 비교" },
      ]},
    ]},
    { key:"influencer_mgmt", label:"인플루언서 마케팅", subitems:[
      { key:"influencer_list", label:"인플루언서", leafItems:[
        { key:"influencer_db", label:"DB 관리" },
        { key:"campaign_inf", label:"인플루언서 캠페인" },
        { key:"settlement_inf", label:"정산 관리" },
        { key:"perf_inf", label:"성과 분석" },
      ]},
    ]},
    { key:"digital_shelf", label:"디지털 셸프(SoS)", subitems:[
      { key:"shelf_main", label:"현황", leafItems:[
        { key:"shelf_rank", label:"검색 순위·SoS" },
        { key:"shelf_content", label:"리스팅 품질" },
        { key:"shelf_score", label:"리뷰 분석" },
      ]},
    ]},
    { key:"amazon_risk", label:"글로벌 마켓 리스크", subitems:[
      { key:"amazon_mgmt", label:"리스크 모니터링", leafItems:[
        { key:"amazon_health", label:"계정 건전성" },
        { key:"amazon_policy", label:"정책 준수" },
        { key:"amazon_review", label:"리뷰 관리" },
        { key:"amazon_listing", label:"리스팅 관리" },
      ]},
    ]},
  ]},
  { key:"crm", label:"👤 고객 CRM", items:[
    { key:"crm_main", label:"고객 CRM & AI 세그먼트", subitems:[
      { key:"customer_list", label:"고객 목록", leafItems:[
        { key:"customer_db", label:"고객 DB" },
        { key:"customer_360", label:"360도 뷰" },
        { key:"tag_mgmt", label:"태그 관리" },
        { key:"customer_import", label:"데이터 가져오기" },
      ]},
      { key:"rfm_segment", label:"RFM & AI 세그먼트", leafItems:[
        { key:"rfm_analysis", label:"RFM 분석" },
        { key:"ai_segment", label:"AI 고객 세분화" },
        { key:"segment_rule", label:"세그먼트 규칙" },
        { key:"segment_push", label:"타겟 메시지" },
      ]},
    ]},
    { key:"email_marketing", label:"이메일 마케팅", subitems:[
      { key:"email_template", label:"템플릿", leafItems:[
        { key:"email_tpl_list", label:"템플릿 목록" },
        { key:"email_editor", label:"이메일 에디터" },
        { key:"html_import", label:"HTML 가져오기" },
      ]},
      { key:"email_campaign", label:"캠페인", leafItems:[
        { key:"email_send", label:"캠페인 발송" },
        { key:"email_ab", label:"A/B 테스트" },
        { key:"email_stat", label:"성과 분석" },
        { key:"email_bounce", label:"수신거부 관리" },
        { key:"email_schedule", label:"예약 발송" },
      ]},
    ]},
    { key:"kakao_channel", label:"카카오 채널", subitems:[
      { key:"kakao_template", label:"카카오 템플릿", leafItems:[
        { key:"alimtalk", label:"알림톡" },
        { key:"friendtalk", label:"친구톡" },
        { key:"bizboard", label:"비즈보드" },
      ]},
      { key:"kakao_campaign", label:"카카오 캠페인", leafItems:[
        { key:"kakao_send", label:"메시지 발송" },
        { key:"kakao_stat", label:"발송 통계" },
        { key:"kakao_setting", label:"채널 설정" },
      ]},
    ]},
    { key:"whatsapp", label:"WhatsApp 비즈니스", subitems:[
      { key:"wa_main", label:"왓츠앱", leafItems:[
        { key:"wa_template", label:"메시지 템플릿" },
        { key:"wa_broadcast", label:"브로드캐스트" },
        { key:"wa_setting", label:"계정 설정" },
        { key:"wa_stat", label:"발송 통계" },
      ]},
    ]},
    { key:"sms_marketing", label:"문자(SMS/LMS)", subitems:[
      { key:"sms_main", label:"문자 발송", leafItems:[
        { key:"sms_send", label:"문자 발송" },
        { key:"sms_template", label:"문자 템플릿" },
        { key:"sms_stat", label:"발송 통계" },
        { key:"080_reject", label:"080 수신거부" },
      ]},
    ]},
    { key:"instagram_dm", label:"소셜 DM", subitems:[
      { key:"ig_dm_main", label:"채널 챗", leafItems:[
        { key:"ig_dm", label:"인스타그램 DM" },
        { key:"fb_dm", label:"페이스북 메신저" },
        { key:"dm_auto", label:"자동 답장" },
        { key:"dm_campaign", label:"DM 캠페인" },
      ]},
    ]},
    { key:"line_channel", label:"LINE 채널", subitems:[
      { key:"line_main", label:"라인 관리", leafItems:[
        { key:"line_msg", label:"메시지 발송" },
        { key:"line_template", label:"템플릿 관리" },
        { key:"line_setting", label:"채널 설정" },
        { key:"line_stat", label:"발송 통계" },
      ]},
    ]},
    { key:"web_popup", label:"웹 팝업 & 이탈 방지", subitems:[
      { key:"popup_main", label:"팝업 설정", leafItems:[
        { key:"popup_editor", label:"팝업 에디터" },
        { key:"exit_popup", label:"이탈 방지 팝업" },
        { key:"popup_trigger", label:"트리거 설정" },
        { key:"popup_ab", label:"팝업 A/B 테스트" },
        { key:"popup_stat", label:"팝업 전환 성과" },
      ]},
    ]},
  ]},
  { key:"commerce", label:"🛒 커머스·물류", items:[
    { key:"omni_channel", label:"멀티 채널 운영", subitems:[
      { key:"channel_mgmt", label:"채널 관리", leafItems:[
        { key:"channel_coupang", label:"쿠팡" },
        { key:"channel_naver", label:"네이버 스마트스토어" },
        { key:"channel_shopify", label:"쇼피파이" },
        { key:"channel_amazon", label:"아마존" },
        { key:"channel_cafe24", label:"카페24" },
        { key:"channel_rakuten", label:"라쿠텐" },
        { key:"channel_temu", label:"테무" },
        { key:"channel_sync_all", label:"전 채널 일괄 연동" },
      ]},
    ]},
    { key:"order_hub", label:"주문 통합 허브", subitems:[
      { key:"order_list", label:"주문 조회", leafItems:[
        { key:"order_all", label:"전체 주문" },
        { key:"order_channel", label:"채널별 조회" },
        { key:"order_excel", label:"엑셀 다운로드" },
      ]},
      { key:"claim_mgmt", label:"클레임 관리", leafItems:[
        { key:"claim_list", label:"취소/반품/교환" },
        { key:"return_mgmt", label:"반품 관리" },
        { key:"exchange_mgmt", label:"교환 관리" },
      ]},
    ]},
    { key:"wms_manager", label:"WMS 창고 관리", subitems:[
      { key:"inventory_mgmt", label:"재고 내역", leafItems:[
        { key:"inventory_list", label:"재고 현황" },
        { key:"inventory_alert", label:"재고 알림" },
        { key:"inventory_adjust", label:"입/출고 조정" },
      ]},
      { key:"inbound_mgmt", label:"입출고", leafItems:[
        { key:"inbound", label:"입고 현황" },
        { key:"outbound", label:"출하·배송 지시" },
        { key:"location", label:"로케이션 관리" },
        { key:"barcode", label:"바코드 매핑" },
      ]},
    ]},
    { key:"catalog_sync", label:"상품 카탈로그 싱크", subitems:[
      { key:"product_mgmt", label:"상품 관리", leafItems:[
        { key:"product_list", label:"상품 목록" },
        { key:"product_upload", label:"일괄 등록" },
        { key:"product_sync", label:"채널 연동" },
        { key:"product_excel", label:"엑셀 업로드" },
        { key:"price_mgmt", label:"가격 관리" },
        { key:"stock_alert", label:"품절 알림" },
      ]},
    ]},
    { key:"price_opt", label:"AI 가격 최적화", subitems:[
      { key:"price_main", label:"가격 룰", leafItems:[
        { key:"price_rule", label:"자동 판매가 룰" },
        { key:"elasticity", label:"탄력성 시뮬레이션" },
        { key:"price_simulate", label:"가상 가격 테스트" },
        { key:"price_reco", label:"최적 가격 추천" },
      ]},
    ]},
    { key:"demand_forecast", label:"재고 수요 예측", subitems:[
      { key:"forecast_main", label:"수요 분석", leafItems:[
        { key:"sku_forecast", label:"SKU별 예측" },
        { key:"auto_order", label:"발주량 제안" },
        { key:"order_history", label:"발주 이력" },
        { key:"forecast_chart", label:"수요 차트" },
      ]},
    ]},
    { key:"supply_chain", label:"서플라이 체인", subitems:[
      { key:"supply_main", label:"공급망", leafItems:[
        { key:"supply_timeline", label:"타임라인 추적" },
        { key:"supplier_list", label:"공급처 관리" },
        { key:"leadtime_ana", label:"리드타임 측정" },
        { key:"risk_detect", label:"공급 리스크 경고" },
      ]},
    ]},
  ]},
  { key:"analytics", label:"📊 퍼포먼스·BI", items:[
    { key:"performance_hub", label:"퍼포먼스 허브", subitems:[
      { key:"perf_overview", label:"종합 현황", leafItems:[
        { key:"perf_summary", label:"성과 요약" },
        { key:"multi_team_analysis", label:"부서별 성과" },
        { key:"perf_channel", label:"채널별 성과" },
        { key:"perf_product", label:"히트 상품" },
        { key:"perf_campaign", label:"캠페인별 매출" },
        { key:"cohort", label:"코호트 리텐션" },
      ]},
    ]},
    { key:"pnl_analytics", label:"P&L 분석", subitems:[
      { key:"pnl_main", label:"손익", leafItems:[
        { key:"pnl_overview", label:"손익 요약" },
        { key:"pnl_channel", label:"채널별 수익성" },
        { key:"pnl_product", label:"상품별 마진" },
        { key:"pnl_trend", label:"손익 추이" },
      ]},
    ]},
    { key:"ai_insights", label:"AI 인사이트", subitems:[
      { key:"insight_feed", label:"통찰", leafItems:[
        { key:"insight_main", label:"AI 성장 조언" },
        { key:"anomaly_detect", label:"이상치 감지" },
        { key:"auto_report", label:"자동 요약 보고서" },
        { key:"competitor_ai", label:"AI 경쟁사 벤치마킹" },
      ]},
    ]},
    { key:"report_builder", label:"BI 리포트", subitems:[
      { key:"report_main", label:"보고서 빌더", leafItems:[
        { key:"custom_report", label:"커스텀 대시보드" },
        { key:"scheduled_rpt", label:"정기 리포트" },
        { key:"excel_export", label:"엑셀 다운로더" },
        { key:"api_export", label:"API 데이터 연동" },
        { key:"dashboard_share", label:"대시보드 공유" },
      ]},
    ]},
  ]},
  { key:"finance", label:"💳 정산·재무", items:[
    { key:"reconciliation", label:"정산 관리", subitems:[
      { key:"recon_main", label:"정산", leafItems:[
        { key:"recon_list", label:"정산 내역" },
        { key:"recon_channel", label:"매체사별 정산" },
        { key:"recon_month", label:"월별 정산" },
        { key:"recon_excel", label:"정산 엑셀" },
      ]},
    ]},
    { key:"settlements", label:"세금 및 결제", subitems:[
      { key:"settle_main", label:"결제 관리", leafItems:[
        { key:"tax_invoice", label:"세금계산서" },
        { key:"settle_list", label:"결제 내역" },
        { key:"settle_approve", label:"지출 결재" },
        { key:"settle_excel", label:"결제 엑셀" },
      ]},
    ]},
    { key:"app_pricing", label:"구독·라이선스", subitems:[
      { key:"pricing_main", label:"요금제", leafItems:[
        { key:"my_plan", label:"내 구독 상태" },
        { key:"plan_upgrade", label:"플랜 업그레이드" },
        { key:"payment_hist", label:"결제 영수증" },
        { key:"invoice", label:"청구서" },
      ]},
    ]},
  ]},
  { key:"automation", label:"🤖 자동화·AI 룰", items:[
    { key:"ai_rule_engine", label:"AI 룰 엔진", subitems:[
      { key:"rule_main", label:"룰 설정", leafItems:[
        { key:"ai_policy", label:"AI 정책 설정" },
        { key:"rule_list", label:"매크로 룰 리스트" },
        { key:"rule_test", label:"룰 시뮬레이션" },
        { key:"rule_log", label:"트리거 로그" },
      ]},
    ]},
    { key:"alert_policies", label:"알람·매크로", subitems:[
      { key:"alert_main", label:"알람 정책", leafItems:[
        { key:"alert_policy_list", label:"알람 조건" },
        { key:"action_presets", label:"행동 설정" },
        { key:"alert_evaluate", label:"조건 평가 로그" },
        { key:"alert_log", label:"알람 기록" },
      ]},
    ]},
    { key:"writeback", label:"Writeback(DB 갱신)", subitems:[
      { key:"writeback_main", label:"라이트백", leafItems:[
        { key:"wb_config", label:"테이블 싱크 설정" },
        { key:"wb_log", label:"동기화 로그" },
        { key:"wb_rollback", label:"롤백(되돌리기)" },
      ]},
    ]},
    { key:"onboarding", label:"온보딩", subitems:[
      { key:"onboarding_main", label:"시작하기", leafItems:[
        { key:"getting_started", label:"10단계 가이드" },
        { key:"setup_wizard", label:"마법사 설정" },
        { key:"quick_setup", label:"빠른 설정" },
        { key:"tutorial", label:"튜토리얼" },
      ]},
    ]},
  ]},
  { key:"data", label:"🔌 데이터·API", items:[
    { key:"connectors", label:"연동 커넥터", subitems:[
      { key:"channel_conn", label:"외부 채널 연동", leafItems:[
        { key:"meta_ads", label:"메타 광고" },
        { key:"google_ads", label:"구글 광고" },
        { key:"tiktok_ads", label:"틱톡 광고" },
        { key:"naver_ads", label:"네이버 광고" },
        { key:"kakao_ads", label:"카카오 광고" },
        { key:"line_ads", label:"라인 프로모션" },
        { key:"coupang_conn", label:"쿠팡 연동" },
        { key:"shopify_conn", label:"쇼피파이 연동" },
        { key:"amazon_conn", label:"아마존 연동" },
      ]},
      { key:"event_data", label:"이벤트·DWH", leafItems:[
        { key:"event_ingest", label:"이벤트 수신" },
        { key:"event_normalize", label:"정규화" },
        { key:"data_schema", label:"스키마 열람" },
        { key:"data_mapping", label:"데이터 맵핑" },
        { key:"data_product", label:"데이터 마트" },
      ]},
    ]},
    { key:"api_keys", label:"API Key 관리", subitems:[
      { key:"api_mgmt", label:"API", leafItems:[
        { key:"api_key_list", label:"발급된 API 키" },
        { key:"api_create", label:"API 키 발행" },
        { key:"webhook", label:"웹훅 제어" },
        { key:"oauth_mgmt", label:"OAuth 인가" },
        { key:"api_log", label:"API 전송 통계" },
      ]},
    ]},
    { key:"pixel_tracking", label:"픽셀 추적 관리", subitems:[
      { key:"pixel_main", label:"픽셀", leafItems:[
        { key:"pixel_config", label:"픽셀 세팅" },
        { key:"pixel_snippet", label:"추적 스크립트" },
        { key:"pixel_verify", label:"이벤트 검증기" },
        { key:"pixel_stat", label:"픽셀 통계" },
      ]},
    ]},
  ]},
  { key:"help", label:"👥 팀·헬프", items:[
    { key:"team_workspace", label:"팀 워크스페이스", subitems:[
      { key:"team_main", label:"팀 관리", leafItems:[
        { key:"team_members", label:"팀원 목록" },
        { key:"team_invite", label:"이메일 초대" },
        { key:"team_roles", label:"역할 템플릿" },
        { key:"team_activity", label:"활동 현황" },
      ]},
    ]},
    { key:"help_center", label:"CS 고객 센터", subitems:[
      { key:"help_main", label:"도움말", leafItems:[
        { key:"getting_started_help", label:"시작 가이드" },
        { key:"faq", label:"FAQ" },
        { key:"video_tutorial", label:"튜토리얼 비디오" },
        { key:"release_notes", label:"릴리즈 노트" },
        { key:"support_ticket", label:"1:1 문의" },
      ]},
    ]},
  ]},
];

/* ══════════════════════════════════════════════════════════════════
   플랜별 AI 추천 엔진 — 경쟁사 벤치마킹 기반 가치 분석
   ────────────────────────────────────────────────────────────────
   Growth:     HubSpot Starter~Pro급 — 국내 마케팅·커머스·CRM 핵심
   Pro:        HubSpot Pro~Enterprise급 — AI 예측·글로벌·자동화
   Enterprise: Salesforce Enterprise급 — 전체 무제한 + Writeback 롤백
   ══════════════════════════════════════════════════════════════════ */

/* 가격 대비 가치 분석 기준 */
const FEATURE_VALUE_MAP = {
  // 고가치 기능 (월 ₩500,000+ 상당)
  high: new Set([
    "ai_ad_creative","campaign_mgmt","journey_canvas_main","churn_pred","ltv_predict","graph_score",
    "customer_db","customer_360","rfm_analysis","order_all","inventory_list","perf_summary",
    "pnl_overview","custom_report","meta_ads","google_ads","channel_coupang","channel_naver",
  ]),
  // 프리미엄 기능 (월 ₩200,000+ 상당)
  premium: new Set([
    "ai_strategy_preview","trigger_setting","action_nodes","purchase_prob","next_action","product_reco",
    "ai_insight_ad","model_perf","keyword_analysis","competitor_ana","trend_analysis","market_share",
    "touch_model","channel_attr","conv_path","shelf_rank","amazon_health","ai_segment",
    "anomaly_detect","auto_report","competitor_ai","scheduled_rpt","api_export","dashboard_share",
    "ai_policy","rule_list","wb_config","wb_rollback","event_ingest","data_schema","api_key_list",
    "pixel_config","influencer_db","campaign_inf",
  ]),
};

/* ══════════════════════════════════════════════════════════════════
   플랜별 기능 배정 (Admin.jsx RECOMMENDED_PERMS 기준 통합)
   벤치마킹: Triple Whale · Northbeam · Rockerbox · Klaviyo
   ────────────────────────────────────────────────────────────────
   Growth  (~108) — 국내 마케팅·커머스·CRM 핵심 운영
   Pro     (~205) — AI 예측·글로벌·자동화·Writeback
   Enterprise(219) — 전체 무제한 + 가격AI·RBAC·DWH·SCM
   ══════════════════════════════════════════════════════════════════ */
const PRO_ONLY = new Set([
  // ── 고객 여정 빌더 (HubSpot Pro급) ──
  "journey_canvas_main","trigger_setting","action_nodes","journey_stat",
  // ── AI 예측 & 스코어 (Pro 핵심 차별화) ──
  "churn_pred","ltv_predict","purchase_prob","graph_score","next_action",
  "product_reco","ai_insight_ad","model_perf",
  // ── 마케팅 인텔리전스 ──
  "keyword_analysis","competitor_ana","trend_analysis","market_share",
  // ── 어트리뷰션 분석 ──
  "touch_model","channel_attr","roas_calc_m","conv_path",
  // ── 글로벌 채널 (커머스) ──
  "channel_shopify","channel_amazon","channel_rakuten","channel_temu","channel_sync_all",
  // ── 글로벌 메시징 채널 ──
  "wa_template","wa_broadcast","wa_setting","wa_stat",
  "ig_dm","fb_dm","dm_auto","dm_campaign",
  "line_msg","line_template","line_setting","line_stat",
  // ── 글로벌 커넥터 ──
  "line_ads","shopify_conn","amazon_conn",
  // ── 디지털 셸프 & 글로벌 리스크 ──
  "shelf_rank","shelf_content","shelf_score",
  "amazon_health","amazon_policy","amazon_review","amazon_listing",
  // ── AI 인사이트 고급 ──
  "anomaly_detect","auto_report","competitor_ai",
  // ── BI 리포트 고급 ──
  "dashboard_share","scheduled_rpt",
  // ── AI 룰 엔진 ──
  "ai_policy","rule_list","rule_test","rule_log",
  // ── 알람 고급 (알람 조건·기록은 Growth 허용, Action Presets/평가 로그는 Pro) ──
  "action_presets","alert_evaluate",
  // ── 정산 고급 ──
  "tax_invoice","settle_approve",
  // ── 데이터 파이프라인 (Pro) ──
  "event_ingest","data_schema","data_mapping",
  // ── API·픽셀 ──
  "api_key_list","api_create","webhook","oauth_mgmt","api_log",
  "pixel_config","pixel_snippet","pixel_verify","pixel_stat",
  // ── 인플루언서 마케팅 ──
  "influencer_db","campaign_inf","settlement_inf","perf_inf",
  // ── Writeback (Pro부터 — 즉시 롤백은 Enterprise) ──
  "wb_config","wb_log","wb_rollback",
  // ── 알림 피드 (Admin.jsx: Pro 이상) ──
  "alert_feed",
  // ── AI 세그먼트 (Admin.jsx: Pro 이상) ──
  "ai_segment",
  // ── P&L 분석 (Admin.jsx: Pro 이상) ──
  "pnl_overview","pnl_channel","pnl_product","pnl_trend",
  // ── 코호트 리텐션 (Admin.jsx: Pro 이상) ──
  "cohort",
  // ── WMS 고급 (Admin.jsx: Pro 이상) ──
  "inbound","outbound","location","barcode",
  // ── 팀 활동 내역 (Admin.jsx: Pro 이상) ──
  "team_activity",
  // ── 월별 통합 정산 (Admin.jsx: Pro 이상) ──
  "recon_month",
]);

const ENT_ONLY = new Set([
  // ── 서플라이 체인 SCM ──
  "supply_timeline","supplier_list","leadtime_ana","risk_detect",
  // ── AI 가격 최적화 (Admin.jsx: Enterprise 전용) ──
  "price_rule","elasticity","price_simulate","price_reco",
  // ── RBAC 역할 템플릿 (Admin.jsx: Enterprise 전용) ──
  "team_roles",
  // ── 데이터 파이프라인 Enterprise ──
  "event_normalize","data_product",
  // ── API Export (Admin.jsx: Enterprise 전용) ──
  "api_export",
]);

function getPlanDefault(leafKey, plan) {
  if (ENT_ONLY.has(leafKey)) return plan === "enterprise";
  if (PRO_ONLY.has(leafKey)) return plan === "pro" || plan === "enterprise";
  return true;
}

function getFeatureTier(leafKey) {
  if (ENT_ONLY.has(leafKey)) return "enterprise";
  if (PRO_ONLY.has(leafKey)) return "pro";
  return "growth";
}

function getFeatureValue(leafKey) {
  if (FEATURE_VALUE_MAP.high.has(leafKey)) return "high";
  if (FEATURE_VALUE_MAP.premium.has(leafKey)) return "premium";
  return "standard";
}

/* ── 유틸 ── */
const SEP = "||";
function getAllLeafKeys(tree) {
  const keys = [];
  tree.forEach(sec => sec.items.forEach(item => (item.subitems||[]).forEach(sub => {
    (sub.leafItems||[]).forEach(lf => keys.push(`${sec.key}${SEP}${item.key}${SEP}${sub.key}${SEP}${lf.key}`));
  })));
  return keys;
}
function sectionLeafKeys(sec) {
  const keys = [];
  sec.items.forEach(item => (item.subitems||[]).forEach(sub => {
    (sub.leafItems||[]).forEach(lf => keys.push(`${sec.key}${SEP}${item.key}${SEP}${sub.key}${SEP}${lf.key}`));
  }));
  return keys;
}
function itemLeafKeys(sec, item) {
  const keys = [];
  (item.subitems||[]).forEach(sub => {
    (sub.leafItems||[]).forEach(lf => keys.push(`${sec.key}${SEP}${item.key}${SEP}${sub.key}${SEP}${lf.key}`));
  });
  return keys;
}

const PLANS = [
  { id:"growth", label:"Growth", color:"#4f8ef7", emoji:"📈", desc:"국내 마케팅·커머스·CRM 핵심", priceLabel:"성장 플랜" },
  { id:"pro", label:"Pro", color:"#a855f7", emoji:"🚀", desc:"AI 자동화·글로벌·고급 분석", popular:true, priceLabel:"AI 자동화 플랜" },
  { id:"enterprise", label:"Enterprise", color:"#f59e0b", emoji:"🌐", desc:"전체 무제한 + Writeback", priceLabel:"엔터프라이즈 플랜" },
];

const PLAN_COLORS = { growth:"#4f8ef7", pro:"#a855f7", enterprise:"#f59e0b" };

/* ── BroadcastChannel 동기화 ── */
const SYNC_CHANNEL_NAME = "geniego_menu_access_sync";

/* ══════════════════════════════════════════════════════════════════
   MenuAccessPanel — 메인 컴포넌트 (초고도화 버전)
   ══════════════════════════════════════════════════════════════════ */
export default function MenuAccessPanel() {
  const { token, reloadMenuAccess } = useAuth();
  const hdrs = { Authorization: "Bearer " + (token || _AK), "Content-Type": "application/json" };

  const [selectedPlan, setSelectedPlan] = useState("growth");
  const [perms, setPerms] = useState({});
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("ok");
  const [openSections, setOpenSections] = useState({});
  const [recommendApplied, setRecommendApplied] = useState(false);
  const [stats, setStats] = useState(null);
  const [livePrice, setLivePrice] = useState({});
  const [showFeatures, setShowFeatures] = useState(false);
  const [featureViewMode, setFeatureViewMode] = useState("detailed"); // "detailed"|"compact"|"comparison"
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [valueAnalysis, setValueAnalysis] = useState(null);

  const bcRef = useRef(null);

  const allKeys = useMemo(() => getAllLeafKeys(MENU_TREE), []);

  /* ── BroadcastChannel 초기화 ── */
  useEffect(() => {
    try { bcRef.current = new BroadcastChannel(SYNC_CHANNEL_NAME); } catch {}
    return () => { try { bcRef.current?.close(); } catch {} };
  }, []);

  /* ── 실시간 요금 정보 로딩 ── */
  useEffect(() => {
    fetch("/api/auth/pricing/public-plans")
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return;
        const prices = {};
        (d.plans || []).forEach(p => {
          if (!p.hasPricing || !p.tiers || p.tiers.length === 0) return;
          const tier1 = p.tiers.find(t => t.acct === "1") || p.tiers[0];
          const monthly = tier1?.cycles?.monthly;
          if (monthly?.monthly_price > 0) {
            prices[p.id] = {
              monthly: monthly.monthly_price,
              label: "₩" + Number(monthly.monthly_price).toLocaleString("ko-KR") + "/월",
            };
          }
        });
        setLivePrice(prices);
      })
      .catch(() => {});
  }, []);

  /* ── 퍼미션 기반 통계/가치분석 계산 (재사용 함수) ── */
  const computeStatsFromPerms = useCallback((permData, plan) => {
    let total = 0, enabled = 0;
    let highCount = 0, premiumCount = 0, standardCount = 0;
    let proOnlyCount = 0, entOnlyCount = 0;
    const sectionStats = {};

    allKeys.forEach(k => {
      const leafKey = k.split(SEP).pop();
      const secKey = k.split(SEP)[0];
      const val = !!permData[k];
      total++;
      if (val) enabled++;

      if (!sectionStats[secKey]) sectionStats[secKey] = { total: 0, enabled: 0, high: 0, premium: 0 };
      sectionStats[secKey].total++;
      if (val) sectionStats[secKey].enabled++;

      const fv = getFeatureValue(leafKey);
      if (fv === "high") { highCount++; if (val) sectionStats[secKey].high++; }
      if (fv === "premium") { premiumCount++; if (val) sectionStats[secKey].premium++; }
      if (fv === "standard") standardCount++;
      if (PRO_ONLY.has(leafKey)) proOnlyCount++;
      if (ENT_ONLY.has(leafKey)) entOnlyCount++;
    });

    const monthlyPrice = livePrice[plan]?.monthly || 0;
    const perFeature = enabled > 0 && monthlyPrice > 0 ? Math.round(monthlyPrice / enabled) : 0;

    return {
      stats: { total, enabled, disabled: total - enabled },
      analysis: {
        monthlyPrice,
        perFeature,
        highCount,
        premiumCount,
        standardCount,
        proOnlyCount,
        entOnlyCount,
        sectionStats,
        coverageRate: total > 0 ? Math.round((enabled / total) * 100) : 0,
        valueScore: plan === "enterprise" ? 98 : plan === "pro" ? 87 : 72,
      },
      hasData: enabled > 0,
    };
  }, [allKeys, livePrice]);

  /* ── 캐시 우선(Cache-First) 로드 전략 ──
     1. selectedPlan 변경 시, 즉시 localStorage 캐시에서 perms 복원 (동기)
     2. 서버 fetch는 백그라운드로 — 서버가 더 좋은 데이터(더 많은 활성 항목)를 반환하면 갱신
     3. 서버가 빈 데이터를 반환해도 캐시 데이터를 덮어쓰지 않음 */
  useEffect(() => {
    const CACHE_KEY = `geniego_perms_${selectedPlan}`;
    let cacheEnabled = 0;

    // ① 즉시 localStorage에서 캐시 복원 (동기, 서버보다 먼저)
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && typeof cached === "object") {
        cacheEnabled = Object.values(cached).filter(Boolean).length;
        if (cacheEnabled > 0) {
          setPerms(cached);
          const result = computeStatsFromPerms(cached, selectedPlan);
          setStats(result.stats);
          setValueAnalysis(result.analysis);
          setRecommendApplied(true);
          setOpenSections({ [MENU_TREE[0].key]: true });
        }
      }
    } catch {}

    // 캐시에 데이터가 없으면 초기 빈 상태 설정
    if (cacheEnabled === 0) {
      const init = {};
      allKeys.forEach(k => { init[k] = false; });
      setPerms(init);
      setStats(null);
      setValueAnalysis(null);
      setRecommendApplied(false);
    }

    // ② 서버 fetch (백그라운드) — 캐시보다 더 좋은 데이터가 있을 때만 갱신
    fetch("/api/auth/pricing/menu-access?plan=" + selectedPlan, { headers: hdrs })
      .then(r => r.json()).then(d => {
        if (!d.permissions) return; // 서버에 데이터 없음 → 캐시 유지

        let loadedPerms;
        if (typeof Object.values(d.permissions)[0] === "object") {
          const flat = {};
          Object.entries(d.permissions).forEach(([k,v]) => { flat[k] = !!v.read; });
          loadedPerms = flat;
        } else {
          loadedPerms = d.permissions;
        }

        const serverEnabled = Object.values(loadedPerms).filter(Boolean).length;

        // 서버 데이터가 캐시보다 더 많은 활성 항목이 있을 때만 갱신
        if (serverEnabled > cacheEnabled) {
          setPerms(loadedPerms);
          const result = computeStatsFromPerms(loadedPerms, selectedPlan);
          setStats(result.stats);
          setValueAnalysis(result.analysis);
          setRecommendApplied(true);
          setOpenSections({ [MENU_TREE[0].key]: true });
          // 서버 데이터를 캐시에도 저장
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(loadedPerms)); } catch {}
        }
      })
      .catch(() => {}); // 네트워크 오류 → 캐시 데이터 유지
  }, [selectedPlan, computeStatsFromPerms]);

  /* ── 토글 ── */
  const toggle = useCallback((key) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setBulk = useCallback((keys, val) => {
    setPerms(prev => {
      const next = { ...prev };
      keys.forEach(k => { next[k] = val; });
      return next;
    });
  }, []);

  /* ── AI 추천 적용 (가격 대비 가치 분석 포함) ── */
  const applyRecommend = useCallback(() => {
    setAnalyzeLoading(true);
    setTimeout(() => {
      const next = {};
      allKeys.forEach(k => {
        const leafKey = k.split(SEP).pop();
        next[k] = getPlanDefault(leafKey, selectedPlan);
      });

      setPerms(next);
      const result = computeStatsFromPerms(next, selectedPlan);
      setRecommendApplied(true);
      setStats(result.stats);
      setValueAnalysis(result.analysis);
      setOpenSections({ [MENU_TREE[0].key]: true });
      setAnalyzeLoading(false);
    }, 600);
  }, [selectedPlan, allKeys, computeStatsFromPerms]);

  /* ── 저장 (localStorage 캐시 + 서버 동기화 + BroadcastChannel) ── */
  const save = async () => {
    // ① 항상 localStorage에 먼저 캐시 (서버 성공 여부와 무관 → 플랜 전환 시 복원 보장)
    try {
      localStorage.setItem(`geniego_perms_${selectedPlan}`, JSON.stringify(perms));
    } catch {}
    try {
      const existing = JSON.parse(localStorage.getItem("geniego_menu_features") || "{}");
      existing[selectedPlan] = buildFeatureSummary(perms);
      localStorage.setItem("geniego_menu_features", JSON.stringify(existing));
      localStorage.setItem("geniego_menu_features_ts", String(Date.now()));
    } catch {}

    // BroadcastChannel로 SubscriptionPricing에 실시간 알림
    try {
      bcRef.current?.postMessage({
        type: "menu_access_updated",
        plan: selectedPlan,
        permissions: perms,
        featureSummary: buildFeatureSummary(perms),
        timestamp: Date.now(),
      });
    } catch {}

    // 커스텀 이벤트 발행 (같은 탭 동기화)
    window.dispatchEvent(new CustomEvent("menu-access-saved", { detail: { plan: selectedPlan } }));

    // ② 서버 저장 시도
    try {
      const payload = { plan: selectedPlan, permissions: perms };
      const d = await (await fetch("/api/auth/pricing/menu-access", {
        method: "POST", headers: hdrs, body: JSON.stringify(payload),
      })).json();
      if (d.ok) {
        // 구독 요금제 관리(SubscriptionPricing)의 메뉴 데이터와 동기화
        try {
          const menuItems = [];
          Object.entries(perms).forEach(([key, enabled]) => {
            if (enabled) {
              menuItems.push({
                menu_key: key, menu_path: key, plan: selectedPlan,
                cycle: "monthly", price_krw: 0, discount_pct: 0,
              });
            }
          });
          await fetch("/api/auth/pricing/plans", {
            method: "POST", headers: hdrs,
            body: JSON.stringify({ items: menuItems, sync_mode: "menu_access" }),
          });
        } catch {}

        setMsg(`✅ ${selectedPlan.toUpperCase()} 권한 매트릭스 저장 완료! 구독 요금제 관리와 실시간 동기화되었습니다.`);
        setMsgType("ok");
        setSaved(true); setTimeout(() => setSaved(false), 3000);
        if (reloadMenuAccess) reloadMenuAccess();
      } else {
        // 서버 저장 실패해도 localStorage에는 이미 저장됨
        setMsg(`✅ ${selectedPlan.toUpperCase()} 권한이 로컬에 저장되었습니다. (서버 동기화: ${d.error || "재시도 필요"})`);
        setMsgType("ok");
        setSaved(true); setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // 네트워크 오류지만 localStorage에는 이미 저장됨
      setMsg(`✅ ${selectedPlan.toUpperCase()} 권한이 로컬에 저장되었습니다. (서버 연결 재시도 필요)`);
      setMsgType("ok");
    }
  };

  /* ── featureSummary 빌더 (저장 시 동기화 데이터 생성) ── */
  function buildFeatureSummary(permData) {
    const summary = [];
    MENU_TREE.forEach(sec => {
      const secInfo = { key: sec.key, label: sec.label, sections: [] };
      sec.items.forEach(item => {
        (item.subitems || []).forEach(sub => {
          const enabledLeafs = [];
          const disabledLeafs = [];
          (sub.leafItems || []).forEach(lf => {
            const fullKey = `${sec.key}${SEP}${item.key}${SEP}${sub.key}${SEP}${lf.key}`;
            if (permData[fullKey]) {
              enabledLeafs.push({ key: lf.key, label: lf.label, tier: getFeatureTier(lf.key), value: getFeatureValue(lf.key) });
            } else {
              disabledLeafs.push({ key: lf.key, label: lf.label, tier: getFeatureTier(lf.key), value: getFeatureValue(lf.key) });
            }
          });
          if (enabledLeafs.length > 0 || disabledLeafs.length > 0) {
            secInfo.sections.push({ itemLabel: item.label, subLabel: sub.label, enabled: enabledLeafs, disabled: disabledLeafs });
          }
        });
      });
      if (secInfo.sections.length > 0) summary.push(secInfo);
    });
    return summary;
  }

  /* ── 아코디언 토글 ── */
  const toggleSection = (key) => {
    setOpenSections(prev => {
      const next = {};
      Object.keys(prev).forEach(k => { if (k !== key) next[k] = false; });
      next[key] = !prev[key];
      return next;
    });
  };

  /* ── 섹션/아이템 체크 상태 ── */
  const isAllChecked = (keys) => keys.length > 0 && keys.every(k => perms[k]);
  const isSomeChecked = (keys) => keys.some(k => perms[k]) && !isAllChecked(keys);

  /* ── 통계 ── */
  const enabledCount = useMemo(() => allKeys.filter(k => perms[k]).length, [perms, allKeys]);

  /* ── 선택된 메뉴 기반 동적 기능 요약 생성 ── */
  const featureSummary = useMemo(() => buildFeatureSummary(perms), [perms]);

  const pc = PLAN_COLORS[selectedPlan] || "#4f8ef7";

  return (
    <div style={{ display:"grid", gap:16 }}>
      {/* ── 헤더 ── */}
      <div style={{
        padding:"24px", borderRadius:18,
        background:`linear-gradient(135deg,${pc}12,${pc}06)`,
        border:`1px solid ${pc}40`,
      }}>
        <div style={{ fontWeight:900, fontSize:17, marginBottom:6, display:"flex", alignItems:"center", gap:10 }}>
          🔐 플랜별 메뉴 접근 권한 매트릭스
          <span style={{ fontSize:10, padding:"3px 10px", borderRadius:99, background:`${pc}1A`, border:`1px solid ${pc}44`, color:pc, fontWeight:700 }}>
            {enabledCount}/{allKeys.length} 활성
          </span>
          <span style={{ fontSize:10, padding:"3px 10px", borderRadius:99, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#4ade80", fontWeight:700 }}>
            🔄 실시간 동기화
          </span>
        <div style={{ fontSize:11, color:"#7c8fa8", marginTop:6, lineHeight:1.7 }}>
          플랫폼 전체 메뉴를 대메뉴 → 중메뉴 → 하위메뉴 → 최하위메뉴까지 5단계로 관리합니다.
          <br/>⚠️ <strong style={{ color:"#ef4444" }}>관리자 센터(⚙ 코어 관리자 환경)는 관리자 전용이므로 구독 플랜에 포함되지 않습니다.</strong>
          <br/>💡 <strong style={{ color:"#4ade80" }}>저장 시 재무 및 정산 → 요금제 「모든 기능보기」에 자동으로 실시간 동기화됩니다.</strong>
      </div>

      {msg && (
        <div style={{
          padding:"10px 14px", borderRadius:8, fontSize:12, fontWeight:700,
          background: msgType === "ok" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border:`1px solid ${msgType === "ok" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: msgType === "ok" ? "#22c55e" : "#ef4444",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <span>{msg}</span>
          <button onClick={() => setMsg("")} style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:14 }}>✕</button>
      )}

      {/* ── 플랜 선택 카드 (실시간 요금 포함) ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
        {PLANS.map(plan => (
          <button key={plan.id} onClick={() => setSelectedPlan(plan.id)} style={{
            padding:"18px", borderRadius:16, border:"none", cursor:"pointer", textAlign:"left",
            background: selectedPlan === plan.id ? `${plan.color}1A` : "rgba(255,255,255,0.02)",
            outline:`2px solid ${selectedPlan === plan.id ? plan.color : "rgba(255,255,255,0.08)"}`,
            position:"relative", transition:"all 150ms",
          }}>
            {plan.popular && (
              <div style={{ position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)", background:"#a855f7", color: 'var(--text-1)', fontSize:8, fontWeight:800, padding:"2px 8px", borderRadius:99 }}>인기</div>
            )}
            <div style={{ fontWeight:800, fontSize:15, color:plan.color, marginBottom:2 }}>{plan.emoji} {plan.label}</div>
            <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.5 }}>{plan.desc}</div>
            {livePrice[plan.id] && (
              <div style={{ marginTop:6, fontSize:12, fontWeight:800, color:plan.color, display:"flex", alignItems:"center", gap:6 }}>
                {livePrice[plan.id].label}
                <span style={{ fontSize:8, padding:"1px 6px", borderRadius:4, background:`${plan.color}15`, color:plan.color, border:`1px solid ${plan.color}30` }}>실시간</span>
            </div>
            )}
            {selectedPlan === plan.id && <div style={{ marginTop:6, fontSize:10, color:plan.color, fontWeight:800 }}>✓ 선택됨</div>}
          </button>
        ))}

      {/* ── 플랜별 상세 서비스 설명 ── */}
      <PlanServiceDetail plan={selectedPlan} pc={pc} livePrice={livePrice} />

      {/* ── AI 추천 + 액션 바 ── */}
      <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
        <button onClick={applyRecommend} disabled={analyzeLoading} style={{
          padding:"12px 28px", borderRadius:10, border:"none", cursor: analyzeLoading ? "not-allowed" : "pointer",
          background: analyzeLoading ? "rgba(99,102,241,0.3)" : `linear-gradient(135deg,${pc},${pc}bb)`,
          color: 'var(--text-1)', fontWeight:800, fontSize:13,
          boxShadow: analyzeLoading ? "none" : `0 4px 16px ${pc}44`,
          display:"flex", alignItems:"center", gap:8,
        }}>
          {analyzeLoading
            ? <>⚙ 구독 요금 대비 가치 분석 중...</>
            : <>🤖 {selectedPlan.toUpperCase()} 플랜 AI 추천 자동 적용</>
          }
        </button>
        <button onClick={() => setBulk(allKeys, true)} style={{
          padding:"8px 16px", borderRadius:8, border:"1px solid rgba(34,197,94,0.3)",
          background:"rgba(34,197,94,0.08)", color:"#4ade80", fontWeight:700, fontSize:11, cursor:"pointer",
        }}>✅ 전체 선택</button>
        <button onClick={() => setBulk(allKeys, false)} style={{
          padding:"8px 16px", borderRadius:8, border:"1px solid rgba(239,68,68,0.3)",
          background:"rgba(239,68,68,0.08)", color:"#f87171", fontWeight:700, fontSize:11, cursor:"pointer",
        }}>🚫 전체 해제</button>

        {stats && (
          <>
            <span style={{ fontSize:10, padding:"4px 10px", borderRadius:99, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#4ade80", fontWeight:700 }}>
              ✅ {stats.enabled}개 활성
            </span>
            <span style={{ fontSize:10, padding:"4px 10px", borderRadius:99, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontWeight:700 }}>
              🔒 {stats.disabled}개 비활성
            </span>
          </>
        )}

      {/* ── 가격 대비 가치 분석 결과 패널 ── */}
      {valueAnalysis && (
        <ValueAnalysisPanel analysis={valueAnalysis} plan={selectedPlan} pc={pc} livePrice={livePrice} />
      )}

      {/* ── 아코디언 메뉴 트리 ── */}
      <div style={{ display:"grid", gap:4 }}>
        {MENU_TREE.map(sec => {
          const secKeys = sectionLeafKeys(sec);
          const isOpen = openSections[sec.key];
          const secChecked = isAllChecked(secKeys);
          const secIndet = isSomeChecked(secKeys);
          const secCount = secKeys.filter(k => perms[k]).length;

          return (
            <div key={sec.key} style={{ borderRadius:12, overflow:"hidden", border: '1px solid var(--border)' }}>
              {/* ── 대메뉴 (L1) 아코디언 헤더 ── */}
              <div
                onClick={() => toggleSection(sec.key)}
                style={{
                  padding:"14px 18px", cursor:"pointer",
                  background: isOpen ? `${pc}0C` : "rgba(15,23,42,0.6)",
                  display:"flex", alignItems:"center", gap:12,
                  borderBottom: isOpen ? `1px solid ${pc}25` : "none",
                  transition:"all 200ms",
                }}
              >
                <span style={{ fontSize:14, transition:"transform 200ms", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                <input
                  type="checkbox"
                  checked={secChecked}
                  ref={el => { if (el) el.indeterminate = secIndet; }}
                  onChange={e => { e.stopPropagation(); setBulk(secKeys, !secChecked); }}
                  onClick={e => e.stopPropagation()}
                  style={{ width:16, height:16, cursor:"pointer", accentColor:pc }}
                />
                <span style={{ fontWeight:800, fontSize:13, color: isOpen ? "#e2e8f0" : "#94a3b8", flex:1 }}>{sec.label}</span>
                <span style={{
                  fontSize:9, padding:"3px 10px", borderRadius:99, fontWeight:700,
                  background: secCount === secKeys.length ? "rgba(34,197,94,0.1)" : secCount > 0 ? `${pc}15` : "rgba(255,255,255,0.04)",
                  color: secCount === secKeys.length ? "#4ade80" : secCount > 0 ? pc : "#475569",
                  border:`1px solid ${secCount === secKeys.length ? "rgba(34,197,94,0.25)" : secCount > 0 ? `${pc}30` : "rgba(255,255,255,0.08)"}`,
                }}>
                  {secCount}/{secKeys.length}
                </span>

              {/* ── 중메뉴 이하 (L2~L5) ── */}
              {isOpen && (
                <div style={{ padding:"0 6px 8px 6px", background:"rgba(15,23,42,0.3)" }}>
                  {sec.items.map(item => {
                    const iKeys = itemLeafKeys(sec, item);
                    const iChecked = isAllChecked(iKeys);
                    const iIndet = isSomeChecked(iKeys);
                    return (
                      <div key={item.key} style={{ margin:"6px 0" }}>
                        <div style={{
                          padding:"10px 14px", borderRadius:10,
                          background: 'var(--surface)', display:"flex", alignItems:"center", gap:10,
                          borderLeft:`3px solid ${pc}50`,
                        }}>
                          <input type="checkbox" checked={iChecked}
                            ref={el => { if (el) el.indeterminate = iIndet; }}
                            onChange={() => setBulk(iKeys, !iChecked)}
                            style={{ width:15, height:15, cursor:"pointer", accentColor:pc }} />
                          <span style={{ fontWeight:700, fontSize:12, color:"#c4b5fd", flex:1 }}>📂 {item.label}</span>
                          <span style={{ fontSize:9, color:"#475569" }}>{iKeys.filter(k => perms[k]).length}/{iKeys.length}</span>

                        {(item.subitems||[]).map(sub => {
                          const sKeys = (sub.leafItems||[]).map(lf => `${sec.key}${SEP}${item.key}${SEP}${sub.key}${SEP}${lf.key}`);
                          const sChecked = isAllChecked(sKeys);
                          const sIndet = isSomeChecked(sKeys);
                          return (
                            <div key={sub.key} style={{ marginLeft:20, marginTop:4 }}>
                              <div style={{
                                padding:"7px 12px", borderRadius:8,
                                display:"flex", alignItems:"center", gap:9,
                                background: 'var(--surface)',
                                borderLeft:"2px solid rgba(255,255,255,0.08)",
                              }}>
                                <input type="checkbox" checked={sChecked}
                                  ref={el => { if (el) el.indeterminate = sIndet; }}
                                  onChange={() => setBulk(sKeys, !sChecked)}
                                  style={{ width:14, height:14, cursor:"pointer", accentColor:pc }} />
                                <span style={{ fontWeight:600, fontSize:11, color:"#a5b4fc" }}>📄 {sub.label}</span>
                                <span style={{ fontSize:8, color:"#475569", marginLeft:"auto" }}>{sKeys.filter(k => perms[k]).length}/{sKeys.length}</span>

                              <div style={{ marginLeft:24, display:"grid", gap:2, marginTop:2 }}>
                                {(sub.leafItems||[]).map(lf => {
                                  const fullKey = `${sec.key}${SEP}${item.key}${SEP}${sub.key}${SEP}${lf.key}`;
                                  const checked = !!perms[fullKey];
                                  const isProOnly = PRO_ONLY.has(lf.key);
                                  const isEntOnly = ENT_ONLY.has(lf.key);
                                  const fv = getFeatureValue(lf.key);
                                  return (
                                    <label key={lf.key} style={{
                                      display:"flex", alignItems:"center", gap:8,
                                      padding:"5px 10px", borderRadius:6, cursor:"pointer",
                                      background: checked ? `${pc}08` : "transparent",
                                      transition:"all 100ms",
                                    }}
                                      onMouseEnter={e => e.currentTarget.style.background = checked ? `${pc}12` : "rgba(255,255,255,0.03)"}
                                      onMouseLeave={e => e.currentTarget.style.background = checked ? `${pc}08` : "transparent"}
                                    >
                                      <input type="checkbox" checked={checked} onChange={() => toggle(fullKey)}
                                        style={{ width:13, height:13, cursor:"pointer", accentColor:pc }} />
                                      <span style={{ fontSize:11, color: checked ? "#e2e8f0" : "#64748b", fontWeight: checked ? 600 : 400 }}>
                                        {lf.label}
                                      </span>
                                      {fv === "high" && <span style={{ fontSize:6, padding:"1px 4px", borderRadius:3, background:"rgba(34,197,94,0.15)", color:"#4ade80", fontWeight:800, marginLeft:"auto" }}>HIGH</span>}
                                      {fv === "premium" && !isEntOnly && !isProOnly && <span style={{ fontSize:6, padding:"1px 4px", borderRadius:3, background:"rgba(79,142,247,0.15)", color:"#60a5fa", fontWeight:800, marginLeft:"auto" }}>PREMIUM</span>}
                                      {isEntOnly && <span style={{ fontSize:7, padding:"1px 5px", borderRadius:4, background:"rgba(245,158,11,0.15)", color:"#f59e0b", fontWeight:700, marginLeft: fv !== "high" && fv !== "premium" ? "auto" : 0 }}>ENT</span>}
                                      {isProOnly && !isEntOnly && <span style={{ fontSize:7, padding:"1px 5px", borderRadius:4, background:"rgba(168,85,247,0.15)", color:"#a855f7", fontWeight:700, marginLeft: fv !== "high" && fv !== "premium" ? "auto" : 0 }}>PRO+</span>}
                                    </label>
                                  );
                                })}
                            </div>
                          
                            </div>
);
                        })}
                    
                          </div>
);
                  })}
              )}
          
                        </div>
                      </div>
              </div>
            </div>
);
        })}

      {/* ══════════════════════════════════════════════════════════════
         초엔터프라이즈급 모든 기능보기 패널
         ══════════════════════════════════════════════════════════════ */}
      <div style={{
        borderRadius:16, overflow:"hidden",
        border:`1px solid ${pc}30`,
        background:`linear-gradient(135deg,${pc}06,${pc}03)`,
      }}>
        <button onClick={() => setShowFeatures(!showFeatures)} style={{
          width:"100%", padding:"18px 22px", border:"none", cursor:"pointer",
          background:"transparent", display:"flex", alignItems:"center", gap:12, textAlign:"left",
        }}>
          <span style={{ fontSize:22 }}>📋</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:15, color:pc }}>
              {selectedPlan.toUpperCase()} 플랜 — 현재 선택된 모든 기능 보기
            <div style={{ fontSize:10, color:"#7c8fa8", marginTop:3 }}>
              AI 추천 또는 수동 선택한 {enabledCount}개 메뉴의 상세 기능 설명 · 저장 시 요금제 「모든 기능보기」에 실시간 반영
          </div>
          <span style={{ fontSize:10, padding:"5px 14px", borderRadius:99, background:`${pc}15`, border:`1px solid ${pc}30`, color:pc, fontWeight:700 }}>
            {showFeatures ? "접기 ▲" : "모든 기능 보기 ▼"}
          </span>
        </button>

        {showFeatures && (
          <div style={{ padding:"0 18px 18px" }}>
            {/* 뷰 모드 토글 */}
            <div style={{ display:"flex", gap:6, marginBottom:14 }}>
              {[
                { id:"detailed", label:"📋 상세 보기", desc:"카테고리별 기능 목록" },
                { id:"compact", label:"📊 요약 보기", desc:"카테고리별 통계" },
                { id:"comparison", label:"🔄 플랜 비교", desc:"3플랜 기능 비교" },
              ].map(mode => (
                <button key={mode.id} onClick={() => setFeatureViewMode(mode.id)} style={{
                  flex:1, padding:"10px", borderRadius:10, border:"none", cursor:"pointer",
                  background: featureViewMode === mode.id ? `${pc}18` : "rgba(255,255,255,0.02)",
                  outline:`1px solid ${featureViewMode === mode.id ? `${pc}50` : "rgba(255,255,255,0.06)"}`,
                  textAlign:"left",
                }}>
                  <div style={{ fontSize:11, fontWeight:700, color: featureViewMode === mode.id ? pc : "#94a3b8" }}>{mode.label}</div>
                  <div style={{ fontSize:9, color:"#475569", marginTop:1 }}>{mode.desc}</div>
                </button>
              ))}

            {/* 상세 보기 */}
            {featureViewMode === "detailed" && (
              <DetailedFeatureView featureSummary={featureSummary} pc={pc} />
            )}

            {/* 요약 보기 */}
            {featureViewMode === "compact" && (
              <CompactFeatureView featureSummary={featureSummary} pc={pc} allKeys={allKeys} perms={perms} />
            )}

            {/* 플랜 비교 보기 */}
            {featureViewMode === "comparison" && (
              <ComparisonFeatureView selectedPlan={selectedPlan} allKeys={allKeys} perms={perms} />
            )}
        )}

      {/* ── 하단 저장 바 ── */}
      <div style={{
        padding:"18px 22px", borderRadius:14,
        background:`linear-gradient(135deg,${pc}0C,${pc}06)`,
        border:`1px solid ${pc}30`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color: "var(--text-1)" }}>
            💡 {selectedPlan.toUpperCase()} 플랜: {enabledCount}개 메뉴 활성 / {allKeys.length}개 전체
          <div style={{ fontSize:10, color:"#64748b", marginTop:3 }}>
            저장 시 구독 요금제 관리 「모든 기능보기」와 자동 동기화됩니다
        </div>
        <button onClick={save} style={{
          padding:"13px 36px", borderRadius:12, border:"none", cursor:"pointer",
          background: saved ? "rgba(34,197,94,0.2)" : `linear-gradient(135deg,${pc},${pc}bb)`,
          color: 'var(--text-1)', fontWeight:800, fontSize:14,
          boxShadow: saved ? "none" : `0 6px 20px ${pc}44`,
        }}>
          {saved ? "✓ 저장 완료!" : "💾 권한 저장 & 동기화"}
        </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
 style={{
      padding:"20px", borderRadius:16,
      background:`linear-gradient(135deg,${pc}08,${pc}04)`,
      border:`1px solid ${pc}35`,
    }}>
      <div style={{ fontWeight:900, fontSize:14, color:pc, marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
        📊 구독 요금 대비 가치 분석 리포트
        <span style={{ fontSize:9, padding:"2px 8px", borderRadius:99, background:"rgba(34,197,94,0.12)", color:"#4ade80", border:"1px solid rgba(34,197,94,0.25)", fontWeight:700 }}>
          AI 분석 완료
        </span>

      {/* KPI 스트립 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"월 구독료", value: monthlyPrice > 0 ? `₩${monthlyPrice.toLocaleString()}` : "미등록", color:"#4f8ef7", icon:"💰" },
          { label:"기능당 비용", value: perFeature > 0 ? `₩${perFeature.toLocaleString()}` : "-", color:"#a855f7", icon:"📐" },
          { label:"기능 커버리지", value:`${coverageRate}%`, color:"#22c55e", icon:"📈" },
          { label:"가치 점수", value:`${valueScore}/100`, color:"#f59e0b", icon:"⭐" },
          { label:"프리미엄 기능", value:`${highCount + premiumCount}개`, color:"#ec4899", icon:"💎" },
        ].map((kpi, i) => (
          <div key={i} style={{
            padding:"12px 10px", borderRadius:12, textAlign:"center",
            background: 'var(--surface)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize:16, marginBottom:4 }}>{kpi.icon}</div>
            <div style={{ fontSize:16, fontWeight:900, color:kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize:9, color:"#7c8fa8", marginTop:2 }}>{kpi.label}</div>
        ))}

      {/* 섹션별 활성률 바 */}
      <div style={{ display:"grid", gap:6 }}>
        {Object.entries(sectionStats).map(([secKey, data]) => {
          const sec = MENU_TREE.find(s => s.key === secKey);
          if (!sec) return null;
          const pct = data.total > 0 ? Math.round((data.enabled / data.total) * 100) : 0;
          return (
            <div key={secKey} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:10, fontWeight:700, color:"#94a3b8", width:140, flexShrink:0, textOverflow:"ellipsis", overflow:"hidden", whiteSpace:"nowrap" }}>{sec.label}</span>
              <div style={{ flex:1, height:8, borderRadius:4, background: 'var(--surface)', overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", borderRadius:4, background:`linear-gradient(90deg,${pc},${pc}88)`, transition:"width 0.5s ease" }} />
              <span style={{ fontSize:9, fontWeight:700, color:pc, width:55, textAlign:"right" }}>{data.enabled}/{data.total}</span>
              <span style={{ fontSize:9, fontWeight:700, color: pct === 100 ? "#4ade80" : pct > 50 ? pc : "#f87171", width:35, textAlign:"right" }}>{pct}%</span>
          
          
            </div>
);
        })}
                    </div>
                </div>
            </div>
        </div>
    </div>
/* ═══════════════════════════════════════
   DetailedFeatureView — 상세 기능 보기
   ══════════════════════════════════════════════════════════════════ */
function DetailedFeatureView({ featureSummary, pc }) {
  return (
    <div style={{ display:"grid", gap:10 }}>
      {featureSummary.map((secInfo, si) => {
        const totalEnabled = secInfo.sections.reduce((s, sec) => s + sec.enabled.length, 0);
        const totalDisabled = secInfo.sections.reduce((s, sec) => s + sec.disabled.length, 0);
        return (
          <div key={si} style={{
            padding:"16px", borderRadius:12,
            background: 'var(--surface)', border: '1px solid var(--border)',
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <span style={{ fontWeight:800, fontSize:13, color: "var(--text-1)" }}>{secInfo.label}</span>
              <span style={{ fontSize:9, padding:"2px 8px", borderRadius:99, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#4ade80", fontWeight:700 }}>
                ✅ {totalEnabled}개 활성
              </span>
              {totalDisabled > 0 && (
                <span style={{ fontSize:9, padding:"2px 8px", borderRadius:99, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", color:"#f87171", fontWeight:700 }}>
                  🔒 {totalDisabled}개 제한
                </span>
              )}
              <span style={{
                fontSize:8, padding:"2px 6px", borderRadius:4, marginLeft:"auto",
                background: totalDisabled === 0 ? "rgba(34,197,94,0.15)" : `${pc}12`,
                color: totalDisabled === 0 ? "#4ade80" : pc,
                fontWeight:800, border:`1px solid ${totalDisabled === 0 ? "rgba(34,197,94,0.3)" : `${pc}30`}`,
              }}>
                {totalDisabled === 0 ? "✅ FULL ACCESS" : `${Math.round((totalEnabled/(totalEnabled+totalDisabled))*100)}% 커버`}
              </span>
            {secInfo.sections.map((sub, sj) => (
              <div key={sj} style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginBottom:4 }}>
                  📂 {sub.itemLabel} → {sub.subLabel}
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {sub.enabled.map((f, fi) => (
                    <span key={fi} style={{
                      fontSize:9, padding:"4px 10px", borderRadius:6,
                      background: f.value === "high" ? "rgba(34,197,94,0.25)" : f.value === "premium" ? "rgba(79,142,247,0.25)" : "rgba(59,130,246,0.18)",
                      border: `1px solid ${f.value === "high" ? "rgba(34,197,94,0.55)" : f.value === "premium" ? "rgba(79,142,247,0.55)" : "rgba(59,130,246,0.45)"}`,
                      color: f.value === "high" ? "#86efac" : f.value === "premium" ? "#93c5fd" : "#93c5fd",
                      fontWeight:600, textShadow:`0 0 8px ${f.value === "high" ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)"}`,
                    }}>
                      {f.value === "high" ? "⭐" : "✅"} {f.label}
                    </span>
                  ))}
                  {sub.disabled.map((f, fi) => {
                    const tierTag = f.tier === "enterprise" ? "Enterprise" : f.tier === "pro" ? "Pro 이상" : "";
                    return (
                      <span key={"d"+fi} style={{
                        fontSize:9, padding:"4px 10px", borderRadius:6,
                        background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)",
                        color:"#fca5a5", fontWeight:600,
                      }}>
                        🔒 {f.label}{tierTag ? ` — ${tierTag}` : ""}
                      </span>
                    );
                  })}
              </div>
            ))}
        
              </div>
            </div>
          </div>
);
      })}
    </div>
/* ══════════════════════════════════════════════════════
   CompactFeatureView — 요약 통계 보기
   ══════════════════════════════════════════════════════════════════ */
function CompactFeatureView({ featureSummary, pc, allKeys, perms }) {
  const totalEnabled = allKeys.filter(k => perms[k]).length;
  const totalDisabled = allKeys.length - totalEnabled;

  return (
    <div style={{ display:"grid", gap:12 }}>
      {/* 전체 요약 */}
      <div style={{
        display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12,
        padding:"16px", borderRadius:12, background: 'var(--surface)', border: '1px solid var(--border)',
      }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28, fontWeight:900, color:"#4ade80" }}>{totalEnabled}</div>
          <div style={{ fontSize:10, color:"#7c8fa8" }}>활성 기능</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28, fontWeight:900, color:"#f87171" }}>{totalDisabled}</div>
          <div style={{ fontSize:10, color:"#7c8fa8" }}>비활성 기능</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28, fontWeight:900, color:pc }}>{Math.round((totalEnabled / allKeys.length) * 100)}%</div>
          <div style={{ fontSize:10, color:"#7c8fa8" }}>커버리지</div>
      </div>

      {/* 카테고리별 도넛차트 스타일 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8 }}>
        {featureSummary.map((sec, si) => {
          const en = sec.sections.reduce((s, sub) => s + sub.enabled.length, 0);
          const dis = sec.sections.reduce((s, sub) => s + sub.disabled.length, 0);
          const total = en + dis;
          const pct = total > 0 ? Math.round((en / total) * 100) : 0;
          return (
            <div key={si} style={{
              padding:"14px 12px", borderRadius:12, textAlign:"center",
              background: 'var(--surface)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize:10, fontWeight:700, color: "var(--text-1)", marginBottom:6, textOverflow:"ellipsis", overflow:"hidden", whiteSpace:"nowrap" }}>{sec.label}</div>
              <div style={{ fontSize:24, fontWeight:900, color: pct === 100 ? "#4ade80" : pct > 50 ? pc : "#f87171" }}>{pct}%</div>
              <div style={{ fontSize:9, color:"#7c8fa8", marginTop:2 }}>{en}/{total} 기능</div>
              <div style={{ marginTop:6, height:4, borderRadius:2, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", borderRadius:2, background: pct === 100 ? "#4ade80" : pc, transition:"width 0.3s" }} />
            </div>
          
          
);
        })}
                    </div>
                </div>
            </div>
        </div>
    </div>
/* ═════════════════════════════════════════
   ComparisonFeatureView — 3플랜 기능 비교 매트릭스
   ══════════════════════════════════════════════════════════════════ */
function ComparisonFeatureView({ selectedPlan, allKeys }) {
  const planData = useMemo(() => {
    const result = {};
    PLANS.forEach(plan => {
      let count = 0;
      allKeys.forEach(k => {
        const leafKey = k.split(SEP).pop();
        if (getPlanDefault(leafKey, plan.id)) count++;
      });
      result[plan.id] = count;
    });
    return result;
  }, [allKeys]);

  return (
    <div style={{ display:"grid", gap:10 }}>
      {/* 플랜별 총 기능 수 비교 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
        {PLANS.map(plan => {
          const count = planData[plan.id];
          const pct = Math.round((count / allKeys.length) * 100);
          const isCurrent = selectedPlan === plan.id;
          return (
            <div key={plan.id} style={{
              padding:"18px 14px", borderRadius:14, textAlign:"center",
              background: isCurrent ? `${plan.color}15` : "rgba(255,255,255,0.02)",
              border:`2px solid ${isCurrent ? plan.color : "rgba(255,255,255,0.06)"}`,
              transition:"all 200ms",
            }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{plan.emoji}</div>
              <div style={{ fontSize:14, fontWeight:900, color:plan.color }}>{plan.label}</div>
              <div style={{ fontSize:32, fontWeight:900, color: "var(--text-1)", marginTop:6 }}>{count}</div>
              <div style={{ fontSize:10, color:"#7c8fa8" }}>기능 ({pct}%)</div>
              <div style={{ marginTop:8, height:6, borderRadius:3, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", borderRadius:3, background: `linear-gradient(90deg,${plan.color},${plan.color}88)` }} />
              {isCurrent && <div style={{ marginTop:6, fontSize:9, color:plan.color, fontWeight:800 }}>✓ 현재 선택</div>}
          

  </div>
);
        })}
          </div>


      {/* 섹션별 비교 테이블 */}
      <div style={{ borderRadius:12, overflow:"hidden", border: '1px solid var(--border)' }}>
        <div style={{
          display:"grid", gridTemplateColumns:"1fr repeat(3, 80px)",
          padding:"10px 16px", background: 'var(--surface)',
          fontSize:10, fontWeight:700, color:"#7c8fa8",
        }}>
          <span>카테고리</span>
          {PLANS.map(p => <span key={p.id} style={{ textAlign:"center", color:p.color }}>{p.label}</span>)}
        {MENU_TREE.map(sec => {
          const secKeys = sectionLeafKeys(sec);
          return (
            <div key={sec.key} style={{
              display:"grid", gridTemplateColumns:"1fr repeat(3, 80px)",
              padding:"8px 16px", borderTop:"1px solid rgba(255,255,255,0.03)",
              alignItems:"center",
            }}>
              <span style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>{sec.label}</span>
              {PLANS.map(plan => {
                const count = secKeys.filter(k => {
                  const leafKey = k.split(SEP).pop();
                  return getPlanDefault(leafKey, plan.id);
                }).length;
                const pct = secKeys.length > 0 ? Math.round((count / secKeys.length) * 100) : 0;
                return (
                  <div key={plan.id} style={{ textAlign:"center" }}>
                    <span style={{
                      fontSize:10, fontWeight:700,
                      color: pct === 100 ? "#4ade80" : pct > 50 ? plan.color : "#f87171",
                    }}>
                      {count}/{secKeys.length}
                    </span>
                    <div style={{ fontSize:8, color:"#475569" }}>{pct}%</div>
                
);
              })}
          
            </div>
);
        })}
        </div>
    </div>
  PlanServiceDetail — 플랜별 제공 서비스 상세 설명
   ══════════════════════════════════════════════════════════════════ */
const PLAN_DETAIL = {
  growth: {
    title: "📈 Growth 플랜",
    subtitle: "마케팅 성장 플랜",
    tagline: "국내 커머스 채널과 기본 CRM 자동화로 매출을 성장시키세요.",
    sections: [
      { icon:"🏠", label:"홈 대시보드", access:"전체 허용", reason:"핵심 KPI 위젯·실시간 모니터링·알림 피드를 포함한 대시보드 전체 기능을 제공합니다.", items:["핵심 지표 위젯","실시간 모니터링","빠른 링크","알림 피드"] },
      { icon:"🚀", label:"AI 마케팅 자동화", access:"핵심 허용", reason:"AI 광고 소재 생성·캠페인 설정/관리·콘텐츠 캘린더·예산 플래너를 제공합니다. 고객 여정 빌더·AI 예측(이탈/LTV)은 Pro 이상에서 제공합니다.",
        items:["AI 광고 소재 생성","캠페인 설정·관리","A/B 테스트","콘텐츠 캘린더","예산 플래너·ROI 계산기"],
        excluded:["고객 여정 빌더 — Pro 이상","AI 이탈/LTV 예측 — Pro 이상","그래프 스코어·NBA — Pro 이상"] },
      { icon:"📣", label:"광고·채널 분석", access:"기본 허용", reason:"광고 성과 요약·채널별/상품별 분석·ROAS·채널 KPI(CTR/CVR/CPA)를 제공합니다.",
        items:["성과 요약·채널별·상품별 분석","ROAS 분석","노출수·CTR·전환율·CPA/CPC"],
        excluded:["마케팅 인텔리전스(키워드·경쟁사) — Pro 이상","어트리뷰션 기여도 분석 — Pro 이상","인플루언서 마케팅 — Pro 이상","디지털 셸프·글로벌 마켓 리스크 — Pro 이상"] },
      { icon:"👤", label:"고객 CRM", access:"핵심 허용", reason:"고객 DB·360도 뷰·RFM 분석·이메일/카카오/SMS 마케팅·웹 팝업을 제공합니다.",
        items:["고객 DB·360도 뷰·태그 관리","RFM 분석·세그먼트 규칙","이메일 캠페인·A/B 테스트","카카오 알림톡/친구톡","SMS/LMS 문자 마케팅","웹 팝업·이탈 방지"],
        excluded:["WhatsApp 비즈니스 — Pro 이상","인스타그램/페이스북 DM — Pro 이상","LINE 채널 연동 — Pro 이상"] },
      { icon:"🛒", label:"커머스·물류", access:"핵심 허용", reason:"쿠팡·네이버·카페24 등 국내 채널 연동·주문 허브·WMS 재고 관리·상품 카탈로그를 제공합니다.",
        items:["쿠팡·네이버·카페24 채널 연동","주문 통합 허브·클레임 관리","WMS 재고·입출고 관리","상품 카탈로그 싱크"],
        excluded:["쇼피파이·아마존·라쿠텐·테무 — Pro 이상","AI 가격 최적화 — Pro 이상","서플라이 체인 추적 — Enterprise 전용"] },
      { icon:"📊", label:"퍼포먼스·BI", access:"기본 허용", reason:"성과 요약·P&L 손익·커스텀 대시보드·엑셀 다운로드를 제공합니다.",
        items:["성과 요약·채널별/상품별 성과","P&L 손익 분석","AI 성장 조언","커스텀 대시보드·엑셀 다운로드"],
        excluded:["이상치 감지·자동 보고서 — Pro 이상","API 데이터 연동·대시보드 공유 — Pro 이상"] },
      { icon:"💳", label:"정산·재무", access:"기본 허용", reason:"정산 내역 조회·결제 내역·구독 관리를 제공합니다.",
        items:["정산 내역 조회·월별 정산","결제 내역·영수증","내 구독 관리·플랜 업그레이드"],
        excluded:["전자 세금계산서 발급 — Pro 이상","지출 결재 관리 — Pro 이상"] },
      { icon:"🤖", label:"자동화·AI 룰", access:"온보딩만", reason:"온보딩(시작 가이드·마법사 설정)을 제공합니다.",
        items:["첫 세팅 가이드·마법사·튜토리얼"],
        excluded:["AI 룰 엔진 — Pro 이상","알람 조건·매크로 — Pro 이상","Writeback(DB 갱신·롤백) — Enterprise 전용"] },
      { icon:"🔌", label:"데이터·API", access:"주요 허용", reason:"메타·구글·틱톡·네이버·카카오·쿠팡 등 주요 광고 채널 연동을 제공합니다.",
        items:["메타·구글·틱톡·네이버·카카오 광고 연동","쿠팡 계정 연동"],
        excluded:["이벤트 수신·정규화·DWH — Pro 이상","API 키 발급·웹훅 — Pro 이상","픽셀 추적 관리 — Pro 이상"] },
      { icon:"👥", label:"팀·헬프", access:"기본 허용", reason:"팀원 목록·이메일 초대·FAQ·튜토리얼·1:1 문의를 제공합니다.",
        items:["팀원 목록·이메일 초대","시작 가이드·FAQ·튜토리얼","릴리즈 노트·1:1 문의"],
        excluded:["역할 템플릿 제어 — Pro 이상"] },
    ],
  },
  pro: {
    title: "🚀 Pro 플랜",
    subtitle: "AI 자동화 플랜",
    tagline: "Growth 전체 + AI 예측·여정 빌더·글로벌 채널·자동화 룰 엔진·고급 BI",
    sections: [
      { icon:"🏠", label:"홈 대시보드", access:"전체 허용", reason:"Growth와 동일하게 전체 허용됩니다." },
      { icon:"🚀", label:"AI 마케팅 자동화", access:"전체 허용", reason:"Growth 기능 전체 + 고객 여정 빌더·AI 이탈/LTV/구매 예측·그래프 스코어·NBA를 모두 제공합니다.",
        items:["Growth 포함 기능 전체","고객 여정 빌더·트리거·액션 노드","AI 이탈 예측·LTV 예측·구매 확률","그래프 스코어·최적 행동 추천(NBA)","상품 추천·AI 광고 인사이트"] },
      { icon:"📣", label:"광고·채널 분석", access:"전체 허용", reason:"키워드·경쟁사·트렌드·시장 점유율 분석, 어트리뷰션, 인플루언서, 디지털 셸프, 글로벌 마켓 리스크 모니터링 모두 제공합니다.",
        items:["Growth 포함 기능 전체","마케팅 인텔리전스(키워드·경쟁사·트렌드)","어트리뷰션 기여도 분석·전환 경로","인플루언서 DB·캠페인·정산","디지털 셸프(SoS)·리스팅 품질","글로벌 마켓 리스크·계정 건전성"] },
      { icon:"👤", label:"고객 CRM", access:"전체 허용", reason:"모든 채널 마케팅(WhatsApp·Instagram DM·Facebook·LINE)과 AI 세그먼트를 포함합니다.",
        items:["Growth 포함 기능 전체","WhatsApp 비즈니스","인스타그램 DM·페이스북 메신저","LINE 채널","AI 고객 세분화"] },
      { icon:"🛒", label:"커머스·물류", access:"전체 허용", reason:"글로벌 채널, AI 가격 최적화, 재고 수요 예측을 포함합니다.",
        items:["Growth 포함 기능 전체","쇼피파이·아마존·라쿠텐·테무 연동","AI 가격 최적화","재고 수요 예측"],
        excluded:["서플라이 체인 추적 — Enterprise 전용"] },
      { icon:"📊", label:"퍼포먼스·BI", access:"전체 허용", reason:"이상치 감지·자동 보고서·AI 경쟁사 벤치마킹·정기 리포트·API 연동·대시보드 공유를 포함합니다.",
        items:["Growth 포함 기능 전체","이상치 감지·자동 요약 보고서","AI 경쟁사 벤치마킹","정기 리포트·API 연동·대시보드 공유"] },
      { icon:"💳", label:"정산·재무", access:"전체 허용", reason:"전자 세금계산서 발급·지출 결재 관리를 포함합니다.",
        items:["Growth 포함 기능 전체","전자 세금계산서 발급/조회","지출 품의서 및 결재 관리"] },
      { icon:"🤖", label:"자동화·AI 룰", access:"전체 허용", reason:"AI 룰 엔진·알람 정책·승인 결재를 모두 제공합니다.",
        items:["Growth 포함 기능 전체","AI 정책 설정·매크로 룰","룰 시뮬레이션·트리거 로그","알람 조건·행동 설정"],
        excluded:["Writeback(DB 갱신·롤백) — Enterprise 전용"] },
      { icon:"🔌", label:"데이터·API", access:"전체 허용", reason:"모든 채널 연동·이벤트·API 키·웹훅·픽셀을 포함합니다.",
        items:["Growth 포함 기능 전체","쇼피파이·아마존·라인 연동","이벤트 수신·데이터 스키마·맵핑","API 키 발급·웹훅·OAuth","픽셀 세팅·검증기·통계"] },
      { icon:"👥", label:"팀·헬프", access:"전체 허용", reason:"역할 템플릿 제어를 포함합니다.",
        items:["Growth 포함 기능 전체","역할 템플릿 제어"] },
    ],
  },
  enterprise: {
    title: "🌐 Enterprise 플랜",
    subtitle: "전체 무제한 플랜",
    tagline: "Pro 전체 + 즉시 롤백·서플라이 체인·전담 지원·커스텀 계약",
    sections: [
      { icon:"🏠", label:"홈 대시보드", access:"전체 허용", reason:"Pro와 동일 — 다수 브랜드 통합 대시보드 관리." },
      { icon:"🚀", label:"AI 마케팅", access:"전체 허용", reason:"Pro 전체 — 여러 브랜드의 AI 마케팅 전략을 통합 운용." },
      { icon:"📣", label:"광고·채널", access:"전체 허용", reason:"Pro 전체 — 다국적·다채널 광고 성과를 통합 분석." },
      { icon:"👤", label:"고객 CRM", access:"전체 허용", reason:"Pro 전체 — 대규모 고객 DB와 복수 브랜드 CRM 통합 운영." },
      { icon:"🛒", label:"커머스·물류", access:"전체 허용 + 공급망", reason:"Pro 전체 + 서플라이 체인 추적(타임라인·공급처·리드타임·리스크 경고)을 포함합니다.",
        items:["Pro 포함 기능 전체","서플라이 체인 타임라인 추적","공급처 데이터 관리","공급처별 리드타임 측정","공급 지연 리스크 경고"] },
      { icon:"📊", label:"퍼포먼스·BI", access:"전체 허용", reason:"Pro와 동일 — 기업 전체 KPI를 통합 리포팅." },
      { icon:"💳", label:"정산·재무", access:"전체 허용", reason:"Pro와 동일 — 멀티 법인 재무 통합." },
      { icon:"🤖", label:"자동화·AI 룰", access:"전체 허용 + 롤백", reason:"Pro 전체 + Writeback(DB 갱신·동기화 로그·즉시 롤백)을 포함합니다.",
        items:["Pro 포함 기능 전체","테이블 싱크 설정","다이렉트 동기화 로그","롤백(데이터 되돌리기)"] },
      { icon:"🔌", label:"데이터·API", access:"전체 허용", reason:"Pro와 동일 — 완전한 데이터 거버넌스·API 생태계 구축." },
      { icon:"👥", label:"팀·헬프", access:"전체 허용", reason:"Pro와 동일 — Unlimited 계정 운영·세분화된 역할 관리." },
    ],
  },
};

function PlanServiceDetail({ plan, pc, livePrice }) {
  const [showDetail, setShowDetail] = useState(false);
  const detail = PLAN_DETAIL[plan];
  if (!detail) return null;

  return (
    <div style={{
      borderRadius:14, overflow:"hidden",
      border:`1px solid ${pc}30`,
      background:`${pc}06`,
    }}>
      <button onClick={() => setShowDetail(!showDetail)} style={{
        width:"100%", padding:"16px 20px", border:"none", cursor:"pointer",
        background:"transparent", display:"flex", alignItems:"center", gap:12, textAlign:"left",
      }}>
        <span style={{ fontSize:14, transition:"transform 200ms", transform: showDetail ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:900, fontSize:14, color:pc }}>
            {detail.title} <span style={{ fontSize:11, color:"#94a3b8", fontWeight:500 }}>— {detail.subtitle}</span>
            {livePrice[plan] && (
              <span style={{ fontSize:11, color:pc, fontWeight:700, marginLeft:8 }}>
                ({livePrice[plan].label})
              </span>
            )}
          <div style={{ fontSize:11, color:"#7c8fa8", marginTop:2 }}>{detail.tagline}</div>
        <span style={{ fontSize:10, padding:"4px 12px", borderRadius:99, background:`${pc}15`, border:`1px solid ${pc}30`, color:pc, fontWeight:700 }}>
          {showDetail ? "접기" : "상세보기 ▼"}
        </span>
      </button>

      {showDetail && (
        <div style={{ padding:"0 16px 16px", display:"grid", gap:10 }}>
          {detail.sections.map((sec, i) => (
            <div key={i} style={{
              padding:"14px 16px", borderRadius:10,
              background: 'var(--surface)', border: '1px solid var(--border)',
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ fontSize:16 }}>{sec.icon}</span>
                <span style={{ fontWeight:800, fontSize:12, color: "var(--text-1)" }}>{sec.label}</span>
                <span style={{
                  fontSize:9, padding:"2px 8px", borderRadius:99, fontWeight:700,
                  background: sec.access.includes("전체") ? "rgba(34,197,94,0.12)" : sec.access.includes("핵심") ? `${pc}15` : "rgba(251,191,36,0.1)",
                  border: `1px solid ${sec.access.includes("전체") ? "rgba(34,197,94,0.3)" : sec.access.includes("핵심") ? `${pc}30` : "rgba(251,191,36,0.3)"}`,
                  color: sec.access.includes("전체") ? "#4ade80" : sec.access.includes("핵심") ? pc : "#fbbf24",
                }}>{sec.access}</span>
              <div style={{ fontSize:10, color:"#64748b", lineHeight:1.7, marginBottom: (sec.items || sec.excluded) ? 8 : 0 }}>
                💡 {sec.reason}
              {sec.items && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom: sec.excluded ? 6 : 0 }}>
                  {sec.items.map((f, j) => (
                    <span key={j} style={{ fontSize:9, padding:"4px 10px", borderRadius:6, background:"rgba(59,130,246,0.22)", border:"1px solid rgba(59,130,246,0.55)", color:"#93c5fd", fontWeight:600, textShadow:"0 0 8px rgba(59,130,246,0.3)" }}>
                      ✅ {f}
                    </span>
                  ))}
              )}
              {sec.excluded && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {sec.excluded.map((f, j) => (
                    <span key={j} style={{ fontSize:9, padding:"4px 10px", borderRadius:6, background:"rgba(239,68,68,0.2)", border:"1px solid rgba(239,68,68,0.5)", color:"#fca5a5", fontWeight:600, textShadow:"0 0 8px rgba(239,68,68,0.25)" }}>
                      🔒 {f}
                    </span>
                  ))}
              )}
          ))}
      )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
);
}
