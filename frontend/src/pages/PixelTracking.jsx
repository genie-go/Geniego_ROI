// PixelTracking.jsx — 191차 복원·실배선(clean rewrite).
//   184차에 고아 dead-code 로 삭제됐던 페이지를, 190차 부활 백엔드(/api/pixel/*)에 맞춰 깨끗이 재작성.
//   백업본(pages_backup/PixelTracking.jsx)은 JSX 손상으로 컴파일 불가 → 동일 3탭을 well-formed 로 복원.
//   ★i18n: pxl 네임스페이스가 페이지 삭제 시 purge 됨 → t('pxl.x','한글초안') 인라인폴백(추후 15개국 정식화).
//   운영=실 /api/pixel/*(세션토큰+requirePro+테넌트격리), 데모=세션 미달 시 honest 빈 상태(가짜데이터 없음).
import React, { useState, useEffect, useCallback } from "react";
import { useT, useI18n } from "../i18n/index.js";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate";
import { IS_DEMO } from "../utils/demoEnv";

// 데모: 픽셀 수집은 실 사이트 스니펫 설치 의존이라 운영백엔드 비도달.
// 체험자가 실 운영처럼 대시보드/설정을 볼 수 있도록 표준 합성 시드 제공(수집형 기능 특성상 독립 시드).
const _DEMO_PIXEL_FUNNEL = { page_view: 18420, view_content: 9180, add_to_cart: 3120, initiate_checkout: 1840, purchase: 612 };
const _DEMO_PIXEL_ANALYTICS = {
  ok: true,
  funnel: _DEMO_PIXEL_FUNNEL,
  events: [
    { event_name: "page_view", total: 18420, total_value: 0 },
    { event_name: "view_content", total: 9180, total_value: 0 },
    { event_name: "add_to_cart", total: 3120, total_value: 0 },
    { event_name: "initiate_checkout", total: 1840, total_value: 0 },
    { event_name: "purchase", total: 612, total_value: 48960000 },
  ],
  forwarding: { total_events: 33172, meta_forwarded: 31840, tiktok_forwarded: 29210 },
  channels: [
    { source: "meta", medium: "cpc", sessions: 6240, conversions: 248, revenue: 19840000 },
    { source: "google", medium: "cpc", sessions: 4180, conversions: 162, revenue: 12960000 },
    { source: "naver", medium: "organic", sessions: 3120, conversions: 94, revenue: 7520000 },
    { source: "tiktok", medium: "cpc", sessions: 2410, conversions: 71, revenue: 5680000 },
    { source: "direct", medium: "none", sessions: 1840, conversions: 37, revenue: 2960000 },
  ],
};
const _DEMO_PIXEL_CONFIGS = [
  { id: "px_demo1", name: "메인 쇼핑몰 픽셀", domain: "shop.demo-brand.com", meta_pixel_id: "1029384756", tiktok_pixel_id: "C9A1B2C3D4", created_at: "2026-05-18 09:30" },
];

/* 인증 API 헬퍼: /api 접두(상대 /pixel 은 nginx SPA 폴백) + Bearer 세션토큰 */
function makeAPI(token) {
  return (path, opts = {}) => {
    if (/[<>'"\\]/.test(path)) return Promise.resolve({ ok: false, error: "Blocked" });
    if (IS_DEMO) {
      const m = (opts.method || "GET").toUpperCase();
      if (m === "GET") {
        if (path.startsWith("/pixel/analytics")) return Promise.resolve(_DEMO_PIXEL_ANALYTICS);
        if (path.startsWith("/pixel/configs")) return Promise.resolve({ ok: true, configs: _DEMO_PIXEL_CONFIGS });
        if (path.startsWith("/pixel/snippet")) return Promise.resolve({ ok: true, snippet: `<!-- GenieGo Pixel (demo) -->\n<script>(function(){window.gg=window.gg||function(){(gg.q=gg.q||[]).push(arguments)};gg('init','px_demo1');gg('track','PageView');})();</script>` });
      }
      return Promise.resolve({ ok: true, demo: true });
    }
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`/api${path}`, { ...opts, headers }).then(r => r.json()).catch(() => ({ ok: false }));
  };
}

const C = {
  surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
  border: "var(--border)", accent: "#4f8ef7", green: "#22c55e", red: "#f87171",
  yellow: "#fbbf24", purple: "#a78bfa", muted: "var(--text-3)", text: "var(--text-1)",
};
const CARD = { background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 };
const INPUT = { width: "100%", padding: "9px 13px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: "border-box", fontSize: 13, outline: "none" };

/* pxl 네임스페이스 한글 폴백(purge 됨). t('pxl.key') 호출 시 키 부재면 이 값으로 렌더. */
const PXL_FB = {"ko":{"heroTitle":"1st-Party 픽셀 트래킹","heroDesc":"쿠키리스 시대의 서버사이드 전환 추적 (Meta CAPI · TikTok Events API)","tabDashboard":"대시보드","tabSettings":"픽셀 설정","tabEvents":"이벤트 스트림","loading":"분석 데이터를 불러오는 중…","days":"일","noDataTitle":"아직 수집된 데이터가 없습니다","noDataDesc":"'픽셀 설정' 탭에서 픽셀을 생성하고 스니펫을 사이트에 설치하면 이벤트가 수집됩니다.","totalEvents":"총 이벤트","purchases":"구매","totalRevenue":"총 매출","convRate":"전환율","metaForward":"Meta 전송","tiktokForward":"TikTok 전송","serverSideCAPI":"서버사이드 CAPI","serverSideEvent":"서버사이드 이벤트","funnelTitle":"전환 퍼널","funnelVisit":"방문","funnelProduct":"상품 조회","funnelCart":"장바구니","funnelCheckout":"결제 시작","funnelPurchase":"구매 완료","channelAttr":"채널 기여 분석","noChannelData":"채널 데이터가 없습니다","source":"소스","medium":"매체","sessions":"세션","conversions":"전환","revenue":"매출","createPixel":"새 픽셀 생성","pixelName":"픽셀 이름","pixelNamePh":"예: 메인 쇼핑몰 픽셀","domain":"도메인","metaCAPIToken":"Meta CAPI 토큰","nameRequired":"픽셀 이름을 입력하세요","secInputBlocked":"입력이 차단되었습니다","createSuccess":"픽셀이 생성되었습니다.","createError":"생성 실패","creating":"생성 중…","createPixelBtn":"픽셀 생성","pixelList":"픽셀 목록","noPixels":"등록된 픽셀이 없습니다","snippet":"스니펫","delete":"삭제","deleteConfirm":"이 픽셀을 삭제할까요? 수집이 중단됩니다.","snippetTitle":"설치 스니펫","copy":"복사","copied":"복사됨","snippetGuide1":"이 코드를 사이트의 ","snippetGuide2":" 태그 안에 붙여넣으세요.","snippetGuide3":"설치 후 페이지뷰·구매 이벤트가 자동 수집되며 Meta/TikTok 으로 서버사이드 전송됩니다.","testEventSend":"테스트 이벤트 전송","eventType":"이벤트 유형","amount":"금액","sending":"전송 중…","sendEvent":"이벤트 전송","realtimeStream":"실시간 이벤트 스트림","noEvents":"전송된 이벤트가 없습니다. 위에서 테스트 이벤트를 보내보세요."},"en":{"heroTitle":"1st-Party Pixel Tracking","heroDesc":"Server-side conversion tracking for the cookieless era (Meta CAPI · TikTok Events API)","tabDashboard":"Dashboard","tabSettings":"Pixel Settings","tabEvents":"Event Stream","loading":"Loading analytics data…","days":"days","noDataTitle":"No data collected yet","noDataDesc":"Create a pixel in the 'Pixel Settings' tab and install the snippet on your site to start collecting events.","totalEvents":"Total Events","purchases":"Purchases","totalRevenue":"Total Revenue","convRate":"Conversion Rate","metaForward":"Sent to Meta","tiktokForward":"Sent to TikTok","serverSideCAPI":"Server-side CAPI","serverSideEvent":"Server-side Event","funnelTitle":"Conversion Funnel","funnelVisit":"Visit","funnelProduct":"Product View","funnelCart":"Add to Cart","funnelCheckout":"Checkout Started","funnelPurchase":"Purchase Completed","channelAttr":"Channel Attribution","noChannelData":"No channel data","source":"Source","medium":"Medium","sessions":"Sessions","conversions":"Conversions","revenue":"Revenue","createPixel":"Create New Pixel","pixelName":"Pixel Name","pixelNamePh":"e.g. Main Store Pixel","domain":"Domain","metaCAPIToken":"Meta CAPI Token","nameRequired":"Please enter a pixel name","secInputBlocked":"Input was blocked","createSuccess":"Pixel created successfully.","createError":"Creation failed","creating":"Creating…","createPixelBtn":"Create Pixel","pixelList":"Pixel List","noPixels":"No pixels registered","snippet":"Snippet","delete":"Delete","deleteConfirm":"Delete this pixel? Collection will stop.","snippetTitle":"Installation Snippet","copy":"Copy","copied":"Copied","snippetGuide1":"Paste this code into your site's ","snippetGuide2":" tag.","snippetGuide3":"After installation, pageview and purchase events are collected automatically and sent server-side to Meta/TikTok.","testEventSend":"Send Test Event","eventType":"Event Type","amount":"Amount","sending":"Sending…","sendEvent":"Send Event","realtimeStream":"Real-time Event Stream","noEvents":"No events sent. Try sending a test event above."},"ja":{"heroTitle":"1st-Party ピクセルトラッキング","heroDesc":"クッキーレス時代のサーバーサイドコンバージョン計測 (Meta CAPI · TikTok Events API)","tabDashboard":"ダッシュボード","tabSettings":"ピクセル設定","tabEvents":"イベントストリーム","loading":"分析データを読み込み中…","days":"日","noDataTitle":"まだ収集されたデータがありません","noDataDesc":"「ピクセル設定」タブでピクセルを作成し、スニペットをサイトに設置するとイベントが収集されます。","totalEvents":"総イベント","purchases":"購入","totalRevenue":"総売上","convRate":"コンバージョン率","metaForward":"Meta 送信","tiktokForward":"TikTok 送信","serverSideCAPI":"サーバーサイド CAPI","serverSideEvent":"サーバーサイドイベント","funnelTitle":"コンバージョンファネル","funnelVisit":"訪問","funnelProduct":"商品閲覧","funnelCart":"カート追加","funnelCheckout":"決済開始","funnelPurchase":"購入完了","channelAttr":"チャネル貢献度分析","noChannelData":"チャネルデータがありません","source":"ソース","medium":"メディア","sessions":"セッション","conversions":"コンバージョン","revenue":"売上","createPixel":"新規ピクセル作成","pixelName":"ピクセル名","pixelNamePh":"例: メインショップピクセル","domain":"ドメイン","metaCAPIToken":"Meta CAPI トークン","nameRequired":"ピクセル名を入力してください","secInputBlocked":"入力がブロックされました","createSuccess":"ピクセルが作成されました。","createError":"作成に失敗しました","creating":"作成中…","createPixelBtn":"ピクセル作成","pixelList":"ピクセル一覧","noPixels":"登録されたピクセルがありません","snippet":"スニペット","delete":"削除","deleteConfirm":"このピクセルを削除しますか？収集が停止されます。","snippetTitle":"設置スニペット","copy":"コピー","copied":"コピー済み","snippetGuide1":"このコードをサイトの ","snippetGuide2":" タグ内に貼り付けてください。","snippetGuide3":"設置後、ページビュー・購入イベントが自動収集され、Meta/TikTok へサーバーサイド送信されます。","testEventSend":"テストイベント送信","eventType":"イベントタイプ","amount":"金額","sending":"送信中…","sendEvent":"イベント送信","realtimeStream":"リアルタイムイベントストリーム","noEvents":"送信されたイベントがありません。上からテストイベントを送信してみてください。"},"zh":{"heroTitle":"1st-Party 像素追踪","heroDesc":"无 Cookie 时代的服务器端转化追踪 (Meta CAPI · TikTok Events API)","tabDashboard":"仪表盘","tabSettings":"像素设置","tabEvents":"事件流","loading":"正在加载分析数据…","days":"天","noDataTitle":"尚未采集到数据","noDataDesc":"在「像素设置」选项卡中创建像素并将代码片段安装到网站后即可采集事件。","totalEvents":"总事件","purchases":"购买","totalRevenue":"总营收","convRate":"转化率","metaForward":"发送至 Meta","tiktokForward":"发送至 TikTok","serverSideCAPI":"服务器端 CAPI","serverSideEvent":"服务器端事件","funnelTitle":"转化漏斗","funnelVisit":"访问","funnelProduct":"商品浏览","funnelCart":"加入购物车","funnelCheckout":"开始结算","funnelPurchase":"购买完成","channelAttr":"渠道归因分析","noChannelData":"暂无渠道数据","source":"来源","medium":"媒介","sessions":"会话","conversions":"转化","revenue":"营收","createPixel":"创建新像素","pixelName":"像素名称","pixelNamePh":"例如：主商城像素","domain":"域名","metaCAPIToken":"Meta CAPI 令牌","nameRequired":"请输入像素名称","secInputBlocked":"输入已被拦截","createSuccess":"像素已创建。","createError":"创建失败","creating":"创建中…","createPixelBtn":"创建像素","pixelList":"像素列表","noPixels":"没有已注册的像素","snippet":"代码片段","delete":"删除","deleteConfirm":"要删除此像素吗？采集将停止。","snippetTitle":"安装代码片段","copy":"复制","copied":"已复制","snippetGuide1":"请将此代码粘贴到网站的 ","snippetGuide2":" 标签内。","snippetGuide3":"安装后，页面浏览和购买事件将自动采集，并以服务器端方式发送至 Meta/TikTok。","testEventSend":"发送测试事件","eventType":"事件类型","amount":"金额","sending":"发送中…","sendEvent":"发送事件","realtimeStream":"实时事件流","noEvents":"暂无已发送的事件。请在上方发送测试事件。"},"zh-TW":{"heroTitle":"1st-Party 像素追蹤","heroDesc":"無 Cookie 時代的伺服器端轉換追蹤 (Meta CAPI · TikTok Events API)","tabDashboard":"儀表板","tabSettings":"像素設定","tabEvents":"事件串流","loading":"正在載入分析資料…","days":"天","noDataTitle":"尚未收集到資料","noDataDesc":"在「像素設定」分頁中建立像素並將程式碼片段安裝至網站後即可收集事件。","totalEvents":"總事件","purchases":"購買","totalRevenue":"總營收","convRate":"轉換率","metaForward":"傳送至 Meta","tiktokForward":"傳送至 TikTok","serverSideCAPI":"伺服器端 CAPI","serverSideEvent":"伺服器端事件","funnelTitle":"轉換漏斗","funnelVisit":"造訪","funnelProduct":"商品瀏覽","funnelCart":"加入購物車","funnelCheckout":"開始結帳","funnelPurchase":"購買完成","channelAttr":"通路貢獻分析","noChannelData":"沒有通路資料","source":"來源","medium":"媒介","sessions":"工作階段","conversions":"轉換","revenue":"營收","createPixel":"建立新像素","pixelName":"像素名稱","pixelNamePh":"例如：主商城像素","domain":"網域","metaCAPIToken":"Meta CAPI 權杖","nameRequired":"請輸入像素名稱","secInputBlocked":"輸入已遭封鎖","createSuccess":"像素已建立。","createError":"建立失敗","creating":"建立中…","createPixelBtn":"建立像素","pixelList":"像素清單","noPixels":"沒有已註冊的像素","snippet":"程式碼片段","delete":"刪除","deleteConfirm":"要刪除此像素嗎？收集將停止。","snippetTitle":"安裝程式碼片段","copy":"複製","copied":"已複製","snippetGuide1":"請將此程式碼貼到網站的 ","snippetGuide2":" 標籤內。","snippetGuide3":"安裝後，頁面瀏覽與購買事件將自動收集，並以伺服器端方式傳送至 Meta/TikTok。","testEventSend":"傳送測試事件","eventType":"事件類型","amount":"金額","sending":"傳送中…","sendEvent":"傳送事件","realtimeStream":"即時事件串流","noEvents":"沒有已傳送的事件。請於上方傳送測試事件。"},"de":{"heroTitle":"1st-Party Pixel-Tracking","heroDesc":"Serverseitiges Conversion-Tracking für das cookielose Zeitalter (Meta CAPI · TikTok Events API)","tabDashboard":"Dashboard","tabSettings":"Pixel-Einstellungen","tabEvents":"Event-Stream","loading":"Analysedaten werden geladen…","days":"Tage","noDataTitle":"Noch keine Daten erfasst","noDataDesc":"Erstellen Sie im Tab „Pixel-Einstellungen“ einen Pixel und installieren Sie das Snippet auf Ihrer Website, um Events zu erfassen.","totalEvents":"Events gesamt","purchases":"Käufe","totalRevenue":"Gesamtumsatz","convRate":"Conversion-Rate","metaForward":"An Meta gesendet","tiktokForward":"An TikTok gesendet","serverSideCAPI":"Serverseitige CAPI","serverSideEvent":"Serverseitiges Event","funnelTitle":"Conversion-Funnel","funnelVisit":"Besuch","funnelProduct":"Produktansicht","funnelCart":"In den Warenkorb","funnelCheckout":"Checkout gestartet","funnelPurchase":"Kauf abgeschlossen","channelAttr":"Kanal-Attribution","noChannelData":"Keine Kanaldaten","source":"Quelle","medium":"Medium","sessions":"Sitzungen","conversions":"Conversions","revenue":"Umsatz","createPixel":"Neuen Pixel erstellen","pixelName":"Pixel-Name","pixelNamePh":"z. B. Haupt-Shop-Pixel","domain":"Domain","metaCAPIToken":"Meta CAPI-Token","nameRequired":"Bitte geben Sie einen Pixel-Namen ein","secInputBlocked":"Eingabe wurde blockiert","createSuccess":"Pixel wurde erstellt.","createError":"Erstellung fehlgeschlagen","creating":"Wird erstellt…","createPixelBtn":"Pixel erstellen","pixelList":"Pixel-Liste","noPixels":"Keine Pixel registriert","snippet":"Snippet","delete":"Löschen","deleteConfirm":"Diesen Pixel löschen? Die Erfassung wird gestoppt.","snippetTitle":"Installations-Snippet","copy":"Kopieren","copied":"Kopiert","snippetGuide1":"Fügen Sie diesen Code in das ","snippetGuide2":"-Tag Ihrer Website ein.","snippetGuide3":"Nach der Installation werden Seitenaufrufe und Kauf-Events automatisch erfasst und serverseitig an Meta/TikTok gesendet.","testEventSend":"Test-Event senden","eventType":"Event-Typ","amount":"Betrag","sending":"Wird gesendet…","sendEvent":"Event senden","realtimeStream":"Echtzeit-Event-Stream","noEvents":"Keine Events gesendet. Senden Sie oben ein Test-Event."},"th":{"heroTitle":"การติดตามพิกเซลแบบ 1st-Party","heroDesc":"การติดตามคอนเวอร์ชันฝั่งเซิร์ฟเวอร์สำหรับยุคไร้คุกกี้ (Meta CAPI · TikTok Events API)","tabDashboard":"แดชบอร์ด","tabSettings":"ตั้งค่าพิกเซล","tabEvents":"สตรีมอีเวนต์","loading":"กำลังโหลดข้อมูลวิเคราะห์…","days":"วัน","noDataTitle":"ยังไม่มีข้อมูลที่เก็บรวบรวม","noDataDesc":"สร้างพิกเซลในแท็บ 'ตั้งค่าพิกเซล' แล้วติดตั้งสนิปเป็ตบนเว็บไซต์ของคุณเพื่อเริ่มเก็บอีเวนต์","totalEvents":"อีเวนต์ทั้งหมด","purchases":"การซื้อ","totalRevenue":"รายได้รวม","convRate":"อัตราคอนเวอร์ชัน","metaForward":"ส่งไปยัง Meta","tiktokForward":"ส่งไปยัง TikTok","serverSideCAPI":"CAPI ฝั่งเซิร์ฟเวอร์","serverSideEvent":"อีเวนต์ฝั่งเซิร์ฟเวอร์","funnelTitle":"ฟันเนลคอนเวอร์ชัน","funnelVisit":"การเข้าชม","funnelProduct":"ดูสินค้า","funnelCart":"เพิ่มลงตะกร้า","funnelCheckout":"เริ่มชำระเงิน","funnelPurchase":"ซื้อสำเร็จ","channelAttr":"การวิเคราะห์การมีส่วนร่วมของช่องทาง","noChannelData":"ไม่มีข้อมูลช่องทาง","source":"แหล่งที่มา","medium":"สื่อ","sessions":"เซสชัน","conversions":"คอนเวอร์ชัน","revenue":"รายได้","createPixel":"สร้างพิกเซลใหม่","pixelName":"ชื่อพิกเซล","pixelNamePh":"เช่น พิกเซลร้านค้าหลัก","domain":"โดเมน","metaCAPIToken":"โทเค็น Meta CAPI","nameRequired":"กรุณากรอกชื่อพิกเซล","secInputBlocked":"การป้อนข้อมูลถูกบล็อก","createSuccess":"สร้างพิกเซลแล้ว","createError":"สร้างไม่สำเร็จ","creating":"กำลังสร้าง…","createPixelBtn":"สร้างพิกเซล","pixelList":"รายการพิกเซล","noPixels":"ไม่มีพิกเซลที่ลงทะเบียน","snippet":"สนิปเป็ต","delete":"ลบ","deleteConfirm":"ลบพิกเซลนี้หรือไม่? การเก็บข้อมูลจะหยุดลง","snippetTitle":"สนิปเป็ตการติดตั้ง","copy":"คัดลอก","copied":"คัดลอกแล้ว","snippetGuide1":"วางโค้ดนี้ภายในแท็ก ","snippetGuide2":" ของเว็บไซต์ของคุณ","snippetGuide3":"หลังการติดตั้ง อีเวนต์การดูหน้าและการซื้อจะถูกเก็บโดยอัตโนมัติและส่งแบบฝั่งเซิร์ฟเวอร์ไปยัง Meta/TikTok","testEventSend":"ส่งอีเวนต์ทดสอบ","eventType":"ประเภทอีเวนต์","amount":"จำนวนเงิน","sending":"กำลังส่ง…","sendEvent":"ส่งอีเวนต์","realtimeStream":"สตรีมอีเวนต์แบบเรียลไทม์","noEvents":"ยังไม่มีอีเวนต์ที่ส่ง ลองส่งอีเวนต์ทดสอบด้านบน"},"vi":{"heroTitle":"Theo dõi Pixel 1st-Party","heroDesc":"Theo dõi chuyển đổi phía máy chủ cho kỷ nguyên không cookie (Meta CAPI · TikTok Events API)","tabDashboard":"Bảng điều khiển","tabSettings":"Cài đặt Pixel","tabEvents":"Luồng sự kiện","loading":"Đang tải dữ liệu phân tích…","days":"ngày","noDataTitle":"Chưa có dữ liệu được thu thập","noDataDesc":"Tạo pixel trong tab 'Cài đặt Pixel' và cài đặt đoạn mã lên trang web của bạn để bắt đầu thu thập sự kiện.","totalEvents":"Tổng sự kiện","purchases":"Mua hàng","totalRevenue":"Tổng doanh thu","convRate":"Tỷ lệ chuyển đổi","metaForward":"Gửi đến Meta","tiktokForward":"Gửi đến TikTok","serverSideCAPI":"CAPI phía máy chủ","serverSideEvent":"Sự kiện phía máy chủ","funnelTitle":"Phễu chuyển đổi","funnelVisit":"Truy cập","funnelProduct":"Xem sản phẩm","funnelCart":"Thêm vào giỏ","funnelCheckout":"Bắt đầu thanh toán","funnelPurchase":"Hoàn tất mua hàng","channelAttr":"Phân tích đóng góp kênh","noChannelData":"Không có dữ liệu kênh","source":"Nguồn","medium":"Phương tiện","sessions":"Phiên","conversions":"Chuyển đổi","revenue":"Doanh thu","createPixel":"Tạo Pixel mới","pixelName":"Tên Pixel","pixelNamePh":"ví dụ: Pixel cửa hàng chính","domain":"Tên miền","metaCAPIToken":"Token Meta CAPI","nameRequired":"Vui lòng nhập tên pixel","secInputBlocked":"Đầu vào đã bị chặn","createSuccess":"Đã tạo pixel.","createError":"Tạo thất bại","creating":"Đang tạo…","createPixelBtn":"Tạo Pixel","pixelList":"Danh sách Pixel","noPixels":"Chưa có pixel nào được đăng ký","snippet":"Đoạn mã","delete":"Xóa","deleteConfirm":"Xóa pixel này? Việc thu thập sẽ dừng lại.","snippetTitle":"Đoạn mã cài đặt","copy":"Sao chép","copied":"Đã sao chép","snippetGuide1":"Dán mã này vào ","snippetGuide2":" của trang web của bạn.","snippetGuide3":"Sau khi cài đặt, các sự kiện xem trang và mua hàng được thu thập tự động và gửi phía máy chủ đến Meta/TikTok.","testEventSend":"Gửi sự kiện thử nghiệm","eventType":"Loại sự kiện","amount":"Số tiền","sending":"Đang gửi…","sendEvent":"Gửi sự kiện","realtimeStream":"Luồng sự kiện thời gian thực","noEvents":"Chưa có sự kiện nào được gửi. Hãy thử gửi một sự kiện thử nghiệm ở trên."},"id":{"heroTitle":"Pelacakan Pixel 1st-Party","heroDesc":"Pelacakan konversi sisi server untuk era tanpa cookie (Meta CAPI · TikTok Events API)","tabDashboard":"Dasbor","tabSettings":"Pengaturan Pixel","tabEvents":"Aliran Event","loading":"Memuat data analitik…","days":"hari","noDataTitle":"Belum ada data yang dikumpulkan","noDataDesc":"Buat pixel di tab 'Pengaturan Pixel' dan pasang cuplikan di situs Anda untuk mulai mengumpulkan event.","totalEvents":"Total Event","purchases":"Pembelian","totalRevenue":"Total Pendapatan","convRate":"Tingkat Konversi","metaForward":"Dikirim ke Meta","tiktokForward":"Dikirim ke TikTok","serverSideCAPI":"CAPI sisi server","serverSideEvent":"Event sisi server","funnelTitle":"Funnel Konversi","funnelVisit":"Kunjungan","funnelProduct":"Lihat Produk","funnelCart":"Tambah ke Keranjang","funnelCheckout":"Checkout Dimulai","funnelPurchase":"Pembelian Selesai","channelAttr":"Analisis Atribusi Saluran","noChannelData":"Tidak ada data saluran","source":"Sumber","medium":"Media","sessions":"Sesi","conversions":"Konversi","revenue":"Pendapatan","createPixel":"Buat Pixel Baru","pixelName":"Nama Pixel","pixelNamePh":"mis. Pixel Toko Utama","domain":"Domain","metaCAPIToken":"Token Meta CAPI","nameRequired":"Silakan masukkan nama pixel","secInputBlocked":"Input diblokir","createSuccess":"Pixel berhasil dibuat.","createError":"Gagal membuat","creating":"Membuat…","createPixelBtn":"Buat Pixel","pixelList":"Daftar Pixel","noPixels":"Tidak ada pixel terdaftar","snippet":"Cuplikan","delete":"Hapus","deleteConfirm":"Hapus pixel ini? Pengumpulan akan berhenti.","snippetTitle":"Cuplikan Pemasangan","copy":"Salin","copied":"Disalin","snippetGuide1":"Tempel kode ini ke dalam tag ","snippetGuide2":" situs Anda.","snippetGuide3":"Setelah pemasangan, event tampilan halaman dan pembelian dikumpulkan otomatis dan dikirim secara sisi server ke Meta/TikTok.","testEventSend":"Kirim Event Uji","eventType":"Jenis Event","amount":"Jumlah","sending":"Mengirim…","sendEvent":"Kirim Event","realtimeStream":"Aliran Event Real-time","noEvents":"Belum ada event yang dikirim. Coba kirim event uji di atas."},"ar":{"heroTitle":"تتبع البكسل 1st-Party","heroDesc":"تتبع التحويلات من جانب الخادم في عصر ما بعد ملفات تعريف الارتباط (Meta CAPI · TikTok Events API)","tabDashboard":"لوحة التحكم","tabSettings":"إعدادات البكسل","tabEvents":"تدفق الأحداث","loading":"جارٍ تحميل بيانات التحليل…","days":"يوم","noDataTitle":"لم يتم جمع أي بيانات بعد","noDataDesc":"أنشئ بكسل من علامة التبويب 'إعدادات البكسل' وثبّت المقتطف على موقعك لبدء جمع الأحداث.","totalEvents":"إجمالي الأحداث","purchases":"المشتريات","totalRevenue":"إجمالي الإيرادات","convRate":"معدل التحويل","metaForward":"مُرسَل إلى Meta","tiktokForward":"مُرسَل إلى TikTok","serverSideCAPI":"CAPI من جانب الخادم","serverSideEvent":"حدث من جانب الخادم","funnelTitle":"قمع التحويل","funnelVisit":"زيارة","funnelProduct":"عرض المنتج","funnelCart":"إضافة إلى السلة","funnelCheckout":"بدء الدفع","funnelPurchase":"اكتمال الشراء","channelAttr":"تحليل مساهمة القنوات","noChannelData":"لا توجد بيانات قنوات","source":"المصدر","medium":"الوسيط","sessions":"الجلسات","conversions":"التحويلات","revenue":"الإيرادات","createPixel":"إنشاء بكسل جديد","pixelName":"اسم البكسل","pixelNamePh":"مثال: بكسل المتجر الرئيسي","domain":"النطاق","metaCAPIToken":"رمز Meta CAPI","nameRequired":"يرجى إدخال اسم البكسل","secInputBlocked":"تم حظر الإدخال","createSuccess":"تم إنشاء البكسل.","createError":"فشل الإنشاء","creating":"جارٍ الإنشاء…","createPixelBtn":"إنشاء بكسل","pixelList":"قائمة البكسل","noPixels":"لا توجد بكسلات مسجلة","snippet":"المقتطف","delete":"حذف","deleteConfirm":"هل تريد حذف هذا البكسل؟ سيتوقف الجمع.","snippetTitle":"مقتطف التثبيت","copy":"نسخ","copied":"تم النسخ","snippetGuide1":"الصق هذا الكود داخل وسم ","snippetGuide2":" في موقعك.","snippetGuide3":"بعد التثبيت، يتم جمع أحداث مشاهدة الصفحة والشراء تلقائيًا وإرسالها من جانب الخادم إلى Meta/TikTok.","testEventSend":"إرسال حدث اختباري","eventType":"نوع الحدث","amount":"المبلغ","sending":"جارٍ الإرسال…","sendEvent":"إرسال الحدث","realtimeStream":"تدفق الأحداث في الوقت الفعلي","noEvents":"لم يتم إرسال أي أحداث. جرّب إرسال حدث اختباري بالأعلى."},"es":{"heroTitle":"Seguimiento de Píxel 1st-Party","heroDesc":"Seguimiento de conversiones del lado del servidor para la era sin cookies (Meta CAPI · TikTok Events API)","tabDashboard":"Panel","tabSettings":"Configuración del píxel","tabEvents":"Flujo de eventos","loading":"Cargando datos analíticos…","days":"días","noDataTitle":"Aún no se han recopilado datos","noDataDesc":"Crea un píxel en la pestaña 'Configuración del píxel' e instala el snippet en tu sitio para empezar a recopilar eventos.","totalEvents":"Eventos totales","purchases":"Compras","totalRevenue":"Ingresos totales","convRate":"Tasa de conversión","metaForward":"Enviado a Meta","tiktokForward":"Enviado a TikTok","serverSideCAPI":"CAPI del lado del servidor","serverSideEvent":"Evento del lado del servidor","funnelTitle":"Embudo de conversión","funnelVisit":"Visita","funnelProduct":"Vista de producto","funnelCart":"Añadir al carrito","funnelCheckout":"Pago iniciado","funnelPurchase":"Compra completada","channelAttr":"Atribución por canal","noChannelData":"Sin datos de canal","source":"Fuente","medium":"Medio","sessions":"Sesiones","conversions":"Conversiones","revenue":"Ingresos","createPixel":"Crear nuevo píxel","pixelName":"Nombre del píxel","pixelNamePh":"ej.: Píxel de tienda principal","domain":"Dominio","metaCAPIToken":"Token de Meta CAPI","nameRequired":"Introduce un nombre de píxel","secInputBlocked":"Entrada bloqueada","createSuccess":"Píxel creado correctamente.","createError":"Error al crear","creating":"Creando…","createPixelBtn":"Crear píxel","pixelList":"Lista de píxeles","noPixels":"No hay píxeles registrados","snippet":"Snippet","delete":"Eliminar","deleteConfirm":"¿Eliminar este píxel? Se detendrá la recopilación.","snippetTitle":"Snippet de instalación","copy":"Copiar","copied":"Copiado","snippetGuide1":"Pega este código en la etiqueta ","snippetGuide2":" de tu sitio.","snippetGuide3":"Tras la instalación, los eventos de vista de página y compra se recopilan automáticamente y se envían del lado del servidor a Meta/TikTok.","testEventSend":"Enviar evento de prueba","eventType":"Tipo de evento","amount":"Importe","sending":"Enviando…","sendEvent":"Enviar evento","realtimeStream":"Flujo de eventos en tiempo real","noEvents":"No se han enviado eventos. Prueba a enviar un evento de prueba arriba."},"fr":{"heroTitle":"Suivi de Pixel 1st-Party","heroDesc":"Suivi des conversions côté serveur pour l'ère sans cookies (Meta CAPI · TikTok Events API)","tabDashboard":"Tableau de bord","tabSettings":"Paramètres du pixel","tabEvents":"Flux d'événements","loading":"Chargement des données analytiques…","days":"jours","noDataTitle":"Aucune donnée collectée pour le moment","noDataDesc":"Créez un pixel dans l'onglet « Paramètres du pixel » et installez le snippet sur votre site pour commencer à collecter des événements.","totalEvents":"Total des événements","purchases":"Achats","totalRevenue":"Chiffre d'affaires total","convRate":"Taux de conversion","metaForward":"Envoyé à Meta","tiktokForward":"Envoyé à TikTok","serverSideCAPI":"CAPI côté serveur","serverSideEvent":"Événement côté serveur","funnelTitle":"Entonnoir de conversion","funnelVisit":"Visite","funnelProduct":"Vue produit","funnelCart":"Ajout au panier","funnelCheckout":"Paiement démarré","funnelPurchase":"Achat finalisé","channelAttr":"Attribution par canal","noChannelData":"Aucune donnée de canal","source":"Source","medium":"Support","sessions":"Sessions","conversions":"Conversions","revenue":"Chiffre d'affaires","createPixel":"Créer un nouveau pixel","pixelName":"Nom du pixel","pixelNamePh":"ex. : Pixel de la boutique principale","domain":"Domaine","metaCAPIToken":"Jeton Meta CAPI","nameRequired":"Veuillez saisir un nom de pixel","secInputBlocked":"Saisie bloquée","createSuccess":"Pixel créé avec succès.","createError":"Échec de la création","creating":"Création…","createPixelBtn":"Créer le pixel","pixelList":"Liste des pixels","noPixels":"Aucun pixel enregistré","snippet":"Snippet","delete":"Supprimer","deleteConfirm":"Supprimer ce pixel ? La collecte sera interrompue.","snippetTitle":"Snippet d'installation","copy":"Copier","copied":"Copié","snippetGuide1":"Collez ce code dans la balise ","snippetGuide2":" de votre site.","snippetGuide3":"Après l'installation, les événements de vue de page et d'achat sont collectés automatiquement et envoyés côté serveur à Meta/TikTok.","testEventSend":"Envoyer un événement de test","eventType":"Type d'événement","amount":"Montant","sending":"Envoi…","sendEvent":"Envoyer l'événement","realtimeStream":"Flux d'événements en temps réel","noEvents":"Aucun événement envoyé. Essayez d'envoyer un événement de test ci-dessus."},"hi":{"heroTitle":"1st-Party पिक्सेल ट्रैकिंग","heroDesc":"कुकीलेस युग के लिए सर्वर-साइड कन्वर्ज़न ट्रैकिंग (Meta CAPI · TikTok Events API)","tabDashboard":"डैशबोर्ड","tabSettings":"पिक्सेल सेटिंग्स","tabEvents":"इवेंट स्ट्रीम","loading":"विश्लेषण डेटा लोड हो रहा है…","days":"दिन","noDataTitle":"अभी तक कोई डेटा एकत्र नहीं हुआ","noDataDesc":"'पिक्सेल सेटिंग्स' टैब में पिक्सेल बनाएं और अपनी साइट पर स्निपेट इंस्टॉल करें ताकि इवेंट एकत्र होने लगें।","totalEvents":"कुल इवेंट","purchases":"खरीदारी","totalRevenue":"कुल राजस्व","convRate":"कन्वर्ज़न दर","metaForward":"Meta को भेजा गया","tiktokForward":"TikTok को भेजा गया","serverSideCAPI":"सर्वर-साइड CAPI","serverSideEvent":"सर्वर-साइड इवेंट","funnelTitle":"कन्वर्ज़न फ़नल","funnelVisit":"विज़िट","funnelProduct":"उत्पाद दृश्य","funnelCart":"कार्ट में जोड़ें","funnelCheckout":"चेकआउट शुरू","funnelPurchase":"खरीदारी पूर्ण","channelAttr":"चैनल एट्रिब्यूशन विश्लेषण","noChannelData":"कोई चैनल डेटा नहीं","source":"स्रोत","medium":"माध्यम","sessions":"सेशन","conversions":"कन्वर्ज़न","revenue":"राजस्व","createPixel":"नया पिक्सेल बनाएं","pixelName":"पिक्सेल नाम","pixelNamePh":"उदा.: मुख्य स्टोर पिक्सेल","domain":"डोमेन","metaCAPIToken":"Meta CAPI टोकन","nameRequired":"कृपया पिक्सेल नाम दर्ज करें","secInputBlocked":"इनपुट अवरुद्ध कर दिया गया","createSuccess":"पिक्सेल बना दिया गया।","createError":"बनाने में विफल","creating":"बनाया जा रहा है…","createPixelBtn":"पिक्सेल बनाएं","pixelList":"पिक्सेल सूची","noPixels":"कोई पंजीकृत पिक्सेल नहीं","snippet":"स्निपेट","delete":"हटाएं","deleteConfirm":"इस पिक्सेल को हटाएं? संग्रहण रुक जाएगा।","snippetTitle":"इंस्टॉलेशन स्निपेट","copy":"कॉपी करें","copied":"कॉपी किया गया","snippetGuide1":"इस कोड को अपनी साइट के ","snippetGuide2":" टैग के अंदर पेस्ट करें।","snippetGuide3":"इंस्टॉलेशन के बाद, पेजव्यू और खरीदारी इवेंट स्वचालित रूप से एकत्र होते हैं और सर्वर-साइड रूप से Meta/TikTok को भेजे जाते हैं।","testEventSend":"टेस्ट इवेंट भेजें","eventType":"इवेंट प्रकार","amount":"राशि","sending":"भेजा जा रहा है…","sendEvent":"इवेंट भेजें","realtimeStream":"रीयल-टाइम इवेंट स्ट्रीम","noEvents":"कोई इवेंट नहीं भेजा गया। ऊपर एक टेस्ट इवेंट भेजकर देखें।"},"pt":{"heroTitle":"Rastreamento de Pixel 1st-Party","heroDesc":"Rastreamento de conversões do lado do servidor para a era sem cookies (Meta CAPI · TikTok Events API)","tabDashboard":"Painel","tabSettings":"Configurações do pixel","tabEvents":"Fluxo de eventos","loading":"Carregando dados analíticos…","days":"dias","noDataTitle":"Nenhum dado coletado ainda","noDataDesc":"Crie um pixel na aba 'Configurações do pixel' e instale o snippet no seu site para começar a coletar eventos.","totalEvents":"Total de eventos","purchases":"Compras","totalRevenue":"Receita total","convRate":"Taxa de conversão","metaForward":"Enviado para o Meta","tiktokForward":"Enviado para o TikTok","serverSideCAPI":"CAPI do lado do servidor","serverSideEvent":"Evento do lado do servidor","funnelTitle":"Funil de conversão","funnelVisit":"Visita","funnelProduct":"Visualização de produto","funnelCart":"Adicionar ao carrinho","funnelCheckout":"Checkout iniciado","funnelPurchase":"Compra concluída","channelAttr":"Atribuição por canal","noChannelData":"Sem dados de canal","source":"Origem","medium":"Meio","sessions":"Sessões","conversions":"Conversões","revenue":"Receita","createPixel":"Criar novo pixel","pixelName":"Nome do pixel","pixelNamePh":"ex.: Pixel da loja principal","domain":"Domínio","metaCAPIToken":"Token Meta CAPI","nameRequired":"Insira um nome de pixel","secInputBlocked":"Entrada bloqueada","createSuccess":"Pixel criado com sucesso.","createError":"Falha na criação","creating":"Criando…","createPixelBtn":"Criar pixel","pixelList":"Lista de pixels","noPixels":"Nenhum pixel registrado","snippet":"Snippet","delete":"Excluir","deleteConfirm":"Excluir este pixel? A coleta será interrompida.","snippetTitle":"Snippet de instalação","copy":"Copiar","copied":"Copiado","snippetGuide1":"Cole este código na tag ","snippetGuide2":" do seu site.","snippetGuide3":"Após a instalação, os eventos de visualização de página e compra são coletados automaticamente e enviados do lado do servidor para o Meta/TikTok.","testEventSend":"Enviar evento de teste","eventType":"Tipo de evento","amount":"Valor","sending":"Enviando…","sendEvent":"Enviar evento","realtimeStream":"Fluxo de eventos em tempo real","noEvents":"Nenhum evento enviado. Tente enviar um evento de teste acima."},"ru":{"heroTitle":"Отслеживание пикселя 1st-Party","heroDesc":"Серверное отслеживание конверсий в эпоху без cookie (Meta CAPI · TikTok Events API)","tabDashboard":"Панель","tabSettings":"Настройки пикселя","tabEvents":"Поток событий","loading":"Загрузка аналитических данных…","days":"дн.","noDataTitle":"Данные пока не собраны","noDataDesc":"Создайте пиксель на вкладке «Настройки пикселя» и установите сниппет на сайт, чтобы начать сбор событий.","totalEvents":"Всего событий","purchases":"Покупки","totalRevenue":"Общий доход","convRate":"Коэффициент конверсии","metaForward":"Отправлено в Meta","tiktokForward":"Отправлено в TikTok","serverSideCAPI":"Серверный CAPI","serverSideEvent":"Серверное событие","funnelTitle":"Воронка конверсии","funnelVisit":"Визит","funnelProduct":"Просмотр товара","funnelCart":"Добавление в корзину","funnelCheckout":"Начало оформления","funnelPurchase":"Покупка завершена","channelAttr":"Анализ вклада каналов","noChannelData":"Нет данных по каналам","source":"Источник","medium":"Канал","sessions":"Сеансы","conversions":"Конверсии","revenue":"Доход","createPixel":"Создать новый пиксель","pixelName":"Название пикселя","pixelNamePh":"напр.: Пиксель основного магазина","domain":"Домен","metaCAPIToken":"Токен Meta CAPI","nameRequired":"Введите название пикселя","secInputBlocked":"Ввод заблокирован","createSuccess":"Пиксель создан.","createError":"Не удалось создать","creating":"Создание…","createPixelBtn":"Создать пиксель","pixelList":"Список пикселей","noPixels":"Нет зарегистрированных пикселей","snippet":"Сниппет","delete":"Удалить","deleteConfirm":"Удалить этот пиксель? Сбор данных будет остановлен.","snippetTitle":"Сниппет установки","copy":"Копировать","copied":"Скопировано","snippetGuide1":"Вставьте этот код в тег ","snippetGuide2":" вашего сайта.","snippetGuide3":"После установки события просмотра страниц и покупок собираются автоматически и отправляются на серверной стороне в Meta/TikTok.","testEventSend":"Отправить тестовое событие","eventType":"Тип события","amount":"Сумма","sending":"Отправка…","sendEvent":"Отправить событие","realtimeStream":"Поток событий в реальном времени","noEvents":"События не отправлены. Попробуйте отправить тестовое событие выше."}};

function StatCard({ icon, label, value, sub, color = C.accent }) {
  return (
    <div style={{ ...CARD, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* pxl 폴백 주입 t */
function usePxlT() {
  // 209차 i18n: PXL_FB 를 lang-keyed(15개국)로 확장. 현재 언어 사전에서 폴백을 골라 t() 에 전달.
  //   pxl ns 는 로케일에서 purge 됐으므로(186차) 실제 렌더는 이 로컬 사전이 담당(공유 로케일 비대화 회피).
  const { t, lang } = useI18n();
  return useCallback((key, vars) => {
    const dict = PXL_FB[lang] || PXL_FB.ko;
    const fb = key && key.indexOf("pxl.") === 0 ? (dict[key.slice(4)] ?? PXL_FB.ko[key.slice(4)]) : undefined;
    return t(key, fb, vars);
  }, [t, lang]);
}

/* ── Dashboard Tab ── */
function DashboardTab({ API }) {
  const t = usePxlT();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API(`/pixel/analytics?days=${days}`).then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  }, [days]);

  if (loading) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>📊 {t("pxl.loading")}</div>;

  const hasData = data?.ok && (data.events?.length || data.funnel?.page_view);
  const funnel = data?.funnel || {};
  const totalEvents = data?.events?.reduce((s, e) => s + parseInt(e.total || 0, 10), 0) || 0;
  const purchaseEvt = data?.events?.find(e => e.event_name === "purchase");
  const revenue = purchaseEvt ? parseFloat(purchaseEvt.total_value || 0) : 0;
  const convRate = funnel.page_view > 0 ? ((funnel.purchase || 0) / funnel.page_view * 100).toFixed(2) : "0.00";
  const fwd = data?.forwarding || {};
  const fwdTotal = parseInt(fwd.total_events || 0, 10) || 1;
  const funnelSteps = [
    { name: t("pxl.funnelVisit"), count: funnel.page_view || 0, color: "#4f8ef7" },
    { name: t("pxl.funnelProduct"), count: funnel.view_content || 0, color: "#818cf8" },
    { name: t("pxl.funnelCart"), count: funnel.add_to_cart || 0, color: "#a78bfa" },
    { name: t("pxl.funnelCheckout"), count: funnel.initiate_checkout || 0, color: "#c084fc" },
    { name: t("pxl.funnelPurchase"), count: funnel.purchase || 0, color: "#22c55e" },
  ];
  const maxCount = Math.max(...funnelSteps.map(s => s.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {[7, 14, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: days === d ? C.accent : C.surface, color: days === d ? "#fff" : C.muted, fontWeight: 700, fontSize: 12 }}>{d}{t("pxl.days")}</button>
        ))}
      </div>

      {!hasData && (
        <div style={{ ...CARD, textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 8 }}>{t("pxl.noDataTitle")}</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{t("pxl.noDataDesc")}</div>
        </div>
      )}

      {hasData && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <StatCard icon="📊" label={t("pxl.totalEvents")} value={totalEvents.toLocaleString()} color={C.accent} />
            <StatCard icon="🛒" label={t("pxl.purchases")} value={(funnel.purchase || 0).toLocaleString()} color={C.green} />
            <StatCard icon="💰" label={t("pxl.totalRevenue")} value={`₩${revenue.toLocaleString()}`} color={C.yellow} />
            <StatCard icon="📈" label={t("pxl.convRate")} value={`${convRate}%`} sub={`${t("pxl.funnelVisit")} → ${t("pxl.funnelPurchase")}`} color={C.purple} />
            <StatCard icon="🔵" label={t("pxl.metaForward")} value={`${Math.round((parseInt(fwd.meta_forwarded || 0, 10)) / fwdTotal * 100)}%`} sub={t("pxl.serverSideCAPI")} color="#60a5fa" />
            <StatCard icon="⚫" label={t("pxl.tiktokForward")} value={`${Math.round((parseInt(fwd.tiktok_forwarded || 0, 10)) / fwdTotal * 100)}%`} sub={t("pxl.serverSideEvent")} color="#94a3b8" />
          </div>

          <div style={CARD}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>🔽 {t("pxl.funnelTitle")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {funnelSteps.map((step, i) => {
                const widthPct = step.count / maxCount * 100;
                const convPct = i > 0 ? (funnelSteps[i - 1].count > 0 ? (step.count / funnelSteps[i - 1].count * 100).toFixed(1) : "0") : "100";
                return (
                  <div key={step.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: C.text }}>{step.name}</span>
                      <span style={{ color: C.muted }}>{step.count.toLocaleString()} <span style={{ color: step.color }}>({convPct}%)</span></span>
                    </div>
                    <div style={{ height: 10, background: C.surface, borderRadius: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${widthPct}%`, background: `linear-gradient(90deg, ${step.color}cc, ${step.color})`, borderRadius: 5, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={CARD}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📡 {t("pxl.channelAttr")}</div>
            {!data.channels?.length ? (
              <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>{t("pxl.noChannelData")}</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ textAlign: "left", padding: "8px 0" }}>{t("pxl.source")}</th>
                    <th style={{ textAlign: "left", padding: "8px 0" }}>{t("pxl.medium")}</th>
                    <th style={{ textAlign: "right", padding: "8px 0" }}>{t("pxl.sessions")}</th>
                    <th style={{ textAlign: "right", padding: "8px 0" }}>{t("pxl.conversions")}</th>
                    <th style={{ textAlign: "right", padding: "8px 0" }}>{t("pxl.revenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.channels.slice(0, 10).map((ch, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 0", color: C.text }}>{ch.source}</td>
                      <td style={{ padding: "8px 0", color: C.muted }}>{ch.medium}</td>
                      <td style={{ padding: "8px 0", textAlign: "right" }}>{parseInt(ch.sessions || 0, 10).toLocaleString()}</td>
                      <td style={{ padding: "8px 0", textAlign: "right", color: C.green }}>{parseInt(ch.conversions || 0, 10)}</td>
                      <td style={{ padding: "8px 0", textAlign: "right", color: C.yellow }}>₩{parseInt(ch.revenue || 0, 10).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Pixel Config Tab ── */
function PixelConfigTab({ API }) {
  const t = usePxlT();
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState({ name: "", domain: "", meta_pixel_id: "", meta_api_token: "", tiktok_pixel_id: "", tiktok_access_token: "" });
  const [snippet, setSnippet] = useState("");
  const [selectedPixelId, setSelectedPixelId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => { API("/pixel/configs").then(r => setConfigs(r.configs || [])); }, [API]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) { setMsg(`❌ ${t("pxl.nameRequired")}`); return; }
    setSaving(true);
    const r = await API("/pixel/configs", { method: "POST", body: JSON.stringify(form) });
    setSaving(false);
    if (r.ok) {
      setMsg(`✅ ${t("pxl.createSuccess")} (pixel_id: ${r.pixel_id})`);
      setForm({ name: "", domain: "", meta_pixel_id: "", meta_api_token: "", tiktok_pixel_id: "", tiktok_access_token: "" });
      load();
    } else setMsg(`❌ ${t("pxl.createError")}: ${r.error || ""}`);
  };

  const loadSnippet = async (pixelId) => {
    const r = await API(`/pixel/snippet/${pixelId}`);
    if (r.ok) { setSnippet(r.snippet || ""); setSelectedPixelId(pixelId); }
  };

  const deleteConfig = async (id) => {
    if (!window.confirm(t("pxl.deleteConfirm"))) return;
    await API(`/pixel/configs/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={CARD}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>➕ {t("pxl.createPixel")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 12, color: C.muted }}>{t("pxl.pixelName")}</label>
            <input style={INPUT} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("pxl.pixelNamePh")} /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>{t("pxl.domain")}</label>
            <input style={INPUT} value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="example.com" /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>Meta Pixel ID</label>
            <input style={INPUT} value={form.meta_pixel_id} onChange={e => setForm({ ...form, meta_pixel_id: e.target.value })} placeholder="1234567890" /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>{t("pxl.metaCAPIToken")}</label>
            <input style={INPUT} type="password" value={form.meta_api_token} onChange={e => setForm({ ...form, meta_api_token: e.target.value })} placeholder="EAAxxxxxx..." /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>TikTok Pixel ID</label>
            <input style={INPUT} value={form.tiktok_pixel_id} onChange={e => setForm({ ...form, tiktok_pixel_id: e.target.value })} placeholder="CXXXXXX" /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>TikTok Access Token</label>
            <input style={INPUT} type="password" value={form.tiktok_access_token} onChange={e => setForm({ ...form, tiktok_access_token: e.target.value })} placeholder="xxxxxx..." /></div>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith("✅") ? C.green : C.red }}>{msg}</div>}
        <button onClick={save} disabled={saving} style={{ marginTop: 16, padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, color: "#fff", fontWeight: 700 }}>
          {saving ? t("pxl.creating") : `🔧 ${t("pxl.createPixelBtn")}`}
        </button>
      </div>

      <div style={CARD}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📋 {t("pxl.pixelList")}</div>
        {!configs.length ? (
          <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>{t("pxl.noPixels")}</div>
        ) : (
          configs.map(cfg => (
            <div key={cfg.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{cfg.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>ID: {cfg.pixel_id} | {t("pxl.domain")}: {cfg.domain || "-"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => loadSnippet(cfg.pixel_id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--surface)", color: C.accent, cursor: "pointer", fontSize: 12 }}>{"</>"} {t("pxl.snippet")}</button>
                <button onClick={() => deleteConfig(cfg.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--surface)", color: C.red, cursor: "pointer", fontSize: 12 }}>🗑 {t("pxl.delete")}</button>
              </div>
            </div>
          ))
        )}
      </div>

      {snippet && (
        <div style={CARD}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📋 {t("pxl.snippetTitle")} ({selectedPixelId})</div>
          <div style={{ background: "#0a0f1a", borderRadius: 10, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#7dd3fc", whiteSpace: "pre-wrap", wordBreak: "break-all", overflow: "auto", maxHeight: 300 }}>{snippet}</div>
          <button onClick={() => { try { navigator.clipboard.writeText(snippet); } catch {} }} style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: C.surface, color: C.text, fontSize: 12 }}>📋 {t("pxl.copy")}</button>
          <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
            ℹ️ {t("pxl.snippetGuide1")}<code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: 4 }}>&lt;head&gt;</code>{t("pxl.snippetGuide2")} {t("pxl.snippetGuide3")}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Event Stream Tab (테스트 전송 + 실시간 표시) ── */
function EventStreamTab() {
  const t = usePxlT();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ pixel_id: "", event_name: "purchase", value: "50000" });
  const eventTypes = ["page_view", "view_content", "add_to_cart", "initiate_checkout", "purchase", "lead", "subscribe"];

  const sendTest = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pixel/collect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixel_id: form.pixel_id, event_name: form.event_name, value: parseFloat(form.value) || 0, session_id: "test_" + Date.now(), utm_source: "test", utm_medium: "manual_test" }),
      }).then(x => x.json());
      if (r.ok) setEvents(prev => [{ ...form, event_id: r.event_id, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 49)]);
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={CARD}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🧪 {t("pxl.testEventSend")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div><label style={{ fontSize: 12, color: C.muted }}>Pixel ID</label>
            <input style={INPUT} value={form.pixel_id} onChange={e => setForm({ ...form, pixel_id: e.target.value })} placeholder="px_..." /></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>{t("pxl.eventType")}</label>
            <select style={INPUT} value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })}>{eventTypes.map(et => <option key={et} value={et}>{et}</option>)}</select></div>
          <div><label style={{ fontSize: 12, color: C.muted }}>{t("pxl.amount")}</label>
            <input style={INPUT} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="50000" /></div>
        </div>
        <button onClick={sendTest} disabled={loading || !form.pixel_id} style={{ marginTop: 12, padding: "9px 24px", borderRadius: 10, border: "none", cursor: "pointer", background: C.green, color: "#fff", fontWeight: 700, opacity: (!form.pixel_id || loading) ? 0.5 : 1 }}>
          {loading ? t("pxl.sending") : `▶ ${t("pxl.sendEvent")}`}
        </button>
      </div>

      <div style={CARD}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📡 {t("pxl.realtimeStream")}</div>
        {!events.length ? (
          <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>{t("pxl.noEvents")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.map((ev, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.surface, borderRadius: 10, fontSize: 12 }}>
                <div>
                  <span style={{ background: C.accent + "30", color: C.accent, padding: "2px 10px", borderRadius: 999, fontWeight: 700, fontSize: 11 }}>{ev.event_name}</span>
                  <span style={{ marginLeft: 10, color: C.muted }}>{ev.time}</span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {parseFloat(ev.value) > 0 && <span style={{ color: C.yellow }}>₩{parseFloat(ev.value).toLocaleString()}</span>}
                  <span style={{ color: C.green }}>✅ CAPI</span>
                  <span style={{ color: C.muted, fontSize: 10 }}>#{ev.event_id?.slice(-8)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ── */
export default function PixelTracking() {
  const t = usePxlT();
  const { token } = useAuth();
  const API = makeAPI(token);
  const [tab, setTab] = useState("dashboard");

  const TABS = [
    { id: "dashboard", label: `📊 ${t("pxl.tabDashboard")}` },
    { id: "pixels", label: `🔧 ${t("pxl.tabSettings")}` },
    { id: "events", label: `📡 ${t("pxl.tabEvents")}` },
  ];

  return (
    <PlanGate feature="pixel_tracking">
      <div style={{ padding: "0 0 40px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 28 }}>🎯</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, color: C.text }}>{t("pxl.heroTitle")}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{t("pxl.heroDesc")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 16, marginBottom: 20 }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === tb.id ? C.accent : C.surface, color: tab === tb.id ? "#fff" : C.muted, fontWeight: 700, fontSize: 13 }}>{tb.label}</button>
          ))}
        </div>

        {tab === "dashboard" && <DashboardTab API={API} />}
        {tab === "pixels" && <PixelConfigTab API={API} />}
        {tab === "events" && <EventStreamTab />}
      </div>
    </PlanGate>
  );
}
