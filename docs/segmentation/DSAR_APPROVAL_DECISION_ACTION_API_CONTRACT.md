# DSAR — Action API Contract (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§65 `ACTION_API_CONTRACT` — 엔드포인트군(원문 전사):

- **Registry / Definition / Capability** — 액션 등록소·정의·능력 조회.
- **Validation** — 커밋 전 Eligibility(§12) 검증.
- **APPROVE / REJECT** — 종결 결정 커밋.
- **RETURN** — 재작업 복귀(Target 필수).
- **REQUEST_CHANGES** — 변경요청(Change Item ≥1).
- **CANCEL / WITHDRAW** — 관리적 취소 / 요청자 회수.
- **RESUBMIT** — 재제출(Case Version 증가).
- **Comment / Reason / Attachment** — 근거·사유·증빙 부착.
- **Snapshot / Simulation / Reconciliation** — 시점 스냅샷·건식 시뮬·정합 대조.

### 공통 관심사 (Cross-cutting — 전 엔드포인트 필수, 원문 전사)
1. **Tenant Context** — X-Tenant 스코프 격리.
2. **Auth** — 인증·RBAC.
3. **Action Capability Validation(§11)** — 액션 허용 여부.
4. **Idempotency(§51)** — 재시도 안전 key.
5. **Expected Version** — 낙관적 동시성.
6. **Decision Lock / Fencing** — 직렬화.
7. **Reason / Comment / Attachment Security** — 요건·검증·PII/Malware.
8. **Return Target / Change Request / Resubmission Validation**.
9. **Assignment Effect / Sequential Effect Validation(§45/§47)**.
10. **Snapshot(§52) · Audit(§54) · Evidence(§53)**.
11. **Rate Limit**.
12. **Pagination**.
13. **Error Contract(§61/§62)**.

## 2. 기존 구현 대조

- **범용 Action API 계약 부재 → ABSENT.** 결정 액션이 도메인별 임시 라우트에 산발:
  - `AdminGrowth::approvalDecide`(`:1289-1344`)·`Mapping::approve/apply`(`:238-331`)·`Alerting::decideAction/executeAction`(`:572-655`)·`Catalog::approveQueue`(`:2383-2407`)·`AgencyPortal::approveAgency`(`:365-384`) + stub(`routes.php:752,1868,1943-1998`).
  - 취소/회수 라우트는 **다른 도메인** 의미: `routes.php:979,1198`=구독/결제 취소(승인도메인 아님).
- 공통 관심사 실재/부재:
  - Tenant Context / Auth: **부분 PRESENT** — `index.php:404-420` 미들웨어(X-Tenant 주입·Bearer/RBAC). 단 액션별 일관 계약 아님.
  - Rate Limit / Pagination: 전역 인프라 일부 실재하나 액션 API 계약으로 규격화 안 됨.
  - Capability/Idempotency/Expected Version/Lock/Return Target/Change Request/Snapshot/Reconciliation Validation: **ABSENT**(대응 엔티티 부재).
  - Error Contract: **ABSENT**(§61/§62 미구현).
- URL 접두 주의(레지스트리): 신규 실배선은 `/api` 접두 필수(nginx SPA HTML 폴백 착시 회피).

## 3. 판정

- Verdict: **ABSENT** (통일 Action API 계약 부재 · 도메인별 산발 라우트만)
- 선행 의존: 공통 관심사 3·4·5·6·8·9·10·13이 전부 부재 엔티티 참조 → BLOCKED_PREREQUISITE.
- cover: Auth/Tenant 미들웨어(`index.php:404-420`)·Rate Limit/Pagination 인프라 외 **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 통일 Action API — `POST /api/v{N}/decision-actions/{approve|reject|return|request-changes|cancel|withdraw|resubmit}` + capability/validation/simulation/snapshot/reconciliation. 전 엔드포인트에 13개 공통 관심사 미들웨어 강제.
- Golden Rule(Extend): 기존 도메인 승인 핸들러(AdminGrowth·Mapping·Alerting·Catalog·AgencyPortal)를 통일 계약 뒤로 흡수(Adapter). `Alerting decide→execute` 2단계(`:601-655`)를 결정↔집행 분리 정본으로 재사용.
- 필수: **Idempotency + Expected Version + Decision Lock**을 커밋 엔드포인트 진입 조건으로 강제(부분집행·중복커밋 차단).
- 실배선 주의: `/api` 접두 필수·공개 bypass 목록(`index.php`) 갱신 필요.
- 무후퇴: 기존 라우트는 계약 하위호환 유지(구버전 stub 보존, CLAUDE.md 버저닝 관례).

관련: [[DSAR_APPROVAL_DECISION_ACTION_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_DECISION_ACTION_INDEX_PERFORMANCE]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
