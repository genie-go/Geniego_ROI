# DSAR — Runtime SoD Enforcement: 충돌 다이제스트 (APPROVAL_SOD_DIGEST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_DIGEST`는 충돌평가 1건을 결정론적으로 요약·서명한 다이제스트다(SPEC §25). 입력 5종:

| 입력 | SPEC §25 항목 | 의미 |
|---|---|---|
| Subject | 평가 대상 주체(actor/tenant) | 누구에 대한 평가인가 |
| Runtime | 평가 시점 Runtime Context(§8·§22) | 어떤 실행 맥락인가 |
| Conflict | 탐지된 충돌(규칙·심각도·유형) | 무엇이 상충했는가 |
| Resolution | 적용 해소전략(§16) | 어떻게 처리했는가 |
| Snapshot | 참조 Conflict Snapshot(§23) | 어떤 상태 기준인가 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Digest 입력 | 실존 근거 | 판정 |
|---|---|---|
| Subject(actor 도출) | Mapping actorId fail-closed `Mapping.php:186-190`·`:246-250`·Alerting actorId `Alerting.php:42-57`·`:598-606`·auth_tenant 주입 `index.php:608-612` | PRESENT(신원 substrate) |
| Subject(테넌트) | X-Tenant-Id 서버도출 `index.php:614-619` | PRESENT(재활용) |
| Runtime | RBAC 게이트 평가지점 `index.php:572-611`·`:430-460` — 평가 훅이지 Runtime Context 캡처 아님 | PARTIAL(게이트만) |
| Snapshot(참조) | 세션 단일 team_role `UserAuth.php:263-316`·`:691`·`:1019` → 다중역할 Snapshot 부재 | **ABSENT(공백)** |
| Conflict / Resolution | SoD 충돌·해소 전용 Digest 스키마 grep 0(GT② §2·ADR 2.2) | **ABSENT(grep 0)** |
| Digest 무결성(재활용) | SecurityAudit 해시체인 `SecurityAudit.php:14-33`·verify `:56-69` | PRESENT(재활용) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **결정론·불변**: 동일 (Subject·Runtime·Conflict·Resolution·Snapshot) 입력은 동일 Digest를 산출(SPEC §36 Digest Validation). 위조·재계산 불일치는 변조 신호.
- **무결성 재활용**: Digest 값·서명은 SecurityAudit 불변 해시체인(`SecurityAudit.php:14-33`·`:56-69`) 위에 봉인 — SoD 전용 서명 로직은 순신규.
- **Snapshot 선행**: Digest는 Conflict Snapshot(§23)을 필수 입력으로 참조 → 세션 단일역할(`UserAuth.php:263-316`) 한계로 다중 활성역할 Snapshot 신설이 선행(ADR D-4).
- **테넌트 격리**: Digest는 auth_tenant(`index.php:614-619`) 격리 저장.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **비즈 simulate/drift/recon ≠ SoD Digest**: `RuleEngine.php`/`Decisioning.php`/`PriceOpt.php`(비즈 simulate)·`ModelMonitor.php`(model drift)·`PgSettlement.php`(정산 recon)은 마케팅/정산 도메인(GT② B-6)이지 SoD 충돌 다이제스트 아님.
- **정산 페어링 시간창 ≠ Runtime 요약**: `PgSettlement.php:221`(정산 페어링)·`AbTesting.php:161`·`AutoCampaign.php:622`(쿨다운)은 Temporal SoD 아님(GT② B-3).
- **acl_permission 매트릭스 ≠ Conflict 입력**: menu×action 매트릭스이지 role×role 상충 다이제스트 입력 아님(GT② §2).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **NOT_CERTIFIED · 코드 0**: Conflict/Resolution 요약·SoD Digest 서명 = 순신규(grep 0).
- **재활용(Extend)**: 신원 도출(`Mapping.php:186-190`·`Alerting.php:42-57`·`index.php:608-612`)·테넌트 격리(`index.php:614-619`)·SecurityAudit 무결성(`SecurityAudit.php:14-33`) 위에 Digest 산출층 신설.
- **선행 의존**: Snapshot(§23)·Evidence(§24) 확정 후 결정론 Digest 유효(BLOCKED_PREREQUISITE). 다중 활성역할 데이터 기반 선행(ADR D-4).
