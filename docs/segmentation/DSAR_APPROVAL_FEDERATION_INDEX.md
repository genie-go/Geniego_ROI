# DSAR — Authorization Federation Index (Part 3-18 §34)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §34 Index)

Federation 조회 경로의 **인덱스 계약** — cross-domain 인가는 저지연(§35)이 요구되므로 조회 축마다 인덱스가 선행 정의돼야 한다. 대상 인덱스:

- **Federation Domain Index** — `domain_id`·issuer·상태별 도메인 발견.
- **Partner Index** — 도메인쌍(source→target)·방향·유효기간 링크 조회.
- **Trust Index** — 도메인쌍별 Trust Level/Score 최신값 lookup.
- **Certificate Index** — 지문(fingerprint)·serial·만료 기준 인증서 검색.
- **Policy Index** — federation 정책의 도메인·리소스·액션 매칭.
- **Route Index** — cross-domain 결정 라우팅 대상 PDP endpoint 조회.
- **Snapshot Index** — 특정 시점 federation 상태 스냅샷 조회.

## 2. 실존 substrate 매핑

| 계약 구성요소 | 판정 | 근거(허용목록) |
|---|---|---|
| Federation Domain Index | **ABSENT** | grep 0 — federation 도메인 테이블 자체 부재 |
| Partner Index | **ABSENT** | grep 0 |
| Trust Index | **ABSENT** | grep 0 |
| Certificate Index | **ABSENT** | grep 0 |
| Policy Index | **ABSENT** | grep 0 |
| Route Index | **ABSENT** | grep 0 |
| Snapshot Index | **ABSENT** | grep 0 |
| 인덱스 생성 substrate(재사용) | PRESENT | `Db.php:942-958` self-healing ensureTables·`:961-973`·`:976-991`(스키마 보장 경로) |
| 실존 인접 테이블 | PRESENT(별도) | sso_config/agency/partner/api_key 계열만 실재 — federation 인덱스 대상 아님 |

federation 도메인/파트너/신뢰/인증서/정책/라우트/스냅샷 인덱스는 **전부 ABSENT** — 인덱스는 테이블에 종속하나 대상 테이블이 grep 0이다. 현 DB는 self-healing(`Db.php:942-958`·`:961-973`·`:976-991`)으로만 스키마를 보장하며, 인덱스 정의 자체가 이 규약 안에서 이뤄져야 한다.

## 3. 설계 계약 (규칙)

1. **테이블 선행**: 모든 인덱스는 §33 DB Constraint가 정의하는 테이블 승인 후에만 정의 가능(본 §34는 §33 종속).
2. **self-healing 편입**: 인덱스 생성은 `Db.php:942-958` ensureTables·`:961-973`·`:976-991` 규약에 편입 — 별도 수동 마이그레이션 신설 금지(172 이후 관례).
3. **조회 축 정합**: 인덱스 키는 §35 성능 목표(Cross-Domain Decision≤50ms 등)의 실제 조회 술어와 일치해야 하며, 사용되지 않는 인덱스 난립 금지.
4. **tenant 선행 컬럼**: 격리 정합을 위해 복합 인덱스 선두는 tenant 축(`index.php:619` 해석 결과)과 정합.
5. **중복 금지**: 동일 조회 축 인덱스 중복 생성 금지 — 기존 인접 테이블 인덱스 재사용 우선.

## 4. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE(ABSENT).** Federation Domain/Partner/Trust/Certificate/Policy/Route/Snapshot 인덱스는 **전부 순신설(grep 0)** — 인덱스가 종속하는 federation 테이블 자체가 self-healing DB(`Db.php:942-958`·`:961-973`·`:976-991`)에 부재하다. 본 §34는 §33 DB Constraint에 종속하며 그 승인 없이는 정의 불가. 코드 변경 0 — 실 인덱스 구현은 선행 §33 및 Registry 승인 후 별도 세션.
