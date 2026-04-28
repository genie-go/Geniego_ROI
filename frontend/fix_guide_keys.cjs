const fs=require('fs'),path=require('path'),dir=path.join(__dirname,'src/i18n/locales');
// Guide steps use guideS{N}T and guideS{N}D format, NOT guideStep{N}Title
// Also guide tabs use guideTab{Name}Desc and guideTp{N}/guideCt{N} patterns
const T={
zh:{
guideS1T:"注册和设置仓库",guideS1D:"在'WMS仓库'标签中点击[+添加仓库]按钮。输入仓库名称、代码、地址、面积、温度类型(常温/冷藏/冷冻/复合/电子/危险品)、运营类型(自营/3PL/租赁)、管理员联系方式后保存。",
guideS2T:"出入库登记和管理",guideS2D:"在'出入库'标签中点击[登记]按钮，登记入库、出库、退货入库、退货出库、仓库间调拨、库存调整、报废等7种类型。支持Excel/CSV批量上传和条码/QR扫描。",
guideS3T:"实时库存查询",guideS3D:"在'库存状况'标签中按仓库、SKU查询全部库存。低于安全库存的商品以红色标注，支持CSV/Excel导出导入，库存价值自动计算。",
guideS4T:"入库验收流程",guideS4D:"在'入库验收'标签中基于采购订单(PO)验收入库商品的数量和质量。验收完成后自动反映到库存中。",
guideS5T:"拣货/包装列表管理",guideS5D:"在'拣货/包装'标签中创建和管理基于订单的拣货列表。订单下达后自动生成拣货列表，提供基于仓库位置的最优路线。",
guideS6T:"批次/保质期追踪",guideS6D:"在'批次/保质期'标签中登记和追踪批次号和保质期。FIFO自动适用，保质期临近的商品优先出库。",
guideS7T:"自动采购(PO)系统",guideS7D:"在'自动采购'标签中基于安全库存设置自动采购。库存低于安全库存时自动创建采购申请。",
guideS8T:"合并包装管理",guideS8D:"在'合并包装'标签中将同一买家的多个订单合并到一个包裹中发货，节省运费。",
guideS9T:"运输公司管理和API集成",guideS9D:"在'运输公司'标签中注册国内/国际快递公司并集成API。在集成中心注册API密钥后自动同步。",
guideS10T:"商业发票自动生成",guideS10D:"在'发票'标签中自动生成国际发货用商业发票，支持INCOTERMS、HS编码和多币种。",
guideS11T:"捆绑/BOM管理",guideS11D:"通过BOM(物料清单)创建商品捆绑。追踪组件库存并组装/发运捆绑套装。",
guideS12T:"供应商管理",guideS12D:"注册和管理供应商的联系方式、付款条件、交货周期和评分。追踪各供应渠道的采购历史。",
guideS13T:"库存盘点",guideS13D:"盘点实际库存。对比账面库存和实际库存，识别差异并生成差异报告。",
guideS14T:"审计历史和安全",guideS14D:"通过[移动历史]按钮查看所有仓库活动的审计追踪日志。通过[安全监控]按钮实时监控安全威胁。",
guideS15T:"数据导出和报表",guideS15D:"支持CSV/Excel格式的库存报表导出。利用报表构建器生成自定义分析报告。",
guideS16T:"多仓库运营",guideS16D:"同时管理多个仓库，支持仓库间调拨、各仓库独立库存管理和统一视图。",
guideS17T:"权限管理",guideS17D:"为每个用户设置不同的访问权限(管理员/经理/操作员/查看者)，保障数据安全。",
guideS18T:"条码/QR扫描",guideS18D:"使用移动设备的相机扫描条码/QR码，快速处理入库/出库/盘点作业。",
guideS19T:"安全监控",guideS19D:"实时监控XSS/SQL注入等安全威胁。检测到黑客攻击时立即发出警报。",
guideS20T:"API集成",guideS20D:"通过集成中心连接ERP、电商平台和物流系统，实现数据自动同步。",
guideTp1:"在集成中心注册API密钥后，快递公司和销售渠道会自动同步到WMS。比手动注册更高效。",
guideTp2:"设置安全库存阈值后，自动采购功能可以预防缺货。请为每个SKU设置不同的阈值。",
guideTp3:"使用Excel批量上传功能一次处理数百条出入库记录。下载样本文件按格式填写即可。",
guideTp4:"启用批次/保质期管理后，FIFO自动应用可最大限度减少报废损失。",
guideTp5:"定期执行库存盘点(建议每月1次)可最大限度减少账面和实物差异，实现精确库存管理。",
guideCt1:"删除仓库前请确保库存为零。否则可能导致数据不一致。",
guideCt2:"API密钥请妥善保管，切勿在公共代码库中暴露。建议定期更换密钥。",
guideCt3:"大批量导入时请先用少量数据测试，确认无误后再执行全量导入。",
guideTab1:"WMS仓库",guideTab2:"出入库",guideTab3:"库存状况",guideTab4:"入库验收",guideTab5:"拣货/包装",guideTab6:"批次/保质期",guideTab7:"自动采购",guideTab8:"合并包装",guideTab9:"运输公司",guideTab10:"物流追踪",guideTab11:"发票",guideTab12:"捆绑/BOM",guideTab13:"供应商",guideTab14:"库存盘点",
},
ja:{
guideS1T:"倉庫の登録と設定",guideS1D:"'WMS倉庫'タブで[+倉庫追加]をクリック。倉庫名、コード、住所、面積、温度タイプ、運営タイプ、管理者連絡先を入力して保存します。",
guideS2T:"入出庫登録と管理",guideS2D:"'入出庫'タブで入庫、出庫、返品入庫、返品出庫、倉庫間移動、在庫調整、廃棄の7種類を登録します。",
guideS3T:"リアルタイム在庫照会",guideS3D:"'在庫状況'タブで全在庫を倉庫別、SKU別に照会します。安全在庫以下の品目は赤で表示されます。",
guideS4T:"入庫検品プロセス",guideS4D:"'入庫検品'タブで発注(PO)に基づいて入庫商品の数量と品質を検品します。",
guideS5T:"ピッキング/梱包リスト管理",guideS5D:"'ピッキング/梱包'タブで注文ベースのピッキングリストを作成・管理します。",
guideS6T:"ロット/消費期限追跡",guideS6D:"ロット番号と消費期限を登録・追跡します。FIFO自動適用。",
guideS7T:"自動発注(PO)システム",guideS7D:"安全在庫基準で自動発注を設定します。",
guideS8T:"合包装管理",guideS8D:"同一購入者の複数注文を1つの箱にまとめて配送します。",
guideS9T:"運送会社管理とAPI連携",guideS9D:"国内/国際宅配業者を登録しAPIを連携します。",
guideS10T:"コマーシャルインボイス",guideS10D:"国際配送用コマーシャルインボイスを自動生成します。",
guideS11T:"バンドル/BOM管理",guideS11D:"BOM(部品表)でバンドル商品を作成し構成品在庫を追跡します。",
guideS12T:"取引先管理",guideS12D:"サプライヤーの連絡先、支払条件、リードタイム、評価を管理します。",
guideS13T:"在庫実査",guideS13D:"帳簿在庫と実物在庫を比較し差異レポートを生成します。",
guideS14T:"監査履歴とセキュリティ",guideS14D:"すべての倉庫活動の監査追跡ログを確認し、セキュリティ脅威をリアルタイム監視します。",
guideTp1:"統合ハブでAPIキーを登録すると、宅配業者と販売チャネルがWMSに自動同期されます。",
guideTp2:"安全在庫閾値を設定すると自動発注機能で品切れを予防できます。",
guideTp3:"Excel一括アップロード機能で数百件の入出庫を一度に処理できます。",
},
de:{guideS1T:"Lager registrieren",guideS1D:"Im Tab 'WMS Lager' auf [+Lager hinzufügen] klicken.",guideS2T:"Ein-/Ausgang verwalten",guideS2D:"7 Bewegungsarten registrieren.",guideS3T:"Bestandsstatus prüfen",guideS3D:"Bestand nach Lager und SKU einsehen.",guideS4T:"Wareneingang prüfen",guideS4D:"Menge und Qualität prüfen.",guideS5T:"Kommissionierung",guideS5D:"Auftragsbasierte Picklisten erstellen.",guideTp1:"API-Schlüssel im Hub registrieren.",},
th:{guideS1T:"ลงทะเบียนคลังสินค้า",guideS1D:"คลิก [+เพิ่มคลัง] ในแท็บ 'คลังสินค้า WMS'",guideS2T:"จัดการรับ-จ่าย",guideS2D:"ลงทะเบียน 7 ประเภทการเคลื่อนไหว",guideS3T:"ตรวจสอบสถานะสต็อก",guideS3D:"ดูสต็อกตามคลังและ SKU",guideS4T:"รับสินค้า",guideS4D:"ตรวจสอบจำนวนและคุณภาพ",guideS5T:"หยิบ/แพ็ค",guideS5D:"สร้างรายการหยิบสินค้า",},
vi:{guideS1T:"Đăng ký kho",guideS1D:"Nhấn [+Thêm kho] trong tab 'Kho WMS'.",guideS2T:"Quản lý xuất nhập",guideS2D:"Đăng ký 7 loại di chuyển hàng.",guideS3T:"Kiểm tra tồn kho",guideS3D:"Xem tồn kho theo kho và SKU.",guideS4T:"Nhận hàng",guideS4D:"Kiểm tra số lượng và chất lượng.",guideS5T:"Lấy hàng/Đóng gói",guideS5D:"Tạo danh sách lấy hàng.",},
id:{guideS1T:"Daftarkan Gudang",guideS1D:"Klik [+Tambah Gudang] di tab 'Gudang WMS'.",guideS2T:"Kelola Keluar/Masuk",guideS2D:"Daftarkan 7 jenis pergerakan stok.",guideS3T:"Cek Status Stok",guideS3D:"Lihat stok berdasarkan gudang dan SKU.",guideS4T:"Penerimaan",guideS4D:"Periksa jumlah dan kualitas.",guideS5T:"Pick & Pack",guideS5D:"Buat daftar picking.",},
es:{guideS1T:"Registrar Almacén",guideS1D:"Haga clic en [+Agregar Almacén] en la pestaña 'Almacén WMS'.",guideS2T:"Gestionar Entradas/Salidas",guideS2D:"Registre 7 tipos de movimientos.",guideS3T:"Verificar Inventario",guideS3D:"Consulte el stock por almacén y SKU.",guideS4T:"Recepción",guideS4D:"Inspeccione cantidad y calidad.",guideS5T:"Picking/Empaque",guideS5D:"Cree listas de picking.",},
fr:{guideS1T:"Enregistrer un Entrepôt",guideS1D:"Cliquez sur [+Ajouter Entrepôt] dans l'onglet 'Entrepôt WMS'.",guideS2T:"Gérer Entrées/Sorties",guideS2D:"Enregistrez 7 types de mouvements.",guideS3T:"Vérifier les Stocks",guideS3D:"Consultez le stock par entrepôt et SKU.",guideS4T:"Réception",guideS4D:"Inspectez quantité et qualité.",guideS5T:"Préparation/Emballage",guideS5D:"Créez des listes de préparation.",},
pt:{guideS1T:"Registrar Armazém",guideS1D:"Clique em [+Adicionar Armazém] na aba 'Armazém WMS'.",guideS2T:"Gerenciar Entradas/Saídas",guideS2D:"Registre 7 tipos de movimentos.",guideS3T:"Verificar Estoque",guideS3D:"Consulte o estoque por armazém e SKU.",guideS4T:"Recebimento",guideS4D:"Inspecione quantidade e qualidade.",guideS5T:"Separação/Embalagem",guideS5D:"Crie listas de separação.",},
ru:{guideS1T:"Регистрация склада",guideS1D:"Нажмите [+Добавить Склад] во вкладке 'Склад WMS'.",guideS2T:"Управление приходом/расходом",guideS2D:"Зарегистрируйте 7 типов движений.",guideS3T:"Проверка запасов",guideS3D:"Просмотрите запасы по складу и SKU.",guideS4T:"Приёмка",guideS4D:"Проверьте количество и качество.",guideS5T:"Комплектация/Упаковка",guideS5D:"Создайте списки комплектации.",},
ar:{guideS1T:"تسجيل المستودع",guideS1D:"انقر على [+إضافة مستودع] في علامة التبويب 'مستودع WMS'.",guideS2T:"إدارة الوارد/الصادر",guideS2D:"سجل 7 أنواع من الحركات.",guideS3T:"فحص المخزون",guideS3D:"عرض المخزون حسب المستودع و SKU.",guideS4T:"استلام",guideS4D:"فحص الكمية والجودة.",guideS5T:"التقاط/تعبئة",guideS5D:"إنشاء قوائم الالتقاط.",},
hi:{guideS1T:"गोदाम पंजीकृत करें",guideS1D:"'WMS गोदाम' टैब में [+गोदाम जोड़ें] क्लिक करें।",guideS2T:"आवक/जावक प्रबंधन",guideS2D:"7 प्रकार की स्टॉक गतिविधि दर्ज करें।",guideS3T:"स्टॉक स्थिति जांचें",guideS3D:"गोदाम और SKU द्वारा स्टॉक देखें।",guideS4T:"माल प्राप्ति",guideS4D:"मात्रा और गुणवत्ता की जांच करें।",guideS5T:"पिकिंग/पैकिंग",guideS5D:"पिकिंग सूची बनाएं।",},
'zh-TW':{guideS1T:"註冊倉庫",guideS1D:"在'WMS倉庫'標籤中點擊[+新增倉庫]按鈕。",guideS2T:"管理出入庫",guideS2D:"登記7種類型的庫存移動。",guideS3T:"查看庫存狀況",guideS3D:"按倉庫和SKU查看所有庫存。",guideS4T:"入庫驗收",guideS4D:"檢查數量和品質。",guideS5T:"揀貨/包裝",guideS5D:"建立揀貨清單。",},
};
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
let count=0;
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
  count++;
}
console.log(`Done: ${count} files`);
