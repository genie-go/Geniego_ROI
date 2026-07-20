# DSAR — Authorization Federation Performance (Part 3-18 §35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §35 Performance)

Cross-domain 인가는 요청 경로 상 동기 게이트이므로 엄격한 성능 예산을 계약한다:

- **Cross-Domain Decision ≤ 50ms** (p99, 도메인간 인가 판정 왕복).
- **Trust Validation ≤ 20ms** (Trust Score 산출·임계 비교).
- **Metadata Sync ≤ 30초** (도메인 메타데이터 연합 동기화 지연 상한).
- **Certificate Validation ≤ 10ms** (인증서 체인·폐기 검증).
- **Availability ≥ 99.999%** (federation 인가 게이트 가용성).

성능 목표는 §34 인덱스·§8 Trust Engine·인증서 캐시가 실재해야 측정 가능하다.

## 2. 실존 substrate 매핑

| 계약 구성요소 | 판정 | 근거(허용목록) |
|---|---|---|
| Cross-Domain Decision ≤50ms | **ABSENT** | grep 0 — cross-domain 결정 경로 자체 부재. 현 인가는 로컬 PDP만 `TeamPermissions.php:695` |
| Trust Validation ≤20ms | **ABSENT** | grep 0 — Trust Engine 부재. 최근접 JWT 검증 `EnterpriseAuth.php:522-543` |
| Metadata Sync ≤30초 | **ABSENT** | grep 0 — 연합 메타 동기화 없음. SSO 메타 컬럼만 정적 존재 `EnterpriseAuth.php:43-54` |
| Certificate Validation ≤10ms | **ABSENT** | grep 0 — 인증서 체인 검증 없음. 서명/암호 기반만 `Crypto.php:108`·`:133`·`:148` |
| Availability ≥99.999% | **ABSENT** | grep 0 — federation 게이트 부재로 측정 불가 |
| 로컬 PDP(측정 인접) | PRESENT(별도) | `TeamPermissions.php:695`·`:715-731`(로컬 권한 판정) |
| JWT 검증(측정 인접) | PRESENT(별도) | `EnterpriseAuth.php:522-543`(SSO 토큰 서명/issuer 검증) |

측정 대상인 federation 결정/신뢰/메타동기/인증서 경로가 전무(grep 0)하여 성능 목표는 현재 **측정 불가**하다. 현 인가는 로컬 PDP(`TeamPermissions.php:695`·`:715-731`)와 외부 IdP JWT 검증(`EnterpriseAuth.php:522-543`)만 실재하며, 이는 단일 프로세스 내 판정으로 cross-domain 왕복 예산과 성격이 다르다.

## 3. 설계 계약 (규칙)

1. **RP-track 조건**: 본 §35 성능 인증은 §34 인덱스·§8 Trust Engine·인증서 캐시가 실재해야 착수 — 부재 상태 벤치마크는 무의미하므로 **측정 자체를 RP(선행) 조건으로 봉인**.
2. **로컬 PDP 예산 분리**: `TeamPermissions.php:695`·`:715-731` 로컬 판정 지연은 cross-domain 50ms 예산과 별도 계측 축으로 분리(혼입 금지).
3. **인증서 검증 EXTEND**: Certificate Validation은 신규 암호 스택 도입 없이 `Crypto.php:108`·`:133`·`:148` 기반을 재사용하고 결과를 캐시(10ms 예산 확보).
4. **Fail-closed 우선**: 성능 최적화가 임계 미달 신뢰를 통과시키지 않는다 — 지연/가용성 저하 시 Deny(Unknown≠Allow).
5. **가용성 근거**: 99.999% 주장은 실 SLO 계측·에러버짓 기록 후에만 유효(무근거 수치 금지).

## 4. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE(ABSENT).** Cross-Domain Decision/Trust Validation/Metadata Sync/Certificate Validation/Availability 목표는 측정 대상 federation 경로가 **전무(grep 0)**하여 현재 측정 불가. 실존 인접은 로컬 PDP(`TeamPermissions.php:695`·`:715-731`)·JWT 검증(`EnterpriseAuth.php:522-543`)·암호 기반(`Crypto.php:108`·`:133`·`:148`)뿐이며 cross-domain 성격이 아니다. **RP-track 조건** — 성능 인증은 선행 §34 인덱스·Trust Engine 승인 후 착수. 코드 변경 0.
