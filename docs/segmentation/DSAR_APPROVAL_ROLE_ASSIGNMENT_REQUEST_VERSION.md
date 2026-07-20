# DSAR — Approval Role Assignment Request Version (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Request Version)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Approval Reference를 Version에 고정 · Effective는 version 기준 · 반날조

## 1. 목적

스펙 §1 핵심범위 목록 항목24 "Assignment Request Version"은 **목록 나열에만 등장**하며 전용 섹션 본문이 없다(§10 Assignment Request 필드 나열이 유일한 근접 원문). ADR·전수조사 2편 어디에도 Request Version과 직접 대응하는 file:line 언급이 없다(반날조 원칙상 substrate 인용 0). 본 문서는 스펙 §6 Assignment Version의 일반 패턴("모든 Assignment 변경은 Version을 생성 · 과거 Version 수정 금지")을 Assignment Request(§10, DSAR `DSAR_APPROVAL_ROLE_ASSIGNMENT_REQUEST` — ABSENT 판정)라는 아직 substrate 없는 상위 엔티티에 유추 적용한 **최소 설계 골격**이며, 확정 스키마가 아니다.

## 2. Canonical 필드

★스펙 미상세 — 아래는 §6 Assignment Version 패턴을 Request 레벨에 유추 적용한 후보 구조이며 비확정.

| 필드 | 의미 |
|---|---|
| `request_version_id` | 식별자(PK) |
| `request_id` | 대상 Assignment Request(§10) 참조 |
| `version_number` | 순번(§6 패턴 — 과거 Version 수정 금지) |
| `version_type` | 변경 유형(후보: 최초 제출/내용 수정/철회/재제출 — §6 원문에 Request 전용 열거형 없음) |
| `snapshot_of` | 해당 Version 시점의 requested_role/requested_scope/requested_duration/business_reason 스냅샷 |
| `created_at` | 생성 시각 |
| `superseded_by` | 후속 Version 참조(불변 이력 체인) |

## 3. 열거형 / 타입

- **스펙 미정의**: §10 본문에도 §1 목록에도 Request Version 전용 상태/유형 열거형이 없다. §6 Assignment Version Type(`Initial · Renewal · Scope Change · Role Version Change · Expiration Change · Approval Change · Restoration · Suspension · Revocation · Migration · Correction`)은 **Assignment(부여 실행)** 레벨 Version 유형이며, Request(요청) 레벨에 그대로 전용할 수 있는지는 확정하지 않는다(비확정 표기).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| Assignment Request 자체 | **ABSENT** | `DSAR_APPROVAL_ROLE_ASSIGNMENT_REQUEST.md` §4 — 5경로 전부 direct write(전수조사 §3), Request 엔티티 substrate 0 |
| Request Version(변경이력) | **ABSENT** | 상위 Request가 부재이므로 그 Version 이력도 있을 수 없음(선후관계·이중 순신규) |
| Version 불변성 패턴(참고용 근접) | **ABSENT(반례로만 존재)** | 전수조사 §7 근접표 "권한 전체교체(version 소실)": `replacePerms`/`replaceScope`(`TeamPermissions.php:324-336,337-346`)는 DELETE→INSERT로 **이전 상태가 소실**되는 in-place 교체 — Version 불변 패턴의 정반대 사례로만 인용(오흡수 금지) |

★근접 substrate 없음. 반날조 원칙 — 지어내지 않음.

## 5. 설계 원칙

1. **선후관계 명시** — Request Version은 Assignment Request(File `DSAR_APPROVAL_ROLE_ASSIGNMENT_REQUEST` — ABSENT)에 종속한다. Request 자체가 실 데이터 없이는 Version도 존재할 수 없다. 두 엔티티를 독립적으로 먼저 구현하는 순서 오류를 방지한다.
2. **단일 Version 개념 재사용** — §6 Assignment Version과 별개의 독자 버저닝 체계를 신설하지 않는다(중복 버저닝 스킴 금지, Golden Rule). Request Version은 §6 패턴의 적용 범위 확장으로 취급한다.
3. **`replacePerms`형 in-place 교체를 반면교사로 삼는다** — 현행 `TeamPermissions.php:324-336,337-346`의 DELETE→INSERT 패턴(이전 상태 소실)을 Request Version 설계가 답습하지 않는다. 과거 Version은 물리적으로 보존한다.
4. **비확정 필드는 사용자 확인 전 구현 금지** — §2/§3의 Version Type 후보는 스펙 원문에 없는 유추이므로, 실 구현 착수 전 스펙 제공자 확인이 필요하다(추측 확정 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002, 이중)**: (a) 상위 Assignment Request(§10) 자체가 ABSENT — 그 Version도 당연히 ABSENT. (b) §6 Assignment Version·Assignment Registry 선행 미구현.
- **Gap-1**: 스펙이 Request Version 전용 필드/열거형을 제공하지 않음 — 본 DSAR의 §2/§3은 유추이며 **비확정**으로 명시 표기.
- **Gap-2**: 근접 substrate 없음(§4) — 유일 관련 인용은 반례(`replacePerms` in-place 교체)뿐.
- **정직 부재**: 지어낸 필드/열거형이 아님을 명확히 하기 위해 "비확정" 표기를 §2/§3에 유지. 스펙 재확인 전 코드화 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
