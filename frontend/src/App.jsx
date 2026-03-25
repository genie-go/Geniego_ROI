import React, { Suspense, lazy, Component } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./layout/Sidebar.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import Topbar from "./layout/Topbar.jsx";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import { GlobalDataProvider } from "./context/GlobalDataContext.jsx";
import { CurrencyProvider } from "./contexts/CurrencyContext.jsx";
import { MobileSidebarProvider } from "./context/MobileSidebarContext.jsx";
import { ConnectorSyncProvider } from "./context/ConnectorSyncContext.jsx";
import DemoTopBar from "./components/DemoTopBar.jsx";
import DemoModeBanner from "./components/DemoModeBanner.jsx";
import DemoUpgradeBanner from "./components/DemoUpgradeBanner.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Marketing = lazy(() => import("./pages/Marketing.jsx"));
const AccountPerformance = lazy(() => import("./pages/AccountPerformance.jsx"));
const Commerce = lazy(() => import("./pages/Commerce.jsx"));
const AmazonRisk = lazy(() => import("./pages/AmazonRisk.jsx"));
const DigitalShelf = lazy(() => import("./pages/DigitalShelf.jsx"));
const ReviewsUGC = lazy(() => import("./pages/ReviewsUGC.jsx"));
// InfluencerHub → InfluencerUGC로 통합됨
// Reports → ReportBuilder로 통합됨
const Writeback = lazy(() => import("./pages/Writeback.jsx"));
const Approvals = lazy(() => import("./pages/Approvals.jsx"));
const Connectors = lazy(() => import("./pages/Connectors.jsx"));
const Settlements = lazy(() => import("./pages/Settlements.jsx"));
const Reconciliation = lazy(() => import("./pages/Reconciliation.jsx"));
const Audit = lazy(() => import("./pages/Audit.jsx"));
const AIPolicy = lazy(() => import("./pages/AIPolicy.jsx"));
const ActionPresets = lazy(() => import("./pages/ActionPresets.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const MappingRegistry = lazy(() => import("./pages/MappingRegistry.jsx"));
const AlertPolicies = lazy(() => import("./pages/AlertPolicies.jsx"));
const Attribution = lazy(() => import("./pages/Attribution.jsx"));
const GraphScore = lazy(() => import("./pages/GraphScore.jsx"));
const KrChannel = lazy(() => import("./pages/KrChannel.jsx"));
const PriceOpt = lazy(() => import("./pages/PriceOpt.jsx"));
const CatalogSync = lazy(() => import("./pages/CatalogSync.jsx"));
const OrderHub = lazy(() => import("./pages/OrderHub.jsx"));
const OperationsHub = lazy(() => import("./pages/OperationsHub.jsx"));
const PerformanceHub = lazy(() => import("./pages/PerformanceHub.jsx"));
const InfluencerUGC = lazy(() => import("./pages/InfluencerUGC.jsx"));
const PnLDashboard = lazy(() => import("./pages/PnLDashboard.jsx"));
const DataSchema = lazy(() => import("./pages/DataSchema.jsx"));
const AIInsights = lazy(() => import("./pages/AIInsights.jsx"));
const ReportBuilder = lazy(() => import("./pages/ReportBuilder.jsx"));
const EventNorm = lazy(() => import("./pages/EventNorm.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const ApiKeys = lazy(() => import("./pages/ApiKeys.jsx"));
const DataProduct = lazy(() => import("./pages/DataProduct.jsx"));
const DbAdmin = lazy(() => import("./pages/DbAdmin.jsx"));
const RollupDashboard = lazy(() => import("./pages/RollupDashboard.jsx"));
const CampaignManager = lazy(() => import("./pages/CampaignManager.jsx"));
const ContentCalendar = lazy(() => import("./pages/ContentCalendar.jsx"));
const BudgetPlanner = lazy(() => import("./pages/BudgetPlanner.jsx"));
const SystemMonitor = lazy(() => import("./pages/SystemMonitor.jsx"));
const OperationsGuide = lazy(() => import("./pages/OperationsGuide.jsx"));
const AIRuleEngine = lazy(() => import("./pages/AIRuleEngine.jsx"));
const MarketingIntelligence = lazy(() => import("./pages/MarketingIntelligence.jsx"));
const OmniChannel = lazy(() => import("./pages/OmniChannel.jsx"));
const WmsManager = lazy(() => import("./pages/WmsManager.jsx"));
const UserManagement = lazy(() => import("./pages/UserManagement.jsx"));
const AutoMarketing = lazy(() => import("./pages/AutoMarketing.jsx"));
const HelpCenter = lazy(() => import("./pages/HelpCenter.jsx"));
const ChannelKPI = lazy(() => import("./pages/ChannelKPI.jsx"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess.jsx"));
const PaymentFail = lazy(() => import("./pages/PaymentFail.jsx"));
const PgConfig = lazy(() => import("./pages/PgConfig.jsx"));
const CRM = lazy(() => import("./pages/CRM.jsx"));
const EmailMarketing = lazy(() => import("./pages/EmailMarketing.jsx"));
const KakaoChannel = lazy(() => import("./pages/KakaoChannel.jsx"));
const LINEChannel = lazy(() => import("./pages/LINEChannel.jsx"));
const PixelTracking = lazy(() => import("./pages/PixelTracking.jsx"));
const JourneyBuilder = lazy(() => import("./pages/JourneyBuilder.jsx"));
const AIPrediction = lazy(() => import("./pages/AIPrediction.jsx"));
const WebPopup = lazy(() => import("./pages/WebPopup.jsx"));
const WhatsApp = lazy(() => import("./pages/WhatsApp.jsx"));
const SmsMarketing = lazy(() => import("./pages/SmsMarketing.jsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.jsx"));
const InstagramDM = lazy(() => import("./pages/InstagramDM.jsx"));
const LicenseActivation = lazy(() => import("./pages/LicenseActivation.jsx"));
const TeamWorkspace = lazy(() => import('./pages/TeamWorkspace.jsx'));
const CommerceUnifiedSearch = lazy(() => import('./pages/CommerceUnifiedSearch.jsx'));
const AIMarketingHub = lazy(() => import('./pages/AIMarketingHub.jsx'));
const FeedbackCenter = lazy(() => import('./pages/FeedbackCenter.jsx'));
const SmartConnect   = lazy(() => import('./pages/SmartConnect.jsx'));
const DemandForecast = lazy(() => import('./pages/DemandForecast.jsx'));
const AsiaLogistics  = lazy(() => import('./pages/AsiaLogistics.jsx'));
const ReturnsPortal  = lazy(() => import('./pages/ReturnsPortal.jsx'));
const SupplyChain    = lazy(() => import('./pages/SupplyChain.jsx'));
const SupplierPortal = lazy(() => import('./pages/SupplierPortal.jsx'));
const MyCoupons      = lazy(() => import('./pages/MyCoupons.jsx'));
const RulesEditorV2  = lazy(() => import('./pages/RulesEditorV2.jsx'));
const AIRecommendTab = lazy(() => import('./pages/AIRecommendTab.jsx'));
const CaseStudy      = lazy(() => import('./pages/CaseStudy.jsx'));

const DataTrustDashboard = lazy(() => import('./pages/DataTrustDashboard.jsx'));
const DeveloperHub   = lazy(() => import('./pages/DeveloperHub.jsx'));
import { GdprController } from "./components/GdprBanner.jsx";
import EventPopupDisplay from "./components/EventPopupDisplay.jsx";



/* ─── Public Pages (no auth required) ───────────────────────────────────── */
const Landing = lazy(() => import("./pages/public/Landing.jsx"));
const PricingPublic = lazy(() => import("./pages/public/PricingPublic.jsx"));
const Terms = lazy(() => import("./pages/public/Terms.jsx"));
const Privacy = lazy(() => import("./pages/public/Privacy.jsx"));
const Refund = lazy(() => import("./pages/public/Refund.jsx"));
const PgTest = lazy(() => import("./pages/public/PgTest.jsx"));

/* 스켈레톤 로더 — 배경색 보장으로 블랙스크린 방지 */
const Loader = () => (
  <div style={{ display: "grid", gap: 14, padding: "4px 0", background: "var(--surface-1, #070f1a)", minHeight: "100%" }}>
    {/* Hero skeleton */}
    <div style={{ height: 88, borderRadius: 16, background: "rgba(99,102,241,0.06)", animation: "skeleton-pulse 1.4s ease-in-out infinite" }} />
    {/* Tab bar skeleton */}
    <div style={{ height: 48, borderRadius: 12, background: "rgba(99,102,241,0.04)", animation: "skeleton-pulse 1.4s ease-in-out infinite 0.1s" }} />
    {/* Content skeletons */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ height: 80, borderRadius: 12, background: "rgba(99,102,241,0.05)", animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.07}s` }} />
      ))}
    </div>
    <div style={{ height: 200, borderRadius: 12, background: "rgba(99,102,241,0.04)", animation: "skeleton-pulse 1.4s ease-in-out infinite 0.3s" }} />
  </div>
);

/* React Error Boundary — 컴포넌트 크래시가 앱 블랙스크린 되는 것 방지 */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(err, info) { console.error('[ErrorBoundary]', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', gap: 16, padding: 32, background: 'var(--surface-1, #070f1a)'
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ color: '#f87171', fontWeight: 800, fontSize: 16 }}>화면 오류가 발생했습니다</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || '알 수 없는 오류'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >새로고침</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* 전체화면 초기 로딩 스피너 (새로고침 시 블랙스크린 방지) */
const FullLoader = () => (
  <div style={{
    position: "fixed", inset: 0, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "var(--surface-1, #070f1a)", zIndex: 9999, gap: 16,
  }}>
    <div style={{ width: 48, height: 48, border: "3px solid rgba(79,142,247,0.2)", borderTop: "3px solid #4f8ef7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Geniego-ROI 로딩 중...</div>
    <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
  </div>
);

/* 스마트 요금제 라우팅 — 로그인 사용자는 앱 내 /app-pricing, 비로그인은 PricingPublic */
function SmartPricing() {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (user) return <Navigate to="/app-pricing" replace />;
  return <PricingPublic />;
}

/* 인증 가드 — 로그인 없으면 /login 으로 (블랙스크린 방지) */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />; // 전체화면 스피너로 블랙스크린 방지
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* 앱 내부 레이아웃 (인증 필요) */
function AppLayout() {
  return (
    <CurrencyProvider>
    <MobileSidebarProvider>
    <div className="container" style={{ height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, height: '100vh', overflow: 'hidden' }}>
        <Topbar />
        <GdprController />
        <EventPopupDisplay />

        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* 데모 사용자: 전역 상단 안내 바 (유료 회원 가입 바로가기 포함) */}
          <DemoTopBar />
          {/* 데모 모드 배너 (체험 중 안내 + API 키 등록 즉시 실사용 전환 CTA) */}
          <DemoModeBanner />
          {/* 데모 유저 전환 유인 Sticky 하단 배너 (무료쿠폰/유료회원 가입 CTA) */}
          <DemoUpgradeBanner />
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '14px 16px 20px',
            paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
            display: 'grid',
            gap: 14,
            alignContent: 'start',
          }}>
            <ErrorBoundary>
              <Suspense fallback={<Loader />}>
                <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                {/* 회원가입 직접 링크 (/register → /login?tab=register) */}
                <Route path="/register" element={<Navigate to="/login?tab=register" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/account-performance" element={<AccountPerformance />} />
                <Route path="/commerce" element={<Commerce />} />
                <Route path="/amazon-risk" element={<AmazonRisk />} />
                <Route path="/digital-shelf" element={<DigitalShelf />} />
                <Route path="/reviews-ugc" element={<ReviewsUGC />} />
                <Route path="/influencer" element={<InfluencerUGC />} />
                <Route path="/reports" element={<Navigate to="/report-builder" replace />} />
                <Route path="/writeback" element={<Writeback />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/connectors" element={<Connectors />} />
                <Route path="/api-keys" element={<ApiKeys />} />
                <Route path="/settlements" element={<Settlements />} />
                <Route path="/reconciliation" element={<Reconciliation />} />
                <Route path="/audit" element={<Audit />} />
                <Route path="/ai-policy" element={<AIPolicy />} />
                <Route path="/action-presets" element={<ActionPresets />} />
                <Route path="/mapping-registry" element={<MappingRegistry />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/alert-policies" element={<AlertPolicies />} />
                <Route path="/attribution" element={<Attribution />} />
                <Route path="/graph-score" element={<GraphScore />} />
                <Route path="/kr-channel" element={<KrChannel />} />
                <Route path="/price-opt" element={<PriceOpt />} />
                <Route path="/catalog-sync" element={<CatalogSync />} />
                <Route path="/order-hub" element={<OrderHub />} />
                <Route path="/operations" element={<OperationsHub />} />
                <Route path="/performance" element={<PerformanceHub />} />
                <Route path="/influencer-ugc" element={<Navigate to="/influencer" replace />} />
                <Route path="/pnl" element={<PnLDashboard />} />
                <Route path="/data-schema" element={<DataSchema />} />
                <Route path="/ai-insights" element={<AIInsights />} />
                <Route path="/report-builder" element={<ReportBuilder />} />
                <Route path="/event-norm" element={<EventNorm />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/app-pricing" element={<Pricing />} />
                <Route path="/data-product" element={<DataProduct />} />
                <Route path="/db-admin" element={<DbAdmin />} />
                <Route path="/rollup" element={<RollupDashboard />} />
                <Route path="/ai-rule-engine" element={<AIRuleEngine />} />
                <Route path="/campaign-manager" element={<CampaignManager />} />
                <Route path="/marketing-intelligence" element={<MarketingIntelligence />} />
                <Route path="/omni-channel" element={<OmniChannel />} />
                <Route path="/wms-manager" element={<WmsManager />} />
                <Route path="/user-management" element={<UserManagement />} />
                <Route path="/content-calendar" element={<ContentCalendar />} />
                <Route path="/budget-planner" element={<BudgetPlanner />} />
                <Route path="/system-monitor" element={<SystemMonitor />} />
                <Route path="/operations-guide" element={<Navigate to="/operations" replace />} />
                <Route path="/auto-marketing" element={<AutoMarketing />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/channel-kpi" element={<ChannelKPI />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/fail" element={<PaymentFail />} />
                <Route path="/pg-config" element={<PgConfig />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/email-marketing" element={<EmailMarketing />} />
                <Route path="/kakao-channel" element={<KakaoChannel />} />
                <Route path="/line-channel" element={<LINEChannel />} />
                <Route path="/pixel-tracking" element={<PixelTracking />} />
                <Route path="/journey-builder" element={<JourneyBuilder />} />
                <Route path="/ai-prediction" element={<AIPrediction />} />
                <Route path="/web-popup" element={<WebPopup />} />
                <Route path="/whatsapp" element={<WhatsApp />} />
                <Route path="/sms-marketing" element={<SmsMarketing />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/instagram-dm" element={<InstagramDM />} />
                <Route path="/license" element={<LicenseActivation />} />
                {/* 유료회원 팀 워크스페이스 — 플랫폼 관리자(/user-management)와 완전 분리 */}
                <Route path="/workspace" element={<TeamWorkspace />} />
                {/* /commerce-search → /omni-channel 통합 (OmniChannel이 통합 검색 허브) */}
                <Route path="/commerce-search" element={<Navigate to="/omni-channel" replace />} />
                <Route path="/ai-marketing-hub" element={<AIMarketingHub />} />
                <Route path="/feedback" element={<FeedbackCenter />} />
                <Route path="/smart-connect" element={<Navigate to="/api-keys?tab=smart" replace />} />
                <Route path="/data-trust" element={<DataTrustDashboard />} />
                <Route path="/developer-hub" element={<DeveloperHub />} />
                <Route path="/demand-forecast" element={<DemandForecast />} />
                <Route path="/asia-logistics" element={<AsiaLogistics />} />
                <Route path="/returns-portal" element={<ReturnsPortal />} />
                <Route path="/supply-chain" element={<SupplyChain />} />
                <Route path="/supplier-portal" element={<SupplierPortal />} />
                <Route path="/my-coupons" element={<MyCoupons />} />
                <Route path="/rules-editor-v2" element={<RulesEditorV2 />} />
                <Route path="/ai-recommend" element={<AIRecommendTab />} />
                <Route path="/case-study" element={<CaseStudy />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
            </div>{/* inner scrollable content div */}
          </div>{/* outer flex-column div (DemoTopBar + content) */}
        </div>{/* right panel (Topbar + content area) */}
    </div>{/* .container */}
      <MobileBottomNav />
    </MobileSidebarProvider>
    </CurrencyProvider>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <GlobalDataProvider>
        <ConnectorSyncProvider>
          <Suspense fallback={<Loader />}>
            <Routes>
              {/* ── 공개 라우트 (인증 없이 접근 가능) ── */}
              <Route path="/" element={<Landing />} />
              <Route path="/pricing" element={<SmartPricing />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refund" element={<Refund />} />
              <Route path="/pg-test" element={<PgTest />} />
              {/* ── 인증 라우트 ──────────────────────── */}
              <Route path="/login" element={<AuthPage />} />
              <Route path="/*" element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              } />
            </Routes>
          </Suspense>
        </ConnectorSyncProvider>
      </GlobalDataProvider>
    </AuthProvider>
  );
}
