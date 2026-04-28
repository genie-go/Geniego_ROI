const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
const G={
ko:{guideStep7Title:"API 보안 및 인증 관리",guideStep7Desc:"OAuth 토큰, API 키의 보안 관리 및 정기적 갱신 절차를 설정합니다.",guideStep8Title:"자동 동기화 스케줄 설정",guideStep8Desc:"채널별 상품/주문/재고 자동 동기화 주기를 설정합니다.",guideStep9Title:"매출 분석 및 리포트",guideStep9Desc:"채널별 매출, 전환율, ROI를 분석하고 리포트를 생성합니다.",guideStep10Title:"A/B 테스트 및 가격 최적화",guideStep10Desc:"채널별 가격 전략을 A/B 테스트하여 최적 가격을 도출합니다.",guideStep11Title:"알림 및 모니터링 설정",guideStep11Desc:"재고 부족, 주문 이상, 동기화 오류 시 실시간 알림을 설정합니다.",guideStep12Title:"글로벌 확장 전략",guideStep12Desc:"해외 마켓플레이스 진출을 위한 다국어/다통화 설정을 구성합니다.",guideStep13Title:"데이터 보호 및 격리",guideStep13Desc:"운영/데모 데이터 격리를 확인하고 보안 정책을 적용합니다.",guideStep14Title:"모바일 대응 최적화",guideStep14Desc:"모바일 환경에서의 관리 인터페이스 최적화를 설정합니다.",guideStep15Title:"운영 배포 및 최종 점검",guideStep15Desc:"모든 설정을 검증하고 운영 환경에 배포합니다.",guideTip6:"채널별 수수료율을 정기적으로 확인하세요.",guideTip7:"재고 부족 알림 임계값을 채널별로 다르게 설정할 수 있습니다.",guideTip8:"API 토큰은 만료 전에 갱신하여 동기화 중단을 방지하세요.",guideTip9:"데모 환경에서 충분히 테스트한 후 운영에 적용하세요.",guideTip10:"글로벌 확장 시 현지 세금(VAT) 규정을 반드시 확인하세요.",demoIsolation:"데모 환경 — 데이터가 운영 환경과 격리되어 있습니다"},
en:{guideStep7Title:"API Security & Auth Management",guideStep7Desc:"Manage OAuth tokens and API keys securely with periodic renewal.",guideStep8Title:"Auto-Sync Schedule Setup",guideStep8Desc:"Configure automatic sync intervals for products, orders, and inventory per channel.",guideStep9Title:"Revenue Analytics & Reports",guideStep9Desc:"Analyze revenue, conversion rates, and ROI by channel.",guideStep10Title:"A/B Testing & Price Optimization",guideStep10Desc:"A/B test pricing strategies per channel.",guideStep11Title:"Alerts & Monitoring Setup",guideStep11Desc:"Set up real-time alerts for low stock and sync errors.",guideStep12Title:"Global Expansion Strategy",guideStep12Desc:"Configure multi-language/multi-currency settings.",guideStep13Title:"Data Protection & Isolation",guideStep13Desc:"Verify production/demo data isolation.",guideStep14Title:"Mobile Optimization",guideStep14Desc:"Optimize the management interface for mobile.",guideStep15Title:"Production Deploy & Final Check",guideStep15Desc:"Validate all settings and deploy to production.",guideTip6:"Regularly check commission rates per channel.",guideTip7:"Set different low-stock alert thresholds per channel.",guideTip8:"Renew API tokens before expiry.",guideTip9:"Test thoroughly in demo before production.",guideTip10:"Verify local VAT regulations when expanding globally.",demoIsolation:"Demo environment — data isolated from production"},
ar:{guideStep7Title:"أمان API وإدارة المصادقة",guideStep7Desc:"إدارة رموز OAuth ومفاتيح API بشكل آمن.",guideStep8Title:"إعداد المزامنة التلقائية",guideStep8Desc:"تكوين فترات المزامنة التلقائية لكل قناة.",guideStep9Title:"تحليل الإيرادات والتقارير",guideStep9Desc:"تحليل الإيرادات وعائد الاستثمار لكل قناة.",guideStep10Title:"اختبار A/B وتحسين الأسعار",guideStep10Desc:"اختبار استراتيجيات التسعير A/B لكل قناة.",guideStep11Title:"التنبيهات والمراقبة",guideStep11Desc:"إعداد تنبيهات فورية.",guideStep12Title:"استراتيجية التوسع العالمي",guideStep12Desc:"تكوين إعدادات متعددة اللغات/العملات.",guideStep13Title:"حماية البيانات والعزل",guideStep13Desc:"التحقق من عزل بيانات الإنتاج/العرض.",guideStep14Title:"تحسين الجوال",guideStep14Desc:"تحسين واجهة الإدارة للجوال.",guideStep15Title:"النشر والفحص النهائي",guideStep15Desc:"التحقق من جميع الإعدادات والنشر.",guideTip6:"تحقق بانتظام من معدلات العمولة.",guideTip7:"حدد عتبات تنبيه مختلفة لكل قناة.",guideTip8:"جدد رموز API قبل انتهاء صلاحيتها.",guideTip9:"اختبر في بيئة العرض قبل الإنتاج.",guideTip10:"تحقق من لوائح ضريبة القيمة المضافة المحلية.",demoIsolation:"بيئة تجريبية — البيانات معزولة عن الإنتاج"},
ja:{guideStep7Title:"APIセキュリティと認証管理",guideStep7Desc:"OAuthトークンとAPIキーを安全に管理します。",guideStep8Title:"自動同期スケジュール設定",guideStep8Desc:"チャネルごとの自動同期間隔を設定します。",guideStep9Title:"売上分析とレポート",guideStep9Desc:"チャネル別の売上とROIを分析します。",guideStep10Title:"A/Bテストと価格最適化",guideStep10Desc:"チャネルごとの価格戦略をA/Bテストします。",guideStep11Title:"アラートとモニタリング",guideStep11Desc:"リアルタイムアラートを設定します。",guideStep12Title:"グローバル展開戦略",guideStep12Desc:"多言語/多通貨設定を構成します。",guideStep13Title:"データ保護と分離",guideStep13Desc:"本番/デモデータの分離を確認します。",guideStep14Title:"モバイル最適化",guideStep14Desc:"モバイル向けにインターフェースを最適化します。",guideStep15Title:"本番デプロイと最終確認",guideStep15Desc:"すべての設定を検証しデプロイします。",guideTip6:"チャネル別手数料率を定期的に確認してください。",guideTip7:"チャネルごとに異なる在庫アラートしきい値を設定できます。",guideTip8:"APIトークンは期限前に更新してください。",guideTip9:"デモで十分にテストしてから本番に適用してください。",guideTip10:"グローバル展開時はVAT規制を確認してください。",demoIsolation:"デモ環境 — データは本番から分離されています"},
};
// Also add same keys for other languages with English fallback
['zh','zh-TW','es','fr','de','th','vi','id','pt','ru','hi'].forEach(l=>{if(!G[l])G[l]=G.en;});
let total=0;
Object.entries(G).forEach(([lang,keys])=>{
  const file=path.join(DIR,lang+'.js');
  if(!fs.existsSync(file))return;
  let src=fs.readFileSync(file,'utf8');
  const re=/"omniChannel"\s*:\s*\{/g;
  const matches=[];let m;while((m=re.exec(src))!==null)matches.push(m);
  if(matches.length===0)return;
  let cnt=0;
  for(let i=matches.length-1;i>=0;i--){
    const ins=matches[i].index+matches[i][0].length;
    let depth=1,pos=ins;
    while(depth>0&&pos<src.length){if(src[pos]==='{')depth++;if(src[pos]==='}')depth--;pos++;}
    const block=src.substring(ins,pos-1);
    let entries='';
    Object.entries(keys).forEach(([k,v])=>{
      if(!block.includes('"'+k+'"')){entries+='"'+k+'":"'+v.replace(/"/g,'\\"')+'",';cnt++;}
    });
    if(entries)src=src.slice(0,ins)+entries+src.slice(ins);
  }
  if(cnt>0){fs.writeFileSync(file,src,'utf8');console.log('✅ '+lang+': '+cnt);total+=cnt;}
});
console.log('🎯 Total: '+total);
