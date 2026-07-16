# ADR — Customer Identity Production Cutover, Rollback & DR (EPIC 05-D Part 2)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (전환 프레임워크·Rollback·DR 설계. 비파괴 — 코드변경 0). Canonical Cutover는 Engine 업그레이드+Feature Flag+Kill Switch+consent identity+Wrong-target 구현 후.
- **근거**: [`../customer-profile/CUSTOMER_PRODUCTION_READINESS.md`](../customer-profile/CUSTOMER_PRODUCTION_READINESS.md) + Part 1 + GeniegoROI 실 인프라.

## 결정 (핵심)
1. **정직**: 기존 고객 엔진 라이브(legacy)·Canonical 업그레이드 미구현 → **Canonical 전 항목 BLOCKED_PENDING_IMPLEMENTATION·Production Active 0**. 라이브 legacy는 계속 운영.
2. **실 인프라 매핑**: Version Routing=/vNNN·Rollback=dist.bak+Unmerge(CRM:913)·**Feature Flag/Kill Switch/Auto Merge Kill Switch=부재→신설**(구현 선결).
3. **★라이브 위험**: phone/kakao 자동병합(resolveIdentitiesForTenant)이 **Dry Run/Kill Switch 없이 이미 라이브** → Restricted Auto Merge 게이트로 소급 편입(Kill Switch·Daily Limit·Sampling 부여).
4. **일괄 전환 금지**·**Auto Merge 최후**(Read-only→Manual Merge→Restricted Auto Link→Restricted Auto Merge)·Write/Read Path 분리·Match Rule/Model/Consent 정책 Cutover 중 고정.
5. **Canary=대표성 실 Tenant+Source Account**(Demo 단독 금지)·Merge Cooldown·**Wrong-target Prevention Cutover 선결**.
6. **Identity Safety SLO(Cross-Tenant Link/Merge/Wrong-target/Consent Withdrawn/Deleted 실행=0)는 별도 Critical Incident**(일반 Error Budget 상쇄 금지).
7. **DR/Backup 실제 테스트**(Backup Restore 후 삭제 Profile 억제·Auto Merge Kill Switch)·Consent/삭제 RPO/RTO 엄격.

## 무후퇴·영구 규칙(§82)
전환 순서: Final Audit→Readiness→Ingestion/Normalization/Match Shadow→360 Read Compare→Canary Read→Manual Merge Canary→Restricted Auto Link→Restricted Auto Merge→Segment/Audience Preview→CRM/AI/Recommendation→Automation Preview→제한 실행→Stabilization→Certification→Legacy Deprecation. Match Rule/Threshold/Model/Consent 정책 변경+Cutover 동시 금지·Kill Switch 없는 실행 금지.

## 결과
전환 프레임워크·Rollback·DR 설계 확정(Canonical Production Active 0·구현 선결). 다음 **EPIC 05-D Part 3 — Enterprise Certification, Governance, Sign-off & Recurrence Prevention** 입력 준비 완료. 코드변경 0.
