# DSAR — Authorization Observability & Forensics: 런타임 가드 (Part 3-14 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §28은 Observability/Forensics 층에 대한 **6종 런타임 위반 차단**을 규정한다: Trace Tampering · Event Deletion · Replay Abuse · Evidence Modification · Chain Break · Unauthorized Forensic Access. 이 가드는 감사·증거·트레이스가 사후 위·변조 불가능(tamper-evident)함을 실행 시점에 강제하는 최종 방어선이다. Immutable Event Store(§18)·Evidence Chain(§9)·Chain of Custody(§10)의 무결성 요구를 런타임으로 투영한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 가드 대상(§28) | 판정 | substrate / 근거(GT) |
|---|---|---|
| Event Deletion(이벤트 삭제 차단) | **PARTIAL 재활용** | `SecurityAudit.php:14-33` append-only(UPDATE/DELETE 코드경로 전무·GT①§A). auth_audit_log는 flat append(`UserAuth.php:4190`)·삭제방어 미보증 |
| Chain Break(체인 단절 탐지) | **PARTIAL 재활용** | `SecurityAudit.php:56-68` verify(hash_equals+prev 연속성 재계산·broken_at·`:64`). menu_audit_log는 verify 부재(`AdminMenu.php` verify 무매치·GT①§C) |
| Evidence Modification(증거 변조 차단) | **PARTIAL 재활용** | `SecurityAudit.php:25-27` prev→sha256 해시체인. access_review 증거참조(`AccessReview.php:225`) |
| Trace Tampering(트레이스 변조 차단) | **ABSENT** | trace_id/span_id 코드 0(GT②§2). 트레이스 substrate 부재→가드 순신규 |
| Replay Abuse(재현 오남용 차단) | **ABSENT** | Decision Replay 경로 없음(GT②§2)→오남용 rate/scope 가드 순신규 |
| Unauthorized Forensic Access(포렌식 무단 접근 차단) | **ABSENT** | forensic case/workspace grep 0(GT②§2). ★custody 단절: `Compliance.php:265-300` auditExport가 자기 반출 미기록(GT②§4)→접근차단 근거 부재 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **R-1 Append-only 강제**: Immutable Event Store(§18)는 UPDATE/DELETE 경로를 코드상 부재로 유지한다. `SecurityAudit.php:14-33` append-only 패턴을 이벤트 스토어 전역으로 승격(ADR D-1).
- **R-2 Chain Break 실시간 verify**: 이벤트 기록 시점에 prev_hash 연속성 재계산(`SecurityAudit.php:56-68` 패턴)을 auth/menu 체인으로 확산(ADR D-2), broken_at 즉시 차단.
- **R-3 Evidence Modification 차단**: 증거는 흡수 아닌 **참조**(`AccessReview.php:225` 선례)로만 연결하며 원본 해시(§26)와 불일치 시 거부.
- **R-4 Forensic Access 인가**: 포렌식 워크스페이스 접근은 Chain of Custody(§10)에 불변 기록하며, 미기록 접근은 FORENSIC_ACCESS_DENIED(§30). custody 단절(`Compliance.php:265-300`)을 설계로 해소(ADR D-4·siemPush `Compliance.php:508` 반출기록 패턴 일반화).
- **R-5 Replay Abuse 가드**: Replay는 read-only simulation(§8)만 허용, 실 리소스 접근 시도를 차단.
- **R-6 테넌트 격리**: `Compliance.php:176` fail-closed 재사용(ADR D-7).

## 4. KEEP_SEPARATE (마케팅/인프라 관측 흡수금지)

- **Walmart correlation_id**(`ChannelSync.php:1705`·`:1709`·`:2874`·`:2878`·`:3467`·`:3471`) = 외부 API `WM_QOS.CORRELATION_ID` 헤더. authz trace tampering 가드 대상 아님(GT②§5 B-1).
- **마케팅**(`AttributionEngine.php:1522`·`:1546`·`:1553` percentile·`Decisioning.php:12`·`:36` "decision")·**인프라**(`SystemMetrics.php:1-60`)·ML(`ModelMonitor.php`)·데이터 lineage(`DataPlatform.php`)는 authz 가드와 무관(GT②§5 B-2/B-3). 흡수·개명 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **재활용(참조·확장)**: Event Deletion/Chain Break/Evidence Modification 가드는 SecurityAudit append-only(`:14-33`)+verify(`:56-68`) 위에 신설. 흡수 아닌 참조.
- **ABSENT(순신규)**: Trace Tampering·Replay Abuse·Unauthorized Forensic Access 가드 substrate 전무.
- **갭≠결함**: custody 단절(`Compliance.php:265-300`)은 §28 R-4 설계 갭 근거일 뿐 수정 아님·재플래그 금지(GT②§4).
- **선행의존**: Part 1~3-13 인증 완료 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
