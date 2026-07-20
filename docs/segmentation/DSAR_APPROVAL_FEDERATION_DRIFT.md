# DSAR — Authorization Federation Drift Governance (Part 3-18 §24)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_DRIFT(§24)

Federation Drift Governance는 **연합(federation) 참여 도메인 간 인가(authorization) 상태가 시간에 따라 벌어지는 현상(drift)을 관측·분류·정량화**하는 계약이다. 두 도메인이 동일 정책·신뢰·메타데이터를 공유한다고 선언했더라도, 각 도메인이 독립적으로 진화하면 상태가 어긋난다. 본 §24는 drift를 5개 축으로 분류한다.

- **Trust Drift** — 로컬 도메인이 원격 파트너에 부여한 Trust Score와 원격이 스스로 주장하는 신뢰 수준의 괴리.
- **Policy Drift** — 공유 정책 스냅샷 버전이 도메인별로 서로 다른 리비전에 머무름.
- **Metadata Drift** — 공유 인가 메타데이터(role catalog, scope catalog, capability map)의 불일치.
- **Certificate Drift** — 상호 인증에 쓰이는 인증서/키의 만료·회전 미동기.
- **Federation Topology Drift** — 연합 참여자 집합(누가 아직 연합 회원인가)의 로컬 뷰와 실제 토폴로지의 불일치.

계약상 Drift Governance는 **탐지만 하고 자동 개입은 하지 않는다**(개입은 §26 Revalidation·§27 Reconciliation 계약으로 위임). Drift 관측은 append-only 감사 이벤트로 기록되어야 한다.

## 2. Substrate 매핑

| SPEC 개념(§24) | 현행 substrate | 상태 |
|---|---|---|
| Drift 관측 이벤트 기록 | `SecurityAudit.php:14-67`(append-only 해시체인 감사) | 관측 채널로 재사용 가능 (drift 개념 부재) |
| 상태 전이 관측 proto | `AgencyPortal.php:367`·`:390`(대행사 상태 전이) | 단일 로컬 워크플로우 상태만, federation drift 아님 |
| Trust Score 저장 | DataTrust(`DataPlatform.php:281`) | KEEP_SEPARATE — federation trust 아님 |
| Trust/Policy/Metadata/Certificate/Topology Drift 엔진 | 부재 | **ABSENT (grep 0)** |

## 3. 설계 계약

- **DriftObservation 레코드** — `{axis, local_view, remote_claim, delta, observed_at, severity}`. axis는 위 5개 enum. delta는 축별 비교 함수 산출값(정책=버전 거리, 인증서=만료까지 잔여시간, 토폴로지=집합 대칭차).
- **관측 트리거** — 주기 스캔 + 이벤트 구동(파트너 상태 변경). 자동 개입 금지, DriftObservation → §27 Reconciliation 입력.
- **감사** — 모든 DriftObservation은 `SecurityAudit.php:14-67` 해시체인에 append. severity 임계 초과 시 §26 Revalidation 트리거 신호만 발행.
- **Fail-closed** — remote_claim 미수신(원격 도메인 부재)이면 delta=UNKNOWN, drift 판정 보류하되 관측 자체는 기록.

## 4. KEEP_SEPARATE

- **DataTrust Trust Score**(`DataPlatform.php:281`) — 데이터 품질/소스 신뢰 도메인. Federation Trust Drift와 **동음이의 아님**. federation 신뢰는 파트너 도메인 간 인가 신뢰이며, DataTrust는 수집 데이터 신뢰다. 통합 금지.
- ★"drift" ML 동음이의(model/data drift) 없음 — federation 문맥에서 유일 의미.

## 5. 판정

**ABSENT** — federation drift 개념(Trust/Policy/Metadata/Certificate/Topology 상태 비교) grep 0. 현행 관측 가능 substrate는 `SecurityAudit.php:14-67`(감사 채널)·`AgencyPortal.php:367`·`:390`(로컬 상태 전이 proto)뿐이며, 이들은 drift 비교 엔진이 아니다. §24 전체 순신설. §27 Reconciliation의 비교 기반 위에 신설한다. **NOT_CERTIFIED · BLOCKED_PREREQUISITE**(원격 도메인·연합 토폴로지 부재로 비교 대상 미완).
