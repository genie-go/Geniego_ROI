import React, { useState, useEffect, useCallback } from "react";
import { MembersTab, CouponsGrantTab } from './SubscriberTabs.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

/* ══════════════════════════════════════════════════════════════════════════
   MENU_TREE: Geniego-ROI Platform full menu structure
   Main Menu → L2 → L3 → L4 (4 levels)
   ══════════════════════════════════════════════════════════════════════════ */
const MENU_TREE = [
  /* ① Home */
  {
    key: "home", label: "🏠 Home",
    items: [
      {
        key: "dashboard", label: "대시보드",
        subitems: [
          {
            key: "summary", label: "요약 대시보드",
            leafItems: [
              { key: "kpi_widgets",   label: "핵심 지표 위젯" },
              { key: "realtime_mon",  label: "실시간 모니터링" },
              { key: "quick_links",   label: "빠른 링크" },
              { key: "alert_feed",    label: "알림 피드" },
            ],
          },
        ],
      },
    ],
  },

  /* ② AI Marketing Automation */
  {
    key: "ai_marketing", label: "🚀 AI Marketing Automation",
    items: [
      {
        key: "auto_marketing", label: "AI 전략 생성기",
        subitems: [
          {
            key: "ai_strategy_gen", label: "AI 전략 생성기",
            leafItems: [
              { key: "ai_ad_creative",      label: "AI 광고 소재 생성" },
              { key: "campaign_setup",       label: "캠페인 설정" },
              { key: "ai_strategy_preview",  label: "AI 전략 미리보기" },
              { key: "campaign_mgmt",        label: "캠페인 관리" },
            ],
          },
        ],
      },
      {
        key: "campaign_manager", label: "캠페인 관리",
        subitems: [
          {
            key: "campaign_list_mgmt", label: "캠페인 목록",
            leafItems: [
              { key: "campaign_list",    label: "캠페인 목록" },
              { key: "ab_test",          label: "A/B 테스트" },
              { key: "ad_creative_mgmt", label: "광고 소재 관리" },
              { key: "campaign_report",  label: "캠페인 성과 보고서" },
            ],
          },
        ],
      },
      {
        key: "journey_builder", label: "고객 여정 빌더",
        subitems: [
          {
            key: "journey_canvas", label: "고객 여정 캔버스",
            leafItems: [
              { key: "journey_canvas_main", label: "고객 여정 캔버스" },
              { key: "trigger_setting",     label: "트리거(조건) 설정" },
              { key: "action_nodes",        label: "액션 노드 관리" },
              { key: "journey_stat",        label: "여정 성과 분석" },
            ],
          },
        ],
      },
      {
        key: "ai_prediction", label: "AI 예측 & 그래프 스코어",
        subitems: [
          {
            key: "churn_ltv", label: "이탈률 & 평생 가치(LTV) 예측",
            leafItems: [
              { key: "churn_pred",    label: "고객 이탈 예측" },
              { key: "ltv_predict",   label: "LTV 예측" },
              { key: "purchase_prob", label: "구매 확률 예측" },
            ],
          },
          {
            key: "graph_ai", label: "그래프 스코어 & AI 분석",
            leafItems: [
              { key: "graph_score",    label: "그래프 스코어" },
              { key: "next_action",    label: "다음 최적 행동 추천(NBA)" },
              { key: "product_reco",   label: "상품 추천" },
              { key: "ai_insight_ad",  label: "AI 광고 인사이트" },
              { key: "model_perf",     label: "AI 모델 성과 분석" },
            ],
          },
        ],
      },
      {
        key: "content_calendar", label: "콘텐츠 캘린더",
        subitems: [
          {
            key: "content_mgmt", label: "콘텐츠 관리",
            leafItems: [
              { key: "content_plan",     label: "콘텐츠 기획" },
              { key: "publish_schedule", label: "발행 스케줄" },
              { key: "sns_connect",      label: "소셜 미디어 연동" },
              { key: "content_stat",     label: "콘텐츠 성과" },
            ],
          },
        ],
      },
      {
        key: "budget_planner", label: "예산 플래너",
        subitems: [
          {
            key: "budget_main", label: "예산 설정",
            leafItems: [
              { key: "budget_alloc",   label: "예산 할당" },
              { key: "spend_forecast", label: "지출 예측" },
              { key: "roi_calc",       label: "ROI 계산기" },
              { key: "budget_report",  label: "예산 보고서" },
            ],
          },
        ],
      },
    ],
  },

  /* ③ Ads & Channel Analytics */
  {
    key: "ad_analytics", label: "📣 광고·채널 성과 분석",
    items: [
      {
        key: "ad_performance", label: "광고 성과 분석",
        subitems: [
          {
            key: "ad_overview", label: "광고 오버뷰",
            leafItems: [
              { key: "ad_summary",    label: "성과 요약" },
              { key: "ad_channel",    label: "채널별 분석" },
              { key: "ad_product",    label: "상품별 분석" },
              { key: "ad_roas",       label: "ROAS 분석" },
            ],
          },
        ],
      },
      {
        key: "marketing_intel", label: "마케팅 인텔리전스",
        subitems: [
          {
            key: "intel_main", label: "인텔리전스",
            leafItems: [
              { key: "keyword_analysis",  label: "키워드 분석" },
              { key: "competitor_ana",    label: "경쟁사 분석" },
              { key: "trend_analysis",    label: "트렌드 분석" },
              { key: "market_share",      label: "시장 점유율 분석" },
            ],
          },
        ],
      },
      {
        key: "attribution_ana", label: "어트리뷰션 분석",
        subitems: [
          {
            key: "attr_model", label: "기여도 모델",
            leafItems: [
              { key: "touch_model",   label: "접점 모델 설정" },
              { key: "channel_attr",  label: "채널 기여도 분석" },
              { key: "roas_calc_m",   label: "기여 기반 ROAS 계산" },
              { key: "conv_path",     label: "전환 경로 분석" },
            ],
          },
        ],
      },
      {
        key: "channel_kpi", label: "채널 KPI 분석",
        subitems: [
          {
            key: "kpi_dashboard", label: "KPI 대시보드",
            leafItems: [
              { key: "impressions",     label: "노출수 및 클릭률(CTR)" },
              { key: "conv_rate",       label: "전환율(CVR)" },
              { key: "cpa_cpc",         label: "고객 획득 비용(CPA/CPC)" },
              { key: "channel_compare", label: "채널별 지표 비교" },
            ],
          },
        ],
      },
      {
        key: "influencer_mgmt", label: "인플루언서 마케팅",
        subitems: [
          {
            key: "influencer_list", label: "인플루언서",
            leafItems: [
              { key: "influencer_db",     label: "인플루언서 DB 관리" },
              { key: "campaign_inf",      label: "인플루언서 캠페인" },
              { key: "settlement_inf",    label: "정산 관리" },
              { key: "perf_inf",          label: "Performance Analysis" },
            ],
          },
        ],
      },
      {
        key: "digital_shelf", label: "🛍️ 디지털 셸프 (SoS 분석)",
        subitems: [
          {
            key: "shelf_main", label: "디지털 셸프 현황",
            leafItems: [
              { key: "shelf_rank",     label: "검색 순위 및 시장 점유율(SoS)" },
              { key: "shelf_content",  label: "상품 리스팅 품질 지수" },
              { key: "shelf_score",    label: "리뷰 분석" },
            ],
          },
        ],
      },
      {
        key: "amazon_risk", label: "🏪 글로벌 마켓 리스크 현황",
        subitems: [
          {
            key: "amazon_mgmt", label: "아마존 등 마켓 리스크 모니터링",
            leafItems: [
              { key: "amazon_health",   label: "계정 건전성" },
              { key: "amazon_policy",   label: "정책 준수 현황" },
              { key: "amazon_review",   label: "리뷰 관리" },
              { key: "amazon_listing",  label: "리스팅 관리" },
            ],
          },
        ],
      },
    ],
  },

  /* ④ Customers & CRM */
  {
    key: "crm", label: "👤 고객 관리 & CRM",
    items: [
      {
        key: "crm_main", label: "고객 CRM & AI 세그먼트",
        subitems: [
          {
            key: "customer_list", label: "고객 목록",
            leafItems: [
              { key: "customer_db",    label: "고객 데이터베이스" },
              { key: "customer_360",   label: "고객 360도 뷰" },
              { key: "tag_mgmt",       label: "태그 관리" },
              { key: "customer_import",label: "고객 데이터 가져오기" },
            ],
          },
          {
            key: "rfm_segment", label: "RFM(구매 패턴) & AI 세그먼트",
            leafItems: [
              { key: "rfm_analysis",  label: "RFM 데이터 분석" },
              { key: "ai_segment",    label: "AI 고객 세분화" },
              { key: "segment_rule",  label: "세그먼트 규칙" },
              { key: "segment_push",  label: "타겟 메시지 전송" },
            ],
          },
        ],
      },
      {
        key: "email_marketing", label: "이메일 마케팅 & A/B 테스트",
        subitems: [
          {
            key: "email_template", label: "이메일 템플릿",
            leafItems: [
              { key: "email_tpl_list",  label: "템플릿 목록" },
              { key: "email_editor",    label: "이메일 에디터" },
              { key: "html_import",     label: "HTML 가져오기" },
            ],
          },
          {
            key: "email_campaign", label: "이메일 캠페인",
            leafItems: [
              { key: "email_send",      label: "캠페인 발송" },
              { key: "email_ab",        label: "A/B 테스트" },
              { key: "email_stat",      label: "Performance Analysis" },
              { key: "email_bounce",    label: "옵트아웃(수신거부) 관리" },
              { key: "email_schedule",  label: "예약 발송 관리" },
            ],
          },
        ],
      },
      {
        key: "kakao_channel", label: "카카오 채널 마케팅",
        subitems: [
          {
            key: "kakao_template", label: "카카오 템플릿",
            leafItems: [
              { key: "alimtalk",      label: "알림톡 발송" },
              { key: "friendtalk",    label: "친구톡 발송" },
              { key: "bizboard",      label: "카카오 비즈보드 연동" },
            ],
          },
          {
            key: "kakao_campaign", label: "카카오 캠페인",
            leafItems: [
              { key: "kakao_send",    label: "메시지 발송" },
              { key: "kakao_stat",    label: "발송 통계" },
              { key: "kakao_setting", label: "채널 설정" },
            ],
          },
        ],
      },
      {
        key: "whatsapp", label: "WhatsApp 비즈니스 챗",
        subitems: [
          {
            key: "wa_main", label: "왓츠앱 기능",
            leafItems: [
              { key: "wa_template",   label: "메시지 템플릿" },
              { key: "wa_broadcast",  label: "전체 메시지(브로드캐스트) 발송" },
              { key: "wa_setting",    label: "계정 설정" },
              { key: "wa_stat",       label: "발송 통계" },
            ],
          },
        ],
      },
      {
        key: "sms_marketing", label: "문자(SMS/LMS) 마케팅",
        subitems: [
          {
            key: "sms_main", label: "문자 발송",
            leafItems: [
              { key: "sms_send",      label: "문자 메시지 발송" },
              { key: "sms_template",  label: "문자 템플릿" },
              { key: "sms_stat",      label: "발송 통계" },
              { key: "080_reject",    label: "080 수신거부 관리" },
            ],
          },
        ],
      },
      {
        key: "instagram_dm", label: "소셜 계정 다이렉트 메시지(DM)",
        subitems: [
          {
            key: "ig_dm_main", label: "채널 챗",
            leafItems: [
              { key: "ig_dm",         label: "인스타그램 DM" },
              { key: "fb_dm",         label: "페이스북 메신저" },
              { key: "dm_auto",       label: "자동 답장 설정" },
              { key: "dm_campaign",   label: "DM 마케팅 캠페인" },
            ],
          },
        ],
      },
      {
        key: "line_channel", label: "라인(LINE) 채널 연동",
        subitems: [
          {
            key: "line_main", label: "라인 관리",
            leafItems: [
              { key: "line_msg",      label: "라인 메시지 발송" },
              { key: "line_template", label: "라인 템플릿 관리" },
              { key: "line_setting",  label: "라인 채널 설정" },
              { key: "line_stat",     label: "발송 통계" },
            ],
          },
        ],
      },
      {
        key: "web_popup", label: "웹 팝업 & 이탈 방지 팝업",
        subitems: [
          {
            key: "popup_main", label: "팝업 설정",
            leafItems: [
              { key: "popup_editor",  label: "팝업 에디터" },
              { key: "exit_popup",    label: "이탈 방지 팝업" },
              { key: "popup_trigger", label: "트리거(조건) 설정" },
              { key: "popup_ab",      label: "팝업 A/B 테스트" },
              { key: "popup_stat",    label: "팝업 전환 성과 관리" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑤ Commerce & Logistics */
  {
    key: "commerce", label: "🛒 커머스 통합 & 물류",
    items: [
      {
        key: "omni_channel", label: "멀티 채널 운영",
        subitems: [
          {
            key: "channel_mgmt", label: "커머스 채널 관리",
            leafItems: [
              { key: "channel_coupang",  label: "쿠팡" },
              { key: "channel_naver",    label: "네이버 스마트스토어" },
              { key: "channel_shopify",  label: "쇼피파이" },
              { key: "channel_amazon",   label: "아마존" },
              { key: "channel_cafe24",   label: "카페24" },
              { key: "channel_rakuten",  label: "라쿠텐" },
              { key: "channel_temu",     label: "테무" },
              { key: "channel_sync_all", label: "전 채널 일괄 연동" },
            ],
          },
        ],
      },
      {
        key: "kr_channel", label: "국내 채널 주문 수집",
        subitems: [
          {
            key: "kr_order", label: "주문 내역",
            leafItems: [
              { key: "kr_order_list",  label: "주문 목록" },
              { key: "kr_claim",       label: "반품 접수 및 클레임" },
              { key: "kr_delivery",    label: "배송 추적 알림" },
              { key: "kr_settlement",  label: "정산 관리" },
            ],
          },
        ],
      },
      {
        key: "order_hub", label: "주문 통합 허브",
        subitems: [
          {
            key: "order_list", label: "주문 조회",
            leafItems: [
              { key: "order_all",      label: "전체 주문" },
              { key: "order_channel",  label: "채널별 주문 조회" },
              { key: "order_excel",    label: "엑셀 다운로드" },
            ],
          },
          {
            key: "claim_mgmt", label: "반품 접수 및 클레임",
            leafItems: [
              { key: "claim_list",     label: "취소/반품/교환 조회" },
              { key: "return_mgmt",    label: "반품 관리" },
              { key: "exchange_mgmt",  label: "교환 관리" },
            ],
          },
          {
            key: "delivery_track", label: "배송 추적 알림",
            leafItems: [
              { key: "delivery_status", label: "배송 상태" },
              { key: "delivery_alert",  label: "배송 알림 설정" },
              { key: "delivery_excel",  label: "배송 데이터 엑셀 관리" },
            ],
          },
          {
            key: "settlement_mgmt", label: "정산 관리",
            leafItems: [
              { key: "settlement_list",   label: "정산 내역 조회" },
              { key: "settlement_month",  label: "월별 정산 내역" },
              { key: "settlement_excel",  label: "정산 데이터 엑셀 내보내기" },
            ],
          },
          {
            key: "collect_config", label: "데이터 수집 제어 설정",
            leafItems: [
              { key: "collect_channel",  label: "각 채널별 수집 설정" },
              { key: "collect_schedule", label: "자동 수집 스케줄러" },
              { key: "collect_log",      label: "수집 상태 로그" },
            ],
          },
        ],
      },
      {
        key: "wms_manager", label: "WMS 스마트 창고 관리 시스템",
        subitems: [
          {
            key: "inventory_mgmt", label: "재고 내역",
            leafItems: [
              { key: "inventory_list",   label: "현재 재고 현황" },
              { key: "inventory_alert",  label: "품절 및 위험 재고 알림" },
              { key: "inventory_adjust", label: "입/출고 재고 조정" },
            ],
          },
          {
            key: "inbound_mgmt", label: "입고 및 출고 로직",
            leafItems: [
              { key: "inbound",      label: "입고 현황" },
              { key: "outbound",     label: "출하 및 배송 지시" },
              { key: "location",     label: "랙/로케이션(창고 내 위치) 관리" },
              { key: "barcode",      label: "바코드 매핑 기능" },
            ],
          },
        ],
      },
      {
        key: "catalog_sync", label: "상품 (카탈로그) 싱크",
        subitems: [
          {
            key: "product_mgmt", label: "상품 데이터 관리",
            leafItems: [
              { key: "product_list",    label: "상품 List" },
              { key: "product_upload",  label: "상품 일괄 등록" },
              { key: "product_sync",    label: "채널별 상품 연동" },
              { key: "product_excel",   label: "상품 엑셀 수정/업로드" },
              { key: "price_mgmt",      label: "상품 가격 관리" },
              { key: "stock_alert",     label: "품절 및 위험 재고 알림" },
            ],
          },
        ],
      },
      {
        key: "price_opt", label: "AI 가격 최적화 설정 엔진",
        subitems: [
          {
            key: "price_main", label: "가격 룰 설정",
            leafItems: [
              { key: "price_rule",     label: "자동 판매가 변경 룰" },
              { key: "elasticity",     label: "가격 탄력성 시뮬레이션" },
              { key: "price_simulate", label: "가상 가격 적용 테스트" },
              { key: "price_reco",     label: "최적 가격 범위 추천" },
            ],
          },
        ],
      },
      {
        key: "demand_forecast", label: "재고 수요 예측",
        subitems: [
          {
            key: "forecast_main", label: "예상 수요 분석",
            leafItems: [
              { key: "sku_forecast",   label: "단일 옵션(SKU)별 예측" },
              { key: "auto_order",     label: "부족 재고 발주량 제안서" },
              { key: "order_history",  label: "AI 발주 이력 추적" },
              { key: "forecast_chart", label: "수요 채널 비중(차트형)" },
            ],
          },
        ],
      },
      {
        key: "asia_logistics", label: "아시아 물류 및 포워딩 관리",
        subitems: [
          {
            key: "asia_main", label: "배송 관리",
            leafItems: [
              { key: "hub_status",     label: "아시아 주요 허브 물류 현황" },
              { key: "route_matrix",   label: "글로벌 라우트 확인" },
              { key: "customs_rules",  label: "통관 규정 모니터링" },
              { key: "fulfillment",    label: "풀필먼트 비용 및 리드타임 비교" },
              { key: "domestic_3pl",   label: "국내 3PL 배송 조회" },
            ],
          },
        ],
      },
      {
        key: "returns_portal", label: "자율 반품 포털 구축",
        subitems: [
          {
            key: "returns_main", label: "반품 관리",
            leafItems: [
              { key: "returns_dashboard", label: "반품 통계 대시보드" },
              { key: "returns_list",      label: "고객 처리 반품 리스트" },
              { key: "returns_portal_set",label: "브랜드 반품 포털 페이지 설정" },
              { key: "returns_analysis",  label: "반품 사유 분석 (불량률 등)" },
            ],
          },
        ],
      },
      {
        key: "supply_chain", label: "서플라이 체인 추적망",
        subitems: [
          {
            key: "supply_main", label: "서플라이 체인",
            leafItems: [
              { key: "supply_timeline",  label: "제조-입고-출고 타임라인 추적" },
              { key: "supplier_list",    label: "공급처 데이터 관리" },
              { key: "leadtime_ana",     label: "공급처별 리드타임 측정" },
              { key: "risk_detect",      label: "공급 지연 리스크 경고" },
            ],
          },
        ],
      },
      {
        key: "supplier_portal", label: "공급사용(B2B) 포털 연동",
        subitems: [
          {
            key: "supplier_main", label: "공급업체 전용",
            leafItems: [
              { key: "supplier_list2",   label: "Supplier List" },
              { key: "po_mgmt",          label: "발주서 전송 및 관리" },
              { key: "supplier_perf",    label: "Performance Analysis" },
              { key: "supplier_setting", label: "자동 발주 루틴 심기" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑥ Analytics & Performance */
  {
    key: "analytics", label: "📊 통합 퍼포먼스 및 비즈니스 리포팅",
    items: [
      {
        key: "performance_hub", label: "퍼포먼스 허브 (매출 요약)",
        subitems: [
          {
            key: "perf_overview", label: "종합 퍼포먼스 현황",
            leafItems: [
              { key: "perf_summary",   label: "성과 요약" },
              { key: "multi_team_analysis", label: "다중 부서별 성과 집계" },
              { key: "perf_channel",   label: "유입 채널별 성과" },
              { key: "perf_product",   label: "히트 상품 성과" },
              { key: "perf_campaign",  label: "마케팅 캠페인별 매출 연계" },
              { key: "cohort",         label: "코호트 리텐션(재구매형) 분석" },
            ],
          },
        ],
      },
      {
        key: "pnl_analytics", label: "P&L(손익) 분석실",
        subitems: [
          {
            key: "pnl_main", label: "원가와 손익",
            leafItems: [
              { key: "pnl_overview",    label: "비즈니스 손익 요약" },
              { key: "pnl_channel",     label: "판매 채널별 수익성" },
              { key: "pnl_product",     label: "기여 상품별 마진율" },
              { key: "pnl_trend",       label: "손익 증감 추이 그래프" },
            ],
          },
        ],
      },
      {
        key: "ai_insights", label: "머신러닝(AI) 인사이트 리포트",
        subitems: [
          {
            key: "insight_feed", label: "통찰",
            leafItems: [
              { key: "insight_main",    label: "매일 AI가 제공하는 성장 조언" },
              { key: "anomaly_detect",  label: "예외치(트래픽 급증/급락) 감지" },
              { key: "auto_report",     label: "보고서 자동 요약본 생성" },
              { key: "competitor_ai",   label: "AI 기반 경쟁사 벤치마킹 타점" },
            ],
          },
        ],
      },
      {
        key: "report_builder", label: "BI(Business Intelligence) 레포트 공유",
        subitems: [
          {
            key: "report_main", label: "보고서 빌더",
            leafItems: [
              { key: "custom_report",   label: "내가 만드는 대시보드" },
              { key: "scheduled_rpt",   label: "정기 스케줄링 리포트 메일" },
              { key: "excel_export",    label: "커스텀 양식 엑셀 다운로더" },
              { key: "api_export",      label: "오픈 API 데이터 연동 포트" },
              { key: "dashboard_share", label: "대시보드 외부 링크 공유" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑦ Settlements & Finance */
  {
    key: "finance", label: "💳 정산 및 재무 내역 관리",
    items: [
      {
        key: "reconciliation", label: "정산 관리",
        subitems: [
          {
            key: "recon_main", label: "정산",
            leafItems: [
              { key: "recon_list",     label: "정산 내역 조회" },
              { key: "recon_channel",  label: "앱/웹 매체사별 정산" },
              { key: "recon_month",    label: "월별 정산 내역" },
              { key: "recon_excel",    label: "정산 데이터 엑셀 내보내기" },
            ],
          },
        ],
      },
      {
        key: "settlements", label: "세금 및 결제액 통합 관리",
        subitems: [
          {
            key: "settle_main", label: "결제 대금 관리",
            leafItems: [
              { key: "tax_invoice",    label: "전자 세금계산서 발급/조회" },
              { key: "settle_list",    label: "단건/정기 결제 영수 내역" },
              { key: "settle_approve", label: "지출 품의서 및 결재 관리" },
              { key: "settle_excel",   label: "결제 내역 엑셀 다운로드" },
            ],
          },
        ],
      },
      {
        key: "app_pricing", label: "구독 및 라이선스 관리",
        subitems: [
          {
            key: "pricing_main", label: "요금제 및 라이선스",
            leafItems: [
              { key: "my_plan",        label: "내 구독 요금제 활성 상태" },
              { key: "plan_upgrade",   label: "구독 플랜 갱신/업그레이드" },
              { key: "payment_hist",   label: "과거 요금 결제 영수증" },
              { key: "invoice",        label: "청구서 (월/연단위)" },
            ],
          },
        ],
      },
      {
        key: "my_coupons", label: "프로모션/할인 쿠폰함",
        subitems: [
          {
            key: "coupon_main", label: "쿠폰 보관함",
            leafItems: [
              { key: "coupon_list", label: "이용 가능한 쿠폰" },
              { key: "coupon_use",  label: "쿠폰 등록 내역" },
            ],
          },
        ],
      },
      {
        key: "audit", label: "데이터/로그 감사실",
        subitems: [
          {
            key: "audit_main", label: "데이터/로그 감사실",
            leafItems: [
              { key: "audit_log_list", label: "행동 로그 추적 조회" },
              { key: "audit_export",   label: "보안 로그 안전 반출" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑧ Automation & AI */
  {
    key: "automation", label: "🤖 업무 자동화 및 룰 엔진",
    items: [
      {
        key: "ai_rule_engine", label: "AI 룰 엔진 로직 설계",
        subitems: [
          {
            key: "rule_main", label: "룰 설정",
            leafItems: [
              { key: "ai_policy",      label: "인공지능 정책 방향 및 페르소나 설정" },
              { key: "rule_list",      label: "설계된 매크로 룰 리스트" },
              { key: "rule_test",      label: "룰 사전 시뮬레이션 실행" },
              { key: "rule_log",       label: "트리거 완료 로그 확인" },
            ],
          },
        ],
      },
      {
        key: "alert_policies", label: "알람 조건 및 매크로 행동 생성기",
        subitems: [
          {
            key: "alert_main", label: "알람(Alert) 정책",
            leafItems: [
              { key: "alert_policy_list",  label: "알람 발송 조건 정책 모음" },
              { key: "action_presets",     label: "조건 달성 시 행동(Action) 설정" },
              { key: "alert_evaluate",     label: "조건 만족도(Evaluations) 현황 로그" },
              { key: "alert_log",          label: "생성된 알람 기록" },
            ],
          },
        ],
      },
      {
        key: "approvals", label: "승인 요청 결재함",
        subitems: [
          {
            key: "approval_main", label: "승인",
            leafItems: [
              { key: "approval_list",   label: "할인율/발주서 등 대기 문서" },
              { key: "approval_decide", label: "반려 및 승인 처리 액션" },
              { key: "approval_hist",   label: "결재 히스토리" },
            ],
          },
        ],
      },
      {
        key: "writeback", label: "원본 DB 다이렉트 갱신 (Writeback)",
        subitems: [
          {
            key: "writeback_main", label: "라이트백(수정 데이터 동기화)",
            leafItems: [
              { key: "wb_config",   label: "테이블 싱크 기능 설정" },
              { key: "wb_log",      label: "다이렉트 동기화 로그" },
              { key: "wb_rollback", label: "롤백(데이터 되돌리기)" },
            ],
          },
        ],
      },
      {
        key: "onboarding", label: "시작하기 (초보자 온보딩)",
        subitems: [
          {
            key: "onboarding_main", label: "온보딩",
            leafItems: [
              { key: "getting_started",  label: "첫 세팅 10단계 가이드라인" },
              { key: "setup_wizard",     label: "간편 마법사(위저드) 설정" },
              { key: "quick_setup",      label: "빠른 카탈로그 설정" },
              { key: "tutorial",         label: "튜토리얼 센터" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑨ Data & Integrations */
  {
    key: "data", label: "🔌 데이터 소스 및 API 시스템",
    items: [
      {
        key: "connectors", label: "연동 커넥터 및 트래킹 소스",
        subitems: [
          {
            key: "channel_conn", label: "외부 채널 원클릭 앱 연동",
            leafItems: [
              { key: "meta_ads",       label: "메타 (페이스북/인스타) 광고" },
              { key: "google_ads",     label: "구글 광고" },
              { key: "tiktok_ads",     label: "틱톡 광고" },
              { key: "naver_ads",      label: "네이버 광고(GFA/검색)" },
              { key: "kakao_ads",      label: "카카오 모먼트 광고" },
              { key: "line_ads",       label: "라인 프로모션" },
              { key: "coupang_conn",   label: "쿠팡 계정 원클릭" },
              { key: "shopify_conn",   label: "쇼피파이 계정 원클릭" },
              { key: "amazon_conn",    label: "아마존 계정 원클릭" },
            ],
          },
          {
            key: "event_data", label: "이벤트 및 데이터 웨어하우스",
            leafItems: [
              { key: "event_ingest",    label: "개별 이벤트 수신 로깅" },
              { key: "event_normalize", label: "정규화" },
              { key: "data_schema",     label: "통합형 테이블 스키마 열람" },
              { key: "data_mapping",    label: "다채널 데이터 컬럼 맵핑 도구" },
              { key: "data_product",    label: "데이터 마트 세팅" },
            ],
          },
        ],
      },
      {
        key: "api_keys", label: "보안 접근-API Key 발급 관리",
        subitems: [
          {
            key: "api_mgmt", label: "API",
            leafItems: [
              { key: "api_key_list",   label: "발급된 API 키" },
              { key: "api_create",     label: "REST API 키 발행 화면" },
              { key: "webhook",        label: "Webhooks(웹훅) 발송 제어" },
              { key: "oauth_mgmt",     label: "OAuth 권한 및 앱 인가 내역" },
              { key: "api_log",        label: "API 허용 한도 및 전송 콜 통계" },
            ],
          },
        ],
      },
      {
        key: "license", label: "솔루션 코어 및 에드온 라이선스 제어",
        subitems: [
          {
            key: "license_main", label: "라이선스",
            leafItems: [
              { key: "license_activate", label: "라이선스 토큰 인증/활성화" },
              { key: "license_status",   label: "현재 보유 중인 에드온 플랜 내역" },
              { key: "service_toggle",   label: "모듈별 개별 켜기/끄기 스위치" },
            ],
          },
        ],
      },
      {
        key: "pixel_tracking", label: "픽셀(자사몰 추적자) 탑재 관리",
        subitems: [
          {
            key: "pixel_main", label: "픽셀 세팅",
            leafItems: [
              { key: "pixel_config",   label: "픽셀 세팅" },
              { key: "pixel_snippet",  label: "추적 스크립트 코드 확인" },
              { key: "pixel_verify",   label: "스크립트 동작 및 이벤트 검증기" },
              { key: "pixel_stat",     label: "수집된 자사몰 픽셀 통계" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑩ 내 Team·Help (General Users 전용) */
  {
    key: "help", label: "👥 부서 환경 & 헬프 오피스",
    items: [
      {
        key: "operations", label: "운영 스탠다드 프로토콜",
        subitems: [
          {
            key: "ops_main", label: "운영",
            leafItems: [
              { key: "ops_overview", label: "팀 업무 스코어 대시보드" },
              { key: "ops_guide",    label: "플랫폼 운영 사내 규정 백서" },
            ],
          },
        ],
      },
      {
        key: "team_workspace", label: "부서/팀 내 워크스페이스 세팅",
        subitems: [
          {
            key: "team_main", label: "부서 인원",
            leafItems: [
              { key: "team_members",   label: "팀 구성원 전체 내역" },
              { key: "team_invite",    label: "이메일 초대장 발송" },
              { key: "team_roles",     label: "기본 역할 템플릿 제어" },
              { key: "team_activity",  label: "우리 부서 플랫폼 활용 현황" },
            ],
          },
        ],
      },
      {
        key: "help_center", label: "CS 고객 센터",
        subitems: [
          {
            key: "help_main", label: "도움말",
            leafItems: [
              { key: "getting_started_help", label: "첫 세팅 10단계 가이드라인" },
              { key: "faq",                  label: "문제가 있을 땐 FAQ부터 확인하세요" },
              { key: "video_tutorial",       label: "실습형 3분 숏폼 튜토리얼 비디오" },
              { key: "release_notes",        label: "릴리즈 업데이트 버저닝 확인" },
              { key: "support_ticket",       label: "개별 문의하기 신청 (1:1 티켓)" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑪ 관리자 센터 (Platform 관리자 전용 — 유료 회원 접근Permission 제외) */
  {
    key: "system", label: "⚙ 코어 관리자 환경 (최고 권한자)",
    items: [
      {
        key: "admin_main", label: "관리자 전용",
        subitems: [
          {
            key: "user_mgmt", label: "입점사 회원 및 권한 발급 제어",
            leafItems: [
              { key: "user_list",    label: "가입된 입점사 계정 통계" },
              { key: "role_mgmt",    label: "시스템 상위 역할 구조 설계" },
              { key: "team_mgmt",    label: "부서 권한 설계" },
              { key: "member_mgmt",  label: "임직원 아이디 제어 및 박탈" },
            ],
          },
          {
            key: "system_ops", label: "서버 및 리소스 상태 모니터링",
            leafItems: [
              { key: "audit_log",    label: "데이터/로그 감사실" },
              { key: "system_mon",   label: "서버 CPU 및 상태 경고 확인" },
              { key: "ops_health",   label: "장애 이력 / 서버 활성 일람" },
              { key: "db_admin",     label: "데이터베이스 보수 도구" },
            ],
          },
          {
            key: "sub_mgmt", label: "매출 구독결제 수익 코어 엔진",
            leafItems: [
              { key: "sub_pricing",     label: "구독 요금제 관리" },
              { key: "license_mgmt",    label: "라이선스 발급 로직 통제" },
              { key: "pg_config",       label: "PG사 토큰 매핑 및 교체 모듈" },
              { key: "coupon_admin",    label: "쿠폰 보관함" },
              { key: "subscriber_list", label: "과금 고객 DB 원장" },
            ],
          },
        ],
      },
    ],
  },
];


// Basic 플랜 정의 (Starter 제거, Free = 모든 Demo 접근)
const DEFAULT_PLANS = [
  { id: "free",       label: "Free",       color: "#8da4c4", emoji: "🆓", isDemo: true  },
  { id: "growth",     label: "Growth",     color: "#4f8ef7", emoji: "📈", isDemo: false },
  { id: "pro",        label: "Pro",        color: "#a855f7", emoji: "🚀", isDemo: false },
  { id: "enterprise", label: "Enterprise", color: "#f59e0b", emoji: "🌐", isDemo: false },
];

// Basic 계정 수 티어 (동적 Add/삭제 가능)
const DEFAULT_TIERS = [
  { key: "1",         label: "1Account",  count: 1  },
  { key: "5",         label: "5Account",  count: 5  },
  { key: "10",        label: "10Account", count: 10 },
  { key: "30",        label: "30Account", count: 30 },
  { key: "unlimited", label: "Unlimited", count: 0, unlimited: true },
];

// 하위 호환: PLANS 상수는 DEFAULT_PLANS를 참조 (동적 플랜 없을 때 fallback)
const PLANS = DEFAULT_PLANS;
const ACCOUNT_TIERS = DEFAULT_TIERS;

const CYCLES = [
  { key: "monthly",      label: "Monthly",  months: 1  },
  { key: "quarterly",   label: "3개월", months: 3  },
  { key: "semi_annual", label: "6개월", months: 6  },
  { key: "yearly",      label: "Annual",  months: 12 },
];

const API           = "/api";
const PLAN_ACCT_PFX = "__plan_acct__";
const MENU_SEP      = "||";
const ADMIN_KEY     = "genie_live_demo_key_00000000";

function authHeader() {
  // 관리자 센터는 관리자 키를 우선 사용 (SubscriberTabs.jsx와 동일한 방식)
  // localStorage에 admin/enterprise Account으로 로그인된 경우 그 토큰 사용
  const userToken = localStorage.getItem("token") || localStorage.getItem("genie_token") || "";
  const userPlan = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").plan || ""; } catch { return ""; } })();
  const isAdminUser = ["admin", "enterprise"].includes(userPlan);
  const token = isAdminUser ? userToken : ADMIN_KEY;
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function calcFinal(base, disc) {
  const b = parseInt(base) || 0;
  const d = parseFloat(disc) || 0;
  return b > 0 ? Math.round(b * (1 - d / 100)) : 0;
}

function krw(v) {
  return v > 0 ? "₩" + Number(v).toLocaleString("ko-KR") : "—";
}

function planColor(planId, customPlans) {
  const plans = customPlans || PLANS;
  return plans.find(p => p.id === planId)?.color || "#8da4c4";
}

function cycleLabel(c) {
  return CYCLES.find(x => x.key === c)?.label || c;
}

/* ══════════════════════════════════════════════════════════════════════════
   저장dRateList — 저장된 Pricing List (플랜 그룹 뷰)
   저장일 / 플랜별 Pricing 요약도 → 클릭 시 계정별 상세 조회
   ══════════════════════════════════════════════════════════════════════════ */
function 저장dRateList({ items, on삭제, onPaddleSync, paddleSyncing, paddleResult }) {
  const [openPlans, setOpenPlans] = React.useState({});
  const [showHistory, setShowHistory] = React.useState(false);
  const [historyItems, setHistoryItems] = React.useState([]);
  const [histLoading, setHistLoading] = React.useState(false);

  /* ── 저장된 Pricing → geniego_plan_pricing localStorage Auto sync ── */
  React.useEffect(() => {
    if (!items || items.length === 0) return;
    const priceItems = items.filter(it => it.menu_key?.startsWith(PLAN_ACCT_PFX) && parseInt(it.price_krw) > 0);
    if (priceItems.length === 0) return;
    // 플랜별 Monthly(monthly) Pricing만 추출 (1Account 기준 우선)
    const pricing = {};
    ['growth', 'pro', 'enterprise'].forEach(planId => {
      const monthlyOne = priceItems.find(it =>
        it.menu_key?.includes(`__${planId}__1`) && it.cycle === 'monthly'
      );
      const monthlyAny = priceItems.find(it =>
        it.menu_key?.includes(`__${planId}__`) && it.cycle === 'monthly'
      );
      const item = monthlyOne || monthlyAny;
      if (item) {
        const base = parseInt(item.price_krw) || 0;
        const disc = parseFloat(item.discount_pct) || 0;
        const final = base > 0 ? Math.round(base * (1 - disc / 100)) : base;
        if (final > 0) {
          pricing[planId] = {
            monthly: `₩${final.toLocaleString('ko-KR')}`,
            quarterly: `₩${Math.round(final * 3 * 0.9 / 3).toLocaleString('ko-KR')}/월`,
            yearly: `₩${Math.round(final * 12 * 0.8 / 12).toLocaleString('ko-KR')}/월`,
            name: planId === 'growth' ? '📈 Growth' : planId === 'pro' ? '🚀 Pro' : planId === 'enterprise' ? '🌐 Enterprise' : planId,
          };
        }
      }
    });
    if (Object.keys(pricing).length > 0) {
      try { localStorage.setItem('geniego_plan_pricing', JSON.stringify(pricing)); } catch { /* ignore */ }
    }
  }, [items]);

  /* ── e.o. sync hook ── */

  const loadHistory = React.useCallback(() => {
    setHistLoading(true);
    fetch(`${API}/auth/pricing/plans?history=1`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { if (d.ok) setHistoryItems(d.items || []); })
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, []);

  React.useEffect(() => { if (showHistory) loadHistory(); }, [showHistory, loadHistory]);

  const displayItems = showHistory ? historyItems : items;
  // Price 항목만 (plan_acct 접두사 + price_krw > 0)
  const priceItems = displayItems.filter(it => it.menu_key?.startsWith(PLAN_ACCT_PFX) && parseInt(it.price_krw) > 0);

  // 플랜별 그룹 구성: { plan → { acct → { cycle → item } } }
  const grouped = {};
  priceItems.forEach(it => {
    const raw = it.menu_key.replace(PLAN_ACCT_PFX, '');
    const [plan, acct] = raw.split('__');
    if (!grouped[plan]) grouped[plan] = {};
    if (!grouped[plan][acct]) grouped[plan][acct] = {};
    // cycleper LatestValue 유지
    grouped[plan][acct][it.cycle] = it;
  });

  // 플랜별 Latest 저장일
  const plan저장dAt = {};
  priceItems.forEach(it => {
    const raw = it.menu_key.replace(PLAN_ACCT_PFX, '');
    const [plan] = raw.split('__');
    const dt = it.created_at || it.updated_at || '';
    if (!plan저장dAt[plan] || dt > plan저장dAt[plan]) plan저장dAt[plan] = dt;
  });

  const togglePlan = (pid) => setOpenPlans(p => ({ ...p, [pid]: !p[pid] }));

  const CYCLE_ORDER = ['monthly', 'quarterly', 'semi_annual', 'yearly'];

  return (
    <div style={{ display: 'grid', gap: 12 }}>

      {/* Paddle Sync 결과 */}
      {paddleResult && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
          background: paddleResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${paddleResult.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: paddleResult.ok ? '#22c55e' : '#ef4444',
        }}>
          {paddleResult.ok ? `✅ Paddle Sync Done: ${paddleResult.synced}건 처리` : `❌ Failed: ${paddleResult.error}`}
        </div>
      )}

      {/* 툴바 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: '#7c8fa8' }}>
          {showHistory
            ? <span>📚 전체 변경 이력 <span style={{ color: '#eab308', fontWeight: 700 }}>({priceItems.length}건)</span></span>
            : <span>✅ 현재 적용 요금제 <span style={{ color: '#22c55e', fontWeight: 700 }}>({priceItems.length}건)</span></span>}
          {histLoading && <span style={{ marginLeft: 8, color: '#eab308' }}>⏳</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowHistory(h => !h)} style={{
            padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${showHistory ? 'rgba(234,179,8,0.4)' : 'rgba(79,142,247,0.3)'}`,
            background: showHistory ? 'rgba(234,179,8,0.08)' : 'rgba(79,142,247,0.08)',
            color: showHistory ? '#eab308' : '#4f8ef7',
          }}>{showHistory ? '📋 현재 요금만 보기' : '🗒 변경 이력 보기'}</button>
          <button onClick={onPaddleSync} disabled={paddleSyncing || priceItems.length === 0} style={{
            padding: '5px 16px', borderRadius: 7, border: 'none', cursor: paddleSyncing || priceItems.length === 0 ? 'not-allowed' : 'pointer',
            background: paddleSyncing ? 'rgba(168,85,247,0.3)' : 'linear-gradient(135deg,#a855f7,#7c3aed)',
            color: '#fff', fontWeight: 700, fontSize: 11,
          }}>{paddleSyncing ? '⏳ Syncing...' : '🔄 Paddle Sync'}</button>
        </div>
      </div>

      {priceItems.length === 0 && (
        <div style={{ textAlign: 'center', color: '#3b4d6e', padding: '40px 0', fontSize: 13 }}>
          📭 저장된 요금제가 없습니다. 플랜별 요금 설정 탭에서 금액을 입력 후 저장하세요.
        </div>
      )}

      {/* 플랜 그룹 Card */}
      {PLANS.map(plan => {
        const acctMap = grouped[plan.id];
        if (!acctMap && !showHistory) return null;
        if (!acctMap) return null;

        const isOpen = openPlans[plan.id];
        const savedAt = plan저장dAt[plan.id];
        const savedDate = savedAt ? new Date(savedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';
        const savedTime = savedAt ? new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';

        // 요약도: 계정 수별 기본 월 구독료
        const summaryEntries = ACCOUNT_TIERS
          .filter(t => acctMap[t.key]?.['monthly'])
          .map(t => ({ acct: t, item: acctMap[t.key]['monthly'] }));

        return (
          <div key={plan.id} style={{
            borderRadius: 12, overflow: 'hidden',
            border: `1px solid ${isOpen ? plan.color + '55' : 'rgba(255,255,255,0.08)'}`,
            background: isOpen ? `${plan.color}08` : 'rgba(255,255,255,0.02)',
            transition: 'all 150ms',
          }}>
            {/* Header: 플랜명 + 저장일 + Pricing 요약도 */}
            <div onClick={() => togglePlan(plan.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 20 }}>{plan.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: plan.color }}>{plan.label}</span>
                  <span style={{ fontSize: 10, color: '#7c8fa8' }}>플랜</span>
                  <span style={{
                    fontSize: 9, padding: '1px 8px', borderRadius: 99, fontWeight: 700,
                    background: `${plan.color}18`, border: `1px solid ${plan.color}33`, color: plan.color,
                  }}>{Object.keys(acctMap).length}개 Account 티어</span>
                </div>
                {/* Pricing 요약도 한 줄 */}
                {summaryEntries.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    {summaryEntries.map(({ acct, item }) => {
                      const final = calcFinal(item.price_krw, item.discount_pct);
                      return (
                        <span key={acct.key} style={{ fontSize: 10, color: '#94a3b8' }}>
                          <span style={{ color: plan.color, fontWeight: 600 }}>{acct.label}</span>
                          {' '}<span style={{ color: '#e2e8f0', fontWeight: 700 }}>₩{final.toLocaleString('ko-KR')}</span>
                          <span style={{ color: '#64748b' }}>/월</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* 저장일 */}
              <div style={{ textAlign: 'right', fontSize: 10, color: '#7c8fa8' }}>
                <div style={{ color: '#4f8ef7', fontWeight: 600 }}>📅 {savedDate}</div>
                <div style={{ fontSize: 9 }}>{savedTime}</div>
              </div>
              <span style={{ fontSize: 10, color: '#7c8fa8', transition: 'transform 200ms', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
            </div>

            {/* 펼침: Accountper × 주기per 상세 */}
            {isOpen && (
              <div style={{ padding: '0 18px 16px' }}>
                {/* Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '90px repeat(4, 1fr) 50px',
                  gap: 6, padding: '6px 10px 8px', borderBottom: `1px solid ${plan.color}22`,
                  fontSize: 9, fontWeight: 700, color: '#7c8fa8',
                }}>
                  <span>계정 수</span>
                  {CYCLES.map(c => <span key={c.key} style={{ textAlign: 'center' }}>{c.label}</span>)}
                  <span></span>
                </div>

                {ACCOUNT_TIERS.map(tier => {
                  const cycleData = acctMap[tier.key];
                  if (!cycleData) return null;
                  const monthlyItem = cycleData['monthly'];
                  const monthlyBase = monthlyItem ? parseInt(monthlyItem.price_krw) : 0;

                  return (
                    <div key={tier.key} style={{
                      display: 'grid', gridTemplateColumns: '90px repeat(4, 1fr) 50px',
                      gap: 6, padding: '9px 10px', alignItems: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: plan.color,
                        background: `${plan.color}14`, borderRadius: 6,
                        padding: '3px 8px', textAlign: 'center', display: 'inline-block',
                      }}>{tier.label}</span>

                      {CYCLES.map(c => {
                        const it = cycleData[c.key];
                        if (!it && c.key !== 'monthly') {
                          // 비Monthly: monthly에서 Auto Calculate 표시
                          if (monthlyBase > 0) {
                            const months = c.months;
                            const disc = monthlyItem?.discount_pct ? parseFloat(monthlyItem.discount_pct) : 0;
                            const finalMonthly = disc > 0 ? Math.round(monthlyBase * (1 - disc / 100)) : monthlyBase;
                            const total = finalMonthly * months;
                            return (
                              <div key={c.key} style={{ textAlign: 'center', fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                                (₩{total.toLocaleString()})
                                <div style={{ fontSize: 8, color: '#4b5563' }}>미등록</div>
                              </div>
                            );
                          }
                          return <div key={c.key} style={{ textAlign: 'center', color: '#3b4d6e', fontSize: 10 }}>—</div>;
                        }
                        if (!it) return <div key={c.key} style={{ textAlign: 'center', color: '#3b4d6e', fontSize: 10 }}>—</div>;

                        const final = calcFinal(it.price_krw, it.discount_pct);
                        const months = CYCLES.find(x => x.key === c.key)?.months || 1;
                        const total = final * months;

                        return (
                          <div key={c.key} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>₩{final.toLocaleString()}<span style={{ fontSize: 8, color: '#7c8fa8', fontWeight: 400 }}>/월</span></div>
                            {months > 1 && (
                              <div style={{ fontSize: 9, color: plan.color, marginTop: 1 }}>₩{total.toLocaleString()} Total액</div>
                            )}
                            {parseFloat(it.discount_pct) > 0 && (
                              <div style={{ fontSize: 8, color: '#4ade80' }}>{it.discount_pct}% Discount</div>
                            )}
                          </div>
                        );
                      })}

                      {/* 삭제 (Monthly 항목 기준) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {Object.values(cycleData).map(it => (
                          <button key={it.id} onClick={() => on삭제(it.id)} title={`${cycleLabel(it.cycle)} 삭제`} style={{
                            padding: '2px 5px', borderRadius: 4,
                            border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)',
                            color: '#ef4444', fontSize: 8, cursor: 'pointer',
                          }}>🗑{cycleLabel(it.cycle)}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* 메뉴 접근 권한 */}
      {items.filter(it => !it.menu_key?.startsWith(PLAN_ACCT_PFX)).length > 0 && (
        <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(79,142,247,0.05)', borderRadius: 10, border: '1px solid rgba(79,142,247,0.1)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4f8ef7', marginBottom: 8 }}>🔒 메뉴 접근 권한 설정</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {items.filter(it => !it.menu_key?.startsWith(PLAN_ACCT_PFX)).map((it, i) => (
              <span key={i} style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                background: `${planColor(it.plan)}18`, border: `1px solid ${planColor(it.plan)}33`, color: planColor(it.plan),
              }}>{it.menu_key.split(MENU_SEP).pop()} · {it.plan}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PLACEHOLDER (구 저장dRateList 이하 코드 제거됨 — 아래에 PricingMatrix Present)
   ══════════════════════════════════════════════════════════════════════════ */
function _저장dRateList_DELETED({ items, on삭제, onPaddleSync, paddleSyncing, paddleResult }) {
  const [filterPlan,   setFilterPlan]   = useState("all");
  const [filterCycle,  setFilterCycle]  = useState("all");
  const [showHistory,  setShowHistory]  = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [histLoading,  setHistLoading]  = useState(false);

  const loadHistory = React.useCallback(() => {
    setHistLoading(true);
    fetch(`${API}/auth/pricing/plans?history=1`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { if (d.ok) setHistoryItems(d.items || []); })
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, []);

  React.useEffect(() => { if (showHistory) loadHistory(); }, [showHistory, loadHistory]);

  // 표시 데이터: 이력 모드면 모든(is_active 0/1), 현재 모드면 items(is_active=1만)
  const displayItems = showHistory ? historyItems : items;

  // Price 행만 Filter (메뉴 접근 권한 제외)
  const priceItems = displayItems.filter(it =>
    it.menu_key?.startsWith(PLAN_ACCT_PFX) && parseInt(it.price_krw) > 0
  );

  const filtered = priceItems.filter(it => {
    const planMatch  = filterPlan  === "all" || it.plan  === filterPlan;
    const cycleMatch = filterCycle === "all" || it.cycle === filterCycle;
    return planMatch && cycleMatch;
  });

  // plan+acct 파싱
  function parsePlanAcct(menuKey) {
    const raw = menuKey.replace(PLAN_ACCT_PFX, "");
    const [plan, acct] = raw.split("__");
    return { plan, acct };
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Paddle Sync 결과 */}
      {paddleResult && (
        <div style={{
          padding: "12px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
          background: paddleResult.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${paddleResult.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: paddleResult.ok ? "#22c55e" : "#ef4444",
        }}>
          {paddleResult.ok
            ? `✅ Paddle Sync Done: ${paddleResult.synced}개 상품 처리, ${paddleResult.errors?.length || 0}개 Error`
            : `❌ Paddle Sync Failed: ${paddleResult.error || "알 수 없는 Error"}`
          }
          {paddleResult.errors?.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 10, color: "#f87171" }}>
              {paddleResult.errors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}
          {paddleResult.details?.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 10, color: "#86efac" }}>
              {paddleResult.details.map((d, i) => <div key={i}>• {d}</div>)}
            </div>
          )}
        </div>
      )}

      {/* 이력 Toggle + 요약도 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ fontSize: 12, color: "#7c8fa8" }}>
          {showHistory
            ? <span>📚 전체 요금 변경 이력 <span style={{ color: "#eab308", fontWeight: 700 }}>({filtered.length}건)</span></span>
            : <span>✅ 현재 적용 요금제 <span style={{ color: "#22c55e", fontWeight: 700 }}>({filtered.length}건)</span></span>
          }
          {histLoading && <span style={{ marginLeft: 8, color: "#eab308" }}>⏳ Loading...</span>}
        </div>
        <button onClick={() => setShowHistory(h => !h)}
          style={{
            padding: "5px 14px", borderRadius: 7,
            border: `1px solid ${showHistory ? "rgba(234,179,8,0.4)" : "rgba(79,142,247,0.3)"}`,
            background: showHistory ? "rgba(234,179,8,0.08)" : "rgba(79,142,247,0.08)",
            color: showHistory ? "#eab308" : "#4f8ef7",
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>
          {showHistory ? "📋 현재 요금만 보기" : "🗒 전체 변경 이력 보기"}
        </button>
      </div>

      {/* Paddle Sync Button + Filter */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={onPaddleSync}
          disabled={paddleSyncing || priceItems.length === 0}
          style={{
            padding: "10px 22px", borderRadius: 10, border: "none", cursor: paddleSyncing || priceItems.length === 0 ? "not-allowed" : "pointer",
            background: paddleSyncing ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg,#a855f7,#7c3aed)",
            color: "#fff", fontWeight: 800, fontSize: 13,
            boxShadow: paddleSyncing ? "none" : "0 4px 16px rgba(168,85,247,0.4)",
            display: "flex", alignItems: "center", gap: 8,
            transition: "all 200ms",
          }}
        >
          {paddleSyncing ? (
            <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Paddle Syncing...</>
          ) : (
            <>🔄 Paddle로 Sync하기</>
          )}
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <select
            value={filterPlan}
            onChange={e => setFilterPlan(e.target.value)}
            style={{ background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 7, color: "#94a3b8", padding: "6px 12px", fontSize: 11 }}
          >
            <option value="all">모든 플랜</option>
            {PLANS.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
          </select>
          <select
            value={filterCycle}
            onChange={e => setFilterCycle(e.target.value)}
            style={{ background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 7, color: "#94a3b8", padding: "6px 12px", fontSize: 11 }}
          >
            <option value="all">모든 주기</option>
            {CYCLES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Pricing List Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#3b4d6e", padding: "40px 0", fontSize: 13 }}>
          {histLoading ? "⏳ 이력 Loading..." : "📭 저장된 요금제가 없습니다. 플랜별 Pricing 설정 Tab에서 Pricing을 Register 후 저장하세요."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 4 }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: showHistory ? "80px 90px 90px 1fr 1fr 1fr 100px 100px 60px" : "80px 90px 90px 1fr 1fr 1fr 100px 60px",
            gap: 8, padding: "8px 14px",
            background: "rgba(255,255,255,0.03)", borderRadius: 8,
            fontSize: 10, fontWeight: 700, color: "#7c8fa8",
          }}>
            <span>플랜</span><span>Account수</span><span>주기</span>
            <span>Basic Pricing</span><span>Discount율</span><span>최종 Pricing</span>
            <span>Paddle Status</span>
            {showHistory && <span style={{ color: "#eab308" }}>Register일</span>}
            <span>관리</span>
          </div>

          {filtered.map((item, idx) => {
            const { plan, acct } = parsePlanAcct(item.menu_key);
            const pc = planColor(plan);
            const final = calcFinal(item.price_krw, item.discount_pct);
            const hasPaddlePrice = !!item.paddle_price_id;
            const isInactive = showHistory && (item.is_active === 0 || item.is_active === "0" || item.is_active === false);

            return (
              <div key={item.id || idx} style={{
                display: "grid",
                gridTemplateColumns: showHistory ? "80px 90px 90px 1fr 1fr 1fr 100px 100px 60px" : "80px 90px 90px 1fr 1fr 1fr 100px 60px",
                gap: 8, padding: "10px 14px", alignItems: "center",
                background: isInactive ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${isInactive ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.05)"}`,
                borderRadius: 8, opacity: isInactive ? 0.5 : 1,
                transition: "background 150ms",
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: pc,
                  background: `${pc}18`, borderRadius: 6, padding: "2px 8px", textAlign: "center",
                }}>
                  {PLANS.find(p => p.id === plan)?.emoji} {PLANS.find(p => p.id === plan)?.label || plan}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>
                  {ACCOUNT_TIERS.find(t => t.key === acct)?.label || acct}
                </span>
                <span style={{
                  fontSize: 10, color: "#4f8ef7",
                  background: "rgba(79,142,247,0.1)", borderRadius: 6, padding: "2px 8px", textAlign: "center",
                }}>
                  {cycleLabel(item.cycle)}
                </span>
                <span style={{ fontSize: 12, color: "#e2e8f0" }}>
                  {krw(parseInt(item.price_krw))}
                </span>
                <span style={{ fontSize: 12, color: parseFloat(item.discount_pct) > 0 ? "#22c55e" : "#3b4d6e" }}>
                  {parseFloat(item.discount_pct) > 0 ? `${item.discount_pct}%` : "—"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: final > 0 ? "#e2e8f0" : "#3b4d6e" }}>
                  {krw(final)}
                </span>
                {/* Paddle Status */}
                <div style={{ fontSize: 9 }}>
                  {isInactive ? (
                    <span style={{ background: "rgba(100,100,100,0.15)", color: "#6b7280", border: "1px solid rgba(100,100,100,0.2)", borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>
                      과거 이력
                    </span>
                  ) : hasPaddlePrice ? (
                    <span style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>✅ Sync됨</span>
                  ) : (
                    <span style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>⏳ 미Sync</span>
                  )}
                  {item.paddle_sync_error && (
                    <div style={{ color: "#f87171", marginTop: 2, fontSize: 8, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis" }}>
                      ⚠️ {item.paddle_sync_error}
                    </div>
                  )}
                </div>
                {/* 이력 모드: Register일 */}
                {showHistory && (
                  <span style={{ fontSize: 9, color: isInactive ? "#6b7280" : "#4f8ef7" }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString("ko-KR") : "—"}
                  </span>
                )}
                <button
                  onClick={() => !isInactive && on삭제(item.id)}
                  disabled={isInactive}
                  style={{
                    padding: "4px 8px", borderRadius: 6,
                    border: `1px solid ${isInactive ? "rgba(100,100,100,0.2)" : "rgba(239,68,68,0.3)"}`,
                    background: isInactive ? "rgba(100,100,100,0.05)" : "rgba(239,68,68,0.08)",
                    color: isInactive ? "#4b5563" : "#ef4444",
                    fontSize: 11, cursor: isInactive ? "not-allowed" : "pointer", fontWeight: 700,
                  }}
                >🗑</button>
              </div>
            );
          })}
        </div>
      )}

      {/* 메뉴 접근 권한 List */}
      {items.filter(it => !it.menu_key?.startsWith(PLAN_ACCT_PFX)).length > 0 && (
        <div style={{ marginTop: 8, padding: "12px 14px", background: "rgba(79,142,247,0.05)", borderRadius: 10, border: "1px solid rgba(79,142,247,0.1)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", marginBottom: 8 }}>
            🔒 메뉴 접근 권한 설정 ({items.filter(it => !it.menu_key?.startsWith(PLAN_ACCT_PFX)).length}건)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {items.filter(it => !it.menu_key?.startsWith(PLAN_ACCT_PFX)).map((it, i) => (
              <span key={i} style={{
                fontSize: 9, padding: "2px 8px", borderRadius: 99, fontWeight: 700,
                background: `${planColor(it.plan)}18`, border: `1px solid ${planColor(it.plan)}33`, color: planColor(it.plan),
              }}>
                {it.menu_key.split(MENU_SEP).pop()} · {it.plan}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PricingMatrix — 동적 플랜 × Account수 × Payment주기
   • 플랜 Add/삭제 가능 (Free는 고정, Paid Plan 동적)
   • 계정 수 追가/삭제 가능 (숫자 직접 입력 or Unlimited)
   ══════════════════════════════════════════════════════════════════════════ */
const PLAN_COLORS = ["#4f8ef7","#a855f7","#f59e0b","#22c55e","#ef4444","#06b6d4","#ec4899","#84cc16"];
const PLAN_EMOJIS = ["📈","🚀","🌐","🌱","⭐","💎","🔥","✨"];

function PricingMatrix({ cycle, data, onChange, onTabChange }) {
  // 동적 플랜 관리 (Free 고정 + Paid Plan)
  const [plans, setPlans] = useState(() => DEFAULT_PLANS);
  // 동적 계정 수 관리 — localStorage 영속화 (삭제 후 Refresh해도 유지)
  const TIERS_STORAGE_KEY = "geniego_pricing_tiers";
  const [tiers, setTiers] = useState(() => {
    try {
      const saved = localStorage.getItem(TIERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_TIERS;
  });

  // tiers Change 시 즉시 localStorage 저장 (영속화)
  const saveTiers = (newTiers) => {
    setTiers(newTiers);
    try { localStorage.setItem(TIERS_STORAGE_KEY, JSON.stringify(newTiers)); } catch {}
  };

  const [openPlan, setOpenPlan] = useState("growth");
  // 플랜 Add 입력 Status
  const [newPlanLabel, setNewPlanLabel] = useState("");
  const [showAddPlan,  setShowAddPlan]  = useState(false);
  // 계정 수 Add 입력 Status
  const [newTier수, setNewTier수] = useState("");
  const [newTierUnlimited, setNewTierUnlimited] = useState(false);
  const [showAddTier, setShowAddTier] = useState(false);

  const cycleInfo = CYCLES.find(c => c.key === cycle) || CYCLES[0];
  const isMonthly = cycle === "monthly";

  // Paid Plan만 (Free 제외)
  const paidPlans = plans.filter(p => !p.isDemo);

  // 플랜 Add
  const addPlan = () => {
    const label = newPlanLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const idx = paidPlans.length % PLAN_COLORS.length;
    setPlans(prev => [...prev, { id, label, color: PLAN_COLORS[idx], emoji: PLAN_EMOJIS[idx], isDemo: false }]);
    setNewPlanLabel("");
    setShowAddPlan(false);
    setOpenPlan(id);
  };

  // 플랜 삭제 (Free 삭제 불가)
  const removePlan = (planId) => {
    if (planId === 'free') return;
    setPlans(prev => prev.filter(p => p.id !== planId));
    if (openPlan === planId) setOpenPlan(plans.find(p => !p.isDemo && p.id !== planId)?.id || null);
  };

  // 계정 수 Add
  const addTier = () => {
    if (newTierUnlimited) {
      if (tiers.some(t => t.unlimited)) return;
      saveTiers([...tiers, { key: 'unlimited', label: 'Unlimited', count: 0, unlimited: true }]);
    } else {
      const count = parseInt(newTier수);
      if (!count || count <= 0) return;
      const key = String(count);
      if (tiers.some(t => t.key === key)) return;
      saveTiers([...tiers, { key, label: `${count}Account`, count }].sort((a, b) => {
        if (a.unlimited) return 1;
        if (b.unlimited) return -1;
        return a.count - b.count;
      }));
    }
    setNewTier수("");
    setNewTierUnlimited(false);
    setShowAddTier(false);
  };

  // 계정 수 삭제 — localStorage 반영
  const removeTier = (tierKey) => {
    saveTiers(tiers.filter(t => t.key !== tierKey));
  };

  // BasicValue Reset Button (관리자가 원하면 복구)
  const resetTiers = () => {
    saveTiers(DEFAULT_TIERS);
  };


  return (
    <div style={{ display: "grid", gap: 8 }}>
      {/* Payment주기 Tab */}
      <div style={{ display: "flex", gap: 3, background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: 4, marginBottom: 4 }}>
        {CYCLES.map(c => (
          <button key={c.key} onClick={() => onTabChange(c.key)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 9, border: "none", cursor: "pointer",
            background: cycle === c.key
              ? "linear-gradient(135deg,rgba(79,142,247,0.25),rgba(99,102,241,0.2))"
              : "transparent",
            borderBottom: cycle === c.key ? "2px solid #4f8ef7" : "2px solid transparent",
            color: cycle === c.key ? "#93c5fd" : "#7c8fa8",
            fontWeight: cycle === c.key ? 800 : 500,
            fontSize: 12, transition: "all 150ms",
          }}>
            {c.label}
            {c.months > 1 && (
              <div style={{ fontSize: 9, color: cycle === c.key ? "#60a5fa" : "#3b4d6e", marginTop: 1 }}>x{c.months}개월</div>
            )}
          </button>
        ))}
      </div>

      {/* 안내 Banner */}
      {isMonthly ? (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 11, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", display: "flex", alignItems: "center", gap: 8 }}>
          <span>✏️</span>
          <span><strong>Monthly BasicPricing</strong>을 계정 수per로 입력하세요. 3개월·6개월·Annual Tab의 BasicPricing은 <strong>MonthlyPricing × 개월수</strong>로 Auto Calculate됩니다.</span>
        </div>
      ) : (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 11, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", color: "#93c5fd", display: "flex", alignItems: "center", gap: 8 }}>
          <span>🔒</span>
          <div><strong>Basic Pricing</strong>은 <strong>MonthlyPricing x {cycleInfo.months}개월</strong>로 Auto Calculate됩니다. <span style={{ color: "#4ade80", marginLeft: 6 }}>Discount율(%)만 이 Tab에서 직접 입력하세요.</span></div>
        </div>
      )}

      {/* ── Free 플랜: 모든 Demo 접근 (Pricing None) ── */}
      <div style={{
        borderRadius: 10, overflow: "hidden",
        border: "1px solid rgba(141,164,196,0.3)",
        background: "rgba(141,164,196,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
          <span style={{ fontSize: 18 }}>🆓</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: "#8da4c4" }}>Free 플랜</span>
            <span style={{ fontSize: 10, color: "#7c8fa8", marginLeft: 8 }}>Free 회Cost Price입 → 모든 Demo 버전 접근 가능</span>
          </div>
          <span style={{
            fontSize: 10, padding: "3px 10px", borderRadius: 99, fontWeight: 700,
            background: "rgba(141,164,196,0.15)", border: "1px solid rgba(141,164,196,0.3)", color: "#8da4c4",
          }}>Pricing None · Auto 부여</span>
        </div>
        <div style={{ padding: "8px 16px 12px", borderTop: "1px solid rgba(141,164,196,0.1)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["모든 대시보드 Demo","AI Marketing Auto화 Demo","Customer CRM Demo","커머스·물류 Demo","Analysis·Performance Demo","모든 Features 읽기전용 체험"].map(t => (
              <span key={t} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(141,164,196,0.1)", color: "#8da4c4", border: "1px solid rgba(141,164,196,0.15)" }}>✓ {t}</span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>※ Live Data 입력·편집·저장 Feature은 Paid Plan에서만 사용 가능합니다.</div>
        </div>
      </div>

      {/* ── Paid Plan List (동적) ── */}
      {paidPlans.map(plan => {
        const isOpen = openPlan === plan.id;
        const hasValues = tiers.some(tier => {
          const k = `${PLAN_ACCT_PFX}${plan.id}__${tier.key}`;
          return (parseInt(data[k]?.["monthly_price"]) || 0) > 0;
        });

        return (
          <div key={plan.id} style={{
            borderRadius: 10, overflow: "hidden",
            border: `1px solid ${isOpen ? plan.color + "55" : "rgba(255,255,255,0.07)"}`,
            background: isOpen ? `${plan.color}07` : "rgba(255,255,255,0.01)",
            transition: "all 150ms",
          }}>
            <div onClick={() => setOpenPlan(isOpen ? null : plan.id)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", cursor: "pointer",
            }}>
              <span style={{ fontSize: 18 }}>{plan.emoji}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: plan.color }}>{plan.label}</span>
                <span style={{ fontSize: 10, color: "#7c8fa8", marginLeft: 8 }}>Paid Plan</span>
              </div>
              {hasValues && (
                <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 99, fontWeight: 700, background: `${plan.color}18`, border: `1px solid ${plan.color}33`, color: plan.color }}>Pricing Register됨</span>
              )}
              {/* 플랜 삭제 Button */}
              <button onClick={e => { e.stopPropagation(); removePlan(plan.id); }} style={{
                padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 10, cursor: "pointer", fontWeight: 700,
              }}>🗑 삭제</button>
              <span style={{ fontSize: 10, color: "#7c8fa8", transition: "transform 200ms", transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span>
            </div>

            {isOpen && (
              <div style={{ paddingBottom: 12 }}>
                {/* 계정 수 Header + Add Button */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px 10px", borderBottom: `1px solid ${plan.color}22` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7c8fa8", flex: 1 }}>계정 수</span>
                  {isMonthly && <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", width: 140 }}>Monthly BasicPricing (₩) ✏️</span>}
                  {!isMonthly && <span style={{ fontSize: 10, fontWeight: 700, color: "#60a5fa", width: 140 }}>BasicPricing 🔒 auto</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", width: 100 }}>Discount율 (%) ✏️</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7c8fa8", width: 100 }}>Discount 후 월 Pricing</span>
                  {!isMonthly && <span style={{ fontSize: 10, fontWeight: 700, color: plan.color, width: 100 }}>{cycleInfo.label} Total액</span>}
                  <span style={{ width: 24 }} />
                </div>

                {/* 계정 수per 행 */}
                {tiers.map(tier => {
                  const rowKey      = `${PLAN_ACCT_PFX}${plan.id}__${tier.key}`;
                  const monthlyBase = parseInt(data[rowKey]?.["monthly_price"]) || 0;
                  const storedMonthly = data[rowKey]?.["monthly_price"] ?? "";
                  const autoBase    = !isMonthly && monthlyBase > 0 ? monthlyBase * cycleInfo.months : 0;
                  const disc        = data[rowKey]?.[`${cycle}_disc`] ?? "";
                  const finalMonthly = calcFinal(monthlyBase, disc);
                  const total        = finalMonthly * cycleInfo.months;
                  const hasMonthly   = monthlyBase > 0;

                  return (
                    <div key={tier.key} style={{
                      display: "flex", gap: 8, padding: "7px 16px", alignItems: "center",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      background: !isMonthly && hasMonthly ? "rgba(59,130,246,0.02)" : "transparent",
                    }}>
                      {/* 계정 수 라벨 */}
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: plan.color,
                        background: `${plan.color}14`, borderRadius: 6,
                        padding: "3px 8px", textAlign: "center", minWidth: 60, flexShrink: 0,
                      }}>{tier.label}</span>

                      {/* BasicPricing 입력 */}
                      {isMonthly ? (
                        <div style={{ position: "relative", width: 140, flexShrink: 0 }}>
                          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: plan.color, fontWeight: 700, pointerEvents: "none" }}>₩</span>
                          <input
                            type="number" placeholder="0" value={storedMonthly}
                            onChange={e => onChange(rowKey, "monthly", "price", e.target.value)}
                            style={{
                              width: "100%", background: "#0a1628",
                              border: `1px solid ${storedMonthly ? plan.color + "66" : "#1e3a5f"}`,
                              borderRadius: 7, color: storedMonthly ? "#e2e8f0" : "#94a3b8",
                              padding: "7px 8px 7px 22px", fontSize: 12, outline: "none", boxSizing: "border-box",
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "7px 10px", width: 140, flexShrink: 0,
                          background: hasMonthly ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
                          border: `1px solid ${hasMonthly ? "rgba(59,130,246,0.3)" : "#1e3a5f"}`,
                          borderRadius: 7, fontSize: 12, color: hasMonthly ? "#93c5fd" : "#3b4d6e",
                        }}>
                          {hasMonthly ? (
                            <><span style={{ fontWeight: 700 }}>₩{Number(autoBase).toLocaleString("ko-KR")}</span>
                            <span style={{ fontSize: 8, color: "#60a5fa", fontWeight: 800, background: "rgba(59,130,246,0.2)", padding: "2px 5px", borderRadius: 4 }}>₩{monthlyBase.toLocaleString()}x{cycleInfo.months}</span></>
                          ) : <span style={{ fontSize: 10, color: "#3b4d6e", fontStyle: "italic" }}>MonthlyPricing 미입력</span>}
                        </div>
                      )}

                      {/* Discount율 */}
                      <div style={{ position: "relative", width: 100, flexShrink: 0 }}>
                        <input
                          type="number" placeholder="0" min="0" max="99" value={disc}
                          onChange={e => onChange(rowKey, cycle, "disc", e.target.value)}
                          style={{
                            width: "100%", background: "#0a1628",
                            border: `1px solid ${disc ? "#22c55e66" : "#1e3a5f"}`,
                            borderRadius: 7, color: "#4ade80",
                            padding: "7px 26px 7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box",
                          }}
                        />
                        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#4ade80", fontWeight: 700, pointerEvents: "none" }}>%</span>
                      </div>

                      {/* Discount 후 월 Pricing */}
                      <div style={{ fontSize: 12, fontWeight: 800, color: finalMonthly > 0 ? "#e2e8f0" : "#3b4d6e", width: 100, flexShrink: 0 }}>
                        {krw(finalMonthly)}
                        {parseFloat(disc) > 0 && monthlyBase > 0 && <div style={{ fontSize: 9, color: "#4ade80", marginTop: 1 }}>{disc}% Discount</div>}
                      </div>

                      {/* Total액 (비Monthly) */}
                      {!isMonthly && (
                        <div style={{ fontSize: 12, fontWeight: 800, color: total > 0 ? plan.color : "#3b4d6e", width: 100, flexShrink: 0 }}>
                          {krw(total)}
                          {total > 0 && <div style={{ fontSize: 9, color: "#7c8fa8", marginTop: 1 }}>월 {krw(finalMonthly)} x {cycleInfo.months}</div>}
                        </div>
                      )}

                      {/* 계정 수 삭제 */}
                      <button onClick={() => removeTier(tier.key)} title="이 계정 수 제거" style={{
                        padding: "3px 6px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.25)",
                        background: "rgba(239,68,68,0.05)", color: "#ef4444", fontSize: 10, cursor: "pointer", flexShrink: 0,
                      }}>✕</button>
                    </div>
                  );
                })}

                {/* 계정 수 Add */}
                <div style={{ padding: "10px 16px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  {showAddTier ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8", cursor: "pointer" }}>
                        <input type="checkbox" checked={newTierUnlimited} onChange={e => setNewTierUnlimited(e.target.checked)} />
                        Unlimited
                      </label>
                      {!newTierUnlimited && (
                        <input
                          type="number" placeholder="계정 수 입력" value={newTier수}
                          onChange={e => setNewTier수(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addTier()}
                          style={{
                            background: "#0a1628", border: "1px solid #22c55e66",
                            borderRadius: 7, color: "#e2e8f0", padding: "6px 10px",
                            fontSize: 12, outline: "none", width: 120,
                          }}
                        />
                      )}
                      <button onClick={addTier} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Add</button>
                      <button onClick={() => setShowAddTier(false)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setShowAddTier(true)} style={{
                        padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                        border: "1px dashed rgba(255,255,255,0.2)", background: "transparent", color: "#7c8fa8",
                      }}>+ 계정 수 Add</button>
                      <button onClick={resetTiers} title="1·5·10·Unlimited으로 Reset" style={{
                        padding: "5px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer",
                        border: "1px solid rgba(100,100,100,0.2)", background: "transparent", color: "#475569",
                      }}>↺ BasicValue</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Paid Plan Add UI ── */}
      <div style={{ borderRadius: 10, border: "1px dashed rgba(255,255,255,0.15)", padding: "10px 16px" }}>
        {showAddPlan ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#7c8fa8" }}>플랜명:</span>
            <input
              type="text" placeholder="예: Basic, Team, Business..." value={newPlanLabel}
              onChange={e => setNewPlanLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlan()}
              style={{
                flex: 1, background: "#0a1628", border: "1px solid #4f8ef766",
                borderRadius: 7, color: "#e2e8f0", padding: "7px 12px",
                fontSize: 12, outline: "none",
              }}
            />
            <button onClick={addPlan} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>➕ 플랜 Add</button>
            <button onClick={() => setShowAddPlan(false)} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowAddPlan(true)} style={{
            width: "100%", padding: "8px", borderRadius: 8, border: "none",
            background: "transparent", color: "#4f8ef7",        fontSize: 12, fontWeight: 700,
            cursor: "pointer", textAlign: "center",
          }}>➕ Paid Plan Add하기 (Growth / Pro / Enterprise 외 커스텀 플랜)</button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════

/* ══════════════════════════════════════════════════════════════════════════
   플랜별 Basic 접근Permission BasicValue (냉정한 Feature 가치 Analysis)
   ─────────────────────────────────────────────────────────────────────────
   Free      : Basic 대시보드·Onboarding·Help만 (Demo 체험 Min)
   Growth    : Marketing·커머스·Analysis 핵심 + CRM Basic + 정산Basic
   Pro       : Growth 모든 + AI 자동화·Forecast·AdvancedAnalysis + 재무·리포트
   Enterprise: 모든 (system 제외 - 관리자 전용)
   ══════════════════════════════════════════════════════════════════════════ */
const ADMIN_ONLY_SECTION = "system"; // 관리자 센터 — 유료 회원에게 Impressions 불필요

// =========================================================
// PLAN_DEFAULTS_MAP — Competitor Analysis 기반 Geniego-ROI 전용 Permission
// 참고: HubSpot(Starter/Pro/Enterprise), Klaviyo(Free/Core/Pro),
//       Shopify Plus, 매출force Marketing Cloud, Netsuite
// 원칙:
//   Growth  : 핵심 Marketing·커머스·CRM 성장 Feature (HubSpot Starter+α)
//   Pro     : AI 자동화·Forecast·AdvancedAnalysis·전Channel (Klaviyo Pro급)
//   Enterprise: 모든 + Writeback·롤백·데이터거버넌스 (매출force Enterprise급)
// =========================================================
const PLAN_DEFAULTS_MAP = {
  // ── ① 홈 대시보드
  // HubSpot: Starter부터 대시보드 / Klaviyo: Free BasicStatistics
  // Growth: 실Time모니터링+Notification피드 / Pro/Enterprise: 동일
  kpi_widgets:        { free: true,  growth: true,  pro: true,  enterprise: true  },
  realtime_mon:       { free: false, growth: true,  pro: true,  enterprise: true  },
  quick_links:        { free: true,  growth: true,  pro: true,  enterprise: true  },
  alert_feed:         { free: false, growth: true,  pro: true,  enterprise: true  },

  // ── ② AI Marketing Auto화
  // 경쟁사 참고: HubSpot Pro=워크플로우, 매출force MC=Advanced여정, Klaviyo Pro=AIForecast
  // Growth : Campaign·Ad소재·콘텐츠·Budget 핵심
  // Pro    : AI Forecast·여정빌더·A/B·AI전략미리보기
  // Enterprise: Pro 모든 + AI모델Performance관리(멀티브랜드 최적화)
  ai_ad_creative:      { free: false, growth: true,  pro: true,  enterprise: true  },
  campaign_setup:      { free: false, growth: true,  pro: true,  enterprise: true  },
  ai_strategy_preview: { free: false, growth: false, pro: true,  enterprise: true  },
  campaign_mgmt:       { free: false, growth: true,  pro: true,  enterprise: true  },
  campaign_list:       { free: false, growth: true,  pro: true,  enterprise: true  },
  ab_test:             { free: false, growth: false, pro: true,  enterprise: true  },
  ad_creative_mgmt:    { free: false, growth: true,  pro: true,  enterprise: true  },
  campaign_report:     { free: false, growth: true,  pro: true,  enterprise: true  },
  // Customer Journey: 매출force MC Journey Builder = Advanced / HubSpot = Pro+
  journey_canvas_main: { free: false, growth: false, pro: true,  enterprise: true  },
  trigger_setting:     { free: false, growth: false, pro: true,  enterprise: true  },
  action_nodes:        { free: false, growth: false, pro: true,  enterprise: true  },
  journey_stat:        { free: false, growth: false, pro: true,  enterprise: true  },
  // AI Forecast: Klaviyo Pro ForecastAnalysis / HubSpot Enterprise AI
  churn_pred:          { free: false, growth: false, pro: true,  enterprise: true  },
  ltv_predict:         { free: false, growth: false, pro: true,  enterprise: true  },
  purchase_prob:       { free: false, growth: false, pro: true,  enterprise: true  },
  graph_score:         { free: false, growth: false, pro: true,  enterprise: true  },
  next_action:         { free: false, growth: false, pro: true,  enterprise: true  },
  product_reco:        { free: false, growth: false, pro: true,  enterprise: true  },
  ai_insight_ad:       { free: false, growth: false, pro: true,  enterprise: true  },
  model_perf:          { free: false, growth: false, pro: false, enterprise: true  }, // AI모델 Performance관리·배포 = Enterprise
  // Content Calendar: HubSpot Starter+ / Klaviyo Core+
  content_plan:        { free: false, growth: true,  pro: true,  enterprise: true  },
  publish_schedule:    { free: false, growth: true,  pro: true,  enterprise: true  },
  sns_connect:         { free: false, growth: true,  pro: true,  enterprise: true  },
  content_stat:        { free: false, growth: true,  pro: true,  enterprise: true  },
  // Budget Planner: Growth=배분·Forecast·리포트 / ROI 시뮬레이션=Pro+
  budget_alloc:        { free: false, growth: true,  pro: true,  enterprise: true  },
  spend_forecast:      { free: false, growth: true,  pro: true,  enterprise: true  },
  roi_calc:            { free: false, growth: false, pro: true,  enterprise: true  },
  budget_report:       { free: false, growth: true,  pro: true,  enterprise: true  },

  // ── ③ Ad·Channel Analysis
  // 경쟁사: Google Analytics 360=기여모델링(Enterprise), HubSpot=ChannelPerformance(Starter+)
  // Growth : Channel요약도·ROAS·키워드·ChannelKPI
  // Pro    : 기여도Analysis(터치모델)·경쟁사Analysis(Basic)·Graph스코어
  // Enterprise: 트렌드AIForecast·시장점유율·Channel기여(Advanced)·Conversion경로·Influencer
  ad_summary:          { free: false, growth: true,  pro: true,  enterprise: true  },
  ad_channel:          { free: false, growth: true,  pro: true,  enterprise: true  },
  ad_product:          { free: false, growth: true,  pro: true,  enterprise: true  },
  ad_roas:             { free: false, growth: true,  pro: true,  enterprise: true  },
  keyword_analysis:    { free: false, growth: true,  pro: true,  enterprise: true  },
  competitor_ana:      { free: false, growth: false, pro: true,  enterprise: true  }, // Basic Competitor Analysis = Pro
  trend_analysis:      { free: false, growth: false, pro: false, enterprise: true  }, // AI 트렌드 Forecast 모델 = Enterprise
  market_share:        { free: false, growth: false, pro: false, enterprise: true  }, // 시장점유율 = Enterprise
  // 기여도: 데이터드리븐 기여모델 = Pro / Conversion경로모든 = Enterprise
  touch_model:         { free: false, growth: false, pro: true,  enterprise: true  },
  channel_attr:        { free: false, growth: false, pro: false, enterprise: true  }, // Channel Attribution 모든 모델 = Enterprise
  roas_calc_m:         { free: false, growth: true,  pro: true,  enterprise: true  },
  conv_path:           { free: false, growth: false, pro: false, enterprise: true  }, // Conversion Path Analysis = Enterprise
  // Channel KPI: Growth부터 Basic
  impressions:         { free: false, growth: true,  pro: true,  enterprise: true  },
  conv_rate:           { free: false, growth: true,  pro: true,  enterprise: true  },
  cpa_cpc:             { free: false, growth: true,  pro: true,  enterprise: true  },
  channel_compare:     { free: false, growth: true,  pro: true,  enterprise: true  },
  // Influencer: DB+Campaign=Enterprise / PerformanceAnalysis=Pro / 정산=Enterprise
  influencer_db:       { free: false, growth: false, pro: false, enterprise: true  }, // Influencer DB = Enterprise (풀 Influencer Marketing Platform → Enterprise 핵심 가치)
  campaign_inf:        { free: false, growth: false, pro: false, enterprise: true  }, // Influencer Campaign 집행 = Enterprise
  settlement_inf:      { free: false, growth: false, pro: false, enterprise: true  }, // Influencer 정산 = Enterprise
  perf_inf:            { free: false, growth: false, pro: true,  enterprise: true  },  // Influencer Performance Search = Pro (Basic Performance Confirm)
  graph_score_menu:    { free: false, growth: false, pro: true,  enterprise: true  },

  // ── ④ Customer·CRM
  // 경쟁사: Klaviyo=Free500명/CoreUnlimited, HubSpot=AI세그먼트 Pro+, 매출force Einstein=Enterprise
  // Growth : CustomerDB·360뷰·Tag·RFM·Email·Kakao·SMS·PopupBasic
  // Pro    : AI세그먼트·A/B·WhatsApp/LINE/Instagram DM·PopupAdvanced
  // Enterprise: Biz Board(대규모Ad)·AI세그먼트Advanced
  customer_db:         { free: false, growth: true,  pro: true,  enterprise: true  },
  customer_360:        { free: false, growth: true,  pro: true,  enterprise: true  },
  tag_mgmt:            { free: false, growth: true,  pro: true,  enterprise: true  },
  customer_import:     { free: false, growth: true,  pro: true,  enterprise: true  },
  rfm_analysis:        { free: false, growth: true,  pro: true,  enterprise: true  },
  ai_segment:          { free: false, growth: false, pro: true,  enterprise: true  }, // AI Segments = Pro (Advanced 세그멘테이션 — Pro 핵심 가치로 하향 조정)
  segment_rule:        { free: false, growth: true,  pro: true,  enterprise: true  },
  segment_push:        { free: false, growth: true,  pro: true,  enterprise: true  },
  // Email: Klaviyo Core+ / A/B=Pro+
  email_tpl_list:      { free: false, growth: true,  pro: true,  enterprise: true  },
  email_editor:        { free: false, growth: true,  pro: true,  enterprise: true  },
  html_import:         { free: false, growth: true,  pro: true,  enterprise: true  },
  email_send:          { free: false, growth: true,  pro: true,  enterprise: true  },
  email_ab:            { free: false, growth: true,  pro: true,  enterprise: true  }, // Email A/B = Growth (Klaviyo Free도 제공하는 Basic Feature)
  email_stat:          { free: false, growth: true,  pro: true,  enterprise: true  },
  email_bounce:        { free: false, growth: true,  pro: true,  enterprise: true  },
  email_schedule:      { free: false, growth: true,  pro: true,  enterprise: true  },
  // Kakao: Growth Basic / Biz Board(대형광고 채널) = Enterprise
  alimtalk:            { free: false, growth: true,  pro: true,  enterprise: true  },
  friendtalk:          { free: false, growth: true,  pro: true,  enterprise: true  },
  bizboard:            { free: false, growth: false, pro: false, enterprise: true  }, // Kakao Biz Board 대형Ad = Enterprise
  kakao_send:          { free: false, growth: true,  pro: true,  enterprise: true  },
  kakao_stat:          { free: false, growth: true,  pro: true,  enterprise: true  },
  kakao_setting:       { free: false, growth: true,  pro: true,  enterprise: true  },
  // WhatsApp: Global = Pro / Advanced설정 = Enterprise
  wa_template:         { free: false, growth: false, pro: true,  enterprise: true  },
  wa_broadcast:        { free: false, growth: false, pro: true,  enterprise: true  },
  wa_setting:          { free: false, growth: false, pro: false, enterprise: true  }, // WhatsApp Advanced설정(APIChannel) = Enterprise
  wa_stat:             { free: false, growth: false, pro: true,  enterprise: true  },
  // SMS: Growth Basic Domestic
  sms_send:            { free: false, growth: true,  pro: true,  enterprise: true  },
  sms_template:        { free: false, growth: true,  pro: true,  enterprise: true  },
  sms_stat:            { free: false, growth: true,  pro: true,  enterprise: true  },
  "080_reject":        { free: false, growth: true,  pro: true,  enterprise: true  },
  // Instagram/Facebook DM: Global = Pro
  ig_dm:               { free: false, growth: false, pro: true,  enterprise: true  },
  fb_dm:               { free: false, growth: false, pro: true,  enterprise: true  },
  dm_auto:             { free: false, growth: false, pro: true,  enterprise: true  },
  dm_campaign:         { free: false, growth: false, pro: true,  enterprise: true  },
  // LINE: 일본·동남아 = Pro / Advanced설정 = Enterprise
  line_msg:            { free: false, growth: false, pro: true,  enterprise: true  },
  line_template:       { free: false, growth: false, pro: true,  enterprise: true  },
  line_setting:        { free: false, growth: false, pro: false, enterprise: true  }, // LINE Channel Advanced설정 = Enterprise
  line_stat:           { free: false, growth: false, pro: true,  enterprise: true  },
  // 웹Popup: Growth=Basic이탈Popup / Pro=트리거·A/B
  popup_editor:        { free: false, growth: true,  pro: true,  enterprise: true  },
  exit_popup:          { free: false, growth: true,  pro: true,  enterprise: true  },
  popup_trigger:       { free: false, growth: false, pro: true,  enterprise: true  },
  popup_ab:            { free: false, growth: false, pro: true,  enterprise: true  },
  popup_stat:          { free: false, growth: true,  pro: true,  enterprise: true  },

  // ── ⑤ 커머스·물류
  // 경쟁사: Shopify Plus=멀티Channel(Plus전용), Netsuite WMS=Enterprise급
  // Growth : Domestic Channel(Coupang·Naver·Cafe24)·Orders허브·BasicWMS·카탈로그
  // Pro    : GlobalChannel(Shopify·Amazon)·Stock조정·위치·바코드·Price규칙
  // Enterprise: Rakuten/Temu(틈새Channel)·모든ChannelSync·디지털셀프모든·AIPrice최적화·AmazonAdvanced운영
  channel_coupang:     { free: false, growth: true,  pro: true,  enterprise: true  },
  channel_naver:       { free: false, growth: true,  pro: true,  enterprise: true  },
  channel_shopify:     { free: false, growth: false, pro: true,  enterprise: true  },
  channel_amazon:      { free: false, growth: false, pro: true,  enterprise: true  },
  channel_cafe24:      { free: false, growth: true,  pro: true,  enterprise: true  },
  channel_rakuten:     { free: false, growth: false, pro: false, enterprise: true  }, // Rakuten = Enterprise Global
  channel_temu:        { free: false, growth: false, pro: false, enterprise: true  }, // Temu = Enterprise Global
  channel_sync_all:    { free: false, growth: false, pro: false, enterprise: true  }, // 전Channel Sync = Enterprise
  // Domestic Channel Orders Growth부터
  kr_order_list:       { free: false, growth: true,  pro: true,  enterprise: true  },
  kr_claim:            { free: false, growth: true,  pro: true,  enterprise: true  },
  kr_delivery:         { free: false, growth: true,  pro: true,  enterprise: true  },
  kr_settlement:       { free: false, growth: true,  pro: true,  enterprise: true  },
  // Orders Hub
  order_all:           { free: false, growth: true,  pro: true,  enterprise: true  },
  order_channel:       { free: false, growth: true,  pro: true,  enterprise: true  },
  order_excel:         { free: false, growth: true,  pro: true,  enterprise: true  },
  claim_list:          { free: false, growth: true,  pro: true,  enterprise: true  },
  return_mgmt:         { free: false, growth: true,  pro: true,  enterprise: true  },
  exchange_mgmt:       { free: false, growth: true,  pro: true,  enterprise: true  },
  delivery_status:     { free: false, growth: true,  pro: true,  enterprise: true  },
  delivery_alert:      { free: false, growth: true,  pro: true,  enterprise: true  },
  delivery_excel:      { free: false, growth: true,  pro: true,  enterprise: true  },
  settlement_list:     { free: false, growth: true,  pro: true,  enterprise: true  },
  settlement_month:    { free: false, growth: true,  pro: true,  enterprise: true  }, // Monthly Settlement = Growth (Domestic 셀러 필수 Feature)
  settlement_excel:    { free: false, growth: true,  pro: true,  enterprise: true  },
  collect_channel:     { free: false, growth: true,  pro: true,  enterprise: true  },
  collect_schedule:    { free: false, growth: false, pro: false, enterprise: true  }, // 수집 Auto스케줄 = Enterprise 거버넌스
  collect_log:         { free: false, growth: false, pro: false, enterprise: true  }, // Collection Log 모든 = Enterprise
  // WMS: BasicStock=Growth / Stock조정·위치·바코드=Pro / AdvancedWMS운영=Enterprise에서 포함
  inventory_list:      { free: false, growth: true,  pro: true,  enterprise: true  },
  inventory_alert:     { free: false, growth: true,  pro: true,  enterprise: true  },
  inventory_adjust:    { free: false, growth: false, pro: true,  enterprise: true  },
  inbound:             { free: false, growth: true,  pro: true,  enterprise: true  },
  outbound:            { free: false, growth: true,  pro: true,  enterprise: true  },
  location:            { free: false, growth: false, pro: true,  enterprise: true  },
  barcode:             { free: false, growth: false, pro: true,  enterprise: true  },
  // 카탈로그: 일괄Register·Sync·Price관리=Growth / AIPrice최적화=Enterprise
  product_list:        { free: false, growth: true,  pro: true,  enterprise: true  },
  product_upload:      { free: false, growth: true,  pro: true,  enterprise: true  },
  product_sync:        { free: false, growth: true,  pro: true,  enterprise: true  },
  product_excel:       { free: false, growth: true,  pro: true,  enterprise: true  },
  price_mgmt:          { free: false, growth: true,  pro: true,  enterprise: true  },
  stock_alert:         { free: false, growth: true,  pro: true,  enterprise: true  },
  // Price Optimization: Price규칙=Growth / AI탄성·시뮬레이션·AIRecommended=Enterprise(Dynamic Pricing=Shopify Plus)
  price_rule:          { free: false, growth: true,  pro: true,  enterprise: true  },
  elasticity:          { free: false, growth: false, pro: false, enterprise: true  }, // AI Price탄성 Analysis = Enterprise
  price_simulate:      { free: false, growth: false, pro: false, enterprise: true  }, // Price Simulation = Enterprise
  price_reco:          { free: false, growth: false, pro: false, enterprise: true  }, // AI Price Recommendations = Enterprise
  // 디지털 셀프: SearchRank·콘텐츠·스코어 = Enterprise (대형Platform 운영)
  shelf_rank:          { free: false, growth: false, pro: false, enterprise: true  }, // SearchRank Analysis = Enterprise
  shelf_content:       { free: false, growth: false, pro: false, enterprise: true  }, // 콘텐츠 최적화 = Enterprise
  shelf_score:         { free: false, growth: false, pro: false, enterprise: true  }, // 셀프·리스팅 스코어 = Enterprise
  // Amazon Advanced 운영: 모두 Enterprise (Global 전자상거래 법규·Policy Compliance)
  amazon_health:       { free: false, growth: false, pro: false, enterprise: true  }, // Amazon Account 건전성 = Enterprise
  amazon_policy:       { free: false, growth: false, pro: false, enterprise: true  }, // Amazon 정책 관리 = Enterprise
  amazon_review:       { free: false, growth: false, pro: false, enterprise: true  }, // Amazon 리뷰 모니터링 = Enterprise
  amazon_listing:      { free: false, growth: false, pro: false, enterprise: true  }, // Amazon 리스팅 품질 = Enterprise

  // ── ⑥ Analysis·Performance
  // 경쟁사: HubSpot=커스텀리포트(Pro+)/예약리포트(Enterprise), Tableau=Enterprise급BI
  // Growth : Performance요약도·Channel·상품·Campaign·P&L개요·AIInsights·커스텀리포트·엑셀
  // Pro    : 코호트·P&LChannel/상품·AI이상감지·Auto리포트(Basic)
  // Enterprise: 예약발송리포트·API데이터Export·대시보드Share·경쟁사AIAnalysis
  perf_summary:        { free: false, growth: true,  pro: true,  enterprise: true  },
  perf_channel:        { free: false, growth: true,  pro: true,  enterprise: true  },
  perf_product:        { free: false, growth: true,  pro: true,  enterprise: true  },
  perf_campaign:       { free: false, growth: true,  pro: true,  enterprise: true  },
  cohort:              { free: false, growth: false, pro: true,  enterprise: true  },
  multi_team_analysis:  { free: false, growth: false, pro: false, enterprise: true  },
  pnl_overview:        { free: false, growth: true,  pro: true,  enterprise: true  },
  pnl_channel:         { free: false, growth: false, pro: true,  enterprise: true  },
  pnl_product:         { free: false, growth: false, pro: true,  enterprise: true  },
  pnl_trend:           { free: false, growth: false, pro: true,  enterprise: true  },
  insight_main:        { free: false, growth: true,  pro: true,  enterprise: true  },
  anomaly_detect:      { free: false, growth: false, pro: true,  enterprise: true  },
  auto_report:         { free: false, growth: false, pro: false, enterprise: true  }, // Auto Report = Enterprise (전사 Auto화 리포팅 → Enterprise 핵심 가치)
  competitor_ai:       { free: false, growth: false, pro: true,  enterprise: true  }, // Competitor AI Analysis = Pro (Advanced Marketing Analysis 필수)
  custom_report:       { free: false, growth: true,  pro: true,  enterprise: true  },
  scheduled_rpt:       { free: false, growth: false, pro: false, enterprise: true  }, // Scheduled 발송 리포트 = Enterprise (auto_report와 묶어 Enterprise 가치 형성)
  excel_export:        { free: false, growth: true,  pro: true,  enterprise: true  },
  api_export:          { free: false, growth: false, pro: false, enterprise: true  }, // API 데이터 Export = Enterprise (스트리밍 Data Pipeline)
  dashboard_share:     { free: false, growth: false, pro: false, enterprise: true  }, // 대시보드 외부 Share·임베드 = Enterprise

  // ── ⑦ 정산·재무
  // 경쟁사: Netsuite=재무모든(Enterprise), QuickBooks=in progress소기업
  // Growth : 정산List·Channelper정산·지급List·엑셀·Payment이력
  // Pro    : P&LChannel/상품per · 월per정산Unified · 지급Approval
  // Enterprise: Tax Invoice·월per정산Unified·지급Approval결재 (재무Auto화)
  recon_list:          { free: false, growth: true,  pro: true,  enterprise: true  },
  recon_channel:       { free: false, growth: true,  pro: true,  enterprise: true  },
  recon_month:         { free: false, growth: false, pro: true,  enterprise: true  }, // Monthly Settlement Unified = Pro (멀티Channel Unified 정산 필요)
  recon_excel:         { free: false, growth: true,  pro: true,  enterprise: true  },
  tax_invoice:         { free: false, growth: false, pro: true,  enterprise: true  }, // Tax Invoice = Pro (Domestic 법인사업자 기준 Pro 필수)
  settle_list:         { free: false, growth: true,  pro: true,  enterprise: true  },
  settle_approve:      { free: false, growth: false, pro: true,  enterprise: true  }, // Payment Approval = Pro (HubSpot 워크플로우 Approval 기준)
  settle_excel:        { free: false, growth: true,  pro: true,  enterprise: true  },
  my_plan:             { free: true,  growth: true,  pro: true,  enterprise: true  },
  plan_upgrade:        { free: true,  growth: true,  pro: true,  enterprise: true  },
  payment_hist:        { free: false, growth: true,  pro: true,  enterprise: true  },
  invoice:             { free: false, growth: true,  pro: true,  enterprise: true  },

  // ── ⑧ Auto화·AI
  // 경쟁사: HubSpot=워크플로우(Pro+), 매출force Flow=Enterprise, Klaviyo Flows=Core+
  // Growth : Notification정책List·로그·ApprovalList·이력·Onboarding
  // Pro    : AIRule엔진·AI정책·RuleTest·Notification평가·Action프리셋·Writeback설정·로그
  // Enterprise: Writeback Immediate Rollback (대규모 실수 복구)
  getting_started:     { free: true,  growth: true,  pro: true,  enterprise: true  },
  setup_wizard:        { free: true,  growth: true,  pro: true,  enterprise: true  },
  quick_setup:         { free: true,  growth: true,  pro: true,  enterprise: true  },
  tutorial:            { free: true,  growth: true,  pro: true,  enterprise: true  },
  // AI Rule Engine: Klaviyo Flows=Core+ / Auto집행=Pro+
  ai_policy:           { free: false, growth: false, pro: true,  enterprise: true  },
  rule_list:           { free: false, growth: false, pro: true,  enterprise: true  },
  rule_test:           { free: false, growth: false, pro: true,  enterprise: true  },
  rule_log:            { free: false, growth: true,  pro: true,  enterprise: true  }, // Rule Execution Log 열람 = Growth (Basic 투명성 보장)
  // Alert Policies
  alert_policy_list:   { free: false, growth: true,  pro: true,  enterprise: true  },
  action_presets:      { free: false, growth: false, pro: true,  enterprise: true  },
  alert_evaluate:      { free: false, growth: false, pro: true,  enterprise: true  },
  alert_log:           { free: false, growth: true,  pro: true,  enterprise: true  },
  // Approval 요청
  approval_list:       { free: false, growth: true,  pro: true,  enterprise: true  },
  approval_decide:     { free: false, growth: false, pro: true,  enterprise: true  },
  approval_hist:       { free: false, growth: true,  pro: true,  enterprise: true  },
  // Writeback: 설정·로그=Pro / 즉시롤백=Enterprise (매출force 역방향Integration=Enterprise)
  wb_config:           { free: false, growth: false, pro: true,  enterprise: true  },
  wb_log:              { free: false, growth: false, pro: true,  enterprise: true  },
  wb_rollback:         { free: false, growth: false, pro: false, enterprise: true  }, // Immediate Rollback = Enterprise

  // ── ⑨ 데이터·Integration
  // 경쟁사: CDP(Segment)=Enterprise / 서버사이드Pixel=Paid / API스트리밍=Enterprise
  // Growth : Domestic광고 채널(Meta·Google·TikTok·Naver·Kakao·Coupang)·라이선스
  // Pro    : GlobalChannel(LINE·Shopify·Amazon)·Event수집·데이터스키마·매핑·API키·웹훅·1stPartyPixel
  // Enterprise: Event정규화·OAuth관리(파트너급)·데이터상품·수집스케줄·로그모든
  meta_ads:            { free: false, growth: true,  pro: true,  enterprise: true  },
  google_ads:          { free: false, growth: true,  pro: true,  enterprise: true  },
  tiktok_ads:          { free: false, growth: true,  pro: true,  enterprise: true  },
  naver_ads:           { free: false, growth: true,  pro: true,  enterprise: true  },
  kakao_ads:           { free: false, growth: true,  pro: true,  enterprise: true  },
  line_ads:            { free: false, growth: false, pro: true,  enterprise: true  },
  coupang_conn:        { free: false, growth: true,  pro: true,  enterprise: true  },
  shopify_conn:        { free: false, growth: false, pro: true,  enterprise: true  },
  amazon_conn:         { free: false, growth: false, pro: true,  enterprise: true  },
  // Event·Data Pipeline
  event_ingest:        { free: false, growth: false, pro: true,  enterprise: true  },
  event_normalize:     { free: false, growth: false, pro: false, enterprise: true  }, // Event 정규화·데이터클렌징 = Enterprise
  data_schema:         { free: false, growth: false, pro: true,  enterprise: true  },
  data_mapping:        { free: false, growth: false, pro: true,  enterprise: true  },
  data_product:        { free: false, growth: false, pro: false, enterprise: true  }, // 데이터상품·거버넌스 = Enterprise
  // API 키: Pro / OAuth(파트너 Integration) = Enterprise
  api_key_list:        { free: false, growth: false, pro: true,  enterprise: true  },
  api_create:          { free: false, growth: false, pro: true,  enterprise: true  },
  webhook:             { free: false, growth: false, pro: true,  enterprise: true  },
  oauth_mgmt:          { free: false, growth: false, pro: false, enterprise: true  }, // OAuth 파트너 관리 = Enterprise
  api_log:             { free: false, growth: false, pro: true,  enterprise: true  },
  // 라이선스: Growth부터 Activate
  license_activate:    { free: false, growth: true,  pro: true,  enterprise: true  },
  license_status:      { free: false, growth: true,  pro: true,  enterprise: true  },
  service_toggle:      { free: false, growth: false, pro: true,  enterprise: true  },
  // 1st-Party Pixel: Pro / PixelStatistics(MarketingIntelligence) = Enterprise
  pixel_config:        { free: false, growth: false, pro: true,  enterprise: true  },
  pixel_snippet:       { free: false, growth: false, pro: true,  enterprise: true  },
  pixel_verify:        { free: false, growth: false, pro: true,  enterprise: true  },
  pixel_stat:          { free: false, growth: false, pro: false, enterprise: true  }, // Pixel Statistics 대시보드 = Enterprise

  // ── ⑩ 내 Team·Help
  // 경쟁사: HubSpot=Team Members초대(Starter+), 매출force=RBAC(Enterprise)
  // Growth : Team MembersList·초대
  // Pro    : Team 활동 내역 Search
  // Enterprise: 역할 설정(RBAC)·Team Members 활동 모든 감사
  team_members:         { free: false, growth: true,  pro: true,  enterprise: true  },
  team_invite:          { free: false, growth: true,  pro: true,  enterprise: true  },
  team_roles:           { free: false, growth: false, pro: false, enterprise: true  }, // RBAC 역할 설정 = Enterprise
  team_activity:        { free: false, growth: false, pro: true,  enterprise: true  }, // Team 활동 내역 = Pro (감사목적)
  // Help: Free부터 FAQ / Support티켓=Growth+
  getting_started_help: { free: true,  growth: true,  pro: true,  enterprise: true  },
  faq:                  { free: true,  growth: true,  pro: true,  enterprise: true  },
  video_tutorial:       { free: true,  growth: true,  pro: true,  enterprise: true  },
  release_notes:        { free: true,  growth: true,  pro: true,  enterprise: true  },
  support_ticket:       { free: false, growth: true,  pro: true,  enterprise: true  },

  // ── ★ 신규 Add Feature (v430) — Recommended Permission ────────────────────────────────
  // 리뷰 & UGC Analysis: List·감성Analysis=Growth / AI답변·UGCPerformance=Pro / 경쟁사Compare=Enterprise
  review_list:          { free: false, growth: true,  pro: true,  enterprise: true  },
  review_sentiment:     { free: false, growth: true,  pro: true,  enterprise: true  },
  review_ai_reply:      { free: false, growth: false, pro: true,  enterprise: true  }, // AI Auto 답변 = Pro
  ugc_performance:      { free: false, growth: false, pro: true,  enterprise: true  }, // UGC Performance = Pro
  review_keyword:       { free: false, growth: true,  pro: true,  enterprise: true  },
  review_competitor:    { free: false, growth: false, pro: false, enterprise: true  }, // 경쟁사 리뷰 Compare = Enterprise

  // SmartConnect 허브: BasicIntegration=Pro / 양방향실Time+파트너API=Enterprise
  smartconnect_list:    { free: false, growth: false, pro: true,  enterprise: true  },
  smartconnect_config:  { free: false, growth: false, pro: true,  enterprise: true  },
  smartconnect_mapping: { free: false, growth: false, pro: true,  enterprise: true  },
  smartconnect_log:     { free: false, growth: false, pro: false, enterprise: true  }, // 실Time 로그 모든 = Enterprise
  smartconnect_partner: { free: false, growth: false, pro: false, enterprise: true  }, // 파트너 API = Enterprise

  // 운영 허브 (Operations): 배치·재처리=Pro / Notification발송=Enterprise
  ops_batch:            { free: false, growth: false, pro: true,  enterprise: true  },
  ops_retry:            { free: false, growth: false, pro: true,  enterprise: true  },
  ops_notify:           { free: false, growth: false, pro: false, enterprise: true  }, // Notification 발송 = Enterprise
  ops_log:              { free: false, growth: false, pro: true,  enterprise: true  },

  // Asia Logistics 3PL: ListSearch=Growth / Add·편집=Pro / 삭제·계약=Enterprise
  tpl_list:             { free: false, growth: true,  pro: true,  enterprise: true  },
  tpl_add:              { free: false, growth: false, pro: true,  enterprise: true  }, // 업체 Add = Pro
  tpl_edit:             { free: false, growth: false, pro: true,  enterprise: true  }, // 업체 편집 = Pro
  tpl_delete:           { free: false, growth: false, pro: false, enterprise: true  }, // 업체 삭제 = Enterprise
  tpl_contract:         { free: false, growth: false, pro: false, enterprise: true  }, // 계약 관리 = Enterprise

  // 화폐 Unit 선택 (전역): Growth부터 / 실Time 환율=Pro+
  currency_select:      { free: false, growth: true,  pro: true,  enterprise: true  }, // 화폐Unit 선택
  currency_realtime:    { free: false, growth: false, pro: true,  enterprise: true  }, // 실Time 환율 = Pro

  // Data 상품 Spec: 스키마·품질=Pro / SLA·소유자=Enterprise
  data_product_spec:    { free: false, growth: false, pro: true,  enterprise: true  },
  data_product_quality: { free: false, growth: false, pro: true,  enterprise: true  },
  data_product_sla:     { free: false, growth: false, pro: false, enterprise: true  }, // SLA = Enterprise
  data_product_owner:   { free: false, growth: false, pro: false, enterprise: true  }, // 소유자 지정 = Enterprise

  // Audit Log (Audit): 본인=Growth / 모든·Export=Enterprise
  audit_my_log:         { free: false, growth: true,  pro: true,  enterprise: true  },
  audit_full_log:       { free: false, growth: false, pro: false, enterprise: true  }, // 모든 감사 = Enterprise
  audit_export:         { free: false, growth: false, pro: false, enterprise: true  }, // Export = Enterprise

  // 시스템 모니터: Search=Pro / Notification설정=Enterprise
  sysmon_status:        { free: false, growth: false, pro: true,  enterprise: true  },
  sysmon_api:           { free: false, growth: false, pro: true,  enterprise: true  },
  sysmon_alert:         { free: false, growth: false, pro: false, enterprise: true  }, // Notification 설정 = Enterprise
};



// 플랜별 접근 Grade 요약도
const PLAN_SUMMARY = {
  free:       { label: "Demo 체험",   desc: "주요 위젯·빠른 링크·튜토리얼·고객센터 열람 (오가닉 데이터 한정)",                       icon: "🆓" },
  growth:     { label: "Marketing 성장", desc: "Domestic Channel Ad·커머스·CRM Basic·ChannelKPI·WMS Basic·Analysis 핵심",        icon: "📈" },
  pro:        { label: "AI 자동화",   desc: "Growth 권한 전체 + AI 예측·고객 여정 빌더·해외 글로벌 채널·자동화 룰 엔진·고급 BI 및 오픈 API",      icon: "🚀" },
  enterprise: { label: "모든 Unlimited", desc: "Pro 권한 전체 + DB 라이트백 롤백·글로벌 아마존 시장 검사·마켓 점유율 분석 엔진·자체 데이터 결합 상품", icon: "🌐" },
};


/*
   MenuAccessTab — Free/Growth/Pro/Enterprise 플랜별 접근Permission
   • 관리자 전용 system 섹션(관리자센터) 제외
   • PLAN_DEFAULTS_MAP 기반 Recommended BasicValue Apply Button
   • 개별 클릭으로 편집 가능
   • 정산재무 플랜Payment와 Sync 배지 표시
*/
/* ── AI Recommended 설명 데이터 (Competitor Analysis 근거 포함) ─────────────── */
const PLAN_RECOMMEND_REASON = {
  growth: {
    summary: "Growth 플랜은 HubSpot Starter~Pro 수준의 성장 단계 브랜드 전용 플랜입니다. Domestic 주요 Marketing Channel(Meta·Google·Naver·Kakao·Coupang), Email/Kakao/SMS Campaign, WMS Basic, Channel KPI, Custom Report를 포함하여 Revenue 확대를 Support합니다. Global Channel(Shopify·Amazon·LINE·WhatsApp)·AI Forecast·여정 빌더는 운영 복잡도가 높아 Pro 이상에서 제공합니다.",
    sections: [
      { key: "home",       icon: "🏠", label: "홈 대시보드",      access: "권한 전체 일괄 허용",   reason: "대시보드·KPI Widgets·실Time 모니터 등 Basic 현황 파악 Feature은 Growth부터 필수입니다. 단, Advanced Notification Feed는 Pro 이상에서 제공합니다." },
      { key: "ai_marketing", icon: "🚀", label: "AI Marketing Auto화", access: "핵심 모든ow",  reason: "Campaign 설정·관리, AI Ad Creative, Content Calendar, Budget Planner 등 핵심 Marketing Feature을 모든ow합니다. Customer Journey Builder·AI Forecast(이탈/LTV)은 Pro 전용 Feature입니다." },
      { key: "ad_analytics", icon: "📣", label: "Ad·Channel Analysis",    access: "Basic 모든ow",  reason: "Channel KPI, ROAS Analysis 등 핵심 Ad Performance Metric를 제공합니다. 어트리뷰션 기여도 분석·마케팅 인텔리전스·Competitor Analysis은 Advanced AI Feature으로 Pro 이상에서 제공합니다." },
      { key: "crm",        icon: "👤", label: "Customer·CRM",         access: "Basic 모든ow",  reason: "Customer List·RFM 세그먼트·Email/Kakao 기본 캠페인을 모든ow합니다. VIP 세그먼트·AI Segments·LINE/WhatsApp/Instagram DM은 Pro 이상에서 제공합니다." },
      { key: "commerce",   icon: "🛒", label: "커머스·물류",       access: "핵심 모든ow",  reason: "상품 List·Catalog Sync·Orders Hub·Inventory 관리·WMS Basic Feature을 포함합니다. Price Optimization·Shopify/Amazon Integration은 Pro 이상에서 제공합니다." },
      { key: "analytics",  icon: "📊", label: "Analysis·Performance",         access: "Basic 모든ow",  reason: "Performance Hub·P&L Overview·Insights 피드·Custom Report·Excel Export를 제공합니다. AI Anomaly Detection·Competitor AI Analysis·Auto Report·API Export는 Pro 이상입니다." },
      { key: "finance",    icon: "💳", label: "정산·재무",         access: "Basic 모든ow",  reason: "Settlement History·Payment List·Monthly Settlement 등 Basic 재무 Feature을 제공합니다. Tax Invoice 발행·Payment Approval·월per 손익 Channel/상품 Analysis은 Pro 이상에서 제공합니다." },
      { key: "automation", icon: "🤖", label: "Auto화·AI",         access: "Limit 모든ow",  reason: "Onboarding·Notification List·Approval List 등 Basic Auto화 Feature을 모든ow합니다. AI Rule Engine·Writeback·Advanced Alert Policies 평가는 복잡한 운영 인프라가 필요하여 Pro 이상에서 Support합니다." },
      { key: "data",       icon: "🔌", label: "데이터·Integration",       access: "주요 모든ow",  reason: "Meta/Google/TikTok/Naver/Kakao/Coupang 등 주요 Channel Integration과 라이선스 관리를 모든ow합니다. Event 수집·데이터 스키마·API 키 관리·Pixel 설정은 Pro 이상에서 제공합니다." },
      { key: "help",       icon: "👥", label: "내 Team·Help",       access: "Basic 모든ow",  reason: "Team Members List·초대·활동 내역·Help·Support 티켓을 제공합니다. 역할 설정(Team Permission 분리)은 복잡한 조직 구조가 필요하여 Pro 이상에서 제공합니다." },
    ],
  },
  pro: {
    summary: "Pro 플랜은 '빠르게 성장하는 브랜드·에전담 상담 시'를 위한 플랜으로, Growth Feature 모든 + AI Forecast·Rule 엔진·Advanced Analysis·모든 Channel Integration을 포함합니다. 데이터 기반 Auto화와 Advanced Marketing 전략을 Run할 수 있습니다.",
    sections: [
      { key: "home",       icon: "🏠", label: "홈 대시보드",      access: "권한 전체 일괄 허용",   reason: "모든 대시보드 Feature·Real-time Monitoring·Notification Feed 모든를 모든ow합니다. 경영진 레벨의 Unified 현황 파악이 가능합니다." },
      { key: "ai_marketing", icon: "🚀", label: "AI Marketing Auto화", access: "권한 전체 일괄 허용",  reason: "Customer Journey Builder·AI Forecast(이탈/LTV/구매확률)·Graph Score·AI Ad Insights 모든를 모든ow합니다. AI가 최적의 Marketing Action을 Recommended하고 Auto 집행할 수 있습니다." },
      { key: "ad_analytics", icon: "📣", label: "Ad·Channel Analysis",    access: "권한 전체 일괄 허용",  reason: "Attribution Analysis(터치 모델)·Marketing Intelligence·Competitor Analysis·디지털 셀프까지 모든 Ad Analysis Feature을 모든ow합니다. Amazon Risk 관리도 Pro부터 제공됩니다." },
      { key: "crm",        icon: "👤", label: "Customer·CRM",         access: "권한 전체 일괄 허용",  reason: "VIP 세그먼트·AI Segments·클러스터 Analysis·LINE/WhatsApp/Instagram DM Campaign 모든를 모든ow합니다. 다Channel Customer Journey을 완전히 Auto화할 수 있습니다." },
      { key: "commerce",   icon: "🛒", label: "커머스·물류",       access: "권한 전체 일괄 허용",  reason: "Price Optimization·Shopify/Amazon/디지털 셀프 Integration 모든를 포함합니다. Global Channel 확장과 지능형 Price 전략 Run이 가능합니다." },
      { key: "analytics",  icon: "📊", label: "Analysis·Performance",         access: "권한 전체 일괄 허용",  reason: "AI Anomaly Detection·Auto Report·Competitor AI Analysis·API 데이터 Export·대시보드 Share 모든를 모든ow합니다. 전사적 데이터 기반 의사결정이 가능합니다." },
      { key: "finance",    icon: "💳", label: "정산·재무",         access: "권한 전체 일괄 허용",  reason: "Tax Invoice 발행·Payment Approval·월per 손익 Channel/상품 Analysis 모든를 모든ow합니다. 멀티Channel 재무 관리와 전자 정산이 가능합니다." },
      { key: "automation", icon: "🤖", label: "Auto화·AI",         access: "권한 전체 일괄 허용",  reason: "AI Rule Engine·Alert Policies 평가·Action Presets·Writeback(되돌리기) 설정·로그 모든를 모든ow합니다. 운영 Auto화의 핵심 인프라를 완전히 활용할 수 있습니다." },
      { key: "data",       icon: "🔌", label: "데이터·Integration",       access: "권한 전체 일괄 허용",  reason: "Event 수집·정규화·데이터 스키마·매핑·API 키 관리·웹훅·1st-Party Pixel·Pixel Statistics 모든를 모든ow합니다. 완전한 Data Pipeline을 구성할 수 있습니다." },
      { key: "help",       icon: "👥", label: "내 Team·Help",       access: "권한 전체 일괄 허용",  reason: "Team Members 식 List·초대·역할 설정·활동 내역 모든와 Help·Support 티켓 모든를 모든ow합니다. 복잡한 조직 구조와 역할 기반 접근 제어를 완전히 Support합니다." },
    ],
  },
  enterprise: {
    summary: "Enterprise 플랜은 '대형 브랜드·에전담 상담 시·복수 법인 운영 기업'을 위한 최고 Grade 플랜입니다. Pro Feature 모든 + Writeback Immediate Rollback·데이터 되돌리기까지 전 Feature을 Limit 없이 사용합니다. 전담 지원 및 커스텀 계약이 가능합니다.",
    sections: [
      { key: "home",       icon: "🏠", label: "홈 대시보드",      access: "권한 전체 일괄 허용",   reason: "Pro와 동일하게 권한 전체 일괄 허용됩니다. 다수의 Account/브랜드를 Unified 대시보드로 관리할 수 있습니다." },
      { key: "ai_marketing", icon: "🚀", label: "AI Marketing Auto화", access: "권한 전체 일괄 허용",  reason: "Pro 플랜 기능 전체 포함. 여러 브랜드 Account의 AI Marketing 전략을 Unified 운용할 수 있습니다." },
      { key: "ad_analytics", icon: "📣", label: "Ad·Channel Analysis",    access: "권한 전체 일괄 허용",  reason: "Pro 플랜 기능 전체 포함. 다수ry·다Channel Ad Performance를 Unified Analysis하는 에전담 상담 시 시나리오에 최적화됩니다." },
      { key: "crm",        icon: "👤", label: "Customer·CRM",         access: "권한 전체 일괄 허용",  reason: "Pro 플랜 기능 전체 포함. 대규모 Customer Data베이스와 복수 브랜드 CRM을 Unified 운영할 수 있습니다." },
      { key: "commerce",   icon: "🛒", label: "커머스·물류",       access: "권한 전체 일괄 허용",  reason: "Pro 플랜 기능 전체 포함. Global 멀티Channel 커머스와 물류 Unified 운영을 Support합니다." },
      { key: "analytics",  icon: "📊", label: "Analysis·Performance",         access: "권한 전체 일괄 허용",  reason: "Pro 플랜 기능 전체 포함. 기업 모든의 KPI를 Unified 리포팅하고 이사회 수준의 Insights를 제공합니다." },
      { key: "finance",    icon: "💳", label: "정산·재무",         access: "권한 전체 일괄 허용",  reason: "Pro 플랜 기능 전체 포함. 멀티 법인·멀티 Channel 재무 Unified 정산과 ERP Integration이 가능합니다." },
      { key: "automation", icon: "🤖", label: "Auto화·AI",         access: "권한 전체 일괄 허용 + 롤백",  reason: "Pro Feature 모든 + Writeback Immediate Rollback(wb_rollback)까지 모든ow합니다. 대규모 운영에서 실수를 즉시 복구할 수 있는 안전망이 필요하기 때문입니다." },
      { key: "data",       icon: "🔌", label: "데이터·Integration",       access: "권한 전체 일괄 허용",  reason: "Pro 플랜 기능 전체 포함. 기업 규모의 데이터 거버넌스와 완전한 API 생태계를 구축할 수 있습니다." },
      { key: "help",       icon: "👥", label: "내 Team·Help",       access: "권한 전체 일괄 허용",  reason: "Pro 플랜 기능 전체 포함. Unlimited Account과 복수 법인 운영 시 세분화된 역할과 Team 구조 관리가 필수입니다." },
    ],
  },
};


function MenuAccessTab({ menuData, onMenuChange }) {
  const [collapsedSections, setCollapsedSections] = useState({});
  const [highlightPlan, setHighlightPlan] = useState(null);
  const [applied, setApplied] = useState(false);
  // AI Recommended Status
  const [recommendPlan, setRecommendPlan] = useState("growth");
  const [showReasonPanel, setShowReasonPanel] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  // [고도화] Recommended Apply된 rowKey 추적 → 하이라이트용
  const [recommendedKeys, setRecommendedKeys] = useState(new Set());
  const [recommendStats, setRecommendStats] = useState(null); // { total, enabled }
  // 관리자가 Register한 Latest Pricing (API 동적 로드)
  const [planPrices, setPlanPrices] = useState({ growth: null, pro: null, enterprise: null });

  useEffect(() => {
    fetch("/api/auth/pricing/public-plans")
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return;
        const prices = {};
        (d.plans || []).forEach(p => {
          if (!p.hasPricing || !p.tiers || p.tiers.length === 0) return;
          // 1Account(tiers[0]) Monthly Pricing 기준
          const tier1 = p.tiers.find(t => t.acct === "1") || p.tiers[0];
          const monthly = tier1?.cycles?.monthly;
          if (monthly?.monthly_price > 0) {
            prices[p.id] = "₩" + Number(monthly.monthly_price).toLocaleString("ko-KR") + "/월~";
          }
        });
        // 실제 Pricing 없으면 fallback
        if (!prices.growth) prices.growth = "요금제 미등록";
        if (!prices.pro) prices.pro = "요금제 미등록";
        if (!prices.enterprise) prices.enterprise = "요금제 미등록";
        setPlanPrices(prev => ({ ...prev, ...prices }));
      })
      .catch(() => {});
  }, []);

  // 유료 회원에게 보이는 섹션만 (system 제외)
  const USER_MENU_TREE = React.useMemo(() =>
    MENU_TREE.filter(s => s.key !== ADMIN_ONLY_SECTION),
  []);

  // 모든 최하위 key (system 제외)
  const allSubKeys = React.useMemo(() => {
    const keys = [];
    USER_MENU_TREE.forEach(sec => sec.items.forEach(item => (item.subitems || []).forEach(sub => {
      if (sub.leafItems && sub.leafItems.length > 0) {
        sub.leafItems.forEach(lf => keys.push(`${sec.key}${MENU_SEP}${item.key}${MENU_SEP}${sub.key}${MENU_SEP}${lf.key}`));
      } else {
        keys.push(`${sec.key}${MENU_SEP}${item.key}${MENU_SEP}${sub.key}`);
      }
    })));
    return keys;
  }, [USER_MENU_TREE]);

  // 전 플랜 추천 권한 설정 일괄 적용 (기존)
  const applyDefaults = () => {
    USER_MENU_TREE.forEach(sec => sec.items.forEach(item => (item.subitems || []).forEach(sub => {
      const leaves = sub.leafItems || [{ key: sub.key, label: sub.label }];
      leaves.forEach(lf => {
        const rowKey = sub.leafItems
          ? `${sec.key}${MENU_SEP}${item.key}${MENU_SEP}${sub.key}${MENU_SEP}${lf.key}`
          : `${sec.key}${MENU_SEP}${item.key}${MENU_SEP}${lf.key}`;
        const defaults = PLAN_DEFAULTS_MAP[lf.key] || { free: false, growth: false, pro: false, enterprise: false };
        PLANS.forEach(p => onMenuChange(rowKey, p.id, defaults[p.id] ?? false));
      });
    })));
    setApplied(true);
    setRecommendedKeys(new Set());
    setTimeout(() => setApplied(false), 2500);
  };

  // [고도화] 선택된 플랜에 AI Recommended Apply + Recommended 키 추적 + Statistics
  const applyPlanRecommend = () => {
    setRecommendLoading(true);
    setTimeout(() => {
      const newRecommendedKeys = new Set();
      let total = 0, enabled = 0;

      USER_MENU_TREE.forEach(sec => sec.items.forEach(item => (item.subitems || []).forEach(sub => {
        const leaves = sub.leafItems || [{ key: sub.key, label: sub.label }];
        leaves.forEach(lf => {
          const rowKey = sub.leafItems
            ? `${sec.key}${MENU_SEP}${item.key}${MENU_SEP}${sub.key}${MENU_SEP}${lf.key}`
            : `${sec.key}${MENU_SEP}${item.key}${MENU_SEP}${lf.key}`;
          const defaults = PLAN_DEFAULTS_MAP[lf.key] || { free: false, growth: false, pro: false, enterprise: false };
          const recommended = defaults[recommendPlan] ?? false;
          onMenuChange(rowKey, recommendPlan, recommended);
          newRecommendedKeys.add(rowKey);
          total++;
          if (recommended) enabled++;
        });
      })));

      setRecommendedKeys(newRecommendedKeys);
      setRecommendStats({ total, enabled, disabled: total - enabled });
      setRecommendLoading(false);
      setShowReasonPanel(true);
    }, 800);
  };

  const sectionKeys = (secKey) => {
    const sec = USER_MENU_TREE.find(s => s.key === secKey);
    if (!sec) return [];
    return sec.items.flatMap(item => (item.subitems || []).flatMap(sub => {
      if (sub.leafItems && sub.leafItems.length > 0) {
        return sub.leafItems.map(lf => `${secKey}${MENU_SEP}${item.key}${MENU_SEP}${sub.key}${MENU_SEP}${lf.key}`);
      }
      return [`${secKey}${MENU_SEP}${item.key}${MENU_SEP}${sub.key}`];
    }));
  };

  const itemKeys = (secKey, itemKey) => {
    const sec = USER_MENU_TREE.find(s => s.key === secKey);
    const item = sec?.items.find(i => i.key === itemKey);
    if (!item) return [];
    return (item.subitems || []).flatMap(sub => {
      if (sub.leafItems && sub.leafItems.length > 0) {
        return sub.leafItems.map(lf => `${secKey}${MENU_SEP}${itemKey}${MENU_SEP}${sub.key}${MENU_SEP}${lf.key}`);
      }
      return [`${secKey}${MENU_SEP}${itemKey}${MENU_SEP}${sub.key}`];
    });
  };

  const setBulk = (keys, planId, checked) => keys.forEach(k => onMenuChange(k, planId, checked));
  const isSectionChecked = (secKey, planId) => sectionKeys(secKey).every(k => menuData[k]?.[`${planId}_enabled`]);
  const isSectionIndet = (secKey, planId) => !isSectionChecked(secKey, planId) && sectionKeys(secKey).some(k => menuData[k]?.[`${planId}_enabled`]);
  const isItemChecked = (secKey, itemKey, planId) => itemKeys(secKey, itemKey).every(k => menuData[k]?.[`${planId}_enabled`]);
  const isItemIndet = (secKey, itemKey, planId) => !isItemChecked(secKey, itemKey, planId) && itemKeys(secKey, itemKey).some(k => menuData[k]?.[`${planId}_enabled`]);

  const col수 = PLANS.length; // 4
  const gridCols = `1fr repeat(${col수}, 72px)`;

  // ── NEW: 플랜 Color/이모지 매핑
  const PLAN_COLORS = { growth: "#4f8ef7", pro: "#a855f7", enterprise: "#f59e0b" };
  const PLAN_EMOJIS = { growth: "📈", pro: "🚀", enterprise: "🌐" };
  const reasonData = PLAN_RECOMMEND_REASON[recommendPlan];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* ── NEW: AI Recommended 접근Permission Panel ── */}
      <div style={{
        padding: "20px", borderRadius: 14,
        background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(168,85,247,0.06))",
        border: "1px solid rgba(99,102,241,0.3)",
      }}>
        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4, color: "#c4b5fd", display: "flex", alignItems: "center", gap: 8 }}>
          🤖 AI 접근 권한 추천 시스템
          {recommendedKeys.size > 0 && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", fontWeight: 700 }}>
              ✨ {recommendPlan.toUpperCase()} Recommended Apply됨
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#7c8fa8", marginBottom: 16, lineHeight: 1.6 }}>
          플랜을 선택하고 <strong style={{ color: "#a5b4fc" }}>추천 버튼</strong>을 클릭하면 해당 플랜에 최적화된 메뉴 접근 권한이 자동 설정되고,
          각 섹션per로 <strong style={{ color: "#a5b4fc" }}>해당 권한이 필요한 상세 설명</strong>을 제공합니다. 관리자가 언제든 개별로 수정할 수 있습니다.
        </div>

        {/* 플랜 선택 Card — Growth / Pro / Enterprise (Starter 제외) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            {
              id: "growth", label: "Growth", emoji: "📈", color: "#4f8ef7",
              price: planPrices.growth || "Pricing Confirm in progress...",
              desc: "성장 단계 브랜드 · 핵심 마케팅+커머스+CRM",
              includes: ["주요 광고 채널 Integration (Meta·Google·Naver·Kakao·Coupang)", "이메일·카카오 기본 캠페인", "주문·재고·창고 관리(WMS) 베이직", "고객 리스트·RFM 세그먼트", "기본 분석·보고서·엑셀 다운로드"],
              excluded: ["AI 성과 예측(이탈/LTV) — Pro 이상 전용", "고객 여정 시나리오 빌더 — Pro 이상 전용", "자동화 AI 규칙 엔진 — Pro 이상 전용", "어트리뷰션 성과 분석 — Pro 이상 전용"],
            },
            {
              id: "pro", label: "Pro", emoji: "🚀", color: "#a855f7",
              price: planPrices.pro || "Pricing Confirm in progress...",
              desc: "빠르게 성장하는 브랜드 · AI 자동화 모든",
              popular: true,
              includes: ["Growth 플랜 기능 전체 포함", "AI Forecast (이탈·LTV·구매확률)", "고객 여정 빌더 + AI 규칙 엔진", "어트리뷰션 기여도 분석·마케팅 인텔리전스", "라인·왓츠앱·인스타그램 DM", "모든 채널 연동·API 키 발급·픽셀 권한"],
              excluded: ["원본 데이터 즉시 롤백 — Enterprise 전용"],
            },
            {
              id: "enterprise", label: "Enterprise", emoji: "🌐", color: "#f59e0b",
              price: planPrices.enterprise || "문의",
              desc: "대형 브랜드·에전담 상담 시·복수 법인",
              includes: ["Pro 플랜 기능 전체 포함", "원본 데이터 동기화 및 즉시 롤백 (Writeback)", "전담 지원·커스텀 계약", "멀티 법인·멀티 글로벌 채널 통합 관리"],
              excluded: [],
            },
          ].map(plan => (
            <button key={plan.id} type="button"
              onClick={() => { setRecommendPlan(plan.id); setShowReasonPanel(false); setRecommendedKeys(new Set()); setRecommendStats(null); }}
              style={{
                padding: "16px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left", border: "none",
                background: recommendPlan === plan.id ? `${plan.color}1A` : "rgba(255,255,255,0.02)",
                outline: `2px solid ${recommendPlan === plan.id ? plan.color : "rgba(99,140,255,0.12)"}`,
                position: "relative", transition: "all 150ms",
              }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: "#a855f7", color: "#fff", fontSize: 8, fontWeight: 800, padding: "2px 8px", borderRadius: 99 }}>POPULAR</div>
              )}
              <div style={{ fontWeight: 800, fontSize: 14, color: plan.color, marginBottom: 4 }}>{plan.emoji} {plan.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{plan.price}</div>
              <div style={{ fontSize: 10, color: "#7c8fa8", marginBottom: 10, lineHeight: 1.4 }}>{plan.desc}</div>
              <div style={{ fontSize: 9, color: "#4ade80", fontWeight: 700, marginBottom: 3 }}>✅ 포함 기능</div>
              <ul style={{ margin: 0, padding: "0 0 0 12px", fontSize: 9, color: "#4ade80", lineHeight: 1.8 }}>
                {plan.includes.map(f => <li key={f}>{f}</li>)}
              </ul>
              {plan.excluded.length > 0 && <>
                <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, marginTop: 8, marginBottom: 3 }}>🔒 미포함</div>
                <ul style={{ margin: 0, padding: "0 0 0 12px", fontSize: 9, color: "#f87171", lineHeight: 1.8 }}>
                  {plan.excluded.map(f => <li key={f}>{f}</li>)}
                </ul>
              </>}
              {recommendPlan === plan.id && (
                <div style={{ marginTop: 10, fontSize: 10, color: plan.color, fontWeight: 800 }}>✓ 선택됨</div>
              )}
            </button>
          ))}
        </div>

        {/* AI 추천 버튼 + Recommended Statistics */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={applyPlanRecommend} disabled={recommendLoading} style={{
            padding: "12px 28px", borderRadius: 10, border: "none", cursor: recommendLoading ? "not-allowed" : "pointer",
            background: recommendLoading
              ? "rgba(99,102,241,0.3)"
              : `linear-gradient(135deg,${PLAN_COLORS[recommendPlan]},${PLAN_COLORS[recommendPlan]}bb)`,
            color: "#fff", fontWeight: 800, fontSize: 13,
            boxShadow: recommendLoading ? "none" : `0 6px 20px ${PLAN_COLORS[recommendPlan]}44`,
            display: "flex", alignItems: "center", gap: 8, transition: "all 200ms",
          }}>
            {recommendLoading
              ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙</span> AI Analysis in progress...</>
              : <>{PLAN_EMOJIS[recommendPlan]} {recommendPlan === "growth" ? "Growth" : recommendPlan === "pro" ? "Pro" : "Enterprise"} 플랜 추천 메뉴 자동 적용</>
            }
          </button>

          {/* Recommended Statistics 뱃지 */}
          {recommendStats && (
            <>
              <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", fontSize: 11, color: "#4ade80", fontWeight: 700 }}>
                ✅ {recommendStats.enabled}개 Active
              </div>
              <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 11, color: "#f87171", fontWeight: 700 }}>
                🔒 {recommendStats.disabled}개 Inactive
              </div>
              <button onClick={() => { setRecommendedKeys(new Set()); setRecommendStats(null); }} style={{
                padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent", color: "#64748b", fontSize: 10, cursor: "pointer",
              }}>✕ 하이라이트 Disconnect</button>
            </>
          )}

          <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.6 }}>
            ⚠ <strong style={{ color: PLAN_COLORS[recommendPlan] }}>{recommendPlan.toUpperCase()}</strong> 플랜만 업데이트됩니다.<br />
            권한 적용 이후 하단 체크박스로 세부 권한들을 재조정할 수 있습니다.
          </div>
        </div>
      </div>

      {/* ── NEW: AI Recommended 설명 Panel ── */}
      {showReasonPanel && reasonData && (
        <div style={{
          padding: "20px", borderRadius: 14,
          background: `${PLAN_COLORS[recommendPlan]}08`,
          border: `1px solid ${PLAN_COLORS[recommendPlan]}40`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 14, color: PLAN_COLORS[recommendPlan], marginBottom: 6 }}>
                {PLAN_EMOJIS[recommendPlan]} {recommendPlan === "growth" ? "Growth" : recommendPlan === "pro" ? "Pro" : "Enterprise"} 플랜 — 접근Permission Recommended 설명
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7, maxWidth: 700 }}>
                {reasonData.summary}
              </div>
            </div>
            <button onClick={() => setShowReasonPanel(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {reasonData.sections.map(sec => (
              <div key={sec.key} style={{
                padding: "14px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{sec.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: 12, color: "#e2e8f0" }}>{sec.label}</span>
                    <span style={{
                      fontSize: 9, padding: "2px 8px", borderRadius: 99, fontWeight: 700,
                      background: `${PLAN_COLORS[recommendPlan]}1A`,
                      border: `1px solid ${PLAN_COLORS[recommendPlan]}44`,
                      color: PLAN_COLORS[recommendPlan],
                    }}>{sec.access}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>
                    💡 {sec.reason}
                  </div>
                </div>
                <div style={{
                  fontSize: 20, textAlign: "center",
                  color: sec.access.includes("모든") ? "#22c55e" : sec.access.includes("핵심") ? "#4f8ef7" : sec.access.includes("Limit") ? "#eab308" : "#f59e0b",
                }}>
                  {sec.access.includes("모든") ? "✅" : sec.access.includes("핵심") || sec.access.includes("Basic") || sec.access.includes("주요") ? "🔵" : "⚠️"}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 10, color: "#4ade80" }}>
            ✅ AI Recommended Permission이 <strong>{recommendPlan}</strong> 플랜에 Apply되었습니다. 아래 Checkbox에서 개별 메뉴를 자유롭게 편집한 후 <strong>「Permission 설정 저장」</strong> Button을 눌러주세요.
          </div>
        </div>
      )}

      {/* 안내 Banner */}
      <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)" }}>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, color: "#93c5fd" }}>📋 플랜별 엑세스 가능 메뉴 권한 설정</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ padding: "8px 10px", borderRadius: 8, background: p.color + "10", border: `1px solid ${p.color}25` }}>
              <div style={{ fontSize: 11, color: p.color, fontWeight: 800, marginBottom: 2 }}>{p.emoji} {p.label} — {PLAN_SUMMARY[p.id]?.label}</div>
              <div style={{ fontSize: 9, color: "#64748b", lineHeight: 1.5 }}>{PLAN_SUMMARY[p.id]?.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: "#475569" }}>
          ⚙ 관리자 센터 및 과금 제어 메뉴는 플랫폼 최고 권한자 전용이므로 일반 권한 설정에서는 제외됩니다.
        </div>
      </div>

      {/* 빠른 도구 */}
      <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginRight: 4 }}>⚡ Quick Setup:</span>
        <button onClick={applyDefaults} style={{
          padding: "5px 14px", borderRadius: 7, fontSize: 10, fontWeight: 800, cursor: "pointer",
          border: "1px solid rgba(99,102,241,0.5)", background: "rgba(99,102,241,0.12)", color: "#a5b4fc",
          boxShadow: "0 0 8px rgba(99,102,241,0.2)",
        }}>
          ✨ 전 플랜 추천 권한 설정 일괄 적용
        </button>
        {applied && <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>✅ BasicValue Apply됨!</span>}
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
        {PLANS.filter(p => p.id !== 'free').map(p => (
          <button key={p.id} onClick={() => setBulk(allSubKeys, p.id, true)} style={{
            padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${p.color}44`, background: `${p.color}10`, color: p.color,
          }}>{p.emoji} {p.label} 권한 전체 일괄 허용</button>
        ))}
        <button onClick={() => setBulk(allSubKeys, 'free', false)} style={{
          padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
          border: "1px solid rgba(141,164,196,0.3)", background: "rgba(141,164,196,0.07)", color: "#8da4c4",
        }}>🆓 Free 모든 잠금</button>
        <button onClick={() => { PLANS.forEach(p => setBulk(allSubKeys, p.id, false)); }} style={{
          padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
          border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444",
        }}>🚫 모든 Reset</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {PLANS.map(p => (
            <button key={p.id} onMouseEnter={() => setHighlightPlan(p.id)} onMouseLeave={() => setHighlightPlan(null)}
              style={{ padding: "4px 10px", borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: "pointer", border: `1px solid ${p.color}33`, background: highlightPlan === p.id ? p.color + "20" : "transparent", color: p.color }}>
              {p.emoji} {p.label} 강조
            </button>
          ))}
        </div>
      </div>


      {/* 정산재무 Sync 안내 */}
      <div style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 10, color: "#4ade80", display: "flex", alignItems: "center", gap: 8 }}>
        <span>🔄</span>
        <span><b>정산·재무 플랜Payment Integration:</b> 여기서 설정한 Permission은 Users가 플랜 Payment Done 시 자동 적용됩니다. <span style={{ color: "#86efac" }}>my_plan·plan_upgrade·payment_hist·invoice</span>는 모든 Paid Plan에 Basic 모든ow됩니다.</span>
      </div>

      {/* 플랜 Header (sticky) */}
      <div style={{
        display: "grid", gridTemplateColumns: gridCols,
        gap: 4, padding: "8px 14px",
        background: "rgba(15,23,42,0.9)", borderRadius: 8,
        position: "sticky", top: 0, zIndex: 10,
        border: "1px solid rgba(79,142,247,0.25)",
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>메뉴 구조 (관리자 전용 제외)</span>
        {PLANS.map(p => (
          <div key={p.id} style={{ textAlign: "center", opacity: highlightPlan && highlightPlan !== p.id ? 0.35 : 1, transition: "opacity 0.2s" }}>
            <div style={{ fontSize: 14, color: p.color, fontWeight: 800 }}>{p.emoji}</div>
            <div style={{ fontSize: 9, color: p.color, fontWeight: 700 }}>{p.label}</div>
          </div>
        ))}
      </div>

      {/* 메뉴 트리 */}
      {USER_MENU_TREE.map(section => {
        const isCollapsed = collapsedSections[section.key];
        return (
          <div key={section.key} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(79,142,247,0.18)", background: "rgba(79,142,247,0.02)" }}>
            {/* Main Menu 행 */}
            <div style={{
              display: "grid", gridTemplateColumns: gridCols,
              gap: 4, padding: "10px 14px",
              background: "rgba(79,142,247,0.1)", cursor: "pointer", alignItems: "center",
            }} onClick={() => setCollapsedSections(p => ({ ...p, [section.key]: !isCollapsed }))}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#e2e8f0" }}>{section.label}</span>
                <span style={{ fontSize: 9, color: "#7c8fa8" }}>{isCollapsed ? "▶ 펼치기" : "▼ 접기"}</span>
              </div>
              {PLANS.map(p => {
                const checked = isSectionChecked(section.key, p.id);
                const indet = isSectionIndet(section.key, p.id);
                return (
                  <label key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", opacity: highlightPlan && highlightPlan !== p.id ? 0.3 : 1 }}
                    onClick={e => e.stopPropagation()}>
                    <input type="checkbox" ref={el => { if (el) el.indeterminate = indet; }}
                      checked={checked} onChange={e => setBulk(sectionKeys(section.key), p.id, e.target.checked)}
                      style={{ accentColor: p.color, width: 14, height: 14 }} />
                    <span style={{ fontSize: 8, color: p.color, fontWeight: 700 }}>{p.label.slice(0, 3)}</span>
                  </label>
                );
              })}
            </div>

            {!isCollapsed && section.items.map(item => (
              <div key={item.key}>
                {/* in progress메뉴 행 */}
                <div style={{
                  display: "grid", gridTemplateColumns: gridCols,
                  gap: 4, padding: "8px 14px 8px 28px",
                  background: "rgba(168,85,247,0.05)",
                  borderTop: "1px solid rgba(255,255,255,0.04)", alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#a855f7", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#d8b4fe" }}>{item.label}</span>
                  </div>
                  {PLANS.map(p => {
                    const checked = isItemChecked(section.key, item.key, p.id);
                    const indet = isItemIndet(section.key, item.key, p.id);
                    return (
                      <label key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", opacity: highlightPlan && highlightPlan !== p.id ? 0.3 : 1 }}>
                        <input type="checkbox" ref={el => { if (el) el.indeterminate = indet; }}
                          checked={checked} onChange={e => setBulk(itemKeys(section.key, item.key), p.id, e.target.checked)}
                          style={{ accentColor: p.color, width: 13, height: 13 }} />
                        <span style={{ fontSize: 7, color: p.color, fontWeight: 600 }}>{p.emoji}</span>
                      </label>
                    );
                  })}
                </div>

                {(item.subitems || []).map(sub => (
                  <div key={sub.key}>
                    {/* 하위메뉴 Header */}
                    {sub.leafItems && (
                      <div style={{
                        display: "grid", gridTemplateColumns: gridCols,
                        gap: 4, padding: "6px 14px 6px 44px",
                        background: "rgba(99,102,241,0.07)",
                        borderTop: "1px solid rgba(255,255,255,0.03)", alignItems: "center",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#a5b4fc" }}>{sub.label}</span>
                          <span style={{ fontSize: 8, color: "#64748b" }}>{sub.leafItems.length}개</span>
                        </div>
                        {PLANS.map(p => {
                          const allKeys = sub.leafItems.map(lf => `${section.key}${MENU_SEP}${item.key}${MENU_SEP}${sub.key}${MENU_SEP}${lf.key}`);
                          const anyC = allKeys.some(k => menuData[k]?.[`${p.id}_enabled`]);
                          const allC = allKeys.every(k => menuData[k]?.[`${p.id}_enabled`]);
                          return (
                            <label key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer", opacity: highlightPlan && highlightPlan !== p.id ? 0.3 : 1 }}>
                              <input type="checkbox" ref={el => { if (el) el.indeterminate = anyC && !allC; }}
                                checked={allC} onChange={e => setBulk(allKeys, p.id, e.target.checked)}
                                style={{ accentColor: p.color, width: 12, height: 12 }} />
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* 최하위메뉴 행 */}
                    {(sub.leafItems || [{ key: sub.key, label: sub.label }]).map((leaf, li) => {
                      const rowKey = sub.leafItems
                        ? `${section.key}${MENU_SEP}${item.key}${MENU_SEP}${sub.key}${MENU_SEP}${leaf.key}`
                        : `${section.key}${MENU_SEP}${item.key}${MENU_SEP}${leaf.key}`;
                      const row = menuData[rowKey] || {};
                      const defaultCfg = PLAN_DEFAULTS_MAP[leaf.key];
                      const anySet = PLANS.some(p => row[`${p.id}_enabled`]);
                      // [고도화] AI Recommended Apply 여부 — 하이라이트
                      const isRecommended = recommendedKeys.has(rowKey);
                      const recColor = PLAN_COLORS[recommendPlan];
                      // 정산재무 플랜Payment Related 키
                      const isFinanceCore = ['my_plan', 'plan_upgrade', 'payment_hist', 'invoice'].includes(leaf.key);
                      return (
                        <div key={leaf.key} style={{
                          display: "grid", gridTemplateColumns: gridCols,
                          gap: 4, padding: "4px 14px 4px 60px",
                          background: isRecommended
                            ? `${recColor}12`
                            : isFinanceCore ? "rgba(34,197,94,0.03)" : anySet ? "rgba(168,85,247,0.02)" : "transparent",
                          borderTop: "1px solid rgba(255,255,255,0.02)", alignItems: "center",
                          outline: isRecommended ? `1px solid ${recColor}30` : "none",
                          transition: "background 0.3s",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 3, height: 3, borderRadius: "50%", background: anySet ? "#a855f7" : "#3b4d6e", flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: anySet ? "#c4b5fd" : "#64748b" }}>{leaf.label}</span>
                            {isRecommended && (
                              <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 4, background: `${recColor}20`, color: recColor, border: `1px solid ${recColor}40`, fontWeight: 700 }}>✨ AIRecommended</span>
                            )}
                            {isFinanceCore && <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 4, background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}>플랜Payment Integration</span>}
                            {defaultCfg && !defaultCfg.growth && defaultCfg.pro && (
                              <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 4, background: "rgba(168,85,247,0.1)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.2)" }}>Pro+</span>
                            )}
                            {defaultCfg && !defaultCfg.pro && defaultCfg.enterprise && (
                              <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 4, background: "rgba(245,158,11,0.1)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>Enterprise</span>
                            )}
                          </div>
                          {PLANS.map(plan => (
                            <label key={plan.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: highlightPlan && highlightPlan !== plan.id ? 0.25 : 1, transition: "opacity 0.15s" }}>
                              <input
                                type="checkbox"
                                checked={row[`${plan.id}_enabled`] ?? false}
                                onChange={e => onMenuChange(rowKey, plan.id, e.target.checked)}
                                style={{ accentColor: plan.color, width: 14, height: 14 }}
                              />
                            </label>
                          ))}

                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
   DiscountPanel — 플랜별 × 주기per Discount율 관리
   • 플랜별로 다른 Discount율 설정 가능
   • 프리셋 일괄 Apply + 커스텀 입력 + 저장 Integration
   ══════════════════════════════════════════════════════════════════════════ */
function DiscountPanel({ pricingData, setPricingData, handle저장, saving, setMsg, setMsgType }) {
  // 플랜별 Discount율 Status (주기per: quarterly/semi_annual/yearly)
  const DISC_CYCLES = [
    { key: "quarterly",   label: "3개월", months: 3,  color: "#4f8ef7" },
    { key: "semi_annual", label: "6개월", months: 6,  color: "#a855f7" },
    { key: "yearly",      label: "Annual",  months: 12, color: "#f59e0b" },
  ];
  const DISC_PLANS = PLANS.filter(p => !p.isDemo); // Growth/Pro/Enterprise

  // 현재 각 플랜의 대표 Discount율 (저장된 pricingData에서 추출)
  const getPlanDisc = (planId, cycleKey) => {
    // 해당 플랜의 임의 계정 수 행에서 Discount율 읽기 (모든 Account이 같은 Discount율이라고 가정)
    const key = Object.keys(pricingData).find(k => k.startsWith(`${PLAN_ACCT_PFX}${planId}__`));
    return key ? (pricingData[key]?.[`${cycleKey}_disc`] ?? "") : "";
  };

  // 플랜 × 주기per 로컬 입력 Status
  const [discInputs, setDiscInputs] = React.useState(() => {
    const init = {};
    DISC_PLANS.forEach(p => {
      DISC_CYCLES.forEach(c => {
        init[`${p.id}__${c.key}`] = "";
      });
    });
    return init;
  });

  // pricingData에서 초기Value Loading
  React.useEffect(() => {
    const next = {};
    DISC_PLANS.forEach(p => {
      DISC_CYCLES.forEach(c => {
        next[`${p.id}__${c.key}`] = getPlanDisc(p.id, c.key);
      });
    });
    setDiscInputs(next);
  }, [JSON.stringify(pricingData)]);

  // 모든 플랜에 일괄 Discount율 Apply (모든 계정 수 행에 동일하게)
  const applyDisc = (planId, cycleKey, discVal) => {
    setPricingData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith(`${PLAN_ACCT_PFX}${planId}__`)) {
          next[k] = { ...next[k], [`${cycleKey}_disc`]: discVal };
        }
      });
      return next;
    });
  };

  // Single 입력 Change → 즉시 pricingData에 반영
  const handleDiscChange = (planId, cycleKey, val) => {
    setDiscInputs(prev => ({ ...prev, [`${planId}__${cycleKey}`]: val }));
    applyDisc(planId, cycleKey, val);
  };

  // 프리셋 일괄 Apply
  const applyPreset = (preset) => {
    const presets = {
      standard:   { quarterly: "10", semi_annual: "15", yearly: "20" },
      aggressive: { quarterly: "15", semi_annual: "20", yearly: "30" },
      minimal:    { quarterly: "5",  semi_annual: "10", yearly: "15" },
      clear:      { quarterly: "",   semi_annual: "",   yearly: ""   },
    };
    const p = presets[preset];
    if (!p) return;
    const newInputs = { ...discInputs };
    const newPricingData = { ...pricingData };

    DISC_PLANS.forEach(plan => {
      DISC_CYCLES.forEach(c => {
        const val = p[c.key] ?? "";
        newInputs[`${plan.id}__${c.key}`] = val;
        Object.keys(newPricingData).forEach(k => {
          if (k.startsWith(`${PLAN_ACCT_PFX}${plan.id}__`)) {
            newPricingData[k] = { ...newPricingData[k], [`${c.key}_disc`]: val };
          }
        });
      });
    });
    setDiscInputs(newInputs);
    setPricingData(newPricingData);
    const labels = { standard: "표준", aggressive: "공격적", minimal: "Min", clear: "Reset" };
    setMsg(`✅ ${labels[preset]} Discount율 일괄 Apply됨. 저장 Button으로 확정하세요.`);
    setMsgType("ok");
  };

  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      background: "linear-gradient(135deg,rgba(34,197,94,0.05),rgba(79,142,247,0.04))",
      border: "1px solid rgba(34,197,94,0.2)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#4ade80", display: "flex", alignItems: "center", gap: 6 }}>
            🏷 Discount율 관리
          </div>
          <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 2 }}>
            장기 Subscription Discount율을 플랜별 · 주기per로 설정하세요. 입력 후 Bottom 저장 Button을 클릭하세요.
          </div>
        </div>
        {/* 프리셋 Button */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { key: "standard",   label: "표준 (10/15/20%)", color: "#4f8ef7" },
            { key: "aggressive", label: "공격적 (15/20/30%)", color: "#a855f7" },
            { key: "minimal",    label: "Min (5/10/15%)",   color: "#22c55e" },
            { key: "clear",      label: "Reset",              color: "#ef4444" },
          ].map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)} style={{
              padding: "5px 12px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${p.color}44`, background: `${p.color}10`, color: p.color,
              transition: "all 150ms",
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 플랜별 × 주기per 입력 Table */}
      <div style={{ padding: "16px 20px" }}>
        {/* Header 행 */}
        <div style={{
          display: "grid", gridTemplateColumns: "120px repeat(3, 1fr)",
          gap: 8, marginBottom: 8, paddingBottom: 8,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#475569" }}>플랜</span>
          {DISC_CYCLES.map(c => (
            <div key={c.key} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: c.color }}>{c.label}</div>
              <div style={{ fontSize: 9, color: "#475569" }}>({c.months}개Monthly Billing)</div>
            </div>
          ))}
        </div>

        {/* 플랜별 행 */}
        {DISC_PLANS.map(plan => (
          <div key={plan.id} style={{
            display: "grid", gridTemplateColumns: "120px repeat(3, 1fr)",
            gap: 8, padding: "8px 0", alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
          }}>
            {/* 플랜명 */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>{plan.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: plan.color }}>{plan.label}</span>
            </div>

            {/* 주기per Discount율 입력 */}
            {DISC_CYCLES.map(c => {
              const inputKey = `${plan.id}__${c.key}`;
              const val = discInputs[inputKey] ?? "";
              const numVal = parseFloat(val) || 0;
              return (
                <div key={c.key} style={{ position: "relative" }}>
                  <input
                    type="number" min="0" max="99" step="1" placeholder="0"
                    value={val}
                    onChange={e => handleDiscChange(plan.id, c.key, e.target.value)}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: val ? `${plan.color}10` : "#0a1628",
                      border: `1px solid ${val ? plan.color + "55" : "#1e3a5f"}`,
                      borderRadius: 8, color: val ? plan.color : "#94a3b8",
                      padding: "8px 30px 8px 12px", fontSize: 13, fontWeight: 700,
                      outline: "none", textAlign: "center",
                      transition: "all 150ms",
                    }}
                  />
                  <span style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    fontSize: 12, color: val ? plan.color : "#475569", fontWeight: 800, pointerEvents: "none",
                  }}>%</span>
                  {numVal > 0 && (
                    <div style={{ textAlign: "center", fontSize: 9, color: "#4ade80", marginTop: 2 }}>
                      월 {numVal}% 절약
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* 안내 & 저장 Button */}
        <div style={{
          marginTop: 14, padding: "12px 16px", borderRadius: 10,
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>💡 Discount율 Apply 방식</div>
            <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 2 }}>
              Discount율은 각 플랜의 <strong style={{ color: "#e2e8f0" }}>모든 계정 수 단계</strong>에 동일하게 Apply됩니다. 月간 Tab에서 BasicPricing, 여기서 Discount율 설정 후 저장하세요.
            </div>
          </div>
          <button
            onClick={async () => {
              setMsg(""); setMsgType("ok");
              await handle저장();
            }}
            disabled={saving}
            style={{
              padding: "10px 24px", borderRadius: 10, border: "none", flexShrink: 0,
              background: saving ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "#fff", fontWeight: 800, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
              boxShadow: saving ? "none" : "0 4px 16px rgba(34,197,94,0.4)",
            }}
          >
            {saving ? "⏳ 저장 in progress..." : "💾 Discount율 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
   Main SubscriptionPricing Component
   ══════════════════════════════════════════════════════════════════════════ */
export default function SubscriptionPricing() {
  const [innerTab,      setInnerTab]      = useState("pricing");
  const [cycle,         setCycle]         = useState("monthly");
  const [pricingData,   setPricingData]   = useState({});
  const [menuData,      setMenuData]      = useState({});
  const [savedItems,    set저장dItems]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [paddleSyncing, setPaddleSyncing] = useState(false);
  const [paddleResult,  setPaddleResult]  = useState(null);
  const [msg,           setMsg]           = useState("");
  const [msgType,       setMsgType]       = useState("ok");
  const { reloadMenuAccess, isDemo } = useAuth();

  /* ── Load ── */
  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`${API}/auth/pricing/plans`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => {
        
        try {
          const lStr = localStorage.getItem('demo_saved_pricing_items');
          if (lStr) { d.ok = true; d.items = JSON.parse(lStr); }
        } catch(e) {}
        if (!d.ok || !d.items) return;
        set저장dItems(d.items);
        const pMap = {}, mMap = {};
        d.items.forEach(item => {
          const key = item.menu_key;
          if (key.startsWith(PLAN_ACCT_PFX)) {
            if (!pMap[key]) pMap[key] = {};
            // 모든 주기의 price 와 discount_pct 저장 (기존: monthly만 저장해서 나머지 자동계산으로 덮어써짐)
            pMap[key][`${item.cycle}_price`] = item.price_krw || '';
            if (item.cycle === 'monthly') {
                pMap[key]['monthly_price'] = item.price_krw || ''; // 하위 호환
            }
            pMap[key][`${item.cycle}_disc`] = item.discount_pct || '';
          } else {
            if (!mMap[key]) mMap[key] = {};
            mMap[key][`${item.plan}_enabled`] = true;
          }
        });
        setPricingData(pMap);
        setMenuData(mMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePricingChange = useCallback((rowKey, cycleKey, field, val) => {
    setPricingData(prev => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), [`${cycleKey}_${field}`]: val },
    }));
  }, []);

  const handleMenuChange = useCallback((rowKey, planId, checked) => {
    setMenuData(prev => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), [`${planId}_enabled`]: checked },
    }));
  }, []);

  /* ── 모든 저장 ── */
  const handle저장 = async () => {
    // ── Demo Guard ──────────────────────────────────────────────────────
    // Demo Bypass


    setSaving(true); setMsg(""); setPaddleResult(null);
    try {
      const items = [];

      Object.entries(pricingData).forEach(([rowKey, fields]) => {
        // monthly_price 키에서 Monthly Basic Pricing 읽기
        const monthlyBase = parseInt(fields["monthly_price"]) || 0;
        CYCLES.forEach(c => {
          let price = 0;
          if (c.key === 'monthly') {
            // monthly는 monthly_price 키로 저장됨
            price = monthlyBase;
          } else {
            // 비Monthly: 저장된 Value 있으면 사용, 없으면 MonthlyPricing × 개월수 Auto계산
            price = parseInt(fields[`${c.key}_price`]) || 0;
            if (price <= 0 && monthlyBase > 0 && c.months > 1) {
              price = monthlyBase * c.months;
            }
          }
          const disc  = parseFloat(fields[`${c.key}_disc`]) || 0;
          if (price > 0) {
            items.push({
              menu_key:     rowKey,
              menu_path:    rowKey,
              plan:         rowKey.replace(PLAN_ACCT_PFX, "").split("__")[0],
              cycle:        c.key,
              price_krw:    price,
              discount_pct: disc,
            });
          }
        });
      });

      Object.entries(menuData).forEach(([rowKey, fields]) => {
        PLANS.forEach(plan => {
          if (fields[`${plan.id}_enabled`]) {
            items.push({
              menu_key:     rowKey,
              menu_path:    rowKey,
              plan:         plan.id,
              cycle:        "monthly",
              price_krw:    0,
              discount_pct: 0,
            });
          }
        });
      });

      if (items.length === 0) {
        setMsg("⚠️ 저장할 Pricing 또는 Permission 설정이 없습니다. Value을 입력해 주세요."); setMsgType("warn");
        setSaving(false); return;
      }

      
      localStorage.setItem('demo_saved_pricing_items', JSON.stringify(items));
      if (isDemo) {
         setSaving(false); setMsgType("ok");
         setMsg("✅ 구독 요금이 로컬 환경에 캐시 저장되어 새로고침 후에도 유지됩니다.");
         loadData();
         return;
      }
      const r = await fetch(`${API}/auth/pricing/plans`, {
        method: "POST", headers: authHeader(),
        body: JSON.stringify({ items }),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg(`✅ ${d.saved ?? items.length}건 저장 Done! 저장된 Pricing List Tab에서 Confirm하거나 Paddle Sync를 Run하세요.`);
        setMsgType("ok");
        loadData();
        setInnerTab("list");
        // 메뉴 접근 권한 Change가 존음 즉시 반영 (reloadMenuAccess)
        if (reloadMenuAccess) reloadMenuAccess();
      } else {
        setMsg("❌ " + (d.error || "저장 Failed")); setMsgType("err");
      }
    } catch (e) {
      setMsg("❌ 네트워크 Error: " + e.message); setMsgType("err");
    } finally { setSaving(false); }
  };

  /* ── Paddle Sync ── */
  const handlePaddleSync = async () => {
    setPaddleSyncing(true); setPaddleResult(null); setMsg("");
    try {
      const r = await fetch(`${API}/auth/pricing/paddle-sync`, {
        method: "POST", headers: authHeader(),
        body: JSON.stringify({}),
      });
      const d = await r.json();
      setPaddleResult(d);
      if (d.ok) {
        setMsg(`✅ Paddle Sync Done: ${d.synced}건 처리`); setMsgType("ok");
        loadData(); // paddle_price_id 업데이트 반영
      } else {
        setMsg("⚠️ Paddle Sync Error: " + (d.error || "알 수 None")); setMsgType("warn");
      }
    } catch (e) {
      setPaddleResult({ ok: false, error: e.message });
      setMsg("❌ Paddle Sync Failed: " + e.message); setMsgType("err");
    } finally { setPaddleSyncing(false); }
  };

  /* ── 삭제 ── */
  const handle삭제 = async (id) => {
    if (!window.confirm("이 Pricing 항목을 삭제하시겠습니까? Paddle에 Sync된 Price도 아카이브됩니다.")) return;
    try {
      const r = await fetch(`${API}/auth/pricing/plans/${id}`, { method: "DELETE", headers: authHeader() });
      const d = await r.json();
      if (d.ok) {
        setMsg("🗑️ 삭제 Done" + (d.paddle_archived ? " (Paddle Price 아카이브됨)" : "")); setMsgType("ok");
        loadData();
      } else {
        setMsg("❌ 삭제 Failed: " + (d.error || "")); setMsgType("err");
      }
    } catch (e) {
      setMsg("❌ " + e.message); setMsgType("err");
    }
  };

  /* 요약도 counts */
  const pricing수 = Object.values(pricingData).reduce(
    (s, f) => s + CYCLES.filter(c => parseInt(f[`${c.key}_price`]) > 0).length, 0);
  const menu수 = Object.values(menuData).reduce(
    (s, f) => s + Object.values(f).filter(Boolean).length, 0);
  const synced수 = savedItems.filter(it => !!it.paddle_price_id).length;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{
        padding: "16px 20px", borderRadius: 14,
        background: "linear-gradient(135deg, rgba(79,142,247,0.1), rgba(168,85,247,0.08))",
        border: "1px solid rgba(79,142,247,0.25)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            💳 구독 요금제 관리
          </div>
          <div style={{ fontSize: 11, color: "#7c8fa8", marginTop: 4 }}>
            플랜별·계정당 요금제 등록 후 결제 모듈과 한 번에 동기화합니다
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {pricing수 > 0 && <span style={{ fontSize: 10, color: "#a855f7", fontWeight: 700, background: "rgba(168,85,247,0.1)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(168,85,247,0.3)" }}>💰 {pricing수}개 입력됨</span>}
          {menu수 > 0    && <span style={{ fontSize: 10, color: "#4f8ef7", fontWeight: 700, background: "rgba(79,142,247,0.1)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(79,142,247,0.3)" }}>🔒 {menu수}개 Permission</span>}
          {synced수 > 0  && <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, background: "rgba(34,197,94,0.1)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(34,197,94,0.3)" }}>✅ Paddle {synced수} items</span>}

          {/* ★ 저장 Button (항상 눈에 보이게) */}
          <button
            onClick={handle저장}
            disabled={saving}
            style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: saving ? "rgba(79,142,247,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
              color: "#fff", fontWeight: 800, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
              boxShadow: saving ? "none" : "0 4px 16px rgba(79,142,247,0.4)",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all 200ms",
            }}
          >
            {saving ? "⏳ 저장 in progress..." : "💾 저장"}
          </button>
        </div>
      </div>

      {/* ── Message ── */}
      {msg && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: msgType === "ok" ? "rgba(34,197,94,0.1)" : msgType === "warn" ? "rgba(251,191,36,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${msgType === "ok" ? "rgba(34,197,94,0.3)" : msgType === "warn" ? "rgba(251,191,36,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: msgType === "ok" ? "#22c55e" : msgType === "warn" ? "#fbbf24" : "#ef4444",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <span>{msg}</span>
          <button onClick={() => setMsg("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── Inner Tab Bar (3개로 Unified 정리) ── */}
      <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 6 }}>
        {[
          {
            id: "pricing", icon: "💰", label: "요금제 관리",
            sub: `${savedItems.filter(it => it.menu_key?.startsWith(PLAN_ACCT_PFX) && parseInt(it.price_krw) > 0).length}개 저장됨`,
            color: "#4f8ef7",
          },
          {
            id: "menu", icon: "🔒", label: "메뉴 접근 권한",
            sub: menu수 > 0 ? `${menu수}개 Permission 설정됨` : "권한 적용 안됨",
            color: "#a855f7",
          },
          {
            id: "members", icon: "👥", label: "회원·이용권 관리",
            sub: "유료 회원 + 쿠폰 발급 현황",
            color: "#22c55e",
          },
        ].map(tab => {
          const isActive = innerTab === tab.id || (innerTab === "list" && tab.id === "pricing") || (innerTab === "coupons" && tab.id === "members");
          return (
            <button key={tab.id} onClick={() => setInnerTab(tab.id)} style={{
              flex: 1, padding: "12px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              background: isActive
                ? `linear-gradient(135deg,${tab.color}22,${tab.color}11)`
                : "transparent",
              borderBottom: `2px solid ${isActive ? tab.color : "transparent"}`,
              transition: "all 150ms", textAlign: "center",
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{tab.icon}</div>
              <div style={{ fontSize: 12, fontWeight: isActive ? 800 : 500, color: isActive ? "#e2e8f0" : "#7c8fa8" }}>{tab.label}</div>
              <div style={{ fontSize: 9, color: isActive ? tab.color : "#475569", marginTop: 1 }}>{tab.sub}</div>
            </button>
          );
        })}
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "#7c8fa8", padding: "40px 0", fontSize: 13 }}>⏳ 데이터 Loading...</div>
      )}

      {/* ── 요금제 관리 Tab (pricing + list Unified) ── */}
      {!loading && innerTab === "pricing" && (
        <div style={{ display: "grid", gap: 14 }}>
          {/* Plan legend */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {PLANS.map(p => (
              <span key={p.id} style={{ fontSize: 10, padding: "3px 12px", borderRadius: 99, fontWeight: 700, background: `${p.color}18`, border: `1px solid ${p.color}44`, color: p.color }}>
                {p.emoji} {p.label}
              </span>
            ))}
          </div>

          <PricingMatrix
            cycle={cycle}
            data={pricingData}
            onChange={handlePricingChange}
            onTabChange={setCycle}
          />

          {/* 저장 안내 & Button */}
          <div style={{
            padding: "16px 20px", borderRadius: 12,
            background: "linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))",
            border: "1px solid rgba(79,142,247,0.2)",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                💡 Monthly Pricing을 먼저 입력·저장하면 3개월/6개월/Annual Basic Pricing이 Auto계산됩니다
              </div>
              <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 4 }}>
                저장 Done 후 Bottom 「Paddle Sync」 Button으로 Paddle에 바로 반영하세요.
              </div>
            </div>
            <button
              onClick={handle저장}
              disabled={saving}
              style={{
                padding: "12px 32px", borderRadius: 10, border: "none",
                background: saving ? "rgba(79,142,247,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
                color: "#fff", fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 6px 20px rgba(79,142,247,0.45)",
                transition: "all 200ms",
              }}
            >
              {saving ? "⏳ 저장 in progress..." : "💾 Pricing 저장"}
            </button>
          </div>

          {/* ── Discount율 관리 Panel (고도화) ── */}
          <DiscountPanel pricingData={pricingData} setPricingData={setPricingData} handle저장={handle저장} saving={saving} setMsg={setMsg} setMsgType={setMsgType} />

          {/* ── 저장된 Pricing List + Paddle Sync (Unified) ── */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
              📋 저장된 Pricing List
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.25)", color: "#4f8ef7", fontWeight: 700 }}>
                {savedItems.filter(it => it.menu_key?.startsWith(PLAN_ACCT_PFX) && parseInt(it.price_krw) > 0).length}건
              </span>
            </div>
            <저장dRateList
              items={savedItems}
              on삭제={handle삭제}
              onPaddleSync={handlePaddleSync}
              paddleSyncing={paddleSyncing}
              paddleResult={paddleResult}
            />
          </div>
        </div>
      )}

      {/* ── 메뉴 접근 권한 Tab ── */}
      {!loading && innerTab === "menu" && (
        <div style={{ display: "grid", gap: 12 }}>
          <MenuAccessTab menuData={menuData} onMenuChange={handleMenuChange} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handle저장}
              disabled={saving}
              style={{
                padding: "10px 28px", borderRadius: 10, border: "none",
                background: saving ? "rgba(79,142,247,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
                color: "#fff", fontWeight: 800, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 4px 16px rgba(79,142,247,0.4)",
              }}
            >
              {saving ? "⏳ 저장 in progress..." : "💾 Permission 설정 저장"}
            </button>
          </div>
        </div>
      )}

      {/* ── 회원·이용권 관리 Tab (members + coupons Unified) ── */}
      {innerTab === "members" && <MembersCouponsTab />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MembersCouponsTab — 유료 회원 관리 + 이용권 Issue Unified Component
   ══════════════════════════════════════════════════════════════════════════ */
function MembersCouponsTab() {
  const [subTab, setSubTab] = React.useState("members");
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {/* 서브Tab 바 */}
      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 4 }}>
        {[
          { id: "members", label: "👥 유료 회원 관리",    color: "#4f8ef7", sub: "회원 List·플랜·Period 편집" },
          { id: "coupons", label: "🎟 이용권 Issue·관리", color: "#22c55e", sub: "Free·유료 회원 Coupon 지급" },
        ].map(st => (
          <button key={st.id} onClick={() => setSubTab(st.id)} style={{
            flex: 1, padding: "11px 14px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "center",
            background: subTab === st.id ? `${st.color}15` : "transparent",
            borderBottom: `2px solid ${subTab === st.id ? st.color : "transparent"}`,
            transition: "all 150ms",
          }}>
            <div style={{ fontSize: 12, fontWeight: subTab === st.id ? 800 : 500, color: subTab === st.id ? "#e2e8f0" : "#7c8fa8" }}>{st.label}</div>
            <div style={{ fontSize: 9, color: subTab === st.id ? st.color : "#475569", marginTop: 1 }}>{st.sub}</div>
          </button>
        ))}
      </div>
      {subTab === "members" && <MembersTab />}
      {subTab === "coupons" && <CouponsGrantTab />}
    </div>
  );
}

