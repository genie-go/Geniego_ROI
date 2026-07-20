# DSAR — Configuration Distribution Engine (Part 3-19 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## (1) 계약 (SPEC §6 — Configuration Distribution Engine)

registry(§17)에서 승인·버전·활성 판정된 authz config 오브젝트를 집행 노드로 **일관 배포**하는 엔진. 7종 배포 대상을 계약한다.

- **Policy** 배포 — 승인/권한 정책 오브젝트.
- **Role** 배포 — 역할 정의·계층.
- **Permission** 배포 — 권한 grant/scope.
- **Dynamic Rule** 배포 — ABAC/조건부 규칙.
- **Trust Rule** 배포 — 신뢰도 기반 게이트.
- **AI Model Ref** 배포 — 의사결정에 참조되는 모델 식별자.
- **Compliance Rule** 배포 — 규제/컴플라이언스 제약.

배포 계약: **canary(점진 롤아웃) → ack(노드 수신 확인) → version pin(버전 고정)**. ack 미수신 노드는 배포 미완료로 간주(fail-closed). 배포 이벤트는 append-only 감사 기록.

## (2) Substrate 매핑

| 계약 요소 | 현행 substrate | 상태 | 근거(①②/ADR) |
|---|---|---|---|
| 배포 유사 proto | 플랜 미러/전파 | product config | `AdminPlans.php:53-72` |
| 플랜 config 저장 | 관리자 플랜 설정 | authz 아님 | `AdminPlans.php:209` |
| authz Policy/Role/Permission 배포 | — | **부재** | (전무) |
| canary / ack / version pin | — | **부재** | (전무) |
| 배포 감사 원장(재사용 후보) | append-only 해시체인 | 존재 | `SecurityAudit.php:14-64`,`SecurityAudit.php:56` |

현행에 authz config **배포 엔진은 부재**하다. 가장 가까운 프로토타입은 관리자 플랜 설정 미러링(`AdminPlans.php:53-72`·`AdminPlans.php:209`)이나 이는 **product config**이며 canary/ack/version pin이 없다.

## (3) 설계 계약 (순신설)

1. **registry 소스 강제** — 배포 대상은 오직 §17 registry에서 approval+activation window(§17)·호환 매트릭스(§18) 통과분. 우회 소스 배포 금지.
2. **7종 배포 파이프라인** — Policy/Role/Permission/Dynamic Rule/Trust Rule/AI Model Ref/Compliance Rule을 동일 canary→ack→version pin 절차로 전파.
3. **ack fail-closed** — ack 미수신 노드는 이전 pinned 버전 유지, 부분 배포 상태로 남기지 않음.
4. **버전 고정** — 배포 완료 노드는 §18 semantic version으로 pin, rollback 시 §18 Rollback Version 포인터로 원자 전환.
5. **배포 감사** — 모든 배포/롤백 이벤트를 기존 append-only 해시체인(`SecurityAudit.php:14-64`·`SecurityAudit.php:56`)에 기록. 신규 감사 엔진 신설 금지(기존 확장).

## (4) KEEP_SEPARATE

- **마케팅 RuleEngine**(`RuleEngine.php:12`·`RuleEngine.php:24`)는 마케팅 자동화 규칙 실행기로, authz Dynamic Rule/Trust Rule 배포 대상과 **별개**다. 명명 유사만으로 통합 금지.
- **관리자 플랜 설정 미러**(`AdminPlans.php:53-72`·`AdminPlans.php:209`)는 product config 전파로, authz Distribution Engine이 흡수하지 않는다(별도).

## (5) 판정

**ABSENT-authz.** authz config 배포 엔진은 부재하며, 현행 proto는 product 계층 플랜 미러(`AdminPlans.php:53-72`)로 canary/ack/version이 없다. Configuration Distribution Engine은 7종 authz 오브젝트의 canary→ack→version pin 배포를 **순신설**하되, 감사 기록은 기존 append-only 해시체인(`SecurityAudit.php:14-64`)을 확장한다. 마케팅 `RuleEngine.php:12`는 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(§17 registry·§18 version 선행).
