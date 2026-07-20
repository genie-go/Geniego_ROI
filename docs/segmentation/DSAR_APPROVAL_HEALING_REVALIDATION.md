# DSAR — Approval Recovery Revalidation (Part 3-20 §24)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`APPROVAL_RECOVERY_REVALIDATION`은 인가 상태에 대한 어떤 변경이 발생한 직후, 그 상태가 **정본 계약을 여전히 만족하는지 재검증**하여 복구가 실제로 안전·유효했음을 증명하는 엔진을 정의한다. 재검증을 발동하는 Trigger 5종:

- **Recovery 완료** — self-healing 집행 종료 직후 결과 상태 재검증.
- **Policy 변경** — 정책 정본이 갱신/롤백될 때 effective 결정 재검증.
- **Configuration 변경** — 구성 baseline 변경 시 배포 인스턴스 재검증.
- **Runtime 변경** — 런타임 결정 경로/미들웨어 변경 시 재검증.
- **Region 변경** — 리전 페일오버/재배치 후 리전별 상태 재검증.

재검증은 **선언 계약 ↔ 관측 상태**를 재대조하여 PASS/FAIL과 잔여 위반을 산출하고, FAIL 시 §5 Drift로 재순환한다(폐루프).

## 2. Substrate 매핑

| 계약 요소 | 현존 substrate | 상태 |
|---|---|---|
| 접근 검토 재대조(assignment 재검증) | `backend/src/Handlers/AccessReview.php:87`·`:141-171` | 부분 substrate |
| 규정 통제 재검증 | `backend/src/Handlers/Compliance.php:53`·`:120` | 부분 substrate |
| 런타임 결정 경로(재검증 대상 경로) | `backend/public/index.php:610` | 관측 substrate |
| 헬스 재확인 | `backend/src/Handlers/Health.php:27` | 관측 substrate |
| 재검증 PASS/FAIL 판정 엔진 | 부재(grep 0) | ABSENT |
| Trigger 오케스트레이션 | 부재 | ABSENT |
| 재검증 결과 감사 기록 | `backend/src/SecurityAudit.php:14-68`(append-only) | 재사용 대상 |

## 3. 설계 계약

- **RevalidationEngine**은 §5 Drift·§23 Simulation·§25 Snapshot 산출물을 입력으로 하는 폐루프 검증 계층이다(선행 부재 → BLOCKED_PREREQUISITE).
- Trigger는 이벤트 구동이며 재검증은 **관측 상태를 변경하지 않는다**(read-only 판정).
- FAIL 판정은 물리 삭제 없이 `SecurityAudit.php:14-68` 해시체인에 기록하고 §5로 재순환.
- PASS 임계/판정 규칙은 SPEC canonical에서 파생하며 임의 하드코딩 금지.

## 4. KEEP_SEPARATE

- **DB/마이그레이션 무결성 검증**: `backend/src/Migrate.php:310` · `backend/src/Db.php:308`·`:592` — 스키마/연결 무결성이며 authz 재검증 아님. 흡수 금지.
- **매핑 검증**: `backend/src/Handlers/Mapping.php:240` — 채널 매핑 검증이며 인가 재검증 아님. 별개 유지.

## 5. 판정

**ABSENT** — authz Recovery Revalidation 엔진은 재검증 판정/Trigger 오케스트레이션이 grep 0으로 순신설 대상이다. AccessReview/Compliance는 부분 substrate이나 재검증 폐루프 엔진 자체는 부재. §5·§23·§25 선행 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
