const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
const K={
ko:{tabAiDesign:"AI 디자인",
guideStep7Title:"커스텀 디자인 업로드",guideStep7Desc:"드래그 앤 드롭으로 직접 만든 팝업 이미지를 업로드합니다. PNG, JPG, WebP 형식을 지원합니다(최대 5MB).",
guideStep8Title:"트리거 규칙 설정",guideStep8Desc:"이탈 감지, 시간 지연, 스크롤 깊이, 비활성 감지 등 각 팝업의 트리거를 설정합니다.",
guideStep9Title:"CTA 및 링크 설정",guideStep9Desc:"CTA 버튼 텍스트와 클릭 시 이동할 URL을 설정합니다.",
guideStep10Title:"쿠키 제어 활성화",guideStep10Desc:"동일 사용자에게 팝업이 중복 표시되지 않도록 쿠키 기반 빈도 제어를 설정합니다.",
guideStep11Title:"GDPR 준수",guideStep11Desc:"EU 사용자를 위한 개인정보 동의 표시를 활성화합니다.",
guideStep12Title:"모바일 최적화",guideStep12Desc:"모바일 기기에서 팝업이 올바르게 표시되도록 자동 리사이징을 활성화합니다.",
guideStep13Title:"AI 디자인 엔진 사용",guideStep13Desc:"AI 디자인 탭에서 플랫폼, 테마, 콘텐츠를 선택하고 AI가 크리에이티브를 자동 생성합니다.",
guideStep14Title:"A/B 테스트 실행",guideStep14Desc:"두 개의 팝업 변형을 비교하여 전환율이 높은 디자인을 데이터 기반으로 검증합니다.",
guideStep15Title:"배포 및 성과 모니터링",guideStep15Desc:"테스트 완료된 팝업을 운영 사이트에 배포하고 대시보드에서 실시간 성과를 모니터링합니다.",
guideTip8:"AI 디자인 엔진에서 플랫폼을 먼저 선택하면 최적 해상도가 자동 설정됩니다.",
guideTip9:"데모/운영 데이터 격리가 활성화되어 있어 안심하고 테스트하세요.",
guideTip10:"이벤트 기간 설정에서 타임존을 정확히 설정하면 글로벌 캠페인에 효과적입니다."},
en:{tabAiDesign:"AI Design",
guideStep7Title:"Upload Custom Design",guideStep7Desc:"Upload your own popup images via drag & drop. Supports PNG, JPG, WebP (max 5MB).",
guideStep8Title:"Set Trigger Rules",guideStep8Desc:"Choose Exit-Intent, Time Delay, Scroll Depth, or Inactivity trigger for each popup.",
guideStep9Title:"Configure CTA & Link",guideStep9Desc:"Set CTA button text and shortcut URL to redirect users on click.",
guideStep10Title:"Enable Cookie Control",guideStep10Desc:"Prevent duplicate popup display to the same user with cookie-based frequency capping.",
guideStep11Title:"GDPR Compliance",guideStep11Desc:"Enable privacy consent display for EU users to comply with GDPR regulations.",
guideStep12Title:"Mobile Optimization",guideStep12Desc:"Auto-resize popups for mobile devices to ensure proper display on all screen sizes.",
guideStep13Title:"Use AI Design Engine",guideStep13Desc:"Select platform, theme, and content in the AI Design tab to auto-generate optimized creatives.",
guideStep14Title:"Run A/B Tests",guideStep14Desc:"Compare two popup variants to verify which design has higher conversion rates.",
guideStep15Title:"Deploy & Monitor",guideStep15Desc:"Deploy tested popups to production and monitor real-time performance on the dashboard.",
guideTip8:"Select platform first in AI Design Engine for auto-optimized resolution.",
guideTip9:"Demo/production data isolation is active — test freely.",
guideTip10:"Set timezone accurately in Event Period for effective global campaigns."},
ar:{tabAiDesign:"تصميم بالذكاء الاصطناعي",
guideStep7Title:"تحميل تصميم مخصص",guideStep7Desc:"ارفع صور النوافذ المنبثقة الخاصة بك عبر السحب والإفلات. يدعم PNG وJPG وWebP (حد أقصى 5 ميجا).",
guideStep8Title:"تعيين قواعد التفعيل",guideStep8Desc:"اختر تفعيل عند الخروج أو تأخير زمني أو عمق التمرير أو عدم النشاط لكل نافذة.",
guideStep9Title:"إعداد زر الإجراء والرابط",guideStep9Desc:"حدد نص زر الإجراء وعنوان URL للتوجيه عند النقر.",
guideStep10Title:"تفعيل التحكم بالكوكيز",guideStep10Desc:"منع عرض النوافذ المنبثقة المكررة لنفس المستخدم عبر التحكم بالتكرار.",
guideStep11Title:"الامتثال لـ GDPR",guideStep11Desc:"تفعيل عرض موافقة الخصوصية لمستخدمي الاتحاد الأوروبي.",
guideStep12Title:"تحسين الجوال",guideStep12Desc:"تغيير حجم النوافذ تلقائياً للأجهزة المحمولة لضمان العرض الصحيح.",
guideStep13Title:"استخدام محرك التصميم بالذكاء الاصطناعي",guideStep13Desc:"حدد المنصة والموضوع والمحتوى في تبويب التصميم لإنشاء إبداعات محسّنة تلقائياً.",
guideStep14Title:"تشغيل اختبارات A/B",guideStep14Desc:"قارن بين نسختين من النوافذ المنبثقة للتحقق من التصميم الأعلى تحويلاً.",
guideStep15Title:"النشر والمراقبة",guideStep15Desc:"انشر النوافذ المختبرة في الموقع الحي وراقب الأداء في الوقت الفعلي.",
guideTip8:"اختر المنصة أولاً في محرك التصميم للحصول على دقة محسّنة تلقائياً.",
guideTip9:"عزل بيانات العرض/الإنتاج نشط — اختبر بحرية.",
guideTip10:"حدد المنطقة الزمنية بدقة في فترة الحدث للحملات العالمية."},
ja:{tabAiDesign:"AIデザイン",guideStep7Title:"カスタムデザインのアップロード",guideStep7Desc:"ドラッグ＆ドロップで独自のポップアップ画像をアップロードします。",guideStep8Title:"トリガールールの設定",guideStep8Desc:"離脱検知、時間遅延、スクロール深度などのトリガーを設定します。",guideStep9Title:"CTAとリンクの設定",guideStep9Desc:"CTAボタンテキストとリダイレクトURLを設定します。",guideStep10Title:"Cookie制御の有効化",guideStep10Desc:"同一ユーザーへの重複表示を防止します。",guideStep11Title:"GDPR準拠",guideStep11Desc:"EUユーザー向けのプライバシー同意表示を有効化します。",guideStep12Title:"モバイル最適化",guideStep12Desc:"モバイルデバイスでの適切な表示を保証します。",guideStep13Title:"AIデザインエンジン使用",guideStep13Desc:"AIデザインタブでプラットフォームとテーマを選択して自動生成します。",guideStep14Title:"A/Bテスト実行",guideStep14Desc:"2つのバリエーションを比較して最適なデザインを検証します。",guideStep15Title:"デプロイと監視",guideStep15Desc:"テスト済みのポップアップを本番に展開しリアルタイムで監視します。"},
zh:{tabAiDesign:"AI设计",guideStep7Title:"上传自定义设计",guideStep7Desc:"拖放上传自定义弹窗图片。",guideStep8Title:"设置触发规则",guideStep8Desc:"选择退出意图、时间延迟等触发器。",guideStep9Title:"配置CTA和链接",guideStep9Desc:"设置按钮文字和跳转URL。",guideStep10Title:"启用Cookie控制",guideStep10Desc:"防止对同一用户重复显示。",guideStep11Title:"GDPR合规",guideStep11Desc:"为欧盟用户启用隐私同意。",guideStep12Title:"移动端优化",guideStep12Desc:"自动调整弹窗大小适应移动设备。",guideStep13Title:"使用AI设计引擎",guideStep13Desc:"在AI设计标签中选择平台和主题自动生成。",guideStep14Title:"运行A/B测试",guideStep14Desc:"比较两个变体验证最佳设计。",guideStep15Title:"部署和监控",guideStep15Desc:"部署已测试的弹窗并实时监控性能。"},
es:{tabAiDesign:"Diseño IA",guideStep7Title:"Subir diseño personalizado",guideStep7Desc:"Suba imágenes de popup mediante arrastrar y soltar.",guideStep8Title:"Configurar reglas de activación",guideStep8Desc:"Elija activador de intención de salida, retardo, profundidad de desplazamiento o inactividad.",guideStep9Title:"Configurar CTA y enlace",guideStep9Desc:"Establezca el texto del botón CTA y la URL de redirección.",guideStep10Title:"Activar control de cookies",guideStep10Desc:"Evite la visualización duplicada para el mismo usuario.",guideStep11Title:"Cumplimiento GDPR",guideStep11Desc:"Habilite el consentimiento de privacidad para usuarios de la UE.",guideStep12Title:"Optimización móvil",guideStep12Desc:"Redimensione automáticamente para dispositivos móviles.",guideStep13Title:"Usar motor de diseño IA",guideStep13Desc:"Seleccione plataforma y tema en la pestaña AI Design.",guideStep14Title:"Ejecutar pruebas A/B",guideStep14Desc:"Compare dos variantes de popup.",guideStep15Title:"Desplegar y monitorear",guideStep15Desc:"Despliegue y monitoree el rendimiento en tiempo real."},
fr:{tabAiDesign:"Design IA",guideStep7Title:"Télécharger un design personnalisé",guideStep7Desc:"Téléchargez vos images popup par glisser-déposer.",guideStep8Title:"Configurer les règles de déclenchement",guideStep8Desc:"Choisissez intention de sortie, délai, profondeur de défilement ou inactivité.",guideStep9Title:"Configurer CTA et lien",guideStep9Desc:"Définissez le texte du bouton CTA et l'URL de redirection.",guideStep10Title:"Activer le contrôle des cookies",guideStep10Desc:"Empêchez l'affichage en double pour le même utilisateur.",guideStep11Title:"Conformité RGPD",guideStep11Desc:"Activez le consentement de confidentialité pour les utilisateurs UE.",guideStep12Title:"Optimisation mobile",guideStep12Desc:"Redimensionnez automatiquement pour les appareils mobiles.",guideStep13Title:"Utiliser le moteur de design IA",guideStep13Desc:"Sélectionnez plateforme et thème dans l'onglet AI Design.",guideStep14Title:"Exécuter des tests A/B",guideStep14Desc:"Comparez deux variantes de popup.",guideStep15Title:"Déployer et surveiller",guideStep15Desc:"Déployez et surveillez les performances en temps réel."},
de:{tabAiDesign:"KI-Design",guideStep7Title:"Benutzerdefiniertes Design hochladen",guideStep7Desc:"Laden Sie Popup-Bilder per Drag & Drop hoch.",guideStep8Title:"Trigger-Regeln festlegen",guideStep8Desc:"Wählen Sie Exit-Intent, Zeitverzögerung, Scrolltiefe oder Inaktivität.",guideStep9Title:"CTA und Link konfigurieren",guideStep9Desc:"Legen Sie CTA-Text und Weiterleitungs-URL fest.",guideStep10Title:"Cookie-Steuerung aktivieren",guideStep10Desc:"Verhindern Sie doppelte Anzeige für denselben Benutzer.",guideStep11Title:"DSGVO-Konformität",guideStep11Desc:"Aktivieren Sie die Datenschutz-Einwilligung für EU-Nutzer.",guideStep12Title:"Mobile Optimierung",guideStep12Desc:"Automatische Größenanpassung für Mobilgeräte.",guideStep13Title:"KI-Design-Engine nutzen",guideStep13Desc:"Wählen Sie Plattform und Thema im KI-Design-Tab.",guideStep14Title:"A/B-Tests durchführen",guideStep14Desc:"Vergleichen Sie zwei Popup-Varianten.",guideStep15Title:"Bereitstellen und überwachen",guideStep15Desc:"Bereitstellung und Echtzeit-Performance-Überwachung."},
th:{tabAiDesign:"ออกแบบ AI",guideStep7Title:"อัปโหลดดีไซน์กำหนดเอง",guideStep7Desc:"อัปโหลดรูปป๊อปอัพด้วยการลากวาง",guideStep8Title:"ตั้งค่ากฎทริกเกอร์",guideStep8Desc:"เลือกทริกเกอร์สำหรับแต่ละป๊อปอัพ",guideStep9Title:"ตั้งค่า CTA และลิงก์",guideStep9Desc:"กำหนดข้อความปุ่มและ URL เปลี่ยนเส้นทาง",guideStep10Title:"เปิดใช้งานควบคุมคุกกี้",guideStep10Desc:"ป้องกันการแสดงซ้ำสำหรับผู้ใช้เดิม",guideStep11Title:"การปฏิบัติตาม GDPR",guideStep11Desc:"เปิดใช้งานความยินยอมด้านความเป็นส่วนตัว",guideStep12Title:"ปรับแต่งมือถือ",guideStep12Desc:"ปรับขนาดอัตโนมัติสำหรับอุปกรณ์มือถือ",guideStep13Title:"ใช้เครื่องมือ AI",guideStep13Desc:"เลือกแพลตฟอร์มและธีมในแท็บ AI Design",guideStep14Title:"ทดสอบ A/B",guideStep14Desc:"เปรียบเทียบสองรูปแบบป๊อปอัพ",guideStep15Title:"เผยแพร่และติดตามผล",guideStep15Desc:"เผยแพร่และติดตามผลแบบเรียลไทม์"},
vi:{tabAiDesign:"Thiết kế AI",guideStep7Title:"Tải lên thiết kế tùy chỉnh",guideStep7Desc:"Tải lên hình ảnh popup bằng kéo thả.",guideStep8Title:"Đặt quy tắc kích hoạt",guideStep8Desc:"Chọn kích hoạt cho mỗi popup.",guideStep9Title:"Cấu hình CTA và liên kết",guideStep9Desc:"Đặt văn bản nút và URL chuyển hướng.",guideStep10Title:"Bật kiểm soát cookie",guideStep10Desc:"Ngăn hiển thị trùng lặp.",guideStep11Title:"Tuân thủ GDPR",guideStep11Desc:"Bật hiển thị đồng ý quyền riêng tư cho người dùng EU.",guideStep12Title:"Tối ưu di động",guideStep12Desc:"Tự động thay đổi kích thước cho thiết bị di động.",guideStep13Title:"Sử dụng công cụ AI",guideStep13Desc:"Chọn nền tảng và chủ đề trong tab AI Design.",guideStep14Title:"Chạy kiểm tra A/B",guideStep14Desc:"So sánh hai biến thể popup.",guideStep15Title:"Triển khai và giám sát",guideStep15Desc:"Triển khai và giám sát hiệu suất thời gian thực."},
id:{tabAiDesign:"Desain AI",guideStep7Title:"Unggah desain kustom",guideStep7Desc:"Unggah gambar popup dengan seret dan lepas.",guideStep8Title:"Atur aturan pemicu",guideStep8Desc:"Pilih pemicu untuk setiap popup.",guideStep9Title:"Konfigurasi CTA dan tautan",guideStep9Desc:"Atur teks tombol dan URL pengalihan.",guideStep10Title:"Aktifkan kontrol cookie",guideStep10Desc:"Cegah tampilan duplikat.",guideStep11Title:"Kepatuhan GDPR",guideStep11Desc:"Aktifkan persetujuan privasi untuk pengguna UE.",guideStep12Title:"Optimasi seluler",guideStep12Desc:"Ubah ukuran otomatis untuk perangkat seluler.",guideStep13Title:"Gunakan mesin desain AI",guideStep13Desc:"Pilih platform dan tema di tab AI Design.",guideStep14Title:"Jalankan tes A/B",guideStep14Desc:"Bandingkan dua varian popup.",guideStep15Title:"Deploy dan pantau",guideStep15Desc:"Deploy dan pantau kinerja secara real-time."},
pt:{tabAiDesign:"Design IA",guideStep7Title:"Enviar design personalizado",guideStep7Desc:"Envie imagens popup arrastando e soltando.",guideStep8Title:"Definir regras de acionamento",guideStep8Desc:"Escolha o acionador para cada popup.",guideStep9Title:"Configurar CTA e link",guideStep9Desc:"Defina texto do botão e URL de redirecionamento.",guideStep10Title:"Ativar controle de cookies",guideStep10Desc:"Evite exibição duplicada.",guideStep11Title:"Conformidade LGPD/GDPR",guideStep11Desc:"Ative consentimento de privacidade.",guideStep12Title:"Otimização móvel",guideStep12Desc:"Redimensionamento automático para dispositivos móveis.",guideStep13Title:"Usar motor de design IA",guideStep13Desc:"Selecione plataforma e tema na aba AI Design.",guideStep14Title:"Executar testes A/B",guideStep14Desc:"Compare duas variantes de popup.",guideStep15Title:"Implantar e monitorar",guideStep15Desc:"Implante e monitore o desempenho em tempo real."},
ru:{tabAiDesign:"ИИ-дизайн",guideStep7Title:"Загрузить свой дизайн",guideStep7Desc:"Загрузите изображения попапов перетаскиванием.",guideStep8Title:"Настроить правила триггеров",guideStep8Desc:"Выберите триггер для каждого попапа.",guideStep9Title:"Настроить CTA и ссылку",guideStep9Desc:"Задайте текст кнопки и URL перенаправления.",guideStep10Title:"Включить контроль cookies",guideStep10Desc:"Предотвратите повторный показ.",guideStep11Title:"Соответствие GDPR",guideStep11Desc:"Включите согласие на конфиденциальность для пользователей ЕС.",guideStep12Title:"Мобильная оптимизация",guideStep12Desc:"Автоматическое изменение размера для мобильных устройств.",guideStep13Title:"Использовать ИИ-дизайн",guideStep13Desc:"Выберите платформу и тему во вкладке AI Design.",guideStep14Title:"Запустить A/B-тесты",guideStep14Desc:"Сравните два варианта попапов.",guideStep15Title:"Развернуть и мониторить",guideStep15Desc:"Разверните и отслеживайте эффективность в реальном времени."},
hi:{tabAiDesign:"AI डिज़ाइन",guideStep7Title:"कस्टम डिज़ाइन अपलोड करें",guideStep7Desc:"ड्रैग एंड ड्रॉप से पॉपअप इमेज अपलोड करें।",guideStep8Title:"ट्रिगर नियम सेट करें",guideStep8Desc:"प्रत्येक पॉपअप के लिए ट्रिगर चुनें।",guideStep9Title:"CTA और लिंक कॉन्फ़िगर करें",guideStep9Desc:"बटन टेक्स्ट और रीडायरेक्ट URL सेट करें।",guideStep10Title:"कुकी नियंत्रण सक्षम करें",guideStep10Desc:"दोहरे प्रदर्शन को रोकें।",guideStep11Title:"GDPR अनुपालन",guideStep11Desc:"EU उपयोगकर्ताओं के लिए गोपनीयता सहमति सक्षम करें।",guideStep12Title:"मोबाइल अनुकूलन",guideStep12Desc:"मोबाइल उपकरणों के लिए स्वचालित आकार बदलें।",guideStep13Title:"AI डिज़ाइन इंजन उपयोग करें",guideStep13Desc:"AI Design टैब में प्लेटफ़ॉर्म और थीम चुनें।",guideStep14Title:"A/B परीक्षण चलाएं",guideStep14Desc:"दो पॉपअप वेरिएंट की तुलना करें।",guideStep15Title:"तैनात करें और मॉनिटर करें",guideStep15Desc:"तैनात करें और रियल-टाइम प्रदर्शन मॉनिटर करें।"},
"zh-TW":{tabAiDesign:"AI設計",guideStep7Title:"上傳自定義設計",guideStep7Desc:"拖放上傳自定義彈窗圖片。",guideStep8Title:"設置觸發規則",guideStep8Desc:"選擇退出意圖、時間延遲等觸發器。",guideStep9Title:"配置CTA和連結",guideStep9Desc:"設置按鈕文字和跳轉URL。",guideStep10Title:"啟用Cookie控制",guideStep10Desc:"防止對同一用戶重複顯示。",guideStep11Title:"GDPR合規",guideStep11Desc:"為歐盟用戶啟用隱私同意。",guideStep12Title:"行動裝置最佳化",guideStep12Desc:"自動調整彈窗大小適應行動裝置。",guideStep13Title:"使用AI設計引擎",guideStep13Desc:"在AI設計標籤中選擇平台和主題。",guideStep14Title:"執行A/B測試",guideStep14Desc:"比較兩個變體驗證最佳設計。",guideStep15Title:"部署和監控",guideStep15Desc:"部署已測試的彈窗並即時監控性能。"},
};
const LANGS=Object.keys(K);
let total=0;
LANGS.forEach(lang=>{
  const file=path.join(DIR,lang+'.js');
  if(!fs.existsSync(file))return;
  let src=fs.readFileSync(file,'utf8');
  const keys=K[lang];
  const m=src.match(/"webPopup"\s*:\s*\{/);
  if(!m){console.log('skip '+lang);return;}
  const idx=m.index+m[0].length;
  let entries='',cnt=0;
  Object.entries(keys).forEach(([k,v])=>{
    // Check if key exists in webPopup namespace
    const mktStart=m.index;
    let depth=1,pos=idx;
    while(depth>0&&pos<src.length){if(src[pos]==='{')depth++;if(src[pos]==='}')depth--;pos++;}
    const nsContent=src.substring(idx,pos-1);
    if(nsContent.includes('"'+k+'"')){
      // Replace existing English value
      const re=new RegExp('"'+k+'"\\s*:\\s*"[^"]*"');
      const match=re.exec(nsContent);
      if(match){
        const oldVal=match[0];
        const newVal='"'+k+'":"'+v.replace(/"/g,'\\"')+'"';
        if(oldVal!==newVal){
          src=src.substring(0,idx)+nsContent.replace(re,newVal)+src.substring(pos-1);
          cnt++;
        }
      }
    } else {
      entries+='"'+k+'":"'+v.replace(/"/g,'\\"')+'",';
      cnt++;
    }
  });
  if(entries){src=src.slice(0,idx)+entries+src.slice(idx);}
  if(cnt>0){fs.writeFileSync(file,src,'utf8');console.log('✅ '+lang+': '+cnt);total+=cnt;}
});
console.log('🎯 Total: '+total);
