# DSAR — Service Evidence (EPIC 06-A-03-02-03-04 Part 3-6)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
> **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
> **전수조사 근거**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
> **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실구현 후 별도 승인세션.
> **불변**: Evidence=Append-only(사후 수정 금지·정정은 신규 Evidence 추가) · **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용. 그 밖은 `ABSENT`. 외부 벤더 자격증명≠내부 identity. 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

Service Evidence = Service Snapshot이 참인지 뒷받침하는 개별 증거 단위 — **Authentication·Certificate·Secret·Runtime·Audit**(스펙 §24) 5축의 원자적 기록. Snapshot이 "그 시점 전체 상태"라면 Evidence는 "그 상태를 뒷받침하는 개별 근거"다.

- **순신규**: Service Evidence 저장·조회 구조 grep 0(전수조사 §10).
- **근접(개념참조만)**: ADR §3에서 "SecurityAudit tamper-evident 체인 승격"을 언급하나, 이는 **이벤트 로그**(무엇이 일어났는가)이지 **상태 증거**(그 시점 상태가 무엇이었는가)가 아니다. 본 3문서(ADR·EXISTING_IMPLEMENTATION·DUPLICATE_AUDIT)에 `SecurityAudit` 자체의 `file:line` 인용이 없으므로 여기서도 **인용 금지·개념 참조만** 유지한다.
- api_key 인증 게이트(`index.php:477-622`)의 통과/실패는 실시간 판정일 뿐, Evidence로 축적·조회되는 저장 기록이 아니다(별도 저장 테이블 grep 0).

## 2. Canonical 필드

`SERVICE_EVIDENCE` (전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | evidence_id | 증거 식별자 |
| 2 | tenant | 테넌트 스코프 |
| 3 | service_snapshot_ref | 결합 대상 Service Snapshot 참조 |
| 4 | evidence_type | Authentication/Certificate/Secret/Runtime/Audit(③) |
| 5 | source_ref | 근거 원본 참조(예: 인증 시도, cert 검증 결과) |
| 6 | captured_at | 캡처 시각 |
| 7 | evidence_payload | 증거 페이로드(결정론적 직렬화 대상) |
| 8 | evidence_digest | 증거 다이제스트(별편 Service Digest #14·#16 대응) |

## 3. 열거형 / 타입

- **evidence_type**: Authentication · Certificate · Secret · Runtime · Audit(스펙 §24 원문)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL)

| Evidence 축 | 최근접 substrate | 판정 | 근거 |
|---|---|---|---|
| Authentication evidence | api_key 인증 게이트 통과/실패(실시간 판정·저장 미축적) | **ABSENT**(축적 없음) | `index.php:477-622` |
| Certificate evidence | SAML sig 검증·OIDC JWKS 소비(검증만·증거 저장 없음) | **ABSENT** | `EnterpriseAuth.php:268`·`EnterpriseAuth.php:522-531` |
| Secret evidence | api_key rotate/revoke(이력 row 자체가 근접이나 Evidence 구조 아님) | **PARTIAL**(근접) | `Keys.php:150-187,135-148` |
| Runtime evidence | — | **ABSENT** | grep 0 |
| Audit evidence | SecurityAudit(이벤트 로그) 개념 근접 | **ABSENT**(개념참조만·본 3문서 file:line 미인용) | (개념·미인용) |
| Evidence 저장/조회 구조 자체 | — | **ABSENT** | grep 0 |

## 5. 설계 원칙

- **Evidence ≠ 이벤트 로그 원본**: 이벤트 로그는 재사용 가능한 근거 소스이나, Evidence 자체는 Snapshot에 결합된 별도 구조로 설계한다.
- **불변(Append-only)**: 사후 수정 금지, 정정은 신규 Evidence 추가.
- **Golden Rule(Extend)**: 기존 로그 인프라를 "소스"로 개념 재사용하되, 상태-증거 결합 구조 자체는 순신규(중복 로깅 인프라 신설 금지와는 별개 계층).
- **외부 벤더 분리**: Google/Snowflake 인증 이벤트는 Integration Evidence로 별도 분류, 내부 Service Evidence로 오흡수 금지(ADR D-3).

## 6. Gap / BLOCKED_PREREQUISITE

- Evidence 5축(Authentication/Certificate/Secret/Runtime/Audit) 저장 구조 = **전량 ABSENT**.
- Evidence Digest 결합 = **BLOCKED_PREREQUISITE**(별편 Service Digest·Snapshot 선행).
- 실 Evidence 엔진 = 선행 substrate 실구현 후 **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
