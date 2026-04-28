const fs=require('fs');
const K=["pageTitle","pageSub","tabOverview","tabRequests","tabInspection","tabRefunds","tabRestock","tabAnalytics","tabPolicies","tabGuide","loading","noData","kpiTotal","kpiPending","kpiApproved","kpiRefunded","kpiRate","kpiAvgDays","orderNo","product","reason","status","date","amount","customer","channel","statusPending","statusApproved","statusRejected","statusRefunded","statusRestocked","statusDisposed","reasonDefective","reasonWrongItem","reasonDamaged","reasonNotAsDesc","reasonChangeOfMind","reasonLateDelivery","reasonOther","register","cancel","save","delete","confirm","search","filter","export","inspResult","inspPass","inspFail","inspPartial","inspNotes","inspDate","inspGrade","gradeA","gradeB","gradeC","gradeF","refundAmount","refundMethod","refundBank","refundCard","refundOriginal","refundStatus","refundPending","refundComplete","refundPartial","restockQty","restockLocation","restockDispose","restockRecycle","restockResell","restockDonate","analyticsRate","analyticsByReason","analyticsByChannel","analyticsTrend","analyticsCost","policyName","policyDays","policyCondition","policyActive","policyInactive","policyAutoApprove","policyMaxDays","policyDescription","periodLabel","periodFrom","periodTo","guideTitle","guideSub","guideSteps","guideTips","guideBeginner","guideTime","guideLang","guideStart","guideStartDesc","guideReady","guideReadyDesc","badgeLive","badgeSync","badgeSecurity","secBlocked","secDismiss"];
for(let i=1;i<=15;i++){K.push("guideStep"+i+"T","guideStep"+i+"D");}
const V={
ko:["반품 포털","반품 관리 및 환불 처리 시스템","반품 현황","반품 접수","품질 검수","환불 처리","재입고","반품 분석","정책 관리","이용 가이드","로딩 중...","데이터 없음","총 반품","대기중","승인됨","환불완료","반품률","평균 처리일","주문번호","제품","사유","상태","날짜","금액","고객","채널","대기중","승인","거절","환불완료","재입고","폐기","불량","오배송","파손","상품불일치","단순변심","배송지연","기타","등록","취소","저장","삭제","확인","검색","필터","내보내기","검수 결과","합격","불합격","부분합격","검수 메모","검수일","등급","A등급","B등급","C등급","F등급","환불 금액","환불 방법","계좌이체","카드환불","원결제수단","환불 상태","환불 대기","환불 완료","부분 환불","재입고 수량","재입고 위치","폐기","재활용","재판매","기부","반품률","사유별 분석","채널별 분석","추이 분석","비용 분석","정책명","반품기한(일)","조건","활성","비활성","자동승인","최대일수","정책 설명","기간","시작일","종료일","반품 포털 이용 가이드","반품 관리 시스템 완벽 가이드","단계별 가이드","전문가 팁","초보자","15분","15개 언어","어디서 시작?","반품 현황 탭에서 전체 현황을 확인하세요.","준비 완료!","첫 반품 접수를 등록하세요.","● LIVE","실시간 동기화","보안 활성","보안 위반 차단","닫기"],
en:["Returns Portal","Returns management & refund processing","Overview","Requests","Inspection","Refunds","Restock","Analytics","Policies","Guide","Loading...","No data","Total Returns","Pending","Approved","Refunded","Return Rate","Avg Days","Order No","Product","Reason","Status","Date","Amount","Customer","Channel","Pending","Approved","Rejected","Refunded","Restocked","Disposed","Defective","Wrong Item","Damaged","Not as Described","Change of Mind","Late Delivery","Other","Register","Cancel","Save","Delete","Confirm","Search","Filter","Export","Inspection Result","Pass","Fail","Partial","Notes","Insp. Date","Grade","Grade A","Grade B","Grade C","Grade F","Refund Amount","Refund Method","Bank Transfer","Card Refund","Original Payment","Refund Status","Pending","Complete","Partial","Restock Qty","Location","Dispose","Recycle","Resell","Donate","Return Rate","By Reason","By Channel","Trend","Cost Analysis","Policy Name","Return Period(days)","Condition","Active","Inactive","Auto Approve","Max Days","Description","Period","From","To","Returns Portal Guide","Complete returns management guide","Step-by-Step","Expert Tips","Beginner","15 min","15 Languages","Where to start?","Check overall status in Overview tab.","Ready!","Register your first return request.","● LIVE","Realtime Sync","Security Active","Security violation blocked","Dismiss"],
ja:["返品ポータル","返品管理・返金処理システム","返品概況","返品受付","品質検査","返金処理","再入庫","返品分析","ポリシー管理","ガイド","読み込み中...","データなし","返品総数","保留中","承認済","返金済","返品率","平均処理日数","注文番号","製品","理由","状態","日付","金額","顧客","チャネル","保留中","承認","却下","返金済","再入庫","廃棄","不良品","誤配送","破損","説明と異なる","気変わり","配送遅延","その他","登録","キャンセル","保存","削除","確認","検索","フィルター","エクスポート","検査結果","合格","不合格","一部合格","メモ","検査日","等級","A等級","B等級","C等級","F等級","返金額","返金方法","振込","カード返金","元決済手段","返金状態","返金保留","返金完了","一部返金","再入庫数量","場所","廃棄","リサイクル","再販売","寄付","返品率","理由別","チャネル別","推移","コスト分析","ポリシー名","返品期限(日)","条件","有効","無効","自動承認","最大日数","説明","期間","開始日","終了日","返品ポータルガイド","返品管理システム完全ガイド","ステップガイド","専門家のヒント","初心者","15分","15言語","どこから？","概況タブで全体状況を確認。","準備完了！","最初の返品を登録。","● LIVE","リアルタイム同期","セキュリティ有効","セキュリティ違反ブロック","閉じる"],
zh:["退货门户","退货管理与退款处理系统","退货概览","退货申请","质量检验","退款处理","重新入库","退货分析","政策管理","使用指南","加载中...","暂无数据","退货总数","待处理","已批准","已退款","退货率","平均处理天数","订单号","产品","原因","状态","日期","金额","客户","渠道","待处理","已批准","已拒绝","已退款","已入库","已处置","缺陷","错误商品","损坏","与描述不符","改变主意","延迟交付","其他","注册","取消","保存","删除","确认","搜索","筛选","导出","检验结果","合格","不合格","部分合格","备注","检验日期","等级","A级","B级","C级","F级","退款金额","退款方式","银行转账","卡退款","原支付方式","退款状态","待退款","已完成","部分退款","入库数量","位置","处置","回收","转售","捐赠","退货率","按原因","按渠道","趋势","成本分析","政策名称","退货期限(天)","条件","激活","未激活","自动批准","最大天数","描述","期间","开始","结束","退货门户指南","退货管理系统完整指南","分步指南","专家提示","初学者","15分钟","15种语言","从哪开始？","在概览标签查看整体状况。","就绪！","注册第一个退货申请。","● LIVE","实时同步","安全激活","安全违规已阻止","关闭"],
};
// Guide steps ko
const GS_KO=["반품 포털 메뉴 접속","반품 현황 대시보드에서 KPI 확인","반품 접수 탭에서 신규 반품 등록","반품 사유 선택 및 상세 정보 입력","품질 검수 탭에서 반품 상태 검사","검수 등급 판정(A/B/C/F)","환불 처리 탭에서 환불 금액 확인","환불 방법 선택 및 환불 실행","재입고 탭에서 재입고/폐기 결정","재입고 처리 또는 폐기 처리 실행","반품 분석 탭에서 반품률 확인","사유별/채널별 반품 분석","반품 추이 분석으로 트렌드 파악","정책 관리 탭에서 반품 규칙 설정","종합 관리 및 정기 모니터링"];
const GS_KO_D=["좌측 사이드바에서 반품 포털 클릭","총 반품수, 대기건, 승인건, 환불 완료건 확인","반품 접수 버튼을 클릭하여 신규 반품 등록","불량, 오배송, 파손 등 사유를 선택하고 상세 정보 입력","반품된 상품의 품질 상태를 검사","A(재판매 가능), B(할인 판매), C(부품 재활용), F(폐기)","환불 금액과 환불 방법을 확인","계좌이체, 카드환불, 원결제수단 중 선택","검수 결과에 따라 재입고 또는 폐기 결정","재입고 위치 지정 또는 폐기/재활용/기부 처리","전체 반품률과 평균 처리일수 확인","어떤 사유가 많은지, 어떤 채널에서 반품이 많은지 분석","월별/주별 반품 추이를 그래프로 확인","반품 기한, 자동승인 조건, 최대 일수 등 설정","정기적으로 KPI를 모니터링하고 정책을 최적화"];
const GS_EN=["Access Returns Portal","Check KPI dashboard in Overview","Register new return in Requests tab","Select return reason and enter details","Inspect returned item quality","Assign inspection grade (A/B/C/F)","Review refund amount in Refunds tab","Select refund method and process","Decide restock or dispose in Restock tab","Execute restock or disposal","Check return rate in Analytics","Analyze by reason and channel","Review return trends","Configure return policies","Regular monitoring and optimization"];
const GS_EN_D=["Click Returns Portal in sidebar","View total returns, pending, approved, refunded counts","Click register button to create new return","Select defective, wrong item, damaged, etc.","Inspect physical condition of returned product","A(resellable), B(discount), C(parts), F(dispose)","Verify refund amount and method","Choose bank transfer, card, or original payment","Based on inspection, decide restock or dispose","Assign location or process disposal/recycle/donate","View overall return rate and avg processing days","Identify top reasons and channels for returns","Check monthly/weekly return trends via charts","Set return period, auto-approve rules, max days","Monitor KPIs regularly and optimize policies"];
GS_KO.forEach((v,i)=>{V.ko.push(v,GS_KO_D[i]);});
GS_EN.forEach((v,i)=>{V.en.push(v,GS_EN_D[i]);});
// ja guide steps
const GS_JA_T=["返品ポータルにアクセス","概況ダッシュボードでKPI確認","返品受付タブで新規登録","返品理由を選択し詳細入力","返品商品の品質検査","検査等級判定(A/B/C/F)","返金タブで返金額確認","返金方法を選択し実行","再入庫タブで再入庫/廃棄決定","再入庫または廃棄処理実行","分析タブで返品率確認","理由別/チャネル別分析","返品トレンド分析","ポリシー設定","定期モニタリング"];
GS_JA_T.forEach((v,i)=>{V.ja.push(v,GS_EN_D[i]||"");});
// zh guide steps
const GS_ZH_T=["进入退货门户","在概览查看KPI","在申请标签注册新退货","选择退货原因并输入详情","检验退货商品质量","分配检验等级(A/B/C/F)","在退款标签确认退款金额","选择退款方式并处理","在入库标签决定入库或处置","执行入库或处置","在分析标签查看退货率","按原因和渠道分析","查看退货趋势","配置退货政策","定期监控和优化"];
GS_ZH_T.forEach((v,i)=>{V.zh.push(v,GS_EN_D[i]||"");});
// Secondary langs: copy en, override key fields
const SEC={
"zh-TW":{0:"退貨入口",1:"退貨管理與退款處理系統",2:"退貨概覽",3:"退貨申請",4:"品質檢驗",5:"退款處理",6:"重新入庫",7:"退貨分析",8:"政策管理",9:"使用指南"},
de:{0:"Retourenportal",1:"Retourenverwaltung & Erstattung",2:"Übersicht",3:"Anfragen",4:"Prüfung",5:"Erstattungen",6:"Wiedereinlagerung",7:"Analyse",8:"Richtlinien",9:"Anleitung"},
fr:{0:"Portail Retours",1:"Gestion des retours & remboursements",2:"Aperçu",3:"Demandes",4:"Inspection",5:"Remboursements",6:"Réapprovisionnement",7:"Analyse",8:"Politiques",9:"Guide"},
es:{0:"Portal de Devoluciones",1:"Gestión de devoluciones y reembolsos",2:"Resumen",3:"Solicitudes",4:"Inspección",5:"Reembolsos",6:"Reingreso",7:"Análisis",8:"Políticas",9:"Guía"},
pt:{0:"Portal de Devoluções",1:"Gestão de devoluções e reembolsos",2:"Visão Geral",3:"Solicitações",4:"Inspeção",5:"Reembolsos",6:"Reestoque",7:"Análise",8:"Políticas",9:"Guia"},
ru:{0:"Портал возвратов",1:"Управление возвратами и возвратами средств",2:"Обзор",3:"Заявки",4:"Проверка",5:"Возвраты",6:"Повторное хранение",7:"Аналитика",8:"Политики",9:"Руководство"},
ar:{0:"بوابة المرتجعات",1:"إدارة المرتجعات والمبالغ المستردة",2:"نظرة عامة",3:"الطلبات",4:"الفحص",5:"المبالغ المستردة",6:"إعادة التخزين",7:"التحليلات",8:"السياسات",9:"الدليل"},
hi:{0:"रिटर्न पोर्टल",1:"रिटर्न प्रबंधन और रिफंड प्रसंस्करण",2:"सारांश",3:"अनुरोध",4:"निरीक्षण",5:"रिफंड",6:"री-स्टॉक",7:"विश्लेषण",8:"नीतियाँ",9:"गाइड"},
th:{0:"พอร์ทัลคืนสินค้า",1:"ระบบจัดการการคืนสินค้าและการคืนเงิน",2:"ภาพรวม",3:"คำร้องขอ",4:"ตรวจสอบ",5:"การคืนเงิน",6:"รับคืนสต็อก",7:"การวิเคราะห์",8:"นโยบาย",9:"คู่มือ"},
vi:{0:"Cổng Hoàn Trả",1:"Quản lý hoàn trả & xử lý hoàn tiền",2:"Tổng quan",3:"Yêu cầu",4:"Kiểm tra",5:"Hoàn tiền",6:"Nhập kho lại",7:"Phân tích",8:"Chính sách",9:"Hướng dẫn"},
id:{0:"Portal Pengembalian",1:"Manajemen pengembalian & pengembalian dana",2:"Ringkasan",3:"Permintaan",4:"Inspeksi",5:"Pengembalian Dana",6:"Stok Ulang",7:"Analitik",8:"Kebijakan",9:"Panduan"},
};
Object.entries(SEC).forEach(([lang,patches])=>{
  V[lang]=[...V.en];
  // Pad guide steps if needed
  while(V[lang].length<K.length)V[lang].push(V.en[V[lang].length]||"");
  Object.entries(patches).forEach(([i,v])=>{V[lang][parseInt(i)]=v;});
});
// Ensure all arrays same length
const maxLen=K.length;
Object.keys(V).forEach(lang=>{while(V[lang].length<maxLen)V[lang].push(V.en[V[lang].length]||"");});

let out='const D={\n';
Object.entries(V).forEach(([lang,vals])=>{
  out+=JSON.stringify(lang)+':{';
  vals.forEach((v,i)=>{if(i<K.length){out+=JSON.stringify(K[i])+':'+JSON.stringify(v);if(i<K.length-1)out+=',';}});
  out+='},\n';
});
out+='};\nexport default D;\n';
fs.writeFileSync('src/pages/rpI18n.js',out);
console.log('rpI18n.js: '+Object.keys(V).length+' langs, '+K.length+' keys');
