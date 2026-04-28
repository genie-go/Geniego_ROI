// Clean restore from clean_src + remove all supplyChain + re-inject one clean block
const fs=require('fs');
const CLEAN='d:/project/GeniegoROI/clean_src/frontend/src/i18n/locales/';
const DIR='src/i18n/locales/';
const AVAIL=['ko','en','ja','zh','zh-TW','th','vi','id','de'];
const MISSING=['fr','es','pt','ru','ar','hi'];
const ALL=[...AVAIL,...MISSING];

// Step 1: Restore
AVAIL.forEach(l=>fs.copyFileSync(CLEAN+l+'.js',DIR+l+'.js'));
MISSING.forEach(l=>fs.copyFileSync(CLEAN+'en.js',DIR+l+'.js'));
console.log('Restored all from clean_src');

// Step 2: Remove ALL supplyChain blocks
function removeSC(src){
  let safety=0;
  while(safety++<20){
    const idx=src.indexOf('supplyChain');
    if(idx===-1)break;
    // Find preceding comma/quote
    let start=idx;
    let j=start-1;
    while(j>=0 && ' \t\n\r'.includes(src[j]))j--;
    // Handle "supplyChain" pattern
    if(j>=0 && src[j]==='"'){
      start=j;
      j=start-1;
      while(j>=0 && ' \t\n\r'.includes(src[j]))j--;
    }
    if(j>=0 && src[j]===':'){
      // This is a value, not a key - skip differently
    }
    if(j>=0 && src[j]===',')start=j;
    
    // Find matching closing brace
    const bs=src.indexOf('{',idx);
    if(bs===-1){src=src.substring(0,start)+src.substring(idx+11);continue;}
    let depth=1,i=bs+1,inStr=false,strCh='';
    while(i<src.length && depth>0){
      const c=src[i];
      if(inStr){if(c==='\\'){i+=2;continue;}if(c===strCh)inStr=false;i++;continue;}
      if(c==='"'||c==="'"){inStr=true;strCh=c;i++;continue;}
      if(c==='{')depth++;
      if(c==='}')depth--;
      i++;
    }
    src=src.substring(0,start)+src.substring(i);
  }
  return src.replace(/,,+/g,',').replace(/,\s*\}/g,'}').replace(/\{\s*,/g,'{');
}

// English SC keys
const SC_EN={"pageTitle":"Supply Chain Management","pageSub":"Supply chain optimization and monitoring","tabTimeline":"Supply Timeline","tabSuppliers":"Supplier Management","tabInventory":"Inventory","tabPO":"Purchase Orders","tabLeadTime":"Lead Time Analysis","tabRisk":"Risk Detection","tabLandedCost":"Landed Cost","tabGuide":"Usage Guide","loading":"Loading...","noData":"No data available.","kpiLines":"Supply Lines","kpiSuppliers":"Suppliers","kpiHighRisk":"High Risk","kpiAvgLead":"Avg Lead Time","kpiTotalCost":"Total Cost","kpiOnTime":"On-Time Rate","productName":"Product","supplier":"Supplier","labelSku":"SKU","leadTime":"Lead Time","days":"days","country":"Country","category":"Category","delayRate":"Delay Rate","contact":"Contact","reliability":"Reliability","orderCount":"Orders","addLine":"Add Line","addSupplier":"Add Supplier","register":"Register","cancel":"Cancel","confirmDelete":"Delete?","normal":"Normal","highRisk":"High Risk","supplyRisk":"Supply Risk","contactSupplier":"Contact Supplier","altSupplierSearch":"Alt Supplier","slackNotify":"Slack Notify","autoRiskRules":"Auto Risk Rules","addRule":"Add Rule","ruleName":"Rule","ruleAction":"Action","noRisk":"No risks detected.","invTotal":"Total Inventory","invTransit":"In Transit","invWarehouse":"Warehouse","invSupplier":"At Supplier","invQty":"Qty","invStatus":"Status","invLocation":"Location","invUpdated":"Updated","tabPOTitle":"Purchase Orders","poCreate":"Create PO","poSelectSupplier":"Select Supplier","poUnitCost":"Unit Cost","poTotalCost":"Total","poNotes":"Notes","poDate":"Date","poStatusDraft":"Draft","poStatusPending":"Pending","poStatusApproved":"Approved","poStatusShipped":"Shipped","poStatusReceived":"Received","poStatusCancelled":"Cancelled","lcProductCost":"Product Cost","lcShipping":"Shipping","lcCustoms":"Customs","lcInsurance":"Insurance","lcHandling":"Handling","lcOther":"Other","lcCalculate":"Calculate","lcResult":"Result","lcDesc":"Calculate total landed cost.","securityAlert":"Security Threat","securityDesc":"Blocked.","securityDismiss":"Dismiss","totalPO":"Total PO","guideTitle":"Supply Chain Guide","guideSub":"Complete guide for supply chain.","guideStepsTitle":"Step-by-Step","guideTipsTitle":"Expert Tips","guideTabsTitle":"Tab Reference","guideBeginnerBadge":"Beginner","guideTimeBadge":"10 min","guideLangBadge":"15 Languages","guideWhereToStart":"Where to start?","guideWhereToStartDesc":"Register suppliers, create supply lines.","guideStep1Title":"Register Suppliers","guideStep1Desc":"Enter supplier details.","guideStep2Title":"Create Supply Lines","guideStep2Desc":"Track supply lines.","guideStep3Title":"Create POs","guideStep3Desc":"Enter product details.","guideStep4Title":"Monitor Inventory","guideStep4Desc":"Check inventory.","guideStep5Title":"Lead Time Analysis","guideStep5Desc":"Analyze delays.","guideStep6Title":"Risk Detection","guideStep6Desc":"Set alert rules.","guideStep7Title":"Landed Cost","guideStep7Desc":"Calculate costs.","guideStep8Title":"Supplier Evaluation","guideStep8Desc":"Evaluate performance.","guideStep9Title":"Real-time Sync","guideStep9Desc":"Auto sync.","guideStep10Title":"Dashboard","guideStep10Desc":"Check KPIs.","guideStep11Title":"Risk Response","guideStep11Desc":"Contact and adjust.","guideStep12Title":"Cost Optimization","guideStep12Desc":"Optimize logistics.","guideStep13Title":"Data Query","guideStep13Desc":"Filter by period.","guideStep14Title":"Security","guideStep14Desc":"Auto-blocks threats.","guideStep15Title":"Routine","guideStep15Desc":"Weekly review.","guideTip1":"Alternatives below 85%.","guideTip2":"Safety stock for long leads.","guideTip3":"Include all costs.","guideTip4":"Diversify 3+ risks.","guideTip5":"95%+ on-time.","guideTabTimelineDesc":"Track stages.","guideTabSuppliersDesc":"Manage suppliers.","guideTabInventoryDesc":"Monitor inventory.","guideTabPODesc":"Manage POs.","guideTabLeadTimeDesc":"Lead times.","guideTabRiskDesc":"Risks.","guideTabLandedCostDesc":"Costs.","guideTabGuideDesc":"Guide.","guideReadyTitle":"Ready!","guideReadyDesc":"Register first supplier.","guideFaqTitle":"FAQ","guideFaq1Q":"No data","guideFaq1A":"Register suppliers.","guideFaq2Q":"Risk not working","guideFaq2A":"Set to high.","guideFaq3Q":"PO status?","guideFaq3A":"Auto Draft.","guideFaq4Q":"Result 0","guideFaq4A":"Enter amounts.","guideFaq5Q":"No sync","guideFaq5A":"Refresh.","periodLabel":"Period","periodFrom":"From","periodTo":"To"};

const SC_KO={"pageTitle":"공급망 관리","pageSub":"공급망 네트워크 최적화 및 실시간 모니터링","tabTimeline":"공급 타임라인","tabSuppliers":"공급업체 관리","tabInventory":"재고 현황","tabPO":"발주 관리","tabLeadTime":"리드타임 분석","tabRisk":"리스크 감지","tabLandedCost":"원가 분석","tabGuide":"이용 가이드","loading":"로딩 중...","noData":"데이터가 없습니다.","kpiLines":"공급라인","kpiSuppliers":"공급업체","kpiHighRisk":"고위험","kpiAvgLead":"평균 리드타임","kpiTotalCost":"총 비용","kpiOnTime":"정시 납품률","productName":"제품명","supplier":"공급업체","labelSku":"SKU","leadTime":"리드타임","days":"일","country":"국가","category":"카테고리","delayRate":"지연율","contact":"연락처","reliability":"신뢰도","orderCount":"주문수","addLine":"라인 추가","addSupplier":"공급업체 추가","register":"등록","cancel":"취소","confirmDelete":"삭제?","normal":"정상","highRisk":"고위험","supplyRisk":"공급 리스크","contactSupplier":"공급업체 연락","altSupplierSearch":"대체 공급업체","slackNotify":"Slack 알림","autoRiskRules":"자동 리스크 규칙","addRule":"규칙 추가","ruleName":"규칙명","ruleAction":"조치","noRisk":"리스크 없음","invTotal":"전체 재고","invTransit":"운송 중","invWarehouse":"창고","invSupplier":"공급업체","invQty":"수량","invStatus":"상태","invLocation":"위치","invUpdated":"업데이트","tabPOTitle":"발주 관리","poCreate":"발주 생성","poSelectSupplier":"공급업체 선택","poUnitCost":"단가","poTotalCost":"총액","poNotes":"비고","poDate":"날짜","poStatusDraft":"초안","poStatusPending":"승인 대기","poStatusApproved":"승인됨","poStatusShipped":"배송됨","poStatusReceived":"수령됨","poStatusCancelled":"취소됨","lcProductCost":"제품 원가","lcShipping":"운송비","lcCustoms":"관세","lcInsurance":"보험료","lcHandling":"취급비","lcOther":"기타","lcCalculate":"계산하기","lcResult":"분석 결과","lcDesc":"총 착지 원가를 계산합니다.","securityAlert":"보안 위협","securityDesc":"차단됨","securityDismiss":"확인","totalPO":"총 발주액","guideTitle":"공급망 관리 가이드","guideSub":"공급망 관리 시스템 완벽 가이드.","guideStepsTitle":"단계별 가이드","guideTipsTitle":"전문가 팁","guideTabsTitle":"탭별 기능","guideBeginnerBadge":"초보자","guideTimeBadge":"10분","guideLangBadge":"15개 언어","guideWhereToStart":"어디서 시작?","guideWhereToStartDesc":"공급업체 등록 후 공급 라인 생성.","guideStep1Title":"공급업체 등록","guideStep1Desc":"거래처 정보 입력.","guideStep2Title":"공급 라인 생성","guideStep2Desc":"제품별 공급 라인 생성.","guideStep3Title":"발주서 작성","guideStep3Desc":"공급업체 선택 후 발주.","guideStep4Title":"재고 모니터링","guideStep4Desc":"재고 확인.","guideStep5Title":"리드타임 분석","guideStep5Desc":"지연율 분석.","guideStep6Title":"리스크 감지","guideStep6Desc":"알림 규칙 설정.","guideStep7Title":"원가 분석","guideStep7Desc":"착지 원가 계산.","guideStep8Title":"공급업체 평가","guideStep8Desc":"성과 평가.","guideStep9Title":"실시간 동기화","guideStep9Desc":"자동 동기화.","guideStep10Title":"대시보드","guideStep10Desc":"KPI 확인.","guideStep11Title":"리스크 대응","guideStep11Desc":"연락 및 조정.","guideStep12Title":"원가 최적화","guideStep12Desc":"물류 최적화.","guideStep13Title":"데이터 조회","guideStep13Desc":"기간별 필터링.","guideStep14Title":"보안 관리","guideStep14Desc":"자동 차단.","guideStep15Title":"정기 점검","guideStep15Desc":"주간 리뷰.","guideTip1":"85% 미만 시 대체 확보.","guideTip2":"긴 리드타임은 안전재고.","guideTip3":"모든 비용 포함.","guideTip4":"3개 이상 다각화.","guideTip5":"95% 이상 목표.","guideTabTimelineDesc":"단계 추적.","guideTabSuppliersDesc":"공급업체 관리.","guideTabInventoryDesc":"재고 모니터링.","guideTabPODesc":"발주 관리.","guideTabLeadTimeDesc":"리드타임.","guideTabRiskDesc":"리스크.","guideTabLandedCostDesc":"원가.","guideTabGuideDesc":"가이드.","guideReadyTitle":"준비 완료!","guideReadyDesc":"첫 공급업체를 등록하세요.","guideFaqTitle":"FAQ","guideFaq1Q":"데이터 없음","guideFaq1A":"공급업체 등록.","guideFaq2Q":"리스크 미작동","guideFaq2A":"high 설정.","guideFaq3Q":"발주 상태?","guideFaq3A":"자동 초안.","guideFaq4Q":"결과 0","guideFaq4A":"금액 입력.","guideFaq5Q":"동기화 안됨","guideFaq5A":"새로고침.","periodLabel":"기간","periodFrom":"시작일","periodTo":"종료일"};

ALL.forEach(lang=>{
  let src=fs.readFileSync(DIR+lang+'.js','utf8');
  src=removeSC(src);
  
  const keys=lang==='ko'?SC_KO:SC_EN;
  const scStr=JSON.stringify(keys);
  
  // Find last } of export default
  const lastBrace=src.lastIndexOf('}');
  const before=src.substring(0,lastBrace).trimEnd();
  const comma=before.endsWith(',') || before.endsWith('{') ? '' : ',';
  src=before+comma+'"supplyChain":'+scStr+src.substring(lastBrace);
  
  fs.writeFileSync(DIR+lang+'.js',src);
  let cnt=0,p=0;while((p=src.indexOf('supplyChain',p))!==-1){cnt++;p++;}
  console.log(lang+': sc='+cnt+' len='+src.length);
});
