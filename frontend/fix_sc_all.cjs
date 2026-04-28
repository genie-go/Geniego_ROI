// Nuclear fix: Remove Korean fallback text from all non-ko locales
// Replace with English translations so text renders properly
const fs=require('fs');
const DIR='src/i18n/locales/';
const KO=JSON.parse(fs.readFileSync('sc_i18n_ko.json','utf8'));

// English translations for ALL keys
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
guideWhereToStart:'Where to start?',guideWhereToStartDesc:'1. Register suppliers in the Supplier Management tab. 2. Create supply lines in the Supply Timeline tab. 3. Create purchase orders in PO Management. 4. Monitor inventory. 5. Set up auto-alert rules in Risk Detection.',
guideStep1Title:'Register Suppliers',guideStep1Desc:'In the Supplier Management tab, enter supplier details (company, country, category, lead time, contact) to register.',
guideStep2Title:'Create Supply Lines',guideStep2Desc:'In the Supply Timeline tab, create product supply lines and track each stage (Order→Production→QC→Shipping→Transit→Received).',
guideStep3Title:'Create Purchase Orders',guideStep3Desc:'In PO Management, select a supplier and enter product, quantity, and unit cost to create a PO.',
guideStep4Title:'Monitor Inventory',guideStep4Desc:'In the Inventory tab, check total, in-transit, warehouse, and supplier inventory in real-time.',
guideStep5Title:'Lead Time Analysis',guideStep5Desc:'In the Lead Time tab, analyze stage-by-stage duration and delay rates for each supply line.',
guideStep6Title:'Risk Detection Setup',guideStep6Desc:'In the Risk Detection tab, review high-risk lines and set up automatic alert rules.',
guideStep7Title:'Landed Cost Analysis',guideStep7Desc:'In the Landed Cost tab, enter product cost, shipping, customs, insurance to calculate total landed cost.',
guideStep8Title:'Supplier Evaluation',guideStep8Desc:'Evaluate supplier performance based on reliability, delay rate, and order count.',
guideStep9Title:'Real-time Sync Verification',guideStep9Desc:'All changes sync in real-time. Inventory and timeline auto-update when POs are created.',
guideStep10Title:'Dashboard Review',guideStep10Desc:'Regularly check KPI cards (supply lines, suppliers, high risk, avg lead time, total cost, on-time rate).',
guideStep11Title:'Risk Response Process',guideStep11Desc:'When high risk detected: ①Contact supplier→②Search alternatives→③Slack alert→④Adjust PO.',
guideStep12Title:'Cost Optimization Strategy',guideStep12Desc:'Run regular cost analyses to find optimal logistics routes and customs strategies.',
guideStep13Title:'Period-based Data Query',guideStep13Desc:'Use period selection in each tab to filter data and analyze trends.',
guideStep14Title:'Security Management',guideStep14Desc:'The system auto-detects and blocks XSS, SQL injection and other security threats.',
guideStep15Title:'Final Check & Routine',guideStep15Desc:'Every Monday: KPI review→High risk review→PO status check→Cost analysis.',
guideTip1:'If supplier reliability is below 85%, always secure an alternative supplier.',
guideTip2:'Lines with lead time over 14 days need higher safety stock levels.',
guideTip3:'Missing customs and insurance in cost analysis causes significant cost discrepancies.',
guideTip4:'If more than 3 high-risk lines exist, immediately review supply chain diversification.',
guideTip5:'Maintaining 95%+ on-time rate minimizes stock shortage risks.',
guideTabTimelineDesc:'Track supply line stages and visualize progress.',
guideTabSuppliersDesc:'Register, evaluate, and manage supplier contacts.',
guideTabInventoryDesc:'Monitor all inventory by location in real-time.',
guideTabPODesc:'Create POs, track status, and manage costs.',
guideTabLeadTimeDesc:'Analyze lead times per supply line.',
guideTabRiskDesc:'Detect high-risk lines and manage auto-alerts.',
guideTabLandedCostDesc:'Calculate total landed cost for imports.',
guideTabGuideDesc:'Detailed guide with expert tips for beginners.',
guideReadyTitle:'Ready! Start managing your supply chain',guideReadyDesc:'Go to Supplier Management tab to register your first supplier.',
guideFaqTitle:'FAQ',
guideFaq1Q:'Data is not displayed',guideFaq1A:'First register suppliers and create supply lines.',
guideFaq2Q:'Risk detection is not working',guideFaq2A:'Only shown when supply line risk is set to "high".',
guideFaq3Q:'How to change PO status?',guideFaq3A:'PO status is auto-set to "Draft" on creation.',
guideFaq4Q:'Cost analysis result is 0',guideFaq4A:'Enter amounts in each cost field then click Calculate.',
guideFaq5Q:'Real-time sync not working',guideFaq5A:'Auto-syncs every 30 seconds. Refresh page for immediate update.',
periodLabel:'Period',periodFrom:'From',periodTo:'To'
};

const langs=['ja','zh','zh-TW','th','vi','id','de','fr','es','pt','ru','ar','hi'];
langs.forEach(lang=>{
  const p=DIR+lang+'.js';
  let src=fs.readFileSync(p,'utf8');
  
  // Find and remove existing supplyChain block
  const blockMatch=src.match(/,?\s*supplyChain\s*:\s*\{[\s\S]*?\n\s{0,4}\}/);
  if(blockMatch){
    src=src.replace(blockMatch[0],'');
  }
  
  // Build new block with English translations (replacing Korean)
  let block='\n  supplyChain: {\n';
  Object.keys(EN).forEach(k=>{
    block+="    '"+k+"': '"+EN[k].replace(/'/g,"\\'")+"',\n";
  });
  block+='  }';
  
  // Insert before last closing brace
  const lastBrace=src.lastIndexOf('}');
  src=src.substring(0,lastBrace)+','+block+'\n'+src.substring(lastBrace);
  
  // Clean double commas
  src=src.replace(/,\s*,/g,',');
  
  fs.writeFileSync(p,src,'utf8');
  console.log('FIXED:',lang);
});
console.log('All 13 languages fixed with English translations');
