/**
 * inject_guide_schedule_i18n.cjs — AI Guide + Schedule i18n keys
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'src', 'i18n', 'locales');

const KEYS = {
  ko: {
    "marketing.aiGuideTitle":"AI 디자인 크리에이티브 엔진 — 완전 가이드",
    "marketing.aiGuideSub":"크리에이티브 설정부터 멀티채널 배포까지 단계별 상세 안내",
    "marketing.aiGuideStepsTitle":"AI 디자인 — 단계별 워크플로우",
    "marketing.aiGuideStep1Title":"플랫폼 선택","marketing.aiGuideStep1Desc":"AI 디자인 탭에 진입하여 '플랫폼 & 사이즈' 섹션에서 타겟 플랫폼을 선택합니다. TikTok, Instagram, Meta, YouTube, 카카오톡, 웹 팝업 등 14개 플랫폼 중 원하는 채널을 클릭하면 자동으로 최적 해상도와 비율이 설정됩니다.",
    "marketing.aiGuideStep2Title":"테마 선택","marketing.aiGuideStep2Desc":"'테마 & 스타일' 섹션에서 캠페인 목적에 맞는 크리에이티브 테마를 선택합니다. 할인/세일, 웰컴, 플래시세일, 시즌, 럭셔리, 뉴스레터, 장바구니 복구, 생일, 게임화, 제품 런칭 등 10가지 테마가 제공됩니다.",
    "marketing.aiGuideStep3Title":"콘텐츠 작성","marketing.aiGuideStep3Desc":"'콘텐츠 & 카피' 섹션에서 헤드라인, 서브헤드라인, AI 이미지 프롬프트, CTA 버튼 텍스트를 입력합니다. AI 프롬프트에는 원하는 비주얼 스타일(예: 여름 해변, 럭셔리 골드)을 자세히 설명하세요.",
    "marketing.aiGuideStep4Title":"인터랙티브 설정","marketing.aiGuideStep4Desc":"'인터랙티브 & 트리거' 섹션에서 스핀-투-윈, 스크래치 카드, 퀴즈, 프로그레스 언락, 카운트다운, 스와이프 등 인터랙티브 광고 유형을 선택합니다. 팝업 트리거(이탈 의도, 스크롤 50%, 시간 지연 등)도 설정합니다.",
    "marketing.aiGuideStep5Title":"이벤트 기간 설정","marketing.aiGuideStep5Desc":"팝업/이벤트형 캠페인의 경우 '이벤트 기간' 섹션에서 시작일, 종료일, 타임존을 설정합니다. 기간 한정 프로모션(플래시세일, 시즌, 생일 등)에 필수적인 설정입니다.",
    "marketing.aiGuideStep6Title":"크리에이티브 생성","marketing.aiGuideStep6Desc":"'생성 & 미리보기' 섹션에서 구성 요약을 확인하고 'AI 크리에이티브 생성' 버튼을 클릭합니다. AI 엔진이 선택한 플랫폼, 테마, 콘텐츠를 기반으로 최적화된 크리에이티브를 자동 생성합니다.",
    "marketing.aiGuideStep7Title":"결과 미리보기","marketing.aiGuideStep7Desc":"생성된 크리에이티브를 미리보기로 확인합니다. 플랫폼별 사이즈, 비율, 테마 정보가 태그로 표시됩니다. 헤드라인, 서브헤드라인, CTA 버튼이 어떻게 표시되는지 확인합니다.",
    "marketing.aiGuideStep8Title":"다운로드","marketing.aiGuideStep8Desc":"만족스러운 결과물이면 '다운로드' 버튼을 클릭하여 PNG 파일로 저장합니다. 파일명은 자동으로 플랫폼_테마_타임스탬프 형식으로 생성됩니다.",
    "marketing.aiGuideStep9Title":"반복 수정","marketing.aiGuideStep9Desc":"결과가 마음에 들지 않으면 콘텐츠나 테마를 수정하고 다시 생성합니다. 최근 크리에이티브 히스토리에서 이전 버전을 클릭하여 비교할 수 있습니다. 최대 20개까지 히스토리가 보관됩니다.",
    "marketing.aiGuideStep10Title":"배포 및 활용","marketing.aiGuideStep10Desc":"완성된 크리에이티브를 각 광고 플랫폼(Meta Ads Manager, Google Ads, TikTok Ads 등)에 업로드하여 캠페인에 적용합니다. 웹 팝업의 경우 웹 팝업 관리 모듈에서 직접 배포할 수 있습니다.",
    "marketing.aiGuideTip1":"플랫폼을 먼저 정확히 선택하세요 — 각 플랫폼별로 최적화된 해상도로 최대 광고 효과를 얻을 수 있습니다.",
    "marketing.aiGuideTip2":"기간 한정 캠페인에는 이벤트 기간 탭을 활용하세요 — 플래시세일, 시즌 프로모션, 생일 이벤트에 필수입니다.",
    "marketing.guideTabAiDesignName":"AI 디자인","marketing.guideTabAiDesignDesc":"14개 플랫폼 대응 AI 크리에이티브 자동 생성, 인터랙티브 광고, 이벤트 기간 설정",
    "marketing.aiSectionSchedule":"이벤트 기간","marketing.aiScheduleTitle":"이벤트 기간 설정","marketing.aiScheduleEnable":"이벤트 기간 활성화","marketing.aiStartDate":"시작일","marketing.aiEndDate":"종료일","marketing.aiTimezone":"타임존","marketing.aiScheduleSummary":"스케줄 요약","marketing.aiDays":"일","marketing.aiScheduleOff":"스케줄 미설정 — 배포 즉시 활성화됩니다.",
  },
  en: {
    "marketing.aiGuideTitle":"AI Design Creative Engine — Complete Guide",
    "marketing.aiGuideSub":"Step-by-step instructions from creative setup to multi-channel deployment",
    "marketing.aiGuideStepsTitle":"AI Design — Step-by-Step Workflow",
    "marketing.aiGuideStep1Title":"Select Platform","marketing.aiGuideStep1Desc":"Enter the AI Design tab and choose your target platform in the 'Platform & Size' section. Select from 14 platforms including TikTok, Instagram, Meta, YouTube, KakaoTalk, Web Popup — optimal resolution and ratio are set automatically.",
    "marketing.aiGuideStep2Title":"Choose Theme","marketing.aiGuideStep2Desc":"In the 'Theme & Style' section, select a creative theme matching your campaign goals. 10 themes available: Discount/Sale, Welcome, Flash Sale, Seasonal, Luxury, Newsletter, Cart Recovery, Birthday, Gamified, Product Launch.",
    "marketing.aiGuideStep3Title":"Write Content","marketing.aiGuideStep3Desc":"In 'Content & Copy', enter your headline, subheadline, AI image prompt, and CTA button text. Describe your desired visual style in detail (e.g., summer beach sunset, luxury gold).",
    "marketing.aiGuideStep4Title":"Set Interactive","marketing.aiGuideStep4Desc":"In 'Interactive & Triggers', choose interactive ad types like Spin-to-Win, Scratch Card, Quiz, Progress Unlock, Countdown, or Swipe. Configure popup triggers (Exit Intent, Scroll 50%, Time Delay, etc.).",
    "marketing.aiGuideStep5Title":"Set Event Period","marketing.aiGuideStep5Desc":"For popup/event campaigns, set start date, end date, and timezone in the 'Event Period' section. Essential for time-limited promotions like flash sales, seasonal campaigns, and birthday events.",
    "marketing.aiGuideStep6Title":"Generate Creative","marketing.aiGuideStep6Desc":"In 'Generate & Preview', review your configuration summary and click 'Generate AI Creative'. The AI engine creates optimized creatives based on your selected platform, theme, and content.",
    "marketing.aiGuideStep7Title":"Preview Results","marketing.aiGuideStep7Desc":"Review the generated creative in the preview. Platform size, ratio, and theme info are displayed as tags. Check how your headline, subheadline, and CTA button appear.",
    "marketing.aiGuideStep8Title":"Download","marketing.aiGuideStep8Desc":"If satisfied, click 'Download' to save as a PNG file. Filename is auto-generated in platform_theme_timestamp format.",
    "marketing.aiGuideStep9Title":"Iterate & Refine","marketing.aiGuideStep9Desc":"If unsatisfied, modify content or theme and regenerate. Click previous versions in the creative history to compare. Up to 20 history items are retained.",
    "marketing.aiGuideStep10Title":"Deploy & Use","marketing.aiGuideStep10Desc":"Upload completed creatives to ad platforms (Meta Ads Manager, Google Ads, TikTok Ads, etc.). For web popups, deploy directly through the Web Popup management module.",
    "marketing.aiGuideTip1":"Select the correct platform first — each platform has optimized dimensions for maximum ad performance.",
    "marketing.aiGuideTip2":"Use the Event Period tab for time-limited campaigns — flash sales, seasonal promotions, and birthday events.",
    "marketing.guideTabAiDesignName":"AI Design","marketing.guideTabAiDesignDesc":"AI creative auto-generation for 14 platforms, interactive ads, event period settings",
    "marketing.aiSectionSchedule":"Event Period","marketing.aiScheduleTitle":"Event Period Settings","marketing.aiScheduleEnable":"Enable scheduled event period","marketing.aiStartDate":"Start Date","marketing.aiEndDate":"End Date","marketing.aiTimezone":"Timezone","marketing.aiScheduleSummary":"Schedule Summary","marketing.aiDays":" days","marketing.aiScheduleOff":"No schedule set — creative will be active immediately upon deployment.",
  },
  ja: {
    "marketing.aiGuideTitle":"AIデザインクリエイティブエンジン — 完全ガイド",
    "marketing.aiGuideSub":"クリエイティブ設定からマルチチャネル展開までのステップバイステップガイド",
    "marketing.aiGuideStepsTitle":"AIデザイン — ステップバイステップワークフロー",
    "marketing.aiGuideStep1Title":"プラットフォーム選択","marketing.aiGuideStep1Desc":"AIデザインタブに入り、「プラットフォーム＆サイズ」セクションでターゲットプラットフォームを選択します。",
    "marketing.aiGuideStep2Title":"テーマ選択","marketing.aiGuideStep2Desc":"「テーマ＆スタイル」セクションでキャンペーン目的に合ったクリエイティブテーマを選択します。",
    "marketing.aiGuideStep3Title":"コンテンツ作成","marketing.aiGuideStep3Desc":"「コンテンツ＆コピー」でヘッドライン、サブヘッドライン、AIプロンプト、CTAボタンを入力します。",
    "marketing.aiGuideStep4Title":"インタラクティブ設定","marketing.aiGuideStep4Desc":"「インタラクティブ＆トリガー」でスピンホイール、スクラッチカードなどのインタラクティブ広告タイプを選択します。",
    "marketing.aiGuideStep5Title":"イベント期間設定","marketing.aiGuideStep5Desc":"ポップアップ/イベントキャンペーンの場合、「イベント期間」で開始日、終了日、タイムゾーンを設定します。",
    "marketing.aiGuideStep6Title":"クリエイティブ生成","marketing.aiGuideStep6Desc":"「生成＆プレビュー」で設定を確認し、「AIクリエイティブ生成」をクリックします。",
    "marketing.aiGuideStep7Title":"結果プレビュー","marketing.aiGuideStep7Desc":"生成されたクリエイティブをプレビューで確認します。",
    "marketing.aiGuideStep8Title":"ダウンロード","marketing.aiGuideStep8Desc":"満足できる結果であれば「ダウンロード」をクリックしてPNGファイルとして保存します。",
    "marketing.aiGuideStep9Title":"反復修正","marketing.aiGuideStep9Desc":"不満な場合はコンテンツやテーマを修正して再生成します。履歴で以前のバージョンと比較できます。",
    "marketing.aiGuideStep10Title":"展開・活用","marketing.aiGuideStep10Desc":"完成したクリエイティブを各広告プラットフォームにアップロードしてキャンペーンに適用します。",
    "marketing.guideTabAiDesignName":"AIデザイン","marketing.guideTabAiDesignDesc":"14プラットフォーム対応AIクリエイティブ自動生成",
    "marketing.aiSectionSchedule":"イベント期間","marketing.aiScheduleTitle":"イベント期間設定","marketing.aiScheduleEnable":"イベント期間を有効化","marketing.aiStartDate":"開始日","marketing.aiEndDate":"終了日","marketing.aiTimezone":"タイムゾーン","marketing.aiScheduleSummary":"スケジュール概要","marketing.aiDays":"日間","marketing.aiScheduleOff":"スケジュール未設定 — 展開後すぐに有効化されます。",
  },
  zh: {
    "marketing.aiGuideTitle":"AI设计创意引擎 — 完整指南",
    "marketing.aiGuideSub":"从创意设置到多渠道部署的分步说明",
    "marketing.aiGuideStepsTitle":"AI设计 — 分步工作流程",
    "marketing.aiGuideStep1Title":"选择平台","marketing.aiGuideStep1Desc":"进入AI设计标签，在'平台和尺寸'部分选择目标平台。",
    "marketing.aiGuideStep2Title":"选择主题","marketing.aiGuideStep2Desc":"在'主题和风格'部分选择与活动目标匹配的创意主题。",
    "marketing.aiGuideStep3Title":"编写内容","marketing.aiGuideStep3Desc":"在'内容和文案'中输入标题、副标题、AI图像提示词和CTA按钮文字。",
    "marketing.aiGuideStep4Title":"设置互动","marketing.aiGuideStep4Desc":"在'互动和触发器'中选择转盘、刮刮卡、问答等互动广告类型。",
    "marketing.aiGuideStep5Title":"设置活动期间","marketing.aiGuideStep5Desc":"对于弹窗/活动广告，在'活动期间'中设置开始日期、结束日期和时区。",
    "marketing.aiGuideStep6Title":"生成创意","marketing.aiGuideStep6Desc":"在'生成和预览'中确认配置摘要，点击'生成AI创意'。",
    "marketing.aiGuideStep7Title":"预览结果","marketing.aiGuideStep7Desc":"在预览中查看生成的创意。",
    "marketing.aiGuideStep8Title":"下载","marketing.aiGuideStep8Desc":"满意后点击'下载'保存为PNG文件。",
    "marketing.aiGuideStep9Title":"迭代修改","marketing.aiGuideStep9Desc":"不满意可修改内容或主题后重新生成。",
    "marketing.aiGuideStep10Title":"部署使用","marketing.aiGuideStep10Desc":"将完成的创意上传到各广告平台。",
    "marketing.guideTabAiDesignName":"AI设计","marketing.guideTabAiDesignDesc":"14个平台AI创意自动生成",
    "marketing.aiSectionSchedule":"活动期间","marketing.aiScheduleTitle":"活动期间设置","marketing.aiScheduleEnable":"启用活动期间","marketing.aiStartDate":"开始日期","marketing.aiEndDate":"结束日期","marketing.aiTimezone":"时区","marketing.aiScheduleSummary":"日程摘要","marketing.aiDays":"天","marketing.aiScheduleOff":"未设置日程 — 部署后立即生效。",
  },
};

const LANGS = ['ko','en','ja','zh','zh-TW','es','fr','de','th','vi','id','pt','ru','ar','hi'];
let total = 0;

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');
  const keys = KEYS[lang] || KEYS.en;
  let added = 0;
  Object.entries(keys).forEach(([dotKey, val]) => {
    const parts = dotKey.split('.');
    const ns = parts[0];
    const k = parts.slice(1).join('.');
    const escaped = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const entry = `"${k}":"${escaped}"`;
    if (src.includes(`"${k}"`)) return;
    const nsPattern = new RegExp(`"${ns}"\\s*:\\s*\\{`);
    const match = nsPattern.exec(src);
    if (match) {
      const idx = match.index + match[0].length;
      src = src.slice(0, idx) + entry + ',' + src.slice(idx);
      added++;
    }
  });
  if (added > 0) {
    fs.writeFileSync(file, src, 'utf8');
    console.log(`✅ ${lang}: ${added} keys`);
    total += added;
  } else {
    console.log(`⏭️  ${lang}: skip`);
  }
});
console.log(`\n🎯 Total: ${total} keys`);
