// Fix minified locale files: properly handle supplyChain injection
const fs=require('fs');
const DIR='src/i18n/locales/';
const BDIR='src/i18n/locales_backup/';

// Step 1: Restore from backup first
const backupLangs=['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es'];
backupLangs.forEach(l=>{
  const bp=BDIR+l+'.js';
  if(fs.existsSync(bp)){
    fs.copyFileSync(bp,DIR+l+'.js');
    console.log('Restored:',l);
  }
});

// Step 2: For ALL languages, inject supplyChain using eval-safe method
const EN_KEYS={
pageTitle:'Supply Chain Management',pageSub:'Supply chain & logistics optimization',
tabTimeline:'Supply Timeline',tabSuppliers:'Supplier Management',tabInventory:'Inventory',tabPO:'Purchase Orders',tabLeadTime:'Lead Time Analysis',tabRisk:'Risk Detection',tabLandedCost:'Landed Cost',tabGuide:'Usage Guide',
loading:'Loading...',noData:'No data available.',
kpiLines:'Supply Lines',kpiSuppliers:'Suppliers',kpiHighRisk:'High Risk',kpiAvgLead:'Avg Lead Time',kpiTotalCost:'Total Cost',kpiOnTime:'On-Time Rate',
productName:'Product',supplier:'Supplier',labelSku:'SKU',leadTime:'Lead Time',days:'days',country:'Country',category:'Category',delayRate:'Delay Rate',contact:'Contact',reliability:'Reliability',orderCount:'Orders',
addLine:'Add Line',addSupplier:'Add Supplier',register:'Register',cancel:'Cancel',confirmDelete:'Delete?',
normal:'Normal',highRisk:'High Risk',supplyRisk:'Supply Risk',contactSupplier:'Contact Supplier',altSupplierSearch:'Alt Supplier',slackNotify:'Slack Notify',autoRiskRules:'Auto Risk Rules',addRule:'Add Rule',ruleName:'Rule',ruleAction:'Action',noRisk:'No risks detected.',
invTotal:'Total Inventory',invTransit:'In Transit',invWarehouse:'Warehouse',invSupplier:'Supplier',invQty:'Qty',invStatus:'Status',invLocation:'Location',invUpdated:'Updated',
tabPOTitle:'Purchase Orders',poCreate:'Create PO',poSelectSupplier:'Select Supplier',poUnitCost:'Unit Cost',poTotalCost:'Total',poNotes:'Notes',poDate:'Date',
poStatusDraft:'Draft',poStatusPending:'Pending',poStatusApproved:'Approved',poStatusShipped:'Shipped',poStatusReceived:'Received',poStatusCancelled:'Cancelled',
lcProductCost:'Product Cost',lcShipping:'Shipping',lcCustoms:'Customs',lcInsurance:'Insurance',lcHandling:'Handling',lcOther:'Other',lcCalculate:'Calculate',lcResult:'Result',lcDesc:'Calculate total landed cost.',
securityAlert:'Security Threat',securityDesc:'Malicious input blocked.',securityDismiss:'Dismiss',totalPO:'Total PO',
guideTitle:'Supply Chain Guide',guideSub:'Complete guide for supply chain management.',
guideStepsTitle:'Step-by-Step Guide',guideTipsTitle:'Expert Tips',guideTabsTitle:'Tab Reference',
guideBeginnerBadge:'Beginner',guideTimeBadge:'10 min',guideLangBadge:'12 Languages',
guideWhereToStart:'Where to start?',guideWhereToStartDesc:'Register suppliers, create supply lines, then manage orders.',
guideStep1Title:'Register Suppliers',guideStep1Desc:'Enter supplier details to register.',
guideStep2Title:'Create Supply Lines',guideStep2Desc:'Create and track product supply lines.',
guideStep3Title:'Create Purchase Orders',guideStep3Desc:'Select supplier, enter product details.',
guideStep4Title:'Monitor Inventory',guideStep4Desc:'Check inventory levels in real-time.',
guideStep5Title:'Lead Time Analysis',guideStep5Desc:'Analyze duration and delay rates.',
guideStep6Title:'Risk Detection',guideStep6Desc:'Review risks and set alert rules.',
guideStep7Title:'Landed Cost',guideStep7Desc:'Calculate total landed cost.',
guideStep8Title:'Supplier Evaluation',guideStep8Desc:'Evaluate supplier performance.',
guideStep9Title:'Real-time Sync',guideStep9Desc:'Changes sync automatically.',
guideStep10Title:'Dashboard Review',guideStep10Desc:'Check KPI cards regularly.',
guideStep11Title:'Risk Response',guideStep11Desc:'Contact, search alternatives, alert, adjust.',
guideStep12Title:'Cost Optimization',guideStep12Desc:'Optimize logistics and customs.',
guideStep13Title:'Data Query',guideStep13Desc:'Filter and analyze by period.',
guideStep14Title:'Security',guideStep14Desc:'Auto-blocks security threats.',
guideStep15Title:'Routine Check',guideStep15Desc:'Weekly KPI and risk review.',
guideTip1:'Secure alternatives if reliability below 85%.',
guideTip2:'Increase safety stock for 14+ day lead times.',
guideTip3:'Include customs and insurance in cost analysis.',
guideTip4:'Review diversification with 3+ high-risk lines.',
guideTip5:'Target 95%+ on-time rate.',
guideTabTimelineDesc:'Track stages and progress.',guideTabSuppliersDesc:'Manage suppliers.',guideTabInventoryDesc:'Monitor inventory.',guideTabPODesc:'Manage purchase orders.',guideTabLeadTimeDesc:'Analyze lead times.',guideTabRiskDesc:'Detect and manage risks.',guideTabLandedCostDesc:'Calculate landed costs.',guideTabGuideDesc:'Beginner guide and tips.',
guideReadyTitle:'Ready!',guideReadyDesc:'Register your first supplier.',
guideFaqTitle:'FAQ',guideFaq1Q:'No data',guideFaq1A:'Register suppliers first.',guideFaq2Q:'Risk not working',guideFaq2A:'Set risk to high.',guideFaq3Q:'Change PO status?',guideFaq3A:'Auto-set to Draft.',guideFaq4Q:'Result is 0',guideFaq4A:'Enter amounts first.',guideFaq5Q:'Sync not working',guideFaq5A:'Refresh page.',
periodLabel:'Period',periodFrom:'From',periodTo:'To'
};

const KO_KEYS=fs.existsSync('sc_i18n_ko.json')?JSON.parse(fs.readFileSync('sc_i18n_ko.json','utf8')):EN_KEYS;

const ALL=['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es','pt','ru','ar','hi'];

ALL.forEach(lang=>{
  const p=DIR+lang+'.js';
  let src=fs.readFileSync(p,'utf8');
  
  // Check if supplyChain already exists and remove it
  // For minified files, match supplyChain:{...} carefully
  // Use a balanced brace counter
  const scIdx=src.indexOf('supplyChain:');
  if(scIdx!==-1){
    // Find the opening brace
    let braceStart=src.indexOf('{',scIdx);
    if(braceStart!==-1){
      let depth=1;
      let i=braceStart+1;
      while(i<src.length&&depth>0){
        if(src[i]==='{')depth++;
        if(src[i]==='}')depth--;
        i++;
      }
      // Remove from comma before supplyChain to end of block
      let removeStart=scIdx;
      // Check for preceding comma
      let j=removeStart-1;
      while(j>=0&&(src[j]===' '||src[j]==='\n'||src[j]==='\r'))j--;
      if(src[j]===',')removeStart=j;
      src=src.substring(0,removeStart)+src.substring(i);
    }
  }
  
  // Now inject supplyChain block
  const keys=lang==='ko'?KO_KEYS:EN_KEYS;
  let block='supplyChain:{';
  Object.keys(keys).forEach((k,idx)=>{
    if(idx>0)block+=',';
    block+=JSON.stringify(k)+':'+JSON.stringify(keys[k]);
  });
  block+='}';
  
  // Find the last } in the file (closing of export default)
  const lastBrace=src.lastIndexOf('}');
  // Insert before last brace with comma
  const beforeLast=src.substring(0,lastBrace).trimEnd();
  const needsComma=!beforeLast.endsWith(',')&&!beforeLast.endsWith('{');
  src=beforeLast+(needsComma?',':'')+block+'}';
  
  // Add newline and semicolon
  if(!src.endsWith(';'))src+=';\n';
  
  fs.writeFileSync(p,src,'utf8');
  
  // Verify
  try{
    // Quick syntax check by evaluating
    const test=new Function('return '+src.replace('export default ',''))();
    const hasSC=!!test.supplyChain;
    const scKeys=hasSC?Object.keys(test.supplyChain).length:0;
    const totalKeys=Object.keys(test).length;
    console.log('OK:',lang,'totalModules='+totalKeys,'scKeys='+scKeys);
  }catch(e){
    console.log('SYNTAX ERR:',lang,e.message.substring(0,60));
  }
});
