/**
 * BATCH 1: Fix duplicate autoTab1-4 + guide keys in all locale files
 * Problem: Later marketing blocks overwrite correct translations with English
 * Solution: Replace English values in the LATER duplicate with correct translations
 */
const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, 'src/i18n/locales');

// Correct translations for autoTab1-4 per language
const TAB_TRANSLATIONS = {
  ja: { autoTab1: '① クリエイティブスタジオ', autoTab2: '② キャンペーン設定', autoTab3: '③ AI戦略プレビュー', autoTab4: '📖 利用ガイド' },
  ko: { autoTab1: '① 크리에이티브 스튜디오', autoTab2: '② 캠페인 설정', autoTab3: '③ AI 전략 미리보기', autoTab4: '📖 이용 가이드' },
  en: { autoTab1: '① Campaign Setup', autoTab2: '② Campaign Config', autoTab3: '③ AI Strategy Preview', autoTab4: '📖 Usage Guide' },
  zh: { autoTab1: '① 创意工作室', autoTab2: '② 活动设置', autoTab3: '③ AI策略预览', autoTab4: '📖 使用指南' },
  'zh-TW': { autoTab1: '① 創意工作室', autoTab2: '② 活動設定', autoTab3: '③ AI策略預覽', autoTab4: '📖 使用指南' },
  de: { autoTab1: '① Kreativ-Studio', autoTab2: '② Kampagnen-Setup', autoTab3: '③ AI-Strategievorschau', autoTab4: '📖 Benutzerhandbuch' },
  es: { autoTab1: '① Estudio Creativo', autoTab2: '② Config. Campaña', autoTab3: '③ Vista Previa IA', autoTab4: '📖 Guía de Uso' },
  fr: { autoTab1: '① Studio Créatif', autoTab2: '② Config. Campagne', autoTab3: '③ Aperçu Stratégie IA', autoTab4: '📖 Guide d\'utilisation' },
  pt: { autoTab1: '① Estúdio Criativo', autoTab2: '② Config. Campanha', autoTab3: '③ Prévia Estratégia IA', autoTab4: '📖 Guia de Uso' },
  ru: { autoTab1: '① Креативная студия', autoTab2: '② Настройка кампании', autoTab3: '③ Предпросмотр ИИ', autoTab4: '📖 Руководство' },
  ar: { autoTab1: '① استوديو إبداعي', autoTab2: '② إعداد الحملة', autoTab3: '③ معاينة استراتيجية AI', autoTab4: '📖 دليل الاستخدام' },
  hi: { autoTab1: '① क्रिएटिव स्टूडियो', autoTab2: '② अभियान सेटअप', autoTab3: '③ AI रणनीति पूर्वावलोकन', autoTab4: '📖 उपयोग गाइड' },
  th: { autoTab1: '① สตูดิโอครีเอทีฟ', autoTab2: '② ตั้งค่าแคมเปญ', autoTab3: '③ ดูตัวอย่างกลยุทธ์ AI', autoTab4: '📖 คู่มือการใช้งาน' },
  vi: { autoTab1: '① Studio Sáng Tạo', autoTab2: '② Cấu hình Chiến dịch', autoTab3: '③ Xem trước Chiến lược AI', autoTab4: '📖 Hướng dẫn Sử dụng' },
  id: { autoTab1: '① Studio Kreatif', autoTab2: '② Pengaturan Kampanye', autoTab3: '③ Pratinjau Strategi AI', autoTab4: '📖 Panduan Penggunaan' },
};

// Guide keys translations
const GUIDE_TRANSLATIONS = {
  ja: {
    guideTitle: 'マーケティング自動化ガイド',
    guideSub: 'AI基盤マーケティング自動化プラットフォームの主要機能と活用法をご案内します。',
    guideStepsTitle: '始めよう — 6ステップ',
    guideStep1Title: '予算設定', guideStep1Desc: '月間広告予算とチャネル配分を設定します。',
    guideStep2Title: 'キャンペーン作成', guideStep2Desc: 'AIで最適化されたキャンペーンを作成します。',
    guideStep3Title: 'ターゲティング設定', guideStep3Desc: 'AIセグメントで精密ターゲティングを設定します。',
    guideStep4Title: '素材制作', guideStep4Desc: 'AIツールで広告素材を自動生成します。',
    guideStep5Title: 'パフォーマンス監視', guideStep5Desc: 'キャンペーンパフォーマンスをリアルタイムで追跡します。',
    guideStep6Title: '最適化', guideStep6Desc: 'AIで予算と入札を自動最適化します。',
    guideTabsTitle: 'タブ機能紹介',
    guideTipsTitle: '活用のコツ',
    guideTip1: '効率を最大化するため、毎週予算を見直しましょう。',
    guideTip2: 'A/Bテストで最適なクリエイティブを見つけましょう。',
    guideTip3: 'AI推奨セグメントを活用しましょう。',
    guideTip4: 'パフォーマンスレポートを定期的に確認しましょう。',
    guideTip5: '季節キャンペーンを事前に計画しましょう。',
    guideStartBtn: '始めましょう',
  },
  de: {
    guideTitle: 'Marketing-Automatisierung Leitfaden',
    guideSub: 'Anleitung zur KI-gestützten Marketing-Automatisierungsplattform.',
    guideTabsTitle: 'Tab-Funktionen', guideTipsTitle: 'Tipps',
    guideTip1: 'Überprüfen Sie das Budget wöchentlich.', guideTip2: 'Nutzen Sie A/B-Tests.',
    guideTip3: 'Nutzen Sie KI-empfohlene Segmente.', guideTip4: 'Prüfen Sie Berichte regelmäßig.',
    guideTip5: 'Planen Sie saisonale Kampagnen voraus.', guideStartBtn: 'Jetzt starten',
  },
  es: {
    guideTitle: 'Guía de Automatización de Marketing',
    guideSub: 'Guía de la plataforma de automatización de marketing con IA.',
    guideTabsTitle: 'Funciones de Pestañas', guideTipsTitle: 'Consejos',
    guideTip1: 'Revise el presupuesto semanalmente.', guideTip2: 'Use pruebas A/B.',
    guideTip3: 'Aproveche los segmentos recomendados por IA.', guideTip4: 'Revise informes regularmente.',
    guideTip5: 'Planifique campañas estacionales.', guideStartBtn: 'Comenzar',
  },
  fr: {
    guideTitle: 'Guide d\'Automatisation Marketing',
    guideSub: 'Guide de la plateforme d\'automatisation marketing par IA.',
    guideTabsTitle: 'Fonctions des Onglets', guideTipsTitle: 'Conseils',
    guideTip1: 'Vérifiez le budget chaque semaine.', guideTip2: 'Utilisez les tests A/B.',
    guideTip3: 'Exploitez les segments recommandés par l\'IA.', guideTip4: 'Consultez les rapports régulièrement.',
    guideTip5: 'Planifiez les campagnes saisonnières.', guideStartBtn: 'Commencer',
  },
  zh: {
    guideTitle: '营销自动化指南', guideSub: 'AI驱动的营销自动化平台指南。',
    guideTabsTitle: '标签功能', guideTipsTitle: '使用技巧',
    guideTip1: '每周检查预算以最大化效率。', guideTip2: '使用A/B测试找到最佳创意。',
    guideTip3: '利用AI推荐细分。', guideTip4: '定期查看绩效报告。',
    guideTip5: '提前规划季节性活动。', guideStartBtn: '开始使用',
  },
  'zh-TW': {
    guideTitle: '行銷自動化指南', guideSub: 'AI驅動的行銷自動化平台指南。',
    guideTabsTitle: '標籤功能', guideTipsTitle: '使用技巧',
    guideTip1: '每週檢查預算以最大化效率。', guideTip2: '使用A/B測試找到最佳創意。',
    guideTip3: '利用AI推薦細分。', guideTip4: '定期查看績效報告。',
    guideTip5: '提前規劃季節性活動。', guideStartBtn: '開始使用',
  },
  pt: {
    guideTitle: 'Guia de Automação de Marketing', guideSub: 'Guia da plataforma de automação de marketing com IA.',
    guideTabsTitle: 'Funções das Abas', guideTipsTitle: 'Dicas',
    guideTip1: 'Revise o orçamento semanalmente.', guideTip2: 'Use testes A/B.',
    guideTip3: 'Aproveite segmentos recomendados por IA.', guideTip4: 'Verifique relatórios regularmente.',
    guideTip5: 'Planeje campanhas sazonais com antecedência.', guideStartBtn: 'Começar',
  },
  ru: {
    guideTitle: 'Руководство по автоматизации маркетинга', guideSub: 'Руководство по платформе маркетинговой автоматизации на базе ИИ.',
    guideTabsTitle: 'Функции вкладок', guideTipsTitle: 'Советы',
    guideTip1: 'Проверяйте бюджет еженедельно.', guideTip2: 'Используйте A/B-тестирование.',
    guideTip3: 'Используйте рекомендованные ИИ сегменты.', guideTip4: 'Регулярно проверяйте отчёты.',
    guideTip5: 'Планируйте сезонные кампании заранее.', guideStartBtn: 'Начать',
  },
  ar: {
    guideTitle: 'دليل أتمتة التسويق', guideSub: 'دليل منصة أتمتة التسويق بالذكاء الاصطناعي.',
    guideTabsTitle: 'ميزات التبويب', guideTipsTitle: 'نصائح',
    guideTip1: 'راجع الميزانية أسبوعياً.', guideTip2: 'استخدم اختبارات A/B.',
    guideTip3: 'استفد من شرائح AI الموصى بها.', guideTip4: 'تحقق من التقارير بانتظام.',
    guideTip5: 'خطط للحملات الموسمية مسبقاً.', guideStartBtn: 'ابدأ الآن',
  },
  hi: {
    guideTitle: 'मार्केटिंग ऑटोमेशन गाइड', guideSub: 'AI-संचालित मार्केटिंग ऑटोमेशन प्लेटफ़ॉर्म गाइड।',
    guideTabsTitle: 'टैब सुविधाएँ', guideTipsTitle: 'सुझाव',
    guideTip1: 'दक्षता बढ़ाने के लिए साप्ताहिक बजट की समीक्षा करें।', guideTip2: 'सर्वश्रेष्ठ क्रिएटिव खोजने के लिए A/B परीक्षण का उपयोग करें।',
    guideTip3: 'AI-अनुशंसित सेगमेंट का लाभ उठाएं।', guideTip4: 'नियमित रूप से प्रदर्शन रिपोर्ट जांचें।',
    guideTip5: 'मौसमी अभियानों की पूर्व योजना बनाएं।', guideStartBtn: 'शुरू करें',
  },
  th: {
    guideTitle: 'คู่มือการตลาดอัตโนมัติ', guideSub: 'คู่มือแพลตฟอร์มการตลาดอัตโนมัติด้วย AI',
    guideTabsTitle: 'ฟีเจอร์แท็บ', guideTipsTitle: 'เคล็ดลับ',
    guideTip1: 'ตรวจสอบงบประมาณทุกสัปดาห์', guideTip2: 'ใช้การทดสอบ A/B',
    guideTip3: 'ใช้ประโยชน์จากเซกเมนต์ที่ AI แนะนำ', guideTip4: 'ตรวจสอบรายงานประสิทธิภาพเป็นประจำ',
    guideTip5: 'วางแผนแคมเปญตามฤดูกาลล่วงหน้า', guideStartBtn: 'เริ่มต้นใช้งาน',
  },
  vi: {
    guideTitle: 'Hướng dẫn Tự động hóa Marketing', guideSub: 'Hướng dẫn nền tảng tự động hóa marketing bằng AI.',
    guideTabsTitle: 'Tính năng Tab', guideTipsTitle: 'Mẹo hay',
    guideTip1: 'Xem xét ngân sách hàng tuần.', guideTip2: 'Sử dụng thử nghiệm A/B.',
    guideTip3: 'Tận dụng phân khúc được AI đề xuất.', guideTip4: 'Kiểm tra báo cáo hiệu suất thường xuyên.',
    guideTip5: 'Lên kế hoạch chiến dịch theo mùa.', guideStartBtn: 'Bắt đầu',
  },
  id: {
    guideTitle: 'Panduan Otomatisasi Pemasaran', guideSub: 'Panduan platform otomatisasi pemasaran bertenaga AI.',
    guideTabsTitle: 'Fitur Tab', guideTipsTitle: 'Tips',
    guideTip1: 'Tinjau anggaran setiap minggu.', guideTip2: 'Gunakan pengujian A/B.',
    guideTip3: 'Manfaatkan segmen yang direkomendasikan AI.', guideTip4: 'Periksa laporan kinerja secara rutin.',
    guideTip5: 'Rencanakan kampanye musiman lebih awal.', guideStartBtn: 'Mulai Sekarang',
  },
};

let fixCount = 0;

// Process each locale file (except en and ko which are base)
const langs = ['ja','zh','zh-TW','de','es','fr','pt','ru','ar','hi','th','vi','id'];

for (const lang of langs) {
  const filePath = path.join(localeDir, `${lang}.js`);
  if (!fs.existsSync(filePath)) { console.log(`⚠ ${lang}.js not found`); continue; }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const tabs = TAB_TRANSLATIONS[lang];
  const guides = GUIDE_TRANSLATIONS[lang] || {};
  let changed = false;

  // Fix autoTab1-4: replace English fallbacks
  for (const [key, val] of Object.entries(tabs)) {
    // Find the LAST occurrence of the key with English value
    const englishPatterns = [
      `"${key}": "① Campaign Setup"`,
      `"${key}": "③ Campaign Config"`,
      `"${key}": "③ AI Strategy Preview"`,
      `"${key}": "利用ガイド"`,
      `"${key}": "📖 Usage Guide"`,
    ];
    
    for (const pat of englishPatterns) {
      if (content.includes(pat)) {
        content = content.replace(pat, `"${key}": "${val}"`);
        changed = true;
        fixCount++;
      }
    }
  }

  // Fix guide keys with English values
  const guideEnglishMap = {
    guideTitle: ['Marketing Automation Guide', 'マーケティング自動化ガイド'],
    guideSub: ['AI-powered marketing automation platform guide.'],
    guideStepsTitle: ['Getting Started — 6 Steps'],
    guideTabsTitle: ['Tab Features'],
    guideTipsTitle: ['Tips'],
    guideTip1: ['Review budget weekly to maximize efficiency.'],
    guideTip2: ['Use A/B testing to find best creatives.'],
    guideTip3: ['Leverage AI-recommended segments.'],
    guideTip4: ['Check performance reports regularly.'],
    guideTip5: ['Plan seasonal campaigns ahead.'],
    guideStartBtn: ['Get Started'],
  };

  for (const [key, englishVals] of Object.entries(guideEnglishMap)) {
    if (!guides[key]) continue;
    for (const ev of englishVals) {
      const pat = `"${key}": "${ev}"`;
      // Only replace if it's a duplicate (there should be a correct one earlier)
      const idx1 = content.indexOf(pat);
      if (idx1 > -1) {
        // Check if there's an earlier occurrence of the key
        const keyPat = `"${key}":`;
        const firstIdx = content.indexOf(keyPat);
        if (firstIdx < idx1) {
          // This is the duplicate - replace it
          content = content.substring(0, idx1) + `"${key}": "${guides[key]}"` + content.substring(idx1 + pat.length);
          changed = true;
          fixCount++;
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${lang}.js fixed`);
  } else {
    console.log(`ℹ ${lang}.js no changes needed`);
  }
}

console.log(`\n📊 Total fixes: ${fixCount}`);
