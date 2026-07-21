# DSAR — Certification Error Contract (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §31(Error Contract)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §31은 §29(Runtime Guard)가 탐지한 위반 상태를 **API 소비자에게 일관된 계약**으로 노출하는 에러 코드 체계를 정의한다. 명확한 에러 계약이 없으면 Runtime Guard의 차단이 클라이언트/운영자에게 불투명한 500 오류로만 보여 원인 추적이 불가능해진다. §31은 7개 에러 코드를 정의한다.

- `CERTIFICATION_NOT_FOUND`
- `REVIEW_NOT_FOUND`
- `INVALID_REVIEWER`
- `REVIEW_OVERDUE`
- `EVIDENCE_REQUIRED`
- `CERTIFICATION_EXPIRED`
- `REMEDIATION_FAILED`

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(신규 계약)**

Ground-Truth ①·②의 실측 결론에 따르면, 위 7개 에러 코드 문자열은 코드베이스 전체에서 grep 0이며, Certification 전용 에러 계약 자체가 순신규다. 다만 프로젝트 전역의 API 에러 응답 관례(HTTP status + 에러 코드 문자열 조합)는 기존 인증 미들웨어(`index.php`)에 이미 존재하므로, **응답 포맷 관례는 계승**하되 코드 값 자체는 신규 정의한다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| `CERTIFICATION_NOT_FOUND` | ABSENT(신규) | grep 0. §26 Snapshot ABSENT에 종속 |
| `REVIEW_NOT_FOUND` | ABSENT(신규) | grep 0 |
| `INVALID_REVIEWER` | ABSENT(신규) | grep 0. 근접 개념: `PM/Assignees.php:14`(reviewer role enum) — 열거형뿐, 에러 코드 없음 |
| `REVIEW_OVERDUE` | ABSENT(신규) | grep 0. §32 Warning Contract의 "Review Due Soon"과 대구를 이루는 에러 등급(경고 단계를 넘어선 강제 차단) |
| `EVIDENCE_REQUIRED` | ABSENT(신규) | grep 0. §29 Missing Evidence 가드의 응답 표현 |
| `CERTIFICATION_EXPIRED` | ABSENT(신규) | grep 0. 응답 포맷 관례는 계승 가능: `index.php:518`(expires 강제) — API 키 만료 시 거부 응답 패턴(코드 값은 다르나 "만료=거부+명시적 코드" 관례 재사용) |
| `REMEDIATION_FAILED` | ABSENT(신규) | grep 0. 시정조치(remediation) 개념 자체가 이 도메인 신규 |
| 전체 응답 포맷(HTTP status + code) | PARTIAL(관례만 계승) | `index.php:604`·`:608`(tenant 위조차단 응답) — 구조화된 에러 응답 관례의 선례 |

### 2.3 KEEP_SEPARATE (해당 시)

- `index.php:518`·`:604`·`:608` — API 키/세션 인증 미들웨어의 에러 응답이며, 코드 값·의미 도메인이 Certification 전용 7종과 다르다. **응답 포맷 관례(HTTP status + machine-readable code)만** 계승하고 코드 값·네임스페이스는 완전히 분리한다(예: 기존 인증 에러와 Certification 에러가 동일 코드 문자열을 공유하지 않도록 접두사 구분 필요).

## 3. Canonical 설계

각 에러의 발동조건·HTTP status·fail-secure 매핑:

| 에러 코드 | 발동조건 | HTTP | fail-secure 동작 |
|---|---|---|---|
| `CERTIFICATION_NOT_FOUND` | 참조된 Certification(§26 Snapshot) 레코드가 존재하지 않음 | 404 | 권한 행사 거부(존재 미확인=거부) |
| `REVIEW_NOT_FOUND` | 참조된 Review 레코드가 존재하지 않음 | 404 | 해당 Review 기반 판정 거부 |
| `INVALID_REVIEWER` | Reviewer가 비활성/미배정/권한 불일치 | 403 | Decision 기록 거부(§29 Unauthorized Decision과 연동) |
| `REVIEW_OVERDUE` | Review 기한이 SLA(§32 SLA At Risk 경고 이후) 초과 | 409 | 관련 권한을 임시 정지(재검토 완료까지 실효 권한 축소) — 완전 삭제가 아닌 정지로 무후퇴 원칙 준수 |
| `EVIDENCE_REQUIRED` | Decision 기록 시 Evidence 필드 누락 | 422 | Decision 기록 자체를 거부 |
| `CERTIFICATION_EXPIRED` | Certification 유효기간 경과(§26 Timestamp 기준 계산) | 401 | 즉시 재인증 요구, 만료된 권한으로의 행사 차단(`index.php:518` 철학 계승) |
| `REMEDIATION_FAILED` | Runtime Guard 위반 후 자동 시정조치(예: 권한 임시 정지) 자체가 실패 | 500 | 시정조치 실패는 **더 강한 차단**으로 대체(재시도 대신 수동 개입 알림) — 절대 "실패했으니 통과"로 처리하지 않음(fail-secure 핵심) |

- **에러 응답 스키마**: `{ "error_code": "<위 7종>", "http_status": <int>, "detail": <구조화 메시지>, "guard_ref": "<§29 위반 유형>", "timestamp": "<서버 시각>" }`.
- **네임스페이스 분리**: Certification 에러 코드는 기존 인증 미들웨어 에러 코드와 별도 접두사(예: `CERT_*` 등 SPEC 확정 필요)로 충돌을 원천 방지.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 응답 포맷 관례(status+code) | `index.php:604`·`:608`(tenant 위조차단 응답) | 승격(포맷 관례만) |
| 만료 응답 철학 | `index.php:518`(expires 강제) | 승격(철학만, 코드 값은 신규) |
| 7종 에러 코드 값 자체 | 없음 | 신규 |
| REMEDIATION_FAILED 개념 | 없음 | 신규 |

## 5. 무후퇴 · Extend

- `index.php`의 기존 에러 응답 로직(만료/tenant 위조)은 수정하지 않는다. Certification 에러 계약은 **별도 네임스페이스의 신규 코드 집합**으로 추가되며, 기존 인증 에러 코드를 대체하지 않는다.
- §29(Runtime Guard) 6종 위반 유형과 §31 7종 에러 코드는 1:1 대응이 아니라 다대다 매핑일 수 있음을 SPEC 확정 단계에서 명시(예: Missing Reviewer → `INVALID_REVIEWER`, Duplicate Review → 별도 코드 필요 시 §31 확장).
- `REVIEW_OVERDUE`/`CERTIFICATION_EXPIRED` 발동 시에도 권한을 **완전 삭제하지 않고 임시 정지**로 처리해 무후퇴 원칙(복구 가능성 보존)을 지킨다.
- P1~P5(featurePlan fail-secure 등)의 기존 에러 처리 관례와 충돌하지 않도록 코드 네임스페이스를 분리한다.

## 5-A. §31(Error) vs §32(Warning) 경계 원칙

Part 3-8 6개 엔티티 중 §31과 §32는 짝을 이루는 문서다. 경계 원칙은 다음과 같다.

- **되돌릴 수 없는 침해가 임박/발생**했으면 §31 에러(차단). 예: `CERTIFICATION_EXPIRED`는 만료된 인증으로 권한이 행사되는 즉시 침해가 발생하므로 차단.
- **아직 침해는 없으나 방치 시 §31로 악화될 상태**면 §32 경고(비차단). 예: `SLA At Risk`는 `REVIEW_OVERDUE`(§31 발동의 전제 조건)로 악화되기 전 단계.
- 이 원칙에 따라 §31의 `REVIEW_OVERDUE`는 §32의 `SLA At Risk` 경고가 무시된 뒤 실제로 기한을 넘긴 시점에만 발동해야 하며, 두 문서의 임계값(경고 임계값 < 차단 임계값)은 반드시 일관되게 SPEC에서 함께 확정한다.

### 5-B. 타 Part 3-8 엔티티와의 관계

- §29(Runtime Guard) 6종 위반 유형이 본 문서 7종 에러 코드의 1차 발동 트리거다.
- §30(Static Lint)의 사전 차단이 충분히 작동하면 일부 §31 에러(특히 Bypass Certification 계열)의 런타임 발동 빈도가 줄어드는 예방-대응 관계다(§30 문서 5-B 참조).
- §26(Snapshot)의 Timestamp 필드가 `CERTIFICATION_EXPIRED` 판정의 유일한 계산 기준이므로, Timestamp 저장 방식(서버 시각 단일 소스)이 확정되지 않으면 만료 판정 자체가 불가능하다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: §26(Snapshot)~§29(Runtime Guard) 선행 확정
- [ ] 7종 에러 코드의 정확한 문자열 값·네임스페이스 접두사 확정
- [ ] §29 위반 유형 ↔ §31 에러 코드 매핑표 최종 확정(다대다 여부 포함)
- [ ] §32 경고 임계값과 §31 차단 임계값의 일관성 검증(경고 < 차단)
- [ ] REMEDIATION_FAILED 시 수동 개입 알림 경로 확정
- [ ] 기존 index.php 에러 코드와의 네임스페이스 충돌 검증
- [ ] 코드 변경 0 유지 확인
- [ ] NOT_CERTIFIED 상태 유지 — 실 구현은 별도 승인 세션

## 7. 반날조 인용 출처

- SPEC §31(Error Contract)
- ADR D-4(Attestation/Evidence 불변) · D-7(정직분리) · D-6(KEEP_SEPARATE)
- Ground-Truth ① §(index.php 만료/tenant 위조 응답 관례) · ② (해당 없음 — 이 엔티티는 KEEP_SEPARATE 근접물 없이 순신규)
- ABSENT 항목(7종 에러 코드 전체)은 grep 0 실측 명시 — index.php 응답은 "포맷 관례"로만 참조, 코드 값 자체는 신규임을 명시
