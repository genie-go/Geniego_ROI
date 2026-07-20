# DSAR — Approval Ops-Ready Integration Snapshot (Part 3-25 §18·§29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §18·§29)

`APPROVAL_INTEGRATION_SNAPSHOT`은 플랫폼 최종 통합 승인 시점의 **운영 준비 상태를 불변(immutable)으로 고정한 단일 스냅샷 레코드**다. 승인 게이트가 "통합 완료·운영 개시 가능"을 선언하는 순간, 그 순간의 진실을 후행 변조 불가능하게 봉인한다. 필수 필드:

- **Platform Version** — 통합 대상 플랫폼 릴리스 식별자(빌드/커밋 지문).
- **Environment** — 스냅샷이 캡처된 실행 환경(production/demo 라벨).
- **Config Baseline** — 승인 시점 유효 설정 기준선(연결/DB/기능 플래그 요약 지문).
- **Deployment State** — 배포 상태(대상 노드·서비스 리로드 상태·헬스 요약).
- **Timestamp** — 봉인 시각(UTC, append-only 체인에 귀속).

스냅샷은 §29 Immutable Certification History의 앵커 레코드로서, 이후 Evidence/Digest/Analytics가 모두 이 스냅샷 ID를 부모로 참조한다.

## 2. Substrate 매핑

| SPEC 요구 | 현존 substrate | 상태 |
|---|---|---|
| Integration Snapshot 레코드 | 없음 (grep 0) | **ABSENT** — greenfield |
| 불변 봉인(append-only) | `SecurityAudit.php:25-31`(append 기록)·`:60-64`(체인/verify) | PARTIAL-substrate — 확장 순신설 |
| Environment 라벨 | `Db.php:43-48`(env/라벨 파싱) | 참고 baseline |
| Config Baseline 지문 | 없음 (integration용 스냅샷 부재) | **ABSENT** |

Integration Snapshot 자료구조 자체는 코드베이스에 부재(ABSENT-greenfield)다. 유일한 실 불변 기록 substrate는 `SecurityAudit.php:25-31`의 append 기록과 `:60-64`의 해시체인/verify이며, 여기에는 **integration snapshot 개념이 없다**. 환경 라벨은 `Db.php:43-48`에서 파생 가능하나 스냅샷 봉인 로직은 신설이다.

## 3. 설계 계약

1. **봉인 불변성**: Snapshot은 생성 후 수정 불가. 무결성은 `SecurityAudit.php:60-64` 해시체인을 integration-snapshot 도메인으로 **확장**하여 보장한다(체인 preimage에 Platform Version+Config Baseline 지문 포함).
2. **환경 귀속**: Environment 필드는 `Db.php:43-48` env 라벨을 SSOT로 채우고, production/demo 격리를 위반하지 않는다.
3. **부모 앵커**: Snapshot ID는 Evidence(§19)·Digest(§20)·Analytics(§21)가 참조하는 루트. 스냅샷 없이는 하위 산출 BLOCKED.
4. **Fail-closed**: Config Baseline 지문 산출 불가 시 스냅샷 미봉인(승인 게이트 통과 금지).

## 4. KEEP_SEPARATE

- **PM baseline snapshot** (`PM/Enterprise.php:53-68`) — PM 도메인의 baseline 스냅샷은 프로젝트 진척 baseline이지 플랫폼 통합 운영준비 스냅샷이 아니다. 흡수·재사용 금지(개념 축 상이).

## 5. 판정

**ABSENT** (integration snapshot 없음). 실 substrate는 `SecurityAudit.php:25-31`·`:60-64` 해시체인(불변 봉인 메커니즘)과 `Db.php:43-48` 환경 라벨뿐이며 integration snapshot 자료구조는 순신설이다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
