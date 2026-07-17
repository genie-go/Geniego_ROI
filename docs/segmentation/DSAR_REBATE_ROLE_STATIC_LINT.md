# DSAR — Static Lint (§49·20종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 최소 Static Lint (20) — 전체 Certification 은 Part 4-5-3-1-7
1. **Role-Permission Binding 없는 Active Role** · 2. **Owner 없는 Sensitive Role** · 3. Tenant 없는 Tenant Role · 4. Workspace 없는 Workspace Role · 5. **Legal Entity 없는 Financial Role** · 6. Environment 없는 Production Role · 7. **Scope 없는 Role Assignment** · 8. **Validity 없는 Temporary Assignment** · 9. **Business Justification 없는 Direct Sensitive Assignment** · 10. **Deprecated Role 신규 Assignment** · 11. **Role Hierarchy Cycle** · 12. **Custom Role 의 Reserved Permission 사용** · 13. **Scope Union 기본 사용** · 14. External User 에게 Prohibited Role · 15. **Service Account 에 Human Approval Role** · 16. **Group Removal 처리 누락** · 17. **Assignment Expiry 후 Cache 유지** · 18. **Role 이름 하드코딩** · 19. **Evidence 없는 Scope Override** · 20. **기존 Role Registry 중복 생성**

## 🔴 1-7 정본 준수 — 신설 금지·GATE 확장
현행 CI **GATE 1~5 REAL**(`deploy.yml:45/48/53/59/64`) · pre-commit **B1~B4** · `baseline.json` sacred SHA(267차) · e2e 3계층(`package.json:4-6`·266차).
→ **새 파이프라인/러너를 만들지 않는다.** GATE 2/3 에 편입.

## 🔴 Ratchet 필수 (1-7/5-8 동일 정본·재정의 금지)
**즉시 BLOCK 금지** — 레거시 위반으로 파이프라인이 마비되면 **개발자가 Lint 를 끈다.**
**R0 측정 → R1 baseline 동결 → R2 신규 위반만 BLOCK → R3 감축.**

## 🔴 20번이 이 블록의 자기 규율이다
**"기존 Role Registry 중복 생성"** — 현행 Role 은 **이미 3계통**이다.
**4번째를 만드는 순간 이 블록이 스스로 해결하려던 문제를 키운다**(5-1 §51 결론 2).

## 상태
**계약 명세만 · 구현 0**(`CONTRACT_ONLY`). 1-7 레지스트리에 등재 대상 → **전 블록 누계 Static Lint 37 → 57**.
