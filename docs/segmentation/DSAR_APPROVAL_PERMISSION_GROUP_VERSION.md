# DSAR — Permission Group Version (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **GROUND_TRUTH 인용원(반날조 allowlist)**: [ADR](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md) · [DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md). `file:line`은 이 2문서에서만 인용.

---

## ① 목적 (Purpose)

Permission Group Version은 Permission Group의 **구성(멤버 Permission·중첩 Group·제약·위험)을 시점별 불변 스냅샷으로 고정**한다. Group은 시간에 따라 원소가 바뀌므로, "이 승인 결정은 당시 `Payment Reviewer` Group의 어떤 버전(어떤 Permission 집합)으로 계산되었는가"를 재현·감사·롤백 가능하게 한다. In-place Update를 금지하고 Group 진화를 이력화한다.

## ② Canonical 필드

- `version id` · `tenant` · `group id`(대상 Group) · `version number`(단조증가)
- `permission membership snapshot`(당시 소속 Permission Definition Version 집합) · `nested group snapshot`(당시 중첩 Group 집합)
- `constraint`(당시 적용 제약) · `risk`(당시 위험등급) · `change summary` · `change type`(아래 열거)
- `created by` · `reviewed by` · `approved by` · `effective from` · `effective to` · `immutable digest`

## ③ 열거형

- **CHANGE_TYPE**(예시 열거): `INITIAL` / `MEMBER_ADDED` / `MEMBER_REMOVED` / `NESTED_GROUP_CHANGE` / `CONSTRAINT_CHANGE` / `RISK_CHANGE` / `CORRECTION` / `MIGRATION`.

## ④ substrate 매핑 (§92)

| Canonical 요소 | 실존 substrate | §92 태그 | 근거(allowlist) |
|---|---|---|---|
| 멤버십 변경 감사(maker) | `auth_audit_log`(permission 변경 기록) | Evidence PARTIAL | ADR §1 "auth_audit_log=변경만" |
| immutable digest 봉인 | 선행 06-A-03-02-03-02 Crypto Hash Chain append-only 체인 | KEEP_SEPARATE(재사용 봉인기) | ADR §7 선행 블록 링크 |
| membership/nested snapshot·constraint·risk·effective from-to·version | — | **ABSENT(순신규)** | ADR §D-4 "Version화·Snapshot=순신규" |

- Group 멤버십·중첩 스냅샷·`immutable digest`·`valid_from/to`를 데이터로 선언하는 버전 구조체 → **no hits(ABSENT)**. Group 자체 부재로 그 버전도 연쇄 부재.

## ⑤ 설계원칙

- **In-place Update 금지(Mandatory Control·ADR §6.16)**: 모든 Group 구성 변경은 Version 레코드로만 반영. 과거 승인이 참조한 "그때의 Group 구성"을 불변 고정하여 소급 변조 차단.
- **Golden Rule = Extend**: `immutable digest`는 선행 Crypto Hash Chain 봉인기 재사용(신규 해시엔진 금지). 변경 maker-checker는 `auth_audit_log` Evidence 확장.
- **Snapshot은 Version-bound 참조**: `permission membership snapshot`은 원소 Permission의 **Definition Version**을 가리킨다(느슨한 Code 참조 금지) — 원소 정의가 나중에 바뀌어도 스냅샷 시점 의미가 보존.
- **Cache Invalidation**: 신규 Group Version 발행 시 이 Group을 참조하는 Subject의 Effective Permission Set 캐시 무효화(Membership 문서의 Cache Invalidation Guard와 연동).
- **Group ≠ Role**: Group Version은 Permission 묶음 이력만 봉인. Role 부여 이력(Part 3)과 별개.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: 대상 Group·원소 Permission Definition Version·봉인할 Crypto Hash Chain·무효화할 Effective Cache가 모두 코드 0. 상위 부재로 버전이 고정할 대상 없음.
- **cover 0 · NOT_CERTIFIED**: Group 버전·스냅샷·digest 전무. 코드/DB 변경 0. Part 1 D-2 위험 4건 재플래그 금지.

관련: [[DSAR_APPROVAL_PERMISSION_GROUP]] · [[DSAR_APPROVAL_PERMISSION_GROUP_MEMBERSHIP]] · [[ADR_DSAR_PERMISSION_ENGINE_FOUNDATION]].
