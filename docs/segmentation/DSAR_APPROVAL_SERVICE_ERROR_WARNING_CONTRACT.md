# DSAR — Service Error/Warning Contract (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Error/Warning Contract)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role(Part 3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(fail-closed) · 무후퇴 · 외부 벤더 자격증명 내부 identity 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차·279차 재플래그 금지

---

## 1. 목적

§32(Error Contract)는 **SERVICE_NOT_FOUND · SECRET_EXPIRED · CERTIFICATE_INVALID · CLIENT_REVOKED · TRUST_FAILED · SERVICE_RUNTIME_BLOCKED**(6종) 하드 차단 코드를, §33(Warning Contract)은 **Secret Rotation Due · Certificate Expiring · Trust Reduced · Runtime Drift**(4종) 소프트 경고를 정의한다. ★이 저장소에는 Canonical Service Error/Warning Contract 자체가 없다(grep 0) — api_key 인증 게이트(`index.php:477-622`)의 범용 401/403 응답이 유일하게 실물 코드로 존재하는 근접 Error다. 본 문서는 10개 코드 각각을 근접 substrate와 대조한다.

## 2. Canonical 필드

- **Code** — §32/§33 원문 10종 중 1
- **분류** — Error(하드 차단)/Warning(소프트 경고)
- **판정** — 근접 substrate 유무(PARTIAL/ABSENT)
- **현재 substrate** — file:line(없으면 ABSENT)
- **HTTP 대응(설계 방향)** — 실 구현 시 상태코드 매핑(순신규)

## 3. 열거형 / 타입

**Error(§32) 6종(원문 그대로)**: `SERVICE_NOT_FOUND` · `SECRET_EXPIRED` · `CERTIFICATE_INVALID` · `CLIENT_REVOKED` · `TRUST_FAILED` · `SERVICE_RUNTIME_BLOCKED`.

**Warning(§33) 4종(원문 그대로)**: `SECRET_ROTATION_DUE` · `CERTIFICATE_EXPIRING` · `TRUST_REDUCED` · `RUNTIME_DRIFT`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | 코드 | 분류 | 판정 | 근거(file:line) |
|---|---|---|---|---|
| 1 | `SERVICE_NOT_FOUND` | Error | **PARTIAL(근접·범용)** | api_key sha256 조회 실패 시 게이트 거부(`index.php:502-508`)가 근접 — 단 전용 `SERVICE_NOT_FOUND` 코드가 아니라 범용 401. Service/System/Machine identity 자체가 ABSENT(EXISTING §2)라 "Service"를 찾는 대상 자체가 api_key로 축소됨 |
| 2 | `SECRET_EXPIRED` | Error | **PARTIAL** | api_key `expires_at` 만료 검사(`index.php:518-520`)가 실 게이트 — 강제 max TTL 없음(EXISTING §4), 전용 에러코드 없이 범용 401 |
| 3 | `CERTIFICATE_INVALID` | Error | **ABSENT** | Certificate Governance 완전 부재(`cert_expires` grep 0·EXISTING §5). SAML sig 검증(`EnterpriseAuth.php:268`)·OIDC JWKS 소비(`:522-531`)는 발급/검증만이지 무효 판정 코드가 아님 |
| 4 | `CLIENT_REVOKED` | Error | **PARTIAL** | revoke(`Keys.php:135-148` `is_active=0`)+게이트 `is_active` 검사(`index.php:502-508`)가 기능적 근접 — 범용 401, 전용 `CLIENT_REVOKED` 코드 없음 |
| 5 | `TRUST_FAILED` | Error | **ABSENT** | Trust Level(Unknown~Critical) 통합 열거형 자체 grep 0(EXISTING §9). `is_active`(bool)+`expires_at`(string) 두 필드뿐, Trust 판정 로직 없음 |
| 6 | `SERVICE_RUNTIME_BLOCKED` | Error | **ABSENT** | Runtime Authorization/Runtime Context 자체 부재(ADR §거버넌스 계층 완전 부재) |
| 7 | `SECRET_ROTATION_DUE` | Warning | **ABSENT** | rotate 함수 실재(`Keys.php:150-187`)이나 회전 주기/최종회전일시 등 "due" 판정 스케줄 데이터 자체 없음(bin cron grep 0, DUPLICATE_AUDIT D-4) |
| 8 | `CERTIFICATE_EXPIRING` | Warning | **ABSENT** | Certificate Governance 부재(#3과 동일 근본 원인) |
| 9 | `TRUST_REDUCED` | Warning | **ABSENT** | Trust Level 부재(#5와 동일 근본 원인) — 감소를 판정할 기준값 자체가 없음 |
| 10 | `RUNTIME_DRIFT` | Warning | **ABSENT** | Snapshot/Evidence/Digest/Drift 계층 완전 부재(ADR §거버넌스 계층 완전 부재 명시 확정) |

## 5. 설계 원칙

1. **범용 401/403을 전용 Service Error 코드로 오표기 금지** — #1·#2·#4 모두 근접이나 api_key 게이트의 범용 실패 응답일 뿐 Service Identity Registry 판정 결과가 아님을 일관되게 PARTIAL로 명시.
2. **SERVICE_NOT_FOUND(#1)는 api_key 단일 substrate로 축소된 현실을 정직 반영** — Service/System/Machine/AI Agent/Integration 전용 identity 조회 대상이 ABSENT이므로, 향후 신설 시 이 조회 대상을 넓히는 것이지 api_key 조회를 대체하는 것이 아니다(무후퇴).
3. **SECRET_EXPIRED(#2)는 api_key `expires_at` 검사를 재구현하지 않고 전용 코드·강제 TTL을 그 위에 신설** — `index.php:518-520` 삭제·변경 금지.
4. **Warning 4종 전부 ABSENT를 날조하지 않는다** — 소프트 경고조차 발동하지 않는 현행을 정직하게 유지, "경고는 있는데 로그만 안 남긴다" 식 과장 금지.
5. **TRUST_FAILED/TRUST_REDUCED(#5·#9)는 Trust Level(Unknown~Critical) 신설이 선행** — 판정 기준값 자체가 없는 현행에서 "실패/감소"를 판정할 수 없음을 정직 유지.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 10종 전부 Canonical Service Identity Registry/Trust Level/Certificate Governance 실구현 이후에 실 코드 발동 가능.
- **ABSENT(순신규)**: `CERTIFICATE_INVALID`(#3)·`TRUST_FAILED`(#5)·`SERVICE_RUNTIME_BLOCKED`(#6)·Warning 4종 전부(#7~#10).
- **PARTIAL(근접·불충분)**: `SERVICE_NOT_FOUND`(#1)·`SECRET_EXPIRED`(#2)·`CLIENT_REVOKED`(#4).
- **판정**: NOT_CERTIFIED · 실 Contract = Canonical Service Identity Registry/Trust Level/Certificate Governance 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SERVICE_RUNTIME_GUARD]] · [[DSAR_APPROVAL_SERVICE_STATIC_LINT]] · [[DSAR_APPROVAL_SERVICE_API_CONTRACT]] · [[ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE]]
