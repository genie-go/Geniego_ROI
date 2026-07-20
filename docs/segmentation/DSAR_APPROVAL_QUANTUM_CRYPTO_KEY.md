# DSAR — Authorization Crypto Key Lifecycle Governance (Part 3-23 §2·§7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — Approval Crypto Key

**APPROVAL_CRYPTO_KEY**는 인가 신뢰근이 사용하는 **키 소재(key material)의 전체 수명주기**를 거버넌스하는 계약이다. 관리 단계: **generation · distribution · rotation · revocation · archival · destruction**. 각 키는 `key_id` · `algorithm_ref` · `length` · `created_at` · `rotation_interval` · `state`(active/rotated/revoked/destroyed) · `owner`로 기술된다.

## 2. 실존 substrate 매핑

| 수명주기 단계(계약) | 상태 | 근거(허용목록) |
|---|---|---|
| KEK 생성·로드(봉투 암호화 마스터) | PARTIAL(PRESENT) | `backend/src/Crypto.php:45-74`(키 파생/로드)·`:96-102` |
| Key **rotation**(회전) | PARTIAL(PRESENT) | `backend/src/Crypto.php:133-148`(dual-read 복호화)·`:150-159`·`:162-182` |
| api_key 키 소재(SHA-256 at-rest) | PARTIAL(PRESENT) | `backend/src/Handlers/Keys.php:40` · at-rest 해시 `backend/src/Handlers/UserAuth.php:4353`·`:4391` |
| 세션/토큰 키 hash-only 저장 | PARTIAL(PRESENT) | `backend/src/Handlers/UserAuth.php:3878`·`:4353` |
| **revocation**(폐기·즉시 무효화 대장) | **ABSENT** | grep 0 — 명시적 revocation 상태기계 부재 |
| **archival**(회전 후 키 보관 정책) | ABSENT | dual-read는 존재하나 아카이브 수명·정책 대장 부재 |
| **destruction**(안전 파기 증적) | ABSENT | 파기 감사 트레일 부재 |
| 통합 Key **수명주기 레지스트리**(단계 전이 SSOT) | ABSENT | grep 0 — 회전 로직은 산재·중앙 대장 없음 |

**요지**: 키 소재의 **생성·로드·회전(dual-read)은 PARTIAL로 실재**한다(`Crypto.php:45-74`·`:133-148`). 그러나 revocation·archival·destruction의 명시적 상태기계와 이를 단일 대장으로 추적하는 수명주기 레지스트리는 부재하다. PQC 전환 시 필수인 "키별 알고리즘·만료·폐기 상태" 추적 기반이 없다.

## 3. 설계 계약(규칙)

1. **수명주기 SSOT**: 키별 1행·상태 전이(active→rotated→revoked→destroyed)를 단일 대장으로. 기존 회전 로직(`Crypto.php:133-148`)을 **참조·승격**하되 재구현 금지(Extend).
2. **revocation fail-secure**: revoked 키로 서명/복호화 시도는 거부(기본 차단). 미분류 키 상태는 보수적으로 비신뢰.
3. **archival 정책**: dual-read 보관기간을 명시(무기한 보관 금지) — 회전 완료 후 유예기간 경과 시 destruction.
4. **algorithm 연동**: 각 키는 §CRYPTO_ALGORITHM 참조 — PQC 전환 시 키 재생성 경로가 수명주기에 포함.
5. **무후퇴·테넌트 격리**: 키 소유·범위는 테넌트 경계 준수. 회전 정책 변경 시 파생 상태 실시간 동기화.
6. **NOT_CERTIFIED**: 상태 추적·정책 규정만 — 실제 키 파기/폐기 집행은 코드 변경으로 별도 승인세션.

## 4. KEEP_SEPARATE

- **비즈니스 key**(app_setting 설정키·channel_credential 외부채널 자격 식별자)는 인가 신뢰근 crypto key가 아니다 — 본 수명주기 대장에서 제외. 이들은 자격증명 저장(§CRYPTO_ASSET) 관점에서만 다루고, 암호 키 수명주기 정책은 적용하지 않는다.
- api_key의 **RBAC 판정 로직**(`backend/src/Handlers/Keys.php:88-96`)은 정책 엔진이지 키 소재 관리가 아님 — 키 소재(해시·`Keys.php:40`)만 본 계약 대상.

## 5. 판정

**NOT_CERTIFIED · PARTIAL(회전 실재) + revocation/archival/destruction ABSENT(순신설)**. 키 생성·로드·회전은 `Crypto.php:45-74`·`:133-148` 및 api_key 해시 `Keys.php:40`·`UserAuth.php:4353`로 실재하나, 폐기·아카이브·파기 상태기계와 통합 수명주기 레지스트리는 grep 0. PQC 키 재생성 경로 전제인 알고리즘 연동도 부재 → **BLOCKED_PREREQUISITE**. 본 DSAR 코드 변경 0.
