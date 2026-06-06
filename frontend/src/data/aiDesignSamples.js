/* 196·197차 — AI 디자인 럭셔리 샘플 라이브러리 (정적/애니메이션/그래프/일러스트)
 * 매거진/에디토리얼급 프리미엄 SVG(외부 리소스 0, 순수 벡터).
 * 197차 추가: ①밝은 배경 팔레트 ②명도 기반 자동 가시성(어두운 배경=밝은 글자/밝은 배경=짙은 글자)
 *            ③15개국 현지 자연어 카피(CONTENT_I18N) — buildSamples(lang) 으로 접속 언어 반영. */

/* ── 색 유틸 ── */
const _hex = (h) => { const s = String(h).replace('#', ''); const n = s.length === 3 ? s.split('').map(x => x + x).join('') : s; return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]; };
const _to = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lighten = (h, a) => { const [r, g, b] = _hex(h); return _to(r + (255 - r) * a, g + (255 - g) * a, b + (255 - b) * a); };
const darken = (h, a) => { const [r, g, b] = _hex(h); return _to(r * (1 - a), g * (1 - a), b * (1 - a)); };
const lum = (h) => { const c = _hex(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const isLight = (h) => lum(h) > 0.55;
// 배경 명도에 따라 가독 글자색 자동 선택(어두우면 밝게, 밝으면 짙게)
const inkOn = (bg) => isLight(bg) ? '#0f172a' : '#ffffff';

/* ── 팔레트: 어두운 10 + 밝은 6 (밝은 팔레트는 text=짙은색, accent=선명한 진한색으로 대비 확보) ── */
const PALETTES = [
  { bg: '#0a1a3f', primary: '#1e3a8a', accent: '#f4d03f', text: '#ffffff', name: '네이비×골드' },
  { bg: '#1a1030', primary: '#6d28d9', accent: '#f472b6', text: '#ffffff', name: '딥퍼플×핑크' },
  { bg: '#0b1411', primary: '#065f46', accent: '#34d399', text: '#ffffff', name: '블랙×에메랄드' },
  { bg: '#0f172a', primary: '#0e7490', accent: '#22d3ee', text: '#ffffff', name: '차콜×시안' },
  { bg: '#2d0a1a', primary: '#9f1239', accent: '#fb7185', text: '#ffffff', name: '와인×로즈골드' },
  { bg: '#0a1428', primary: '#1d4ed8', accent: '#60a5fa', text: '#ffffff', name: '미드나잇×블루' },
  { bg: '#0a1f14', primary: '#15803d', accent: '#a3e635', text: '#ffffff', name: '포레스트×라임' },
  { bg: '#1c1410', primary: '#b45309', accent: '#fbbf24', text: '#ffffff', name: '에스프레소×브론즈' },
  { bg: '#1e1b2e', primary: '#6d28d9', accent: '#c4b5fd', text: '#ffffff', name: '슬레이트×바이올렛' },
  { bg: '#0a2424', primary: '#0f766e', accent: '#fb923c', text: '#ffffff', name: '틸×코랄' },
  // ── 밝은 배경 (197차 신규) ──
  { bg: '#f8fafc', primary: '#2563eb', accent: '#1d4ed8', text: '#0f172a', name: '화이트×블루' },
  { bg: '#fbf7f0', primary: '#b91c1c', accent: '#9f1239', text: '#1c1917', name: '아이보리×버건디' },
  { bg: '#f0fdf4', primary: '#15803d', accent: '#166534', text: '#052e16', name: '민트×그린' },
  { bg: '#fdf4ff', primary: '#7c3aed', accent: '#6d28d9', text: '#1e1b2e', name: '페일라일락×퍼플' },
  { bg: '#fffbeb', primary: '#d97706', accent: '#b45309', text: '#1c1410', name: '크림×앰버' },
  { bg: '#f1f5f9', primary: '#0d9488', accent: '#0f766e', text: '#0f172a', name: '라이트그레이×틸' },
];

/* ── 메트릭(공용 토큰) / 이미지 프롬프트(공용 영문) ── */
const METRICS = ['FREE', '+247%', 'ALL', '−38%', '12+', 'AUTO', '3.8x', 'LIVE', 'DATA', '14d'];
const IMGS = [
  'luxury premium gift box with golden ribbon, dark elegant background',
  'upward growth arrow, financial success, premium business',
  'modern analytics dashboard, data visualization, premium tech',
  'cost saving concept, efficient AI, premium minimal',
  'connected network nodes, integration, premium tech glow',
  'AI automation, glowing circuit, premium futuristic',
  'rocket launch, performance boost, premium gold accent',
  'real-time data screen, glowing charts, premium dark UI',
  'data crystal, insight, premium abstract',
  'free trial badge, premium clean, inviting',
];

/* ── 15개국 현지 자연어 카피 (각 10개: headline/subheadline/body/cta/metricLabel) ──
 *  ko/en SOT + 13개국. (CC 초안 — 사용자 검수·수정 가능) */
const CI = (h, s, b, c, m) => ({ headline: h, subheadline: s, body: b, cta: c, metricLabel: m });
const CONTENT_I18N = {
  ko: [
    CI('3개월 무료', '신규회원 한정 이벤트', '지금 가입하면 GeniegoROI 프리미엄을 3개월간 무료로', '무료로 시작하기', '3개월 구독'),
    CI('매출 +247%', '데이터로 증명된 성장', 'GeniegoROI 도입 기업 평균 매출 성장률', '성과 확인하기', '매출 성장'),
    CI('ROI 분석', '올인원 마케팅 SaaS', '모든 채널의 광고 성과를 한 곳에서 정밀 분석', '지금 분석하기', '통합 분석'),
    CI('광고비 38%↓', 'AI 자동 최적화', 'AI가 성과 낮은 채널 예산을 자동으로 재배분', '절감 시작하기', '광고비 절감'),
    CI('전 채널 통합', '한 곳에서 관리', 'Meta·구글·틱톡·네이버·카카오 통합 대시보드', '통합 보기', '연동 채널'),
    CI('AI 자동 캠페인', '클릭 한 번으로 실행', 'AI가 예산·채널·소재를 자동 설정·실행·최적화', '자동화 켜기', 'AI 실행'),
    CI('ROAS 3.8배', '광고 효율 극대화', '투입 광고비 대비 3.8배의 매출 효율 달성', '효율 보기', 'ROAS'),
    CI('실시간 성과', '지금 이 순간의 KPI', '실시간으로 변하는 마케팅 성과를 한눈에', '대시보드 열기', '실시간 추적'),
    CI('데이터 결정', '추측은 이제 그만', '감이 아닌 데이터로 마케팅을 결정하세요', '인사이트 받기', '의사결정'),
    CI('14일 무료체험', '카드 없이 바로 시작', '신용카드 없이 모든 기능을 14일간 체험', '체험 시작하기', '무료 체험'),
  ],
  en: [
    CI('3 Months Free', 'New Member Event', 'Join now and get GeniegoROI Premium free for 3 months', 'Start Free', '3-Month Plan'),
    CI('Revenue +247%', 'Proven by Data', 'Average revenue growth across GeniegoROI clients', 'See Results', 'Revenue Growth'),
    CI('ROI Analytics', 'All-in-One Marketing SaaS', "Analyze every channel's ad performance in one place", 'Analyze Now', 'Unified View'),
    CI('Ad Cost −38%', 'AI Auto-Optimization', 'AI reallocates budget from low-performing channels', 'Start Saving', 'Cost Saved'),
    CI('All Channels United', 'Manage in One Place', 'Unified dashboard for Meta, Google, TikTok, Naver, Kakao', 'View Unified', 'Channels'),
    CI('AI Auto-Campaign', 'Launch in One Click', 'AI sets, runs and optimizes budget, channels & creatives', 'Turn On AI', 'AI Run'),
    CI('ROAS 3.8x', 'Maximize Ad Efficiency', 'Achieve 3.8x return on every dollar of ad spend', 'See Efficiency', 'ROAS'),
    CI('Real-Time KPIs', "This Moment's Performance", 'Watch your marketing results change in real time', 'Open Dashboard', 'Live Tracking'),
    CI('Data Decisions', 'No More Guessing', 'Decide your marketing with data, not gut feeling', 'Get Insights', 'Decisions'),
    CI('14-Day Free Trial', 'Start Without a Card', 'Try every feature for 14 days, no credit card', 'Start Trial', 'Free Trial'),
  ],
  ja: [
    CI('3ヶ月無料', '新規会員限定', '今すぐ登録でGeniegoROIプレミアムが3ヶ月無料', '無料で始める', '3ヶ月プラン'),
    CI('売上 +247%', 'データが証明する成長', 'GeniegoROI導入企業の平均売上成長率', '成果を見る', '売上成長'),
    CI('ROI分析', 'オールインワンSaaS', '全チャネルの広告成果を一元分析', '今すぐ分析', '統合分析'),
    CI('広告費 38%減', 'AI自動最適化', 'AIが低成果チャネルの予算を自動再配分', '削減を始める', '広告費削減'),
    CI('全チャネル統合', '一元管理', 'Meta・Google・TikTok・Naver・Kakao統合ダッシュボード', '統合を見る', '連携チャネル'),
    CI('AI自動キャンペーン', 'ワンクリック実行', 'AIが予算・チャネル・素材を自動設定・実行・最適化', 'AIをオン', 'AI実行'),
    CI('ROAS 3.8倍', '広告効率を最大化', '広告費の3.8倍の売上効率を達成', '効率を見る', 'ROAS'),
    CI('リアルタイム成果', '今この瞬間のKPI', '変化する成果をリアルタイムで把握', 'ダッシュボード', 'リアルタイム'),
    CI('データで決断', '勘に頼らない', '勘ではなくデータでマーケを決める', 'インサイト', '意思決定'),
    CI('14日間無料体験', 'カード不要で開始', 'クレカ登録なしで全機能を14日間体験', '体験を始める', '無料体験'),
  ],
  zh: [
    CI('三个月免费', '新会员专享', '立即注册即享GeniegoROI高级版三个月免费', '免费开始', '三个月套餐'),
    CI('营收 +247%', '数据见证增长', 'GeniegoROI客户平均营收增长率', '查看成效', '营收增长'),
    CI('ROI分析', '一体化营销SaaS', '一处精准分析全渠道广告成效', '立即分析', '整合分析'),
    CI('广告费降38%', 'AI自动优化', 'AI自动把低效渠道预算重新分配', '开始省钱', '广告费节省'),
    CI('全渠道整合', '一处管理', 'Meta·谷歌·TikTok·Naver·Kakao整合看板', '查看整合', '接入渠道'),
    CI('AI自动投放', '一键执行', 'AI自动设置·执行·优化预算渠道素材', '开启AI', 'AI执行'),
    CI('ROAS 3.8倍', '广告效率最大化', '实现广告费3.8倍的营收效率', '查看效率', 'ROAS'),
    CI('实时成效', '此刻的KPI', '实时掌握不断变化的营销成效', '打开看板', '实时追踪'),
    CI('数据决策', '告别凭感觉', '用数据而非直觉做营销决策', '获取洞察', '决策'),
    CI('14天免费试用', '无需信用卡', '无需信用卡，全功能试用14天', '开始试用', '免费试用'),
  ],
  'zh-TW': [
    CI('三個月免費', '新會員專享', '立即註冊即享GeniegoROI進階版三個月免費', '免費開始', '三個月方案'),
    CI('營收 +247%', '數據見證成長', 'GeniegoROI客戶平均營收成長率', '查看成效', '營收成長'),
    CI('ROI分析', '一體化行銷SaaS', '一處精準分析全通路廣告成效', '立即分析', '整合分析'),
    CI('廣告費降38%', 'AI自動最佳化', 'AI自動將低效通路預算重新分配', '開始省錢', '廣告費節省'),
    CI('全通路整合', '一處管理', 'Meta·Google·TikTok·Naver·Kakao整合儀表板', '查看整合', '串接通路'),
    CI('AI自動投放', '一鍵執行', 'AI自動設定·執行·優化預算通路素材', '開啟AI', 'AI執行'),
    CI('ROAS 3.8倍', '廣告效率最大化', '達成廣告費3.8倍的營收效率', '查看效率', 'ROAS'),
    CI('即時成效', '此刻的KPI', '即時掌握不斷變化的行銷成效', '開啟儀表板', '即時追蹤'),
    CI('數據決策', '告別憑感覺', '用數據而非直覺做行銷決策', '取得洞察', '決策'),
    CI('14天免費試用', '免信用卡', '免信用卡，全功能試用14天', '開始試用', '免費試用'),
  ],
  de: [
    CI('3 Monate gratis', 'Nur für Neukunden', 'Jetzt anmelden und GeniegoROI Premium 3 Monate gratis', 'Gratis starten', '3-Monats-Plan'),
    CI('Umsatz +247%', 'Durch Daten belegt', 'Durchschnittliches Umsatzwachstum der GeniegoROI-Kunden', 'Ergebnisse ansehen', 'Umsatzwachstum'),
    CI('ROI-Analyse', 'All-in-One Marketing-SaaS', 'Alle Kanäle an einem Ort analysieren', 'Jetzt analysieren', 'Gesamtansicht'),
    CI('Werbekosten −38%', 'KI-Optimierung', 'KI verteilt Budget schwacher Kanäle automatisch um', 'Sparen starten', 'Kostenersparnis'),
    CI('Alle Kanäle vereint', 'Zentral verwalten', 'Meta, Google, TikTok, Naver, Kakao im Dashboard', 'Vereint ansehen', 'Kanäle'),
    CI('KI-Auto-Kampagne', 'Ein Klick genügt', 'KI plant, startet und optimiert Budget, Kanäle, Creatives', 'KI aktivieren', 'KI-Lauf'),
    CI('ROAS 3,8x', 'Maximale Effizienz', '3,8-facher Umsatz je Werbe-Euro', 'Effizienz ansehen', 'ROAS'),
    CI('Echtzeit-KPIs', 'Leistung im Moment', 'Marketing-Ergebnisse in Echtzeit sehen', 'Dashboard öffnen', 'Live-Tracking'),
    CI('Datenbasiert', 'Schluss mit Raten', 'Mit Daten statt Bauchgefühl entscheiden', 'Insights holen', 'Entscheidungen'),
    CI('14 Tage gratis', 'Ohne Karte starten', 'Alle Funktionen 14 Tage testen, ohne Kreditkarte', 'Test starten', 'Gratis-Test'),
  ],
  th: [
    CI('ฟรี 3 เดือน', 'เฉพาะสมาชิกใหม่', 'สมัครตอนนี้รับ GeniegoROI พรีเมียมฟรี 3 เดือน', 'เริ่มฟรี', 'แผน 3 เดือน'),
    CI('รายได้ +247%', 'พิสูจน์ด้วยข้อมูล', 'อัตราเติบโตรายได้เฉลี่ยของลูกค้า GeniegoROI', 'ดูผลลัพธ์', 'การเติบโต'),
    CI('วิเคราะห์ ROI', 'มาร์เก็ตติ้ง SaaS ครบวงจร', 'วิเคราะห์ทุกช่องทางในที่เดียว', 'วิเคราะห์เลย', 'มุมมองรวม'),
    CI('ลดค่าโฆษณา 38%', 'AI ปรับอัตโนมัติ', 'AI จัดสรรงบช่องทางผลต่ำใหม่อัตโนมัติ', 'เริ่มประหยัด', 'ประหยัด'),
    CI('รวมทุกช่องทาง', 'จัดการที่เดียว', 'แดชบอร์ดรวม Meta·Google·TikTok·Naver·Kakao', 'ดูแบบรวม', 'ช่องทาง'),
    CI('แคมเปญอัตโนมัติ AI', 'รันด้วยคลิกเดียว', 'AI ตั้งค่า รัน และปรับงบ ช่องทาง ครีเอทีฟ', 'เปิด AI', 'รัน AI'),
    CI('ROAS 3.8 เท่า', 'เพิ่มประสิทธิภาพสูงสุด', 'ได้รายได้ 3.8 เท่าของค่าโฆษณา', 'ดูประสิทธิภาพ', 'ROAS'),
    CI('ผลเรียลไทม์', 'KPI ณ ขณะนี้', 'ดูผลการตลาดเปลี่ยนแบบเรียลไทม์', 'เปิดแดชบอร์ด', 'ติดตามสด'),
    CI('ตัดสินด้วยข้อมูล', 'เลิกเดา', 'ตัดสินใจการตลาดด้วยข้อมูล ไม่ใช่ความรู้สึก', 'รับอินไซต์', 'การตัดสินใจ'),
    CI('ทดลองฟรี 14 วัน', 'ไม่ต้องใช้บัตร', 'ทดลองทุกฟีเจอร์ 14 วัน ไม่ต้องใช้บัตร', 'เริ่มทดลอง', 'ทดลองฟรี'),
  ],
  vi: [
    CI('Miễn phí 3 tháng', 'Ưu đãi thành viên mới', 'Đăng ký ngay nhận GeniegoROI Premium miễn phí 3 tháng', 'Bắt đầu miễn phí', 'Gói 3 tháng'),
    CI('Doanh thu +247%', 'Dữ liệu chứng minh', 'Mức tăng doanh thu trung bình của khách hàng GeniegoROI', 'Xem kết quả', 'Tăng doanh thu'),
    CI('Phân tích ROI', 'SaaS marketing tất cả trong một', 'Phân tích mọi kênh quảng cáo ở một nơi', 'Phân tích ngay', 'Tổng hợp'),
    CI('Giảm 38% chi phí', 'AI tối ưu tự động', 'AI tự phân bổ lại ngân sách kênh kém hiệu quả', 'Bắt đầu tiết kiệm', 'Tiết kiệm'),
    CI('Hợp nhất mọi kênh', 'Quản lý một nơi', 'Bảng điều khiển Meta·Google·TikTok·Naver·Kakao', 'Xem hợp nhất', 'Kênh'),
    CI('Chiến dịch AI tự động', 'Chạy bằng một cú nhấp', 'AI tự đặt, chạy và tối ưu ngân sách, kênh, nội dung', 'Bật AI', 'Chạy AI'),
    CI('ROAS 3.8 lần', 'Tối đa hiệu quả', 'Đạt doanh thu gấp 3.8 lần chi phí quảng cáo', 'Xem hiệu quả', 'ROAS'),
    CI('Thời gian thực', 'KPI ngay lúc này', 'Xem kết quả marketing thay đổi theo thời gian thực', 'Mở bảng điều khiển', 'Theo dõi'),
    CI('Quyết định bằng dữ liệu', 'Đừng đoán nữa', 'Quyết định marketing bằng dữ liệu, không phải cảm tính', 'Nhận insight', 'Quyết định'),
    CI('Dùng thử 14 ngày', 'Không cần thẻ', 'Dùng thử mọi tính năng 14 ngày, không cần thẻ', 'Bắt đầu dùng thử', 'Dùng thử'),
  ],
  id: [
    CI('Gratis 3 Bulan', 'Khusus Anggota Baru', 'Daftar sekarang, GeniegoROI Premium gratis 3 bulan', 'Mulai Gratis', 'Paket 3 Bulan'),
    CI('Pendapatan +247%', 'Terbukti dari Data', 'Rata-rata pertumbuhan pendapatan klien GeniegoROI', 'Lihat Hasil', 'Pertumbuhan'),
    CI('Analisis ROI', 'SaaS Marketing All-in-One', 'Analisis performa semua kanal di satu tempat', 'Analisis Sekarang', 'Tampilan Terpadu'),
    CI('Biaya Iklan −38%', 'Optimasi Otomatis AI', 'AI mengalihkan anggaran kanal berkinerja rendah', 'Mulai Hemat', 'Penghematan'),
    CI('Semua Kanal Bersatu', 'Kelola di Satu Tempat', 'Dasbor terpadu Meta·Google·TikTok·Naver·Kakao', 'Lihat Terpadu', 'Kanal'),
    CI('Kampanye Otomatis AI', 'Jalankan Sekali Klik', 'AI mengatur, menjalankan, mengoptimalkan anggaran & materi', 'Aktifkan AI', 'Jalankan AI'),
    CI('ROAS 3,8x', 'Efisiensi Maksimal', 'Raih pendapatan 3,8x dari biaya iklan', 'Lihat Efisiensi', 'ROAS'),
    CI('Performa Real-Time', 'KPI Saat Ini', 'Lihat hasil marketing berubah real-time', 'Buka Dasbor', 'Pelacakan'),
    CI('Keputusan Data', 'Berhenti Menebak', 'Putuskan marketing dengan data, bukan firasat', 'Dapatkan Insight', 'Keputusan'),
    CI('Uji Coba 14 Hari', 'Tanpa Kartu', 'Coba semua fitur 14 hari, tanpa kartu kredit', 'Mulai Uji Coba', 'Uji Coba Gratis'),
  ],
  es: [
    CI('3 meses gratis', 'Solo nuevos usuarios', 'Regístrate y obtén GeniegoROI Premium gratis 3 meses', 'Empezar gratis', 'Plan 3 meses'),
    CI('Ingresos +247%', 'Probado con datos', 'Crecimiento medio de ingresos de clientes GeniegoROI', 'Ver resultados', 'Crecimiento'),
    CI('Análisis ROI', 'SaaS de marketing todo en uno', 'Analiza el rendimiento de todos los canales en un lugar', 'Analizar ahora', 'Vista unificada'),
    CI('Coste −38%', 'Optimización con IA', 'La IA redistribuye el presupuesto de canales flojos', 'Empezar a ahorrar', 'Ahorro'),
    CI('Todos los canales', 'Gestiona en un lugar', 'Panel unificado de Meta·Google·TikTok·Naver·Kakao', 'Ver unificado', 'Canales'),
    CI('Campaña IA automática', 'Lanza con un clic', 'La IA configura, ejecuta y optimiza presupuesto y creativos', 'Activar IA', 'Ejecución IA'),
    CI('ROAS 3,8x', 'Máxima eficiencia', 'Logra 3,8x de retorno por cada euro invertido', 'Ver eficiencia', 'ROAS'),
    CI('KPIs en tiempo real', 'El rendimiento ahora', 'Ve cambiar tus resultados en tiempo real', 'Abrir panel', 'Seguimiento'),
    CI('Decisiones con datos', 'Deja de adivinar', 'Decide tu marketing con datos, no con intuición', 'Obtener insights', 'Decisiones'),
    CI('Prueba 14 días', 'Sin tarjeta', 'Prueba todas las funciones 14 días, sin tarjeta', 'Empezar prueba', 'Prueba gratis'),
  ],
  fr: [
    CI('3 mois offerts', 'Nouveaux membres', 'Inscrivez-vous et profitez de GeniegoROI Premium 3 mois offerts', 'Commencer', 'Forfait 3 mois'),
    CI('Revenus +247%', 'Prouvé par les données', 'Croissance moyenne des revenus des clients GeniegoROI', 'Voir les résultats', 'Croissance'),
    CI('Analyse ROI', 'SaaS marketing tout-en-un', 'Analysez tous les canaux au même endroit', 'Analyser', 'Vue unifiée'),
    CI('Coût pub −38%', 'Optimisation IA', "L'IA réaffecte le budget des canaux peu performants", 'Économiser', 'Économies'),
    CI('Tous les canaux', 'Gérez en un lieu', 'Tableau de bord unifié Meta·Google·TikTok·Naver·Kakao', 'Voir unifié', 'Canaux'),
    CI('Campagne IA auto', 'Lancez en un clic', "L'IA configure, lance et optimise budget et créas", "Activer l'IA", 'Exécution IA'),
    CI('ROAS 3,8x', 'Efficacité maximale', '3,8x de retour pour chaque euro dépensé', "Voir l'efficacité", 'ROAS'),
    CI('KPI en temps réel', 'La performance maintenant', 'Voyez vos résultats évoluer en temps réel', 'Ouvrir le tableau', 'Suivi'),
    CI('Décisions data', 'Fini les suppositions', "Décidez avec des données, pas à l'instinct", 'Obtenir des insights', 'Décisions'),
    CI('Essai 14 jours', 'Sans carte', 'Essayez toutes les fonctions 14 jours, sans carte', "Démarrer l'essai", 'Essai gratuit'),
  ],
  pt: [
    CI('3 meses grátis', 'Só novos membros', 'Cadastre-se e ganhe GeniegoROI Premium 3 meses grátis', 'Começar grátis', 'Plano 3 meses'),
    CI('Receita +247%', 'Comprovado por dados', 'Crescimento médio de receita dos clientes GeniegoROI', 'Ver resultados', 'Crescimento'),
    CI('Análise de ROI', 'SaaS de marketing all-in-one', 'Analise o desempenho de todos os canais num só lugar', 'Analisar agora', 'Visão unificada'),
    CI('Custo −38%', 'Otimização com IA', 'A IA realoca o orçamento de canais de baixo desempenho', 'Começar a economizar', 'Economia'),
    CI('Todos os canais', 'Gerencie num só lugar', 'Painel unificado Meta·Google·TikTok·Naver·Kakao', 'Ver unificado', 'Canais'),
    CI('Campanha IA automática', 'Lance com um clique', 'A IA configura, executa e otimiza orçamento e criativos', 'Ativar IA', 'Execução IA'),
    CI('ROAS 3,8x', 'Eficiência máxima', 'Alcance 3,8x de retorno por real investido', 'Ver eficiência', 'ROAS'),
    CI('KPIs em tempo real', 'O desempenho agora', 'Veja seus resultados mudarem em tempo real', 'Abrir painel', 'Rastreamento'),
    CI('Decisões com dados', 'Pare de adivinhar', 'Decida seu marketing com dados, não no achismo', 'Obter insights', 'Decisões'),
    CI('Teste de 14 dias', 'Sem cartão', 'Teste todos os recursos 14 dias, sem cartão', 'Começar teste', 'Teste grátis'),
  ],
  ru: [
    CI('3 месяца бесплатно', 'Только для новых', 'Зарегистрируйтесь и получите GeniegoROI Premium на 3 месяца бесплатно', 'Начать бесплатно', 'Тариф 3 месяца'),
    CI('Выручка +247%', 'Доказано данными', 'Средний рост выручки клиентов GeniegoROI', 'Смотреть результаты', 'Рост выручки'),
    CI('ROI-аналитика', 'Маркетинговый SaaS всё в одном', 'Анализируйте все каналы в одном месте', 'Анализировать', 'Единый обзор'),
    CI('Расходы −38%', 'ИИ-оптимизация', 'ИИ перераспределяет бюджет слабых каналов', 'Начать экономить', 'Экономия'),
    CI('Все каналы вместе', 'Управляйте в одном месте', 'Единая панель Meta·Google·TikTok·Naver·Kakao', 'Смотреть', 'Каналы'),
    CI('Авто-кампания ИИ', 'Запуск в один клик', 'ИИ настраивает, запускает и оптимизирует бюджет и креативы', 'Включить ИИ', 'Запуск ИИ'),
    CI('ROAS 3,8x', 'Максимум эффективности', '3,8x возврата с каждого рубля на рекламу', 'Смотреть эффективность', 'ROAS'),
    CI('KPI в реальном времени', 'Результат сейчас', 'Смотрите, как меняются результаты в реальном времени', 'Открыть панель', 'Отслеживание'),
    CI('Решения на данных', 'Хватит гадать', 'Решайте маркетинг данными, а не интуицией', 'Получить инсайты', 'Решения'),
    CI('14 дней бесплатно', 'Без карты', 'Все функции 14 дней, без карты', 'Начать пробу', 'Бесплатно'),
  ],
  ar: [
    CI('3 أشهر مجانًا', 'حصري للأعضاء الجدد', 'سجّل الآن واحصل على GeniegoROI بريميوم مجانًا 3 أشهر', 'ابدأ مجانًا', 'خطة 3 أشهر'),
    CI('الإيرادات +247%', 'مثبت بالبيانات', 'متوسط نمو إيرادات عملاء GeniegoROI', 'شاهد النتائج', 'نمو الإيرادات'),
    CI('تحليل العائد', 'منصة تسويق متكاملة', 'حلّل أداء كل القنوات في مكان واحد', 'حلّل الآن', 'عرض موحّد'),
    CI('خفض التكلفة −38%', 'تحسين آلي بالذكاء', 'الذكاء يعيد توزيع ميزانية القنوات الضعيفة', 'ابدأ التوفير', 'توفير'),
    CI('توحيد كل القنوات', 'إدارة من مكان واحد', 'لوحة موحّدة Meta·Google·TikTok·Naver·Kakao', 'عرض موحّد', 'القنوات'),
    CI('حملة آلية بالذكاء', 'تشغيل بنقرة', 'الذكاء يضبط ويشغّل ويُحسّن الميزانية والمحتوى', 'فعّل الذكاء', 'تشغيل'),
    CI('ROAS 3.8 ضعف', 'أقصى كفاءة', 'حقّق 3.8 ضعف العائد على إنفاقك الإعلاني', 'شاهد الكفاءة', 'ROAS'),
    CI('أداء فوري', 'مؤشرات اللحظة', 'شاهد نتائج تسويقك تتغير فوريًا', 'افتح اللوحة', 'تتبع مباشر'),
    CI('قرارات بالبيانات', 'لا مزيد من التخمين', 'قرّر تسويقك بالبيانات لا بالحدس', 'احصل على رؤى', 'قرارات'),
    CI('تجربة 14 يومًا', 'بدون بطاقة', 'جرّب كل المزايا 14 يومًا بدون بطاقة', 'ابدأ التجربة', 'تجربة مجانية'),
  ],
  hi: [
    CI('3 महीने मुफ्त', 'नए सदस्यों के लिए', 'अभी जुड़ें और GeniegoROI प्रीमियम 3 महीने मुफ्त पाएं', 'मुफ्त शुरू करें', '3-महीने प्लान'),
    CI('आय +247%', 'डेटा से प्रमाणित', 'GeniegoROI ग्राहकों की औसत आय वृद्धि', 'नतीजे देखें', 'आय वृद्धि'),
    CI('ROI विश्लेषण', 'ऑल-इन-वन मार्केटिंग SaaS', 'हर चैनल का प्रदर्शन एक जगह विश्लेषण करें', 'अभी विश्लेषण करें', 'एकीकृत दृश्य'),
    CI('विज्ञापन खर्च −38%', 'AI स्वतः अनुकूलन', 'AI कमज़ोर चैनलों का बजट स्वतः पुनः आवंटित करता है', 'बचत शुरू करें', 'बचत'),
    CI('सभी चैनल एक साथ', 'एक जगह प्रबंधन', 'Meta·Google·TikTok·Naver·Kakao एकीकृत डैशबोर्ड', 'एकीकृत देखें', 'चैनल'),
    CI('AI स्वतः कैम्पेन', 'एक क्लिक में लॉन्च', 'AI बजट, चैनल, क्रिएटिव सेट, रन और ऑप्टिमाइज़ करता है', 'AI चालू करें', 'AI रन'),
    CI('ROAS 3.8x', 'अधिकतम दक्षता', 'हर खर्च पर 3.8 गुना रिटर्न पाएं', 'दक्षता देखें', 'ROAS'),
    CI('रीयल-टाइम KPI', 'इस पल का प्रदर्शन', 'अपने नतीजे रीयल-टाइम में बदलते देखें', 'डैशबोर्ड खोलें', 'लाइव ट्रैकिंग'),
    CI('डेटा से निर्णय', 'अब अनुमान नहीं', 'अंदाज़े से नहीं, डेटा से मार्केटिंग तय करें', 'इनसाइट पाएं', 'निर्णय'),
    CI('14-दिन मुफ्त ट्रायल', 'बिना कार्ड', 'सभी फीचर 14 दिन आज़माएं, बिना कार्ड', 'ट्रायल शुरू करें', 'मुफ्त ट्रायल'),
  ],
};

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONT = "Pretendard,'Apple SD Gothic Neo','Noto Sans KR',sans-serif";
const advance = (s) => [...String(s)].reduce((w, ch) => w + (/[\x00-\xff]/.test(ch) ? 0.56 : 1.0), 0);
const fit = (s, maxW, maxSize) => Math.max(26, Math.min(maxSize, Math.floor(maxW / Math.max(advance(s), 0.6))));
const spark = (vals, w, h, color, sw = 3) => {
  const mx = Math.max(...vals), mn = Math.min(...vals);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(h - (v - mn) / ((mx - mn) || 1) * h).toFixed(1)}`).join(' ');
  return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
};

/* ── 공통 defs (명도 적응: 밝은 배경은 글로우·비네트 약화) ── */
function defs(p, id) {
  const L = isLight(p.bg);
  const ink = inkOn(p.bg);
  const goldHi = lighten(p.accent, L ? 0.32 : 0.55), goldLo = darken(p.accent, 0.2);
  const glow1 = L ? 0.26 : 0.6, glow2 = L ? 0.05 : 0.12;
  const vigEnd = L ? 0.12 : 0.5;
  return `<defs>
  <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L ? lighten(p.bg, 0.5) : lighten(p.bg, 0.05)}"/><stop offset="0.55" stop-color="${p.bg}"/><stop offset="1" stop-color="${L ? darken(p.bg, 0.06) : darken(p.bg, 0.45)}"/></linearGradient>
  <radialGradient id="glow${id}" cx="0.82" cy="0.14" r="0.95"><stop offset="0" stop-color="${p.primary}" stop-opacity="${glow1}"/><stop offset="0.45" stop-color="${p.primary}" stop-opacity="${glow2}"/><stop offset="1" stop-color="${p.primary}" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig${id}" cx="0.5" cy="0.46" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${vigEnd}"/></radialGradient>
  <linearGradient id="gold${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${goldHi}"/><stop offset="0.45" stop-color="${p.accent}"/><stop offset="1" stop-color="${goldLo}"/></linearGradient>
  <linearGradient id="cta${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${goldHi}"/></linearGradient>
  <linearGradient id="sheen${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="area${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.42"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></linearGradient>
  <linearGradient id="scrim${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg}" stop-opacity="0"/><stop offset="0.7" stop-color="${p.bg}" stop-opacity="0.85"/><stop offset="1" stop-color="${L ? p.bg : darken(p.bg, 0.3)}" stop-opacity="0.96"/></linearGradient>
  <radialGradient id="blobA${id}"><stop offset="0" stop-color="${lighten(p.accent, 0.1)}" stop-opacity="${L ? 0.5 : 0.85}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
  <radialGradient id="blobP${id}"><stop offset="0" stop-color="${lighten(p.primary, 0.25)}" stop-opacity="${L ? 0.45 : 0.8}"/><stop offset="1" stop-color="${p.primary}" stop-opacity="0"/></radialGradient>
  <filter id="soft${id}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="20" flood-color="#000" flood-opacity="${L ? 0.16 : 0.5}"/></filter>
  <filter id="grain${id}"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="${L ? 0.03 : 0.045}"/></feComponentTransfer></filter>
  </defs>`;
}
const bgLayers = (p, id) => {
  const ink = inkOn(p.bg);
  let grid = `<g stroke="${ink}" stroke-opacity="0.045" stroke-width="1">`;
  for (let x = 180; x < 1080; x += 180) grid += `<line x1="${x}" y1="0" x2="${x}" y2="1080"/>`;
  grid += `</g>`;
  return `<rect width="1080" height="1080" fill="url(#bg${id})"/><rect width="1080" height="1080" fill="url(#glow${id})"/>${grid}`;
};
const finishLayers = (id) => `<rect width="1080" height="1080" filter="url(#grain${id})" opacity="0.55"/><rect width="1080" height="1080" fill="url(#vig${id})"/>`;
const header = (p, id, idx, kicker) => { const ink = inkOn(p.bg); return `<g font-family="${FONT}">
  <text x="90" y="140" font-size="30" font-weight="800" letter-spacing="7" fill="${ink}" fill-opacity="0.95">GENIEGO<tspan fill="${p.accent}">ROI</tspan></text>
  <text x="990" y="140" font-size="20" font-weight="600" letter-spacing="3" fill="${ink}" fill-opacity="0.55" text-anchor="end">№${idx} · ${kicker}</text>
  <line x1="90" y1="172" x2="990" y2="172" stroke="${ink}" stroke-opacity="0.16" stroke-width="1.5"/></g>`; };
const ctaPill = (p, c, id, x, y, anim) => {
  const w = Math.round(advance(c.cta) * 36 + 168);
  const onAccent = inkOn(p.accent); // CTA 글자색 = accent 명도 대비
  return `<g filter="url(#soft${id})" transform="translate(${x},${y})" font-family="${FONT}">
  <rect width="${w}" height="100" rx="50" fill="url(#cta${id})">${anim ? '<animate attributeName="opacity" values="1;0.86;1" dur="2.6s" repeatCount="indefinite"/>' : ''}</rect>
  <rect x="3" y="3" width="${w - 6}" height="46" rx="47" fill="url(#sheen${id})"/>
  <text x="50" y="62" font-size="36" font-weight="800" letter-spacing="0.5" fill="${onAccent}">${esc(c.cta)}</text>
  <circle cx="${w - 54}" cy="50" r="27" fill="${onAccent}" fill-opacity="0.16"/>
  <text x="${w - 54}" y="63" font-size="30" font-weight="800" fill="${onAccent}" text-anchor="middle">→${anim ? '<animate attributeName="dx" values="0;7;0" dur="1.6s" repeatCount="indefinite"/>' : ''}</text></g>`;
};
const metricCard = (p, c, id, x, y) => {
  const ink = inkOn(p.bg); const ms = fit(c.metric, 230, 88);
  return `<g transform="translate(${x},${y})" font-family="${FONT}">
  <rect width="300" height="200" rx="26" fill="${ink}" fill-opacity="0.06" stroke="${p.accent}" stroke-opacity="0.3" stroke-width="1.5"/>
  <rect x="0" y="0" width="300" height="60" rx="26" fill="${p.accent}" fill-opacity="0.06"/>
  <text x="30" y="${34 + ms * 0.72}" font-size="${ms}" font-weight="900" fill="url(#gold${id})">${esc(c.metric)}</text>
  <text x="30" y="150" font-size="22" font-weight="600" letter-spacing="0.5" fill="${ink}" opacity="0.7">${esc(c.metricLabel)}</text>
  <g transform="translate(30,162)">${spark([28, 44, 39, 66, 58, 84, 100], 240, 30, p.accent, 3)}</g></g>`;
};

/* ── 1) 정적/애니메이션 — 에디토리얼 ── */
function svgEditorial(p, c, id, anim) {
  const ink = inkOn(p.bg);
  const hs = fit(c.headline, 880, 158);
  const chipW = Math.round(advance(c.subheadline) * 25 + 96);
  const A = (s) => (anim ? s : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" font-family="${FONT}">${defs(p, id)}
  ${bgLayers(p, id)}
  <text x="1052" y="498" font-size="340" font-weight="900" fill="${p.accent}" fill-opacity="0.06" text-anchor="end" font-family="${FONT}">${esc(c.metric)}</text>
  <g transform="translate(892,150)" fill="none" stroke="url(#gold${id})">
    <circle r="150" stroke-width="1.5" stroke-opacity="0.45">${A('<animate attributeName="r" values="150;163;150" dur="7s" repeatCount="indefinite"/>')}</circle>
    <circle r="212" stroke-width="1" stroke-opacity="0.24"/>
    <circle r="280" stroke-width="0.75" stroke-opacity="0.13"/></g>
  ${header(p, id, '01', 'CAMPAIGN')}
  <g${A(' opacity="0"')}>${A('<animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.15s" fill="freeze"/>')}
    <rect x="90" y="300" width="${chipW}" height="56" rx="28" fill="${p.accent}" fill-opacity="0.1" stroke="${p.accent}" stroke-opacity="0.5" stroke-width="1.5"/>
    <circle cx="124" cy="328" r="5" fill="${p.accent}"/>
    <text x="148" y="337" font-size="25" font-weight="700" letter-spacing="0.5" fill="${p.accent}">${esc(c.subheadline)}</text></g>
  <text x="86" y="540" font-size="${hs}" font-weight="900" letter-spacing="-3" fill="${ink}" filter="url(#soft${id})">${esc(c.headline)}${A('<animate attributeName="x" from="54" to="86" dur="0.6s" begin="0.3s" fill="freeze"/><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.3s" fill="freeze"/>')}</text>
  <rect x="90" y="580" width="120" height="6" rx="3" fill="url(#gold${id})"/>
  <text x="90" y="662" font-size="${fit(c.body, 880, 34)}" font-weight="500" fill="${ink}" opacity="0.84">${esc(c.body)}</text>
  ${ctaPill(p, c, id, 90, 902, anim)}
  ${metricCard(p, c, id, 690, 878)}
  ${finishLayers(id)}
  </svg>`;
}

/* ── 2) 그래프 — 데이터 에디토리얼 ── */
function svgChart(p, c, id) {
  const ink = inkOn(p.bg);
  const data = [40, 53, 60, 73, 86, 100], years = [2020, 2021, 2022, 2023, 2024, 2025];
  const X0 = 120, X1 = 980, Y0 = 870, Y1 = 500, n = data.length;
  const px = (i) => (X0 + (X1 - X0) * i / (n - 1)), py = (v) => (Y0 - (Y0 - Y1) * v / 100);
  const linePts = data.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const areaPts = `${X0},${Y0} ${linePts} ${X1},${Y0}`;
  const grid = [0, 25, 50, 75, 100].map(v => `<line x1="${X0}" y1="${py(v).toFixed(1)}" x2="${X1}" y2="${py(v).toFixed(1)}" stroke="${ink}" stroke-opacity="0.08" stroke-width="1"/><text x="${X0 - 16}" y="${(py(v) + 7).toFixed(1)}" font-size="18" fill="${ink}" opacity="0.4" text-anchor="end">${v}</text>`).join('');
  const dots = data.map((v, i) => { const last = i === n - 1; return `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="${last ? 13 : 6}" fill="${last ? `url(#gold${id})` : p.bg}" stroke="${p.accent}" stroke-width="3"><animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${(0.7 + i * 0.12).toFixed(2)}s" fill="freeze"/>${last ? `<animate attributeName="r" values="13;18;13" dur="2.2s" begin="1.6s" repeatCount="indefinite"/>` : ''}</circle>`; }).join('');
  const yearLbl = years.map((yr, i) => `<text x="${px(i).toFixed(1)}" y="912" font-size="22" fill="${ink}" opacity="0.55" text-anchor="middle">${yr}</text>`).join('');
  const calloutX = Math.min(px(n - 1) - 90, 790);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" font-family="${FONT}">${defs(p, id)}
  ${bgLayers(p, id)}
  ${header(p, id, '02', 'GROWTH REPORT')}
  <text x="148" y="280" font-size="24" font-weight="700" letter-spacing="0.5" fill="${p.accent}">${esc(c.subheadline)}</text>
  <circle cx="120" cy="272" r="5" fill="${p.accent}"/>
  <text x="90" y="385" font-size="${fit(c.headline, 880, 116)}" font-weight="900" letter-spacing="-2" fill="${ink}">${esc(c.headline)}</text>
  <text x="92" y="445" font-size="${fit(c.body, 880, 30)}" fill="${ink}" opacity="0.8">${esc(c.body)}</text>
  ${grid}
  <line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" stroke="${ink}" stroke-opacity="0.3" stroke-width="2"/>
  <polygon points="${areaPts}" fill="url(#area${id})" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="0.5s" fill="freeze"/></polygon>
  <polyline points="${linePts}" fill="none" stroke="url(#gold${id})" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#soft${id})" stroke-dasharray="2600" stroke-dashoffset="2600"><animate attributeName="stroke-dashoffset" from="2600" to="0" dur="1.4s" begin="0.2s" fill="freeze"/></polyline>
  ${dots}${yearLbl}
  <g transform="translate(${calloutX.toFixed(0)},${(py(100) - 118).toFixed(0)})">
    <rect width="200" height="86" rx="16" fill="${p.bg}" fill-opacity="0.82" stroke="${p.accent}" stroke-opacity="0.45" stroke-width="1.5"/>
    <text x="22" y="44" font-size="${fit(c.metric, 150, 42)}" font-weight="900" fill="url(#gold${id})">${esc(c.metric)}</text>
    <text x="22" y="70" font-size="18" fill="${ink}" opacity="0.75">▲ ${esc(c.metricLabel)}</text></g>
  ${ctaPill(p, c, id, 90, 968, false)}
  ${finishLayers(id)}
  </svg>`;
}

/* ── 3) 일러스트 — 추상 프리미엄 커버 ── */
function svgIllust(p, c, id) {
  const ink = inkOn(p.bg);
  const L = isLight(p.bg);
  const hs = fit(c.headline, 880, 150);
  const chipW = Math.round(advance(c.subheadline) * 25 + 96);
  let dots = '';
  for (let i = 0; i < 46; i++) { const x = (i * 137 + 40) % 1060 + 10; const y = (i * 211 + 70) % 540 + 30; const r = (i % 3) + 1; const o = (0.12 + (i % 4) * 0.08).toFixed(2); dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.accent}" opacity="${o}"><animate attributeName="opacity" values="${o};${(parseFloat(o) + 0.18).toFixed(2)};${o}" dur="${3 + (i % 5)}s" repeatCount="indefinite"/></circle>`; }
  const ribbon = (d, w, op, dur, dy) => `<path d="${d}" fill="none" stroke="url(#gold${id})" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0 0;0 ${dy};0 0" dur="${dur}s" repeatCount="indefinite"/></path>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" font-family="${FONT}">${defs(p, id)}
  ${bgLayers(p, id)}
  <g>
    <ellipse cx="780" cy="300" rx="430" ry="430" fill="url(#blobP${id})"><animate attributeName="rx" values="430;470;430" dur="9s" repeatCount="indefinite"/></ellipse>
    <ellipse cx="270" cy="200" rx="320" ry="320" fill="url(#blobA${id})" opacity="${L ? 0.55 : 0.7}"><animate attributeName="ry" values="320;360;320" dur="11s" repeatCount="indefinite"/></ellipse>
    <ellipse cx="940" cy="640" rx="280" ry="280" fill="url(#blobA${id})" opacity="${L ? 0.4 : 0.5}"/></g>
  <g transform="translate(760,300)" fill="none" stroke="${p.accent}" stroke-opacity="0.22">
    <circle r="120" stroke-width="1.5"/><circle r="200" stroke-width="1"/><circle r="300" stroke-width="0.75" stroke-opacity="0.12"/></g>
  ${ribbon('M-60,560 C 240,400 480,720 760,520 S 1180,440 1200,460', 3, 0.55, 12, 18)}
  ${ribbon('M-60,650 C 260,520 520,820 820,600 S 1180,560 1200,580', 2, 0.32, 16, -14)}
  ${ribbon('M-60,470 C 200,360 460,560 720,420 S 1140,360 1200,380', 1.5, 0.2, 20, 12)}
  ${dots}
  <rect x="0" y="540" width="1080" height="540" fill="url(#scrim${id})"/>
  ${header(p, id, '03', 'BRAND STUDIO')}
  <g transform="translate(0,80)">
    <rect x="90" y="600" width="${chipW}" height="56" rx="28" fill="${p.accent}" fill-opacity="0.1" stroke="${p.accent}" stroke-opacity="0.5" stroke-width="1.5"/>
    <circle cx="124" cy="628" r="5" fill="${p.accent}"/>
    <text x="148" y="637" font-size="25" font-weight="700" letter-spacing="0.5" fill="${p.accent}">${esc(c.subheadline)}</text>
    <text x="86" y="800" font-size="${hs}" font-weight="900" letter-spacing="-3" fill="${ink}" filter="url(#soft${id})">${esc(c.headline)}</text>
    <rect x="90" y="838" width="120" height="6" rx="3" fill="url(#gold${id})"/>
    <text x="90" y="906" font-size="${fit(c.body, 880, 32)}" font-weight="500" fill="${ink}" opacity="0.84">${esc(c.body)}</text></g>
  ${ctaPill(p, c, id, 90, 980, false)}
  ${finishLayers(id)}
  </svg>`;
}

function buildDesign(p, c, mood, renderType) {
  return {
    channel: 'instagram', ratio: '1:1', mood,
    headline: c.headline, subheadline: c.subheadline, body: c.body, cta: c.cta,
    hashtags: ['#GeniegoROI', '#MarketingROI', '#AdAnalytics'],
    palette: { bg: p.bg, primary: p.primary, accent: p.accent, text: inkOn(p.bg) },
    image_prompt: c.img + ', premium editorial advertising background, cinematic lighting, magazine quality, no text',
    render_type: renderType,
  };
}

const TYPES = [
  { cat: 'static', label: '✨ 정적', mood: '럭셔리', gen: (p, c, i) => svgEditorial(p, c, i, false), rt: 'svg' },
  { cat: 'animated', label: '🎬 애니메이션', mood: '역동적', gen: (p, c, i) => svgEditorial(p, c, i, true), rt: 'animated' },
  { cat: 'chart', label: '📊 그래프', mood: '신뢰감', gen: (p, c, i) => svgChart(p, c, i), rt: 'chart' },
  { cat: 'illust', label: '🎨 일러스트', mood: '모던', gen: (p, c, i) => svgIllust(p, c, i), rt: 'svg' },
];

export const SAMPLE_CATEGORIES = TYPES.map(t => ({ cat: t.cat, label: t.label }));

/** 접속 언어(lang) 기반 샘플 생성 — 현지 자연어 카피 + 명도 적응형 비주얼. */
export function buildSamples(lang) {
  const C = CONTENT_I18N[lang] || CONTENT_I18N.en;
  return TYPES.flatMap((t) =>
    PALETTES.map((p, i) => {
      const ci = i % C.length;
      const item = { ...C[ci], metric: METRICS[ci], img: IMGS[ci] };
      const id = `${t.cat[0]}${i}`;
      return {
        id: `${t.cat}-${i + 1}`,
        category: t.cat,
        categoryLabel: t.label,
        light: isLight(p.bg),
        name: item.headline,
        design: buildDesign(p, item, t.mood, t.rt),
        svg: t.gen(p, item, id),
        render_type: t.rt,
      };
    })
  );
}

// 호환용 기본(한국어) — 동적 사용처는 buildSamples(lang) 권장
export const AI_DESIGN_SAMPLES = buildSamples('ko');
