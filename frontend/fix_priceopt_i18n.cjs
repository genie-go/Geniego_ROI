const fs=require('fs'),path=require('path'),dir=path.join(__dirname,'src/i18n/locales');
// PriceOpt 핵심 UI 키 12개 언어 번역
const T={
zh:{pageTitle:"价格优化",pageSub:"AI价格优化·场景模拟·渠道组合·竞价监控·动态调价",tabSummary:"概览仪表盘",tabProducts:"商品管理",tabOptimize:"最优价计算",tabScenario:"场景模拟",tabMix:"渠道组合",tabRepricer:"动态调价器",tabCompetitor:"竞价监控",tabCalendar:"促销日历",tabChannelFee:"渠道手续费",tabGuide:"使用指南",
loading:"加载中...",regProduct:"已注册商品",elasticityData:"弹性数据",items:"件",optAdoption:"最优价采纳",avgMargin:"平均利润率",avgRecPrice:"平均推荐价",channelResult:"渠道分析结果",recentHistory:"最近推荐记录",noAnalysis:"计算最优价和分析SKU后将显示结果。",refresh:"刷新",
regProducts:"已注册商品",noProducts:"无已注册商品",productName:"商品名称",category:"类别",categorySelect:"选择类别",spec:"规格",unit:"单位",purchaseCost:"采购成本",ioFee:"出入库费",storageFee:"仓储费",workFee:"加工费",shippingFee:"配送费",productCostAuto:"商品成本(自动)",targetMarginRate:"目标利润率",baseSalePrice:"基准售价",
saveProduct:"保存商品",costBreakdown:"成本分解",costLabel:"成本",marginLabel:"利润率",basePriceLabel:"基准价",specLabel:"规格",
qtyPerBox:"每箱数量",boxesPerPallet:"每托盘箱数",stockInputTitle:"初始库存登记",stockInputType:"入库单位",inputByEach:"按件入库",inputByBox:"按箱入库",inputByPallet:"按托盘入库",stockQtyInput:"入库数量",totalUnits:"总件数",totalBoxes:"总箱数",totalPallets:"总托盘数",boxPalletTitle:"箱/托盘详情",productImageTitle:"商品图片",imgDragDrop:"拖拽或点击上传图片",imgMaxLabel:"最大",imgMaxSize:"图片最大5MB",
excelBulkUpload:"批量上传",excelDownload:"下载商品",excelTemplate:"下载模板",excelUploading:"上传中...",excelUploadSuccess:"已注册",excelUploadResult:"上传完成",excelSuccess:"成功",excelFail:"失败",excelEmptyFile:"文件为空",excelUploadError:"上传错误",
calcParams:"计算参数",labelSku:"SKU",labelChannel:"渠道",currentSalePrice:"当前售价",stockQty:"库存数量",allUnified:"全渠道统一",runOptimize:"价格优化",optimizing:"计算中...",optResultTitle:"最优价结果",currentPrice:"当前价",optimalPrice:"推荐价",expectedMargin:"预期利润率",
scenarioTitle:"场景模拟器",scenarioPriceList:"测试价格列表(逗号分隔)",scenarioRun:"运行模拟",scenarioRunning:"模拟中...",scenarioSaleQty:"预期销量",scenarioRevenue:"预期收入",scenarioProfit:"预期利润",scenarioMargin:"利润率",
channelMixTitle:"渠道组合优化",totalBudget:"总预算",runChannelMix:"优化渠道组合",allocPct:"分配比例",execBudget:"执行预算",expectedReturn:"预期收益",expectedProfit:"预期利润",
activeRules:"活跃规则",todayChanges:"今日变更",avgMarginImprove:"平均利润改善",autoRules:"自动化规则",changeHistory:"价格变更记录",ruleActive:"活跃",ruleInactive:"非活跃",
compA:"竞争对手A",compB:"竞争对手B",sosRank:"SoS排名",priceDiff:"价差",priceOk:"保持竞争力",priceWarn:"需要调整",
promoEventReg:"注册促销活动",promoSaved:"保存完成",register:"注册",scheduledEvents:"预定",draftEvents:"草稿",
channelFeeTitle:"渠道手续费",channelFeeSub:"管理各销售渠道的手续费率。手续费会自动反映到价格优化计算中。",feeRate:"手续费率(%)",feeFixed:"固定手续费",feePayment:"支付手续费(%)",feeTotal:"总手续费",feeSave:"保存手续费",feeSaved:"手续费设置已保存",
badgeChannelUnit:"个渠道已连接",badgeRealtimeSync:"实时同步",badgeSecurityActive:"安全已激活",secBannerBlocked:"已拦截{{count}}个安全威胁",secBannerDismiss:"关闭",
catElecAudio:"电子/音频",catElecInput:"电子/输入设备",catElecAccessory:"电子/配件",catElecCamera:"电子/相机",catElecCharging:"电子/充电",catFashionClothing:"时尚/服装",catFashionShoes:"时尚/鞋包",catBeautySkin:"美妆/护肤",catBeautyMakeup:"美妆/彩妆",catFoodHealth:"食品/保健品",catHomeKitchen:"家居/厨具",catSportsGear:"运动/器材",catBooksStationery:"图书/文具",catToysHobbies:"玩具/爱好",
unitEach:"个",unitDevice:"台",unitBottle:"瓶",unitSet:"套",unitBox:"箱",unitPallet:"托盘",
guideTitle:"价格优化使用指南",guideSub:"从AI最优价计算到场景模拟、渠道组合、竞价监控、动态调价的完整指南。",guideStepsTitle:"📚 分步详细指南",guideTipsTitle:"💡 专家运营提示",guideTabsTitle:"📑 标签参考",
guideS1T:"商品注册与成本设置",guideS1D:"在商品标签中输入SKU、商品名、类别、规格、单位，并设置成本构成(采购价、出入库费、仓储费、加工费、配送费)和目标利润率。",
guideS2T:"AI最优价计算",guideS2D:"在最优化标签中选择SKU，输入渠道、当前售价、库存数量后点击'价格优化'按钮，AI将计算最优价格。",
guideS3T:"场景模拟",guideS3D:"在场景标签中输入测试价格列表(逗号分隔)进行模拟。比较各价位的预期销量、收入和利润。",
guideS4T:"渠道组合优化",guideS4D:"在渠道组合标签中输入总营销预算，AI分析各渠道ROI后建议最优预算分配方案。",
guideS5T:"动态调价器设置",guideS5D:"在调价器标签中创建自动价格变动规则。支持最低价匹配、ROAS目标、库存驱动等多种策略。",
guideS6T:"竞价监控",guideS6D:"在竞价标签中实时追踪主要竞争对手价格。当自身价格高于竞争对手时自动发出警报。",
guideS7T:"渠道手续费管理",guideS7D:"在手续费标签中查看国内外所有渠道的销售手续费率和税率。通过集成中心API自动同步。",
guideS8T:"促销日历管理",guideS8D:"在促销日历标签中注册折扣活动。输入SKU、渠道、起止日期、促销价格和原因。",
guideS9T:"Excel批量操作",guideS9D:"利用Excel模板一次注册数百个SKU。下载模板填写后上传即可批量导入。",
guideS10T:"审核与应用",guideS10D:"在概览标签中审核优化结果。通过商品同步将推荐价格实时应用到各渠道。",
guideTp1:"利用Excel批量上传功能可一次注册数百个SKU。请先下载模板按格式填写。",
guideTp2:"优化结果自动反映渠道手续费。手续费越高的渠道售价需更高才能达到目标利润。",
guideTp3:"利用场景模拟预先分析调价影响。积累弹性数据后预测准确度会逐步提高。",
guideTp4:"设置动态调价器规则后可自动应对竞争对手价格变动。最低价匹配模式需谨慎使用。",
guideTp5:"在促销日历中提前注册活动可精确预测活动期间的销售影响。",
},
ja:{pageTitle:"価格最適化",pageSub:"AI価格最適化·シナリオシミュレーション·チャネルミックス·競合価格モニタリング",tabSummary:"概要ダッシュボード",tabProducts:"商品管理",tabOptimize:"最適価格算定",tabScenario:"シナリオ",tabMix:"チャネルミックス",tabRepricer:"ダイナミックリプライサー",tabCompetitor:"競合価格監視",tabCalendar:"プロモカレンダー",tabChannelFee:"チャネル手数料",tabGuide:"利用ガイド",
loading:"読み込み中...",regProduct:"登録商品",elasticityData:"弾力性データ",items:"件",optAdoption:"最適価格採用",avgMargin:"平均マージン",avgRecPrice:"平均推奨価格",channelResult:"チャネル分析結果",recentHistory:"最近の推奨履歴",noAnalysis:"最適価格計算とSKU分析後に結果が表示されます。",refresh:"更新",
regProducts:"登録済み商品",noProducts:"登録商品なし",productName:"商品名",category:"カテゴリ",categorySelect:"カテゴリ選択",spec:"規格",unit:"単位",purchaseCost:"仕入原価",ioFee:"入出庫費",storageFee:"保管費",workFee:"加工費",shippingFee:"配送費",productCostAuto:"商品原価(自動)",targetMarginRate:"目標マージン率",baseSalePrice:"基準販売価格",
saveProduct:"商品保存",costBreakdown:"原価内訳",costLabel:"原価",marginLabel:"マージン",basePriceLabel:"基準価",
calcParams:"計算パラメータ",labelSku:"SKU",labelChannel:"チャネル",currentSalePrice:"現在の販売価格",stockQty:"在庫数量",allUnified:"全チャネル統一",runOptimize:"価格最適化",optimizing:"計算中...",
channelFeeTitle:"チャネル手数料",channelFeeSub:"各販売チャネルの手数料率を管理します。",
badgeChannelUnit:"チャネル連携済み",badgeRealtimeSync:"リアルタイム同期",badgeSecurityActive:"セキュリティ有効",
catElecAudio:"電子/オーディオ",catFashionClothing:"ファッション/衣類",catBeautySkin:"ビューティー/スキンケア",catFoodHealth:"食品/健康食品",catHomeKitchen:"生活/キッチン",
unitEach:"個",unitDevice:"台",unitBottle:"本",unitSet:"セット",unitBox:"ボックス",unitPallet:"パレット",
excelBulkUpload:"一括アップロード",excelDownload:"商品ダウンロード",excelTemplate:"テンプレートDL",
guideTitle:"価格最適化利用ガイド",guideSub:"AI最適価格算定からシナリオ、チャネルミックス、競合監視まで。",guideStepsTitle:"📚 ステップ別ガイド",guideTipsTitle:"💡 エキスパートヒント",
guideS1T:"商品登録と原価設定",guideS1D:"商品タブでSKU、商品名、原価構成を入力して目標マージン率を設定します。",
guideS2T:"AI最適価格計算",guideS2D:"最適化タブでSKUとチャネルを選択し「価格最適化」ボタンで最適価格を算出します。",
guideS3T:"シナリオシミュレーション",guideS3D:"テスト価格リストを入力して各価格帯の売上・利益をシミュレーションします。",
},
de:{pageTitle:"Preisoptimierung",pageSub:"KI-Preisoptimierung · Szenario · Kanalmix · Wettbewerbsüberwachung",tabSummary:"Übersicht",tabProducts:"Produkte",tabOptimize:"Optimierung",tabScenario:"Szenario",tabMix:"Kanalmix",tabRepricer:"Repricing",tabCompetitor:"Wettbewerb",tabCalendar:"Kalender",tabChannelFee:"Kanalgebühren",tabGuide:"Anleitung",
loading:"Laden...",regProduct:"Registrierte Produkte",items:"St.",avgMargin:"Ø Marge",refresh:"Aktualisieren",noProducts:"Keine Produkte",productName:"Produktname",category:"Kategorie",saveProduct:"Speichern",
unitEach:"Stk",unitBox:"Karton",unitPallet:"Palette",
guideTitle:"Preisoptimierung – Anleitung",guideStepsTitle:"📚 Schritt-für-Schritt",guideTipsTitle:"💡 Expertentipps",
guideS1T:"Produkte registrieren",guideS1D:"Geben Sie SKU, Name, Kategorie und Kostenstruktur ein.",
},
es:{pageTitle:"Optimización de Precios",pageSub:"Optimización de precios con IA · Simulación · Mix de canales · Monitoreo competitivo",tabSummary:"Resumen",tabProducts:"Productos",tabOptimize:"Optimizar",tabScenario:"Escenario",tabMix:"Mix Canal",tabRepricer:"Repricer",tabCompetitor:"Competencia",tabCalendar:"Calendario",tabChannelFee:"Comisiones",tabGuide:"Guía",
loading:"Cargando...",regProduct:"Productos registrados",items:"uds",avgMargin:"Margen promedio",refresh:"Actualizar",noProducts:"Sin productos",productName:"Nombre del producto",category:"Categoría",saveProduct:"Guardar",
unitEach:"ud",unitBox:"caja",unitPallet:"palet",
guideTitle:"Guía de Optimización de Precios",guideStepsTitle:"📚 Guía paso a paso",guideTipsTitle:"💡 Consejos expertos",
guideS1T:"Registrar productos",guideS1D:"Ingrese SKU, nombre, categoría y estructura de costos.",
},
fr:{pageTitle:"Optimisation des Prix",pageSub:"Optimisation IA · Simulation · Mix canal · Surveillance concurrentielle",tabSummary:"Résumé",tabProducts:"Produits",tabOptimize:"Optimiser",tabScenario:"Scénario",tabMix:"Mix Canal",tabRepricer:"Repricing",tabCompetitor:"Concurrence",tabCalendar:"Calendrier",tabChannelFee:"Frais",tabGuide:"Guide",
loading:"Chargement...",regProduct:"Produits enregistrés",items:"pcs",avgMargin:"Marge moyenne",refresh:"Actualiser",noProducts:"Aucun produit",productName:"Nom du produit",category:"Catégorie",saveProduct:"Enregistrer",
unitEach:"pce",unitBox:"carton",unitPallet:"palette",
guideTitle:"Guide d'Optimisation des Prix",guideStepsTitle:"📚 Guide étape par étape",guideTipsTitle:"💡 Conseils d'experts",
guideS1T:"Enregistrer les produits",guideS1D:"Saisissez le SKU, le nom, la catégorie et la structure des coûts.",
},
pt:{pageTitle:"Otimização de Preços",pageSub:"Otimização IA · Simulação · Mix de canais · Monitoramento competitivo",tabSummary:"Resumo",tabProducts:"Produtos",tabOptimize:"Otimizar",tabScenario:"Cenário",tabMix:"Mix Canal",tabRepricer:"Repricing",tabCompetitor:"Concorrência",tabCalendar:"Calendário",tabChannelFee:"Taxas",tabGuide:"Guia",
loading:"Carregando...",regProduct:"Produtos registrados",items:"un",avgMargin:"Margem média",refresh:"Atualizar",noProducts:"Sem produtos",productName:"Nome do produto",saveProduct:"Salvar",
unitEach:"un",unitBox:"caixa",unitPallet:"palete",
guideTitle:"Guia de Otimização de Preços",guideStepsTitle:"📚 Guia passo a passo",guideTipsTitle:"💡 Dicas de especialistas",
},
th:{pageTitle:"การเพิ่มประสิทธิภาพราคา",pageSub:"การเพิ่มประสิทธิภาพราคา AI · การจำลอง · ส่วนผสมช่องทาง",tabSummary:"ภาพรวม",tabProducts:"สินค้า",tabOptimize:"ปรับราคา",tabScenario:"สถานการณ์",tabMix:"มิกซ์ช่อง",tabRepricer:"ปรับราคาอัตโนมัติ",tabCompetitor:"คู่แข่ง",tabCalendar:"ปฏิทิน",tabChannelFee:"ค่าธรรมเนียม",tabGuide:"คู่มือ",
loading:"กำลังโหลด...",regProduct:"สินค้าที่ลงทะเบียน",items:"ชิ้น",avgMargin:"อัตรากำไรเฉลี่ย",refresh:"รีเฟรช",noProducts:"ไม่มีสินค้า",productName:"ชื่อสินค้า",saveProduct:"บันทึก",
unitEach:"ชิ้น",unitBox:"กล่อง",unitPallet:"พาเลท",
guideTitle:"คู่มือการเพิ่มประสิทธิภาพราคา",guideStepsTitle:"📚 คำแนะนำทีละขั้นตอน",guideTipsTitle:"💡 เคล็ดลับ",
},
vi:{pageTitle:"Tối ưu giá",pageSub:"Tối ưu giá AI · Mô phỏng · Kênh phân phối · Giám sát đối thủ",tabSummary:"Tổng quan",tabProducts:"Sản phẩm",tabOptimize:"Tối ưu hóa",tabScenario:"Kịch bản",tabMix:"Kênh Mix",tabRepricer:"Điều chỉnh giá",tabCompetitor:"Đối thủ",tabCalendar:"Lịch",tabChannelFee:"Phí kênh",tabGuide:"Hướng dẫn",
loading:"Đang tải...",regProduct:"Sản phẩm đã đăng ký",items:"sp",avgMargin:"Biên lợi nhuận TB",refresh:"Làm mới",noProducts:"Chưa có sản phẩm",productName:"Tên sản phẩm",saveProduct:"Lưu",
unitEach:"cái",unitBox:"thùng",unitPallet:"pallet",
guideTitle:"Hướng dẫn Tối ưu giá",guideStepsTitle:"📚 Hướng dẫn từng bước",guideTipsTitle:"💡 Mẹo chuyên gia",
},
id:{pageTitle:"Optimasi Harga",pageSub:"Optimasi harga AI · Simulasi · Campuran saluran · Pemantauan kompetitor",tabSummary:"Ringkasan",tabProducts:"Produk",tabOptimize:"Optimasi",tabScenario:"Skenario",tabMix:"Mix Saluran",tabRepricer:"Repricing",tabCompetitor:"Kompetitor",tabCalendar:"Kalender",tabChannelFee:"Biaya",tabGuide:"Panduan",
loading:"Memuat...",regProduct:"Produk terdaftar",items:"pcs",avgMargin:"Margin rata-rata",refresh:"Segarkan",noProducts:"Tidak ada produk",productName:"Nama produk",saveProduct:"Simpan",
unitEach:"pcs",unitBox:"kotak",unitPallet:"palet",
guideTitle:"Panduan Optimasi Harga",guideStepsTitle:"📚 Panduan langkah demi langkah",guideTipsTitle:"💡 Tips ahli",
},
ru:{pageTitle:"Оптимизация цен",pageSub:"ИИ-оптимизация · Сценарии · Канальный микс · Мониторинг конкурентов",tabSummary:"Обзор",tabProducts:"Товары",tabOptimize:"Оптимизация",tabScenario:"Сценарий",tabMix:"Канал-микс",tabRepricer:"Репрайсер",tabCompetitor:"Конкуренты",tabCalendar:"Календарь",tabChannelFee:"Комиссии",tabGuide:"Руководство",
loading:"Загрузка...",regProduct:"Зарег. товары",items:"шт",avgMargin:"Ср. маржа",refresh:"Обновить",noProducts:"Нет товаров",productName:"Название товара",saveProduct:"Сохранить",
unitEach:"шт",unitBox:"коробка",unitPallet:"паллета",
guideTitle:"Руководство по оптимизации цен",guideStepsTitle:"📚 Пошаговое руководство",guideTipsTitle:"💡 Советы экспертов",
},
ar:{pageTitle:"تحسين الأسعار",pageSub:"تحسين الأسعار بالذكاء الاصطناعي · المحاكاة · مزيج القنوات · مراقبة المنافسين",tabSummary:"نظرة عامة",tabProducts:"المنتجات",tabOptimize:"التحسين",tabScenario:"السيناريو",tabMix:"مزيج القنوات",tabRepricer:"إعادة التسعير",tabCompetitor:"المنافسون",tabCalendar:"التقويم",tabChannelFee:"الرسوم",tabGuide:"الدليل",
loading:"جاري التحميل...",regProduct:"المنتجات المسجلة",items:"قطعة",avgMargin:"متوسط الهامش",refresh:"تحديث",noProducts:"لا توجد منتجات",productName:"اسم المنتج",saveProduct:"حفظ",
unitEach:"قطعة",unitBox:"صندوق",unitPallet:"منصة",
guideTitle:"دليل تحسين الأسعار",guideStepsTitle:"📚 دليل خطوة بخطوة",guideTipsTitle:"💡 نصائح الخبراء",
},
hi:{pageTitle:"मूल्य अनुकूलन",pageSub:"AI मूल्य अनुकूलन · परिदृश्य · चैनल मिक्स · प्रतिस्पर्धी निगरानी",tabSummary:"अवलोकन",tabProducts:"उत्पाद",tabOptimize:"अनुकूलन",tabScenario:"परिदृश्य",tabMix:"चैनल मिक्स",tabRepricer:"रीप्राइसर",tabCompetitor:"प्रतिस्पर्धी",tabCalendar:"कैलेंडर",tabChannelFee:"शुल्क",tabGuide:"गाइड",
loading:"लोड हो रहा है...",regProduct:"पंजीकृत उत्पाद",items:"पीस",avgMargin:"औसत मार्जिन",refresh:"रीफ्रेश",noProducts:"कोई उत्पाद नहीं",productName:"उत्पाद का नाम",saveProduct:"सहेजें",
unitEach:"पीस",unitBox:"बॉक्स",unitPallet:"पैलेट",
guideTitle:"मूल्य अनुकूलन गाइड",guideStepsTitle:"📚 चरण-दर-चरण गाइड",guideTipsTitle:"💡 विशेषज्ञ सुझाव",
},
'zh-TW':{pageTitle:"價格優化",pageSub:"AI價格優化·情境模擬·通路組合·競價監控·動態調價",tabSummary:"概覽儀表板",tabProducts:"商品管理",tabOptimize:"最適價計算",tabScenario:"情境模擬",tabMix:"通路組合",tabRepricer:"動態調價器",tabCompetitor:"競價監控",tabCalendar:"促銷行事曆",tabChannelFee:"通路手續費",tabGuide:"使用指南",
loading:"載入中...",regProduct:"已註冊商品",items:"件",avgMargin:"平均利潤率",refresh:"重新整理",noProducts:"無已註冊商品",productName:"商品名稱",saveProduct:"儲存",
unitEach:"個",unitBox:"箱",unitPallet:"棧板",
guideTitle:"價格優化使用指南",guideStepsTitle:"📚 逐步指南",guideTipsTitle:"💡 專家提示",
},
};
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
let count=0;
for(const file of files){
  const lang=file.replace('.js','');
  if(lang==='ko'||lang==='en')continue;
  const native=T[lang];
  if(!native)continue;
  const fp=path.join(dir,file);
  let src=fs.readFileSync(fp,'utf8');
  delete require.cache[require.resolve(fp)];
  const obj=(require(fp).default||require(fp));
  if(!obj.priceOpt)continue;
  const merged={...obj.priceOpt,...native};
  const idx=src.indexOf('"priceOpt"');
  if(idx===-1)continue;
  const bs=src.indexOf('{',idx+10);
  let d=1,p=bs+1;
  while(d>0&&p<src.length){if(src[p]==='{')d++;else if(src[p]==='}')d--;p++;}
  src=src.slice(0,idx)+'"priceOpt":'+JSON.stringify(merged)+src.slice(p);
  fs.writeFileSync(fp,src,'utf8');
  console.log(`OK ${lang}: ${Object.keys(native).length} keys`);
  count++;
}
console.log(`Done: ${count} files updated`);
