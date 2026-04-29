/**
 * Part 1: Inject missing guide keys into marketing namespace for all locales
 */
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, 'src/i18n/locales');

// Full translations for guide keys per language
const T = {
ja: {
  gf1Title:'ログイン & 環境確認',gf1Desc:'プラットフォームにログインし、サイドバーの「AIマーケティング自動化戦略」メニューをクリックします。',
  gf2Title:'APIチャネル連動',gf2Desc:'統合ハブでMeta、Google、NaverなどのAPIキーを登録します。',
  gf3Title:'ダッシュボード確認',gf3Desc:'メインダッシュボードで現在のKPI状況を把握します。',
  gf4Title:'月間予算設定',gf4Desc:'プリセットボタンまたは直接入力で月間広告予算を設定します。',
  gf5Title:'商品カテゴリ選択',gf5Desc:'ビューティー、ファッション、食品など対象カテゴリを選択します。',
  gf6Title:'広告チャネル選択',gf6Desc:'AI推奨または手動でMeta、TikTok、Googleなどを選択します。',
  gf7Title:'ターゲット設定',gf7Desc:'キャンペーン期間とターゲットオーディエンスを設定します。',
  gf8Title:'AIシミュレーション実行',gf8Desc:'「AI戦略生成」ボタンでチャネル別予算配分を自動計算します。',
  gf9Title:'クリエイティブ制作',gf9Desc:'クリエイティブスタジオでAI広告素材を生成します。',
  gf10Title:'プレビュー確認',gf10Desc:'AI戦略プレビュータブで予測KPIと配分結果を確認します。',
  gf11Title:'承認 & 提出',gf11Desc:'管理者承認モーダルで最終確認後、キャンペーンを提出します。',
  gf12Title:'モニタリング',gf12Desc:'キャンペーンマネージャーでリアルタイムパフォーマンスを追跡します。',
  gf13Title:'最適化調整',gf13Desc:'チャネル別予算スライダーで配分を微調整します。',
  gf14Title:'レポート確認',gf14Desc:'Rollupダッシュボードで全体ROI/ROASレポートを確認します。',
  gf15Title:'完了 & 次のサイクル',gf15Desc:'キャンペーン終了後、データを分析し次の戦略に反映します。',
  guidePhaseA:'Phase A — 準備',guidePhaseB:'Phase B — キャンペーン設計',
  guidePhaseC:'Phase C — AI戦略 & 素材生成',guidePhaseD:'Phase D — 実行 & モニタリング',
  guidePhaseE:'Phase E — 最適化 & 完了',
  guideFullTitle:'📋 最初から最後まで — 完全ガイド',guideFullSub:'AIマーケティング自動化プラットフォームの全ワークフローをステップごとにご案内します。',
  guideTabCreativeName:'クリエイティブスタジオ',guideTabCreativeDesc:'AI広告素材の生成・管理・マルチフォーマットエクスポート',
},
de: {
  gf1Title:'Login & Umgebungsprüfung',gf1Desc:'Melden Sie sich an und navigieren Sie zum Menü „KI-Marketing-Automatisierung" in der Seitenleiste.',
  gf2Title:'API-Kanäle verbinden',gf2Desc:'Registrieren Sie API-Schlüssel für Meta, Google, Naver im Integration Hub.',
  gf3Title:'Dashboard prüfen',gf3Desc:'Überprüfen Sie die aktuellen KPI-Werte im Haupt-Dashboard.',
  gf4Title:'Monatsbudget festlegen',gf4Desc:'Legen Sie das monatliche Werbebudget über Preset-Buttons oder Direkteingabe fest.',
  gf5Title:'Produktkategorie wählen',gf5Desc:'Wählen Sie Zielkategorien wie Beauty, Mode, Lebensmittel usw.',
  gf6Title:'Werbekanäle wählen',gf6Desc:'Wählen Sie per KI-Empfehlung oder manuell Meta, TikTok, Google usw.',
  gf7Title:'Zielgruppe festlegen',gf7Desc:'Legen Sie Kampagnenzeitraum und Zielgruppe fest.',
  gf8Title:'KI-Simulation starten',gf8Desc:'Klicken Sie auf „KI-Strategie generieren" für automatische Budgetverteilung.',
  gf9Title:'Kreativ-Erstellung',gf9Desc:'Erstellen Sie KI-Werbematerialien im Creative Studio.',
  gf10Title:'Vorschau prüfen',gf10Desc:'Überprüfen Sie prognostizierte KPIs und Verteilungsergebnisse im Vorschau-Tab.',
  gf11Title:'Genehmigung & Einreichung',gf11Desc:'Bestätigen Sie im Manager-Genehmigungsmodal und reichen Sie die Kampagne ein.',
  gf12Title:'Monitoring',gf12Desc:'Verfolgen Sie die Echtzeit-Performance im Kampagnenmanager.',
  gf13Title:'Optimierungsanpassung',gf13Desc:'Passen Sie die Budgetverteilung pro Kanal mit Schiebereglern an.',
  gf14Title:'Bericht prüfen',gf14Desc:'Überprüfen Sie den Gesamt-ROI/ROAS-Bericht im Rollup-Dashboard.',
  gf15Title:'Abschluss & nächster Zyklus',gf15Desc:'Analysieren Sie die Daten nach Kampagnenende und nutzen Sie sie für die nächste Strategie.',
  guidePhaseA:'Phase A — Erste Schritte',guidePhaseB:'Phase B — Kampagnendesign',
  guidePhaseC:'Phase C — KI-Strategie & Kreativ',guidePhaseD:'Phase D — Ausführung & Monitoring',
  guidePhaseE:'Phase E — Optimierung & Abschluss',
  guideFullTitle:'📋 Von Anfang bis Ende — Vollständiger Leitfaden',guideFullSub:'Schritt-für-Schritt-Anleitung zum gesamten Workflow der KI-Marketing-Automatisierung.',
  guideTabCreativeName:'Creative Studio',guideTabCreativeDesc:'KI-Werbematerial erstellen, verwalten und in mehreren Formaten exportieren',
},
es: {
  gf1Title:'Inicio de sesión & Verificación',gf1Desc:'Inicie sesión y navegue al menú "Automatización de Marketing IA" en la barra lateral.',
  gf2Title:'Conectar Canales API',gf2Desc:'Registre claves API para Meta, Google, Naver en el Hub de Integración.',
  gf3Title:'Verificar Dashboard',gf3Desc:'Revise los KPI actuales en el dashboard principal.',
  gf4Title:'Configurar Presupuesto Mensual',gf4Desc:'Configure el presupuesto publicitario mensual con botones preestablecidos o entrada directa.',
  gf5Title:'Seleccionar Categoría',gf5Desc:'Seleccione categorías objetivo como Belleza, Moda, Alimentos, etc.',
  gf6Title:'Seleccionar Canales',gf6Desc:'Seleccione Meta, TikTok, Google, etc. por recomendación IA o manualmente.',
  gf7Title:'Configurar Audiencia',gf7Desc:'Configure el período de campaña y la audiencia objetivo.',
  gf8Title:'Ejecutar Simulación IA',gf8Desc:'Haga clic en "Generar Estrategia IA" para la distribución automática del presupuesto.',
  gf9Title:'Crear Creativos',gf9Desc:'Genere materiales publicitarios con IA en el Creative Studio.',
  gf10Title:'Revisar Vista Previa',gf10Desc:'Revise los KPI previstos y los resultados de distribución en la pestaña de vista previa.',
  gf11Title:'Aprobación & Envío',gf11Desc:'Confirme en el modal de aprobación del gerente y envíe la campaña.',
  gf12Title:'Monitoreo',gf12Desc:'Rastree el rendimiento en tiempo real en el Gestor de Campañas.',
  gf13Title:'Ajuste de Optimización',gf13Desc:'Ajuste la distribución del presupuesto por canal con controles deslizantes.',
  gf14Title:'Revisar Informe',gf14Desc:'Revise el informe general de ROI/ROAS en el dashboard Rollup.',
  gf15Title:'Completado & Siguiente Ciclo',gf15Desc:'Analice los datos después de la campaña y aplíquelos a la siguiente estrategia.',
  guidePhaseA:'Phase A — Preparación',guidePhaseB:'Phase B — Diseño de Campaña',
  guidePhaseC:'Phase C — Estrategia IA & Creativos',guidePhaseD:'Phase D — Ejecución & Monitoreo',
  guidePhaseE:'Phase E — Optimización & Cierre',
  guideFullTitle:'📋 De Inicio a Fin — Guía Completa',guideFullSub:'Guía paso a paso del flujo completo de la plataforma de automatización de marketing IA.',
  guideTabCreativeName:'Creative Studio',guideTabCreativeDesc:'Generar, gestionar y exportar materiales publicitarios IA en múltiples formatos',
},
fr: {
  gf1Title:'Connexion & Vérification',gf1Desc:'Connectez-vous et naviguez vers "Marketing IA — Stratégie Auto" dans la barre latérale.',
  gf2Title:'Connecter les Canaux API',gf2Desc:"Enregistrez les clés API pour Meta, Google, Naver dans le Hub d'Intégration.",
  gf3Title:'Vérifier le Dashboard',gf3Desc:'Consultez les KPI actuels dans le dashboard principal.',
  gf4Title:'Définir le Budget Mensuel',gf4Desc:'Configurez le budget publicitaire mensuel via les boutons prédéfinis ou la saisie directe.',
  gf5Title:'Sélectionner les Catégories',gf5Desc:'Sélectionnez les catégories cibles : Beauté, Mode, Alimentation, etc.',
  gf6Title:'Sélectionner les Canaux',gf6Desc:'Sélectionnez Meta, TikTok, Google par recommandation IA ou manuellement.',
  gf7Title:"Définir l'Audience",gf7Desc:'Configurez la période de campagne et le public cible.',
  gf8Title:'Lancer la Simulation IA',gf8Desc:'Cliquez sur "Générer Stratégie IA" pour la répartition automatique du budget.',
  gf9Title:'Créer les Visuels',gf9Desc:'Générez des visuels publicitaires IA dans le Creative Studio.',
  gf10Title:"Vérifier l'Aperçu",gf10Desc:"Consultez les KPI prévus et les résultats de répartition dans l'onglet aperçu.",
  gf11Title:'Approbation & Soumission',gf11Desc:'Confirmez dans le modal de validation managériale et soumettez la campagne.',
  gf12Title:'Suivi',gf12Desc:'Suivez la performance en temps réel dans le Gestionnaire de Campagnes.',
  gf13Title:"Ajustement d'Optimisation",gf13Desc:'Ajustez la répartition du budget par canal avec les curseurs.',
  gf14Title:'Consulter le Rapport',gf14Desc:'Consultez le rapport ROI/ROAS global dans le dashboard Rollup.',
  gf15Title:'Terminé & Prochain Cycle',gf15Desc:'Analysez les données post-campagne et intégrez-les dans la stratégie suivante.',
  guidePhaseA:'Phase A — Préparation',guidePhaseB:'Phase B — Conception de Campagne',
  guidePhaseC:'Phase C — Stratégie IA & Créatifs',guidePhaseD:'Phase D — Exécution & Suivi',
  guidePhaseE:'Phase E — Optimisation & Clôture',
  guideFullTitle:'📋 Guide Complet — Du Début à la Fin',guideFullSub:"Guide étape par étape du flux complet de la plateforme.",
  guideTabCreativeName:'Creative Studio',guideTabCreativeDesc:'Générer, gérer et exporter des visuels IA en multi-formats',
},
th: {
  gf1Title:'เข้าสู่ระบบ & ตรวจสอบ',gf1Desc:'เข้าสู่ระบบและไปที่เมนู "AI Marketing Automation" ในแถบด้านข้าง',
  gf2Title:'เชื่อมต่อช่อง API',gf2Desc:'ลงทะเบียน API Key สำหรับ Meta, Google, Naver ใน Integration Hub',
  gf3Title:'ตรวจสอบ Dashboard',gf3Desc:'ตรวจสอบสถานะ KPI ปัจจุบันใน Dashboard หลัก',
  gf4Title:'ตั้งงบประมาณรายเดือน',gf4Desc:'ตั้งงบโฆษณารายเดือนผ่านปุ่มพรีเซ็ตหรือป้อนเอง',
  gf5Title:'เลือกหมวดหมู่สินค้า',gf5Desc:'เลือกหมวดเป้าหมาย เช่น ความงาม แฟชั่น อาหาร ฯลฯ',
  gf6Title:'เลือกช่องโฆษณา',gf6Desc:'เลือก Meta, TikTok, Google ตาม AI แนะนำ หรือเลือกเอง',
  gf7Title:'ตั้งค่ากลุ่มเป้าหมาย',gf7Desc:'กำหนดช่วงเวลาแคมเปญและกลุ่มเป้าหมาย',
  gf8Title:'รัน AI Simulation',gf8Desc:'คลิก "สร้างกลยุทธ์ AI" เพื่อจัดสรรงบอัตโนมัติ',
  gf9Title:'สร้างครีเอทีฟ',gf9Desc:'สร้างสื่อโฆษณา AI ใน Creative Studio',
  gf10Title:'ตรวจสอบพรีวิว',gf10Desc:'ตรวจสอบ KPI ที่คาดการณ์และผลการจัดสรรในแท็บพรีวิว',
  gf11Title:'อนุมัติ & ส่ง',gf11Desc:'ยืนยันใน Modal อนุมัติผู้จัดการและส่งแคมเปญ',
  gf12Title:'การติดตาม',gf12Desc:'ติดตามผลงานแบบเรียลไทม์ใน Campaign Manager',
  gf13Title:'ปรับแต่งการเพิ่มประสิทธิภาพ',gf13Desc:'ปรับการจัดสรรงบตามช่องด้วยตัวเลื่อน',
  gf14Title:'ตรวจสอบรายงาน',gf14Desc:'ตรวจสอบรายงาน ROI/ROAS โดยรวมใน Rollup Dashboard',
  gf15Title:'เสร็จสิ้น & รอบถัดไป',gf15Desc:'วิเคราะห์ข้อมูลหลังแคมเปญและนำไปใช้กลยุทธ์ถัดไป',
  guidePhaseA:'Phase A — เตรียมความพร้อม',guidePhaseB:'Phase B — ออกแบบแคมเปญ',
  guidePhaseC:'Phase C — กลยุทธ์ AI & ครีเอทีฟ',guidePhaseD:'Phase D — ดำเนินการ & ติดตาม',
  guidePhaseE:'Phase E — เพิ่มประสิทธิภาพ & สรุป',
  guideFullTitle:'📋 คู่มือฉบับสมบูรณ์ — ตั้งแต่ต้นจนจบ',guideFullSub:'คู่มือทีละขั้นตอนของเวิร์กโฟลว์ทั้งหมดของแพลตฟอร์ม',
  guideTabCreativeName:'Creative Studio',guideTabCreativeDesc:'สร้าง จัดการ และส่งออกสื่อโฆษณา AI หลายรูปแบบ',
},
vi: {
  gf1Title:'Đăng nhập & Xác minh',gf1Desc:'Đăng nhập và điều hướng đến menu "Tự động hóa Marketing AI" trên thanh bên.',
  gf2Title:'Kết nối Kênh API',gf2Desc:'Đăng ký khóa API cho Meta, Google, Naver trong Integration Hub.',
  gf3Title:'Kiểm tra Dashboard',gf3Desc:'Kiểm tra tình trạng KPI hiện tại trên Dashboard chính.',
  gf4Title:'Đặt Ngân sách Hàng tháng',gf4Desc:'Đặt ngân sách quảng cáo hàng tháng qua nút preset hoặc nhập trực tiếp.',
  gf5Title:'Chọn Danh mục Sản phẩm',gf5Desc:'Chọn danh mục mục tiêu như Làm đẹp, Thời trang, Thực phẩm, v.v.',
  gf6Title:'Chọn Kênh Quảng cáo',gf6Desc:'Chọn Meta, TikTok, Google theo đề xuất AI hoặc thủ công.',
  gf7Title:'Đặt Đối tượng Mục tiêu',gf7Desc:'Cấu hình thời gian chiến dịch và đối tượng mục tiêu.',
  gf8Title:'Chạy Mô phỏng AI',gf8Desc:'Nhấp "Tạo Chiến lược AI" để phân bổ ngân sách tự động.',
  gf9Title:'Tạo Sáng tạo',gf9Desc:'Tạo tài liệu quảng cáo AI trong Creative Studio.',
  gf10Title:'Xem trước',gf10Desc:'Kiểm tra KPI dự kiến và kết quả phân bổ trong tab xem trước.',
  gf11Title:'Phê duyệt & Gửi',gf11Desc:'Xác nhận trong modal phê duyệt quản lý và gửi chiến dịch.',
  gf12Title:'Giám sát',gf12Desc:'Theo dõi hiệu suất thời gian thực trong Trình quản lý Chiến dịch.',
  gf13Title:'Điều chỉnh Tối ưu hóa',gf13Desc:'Điều chỉnh phân bổ ngân sách theo kênh bằng thanh trượt.',
  gf14Title:'Xem Báo cáo',gf14Desc:'Xem báo cáo ROI/ROAS tổng thể trên Rollup Dashboard.',
  gf15Title:'Hoàn thành & Chu kỳ Tiếp theo',gf15Desc:'Phân tích dữ liệu sau chiến dịch và áp dụng cho chiến lược tiếp theo.',
  guidePhaseA:'Phase A — Chuẩn bị',guidePhaseB:'Phase B — Thiết kế Chiến dịch',
  guidePhaseC:'Phase C — Chiến lược AI & Sáng tạo',guidePhaseD:'Phase D — Thực hiện & Giám sát',
  guidePhaseE:'Phase E — Tối ưu hóa & Kết thúc',
  guideFullTitle:'📋 Hướng dẫn Đầy đủ — Từ Đầu đến Cuối',guideFullSub:'Hướng dẫn từng bước toàn bộ quy trình của nền tảng.',
  guideTabCreativeName:'Creative Studio',guideTabCreativeDesc:'Tạo, quản lý và xuất tài liệu quảng cáo AI đa định dạng',
},
id: {
  gf1Title:'Login & Verifikasi',gf1Desc:'Login dan navigasi ke menu "Otomasi Pemasaran AI" di sidebar.',
  gf2Title:'Hubungkan Channel API',gf2Desc:'Daftarkan kunci API untuk Meta, Google, Naver di Integration Hub.',
  gf3Title:'Periksa Dashboard',gf3Desc:'Periksa status KPI saat ini di Dashboard utama.',
  gf4Title:'Atur Anggaran Bulanan',gf4Desc:'Atur anggaran iklan bulanan melalui tombol preset atau input langsung.',
  gf5Title:'Pilih Kategori Produk',gf5Desc:'Pilih kategori target seperti Kecantikan, Fashion, Makanan, dll.',
  gf6Title:'Pilih Channel Iklan',gf6Desc:'Pilih Meta, TikTok, Google berdasarkan rekomendasi AI atau manual.',
  gf7Title:'Atur Target Audiens',gf7Desc:'Konfigurasikan periode kampanye dan target audiens.',
  gf8Title:'Jalankan Simulasi AI',gf8Desc:'Klik "Buat Strategi AI" untuk alokasi anggaran otomatis.',
  gf9Title:'Buat Kreatif',gf9Desc:'Buat materi iklan AI di Creative Studio.',
  gf10Title:'Periksa Preview',gf10Desc:'Periksa KPI yang diprediksi dan hasil alokasi di tab preview.',
  gf11Title:'Persetujuan & Kirim',gf11Desc:'Konfirmasi di modal persetujuan manajer dan kirim kampanye.',
  gf12Title:'Monitoring',gf12Desc:'Pantau performa real-time di Campaign Manager.',
  gf13Title:'Penyesuaian Optimasi',gf13Desc:'Sesuaikan alokasi anggaran per channel dengan slider.',
  gf14Title:'Periksa Laporan',gf14Desc:'Periksa laporan ROI/ROAS keseluruhan di Rollup Dashboard.',
  gf15Title:'Selesai & Siklus Berikutnya',gf15Desc:'Analisis data pasca-kampanye dan terapkan ke strategi berikutnya.',
  guidePhaseA:'Phase A — Persiapan',guidePhaseB:'Phase B — Desain Kampanye',
  guidePhaseC:'Phase C — Strategi AI & Kreatif',guidePhaseD:'Phase D — Eksekusi & Monitoring',
  guidePhaseE:'Phase E — Optimasi & Penutupan',
  guideFullTitle:'📋 Panduan Lengkap — Dari Awal hingga Akhir',guideFullSub:'Panduan langkah demi langkah seluruh alur kerja platform.',
  guideTabCreativeName:'Creative Studio',guideTabCreativeDesc:'Buat, kelola, dan ekspor materi iklan AI multi-format',
},
pt: {guideTabCreativeName:'Creative Studio',guideTabCreativeDesc:'Gerar, gerenciar e exportar materiais publicitários de IA em múltiplos formatos'},
ru: {guideTabCreativeName:'Креативная студия',guideTabCreativeDesc:'Создание, управление и экспорт рекламных материалов ИИ в различных форматах'},
ar: {guideTabCreativeName:'استوديو الإبداع',guideTabCreativeDesc:'إنشاء وإدارة وتصدير المواد الإعلانية بالذكاء الاصطناعي بتنسيقات متعددة'},
hi: {guideTabCreativeName:'क्रिएटिव स्टूडियो',guideTabCreativeDesc:'AI विज्ञापन सामग्री बनाएं, प्रबंधित करें और मल्टी-फॉर्मेट में निर्यात करें'},
};

// Inject into each locale
let totalFixed = 0;
Object.entries(T).forEach(([lang, keys]) => {
  const fp = path.join(dir, `${lang}.js`);
  let src = fs.readFileSync(fp, 'utf8');

  // Find the LAST occurrence of the marketing closing bracket
  // Strategy: find `"marketing":` and then inject keys before its closing `}`
  // More reliable: use regex to find marketing block and append keys

  let injected = 0;
  Object.entries(keys).forEach(([key, val]) => {
    // Check if key already exists in a valid position (inside marketing)
    const escaped = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const keyPattern = new RegExp(`"${key}"\\s*:\\s*"[^"]*"`, 'g');
    const matches = [...src.matchAll(keyPattern)];

    if (matches.length === 0) {
      // Key doesn't exist at all - need to inject
      // Find last "marketing": { block and add before its closing }
      // Simple approach: find the last autoTab4 or guideSub line and add after it
      const insertAfter = `"autoTab4"`;
      const idx = src.lastIndexOf(insertAfter);
      if (idx > 0) {
        // Find end of that line
        const lineEnd = src.indexOf('\n', idx);
        if (lineEnd > 0) {
          const insertStr = `    "${key}": "${escaped}",\n`;
          src = src.substring(0, lineEnd + 1) + insertStr + src.substring(lineEnd + 1);
          injected++;
        }
      }
    }
  });

  if (injected > 0) {
    fs.writeFileSync(fp, src, 'utf8');
    totalFixed += injected;
    console.log(`${lang}: injected ${injected} keys`);
  } else {
    console.log(`${lang}: 0 new keys needed (checking existing...)`);
  }
});

console.log(`\nTotal: ${totalFixed} keys injected`);
