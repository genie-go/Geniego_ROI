/* [282차 R3] 발급 매뉴얼 실제 화면 캡처 — 채널별·단계별 스크린샷.
 *
 * 워크플로우: 발급 매뉴얼을 상세화할 때 CC가 사용자에게 해당 채널의 실제 인증/발급 화면 캡처를 요청하고,
 *   사용자가 제공하면 이미지를 frontend/public/manuals/{channel}/ 에 저장한 뒤 아래에 등록한다.
 *   화면은 UI 언어와 무관(동일 화면)하므로 이미지는 언어 독립, 캡션만 15개국 현지어.
 *
 * 구조: ISSUANCE_CAPTURES[channelKey] = [
 *   { step: <1-based 단계번호>, img: '/manuals/<channel>/<file>.png', cap: { ko:'', en:'', ... } }
 * ]
 *   같은 step 에 여러 캡처를 붙이려면 배열에 여러 항목을 넣는다(순서대로 렌더).
 *   cap 는 선택(없으면 이미지만). img 는 frontend/public 기준 절대경로.
 */

export const ISSUANCE_CAPTURES = {
  // 네이버 스마트스토어(커머스 API 센터) — 실제 캡처는 사용자 제공 후 아래에 등록.
  //   예) { step: 3, img: '/manuals/naver_smartstore/01-apicenter-login.png',
  //         cap: { ko: 'API 센터 로그인 화면', en: 'API Center login screen', ... } },
  naver_smartstore: [],

  // Twitch — 사용자 제공 실제 캡처(282차). 단계번호는 issuanceGuide.js 의 twitch 스텝(1-based)과 정합.
  twitch: [
    { step: 2, img: '/manuals/twitch/01-login.png',
      cap: { ko: 'dev.twitch.tv 개발자 콘솔 로그인 화면 — [Twitch 로그인] 클릭', en: 'dev.twitch.tv developer console login — click [Log in with Twitch]' } },
    { step: 3, img: '/manuals/twitch/02-console.png',
      cap: { ko: '개발자 콘솔 홈 — "응용 프로그램" 영역의 [내 응용 프로그램 등록] 클릭', en: 'Developer console home — click [Register Your Application] under Applications' } },
    { step: 5, img: '/manuals/twitch/03-register-form.png',
      cap: { ko: '응용 프로그램 등록 폼 — [OAuth 리디렉션 URL] 칸에 콜백 URL 입력 후 [추가](HTTPS 필수)', en: 'Register form — paste the callback URL into [OAuth Redirect URLs] and click [Add] (HTTPS required)' } },
    { step: 7, img: '/manuals/twitch/04-app-list.png',
      cap: { ko: '개발자 애플리케이션 목록 — [링크]에 리디렉션 URL 표시. [관리]에서 Client ID 확인·Secret 발급', en: 'Developer applications list — redirect URL shown under [Link]. Use [Manage] to view Client ID and generate the Secret' } },
  ],
};

/* 채널의 특정 단계(1-based)에 등록된 캡처 목록. 없으면 빈 배열. */
export function getStepCaptures(channelKey, stepNumber) {
  const arr = ISSUANCE_CAPTURES[channelKey];
  if (!Array.isArray(arr)) return [];
  return arr.filter((c) => Number(c.step) === Number(stepNumber));
}

/* 채널에 캡처가 하나라도 있는지. */
export function hasCaptures(channelKey) {
  const arr = ISSUANCE_CAPTURES[channelKey];
  return Array.isArray(arr) && arr.length > 0;
}

/* 캡션 현지화(lang → en → ko 폴백). */
export function capText(cap, lang) {
  if (!cap) return '';
  return cap[lang] || cap.en || cap.ko || '';
}
