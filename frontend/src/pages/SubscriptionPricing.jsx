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
        key: "dashboard", label: "Dashboard",
        subitems: [
          {
            key: "summary", label: "Summary Dashboard",
            leafItems: [
              { key: "kpi_widgets",   label: "KPI Widgets" },
              { key: "realtime_mon",  label: "Real-time Monitoring" },
              { key: "quick_links",   label: "Quick Links" },
              { key: "alert_feed",    label: "Notification Feed" },
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
        key: "auto_marketing", label: "AI Strategy Generator",
        subitems: [
          {
            key: "ai_strategy_gen", label: "AI Strategy Generator",
            leafItems: [
              { key: "ai_ad_creative",      label: "AI Ad Creative" },
              { key: "campaign_setup",       label: "Campaign Settings" },
              { key: "ai_strategy_preview",  label: "AI Strategy Preview" },
              { key: "campaign_mgmt",        label: "Campaign Management" },
            ],
          },
        ],
      },
      {
        key: "campaign_manager", label: "Campaign Management",
        subitems: [
          {
            key: "campaign_list_mgmt", label: "Campaign List",
            leafItems: [
              { key: "campaign_list",    label: "Campaign List" },
              { key: "ab_test",          label: "A/B Test" },
              { key: "ad_creative_mgmt", label: "Ad Creative Management" },
              { key: "campaign_report",  label: "Campaign 리포트" },
            ],
          },
        ],
      },
      {
        key: "journey_builder", label: "Customer Journey Builder",
        subitems: [
          {
            key: "journey_canvas", label: "Journey Canvas",
            leafItems: [
              { key: "journey_canvas_main", label: "Journey Canvas" },
              { key: "trigger_setting",     label: "Trigger Settings" },
              { key: "action_nodes",        label: "Action 노드 Management" },
              { key: "journey_stat",        label: "여정 Performance Analysis" },
            ],
          },
        ],
      },
      {
        key: "ai_prediction", label: "AI Forecast + Graph Score",
        subitems: [
          {
            key: "churn_ltv", label: "Churn & LTV Prediction",
            leafItems: [
              { key: "churn_pred",    label: "Churn Prediction" },
              { key: "ltv_predict",   label: "LTV Prediction" },
              { key: "purchase_prob", label: "Purchase Probability" },
            ],
          },
          {
            key: "graph_ai", label: "Graph Score & AI",
            leafItems: [
              { key: "graph_score",    label: "Graph Score" },
              { key: "next_action",    label: "Next Best Action" },
              { key: "product_reco",   label: "Product Recommended" },
              { key: "ai_insight_ad",  label: "AI Ad Insights" },
              { key: "model_perf",     label: "Model Performance" },
            ],
          },
        ],
      },
      {
        key: "content_calendar", label: "Content Calendar",
        subitems: [
          {
            key: "content_mgmt", label: "Content Management",
            leafItems: [
              { key: "content_plan",     label: "Content Planning" },
              { key: "publish_schedule", label: "Publish Schedule" },
              { key: "sns_connect",      label: "SNS Integration" },
              { key: "content_stat",     label: "Content Performance" },
            ],
          },
        ],
      },
      {
        key: "budget_planner", label: "Budget Planner",
        subitems: [
          {
            key: "budget_main", label: "Budget Settings",
            leafItems: [
              { key: "budget_alloc",   label: "Budget Allocation" },
              { key: "spend_forecast", label: "Spend Forecast" },
              { key: "roi_calc",       label: "ROI Calculator" },
              { key: "budget_report",  label: "Budget Report" },
            ],
          },
        ],
      },
    ],
  },

  /* ③ Ads & Channel Analytics */
  {
    key: "ad_analytics", label: "📣 Ads & Channel Analytics",
    items: [
      {
        key: "ad_performance", label: "Ad Performance Analytics",
        subitems: [
          {
            key: "ad_overview", label: "Ad Overview",
            leafItems: [
              { key: "ad_summary",    label: "Performance Summary" },
              { key: "ad_channel",    label: "Channel Analysis" },
              { key: "ad_product",    label: "Product Analysis" },
              { key: "ad_roas",       label: "ROAS Analysis" },
            ],
          },
        ],
      },
      {
        key: "marketing_intel", label: "Marketing Intelligence",
        subitems: [
          {
            key: "intel_main", label: "Intelligence",
            leafItems: [
              { key: "keyword_analysis",  label: "Keyword Analysis" },
              { key: "competitor_ana",    label: "Competitor Analysis" },
              { key: "trend_analysis",    label: "Trend Analysis" },
              { key: "market_share",      label: "Market Share" },
            ],
          },
        ],
      },
      {
        key: "attribution_ana", label: "Attribution Analysis",
        subitems: [
          {
            key: "attr_model", label: "Attribution Model",
            leafItems: [
              { key: "touch_model",   label: "Touch Model Settings" },
              { key: "channel_attr",  label: "Channel Attribution" },
              { key: "roas_calc_m",   label: "ROAS Calculator" },
              { key: "conv_path",     label: "Conversion Path Analysis" },
            ],
          },
        ],
      },
      {
        key: "channel_kpi", label: "Channel KPI",
        subitems: [
          {
            key: "kpi_dashboard", label: "KPI Dashboard",
            leafItems: [
              { key: "impressions",     label: "Impressions / CTR" },
              { key: "conv_rate",       label: "Conv. Rate" },
              { key: "cpa_cpc",         label: "CPA / CPC" },
              { key: "channel_compare", label: "Channel Comparison" },
            ],
          },
        ],
      },
      {
        key: "influencer_mgmt", label: "Influencer Management",
        subitems: [
          {
            key: "influencer_list", label: "Influencer",
            leafItems: [
              { key: "influencer_db",     label: "Influencer DB" },
              { key: "campaign_inf",      label: "Campaign Integration" },
              { key: "settlement_inf",    label: "Settlement Management" },
              { key: "perf_inf",          label: "Performance Analysis" },
            ],
          },
        ],
      },
      {
        key: "digital_shelf", label: "🛍️ Digital Shelf (SoS Analysis)",
        subitems: [
          {
            key: "shelf_main", label: "Digital Shelf",
            leafItems: [
              { key: "shelf_rank",     label: "Search Rank & SoS" },
              { key: "shelf_content",  label: "Listing Quality Score" },
              { key: "shelf_score",    label: "Review Analysis" },
            ],
          },
        ],
      },
      {
        key: "amazon_risk", label: "🏪 Amazon Risk (Account & Buy Box Monitoring)",
        subitems: [
          {
            key: "amazon_mgmt", label: "Amazon Risk",
            leafItems: [
              { key: "amazon_health",   label: "Account Health" },
              { key: "amazon_policy",   label: "Policy Compliance" },
              { key: "amazon_review",   label: "Review Management" },
              { key: "amazon_listing",  label: "Listing Management" },
            ],
          },
        ],
      },
    ],
  },

  /* ④ Customers & CRM */
  {
    key: "crm", label: "👤 Customers & CRM",
    items: [
      {
        key: "crm_main", label: "Customer CRM & AI Segments",
        subitems: [
          {
            key: "customer_list", label: "Customer List",
            leafItems: [
              { key: "customer_db",    label: "Customer DB" },
              { key: "customer_360",   label: "360° Customer View" },
              { key: "tag_mgmt",       label: "Tag Management" },
              { key: "customer_import",label: "Import Customers" },
            ],
          },
          {
            key: "rfm_segment", label: "RFM · AI Segments",
            leafItems: [
              { key: "rfm_analysis",  label: "RFM Analysis" },
              { key: "ai_segment",    label: "AI Segments" },
              { key: "segment_rule",  label: "Segment Rules" },
              { key: "segment_push",  label: "Segment Messaging" },
            ],
          },
        ],
      },
      {
        key: "email_marketing", label: "Email & A/B Test",
        subitems: [
          {
            key: "email_template", label: "Email Templates",
            leafItems: [
              { key: "email_tpl_list",  label: "Template List" },
              { key: "email_editor",    label: "Email Editor" },
              { key: "html_import",     label: "Import HTML" },
            ],
          },
          {
            key: "email_campaign", label: "Email Campaigns",
            leafItems: [
              { key: "email_send",      label: "Send Campaign" },
              { key: "email_ab",        label: "A/B Test" },
              { key: "email_stat",      label: "Performance Analysis" },
              { key: "email_bounce",    label: "Unsubscribe Management" },
              { key: "email_schedule",  label: "Scheduled Send" },
            ],
          },
        ],
      },
      {
        key: "kakao_channel", label: "Kakao Channel",
        subitems: [
          {
            key: "kakao_template", label: "Kakao Templates",
            leafItems: [
              { key: "alimtalk",      label: "Notification Talk" },
              { key: "friendtalk",    label: "Friend Talk" },
              { key: "bizboard",      label: "Biz Board" },
            ],
          },
          {
            key: "kakao_campaign", label: "Kakao Campaigns",
            leafItems: [
              { key: "kakao_send",    label: "Send Message" },
              { key: "kakao_stat",    label: "Send Statistics" },
              { key: "kakao_setting", label: "Channel Settings" },
            ],
          },
        ],
      },
      {
        key: "whatsapp", label: "WhatsApp Business",
        subitems: [
          {
            key: "wa_main", label: "WhatsApp",
            leafItems: [
              { key: "wa_template",   label: "Message Templates" },
              { key: "wa_broadcast",  label: "Broadcast" },
              { key: "wa_setting",    label: "Account Settings" },
              { key: "wa_stat",       label: "Send Statistics" },
            ],
          },
        ],
      },
      {
        key: "sms_marketing", label: "SMS/LMS Marketing",
        subitems: [
          {
            key: "sms_main", label: "SMS/LMS",
            leafItems: [
              { key: "sms_send",      label: "Send SMS" },
              { key: "sms_template",  label: "SMS Templates" },
              { key: "sms_stat",      label: "Send Statistics" },
              { key: "080_reject",    label: "080 Opt-out" },
            ],
          },
        ],
      },
      {
        key: "instagram_dm", label: "Instagram/Facebook DM",
        subitems: [
          {
            key: "ig_dm_main", label: "Social DM",
            leafItems: [
              { key: "ig_dm",         label: "Instagram DM" },
              { key: "fb_dm",         label: "Facebook DM" },
              { key: "dm_auto",       label: "DM Auto Reply" },
              { key: "dm_campaign",   label: "DM Campaign" },
            ],
          },
        ],
      },
      {
        key: "line_channel", label: "LINE Channel",
        subitems: [
          {
            key: "line_main", label: "LINE",
            leafItems: [
              { key: "line_msg",      label: "LINE Message" },
              { key: "line_template", label: "LINE Templates" },
              { key: "line_setting",  label: "LINE Channel Settings" },
              { key: "line_stat",     label: "Send Statistics" },
            ],
          },
        ],
      },
      {
        key: "web_popup", label: "Web Popup & Exit Popup",
        subitems: [
          {
            key: "popup_main", label: "Popup Settings",
            leafItems: [
              { key: "popup_editor",  label: "Popup Editor" },
              { key: "exit_popup",    label: "Exit Popup" },
              { key: "popup_trigger", label: "Trigger Settings" },
              { key: "popup_ab",      label: "Popup A/B Test" },
              { key: "popup_stat",    label: "Popup Performance" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑤ Commerce & Logistics */
  {
    key: "commerce", label: "🛒 Commerce & Logistics",
    items: [
      {
        key: "omni_channel", label: "Omni-Channel",
        subitems: [
          {
            key: "channel_mgmt", label: "Channel Management",
            leafItems: [
              { key: "channel_coupang",  label: "Coupang" },
              { key: "channel_naver",    label: "Naver Smart Store" },
              { key: "channel_shopify",  label: "Shopify" },
              { key: "channel_amazon",   label: "Amazon" },
              { key: "channel_cafe24",   label: "Cafe24" },
              { key: "channel_rakuten",  label: "Rakuten" },
              { key: "channel_temu",     label: "Temu" },
              { key: "channel_sync_all", label: "Batch Channel Sync" },
            ],
          },
        ],
      },
      {
        key: "kr_channel", label: "Domestic Channel (Coupang/Naver)",
        subitems: [
          {
            key: "kr_order", label: "Domestic Channel Orders",
            leafItems: [
              { key: "kr_order_list",  label: "Order List" },
              { key: "kr_claim",       label: "Claims & Returns" },
              { key: "kr_delivery",    label: "Delivery Tracking" },
              { key: "kr_settlement",  label: "Settlement Management" },
            ],
          },
        ],
      },
      {
        key: "order_hub", label: "Orders Hub",
        subitems: [
          {
            key: "order_list", label: "Order Lookup",
            leafItems: [
              { key: "order_all",      label: "All Orders" },
              { key: "order_channel",  label: "Channelper Orders" },
              { key: "order_excel",    label: "엑셀 Download" },
            ],
          },
          {
            key: "claim_mgmt", label: "Claims & Returns",
            leafItems: [
              { key: "claim_list",     label: "Claims Lookup" },
              { key: "return_mgmt",    label: "Returns Management" },
              { key: "exchange_mgmt",  label: "Exchange Management" },
            ],
          },
          {
            key: "delivery_track", label: "Delivery Tracking",
            leafItems: [
              { key: "delivery_status", label: "Delivery Status" },
              { key: "delivery_alert",  label: "Delivery Notification" },
              { key: "delivery_excel",  label: "Delivery Excel" },
            ],
          },
          {
            key: "settlement_mgmt", label: "Settlement Management",
            leafItems: [
              { key: "settlement_list",   label: "Settlement History" },
              { key: "settlement_month",  label: "Monthly Settlement" },
              { key: "settlement_excel",  label: "Settlement Excel" },
            ],
          },
          {
            key: "collect_config", label: "Collection Settings",
            leafItems: [
              { key: "collect_channel",  label: "Channelper Collection Settings" },
              { key: "collect_schedule", label: "Collection Schedule" },
              { key: "collect_log",      label: "Collection Log" },
            ],
          },
        ],
      },
      {
        key: "wms_manager", label: "WMS Warehouse Management",
        subitems: [
          {
            key: "inventory_mgmt", label: "Inventory Management",
            leafItems: [
              { key: "inventory_list",   label: "Inventory Status" },
              { key: "inventory_alert",  label: "Stock Alert" },
              { key: "inventory_adjust", label: "Inventory Adjustment" },
            ],
          },
          {
            key: "inbound_mgmt", label: "Inbound & Outbound",
            leafItems: [
              { key: "inbound",      label: "Inbound Management" },
              { key: "outbound",     label: "Outbound Management" },
              { key: "location",     label: "Location Management" },
              { key: "barcode",      label: "Barcode Scan" },
            ],
          },
        ],
      },
      {
        key: "catalog_sync", label: "Catalog Sync",
        subitems: [
          {
            key: "product_mgmt", label: "Product Management",
            leafItems: [
              { key: "product_list",    label: "Product List" },
              { key: "product_upload",  label: "Batch Product Upload" },
              { key: "product_sync",    label: "Channel Product Sync" },
              { key: "product_excel",   label: "Product Excel Upload" },
              { key: "price_mgmt",      label: "Price Management" },
              { key: "stock_alert",     label: "Stock Alert" },
            ],
          },
        ],
      },
      {
        key: "price_opt", label: "Price Optimization (AI)",
        subitems: [
          {
            key: "price_main", label: "Price Settings",
            leafItems: [
              { key: "price_rule",     label: "Price Rules" },
              { key: "elasticity",     label: "Price Elasticity" },
              { key: "price_simulate", label: "Price Simulation" },
              { key: "price_reco",     label: "Price Recommendations" },
            ],
          },
        ],
      },
      {
        key: "demand_forecast", label: "Demand Forecast & Auto Order",
        subitems: [
          {
            key: "forecast_main", label: "Demand Forecast",
            leafItems: [
              { key: "sku_forecast",   label: "SKUper Demand Forecast" },
              { key: "auto_order",     label: "Auto Order Recommendation" },
              { key: "order_history",  label: "AI Order History" },
              { key: "forecast_chart", label: "Per-Channel Demand Distribution" },
            ],
          },
        ],
      },
      {
        key: "asia_logistics", label: "Asia Logistics Hub",
        subitems: [
          {
            key: "asia_main", label: "Asia Logistics",
            leafItems: [
              { key: "hub_status",     label: "Hub Status (6 Countries)" },
              { key: "route_matrix",   label: "Route Matrix" },
              { key: "customs_rules",  label: "Customs & Regulations" },
              { key: "fulfillment",    label: "Fulfillment Comparison" },
              { key: "domestic_3pl",   label: "Domestic 3PL" },
            ],
          },
        ],
      },
      {
        key: "returns_portal", label: "Returns Automation Portal",
        subitems: [
          {
            key: "returns_main", label: "Returns Management",
            leafItems: [
              { key: "returns_dashboard", label: "Returns Dashboard" },
              { key: "returns_list",      label: "Returns List" },
              { key: "returns_portal_set",label: "Portal Settings" },
              { key: "returns_analysis",  label: "Returns Analysis" },
            ],
          },
        ],
      },
      {
        key: "supply_chain", label: "Supply Chain Visibility",
        subitems: [
          {
            key: "supply_main", label: "Supply Chain",
            leafItems: [
              { key: "supply_timeline",  label: "Supply Chain 타임라인" },
              { key: "supplier_list",    label: "Supplier Management" },
              { key: "leadtime_ana",     label: "Lead Time Analysis" },
              { key: "risk_detect",      label: "Risk Detection" },
            ],
          },
        ],
      },
      {
        key: "supplier_portal", label: "Supplier Portal (B2B)",
        subitems: [
          {
            key: "supplier_main", label: "Supplier",
            leafItems: [
              { key: "supplier_list2",   label: "Supplier List" },
              { key: "po_mgmt",          label: "Quotes & Orders Management" },
              { key: "supplier_perf",    label: "Performance Analysis" },
              { key: "supplier_setting", label: "Auto Order Settings" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑥ Analytics & Performance */
  {
    key: "analytics", label: "📊 Analytics & Performance",
    items: [
      {
        key: "performance_hub", label: "Performance Hub",
        subitems: [
          {
            key: "perf_overview", label: "Performance Overview",
            leafItems: [
              { key: "perf_summary",   label: "Performance Summary" },
              { key: "multi_team_analysis", label: "Multi-Team Analysis" },
              { key: "perf_channel",   label: "Per-Channel Performance" },
              { key: "perf_product",   label: "Per-Product Performance" },
              { key: "perf_campaign",  label: "Per-Campaign Performance" },
              { key: "cohort",         label: "Cohort Analysis" },
            ],
          },
        ],
      },
      {
        key: "pnl_analytics", label: "P&L Analytics",
        subitems: [
          {
            key: "pnl_main", label: "P&L Analysis",
            leafItems: [
              { key: "pnl_overview",    label: "P&L Overview" },
              { key: "pnl_channel",     label: "Per-Channel P&L" },
              { key: "pnl_product",     label: "Per-Product P&L" },
              { key: "pnl_trend",       label: "P&L Trend" },
            ],
          },
        ],
      },
      {
        key: "ai_insights", label: "AI Insights",
        subitems: [
          {
            key: "insight_feed", label: "Insights",
            leafItems: [
              { key: "insight_main",    label: "Insights 피드" },
              { key: "anomaly_detect",  label: "Anomaly Detection" },
              { key: "auto_report",     label: "Auto Report" },
              { key: "competitor_ai",   label: "Competitor AI Analysis" },
            ],
          },
        ],
      },
      {
        key: "report_builder", label: "BI Reports",
        subitems: [
          {
            key: "report_main", label: "Report Builder",
            leafItems: [
              { key: "custom_report",   label: "Custom Report" },
              { key: "scheduled_rpt",   label: "Scheduled Send 리포트" },
              { key: "excel_export",    label: "Excel Export" },
              { key: "api_export",      label: "API 데이터 Export" },
              { key: "dashboard_share", label: "Dashboard Share" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑦ Settlements & Finance */
  {
    key: "finance", label: "💳 Settlements & Finance",
    items: [
      {
        key: "reconciliation", label: "Settlement Management",
        subitems: [
          {
            key: "recon_main", label: "정산",
            leafItems: [
              { key: "recon_list",     label: "Settlement History" },
              { key: "recon_channel",  label: "Per-Channel Settlement" },
              { key: "recon_month",    label: "Monthly Settlement" },
              { key: "recon_excel",    label: "Settlement Excel" },
            ],
          },
        ],
      },
      {
        key: "settlements", label: "Tax Invoice & Payments",
        subitems: [
          {
            key: "settle_main", label: "Payment Settlement",
            leafItems: [
              { key: "tax_invoice",    label: "Tax Invoice" },
              { key: "settle_list",    label: "Payment List" },
              { key: "settle_approve", label: "Payment Approval" },
              { key: "settle_excel",   label: "Payment Excel" },
            ],
          },
        ],
      },
      {
        key: "app_pricing", label: "Subscription Settings",
        subitems: [
          {
            key: "pricing_main", label: "Subscription Plans",
            leafItems: [
              { key: "my_plan",        label: "Current Plan" },
              { key: "plan_upgrade",   label: "Upgrade Plan" },
              { key: "payment_hist",   label: "Payment History" },
              { key: "invoice",        label: "Invoice" },
            ],
          },
        ],
      },
      {
        key: "my_coupons", label: "My Coupons",
        subitems: [
          {
            key: "coupon_main", label: "Coupon Management",
            leafItems: [
              { key: "coupon_list", label: "My Coupon List" },
              { key: "coupon_use",  label: "Coupon Usage History" },
            ],
          },
        ],
      },
      {
        key: "audit", label: "Audit Log",
        subitems: [
          {
            key: "audit_main", label: "Audit Log",
            leafItems: [
              { key: "audit_log_list", label: "Log Lookup" },
              { key: "audit_export",   label: "Log Export" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑧ Automation & AI */
  {
    key: "automation", label: "🤖 Automation & AI",
    items: [
      {
        key: "ai_rule_engine", label: "AI Rule Engine",
        subitems: [
          {
            key: "rule_main", label: "Rule Settings",
            leafItems: [
              { key: "ai_policy",      label: "AI Policy Settings" },
              { key: "rule_list",      label: "Rule List" },
              { key: "rule_test",      label: "Rule Test" },
              { key: "rule_log",       label: "Execution Log" },
            ],
          },
        ],
      },
      {
        key: "alert_policies", label: "Alert Policies & Action Presets",
        subitems: [
          {
            key: "alert_main", label: "Alert Policies",
            leafItems: [
              { key: "alert_policy_list",  label: "Policy List" },
              { key: "action_presets",     label: "Action Presets" },
              { key: "alert_evaluate",     label: "Policy Evaluation" },
              { key: "alert_log",          label: "Alert Log" },
            ],
          },
        ],
      },
      {
        key: "approvals", label: "Approval Request Management",
        subitems: [
          {
            key: "approval_main", label: "Approval",
            leafItems: [
              { key: "approval_list",   label: "Approval List" },
              { key: "approval_decide", label: "Approve/Reject" },
              { key: "approval_hist",   label: "Approval History" },
            ],
          },
        ],
      },
      {
        key: "writeback", label: "Data Writeback",
        subitems: [
          {
            key: "writeback_main", label: "Writeback",
            leafItems: [
              { key: "wb_config",   label: "Writeback Settings" },
              { key: "wb_log",      label: "Writeback Log" },
              { key: "wb_rollback", label: "Immediate Rollback" },
            ],
          },
        ],
      },
      {
        key: "onboarding", label: "Getting Started (Onboarding)",
        subitems: [
          {
            key: "onboarding_main", label: "Onboarding",
            leafItems: [
              { key: "getting_started",  label: "Getting Started Guide" },
              { key: "setup_wizard",     label: "Setup Wizard" },
              { key: "quick_setup",      label: "Quick Setup" },
              { key: "tutorial",         label: "Tutorial" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑨ Data & Integrations */
  {
    key: "data", label: "🔌 데이터·Integration",
    items: [
      {
        key: "connectors", label: "커넥터 + Event·데이터",
        subitems: [
          {
            key: "channel_conn", label: "Channel Integration",
            leafItems: [
              { key: "meta_ads",       label: "Meta (FB/IG) Ad" },
              { key: "google_ads",     label: "Google Ads" },
              { key: "tiktok_ads",     label: "TikTok Ad" },
              { key: "naver_ads",      label: "Naver Ad" },
              { key: "kakao_ads",      label: "Kakao Ad" },
              { key: "line_ads",       label: "LINE Ads" },
              { key: "coupang_conn",   label: "Coupang Integration" },
              { key: "shopify_conn",   label: "Shopify Integration" },
              { key: "amazon_conn",    label: "Amazon Integration" },
            ],
          },
          {
            key: "event_data", label: "Event·데이터",
            leafItems: [
              { key: "event_ingest",    label: "Event Count집" },
              { key: "event_normalize", label: "정규화" },
              { key: "data_schema",     label: "데이터 스키마" },
              { key: "data_mapping",    label: "데이터 매핑" },
              { key: "data_product",    label: "데이터 Product" },
            ],
          },
        ],
      },
      {
        key: "api_keys", label: "API 키 Management",
        subitems: [
          {
            key: "api_mgmt", label: "API",
            leafItems: [
              { key: "api_key_list",   label: "API 키 List" },
              { key: "api_create",     label: "키 Create" },
              { key: "webhook",        label: "웹훅 Settings" },
              { key: "oauth_mgmt",     label: "OAuth Integration" },
              { key: "api_log",        label: "API Calls 로그" },
            ],
          },
        ],
      },
      {
        key: "license", label: "서비스 Activate 센터",
        subitems: [
          {
            key: "license_main", label: "라이선스",
            leafItems: [
              { key: "license_activate", label: "라이선스 Activate" },
              { key: "license_status",   label: "라이선스 현황" },
              { key: "service_toggle",   label: "서비스 ON/OFF" },
            ],
          },
        ],
      },
      {
        key: "pixel_tracking", label: "1st-Party Pixel",
        subitems: [
          {
            key: "pixel_main", label: "Pixel Settings",
            leafItems: [
              { key: "pixel_config",   label: "Pixel Settings" },
              { key: "pixel_snippet",  label: "스크립트 설치" },
              { key: "pixel_verify",   label: "설치 검증" },
              { key: "pixel_stat",     label: "Pixel Statistics" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑩ 내 Team·Help (General Users 전용) */
  {
    key: "help", label: "👥 내 Team·Help",
    items: [
      {
        key: "operations", label: "운영 허브",
        subitems: [
          {
            key: "ops_main", label: "운영",
            leafItems: [
              { key: "ops_overview", label: "운영 개요" },
              { key: "ops_guide",    label: "운영 가이드" },
            ],
          },
        ],
      },
      {
        key: "team_workspace", label: "내 Team·워크스페이스",
        subitems: [
          {
            key: "team_main", label: "Team Management",
            leafItems: [
              { key: "team_members",   label: "Team Members List" },
              { key: "team_invite",    label: "Team Members 초대" },
              { key: "team_roles",     label: "역할 Settings" },
              { key: "team_activity",  label: "활동 내역" },
            ],
          },
        ],
      },
      {
        key: "help_center", label: "Help 센터",
        subitems: [
          {
            key: "help_main", label: "Help",
            leafItems: [
              { key: "getting_started_help", label: "Getting Started Guide" },
              { key: "faq",                  label: "자주 묻는 질문" },
              { key: "video_tutorial",       label: "영상 Tutorial" },
              { key: "release_notes",        label: "Update 내역" },
              { key: "support_ticket",       label: "Support 티켓" },
            ],
          },
        ],
      },
    ],
  },

  /* ⑪ Management자 센터 (Platform Management자 전용 — Paid회원 접근Permission 제외) */
  {
    key: "system", label: "⚙ Management자 센터",
    items: [
      {
        key: "admin_main", label: "Management자 센터",
        subitems: [
          {
            key: "user_mgmt", label: "Users·Permission Management",
            leafItems: [
              { key: "user_list",    label: "Users List" },
              { key: "role_mgmt",    label: "Permission·역할 Management" },
              { key: "team_mgmt",    label: "Team/부서 Management" },
              { key: "member_mgmt",  label: "구성원 Management" },
            ],
          },
          {
            key: "system_ops", label: "시스템 운영",
            leafItems: [
              { key: "audit_log",    label: "Audit Log" },
              { key: "system_mon",   label: "시스템 모니터" },
              { key: "ops_health",   label: "운영 Status" },
              { key: "db_admin",     label: "DB Management" },
            ],
          },
          {
            key: "sub_mgmt", label: "Subscription Management",
            leafItems: [
              { key: "sub_pricing",     label: "SubscriptionPricing Management" },
              { key: "license_mgmt",    label: "라이선스 Management" },
              { key: "pg_config",       label: "Payment 게이트웨이 Settings" },
              { key: "coupon_admin",    label: "Coupon Management" },
              { key: "subscriber_list", label: "Subscription자 List" },
            ],
          },
        ],
      },
    ],
  },
];


// Basic 플랜 정의 (Starter 제거, Free = All Demo 접근)
const DEFAULT_PLANS = [
  { id: "free",       label: "Free",       color: "#8da4c4", emoji: "🆓", isDemo: true  },
  { id: "growth",     label: "Growth",     color: "#4f8ef7", emoji: "📈", isDemo: false },
  { id: "pro",        label: "Pro",        color: "#a855f7", emoji: "🚀", isDemo: false },
  { id: "enterprise", label: "Enterprise", color: "#f59e0b", emoji: "🌐", isDemo: false },
];

// Basic Account Count 티어 (동적 Add/Delete 가능)
const DEFAULT_TIERS = [
  { key: "1",         label: "1Account",  count: 1  },
  { key: "5",         label: "5Account",  count: 5  },
  { key: "10",        label: "10Account", count: 10 },
  { key: "30",        label: "30Account", count: 30 },
  { key: "unlimited", label: "Unlimited", count: 0, unlimited: true },
];

// 하위 호환: PLANS 상Count는 DEFAULT_PLANS를 참조 (동적 플랜 없을 때 fallback)
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
  // Management자 센터는 Management자 키를 우선 사용 (SubscriberTabs.jsx와 동일한 방식)
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
   SavedRateList — Save된 Pricing List (플랜 그룹 뷰)
   Save일 / 플랜per Pricing Summary → Clicks 시 Accountper 상세 펼침
   ══════════════════════════════════════════════════════════════════════════ */
function SavedRateList({ items, onDelete, onPaddleSync, paddleSyncing, paddleResult }) {
  const [openPlans, setOpenPlans] = React.useState({});
  const [showHistory, setShowHistory] = React.useState(false);
  const [historyItems, setHistoryItems] = React.useState([]);
  const [histLoading, setHistLoading] = React.useState(false);

  /* ── Save된 Pricing → geniego_plan_pricing localStorage Auto sync ── */
  React.useEffect(() => {
    if (!items || items.length === 0) return;
    const priceItems = items.filter(it => it.menu_key?.startsWith(PLAN_ACCT_PFX) && parseInt(it.price_krw) > 0);
    if (priceItems.length === 0) return;
    // 플랜per Monthly(monthly) Pricing만 추출 (1Account 기준 우선)
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

  // 플랜per 그룹 구성: { plan → { acct → { cycle → item } } }
  const grouped = {};
  priceItems.forEach(it => {
    const raw = it.menu_key.replace(PLAN_ACCT_PFX, '');
    const [plan, acct] = raw.split('__');
    if (!grouped[plan]) grouped[plan] = {};
    if (!grouped[plan][acct]) grouped[plan][acct] = {};
    // cycleper LatestValue 유지
    grouped[plan][acct][it.cycle] = it;
  });

  // 플랜per Latest Save일
  const planSavedAt = {};
  priceItems.forEach(it => {
    const raw = it.menu_key.replace(PLAN_ACCT_PFX, '');
    const [plan] = raw.split('__');
    const dt = it.created_at || it.updated_at || '';
    if (!planSavedAt[plan] || dt > planSavedAt[plan]) planSavedAt[plan] = dt;
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
            ? <span>📚 Change 이력 All <span style={{ color: '#eab308', fontWeight: 700 }}>({priceItems.length}건)</span></span>
            : <span>✅ 현재 Apply Pricing <span style={{ color: '#22c55e', fontWeight: 700 }}>({priceItems.length}건)</span></span>}
          {histLoading && <span style={{ marginLeft: 8, color: '#eab308' }}>⏳</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowHistory(h => !h)} style={{
            padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${showHistory ? 'rgba(234,179,8,0.4)' : 'rgba(79,142,247,0.3)'}`,
            background: showHistory ? 'rgba(234,179,8,0.08)' : 'rgba(79,142,247,0.08)',
            color: showHistory ? '#eab308' : '#4f8ef7',
          }}>{showHistory ? '📋 현재 Pricing만 보기' : '🗒 Change 이력 보기'}</button>
          <button onClick={onPaddleSync} disabled={paddleSyncing || priceItems.length === 0} style={{
            padding: '5px 16px', borderRadius: 7, border: 'none', cursor: paddleSyncing || priceItems.length === 0 ? 'not-allowed' : 'pointer',
            background: paddleSyncing ? 'rgba(168,85,247,0.3)' : 'linear-gradient(135deg,#a855f7,#7c3aed)',
            color: '#fff', fontWeight: 700, fontSize: 11,
          }}>{paddleSyncing ? '⏳ Syncing...' : '🔄 Paddle Sync'}</button>
        </div>
      </div>

      {priceItems.length === 0 && (
        <div style={{ textAlign: 'center', color: '#3b4d6e', padding: '40px 0', fontSize: 13 }}>
          📭 Save된 Pricing이 없습니다. 플랜per Pricing Settings Tab에서 Pricing을 입력 후 Save하세요.
        </div>
      )}

      {/* 플랜 그룹 Card */}
      {PLANS.map(plan => {
        const acctMap = grouped[plan.id];
        if (!acctMap && !showHistory) return null;
        if (!acctMap) return null;

        const isOpen = openPlans[plan.id];
        const savedAt = planSavedAt[plan.id];
        const savedDate = savedAt ? new Date(savedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';
        const savedTime = savedAt ? new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';

        // Summary: AccountCountper Monthly BasicPricing
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
            {/* Header: 플랜명 + Save일 + Pricing Summary */}
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
                {/* Pricing Summary 한 줄 */}
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
              {/* Save일 */}
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
                  <span>Account Count</span>
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
                                <div style={{ fontSize: 8, color: '#4b5563' }}>미Register</div>
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

                      {/* Delete (Monthly 항목 기준) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {Object.values(cycleData).map(it => (
                          <button key={it.id} onClick={() => onDelete(it.id)} title={`${cycleLabel(it.cycle)} Delete`} style={{
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

      {/* 메뉴 접근 Permission */}
      {items.filter(it => !it.menu_key?.startsWith(PLAN_ACCT_PFX)).length > 0 && (
        <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(79,142,247,0.05)', borderRadius: 10, border: '1px solid rgba(79,142,247,0.1)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4f8ef7', marginBottom: 8 }}>🔒 메뉴 접근 Permission Settings</div>
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
   PLACEHOLDER (구 SavedRateList 이하 코드 제거됨 — 아래에 PricingMatrix Present)
   ══════════════════════════════════════════════════════════════════════════ */
function _SavedRateList_DELETED({ items, onDelete, onPaddleSync, paddleSyncing, paddleResult }) {
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

  // 표시 데이터: 이력 모드면 All(is_active 0/1), 현재 모드면 items(is_active=1만)
  const displayItems = showHistory ? historyItems : items;

  // Price 행만 Filter (메뉴 접근 Permission 제외)
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
            ? `✅ Paddle Sync Done: ${paddleResult.synced}개 Product 처리, ${paddleResult.errors?.length || 0}개 Error`
            : `❌ Paddle Sync Failed: ${paddleResult.error || "알 Count 없는 Error"}`
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

      {/* 이력 Toggle + Summary */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ fontSize: 12, color: "#7c8fa8" }}>
          {showHistory
            ? <span>📚 Pricing Change All 이력 <span style={{ color: "#eab308", fontWeight: 700 }}>({filtered.length}건)</span></span>
            : <span>✅ 현재 Apply Pricing <span style={{ color: "#22c55e", fontWeight: 700 }}>({filtered.length}건)</span></span>
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
          {showHistory ? "📋 현재 Pricing만 보기" : "🗒 Change 이력 All 보기"}
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
            <option value="all">All 플랜</option>
            {PLANS.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
          </select>
          <select
            value={filterCycle}
            onChange={e => setFilterCycle(e.target.value)}
            style={{ background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 7, color: "#94a3b8", padding: "6px 12px", fontSize: 11 }}
          >
            <option value="all">All 주기</option>
            {CYCLES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Pricing List Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#3b4d6e", padding: "40px 0", fontSize: 13 }}>
          {histLoading ? "⏳ 이력 Loading..." : "📭 Save된 Pricing이 없습니다. 플랜per Pricing Settings Tab에서 Pricing을 Register 후 Save하세요."}
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
            <span>플랜</span><span>AccountCount</span><span>주기</span>
            <span>Basic Pricing</span><span>Discount율</span><span>최종 Pricing</span>
            <span>Paddle Status</span>
            {showHistory && <span style={{ color: "#eab308" }}>Register일</span>}
            <span>Management</span>
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
                  onClick={() => !isInactive && onDelete(item.id)}
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

      {/* 메뉴 접근 Permission List */}
      {items.filter(it => !it.menu_key?.startsWith(PLAN_ACCT_PFX)).length > 0 && (
        <div style={{ marginTop: 8, padding: "12px 14px", background: "rgba(79,142,247,0.05)", borderRadius: 10, border: "1px solid rgba(79,142,247,0.1)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", marginBottom: 8 }}>
            🔒 메뉴 접근 Permission Settings ({items.filter(it => !it.menu_key?.startsWith(PLAN_ACCT_PFX)).length}건)
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
   PricingMatrix — 동적 플랜 × AccountCount × Payment주기
   • 플랜 Add/Delete 가능 (Free는 고정, Paid Plan 동적)
   • Account Count 追가/Delete 가능 (숫자 직접 입력 or Unlimited)
   ══════════════════════════════════════════════════════════════════════════ */
const PLAN_COLORS = ["#4f8ef7","#a855f7","#f59e0b","#22c55e","#ef4444","#06b6d4","#ec4899","#84cc16"];
const PLAN_EMOJIS = ["📈","🚀","🌐","🌱","⭐","💎","🔥","✨"];

function PricingMatrix({ cycle, data, onChange, onTabChange }) {
  // 동적 플랜 Management (Free 고정 + Paid Plan)
  const [plans, setPlans] = useState(() => DEFAULT_PLANS);
  // 동적 Account Count Management — localStorage 영속화 (Delete 후 Refresh해도 유지)
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

  // tiers Change 시 즉시 localStorage Save (영속화)
  const saveTiers = (newTiers) => {
    setTiers(newTiers);
    try { localStorage.setItem(TIERS_STORAGE_KEY, JSON.stringify(newTiers)); } catch {}
  };

  const [openPlan, setOpenPlan] = useState("growth");
  // 플랜 Add 입력 Status
  const [newPlanLabel, setNewPlanLabel] = useState("");
  const [showAddPlan,  setShowAddPlan]  = useState(false);
  // Account Count Add 입력 Status
  const [newTierCount, setNewTierCount] = useState("");
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

  // 플랜 Delete (Free Delete 불가)
  const removePlan = (planId) => {
    if (planId === 'free') return;
    setPlans(prev => prev.filter(p => p.id !== planId));
    if (openPlan === planId) setOpenPlan(plans.find(p => !p.isDemo && p.id !== planId)?.id || null);
  };

  // Account Count Add
  const addTier = () => {
    if (newTierUnlimited) {
      if (tiers.some(t => t.unlimited)) return;
      saveTiers([...tiers, { key: 'unlimited', label: 'Unlimited', count: 0, unlimited: true }]);
    } else {
      const count = parseInt(newTierCount);
      if (!count || count <= 0) return;
      const key = String(count);
      if (tiers.some(t => t.key === key)) return;
      saveTiers([...tiers, { key, label: `${count}Account`, count }].sort((a, b) => {
        if (a.unlimited) return 1;
        if (b.unlimited) return -1;
        return a.count - b.count;
      }));
    }
    setNewTierCount("");
    setNewTierUnlimited(false);
    setShowAddTier(false);
  };

  // Account Count Delete — localStorage 반영
  const removeTier = (tierKey) => {
    saveTiers(tiers.filter(t => t.key !== tierKey));
  };

  // BasicValue Reset Button (Management자가 원하면 복구)
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
          <span><strong>Monthly BasicPricing</strong>을 Account Countper로 입력하세요. 3개월·6개월·Annual Tab의 BasicPricing은 <strong>MonthlyPricing × 개월Count</strong>로 Auto Calculate됩니다.</span>
        </div>
      ) : (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 11, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", color: "#93c5fd", display: "flex", alignItems: "center", gap: 8 }}>
          <span>🔒</span>
          <div><strong>Basic Pricing</strong>은 <strong>MonthlyPricing x {cycleInfo.months}개월</strong>로 Auto Calculate됩니다. <span style={{ color: "#4ade80", marginLeft: 6 }}>Discount율(%)만 이 Tab에서 직접 입력하세요.</span></div>
        </div>
      )}

      {/* ── Free 플랜: All Demo 접근 (Pricing None) ── */}
      <div style={{
        borderRadius: 10, overflow: "hidden",
        border: "1px solid rgba(141,164,196,0.3)",
        background: "rgba(141,164,196,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
          <span style={{ fontSize: 18 }}>🆓</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: "#8da4c4" }}>Free 플랜</span>
            <span style={{ fontSize: 10, color: "#7c8fa8", marginLeft: 8 }}>Free 회Cost Price입 → All Demo 버전 접근 가능</span>
          </div>
          <span style={{
            fontSize: 10, padding: "3px 10px", borderRadius: 99, fontWeight: 700,
            background: "rgba(141,164,196,0.15)", border: "1px solid rgba(141,164,196,0.3)", color: "#8da4c4",
          }}>Pricing None · Auto 부여</span>
        </div>
        <div style={{ padding: "8px 16px 12px", borderTop: "1px solid rgba(141,164,196,0.1)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["All Dashboard Demo","AI Marketing Auto화 Demo","Customer CRM Demo","커머스·물류 Demo","Analysis·Performance Demo","All Features 읽기전용 체험"].map(t => (
              <span key={t} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(141,164,196,0.1)", color: "#8da4c4", border: "1px solid rgba(141,164,196,0.15)" }}>✓ {t}</span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>※ Live Data 입력·Edit·Save Feature은 Paid Plan에서만 사용 가능합니다.</div>
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
              {/* 플랜 Delete Button */}
              <button onClick={e => { e.stopPropagation(); removePlan(plan.id); }} style={{
                padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 10, cursor: "pointer", fontWeight: 700,
              }}>🗑 Delete</button>
              <span style={{ fontSize: 10, color: "#7c8fa8", transition: "transform 200ms", transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span>
            </div>

            {isOpen && (
              <div style={{ paddingBottom: 12 }}>
                {/* Account Count Header + Add Button */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px 10px", borderBottom: `1px solid ${plan.color}22` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7c8fa8", flex: 1 }}>Account Count</span>
                  {isMonthly && <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", width: 140 }}>Monthly BasicPricing (₩) ✏️</span>}
                  {!isMonthly && <span style={{ fontSize: 10, fontWeight: 700, color: "#60a5fa", width: 140 }}>BasicPricing 🔒 auto</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", width: 100 }}>Discount율 (%) ✏️</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7c8fa8", width: 100 }}>Discount 후 월 Pricing</span>
                  {!isMonthly && <span style={{ fontSize: 10, fontWeight: 700, color: plan.color, width: 100 }}>{cycleInfo.label} Total액</span>}
                  <span style={{ width: 24 }} />
                </div>

                {/* Account Countper 행 */}
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
                      {/* Account Count 라벨 */}
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

                      {/* Account Count Delete */}
                      <button onClick={() => removeTier(tier.key)} title="이 Account Count 제거" style={{
                        padding: "3px 6px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.25)",
                        background: "rgba(239,68,68,0.05)", color: "#ef4444", fontSize: 10, cursor: "pointer", flexShrink: 0,
                      }}>✕</button>
                    </div>
                  );
                })}

                {/* Account Count Add */}
                <div style={{ padding: "10px 16px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  {showAddTier ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8", cursor: "pointer" }}>
                        <input type="checkbox" checked={newTierUnlimited} onChange={e => setNewTierUnlimited(e.target.checked)} />
                        Unlimited
                      </label>
                      {!newTierUnlimited && (
                        <input
                          type="number" placeholder="Account Count 입력" value={newTierCount}
                          onChange={e => setNewTierCount(e.target.value)}
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
                      }}>+ Account Count Add</button>
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
   플랜per Basic 접근Permission BasicValue (냉정한 Feature 가치 Analysis)
   ─────────────────────────────────────────────────────────────────────────
   Free      : Basic Dashboard·Onboarding·Help만 (Demo 체험 Min)
   Growth    : Marketing·커머스·Analysis 핵심 + CRM Basic + 정산Basic
   Pro       : Growth All + AI Auto화·Forecast·AdvancedAnalysis + 재무·리포트
   Enterprise: All (system 제외 - Management자 전용)
   ══════════════════════════════════════════════════════════════════════════ */
const ADMIN_ONLY_SECTION = "system"; // Management자 센터 — Paid회원에게 Impressions 불필요

// =========================================================
// PLAN_DEFAULTS_MAP — Competitor Analysis 기반 Geniego-ROI 전용 Permission
// 참고: HubSpot(Starter/Pro/Enterprise), Klaviyo(Free/Core/Pro),
//       Shopify Plus, Salesforce Marketing Cloud, Netsuite
// 원칙:
//   Growth  : 핵심 Marketing·커머스·CRM 성장 Feature (HubSpot Starter+α)
//   Pro     : AI Auto화·Forecast·AdvancedAnalysis·전Channel (Klaviyo Pro급)
//   Enterprise: All + Writeback·롤백·데이터거버넌스 (Salesforce Enterprise급)
// =========================================================
const PLAN_DEFAULTS_MAP = {
  // ── ① 홈 Dashboard
  // HubSpot: Starter부터 Dashboard / Klaviyo: Free BasicStatistics
  // Growth: 실Time모니터링+Notification피드 / Pro/Enterprise: 동일
  kpi_widgets:        { free: true,  growth: true,  pro: true,  enterprise: true  },
  realtime_mon:       { free: false, growth: true,  pro: true,  enterprise: true  },
  quick_links:        { free: true,  growth: true,  pro: true,  enterprise: true  },
  alert_feed:         { free: false, growth: true,  pro: true,  enterprise: true  },

  // ── ② AI Marketing Auto화
  // 경쟁사 참고: HubSpot Pro=워크플로우, Salesforce MC=Advanced여정, Klaviyo Pro=AIForecast
  // Growth : Campaign·Ad소재·콘텐츠·Budget 핵심
  // Pro    : AI Forecast·여정빌더·A/B·AI전략미리보기
  // Enterprise: Pro All + AI모델PerformanceManagement(멀티브랜드 최적화)
  ai_ad_creative:      { free: false, growth: true,  pro: true,  enterprise: true  },
  campaign_setup:      { free: false, growth: true,  pro: true,  enterprise: true  },
  ai_strategy_preview: { free: false, growth: false, pro: true,  enterprise: true  },
  campaign_mgmt:       { free: false, growth: true,  pro: true,  enterprise: true  },
  campaign_list:       { free: false, growth: true,  pro: true,  enterprise: true  },
  ab_test:             { free: false, growth: false, pro: true,  enterprise: true  },
  ad_creative_mgmt:    { free: false, growth: true,  pro: true,  enterprise: true  },
  campaign_report:     { free: false, growth: true,  pro: true,  enterprise: true  },
  // Customer Journey: Salesforce MC Journey Builder = Advanced / HubSpot = Pro+
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
  model_perf:          { free: false, growth: false, pro: false, enterprise: true  }, // AI모델 PerformanceManagement·배포 = Enterprise
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
  // Growth : ChannelSummary·ROAS·키워드·ChannelKPI
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
  // 기여도: 데이터드리븐 기여모델 = Pro / Conversion경로All = Enterprise
  touch_model:         { free: false, growth: false, pro: true,  enterprise: true  },
  channel_attr:        { free: false, growth: false, pro: false, enterprise: true  }, // Channel Attribution All 모델 = Enterprise
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
  // 경쟁사: Klaviyo=Free500명/CoreUnlimited, HubSpot=AI세그먼트 Pro+, Salesforce Einstein=Enterprise
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
  // Kakao: Growth Basic / Biz Board(대형AdChannel) = Enterprise
  alimtalk:            { free: false, growth: true,  pro: true,  enterprise: true  },
  friendtalk:          { free: false, growth: true,  pro: true,  enterprise: true  },
  bizboard:            { free: false, growth: false, pro: false, enterprise: true  }, // Kakao Biz Board 대형Ad = Enterprise
  kakao_send:          { free: false, growth: true,  pro: true,  enterprise: true  },
  kakao_stat:          { free: false, growth: true,  pro: true,  enterprise: true  },
  kakao_setting:       { free: false, growth: true,  pro: true,  enterprise: true  },
  // WhatsApp: Global = Pro / AdvancedSettings = Enterprise
  wa_template:         { free: false, growth: false, pro: true,  enterprise: true  },
  wa_broadcast:        { free: false, growth: false, pro: true,  enterprise: true  },
  wa_setting:          { free: false, growth: false, pro: false, enterprise: true  }, // WhatsApp AdvancedSettings(APIChannel) = Enterprise
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
  // LINE: 일본·동남아 = Pro / AdvancedSettings = Enterprise
  line_msg:            { free: false, growth: false, pro: true,  enterprise: true  },
  line_template:       { free: false, growth: false, pro: true,  enterprise: true  },
  line_setting:        { free: false, growth: false, pro: false, enterprise: true  }, // LINE Channel AdvancedSettings = Enterprise
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
  // Enterprise: Rakuten/Temu(틈새Channel)·AllChannelSync·디지털셀프All·AIPrice최적화·AmazonAdvanced운영
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
  settlement_month:    { free: false, growth: true,  pro: true,  enterprise: true  }, // Monthly Settlement = Growth (Domestic 셀러 필Count Feature)
  settlement_excel:    { free: false, growth: true,  pro: true,  enterprise: true  },
  collect_channel:     { free: false, growth: true,  pro: true,  enterprise: true  },
  collect_schedule:    { free: false, growth: false, pro: false, enterprise: true  }, // Count집 Auto스케줄 = Enterprise 거버넌스
  collect_log:         { free: false, growth: false, pro: false, enterprise: true  }, // Collection Log All = Enterprise
  // WMS: BasicStock=Growth / Stock조정·위치·바코드=Pro / AdvancedWMS운영=Enterprise에서 포함
  inventory_list:      { free: false, growth: true,  pro: true,  enterprise: true  },
  inventory_alert:     { free: false, growth: true,  pro: true,  enterprise: true  },
  inventory_adjust:    { free: false, growth: false, pro: true,  enterprise: true  },
  inbound:             { free: false, growth: true,  pro: true,  enterprise: true  },
  outbound:            { free: false, growth: true,  pro: true,  enterprise: true  },
  location:            { free: false, growth: false, pro: true,  enterprise: true  },
  barcode:             { free: false, growth: false, pro: true,  enterprise: true  },
  // 카탈로그: 일괄Register·Sync·PriceManagement=Growth / AIPrice최적화=Enterprise
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
  amazon_policy:       { free: false, growth: false, pro: false, enterprise: true  }, // Amazon 정책 Management = Enterprise
  amazon_review:       { free: false, growth: false, pro: false, enterprise: true  }, // Amazon 리뷰 모니터링 = Enterprise
  amazon_listing:      { free: false, growth: false, pro: false, enterprise: true  }, // Amazon 리스팅 품질 = Enterprise

  // ── ⑥ Analysis·Performance
  // 경쟁사: HubSpot=커스텀리포트(Pro+)/예약리포트(Enterprise), Tableau=Enterprise급BI
  // Growth : PerformanceSummary·Channel·Product·Campaign·P&L개요·AIInsights·커스텀리포트·엑셀
  // Pro    : 코호트·P&LChannel/Product·AI이상감지·Auto리포트(Basic)
  // Enterprise: 예약Send리포트·API데이터Export·DashboardShare·경쟁사AIAnalysis
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
  competitor_ai:       { free: false, growth: false, pro: true,  enterprise: true  }, // Competitor AI Analysis = Pro (Advanced Marketing Analysis 필Count)
  custom_report:       { free: false, growth: true,  pro: true,  enterprise: true  },
  scheduled_rpt:       { free: false, growth: false, pro: false, enterprise: true  }, // Scheduled Send 리포트 = Enterprise (auto_report와 묶어 Enterprise 가치 형성)
  excel_export:        { free: false, growth: true,  pro: true,  enterprise: true  },
  api_export:          { free: false, growth: false, pro: false, enterprise: true  }, // API 데이터 Export = Enterprise (스트리밍 Data Pipeline)
  dashboard_share:     { free: false, growth: false, pro: false, enterprise: true  }, // Dashboard 외부 Share·임베드 = Enterprise

  // ── ⑦ 정산·재무
  // 경쟁사: Netsuite=재무All(Enterprise), QuickBooks=in progress소기업
  // Growth : 정산List·Channelper정산·지급List·엑셀·Payment이력
  // Pro    : P&LChannel/Productper · 월per정산Unified · 지급Approval
  // Enterprise: Tax Invoice·월per정산Unified·지급Approval결재 (재무Auto화)
  recon_list:          { free: false, growth: true,  pro: true,  enterprise: true  },
  recon_channel:       { free: false, growth: true,  pro: true,  enterprise: true  },
  recon_month:         { free: false, growth: false, pro: true,  enterprise: true  }, // Monthly Settlement Unified = Pro (멀티Channel Unified 정산 필요)
  recon_excel:         { free: false, growth: true,  pro: true,  enterprise: true  },
  tax_invoice:         { free: false, growth: false, pro: true,  enterprise: true  }, // Tax Invoice = Pro (Domestic 법인사업자 기준 Pro 필Count)
  settle_list:         { free: false, growth: true,  pro: true,  enterprise: true  },
  settle_approve:      { free: false, growth: false, pro: true,  enterprise: true  }, // Payment Approval = Pro (HubSpot 워크플로우 Approval 기준)
  settle_excel:        { free: false, growth: true,  pro: true,  enterprise: true  },
  my_plan:             { free: true,  growth: true,  pro: true,  enterprise: true  },
  plan_upgrade:        { free: true,  growth: true,  pro: true,  enterprise: true  },
  payment_hist:        { free: false, growth: true,  pro: true,  enterprise: true  },
  invoice:             { free: false, growth: true,  pro: true,  enterprise: true  },

  // ── ⑧ Auto화·AI
  // 경쟁사: HubSpot=워크플로우(Pro+), Salesforce Flow=Enterprise, Klaviyo Flows=Core+
  // Growth : Notification정책List·로그·ApprovalList·이력·Onboarding
  // Pro    : AIRule엔진·AI정책·RuleTest·Notification평가·Action프리셋·WritebackSettings·로그
  // Enterprise: Writeback Immediate Rollback (대규모 실Count 복구)
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
  // Writeback: Settings·로그=Pro / 즉시롤백=Enterprise (Salesforce 역방향Integration=Enterprise)
  wb_config:           { free: false, growth: false, pro: true,  enterprise: true  },
  wb_log:              { free: false, growth: false, pro: true,  enterprise: true  },
  wb_rollback:         { free: false, growth: false, pro: false, enterprise: true  }, // Immediate Rollback = Enterprise

  // ── ⑨ 데이터·Integration
  // 경쟁사: CDP(Segment)=Enterprise / 서버사이드Pixel=Paid / API스트리밍=Enterprise
  // Growth : DomesticAdChannel(Meta·Google·TikTok·Naver·Kakao·Coupang)·라이선스
  // Pro    : GlobalChannel(LINE·Shopify·Amazon)·EventCount집·데이터스키마·매핑·API키·웹훅·1stPartyPixel
  // Enterprise: Event정규화·OAuthManagement(파트너급)·데이터Product·Count집스케줄·로그All
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
  data_product:        { free: false, growth: false, pro: false, enterprise: true  }, // 데이터Product·거버넌스 = Enterprise
  // API 키: Pro / OAuth(파트너 Integration) = Enterprise
  api_key_list:        { free: false, growth: false, pro: true,  enterprise: true  },
  api_create:          { free: false, growth: false, pro: true,  enterprise: true  },
  webhook:             { free: false, growth: false, pro: true,  enterprise: true  },
  oauth_mgmt:          { free: false, growth: false, pro: false, enterprise: true  }, // OAuth 파트너 Management = Enterprise
  api_log:             { free: false, growth: false, pro: true,  enterprise: true  },
  // 라이선스: Growth부터 Activate
  license_activate:    { free: false, growth: true,  pro: true,  enterprise: true  },
  license_status:      { free: false, growth: true,  pro: true,  enterprise: true  },
  service_toggle:      { free: false, growth: false, pro: true,  enterprise: true  },
  // 1st-Party Pixel: Pro / PixelStatistics(MarketingIntelligence) = Enterprise
  pixel_config:        { free: false, growth: false, pro: true,  enterprise: true  },
  pixel_snippet:       { free: false, growth: false, pro: true,  enterprise: true  },
  pixel_verify:        { free: false, growth: false, pro: true,  enterprise: true  },
  pixel_stat:          { free: false, growth: false, pro: false, enterprise: true  }, // Pixel Statistics Dashboard = Enterprise

  // ── ⑩ 내 Team·Help
  // 경쟁사: HubSpot=Team Members초대(Starter+), Salesforce=RBAC(Enterprise)
  // Growth : Team MembersList·초대
  // Pro    : Team 활동 내역 Search
  // Enterprise: 역할 Settings(RBAC)·Team Members 활동 All 감사
  team_members:         { free: false, growth: true,  pro: true,  enterprise: true  },
  team_invite:          { free: false, growth: true,  pro: true,  enterprise: true  },
  team_roles:           { free: false, growth: false, pro: false, enterprise: true  }, // RBAC 역할 Settings = Enterprise
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
  smartconnect_log:     { free: false, growth: false, pro: false, enterprise: true  }, // 실Time 로그 All = Enterprise
  smartconnect_partner: { free: false, growth: false, pro: false, enterprise: true  }, // 파트너 API = Enterprise

  // 운영 허브 (Operations): 배치·재처리=Pro / NotificationSend=Enterprise
  ops_batch:            { free: false, growth: false, pro: true,  enterprise: true  },
  ops_retry:            { free: false, growth: false, pro: true,  enterprise: true  },
  ops_notify:           { free: false, growth: false, pro: false, enterprise: true  }, // Notification Send = Enterprise
  ops_log:              { free: false, growth: false, pro: true,  enterprise: true  },

  // Asia Logistics 3PL: ListSearch=Growth / Add·Edit=Pro / Delete·계약=Enterprise
  tpl_list:             { free: false, growth: true,  pro: true,  enterprise: true  },
  tpl_add:              { free: false, growth: false, pro: true,  enterprise: true  }, // 업체 Add = Pro
  tpl_edit:             { free: false, growth: false, pro: true,  enterprise: true  }, // 업체 Edit = Pro
  tpl_delete:           { free: false, growth: false, pro: false, enterprise: true  }, // 업체 Delete = Enterprise
  tpl_contract:         { free: false, growth: false, pro: false, enterprise: true  }, // 계약 Management = Enterprise

  // 화폐 Unit Select (전역): Growth부터 / 실Time 환율=Pro+
  currency_select:      { free: false, growth: true,  pro: true,  enterprise: true  }, // 화폐Unit Select
  currency_realtime:    { free: false, growth: false, pro: true,  enterprise: true  }, // 실Time 환율 = Pro

  // Data Product Spec: 스키마·품질=Pro / SLA·소유자=Enterprise
  data_product_spec:    { free: false, growth: false, pro: true,  enterprise: true  },
  data_product_quality: { free: false, growth: false, pro: true,  enterprise: true  },
  data_product_sla:     { free: false, growth: false, pro: false, enterprise: true  }, // SLA = Enterprise
  data_product_owner:   { free: false, growth: false, pro: false, enterprise: true  }, // 소유자 지정 = Enterprise

  // Audit Log (Audit): 본인=Growth / All·Export=Enterprise
  audit_my_log:         { free: false, growth: true,  pro: true,  enterprise: true  },
  audit_full_log:       { free: false, growth: false, pro: false, enterprise: true  }, // All 감사 = Enterprise
  audit_export:         { free: false, growth: false, pro: false, enterprise: true  }, // Export = Enterprise

  // 시스템 모니터: Search=Pro / NotificationSettings=Enterprise
  sysmon_status:        { free: false, growth: false, pro: true,  enterprise: true  },
  sysmon_api:           { free: false, growth: false, pro: true,  enterprise: true  },
  sysmon_alert:         { free: false, growth: false, pro: false, enterprise: true  }, // Notification Settings = Enterprise
};



// 플랜per 접근 Grade Summary
const PLAN_SUMMARY = {
  free:       { label: "Demo 체험",   desc: "KPI Widgets·퀵Link·Onboarding·Help만 (체험 Min)",                       icon: "🆓" },
  growth:     { label: "Marketing 성장", desc: "Domestic Channel Ad·커머스·CRM Basic·ChannelKPI·WMS Basic·Analysis 핵심",        icon: "📈" },
  pro:        { label: "AI Auto화",   desc: "Growth All + AIForecast·여정빌더·GlobalChannel·Rule엔진·AdvancedBI·API",      icon: "🚀" },
  enterprise: { label: "All Unlimited", desc: "Pro All + Writeback 즉시롤백·Amazon정책·시장점유율·Data Product", icon: "🌐" },
};


/*
   MenuAccessTab — Free/Growth/Pro/Enterprise 플랜per 접근Permission
   • Management자 전용 system 섹션(Management자센터) 제외
   • PLAN_DEFAULTS_MAP 기반 Recommended BasicValue Apply Button
   • 개per Clicks으로 Edit 가능
   • 정산재무 플랜Payment와 Sync 배지 표시
*/
/* ── AI Recommended Description 데이터 (Competitor Analysis 근거 포함) ─────────────── */
const PLAN_RECOMMEND_REASON = {
  growth: {
    summary: "Growth 플랜은 HubSpot Starter~Pro Count준의 성장 단계 브랜드 전용 플랜입니다. Domestic 주요 Marketing Channel(Meta·Google·Naver·Kakao·Coupang), Email/Kakao/SMS Campaign, WMS Basic, Channel KPI, Custom Report를 포함하여 Revenue 확대를 Support합니다. Global Channel(Shopify·Amazon·LINE·WhatsApp)·AI Forecast·여정 빌더는 운영 복잡도가 높아 Pro 이상에서 제공합니다.",
    sections: [
      { key: "home",       icon: "🏠", label: "홈 Dashboard",      access: "All Allow",   reason: "Dashboard·KPI Widgets·실Time 모니터 등 Basic 현황 파악 Feature은 Growth부터 필Count입니다. 단, Advanced Notification Feed는 Pro 이상에서 제공합니다." },
      { key: "ai_marketing", icon: "🚀", label: "AI Marketing Auto화", access: "핵심 Allow",  reason: "Campaign Settings·Management, AI Ad Creative, Content Calendar, Budget Planner 등 핵심 Marketing Feature을 Allow합니다. Customer Journey Builder·AI Forecast(이탈/LTV)은 Pro 전용 Feature입니다." },
      { key: "ad_analytics", icon: "📣", label: "Ad·Channel Analysis",    access: "Basic Allow",  reason: "Channel KPI, ROAS Analysis 등 핵심 Ad Performance Metric를 제공합니다. Attribution Analysis·Marketing Intelligence·Competitor Analysis은 Advanced AI Feature으로 Pro 이상에서 제공합니다." },
      { key: "crm",        icon: "👤", label: "Customer·CRM",         access: "Basic Allow",  reason: "Customer List·RFM 세그먼트·Email/Kakao Basic Campaign을 Allow합니다. VIP 세그먼트·AI Segments·LINE/WhatsApp/Instagram DM은 Pro 이상에서 제공합니다." },
      { key: "commerce",   icon: "🛒", label: "커머스·물류",       access: "핵심 Allow",  reason: "Product List·Catalog Sync·Orders Hub·Inventory Management·WMS Basic Feature을 포함합니다. Price Optimization·Shopify/Amazon Integration은 Pro 이상에서 제공합니다." },
      { key: "analytics",  icon: "📊", label: "Analysis·Performance",         access: "Basic Allow",  reason: "Performance Hub·P&L Overview·Insights 피드·Custom Report·Excel Export를 제공합니다. AI Anomaly Detection·Competitor AI Analysis·Auto Report·API Export는 Pro 이상입니다." },
      { key: "finance",    icon: "💳", label: "정산·재무",         access: "Basic Allow",  reason: "Settlement History·Payment List·Monthly Settlement 등 Basic 재무 Feature을 제공합니다. Tax Invoice 발행·Payment Approval·월per 손익 Channel/Product Analysis은 Pro 이상에서 제공합니다." },
      { key: "automation", icon: "🤖", label: "Auto화·AI",         access: "Limit Allow",  reason: "Onboarding·Notification List·Approval List 등 Basic Auto화 Feature을 Allow합니다. AI Rule Engine·Writeback·Advanced Alert Policies 평가는 복잡한 운영 인프라가 필요하여 Pro 이상에서 Support합니다." },
      { key: "data",       icon: "🔌", label: "데이터·Integration",       access: "주요 Allow",  reason: "Meta/Google/TikTok/Naver/Kakao/Coupang 등 주요 Channel Integration과 라이선스 Management를 Allow합니다. Event Count집·데이터 스키마·API 키 Management·Pixel Settings은 Pro 이상에서 제공합니다." },
      { key: "help",       icon: "👥", label: "내 Team·Help",       access: "Basic Allow",  reason: "Team Members List·초대·활동 내역·Help·Support 티켓을 제공합니다. 역할 Settings(Team Permission 분리)은 복잡한 조직 구조가 필요하여 Pro 이상에서 제공합니다." },
    ],
  },
  pro: {
    summary: "Pro 플랜은 '빠르게 성장하는 브랜드·에Previous시'를 위한 플랜으로, Growth Feature All + AI Forecast·Rule 엔진·Advanced Analysis·All Channel Integration을 포함합니다. 데이터 기반 Auto화와 Advanced Marketing 전략을 Run할 Count 있습니다.",
    sections: [
      { key: "home",       icon: "🏠", label: "홈 Dashboard",      access: "All Allow",   reason: "모든 Dashboard Feature·Real-time Monitoring·Notification Feed All를 Allow합니다. 경영진 레벨의 Unified 현황 파악이 가능합니다." },
      { key: "ai_marketing", icon: "🚀", label: "AI Marketing Auto화", access: "All Allow",  reason: "Customer Journey Builder·AI Forecast(이탈/LTV/구매확률)·Graph Score·AI Ad Insights All를 Allow합니다. AI가 최적의 Marketing Action을 Recommended하고 Auto 집행할 Count 있습니다." },
      { key: "ad_analytics", icon: "📣", label: "Ad·Channel Analysis",    access: "All Allow",  reason: "Attribution Analysis(터치 모델)·Marketing Intelligence·Competitor Analysis·디지털 셀프까지 All Ad Analysis Feature을 Allow합니다. Amazon Risk Management도 Pro부터 제공됩니다." },
      { key: "crm",        icon: "👤", label: "Customer·CRM",         access: "All Allow",  reason: "VIP 세그먼트·AI Segments·클러스터 Analysis·LINE/WhatsApp/Instagram DM Campaign All를 Allow합니다. 다Channel Customer Journey을 완전히 Auto화할 Count 있습니다." },
      { key: "commerce",   icon: "🛒", label: "커머스·물류",       access: "All Allow",  reason: "Price Optimization·Shopify/Amazon/디지털 셀프 Integration All를 포함합니다. Global Channel 확장과 지능형 Price 전략 Run이 가능합니다." },
      { key: "analytics",  icon: "📊", label: "Analysis·Performance",         access: "All Allow",  reason: "AI Anomaly Detection·Auto Report·Competitor AI Analysis·API 데이터 Export·Dashboard Share All를 Allow합니다. 전사적 데이터 기반 의사결정이 가능합니다." },
      { key: "finance",    icon: "💳", label: "정산·재무",         access: "All Allow",  reason: "Tax Invoice 발행·Payment Approval·월per 손익 Channel/Product Analysis All를 Allow합니다. 멀티Channel 재무 Management와 전자 정산이 가능합니다." },
      { key: "automation", icon: "🤖", label: "Auto화·AI",         access: "All Allow",  reason: "AI Rule Engine·Alert Policies 평가·Action Presets·Writeback(되돌리기) Settings·로그 All를 Allow합니다. 운영 Auto화의 핵심 인프라를 완전히 활용할 Count 있습니다." },
      { key: "data",       icon: "🔌", label: "데이터·Integration",       access: "All Allow",  reason: "Event Count집·정규화·데이터 스키마·매핑·API 키 Management·웹훅·1st-Party Pixel·Pixel Statistics All를 Allow합니다. 완전한 Data Pipeline을 구성할 Count 있습니다." },
      { key: "help",       icon: "👥", label: "내 Team·Help",       access: "All Allow",  reason: "Team Members 식 List·초대·역할 Settings·활동 내역 All와 Help·Support 티켓 All를 Allow합니다. 복잡한 조직 구조와 역할 기반 접근 제어를 완전히 Support합니다." },
    ],
  },
  enterprise: {
    summary: "Enterprise 플랜은 '대형 브랜드·에Previous시·복Count 법인 운영 기업'을 위한 최고 Grade 플랜입니다. Pro Feature All + Writeback Immediate Rollback·데이터 되돌리기까지 전 Feature을 Limit 없이 사용합니다. 전담 Support 및 커스텀 계약이 가능합니다.",
    sections: [
      { key: "home",       icon: "🏠", label: "홈 Dashboard",      access: "All Allow",   reason: "Pro와 동일하게 All Allow됩니다. 다Count의 Account/브랜드를 Unified Dashboard로 Management할 Count 있습니다." },
      { key: "ai_marketing", icon: "🚀", label: "AI Marketing Auto화", access: "All Allow",  reason: "Pro Feature All 포함. 여러 브랜드 Account의 AI Marketing 전략을 Unified 운용할 Count 있습니다." },
      { key: "ad_analytics", icon: "📣", label: "Ad·Channel Analysis",    access: "All Allow",  reason: "Pro Feature All 포함. 다Country·다Channel Ad Performance를 Unified Analysis하는 에Previous시 시나리오에 최적화됩니다." },
      { key: "crm",        icon: "👤", label: "Customer·CRM",         access: "All Allow",  reason: "Pro Feature All 포함. 대규모 Customer Data베이스와 복Count 브랜드 CRM을 Unified 운영할 Count 있습니다." },
      { key: "commerce",   icon: "🛒", label: "커머스·물류",       access: "All Allow",  reason: "Pro Feature All 포함. Global 멀티Channel 커머스와 물류 Unified 운영을 Support합니다." },
      { key: "analytics",  icon: "📊", label: "Analysis·Performance",         access: "All Allow",  reason: "Pro Feature All 포함. 기업 All의 KPI를 Unified 리포팅하고 이사회 Count준의 Insights를 제공합니다." },
      { key: "finance",    icon: "💳", label: "정산·재무",         access: "All Allow",  reason: "Pro Feature All 포함. 멀티 법인·멀티 Channel 재무 Unified 정산과 ERP Integration이 가능합니다." },
      { key: "automation", icon: "🤖", label: "Auto화·AI",         access: "All Allow + 롤백",  reason: "Pro Feature All + Writeback Immediate Rollback(wb_rollback)까지 Allow합니다. 대규모 운영에서 실Count를 즉시 복구할 Count 있는 안전망이 필요하기 때문입니다." },
      { key: "data",       icon: "🔌", label: "데이터·Integration",       access: "All Allow",  reason: "Pro Feature All 포함. 기업 규모의 데이터 거버넌스와 완전한 API 생태계를 구축할 Count 있습니다." },
      { key: "help",       icon: "👥", label: "내 Team·Help",       access: "All Allow",  reason: "Pro Feature All 포함. Unlimited Account과 복Count 법인 운영 시 세분화된 역할과 Team 구조 Management가 필Count입니다." },
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
  // Management자가 Register한 Latest Pricing (API 동적 로드)
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
        if (!prices.growth) prices.growth = "Pricing 미Register";
        if (!prices.pro) prices.pro = "Pricing 미Register";
        if (!prices.enterprise) prices.enterprise = "Pricing 미Register";
        setPlanPrices(prev => ({ ...prev, ...prices }));
      })
      .catch(() => {});
  }, []);

  // Paid회원에게 보이는 섹션만 (system 제외)
  const USER_MENU_TREE = React.useMemo(() =>
    MENU_TREE.filter(s => s.key !== ADMIN_ONLY_SECTION),
  []);

  // All 최하위 key (system 제외)
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

  // 전 플랜 RecommendedValue 일괄 Apply (기존)
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

  // [고도화] Select된 플랜에 AI Recommended Apply + Recommended 키 추적 + Statistics
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

  const colCount = PLANS.length; // 4
  const gridCols = `1fr repeat(${colCount}, 72px)`;

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
          🤖 AI 접근Permission Recommended 시스템
          {recommendedKeys.size > 0 && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", fontWeight: 700 }}>
              ✨ {recommendPlan.toUpperCase()} Recommended Apply됨
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#7c8fa8", marginBottom: 16, lineHeight: 1.6 }}>
          플랜을 Select하고 <strong style={{ color: "#a5b4fc" }}>Recommended Button</strong>을 Clicks하면 해당 플랜에 최적화된 메뉴 접근Permission이 Auto Settings되고,
          각 섹션per로 <strong style={{ color: "#a5b4fc" }}>왜 이 Permission인지 상세 Description</strong>을 제공합니다. Management자가 언제든 개per Edit할 Count 있습니다.
        </div>

        {/* 플랜 Select Card — Growth / Pro / Enterprise (Starter 제외) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            {
              id: "growth", label: "Growth", emoji: "📈", color: "#4f8ef7",
              price: planPrices.growth || "Pricing Confirm in progress...",
              desc: "성장 단계 브랜드 · 핵심 Marketing+커머스+CRM",
              includes: ["주요 AdChannel Integration (Meta·Google·Naver·Kakao·Coupang)", "Email·Kakao Basic Campaign", "Orders·Stock·WMS Basic", "CRM List·RFM 세그먼트", "Basic Analysis·리포트·엑셀"],
              excluded: ["AI Forecast(이탈/LTV) — Pro+", "Customer Journey Builder — Pro+", "AI Rule Engine — Pro+", "Attribution Analysis — Pro+"],
            },
            {
              id: "pro", label: "Pro", emoji: "🚀", color: "#a855f7",
              price: planPrices.pro || "Pricing Confirm in progress...",
              desc: "빠르게 성장하는 브랜드 · AI Auto화 All",
              popular: true,
              includes: ["Growth Feature All 포함", "AI Forecast (이탈·LTV·구매확률)", "Customer Journey Builder + AI Rule Engine", "Attribution Analysis·Marketing Intelligence", "LINE·WhatsApp·Instagram DM", "All Channel Integration·API 키·Pixel"],
              excluded: ["Writeback Immediate Rollback — Enterprise"],
            },
            {
              id: "enterprise", label: "Enterprise", emoji: "🌐", color: "#f59e0b",
              price: planPrices.enterprise || "문의",
              desc: "대형 브랜드·에Previous시·복Count 법인",
              includes: ["Pro Feature All 포함", "Writeback Immediate Rollback (wb_rollback)", "전담 Support·커스텀 계약", "멀티 법인·멀티 Channel Unified"],
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
              <div style={{ fontSize: 9, color: "#4ade80", fontWeight: 700, marginBottom: 3 }}>✅ 포함 Feature</div>
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
                <div style={{ marginTop: 10, fontSize: 10, color: plan.color, fontWeight: 800 }}>✓ Select됨</div>
              )}
            </button>
          ))}
        </div>

        {/* AI Recommended Button + Recommended Statistics */}
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
              : <>{PLAN_EMOJIS[recommendPlan]} {recommendPlan === "growth" ? "Growth" : recommendPlan === "pro" ? "Pro" : "Enterprise"} 플랜 Recommended 메뉴 Auto Apply</>
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
            ⚠ <strong style={{ color: PLAN_COLORS[recommendPlan] }}>{recommendPlan.toUpperCase()}</strong> 플랜만 Update됩니다.<br />
            Apply 후 Checkbox로 개per 조정 가능합니다.
          </div>
        </div>
      </div>

      {/* ── NEW: AI Recommended Description Panel ── */}
      {showReasonPanel && reasonData && (
        <div style={{
          padding: "20px", borderRadius: 14,
          background: `${PLAN_COLORS[recommendPlan]}08`,
          border: `1px solid ${PLAN_COLORS[recommendPlan]}40`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 14, color: PLAN_COLORS[recommendPlan], marginBottom: 6 }}>
                {PLAN_EMOJIS[recommendPlan]} {recommendPlan === "growth" ? "Growth" : recommendPlan === "pro" ? "Pro" : "Enterprise"} 플랜 — 접근Permission Recommended Description
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
                  color: sec.access.includes("All") ? "#22c55e" : sec.access.includes("핵심") ? "#4f8ef7" : sec.access.includes("Limit") ? "#eab308" : "#f59e0b",
                }}>
                  {sec.access.includes("All") ? "✅" : sec.access.includes("핵심") || sec.access.includes("Basic") || sec.access.includes("주요") ? "🔵" : "⚠️"}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 10, color: "#4ade80" }}>
            ✅ AI Recommended Permission이 <strong>{recommendPlan}</strong> 플랜에 Apply되었습니다. 아래 Checkbox에서 개per 메뉴를 자유롭게 Edit한 후 <strong>「Permission Settings Save」</strong> Button을 눌러주세요.
          </div>
        </div>
      )}

      {/* 안내 Banner */}
      <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)" }}>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, color: "#93c5fd" }}>📋 플랜per 메뉴 접근Permission Settings</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ padding: "8px 10px", borderRadius: 8, background: p.color + "10", border: `1px solid ${p.color}25` }}>
              <div style={{ fontSize: 11, color: p.color, fontWeight: 800, marginBottom: 2 }}>{p.emoji} {p.label} — {PLAN_SUMMARY[p.id]?.label}</div>
              <div style={{ fontSize: 9, color: "#64748b", lineHeight: 1.5 }}>{PLAN_SUMMARY[p.id]?.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: "#475569" }}>
          ⚙ Management자 센터 메뉴는 Platform Management자 전용으로 이 Settings에서 제외됩니다.
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
          ✨ 전 플랜 RecommendedValue 일괄 Apply
        </button>
        {applied && <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>✅ BasicValue Apply됨!</span>}
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
        {PLANS.filter(p => p.id !== 'free').map(p => (
          <button key={p.id} onClick={() => setBulk(allSubKeys, p.id, true)} style={{
            padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${p.color}44`, background: `${p.color}10`, color: p.color,
          }}>{p.emoji} {p.label} All Allow</button>
        ))}
        <button onClick={() => setBulk(allSubKeys, 'free', false)} style={{
          padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
          border: "1px solid rgba(141,164,196,0.3)", background: "rgba(141,164,196,0.07)", color: "#8da4c4",
        }}>🆓 Free All 잠금</button>
        <button onClick={() => { PLANS.forEach(p => setBulk(allSubKeys, p.id, false)); }} style={{
          padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
          border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444",
        }}>🚫 All Reset</button>
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
        <span><b>정산·재무 플랜Payment Integration:</b> 여기서 Settings한 Permission은 Users가 플랜 Payment Done 시 Auto Apply됩니다. <span style={{ color: "#86efac" }}>my_plan·plan_upgrade·payment_hist·invoice</span>는 모든 Paid Plan에 Basic Allow됩니다.</span>
      </div>

      {/* 플랜 Header (sticky) */}
      <div style={{
        display: "grid", gridTemplateColumns: gridCols,
        gap: 4, padding: "8px 14px",
        background: "rgba(15,23,42,0.9)", borderRadius: 8,
        position: "sticky", top: 0, zIndex: 10,
        border: "1px solid rgba(79,142,247,0.25)",
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>메뉴 구조 (Management자 전용 제외)</span>
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
   DiscountPanel — 플랜per × 주기per Discount율 Management
   • 플랜per로 다른 Discount율 Settings 가능
   • 프리셋 일괄 Apply + 커스텀 입력 + Save Integration
   ══════════════════════════════════════════════════════════════════════════ */
function DiscountPanel({ pricingData, setPricingData, handleSave, saving, setMsg, setMsgType }) {
  // 플랜per Discount율 Status (주기per: quarterly/semi_annual/yearly)
  const DISC_CYCLES = [
    { key: "quarterly",   label: "3개월", months: 3,  color: "#4f8ef7" },
    { key: "semi_annual", label: "6개월", months: 6,  color: "#a855f7" },
    { key: "yearly",      label: "Annual",  months: 12, color: "#f59e0b" },
  ];
  const DISC_PLANS = PLANS.filter(p => !p.isDemo); // Growth/Pro/Enterprise

  // 현재 각 플랜의 대표 Discount율 (Save된 pricingData에서 추출)
  const getPlanDisc = (planId, cycleKey) => {
    // 해당 플랜의 임의 Account Count 행에서 Discount율 읽기 (모든 Account이 같은 Discount율이라고 가정)
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

  // All 플랜에 일괄 Discount율 Apply (모든 Account Count 행에 동일하게)
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
    setMsg(`✅ ${labels[preset]} Discount율 일괄 Apply됨. Save Button으로 확정하세요.`);
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
            🏷 Discount율 Management
          </div>
          <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 2 }}>
            장기 Subscription Discount율을 플랜per · 주기per로 Settings하세요. 입력 후 Bottom Save Button을 Clicks하세요.
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

      {/* 플랜per × 주기per 입력 Table */}
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

        {/* 플랜per 행 */}
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

        {/* 안내 & Save Button */}
        <div style={{
          marginTop: 14, padding: "12px 16px", borderRadius: 10,
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>💡 Discount율 Apply 방식</div>
            <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 2 }}>
              Discount율은 각 플랜의 <strong style={{ color: "#e2e8f0" }}>모든 Account Count 단계</strong>에 동일하게 Apply됩니다. 月간 Tab에서 BasicPricing, 여기서 Discount율 Settings 후 Save하세요.
            </div>
          </div>
          <button
            onClick={async () => {
              setMsg(""); setMsgType("ok");
              await handleSave();
            }}
            disabled={saving}
            style={{
              padding: "10px 24px", borderRadius: 10, border: "none", flexShrink: 0,
              background: saving ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "#fff", fontWeight: 800, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
              boxShadow: saving ? "none" : "0 4px 16px rgba(34,197,94,0.4)",
            }}
          >
            {saving ? "⏳ Save in progress..." : "💾 Discount율 Save"}
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
  const [savedItems,    setSavedItems]    = useState([]);
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
        if (!d.ok || !d.items) return;
        setSavedItems(d.items);
        const pMap = {}, mMap = {};
        d.items.forEach(item => {
          const key = item.menu_key;
          if (key.startsWith(PLAN_ACCT_PFX)) {
            if (!pMap[key]) pMap[key] = {};
            // monthly 주기만 monthly_price에 Save (편집 기준뱐)
            if (item.cycle === 'monthly') {
              pMap[key]['monthly_price'] = item.price_krw || '';
            }
            // 모든 주기의 Discount율 Save
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

  /* ── All Save ── */
  const handleSave = async () => {
    // ── Demo Guard ──────────────────────────────────────────────────────
    if (isDemo) {
      setMsgType("warn");
      setMsg("📌 Demo Mode: Subscription·Pricing·메뉴 Permission Change은 실제 운영 Account에서만 가능합니다.");
      return;
    }
    setSaving(true); setMsg(""); setPaddleResult(null);
    try {
      const items = [];

      Object.entries(pricingData).forEach(([rowKey, fields]) => {
        // monthly_price 키에서 Monthly Basic Pricing 읽기
        const monthlyBase = parseInt(fields["monthly_price"]) || 0;
        CYCLES.forEach(c => {
          let price = 0;
          if (c.key === 'monthly') {
            // monthly는 monthly_price 키로 Save됨
            price = monthlyBase;
          } else {
            // 비Monthly: Save된 Value 있으면 사용, 없으면 MonthlyPricing × 개월Count Auto계산
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
        setMsg("⚠️ Save할 Pricing 또는 Permission Settings이 없습니다. Value을 입력해 주세요."); setMsgType("warn");
        setSaving(false); return;
      }

      const r = await fetch(`${API}/auth/pricing/plans`, {
        method: "POST", headers: authHeader(),
        body: JSON.stringify({ items }),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg(`✅ ${d.saved ?? items.length}건 Save Done! Save된 Pricing List Tab에서 Confirm하거나 Paddle Sync를 Run하세요.`);
        setMsgType("ok");
        loadData();
        setInnerTab("list");
        // 메뉴 접근 Permission Change가 존음 즉시 반영 (reloadMenuAccess)
        if (reloadMenuAccess) reloadMenuAccess();
      } else {
        setMsg("❌ " + (d.error || "Save Failed")); setMsgType("err");
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
        loadData(); // paddle_price_id Update 반영
      } else {
        setMsg("⚠️ Paddle Sync Error: " + (d.error || "알 Count None")); setMsgType("warn");
      }
    } catch (e) {
      setPaddleResult({ ok: false, error: e.message });
      setMsg("❌ Paddle Sync Failed: " + e.message); setMsgType("err");
    } finally { setPaddleSyncing(false); }
  };

  /* ── Delete ── */
  const handleDelete = async (id) => {
    if (!window.confirm("이 Pricing 항목을 Delete하시겠습니까? Paddle에 Sync된 Price도 아카이브됩니다.")) return;
    try {
      const r = await fetch(`${API}/auth/pricing/plans/${id}`, { method: "DELETE", headers: authHeader() });
      const d = await r.json();
      if (d.ok) {
        setMsg("🗑️ Delete Done" + (d.paddle_archived ? " (Paddle Price 아카이브됨)" : "")); setMsgType("ok");
        loadData();
      } else {
        setMsg("❌ Delete Failed: " + (d.error || "")); setMsgType("err");
      }
    } catch (e) {
      setMsg("❌ " + e.message); setMsgType("err");
    }
  };

  /* Summary counts */
  const pricingCount = Object.values(pricingData).reduce(
    (s, f) => s + CYCLES.filter(c => parseInt(f[`${c.key}_price`]) > 0).length, 0);
  const menuCount = Object.values(menuData).reduce(
    (s, f) => s + Object.values(f).filter(Boolean).length, 0);
  const syncedCount = savedItems.filter(it => !!it.paddle_price_id).length;

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
            💳 SubscriptionPricing Management
          </div>
          <div style={{ fontSize: 11, color: "#7c8fa8", marginTop: 4 }}>
            플랜per·AccountCountper Pricing Register 후 한 번에 Paddle과 Sync합니다
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {pricingCount > 0 && <span style={{ fontSize: 10, color: "#a855f7", fontWeight: 700, background: "rgba(168,85,247,0.1)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(168,85,247,0.3)" }}>💰 {pricingCount}개 입력됨</span>}
          {menuCount > 0    && <span style={{ fontSize: 10, color: "#4f8ef7", fontWeight: 700, background: "rgba(79,142,247,0.1)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(79,142,247,0.3)" }}>🔒 {menuCount}개 Permission</span>}
          {syncedCount > 0  && <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, background: "rgba(34,197,94,0.1)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(34,197,94,0.3)" }}>✅ Paddle {syncedCount} items</span>}

          {/* ★ Save Button (항상 눈에 보이게) */}
          <button
            onClick={handleSave}
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
            {saving ? "⏳ Save in progress..." : "💾 Save"}
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
            id: "pricing", icon: "💰", label: "Pricing Management",
            sub: `${savedItems.filter(it => it.menu_key?.startsWith(PLAN_ACCT_PFX) && parseInt(it.price_krw) > 0).length}개 Save됨`,
            color: "#4f8ef7",
          },
          {
            id: "menu", icon: "🔒", label: "메뉴 접근 Permission",
            sub: menuCount > 0 ? `${menuCount}개 Permission Settings됨` : "Permission None",
            color: "#a855f7",
          },
          {
            id: "members", icon: "👥", label: "회원·이용권 Management",
            sub: "Paid회원 + Coupon Issue",
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

      {/* ── Pricing Management Tab (pricing + list Unified) ── */}
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

          {/* Save 안내 & Button */}
          <div style={{
            padding: "16px 20px", borderRadius: 12,
            background: "linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))",
            border: "1px solid rgba(79,142,247,0.2)",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                💡 Monthly Pricing을 먼저 입력·Save하면 3개월/6개월/Annual Basic Pricing이 Auto계산됩니다
              </div>
              <div style={{ fontSize: 10, color: "#7c8fa8", marginTop: 4 }}>
                Save Done 후 Bottom 「Paddle Sync」 Button으로 Paddle에 바로 반영하세요.
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "12px 32px", borderRadius: 10, border: "none",
                background: saving ? "rgba(79,142,247,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
                color: "#fff", fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 6px 20px rgba(79,142,247,0.45)",
                transition: "all 200ms",
              }}
            >
              {saving ? "⏳ Save in progress..." : "💾 Pricing Save"}
            </button>
          </div>

          {/* ── Discount율 Management Panel (고도화) ── */}
          <DiscountPanel pricingData={pricingData} setPricingData={setPricingData} handleSave={handleSave} saving={saving} setMsg={setMsg} setMsgType={setMsgType} />

          {/* ── Save된 Pricing List + Paddle Sync (Unified) ── */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
              📋 Save된 Pricing List
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.25)", color: "#4f8ef7", fontWeight: 700 }}>
                {savedItems.filter(it => it.menu_key?.startsWith(PLAN_ACCT_PFX) && parseInt(it.price_krw) > 0).length}건
              </span>
            </div>
            <SavedRateList
              items={savedItems}
              onDelete={handleDelete}
              onPaddleSync={handlePaddleSync}
              paddleSyncing={paddleSyncing}
              paddleResult={paddleResult}
            />
          </div>
        </div>
      )}

      {/* ── 메뉴 접근 Permission Tab ── */}
      {!loading && innerTab === "menu" && (
        <div style={{ display: "grid", gap: 12 }}>
          <MenuAccessTab menuData={menuData} onMenuChange={handleMenuChange} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "10px 28px", borderRadius: 10, border: "none",
                background: saving ? "rgba(79,142,247,0.3)" : "linear-gradient(135deg,#4f8ef7,#6366f1)",
                color: "#fff", fontWeight: 800, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 4px 16px rgba(79,142,247,0.4)",
              }}
            >
              {saving ? "⏳ Save in progress..." : "💾 Permission Settings Save"}
            </button>
          </div>
        </div>
      )}

      {/* ── 회원·이용권 Management Tab (members + coupons Unified) ── */}
      {innerTab === "members" && <MembersCouponsTab />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MembersCouponsTab — Paid회원 Management + 이용권 Issue Unified Component
   ══════════════════════════════════════════════════════════════════════════ */
function MembersCouponsTab() {
  const [subTab, setSubTab] = React.useState("members");
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {/* 서브Tab 바 */}
      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 4 }}>
        {[
          { id: "members", label: "👥 Paid회원 Management",    color: "#4f8ef7", sub: "회원 List·플랜·Period Edit" },
          { id: "coupons", label: "🎟 이용권 Issue·Management", color: "#22c55e", sub: "Free·Paid회원 Coupon 지급" },
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

