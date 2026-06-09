import React from "react";
import { Navigate } from "react-router-dom";

/**
 * SupplierPortal — 207차: 미구현 영문 셸(가짜 "System Operational"·하드코딩 KPI) 제거.
 * 공급사/발주 기능은 공급망 관리(/supply-chain)의 Suppliers·PO 탭으로 통합.
 * (사이드바 미등록 라우트였으며, 직접 URL 진입 시 가짜 셸이 노출되던 것을 정상 페이지로 리다이렉트)
 */
export default function SupplierPortal() {
  return <Navigate to="/supply-chain" replace />;
}
