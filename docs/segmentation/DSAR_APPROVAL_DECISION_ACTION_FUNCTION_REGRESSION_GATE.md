# DSAR — Action Function Regression Gate (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§68 `ACTION_FUNCTION_REGRESSION_GATE` — 무후퇴 게이트(원문 전사). Decision Actions 신설/통합 시 아래 실존 기능은 **동작 회귀 0**이어야 통과:

1. **Alerting decide/execute** — 결정↔집행 2단계 분리.
2. **Mapping Maker-Checker** — 다중승인·자기승인 차단·정족수.
3. **AdminGrowth approvalDecide** — 관리자 승인 결정.
4. **Catalog approveQueue** — 카탈로그 승인 큐.
5. **AgencyPortal** — 대행사 위임 승인.
6. **MediaHost 검증** — 파일 MIME/매직바이트 검증.
7. **SecurityAudit** — append-only 해시체인 감사.

## 2. 기존 구현 대조 — 무후퇴 대상 확정 (능력 기반)

| # | 기능 | 보존 계약(회귀 금지) | 근거(허용목록) |
|---|---|---|---|
| 1 | **Alerting decide/execute** | 결정↔집행 분리·IDOR Tenant 술어·실집행 유지 | `Alerting.php:572-655`(`:580-582` IDOR·`:593,594`·`:601-655`·`:653`) |
| 2 | **Mapping Maker-Checker** | 다중승인·자기승인 차단·정족수·approve→apply | `Mapping.php:238-331`(`:287,327`) |
| 3 | **AdminGrowth approvalDecide** | 승인/거절 결정·화이트리스트 검증 | `AdminGrowth.php:1289-1344`(`:1321` enum·`:1330` UPDATE) |
| 4 | **Catalog approveQueue** | 승인 큐 status 전이 | `Catalog.php:2383-2407` |
| 5 | **AgencyPortal approveAgency** | 대행사 위임 승인·approved 재검증 | `AgencyPortal.php:365-384` |
| 6 | **MediaHost 검증** | ALLOWED 화이트리스트·매직바이트 재검증·8MB·SHA-256·원자쓰기·nosniff | `MediaHost.php:81-91`(`:33-38`·`:88-91`·`:46,86`·`:98-104`·`:231`) |
| 7 | **SecurityAudit** | append-only 해시체인·`verify()` | `SecurityAudit::verify():56,64` |

- 추가 보존 substrate: Tenant Guard(`index.php:404-420`)·Dsar ANONYMIZE(`:89-97,765`)·omni_outbox.
- **주의(정직 판정)**: 위 기능들은 통합의 CANONICAL/VALIDATED_LEGACY 정본이므로 **삭제·재구현이 아니라 확장(Extend)** 대상. 회귀 테스트는 통합 전후 동일 입력에 동일 status 전이·동일 검증 거부를 확인.

## 3. 판정

- Verdict: **KEEP_SEPARATE / VALIDATED_LEGACY / CANONICAL 혼재 — 무후퇴 대상 7건 확정**
- 선행 의존: 게이트 자체는 신규(회귀 검증 하네스). 대상 기능은 모두 실존.
- cover: 무후퇴 대상 7건 실존 · **자동 회귀 게이트 = 0**(리포에 test 스크립트 없음, CLAUDE.md).

## 4. 확장/구현 방향 (설계)

- 순신규 회귀 게이트: 통합 전 위 7기능의 현행 동작을 골든 케이스로 캡처(status 전이·거부 조건·검증 결과), 통합 후 동일성 검증. 레지스트리 E2E 스모크(`npm run e2e`·`e2e:render`) 및 render.mjs 라우트 도출과 연계.
- **최우선 회귀 방지 포인트**:
  - MediaHost 매직바이트 거부(`:88-91`)가 통합 후에도 악성 파일 거부 유지(BLOCKED_GAP 통합 시 회귀 금지).
  - Mapping 자기승인 차단·정족수 유지(`:238-331`).
  - Alerting IDOR Tenant 술어 유지(`:580-582`).
  - SecurityAudit 해시체인 append-only 유지(`:56,64`).
- Golden Rule(Extend): 통합은 기능을 Adapter 뒤로 흡수하되 **거부/차단 동작은 강화만·완화 없음**.
- 무후퇴 원칙(레지스트리): 후퇴 금지·한 값 변경=관련 전부 동시 동기화. 통합으로 인한 무음 기능 손실 0.

관련: [[DSAR_APPROVAL_DECISION_ACTION_DUPLICATE_IMPLEMENTATION_AUDIT]] · [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
