// Replace English fallback values in dash.* with proper translations
// Batch: ar, de, zh, es, fr, pt
const fs=require('fs'),p=require('path');
const dir=p.resolve(__dirname,'src/i18n/locales');

// Full dash+dashboard+dashPeriod translations per language
const LANGS={
ar:{dash:{achvRate:'الإنجاز',active:'نشط',activeCampaigns:'حملات نشطة',activeCh:'القنوات النشطة',adRev:'إيرادات الإعلانات',adSpend:'إنفاق الإعلانات',ageDist:'توزيع العمر',aiAdAnal:'🤖 تحليل إعلانات AI',AIPolicy:'سياسة AI',alertCount:'التنبيهات',Alerts:'تنبيهات',all:'الكل',allChSummary:'ملخص جميع القنوات',analyticsModules:'وحدات التحليل',Attribution:'الإسناد',avgCtr:'متوسط CTR',avgDuration:'متوسط المدة',avgRoas:'ROAS المدمج',avgViewTime:'متوسط وقت المشاهدة',blendedRoas:'ROAS المدمج',blocked:'محظور',bounceRate:'معدل الارتداد',cartAdds:'إضافات السلة',channelMix:'مزيج إيرادات القنوات',channelPerf:'📊 أداء القنوات',chCount:'القنوات النشطة',chDetailTable:'جدول تفاصيل القنوات',chIntelDesc1:'من بطاقات القنوات أو الجدول،',chIntelReport:'تقرير ذكاء القنوات',chIntelTitle:'ذكاء القنوات',chName:'القناة',chPerfSumm:'ملخص أداء القنوات',chRoas:'ROAS حسب القناة',chTrend:'اتجاه القنوات',chTrendKpi:'اتجاه أداء القنوات',clickChannelHint:'انقر على بطاقة قناة ← تحليل 5 أقسام',clickForAnalysis:'انقر ← 5 أقسام',clicks:'النقرات',connectChannels:'اربط قنوات الإعلانات لعرض البيانات',conv2:'4. التحويل',convCount:'التحويلات',convFunnel:'قمع التحويل',convRate:'معدل التحويل',couponApplied:'تم تطبيق قسيمة الخطة!',couponIssued:'تم إصدار القسيمة!',cpa:'CPA',cpc:'CPC',cpm:'CPM',crossModuleSummary:'ملخص عبر الوحدات',ctr:'CTR',ctrLabel:'CTR',dismiss:'تجاهل',dropOff:'انسحاب',enforced:'مطبق',engagement2:'2. التفاعل',execAdSpend:'إنفاق الإعلانات',fiveSectionAnalysis:'تحليل 5 أقسام',frequency:'التكرار',genderDist:'توزيع الجنس/العمر',GraphScore:'نقاط الرسم البياني',grossMargin:'هامش الربح',impressions:'مرات الظهور',Influencer:'المؤثرون',info:'معلومات',inventoryValue:'قيمة المخزون',KRChannel:'قناة كوريا',liveActivity:'النشاط المباشر',lowStockItems:'مخزون منخفض',maleBuyer:'👨 ذكر',Marketing:'التسويق',moduleShortcuts:'اختصارات الوحدات',naverName:'Naver',netProfit:'صافي الربح',noActivity:'لا نشاط',noChannelData:'لا توجد بيانات قنوات',noSecurityIssues:'لا مشاكل أمنية',noTrendData:'لا توجد بيانات اتجاه',operatingProfit:'الربح التشغيلي',opProfit:'الربح التشغيلي',orders:'الطلبات',pendingOrders:'طلبات معلقة',PriceOpt:'تحسين الأسعار',protected:'محمي',purchaseCount:'المشتريات',reach:'الوصول',reachAwareness:'1. الوصول والوعي',realTimeBlendedRoas:'ROAS المدمج الفوري',Reconcile:'المطابقة',regDist:'التوزيع الإقليمي',regionBusan:'بوسان',regionDaegu:'دايغو',regionGyeonggi:'كيونغي',regionIncheon:'إنتشون',regionSeoul:'سيول',rev:'الإيرادات',revRoi2:'5. الإيرادات وROI',secureStatus:'آمن',securityAlert:'تنبيه أمني',securityMonitor:'مراقب الأمان',sessions:'الجلسات',settlementChs:'قنوات التسوية',signups:'التسجيلات',spendBudget:'الإنفاق',spendDistribution:'توزيع الإنفاق',sysStatus:'حالة النظام',threatDetected:'تم اكتشاف تهديد أمني',threatsDetected:'تهديدات مكتشفة',totalClicks:'إجمالي النقرات',totalRev:'إجمالي الإيرادات',totalSpend:'إجمالي الإنفاق',totalStock:'إجمالي المخزون',traffic2:'3. حركة المرور',videoViews:'مشاهدات الفيديو',vsYesterday:'مقابل أمس',warnings:'تحذيرات',reviewSecurity:'مراجعة لوحة الأمان'},dashboard:{adSpend:'إنفاق الإعلانات',avgOrder:'متوسط قيمة الطلب',convRateLbl:'معدل التحويل',grossRevenue:'إجمالي الإيرادات',netROAS:'صافي ROAS',totalOrders:'إجمالي الطلبات'},dashPeriod:{today:'اليوم','7d':'7 أيام','14d':'14 يوم','30d':'30 يوم','90d':'90 يوم',custom:'مخصص',customRange:'نطاق مخصص',startDate:'تاريخ البداية',endDate:'تاريخ النهاية',apply:'تطبيق'}},
de:{dash:{achvRate:'Erreichung',active:'Aktiv',activeCampaigns:'Aktive Kampagnen',activeCh:'Aktive Kanäle',adRev:'Werbeeinnahmen',adSpend:'Werbeausgaben',ageDist:'Altersverteilung',aiAdAnal:'🤖 KI-Anzeigenanalyse',AIPolicy:'KI-Richtlinie',alertCount:'Warnungen',Alerts:'Warnungen',all:'Alle',allChSummary:'Gesamtkanalübersicht',analyticsModules:'Analysemodule',Attribution:'Attribution',avgCtr:'Durchschn. CTR',avgDuration:'Durchschn. Dauer',avgRoas:'Gemischter ROAS',avgViewTime:'Durchschn. Ansichtszeit',blendedRoas:'Gemischter ROAS',blocked:'Blockiert',bounceRate:'Absprungrate',cartAdds:'Warenkorb',channelMix:'Kanal-Umsatzmix',channelPerf:'📊 Kanalleistung',chCount:'Aktive Kanäle',chDetailTable:'Kanaldetailtabelle',chIntelDesc1:'Von den Kanalkarten oder der Tabelle,',chIntelReport:'Kanalintelligenz-Bericht',chIntelTitle:'Kanalintelligenz',chName:'Kanal',chPerfSumm:'Kanalleistungsübersicht',chRoas:'ROAS nach Kanal',chTrend:'Kanaltrend',chTrendKpi:'Kanalleistungstrend',clickChannelHint:'Kanalkarte klicken → 5-Sektionen-Analyse',clickForAnalysis:'Klicken → 5-Sektionen',clicks:'Klicks',connectChannels:'Werbekanäle verbinden',conv2:'4. Konversion',convCount:'Konversionen',convFunnel:'Konversionstrichter',convRate:'Konversionsrate',couponApplied:'Plangutschein angewendet!',couponIssued:'Gutschein ausgestellt!',crossModuleSummary:'Modulübergreifende Zusammenfassung',dismiss:'Verwerfen',dropOff:'Abbruch',enforced:'Durchgesetzt',engagement2:'2. Engagement',execAdSpend:'Werbeausgaben',fiveSectionAnalysis:'5-Sektionen-Analyse',frequency:'Häufigkeit',genderDist:'Geschlecht/Alter',GraphScore:'Graph Score',grossMargin:'Bruttomarge',impressions:'Impressionen',Influencer:'Influencer',info:'Info',inventoryValue:'Bestandswert',liveActivity:'Live-Aktivität',lowStockItems:'Niedriger Bestand',maleBuyer:'👨 Männlich',Marketing:'Marketing',moduleShortcuts:'Modulschnellzugriffe',netProfit:'Nettogewinn',noActivity:'Keine Aktivität',noChannelData:'Keine Kanaldaten',noSecurityIssues:'Keine Sicherheitsprobleme',noTrendData:'Keine Trenddaten',operatingProfit:'Betriebsgewinn',opProfit:'Betriebsgewinn',orders:'Bestellungen',pendingOrders:'Ausstehende Bestellungen',PriceOpt:'Preisoptimierung',protected:'Geschützt',purchaseCount:'Käufe',reach:'Reichweite',reachAwareness:'1. Reichweite',realTimeBlendedRoas:'Echtzeit-ROAS',Reconcile:'Abstimmung',regDist:'Regionale Verteilung',rev:'Umsatz',revRoi2:'5. Umsatz & ROI',secureStatus:'Sicher',securityAlert:'Sicherheitswarnung',securityMonitor:'Sicherheitsmonitor',sessions:'Sitzungen',settlementChs:'Abrechnungskanäle',signups:'Anmeldungen',spendBudget:'Ausgaben',spendDistribution:'Ausgabenverteilung',sysStatus:'Systemstatus',threatDetected:'Sicherheitsbedrohung erkannt',threatsDetected:'Bedrohungen erkannt',totalClicks:'Gesamtklicks',totalRev:'Gesamtumsatz',totalSpend:'Gesamtausgaben',totalStock:'Gesamtbestand',traffic2:'3. Traffic',videoViews:'Videoaufrufe',vsYesterday:'ggü. Gestern',warnings:'Warnungen',reviewSecurity:'Sicherheitspanel prüfen'},dashboard:{adSpend:'Werbeausgaben',avgOrder:'AOV',convRateLbl:'Konversionsrate',grossRevenue:'Gesamtumsatz',netROAS:'Netto-ROAS',totalOrders:'Gesamtbestellungen'},dashPeriod:{today:'Heute','7d':'7 Tage','14d':'14 Tage','30d':'30 Tage','90d':'90 Tage',custom:'Benutzerdefiniert',customRange:'Benutzerdef. Zeitraum',startDate:'Startdatum',endDate:'Enddatum',apply:'Anwenden'}},
zh:{dash:{achvRate:'达成率',active:'活跃',activeCampaigns:'活跃活动',activeCh:'活跃渠道',adRev:'广告收入',adSpend:'广告支出',ageDist:'年龄分布',aiAdAnal:'🤖 AI广告分析',AIPolicy:'AI策略',alertCount:'警报',Alerts:'警报',all:'全部',allChSummary:'全渠道摘要',analyticsModules:'分析模块',Attribution:'归因',avgCtr:'平均CTR',avgDuration:'平均时长',avgRoas:'综合ROAS',avgViewTime:'平均观看时间',blendedRoas:'综合ROAS',blocked:'已拦截',bounceRate:'跳出率',cartAdds:'加购',channelMix:'渠道收入组合',channelPerf:'📊 渠道绩效',chCount:'活跃渠道',chDetailTable:'渠道明细表',chIntelDesc1:'从渠道卡片或表格中，',chIntelReport:'渠道智能报告',chIntelTitle:'渠道智能',chName:'渠道',chPerfSumm:'渠道绩效摘要',chRoas:'各渠道ROAS',chTrend:'渠道趋势',chTrendKpi:'渠道绩效趋势',clickChannelHint:'点击渠道卡片→5区分析',clickForAnalysis:'点击→5区',clicks:'点击',connectChannels:'连接广告渠道查看数据',conv2:'4. 转化',convCount:'转化数',convFunnel:'转化漏斗',convRate:'转化率',couponApplied:'优惠券已应用！',couponIssued:'优惠券已发放！',crossModuleSummary:'跨模块摘要',dismiss:'关闭',dropOff:'流失',enforced:'已执行',engagement2:'2. 互动',execAdSpend:'广告支出',fiveSectionAnalysis:'5区分析',frequency:'频次',genderDist:'性别/年龄分布',GraphScore:'图谱评分',grossMargin:'毛利率',impressions:'曝光',Influencer:'网红',info:'信息',inventoryValue:'库存价值',liveActivity:'实时活动',lowStockItems:'低库存',maleBuyer:'👨 男性',Marketing:'营销',moduleShortcuts:'模块快捷方式',netProfit:'净利润',noActivity:'无活动',noChannelData:'暂无渠道数据',noSecurityIssues:'无安全问题',noTrendData:'暂无趋势数据',operatingProfit:'营业利润',opProfit:'营业利润',orders:'订单',pendingOrders:'待处理订单',PriceOpt:'价格优化',protected:'已保护',purchaseCount:'购买数',reach:'覆盖',reachAwareness:'1. 覆盖与认知',realTimeBlendedRoas:'实时综合ROAS',Reconcile:'对账',regDist:'地区分布',rev:'收入',revRoi2:'5. 收入与ROI',secureStatus:'安全',securityAlert:'安全警报',securityMonitor:'安全监控',sessions:'会话',settlementChs:'结算渠道',signups:'注册',spendBudget:'支出',spendDistribution:'支出分布',sysStatus:'系统状态',threatDetected:'检测到安全威胁',threatsDetected:'检测到威胁',totalClicks:'总点击',totalRev:'总收入',totalSpend:'总支出',totalStock:'总库存',traffic2:'3. 流量',videoViews:'视频播放',vsYesterday:'较昨日',warnings:'警告',reviewSecurity:'查看安全面板'},dashboard:{adSpend:'广告支出',avgOrder:'AOV',convRateLbl:'转化率',grossRevenue:'总收入',netROAS:'净ROAS',totalOrders:'总订单'},dashPeriod:{today:'今天','7d':'7天','14d':'14天','30d':'30天','90d':'90天',custom:'自定义',customRange:'自定义范围',startDate:'开始日期',endDate:'结束日期',apply:'应用'}},
};

function injectKeys(lang,data){
  const fp=p.join(dir,lang+'.js');
  if(!fs.existsSync(fp))return console.log('SKIP '+lang);
  let src=fs.readFileSync(fp,'utf8');
  let count=0;
  for(const[ns,keys]of Object.entries(data)){
    for(const[k,v]of Object.entries(keys)){
      // Try to find and replace existing English value
      const pat=new RegExp(`("${k}"\\s*:\\s*)"([^"]*)"`, 'g');
      const vEsc=JSON.stringify(v);
      let found=false;
      // Find within the namespace block
      const nsIdx=src.indexOf(`"${ns}"`);
      if(nsIdx<0){
        // Need to add entire namespace
        const expIdx=src.lastIndexOf('export default');
        if(expIdx>0){
          src=src.slice(0,expIdx)+`"${ns}": ${JSON.stringify(keys,null,2)},\n`+src.slice(expIdx);
          count+=Object.keys(keys).length;
          break; // whole namespace added
        }
        continue;
      }
      // Check if key exists in file at all within ~10000 chars after namespace
      const searchStart=nsIdx;
      const searchEnd=Math.min(src.length,nsIdx+15000);
      const block=src.substring(searchStart,searchEnd);
      const keyRegex=new RegExp(`"${k}"\\s*:\\s*"([^"]*)"`);
      const m=block.match(keyRegex);
      if(m){
        // Key exists - replace value if it's English (same as fallback or different from target)
        const oldVal=m[1];
        if(oldVal!==v){
          const fullMatch=m[0];
          const newMatch=`"${k}": ${vEsc}`;
          const pos=src.indexOf(fullMatch,searchStart);
          if(pos>=0){
            src=src.substring(0,pos)+newMatch+src.substring(pos+fullMatch.length);
            count++;
          }
        }
      } else {
        // Key missing - add after namespace opening brace
        const braceIdx=src.indexOf('{',nsIdx);
        if(braceIdx>0){
          src=src.substring(0,braceIdx+1)+`\n    "${k}": ${vEsc},`+src.substring(braceIdx+1);
          count++;
        }
      }
    }
  }
  fs.writeFileSync(fp,src,'utf8');
  console.log(`✅ ${lang}.js: ${count} keys updated/added`);
}

for(const[lang,data]of Object.entries(LANGS)){
  injectKeys(lang,data);
}
console.log('Batch done!');
