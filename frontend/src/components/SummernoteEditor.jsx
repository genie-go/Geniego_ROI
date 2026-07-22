import React, { useEffect, useRef } from "react";

/*
 * [현 차수] 제품 상세내용 WYSIWYG 에디터 — Summernote(lite) 래퍼.
 *  - jQuery + summernote-lite 를 useEffect 안에서 동적 import → 이 에디터가 마운트될 때만 로드(초기 번들 무영향).
 *  - value(HTML) ↔ onChange(HTML) 제어. 이미지 붙여넣기/업로드는 base64 data-URL 로 인라인(별도 스토리지 불요).
 */
export default function SummernoteEditor({ value = "", onChange, height = 320, placeholder = "" }) {
  const elRef = useRef(null);
  const $ref = useRef(null);       // jQuery instance
  const readyRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const lastHtmlRef = useRef(value);
  onChangeRef.current = onChange;

  useEffect(() => {
    let destroyed = false;
    (async () => {
      try {
        const jqMod = await import("jquery");
        const $ = jqMod.default || jqMod;
        window.$ = window.jQuery = $;
        await import("summernote/dist/summernote-lite.min.css");
        await import("summernote/dist/summernote-lite.min.js");
        if (destroyed || !elRef.current) return;
        $ref.current = $;
        const $el = $(elRef.current);
        $el.summernote({
          placeholder,
          height,
          disableDragAndDrop: false,
          toolbar: [
            ["style", ["style"]],
            ["font", ["bold", "italic", "underline", "strikethrough", "clear"]],
            ["fontsize", ["fontsize"]],
            ["color", ["color"]],
            ["para", ["ul", "ol", "paragraph"]],
            ["table", ["table"]],
            ["insert", ["link", "picture", "video", "hr"]],
            ["view", ["fullscreen", "codeview", "help"]],
          ],
          callbacks: {
            onChange: (contents) => { lastHtmlRef.current = contents; if (onChangeRef.current) onChangeRef.current(contents); },
            onImageUpload: (files) => {
              // base64 인라인(외부 스토리지 없이 상세HTML에 직접 삽입)
              Array.from(files || []).forEach((file) => {
                if (!file.type || !file.type.startsWith("image/")) return;
                if (file.size > 3 * 1024 * 1024) { try { $el.summernote("createRange"); } catch (e) { /* 실패 무시(best-effort) */ } return; }
                const reader = new FileReader();
                reader.onload = (ev) => { try { $el.summernote("insertImage", ev.target.result); } catch (e) { /* 실패 무시(best-effort) */ } };
                reader.readAsDataURL(file);
              });
            },
          },
        });
        if (value) { try { $el.summernote("code", value); } catch (e) { /* 실패 무시(best-effort) */ } }
        readyRef.current = true;
      } catch (e) {
        // 에디터 로드 실패 시 — 아래 fallback textarea 가 노출됨(readyRef=false 유지).
      }
    })();
    return () => {
      destroyed = true;
      try { if ($ref.current && elRef.current) $ref.current(elRef.current).summernote("destroy"); } catch (e) { /* 실패 무시(best-effort) */ }
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 외부에서 value 가 바뀌면(초기 로드 등) 에디터 내용 동기화(사용자 입력과 충돌 방지 위해 다를 때만).
  useEffect(() => {
    if (readyRef.current && $ref.current && elRef.current && value !== lastHtmlRef.current) {
      try { $ref.current(elRef.current).summernote("code", value || ""); lastHtmlRef.current = value; } catch (e) { /* 실패 무시(best-effort) */ }
    }
  }, [value]);

  return (
    <div>
      <div ref={elRef} />
      {/* 에디터 로드 전/실패 시 최소한의 폴백(제어 textarea) — 접근성·무회귀 */}
      <noscript>
        <textarea defaultValue={value} style={{ width: "100%", minHeight: 160 }} />
      </noscript>
    </div>
  );
}
