// [271차] 데모 채널 페이지 모듈상수(템플릿/대화/캠페인명 등 표시 데이터) 15개국 실시간 현지화.
//   WhatsApp/Kakao/Instagram/SMS 등 페이지의 module-level DEMO_* 상수는 컴포넌트 밖이라 t() 스코프가
//   없다. 한글 원본을 스냅샷하고 reactiveLocalize 레지스트리에 등록 → 언어변경(새로고침 없이) 즉시
//   'demoui::<한글>' 오버레이로 in-place 재치환된다. status/id 등 로직 필드는 영문이라 무영향.
import _DEMO_UI_I18N from './demoUiI18n.json';
import { registerRelocalize, snapshot, applyDeep, currentLang } from './reactiveLocalize.js';

/** 단일 한글 문자열을 현재 언어로 반환(반응형 — 렌더마다 호출 시 언어변경 즉시 반영). 번역부재/ko는 원문. */
export function localizeStr(ko) {
  const lang = currentLang();
  const T = lang !== 'ko' ? (_DEMO_UI_I18N[lang] || null) : null;
  return (T && T['demoui::' + ko]) || ko;
}

/** 데모 표시데이터 객체/배열을 언어변경에 반응하도록 등록(in-place). 원본 반환. */
export function localizeDeep(obj) {
  if (!obj) return obj;
  const orig = snapshot(obj);
  registerRelocalize((lang) => {
    const T = lang !== 'ko' ? (_DEMO_UI_I18N[lang] || null) : null;
    applyDeep(obj, orig, (ko) => (T ? T['demoui::' + ko] : null));
  });
  return obj;
}

export default localizeDeep;
