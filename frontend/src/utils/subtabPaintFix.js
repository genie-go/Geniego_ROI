import { useEffect } from 'react';

/*
 * 199차 — 서브탭 비활성 글자 페인트 무효화 방어.
 *
 * 증상: 밝은 테마에서 .gx-subtab-bar 의 비활성(투명 배경) 탭 라벨이 Chrome 초기
 *       페인트에서 글자를 건너뛰어 흰색처럼 전혀 안 보임. computed color 는 정상
 *       (#374151 등)이고 어떤 CSS(색/fill/display/layout/transform/animation)로도
 *       페인트되지 않으나, element.style 을 직접 건드리면(=강제 style recalc) 즉시
 *       정상 페인트된다. 활성 탭은 불투명 배경/보더가 있어 항상 정상 페인트.
 *
 * 방어: 마운트·탭전환 직후 비활성 라벨의 -webkit-text-fill-color 를 "현재 계산된
 *       color 값"으로 인라인 지정 → 시각 변화 없이 강제 리페인트. React 는 이 라벨에
 *       webkitTextFillColor 를 관리하지 않으므로(인라인은 color 만) 충돌 없음.
 */
export function useSubtabPaintFix(tab) {
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        try {
          document.querySelectorAll('.gx-subtab-bar button div').forEach(d => {
            const c = getComputedStyle(d).color;
            if (c) { d.style.webkitTextFillColor = c; d.style.color = c; }
          });
        } catch (e) { /* noop */ }
      });
    });
    return () => { cancelAnimationFrame(raf1); if (raf2) cancelAnimationFrame(raf2); };
  }, [tab]);
}
