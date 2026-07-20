# DSAR — Runtime Trust 승인 (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Runtime Trust · 스펙 §18)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · 외부 벤더 자격증명 ≠ 내부 identity(ADR D-3) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §18 Runtime Trust는 비인간 주체의 신뢰 수준을 **Credential · Authentication · Device · Environment · Network · Certificate · Rotation Status** 7요소로 판정하는 계층이다("서비스 계정도 사람보다 더 엄격하게" — ADR §0). EXISTING_IMPLEMENTATION §9가 firsthand로 확인한 바 `trust_level`/`TrustLevel`/runtime trust 문자열은 **grep 0**이며, 7요소 중 Credential·Authentication·Rotation Status만 개별 substrate가 부분 근접하고 Device·Environment·Network·Certificate는 완전 부재다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | trust id | Runtime Trust 판정 식별자 |
| 2 | service identity id | 대상 비인간 주체 |
| 3 | trust element | 아래 §3 열거형(7요소) |
| 4 | element score / state | 요소별 산출값 |
| 5 | trust level | Unknown~Critical(스펙 §6) 종합 등급 |
| 6 | evaluated at | 판정 시각 |

## 3. 열거형 / 타입

**Trust Element**(스펙 §18 원문): `CREDENTIAL` · `AUTHENTICATION` · `DEVICE` · `ENVIRONMENT` · `NETWORK` · `CERTIFICATE` · `ROTATION_STATUS`

**Trust Level**(스펙 §6, 종합 등급): `UNKNOWN` · `LOW` · `MEDIUM` · `HIGH` · `CRITICAL`

## 4. 실 substrate 매핑 (ABSENT — 종합 Trust Level 산출 계층 grep 0)

| Trust Element | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| CREDENTIAL | `Crypto.php` AES-256-GCM 봉투(channel_credential/connector_token/mfa_secret/oidc_client_secret/scim_token/vapid 암호화) | `Crypto.php:108-126,133-148` | **근접(암호화 존재)** — credential이 "존재/암호화됨"은 확인 가능하나 이를 신뢰 점수로 환산하는 로직 없음 |
| AUTHENTICATION | api_key `is_active`(bool)+`expires_at`(string) 게이트 | `index.php:502-520` | **근접(이분 게이트)** — Valid/Invalid 이진 판정만, Unknown/Revoked 구분 및 신뢰 요소로서의 결합 없음(§19 별편 참조) |
| DEVICE | 없음 — device fingerprint/attestation 관련 비인간 identity 컨텍스트 grep 0(EXISTING_IMPLEMENTATION 전 범위) | — | **ABSENT** |
| ENVIRONMENT | 없음 — Runtime Context(스펙 §9: Environment/Namespace/Cluster/Node/Container/Pod/Pipeline/Application) grep 0 | — | **ABSENT** |
| NETWORK | 없음 — mTLS·IP allowlist·Service Mesh Identity grep 0(EXISTING_IMPLEMENTATION §5 "mTLS grep 0") | — | **ABSENT** |
| CERTIFICATE | 없음 — cert_expires/trust chain/CRL/OCSP grep 0(EXISTING_IMPLEMENTATION §5) | — | **ABSENT** |
| ROTATION_STATUS | api_key rotate(`Keys.php:150-187`)·KEK rotateKek(`Crypto.php:133-148`) — 함수만, 상태 추적 없음 | `Keys.php:150-187`·`Crypto.php:133-148` | **근접(rotate 함수 실재)** — "마지막 회전 시각 대비 경과"를 신뢰 요소로 산출하는 로직·스케줄 부재(EXISTING_IMPLEMENTATION §4: 전부 수동·자동/주기 스케줄 bin cron grep 0) |

**경계 보존**: `SystemMetrics`의 unknown/critical 상태값(`:376,393,397-417`)은 cron 잡 모니터링 상태이며 identity 신뢰등급과 무관하다(EXISTING_IMPLEMENTATION §9 명시 오탐 배제) — Runtime Trust Level 근접 substrate로 오인 금지.

## 5. 설계 원칙

- ★7요소 중 CREDENTIAL·AUTHENTICATION·ROTATION_STATUS 3요소만 개별 근접 substrate가 있고, 이들을 하나의 종합 Trust Level(Unknown~Critical)로 **결합·산출하는 로직 자체가 grep 0**이다 — "부분 요소가 있으니 Trust Level도 있다"고 오판하지 않는다.
- DEVICE·ENVIRONMENT·NETWORK·CERTIFICATE 4요소는 완전 ABSENT — 실 서버 배포가 컨테이너/K8s가 아닌 전통적 LAMP 계열(`docs/DEPLOY_*.md`)이므로 스펙이 요구하는 Namespace/Cluster/Pod 개념 자체가 현 인프라와 불일치할 수 있음을 설계 시 고려(과잉 설계 방지 — 다만 이번 차수는 판정 명세만, 인프라 적합성 판단은 후속 구현 세션 소관).
- `SystemMetrics` unknown/critical을 Runtime Trust로 재사용 제안 금지(경계 보존, ADR §3 명시).
- 신설 시 CREDENTIAL은 `Crypto.php` 암호화 존재 여부를, AUTHENTICATION은 §19 Runtime Authentication(별편)의 PARTIAL 판정을, ROTATION_STATUS는 rotate 함수 호출 이력을 입력으로 재사용하되, Trust Level 산출식 자체는 순신규.

## 6. Gap / BLOCKED_PREREQUISITE

- 7요소 중 4요소(DEVICE/ENVIRONMENT/NETWORK/CERTIFICATE) 완전 ABSENT, 3요소(CREDENTIAL/AUTHENTICATION/ROTATION_STATUS)는 개별 근접이나 결합 산출 ABSENT.
- Trust Level(Unknown~Critical) 종합 등급 산출 및 영속화 = 순신규(ADR §3).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
