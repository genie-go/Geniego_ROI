// Batch 1: Inject 15-step guide + CS keys into ar, hi, pt
const fs=require('fs'),p=require('path');
const dir=p.resolve(__dirname,'src/i18n/locales');

const translations = {
  ar: {
    guideFullTitle:'📋 الدليل الكامل — من البداية إلى النهاية',
    guideFullSub:'دليل خطوة بخطوة لسير عمل منصة التسويق الآلي بالذكاء الاصطناعي.',
    guidePhaseA:'المرحلة أ — التحضير للبدء',
    guidePhaseB:'المرحلة ب — تصميم الحملة',
    guidePhaseC:'المرحلة ج — استراتيجية AI وإنشاء المحتوى',
    guidePhaseD:'المرحلة د — التنفيذ والمراقبة',
    guidePhaseE:'المرحلة هـ — التحسين والإنهاء',
    gf1Title:'تسجيل الدخول والتحقق من البيئة', gf1Desc:'سجّل الدخول وانتقل إلى "التسويق الذكي → الاستراتيجية التلقائية" من الشريط الجانبي. تحقق من بيئة الإنتاج/التجريبي.',
    gf2Title:'ربط قنوات API', gf2Desc:'سجّل مفاتيح API لـ Meta و Google و Naver وغيرها في مركز التكامل. يمكن استخدام القنوات المتصلة فقط في الحملات.',
    gf3Title:'مراجعة مؤشرات الأداء', gf3Desc:'راجع مؤشرات الأداء الحالية والحملات النشطة و ROAS لكل قناة في لوحة المعلومات الرئيسية.',
    gf4Title:'تحديد الميزانية الشهرية', gf4Desc:'في تبويب "② إعداد الحملة"، حدد أو أدخل ميزانيتك الإعلانية الشهرية. يحسّن AI توصيات القنوات بناءً على مستوى ميزانيتك.',
    gf5Title:'اختيار فئات المنتجات', gf5Desc:'اختر من 11 فئة (الجمال، الأزياء، الغذاء، إلخ). الاختيار المتعدد يتيح التحليل المتقاطع لدقة أعلى.',
    gf6Title:'اختيار قنوات الإعلان', gf6Desc:'يوصي AI بأفضل مزيج من القنوات بناءً على تحليل الفئة + الميزانية. يمكنك إضافة أو إزالة القنوات يدوياً.',
    gf7Title:'تحديد الهدف والفترة', gf7Desc:'حدد اسم الحملة وفترة التنفيذ (شهري/ربع سنوي/نصف سنوي) والجمهور المستهدف. يقترح AI الاستهداف الأمثل لكل قناة.',
    gf8Title:'محاكاة استراتيجية AI', gf8Desc:'انقر "إنشاء استراتيجية AI" لحساب توزيع الميزانية والمشاهدات والنقرات والتحويلات و ROAS المتوقع تلقائياً لكل قناة.',
    gf9Title:'إنشاء المحتوى الإعلاني', gf9Desc:'في تبويب "① استوديو الإبداع"، ينشئ AI محتوى إعلاني محسّن لكل قناة تلقائياً. يدعم تنسيقات النص والصورة والفيديو.',
    gf10Title:'معاينة الاستراتيجية وتعديلها', gf10Desc:'في تبويب "③ معاينة AI"، راجع التوزيع ومؤشرات الأداء المتوقعة لكل قناة. استخدم أشرطة التمرير لتعديل نسب التوزيع.',
    gf11Title:'تقديم طلب الموافقة', gf11Desc:'بعد تأكيد الاستراتيجية، انقر "طلب الموافقة". راجع الميزانية و ROAS والقنوات في نافذة الموافقة قبل الإرسال.',
    gf12Title:'المراقبة في مدير الحملات', gf12Desc:'يتم تتبع الحملات المقدمة في الوقت الفعلي في صفحة مدير الحملات. راقب الحالة (معلقة/موافق عليها/نشطة/متوقفة).',
    gf13Title:'التحسين التلقائي بـ AI', gf13Desc:'يحلل AI البيانات في الوقت الفعلي ويعيد تخصيص الميزانية تلقائياً من القنوات ضعيفة الأداء إلى القنوات عالية الأداء.',
    gf14Title:'تحليل تقارير الأداء', gf14Desc:'بعد انتهاء الحملة، حلل ROAS و CPA و CTR والمقاييس الرئيسية لكل قناة. يقترح AI تحسينات للحملات القادمة.',
    gf15Title:'تكرار الحملة التالية', gf15Desc:'بناءً على نتائج التحليل، عدّل الميزانية/الفئات/القنوات لإنشاء حملة جديدة. يتحسن تعلم AI مع كل تكرار.',
    guideTabGuideName:'📖 دليل الاستخدام', guideTabGuideDesc:'دليل خطوة بخطوة لميزات المنصة وسير العمل الكامل.',
    guideTip6:'قارن القنوات الموصى بها من AI مع الاختيارات اليدوية للعثور على المزيج الأمثل.',
    guideTip7:'قدّم دائماً طلب موافقة المدير قبل التنفيذ لمنع تجاوز الميزانية.',
    csTitle:'استوديو الإبداع', csSubtitle:'تصميم وإدارة المحتوى الإعلاني عبر المنصات المختلفة',
    csTabGallery:'المعرض', csTabCreateNew:'إنشاء جديد', csTabPerformance:'تحليل الأداء', csTabBrandAssets:'أصول العلامة التجارية',
    csKpiCreatives:'المحتوى', csKpiFormats:'التنسيقات', csKpiApproved:'معتمد', csKpiTopCtr:'أعلى CTR',
    csFeatMultiFormat:'تصدير متعدد التنسيقات', csFeatAiCopy:'مولد نصوص AI', csFeatPerfAnalytics:'تحليلات الأداء', csFeatBrandCheck:'فحص اتساق العلامة التجارية',
    csSystemOk:'النظام يعمل بشكل طبيعي',
    autoTab1:'① استوديو الإبداع',
  },
  hi: {
    guideFullTitle:'📋 शुरू से अंत तक — संपूर्ण गाइड',
    guideFullSub:'AI मार्केटिंग ऑटोमेशन प्लेटफ़ॉर्म के पूरे वर्कफ़्लो की चरण-दर-चरण मार्गदर्शिका।',
    guidePhaseA:'चरण A — शुरुआत की तैयारी',
    guidePhaseB:'चरण B — अभियान डिज़ाइन',
    guidePhaseC:'चरण C — AI रणनीति और क्रिएटिव',
    guidePhaseD:'चरण D — निष्पादन और निगरानी',
    guidePhaseE:'चरण E — अनुकूलन और समापन',
    gf1Title:'लॉगिन और वातावरण जांच', gf1Desc:'लॉगिन करें और साइडबार से "AI मार्केटिंग → ऑटो रणनीति" पर जाएं। अपने प्रोडक्शन/डेमो वातावरण की पुष्टि करें।',
    gf2Title:'API चैनल कनेक्ट करें', gf2Desc:'इंटीग्रेशन हब में Meta, Google, Naver आदि के लिए API Key रजिस्टर करें। केवल कनेक्टेड चैनल ही अभियानों में उपयोग किए जा सकते हैं।',
    gf3Title:'डैशबोर्ड KPI की समीक्षा', gf3Desc:'होम डैशबोर्ड पर वर्तमान KPI, सक्रिय अभियान और चैनल-वार ROAS की जांच करें। यह डेटा AI सिफारिशों का आधार है।',
    gf4Title:'मासिक बजट सेट करें', gf4Desc:'"② अभियान सेटअप" टैब में, अपना मासिक विज्ञापन बजट चुनें या दर्ज करें। AI आपके बजट स्तर के आधार पर चैनल सिफारिशें अनुकूलित करता है।',
    gf5Title:'उत्पाद श्रेणियां चुनें', gf5Desc:'11 श्रेणियों (सौंदर्य, फैशन, खाद्य, आदि) में से चुनें। बहु-चयन उच्च सटीकता के लिए क्रॉस-विश्लेषण सक्षम करता है।',
    gf6Title:'विज्ञापन चैनल चुनें', gf6Desc:'AI श्रेणी + बजट विश्लेषण के आधार पर इष्टतम चैनल संयोजन की सिफारिश करता है। आप मैन्युअल रूप से चैनल जोड़/हटा सकते हैं।',
    gf7Title:'लक्ष्य और अवधि सेट करें', gf7Desc:'अभियान का नाम, निष्पादन अवधि (मासिक/तिमाही/अर्ध-वार्षिक) और लक्षित दर्शक कॉन्फ़िगर करें।',
    gf8Title:'AI रणनीति सिमुलेशन', gf8Desc:'"AI रणनीति बनाएं" पर क्लिक करके प्रति-चैनल बजट आवंटन, अनुमानित इम्प्रेशन, क्लिक, रूपांतरण और ROAS की स्वचालित गणना करें।',
    gf9Title:'विज्ञापन क्रिएटिव बनाएं', gf9Desc:'"① क्रिएटिव स्टूडियो" टैब में, AI प्रति चैनल अनुकूलित विज्ञापन क्रिएटिव स्वचालित रूप से बनाता है। टेक्स्ट, इमेज और वीडियो फ़ॉर्मेट समर्थित हैं।',
    gf10Title:'रणनीति पूर्वावलोकन और समायोजन', gf10Desc:'"③ AI पूर्वावलोकन" टैब में, प्रति-चैनल आवंटन और अनुमानित KPI की समीक्षा करें। स्लाइडर से आवंटन अनुपात मैन्युअल रूप से समायोजित करें।',
    gf11Title:'अनुमोदन के लिए जमा करें', gf11Desc:'रणनीति को अंतिम रूप दें और "अनुमोदन अनुरोध" पर क्लिक करें। जमा करने से पहले अनुमोदन मॉडल में बजट, ROAS और चैनलों की समीक्षा करें।',
    gf12Title:'अभियान प्रबंधक में निगरानी', gf12Desc:'जमा किए गए अभियान अभियान प्रबंधक पृष्ठ पर वास्तविक समय में ट्रैक किए जाते हैं। स्थिति (लंबित/स्वीकृत/सक्रिय/रुका हुआ) की निगरानी करें।',
    gf13Title:'AI स्वचालित अनुकूलन', gf13Desc:'AI वास्तविक समय डेटा का विश्लेषण करता है और कम प्रदर्शन वाले चैनलों से उच्च प्रदर्शन वाले चैनलों में बजट स्वचालित रूप से पुनर्आवंटित करता है।',
    gf14Title:'प्रदर्शन रिपोर्ट विश्लेषण', gf14Desc:'अभियान समाप्ति के बाद, प्रति-चैनल ROAS, CPA, CTR और अन्य प्रमुख मेट्रिक्स का विश्लेषण करें। AI अगले अभियानों के लिए सुधार सुझाता है।',
    gf15Title:'अगला अभियान दोहराएं', gf15Desc:'विश्लेषण परिणामों के आधार पर, नया अभियान बनाने के लिए बजट/श्रेणियां/चैनल समायोजित करें। प्रत्येक पुनरावृत्ति के साथ AI सीखना बेहतर होता है।',
    guideTabGuideName:'📖 उपयोग गाइड', guideTabGuideDesc:'प्लेटफ़ॉर्म सुविधाओं और संपूर्ण वर्कफ़्लो की चरण-दर-चरण मार्गदर्शिका।',
    guideTip6:'इष्टतम मिश्रण खोजने के लिए AI-अनुशंसित चैनलों की तुलना मैन्युअल चयनों से करें।',
    guideTip7:'बजट ओवररन को रोकने के लिए निष्पादन से पहले हमेशा प्रबंधक अनुमोदन के लिए जमा करें।',
    csTitle:'क्रिएटिव स्टूडियो', csSubtitle:'विभिन्न प्लेटफ़ॉर्म पर विज्ञापन क्रिएटिव डिज़ाइन और प्रबंधित करें',
    csTabGallery:'गैलरी', csTabCreateNew:'नया बनाएं', csTabPerformance:'प्रदर्शन', csTabBrandAssets:'ब्रांड एसेट',
    csKpiCreatives:'क्रिएटिव', csKpiFormats:'फ़ॉर्मेट', csKpiApproved:'स्वीकृत', csKpiTopCtr:'शीर्ष CTR',
    csFeatMultiFormat:'मल्टी-फ़ॉर्मेट एक्सपोर्ट', csFeatAiCopy:'AI कॉपी जेनरेटर', csFeatPerfAnalytics:'प्रदर्शन विश्लेषण', csFeatBrandCheck:'ब्रांड संगतता जांच',
    csSystemOk:'सिस्टम सामान्य रूप से चल रहा है',
    autoTab1:'① क्रिएटिव स्टूडियो',
  },
  pt: {
    guideFullTitle:'📋 Guia Completo — Do Início ao Fim',
    guideFullSub:'Guia passo a passo do fluxo completo da plataforma de automação de marketing com IA.',
    guidePhaseA:'Fase A — Preparação Inicial',
    guidePhaseB:'Fase B — Design da Campanha',
    guidePhaseC:'Fase C — Estratégia IA e Criativos',
    guidePhaseD:'Fase D — Execução e Monitoramento',
    guidePhaseE:'Fase E — Otimização e Conclusão',
    gf1Title:'Login e Verificação do Ambiente', gf1Desc:'Faça login e navegue até "Marketing IA → Estratégia Automática" na barra lateral. Verifique seu ambiente Produção/Demo.',
    gf2Title:'Conectar Canais API', gf2Desc:'Registre API Keys para Meta, Google, Naver, etc. no Hub de Integração. Apenas canais conectados podem ser usados em campanhas.',
    gf3Title:'Revisar KPIs do Dashboard', gf3Desc:'Verifique KPIs atuais, campanhas ativas e ROAS por canal no Dashboard Principal. Esses dados alimentam as recomendações da IA.',
    gf4Title:'Definir Orçamento Mensal', gf4Desc:'Na aba "② Configuração de Campanha", selecione ou insira seu orçamento mensal de anúncios. A IA otimiza recomendações de canais com base no seu nível de orçamento.',
    gf5Title:'Selecionar Categorias de Produtos', gf5Desc:'Escolha entre 11 categorias (Beleza, Moda, Alimentos, etc.). Seleção múltipla habilita análise cruzada para maior precisão.',
    gf6Title:'Escolher Canais de Anúncio', gf6Desc:'A IA recomenda combinações ideais de canais com base na análise de categoria + orçamento. Você pode adicionar ou remover canais manualmente.',
    gf7Title:'Definir Alvo e Período', gf7Desc:'Configure nome da campanha, período de execução (mensal/trimestral/semestral) e público-alvo. A IA sugere segmentação ideal por canal.',
    gf8Title:'Simulação de Estratégia IA', gf8Desc:'Clique em "Gerar Estratégia IA" para calcular automaticamente alocação de orçamento, impressões, cliques, conversões e ROAS estimados por canal.',
    gf9Title:'Criar Criativos de Anúncio', gf9Desc:'Na aba "① Estúdio Criativo", a IA gera automaticamente criativos otimizados por canal. Suporta formatos de texto, imagem e vídeo.',
    gf10Title:'Visualizar e Ajustar Estratégia', gf10Desc:'Na aba "③ Prévia IA", revise alocações por canal e KPIs estimados. Use controles deslizantes para ajustar proporções de alocação manualmente.',
    gf11Title:'Enviar para Aprovação', gf11Desc:'Finalize sua estratégia e clique em "Solicitar Aprovação". Revise orçamento, ROAS e canais no modal de aprovação antes de enviar.',
    gf12Title:'Monitorar no Gerenciador de Campanhas', gf12Desc:'Campanhas enviadas são rastreadas em tempo real na página do Gerenciador. Monitore status (pendente/aprovada/ativa/pausada).',
    gf13Title:'Otimização Automática por IA', gf13Desc:'A IA analisa dados em tempo real e realoca automaticamente o orçamento de canais com baixo desempenho para canais com alto desempenho.',
    gf14Title:'Analisar Relatórios de Desempenho', gf14Desc:'Após o término da campanha, analise ROAS, CPA, CTR e outras métricas principais por canal. A IA sugere melhorias para próximas campanhas.',
    gf15Title:'Iterar Próxima Campanha', gf15Desc:'Com base nos resultados da análise, ajuste orçamento/categorias/canais para criar nova campanha. O aprendizado da IA melhora a cada iteração.',
    guideTabGuideName:'📖 Guia do Usuário', guideTabGuideDesc:'Guia passo a passo das funcionalidades da plataforma e fluxo completo.',
    guideTip6:'Compare canais recomendados pela IA com seleções manuais para encontrar a combinação ideal.',
    guideTip7:'Sempre envie para aprovação do gerente antes da execução para evitar estouros de orçamento.',
    csTitle:'Estúdio Criativo', csSubtitle:'Projete e gerencie criativos de anúncio em todas as plataformas',
    csTabGallery:'Galeria', csTabCreateNew:'Criar Novo', csTabPerformance:'Desempenho', csTabBrandAssets:'Ativos da Marca',
    csKpiCreatives:'Criativos', csKpiFormats:'Formatos', csKpiApproved:'Aprovados', csKpiTopCtr:'Melhor CTR',
    csFeatMultiFormat:'Exportação multiformato', csFeatAiCopy:'Gerador de cópia IA', csFeatPerfAnalytics:'Análise de desempenho', csFeatBrandCheck:'Verificação de consistência da marca',
    csSystemOk:'Sistema Operacional',
    autoTab1:'① Estúdio Criativo',
  },
};

function inject(lang, keys) {
  const fp = p.join(dir, lang + '.js');
  let src = fs.readFileSync(fp, 'utf8');
  const nsIdx = src.indexOf('"marketing"');
  if (nsIdx < 0) return console.log(lang + ': no marketing ns');
  const bi = src.indexOf('{', nsIdx);
  let adds = '';
  const block = src.substring(nsIdx, Math.min(src.length, nsIdx + 50000));
  for (const [k, v] of Object.entries(keys)) {
    if (!new RegExp(`"${k}"\\s*:`).test(block)) {
      adds += `\n    "${k}": ${JSON.stringify(v)},`;
    }
  }
  if (adds) {
    src = src.substring(0, bi + 1) + adds + src.substring(bi + 1);
    fs.writeFileSync(fp, src, 'utf8');
    console.log(`✅ ${lang}: ${adds.split('\n').filter(l=>l.trim()).length} keys injected`);
  } else {
    console.log(`⏭ ${lang}: all keys exist`);
  }
}

for (const [lang, keys] of Object.entries(translations)) {
  inject(lang, keys);
}
console.log('Batch 1 (ar, hi, pt) done!');
