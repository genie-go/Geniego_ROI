// [271차] 로드시점 동기 언어 감지 — i18n detectLang 과 동일 규칙(저장값 → navigator → ko).
//   module-level 로드시점 현지화(menuLabelI18n·chanI18n·demoUiI18n)가 t() 와 동일 언어를 쓰도록 통일.
const _SUPPORTED = { ko:1, en:1, ja:1, zh:1, "zh-TW":1, de:1, th:1, vi:1, id:1, es:1, fr:1, pt:1, ru:1, ar:1, hi:1 };

export function detectLangSync() {
  try {
    const saved = localStorage.getItem("genie_roi_lang");
    if (saved && _SUPPORTED[saved]) return saved;
    const navs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || "en"];
    for (const raw of navs) {
      const full = String(raw).toLowerCase().replace("_", "-");
      if (_SUPPORTED[full]) return full;
      const code = full.slice(0, 2);
      if (_SUPPORTED[code]) return code;
    }
  } catch (_) { /* ignore */ }
  return "ko";
}

export default detectLangSync;
