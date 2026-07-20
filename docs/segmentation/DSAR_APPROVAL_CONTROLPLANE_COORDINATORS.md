# DSAR — Control Plane Coordinators (Part 3-19 §9~§13)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §9~§13)

Control Plane은 5종 Coordinator를 통해 **하위 통제 도메인을 조율(orchestrate)**하되 그 통제를 재구현하지 않는다. Coordinator는 결정을 만들지 않고 **결정 흐름·정합·증적을 조율**한다.

- **§9 Fabric Coordinator** — 인가 Fabric(Part 3-16) 위 PDP/PEP 노드 배치·라우팅 조율.
- **§10 Federation Coordinator** — 연합 도메인(Part 3-18) 간 정책·아이덴티티 신뢰 경계 조율.
- **§11 Compliance Coordinator** — 컴플라이언스 통제(Part 3-17)의 증적·보존·DSAR 흐름 조율.
- **§12 AI Governance Coordinator** — AI 거버넌스(Part 3-15) 모델 결정 게이트·모니터 조율.
- **§13 Zero Trust Coordinator** — Zero Trust(Part 3-13) 지속검증·세션신뢰 조율.

불변식: Coordinator는 **무상태 조율자**이며, 실제 판정은 로컬 PDP(`TeamPermissions.php:695-701`), 집행은 PEP(`index.php:69-88`), 증적은 `SecurityAudit.php:14-64`에 위임한다.

## 2. Substrate 매핑

| SPEC Coordinator | 현행 substrate | 상태 |
|---|---|---|
| 로컬 PDP(조율 대상) | `TeamPermissions.php:695-701` · `:704-712` | PRESENT |
| PEP(집행 지점) | `index.php:69-88` · `index.php:610` | PRESENT |
| 증적 체인 | `SecurityAudit.php:14-64` | PRESENT |
| 배포 substrate | `deploy.sh` · `.github/workflows/deploy.yml` (단일 모놀리스) | PRESENT |
| §9 Fabric Coordinator | — | **ABSENT** (coordinator grep 0) |
| §10 Federation Coordinator | — | **ABSENT** |
| §11 Compliance Coordinator | — | **ABSENT** |
| §12 AI Governance Coordinator | — | **ABSENT** |
| §13 Zero Trust Coordinator | — | **ABSENT** |

현행은 `composer.json:2-12`가 선언하는 **단일 PHP 모놀리스**로, coordinator 계열(Fabric/Federation/Compliance/AI Gov/Zero Trust) 클래스·라우팅은 grep 0.

## 3. 설계 계약 (순신설·무중복)

- **5 Coordinator 순신설**: 각 Coordinator는 얇은 조율 계층이며, 대응 통제 도메인(3-16/3-18/3-17/3-15/3-13)의 **설계 산출물을 소비**할 뿐 재구현하지 않는다 → 중복 엔진 금지(Golden Rule: Extend).
- **위임 규약**: 모든 Coordinator는 판정을 `TeamPermissions.php:704-712`로, 집행을 `index.php:69-88`로, 증적을 `SecurityAudit.php:14-64`로 위임. Coordinator 자체는 결정 저장소를 갖지 않는다.
- **Fail-closed 조율**: Coordinator 미가용 시 로컬 PDP 단독 경로로 강등(deny 우선), 조율 부재가 **허용으로 오작동하지 않음**.
- **Compliance Coordinator(§11)**는 DSAR 흐름을 조율하되 GDPR DSAR 실구현(`Dsar.php`)을 흡수하지 않는다.

## 4. KEEP_SEPARATE

- `Dsar.php` — GDPR DSAR 실구현. "PDP" 문자열이 등장하나 **정책결정점이 아님**. §11 Compliance Coordinator가 조율 대상으로 참조만, 흡수 금지.
- `Decisioning.php:307` — 마케팅 decisioning. AI Governance Coordinator(§12)와 무관, 흡수 금지.
- `ModelMonitor.php:21`·`:42-44` — 모델 모니터. §12가 조율 대상으로 참조만, 재구현 금지.
- 통합 대상 통제(Part 3-16/3-18/3-17/3-15/3-13)는 각기 별개 DSAR 소관 — Control Plane은 조율만.

## 5. 판정

**ABSENT** — Fabric/Federation/Compliance/AI Governance/Zero Trust Coordinator 계열 코드는 grep 0. 현행은 `composer.json:2-12` 단일 모놀리스 위 로컬 PDP(`TeamPermissions.php:695-701`)·PEP(`index.php:69-88`)만. 5 Coordinator는 **순신설·무중복**(하위 도메인 재구현 금지)이며 선행 통제 도메인 미확정으로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
