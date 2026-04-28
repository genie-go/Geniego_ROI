const fs=require('fs'),path=require('path'),DIR=path.join(__dirname,'src','i18n','locales');
const K={
ko:{tabAiDesign:"AI 디자인",aiEngineTitle:"AI 크리에이티브 디자인 엔진",aiEngineSub:"AI로 프리미엄 팝업 크리에이티브를 생성하세요",demoIsolation:"데모 환경 — 데이터가 운영서버와 완전 격리됩니다",
guideAiDesignName:"AI 디자인",guideAiDesignDesc:"14개 플랫폼 대응 AI 크리에이티브 자동 생성 및 이벤트 기간 설정",
guideStep8Title:"AI 디자인 엔진 사용",guideStep8Desc:"AI 디자인 탭에서 플랫폼, 테마, 콘텐츠를 입력하고 AI가 크리에이티브를 자동 생성합니다. 팝업, TikTok, Instagram 등 14개 플랫폼에 최적화된 사이즈로 생성됩니다.",
guideStep9Title:"이벤트 기간 설정",guideStep9Desc:"기간 한정 이벤트(플래시세일, 시즌, 생일)의 경우 시작일/종료일/타임존을 설정하여 해당 기간에만 팝업이 노출되도록 합니다.",
guideStep10Title:"크리에이티브 생성 & 미리보기",guideStep10Desc:"설정을 확인하고 AI 크리에이티브 생성 버튼을 클릭합니다. 생성된 결과를 미리보기에서 확인하고 마음에 들면 다운로드합니다.",
guideStep11Title:"A/B 테스트 설정",guideStep11Desc:"A/B 테스트 탭에서 두 개의 팝업 변형을 비교하여 어떤 디자인이 전환율이 높은지 데이터 기반으로 검증합니다.",
guideStep12Title:"글로벌 설정 최적화",guideStep12Desc:"설정 탭에서 이탈 감지, 비활성 감지, 모바일 최적화, 쿠키 정책, GDPR 동의 등 전역 설정을 최적화합니다.",
guideStep13Title:"라이브 테스트 실행",guideStep13Desc:"라이브 테스트 탭에서 실제 이탈 감지를 시뮬레이션하여 팝업 동작을 사전 검증합니다.",
guideStep14Title:"성과 모니터링",guideStep14Desc:"대시보드에서 노출수, 전환수, 활성/비활성 팝업 현황을 실시간 모니터링하고 성과가 낮은 팝업은 즉시 수정합니다.",
guideStep15Title:"배포 및 운영",guideStep15Desc:"모든 테스트를 완료한 팝업을 운영 사이트에 배포합니다. 데모 환경의 데이터는 운영으로 유입되지 않는 완전 격리 구조입니다.",
guideTip8:"AI 디자인 엔진에서 플랫폼을 먼저 선택하면 최적 해상도가 자동 설정됩니다.",
guideTip9:"데모/운영 데이터 격리가 활성화되어 있으므로 안심하고 테스트하세요.",
guideTip10:"이벤트 기간 탭에서 타임존을 정확히 설정하면 글로벌 캠페인에 효과적입니다."},
en:{tabAiDesign:"AI Design",aiEngineTitle:"AI Creative Design Engine",aiEngineSub:"Generate premium popup creatives with AI — optimized for all platforms",demoIsolation:"Demo environment — data is isolated from production",
guideAiDesignName:"AI Design",guideAiDesignDesc:"AI creative auto-generation for 14 platforms with event period settings",
guideStep8Title:"Use AI Design Engine",guideStep8Desc:"Enter platform, theme, and content in the AI Design tab. AI generates optimized creatives for 14 platforms including popup, TikTok, and Instagram.",
guideStep9Title:"Set Event Period",guideStep9Desc:"For time-limited events (flash sales, seasonal, birthday), set start/end dates and timezone so popups appear only during the campaign period.",
guideStep10Title:"Generate & Preview Creative",guideStep10Desc:"Review settings and click Generate AI Creative. Preview the result and download if satisfied.",
guideStep11Title:"Set Up A/B Tests",guideStep11Desc:"In the A/B Test tab, compare two popup variants to verify which design has higher conversion rates with data-driven validation.",
guideStep12Title:"Optimize Global Settings",guideStep12Desc:"In Settings, optimize exit detection, inactivity detection, mobile optimization, cookie policy, and GDPR consent.",
guideStep13Title:"Run Live Tests",guideStep13Desc:"In Live Test, simulate actual exit-intent detection to pre-verify popup behavior before deployment.",
guideStep14Title:"Monitor Performance",guideStep14Desc:"Monitor impressions, conversions, and active/inactive popup status in real-time on the dashboard. Fix underperforming popups immediately.",
guideStep15Title:"Deploy to Production",guideStep15Desc:"Deploy fully tested popups to your live site. Demo environment data is completely isolated from production through the Data Isolation Guard.",
guideTip8:"Select platform first in AI Design Engine — optimal resolution is set automatically.",
guideTip9:"Demo/production data isolation is active, so test freely without production contamination risk.",
guideTip10:"Set timezone accurately in the Event Period tab for effective global campaigns."},
ja:{tabAiDesign:"AIデザイン",aiEngineTitle:"AIクリエイティブデザインエンジン",aiEngineSub:"AIでプレミアムポップアップクリエイティブを生成",demoIsolation:"デモ環境 — データは本番と完全に分離されています",
guideAiDesignName:"AIデザイン",guideAiDesignDesc:"14プラットフォーム対応AIクリエイティブ自動生成",
guideStep8Title:"AIデザインエンジン使用",guideStep8Desc:"AIデザインタブでプラットフォーム、テーマ、コンテンツを入力します。",
guideStep9Title:"イベント期間設定",guideStep9Desc:"期間限定イベントの開始日、終了日、タイムゾーンを設定します。",
guideStep10Title:"クリエイティブ生成＆プレビュー",guideStep10Desc:"設定を確認し、AIクリエイティブ生成をクリックします。",
guideStep11Title:"A/Bテスト設定",guideStep11Desc:"A/Bテストタブで2つのバリエーションを比較します。",
guideStep12Title:"グローバル設定最適化",guideStep12Desc:"設定タブで離脱検知、モバイル最適化、GDPR同意等を設定します。",
guideStep13Title:"ライブテスト実行",guideStep13Desc:"ライブテストで実際の離脱検知をシミュレーションします。",
guideStep14Title:"パフォーマンス監視",guideStep14Desc:"ダッシュボードで表示数、コンバージョンをリアルタイム監視します。",
guideStep15Title:"本番展開",guideStep15Desc:"テスト済みのポップアップを本番サイトに展開します。",
guideTip8:"AIデザインエンジンでは最初にプラットフォームを選択してください。",
guideTip9:"デモ/本番データ分離が有効です。安心してテストできます。",
guideTip10:"イベント期間タブでタイムゾーンを正確に設定してください。"},
zh:{tabAiDesign:"AI设计",guideAiDesignName:"AI设计",guideAiDesignDesc:"14个平台AI创意自动生成",guideStep8Title:"使用AI设计引擎",guideStep8Desc:"在AI设计标签中输入平台、主题和内容。",guideStep9Title:"设置活动期间",guideStep9Desc:"为限时活动设置开始日期、结束日期和时区。",guideStep10Title:"生成并预览",guideStep10Desc:"确认设置后点击生成。",guideStep11Title:"设置A/B测试",guideStep11Desc:"在A/B测试标签中比较两个弹窗变体。",guideStep12Title:"优化全局设置",guideStep12Desc:"优化退出检测、移动端优化等设置。",guideStep13Title:"运行实时测试",guideStep13Desc:"模拟退出意图检测。",guideStep14Title:"监控性能",guideStep14Desc:"实时监控展示量和转化率。",guideStep15Title:"部署到生产",guideStep15Desc:"将测试完成的弹窗部署到正式站点。"},
};
const LANGS=['ko','en','ja','zh','zh-TW','es','fr','de','th','vi','id','pt','ru','ar','hi'];
let total=0;
LANGS.forEach(lang=>{
  const file=path.join(DIR,lang+'.js');
  if(!fs.existsSync(file))return;
  let src=fs.readFileSync(file,'utf8');
  const keys=K[lang]||K.en;
  const m=src.match(/"webPopup"\s*:\s*\{/);
  if(!m){console.log('skip '+lang);return;}
  const idx=m.index+m[0].length;
  let entries='';
  let cnt=0;
  Object.entries(keys).forEach(([k,v])=>{
    if(!src.includes('"'+k+'"')){
      entries+='"'+k+'":"'+v.replace(/"/g,'\\"')+'",';
      cnt++;
    }
  });
  if(cnt>0){
    src=src.slice(0,idx)+entries+src.slice(idx);
    fs.writeFileSync(file,src,'utf8');
    console.log('✅ '+lang+': '+cnt);
    total+=cnt;
  }
});
console.log('🎯 Total: '+total);
