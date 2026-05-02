const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

// Detailed guide descriptions per language
const GUIDE_KEYS={
ko:{
guideStep1Desc:"팝업 관리 탭에서 '새 팝업 만들기' 버튼을 클릭합니다. 제목, 본문, CTA(행동유도) 버튼 텍스트, 할인율을 입력합니다. AI 자동 디자인 기능을 사용하면 6가지 테마(할인쿠폰/뉴스레터/장바구니이탈/환영/타임세일/시즌이벤트) 중 선택하여 주제에 맞는 최적의 팝업을 이미지와 함께 자동 생성할 수 있습니다. Instagram, TikTok, 카카오 채널 등 플랫폼별 사이즈로도 생성 가능합니다.",
guideStep2Desc:"4가지 트리거 유형 중 최적의 것을 선택합니다: ① Exit-Intent(마우스 이탈) - 사용자의 마우스가 브라우저 상단으로 이동할 때 자동 트리거, ② 시간 지연 - 페이지 체류 후 N초 뒤 트리거, ③ 스크롤 깊이 - 페이지를 N% 이상 스크롤했을 때 트리거, ④ 비활성 감지 - N초 이상 조작이 없을 때 트리거. 각 트리거의 지연 시간도 세밀하게 조절 가능합니다.",
guideStep3Desc:"라이브 미리보기 탭에서 실제 Exit-Intent 동작을 테스트할 수 있습니다. '이탈 감지 시작' 버튼을 클릭한 후 마우스를 브라우저 상단(주소창 방향)으로 빠르게 이동하면 3초 이내에 팝업이 자동으로 트리거됩니다. 탭 전환으로도 테스트 가능하며, 세션별 전환 횟수도 실시간으로 확인됩니다.",
guideStep4Desc:"동일한 트리거 조건에서 서로 다른 디자인의 팝업 2개(Variant A/B)를 배치하여 CTR(클릭율)과 CVR(전환율)을 비교합니다. 최소 1,000회 이상 노출 시 통계적 유의성이 확보되며, AI가 베이지안 신뢰도를 기반으로 자동으로 최적 변형을 추천합니다. 승리한 변형은 자동 배포할 수 있습니다.",
guideStep5Desc:"성과 분석 탭에서 각 캠페인의 핵심 지표를 실시간으로 모니터링합니다: 총 노출수, 클릭수, 전환수는 물론 CTR(클릭율), CVR(전환율)까지 한눈에 확인 가능합니다. GlobalDataContext를 통해 다른 메뉴와도 실시간 동기화되며, 새로고침 없이도 데이터가 자동 갱신됩니다.",
guideStep6Desc:"A/B 테스트에서 승리한 변형을 자동으로 전체 트래픽에 배포합니다. 설정 탭에서 쿠키 중복 차단(24시간), GDPR 동의 관리, 모바일 스크롤 트리거 등 세밀한 옵션을 조정하여 팝업 성과를 지속적으로 최적화합니다. 연동허브에서 등록된 API 채널 정보가 자동으로 반영됩니다.",
guideTip1:"Exit-Intent 트리거는 장바구니 이탈 복구에 가장 효과적이며, 평균 3.2%의 CVR 향상을 기대할 수 있습니다.",
guideTip2:"할인율은 10~15%가 전환율 대비 수익률이 가장 높습니다. 30% 이상은 수익에 오히려 부정적일 수 있습니다.",
guideTip3:"쿠폰 만료 타이머(카운트다운)를 표시하면 긴급성이 강조되어 전환율이 30% 이상 증가합니다.",
guideTip4:"모바일에서는 Exit-Intent(마우스 이탈)가 작동하지 않으므로, 하단 바운스 스크롤 트리거가 더 효과적입니다.",
guideTip5:"A/B 테스트는 최소 1,000회 노출, 최소 7일 이상 진행해야 통계적으로 유의미한 결과를 얻을 수 있습니다.",
},
en:{
guideStep1Desc:"Click 'Create New Popup' in the Popup Manager tab. Enter the title, body text, CTA button text, and discount rate. Using the AI Auto-Design feature, you can select from 6 themes (Discount Coupon/Newsletter/Cart Abandonment/Welcome/Flash Sale/Seasonal Event) to automatically generate an optimized popup with matching images. You can also generate designs sized for Instagram, TikTok, or Kakao Channel.",
guideStep2Desc:"Choose the optimal trigger from 4 types: ① Exit-Intent — auto-triggers when the user's mouse moves toward the browser address bar; ② Time Delay — triggers after N seconds on page; ③ Scroll Depth — triggers when the user scrolls past N%; ④ Inactivity Detection — triggers after N seconds of no interaction. Fine-tune the delay time for each trigger type.",
guideStep3Desc:"Test real Exit-Intent behavior in the Live Preview tab. Click 'Start Detection', then quickly move your mouse toward the top of the browser (address bar area). A popup will automatically appear within 3 seconds. You can also test by switching browser tabs. Session conversion counts are tracked in real-time.",
guideStep4Desc:"Place two popup variants (A/B) with different designs under the same trigger conditions to compare CTR and CVR. Statistical significance is achieved after 1,000+ impressions. AI automatically recommends the optimal variant based on Bayesian confidence scoring. Winning variants can be auto-deployed.",
guideStep5Desc:"Monitor key metrics for each campaign in real-time on the Performance tab: total impressions, clicks, conversions, CTR, and CVR at a glance. Data syncs in real-time with other menus via GlobalDataContext — no page refresh needed for automatic data updates.",
guideStep6Desc:"Automatically deploy A/B test winning variants to 100% of traffic. Fine-tune settings like cookie deduplication (24-hour suppression), GDPR consent management, and mobile scroll triggers in the Settings tab for continuous optimization. API channel data from the Integration Hub is automatically reflected.",
guideTip1:"Exit-Intent triggers are most effective for cart abandonment recovery, with an average CVR improvement of +3.2%.",
guideTip2:"Discount rates of 10-15% provide the best conversion-to-revenue ratio. Rates above 30% may negatively impact profitability.",
guideTip3:"Displaying a coupon expiry countdown timer increases conversions by over 30% through urgency psychology.",
guideTip4:"On mobile devices, Exit-Intent (mouse exit) doesn't work — bottom bounce scroll triggers are more effective instead.",
guideTip5:"A/B tests require at least 1,000 impressions over a minimum of 7 days for statistically significant results.",
},
ja:{
guideStep1Desc:"ポップアップ管理タブで「新規ポップアップ作成」をクリックします。タイトル、本文、CTAボタンテキスト、割引率を入力します。AIオートデザイン機能で6つのテーマ（割引クーポン/ニュースレター/カート離脱/ウェルカム/フラッシュセール/シーズンイベント）から選択し、テーマに合った最適なポップアップを画像付きで自動生成できます。Instagram、TikTok、カカオチャネル対応サイズでも生成可能です。",
guideStep2Desc:"4つのトリガータイプから最適なものを選択：①Exit-Intent（マウス離脱）②時間遅延 - N秒滞在後③スクロール深度 - N%スクロール時④非アクティブ検知 - N秒操作なし時。各トリガーの遅延時間も細かく調整可能です。",
guideStep3Desc:"ライブプレビュータブで実際のExit-Intent動作をテストできます。「検知開始」ボタンをクリック後、マウスをブラウザ上部に素早く移動すると3秒以内にポップアップが自動トリガーされます。タブ切替でもテスト可能で、セッション別コンバージョン数もリアルタイム確認できます。",
guideStep4Desc:"同一トリガー条件で異なるデザインの2つのポップアップ（A/B）を配置し、CTR/CVRを比較します。1,000回以上の表示で統計的有意性が確保され、AIがベイジアン信頼度に基づき最適バリアントを自動推奨します。",
guideStep5Desc:"パフォーマンスタブで各キャンペーンの主要指標をリアルタイムモニタリング：総表示回数、クリック数、コンバージョン数、CTR、CVRを一覧で確認可能。GlobalDataContextにより他メニューとリアルタイム同期されます。",
guideStep6Desc:"A/Bテスト勝利バリアントを全トラフィックに自動配信。設定タブでクッキー重複防止（24時間）、GDPR同意管理、モバイルスクロールトリガーなどを調整して継続最適化します。",
},
zh:{
guideStep1Desc:"在弹窗管理中点击'创建新弹窗'。输入标题、正文、CTA按钮文字和折扣率。使用AI自动设计功能，从6个主题（折扣券/订阅/购物车挽留/欢迎/限时促销/季节活动）中选择，自动生成带图片的最优弹窗。还支持Instagram、TikTok、Kakao频道专用尺寸。",
guideStep2Desc:"从4种触发类型中选择：①退出意图 - 鼠标移向地址栏时自动触发 ②延时 - 停留N秒后 ③滚动深度 - 滚动N%时 ④不活跃检测 - N秒无操作时。可精确调整延迟时间。",
guideStep3Desc:"在实时预览中测试Exit-Intent。点击'开始检测'后将鼠标快速移向浏览器顶部，3秒内弹窗自动出现。切换标签页也可触发，实时统计转化次数。",
guideStep4Desc:"在相同触发条件下放置两个不同设计的弹窗(A/B)比较CTR和CVR。1000+次展示后获得统计显著性，AI基于贝叶斯置信度自动推荐最优变体。",
guideStep5Desc:"在效果分析中实时监控各活动指标：总展示数、点击数、转化数、CTR、CVR。通过GlobalDataContext与其他菜单实时同步，无需刷新页面。",
guideStep6Desc:"自动部署A/B测试获胜变体。在设置中调整Cookie去重(24小时)、GDPR同意管理、移动端滚动触发等选项持续优化。",
}
};
// zh-TW from zh, others from en
GUIDE_KEYS['zh-TW']={...GUIDE_KEYS.zh};
GUIDE_KEYS.de={...GUIDE_KEYS.en};
GUIDE_KEYS.th={...GUIDE_KEYS.en};
GUIDE_KEYS.vi={...GUIDE_KEYS.en};
GUIDE_KEYS.id={...GUIDE_KEYS.en};

function replaceKeyValue(code, key, newValue) {
  const keyStr = `${key}:"`;
  let idx = code.indexOf(keyStr);
  if (idx < 0) return code;
  
  const openQ = idx + keyStr.length - 1;
  let closeQ = -1;
  for (let i = openQ + 1; i < code.length; i++) {
    if (code[i] === '\\') { i++; continue; }
    if (code[i] === '"') { closeQ = i; break; }
  }
  if (closeQ < 0) return code;
  
  return code.substring(0, openQ + 1) + newValue.replace(/"/g, '\\"') + code.substring(closeQ);
}

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  const keys = GUIDE_KEYS[lang] || GUIDE_KEYS.en;
  
  Object.entries(keys).forEach(([k, v]) => {
    code = replaceKeyValue(code, k, v);
  });
  
  fs.writeFileSync(file, code, 'utf8');
  try {
    const fn = new Function(code.replace('export default', 'return'));
    const o = fn();
    console.log(`✅ ${lang}: guideStep1="${(o.webPopup?.guideStep1Desc||'').substring(0,40)}..."`);
  } catch (e) {
    console.log(`❌ ${lang}: ${e.message.substring(0, 80)}`);
  }
});
