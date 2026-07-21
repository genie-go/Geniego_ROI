# DSAR — Certification Database Constraint (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §34(Database Constraint)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §34(Database Constraint)는 Certification & Access Review 스키마가 **데이터베이스 레벨**에서 강제해야 할 5개 무결성 제약을 정의한다: (1) Immutable Campaign Version, (2) Immutable Decision, (3) Tenant Isolation, (4) Evidence Integrity, (5) Snapshot Integrity. 이는 애플리케이션 레벨 검증만으로는 SOX/SOC2/ISO27001 감사가 요구하는 "사후 조작 불가능성"을 담보할 수 없기 때문이다 — Decision이 앱 코드 버그·직접 SQL 접근으로 사후 수정될 수 있다면 Access Review 전체의 증거능력이 무효화된다. 본 문서는 5개 제약을 현행 DB 스키마 관례와 대조하고, ADR D-4(Attestation/Evidence 불변)의 실행 수단을 명세한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(5종 전부, 순신규 스키마) · append-only 관례만 PARTIAL 재활용**

Ground-Truth ①/②의 실측 결론: Certification 전용 테이블(campaign/review/decision/evidence/snapshot) 자체가 grep 0이므로, 그 위에 걸릴 DB 제약도 당연히 ABSENT다. 다만 "append-only(UPDATE/DELETE 경로 없음)로 불변성을 보장하는 관례"는 `SecurityAudit.php:8`의 주석("log INSERT-only, UPDATE/DELETE 코드경로 없음")에 이미 실증돼 있다 — 이는 코드 레벨 관례이지 DB 제약(트리거·CHECK) 자체는 아니지만, 5개 제약 중 (2)Immutable Decision·(4)Evidence Integrity·(5)Snapshot Integrity가 채택해야 할 **검증된 설계 패턴**이다. Tenant Isolation(3)은 `index.php:608`(auth_tenant 주입) 관례가 애플리케이션 레벨에서 이미 강제되고 있어 그 원칙을 DB 레벨(WHERE tenant_id 필수 인덱스·FK)로 승격하면 된다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Immutable Campaign Version | **ABSENT** | Campaign 테이블 자체 grep 0. 버전 불변(수정 시 신규 버전 발행) 패턴은 참고할 기존 스키마 없음 |
| Immutable Decision | **ABSENT(패턴 참고 가능)** | Decision 테이블 grep 0. append-only 검증 패턴은 `SecurityAudit.php:8`(주석, INSERT-only 명시)·`:63`(hash_chain) 참고 |
| Tenant Isolation | **ABSENT(원칙 재활용)** | Certification 테이블 자체 없음. 원칙은 `index.php:608`(auth_tenant 주입)에서 이미 애플리케이션 레벨 강제 — Certification 신규 테이블은 이 원칙을 tenant_id NOT NULL + 인덱스로 승격해야 함 |
| Evidence Integrity | **ABSENT(패턴 참고 가능)** | Evidence 테이블 grep 0. 무결성 검증 패턴은 `SecurityAudit.php:56`(verify)·`:27`(prev_hash) |
| Snapshot Integrity | **ABSENT** | Snapshot 테이블 grep 0. 근접 `AdminMenu.php:200`(menu_defaults snapshot)은 KEEP_SEPARATE(메뉴 도메인) |

### 2.3 KEEP_SEPARATE

- `AdminMenu.php:123`(menu_audit_log, hash_chain 컬럼)·`:140`·`:200`(menu_defaults snapshot) — 메뉴 권한 변경 감사이며 hash_chain 컬럼을 보유하나 **통합 verify는 SecurityAudit::verify가 정본**이다(MEMORY `reference_menu_audit_log_not_tamper_evident`: menu_audit_log는 체인 쓰기만 실재하고 verify()는 0 — 검증 불가능한 장식). Certification Evidence/Snapshot Integrity가 menu_audit_log 패턴을 "이미 검증된 불변 저장소"로 오인·흡수하면 가짜녹색이 된다. **참고 대상에서 제외하고 SecurityAudit만 참조**.

## 3. Canonical 설계

5개 DB 제약은 다음 계약으로 설계된다(코드 미구현, 설계 명세 단계):

1. **Immutable Campaign Version** — Campaign 수정 시 UPDATE 금지, 신규 row(version 증가)로만 반영. 이전 버전은 `status='superseded'`로 보존. DB 트리거 또는 애플리케이션 레벨 write-guard로 UPDATE 경로 차단.
2. **Immutable Decision** — Decision row는 INSERT 후 UPDATE/DELETE 불가. `SecurityAudit.php:8` 관례(주석에 명시된 INSERT-only 원칙)를 신규 `certification_decision` 테이블에 동형 적용. 정정이 필요하면 신규 Decision row(정정 사유 포함)로 append.
3. **Tenant Isolation** — 모든 Certification 테이블(campaign/review/decision/evidence/snapshot)은 `tenant_id NOT NULL` + 복합 인덱스. `index.php:608`(auth_tenant 주입)이 애플리케이션 레벨에서 이미 강제하는 원칙을 DB 레벨 제약(FK 또는 앱단 필수 WHERE 절 린트)으로 승격.
4. **Evidence Integrity** — Evidence row는 해시체인 또는 `SecurityAudit`(`:56` verify·`:27` prev_hash) 참조로 무결성 검증 가능해야 한다. 흡수가 아닌 **참조**(D-2) — Evidence 자체 테이블은 신규이되 검증 로직은 SecurityAudit 패턴을 호출.
5. **Snapshot Integrity** — 검토 시점의 role/permission/scope 상태를 불변 스냅샷으로 저장. 스냅샷 row는 INSERT 후 불변이며, 원본 배정이 변경돼도 과거 검토 시점 Snapshot은 그대로 보존(감사 추적성).

### 3.1 제약별 정직 판정 서술

- **Immutable Campaign Version(ABSENT)**: 참고할 "버전 증가 방식 불변" 스키마 관례가 이 저장소에 없다. 라이선스 키(`routes.php:2800`)조차 만료·재사용 필드는 있으나 버전 이력 자체는 관리하지 않는다. 완전 그린필드.
- **Immutable Decision(ABSENT, 패턴 참고 가능)**: `SecurityAudit.php:8` 주석이 "log는 INSERT-only, UPDATE/DELETE 코드 경로가 없다"고 명시한다. 이는 애플리케이션 코드 레벨 규율이며 DB CHECK 제약이나 트리거로 강제된 것은 아니다 — Certification Decision은 이 관례를 DB 레벨(REVOKE UPDATE/DELETE 권한 또는 트리거)로 한 단계 더 강화해 설계해야 한다.
- **Tenant Isolation(ABSENT, 원칙 재활용)**: `index.php:608`의 auth_tenant 주입은 미들웨어 레벨의 강제이지 DB 스키마 제약(FK·NOT NULL)이 아니다. 애플리케이션 레벨에서 강제되고 있다고 해서 DB 레벨 제약이 "이미 있다"고 오판해서는 안 된다 — 두 레벨은 독립적 방어선이다.
- **Evidence Integrity(ABSENT, 패턴 참고 가능)**: `SecurityAudit.php:56`(verify)·`:27`(prev_hash)는 해시체인 재계산으로 변조를 탐지하는 실 코드다. 그러나 이는 SecurityAudit 자신의 log 테이블에 대한 검증이며, Certification Evidence 테이블에 자동 적용되지 않는다 — Evidence 테이블이 SecurityAudit API를 호출하도록 신규 연동 코드가 필요하다.
- **Snapshot Integrity(ABSENT)**: `AdminMenu.php:200`(menu_defaults snapshot)은 메뉴 기본권한 스냅샷으로 형태는 유사하나(설정값을 특정 시점에 저장) 도메인이 메뉴 UI이지 접근권한 검토가 아니다. KEEP_SEPARATE 원칙에 따라 참고 대상에서 제외한다.

### 3.2 감사 요구사항 매핑 (SPEC §0 컴플라이언스 목록 대조)

| 제약 | 관련 감사 프레임워크 | 요구 근거 |
|---|---|---|
| Immutable Campaign Version | SOX·ISO27001 | 검토 캠페인 범위·정책의 사후 조작 불가 — "그 시점에 무엇을 검토했는가"의 재현성 |
| Immutable Decision | SOX·SOC2·PCI DSS | 승인/거부/회수 결정의 사후 변경 불가 — 감사인 신뢰 근거 |
| Tenant Isolation | SOC2·HIPAA | 멀티테넌트 환경에서 타 테넌트 접근권한 데이터 유출 차단 |
| Evidence Integrity | NIST SP 800-53·COBIT | 결정 근거(로그인 이력·업무 정당성 등) 변조 불가 |
| Snapshot Integrity | ISO27001·COBIT | 특정 시점 권한 상태의 재구성 가능성(forensic readiness) |

이 매핑은 SPEC §0(작업 목적)이 명시한 컴플라이언스 프레임워크를 5개 제약에 배분한 설계 참고이며, 실제 인증(SOX 등)의 통과를 보증하지 않는다 — 코드 미구현 상태이므로 컴플라이언스 검증은 실 구현 이후 별도 절차다.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Immutable Decision 검증 패턴 | `SecurityAudit.php:8`(append-only 주석)·`:56`(verify)·`:27`(prev_hash) | 참조 재활용(흡수 아님, D-2) |
| Tenant Isolation 원칙 | `index.php:608`(auth_tenant 주입) | 원칙 승격(애플리케이션→DB 레벨) |
| Evidence 무결성 검증 | `SecurityAudit.php:56`·`:63`(hash_chain) | 참조 재활용(흡수 아님) |
| Immutable Campaign Version / Snapshot Integrity 스키마 자체 | 없음 | 신규 |
| menu_audit_log(hash_chain 컬럼) | `AdminMenu.php:123` | 참고 제외(KEEP_SEPARATE, 검증불능 장식) |

## 5. 무후퇴 · Extend

Golden Rule(Wrap)에 따라 5개 DB 제약은 기존 `SecurityAudit` 해시체인(`:8`·`:27`·`:56`·`:63`)의 스키마·쓰기 경로를 변경하지 않고 **참조만** 한다(D-2, 흡수 금지 — SecurityAudit를 Certification 전용 엔진으로 개명하지 않는다). Tenant Isolation은 `index.php:608`의 auth_tenant 주입 원칙을 신규 테이블에 동형 적용하되, 기존 미들웨어의 tenant 주입 로직 자체는 수정하지 않는다. `AdminMenu.php:123`(menu_audit_log)은 검증 불가능한 장식(MEMORY 정정)이므로 Certification Evidence/Snapshot의 신뢰 기반으로 재사용하지 않는다 — SecurityAudit 단일 참조로 SSOT를 유지한다.

### 5.1 무후퇴 회귀 시나리오

1. **SecurityAudit 흡수 금지 재확인**: Certification Decision/Evidence 무결성 검증을 구현하는 세션에서 `SecurityAudit::verify()`(`:56`)를 호출·참조하되, 클래스명 변경이나 Certification 네임스페이스로의 이관을 하지 않는다.
2. **menu_audit_log 재오염 방지**: 289차 정정(hash_chain 컬럼은 있으나 verify 없음)을 무시하고 menu_audit_log를 Snapshot Integrity의 근거로 재인용하면 회귀다 — 반드시 SecurityAudit만 인용한다.
3. **Tenant Isolation 이중 강제**: DB 레벨 제약(FK/NOT NULL)이 추가되어도 `index.php:608`의 애플리케이션 레벨 auth_tenant 주입은 그대로 유지하여 심층방어(defense-in-depth)를 구성한다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Part 1~3-7 선행 인증 완결 확인
- [ ] Immutable Campaign Version 스키마·버전 증가 로직 확정(코드 0 유지, 설계만)
- [ ] Immutable Decision append-only 제약(트리거 또는 write-guard) 설계 확정
- [ ] Tenant Isolation 전 테이블 tenant_id NOT NULL + 인덱스 설계
- [ ] Evidence Integrity — SecurityAudit 참조 방식(흡수 아님) 재검증
- [ ] Snapshot Integrity 불변 저장 설계 확정
- [ ] KEEP_SEPARATE(menu_audit_log) 오흡수 여부 재검증
- [ ] 감사 프레임워크 매핑(§3.2)이 실제 인증 통과를 보증하지 않음을 재확인(코드 0 단계 한계 명시)
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득(사용자 명시 승인 전 착수 금지)

## 7. 반날조 인용 출처

- SPEC §34(Database Constraint) / ADR D-2(SecurityAudit 참조·흡수아님) · D-4(Attestation/Evidence 불변)
- Ground-Truth ① §A(감사/증거 인프라: `SecurityAudit.php:8`·`:27`·`:56`·`:63`·`AdminMenu.php:123`·`:200`) · ② §3(SecurityAudit 유일 재활용)·§4 B-6(menu_audit_log KEEP_SEPARATE 근거)
- 인용 파일:라인 — `backend/src/SecurityAudit.php:8`(append-only 주석)·`:27`(prev_hash)·`:56`(verify)·`:63`(hash_chain). `backend/public/index.php:608`(auth_tenant 주입). `backend/src/Handlers/AdminMenu.php:123`·`:140`·`:200`(menu_audit_log, KEEP_SEPARATE 참고 제외).
- ABSENT 5종(스키마 자체)은 grep 0 실측(Ground-Truth ② §2) — SecurityAudit 실재를 "Certification DB 제약이 이미 구현됨"으로 과장하지 않음.
