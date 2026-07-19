# DSAR — Permission Engine Error/Warning Contract (EPIC 06-A-03-02-03-04 Part 2 · §90·§91)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
- **규율**: 코드/DB 0 · BLOCKED_PREREQUISITE(RP-002) · 반날조(file:line은 상위 2문서만) · Permission≠Role≠Authority · Golden Rule · Part1 D-2 재플래그 금지

---

## ① 목적

§90(Error)·§91(Warning)의 **코드 목록 정본**이다. Permission Engine의 모든 거부/경고는 여기 정의된 안정적(stable) 코드로만 표현하며, 자유 문자열 메시지에 의존하지 않는다. 이 코드는 §89 Runtime Guard 실패, §94 API 응답, §98 Test(에러 계약 검증)가 공통 참조한다. **Error=집행 차단(거부)**, **Warning=집행은 되나 리스크/후속조치 필요**. 현행은 `TEAM_READ_ONLY`·`DELEGATION_EXCEEDED` 등 산발적 코드만 존재(순신규 대상).

## ② 핵심 항목/열거

### §90 Error 코드 (집행 차단 · `APPROVAL_PERMISSION_*` 접두)

| 코드 | 의미 | 대응 Runtime Guard(§89) |
|---|---|---|
| `APPROVAL_PERMISSION_REGISTRY_NOT_FOUND` | Registry 미탑재 | #1 |
| `APPROVAL_PERMISSION_DEFINITION_NOT_FOUND` | 정의 부재 | #2 |
| `APPROVAL_PERMISSION_VERSION_NOT_FOUND` | 버전 부재 | #3 |
| `APPROVAL_PERMISSION_VERSION_MISMATCH` | 요청 버전≠활성 버전 | #3 |
| `APPROVAL_PERMISSION_INACTIVE` | 비활성 정의/grant | #5 |
| `APPROVAL_PERMISSION_SUSPENDED` | 정지된 grant | #6 |
| `APPROVAL_PERMISSION_REVOKED` | 철회된 grant | #7 |
| `APPROVAL_PERMISSION_EXPIRED` | 만료 grant | #8 |
| `APPROVAL_PERMISSION_NOT_GRANTED` | grant 부재(Default Deny) | #4 |
| `APPROVAL_PERMISSION_EXPLICITLY_DENIED` | Explicit Deny 매칭 | #9 |
| `APPROVAL_PERMISSION_SCOPE_MISMATCH` | Scope(tenant/org/resource/field/row/data/api/client/channel) 불일치 | #10~#22 |
| `APPROVAL_PERMISSION_RESOURCE_VERSION_MISMATCH` | 리소스 버전 불일치 | #15 |
| `APPROVAL_PERMISSION_ACTION_MISMATCH` | action 불일치 | #16 |
| `APPROVAL_PERMISSION_CONSTRAINT_FAILED` | Amount/Currency/Time 제약 실패 | #23~#25 |
| `APPROVAL_PERMISSION_DEPENDENCY_MISSING` | 선행 권한 부재 | #26 |
| `APPROVAL_PERMISSION_EXCLUSION_VIOLATION` | 상호배제 위반 | #27 |
| `APPROVAL_PERMISSION_CONFLICT` | 권한 충돌 | #28 |
| `APPROVAL_PERMISSION_CIRCULAR` | 순환 참조 | #29 |
| `APPROVAL_PERMISSION_AMBIGUOUS` | 결정 모호(fail-closed) | #30 |
| `APPROVAL_PERMISSION_ACTOR_TYPE_INVALID` | actor 타입 부적합 | #31 |
| `APPROVAL_PERMISSION_ACTOR_RESTRICTED` | 서비스/시스템 액터 제한 | #32 |
| `APPROVAL_PERMISSION_SCOPE_EXPANSION_BLOCKED` | 미승인 범위 확장 | #33 |
| `APPROVAL_PERMISSION_DRIFT_DETECTED` | 정의/캐시 드리프트 | #34 |
| `APPROVAL_PERMISSION_DIGEST_MISMATCH` | Snapshot 다이제스트 불일치 | #35 |
| `APPROVAL_PERMISSION_CACHE_INTEGRITY_FAILED` | 캐시 무결성 실패 | #36 |
| `APPROVAL_PERMISSION_CROSS_TENANT_BLOCKED` | 크로스테넌트 grant 사용 | #37 |
| `APPROVAL_PERMISSION_RUNTIME_BLOCKED` | 우회/미분류 런타임 차단 | #38 |

### §91 Warning 코드 (집행되나 리스크 고지)

| 코드 | 의미 |
|---|---|
| `APPROVAL_PERMISSION_DEPRECATION` | 폐기 예정 정의/코드 사용 |
| `APPROVAL_PERMISSION_VERSION_WARNING` | 비최신 버전 참조 |
| `APPROVAL_PERMISSION_GRANT_EXPIRING` | grant 만료 임박 |
| `APPROVAL_PERMISSION_REVIEW_DUE` | 정기 재검토 기한 도래 |
| `APPROVAL_PERMISSION_DIRECT_GRANT` | 그룹/역할 경유가 아닌 직접 grant |
| `APPROVAL_PERMISSION_TEMPORARY` | 임시 grant 사용 |
| `APPROVAL_PERMISSION_EMERGENCY` | 긴급 grant 사용(사후 감사 필요) |
| `APPROVAL_PERMISSION_WILDCARD` | wildcard 범위 사용 |
| `APPROVAL_PERMISSION_SCOPE_EXPANSION` | 범위 확장 경향 감지 |
| `APPROVAL_PERMISSION_CONFLICT_WARNING` | 잠재 충돌 감지 |
| `APPROVAL_PERMISSION_AMBIGUITY_WARNING` | 잠재 모호성 감지 |
| `APPROVAL_PERMISSION_CACHE_WARNING` | 캐시 신선도 경고 |
| `APPROVAL_PERMISSION_DRIFT_WARNING` | 드리프트 경고(비차단) |
| `APPROVAL_PERMISSION_RECONCILIATION` | 재조정 필요 |
| `APPROVAL_PERMISSION_MIGRATION` | 마이그레이션 진행/필요 |
| `APPROVAL_PERMISSION_MANUAL_REVIEW` | 수동 검토 요망 |

## ③ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

- **현행 산발 에러코드(순신규 흡수 대상)** — `guardTeamWrite`/`index.php:82`의 `TEAM_READ_ONLY`(member 쓰기 차단) · `putMemberPermissions :628-647`의 403 `DELEGATION_EXCEEDED`(위임상한). 이 둘이 Permission 거부의 실 코드 선례이나 **`APPROVAL_PERMISSION_*` 표준 접두·전 스펙트럼은 ABSENT**.
- **Default Deny/Action 매핑처** — `TeamPermissions.php:152-171`·`ACTIONS :39`·`effectiveForUser :366` → `NOT_GRANTED`/`ACTION_MISMATCH` 산출 지점.
- **Explicit Deny 매핑처** — `DENY_SCOPE :234`·`1=0` `:290,303` → `EXPLICITLY_DENIED`/`SCOPE_MISMATCH`.
- **Cross-Tenant 매핑처** — `index.php:619`(tenant 강제주입) → `CROSS_TENANT_BLOCKED`.
- **Warning 코드 전체 · Version/Revoked/Expired/Emergency/Temporary/Drift/Digest 에러** — **ABSENT(순신규)**.

## ④ 설계 원칙

- **안정 코드 우선**: 모든 거부/경고는 stable 코드로 표현·i18n 메시지는 코드에서 파생. 자유 문자열 판정 금지.
- **Error≠Warning 분리**: Error=집행 차단(HTTP 403/409 등)·Warning=집행+리스크 고지(응답 warnings 배열). Warning을 Error로, Error를 Warning으로 강등/승격 금지.
- **fail-closed 매핑**: Ambiguous/Drift/Digest 불일치/모호는 Error(차단)로 매핑 — "경고 후 통과" 금지.
- **민감정보 비노출**: 에러 응답에 grant 세부/타테넌트 리소스 식별자 노출 금지(§94 Sensitive Redaction과 짝).
- **Permission≠Authority**: `CONSTRAINT_FAILED`(금액/통화/시간)는 Part 5 Authority 연결 결과를 표면화하되 Permission 코드 네임스페이스는 유지.

## ⑤ Gap

- 전 코드 순신규 — 현행은 `TEAM_READ_ONLY`·`DELEGATION_EXCEEDED` 2건만 실재. `APPROVAL_PERMISSION_*` 스펙트럼은 ABSENT.
- BLOCKED_PREREQUISITE(RP-002): `VERSION_*`/`REVOKED`/`EXPIRED`/`DIGEST_MISMATCH`/`DRIFT_*`는 Grant Version·Snapshot·Decision Core 선행 필요.
- ★이 문서는 **코드 목록 정본** — §89/§94/§98이 참조. 코드 신설·라이브 배선은 별도 승인세션.
