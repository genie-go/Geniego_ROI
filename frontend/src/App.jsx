import React, { Suspense, lazy, Component } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useT } from "./i18n/index.js";
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
import { ProductSelectionProvider } from "./contexts/ProductSelectionContext.jsx";
import { MenuVisibilityProvider } from "./context/MenuVisibilityContext.jsx";
import NetworkStatus from "./components/NetworkStatus.jsx";
import InstallPrompt from "./components/InstallPrompt.jsx";
import { ToastProvider } from "./components/ToastProvider.jsx";
import SessionExpiryWarning from "./components/SessionExpiryWarning.jsx";
import ImpersonationBanner from "./components/ImpersonationBanner.jsx"; // 회원세션(관리자 대행 열람) 배너
import AgencyActingBanner from "./components/AgencyActingBanner.jsx"; // [272차] 대행사 전기능 운영 배너
import KeyboardShortcuts from "./components/KeyboardShortcuts.jsx";
import OnboardingTour from "./components/OnboardingTour.jsx";
import OnboardingGuide from "./components/OnboardingGuide.jsx";
import GenieAssistant from "./components/GenieAssistant.jsx"; // [현 차수] 무엇이든 물어보세요 상담 챗봇
import GuideArrival from "./components/GuideArrival.jsx"; // [237차] 바로가기 도착 스포트라이트(동작 영역 안내)
import { initPerformanceMonitor } from "./utils/performanceMonitor.js";
import CommandPalette from "./components/CommandPalette.jsx";
import { initAuditTrail } from "./utils/auditTrail.js";
import { startVersionWatch, onNewVersion } from "./services/versionWatch.js"; // 196차 #1-B 배포 감지 자동 업데이트
import { safeReload, forceReload, isDirty } from "./services/unsavedGuard.js"; // [현 차수] 자동 새로고침으로 인한 입력 소실 차단

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
const PaymentMethods = lazy(() => import("./pages/PaymentMethods.jsx"));
const Reconciliation = lazy(() => import("./pages/Reconciliation.jsx"));
const Audit = lazy(() => import("./pages/Audit.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const Attribution = lazy(() => import("./pages/Attribution.jsx"));
const MarketingMix = lazy(() => import("./pages/MarketingMix.jsx"));
const GraphScore = lazy(() => import("./pages/GraphScore.jsx"));
const KrChannel = lazy(() => import("./pages/KrChannel.jsx"));
const PriceOpt = lazy(() => import("./pages/PriceOpt.jsx"));
const CatalogSync = lazy(() => import("./pages/CatalogSync.jsx"));
const LiveCommerce = lazy(() => import("./pages/LiveCommerce.jsx"));
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
const SubAdminManager = lazy(() => import("./pages/SubAdminManager.jsx"));
const AgencyManager = lazy(() => import("./pages/AgencyManager.jsx")); // [272차] 대행사 계정 발급(최고관리자)
const PMOverview = lazy(() => import("./pages/PMOverview.jsx"));
const PMProjectDetail = lazy(() => import("./pages/PMProjectDetail.jsx"));
const PMTaskBoard = lazy(() => import("./pages/PMTaskBoard.jsx"));
const PMTaskDetail = lazy(() => import("./pages/PMTaskDetail.jsx"));
const PMGanttView = lazy(() => import("./pages/PMGanttView.jsx"));
const PMTaskTable = lazy(() => import("./pages/PMTaskTable.jsx"));
const PMMilestones = lazy(() => import("./pages/PMMilestones.jsx"));
const PMActivity = lazy(() => import("./pages/PMActivity.jsx"));
const PMSettings = lazy(() => import("./pages/PMSettings.jsx"));
const PMPortfolio = lazy(() => import("./pages/PMPortfolio.jsx")); // 231차 PM 초엔터프라이즈
const CollaborationHome = lazy(() => import("./pages/CollaborationHome.jsx")); // CWIS Part001 협업 기반
const CollabAccept = lazy(() => import("./pages/CollabAccept.jsx")); // CWIS Part002 초대 수락(public·무세션)
const PMResources = lazy(() => import("./pages/PMResources.jsx"));
const PMRaid = lazy(() => import("./pages/PMRaid.jsx"));
const PMEvm = lazy(() => import("./pages/PMEvm.jsx"));
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
const OnsiteCro = lazy(() => import("./pages/OnsiteCro.jsx"));
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
const AgencyConsole = lazy(() => import('./pages/AgencyConsole.jsx')); // [272차] 대행사 멀티클라이언트 콘솔(공개·별도 agt_ 로그인)
const AgencyAccess = lazy(() => import('./pages/AgencyAccess.jsx'));   // [272차] 클라이언트 대행사 접근 승인 게이트(인증)
const MyCoupons = lazy(() => import('./pages/MyCoupons.jsx'));
const RulesEditorV2 = lazy(() => import('./pages/RulesEditorV2.jsx'));
const AIRecommendTab = lazy(() => import('./pages/AIRecommendTab.jsx'));
const CaseStudy = lazy(() => import('./pages/CaseStudy.jsx'));

const DataTrustDashboard = lazy(() => import('./pages/DataTrustDashboard.jsx'));
const DataAssets = lazy(() => import('./pages/DataAssets.jsx')); // [272차] 통합 데이터 플랫폼 1단계 — 데이터 자산/소스 레지스트리
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
const LegalDocsAdmin = lazy(() => import("./pages/LegalDocsAdmin.jsx"));
const AdminGrowthCenter = lazy(() => import("./pages/AdminGrowthCenter.jsx"));
const AccessReview = lazy(() => import("./pages/AccessReview.jsx")); // [EPIC 06-A Part3-8] 접근 검토(휴면/만료 api_key)
const PricingPublic = lazy(() => import("./pages/public/PricingPublic.jsx"));
const PartnerPortal = lazy(() => import("./pages/PartnerPortal.jsx"));
const Terms = lazy(() => import("./pages/public/Terms.jsx"));
const Privacy = lazy(() => import("./pages/public/Privacy.jsx"));
const Refund = lazy(() => import("./pages/public/Refund.jsx"));
const PgTest = lazy(() => import("./pages/public/PgTest.jsx"));
const LiveGuest = lazy(() => import("./pages/public/LiveGuest.jsx")); // [현 차수] 게스트 송출 참여(공개)

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
    // [현 차수] ★판정 범위 축소 + 미저장 가드.
    //   기존 정규식은 `is not defined` / `ReferenceError` / `Invalid hook call` 까지 청크 오류로 간주해,
    //   실은 무관한 일반 런타임 오류(서드파티 스크립트 포함) 하나만 나도 페이지를 통째로 새로고침했다.
    //   → 입력 중이던 폼이 소실되는 주요 경로였다. 진짜 "청크/모듈 로드 실패"만 자동복구 대상으로 남긴다.
    //   미저장 입력이 있으면 새로고침하지 않고 아래 복구 UI 를 보여준다(사용자가 저장 후 직접 적용).
    const isChunkError = err?.name === 'ChunkLoadError'
      || /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|Unable to preload CSS/i.test(String(err?.message || err));
    if (isChunkError) {
      if (!sessionStorage.getItem('chunk_reloaded')) {
        sessionStorage.setItem('chunk_reloaded', '1');
        if (safeReload('ErrorBoundary: chunk load failure')) return;
        // 미저장 입력이 있어 보류됨 — 새로고침 대신 복구 UI 를 띄운다(입력값 보존, 보안알림 기록 안 함).
        sessionStorage.removeItem('chunk_reloaded');
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
    } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
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
  const { user, token, loading } = useAuth();
  // [현 차수] ★콜드로드 리다이렉트 레이스 차단: 토큰은 유효(restorableToken 통과)한데 user 객체가 아직
  //   부트스트랩(/auth/me 페치) 중이면, 조기에 /login 으로 튕겨 요청 경로(예 /auto-marketing)를 잃고
  //   LoginRoute 가 다시 /dashboard 로 보내는 체인이 발생했다. user 가 채워질 때까지 잠깐 대기 → 요청 경로
  //   그대로 렌더. 6초 안전 타임아웃 후에도 미로드면 /login(무한로더 방지). ★admin 비영속 보안정책은 불변
  //   (그 경우 restorableToken 이 null→token 도 null 이라 아래 대기에 안 걸리고 정상 /login).
  const [bootWaited, setBootWaited] = React.useState(false);
  React.useEffect(() => {
    if (token && !user) { const t = setTimeout(() => setBootWaited(true), 6000); return () => clearTimeout(t); }
    setBootWaited(false);
  }, [token, user]);
  if (loading) return <FullLoader />;
  if (token && !user && !bootWaited) return <FullLoader />;
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
 * [현 차수] 로그아웃 착시 수정(뒤로가기 연속 시 로그아웃 현상): "/login" 은 그동안 인증 여부와
 * 무관하게 AuthPage(로그인 폼)를 무조건 렌더했다. 이미 로그인한 사용자가 뒤로가기로 /login 에
 * 도달하면 로그인 폼이 떠 "로그아웃된 것처럼" 보였다(192차 HomeRoute 가 "/" 만 처리하고 "/login"
 * 은 누락). HomeRoute 와 동일하게 인증 사용자는 대시보드로 리다이렉트한다.
 * 단, 비밀번호 재설정 링크(?reset=)·자동로그아웃 안내(?reason=idle)는 폼 노출이 필요하므로 예외.
 */
function LoginRoute() {
  const { user } = useAuth();
  let q = null;
  try { q = new URLSearchParams(window.location.search); } catch { q = null; }
  // [245차 P2-3] 엔터프라이즈 SSO 콜백 핸드오프 — IdP(OIDC/SAML) 인증 후 ?sso_token= 으로 세션 수립.
  const ssoTok = q && q.get('sso_token');
  if (ssoTok) {
    try {
      const isDemoHost = typeof window !== 'undefined' && (/^roidemo\./.test(window.location.hostname) || window.location.hostname === 'demo.genieroi.com');
      localStorage.setItem(isDemoHost ? 'demo_genie_token' : 'genie_token', ssoTok);
      localStorage.setItem('genie_token', ssoTok);
    } catch (e) { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
    window.location.replace('/dashboard');
    return null;
  }
  const needsForm = q && (q.get('reset') || q.get('reason') === 'idle');
  if (user && !needsForm) return <Navigate to="/dashboard" replace />;
  return <AuthPage />;
}

/*
 * 181차 플랜별 메뉴접근 라우트 가드 — URL 직접 접근(딥링크) 차단.
 * 사이드바 숨김만으로는 우회 가능하던 허점을 보완: 현재 경로의 menuKey 를
 * hasMenuAccess 로 판정해, 권한 미달이면 PlanGate 업그레이드 화면을 표시한다.
 * (admin/enterprise/free 및 admin-only 정책은 hasMenuAccess 가 단일 출처)
 */
// [현 차수] 구독플랜 변경/업그레이드 경로는 어떤 플랜이든 항상 접근 가능해야 함(차단 시 플랜 변경 불가).
const ALWAYS_ACCESSIBLE_PATHS = new Set(["/app-pricing", "/pricing"]);
function MenuAccessGuard({ children }) {
  const { hasMenuAccess, isSubAdmin, subMenuAllowed, user } = useAuth();
  const location = useLocation();
  if (ALWAYS_ACCESSIBLE_PATHS.has(location.pathname)) return children; // 요금제 보기/변경은 전 플랜 허용
  // [현 차수] 하위 관리자: 부여받지 않은 경로 직접 접근(URL 우회) 차단 → 첫 허용 메뉴로 이동.
  if (isSubAdmin && typeof subMenuAllowed === "function" && !subMenuAllowed(location.pathname)) {
    const menus = Array.isArray(user?.admin_menus) ? user.admin_menus : [];
    return <Navigate to={menus[0] || "/dashboard"} replace />;
  }
  const menuKey = pathToMenuKey(location.pathname);
  if (menuKey && typeof hasMenuAccess === "function" && !hasMenuAccess(menuKey)) {
    return <PlanGate minPlan={requiredPlanForMenu(menuKey)} />;
  }
  return children;
}

/*
 * [현 차수] /admin/* 라우트 클라이언트 인증·권한 가드.
 * 동기: 미인증/세션 토큰 소실 상태로 /admin/growth 등 진입 시 페이지가 렌더되어
 *   API 가 raw 401({code:AUTH_REQUIRED}) JSON 을 노출하던 UX 갭(백엔드 requirePlan('admin') 정상 보호).
 *   RequireAuth 는 user 만 검사하므로, 로그아웃/idle 레이스로 token 만 소실된 순간을 못 막는다.
 * 정책:
 *   - token 없음 → /login (재인증). raw 401 노출 차단.
 *   - 일반(비관리자) 로그인 사용자 → /dashboard. raw 403 노출 차단.
 *   - 하위 관리자(isSubAdmin)는 통과 — 경로별 접근은 MenuAccessGuard(subMenuAllowed)가 이미 통제(회귀 방지).
 */
function AdminRouteGuard({ children }) {
  const { user, token, isSubAdmin } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  const isAdmin = user.plan === "admin" || user.plans === "admin";
  if (!isAdmin && !isSubAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppLayout() {
  useSecurityGuard({ enabled: true });

  // [현 차수] recharts(약 326KB 별도 청크) 유휴 프리페치 — 차트 페이지 진입 전 미리 warm하여
  //   온디맨드 다운로드+파싱 워터폴을 제거(그래프가 늦게 뜨는 주원인). 동적 import·순수 프리페치라
  //   171차 init-order race(정적 그룹화 문제)와 무관. 인증 셸에서만 1회 유휴 실행.
  React.useEffect(() => {
    const warm = () => { import('recharts').catch(() => {}); };
    const ric = typeof window !== 'undefined' && window.requestIdleCallback;
    const id = ric ? window.requestIdleCallback(warm, { timeout: 3000 }) : setTimeout(warm, 1200);
    return () => { try { (window.cancelIdleCallback || window.clearTimeout)(id); } catch { /* noop */ } };
  }, []);

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
            <ImpersonationBanner />
            <AgencyActingBanner />
            <PlatformActAsBanner />
            <ProductOverageModal />
            <GdprController />
            <EventPopupDisplay />

            <div className="app-scroll-wrap" style={{
              flex: 1,
              minWidth: 0, // ★모바일 우측 잘림 근본수정: flex-col flex item 이 콘텐츠 min-content(예: OnboardingGuide
                           //   카드)로 커져 메인컬럼(390)을 넘어 잘리던 문제. min-width:0 으로 390 에 맞추면 내부가 wrap.
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              WebkitOverflowScrolling: 'touch', // iOS 부드러운 스크롤
              scrollBehavior: 'smooth',
            }}>

              {/* [현 차수] 구독회원 단계별 진행 안내 — ★app-content-area 밖(스크롤 래퍼 직속)에 배치.
                  .app-content-area>div{flex:1} 규칙에 걸리면 배너가 페이지와 높이를 반씩 나눠 늘어나는
                  레이아웃 회귀(전 페이지 박스 높이 불균형)가 발생하므로 바깥에 두어 자연 높이 유지. */}
              <OnboardingGuide />
              <GuideArrival />
              <GenieAssistant />{/* [현 차수] 전역 상담 챗봇(로고 런처) */}

              <div className="app-content-area" style={{
                flex: 1,
                padding: 0,
                minHeight: 0,
                minWidth: 0, // [238차] flex item 가로 축소 강제 — 자식(grid/표)이 콘텐츠 min-content로 팽창해 우측 잘리던 갭 차단
                maxWidth: '100%',
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
                      <Route path="/payment-methods" element={<PaymentMethods />} />
                      <Route path="/audit" element={<Audit />} />
                      <Route path="/ai-policy" element={<Navigate to="/ai-rule-engine" replace />} />
                      <Route path="/action-presets" element={<Navigate to="/ai-rule-engine" replace />} />
                      <Route path="/mapping-registry" element={<Navigate to="/integration-hub" replace />} />
                      <Route path="/admin" element={<AdminRouteGuard><Admin /></AdminRouteGuard>} />
                      <Route path="/admin/menu-tree" element={<AdminRouteGuard><AdminMenuManager /></AdminRouteGuard>} />
                      <Route path="/admin/plan-pricing" element={<AdminRouteGuard><PlanPricing /></AdminRouteGuard>} />
                      <Route path="/admin/sub-admins" element={<AdminRouteGuard><SubAdminManager /></AdminRouteGuard>} />
                      <Route path="/admin/agencies" element={<AdminRouteGuard><AgencyManager /></AdminRouteGuard>} />{/* [272차] 대행사 계정 발급(최고관리자) */}
                      <Route path="/admin/site-intro" element={<AdminRouteGuard><SiteIntroAdmin /></AdminRouteGuard>} />
                      <Route path="/admin/legal-docs" element={<AdminRouteGuard><LegalDocsAdmin /></AdminRouteGuard>} />
                      <Route path="/admin/growth" element={<AdminRouteGuard><AdminGrowthCenter /></AdminRouteGuard>} />
                      <Route path="/admin/access-review" element={<AdminRouteGuard><AccessReview /></AdminRouteGuard>} />{/* [EPIC 06-A Part3-8] 접근 검토 — 휴면/만료 api_key 검토·회수(admin·세션) */}
                      <Route path="/me/menu" element={<UserMenuPreferences />} />
                      <Route path="/pm" element={<PMOverview />} />
                      <Route path="/pm/portfolio" element={<PMPortfolio />} />
                      <Route path="/pm/resources" element={<PMResources />} />
                      <Route path="/pm/collaboration" element={<CollaborationHome />} />
                      <Route path="/pm/projects/:id" element={<PMProjectDetail />} />
                      <Route path="/pm/projects/:id/raid" element={<PMRaid />} />
                      <Route path="/pm/projects/:id/evm" element={<PMEvm />} />
                      <Route path="/pm/projects/:id/board" element={<PMTaskBoard />} />
                      <Route path="/pm/projects/:id/gantt" element={<PMGanttView />} />
                      <Route path="/pm/projects/:id/tasks" element={<PMTaskTable />} />
                      <Route path="/pm/projects/:id/milestones" element={<PMMilestones />} />
                      <Route path="/pm/projects/:id/activity" element={<PMActivity />} />
                      <Route path="/pm/projects/:id/settings" element={<PMSettings />} />
                      <Route path="/pm/tasks/:id" element={<PMTaskDetail />} />
                      <Route path="/alert-policies" element={<Navigate to="/ai-rule-engine" replace />} />
                      <Route path="/attribution" element={<Attribution />} />
                      <Route path="/marketing-mix" element={<MarketingMix />} />
                      <Route path="/graph-score" element={<GraphScore />} />
                      <Route path="/kr-channel" element={<KrChannel />} />
                      <Route path="/price-opt" element={<PriceOpt />} />
                      <Route path="/catalog-sync" element={<CatalogSync />} />
                      <Route path="/live-commerce" element={<LiveCommerce />} />
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
                      {/* 212차 #1: 광고매체 연동 중복 통합 — ad-channels 를 integration-hub 로 일원화(자동sync 흡수). */}
                      <Route path="/ad-channels" element={<Navigate to="/integration-hub" replace />} />
                      <Route path="/alert-automation" element={<Navigate to="/ai-rule-engine" replace />} />
                      <Route path="/event-norm" element={<Navigate to="/data-schema" replace />} />
                      {/* 168차 N-152-F USD/Paddle 단일 정책 — /pricing 과 /app-pricing 모두 PricingPublic 으로 통일 */}
                      {/* 186차 버그수정: /app-pricing→/pricing redirect 시 최상위 공개 /pricing(SmartPricing, 앱 셸 밖)으로 튕겨 '초기화면 전환'처럼 보임. 앱 셸 안에서 직접 렌더. */}
                      <Route path="/pricing" element={<PricingPublic />} />
                      <Route path="/app-pricing" element={<PricingPublic />} />
                      <Route path="/data-product" element={<DataProduct />} />
                      <Route path="/db-admin" element={<AdminRouteGuard><DbAdmin /></AdminRouteGuard>} />{/* [286차 보안] admin 전용 DB 콘솔 — 미가드 노출 봉쇄(/menu-access-manager 와 동일 게이트) */}
                      <Route path="/rollup" element={<RollupDashboard />} />
                      <Route path="/ai-rule-engine" element={<AIRuleEngine />} />
                      <Route path="/campaign-manager" element={<CampaignManager />} />
                      <Route path="/marketing-intelligence" element={<Navigate to="/ai-insights" replace />} />
                      <Route path="/ai-budget-allocator" element={<Navigate to="/auto-marketing" replace />} />
                      <Route path="/omni-channel" element={<OmniChannel />} />
                      <Route path="/wms-manager" element={<WmsManager />} />
                      <Route path="/user-management" element={<AdminRouteGuard><UserManagement /></AdminRouteGuard>} />{/* [286차 보안] 플랫폼 사용자관리(migrate·security-audit) admin 전용 — 구독자 팀관리는 /admin/sub-admins 별도 */}
                      {/* [276차 보안] admin 전용 페이지이나 sidebarManifest 미등재 → pathToMenuKey=null →
                          MenuAccessGuard 통과 갭. 일반 로그인 사용자가 UI 렌더 가능(백엔드 /v424/admin/* 는 차단)
                          이던 노출을 AdminRouteGuard(=/admin/* 와 동일 클라 게이트)로 봉쇄. */}
                      <Route path="/menu-access-manager" element={<AdminRouteGuard><MenuAccessManager /></AdminRouteGuard>} />
                      <Route path="/content-calendar" element={<ContentCalendar />} />
                      <Route path="/budget-tracker" element={<BudgetTracker />} />
                      <Route path="/system-monitor" element={<AdminRouteGuard><SystemMonitor /></AdminRouteGuard>} />{/* [286차 보안] 시스템 모니터 admin 전용 */}
                      <Route path="/operations-guide" element={<Navigate to="/operations" replace />} />
                      <Route path="/auto-marketing" element={<AutoMarketing />} />
                      <Route path="/help" element={<HelpCenter />} />
                      <Route path="/channel-kpi" element={<ChannelKPI />} />
                      <Route path="/payment/success" element={<PaymentSuccess />} />
                      <Route path="/payment/fail" element={<PaymentFail />} />
                      <Route path="/pg-config" element={<AdminRouteGuard><PgConfig /></AdminRouteGuard>} />{/* [286차 보안] 결제 게이트웨이 관리자 콘솔(/v424/admin/paddle) admin 전용 */}
                      <Route path="/crm" element={<CRM />} />
                      <Route path="/email-marketing" element={<EmailMarketing />} />
                      <Route path="/onsite-cro" element={<OnsiteCro />} />
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
                      <Route path="/data-assets" element={<DataAssets />} />{/* [272차] 데이터 자산/소스 레지스트리 */}
                      <Route path="/developer-hub" element={<DeveloperHub />} />
                      <Route path="/demand-forecast" element={<DemandForecast />} />
                      <Route path="/asia-logistics" element={<Navigate to="/supply-chain" replace />} />
                      <Route path="/returns-portal" element={<ReturnsPortal />} />
                      <Route path="/supply-chain" element={<SupplyChain />} />
                      <Route path="/supplier-portal" element={<SupplierPortal />} />
                      <Route path="/my-coupons" element={<MyCoupons />} />
                      <Route path="/agency-access" element={<AgencyAccess />} />{/* [272차] 클라이언트 대행사 접근 승인 */}
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
          <ProductSelectionProvider>
            {children}
          </ProductSelectionProvider>
        </ConnectorSyncProvider>
      </MenuVisibilityProvider>
    </GlobalDataProvider>
  );
}

/* 196차 #1-B — 배포 감지 업데이트 배너.
 * [현 차수] ★자동 새로고침 폐지. 새 배포를 감지해 "알리는" 역할만 하고,
 *   실제 새로고침 시점은 사용자가 "지금 적용" 을 눌러 결정한다.
 *
 *   폐지 이유(실제 데이터 유실 사고): 기존 구현은 새 버전 감지 시 ①6초 뒤 무조건 reload
 *   ②라우트 전환 시 가드 없이 즉시 reload 했다. 유일한 보호막인 "입력 중이면 4초 미룸"은
 *   document.activeElement 가 INPUT/TEXTAREA/SELECT 일 때만 동작해서, 사용자가 타이핑을
 *   잠시 멈추거나·버튼을 누르거나·이미지 업로드/모달을 여는 순간 포커스가 body/button 으로
 *   빠지며 그대로 reload → 상품등록처럼 긴 폼의 입력값이 통째로 소실됐다.
 *   (배포는 하루에도 여러 번 나가므로 세션 중 감지가 드물지 않다.)
 *
 *   기능 후퇴는 없다: 새 버전 감지·안내는 그대로이고, 적용은 클릭 1회로 즉시 된다.
 *   미저장 입력이 있으면 배너 문구가 "저장 후 적용하세요"로 바뀌어 소실 위험을 먼저 알린다. */
function VersionUpdateBanner() {
  const t = useT();
  const [show, setShow] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  React.useEffect(() => {
    startVersionWatch();
    const off = onNewVersion(() => { setShow(true); setDirty(isDirty()); });
    return () => { off && off(); };
  }, []);
  // 배너가 떠 있는 동안 미저장 상태를 추적해 안내 문구를 정확히 유지.
  React.useEffect(() => {
    if (!show) return;
    const id = setInterval(() => setDirty(isDirty()), 1000);
    return () => clearInterval(id);
  }, [show]);
  if (!show) return null;
  return (
    <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 22, zIndex: 99999,
      display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderRadius: 14,
      background: "rgba(15,23,42,0.94)", color: "#fff", boxShadow: "0 16px 48px rgba(15,23,42,0.4)",
      border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", fontSize: 13, fontWeight: 600 }}>
      <span>
        ✨ {t('common.versionReady', '새 버전이 준비됐습니다')}
        {dirty && <span style={{ color: "#fbbf24", fontWeight: 700, marginLeft: 6 }}>
          · {t('common.versionSaveFirst', '작성 중인 내용을 저장한 뒤 적용하세요')}
        </span>}
      </span>
      <button onClick={() => forceReload()}
        style={{ padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontWeight: 800, fontSize: 12.5 }}>
        {t('common.versionApplyNow', '지금 적용')}
      </button>
      <button onClick={() => setShow(false)} aria-label="dismiss"
        style={{ padding: "7px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
          background: "transparent", color: "#cbd5e1", fontWeight: 700, fontSize: 12.5 }}>
        {t('common.later', '나중에')}
      </button>
    </div>
  );
}

/* [251차] 플랫폼 성장 컨텍스트 배너 — admin 이 'platform_growth' act-as 를 켜면 전 페이지 상단에 표시.
   기존 모든 메뉴(크리에이티브/자동화/어트리뷰션 등)가 GeniegoROI 플랫폼 자체 데이터로 동작 중임을 명확히 인지(안전). */
function PlatformActAsBanner() {
  const t = useT();
  const [on, setOn] = React.useState(() => { try { return localStorage.getItem('gg_act_as_tenant') === 'platform_growth'; } catch (e) { return false; } });
  React.useEffect(() => {
    const h = () => { try { setOn(localStorage.getItem('gg_act_as_tenant') === 'platform_growth'); } catch (e) { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ } };
    window.addEventListener('storage', h);
    window.addEventListener('gg-actas-change', h);
    return () => { window.removeEventListener('storage', h); window.removeEventListener('gg-actas-change', h); };
  }, []);
  if (!on) return null;
  const off = () => { try { localStorage.removeItem('gg_act_as_tenant'); } catch (e) { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ } window.dispatchEvent(new Event('gg-actas-change')); setOn(false); };
  return (
    // [259차] 가독성 수정 — 흰바탕/흰글자 → 밝은 배경 + 찐한 회색 글자(테마 무관 고대비)
    <div style={{ background: '#ede9fe', color: '#374151', borderBottom: '1px solid #c4b5fd', padding: '7px 16px', fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
      <span style={{ color: '#374151' }}>{t('platformActAs.banner', '🚀 플랫폼 성장 컨텍스트(platform_growth) — 지금 보는 모든 메뉴는 GeniegoROI 플랫폼 자체 데이터입니다')}</span>
      <button onClick={off} style={{ background: '#7c3aed', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 12px', fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>{t('platformActAs.off', '끄기(내 계정으로)')}</button>
    </div>
  );
}

/* [251차] 전역 상품/광고디자인 등록 한도 초과 모달 — apiClient 가 402(product/ad_design_limit_reached) 시 발생시키는
   'gg-product-overage' 이벤트를 수신해 표시. 추가팩 즉시 구매(월정기·상품·디자인 공통) 또는 거부 선택. 모든 등록 경로 공통. */
function ProductOverageModal() {
  const [data, setData] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  React.useEffect(() => {
    const h = (e) => { setData(e.detail || null); setMsg(''); };
    window.addEventListener('gg-product-overage', h);
    return () => window.removeEventListener('gg-product-overage', h);
  }, []);
  if (!data) return null;
  const close = () => setData(null);
  const buy = async (size) => {
    setBusy(true); setMsg('');
    try {
      const tok = localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || localStorage.getItem('accessToken') || '';
      const r = await fetch('/api/v424/plan/product-addon/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ pack_size: size }) });
      const j = await r.json();
      if (j.ok) { setMsg(`✅ +${size}건 추가 완료 — 다시 등록을 진행하세요.`); setTimeout(() => setData(null), 1800); }
      else if (j.error === 'billing_required') setMsg('⚠️ ' + (j.message || '결제수단을 먼저 등록하세요(재무·정산 > 결제수단).'));
      else setMsg('⚠️ ' + (j.message || '구매에 실패했습니다.'));
    } catch (e) { setMsg('⚠️ 네트워크 오류로 구매하지 못했습니다.'); } finally { setBusy(false); }
  };
  const packs = Array.isArray(data.packs) ? data.packs : [];
  const isDesign = data.error === 'ad_design_limit_reached';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 470, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: 'Apple SD Gothic Neo,Malgun Gothic,sans-serif' }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{isDesign ? '🎨 광고디자인 저장 한도 도달' : '📦 상품등록 한도 도달'}</div>
        <div style={{ fontSize: 13, color: '#475569', margin: '8px 0 6px', lineHeight: 1.6 }}>{data.message || '기본 제공 한도를 모두 사용했습니다.'}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>현재 {data.current ?? '—'} / 한도 {data.limit ?? '—'}건 · 추가팩 구매 시 즉시 계속 등록(월 정기 · 상품·디자인 한도 함께 확장).</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
          {packs.map(p => (
            <button key={p.size} disabled={busy} onClick={() => buy(p.size)} style={{ padding: '10px 8px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: busy ? 'default' : 'pointer', textAlign: 'center', opacity: busy ? 0.6 : 1 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>+{Number(p.size).toLocaleString()}건</div>
              <div style={{ fontSize: 12, color: '#4f8ef7', fontWeight: 700 }}>${p.price_usd}/월</div>
            </button>
          ))}
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: msg.startsWith('✅') ? '#16a34a' : '#d97706' }}>{msg}</div>}
        <div style={{ marginTop: 16 }}>
          <button onClick={close} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>추가하지 않음 (거부)</button>
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 8 }}>※ 추가팩은 월 정기 결제이며 언제든 해지할 수 있습니다(거부 시 신규 등록만 제한, 기존 데이터는 유지).</div>
      </div>
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
                {/* [281차 P2] PG/웹훅 테스트 하네스는 개발 전용 — 운영 빌드에선 라우트 미노출(비로그인 프로브 표면 제거).
                    개발(vite dev)에서만 접근. 운영에선 SPA 폴백(대시보드/404)로 처리된다. */}
                {import.meta.env.DEV && <Route path="/pg-test" element={<PgTest />} />}
                <Route path="/login" element={<LoginRoute />} />
                {/* 212차 #3-B: 파트너(매입처/물류처/창고처) 전용 포털 — 본사 인증과 분리된 독립 페이지 */}
                <Route path="/partner" element={<PartnerPortal />} />
                {/* [272차] 대행사(Agency) 멀티클라이언트 콘솔 — 본사 인증과 분리된 독립 페이지(agt_ 세션) */}
                <Route path="/agency" element={<AgencyConsole />} />
                {/* [현 차수] 라이브 게스트/코호스트 송출 참여(초대 토큰, 계정 불요) */}
                <Route path="/live-guest" element={<LiveGuest />} />
                {/* [CWIS Part002] 초대 수락 — 계정 불요(토큰 검증·public) */}
                <Route path="/collab/accept" element={<CollabAccept />} />
                <Route path="/*" element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                } />
              </Routes>
            </Suspense>
            <NetworkStatus />
            <VersionUpdateBanner />
            <InstallPrompt />
        </TenantScopedProviders>
      </ToastProvider>
    </AuthProvider>
  );
}
