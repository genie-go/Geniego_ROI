import React from "react";
import { Navigate } from "react-router-dom";

/**
 * SubscriptionPricing — 169차 P5 정리.
 *
 * 이전 58L hardcoded mock 페이지 (Current Plan: Enterprise, Seats: 12/20 등).
 * 168차 USD/Paddle 정책 정합 신규 admin 페이지 = /admin/plan-pricing (PlanPricing.jsx).
 * 본 페이지는 중복 제거 차원의 redirect 만 수행. mock 데이터 절대 표시 안 함.
 *
 * 사용자가 /subscription-pricing 으로 진입할 일 없음 (route 미등록).
 * 잔존 외부 link 또는 옛 bookmark 대응용 fallback.
 */
export default function SubscriptionPricing() {
  return <Navigate to="/admin/plan-pricing" replace />;
}
