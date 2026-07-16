# ADR — Semantic Production Cutover, Rollback & DR (EPIC 03-D Part 2)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (전환 프레임워크·Rollback·DR 설계. 비파괴 — 코드변경 0). 실 Cutover는 Semantic Layer+Feature Flag+Kill Switch+Shadow 구현 후.
- **근거**: [`../semantic/SEMANTIC_PRODUCTION_READINESS.md`](../semantic/SEMANTIC_PRODUCTION_READINESS.md) + Part 1 + GeniegoROI 실 배포 인프라.

## 결정 (핵심)
1. **정직(§3.2)**: Semantic Query Layer 미구현 → 운영 전환 대상 없음 → **전 항목 BLOCKED_PENDING_IMPLEMENTATION·Production Active 0**. 허구 전환 보고 금지.
2. **실 인프라 매핑**: Versioned Routing=`/vNNN` API 접두(신 시맨틱=신 버전, Legacy 병존=Blue/Green 등가)·Rollback=**dist.bak 스왑백**(검증됨)·Job=cron·**Feature Flag/Kill Switch/Shadow=부재→신설**(구현 선결).
3. **일괄 전환 금지**(§3.1): Metric/Version/Consumer/Tenant/Workspace/AI/Recommendation/Automation 단위 분리. 낮은 위험부터.
4. **자동화 최후**(§3.4): Dashboard→Report→AI→Recommendation→**Automation Preview→승인형→제한 실행→전체**. Kill Switch·Audit·보상조치 필수. Cutover 중 Formula/의미 변경 금지.
5. **Legacy 유지**(§3.3): 안정화 기간 Fallback 유지·즉시삭제 금지(Part3 인증 후 Deprecated).
6. **Canary=대표성 실 운영 Tenant**(Demo 단독 증거 금지). Shadow Exit=Unexplained/Cross-Tenant/Critical Regression 0.
7. **DR/Backup 실제 테스트**(문서만=준비완료 아님)·RPO/RTO Consumer별(자동화/Billing 엄격)·정확성 SLO를 성능보다 낮게 취급 금지.

## 무후퇴·영구 규칙(§59)
운영 전환 순서: Final Audit→Production Readiness→Shadow→Canary→Limited Production→Cutover Approval→Stabilization→Final Certification→Legacy Deprecation. Formula 변경+Cutover 동시 금지·Rollback/Kill Switch 없는 고위험 자동화 전환 금지.

## 결과
전환 프레임워크·Rollback·DR 설계 확정(Production Active 0·구현 선결 명시). 다음 **EPIC 03-D Part 3 — Enterprise Certification, Governance, Sign-off & Permanent Recurrence Prevention** 입력 준비 완료. 코드변경 0.
