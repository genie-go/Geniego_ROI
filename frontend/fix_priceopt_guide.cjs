const fs=require('fs'),path=require('path'),dir=path.join(__dirname,'src/i18n/locales');
// 1. Add guideStep{N}Title/Desc keys to match PriceOptGuideTab component
// 2. Add guideTabXxxDesc keys for tab references
const T={
zh:{
guideStep1Title:"商品注册与成本设置",guideStep1Desc:"在商品标签中输入SKU、商品名、类别、规格、单位，设置成本构成(采购价、出入库费、仓储费、加工费、配送费)和目标利润率。支持Excel批量上传。",
guideStep2Title:"AI最优价计算",guideStep2Desc:"在最优化标签中选择SKU和渠道，输入当前售价和库存数量，点击'价格优化'按钮。AI基于弹性模型计算最优价格。",
guideStep3Title:"场景模拟",guideStep3Desc:"在场景标签中输入测试价格列表(逗号分隔)进行模拟。比较各价位的预期销量、收入、利润和利润率。",
guideStep4Title:"渠道组合优化",guideStep4Desc:"在渠道组合标签中输入总营销预算，AI分析各渠道ROI后建议最优预算分配方案。",
guideStep5Title:"动态调价器设置",guideStep5Desc:"在调价器标签中创建自动价格变动规则。支持最低价匹配、ROAS目标、库存驱动等多种自动定价策略。",
guideStep6Title:"竞价监控",guideStep6Desc:"在竞价标签中实时追踪主要竞争对手的价格。当自身价格高于竞争对手时自动发出警报并建议调整。",
guideStep7Title:"渠道手续费管理",guideStep7Desc:"在手续费标签中查看国内外所有渠道的销售手续费率和税率。通过集成中心API自动同步手续费数据。",
guideStep8Title:"促销日历管理",guideStep8Desc:"在促销日历标签中注册折扣活动。输入SKU、商品名、渠道、起止日期、促销价格和原因。",
guideStep9Title:"Excel批量操作",guideStep9Desc:"利用Excel模板一次注册数百个SKU的商品信息和成本数据。下载模板填写后上传即可批量导入。",
guideStep10Title:"审核与应用",guideStep10Desc:"在概览标签中审核所有优化结果。通过商品同步功能将AI推荐的最优价格实时应用到各销售渠道。",
guideTabSummaryDesc:"查看所有优化KPI、渠道分析和最近推荐记录的概览仪表盘。",
guideTabProductsDesc:"注册和管理商品信息，包含详细的成本分解以计算精准利润率。",
guideTabOptimizeDesc:"基于弹性模型和库存数据的AI最优价计算引擎。",
guideTabScenarioDesc:"比较不同价格方案下的销量和利润的多价格场景模拟器。",
guideTabMixDesc:"为最大化ROI在各渠道间分配营销预算的优化器。",
guideTabRepricerDesc:"根据库存、竞争和ROAS目标自定义规则的自动价格调整引擎。",
guideTabCompetitorDesc:"带有价格劣势警报的实时竞争对手价格追踪器。",
guideTabCalendarDesc:"规划季节促销、限时折扣和预约优惠的促销价格日历。",
guideTabFeeDesc:"通过集成中心自动同步的渠道手续费率管理。",
guideTabGuideDesc:"包含分步说明和标签参考的使用指南。",
guideTip1:"利用Excel批量上传功能可一次注册数百个SKU。请先下载模板按格式填写。",
guideTip2:"优化结果自动反映渠道手续费。手续费越高的渠道售价需更高才能达到目标利润。",
guideTip3:"利用场景模拟预先分析调价影响。积累弹性数据后预测准确度会逐步提高。",
guideTip4:"设置动态调价器规则后可自动应对竞争对手价格变动。最低价匹配模式需谨慎使用。",
guideTip5:"在促销日历中提前注册活动可精确预测活动期间的销售影响。",
},
ja:{
guideStep1Title:"商品登録と原価設定",guideStep1Desc:"商品タブでSKU、商品名、カテゴリ、規格、単位を入力し、原価構成(仕入原価、入出庫費、保管費、加工費、配送費)と目標マージン率を設定します。",
guideStep2Title:"AI最適価格計算",guideStep2Desc:"最適化タブでSKUとチャネルを選択し、現在の販売価格と在庫数量を入力後「価格最適化」ボタンで算出します。",
guideStep3Title:"シナリオシミュレーション",guideStep3Desc:"テスト価格リスト(カンマ区切り)を入力して各価格帯の売上・利益をシミュレーションします。",
guideStep4Title:"チャネルミックス最適化",guideStep4Desc:"総マーケティング予算を入力すると、AIが各チャネルのROIを分析して最適な予算配分を提案します。",
guideStep5Title:"ダイナミックリプライサー設定",guideStep5Desc:"自動価格変動ルールを作成。最低価格マッチング、ROAS目標、在庫ベースなど様々な戦略をサポート。",
guideStep6Title:"競合価格モニタリング",guideStep6Desc:"主要競合の価格をリアルタイム追跡。自社価格が競合より高い場合アラート発信。",
guideStep7Title:"チャネル手数料管理",guideStep7Desc:"国内外チャネルの手数料率を確認。統合ハブAPIで自動同期。",
guideStep8Title:"プロモカレンダー",guideStep8Desc:"割引イベントをカレンダーに登録。SKU、チャネル、期間、プロモ価格を設定。",
guideStep9Title:"Excelバッチ操作",guideStep9Desc:"テンプレートで数百SKUを一括登録。",
guideStep10Title:"レビューと適用",guideStep10Desc:"概要タブで結果を確認し、カタログ同期で推奨価格を適用。",
guideTabSummaryDesc:"全最適化KPIとチャネル分析の概要ダッシュボード。",
guideTabProductsDesc:"詳細な原価内訳とともに商品を登録・管理。",
guideTabOptimizeDesc:"弾力性モデルによるAI最適価格算定エンジン。",
guideTabScenarioDesc:"複数価格帯の売上・利益を比較するシミュレータ。",
guideTabMixDesc:"ROI最大化のためのチャネル間予算配分最適化。",
guideTabRepricerDesc:"在庫・競合・ROAS目標ベースの自動価格調整。",
guideTabCompetitorDesc:"競合価格のリアルタイム追跡とアラート。",
guideTabCalendarDesc:"セール・フラッシュディール・予約割引の管理。",
guideTabFeeDesc:"統合ハブ自動同期によるチャネル手数料管理。",
guideTabGuideDesc:"ステップ別ガイドとタブ参照。",
guideTip1:"Excel一括アップロードで数百SKUを一度に登録可能。",
guideTip2:"チャネル手数料は最適価格計算に自動反映されます。",
guideTip3:"シナリオシミュレーションで価格変更の影響を事前分析。",
},
de:{guideStep1Title:"Produkte registrieren",guideStep1Desc:"SKU, Name, Kategorie und Kostenstruktur eingeben.",guideStep2Title:"KI-Preisoptimierung",guideStep2Desc:"SKU und Kanal wählen, Optimierung starten.",guideStep3Title:"Szenario-Simulation",guideStep3Desc:"Testpreise eingeben und Szenarien vergleichen.",
guideTabSummaryDesc:"Übersicht aller Optimierungs-KPIs.",guideTabProductsDesc:"Produkte mit Kostenstruktur verwalten.",guideTabOptimizeDesc:"KI-basierte Preisoptimierung.",},
es:{guideStep1Title:"Registrar productos",guideStep1Desc:"Ingrese SKU, nombre, categoría y costos.",guideStep2Title:"Optimización IA",guideStep2Desc:"Seleccione SKU y canal, ejecute optimización.",guideStep3Title:"Simulación de escenarios",guideStep3Desc:"Ingrese precios de prueba y compare resultados.",
guideTabSummaryDesc:"Panel de todos los KPIs de optimización.",guideTabProductsDesc:"Gestione productos con estructura de costos.",},
fr:{guideStep1Title:"Enregistrer les produits",guideStep1Desc:"Saisissez SKU, nom, catégorie et coûts.",guideStep2Title:"Optimisation IA",guideStep2Desc:"Sélectionnez SKU et canal, lancez l'optimisation.",
guideTabSummaryDesc:"Vue d'ensemble de tous les KPIs.",guideTabProductsDesc:"Gérez les produits avec la structure des coûts.",},
th:{guideStep1Title:"ลงทะเบียนสินค้า",guideStep1Desc:"กรอก SKU ชื่อ หมวดหมู่ และต้นทุน",guideStep2Title:"ปรับราคา AI",guideStep2Desc:"เลือก SKU และช่องทาง เริ่มการปรับราคา",
guideTabSummaryDesc:"ภาพรวม KPI ทั้งหมด",guideTabProductsDesc:"จัดการสินค้าพร้อมโครงสร้างต้นทุน",},
vi:{guideStep1Title:"Đăng ký sản phẩm",guideStep1Desc:"Nhập SKU, tên, danh mục và chi phí.",guideStep2Title:"Tối ưu hóa AI",guideStep2Desc:"Chọn SKU và kênh, chạy tối ưu.",
guideTabSummaryDesc:"Tổng quan tất cả KPIs.",guideTabProductsDesc:"Quản lý sản phẩm với cấu trúc chi phí.",},
id:{guideStep1Title:"Daftarkan produk",guideStep1Desc:"Masukkan SKU, nama, kategori dan biaya.",guideStep2Title:"Optimasi AI",guideStep2Desc:"Pilih SKU dan saluran, jalankan optimasi.",
guideTabSummaryDesc:"Ringkasan semua KPI optimasi.",guideTabProductsDesc:"Kelola produk dengan struktur biaya.",},
pt:{guideStep1Title:"Registrar produtos",guideStep1Desc:"Insira SKU, nome, categoria e custos.",guideStep2Title:"Otimização IA",guideStep2Desc:"Selecione SKU e canal, execute otimização.",
guideTabSummaryDesc:"Visão geral de todos os KPIs.",guideTabProductsDesc:"Gerencie produtos com estrutura de custos.",},
ru:{guideStep1Title:"Регистрация товаров",guideStep1Desc:"Введите SKU, название, категорию и затраты.",guideStep2Title:"ИИ-оптимизация",guideStep2Desc:"Выберите SKU и канал, запустите оптимизацию.",
guideTabSummaryDesc:"Обзор всех KPI оптимизации.",guideTabProductsDesc:"Управление товарами со структурой затрат.",},
ar:{guideStep1Title:"تسجيل المنتجات",guideStep1Desc:"أدخل SKU والاسم والفئة والتكاليف.",guideStep2Title:"تحسين الذكاء الاصطناعي",guideStep2Desc:"اختر SKU والقناة، ابدأ التحسين.",
guideTabSummaryDesc:"نظرة عامة على جميع مؤشرات الأداء.",guideTabProductsDesc:"إدارة المنتجات مع هيكل التكاليف.",},
hi:{guideStep1Title:"उत्पाद पंजीकृत करें",guideStep1Desc:"SKU, नाम, श्रेणी और लागत दर्ज करें।",guideStep2Title:"AI अनुकूलन",guideStep2Desc:"SKU और चैनल चुनें, अनुकूलन चलाएं।",
guideTabSummaryDesc:"सभी KPI का अवलोकन।",guideTabProductsDesc:"लागत संरचना के साथ उत्पाद प्रबंधन।",},
'zh-TW':{guideStep1Title:"商品註冊與成本設置",guideStep1Desc:"在商品標籤中輸入SKU、商品名、類別和成本結構。",guideStep2Title:"AI最適價計算",guideStep2Desc:"選擇SKU和通路，執行價格優化。",
guideTabSummaryDesc:"所有優化KPI的概覽儀表板。",guideTabProductsDesc:"以詳細成本分解管理商品。",},
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
console.log(`Done: ${count}`);
