/* [257차] ReturnsPortal 반품 사유분석 신규 키 rpI18n 15국 주입.
 * "lang":{ 직후 삽입. analyticsTopProducts/DefectiveRate/ServerNote 는 전역 부재(신규)·defective 는 일부 존재(dup=last-wins 무해).
 */
const fs = require('fs');
const path = require('path');
const FP = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'rpI18n.js');
const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id','ar','es','fr','hi','pt','ru'];
const T = {
  analyticsTopProducts: {ko:'반품 유발 상품 Top',en:'Top return-driving products',ja:'返品要因 商品Top',zh:'引发退货商品Top',"zh-TW":'引發退貨商品Top',de:'Top-Retourentreiber (Produkte)',th:'สินค้าที่ทำให้เกิดการคืนสูงสุด',vi:'Sản phẩm gây trả hàng nhiều nhất',id:'Produk pemicu retur teratas',ar:'أكثر المنتجات تسببًا في الإرجاع',es:'Productos que más generan devoluciones',fr:'Produits générant le plus de retours',hi:'सर्वाधिक रिटर्न वाले उत्पाद',pt:'Produtos que mais geram devoluções',ru:'Товары — лидеры по возвратам'},
  analyticsDefectiveRate: {ko:'불량률',en:'Defect rate',ja:'不良率',zh:'次品率',"zh-TW":'瑕疵率',de:'Defektrate',th:'อัตราของชำรุด',vi:'Tỷ lệ lỗi',id:'Tingkat cacat',ar:'معدل العيوب',es:'Tasa de defectos',fr:'Taux de défauts',hi:'दोष दर',pt:'Taxa de defeitos',ru:'Доля брака'},
  analyticsServerNote: {ko:'전체 반품 전수 집계',en:'Full return dataset (server aggregate)',ja:'全返品の全数集計',zh:'全部退货全量汇总',"zh-TW":'全部退貨全量彙總',de:'Vollständige Retouren (Server-Aggregat)',th:'รวมข้อมูลคืนทั้งหมด (ฝั่งเซิร์ฟเวอร์)',vi:'Tổng hợp toàn bộ trả hàng (máy chủ)',id:'Agregat seluruh retur (server)',ar:'تجميع كامل لكل المرتجعات (خادم)',es:'Conjunto completo de devoluciones (servidor)',fr:'Ensemble complet des retours (serveur)',hi:'संपूर्ण रिटर्न डेटा (सर्वर समुच्चय)',pt:'Conjunto completo de devoluções (servidor)',ru:'Полный набор возвратов (сервер)'},
  defective: {ko:'불량',en:'Defective',ja:'不良',zh:'次品',"zh-TW":'瑕疵',de:'Defekt',th:'ชำรุด',vi:'Lỗi',id:'Cacat',ar:'معيب',es:'Defectuoso',fr:'Défectueux',hi:'दोषपूर्ण',pt:'Defeituoso',ru:'Брак'},
};
function esc(s){ return String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"'); }
let src = fs.readFileSync(FP,'utf8');
let rep=[];
for(const lang of LANGS){
  const re = new RegExp('("'+lang+'"\\s*:\\s*\\{)');
  const m = src.match(re);
  if(!m){ rep.push(lang+': NOT FOUND'); continue; }
  let inject='';
  for(const k of Object.keys(T)){
    const v=T[k][lang]; if(v===undefined) continue;
    inject += '"'+k+'":"'+esc(v)+'",';
  }
  src = src.replace(re, m[1]+inject);
  rep.push(lang+': +'+Object.keys(T).length);
}
fs.writeFileSync(FP, src, 'utf8');
console.log(rep.join('\n')); console.log('DONE');
