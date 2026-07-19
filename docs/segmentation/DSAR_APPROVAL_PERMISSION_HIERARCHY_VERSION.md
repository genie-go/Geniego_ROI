# DSAR — Permission Hierarchy Version (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **GROUND_TRUTH 인용원(반날조 allowlist)**: [ADR](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md) · [DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md). `file:line`은 이 2문서에서만 인용.

---

## ① 목적 (Purpose)

Permission Hierarchy Version은 Hierarchy(계층 골격)의 **모든 변경을 불변 버전 레코드로 고정**하고, 그 시점의 edge 집합·root·max depth를 스냅샷으로 봉인한다. "이 승인 결정은 당시 어떤 Permission 계층 버전 하에서 계산되었는가"를 재현 가능하게 하며, 계층 변경 시 하위 Effective(유효권한) 캐시를 **무효화하는 트리거**의 정본이다. In-place Update를 금지하고, 계층 진화를 감사·롤백 가능한 이력으로 만든다.

## ② Canonical 필드

- `version id` · `tenant` · `hierarchy id`(대상 계층) · `version number`(단조증가)
- `edge snapshot`(당시 Hierarchy Edge 전체 집합) · `root snapshot`(root permission 상태) · `max depth`(당시 실측 깊이)
- `change summary`(변경 요약) · `change type`(아래 열거) · `created by` · `reviewed by` · `approved by`
- `effective from` · `effective to` · `immutable digest`(스냅샷 봉인 해시) · `cache invalidation token`(Effective Cache 무효화 신호)

## ③ 열거형

- **CHANGE_TYPE**(예시 열거): `INITIAL` / `EDGE_ADDED` / `EDGE_REMOVED` / `ROOT_CHANGE` / `DEPTH_CHANGE` / `COMBINING_BEHAVIOR_CHANGE` / `CORRECTION` / `MIGRATION`.

## ④ substrate 매핑 (§92)

| Canonical 요소 | 실존 substrate | §92 태그 | 근거(allowlist) |
|---|---|---|---|
| 변경 감사(maker) | `auth_audit_log`(permission 변경만 기록) | Evidence PARTIAL | ADR §1 "auth_audit_log=변경만·per-request 미감사" |
| immutable digest 봉인 | 선행 06-A-03-02-03-02 Crypto Hash Chain 블록의 append-only 해시체인 | KEEP_SEPARATE(재사용 봉인기) | ADR §7 선행 블록 링크 |
| edge/root/depth snapshot·effective from-to·cache invalidation | — | **ABSENT(순신규)** | ADR §D-4 "Version화·Snapshot=순신규" |

- Permission 계층 버전·edge/root 스냅샷·`immutable digest`·`valid_from/to`를 데이터로 선언하는 구조체 → **no hits(ABSENT)**. 계층 자체가 부재하므로 그 버전도 연쇄 부재.

## ⑤ 설계원칙

- **Golden Rule = Extend**: `immutable digest`는 신규 해시엔진 신설 금지 — 선행 Crypto Hash Chain(06-A-03-02-03-02) append-only 봉인기를 재사용. 변경 maker-checker(`created/reviewed/approved by`)는 `auth_audit_log`를 Evidence substrate로 확장.
- **In-place Update 금지(ADR §6.16 Mandatory Control)**: 모든 계층 변경은 Version 레코드로만 반영. 과거 승인의 정당성이 소급 변조되지 않도록 "그때의 계층값"을 불변 고정.
- **Cache Invalidation**: Hierarchy가 변경(신규 Version 발행)되면 하위 Effective Permission Set/Deny Set 캐시를 `cache invalidation token`으로 무효화. 무효화 없는 In-place 계층 변경은 stale 유효권한을 유발하므로 금지.
- **Permission ≠ Role ≠ Authority**: 계층 버전은 Permission 관계 이력만 봉인. Role/Authority 버전과 별개.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: 대상 Hierarchy(순신규)·봉인할 Crypto Hash Chain 실체·무효화할 Effective Cache가 모두 코드 0. 상위 3자 부재로 버전이 고정할 대상 없음(연쇄 부재).
- **cache invalidation 실위험**: 현재 permission 상태는 버전·스냅샷이 없어 변경 시 소급 변조 위험(감사 관점 치명). Version이 이를 봉인하나 선행 Cache 계층 신설 후에만 유효.
- **cover 0 · NOT_CERTIFIED**: 코드/DB 변경 0. Part 1 D-2 위험 4건 재플래그 금지(ADR §D-2).

관련: [[DSAR_APPROVAL_PERMISSION_HIERARCHY]] · [[DSAR_APPROVAL_PERMISSION_HIERARCHY_EDGE]] · [[ADR_DSAR_PERMISSION_ENGINE_FOUNDATION]].
