# DSAR — Approval Service Trust Level (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Trust Level)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정도 사람 이상으로 통제 · 외부 벤더 자격증명 ≠ 내부 identity · UNKNOWN은 Permit하지 않음(fail-closed) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Service Trust Level은 비인간 주체의 런타임 신뢰도를 등급화하는 개념이다(스펙 §6·§18 Runtime Trust 요소·Canonical Entity `APPROVAL_SERVICE_TRUST`, §2). "이 서비스 identity를 지금 이 순간 얼마나 신뢰할 수 있는가"를 Credential·Authentication·Device·Environment·Network·Certificate·Rotation Status 등 복수 요소로부터 산출한다(스펙 §18). ADR D-2 "서비스 계정도 사람보다 더 엄격히" 원칙의 핵심 실행 지점이다.

## 2. Canonical 필드

스펙 §2·§6·§18 근거 설계 필드(코드 0·미확정):

- `trust_level_id`(PK) · `identity_ref`(→ Service Identity Registry) · `trust_grade`(§3 5단계 중 1) · `credential_signal` · `authentication_signal` · `device_signal` · `environment_signal` · `network_signal` · `certificate_signal` · `rotation_status_signal`(§18 7요소) · `evaluated_at` · `tenant_id`

## 3. 열거형 / 타입

- `trust_grade`(스펙 §6, 5단계): Unknown · Low · Medium · High · Critical.

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **Runtime Trust Level 자체 = ABSENT**: `trust_level`/`TrustLevel`/runtime trust grep 0(전수조사 §9). Unknown~Critical 5단계 통합 열거형이 코드베이스 어디에도 존재하지 않는다.
- **`SystemMetrics`의 unknown/critical = 오탐 배제 대상(무관)**: `SystemMetrics`의 `unknown`/`critical` 상태(`:376,393,397-417`)는 **cron 잡 실행 상태 모니터링**이며 identity 신뢰등급과 무관하다(전수조사 §9 "identity 신뢰등급 무관·오탐 배제" 명시). 이 문서를 Trust Level의 실 근거로 오인용 금지.
- **api_key `is_active`+`expires_at` = 2필드뿐, Trust Level 대체 불가**: `api_key`(`Db.php:942-958`)는 `is_active`(bool)+`expires_at`(string) 두 필드만 가지며, 게이트(`index.php:502-508,518-520`)는 이 둘을 단순 boolean 체크만 한다 — §18의 7요소(Credential/Authentication/Device/Environment/Network/Certificate/Rotation Status)를 종합한 등급 산출 로직은 전무(전수조사 §9).
- **7요소 중 부분 substrate만 개별 존재**: Credential 요소는 `Crypto.php:108-126,133-148`(암호화 여부), Authentication 요소는 `index.php:477-622`(인증 게이트 통과 여부), Rotation Status 요소는 `Keys.php:150-187`(rotate 함수 존재 여부)에 개별적으로 대응 가능한 신호가 있으나, 이들을 **결합해 하나의 등급으로 산출하는 로직은 grep 0**.

## 5. 설계 원칙

- **Trust Level = 순신규 계층, 기존 신호를 입력으로 조립**: 신규 Trust Level 엔티티를 신설하되, §18 7요소 중 credential/authentication/rotation_status 입력은 기존 `api_key.is_active`/`expires_at`(`Db.php:942-958`)·`Crypto.php` 암호화 상태·`Keys.php` rotate 이력을 원시 신호로 재사용한다(신규 신호 수집 인프라 발명 금지, Golden Rule).
- **UNKNOWN 등급은 Permit 금지(ADR D-2 §0 강제)**: `trust_grade='Unknown'`인 identity는 어떤 Runtime Policy(§11)로도 Allow 판정을 받아서는 안 된다 — 현재 api_key 게이트는 이런 fail-closed 등급 개념이 없으므로(§4), 신설 시 최우선 안전장치.
- **SystemMetrics cron 상태와 Trust Level을 절대 혼동/결합 금지**: 두 개념은 목적이 다르다(인프라 헬스 vs identity 신뢰) — 동일 unknown/critical 라벨이 재사용되더라도 별개 substrate로 유지.

## 6. Gap / BLOCKED_PREREQUISITE

- 7요소(Credential/Authentication/Device/Environment/Network/Certificate/Rotation Status) 중 Device·Environment·Network 신호는 substrate 자체가 grep 0 — 산출 불가능한 요소가 절반 이상.
- **BLOCKED_PREREQUISITE(RP-002)**: Trust Level이 실제로 Runtime Policy(Allow/Deny)에 반영되려면 Runtime Authorization(§3-6 내 별도 개념)·Decision Core가 선행되어야 하나 둘 다 설계 단계(코드 0).
- Certificate Governance(§3-6-자매편)가 순신규이므로 Certificate 신호가 비어 있는 상태에서 Trust Level 산출식은 불완전 — Certificate Governance 확정 후 재설계 필요.
