const fs=require('fs'),path=require('path'),dir=__dirname+'/src/i18n/locales/';
function inj(f,d){const p=path.join(dir,f);let s=fs.readFileSync(p,'utf8');
    // Merge into existing influencer block
    const ei=s.indexOf('"influencer":{');
    if(ei<0){console.log('No influencer block in',f);return;}
    // Find end of influencer block
    let dd=0,i=s.indexOf('{',ei+12);
    for(;i<s.length;i++){if(s[i]==='{')dd++;else if(s[i]==='}'){dd--;if(dd===0)break;}}
    // Insert before the closing }
    const newKeys=Object.entries(d).map(([k,v])=>`"${k}":${JSON.stringify(v)}`).join(',');
    // Check if keys already exist
    const existBlock=s.substring(ei,i);
    const keysToAdd=[];
    for(const[k,v] of Object.entries(d)){
        if(!existBlock.includes(`"${k}"`)){keysToAdd.push(`"${k}":${JSON.stringify(v)}`);}
    }
    if(keysToAdd.length===0){console.log('All keys exist in',f);return;}
    s=s.substring(0,i)+','+keysToAdd.join(',')+s.substring(i);
    fs.writeFileSync(p,s);
    try{delete require.cache[require.resolve(p)];require(p);console.log('OK',f,keysToAdd.length,'keys added');}catch(e){console.log('ERR',f,e.message.slice(0,60));}
}

// Guide steps 7-15 + extra tips for ko
const ko={
    guideStep7Title:"콘텐츠 성과 분석",guideStep7Desc:"각 콘텐츠의 조회수, 참여율, 주문 전환율을 분석합니다.",
    guideStep8Title:"하이뷰/로우세일 분석",guideStep8Desc:"조회수는 높지만 매출이 낮은 콘텐츠를 식별하고 원인을 분석합니다.",
    guideStep9Title:"콘텐츠 재활용 전략",guideStep9Desc:"참여율이 높은 콘텐츠를 광고 소재나 제품 페이지에 재활용합니다.",
    guideStep10Title:"UGC 리뷰 수집",guideStep10Desc:"채널별 UGC 리뷰를 자동 수집하고 감성 분석을 수행합니다.",
    guideStep11Title:"부정 키워드 모니터링",guideStep11Desc:"부정적 키워드 트렌드를 추적하여 브랜드 리스크를 관리합니다.",
    guideStep12Title:"AI 크리에이터 평가",guideStep12Desc:"AI가 자동으로 크리에이터의 성과, 참여도, ROI를 종합 평가합니다.",
    guideStep13Title:"재계약 의사결정",guideStep13Desc:"AI 평가 기반으로 재계약 추천/비추천을 확인합니다.",
    guideStep14Title:"정산 보고서 생성",guideStep14Desc:"세금 계산이 포함된 정산 명세서를 자동 생성하여 다운로드합니다.",
    guideStep15Title:"월간 인플루언서 성과 보고",guideStep15Desc:"전체 인플루언서의 ROI, 매출 기여, 콘텐츠 성과를 월간 보고서로 정리합니다.",
    guideTip6:"화이트리스트 만료 전 최소 30일 전에 갱신 프로세스를 시작하세요.",
    guideTip7:"AI 평가 점수가 70점 미만인 크리에이터는 재계약 전 심층 검토가 필요합니다.",
    guideGuideNa:"가이드",guideGuideDe:"전체 이용 안내"
};
const en={
    guideStep7Title:"Content Performance Analysis",guideStep7Desc:"Analyze views, engagement rate, and order conversion for each content.",
    guideStep8Title:"High View/Low Sale Analysis",guideStep8Desc:"Identify high-view but low-sale content and analyze root causes.",
    guideStep9Title:"Content Reuse Strategy",guideStep9Desc:"Reuse high-engagement content as ad creatives or product page materials.",
    guideStep10Title:"UGC Review Collection",guideStep10Desc:"Automatically collect UGC reviews by channel and perform sentiment analysis.",
    guideStep11Title:"Negative Keyword Monitoring",guideStep11Desc:"Track negative keyword trends to manage brand reputation risks.",
    guideStep12Title:"AI Creator Evaluation",guideStep12Desc:"AI automatically evaluates creator performance, engagement, and ROI.",
    guideStep13Title:"Renewal Decision",guideStep13Desc:"Review AI-based renewal recommendations before re-contracting.",
    guideStep14Title:"Settlement Report Generation",guideStep14Desc:"Auto-generate settlement statements with tax calculations for download.",
    guideStep15Title:"Monthly Influencer Report",guideStep15Desc:"Compile monthly reports covering all influencer ROI, revenue contribution, and content performance.",
    guideTip6:"Start whitelist renewal process at least 30 days before expiry.",
    guideTip7:"Creators with AI evaluation scores below 70 require in-depth review before renewal.",
    guideGuideNa:"Guide",guideGuideDe:"Complete usage guide"
};
const ja={
    guideStep7Title:"コンテンツ成果分析",guideStep7Desc:"各コンテンツの閲覧数、エンゲージメント率、注文転換率を分析します。",
    guideStep8Title:"高閲覧/低売上分析",guideStep8Desc:"閲覧数は高いが売上が低いコンテンツを特定し原因を分析します。",
    guideStep9Title:"コンテンツ再利用戦略",guideStep9Desc:"エンゲージメントの高いコンテンツを広告素材や商品ページに再利用します。",
    guideStep10Title:"UGCレビュー収集",guideStep10Desc:"チャネル別にUGCレビューを自動収集し感情分析を行います。",
    guideStep11Title:"ネガティブキーワード監視",guideStep11Desc:"ネガティブキーワードのトレンドを追跡しブランドリスクを管理します。",
    guideStep12Title:"AIクリエイター評価",guideStep12Desc:"AIがクリエイターのパフォーマンス、エンゲージメント、ROIを総合評価します。",
    guideStep13Title:"再契約判断",guideStep13Desc:"AI評価に基づく再契約推奨/非推奨を確認します。",
    guideStep14Title:"精算レポート生成",guideStep14Desc:"税金計算を含む精算明細書を自動生成してダウンロードします。",
    guideStep15Title:"月次インフルエンサーレポート",guideStep15Desc:"全インフルエンサーのROI、売上貢献、コンテンツ成果を月次レポートにまとめます。",
    guideTip6:"ホワイトリスト期限の30日前までに更新プロセスを開始してください。",
    guideTip7:"AI評価スコアが70点未満のクリエイターは再契約前に詳細レビューが必要です。",
    guideGuideNa:"ガイド",guideGuideDe:"利用ガイド全体"
};
const ar={
    guideStep7Title:"تحليل أداء المحتوى",guideStep7Desc:"تحليل المشاهدات ومعدل التفاعل وتحويل الطلبات لكل محتوى.",
    guideStep8Title:"تحليل المشاهدات العالية/المبيعات المنخفضة",guideStep8Desc:"تحديد المحتوى ذو المشاهدات العالية والمبيعات المنخفضة وتحليل الأسباب.",
    guideStep9Title:"استراتيجية إعادة استخدام المحتوى",guideStep9Desc:"إعادة استخدام المحتوى عالي التفاعل في الإعلانات أو صفحات المنتجات.",
    guideStep10Title:"جمع مراجعات UGC",guideStep10Desc:"جمع مراجعات UGC تلقائياً حسب القناة وإجراء تحليل المشاعر.",
    guideStep11Title:"مراقبة الكلمات السلبية",guideStep11Desc:"تتبع اتجاهات الكلمات السلبية لإدارة مخاطر العلامة التجارية.",
    guideStep12Title:"تقييم المبدعين بالذكاء الاصطناعي",guideStep12Desc:"يقيّم الذكاء الاصطناعي أداء المبدع والتفاعل والعائد على الاستثمار تلقائياً.",
    guideStep13Title:"قرار التجديد",guideStep13Desc:"مراجعة توصيات التجديد المستندة إلى تقييم الذكاء الاصطناعي.",
    guideStep14Title:"إنشاء تقرير التسوية",guideStep14Desc:"إنشاء كشوف تسوية تلقائياً مع حسابات الضرائب للتنزيل.",
    guideStep15Title:"تقرير المؤثرين الشهري",guideStep15Desc:"تجميع تقارير شهرية تغطي عائد الاستثمار ومساهمة الإيرادات وأداء المحتوى.",
    guideTip6:"ابدأ عملية تجديد القائمة البيضاء قبل 30 يوماً على الأقل من انتهاء الصلاحية.",
    guideTip7:"المبدعون بتقييم أقل من 70 يحتاجون مراجعة معمقة قبل التجديد.",
    guideGuideNa:"الدليل",guideGuideDe:"دليل الاستخدام الكامل"
};

const langs={ko,en,ja,ar};
// For remaining languages, use English as base
const others=['zh','zh-TW','de','es','fr','pt','ru','hi','id','th','vi'];
for(const lang of others){langs[lang]=en;}
// Override key languages
langs.zh={...en,guideStep7Title:"内容绩效分析",guideStep8Title:"高浏览/低销售分析",guideStep9Title:"内容复用策略",guideStep10Title:"UGC评论收集",guideStep11Title:"负面关键词监控",guideStep12Title:"AI创作者评估",guideStep13Title:"续约决策",guideStep14Title:"结算报告生成",guideStep15Title:"月度网红报告"};
langs['zh-TW']={...en,guideStep7Title:"內容績效分析",guideStep8Title:"高瀏覽/低銷售分析",guideStep9Title:"內容複用策略",guideStep10Title:"UGC評論收集",guideStep11Title:"負面關鍵詞監控",guideStep12Title:"AI創作者評估",guideStep13Title:"續約決策",guideStep14Title:"結算報告生成",guideStep15Title:"月度網紅報告"};
langs.de={...en,guideStep7Title:"Content-Performance-Analyse",guideStep8Title:"Hohe Aufrufe/Geringe Verkäufe",guideStep9Title:"Content-Wiederverwertungsstrategie",guideStep10Title:"UGC-Bewertungen sammeln",guideStep11Title:"Negative Keywords überwachen",guideStep12Title:"KI-Creator-Bewertung",guideStep13Title:"Verlängerungsentscheidung",guideStep14Title:"Abrechnungsbericht erstellen",guideStep15Title:"Monatlicher Influencer-Bericht"};
langs.es={...en,guideStep7Title:"Análisis de rendimiento del contenido",guideStep8Title:"Alto vistas/Bajas ventas",guideStep9Title:"Estrategia de reutilización",guideStep10Title:"Recopilación de reseñas UGC",guideStep11Title:"Monitoreo de palabras negativas",guideStep12Title:"Evaluación IA de creadores",guideStep13Title:"Decisión de renovación",guideStep14Title:"Generación de informe de liquidación",guideStep15Title:"Informe mensual de influencers"};
langs.fr={...en,guideStep7Title:"Analyse des performances du contenu",guideStep8Title:"Vues élevées/Ventes faibles",guideStep9Title:"Stratégie de réutilisation",guideStep10Title:"Collecte d'avis UGC",guideStep11Title:"Surveillance des mots négatifs",guideStep12Title:"Évaluation IA des créateurs",guideStep13Title:"Décision de renouvellement",guideStep14Title:"Génération de rapport de règlement",guideStep15Title:"Rapport mensuel des influenceurs"};
langs.pt={...en,guideStep7Title:"Análise de desempenho do conteúdo",guideStep8Title:"Altas visualizações/Baixas vendas",guideStep9Title:"Estratégia de reutilização",guideStep10Title:"Coleta de avaliações UGC",guideStep11Title:"Monitoramento de palavras negativas",guideStep12Title:"Avaliação IA de criadores",guideStep13Title:"Decisão de renovação",guideStep14Title:"Geração de relatório de liquidação",guideStep15Title:"Relatório mensal de influenciadores"};
langs.ru={...en,guideStep7Title:"Анализ эффективности контента",guideStep8Title:"Высокие просмотры/Низкие продажи",guideStep9Title:"Стратегия повторного использования",guideStep10Title:"Сбор UGC-отзывов",guideStep11Title:"Мониторинг негативных ключевых слов",guideStep12Title:"ИИ-оценка креаторов",guideStep13Title:"Решение о продлении",guideStep14Title:"Генерация отчёта о расчётах",guideStep15Title:"Ежемесячный отчёт по инфлюенсерам"};
langs.hi={...en,guideStep7Title:"सामग्री प्रदर्शन विश्लेषण",guideStep8Title:"उच्च व्यू/कम बिक्री विश्लेषण",guideStep9Title:"सामग्री पुनः उपयोग रणनीति",guideStep10Title:"UGC समीक्षा संग्रह",guideStep11Title:"नकारात्मक कीवर्ड निगरानी",guideStep12Title:"AI क्रिएटर मूल्यांकन",guideStep13Title:"नवीनीकरण निर्णय",guideStep14Title:"निपटान रिपोर्ट",guideStep15Title:"मासिक इन्फ्लुएंसर रिपोर्ट"};
langs.th={...en,guideStep7Title:"วิเคราะห์ผลงานเนื้อหา",guideStep8Title:"ยอดวิวสูง/ยอดขายต่ำ",guideStep9Title:"กลยุทธ์นำเนื้อหากลับมาใช้",guideStep10Title:"รวบรวมรีวิว UGC",guideStep11Title:"ติดตามคำหลักเชิงลบ",guideStep12Title:"ประเมินครีเอเตอร์ด้วย AI",guideStep13Title:"ตัดสินใจต่อสัญญา",guideStep14Title:"สร้างรายงานการชำระเงิน",guideStep15Title:"รายงานอินฟลูเอนเซอร์รายเดือน"};
langs.vi={...en,guideStep7Title:"Phân tích hiệu suất nội dung",guideStep8Title:"Lượt xem cao/Doanh số thấp",guideStep9Title:"Chiến lược tái sử dụng nội dung",guideStep10Title:"Thu thập đánh giá UGC",guideStep11Title:"Giám sát từ khóa tiêu cực",guideStep12Title:"Đánh giá nhà sáng tạo bằng AI",guideStep13Title:"Quyết định gia hạn",guideStep14Title:"Tạo báo cáo thanh toán",guideStep15Title:"Báo cáo influencer hàng tháng"};
langs.id={...en,guideStep7Title:"Analisis Kinerja Konten",guideStep8Title:"Tampilan Tinggi/Penjualan Rendah",guideStep9Title:"Strategi Penggunaan Ulang Konten",guideStep10Title:"Pengumpulan Ulasan UGC",guideStep11Title:"Pemantauan Kata Kunci Negatif",guideStep12Title:"Evaluasi Kreator AI",guideStep13Title:"Keputusan Perpanjangan",guideStep14Title:"Pembuatan Laporan Penyelesaian",guideStep15Title:"Laporan Influencer Bulanan"};

for(const[lang,data] of Object.entries(langs)){
    inj(lang+'.js',data);
}
console.log('Influencer guide i18n: all 15 languages done');
