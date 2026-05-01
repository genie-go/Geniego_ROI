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
import NetworkStatus from "./components/NetworkStatus.jsx";
import { ToastProvider } from "./components/ToastProvider.jsx";
import SessionExpiryWarning from "./components/SessionExpiryWarning.jsx";
import KeyboardShortcuts from "./components/KeyboardShortcuts.jsx";
import OnboardingTour from "./components/OnboardingTour.jsx";
import { initPerformanceMonitor } from "./utils/performanceMonitor.js";
import CommandPalette from "./components/CommandPalette.jsx";
import { initAuditTrail } from "./utils/auditTrail.js";

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
const IntegrationHub = lazy(() => import("./pages/IntegrationHub.jsx"));
const AlertAutomation = lazy(() => import("./pages/AlertAutomation.jsx"));
const EventNorm = lazy(() => import("./pages/EventNorm.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const ApiKeys = lazy(() => import("./pages/ApiKeys.jsx"));
const DataProduct = lazy(() => import("./pages/DataProduct.jsx"));
const DbAdmin = lazy(() => import("./pages/DbAdmin.jsx"));
const RollupDashboard = lazy(() => import("./pages/RollupDashboard.jsx"));
const CampaignManager = lazy(() => import("./pages/CampaignManager.jsx"));
const ContentCalendar = lazy(() => import("./pages/ContentCalendar.jsx"));
const BudgetPlanner = lazy(() => import("./pages/BudgetPlanner.jsx"));
const BudgetTracker = lazy(() => import("./pages/BudgetTracker.jsx"));
const SystemMonitor = lazy(() => import("./pages/SystemMonitor.jsx"));
const OperationsGuide = lazy(() => import("./pages/OperationsGuide.jsx"));
const AIRuleEngine = lazy(() => import("./pages/AIRuleEngine.jsx"));
const MarketingIntelligence = lazy(() => import("./pages/MarketingIntelligence.jsx"));
const AIBudgetAllocator = lazy(() => import("./pages/AIBudgetAllocator.jsx"));
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
const SmartConnect = lazy(() => import('./pages/SmartConnect.jsx'));
const DemandForecast = lazy(() => import('./pages/DemandForecast.jsx'));
const AsiaLogistics = lazy(() => import('./pages/AsiaLogistics.jsx'));
const ReturnsPortal = lazy(() => import('./pages/ReturnsPortal.jsx'));
const SupplyChain = lazy(() => import('./pages/SupplyChain.jsx'));
const SupplierPortal = lazy(() => import('./pages/SupplierPortal.jsx'));
const MyCoupons = lazy(() => import('./pages/MyCoupons.jsx'));
const RulesEditorV2 = lazy(() => import('./pages/RulesEditorV2.jsx'));
const AIRecommendTab = lazy(() => import('./pages/AIRecommendTab.jsx'));
const CaseStudy = lazy(() => import('./pages/CaseStudy.jsx'));

const DataTrustDashboard = lazy(() => import('./pages/DataTrustDashboard.jsx'));
const DeveloperHub = lazy(() => import('./pages/DeveloperHub.jsx'));
import { GdprController } from "./components/GdprBanner.jsx";
import EventPopupDisplay from "./components/EventPopupDisplay.jsx";
import { useSecurityGuard, injectCSPMeta } from "./security/SecurityGuard.js";

import ko from './i18n/locales/ko.js';
const t = (k) => k.split('.').reduce((o, i) => o?.[i], { auto: ko?.auto }) || k;


/* Public Pages (no auth required) */
const Landing = lazy(() => import("./pages/public/Landing.jsx"));
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

    // Report to security alert system
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

    const isChunkError = err.name === 'ChunkLoadError' || String(err).includes('Failed to fetch dynamically imported module');
    if (isChunkError) {
      if (!sessionStorage.getItem('chunk_reloaded')) {
        sessionStorage.setItem('chunk_reloaded', '1');
        window.location.reload();
      } else {
        console.error('ChunkLoadError reload loop prevented.');
        sessionStorage.removeItem('chunk_reloaded');
      }
    }
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
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (user) return <Navigate to="/app-pricing" replace />;
  return <PricingPublic />;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
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
                      <Route path="/reports" element={<Navigate to="/report-builder" replace />} />
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
                      <Route path="/report-builder" element={<ReportBuilder />} />
                      <Route path="/integration-hub" element={<ApiKeys />} />
                      <Route path="/alert-automation" element={<Navigate to="/ai-rule-engine" replace />} />
                      <Route path="/event-norm" element={<Navigate to="/data-schema" replace />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/app-pricing" element={<Pricing />} />
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
                      <Route path="/pixel-tracking" element={<Navigate to="/data-trust" replace />} />
                      <Route path="/journey-builder" element={<JourneyBuilder />} />
                      <Route path="/ai-prediction" element={<Navigate to="/ai-insights" replace />} />
                      <Route path="/web-popup" element={<WebPopup />} />
                      <Route path="/whatsapp" element={<WhatsApp />} />
                      <Route path="/sms-marketing" element={<SmsMarketing />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/instagram-dm" element={<InstagramDM />} />
                      <Route path="/license" element={<LicenseActivation />} />
                      <Route path="/workspace" element={<TeamWorkspace />} />
                      <Route path="/commerce-search" element={<Navigate to="/omni-channel" replace />} />
                      <Route path="/ai-marketing-hub" element={<Navigate to="/auto-marketing" replace />} />
                      <Route path="/feedback" element={<FeedbackCenter />} />
                      <Route path="/smart-connect" element={<Navigate to="/api-keys?tab=smart" replace />} />
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


export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <GlobalDataProvider>
          <ConnectorSyncProvider>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
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
          </ConnectorSyncProvider>
        </GlobalDataProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
