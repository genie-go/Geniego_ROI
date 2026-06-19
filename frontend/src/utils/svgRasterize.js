/**
 * [Track B] SVG 마크업 → PNG data URL 클라이언트 래스터화 (브라우저 canvas).
 *
 * 배경: AI 디자인 스튜디오(ClaudeAI /v422/ai/campaign-ad-design)는 <svg> 벡터 마크업을 생성하는데,
 *   광고 매체(Meta /adimages 등)는 래스터(PNG/JPEG base64)만 업로드 가능하다. 서버에는 이미지 변환
 *   도구(Imagick/GD/rsvg)가 전혀 없어 서버 래스터화가 불가하므로, SVG 를 저장하기 직전 브라우저에서
 *   canvas 로 PNG 로 변환한다. backend loadDesign 은 svg 컬럼이 data:image/*;base64 면 image_b64 를
 *   추출해 매체 업로드에 사용한다(무변경).
 *
 * 안전: SVG 는 서버에서 sanitize(script·foreignObject·on핸들러·외부 href 제거)되어 외부 리소스가 없으므로
 *   blob URL → Image → canvas 가 same-origin 으로 동작(canvas tainted 아님 → toDataURL 가능).
 *
 * 입력이 SVG 마크업('<svg' 시작)이 아니면(이미 data:image 또는 빈값) 원본 그대로 반환(무해 passthrough).
 * 변환 실패 시에도 원본 반환(graceful — 최악의 경우 기존 동작=링크 크리에이티브 폴백).
 *
 * @param {string} svgMarkup  '<svg ...>...</svg>' 또는 data:image/* 또는 ''
 * @param {number} [maxW=1080] viewBox 부재 시 기본 너비
 * @param {number} [maxH=1080] viewBox 부재 시 기본 높이
 * @returns {Promise<string>}  PNG data URL 또는 원본
 */
export async function svgToPngDataUrl(svgMarkup, maxW = 1080, maxH = 1080) {
  if (typeof svgMarkup !== 'string') return svgMarkup;
  const s = svgMarkup.trim();
  if (s.indexOf('<svg') !== 0) return svgMarkup; // 이미 래스터(data:image) 또는 빈값 → passthrough
  if (typeof document === 'undefined' || typeof Image === 'undefined') return svgMarkup; // 비브라우저

  try {
    // 크기: viewBox(0 0 W H) 우선, 없으면 width/height 속성, 없으면 인자 기본.
    let w = maxW, h = maxH;
    const vb = /viewBox\s*=\s*["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i.exec(s);
    if (vb) { w = Math.round(parseFloat(vb[1])); h = Math.round(parseFloat(vb[2])); }
    else {
      const wm = /\bwidth\s*=\s*["']?([\d.]+)/i.exec(s);
      const hm = /\bheight\s*=\s*["']?([\d.]+)/i.exec(s);
      if (wm) w = Math.round(parseFloat(wm[1]));
      if (hm) h = Math.round(parseFloat(hm[1]));
    }
    if (!(w > 0) || !(h > 0)) { w = maxW; h = maxH; }
    // 과대 캔버스 방지(메모리·매체 한도)
    w = Math.min(w, 2048); h = Math.min(h, 2048);

    const svg = s.indexOf('xmlns=') === -1
      ? s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      : s;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            // 투명 배경 → 흰 배경(광고 표준, JPEG 변환 시 검정 방지)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
          } catch (e) { reject(e); }
        };
        img.onerror = () => reject(new Error('svg image load failed'));
        img.src = url;
      });
      return (typeof dataUrl === 'string' && dataUrl.indexOf('data:image/') === 0) ? dataUrl : svgMarkup;
    } finally {
      try { URL.revokeObjectURL(url); } catch {}
    }
  } catch {
    return svgMarkup; // 실패 시 원본(기존 동작 보존)
  }
}

export default svgToPngDataUrl;
