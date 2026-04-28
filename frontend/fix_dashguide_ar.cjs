// Fix dashGuide Arabic translations in ar.js
const fs = require('fs');
const path = require('path');

const arPath = path.join(__dirname, 'src/i18n/locales/ar.js');
let content = fs.readFileSync(arPath, 'utf-8');

// Parse the default export
const match = content.match(/^export default (.+);?\s*$/s);
if (!match) { console.error('Cannot parse ar.js'); process.exit(1); }

const data = JSON.parse(match[1].replace(/;\s*$/, ''));

// Arabic translations for dashGuide keys used by DashGuide.jsx
const arDashGuide = {
  title: 'دليل استخدام لوحة المعلومات',
  subtitle: 'تعلّم جميع ميزات لوحة المعلومات خطوة بخطوة. سهل للمبتدئين.',
  stepsTitle: '🚀 البدء — دليل من 10 خطوات',
  step1Title: 'الوصول إلى لوحة المعلومات',
  step1Desc: 'بعد تسجيل الدخول، انقر على "لوحة المعلومات" من القائمة الجانبية. يظهر تبويب النظرة العامة افتراضياً.',
  step2Title: 'مراجعة مؤشرات الأداء',
  step2Desc: 'راجع بطاقات KPI الست: الإيرادات، الإنفاق الإعلاني، ROAS، الطلبات، معدل التحويل، ومتوسط قيمة الطلب.',
  step3Title: 'تحليل التسويق',
  step3Desc: 'قارن أداء القنوات في الوقت الفعلي لـ Meta وGoogle وNaver في تبويب التسويق.',
  step4Title: 'مراجعة مؤشرات القنوات',
  step4Desc: 'عرض CTR وCPC وROAS والمقاييس الرئيسية لكل قناة في تبويب مؤشرات القناة.',
  step5Title: 'مراجعة التجارة',
  step5Desc: 'تحقق من حالة التسوية والرسوم للأسواق في تبويب التجارة.',
  step6Title: 'تحليل المبيعات العالمية',
  step6Desc: 'حلّل الإيرادات حسب الدولة بصرياً عبر خريطة العالم في تبويب المبيعات العالمية.',
  step7Title: 'إدارة المؤثرين',
  step7Desc: 'راقب متابعي المنشئين ومعدلات التفاعل والإيرادات في تبويب المؤثرين.',
  step8Title: 'مراقبة النظام',
  step8Desc: 'تحقق من حالة الخادم وأوقات استجابة API وحالة الأمان في تبويب النظام.',
  step9Title: 'مراجعة تنبيهات الأمان',
  step9Desc: 'تحقق من شريط الأمان العلوي للتهديدات المكتشفة واتخذ إجراءً فورياً.',
  step10Title: 'المراقبة المنتظمة',
  step10Desc: 'أنشئ روتيناً صباحياً يومياً لمراجعة لوحة المعلومات. المراقبة الفورية ضرورية خاصة بعد إطلاق الحملات.',
  tabsTitle: '📋 دليل التبويبات',
  tabOverview: 'النظرة العامة: عرض 6 مؤشرات أداء رئيسية (الإيرادات، الإنفاق، ROAS، الطلبات، CVR، AOV) بنظرة واحدة.',
  tabMarketing: 'التسويق: مقارنة أداء الإعلانات عبر القنوات. يتضمن تحليل AI.',
  tabChannel: 'مؤشرات القناة: مراقبة CTR وCPC وROAS لكل قناة في الوقت الفعلي.',
  tabCommerce: 'التجارة: إدارة تسويات ورسوم الأسواق.',
  tabSales: 'المبيعات العالمية: مقارنة الدول عبر خريطة العالم مع تقسيمات القنوات والمناطق.',
  tabInfluencer: 'المؤثرون: تتبع قوائم المنشئين ومعدلات التفاعل ومساهمة الإيرادات.',
  tabSystem: 'النظام: حالة الخادم ومراقبة API وحالة الأمان.',
  featuresTitle: '✨ الميزات الرئيسية',
  feat1Title: 'لوحة KPI في الوقت الفعلي',
  feat1Desc: 'جميع البيانات تتزامن في الوقت الفعلي عبر GlobalDataContext.',
  feat2Title: 'مزامنة البيانات التلقائية',
  feat2Desc: 'تحديث أحدث البيانات كل 5 ثوانٍ بدون تحديث الصفحة.',
  feat3Title: 'دعم 12 لغة',
  feat3Desc: 'اكتشاف تلقائي والتبديل بين 12 لغة بما فيها الكورية والإنجليزية واليابانية والصينية.',
  feat4Title: 'تحليل الإيرادات الموحد',
  feat4Desc: 'تحليل الإيرادات حسب القناة والدولة والمنشئ في عرض واحد.',
  feat5Title: 'أمان المؤسسات',
  feat5Desc: 'SecurityGuard يكتشف ويحظر هجمات XSS وCSRF والقوة الغاشمة في الوقت الفعلي.',
  feat6Title: 'تصميم متجاوب',
  feat6Desc: 'واجهة محسّنة لسطح المكتب والأجهزة اللوحية والهواتف.',
  tipsTitle: 'نصائح الخبراء',
  tip1: 'تحقق من تغيرات ألوان بطاقات KPI في تبويب النظرة العامة كل صباح. الأحمر يعني إجراء فوري مطلوب.',
  tip2: 'انقر على بطاقات القنوات في تبويب التسويق لتحليل مفصل من 5 أقسام.',
  tip3: 'انقر على علامات الدول على الخريطة في تبويب المبيعات العالمية لتحليل تفصيلي.',
  tip4: 'استخدم ميزة تحليل AI في تبويب المؤثرين لتقييم محفظة المنشئين تلقائياً.',
  tip5: 'تحقق بانتظام من أن حالة الأمان "آمن" في تبويب النظام. الاستجابة الفورية مطلوبة عند اكتشاف تهديد.',
  faqTitle: 'الأسئلة الشائعة',
  faq1Q: 'لا تظهر بيانات',
  faq1A: 'تحتاج إلى إنشاء حملات إعلانية أولاً في مدير الحملات وربط القنوات. البيانات تتزامن تلقائياً.',
  faq2Q: 'قيم KPI تساوي صفر',
  faq2A: 'قد لا تكون بيانات الإعلانات قد جُمعت بعد. يستغرق الأمر بضع ساعات على الأقل.',
  faq3Q: 'قناة معينة مفقودة من القائمة',
  faq3A: 'اربط القناة في مدير الحملات وستظهر تلقائياً في لوحة المعلومات.',
  faq4Q: 'تنبيهات الأمان تظهر باستمرار',
  faq4A: 'اكتشف SecurityGuard تهديدات محتملة. استخدم زر "تجاهل" للتعامل معها أو تحقق من إعدادات الأمان.',
  faq5Q: 'كيف أغيّر اللغة؟',
  faq5A: 'اختر لغتك المفضلة من القائمة المنسدلة في الزاوية العلوية اليمنى. يتم دعم 12 لغة.',
  readyTitle: '🎉 أنت جاهز للبدء!',
  readyDesc: 'انقر على تبويب النظرة العامة أعلاه لبدء استخدام لوحة المعلومات. جميع البيانات تتزامن في الوقت الفعلي.',
  beginnerBadge: 'دليل المبتدئين',
  timeBadge: '5 دقائق قراءة',
  langBadge: '12 لغة',
  whereToStart: 'من أين أبدأ؟',
  whereToStartDesc: '1. انقر على "لوحة المعلومات" من القائمة الجانبية. 2. تحقق من مؤشرات الأداء في تبويب النظرة العامة. 3. انقر على التبويبات الفرعية للتحليل التفصيلي. 4. راجع شريط الأمان واتخذ إجراءً إذا لزم الأمر.',
};

// Merge Arabic translations
Object.assign(data.dashGuide, arDashGuide);

// Write back
fs.writeFileSync(arPath, 'export default ' + JSON.stringify(data) + ';\n', 'utf-8');
console.log('✅ ar.js dashGuide keys updated with Arabic translations');

// Also fix ru.js
const ruPath = path.join(__dirname, 'src/i18n/locales/ru.js');
let ruContent = fs.readFileSync(ruPath, 'utf-8');
const ruMatch = ruContent.match(/^export default (.+);?\s*$/s);
if (ruMatch) {
  const ruData = JSON.parse(ruMatch[1].replace(/;\s*$/, ''));
  const ruDashGuide = {
    title: 'Руководство по панели управления',
    subtitle: 'Изучите все функции панели управления шаг за шагом.',
    stepsTitle: '🚀 Начало работы — 10 шагов',
    step1Title: 'Доступ к панели', step1Desc: 'После входа нажмите "Панель" в левом меню.',
    step2Title: 'Проверка KPI', step2Desc: 'Просмотрите 6 карточек KPI: Доход, Расходы, ROAS, Заказы, CVR, AOV.',
    step3Title: 'Анализ маркетинга', step3Desc: 'Сравните эффективность каналов в реальном времени.',
    step4Title: 'KPI каналов', step4Desc: 'Просмотрите CTR, CPC, ROAS по каналам.',
    step5Title: 'Обзор коммерции', step5Desc: 'Проверьте статус расчётов и комиссий маркетплейсов.',
    step6Title: 'Глобальные продажи', step6Desc: 'Анализ доходов по странам через карту мира.',
    step7Title: 'Управление инфлюенсерами', step7Desc: 'Мониторинг подписчиков и вовлечённости авторов.',
    step8Title: 'Мониторинг системы', step8Desc: 'Проверьте статус сервера, API и безопасности.',
    step9Title: 'Проверка безопасности', step9Desc: 'Проверьте баннер безопасности на наличие угроз.',
    step10Title: 'Регулярный мониторинг', step10Desc: 'Создайте ежедневную привычку проверять панель.',
    beginnerBadge: 'Для начинающих', timeBadge: '5 мин', langBadge: '12 языков',
    whereToStart: 'С чего начать?',
    whereToStartDesc: '1. Нажмите "Панель" в левом меню. 2. Проверьте KPI. 3. Нажмите подвкладки. 4. Проверьте баннер безопасности.',
    readyTitle: '🎉 Вы готовы!', readyDesc: 'Нажмите вкладку Обзор для начала работы.',
    faq1Q: 'Нет данных', faq1A: 'Создайте рекламные кампании в Campaign Manager.',
    faq2Q: 'KPI = 0', faq2A: 'Данные ещё не собраны. Подождите несколько часов.',
    faq3Q: 'Канал отсутствует', faq3A: 'Подключите канал в Campaign Manager.',
    faq4Q: 'Оповещения безопасности', faq4A: 'SecurityGuard обнаружил угрозы. Нажмите "Отклонить".',
    faq5Q: 'Как сменить язык?', faq5A: 'Выберите язык в выпадающем меню справа вверху.',
  };
  Object.assign(ruData.dashGuide, ruDashGuide);
  fs.writeFileSync(ruPath, 'export default ' + JSON.stringify(ruData) + ';\n', 'utf-8');
  console.log('✅ ru.js dashGuide keys updated with Russian translations');
}

// Also fix hi.js
const hiPath = path.join(__dirname, 'src/i18n/locales/hi.js');
let hiContent = fs.readFileSync(hiPath, 'utf-8');
const hiMatch = hiContent.match(/^export default (.+);?\s*$/s);
if (hiMatch) {
  const hiData = JSON.parse(hiMatch[1].replace(/;\s*$/, ''));
  const hiDashGuide = {
    title: 'डैशबोर्ड उपयोग गाइड',
    subtitle: 'डैशबोर्ड की सभी सुविधाएं चरण-दर-चरण सीखें।',
    stepsTitle: '🚀 शुरू करें — 10-चरण गाइड',
    step1Title: 'डैशबोर्ड एक्सेस करें', step1Desc: 'लॉगिन के बाद बाएं मेनू से "डैशबोर्ड" पर क्लिक करें।',
    step2Title: 'KPI जांचें', step2Desc: 'शीर्ष 6 KPI कार्ड देखें: राजस्व, विज्ञापन खर्च, ROAS, ऑर्डर, CVR, AOV।',
    step3Title: 'मार्केटिंग विश्लेषण', step3Desc: 'Meta, Google, Naver का रीयल-टाइम प्रदर्शन तुलना करें।',
    step4Title: 'चैनल KPI जांचें', step4Desc: 'प्रत्येक चैनल का CTR, CPC, ROAS देखें।',
    step5Title: 'कॉमर्स समीक्षा', step5Desc: 'मार्केटप्लेस निपटान स्थिति और शुल्क जांचें।',
    step6Title: 'वैश्विक बिक्री विश्लेषण', step6Desc: 'विश्व मानचित्र पर देश-स्तरीय राजस्व विश्लेषण।',
    step7Title: 'इन्फ्लुएंसर प्रबंधन', step7Desc: 'क्रिएटर फॉलोअर्स और सहभागिता मॉनिटर करें।',
    step8Title: 'सिस्टम मॉनिटरिंग', step8Desc: 'सर्वर, API और सुरक्षा स्थिति जांचें।',
    step9Title: 'सुरक्षा अलर्ट समीक्षा', step9Desc: 'सुरक्षा बैनर में खतरों की जांच करें।',
    step10Title: 'नियमित निगरानी', step10Desc: 'दैनिक डैशबोर्ड समीक्षा की आदत बनाएं।',
    beginnerBadge: 'शुरुआती गाइड', timeBadge: '5 मिनट पढ़ें', langBadge: '12 भाषाएं',
    whereToStart: 'कहाँ से शुरू करें?',
    whereToStartDesc: '1. बाएं मेनू से "डैशबोर्ड" क्लिक करें। 2. KPI जांचें। 3. सब-टैब क्लिक करें। 4. सुरक्षा बैनर देखें।',
    readyTitle: '🎉 आप तैयार हैं!', readyDesc: 'शुरू करने के लिए अवलोकन टैब क्लिक करें।',
    faq1Q: 'डेटा नहीं दिख रहा', faq1A: 'Campaign Manager में अभियान बनाएं।',
    faq2Q: 'KPI शून्य', faq2A: 'डेटा संग्रहण में कुछ घंटे लगते हैं।',
    faq3Q: 'चैनल गायब', faq3A: 'Campaign Manager में चैनल कनेक्ट करें।',
    faq4Q: 'सुरक्षा अलर्ट', faq4A: 'SecurityGuard ने खतरे पकड़े। "खारिज" बटन दबाएं।',
    faq5Q: 'भाषा कैसे बदलें?', faq5A: 'ऊपर दाएं कोने में भाषा ड्रॉपडाउन से चुनें।',
  };
  Object.assign(hiData.dashGuide, hiDashGuide);
  fs.writeFileSync(hiPath, 'export default ' + JSON.stringify(hiData) + ';\n', 'utf-8');
  console.log('✅ hi.js dashGuide keys updated with Hindi translations');
}

console.log('Done! All 3 locale files updated.');
