// FINAL FIX: Restore backups, then properly inject supplyChain
const fs=require('fs');
const DIR='src/i18n/locales/';
const BDIR='src/i18n/locales_backup/';

// Step 1: Restore ALL available backups
['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es'].forEach(l=>{
  const bp=BDIR+l+'.js';
  if(fs.existsSync(bp)){
    fs.copyFileSync(bp,DIR+l+'.js');
  }
});

// Step 2: For pt/ru/ar/hi that have no backup, we need to reconstruct from en
// Actually these were originally created from en.js base, so just copy en for now
['pt','ru','ar','hi'].forEach(l=>{
  const p=DIR+l+'.js';
  // If damaged (less than 10KB), copy from en
  const s=fs.readFileSync(p,'utf8');
  // Check brace balance
  let o=0,c=0;
  for(let i=0;i<s.length;i++){if(s[i]==='{')o++;if(s[i]==='}')c++;}
  if(o!==c){
    console.log(l+': DAMAGED (braces '+o+'/'+c+'), copying from en.js');
    fs.copyFileSync(DIR+'en.js',p);
  }
});

// Step 3: Now inject supplyChain into ALL files
const SC_EN={
pageTitle:'Supply Chain Management',pageSub:'Supply chain optimization',
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
guideTitle:'Supply Chain Guide',guideSub:'Complete guide for supply chain management.',
guideStepsTitle:'Step-by-Step Guide',guideTipsTitle:'Expert Tips',guideTabsTitle:'Tab Reference',
guideBeginnerBadge:'Beginner',guideTimeBadge:'10 min',guideLangBadge:'15 Languages',
guideWhereToStart:'Where to start?',guideWhereToStartDesc:'Register suppliers then create supply lines.',
guideStep1Title:'Register Suppliers',guideStep1Desc:'Enter supplier details to register.',
guideStep2Title:'Create Supply Lines',guideStep2Desc:'Create and track supply lines.',
guideStep3Title:'Create Purchase Orders',guideStep3Desc:'Select supplier and enter details.',
guideStep4Title:'Monitor Inventory',guideStep4Desc:'Check inventory levels.',
guideStep5Title:'Lead Time Analysis',guideStep5Desc:'Analyze durations and delays.',
guideStep6Title:'Risk Detection',guideStep6Desc:'Set up alert rules.',
guideStep7Title:'Landed Cost',guideStep7Desc:'Calculate total costs.',
guideStep8Title:'Supplier Evaluation',guideStep8Desc:'Evaluate performance.',
guideStep9Title:'Real-time Sync',guideStep9Desc:'Changes sync automatically.',
guideStep10Title:'Dashboard Review',guideStep10Desc:'Check KPI cards.',
guideStep11Title:'Risk Response',guideStep11Desc:'Contact and adjust.',
guideStep12Title:'Cost Optimization',guideStep12Desc:'Optimize logistics.',
guideStep13Title:'Data Query',guideStep13Desc:'Filter by period.',
guideStep14Title:'Security',guideStep14Desc:'Auto-blocks threats.',
guideStep15Title:'Routine Check',guideStep15Desc:'Weekly review.',
guideTip1:'Secure alternatives if reliability below 85%.',
guideTip2:'Increase safety stock for long lead times.',
guideTip3:'Include all costs in analysis.',
guideTip4:'Diversify with 3+ high-risk lines.',
guideTip5:'Target 95%+ on-time rate.',
guideTabTimelineDesc:'Track stages.',guideTabSuppliersDesc:'Manage suppliers.',guideTabInventoryDesc:'Monitor inventory.',guideTabPODesc:'Manage POs.',guideTabLeadTimeDesc:'Analyze lead times.',guideTabRiskDesc:'Manage risks.',guideTabLandedCostDesc:'Calculate costs.',guideTabGuideDesc:'Guide and tips.',
guideReadyTitle:'Ready!',guideReadyDesc:'Register your first supplier.',
guideFaqTitle:'FAQ',guideFaq1Q:'No data',guideFaq1A:'Register suppliers first.',guideFaq2Q:'Risk not working',guideFaq2A:'Set risk to high.',guideFaq3Q:'Change PO status?',guideFaq3A:'Auto-set to Draft.',guideFaq4Q:'Result is 0',guideFaq4A:'Enter amounts first.',guideFaq5Q:'Sync issue',guideFaq5A:'Refresh page.',
periodLabel:'Period',periodFrom:'From',periodTo:'To'
};

const SC_KO=fs.existsSync('sc_i18n_ko.json')?JSON.parse(fs.readFileSync('sc_i18n_ko.json','utf8')):null;

const ALL=['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es','pt','ru','ar','hi'];

ALL.forEach(lang=>{
  const p=DIR+lang+'.js';
  let src=fs.readFileSync(p,'utf8');
  
  // Remove existing supplyChain block using balanced brace matching
  let idx=src.indexOf('supplyChain');
  while(idx!==-1){
    const braceStart=src.indexOf('{',idx);
    if(braceStart===-1)break;
    let depth=1,i=braceStart+1;
    while(i<src.length&&depth>0){
      const ch=src[i];
      // Skip strings
      if(ch==='"'||ch==="'"){
        const q=ch;i++;
        while(i<src.length&&src[i]!==q){if(src[i]==='\\')i++;i++;}
      }
      if(src[i]==='{')depth++;
      if(src[i]==='}')depth--;
      i++;
    }
    // Remove: find comma before
    let start=idx;
    let j=start-1;
    while(j>=0&&' \n\r\t'.includes(src[j]))j--;
    if(j>=0&&src[j]===',')start=j;
    src=src.substring(0,start)+src.substring(i);
    idx=src.indexOf('supplyChain');
  }
  
  // Build supplyChain JSON string
  const keys=lang==='ko'&&SC_KO?SC_KO:SC_EN;
  const scJson=JSON.stringify(keys);
  const scBlock=',supplyChain:'+scJson;
  
  // Find last } of export default
  const lastBrace=src.lastIndexOf('}');
  src=src.substring(0,lastBrace)+scBlock+src.substring(lastBrace);
  
  fs.writeFileSync(p,src,'utf8');
  
  // Verify brace balance
  let o=0,c=0;
  for(let k=0;k<src.length;k++){
    const ch=src[k];
    if(ch==='"'||ch==="'"){const q=ch;k++;while(k<src.length&&src[k]!==q){if(src[k]==='\\')k++;k++;}}
    if(src[k]==='{')o++;
    if(src[k]==='}')c++;
  }
  const ok=o===c;
  console.log(lang+': braces='+o+'/'+c+' '+(ok?'✓':'✗ MISMATCH'));
});
