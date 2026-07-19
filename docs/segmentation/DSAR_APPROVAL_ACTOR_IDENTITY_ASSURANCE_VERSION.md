# DSAR — Actor Identity Assurance Version (06-A-03-02-03-03 · §11)

> EPIC 06-A-03-02-03-03 · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §11.

## 1. 원문 전사 (Canonical Contract)

§11 VERSION 필수 필드 (원문 전사):
- `version type` · 각종 snapshot(actor type/identity assurance/authentication assurance/session policy/device policy/impersonation policy/service account policy) · `immutable digest`
- `created by` · `reviewed by` · `approved by`

VERSION_TYPE enum(11종): `INITIAL` / `ACTOR_TYPE_CHANGE` / `IDENTITY_ASSURANCE_CHANGE` / `AUTHENTICATION_ASSURANCE_CHANGE` / `SESSION_POLICY_CHANGE` / `DEVICE_POLICY_CHANGE` / `IMPERSONATION_POLICY_CHANGE` / `SERVICE_ACCOUNT_POLICY_CHANGE` / `SECURITY_HARDENING` / `CORRECTION` / `MIGRATION`.

의미: Version은 Registry/Policy/Definition(§7~§10)의 **모든 변경을 불변 버전 레코드로 고정**하고, 각 버전이 담은 정책 스냅샷을 `immutable digest`로 봉인하여 "이 승인은 당시 어떤 assurance 정책 버전 하에 이뤄졌는가"를 재현 가능하게 한다. created/reviewed/approved by로 변경 자체의 maker-checker를 기록한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **assurance 정책 버전·스냅샷·digest는 부재** — `version type`(11종)·정책 snapshot·`immutable digest`·`valid_from/to`를 데이터로 선언하는 버전 구조체 전무. 신원/인증 정책은 코드 상수로 존재하며 **버전 이력이 없다**.
- 실존하는 **불변·digest 패턴 substrate**(버전객체 아님):
  - **불변 해시체인 CANONICAL** — `SecurityAudit.php:14-33`(append-only·`:27` prev_hash sha256). `immutable digest`의 재사용 패턴이나, 정책 버전 레지스트리가 아닌 단일 감사트레일.
  - **api_key expires_at** — `Db.php:942-955`. 자격 만료 재료이나 정책 버전 유효기간 아님.
- `version type`별 정책 snapshot(actor type/identity·authentication assurance/session/device/impersonation/service account policy) → **no hits**. `created/reviewed/approved by`(변경 maker-checker) → **no hits**.
- **장식 오인 금지**: `menu_audit_log.hash_chain`은 289차에 verify() 0으로 정정된 장식 — 정책 버전의 불변근거로 계상 금지.

## 3. 판정 (Verdict)

- Verdict: **ABSENT(버전 객체 자체) · PRESENT-substrate(불변 digest 패턴 = SecurityAudit)**
- 선행 의존: Version은 Registry(§7)·Policy(§9)·Definition(§10)의 버전이므로 **그 상위 3자가 ABSENT인 한 고정할 대상이 없다** → 연쇄 부재. 정책 snapshot의 봉인 digest는 §44/§45 Digest·앞 단계 Hash Policy(06-A-03-02-03-02 Crypto Hash Chain) 선행 필요. **BLOCKED_PREREQUISITE**.
- cover: **0**(정책 버전·스냅샷·digest 데이터 선언 전무). SecurityAudit 해시체인은 digest 실집행 패턴으로 KEEP_SEPARATE(감사트레일≠정책 버전 레지스트리).

## 4. 확장/구현 방향 (설계)

- 순신규 `actor_identity_assurance_version` — `version type`(11종) + Registry/Policy/Definition의 정책 snapshot + `immutable digest` + created/reviewed/approved by.
- **Golden Rule=Extend**: `SecurityAudit`(`SecurityAudit.php:14-33`)의 append-only sha256 체인을 `immutable digest`의 CANONICAL 봉인기로 재사용 — 신규 해시엔진 신설 금지. digest 입력 canonicalization은 앞 단계(06-A-03-02-03-02)의 Hash Policy 사용.
- **Mandatory Control**: 모든 assurance 정책 변경은 반드시 Version 레코드로만 반영(제자리 UPDATE 금지) → `SESSION_POLICY_CHANGE`/`IMPERSONATION_POLICY_CHANGE`/`SECURITY_HARDENING` 등 유형별 추적. `SECURITY_HARDENING` 유형은 289차 Mapping 하드닝·본 블록의 BLOCKED_SECURITY 수정 같은 변경을 봉인.
- **실위험**: 버전 부재로 현재 인증/신원 정책은 **제자리 변경 시 과거 승인의 정당성이 소급 변조**된다(감사 관점 치명, §2 Authorization Snapshot과 동형 위험). Version이 "그때의 정책값"을 불변 고정. `CORRECTION`/`MIGRATION` 유형으로 Legacy Actor(Email만) 정본화 이력도 봉인.

관련: [[DSAR_APPROVAL_ACTOR_IDENTITY_ASSURANCE_REGISTRY]] · [[DSAR_APPROVAL_ACTOR_IDENTITY_ASSURANCE_DEFINITION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
