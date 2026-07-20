# DSAR — Approval Service Runtime Policy (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Runtime Policy)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: Require mTLS/Certificate/Vault/Rotation(운영 시 강제)은 전부 순신규 · index.php RBAC 게이트=Allow/Deny 근접일 뿐 6종 정책 전체 아님(과대 대입 금지) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Runtime Policy는 스펙 §11이 정의하는 비인간 주체의 런타임 실행 정책(Allow·Deny·ReadOnly·Require mTLS·Require Certificate·Require Vault·Require Rotation)이다. ADR §1·ground-truth §1·D-2는 현행 시스템이 **api_key 인증 게이트를 통한 Allow/Deny 판정**(RBAC rank+scope 통과 시 허용, 미달 시 차단)은 실재하지만, ReadOnly 강제·Require mTLS/Certificate/Vault/Rotation 4종은 전무하다고 확정한다. 본 엔티티는 "요청이 인증/인가 게이트를 통과/차단당한다"는 것과 "Runtime Policy 7종이 형식화되어 강제된다"는 것을 정직 구분한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `service_runtime_policy_id` | Runtime Policy 레코드 식별자(PK) |
| `policy_type` | §11 열거(Allow/Deny/ReadOnly/Require mTLS/Require Certificate/Require Vault/Require Rotation) |
| `enforced_at` | 강제 지점(현행 `index.php` 인증 게이트 재사용, Allow/Deny만) |
| `policy_source` | 정책 정의 출처(현행 RBAC rank 하드코딩 — 순신규 정책 엔진 부재) |

## 3. 열거형 / 타입

- **`policy_type`**(스펙 §11 verbatim, 7종): `Allow` · `Deny` · `ReadOnly` · `Require mTLS` · `Require Certificate` · `Require Vault` · `Require Rotation`.

## 4. 실 substrate 매핑 (PARTIAL(Allow/Deny만)/ABSENT(5종)·ground-truth만 인용)

| 정책 유형(스펙 §11) | 판정 | 실 substrate (file:line) |
|---|---|---|
| Allow(RBAC 통과 시 허용) | **PARTIAL/PRESENT** | 인증 게이트 RBAC rank+scope 통과(`index.php:572-598`)·테넌트 바인딩(`:609-619`) |
| Deny(RBAC 미달/만료/미활성 시 차단) | **PARTIAL/PRESENT** | sha256 조회+`is_active` 검사(`index.php:502-508`)·만료(`:518-520`)·레이트리밋(`:527-570`) |
| ReadOnly(강제) | **ABSENT** | ground-truth에 role 기반 write 제한(`analyst+`/`write:*`) 서술은 있으나 Runtime Policy 차원의 "ReadOnly 정책 객체"로 형식화된 근거 미인용 |
| Require mTLS | **ABSENT** | ground-truth §5 "mTLS grep 0" |
| Require Certificate | **ABSENT** | 인증서 생애주기 자체가 ABSENT([`DSAR_APPROVAL_SERVICE_CERTIFICATE_GOVERNANCE`](DSAR_APPROVAL_SERVICE_CERTIFICATE_GOVERNANCE.md) 참조) — Require 정책은 더더욱 순신규 |
| Require Vault | **ABSENT** | ground-truth D-3 "HashiCorp Vault/AWS Secrets Manager/KMS 연동 grep 0" |
| Require Rotation | **ABSENT** | rotate는 수동 함수만 실재·강제 정책 없음([`DSAR_APPROVAL_SERVICE_SECRET_ROTATION`](DSAR_APPROVAL_SERVICE_SECRET_ROTATION.md) §4 재확인) |

★ground-truth §1 원문: "인증 게이트(`index.php:477-622`): 추출(`:478-486`)·sha256 조회+is_active(`:502-508`)·만료(`:518-520`)·사용량(`:522-525`)·레이트리밋(`:527-570`)·RBAC rank+scope(`:572-598`)·테넌트 바인딩(`:609-619`·헤더 위조 차단)." D-3 원문: "Crypto KEK=env `CRED_ENC_KEY` 또는 `app_setting.cred_enc_key`(`Crypto.php:45-74`·fail-closed). ★HashiCorp Vault/AWS Secrets Manager/KMS 연동 grep 0."

## 5. 설계 원칙

1. **`index.php` 인증 게이트(477-622)를 Allow/Deny Runtime Policy의 Enforcement Point substrate로 재사용(확장)** — 신규 Allow/Deny 판정 로직 재구현 금지. Runtime Policy 계층은 이 게이트 위에 정책 객체(현행 하드코딩된 RBAC rank 비교를 데이터 기반 정책으로 승격)를 얹는 형태로 조립.
2. **ReadOnly/Require mTLS/Require Certificate/Require Vault/Require Rotation 5종은 순신규 설계** — 근접 substrate가 grep 0이므로 "이미 부분적으로 갖춰졌다"고 과신 금지. ADR D-2("서비스 계정도 사람보다 더 엄격")가 요구하는 핵심 신규 계층.
3. **Require Certificate/Require Vault/Require Rotation 3종은 각각 [`DSAR_APPROVAL_SERVICE_CERTIFICATE_GOVERNANCE`](DSAR_APPROVAL_SERVICE_CERTIFICATE_GOVERNANCE.md)·Vault Reference(D-3 신규)·[`DSAR_APPROVAL_SERVICE_SECRET_ROTATION`](DSAR_APPROVAL_SERVICE_SECRET_ROTATION.md)이 성숙된 이후에만 의미 있는 Runtime Policy가 됨** — 선결 종속성 명시(설계 순서 참고, 강제 배선 순서는 아님).
4. **Runtime Guard(스펙 §30)와의 관계**: Runtime Policy는 "무엇을 요구하는가"의 선언이고 Runtime Guard는 "만료/폐기 상태를 만나면 차단하는 실행부"로 스펙상 별개 절(§11 vs §30) — 혼동 없이 분리 설계.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Runtime Policy가 Service Role/Effective Service Permission·Runtime Guard와 결합되는 지점은 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실 구현 이후. 본 차수 코드 0.
- **Gap-1(5/7 정책 유형 미인용)**: ReadOnly·Require mTLS·Require Certificate·Require Vault·Require Rotation — ground-truth grep 0. 순신규.
- **Gap-2(Allow/Deny 정책 하드코딩)**: 현행 RBAC rank 비교는 코드에 하드코딩되어 있으며, Runtime Policy가 요구하는 "정책 객체로서 조회/버전관리 가능한" 형태가 아님 — 승격 필요.
- **Gap-3(선결 종속)**: Require Certificate/Vault/Rotation은 각각의 Governance 엔티티가 ABSENT이므로 이 3종 정책은 해당 엔티티 설계 완결 없이는 실체 없는 선언에 그침.
- **정직 부재**: 인증 게이트의 Allow/Deny 실재를 "Runtime Policy 7종이 갖춰졌다"로 확대 해석 금지 — 2/7만 근접. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실 구현 + 별도 승인세션(RP-002).
