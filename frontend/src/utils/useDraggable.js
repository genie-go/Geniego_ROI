import { useCallback, useRef, useState } from 'react';

/**
 * useDraggable — 플로팅 위젯(챗봇 런처·가이드 버튼 등)을 사용자가 자유롭게 드래그해 배치하도록.
 *
 * ★배경: 우하단 고정(position:fixed) 위젯들이 일부 페이지에서 선택 메뉴·버튼을 가려 조작을 막았다.
 *   "적절한 곳으로 이동 + 자유 배치" 요구 → 드래그 이동 + 위치 영속.
 * ★디바이스 로컬 프리퍼런스: 위치는 테마/사이드바/언어와 같은 device-local UI 설정이므로 raw localStorage
 *   에 저장한다(테넌트 격리 대상 아님 — reference_ui_preference_device_local_boundary 정합).
 * ★클릭 vs 드래그: 이동 임계값(5px) 미만이면 클릭으로 간주(위젯 열기 정상 동작). 드래그면 클릭 억제.
 *
 * 사용:
 *   const drag = useDraggable('genie_assistant_pos');
 *   <button onPointerDown={drag.onPointerDown}
 *           onClick={() => { if (drag.wasDragged()) return; open(); }}
 *           onDoubleClick={drag.reset}
 *           style={{ position:'fixed', right:22, bottom:22, cursor:'grab', touchAction:'none', ...drag.style }} />
 */
export function useDraggable(storageKey) {
  const [pos, setPos] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (s && Number.isFinite(s.left) && Number.isFinite(s.top)) return s;
    } catch { /* 프라이빗 모드/파싱 실패 → 기본 위치 */ }
    return null;
  });
  const ref = useRef({ down: false, moved: false, sx: 0, sy: 0, bl: 0, bt: 0, w: 0, h: 0 });

  const onPointerDown = useCallback((e) => {
    if (e.button != null && e.button !== 0) return; // 좌클릭/터치만
    const rect = e.currentTarget.getBoundingClientRect();
    ref.current = { down: true, moved: false, sx: e.clientX, sy: e.clientY, bl: rect.left, bt: rect.top, w: rect.width, h: rect.height };

    const onMove = (ev) => {
      if (!ref.current.down) return;
      const dx = ev.clientX - ref.current.sx, dy = ev.clientY - ref.current.sy;
      if (!ref.current.moved && Math.abs(dx) + Math.abs(dy) < 5) return; // 임계값 미만=클릭
      ref.current.moved = true;
      let left = ref.current.bl + dx, top = ref.current.bt + dy;
      // 뷰포트 밖으로 사라지지 않게 클램프
      left = Math.max(4, Math.min(window.innerWidth - ref.current.w - 4, left));
      top = Math.max(4, Math.min(window.innerHeight - ref.current.h - 4, top));
      setPos({ left, top });
    };
    const onUp = () => {
      ref.current.down = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (ref.current.moved) {
        setPos((cur) => { try { if (cur) localStorage.setItem(storageKey, JSON.stringify(cur)); } catch { /* 저장 실패 무시 */ } return cur; });
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [storageKey]);

  // 클릭 핸들러에서 호출 — 방금 드래그였으면 true(그리고 플래그 리셋). 드래그 후 클릭 오발 방지.
  const wasDragged = useCallback(() => {
    const m = ref.current.moved;
    ref.current.moved = false;
    return m;
  }, []);

  // 더블클릭 등으로 기본 위치 복원.
  const reset = useCallback(() => {
    setPos(null);
    try { localStorage.removeItem(storageKey); } catch { /* 무시 */ }
  }, [storageKey]);

  const style = pos ? { left: `${pos.left}px`, top: `${pos.top}px`, right: 'auto', bottom: 'auto' } : {};
  return { style, onPointerDown, wasDragged, reset, dragged: !!pos };
}
