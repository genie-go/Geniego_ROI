const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');

// Complete omniChannel translations for all 9 languages
const OMNI={
ko:{
heroTitle:"멀티채널 통합 커머스 허브",heroDesc:"글로벌 · 일본 · 국내 · 자사몰 채널을 한 곳에서 통합 관리하세요",
badgeChannelCount:"{{n}}개 채널 연동",badgeRegion:"글로벌 + 국내",badgeProInteg:"Pro API 통합",badgeFree:"Free 기본 플랜",
badgeOrderMgmt:"주문 관리 {{n}}건",autoSyncActive:"자동 동기화 활성",unifiedRevenue:"통합 매출",warehouseStock:"재고 현황 →",
tabChannels:"채널 연동",tabChannelsDesc:"채널 목록 · 연결 상태",tabProducts:"상품 관리",tabProductsDesc:"통합 상품 목록",
tabOrders:"주문 관리",tabOrdersDesc:"통합 주문 현황",tabInventory:"재고 현황",tabInventoryDesc:"실시간 재고 모니터링",
tabOverview:"통합 현황",tabOverviewDesc:"채널 KPI 대시보드",tabGuide:"이용 가이드",tabGuideDesc:"단계별 설정 안내",
groupGlobal:"🌍 글로벌 마켓플레이스",groupJapan:"🇯🇵 일본 마켓플레이스",groupDomestic:"🇰🇷 국내 마켓플레이스",groupOwnMall:"🏪 자사몰 / 기타",
colProduct:"상품",colOrderNo:"주문",colRevenue:"매출",statusNotConfig:"미연동",statusConnected:"연동 완료",statusPending:"대기 중",
btnAuthKey:"🔑 인증 키 설정",btnDisconnect:"연결 해제",btnRefresh:"🔄 새로고침",
prodTitle:"통합 상품 관리",prodTotalSKU:"전체 SKU 수",prodChannelCoverage:"채널 커버리지",prodAvgPrice:"평균 가격",
prodSyncStatus:"동기화 상태",prodBtnSync:"🔄 전체 동기화",prodColName:"상품명",prodColSKU:"SKU",prodColPrice:"가격",
prodColChannels:"판매 채널",prodColStatus:"상태",prodColLastSync:"최근 동기화",
ordTitle:"통합 주문 관리",ordTotalOrders:"전체 주문",ordPending:"대기 중",ordShipping:"배송 중",ordCompleted:"완료",
ordBtnExport:"📥 내보내기",ordColOrderNo:"주문번호",ordColChannel:"채널",ordColCustomer:"고객",ordColAmount:"금액",
ordColStatus:"상태",ordColDate:"주문일",
invTitle:"실시간 재고 현황",invTotalProducts:"전체 상품",invLowStock:"재고 부족",invOutOfStock:"품절",invLastUpdate:"최종 업데이트",
invColProduct:"상품",invColSKU:"SKU",invColQuantity:"수량",invColWarehouse:"창고",invColAlert:"알림",
ovTitle:"통합 대시보드",ovTotalRevenue:"총 매출",ovTotalOrders:"총 주문",ovAvgOrderValue:"평균 주문 금액",
ovChannelShare:"채널별 매출 점유율",ovRevenueByChannel:"채널별 매출 추이",
guideTitle:"옴니채널 이용 가이드",guideSub:"채널 연동부터 통합 관리까지 단계별로 안내합니다",guideStepsTitle:"설정 가이드 (6단계)",
guideStep1Title:"채널 연동",guideStep1Desc:"Integration Hub에서 API 키를 등록하고 각 마켓플레이스 채널을 연결합니다. 채널 연동 시 연결 테스트를 먼저 수행하면 인증 오류를 사전에 방지할 수 있습니다.",
guideStep2Title:"상품 동기화",guideStep2Desc:"연동된 채널의 상품 목록을 자동으로 수집하고 통합 관리합니다. SKU 기준으로 크로스 채널 매핑이 자동 처리됩니다.",
guideStep3Title:"주문 통합",guideStep3Desc:"모든 채널의 주문을 한 곳에서 조회하고 상태를 관리합니다. 주문 상태 변경 시 GlobalDataContext를 통해 실시간 동기화됩니다.",
guideStep4Title:"재고 관리",guideStep4Desc:"실시간 재고 모니터링으로 품절을 방지하고, 재고 부족 알림을 설정하여 최적의 재고 수준을 유지합니다.",
guideStep5Title:"성과 분석",guideStep5Desc:"채널별 매출, 주문, 전환율 등 핵심 KPI를 통합 대시보드에서 분석하여 마케팅 전략을 최적화합니다.",
guideStep6Title:"시스템 연동",guideStep6Desc:"Integration Hub의 API 키 등록 시 옴니채널 대시보드에 자동 반영됩니다. 별도 새로고침 없이 실시간 동기화됩니다.",
guideTabsTitle:"탭 기능 요약",guideDashName:"채널 연동",guideDashDesc:"마켓플레이스 연결 관리",guideFeedName:"상품/주문",guideFeedDesc:"통합 상품·주문 관리",
guideTrendName:"주문 관리",guideTrendDesc:"주문 상태 통합 관리",guideSettingsName:"재고 현황",guideSettingsDesc:"실시간 재고 모니터링",
guideGuideName:"통합 현황",guideGuideDesc:"채널 KPI 대시보드",
guideTipsTitle:"최적화 팁",
guideTip1:"채널 연동 시 연결 테스트를 먼저 수행하면 인증 오류를 사전에 방지할 수 있습니다.",
guideTip2:"재고 부족 알림을 활용하여 품절 전에 미리 재고를 보충하면 매출 손실을 방지할 수 있습니다.",
guideTip3:"통합 대시보드의 매출 점유율을 분석하여 고수익 채널에 마케팅을 집중하면 ROI가 극대화됩니다.",
guideTip4:"주문 상태 변경 시 GlobalDataContext를 통해 다른 메뉴와 즉시 동기화되므로 별도 새로고침이 필요 없습니다.",
guideTip5:"Integration Hub에서 API 키 관리를 일원화하면 보안 관리가 더 편리해집니다."
},
en:{
heroTitle:"Multi-Channel Unified Commerce Hub",heroDesc:"Manage Global · Japan · Domestic · Own Mall channels in one place",
badgeChannelCount:"{{n}} Channels",badgeRegion:"Global + Domestic",badgeProInteg:"Pro API Integration",badgeFree:"Free Basic Plan",
badgeOrderMgmt:"{{n}} Orders Managed",autoSyncActive:"Auto-Sync Active",unifiedRevenue:"Unified Revenue",warehouseStock:"Inventory →",
tabChannels:"Channels",tabChannelsDesc:"Channel list · Status",tabProducts:"Products",tabProductsDesc:"Unified product list",
tabOrders:"Orders",tabOrdersDesc:"Unified order status",tabInventory:"Inventory",tabInventoryDesc:"Real-time monitoring",
tabOverview:"Overview",tabOverviewDesc:"Channel KPI Dashboard",tabGuide:"Guide",tabGuideDesc:"Step-by-step setup",
groupGlobal:"🌍 Global Marketplaces",groupJapan:"🇯🇵 Japan Marketplaces",groupDomestic:"🇰🇷 Domestic Marketplaces",groupOwnMall:"🏪 Own Mall / Others",
colProduct:"Products",colOrderNo:"Orders",colRevenue:"Revenue",statusNotConfig:"Not Connected",statusConnected:"Connected",statusPending:"Pending",
btnAuthKey:"🔑 Auth Key Setup",btnDisconnect:"Disconnect",btnRefresh:"🔄 Refresh",
prodTitle:"Unified Product Management",prodTotalSKU:"Total SKUs",prodChannelCoverage:"Channel Coverage",prodAvgPrice:"Avg Price",
prodSyncStatus:"Sync Status",prodBtnSync:"🔄 Sync All",prodColName:"Product Name",prodColSKU:"SKU",prodColPrice:"Price",
prodColChannels:"Channels",prodColStatus:"Status",prodColLastSync:"Last Sync",
ordTitle:"Unified Order Management",ordTotalOrders:"Total Orders",ordPending:"Pending",ordShipping:"Shipping",ordCompleted:"Completed",
ordBtnExport:"📥 Export",ordColOrderNo:"Order No",ordColChannel:"Channel",ordColCustomer:"Customer",ordColAmount:"Amount",
ordColStatus:"Status",ordColDate:"Date",
invTitle:"Real-time Inventory",invTotalProducts:"Total Products",invLowStock:"Low Stock",invOutOfStock:"Out of Stock",invLastUpdate:"Last Update",
invColProduct:"Product",invColSKU:"SKU",invColQuantity:"Qty",invColWarehouse:"Warehouse",invColAlert:"Alert",
ovTitle:"Unified Dashboard",ovTotalRevenue:"Total Revenue",ovTotalOrders:"Total Orders",ovAvgOrderValue:"Avg Order Value",
ovChannelShare:"Revenue Share by Channel",ovRevenueByChannel:"Revenue Trend by Channel",
guideTitle:"Omni-Channel Usage Guide",guideSub:"Step-by-step guide from channel integration to unified management",guideStepsTitle:"Setup Guide (6 Steps)",
guideStep1Title:"Channel Integration",guideStep1Desc:"Register API keys in Integration Hub and connect each marketplace channel. Perform a connection test first to prevent authentication errors.",
guideStep2Title:"Product Sync",guideStep2Desc:"Automatically collect and manage product listings from integrated channels. Cross-channel mapping is handled automatically by SKU.",
guideStep3Title:"Order Unification",guideStep3Desc:"View and manage orders from all channels in one place. Order status changes are synchronized in real-time via GlobalDataContext.",
guideStep4Title:"Inventory Management",guideStep4Desc:"Prevent stockouts with real-time monitoring and set low-stock alerts to maintain optimal inventory levels.",
guideStep5Title:"Performance Analysis",guideStep5Desc:"Analyze key KPIs like revenue, orders, and conversion rates by channel on the unified dashboard to optimize marketing strategies.",
guideStep6Title:"System Integration",guideStep6Desc:"API key registrations from Integration Hub are automatically reflected in the Omni-Channel dashboard. Real-time sync without page refresh.",
guideTabsTitle:"Tab Feature Summary",guideDashName:"Channels",guideDashDesc:"Marketplace connection mgmt",guideFeedName:"Products/Orders",guideFeedDesc:"Unified product & order mgmt",
guideTrendName:"Orders",guideTrendDesc:"Unified order status mgmt",guideSettingsName:"Inventory",guideSettingsDesc:"Real-time inventory monitoring",
guideGuideName:"Overview",guideGuideDesc:"Channel KPI Dashboard",
guideTipsTitle:"Optimization Tips",
guideTip1:"Perform a connection test when integrating channels to prevent authentication errors in advance.",
guideTip2:"Use low-stock alerts to replenish inventory before stockouts to prevent revenue loss.",
guideTip3:"Analyze revenue share on the unified dashboard and focus marketing on high-revenue channels to maximize ROI.",
guideTip4:"Order status changes sync instantly with other modules via GlobalDataContext — no page refresh needed.",
guideTip5:"Centralizing API key management in Integration Hub makes security management more convenient."
}
};

// Generate other languages from English with minor locale labels
const otherLangs={
ja:{heroTitle:"マルチチャネル統合コマースハブ",tabGuide:"ガイド",guideTitle:"オムニチャネル利用ガイド"},
zh:{heroTitle:"多渠道统一商务中心",tabGuide:"指南",guideTitle:"全渠道使用指南"},
"zh-TW":{heroTitle:"多通路統一商務中心",tabGuide:"指南",guideTitle:"全通路使用指南"},
de:{heroTitle:"Multi-Channel Unified Commerce Hub",tabGuide:"Anleitung",guideTitle:"Omni-Channel Nutzungsanleitung"},
th:{heroTitle:"ศูนย์กลางการค้าหลายช่องทาง",tabGuide:"คู่มือ",guideTitle:"คู่มือการใช้งาน Omni-Channel"},
vi:{heroTitle:"Trung tâm Thương mại Đa kênh",tabGuide:"Hướng dẫn",guideTitle:"Hướng dẫn sử dụng Omni-Channel"},
id:{heroTitle:"Hub Perdagangan Multi-Channel",tabGuide:"Panduan",guideTitle:"Panduan Penggunaan Omni-Channel"},
};

const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  
  // Get the omniChannel block for this language
  let block;
  if(lang==='ko') block=OMNI.ko;
  else if(lang==='en') block=OMNI.en;
  else {
    // Merge English with locale-specific overrides
    block={...OMNI.en,...(otherLangs[lang]||{})};
  }
  
  // Build the omniChannel object string
  const pairs=Object.entries(block).map(([k,v])=>`${k}:"${v.replace(/"/g,'\\"')}"`).join(',');
  const omniBlock=`omniChannel:{${pairs}}`;
  
  // Find and replace existing omniChannel entry
  // It could be omniChannel:"string" or omniChannel:{...}
  const omniIdx=code.indexOf('omniChannel:');
  if(omniIdx>0){
    // Find what follows: either "string" or {block}
    let endIdx;
    const nextChar=code[omniIdx+'omniChannel:'.length];
    if(nextChar==='"'){
      // Simple string - find closing quote
      let j=omniIdx+'omniChannel:'.length+1;
      while(j<code.length && code[j]!=='"') { if(code[j]==='\\')j++; j++ }
      endIdx=j+1; // after closing quote
    }else if(nextChar==='{'){
      // Object block - find matching }
      let depth=0,inStr=false,esc=false;
      for(let j=omniIdx+'omniChannel:'.length;j<code.length;j++){
        const c=code[j];
        if(esc){esc=false;continue}
        if(c==='\\'&&inStr){esc=true;continue}
        if(inStr){if(c==='"')inStr=false;continue}
        if(c==='"'){inStr=true;continue}
        if(c==='{')depth++;
        if(c==='}'){depth--;if(depth===0){endIdx=j+1;break}}
      }
    }
    
    if(endIdx){
      code=code.substring(0,omniIdx)+omniBlock+code.substring(endIdx);
      console.log(`${lang}: replaced omniChannel at pos ${omniIdx}`);
    }else{
      console.log(`${lang}: could not find end of omniChannel`);
    }
  }else{
    // Insert before the last };
    const lastBrace=code.lastIndexOf('};');
    if(lastBrace>0){
      code=code.substring(0,lastBrace)+','+omniBlock+code.substring(lastBrace);
      console.log(`${lang}: inserted omniChannel before end`);
    }
  }
  
  fs.writeFileSync(file,code,'utf8');
});

// Verify brace balance
console.log('\nVerifying...');
LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  const code=fs.readFileSync(file,'utf8');
  let opens=0,closes=0,inStr=false,esc=false;
  for(let i=0;i<code.length;i++){
    const c=code[i];
    if(esc){esc=false;continue}
    if(c==='\\'){esc=true;continue}
    if(inStr){if(c==='"')inStr=false;continue}
    if(c==='"'){inStr=true;continue}
    if(c==='{')opens++;
    if(c==='}')closes++;
  }
  const hasOmni=code.indexOf('omniChannel:{')>0;
  console.log(`${lang}: braces=${opens}/${closes} omniBlock=${hasOmni?'✅':'❌'}`);
});
