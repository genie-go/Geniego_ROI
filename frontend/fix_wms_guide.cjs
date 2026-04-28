const fs=require('fs'),path=require('path'),dir=path.join(__dirname,'src/i18n/locales');
const T={
de:{pickColId:"Pick-ID",pickColOrder:"Bestellnr.",pickColProduct:"Produkt",pickColQty:"Menge",pickColWh:"Lager",pickColStatus:"Status",pickColCreated:"Erstellt",pickColAction:"Aktion",pickItems:"Eintr.",
recvColPO:"PO-Nr.",recvColSupplier:"Lieferant",recvColProduct:"Produkt",recvColQty:"Menge",recvColTotal:"Gesamt",recvColStatus:"Status",
lotColLotNo:"Chargennr.",lotColProduct:"Produkt",lotColExpiry:"MHD",lotColDays:"Resttage",
guideTitle:"📦 WMS Lagerverwaltung - Leitfaden",guideSub:"Von der Lagerregistrierung bis zum Versand - alle WMS-Funktionen in diesem Leitfaden.",
guideStep1Title:"Lager registrieren",guideStep1Desc:"Klicken Sie im Tab 'WMS Lager' auf [+Lager hinzufügen]. Geben Sie Name, Code, Adresse, Fläche und Typ ein.",
guideStep2Title:"Ein-/Ausgang verwalten",guideStep2Desc:"Im Tab 'Ein-/Ausgang' registrieren Sie 7 Bewegungsarten: Eingang, Ausgang, Retoure, Transfer, Anpassung, Entsorgung.",
guideStep3Title:"Bestandsstatus prüfen",guideStep3Desc:"Im Tab 'Bestandsstatus' den Bestand nach Lager und SKU einsehen. Niedrigbestand wird rot markiert.",
guideStep4Title:"Wareneingang prüfen",guideStep4Desc:"Im Tab 'Wareneingang' Menge und Qualität auf Basis der Bestellung (PO) prüfen.",
guideStep5Title:"Kommissionierung verwalten",guideStep5Desc:"Im Tab 'Kommissionierung' auftragsbasierte Picklisten erstellen und verwalten.",
guideStep6Title:"Chargen/MHD verfolgen",guideStep6Desc:"Im Tab 'Charge/MHD' Chargennummern und MHD registrieren. FIFO wird automatisch angewendet.",
guideStep7Title:"Auto-Nachbestellung",guideStep7Desc:"Im Tab 'Nachbestellung' automatische Bestellungen basierend auf Sicherheitsbestand einrichten.",
guideTip1:"API-Schlüssel im Integration Hub registrieren für automatische Synchronisation.",
guideTip2:"Sicherheitsbestand-Schwellenwerte setzen zur Vermeidung von Ausverkäufen.",
guideStepsTitle:"📚 Schritt-für-Schritt-Anleitung",guideTipsTitle:"💡 Experten-Tipps"},
th:{pickColId:"รหัสหยิบ",pickColOrder:"เลขที่สั่งซื้อ",pickColProduct:"สินค้า",pickColQty:"จำนวน",pickColWh:"คลัง",pickColStatus:"สถานะ",pickColCreated:"วันที่สร้าง",pickColAction:"การดำเนินการ",
recvColPO:"เลขที่PO",recvColSupplier:"ซัพพลายเออร์",recvColProduct:"สินค้า",recvColQty:"จำนวน",recvColTotal:"รวม",
guideTitle:"📦 คู่มือ WMS ฉบับสมบูรณ์",guideSub:"ตั้งแต่การลงทะเบียนคลังสินค้าจนถึงการจัดส่ง",
guideStep1Title:"ลงทะเบียนคลังสินค้า",guideStep1Desc:"คลิก [+เพิ่มคลัง] ในแท็บ 'คลังสินค้า WMS' กรอกข้อมูลและบันทึก",
guideStep2Title:"จัดการรับ-จ่าย",guideStep2Desc:"ลงทะเบียน 7 ประเภทการเคลื่อนไหวสินค้าในแท็บ 'รับ-จ่าย'",
guideStep3Title:"ตรวจสอบสถานะสต็อก",guideStep3Desc:"ดูสต็อกทั้งหมดตามคลังและ SKU ในแท็บ 'สถานะสต็อก'",
guideStepsTitle:"📚 คำแนะนำทีละขั้นตอน",guideTipsTitle:"💡 เคล็ดลับผู้เชี่ยวชาญ"},
vi:{pickColId:"Mã Pick",pickColOrder:"Mã đơn",pickColProduct:"Sản phẩm",pickColQty:"SL",pickColWh:"Kho",pickColStatus:"Trạng thái",pickColCreated:"Ngày tạo",pickColAction:"Thao tác",
recvColPO:"Mã PO",recvColSupplier:"NCC",recvColProduct:"Sản phẩm",recvColQty:"SL",recvColTotal:"Tổng",
guideTitle:"📦 Hướng dẫn Quản lý Kho WMS",guideSub:"Từ đăng ký kho đến vận chuyển - tất cả tính năng WMS.",
guideStep1Title:"Đăng ký kho",guideStep1Desc:"Nhấn [+Thêm kho] trong tab 'Kho WMS'. Nhập thông tin và lưu.",
guideStep2Title:"Quản lý xuất nhập",guideStep2Desc:"Đăng ký 7 loại di chuyển hàng trong tab 'Xuất nhập'.",
guideStep3Title:"Kiểm tra tồn kho",guideStep3Desc:"Xem tồn kho theo kho và SKU trong tab 'Tình trạng tồn kho'.",
guideStepsTitle:"📚 Hướng dẫn từng bước",guideTipsTitle:"💡 Mẹo chuyên gia"},
id:{pickColId:"Pick ID",pickColOrder:"No. Order",pickColProduct:"Produk",pickColQty:"Qty",pickColWh:"Gudang",pickColStatus:"Status",pickColCreated:"Dibuat",pickColAction:"Aksi",
recvColPO:"No. PO",recvColSupplier:"Pemasok",recvColProduct:"Produk",recvColQty:"Qty",recvColTotal:"Total",
guideTitle:"📦 Panduan Lengkap WMS",guideSub:"Dari registrasi gudang hingga pengiriman.",
guideStep1Title:"Daftarkan Gudang",guideStep1Desc:"Klik [+Tambah Gudang] di tab 'Gudang WMS'. Isi data dan simpan.",
guideStep2Title:"Kelola Keluar/Masuk",guideStep2Desc:"Daftarkan 7 jenis pergerakan stok di tab 'Keluar/Masuk'.",
guideStep3Title:"Cek Status Stok",guideStep3Desc:"Lihat stok berdasarkan gudang dan SKU di tab 'Status Stok'.",
guideStepsTitle:"📚 Panduan Langkah demi Langkah",guideTipsTitle:"💡 Tips Ahli"},
es:{pickColId:"ID Pick",pickColOrder:"Nº Pedido",pickColProduct:"Producto",pickColQty:"Cant.",pickColWh:"Almacén",pickColStatus:"Estado",pickColCreated:"Creado",pickColAction:"Acción",
recvColPO:"Nº PO",recvColSupplier:"Proveedor",recvColProduct:"Producto",recvColQty:"Cant.",recvColTotal:"Total",
guideTitle:"📦 Guía Completa de WMS",guideSub:"Desde el registro del almacén hasta el envío.",
guideStep1Title:"Registrar Almacén",guideStep1Desc:"Haga clic en [+Agregar Almacén] en la pestaña 'Almacén WMS'.",
guideStep2Title:"Gestionar Entradas/Salidas",guideStep2Desc:"Registre 7 tipos de movimientos en la pestaña 'Entrada/Salida'.",
guideStep3Title:"Verificar Inventario",guideStep3Desc:"Consulte el stock por almacén y SKU en la pestaña 'Estado del Inventario'.",
guideStepsTitle:"📚 Guía Paso a Paso",guideTipsTitle:"💡 Consejos de Expertos"},
fr:{pickColId:"ID Pick",pickColOrder:"Nº Commande",pickColProduct:"Produit",pickColQty:"Qté",pickColWh:"Entrepôt",pickColStatus:"Statut",pickColCreated:"Créé",pickColAction:"Action",
recvColPO:"Nº PO",recvColSupplier:"Fournisseur",recvColProduct:"Produit",recvColQty:"Qté",recvColTotal:"Total",
guideTitle:"📦 Guide Complet WMS",guideSub:"De l'enregistrement de l'entrepôt à l'expédition.",
guideStep1Title:"Enregistrer un Entrepôt",guideStep1Desc:"Cliquez sur [+Ajouter Entrepôt] dans l'onglet 'Entrepôt WMS'.",
guideStep2Title:"Gérer les Entrées/Sorties",guideStep2Desc:"Enregistrez 7 types de mouvements dans l'onglet 'Entrée/Sortie'.",
guideStep3Title:"Vérifier les Stocks",guideStep3Desc:"Consultez le stock par entrepôt et SKU dans l'onglet 'État des Stocks'.",
guideStepsTitle:"📚 Guide Étape par Étape",guideTipsTitle:"💡 Conseils d'Experts"},
pt:{pickColId:"ID Pick",pickColOrder:"Nº Pedido",pickColProduct:"Produto",pickColQty:"Qtd",pickColWh:"Armazém",pickColStatus:"Status",pickColCreated:"Criado",pickColAction:"Ação",
recvColPO:"Nº PO",recvColSupplier:"Fornecedor",recvColProduct:"Produto",recvColQty:"Qtd",recvColTotal:"Total",
guideTitle:"📦 Guia Completo WMS",guideSub:"Do registro do armazém ao envio.",
guideStep1Title:"Registrar Armazém",guideStep1Desc:"Clique em [+Adicionar Armazém] na aba 'Armazém WMS'.",
guideStep2Title:"Gerenciar Entradas/Saídas",guideStep2Desc:"Registre 7 tipos de movimentos na aba 'Entrada/Saída'.",
guideStep3Title:"Verificar Estoque",guideStep3Desc:"Consulte o estoque por armazém e SKU na aba 'Status do Estoque'.",
guideStepsTitle:"📚 Guia Passo a Passo",guideTipsTitle:"💡 Dicas de Especialistas"},
ru:{pickColId:"ID",pickColOrder:"№ Заказа",pickColProduct:"Товар",pickColQty:"Кол-во",pickColWh:"Склад",pickColStatus:"Статус",pickColCreated:"Создан",pickColAction:"Действие",
recvColPO:"№ PO",recvColSupplier:"Поставщик",recvColProduct:"Товар",recvColQty:"Кол-во",recvColTotal:"Итого",
guideTitle:"📦 Полное Руководство WMS",guideSub:"От регистрации склада до отправки.",
guideStep1Title:"Регистрация склада",guideStep1Desc:"Нажмите [+Добавить Склад] во вкладке 'Склад WMS'.",
guideStep2Title:"Управление приходом/расходом",guideStep2Desc:"Зарегистрируйте 7 типов движений во вкладке 'Приход/Расход'.",
guideStep3Title:"Проверка запасов",guideStep3Desc:"Просмотрите запасы по складу и SKU во вкладке 'Состояние Запасов'.",
guideStepsTitle:"📚 Пошаговое Руководство",guideTipsTitle:"💡 Советы Экспертов"},
ar:{pickColId:"معرف",pickColOrder:"رقم الطلب",pickColProduct:"المنتج",pickColQty:"الكمية",pickColWh:"المستودع",pickColStatus:"الحالة",pickColCreated:"تاريخ الإنشاء",pickColAction:"إجراء",
recvColPO:"رقم PO",recvColSupplier:"المورد",recvColProduct:"المنتج",recvColQty:"الكمية",recvColTotal:"الإجمالي",
guideTitle:"📦 دليل إدارة المستودعات الشامل",guideSub:"من تسجيل المستودع إلى الشحن.",
guideStep1Title:"تسجيل المستودع",guideStep1Desc:"انقر على [+إضافة مستودع] في علامة التبويب 'مستودع WMS'.",
guideStep2Title:"إدارة الوارد/الصادر",guideStep2Desc:"سجل 7 أنواع من حركات المخزون.",
guideStep3Title:"فحص المخزون",guideStep3Desc:"عرض المخزون حسب المستودع و SKU.",
guideStepsTitle:"📚 دليل خطوة بخطوة",guideTipsTitle:"💡 نصائح الخبراء"},
hi:{pickColId:"पिक ID",pickColOrder:"ऑर्डर नं.",pickColProduct:"उत्पाद",pickColQty:"मात्रा",pickColWh:"गोदाम",pickColStatus:"स्थिति",pickColCreated:"बनाया गया",pickColAction:"कार्रवाई",
recvColPO:"PO नं.",recvColSupplier:"आपूर्तिकर्ता",recvColProduct:"उत्पाद",recvColQty:"मात्रा",recvColTotal:"कुल",
guideTitle:"📦 WMS गोदाम प्रबंधन गाइड",guideSub:"गोदाम पंजीकरण से शिपिंग तक।",
guideStep1Title:"गोदाम पंजीकृत करें",guideStep1Desc:"'WMS गोदाम' टैब में [+गोदाम जोड़ें] क्लिक करें।",
guideStep2Title:"आवक/जावक प्रबंधन",guideStep2Desc:"'आवक/जावक' टैब में 7 प्रकार की स्टॉक गतिविधि दर्ज करें।",
guideStep3Title:"स्टॉक स्थिति जांचें",guideStep3Desc:"'स्टॉक स्थिति' टैब में गोदाम और SKU द्वारा स्टॉक देखें।",
guideStepsTitle:"📚 चरण-दर-चरण मार्गदर्शिका",guideTipsTitle:"💡 विशेषज्ञ सुझाव"},
'zh-TW':{pickColId:"揀貨ID",pickColOrder:"訂單號",pickColProduct:"商品",pickColQty:"數量",pickColWh:"倉庫",pickColStatus:"狀態",pickColCreated:"建立時間",pickColAction:"操作",
recvColPO:"PO編號",recvColSupplier:"供應商",recvColProduct:"商品",recvColQty:"數量",recvColTotal:"合計",
guideTitle:"📦 WMS倉庫管理完全指南",guideSub:"從倉庫註冊到出貨的全流程指南。",
guideStep1Title:"註冊倉庫",guideStep1Desc:"在'WMS倉庫'標籤中點擊[+新增倉庫]按鈕。",
guideStep2Title:"管理出入庫",guideStep2Desc:"在'出入庫'標籤中登記7種類型的庫存移動。",
guideStep3Title:"查看庫存狀況",guideStep3Desc:"在'庫存狀況'標籤中按倉庫和SKU查看所有庫存。",
guideStepsTitle:"📚 逐步詳細指南",guideTipsTitle:"💡 專家提示"}
};
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
for(const file of files){
  const lang=file.replace('.js','');
  const native=T[lang];
  if(!native)continue;
  const fp=path.join(dir,file);
  let src=fs.readFileSync(fp,'utf8');
  delete require.cache[require.resolve(fp)];
  const obj=(require(fp).default||require(fp));
  if(!obj.wms)continue;
  const merged={...obj.wms,...native};
  const idx=src.indexOf('"wms"');
  if(idx===-1)continue;
  const bs=src.indexOf('{',idx+5);
  let d=1,p=bs+1;
  while(d>0&&p<src.length){if(src[p]==='{')d++;else if(src[p]==='}')d--;p++;}
  src=src.slice(0,idx)+'"wms":'+JSON.stringify(merged)+src.slice(p);
  fs.writeFileSync(fp,src,'utf8');
  console.log(`OK ${lang}: ${Object.keys(native).length} keys`);
}
console.log('Done');
