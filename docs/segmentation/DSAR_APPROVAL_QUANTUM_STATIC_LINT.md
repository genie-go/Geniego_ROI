# DSAR — Authorization Quantum-Ready Static Lint (Part 3-23 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Static Lint(§25)는 **빌드/CI 시점(정적)** 에 소스를 스캔하여 양자취약 암호 사용을 조기 차단하는 게이트다. 대상 결함 6종: Hardcoded Secret(하드코딩 시크릿), Weak Algorithm(취약 알고리즘), Weak Key Length(키 길이 미달), Expired Certificate Reference(만료 인증서 참조), Missing Rotation Policy(회전 정책 부재), Missing Crypto Inventory(암호 인벤토리 부재). Runtime Guard(§24)가 요청 시점 fail-closed라면 Static Lint는 배포 이전에 위반을 발견해 머지를 막는 shift-left 계약이다. 탐지 결과는 crypto inventory에 등재되고, 미해결 위반은 CI 실패로 승격된다.

## 2. Substrate 매핑

| 린트 대상 결함 | 실재 substrate(탐지 표적) | 인용 | 판정 |
|---|---|---|---|
| Weak Algorithm(SHA-1) | 고객 식별 해시 | `CRM.php:589`·`:638` | 탐지표적·린트부재 |
| Weak Algorithm(SHA-1) | TOTP 시크릿 파생 | `UserAuth.php:3571` | 탐지표적·린트부재 |
| Weak Algorithm(MD5) | 주문 지문 | `OrderHub.php:992` | 탐지표적·린트부재 |
| Weak Algorithm(MD5) | 커넥터 서명/캐시키 | `Connectors.php:2399`·`:3574` | 탐지표적·린트부재 |
| Weak Algorithm(MD5) | 광고 어댑터 지문 | `AdAdapters.php:1561` | 탐지표적·린트부재 |
| Weak Algorithm(CRAM-MD5) | SMTP 인증 | `SmtpClient.php:174` | 탐지표적·린트부재 |
| Missing Crypto Inventory | 산재 crypto 유틸 | `Crypto.php:108-126` | 인벤토리 미집계 |

정적 스캐너·CI 게이트·inventory 파일 자체는 grep 0 — 코드 전무.

## 3. 설계 계약

- **스캔 규칙**: 약한 해시 API 호출(sha1/md5/CRAM-MD5) 패턴을 소스 전역에서 탐지. 위 substrate 8개소가 최초 baseline 위반 목록. 신규 도입은 CI 실패.
- **allowlist 거버넌스**: 비암호 용도(캐시키·ETag 등 비보안 지문)는 명시 allowlist로 예외 처리. 예외는 근거·만료일 기재 — 무기한 예외 금지.
- **Missing Rotation Policy**: 각 키/시크릿 substrate가 회전 메타데이터(주기·최종회전)를 선언하는지 검사. KEK envelope(`Crypto.php:108-126`)·API key(`Keys.php:88-96`)가 대상.
- **Missing Crypto Inventory**: 모든 crypto 사용처가 중앙 inventory에 등재되었는지 대조. 미등재=위반.
- **감사**: 린트 위반 승격 결정을 `SecurityAudit.php:27` append 계약(`:56-68` verify)으로 기록.
- **PQC 준비**: 대체 알고리즘 부재(`composer.json:5-13`에 PQC 라이브러리 없음) — 린트는 표적만 식별하고 마이그레이션은 §28 API로 위임.

## 4. KEEP_SEPARATE

해당 없음.

## 5. 판정

**ABSENT** — Weak Algorithm 탐지 표적은 실재하나(SHA-1 `CRM.php:589`·`:638`·`UserAuth.php:3571`, MD5 `OrderHub.php:992`·`Connectors.php:2399`·`:3574`·`AdAdapters.php:1561`, CRAM-MD5 `SmtpClient.php:174`) **자동 정적 탐지·CI 게이트·crypto inventory는 어디에도 없다**. 순신설. BLOCKED_PREREQUISITE(PQC 라이브러리 부재 `composer.json:5-13`). 코드 변경 0.
