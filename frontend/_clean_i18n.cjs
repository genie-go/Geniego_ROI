const fs=require('fs');
const locales=['ko','en','ja','zh','zh-TW','th','vi','de','fr','es','id'];
const injKeys=['guideStep1Title','guideStep1Desc','guideStep2Title','guideStep2Desc','guideStep3Title','guideStep3Desc','guideStep4Title','guideStep4Desc','guideStep5Title','guideStep5Desc','guideStep6Title','guideStep6Desc','guideTabOverviewName','guideTabOverviewDesc','guideTabAbName','guideTabAbDesc','guideTabDetailName','guideTabDetailDesc','guideTabGanttName','guideTabGanttDesc','guideTabCrmName','guideTabCrmDesc','guideTabRoiName','guideTabRoiDesc','guideTabMonitorName','guideTabMonitorDesc','guideTabBudgetName','guideTabBudgetDesc','guideTabCopyName','guideTabCopyDesc','tabCreative','creativeTitle','creativeSub','guideTabCreativeName','guideTabCreativeDesc','channelFee','channelFeeRate','noFeeData'];

for(const lang of locales){
  const f='src/i18n/locales/'+lang+'.js';
  let s=fs.readFileSync(f,'utf8');
  // Remove all injected keys wherever they landed
  for(const k of injKeys){
    // Remove ,"key":"value" patterns - handle escaped quotes in values
    const pat = new RegExp(',\\s*"'+k+'"\\s*:\\s*"(?:[^"\\\\]|\\\\.)*"', 'g');
    s = s.replace(pat, '');
  }
  fs.writeFileSync(f,s,'utf8');
  // Verify parse
  try {
    delete require.cache[require.resolve('./'+f)];
    require('./'+f);
    console.log(lang+': CLEAN OK');
  } catch(e) {
    console.log(lang+': CLEAN FAIL -',e.message.split('\n')[0]);
  }
}
