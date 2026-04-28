const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const DETAILED={
ko:{
guideStep1Desc:"팝업 관리 탭에서 '새 팝업 만들기' 버튼을 클릭합니다. 제목, 본문, CTA(행동유도) 버튼 텍스트, 할인율을 입력합니다. AI 자동 디자인 기능을 사용하면 6가지 테마(할인쿠폰/뉴스레터/장바구니이탈/환영/타임세일/시즌이벤트) 중 선택하여 주제에 맞는 최적의 팝업을 이미지와 함께 자동 생성할 수 있습니다. Instagram, TikTok, 카카오 채널 등 플랫폼별 사이즈로도 생성 가능합니다. 자체 제작한 이미지를 직접 업로드하여 팝업에 적용할 수도 있습니다.",
guideStep2Desc:"4가지 트리거 유형 중 최적의 것을 선택합니다: ① Exit-Intent(마우스 이탈) - 사용자의 마우스가 브라우저 상단으로 이동할 때 자동 트리거 ② 시간 지연 - 페이지 체류 후 N초 뒤 트리거 ③ 스크롤 깊이 - 페이지를 N% 이상 스크롤했을 때 트리거 ④ 비활성 감지 - N초 이상 조작이 없을 때 트리거. 각 트리거의 지연 시간도 세밀하게 조절 가능합니다.",
guideStep3Desc:"라이브 미리보기 탭에서 실제 Exit-Intent 동작을 테스트합니다. '이탈 감지 시작' 버튼을 클릭한 후 마우스를 브라우저 상단(주소창 방향)으로 빠르게 이동하면 3초 이내에 팝업이 자동으로 트리거됩니다. 탭 전환으로도 테스트 할 수 있고, 세션별 전환 횟수도 실시간으로 확인됩니다.",
guideStep4Desc:"동일한 트리거 조건에서 서로 다른 디자인의 팝업 2개(Variant A/B)를 배치하여 CTR(클릭율)과 CVR(전환율)을 비교합니다. 최소 1,000회 이상 노출 시 통계적 유의성이 확보되며, AI가 베이지안 신뢰도를 기반으로 최적 변형을 자동 추천합니다.",
guideStep5Desc:"성과 분석 탭에서 각 캠페인의 핵심 지표를 실시간으로 모니터링합니다: 총 노출수, 클릭수, 전환수는 물론 CTR, CVR까지 한눈에 확인 가능합니다. GlobalDataContext를 통해 다른 메뉴와도 실시간 동기화됩니다.",
guideStep6Desc:"A/B 테스트에서 승리한 변형을 자동으로 전체 트래픽에 배포합니다. 설정 탭에서 쿠키 중복 차단(24시간), GDPR 동의 관리, 모바일 스크롤 트리거 등 세밀한 옵션을 조정하여 팝업 성과를 지속적으로 최적화합니다.",
guideTip1:"Exit-Intent 트리거는 장바구니 이탈 복구에 가장 효과적이며, 평균 3.2%의 CVR 향상을 기대할 수 있습니다.",
guideTip2:"할인율은 10~15%가 전환율 대비 수익률이 가장 높습니다. 30% 이상은 수익에 부정적일 수 있습니다.",
guideTip3:"쿠폰 만료 타이머(카운트다운)를 표시하면 긴급성이 강조되어 전환율이 30% 이상 증가합니다.",
guideTip4:"모바일에서는 Exit-Intent가 작동하지 않으므로, 하단 바운스 스크롤 트리거가 더 효과적입니다.",
guideTip5:"A/B 테스트는 최소 1,000회 노출, 최소 7일 이상 진행해야 통계적으로 유의미한 결과를 얻을 수 있습니다.",
uploadCustom:"직접 만든 팝업 등록",uploadCustomDesc:"자체 제작한 이미지를 업로드하여 팝업 또는 광고 마케팅용 콘텐츠를 등록합니다.",uploadImage:"이미지 업로드",uploadDragDrop:"이미지를 드래그하거나 클릭하여 업로드",uploadFormats:"지원: PNG, JPG, GIF, SVG (최대 5MB)",uploadPreview:"미리보기",uploadApply:"팝업에 적용",uploadRemove:"이미지 제거",
},
en:{
guideStep1Desc:"Click 'Create New Popup' in the Popup Manager tab. Enter title, body, CTA button text, and discount rate. Use AI Auto-Design to choose from 6 themes (Discount/Newsletter/Cart Abandonment/Welcome/Flash Sale/Seasonal) and auto-generate optimized popups with images. Supports Instagram, TikTok, and Kakao Channel dimensions. You can also upload your own custom-made images directly.",
guideStep2Desc:"Choose from 4 trigger types: ① Exit-Intent — auto-triggers when mouse moves to browser top ② Time Delay — triggers after N seconds on page ③ Scroll Depth — triggers at N% scroll ④ Inactivity — triggers after N seconds idle. Fine-tune delay for each type.",
guideStep3Desc:"Test Exit-Intent in the Live Preview tab. Click 'Start Detection', move mouse to browser top — popup appears within 3 seconds. Tab switching also triggers popups. Session conversions tracked in real-time.",
guideStep4Desc:"Place 2 popup variants (A/B) under the same trigger to compare CTR and CVR. After 1,000+ impressions, AI recommends the optimal variant using Bayesian confidence scoring.",
guideStep5Desc:"Monitor campaign KPIs in real-time: impressions, clicks, conversions, CTR, and CVR. Auto-syncs with other modules via GlobalDataContext — no refresh needed.",
guideStep6Desc:"Auto-deploy winning A/B variants to 100% traffic. Fine-tune cookie deduplication (24h), GDPR consent, and mobile scroll triggers in Settings for continuous optimization.",
guideTip1:"Exit-Intent triggers are most effective for cart recovery, averaging +3.2% CVR improvement.",
guideTip2:"10-15% discount rates offer the best conversion-to-revenue ratio. Over 30% may hurt profitability.",
guideTip3:"Displaying a coupon countdown timer increases conversions by 30%+ through urgency.",
guideTip4:"On mobile, Exit-Intent doesn't work — use bottom bounce scroll triggers instead.",
guideTip5:"A/B tests need 1,000+ impressions over 7+ days for statistical significance.",
uploadCustom:"Register Custom Popup",uploadCustomDesc:"Upload your own custom-made images for popup or ad marketing content.",uploadImage:"Upload Image",uploadDragDrop:"Drag & drop or click to upload image",uploadFormats:"Supported: PNG, JPG, GIF, SVG (max 5MB)",uploadPreview:"Preview",uploadApply:"Apply to Popup",uploadRemove:"Remove Image",
},
ja:{
guideStep1Desc:"ポップアップ管理で'新規作成'をクリック。タイトル、本文、CTAボタン、割引率を入力。AIデザインで6テーマから選択し画像付きポップアップを自動生成。Instagram/TikTok/カカオ対応サイズも可能。自作画像のアップロードも可能です。",
guideStep2Desc:"4つのトリガーから選択：①Exit-Intent ②時間遅延 ③スクロール深度 ④非アクティブ検知。遅延時間を細かく調整可能。",
guideStep3Desc:"ライブプレビューでExit-Intentをテスト。「検知開始」後マウスを上部に移動すると3秒以内にポップアップが表示。タブ切替でもテスト可能。",
guideStep4Desc:"A/Bバリアント2つを同一トリガーで配置しCTR/CVRを比較。1,000回+表示でAIが最適バリアントを推奨。",
guideStep5Desc:"パフォーマンスタブで表示数、クリック、コンバージョン、CTR、CVRをリアルタイムモニタリング。GlobalDataContextで他メニューと同期。",
guideStep6Desc:"A/Bテスト勝者を全トラフィックに自動配信。クッキー制御、GDPR、モバイルトリガーで継続最適化。",
guideTip1:"Exit-Intentはカート離脱回復に最も効果的（平均CVR +3.2%）。",guideTip2:"割引率10-15%が最適な収益比。",guideTip3:"カウントダウン表示で30%+コンバージョン増加。",guideTip4:"モバイルではスクロールトリガーが効果的。",guideTip5:"A/Bテストは1,000回+、7日+で統計的有意性確保。",
uploadCustom:"カスタムポップアップ登録",uploadCustomDesc:"自作画像をアップロードしてポップアップや広告コンテンツに使用。",uploadImage:"画像アップロード",uploadDragDrop:"ドラッグ＆ドロップまたはクリック",uploadFormats:"対応: PNG, JPG, GIF, SVG (最大5MB)",uploadPreview:"プレビュー",uploadApply:"ポップアップに適用",uploadRemove:"画像を削除",
},
zh:{
guideStep1Desc:"在弹窗管理点击'创建新弹窗'，输入标题、正文、CTA按钮和折扣率。AI自动设计支持6个主题自动生成带图片弹窗。支持Instagram/TikTok/Kakao尺寸。也可上传自制图片。",
guideStep2Desc:"4种触发器：①退出意图 ②延时 ③滚动深度 ④不活跃检测。可精确调整延迟。",
guideStep3Desc:"实时预览中测试Exit-Intent。点击开始检测后移动鼠标到顶部，3秒内弹窗出现。",
guideStep4Desc:"放置A/B两个变体比较CTR/CVR。1000+展示后AI推荐最优变体。",
guideStep5Desc:"效果分析中实时监控展示、点击、转化、CTR、CVR。通过GlobalDataContext同步。",
guideStep6Desc:"自动部署A/B获胜变体。设置中调整Cookie/GDPR/移动触发持续优化。",
guideTip1:"Exit-Intent对购物车挽留最有效（平均+3.2% CVR）。",guideTip2:"10-15%折扣率收益比最优。",guideTip3:"倒计时提升30%+转化。",guideTip4:"移动端用滚动触发更有效。",guideTip5:"A/B测试需1000+展示、7+天。",
uploadCustom:"注册自定义弹窗",uploadCustomDesc:"上传自制图片用于弹窗或广告营销。",uploadImage:"上传图片",uploadDragDrop:"拖拽或点击上传",uploadFormats:"支持: PNG, JPG, GIF, SVG (最大5MB)",uploadPreview:"预览",uploadApply:"应用到弹窗",uploadRemove:"删除图片",
}
};
DETAILED['zh-TW']={...DETAILED.zh,uploadCustom:"註冊自訂彈窗",uploadCustomDesc:"上傳自製圖片用於彈窗或廣告行銷。",uploadImage:"上傳圖片",uploadDragDrop:"拖曳或點擊上傳",uploadApply:"套用到彈窗",uploadRemove:"刪除圖片"};
DETAILED.de={...DETAILED.en,uploadCustom:"Eigenes Popup registrieren",uploadImage:"Bild hochladen",uploadApply:"Auf Popup anwenden",uploadRemove:"Bild entfernen"};
DETAILED.th={...DETAILED.en,uploadCustom:"ลงทะเบียนป๊อปอัพ",uploadImage:"อัปโหลดรูปภาพ",uploadApply:"ใช้กับป๊อปอัพ",uploadRemove:"ลบรูปภาพ"};
DETAILED.vi={...DETAILED.en,uploadCustom:"Đăng ký Popup tùy chỉnh",uploadImage:"Tải ảnh lên",uploadApply:"Áp dụng",uploadRemove:"Xóa ảnh"};
DETAILED.id={...DETAILED.en,uploadCustom:"Daftar Popup Kustom",uploadImage:"Unggah Gambar",uploadApply:"Terapkan",uploadRemove:"Hapus Gambar"};

function findBlockEnd(code,startBrace){let d=0,s=false,e=false;for(let i=startBrace;i<code.length;i++){const c=code[i];if(e){e=false;continue}if(c==='\\'&&s){e=true;continue}if(s){if(c==='"')s=false;continue}if(c==='"'){s=true;continue}if(c==='{')d++;if(c==='}'){d--;if(d===0)return i}}return -1}

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  const keys = DETAILED[lang] || DETAILED.en;
  
  // Remove ALL webPopup blocks, rebuild clean
  const allEntries = {};
  
  // Extract existing webPopup entries
  let wpIdx = code.indexOf('webPopup:{');
  while (wpIdx >= 0) {
    const braceStart = wpIdx + 9;
    const braceEnd = findBlockEnd(code, braceStart);
    if (braceEnd < 0) break;
    const inner = code.substring(braceStart + 1, braceEnd);
    
    // Parse key-value pairs
    let i = 0;
    while (i < inner.length) {
      // Find key
      const keyMatch = inner.substring(i).match(/^([a-zA-Z_]\w*):/);
      if (!keyMatch) { i++; continue; }
      const key = keyMatch[1];
      i += keyMatch[0].length;
      
      // Find value (quoted string)
      if (inner[i] === '"') {
        let j = i + 1;
        while (j < inner.length) {
          if (inner[j] === '\\') { j += 2; continue; }
          if (inner[j] === '"') break;
          j++;
        }
        const val = inner.substring(i + 1, j);
        allEntries[key] = val;
        i = j + 1;
      } else { i++; }
      // Skip comma
      if (i < inner.length && inner[i] === ',') i++;
    }
    
    // Remove this block
    let rmStart = wpIdx;
    if (rmStart > 0 && code[rmStart - 1] === ',') rmStart--;
    code = code.substring(0, rmStart) + code.substring(braceEnd + 1);
    wpIdx = code.indexOf('webPopup:{');
  }
  
  // Override with detailed keys
  Object.entries(keys).forEach(([k, v]) => {
    allEntries[k] = v.replace(/"/g, '\\"');
  });
  
  // Build block
  const entries = Object.entries(allEntries).map(([k, v]) => `${k}:"${v}"`).join(',');
  const block = `webPopup:{${entries}}`;
  
  // Insert before last }
  const lastBrace = code.lastIndexOf('}');
  code = code.substring(0, lastBrace) + ',' + block + code.substring(lastBrace);
  
  fs.writeFileSync(file, code, 'utf8');
  try {
    const fn = new Function(code.replace('export default', 'return'));
    const o = fn();
    const wp = o.webPopup || {};
    console.log(`✅ ${lang}: ${Object.keys(wp).length} keys, step1=${(wp.guideStep1Desc||'').length}c, upload=${!!wp.uploadCustom}`);
  } catch (e) { console.log(`❌ ${lang}: ${e.message.substring(0,80)}`); }
});
