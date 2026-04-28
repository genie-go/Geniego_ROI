const fs=require('fs'),path=require('path'),dir=__dirname+'/src/i18n/locales/';
function inj(f,d){const p=path.join(dir,f);let s=fs.readFileSync(p,'utf8');
    // Remove old creative block if exists
    const ei=s.indexOf('"creative":{');
    if(ei>0){let dd=0,i=s.indexOf('{',ei+10);for(;i<s.length;i++){if(s[i]==='{')dd++;else if(s[i]==='}'){dd--;if(dd===0){i++;break;}}}let c=ei;if(c>0&&s[c-1]===',')c--;s=s.substring(0,c)+s.substring(i);}
    const lb=s.lastIndexOf('}');
    s=s.substring(0,lb)+',"creative":'+JSON.stringify(d)+s.substring(lb);
    fs.writeFileSync(p,s);
    try{delete require.cache[require.resolve(p)];require(p);console.log('OK',f);}catch(e){console.log('ERR',f,e.message.slice(0,80));}
}

const data={
    ko:{pageTitle:"AI 광고 소재 스튜디오",pageDesc:"AI가 자동으로 광고 소재를 생성하고 최적화합니다. 카테고리와 채널을 선택하면 맞춤형 크리에이티브를 제안합니다.",comingSoonTitle:"곧 출시 예정",comingSoonDesc:"해당 기능은 현재 개발 중입니다.",comingSoonSub:"곧 업데이트를 통해 제공될 예정입니다."},
    en:{pageTitle:"AI Creative Studio",pageDesc:"AI automatically generates and optimizes ad creatives. Select a category and channel to get personalized creative suggestions.",comingSoonTitle:"Coming Soon",comingSoonDesc:"This feature is currently under development.",comingSoonSub:"It will be available through an upcoming update."},
    ja:{pageTitle:"AI クリエイティブスタジオ",pageDesc:"AIが広告クリエイティブを自動生成・最適化します。カテゴリとチャネルを選択するとカスタムクリエイティブを提案します。",comingSoonTitle:"近日公開予定",comingSoonDesc:"この機能は現在開発中です。",comingSoonSub:"まもなくアップデートで提供予定です。"},
    zh:{pageTitle:"AI 创意工作室",pageDesc:"AI自动生成并优化广告素材。选择类别和渠道即可获取定制创意建议。",comingSoonTitle:"即将推出",comingSoonDesc:"该功能正在开发中。",comingSoonSub:"即将通过更新提供。"},
    "zh-TW":{pageTitle:"AI 創意工作室",pageDesc:"AI自動生成並優化廣告素材。選擇類別和頻道即可取得客製化創意建議。",comingSoonTitle:"即將推出",comingSoonDesc:"該功能正在開發中。",comingSoonSub:"即將透過更新提供。"},
    ar:{pageTitle:"استوديو الإبداع بالذكاء الاصطناعي",pageDesc:"يقوم الذكاء الاصطناعي بإنشاء وتحسين المواد الإعلانية تلقائياً. اختر الفئة والقناة للحصول على اقتراحات إبداعية مخصصة.",comingSoonTitle:"قريباً",comingSoonDesc:"هذه الميزة قيد التطوير حالياً.",comingSoonSub:"ستكون متاحة من خلال تحديث قادم."},
    de:{pageTitle:"AI Kreativstudio",pageDesc:"KI erstellt und optimiert Werbekreative automatisch. Wählen Sie Kategorie und Kanal für maßgeschneiderte Kreativvorschläge.",comingSoonTitle:"Demnächst verfügbar",comingSoonDesc:"Diese Funktion wird derzeit entwickelt.",comingSoonSub:"Sie wird bald durch ein Update verfügbar sein."},
    es:{pageTitle:"Estudio Creativo IA",pageDesc:"La IA genera y optimiza creatividades publicitarias automáticamente. Seleccione categoría y canal para obtener sugerencias personalizadas.",comingSoonTitle:"Próximamente",comingSoonDesc:"Esta función está en desarrollo.",comingSoonSub:"Estará disponible próximamente mediante actualización."},
    fr:{pageTitle:"Studio Créatif IA",pageDesc:"L'IA génère et optimise automatiquement les créations publicitaires. Sélectionnez une catégorie et un canal pour des suggestions personnalisées.",comingSoonTitle:"Bientôt disponible",comingSoonDesc:"Cette fonctionnalité est en cours de développement.",comingSoonSub:"Elle sera disponible prochainement via une mise à jour."},
    pt:{pageTitle:"Estúdio Criativo IA",pageDesc:"A IA gera e otimiza criativos publicitários automaticamente. Selecione categoria e canal para sugestões personalizadas.",comingSoonTitle:"Em breve",comingSoonDesc:"Esta funcionalidade está em desenvolvimento.",comingSoonSub:"Estará disponível em breve através de uma atualização."},
    ru:{pageTitle:"AI Креативная студия",pageDesc:"ИИ автоматически создаёт и оптимизирует рекламные креативы. Выберите категорию и канал для персонализированных предложений.",comingSoonTitle:"Скоро",comingSoonDesc:"Эта функция находится в разработке.",comingSoonSub:"Она будет доступна в ближайшем обновлении."},
    hi:{pageTitle:"AI क्रिएटिव स्टूडियो",pageDesc:"AI स्वचालित रूप से विज्ञापन क्रिएटिव बनाता और अनुकूलित करता है। श्रेणी और चैनल चुनें।",comingSoonTitle:"जल्द आ रहा है",comingSoonDesc:"यह सुविधा विकास में है।",comingSoonSub:"जल्द ही अपडेट के माध्यम से उपलब्ध होगी।"},
    id:{pageTitle:"Studio Kreatif AI",pageDesc:"AI secara otomatis membuat dan mengoptimalkan kreatif iklan. Pilih kategori dan saluran untuk saran kreatif yang dipersonalisasi.",comingSoonTitle:"Segera Hadir",comingSoonDesc:"Fitur ini sedang dalam pengembangan.",comingSoonSub:"Akan tersedia melalui pembaruan mendatang."},
    th:{pageTitle:"สตูดิโอครีเอทีฟ AI",pageDesc:"AI สร้างและปรับปรุงโฆษณาอัตโนมัติ เลือกหมวดหมู่และช่องทางเพื่อรับข้อเสนอแนะที่ปรับแต่ง",comingSoonTitle:"เร็วๆ นี้",comingSoonDesc:"ฟีเจอร์นี้อยู่ระหว่างการพัฒนา",comingSoonSub:"จะพร้อมใช้งานผ่านการอัปเดตเร็วๆ นี้"},
    vi:{pageTitle:"Studio Sáng tạo AI",pageDesc:"AI tự động tạo và tối ưu hóa quảng cáo sáng tạo. Chọn danh mục và kênh để nhận đề xuất phù hợp.",comingSoonTitle:"Sắp ra mắt",comingSoonDesc:"Tính năng này đang được phát triển.",comingSoonSub:"Sẽ có sẵn qua bản cập nhật sắp tới."}
};

for(const[lang,vals] of Object.entries(data)){
    inj(lang+'.js',vals);
}
console.log('Creative i18n: all 15 languages done');
