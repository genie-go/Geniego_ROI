# DSAR — Permission Digest (EPIC 06-A-03-02-03-04 Part 2)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> 규율: Permission ≠ Role ≠ Authority · 반날조(file:line은 위 2문서 GROUND_TRUTH만) · Golden Rule(앞단계 Cryptographic Policy 재사용·중복 해시 체인 금지).

---

## ① 목적

**Definition·Grant·Effective Permission 스냅샷의 정규 직렬화 입력을 결정론적으로 해시해 불변·위변조 탐지 다이제스트를 산출.** 스냅샷/Evidence/Audit Event가 참조하는 무결성 앵커다. ★**앞단계 Cryptographic Policy를 재사용** — Part 1 Cryptographic Hash Chain(`SecurityAudit::verify` — 289차 후속 유일한 실 append-only tamper-evident 체인)을 그대로 얹는다. 신규 해시 스킴·신규 체인 발명 금지.

## ② Canonical 필드 — Digest Input 구성

세 종의 정규 입력(canonical serialization). 필드 순서·정규화 규칙은 결정론적이어야 하며, 하나라도 누락되면 재해시로 위변조 탐지가 무력화된다.

### 2.1 Definition Digest Input
`tenant` · `registry` · `namespace` · `code` · `version` · `domain` · `resource` · `action` · `effect` · `risk` · `scope` · `constraints` · `dependencies` · `exclusions` · `implications` · `actor` · `validity` · `lifecycle`.

### 2.2 Grant Digest Input
`grant_version` · `grantee` · `permission(code+definition_version)` · `source_type` · `source_chain` · `scope` · `constraints` · `validity` · `approval_ref` · `revocation_suspension_state` · `captured_at`.

### 2.3 Effective Permission Digest Input
`subject` · `effective_actor` · `resource` · `version` · `action` · `allow_set` · `deny_set` · `source_chains` · `hierarchy/group/bundle versions` · `constraints` · `resolved_time` · `valid_until`.

| 산출물 | 입력 | 참조처 |
|---|---|---|
| `definition_digest` | 2.1 | Permission Snapshot |
| `grant_digest` | 2.2 | Grant Snapshot |
| `effective_permission_digest` | 2.3 | Effective Snapshot |
| `chain_digest` | 위 + prev hash | Audit Event(해시 체인) |

## ③ 열거형

- **hash algorithm / chain**: Part 1 정책 상속(`SecurityAudit::verify` 체인 규격) — 본 Part에서 신규 알고리즘 선택 금지(재사용).
- **digest state**: `COMPUTED / VERIFIED / MISMATCH`(MISMATCH → Audit Event `DRIFT_DETECTED` 유발).

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 요소 | 실존 substrate | §92 분류 | 판정 |
|---|---|---|---|
| 해시 체인 / verify | Part 1 Cryptographic Hash Chain(`SecurityAudit::verify`) — 유일한 실 append-only tamper-evident 체인 | CANONICAL(재사용) | EXISTS — Permission Digest 미배선 |
| Definition Digest Input 재료 | `acl_permission`(code=menu_key·action `TeamPermissions.php:152-159`·`ACTIONS :39`)·`data_scope`(scope `:160-166`) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | PARTIAL(재료만·version/risk/constraints 등 ABSENT) |
| Grant Digest Input 재료 | `acl_permission` INSERT(`replacePerms :325`)·위임 사슬(`assignableMap :354-360`) | CANONICAL | PARTIAL(source_chain/validity/version ABSENT) |
| Effective Digest Input 재료 | `effectiveForUser :366`·`effectiveScope :236` | CANONICAL(Resolver) | PARTIAL(allow_set 계산·미영속·deny_set/version ABSENT) |
| `definition/grant/effective_permission_digest` 산출·영속 | 다이제스트 산출·저장 없음 | — | **ABSENT(순신규)** |

**핵심**: 해시 체인 primitive(`SecurityAudit::verify`)는 실재하므로 Digest는 **알고리즘 신설이 아니라 입력 정규화 + 기존 체인 결선**이다.

## ⑤ 설계 원칙

- **앞단계 Cryptographic Policy 재사용**(★) — Part 1 `SecurityAudit::verify` 체인만 사용. 중복 해시 스킴/체인 신설 금지(Golden Rule).
- **결정론적 정규 직렬화** — 필드 순서·정규화 고정. 누락 필드 = 재해시 위변조 창구이므로 §② 입력 전체가 필수.
- **Digest는 스냅샷 값에 대한 것** — 가변 현재값이 아니라 고정된 스냅샷 입력을 해시(재해석 방지).
- **MISMATCH → `DRIFT_DETECTED`** 감사(auth_audit_log SSOT).
- 실 구현 = 별도 승인세션(RP-002). 코드변경 0.

## ⑥ Gap

- **G1 ABSENT**: definition/grant/effective_permission_digest 산출·영속 순신규. 재료(§④)는 부분 존재하나 version/deny/constraints 축 미비.
- **G2 재사용 대기**: `SecurityAudit::verify` 체인은 실재하나 Permission 도메인에 미결선.
- **G3 BLOCKED_PREREQUISITE(RP-002)**: 스냅샷 3종·Part 1 Decision 저장체가 코드 0이라 Digest가 앵커할 대상이 아직 없음.
