const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
const G={
ko:{guideStep9Title:"API 보안 키 관리",guideStep9Desc:"채널 API 인증키를 안전하게 관리하고 정기적으로 갱신합니다.",guideStep10Title:"매출 분석 대시보드 활용",guideStep10Desc:"채널별 매출, 수수료, 순이익을 분석하고 리포트를 생성합니다.",guideStep11Title:"A/B 가격 테스트 실행",guideStep11Desc:"채널별 가격 전략을 A/B 테스트하여 최적 가격을 도출합니다.",guideStep12Title:"알림 및 모니터링 설정",guideStep12Desc:"동기화 오류, 재고 부족, 가격 변동 시 실시간 알림을 설정합니다.",guideStep13Title:"데이터 보호 및 격리",guideStep13Desc:"운영/데모 데이터 격리를 확인하고 보안 정책을 적용합니다.",guideStep14Title:"모바일 최적화",guideStep14Desc:"모바일 환경에서의 카탈로그 관리 인터페이스를 최적화합니다.",guideStep15Title:"운영 배포 및 최종 점검",guideStep15Desc:"모든 설정을 검증하고 운영 환경에 배포합니다.",guideTip6:"카테고리 매핑은 채널별 기준이 다르므로 꼼꼼히 설정하세요.",guideTip7:"재고 정책을 채널별로 다르게 설정하여 품절 위험을 줄이세요.",guideTip8:"API 토큰은 만료 전에 갱신하여 동기화 중단을 방지하세요.",guideTip9:"데모 환경에서 충분히 테스트한 후 운영에 적용하세요.",guideTip10:"글로벌 확장 시 현지 세금(VAT) 규정을 반드시 확인하세요."},
en:{guideStep9Title:"API Security Key Management",guideStep9Desc:"Manage channel API authentication keys securely and renew them periodically.",guideStep10Title:"Revenue Analytics Dashboard",guideStep10Desc:"Analyze revenue, commission, and net profit by channel and generate reports.",guideStep11Title:"A/B Price Testing",guideStep11Desc:"A/B test pricing strategies per channel to determine optimal pricing.",guideStep12Title:"Alerts & Monitoring",guideStep12Desc:"Set up real-time alerts for sync errors, low stock, and price changes.",guideStep13Title:"Data Protection & Isolation",guideStep13Desc:"Verify production/demo data isolation and apply security policies.",guideStep14Title:"Mobile Optimization",guideStep14Desc:"Optimize catalog management interface for mobile environments.",guideStep15Title:"Production Deploy & Final Check",guideStep15Desc:"Validate all settings and deploy to the production environment.",guideTip6:"Category mappings differ by channel — configure them carefully.",guideTip7:"Set different inventory policies per channel to reduce stockout risk.",guideTip8:"Renew API tokens before expiry to prevent sync interruptions.",guideTip9:"Test thoroughly in demo before applying to production.",guideTip10:"Verify local VAT regulations when expanding globally."},
ja:{guideStep9Title:"APIセキュリティキー管理",guideStep9Desc:"チャネルAPI認証キーを安全に管理し定期的に更新します。",guideStep10Title:"売上分析ダッシュボード",guideStep10Desc:"チャネル別の売上、手数料、純利益を分析しレポートを生成します。",guideStep11Title:"A/B価格テスト",guideStep11Desc:"チャネルごとの価格戦略をA/Bテストします。",guideStep12Title:"アラートとモニタリング",guideStep12Desc:"リアルタイムアラートを設定します。",guideStep13Title:"データ保護と分離",guideStep13Desc:"本番/デモデータの分離を確認します。",guideStep14Title:"モバイル最適化",guideStep14Desc:"モバイル向けに最適化します。",guideStep15Title:"本番デプロイと最終確認",guideStep15Desc:"すべての設定を検証しデプロイします。",guideTip6:"カテゴリマッピングはチャネルごとに異なります。",guideTip7:"チャネルごとに在庫ポリシーを設定してください。",guideTip8:"APIトークンは期限前に更新してください。",guideTip9:"デモで十分テストしてから本番に適用してください。",guideTip10:"グローバル展開時はVAT規制を確認してください。"},
ar:{guideStep9Title:"إدارة مفاتيح أمان API",guideStep9Desc:"إدارة مفاتيح مصادقة API للقناة بشكل آمن وتجديدها دورياً.",guideStep10Title:"لوحة تحليل الإيرادات",guideStep10Desc:"تحليل الإيرادات والعمولات وصافي الربح لكل قناة.",guideStep11Title:"اختبار A/B للأسعار",guideStep11Desc:"اختبار استراتيجيات التسعير A/B لكل قناة.",guideStep12Title:"التنبيهات والمراقبة",guideStep12Desc:"إعداد تنبيهات فورية لأخطاء المزامنة.",guideStep13Title:"حماية البيانات والعزل",guideStep13Desc:"التحقق من عزل بيانات الإنتاج/العرض.",guideStep14Title:"تحسين الجوال",guideStep14Desc:"تحسين واجهة إدارة الكتالوج للجوال.",guideStep15Title:"النشر والفحص النهائي",guideStep15Desc:"التحقق من جميع الإعدادات والنشر.",guideTip6:"تعيينات الفئات تختلف حسب القناة.",guideTip7:"حدد سياسات مخزون مختلفة لكل قناة.",guideTip8:"جدد رموز API قبل انتهاء صلاحيتها.",guideTip9:"اختبر في بيئة العرض قبل الإنتاج.",guideTip10:"تحقق من لوائح ضريبة القيمة المضافة المحلية."},
};
['zh','zh-TW','es','fr','de','th','vi','id','pt','ru','hi'].forEach(l=>{if(!G[l])G[l]=G.en;});
let total=0;
Object.entries(G).forEach(([lang,keys])=>{
  const file=path.join(DIR,lang+'.js');
  if(!fs.existsSync(file))return;
  let src=fs.readFileSync(file,'utf8');
  const re=/"catalogSync"\s*:\s*\{/g;
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
