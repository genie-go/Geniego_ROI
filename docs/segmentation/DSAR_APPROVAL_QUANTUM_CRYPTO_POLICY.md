# DSAR — Authorization Crypto Policy Engine (Part 3-23 §14·§12)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §14·§12)
조직 전역의 **Crypto Policy Engine**을 정의한다: Allowed/Deprecated Algorithms 목록, Mandatory Key Length, Rotation Frequency, Certificate Lifetime, 그리고 NIST/FIPS 준거(§12 Compliance). 정책은 선언적이어야 하며 primitive 선택 시점(암·복호·서명)에서 **정책 위반을 차단**한다.

## 2. Substrate 매핑
| SPEC 정책 항목 | 현행 substrate | 상태 |
|---|---|---|
| Allowed Algorithm 목록 | `Crypto.php:19` (알고리즘 상수) · `:121` (AES-256-GCM 고정) | 하드코드 고정(정책 엔진 아님) |
| Mandatory Key Length | `Crypto.php:108-126` (256-bit 고정) | 암묵 고정 |
| 봉투 버전(정책 버전 앵커) | `Crypto.php:84-88` | PARTIAL |
| Deprecated Algorithm 표기/거부 | (grep 0) | **ABSENT** |
| Rotation Frequency 정책 | (grep 0) | **ABSENT** |
| Certificate Lifetime 정책 | (grep 0) | **ABSENT** |
| NIST/FIPS 준거 매핑 | (grep 0) | **ABSENT** |

## 3. 설계 계약 (신설 대상)
- **Policy Registry(선언적)**: {allowed[], deprecated[], min_key_len, rotation_days, cert_lifetime_days, compliance_profile(NIST SP 800-131A/FIPS 140-3)}. 현행은 알고리즘이 상수로 박혀(`Crypto.php:19`·`:121`) 정책 선언·평가 계층 없음 → 순신설.
- **Enforcement Hook**: 암·복호·서명 진입점에서 정책 조회 → deprecated 사용 시 거부·경보. 위반 사건은 기존 감사 체인(`SecurityAudit.php:27`·`:56-68`)에 CRYPTO_POLICY_VIOLATION으로 기입.
- **Rotation/Lifetime Governance**: 키·인증서 수명 정책과 Part 3-23 §2 Certificate Registry 연동(만료 임박 = 정책 위반 후보).
- **Compliance Reporting(§12)**: 현행 primitive 집합의 FIPS/NIST 준거 상태 리포트. PQC 전환 로드맵(§5)과 정합.

## 4. KEEP_SEPARATE
- **벤더 서명 algorithm 문자열** — `Connectors.php:1290`·`ChannelSync.php:643`·`OpenPlatform.php:309`·`ChannelCreds.php:765`. 외부 채널 요청 서명 규격(벤더 강제)이지 우리 crypto policy가 통제하는 primitive 선택이 아님.
- **마케팅/모델 algorithm** — `AutoRecommend.php:22`·`ModelMonitor.php:18-19`·`AdminGrowth.php:21`. ML 문맥 동음이의.
- **제품안전 인증(kc_cert_no)** — `PriceOpt.php:1178` 등. 컴플라이언스지만 암호 정책 아님.

## 5. 판정
Crypto Policy Engine **ABSENT-greenfield**. 정책 레지스트리·deprecated 거부·rotation/lifetime·NIST/FIPS 매핑 전부 grep 0. 현행은 알고리즘·키 길이가 코드 상수로 고정(`Crypto.php:19`·`:121`·`:108-126`)이며 버전 봉투(`Crypto.php:84-88`)만이 정책 버전 앵커로 재사용 가능. Policy Registry/Enforcement/Compliance는 순신설이며 벤더 서명·마케팅 algorithm·kc_cert_no와 명명 격리. **코드 변경 0 · NOT_CERTIFIED.**
