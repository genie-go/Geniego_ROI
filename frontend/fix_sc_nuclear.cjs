// Robust dedup: remove ALL supplyChain blocks, then add one clean one at the end
const fs=require('fs');
const DIR='src/i18n/locales/';
const BDIR='src/i18n/locales_backup/';

// Step 1: Restore all from backup
['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es'].forEach(l=>{
  fs.copyFileSync(BDIR+l+'.js',DIR+l+'.js');
});
// pt/ru/ar/hi from en backup
['pt','ru','ar','hi'].forEach(l=>{
  fs.copyFileSync(BDIR+'en.js',DIR+l+'.js');
});
console.log('All restored from backup');

// Step 2: For each file, remove ALL supplyChain blocks
const ALL=['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es','pt','ru','ar','hi'];

function removeAllSC(src){
  while(true){
    // Find "supplyChain" or supplyChain (with or without quotes)
    let idx=src.indexOf('supplyChain');
    if(idx===-1)break;
    
    // Go back to find the comma or key-start
    let start=idx;
    let j=start-1;
    while(j>=0 && (src[j]===' '||src[j]==='\n'||src[j]==='\r'||src[j]==='\t'))j--;
    if(j>=0 && src[j]==='"')start=j; // remove the opening quote
    if(j>=0 && src[j]===','){
      start=j; // remove preceding comma
      // check if there's a quote before comma
    }
    // Also handle ,"supplyChain"
    let k=start-1;
    while(k>=0 && (src[k]===' '||src[k]==='\n'))k--;
    if(k>=0 && src[k]===',')start=k;
    
    // Find the matching closing brace
    let braceStart=src.indexOf('{',idx);
    if(braceStart===-1){
      // No brace, just remove the key
      src=src.substring(0,start)+src.substring(idx+11);
      continue;
    }
    let depth=1,i=braceStart+1,inStr=false,strCh='';
    while(i<src.length && depth>0){
      let c=src[i];
      if(inStr){
        if(c==='\\'){i+=2;continue;}
        if(c===strCh)inStr=false;
        i++;continue;
      }
      if(c==='"'||c==="'"){inStr=true;strCh=c;i++;continue;}
      if(c==='{')depth++;
      if(c==='}')depth--;
      i++;
    }
    
    src=src.substring(0,start)+src.substring(i);
  }
  // Clean double commas and trailing commas before }
  src=src.replace(/,,+/g,',');
  src=src.replace(/,\s*}/g,'}');
  src=src.replace(/{\s*,/g,'{');
  return src;
}

// English SC keys
const SC={
pageTitle:'Supply Chain Management',pageSub:'Supply chain optimization and monitoring',
tabTimeline:'Supply Timeline',tabSuppliers:'Supplier Management',tabInventory:'Inventory',tabPO:'Purchase Orders',tabLeadTime:'Lead Time Analysis',tabRisk:'Risk Detection',tabLandedCost:'Landed Cost',tabGuide:'Usage Guide',
loading:'Loading...',noData:'No data available.',
kpiLines:'Supply Lines',kpiSuppliers:'Suppliers',kpiHighRisk:'High Risk',kpiAvgLead:'Avg Lead Time',kpiTotalCost:'Total Cost',kpiOnTime:'On-Time Rate',
productName:'Product',supplier:'Supplier',labelSku:'SKU',leadTime:'Lead Time',days:'days',country:'Country',category:'Category',delayRate:'Delay Rate',contact:'Contact',reliability:'Reliability',orderCount:'Orders',
addLine:'Add Line',addSupplier:'Add Supplier',register:'Register',cancel:'Cancel',confirmDelete:'Delete?',
normal:'Normal',highRisk:'High Risk',supplyRisk:'Supply Risk',contactSupplier:'Contact Supplier',altSupplierSearch:'Alt Supplier',slackNotify:'Slack Notify',autoRiskRules:'Auto Risk Rules',addRule:'Add Rule',ruleName:'Rule',ruleAction:'Action',noRisk:'No risks detected.',
invTotal:'Total Inventory',invTransit:'In Transit',invWarehouse:'Warehouse',invSupplier:'At Supplier',invQty:'Qty',invStatus:'Status',invLocation:'Location',invUpdated:'Updated',
tabPOTitle:'Purchase Orders',poCreate:'Create PO',poSelectSupplier:'Select Supplier',poUnitCost:'Unit Cost',poTotalCost:'Total',poNotes:'Notes',poDate:'Date',
poStatusDraft:'Draft',poStatusPending:'Pending',poStatusApproved:'Approved',poStatusShipped:'Shipped',poStatusReceived:'Received',poStatusCancelled:'Cancelled',
lcProductCost:'Product Cost',lcShipping:'Shipping',lcCustoms:'Customs',lcInsurance:'Insurance',lcHandling:'Handling',lcOther:'Other',lcCalculate:'Calculate',lcResult:'Result',lcDesc:'Calculate total landed cost.',
securityAlert:'Security Threat',securityDesc:'Malicious input blocked.',securityDismiss:'Dismiss',totalPO:'Total PO',
guideTitle:'Supply Chain Guide',guideSub:'Complete guide for supply chain.',
guideStepsTitle:'Step-by-Step',guideTipsTitle:'Expert Tips',guideTabsTitle:'Tab Reference',
guideBeginnerBadge:'Beginner',guideTimeBadge:'10 min',guideLangBadge:'15 Languages',
guideWhereToStart:'Where to start?',guideWhereToStartDesc:'Register suppliers, create supply lines.',
guideStep1Title:'Register Suppliers',guideStep1Desc:'Enter supplier details.',
guideStep2Title:'Create Supply Lines',guideStep2Desc:'Track supply lines.',
guideStep3Title:'Create POs',guideStep3Desc:'Enter product details.',
guideStep4Title:'Monitor Inventory',guideStep4Desc:'Check inventory.',
guideStep5Title:'Lead Time Analysis',guideStep5Desc:'Analyze delays.',
guideStep6Title:'Risk Detection',guideStep6Desc:'Set alert rules.',
guideStep7Title:'Landed Cost',guideStep7Desc:'Calculate costs.',
guideStep8Title:'Supplier Evaluation',guideStep8Desc:'Evaluate performance.',
guideStep9Title:'Real-time Sync',guideStep9Desc:'Auto sync.',
guideStep10Title:'Dashboard',guideStep10Desc:'Check KPIs.',
guideStep11Title:'Risk Response',guideStep11Desc:'Contact and adjust.',
guideStep12Title:'Cost Optimization',guideStep12Desc:'Optimize logistics.',
guideStep13Title:'Data Query',guideStep13Desc:'Filter by period.',
guideStep14Title:'Security',guideStep14Desc:'Auto-blocks threats.',
guideStep15Title:'Routine',guideStep15Desc:'Weekly review.',
guideTip1:'Secure alternatives below 85% reliability.',guideTip2:'More safety stock for long lead times.',guideTip3:'Include all costs.',guideTip4:'Diversify with 3+ risks.',guideTip5:'Target 95%+ on-time.',
guideTabTimelineDesc:'Track stages.',guideTabSuppliersDesc:'Manage suppliers.',guideTabInventoryDesc:'Monitor inventory.',guideTabPODesc:'Manage POs.',guideTabLeadTimeDesc:'Lead times.',guideTabRiskDesc:'Manage risks.',guideTabLandedCostDesc:'Calculate costs.',guideTabGuideDesc:'Guide and tips.',
guideReadyTitle:'Ready!',guideReadyDesc:'Register your first supplier.',guideFaqTitle:'FAQ',
guideFaq1Q:'No data',guideFaq1A:'Register suppliers first.',guideFaq2Q:'Risk not working',guideFaq2A:'Set risk to high.',guideFaq3Q:'PO status?',guideFaq3A:'Auto Draft.',guideFaq4Q:'Result 0',guideFaq4A:'Enter amounts.',guideFaq5Q:'No sync',guideFaq5A:'Refresh.',
periodLabel:'Period',periodFrom:'From',periodTo:'To'
};

const KO_SC={
pageTitle:'공급망 관리',pageSub:'공급망 네트워크 최적화 및 실시간 모니터링',
tabTimeline:'공급 타임라인',tabSuppliers:'공급업체 관리',tabInventory:'재고 현황',tabPO:'발주 관리',tabLeadTime:'리드타임 분석',tabRisk:'리스크 감지',tabLandedCost:'원가 분석',tabGuide:'이용 가이드',
loading:'로딩 중...',noData:'데이터가 없습니다.',
kpiLines:'공급라인',kpiSuppliers:'공급업체',kpiHighRisk:'고위험',kpiAvgLead:'평균 리드타임',kpiTotalCost:'총 비용',kpiOnTime:'정시 납품률',
productName:'제품명',supplier:'공급업체',labelSku:'SKU',leadTime:'리드타임',days:'일',country:'국가',category:'카테고리',delayRate:'지연율',contact:'연락처',reliability:'신뢰도',orderCount:'주문수',
addLine:'라인 추가',addSupplier:'공급업체 추가',register:'등록',cancel:'취소',confirmDelete:'삭제하시겠습니까?',
normal:'정상',highRisk:'고위험',supplyRisk:'공급 리스크',contactSupplier:'공급업체 연락',altSupplierSearch:'대체 공급업체 검색',slackNotify:'Slack 알림',autoRiskRules:'자동 리스크 규칙',addRule:'규칙 추가',ruleName:'규칙명',ruleAction:'조치',noRisk:'감지된 리스크 없음',
invTotal:'전체 재고',invTransit:'운송 중',invWarehouse:'창고',invSupplier:'공급업체',invQty:'수량',invStatus:'상태',invLocation:'위치',invUpdated:'업데이트',
tabPOTitle:'발주 관리',poCreate:'발주 생성',poSelectSupplier:'공급업체 선택',poUnitCost:'단가',poTotalCost:'총액',poNotes:'비고',poDate:'날짜',
poStatusDraft:'초안',poStatusPending:'승인 대기',poStatusApproved:'승인됨',poStatusShipped:'배송됨',poStatusReceived:'수령됨',poStatusCancelled:'취소됨',
lcProductCost:'제품 원가',lcShipping:'운송비',lcCustoms:'관세',lcInsurance:'보험료',lcHandling:'취급비',lcOther:'기타',lcCalculate:'계산하기',lcResult:'분석 결과',lcDesc:'수입 제품의 총 착지 원가를 계산합니다.',
securityAlert:'보안 위협 감지',securityDesc:'악의적 입력이 차단되었습니다.',securityDismiss:'확인 후 차단',totalPO:'총 발주액',
guideTitle:'공급망 관리 가이드',guideSub:'이 가이드를 따라하면 초보자도 공급망 관리 시스템을 완벽하게 활용할 수 있습니다.',
guideStepsTitle:'단계별 상세 가이드',guideTipsTitle:'전문가 팁',guideTabsTitle:'탭별 기능 안내',
guideBeginnerBadge:'초보자 가이드',guideTimeBadge:'10분',guideLangBadge:'15개 언어',
guideWhereToStart:'어디서 시작하나요?',guideWhereToStartDesc:'공급업체 관리 탭에서 거래처를 등록한 후, 공급 타임라인에서 공급 라인을 생성하세요.',
guideStep1Title:'공급업체 등록',guideStep1Desc:'공급업체 관리 탭에서 거래처 정보를 입력하여 등록합니다.',
guideStep2Title:'공급 라인 생성',guideStep2Desc:'공급 타임라인 탭에서 제품별 공급 라인을 생성합니다.',
guideStep3Title:'발주서 작성',guideStep3Desc:'발주 관리 탭에서 공급업체를 선택하고 발주서를 작성합니다.',
guideStep4Title:'재고 모니터링',guideStep4Desc:'재고 현황 탭에서 재고 수량을 실시간으로 확인합니다.',
guideStep5Title:'리드타임 분석',guideStep5Desc:'리드타임 분석 탭에서 지연율을 분석합니다.',
guideStep6Title:'리스크 감지 설정',guideStep6Desc:'리스크 감지 탭에서 자동 알림 규칙을 설정합니다.',
guideStep7Title:'원가 분석',guideStep7Desc:'원가 분석 탭에서 총 착지 원가를 계산합니다.',
guideStep8Title:'공급업체 평가',guideStep8Desc:'신뢰도와 지연율 기반으로 공급업체를 평가합니다.',
guideStep9Title:'실시간 동기화',guideStep9Desc:'모든 변경사항이 실시간 동기화됩니다.',
guideStep10Title:'대시보드 확인',guideStep10Desc:'KPI 카드를 정기적으로 확인합니다.',
guideStep11Title:'리스크 대응',guideStep11Desc:'공급업체 연락, 대체 검색, 알림 전송, 발주 조정.',
guideStep12Title:'원가 최적화',guideStep12Desc:'물류 경로 및 통관 전략을 최적화합니다.',
guideStep13Title:'기간별 데이터 조회',guideStep13Desc:'기간 선택으로 데이터를 필터링합니다.',
guideStep14Title:'보안 관리',guideStep14Desc:'시스템이 보안 위협을 자동으로 차단합니다.',
guideStep15Title:'최종 점검',guideStep15Desc:'매주 KPI 확인 및 리스크 리뷰.',
guideTip1:'신뢰도 85% 미만 시 대체 공급업체를 확보하세요.',guideTip2:'리드타임 14일 이상이면 안전재고를 늘리세요.',guideTip3:'원가 분석 시 관세와 보험료를 포함하세요.',guideTip4:'고위험 라인 3개 이상이면 다각화를 검토하세요.',guideTip5:'정시 납품률 95% 이상을 목표로 관리하세요.',
guideTabTimelineDesc:'공급 라인별 단계 추적.',guideTabSuppliersDesc:'공급업체 관리.',guideTabInventoryDesc:'재고 모니터링.',guideTabPODesc:'발주 관리.',guideTabLeadTimeDesc:'리드타임 분석.',guideTabRiskDesc:'리스크 관리.',guideTabLandedCostDesc:'원가 계산.',guideTabGuideDesc:'가이드 및 팁.',
guideReadyTitle:'준비 완료!',guideReadyDesc:'공급업체 관리 탭에서 첫 공급업체를 등록하세요.',guideFaqTitle:'자주 묻는 질문',
guideFaq1Q:'데이터가 표시되지 않습니다',guideFaq1A:'먼저 공급업체를 등록하세요.',guideFaq2Q:'리스크 감지가 작동하지 않습니다',guideFaq2A:'리스크가 high로 설정된 경우만 표시됩니다.',guideFaq3Q:'발주서 상태를 변경하려면?',guideFaq3A:'생성 시 자동으로 초안 상태입니다.',guideFaq4Q:'원가 분석 결과가 0입니다',guideFaq4A:'금액을 입력 후 계산하기를 클릭하세요.',guideFaq5Q:'동기화가 안됩니다',guideFaq5A:'페이지를 새로고침하세요.',
periodLabel:'기간',periodFrom:'시작일',periodTo:'종료일'
};

ALL.forEach(lang=>{
  let src=fs.readFileSync(DIR+lang+'.js','utf8');
  src=removeAllSC(src);
  
  // Build SC JSON
  const keys=lang==='ko'?KO_SC:SC;
  const scStr=JSON.stringify(keys);
  
  // Find last }
  const lastBrace=src.lastIndexOf('}');
  const before=src.substring(0,lastBrace);
  const trimmed=before.trimEnd();
  const comma=trimmed.endsWith(',')||trimmed.endsWith('{')?'':',';
  src=trimmed+comma+'"supplyChain":'+scStr+'};\n';
  
  fs.writeFileSync(DIR+lang+'.js',src);
  
  // Count
  let cnt=0,p=0;
  while((p=src.indexOf('supplyChain',p))!==-1){cnt++;p++;}
  console.log(lang+': '+cnt+' block, len='+src.length);
});
