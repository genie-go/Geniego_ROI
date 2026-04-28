// Safe i18n injection: properly inject supplyChain keys into all locale files
// This script SAFELY adds keys without destroying existing content
const fs=require('fs');
const DIR='src/i18n/locales/';

const EN={
pageTitle:'Supply Chain Management',pageSub:'Supply chain & logistics network optimization and real-time monitoring',
tabTimeline:'Supply Timeline',tabSuppliers:'Supplier Management',tabInventory:'Inventory',tabPO:'Purchase Orders',tabLeadTime:'Lead Time Analysis',tabRisk:'Risk Detection',tabLandedCost:'Landed Cost',tabGuide:'Usage Guide',
loading:'Loading...',noData:'No data available.',
kpiLines:'Supply Lines',kpiSuppliers:'Suppliers',kpiHighRisk:'High Risk',kpiAvgLead:'Avg Lead Time',kpiTotalCost:'Total Cost',kpiOnTime:'On-Time Rate',
productName:'Product Name',supplier:'Supplier',labelSku:'SKU',leadTime:'Lead Time',days:'days',country:'Country',category:'Category',delayRate:'Delay Rate',contact:'Contact',reliability:'Reliability',orderCount:'Orders',
addLine:'Add Line',addSupplier:'Add Supplier',register:'Register',cancel:'Cancel',confirmDelete:'Delete?',
normal:'Normal',highRisk:'High Risk',supplyRisk:'Supply Risk',contactSupplier:'Contact Supplier',altSupplierSearch:'Search Alt Supplier',slackNotify:'Slack Notify',autoRiskRules:'Auto Risk Rules',addRule:'Add Rule',ruleName:'Rule Name',ruleAction:'Action',noRisk:'No risks detected.',
invTotal:'Total Inventory',invTransit:'In Transit',invWarehouse:'Warehouse',invSupplier:'Supplier',invQty:'Quantity',invStatus:'Status',invLocation:'Location',invUpdated:'Updated',
tabPOTitle:'Purchase Orders',poCreate:'Create PO',poSelectSupplier:'Select Supplier',poUnitCost:'Unit Cost',poTotalCost:'Total',poNotes:'Notes',poDate:'Date',
poStatusDraft:'Draft',poStatusPending:'Pending',poStatusApproved:'Approved',poStatusShipped:'Shipped',poStatusReceived:'Received',poStatusCancelled:'Cancelled',
lcProductCost:'Product Cost',lcShipping:'Shipping',lcCustoms:'Customs',lcInsurance:'Insurance',lcHandling:'Handling',lcOther:'Other',lcCalculate:'Calculate',lcResult:'Result',lcDesc:'Calculate total landed cost for imported products.',
securityAlert:'Security Threat',securityDesc:'Malicious input blocked.',securityDismiss:'Dismiss',totalPO:'Total PO Amount',
guideTitle:'Supply Chain Management Guide',guideSub:'Follow this guide to master the supply chain management system.',
guideStepsTitle:'Step-by-Step Guide',guideTipsTitle:'Expert Tips',guideTabsTitle:'Tab Reference',
guideBeginnerBadge:'Beginner Guide',guideTimeBadge:'10 min',guideLangBadge:'12 Languages',
guideWhereToStart:'Where to start?',guideWhereToStartDesc:'1. Register suppliers. 2. Create supply lines. 3. Create purchase orders. 4. Monitor inventory. 5. Set up risk alerts.',
guideStep1Title:'Register Suppliers',guideStep1Desc:'Enter supplier details in the Supplier Management tab to register.',
guideStep2Title:'Create Supply Lines',guideStep2Desc:'Create product supply lines and track each stage.',
guideStep3Title:'Create Purchase Orders',guideStep3Desc:'Select a supplier, enter product, quantity, and unit cost.',
guideStep4Title:'Monitor Inventory',guideStep4Desc:'Check total, in-transit, warehouse, and supplier inventory.',
guideStep5Title:'Lead Time Analysis',guideStep5Desc:'Analyze stage-by-stage duration and delay rates.',
guideStep6Title:'Risk Detection Setup',guideStep6Desc:'Review high-risk lines and set up automatic alert rules.',
guideStep7Title:'Landed Cost Analysis',guideStep7Desc:'Enter costs to calculate total landed cost.',
guideStep8Title:'Supplier Evaluation',guideStep8Desc:'Evaluate supplier performance based on reliability and delays.',
guideStep9Title:'Real-time Sync',guideStep9Desc:'All changes sync in real-time.',
guideStep10Title:'Dashboard Review',guideStep10Desc:'Regularly check KPI cards.',
guideStep11Title:'Risk Response',guideStep11Desc:'Contact supplier, search alternatives, send alerts, adjust PO.',
guideStep12Title:'Cost Optimization',guideStep12Desc:'Run regular cost analyses for optimal logistics.',
guideStep13Title:'Period Data Query',guideStep13Desc:'Use period selection to filter and analyze trends.',
guideStep14Title:'Security Management',guideStep14Desc:'Auto-detects and blocks security threats.',
guideStep15Title:'Final Check & Routine',guideStep15Desc:'Weekly: KPI review, risk review, PO check, cost analysis.',
guideTip1:'If reliability below 85%, secure an alternative supplier.',
guideTip2:'Lines with lead time over 14 days need higher safety stock.',
guideTip3:'Missing customs/insurance causes cost discrepancies.',
guideTip4:'More than 3 high-risk lines: review diversification.',
guideTip5:'Maintain 95%+ on-time rate to minimize shortages.',
guideTabTimelineDesc:'Track supply line stages and progress.',
guideTabSuppliersDesc:'Register, evaluate, and manage suppliers.',
guideTabInventoryDesc:'Monitor all inventory by location.',
guideTabPODesc:'Create POs, track status, manage costs.',
guideTabLeadTimeDesc:'Analyze lead times per supply line.',
guideTabRiskDesc:'Detect risks and manage auto-alerts.',
guideTabLandedCostDesc:'Calculate total landed cost for imports.',
guideTabGuideDesc:'Detailed guide with expert tips.',
guideReadyTitle:'Ready! Start managing your supply chain',guideReadyDesc:'Go to Supplier Management to register your first supplier.',
guideFaqTitle:'FAQ',
guideFaq1Q:'Data not displayed',guideFaq1A:'Register suppliers and create supply lines first.',
guideFaq2Q:'Risk detection not working',guideFaq2A:'Only shown when risk is set to high.',
guideFaq3Q:'How to change PO status?',guideFaq3A:'Auto-set to Draft on creation.',
guideFaq4Q:'Cost analysis result is 0',guideFaq4A:'Enter amounts then click Calculate.',
guideFaq5Q:'Sync not working',guideFaq5A:'Auto-syncs every 30s. Refresh for immediate update.',
periodLabel:'Period',periodFrom:'From',periodTo:'To'
};

// Build supplyChain block string
function buildBlock(translations){
  let b="  supplyChain: {\n";
  Object.keys(translations).forEach(k=>{
    b+="    '"+k+"': '"+String(translations[k]).replace(/'/g,"\\'")+"',\n";
  });
  b+="  }";
  return b;
}

const ALL_LANGS=['ko','en','ja','zh','zh-TW','th','vi','id','de','fr','es','pt','ru','ar','hi'];

ALL_LANGS.forEach(lang=>{
  const p=DIR+lang+'.js';
  let src=fs.readFileSync(p,'utf8');
  
  // Remove existing supplyChain block if present (safe regex)
  src=src.replace(/,?\s*supplyChain\s*:\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g,'');
  
  // For ko, use Korean translations from JSON
  let translations=EN;
  if(lang==='ko'){
    try{translations=JSON.parse(fs.readFileSync('sc_i18n_ko.json','utf8'));}catch(e){}
  }
  
  // Find the last property before closing brace
  const lastBrace=src.lastIndexOf('}');
  if(lastBrace===-1){console.log('ERROR: no closing brace in',lang);return;}
  
  // Check if there's a comma before insertion point
  const before=src.substring(0,lastBrace).trimEnd();
  const needComma=!before.endsWith(',')&&!before.endsWith('{');
  
  src=before+(needComma?',':'')+'\n'+buildBlock(translations)+'\n};\n';
  
  fs.writeFileSync(p,src,'utf8');
  const lines=src.split('\n').length;
  console.log('INJECTED:',lang,'('+lines+' lines)');
});
