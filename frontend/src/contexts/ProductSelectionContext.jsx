import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { tScopedKey, tChannelName } from '../utils/tenantStorage.js';

/**
 * [현 차수] 전역 상품 선택 동기화 SSOT — "특정 상품을 선택하면 대시보드·관련 메뉴가 그 상품으로 동시 동기화".
 *   기존 단일소스 동기화 엔진과 동일 철학: 한 곳에서 선택 → tenant-scoped persist + BroadcastChannel 로
 *   같은 tenant 의 모든 탭/뷰가 즉시 반영. selectedProduct=null 이면 전체(필터 해제).
 *   product 형태: { sku, name } (최소). 소비측은 sku 로 자기 데이터를 필터/하이라이트.
 */
const Ctx = createContext({ selectedProduct: null, setSelectedProduct: () => {}, clearProduct: () => {} });

export function ProductSelectionProvider({ children }) {
  const [selectedProduct, setSP] = useState(() => {
    try { const raw = localStorage.getItem(tScopedKey('genie_selected_product')); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  });
  const chRef = useRef(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      chRef.current = new BroadcastChannel(tChannelName('genie_product_select'));
      chRef.current.onmessage = (e) => { if (e.data?.type === 'PRODUCT_SELECT') setSP(e.data.product || null); };
    } catch { /* BroadcastChannel 미지원 환경 무시 */ }
    return () => { try { chRef.current?.close(); } catch { /* BroadcastChannel 정리 실패 무시 */ } };
  }, []);

  const setSelectedProduct = useCallback((p) => {
    const prod = p && p.sku ? { sku: String(p.sku), name: String(p.name || p.sku) } : null;
    setSP(prod);
    try {
      if (prod) localStorage.setItem(tScopedKey('genie_selected_product'), JSON.stringify(prod));
      else localStorage.removeItem(tScopedKey('genie_selected_product'));
    } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
    try { chRef.current?.postMessage({ type: 'PRODUCT_SELECT', product: prod }); } catch { /* 실패 무시(best-effort) */ }
    // 동일 탭 내 비-구독 컴포넌트도 깨우도록 커스텀 이벤트(기존 genie:data-refresh 패턴과 동형).
    try { window.dispatchEvent(new CustomEvent('genie:product-select', { detail: prod })); } catch { /* 이벤트 디스패치 실패 무시 */ }
  }, []);

  const clearProduct = useCallback(() => setSelectedProduct(null), [setSelectedProduct]);

  return (
    <Ctx.Provider value={{ selectedProduct, setSelectedProduct, clearProduct }}>
      {children}
    </Ctx.Provider>
  );
}

export const useProductSelection = () => useContext(Ctx);
