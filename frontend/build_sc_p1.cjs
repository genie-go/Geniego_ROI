// Part 1: Generate SupplyChain.jsx skeleton + imports + i18n keys + demo data
const fs=require('fs');
const OUT='src/pages/SupplyChain.jsx';

const code=`import React,{useState,useEffect,useMemo,useCallback}from'react';
import{useI18n}from'../i18n/index.js';
import{useCurrency}from'../contexts/CurrencyContext.jsx';
import{useAuth}from'../auth/AuthContext';
import{useSecurityGuard}from'../security/SecurityGuard.js';
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip as RTooltip,ResponsiveContainer,PieChart,Pie,Cell,AreaChart,Area,Legend}from'recharts';
import AIRecommendBanner from'../components/AIRecommendBanner.jsx';

/* ── i18n helper ── */
const T={
pageTitle:['supplyChain.pageTitle','Supply Chain'],
pageSub:['supplyChain.pageSub','Supply chain optimization & real-time monitoring'],
tabTimeline:['supplyChain.tabTimeline','Timeline'],
tabSuppliers:['supplyChain.tabSuppliers','Suppliers'],
tabInventory:['supplyChain.tabInventory','Inventory'],
tabPO:['supplyChain.tabPO','Purchase Orders'],
tabLeadTime:['supplyChain.tabLeadTime','Lead Time'],
tabRisk:['supplyChain.tabRisk','Risk'],
tabLandedCost:['supplyChain.tabLandedCost','Landed Cost'],
tabGuide:['supplyChain.tabGuide','Guide'],
loading:['supplyChain.loading','Loading...'],
noData:['supplyChain.noData','No data available.'],
kpiLines:['supplyChain.kpiLines','Supply Lines'],
kpiSuppliers:['supplyChain.kpiSuppliers','Suppliers'],
kpiHighRisk:['supplyChain.kpiHighRisk','High Risk'],
kpiAvgLead:['supplyChain.kpiAvgLead','Avg Lead Time'],
kpiTotalCost:['supplyChain.kpiTotalCost','Total Cost'],
kpiOnTime:['supplyChain.kpiOnTime','On-Time Rate'],
productName:['supplyChain.productName','Product'],
supplier:['supplyChain.supplier','Supplier'],
labelSku:['supplyChain.labelSku','SKU'],
leadTime:['supplyChain.leadTime','Lead Time'],
days:['supplyChain.days','days'],
country:['supplyChain.country','Country'],
category:['supplyChain.category','Category'],
delayRate:['supplyChain.delayRate','Delay Rate'],
contact:['supplyChain.contact','Contact'],
reliability:['supplyChain.reliability','Reliability'],
orderCount:['supplyChain.orderCount','Orders'],
addLine:['supplyChain.addLine','Add Line'],
addSupplier:['supplyChain.addSupplier','Add Supplier'],
register:['supplyChain.register','Register'],
cancel:['supplyChain.cancel','Cancel'],
confirmDelete:['supplyChain.confirmDelete','Delete?'],
normal:['supplyChain.normal','Normal'],
highRisk:['supplyChain.highRisk','High Risk'],
supplyRisk:['supplyChain.supplyRisk','Supply Risk'],
contactSupplier:['supplyChain.contactSupplier','Contact Supplier'],
altSupplierSearch:['supplyChain.altSupplierSearch','Search Alt Supplier'],
slackNotify:['supplyChain.slackNotify','Slack Notify'],
autoRiskRules:['supplyChain.autoRiskRules','Auto Risk Rules'],
addRule:['supplyChain.addRule','Add Rule'],
ruleName:['supplyChain.ruleName','Rule Name'],
ruleAction:['supplyChain.ruleAction','Action'],
noRisk:['supplyChain.noRisk','No risks detected.'],
invTotal:['supplyChain.invTotal','Total Inventory'],
invTransit:['supplyChain.invTransit','In Transit'],
invWarehouse:['supplyChain.invWarehouse','Warehouse'],
invSupplier:['supplyChain.invSupplier','Supplier'],
invQty:['supplyChain.invQty','Qty'],
invStatus:['supplyChain.invStatus','Status'],
invLocation:['supplyChain.invLocation','Location'],
invUpdated:['supplyChain.invUpdated','Updated'],
tabPOTitle:['supplyChain.tabPOTitle','Purchase Orders'],
poCreate:['supplyChain.poCreate','Create PO'],
poSelectSupplier:['supplyChain.poSelectSupplier','Select Supplier'],
poUnitCost:['supplyChain.poUnitCost','Unit Cost'],
poTotalCost:['supplyChain.poTotalCost','Total'],
poNotes:['supplyChain.poNotes','Notes'],
poDate:['supplyChain.poDate','Date'],
poStatusDraft:['supplyChain.poStatusDraft','Draft'],
poStatusPending:['supplyChain.poStatusPending','Pending'],
poStatusApproved:['supplyChain.poStatusApproved','Approved'],
poStatusShipped:['supplyChain.poStatusShipped','Shipped'],
poStatusReceived:['supplyChain.poStatusReceived','Received'],
poStatusCancelled:['supplyChain.poStatusCancelled','Cancelled'],
totalPO:['supplyChain.totalPO','Total PO Amount'],
lcProductCost:['supplyChain.lcProductCost','Product Cost'],
lcShipping:['supplyChain.lcShipping','Shipping'],
lcCustoms:['supplyChain.lcCustoms','Customs'],
lcInsurance:['supplyChain.lcInsurance','Insurance'],
lcHandling:['supplyChain.lcHandling','Handling'],
lcOther:['supplyChain.lcOther','Other'],
lcCalculate:['supplyChain.lcCalculate','Calculate'],
lcResult:['supplyChain.lcResult','Result'],
lcDesc:['supplyChain.lcDesc','Calculate total landed cost for imported products.'],
securityAlert:['supplyChain.securityAlert','Security Threat'],
securityDesc:['supplyChain.securityDesc','Malicious input blocked.'],
securityDismiss:['supplyChain.securityDismiss','Dismiss'],
periodLabel:['supplyChain.periodLabel','Period'],
guideTitle:['supplyChain.guideTitle','Supply Chain Guide'],
guideSub:['supplyChain.guideSub','Complete guide for supply chain management.'],
guideStepsTitle:['supplyChain.guideStepsTitle','Step-by-Step Guide'],
guideTipsTitle:['supplyChain.guideTipsTitle','Expert Tips'],
guideTabsTitle:['supplyChain.guideTabsTitle','Tab Reference'],
guideBeginnerBadge:['supplyChain.guideBeginnerBadge','Beginner'],
guideTimeBadge:['supplyChain.guideTimeBadge','10 min'],
guideLangBadge:['supplyChain.guideLangBadge','12 Languages'],
guideWhereToStart:['supplyChain.guideWhereToStart','Where to start?'],
guideWhereToStartDesc:['supplyChain.guideWhereToStartDesc','Register suppliers first, then create supply lines.'],
guideReadyTitle:['supplyChain.guideReadyTitle','Ready!'],
guideReadyDesc:['supplyChain.guideReadyDesc','Go to Suppliers tab to register your first supplier.'],
guideFaqTitle:['supplyChain.guideFaqTitle','FAQ'],
};
for(let i=1;i<=15;i++){
T['guideStep'+i+'Title']=['supplyChain.guideStep'+i+'Title','Step '+i];
T['guideStep'+i+'Desc']=['supplyChain.guideStep'+i+'Desc','Step '+i+' description'];
}
for(let i=1;i<=5;i++){
T['guideTip'+i]=['supplyChain.guideTip'+i,'Tip '+i];
T['guideFaq'+i+'Q']=['supplyChain.guideFaq'+i+'Q','FAQ '+i];
T['guideFaq'+i+'A']=['supplyChain.guideFaq'+i+'A','Answer '+i];
}
const tabDescKeys=['Timeline','Suppliers','Inventory','PO','LeadTime','Risk','LandedCost','Guide'];
tabDescKeys.forEach(k=>{T['guideTab'+k+'Desc']=['supplyChain.guideTab'+k+'Desc',k+' tab description'];});

const useTr=()=>{const{t}=useI18n();return useCallback((k)=>{const d=T[k];if(!d)return k;return t(d[0],d[1]);},[t]);};

/* ── Demo Data ── */
const DEMO_LINES=[
{id:'L1',product:'Premium Wireless Earbuds',sku:'WE-2024-A',supplier:'Shenzhen Audio Co.',leadTime:14,risk:'normal',stages:[100,100,100,80,40,0],country:'CN'},
{id:'L2',product:'Organic Cotton T-Shirt',sku:'CT-2024-B',supplier:'Vietnam Textile Ltd.',leadTime:21,risk:'high',stages:[100,100,60,20,0,0],country:'VN'},
{id:'L3',product:'Smart Watch Band',sku:'SW-2024-C',supplier:'Korea Parts Inc.',leadTime:7,risk:'normal',stages:[100,100,100,100,100,60],country:'KR'},
{id:'L4',product:'Bamboo Phone Case',sku:'BC-2024-D',supplier:'EcoMaterials Japan',leadTime:18,risk:'normal',stages:[100,100,100,100,70,30],country:'JP'},
{id:'L5',product:'Protein Powder 1kg',sku:'PP-2024-E',supplier:'NZ Health Foods',leadTime:28,risk:'high',stages:[100,80,40,0,0,0],country:'NZ'},
{id:'L6',product:'LED Desk Lamp',sku:'DL-2024-F',supplier:'Guangzhou Lighting',leadTime:12,risk:'normal',stages:[100,100,100,100,90,50],country:'CN'},
];
const DEMO_SUPPLIERS=[
{id:'S1',name:'Shenzhen Audio Co.',country:'CN',category:'Electronics',leadTime:14,delay:5,reliability:95,orders:128,contact:'wang@audio.cn'},
{id:'S2',name:'Vietnam Textile Ltd.',country:'VN',category:'Apparel',leadTime:21,delay:18,reliability:82,orders:67,contact:'tran@textile.vn'},
{id:'S3',name:'Korea Parts Inc.',country:'KR',category:'Components',leadTime:7,delay:3,reliability:97,orders:234,contact:'kim@parts.kr'},
{id:'S4',name:'EcoMaterials Japan',country:'JP',category:'Materials',leadTime:18,delay:8,reliability:92,orders:89,contact:'tanaka@eco.jp'},
{id:'S5',name:'NZ Health Foods',country:'NZ',category:'Food',leadTime:28,delay:22,reliability:78,orders:45,contact:'smith@nzhf.co.nz'},
{id:'S6',name:'Guangzhou Lighting',country:'CN',category:'Electronics',leadTime:12,delay:4,reliability:96,orders:156,contact:'liu@gzlight.cn'},
];
const DEMO_INV=[
{id:'I1',product:'Premium Wireless Earbuds',sku:'WE-2024-A',qty:2450,location:'Warehouse A',status:'normal',supplier:'Shenzhen Audio Co.',updated:'2026-04-27'},
{id:'I2',product:'Organic Cotton T-Shirt',sku:'CT-2024-B',qty:820,location:'In Transit',status:'transit',supplier:'Vietnam Textile Ltd.',updated:'2026-04-26'},
{id:'I3',product:'Smart Watch Band',sku:'SW-2024-C',qty:5200,location:'Warehouse B',status:'normal',supplier:'Korea Parts Inc.',updated:'2026-04-28'},
{id:'I4',product:'Bamboo Phone Case',sku:'BC-2024-D',qty:1100,location:'Supplier',status:'supplier',supplier:'EcoMaterials Japan',updated:'2026-04-25'},
{id:'I5',product:'Protein Powder 1kg',sku:'PP-2024-E',qty:340,location:'In Transit',status:'transit',supplier:'NZ Health Foods',updated:'2026-04-24'},
{id:'I6',product:'LED Desk Lamp',sku:'DL-2024-F',qty:3800,location:'Warehouse A',status:'normal',supplier:'Guangzhou Lighting',updated:'2026-04-28'},
];
const DEMO_PO=[
{id:'PO-001',supplier:'Shenzhen Audio Co.',product:'Premium Wireless Earbuds',qty:500,unitCost:12.5,status:'approved',date:'2026-04-20',notes:'Q2 restock'},
{id:'PO-002',supplier:'Vietnam Textile Ltd.',product:'Organic Cotton T-Shirt',qty:2000,unitCost:4.8,status:'shipped',date:'2026-04-18',notes:'Summer collection'},
{id:'PO-003',supplier:'Korea Parts Inc.',product:'Smart Watch Band',qty:1000,unitCost:3.2,status:'received',date:'2026-04-10',notes:'Monthly order'},
{id:'PO-004',supplier:'NZ Health Foods',product:'Protein Powder 1kg',qty:800,unitCost:8.9,status:'pending',date:'2026-04-25',notes:'New flavor launch'},
{id:'PO-005',supplier:'Guangzhou Lighting',product:'LED Desk Lamp',qty:600,unitCost:7.5,status:'draft',date:'2026-04-28',notes:'Office supplies'},
];
const STAGES=['Order','Production','QC','Shipping','Transit','Received'];
const PIE_COLORS=['#4f8ef7','#f97316','#22c55e','#a855f7','#ec4899','#eab308','#06b6d4'];
const STATUS_CLR={normal:'#22c55e',transit:'#4f8ef7',supplier:'#f97316',high:'#ef4444'};
const PO_CLR={draft:'#94a3b8',pending:'#f59e0b',approved:'#22c55e',shipped:'#4f8ef7',received:'#6366f1',cancelled:'#ef4444'};

`;
fs.writeFileSync(OUT,code,'utf8');
console.log('Part 1 written:',code.length,'chars');
