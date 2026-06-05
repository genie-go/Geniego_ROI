import React, { Suspense, lazy, Component } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import PlanGate from "./components/PlanGate.jsx"; // 181차 플랜별 메뉴접근 라우트 가드
import { pathToMenuKey, requiredPlanForMenu } from "./auth/planMenuPolicy.js";
import Sidebar from "./layout/Sidebar.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import Topbar from "./layout/Topbar.jsx";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AdminMfaGate from "./components/AdminMfaGate.jsx";
import { GlobalDataProvider } from "./context/GlobalDataContext.jsx";
import { CurrencyProvider } from "./contexts/CurrencyContext.jsx";
import { MobileSidebarProvider } from "./context/MobileSidebarContext.jsx";
import { ConnectorSyncProvider } from "./context/ConnectorSyncContext.jsx";
import { MenuVisibilityProvider } from "./context/MenuVisibilityContext.jsx";
import NetworkStatus from "./components/NetworkStatus.jsx";
import { ToastProvider } from "./components/ToastProvider.jsx";
import SessionExpiryWarning from "./components/SessionExpiryWarning.jsx";
import KeyboardShortcuts from "./components/KeyboardShortcuts.jsx";
import OnboardingTour from "./components/OnboardingTour.jsx";
import { initPerformanceMonitor } from "./utils/performanceMonitor.js";
import CommandPalette from "./components/CommandPalette.jsx";
import { initAuditTrail } from "./utils/auditTrail.js";
import { startVersionWatch, onNewVersion } from "./services/versionWatch.js"; // 196차 #1-B 배포 감지 자동 업데이트

// Initialize enterprise monitoring
if (typeof window !== 'undefined') {
  initPerformanceMonitor();
  initAuditTrail();
}

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Marketing = lazy(() => import("./pages/Marketing.jsx"));
const AccountPerformance = lazy(() => import("./pages/AccountPerformance.jsx"));
const Commerce = lazy(() => import("./pages/Commerce.jsx"));
const AmazonRisk = lazy(() => import("./pages/AmazonRisk.jsx"));
const DigitalShelf = lazy(() => import("./pages/DigitalShelf.jsx"));
const ReviewsUGC = lazy(() => import("./pages/ReviewsUGC.jsx"));
const Writeback = lazy(() => import("./pages/Writeback.jsx"));
const Approvals = lazy(() => import("./pages/Approvals.jsx"));
const Settlements = lazy(() => import("./pages/Settlements.jsx"));
const Reconciliation = lazy(() => import("./pages/Reconciliation.jsx"));
const Audit = lazy(() => import("./pages/Audit.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
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
const ApiKeys = lazy(() => import("./pages/ApiKeys.jsx"));
const DataProduct = lazy(() => import("./pages/DataProduct.jsx"));
const DbAdmin = lazy(() => import("./pages/DbAdmin.jsx"));
const RollupDashboard = lazy(() => import("./pages/RollupDashboard.jsx"));
const AdminMenuManager = lazy(() => import("./pages/AdminMenuManager.jsx"));
const UserMenuPreferences = lazy(() => import("./pages/UserMenuPreferences.jsx"));
const PlanPricing = lazy(() => import("./pages/PlanPricing.jsx"));
const PMOverview = lazy(() => import("./pages/PMOverview.jsx"));
const PMProjectDetail = lazy(() => import("./pages/PMProjectDetail.jsx"));
const PMTaskBoard = lazy(() => import("./pages/PMTaskBoard.jsx"));
const PMTaskDetail = lazy(() => import("./pages/PMTaskDetail.jsx"));
const PMGanttView = lazy(() => import("./pages/PMGanttView.jsx"));
const PMTaskTable = lazy(() => import("./pages/PMTaskTable.jsx"));
const PMMilestones = lazy(() => import("./pages/PMMilestones.jsx"));
const PMActivity = lazy(() => import("./pages/PMActivity.jsx"));
const PMSettings = lazy(() => import("./pages/PMSettings.jsx"));
const CampaignManager = lazy(() => import("./pages/CampaignManager.jsx"));
const ContentCalendar = lazy(() => import("./pages/ContentCalendar.jsx"));
const BudgetTracker = lazy(() => import("./pages/BudgetTracker.jsx"));
const SystemMonitor = lazy(() => import("./pages/SystemMonitor.jsx"));
const AIRuleEngine = lazy(() => import("./pages/AIRuleEngine.jsx"));
const OmniChannel = lazy(() => import("./pages/OmniChannel.jsx"));
const WmsManager = lazy(() => import("./pages/WmsManager.jsx"));
const UserManagement = lazy(() => import("./pages/UserManagement.jsx"));
const MenuAccessManager = lazy(() => import("./pages/MenuAccessManager.jsx"));
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
const JourneyBuilder = lazy(() => import("./pages/JourneyBuilder.jsx"));
const WebPopup = lazy(() => import("./pages/WebPopup.jsx"));
const WhatsApp = lazy(() => import("./pages/WhatsApp.jsx"));
const SmsMarketing = lazy(() => import("./pages/SmsMarketing.jsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.jsx"));
const InstagramDM = lazy(() => import("./pages/InstagramDM.jsx"));
const LicenseActivation = lazy(() => import("./pages/LicenseActivation.jsx"));
const TeamWorkspace = lazy(() => import('./pages/TeamWorkspace.jsx'));
const TeamMembers = lazy(() => import('./pages/TeamMembers.jsx')); // 180차 Phase2 멤버구성원
const FeedbackCenter = lazy(() => import('./pages/FeedbackCenter.jsx'));
// 175차 S4 — dead lazy imports 제거 (SmartConnect/AsiaLogistics 컴포넌트는 어디에도 렌더링되지 않음; Route는 Navigate redirect 만)
const DemandForecast = lazy(() => import('./pages/DemandForecast.jsx'));
const ReturnsPortal = lazy(() => import('./pages/ReturnsPortal.jsx'));
const SupplyChain = lazy(() => import('./pages/SupplyChain.jsx'));
const SupplierPortal = lazy(() => import('./pages/SupplierPortal.jsx'));
const MyCoupons = lazy(() => import('./pages/MyCoupons.jsx'));
const RulesEditorV2 = lazy(() => import('./pages/RulesEditorV2.jsx'));
const AIRecommendTab = lazy(() => import('./pages/AIRecommendTab.jsx'));
const CaseStudy = lazy(() => import('./pages/CaseStudy.jsx'));

const DataTrustDashboard = lazy(() => import('./pages/DataTrustDashboard.jsx'));
const PixelTracking = lazy(() => import('./pages/PixelTracking.jsx')); // 191차 복원: 190차 부활 백엔드 실배선
const DeveloperHub = lazy(() => import('./pages/DeveloperHub.jsx'));
import { GdprController } from "./components/GdprBanner.jsx";
import EventPopupDisplay from "./components/EventPopupDisplay.jsx";
import { useSecurityGuard, injectCSPMeta } from "./security/SecurityGuard.js";


/* Public Pages (no auth required) */
const Landing = lazy(() => import("./pages/public/Landing.jsx"));
const CompanyIntro = lazy(() => import("./pages/public/CompanyIntro.jsx"));
const TeamIntro = lazy(() => import("./pages/public/TeamIntro.jsx"));
const SiteIntroAdmin = lazy(() => import("./pages/SiteIntroAdmin.jsx"));
const PricingPublic = lazy(() => import("./pages/public/PricingPublic.jsx"));
const Terms = lazy(() => import("./pages/public/Terms.jsx"));
const Privacy = lazy(() => import("./pages/public/Privacy.jsx"));
const Refund = lazy(() => import("./pages/public/Refund.jsx"));
const PgTest = lazy(() => import("./pages/public/PgTest.jsx"));

const Loader = () => (
  <div style={{ display: "grid", gap: 14, padding: "4px 0", background: "var(--surface-1, #070f1a)", minHeight: "100%" }}>
    <div style={{ height: 88, borderRadius: 16, background: "rgba(99,102,241,0.06)", animation: "skeleton-pulse 1.4s ease-in-out infinite" }} />
    <div style={{ height: 48, borderRadius: 12, background: "rgba(99,102,241,0.04)", animation: "skeleton-pulse 1.4s ease-in-out infinite 0.1s" }} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ height: 80, borderRadius: 12, background: "rgba(99,102,241,0.05)", animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.07}s` }} />
      ))}
    </div>
    <div style={{ height: 200, borderRadius: 12, background: "rgba(99,102,241,0.04)", animation: "skeleton-pulse 1.4s ease-in-out infinite 0.3s" }} />
  </div>
);

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(err, info) {
    this.setState({ errorInfo: info });
    console.error('[ErrorBoundary]', err, info);

    // 196차: 배포 중 stale 청크/모듈 로드 실패는 "보안 위협"이 아니라 배포 산출물 → 보안 알림에
    //   기록하지 않고(거짓 위협경보 방지) 자동 새로고침으로 최신 번들 복구.
    const isChunkError = err?.name === 'ChunkLoadError'
      || /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|Unable to preload CSS|is not defined|ReferenceError/i.test(String(err?.message || err));
    if (isChunkError) {
      if (!sessionStorage.getItem('chunk_reloaded')) {
        sessionStorage.setItem('chunk_reloaded', '1');
        window.location.reload();
      } else {
        console.error('ChunkLoadError reload loop prevented.');
        sessionStorage.removeItem('chunk_reloaded');
      }
      return;
    }

    // 실제 런타임 오류만 보안 알림 시스템에 기록
    try {
      const alerts = JSON.parse(localStorage.getItem('g_sec_alerts') || '[]');
      alerts.unshift({
        id: `ERR-${Date.now().toString(36)}`,
        level: 'critical',
        message: `Runtime Error: ${err?.message?.slice(0, 200)}`,
        timestamp: new Date().toISOString(),
        read: false,
      });
      localStorage.setItem('g_sec_alerts', JSON.stringify(alerts.slice(0, 100)));
    } catch { }
  }
  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', gap: 20, padding: 40, background: 'var(--surface-1, #070f1a)'
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(248,113,113,0.1)', border: '2px solid rgba(248,113,113,0.2)'
          }}>
            <span style={{ fontSize: 36 }}>⚠️</span>
          </div>
          <div style={{ color: '#f87171', fontWeight: 800, fontSize: 18 }}>System Error Detected</div>
          <div style={{
            color: 'var(--text-3, #94a3b8)', fontSize: 12, maxWidth: 480, textAlign: 'center',
            padding: '12px 20px', borderRadius: 10, background: 'rgba(248,113,113,0.05)',
            border: '1px solid rgba(248,113,113,0.1)', fontFamily: 'monospace', wordBreak: 'break-all'
          }}>
            {error?.message || 'Unknown error'}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => { this.setState({ hasError: false, error: null, retryCount: retryCount + 1 }); }}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff',
                fontWeight: 700, cursor: 'pointer', fontSize: 13
              }}
            >🔄 Retry ({retryCount}/3)</button>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/dashboard'; }}
              style={{
                padding: '10px 24px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-2, #cbd5e1)', fontWeight: 700, cursor: 'pointer', fontSize: 13
              }}
            >🏠 Dashboard</button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-4, #475569)', marginTop: 8 }}>
            Error ID: ERR-{Date.now().toString(36)} · Geniego-ROI v407
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const FullLoader = () => (
  <div style={{
    position: "fixed", inset: 0, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "var(--surface-1, #070f1a)", zIndex: 9999, gap: 16,
  }}>
    <div style={{ width: 48, height: 48, border: "3px solid rgba(79,142,247,0.2)", borderTop: "3px solid #4f8ef7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600 }}>Geniego-ROI Loading...</div>
    <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
  </div>
);

function SmartPricing() {
  // 168차 N-152-F: USD 단일 + Paddle 카드 전용 정책 적용 (spec: n152f_billing_usd_card_only.md).
  // 인증/비인증 모두 PricingPublic (USD/Paddle) 으로 통일. /app-pricing 은 /pricing 으로 redirect.
  const { loading } = useAuth();
  if (loading) return <FullLoader />;
  return <PricingPublic />;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  // 193차 Sprint4: 관리자 MFA 의무화 — admin이 2단계 인증 미설정이면 enrollment 게이트로 차단.
  return <AdminMfaGate>{children}</AdminMfaGate>;
}

/*
 * 192차 로그아웃 버그 B 수정: "/" 는 공개 Landing(마케팅)이지만, 이미 로그인한
 * 사용자가 로고/홈으로 "/" 에 가면 로그아웃된 것처럼 보이는 착시가 있었다.
 * 로그인 세션이 살아있으면 대시보드로 리다이렉트하고, 비로그인 방문자에게만 Landing 노출.
 */
function HomeRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

/*
 * 181차 플랜별 메뉴접근 라우트 가드 — URL 직접 접근(딥링크) 차단.
 * 사이드바 숨김만으로는 우회 가능하던 허점을 보완: 현재 경로의 menuKey 를
 * hasMenuAccess 로 판정해, 권한 미달이면 PlanGate 업그레이드 화면을 표시한다.
 * (admin/enterprise/free 및 admin-only 정책은 hasMenuAccess 가 단일 출처)
 */
function MenuAccessGuard({ children }) {
  const { hasMenuAccess } = useAuth();
  const location = useLocation();
  const menuKey = pathToMenuKey(location.pathname);
  if (menuKey && typeof hasMenuAccess === "function" && !hasMenuAccess(menuKey)) {
    return <PlanGate minPlan={requiredPlanForMenu(menuKey)} />;
  }
  return children;
}

function AppLayout() {
  useSecurityGuard({ enabled: true });

  return (
    <CurrencyProvider>
      <MobileSidebarProvider>
        <div className="container" style={{ height: '100vh', overflow: 'hidden' }}>
          <OnboardingTour />
          <KeyboardShortcuts />
          <SessionExpiryWarning />
          <CommandPalette />
          <Sidebar />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            flex: 1,
            height: '100vh',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <Topbar />
            <GdprController />
            <EventPopupDisplay />

            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              WebkitOverflowScrolling: 'touch', // iOS 부드러운 스크롤
              scrollBehavior: 'smooth',
            }}>

              <div className="app-content-area" style={{
                flex: 1,
                padding: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)', // iOS Safe Area
              }}>
                <ErrorBoundary>
                  <Suspense fallback={<Loader />}>
                    <MenuAccessGuard>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/register" element={<Navigate to="/login?tab=register" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/marketing" element={<Marketing />} />
                      <Route path="/account-performance" element={<AccountPerformance />} />
                      <Route path="/commerce" element={<Commerce />} />
                      <Route path="/amazon-risk" element={<AmazonRisk />} />
                      <Route path="/digital-shelf" element={<DigitalShelf />} />
                      <Route path="/reviews-ugc" element={<ReviewsUGC />} />
                      <Route path="/influencer" element={<InfluencerUGC />} />
                      {/* 192차: ReportBuilder 미구현(가짜 셸) — Sprint4 실구현 전까지 대시보드로 리다이렉트 */}
                      <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/writeback" element={<Writeback />} />
                      <Route path="/approvals" element={<Approvals />} />
                      <Route path="/connectors" element={<Navigate to="/integration-hub" replace />} />
                      <Route path="/api-keys" element={<Navigate to="/integration-hub" replace />} />
                      <Route path="/settlements" element={<Settlements />} />
                      <Route path="/reconciliation" element={<Reconciliation />} />
                      <Route path="/audit" element={<Audit />} />
                      <Route path="/ai-policy" element={<Navigate to="/ai-rule-engine" replace />} />
                      <Route path="/action-presets" element={<Navigate to="/ai-rule-engine" replace />} />
                      <Route path="/mapping-registry" element={<Navigate to="/integration-hub" replace />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/admin/menu-tree" element={<AdminMenuManager />} />
                      <Route path="/admin/plan-pricing" element={<PlanPricing />} />
                      <Route path="/admin/site-intro" element={<SiteIntroAdmin />} />
                      <Route path="/me/menu" element={<UserMenuPreferences />} />
                      <Route path="/pm" element={<PMOverview />} />
                      <Route path="/pm/projects/:id" element={<PMProjectDetail />} />
                      <Route path="/pm/projects/:id/board" element={<PMTaskBoard />} />
                      <Route path="/pm/projects/:id/gantt" element={<PMGanttView />} />
                      <Route path="/pm/projects/:id/tasks" element={<PMTaskTable />} />
                      <Route path="/pm/projects/:id/milestones" element={<PMMilestones />} />
                      <Route path="/pm/projects/:id/activity" element={<PMActivity />} />
                      <Route path="/pm/projects/:id/settings" element={<PMSettings />} />
                      <Route path="/pm/tasks/:id" element={<PMTaskDetail />} />
                      <Route path="/alert-policies" element={<Navigate to="/alert-automation" replace />} />
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
                      {/* 193차 Sprint4: ReportBuilder 실구현 완료 → 리다이렉트 해제, 실제 페이지 복원 */}
                      <Route path="/report-builder" element={<ReportBuilder />} />
                      <Route path="/integration-hub" element={<ApiKeys />} />
                      <Route path="/alert-automation" element={<Navigate to="/ai-rule-engine" replace />} />
                      <Route path="/event-norm" element={<Navigate to="/data-schema" replace />} />
                      {/* 168차 N-152-F USD/Paddle 단일 정책 — /pricing 과 /app-pricing 모두 PricingPublic 으로 통일 */}
                      {/* 186차 버그수정: /app-pricing→/pricing redirect 시 최상위 공개 /pricing(SmartPricing, 앱 셸 밖)으로 튕겨 '초기화면 전환'처럼 보임. 앱 셸 안에서 직접 렌더. */}
                      <Route path="/pricing" element={<PricingPublic />} />
                      <Route path="/app-pricing" element={<PricingPublic />} />
                      <Route path="/data-product" element={<DataProduct />} />
                      <Route path="/db-admin" element={<DbAdmin />} />
                      <Route path="/rollup" element={<RollupDashboard />} />
                      <Route path="/ai-rule-engine" element={<AIRuleEngine />} />
                      <Route path="/campaign-manager" element={<CampaignManager />} />
                      <Route path="/marketing-intelligence" element={<Navigate to="/ai-insights" replace />} />
                      <Route path="/ai-budget-allocator" element={<Navigate to="/auto-marketing" replace />} />
                      <Route path="/omni-channel" element={<OmniChannel />} />
                      <Route path="/wms-manager" element={<WmsManager />} />
                      <Route path="/user-management" element={<UserManagement />} />
                      <Route path="/menu-access-manager" element={<MenuAccessManager />} />
                      <Route path="/content-calendar" element={<ContentCalendar />} />
                      <Route path="/budget-tracker" element={<BudgetTracker />} />
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
                      <Route path="/ai-prediction" element={<Navigate to="/ai-insights" replace />} />
                      <Route path="/web-popup" element={<WebPopup />} />
                      <Route path="/whatsapp" element={<WhatsApp />} />
                      <Route path="/sms-marketing" element={<SmsMarketing />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/instagram-dm" element={<InstagramDM />} />
                      <Route path="/license" element={<LicenseActivation />} />
                      <Route path="/workspace" element={<TeamWorkspace />} />
                      <Route path="/team-members" element={<TeamMembers />} />
                      <Route path="/commerce-search" element={<Navigate to="/omni-channel" replace />} />
                      <Route path="/ai-marketing-hub" element={<Navigate to="/auto-marketing" replace />} />
                      <Route path="/feedback" element={<FeedbackCenter />} />
                      {/* 191차: /api-keys?tab=smart 이중 리다이렉트가 ?tab=smart 를 드롭(api-keys→integration-hub)
                          + ApiKeys 에 'smart' 탭 부재(184차 SmartConnect 제거). → /integration-hub 직접 지정. */}
                      <Route path="/smart-connect" element={<Navigate to="/integration-hub" replace />} />
                      <Route path="/data-trust" element={<DataTrustDashboard />} />
                      <Route path="/developer-hub" element={<DeveloperHub />} />
                      <Route path="/demand-forecast" element={<DemandForecast />} />
                      <Route path="/asia-logistics" element={<Navigate to="/supply-chain" replace />} />
                      <Route path="/returns-portal" element={<ReturnsPortal />} />
                      <Route path="/supply-chain" element={<SupplyChain />} />
                      <Route path="/supplier-portal" element={<SupplierPortal />} />
                      <Route path="/my-coupons" element={<MyCoupons />} />
                      <Route path="/rules-editor-v2" element={<RulesEditorV2 />} />
                      <Route path="/ai-recommend" element={<AIRecommendTab />} />
                      <Route path="/case-study" element={<CaseStudy />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                    </MenuAccessGuard>
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </MobileSidebarProvider>
    </CurrencyProvider>
  );
}


/**
 * 180차 멀티테넌트 격리 — GlobalDataProvider 를 tenant 로 key.
 *   회원(계정) 전환 시 key 변경 → Provider 리마운트 → 이전 계정 인메모리 상태 완전 폐기(누출 차단).
 *   같은 계정의 팀/팀원(동일 tenant_id) → 동일 key → 상태·데이터 공유(동일 회원 인식).
 *   다른 계정(같은 플랜이라도 tenant_id 상이) → 다른 key → 완전 격리.
 */
function TenantScopedProviders({ children }) {
  const { user } = useAuth();
  const tenantKey = (user && (user.tenant_id || user.tenantId || user.company || (user.id != null ? 'u' + user.id : ''))) || 'anon';
  return (
    <GlobalDataProvider key={tenantKey}>
      <MenuVisibilityProvider>
        <ConnectorSyncProvider>
          {children}
        </ConnectorSyncProvider>
      </MenuVisibilityProvider>
    </GlobalDataProvider>
  );
}

/* 196차 #1-B — 배포 감지 자동 업데이트 배너.
 * 새 배포 감지 시: 다음 라우트 전환 때 자동 reload(작업 중단 최소화) + 즉시 새로고침 버튼.
 * 사용자가 수동 새로고침 없이도 최신 변경(기능/수정)을 받게 한다. */
function VersionUpdateBanner() {
  const location = useLocation();
  const [show, setShow] = React.useState(false);
  const pending = React.useRef(false);
  const lastPath = React.useRef(location.pathname);
  const timerRef = React.useRef(null);
  // 196차: 사용자가 수동 새로고침하지 않아도 최신 변경이 자동 반영되도록 — 새 버전 감지 시
  //   ①다음 화면 이동에 즉시 reload ②이동이 없어도 약간의 유예(6초) 후 자동 reload.
  //   입력(input/textarea/select) 포커스 중이면 작업 보호를 위해 잠시 미루고 재시도.
  const doReload = React.useCallback(() => {
    const el = document.activeElement;
    const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    if (typing) { timerRef.current = setTimeout(doReload, 4000); return; } // 입력 중이면 4초 뒤 재시도
    window.location.reload();
  }, []);
  React.useEffect(() => {
    startVersionWatch();
    const off = onNewVersion(() => {
      pending.current = true; setShow(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(doReload, 6000); // 자동 적용(새로고침 불요)
    });
    return () => { off && off(); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [doReload]);
  React.useEffect(() => {
    if (pending.current && location.pathname !== lastPath.current) {
      window.location.reload(); // 화면 이동 시 즉시 최신 반영
    }
    lastPath.current = location.pathname;
  }, [location.pathname]);
  if (!show) return null;
  return (
    <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 22, zIndex: 99999,
      display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderRadius: 14,
      background: "rgba(15,23,42,0.94)", color: "#fff", boxShadow: "0 16px 48px rgba(15,23,42,0.4)",
      border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", fontSize: 13, fontWeight: 600 }}>
      <span>✨ 최신 버전으로 자동 업데이트 중…</span>
      <button onClick={() => window.location.reload()}
        style={{ padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontWeight: 800, fontSize: 12.5 }}>
        지금 적용
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <TenantScopedProviders>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/about" element={<CompanyIntro />} />
                <Route path="/team" element={<TeamIntro />} />
                <Route path="/pricing" element={<SmartPricing />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/refund" element={<Refund />} />
                <Route path="/pg-test" element={<PgTest />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/*" element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                } />
              </Routes>
            </Suspense>
            <NetworkStatus />
            <VersionUpdateBanner />
        </TenantScopedProviders>
      </ToastProvider>
    </AuthProvider>
  );
}
