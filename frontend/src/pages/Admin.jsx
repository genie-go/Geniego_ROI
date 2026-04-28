import React from "react";
import { Navigate } from "react-router-dom";

function Admin() {
  // Admin 페이지는 Topbar 프로필 드롭다운에서 관리
  // 사이드바 "시스템 관리" > "글로벌 설정"에서 접근 시 대시보드로 리다이렉트
  return <Navigate to="/dashboard" replace />;
}

export default Admin;
