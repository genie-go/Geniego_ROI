# DSAR — Certification Digest (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §28(Certification Digest)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §28은 Part 3-8의 §26(Snapshot)에서 동결된 상태를 다시 위변조 불가능한 형태로 **압축·검증 가능한 digest**로 만드는 계층을 정의한다. Digest는 다음 6개 입력을 하나의 검증 가능한 해시 체인 요소로 결합한다.

- **Campaign**: 어떤 Access Review 캠페인(주기적 재검토 라운드) 소속인지
- **Review**: 개별 검토 레코드(§26 Review State)
- **Decision**: 검토자의 최종 판정(§26 Decision)
- **Evidence**: 판정 근거(§26 Evidence)
- **Snapshot**: §26에서 동결된 전체 상태 레코드 참조
- **Version**: digest 스키마/알고리즘 버전(향후 마이그레이션 대비)

Digest의 목적은 "이 Certification 레코드가 생성 이후 조작되지 않았다"를 사후에 재계산·검증할 수 있게 하는 것이다 — 단순 저장(§26)과 달리 **무결성 증명** 계층이다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ①·②의 실측 결론에 따르면, Campaign+Review+Decision+Evidence+Snapshot+Version 6개 입력을 결합한 digest 생성·검증 로직은 grep 0이다. 다만 **동일한 알고리즘 계열(SHA-256 해시 체인)**이 완전히 다른 도메인(감사 로그 무결성)에 이미 존재하며, 이는 Digest 계층이 "재발명"이 아니라 "패턴 재사용"으로 설계될 수 있는 유일한 근접 substrate다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Campaign 입력 결합 | ABSENT | grep 0. 근접(이름만 유사, KEEP_SEPARATE): `AdminGrowth.php:1040`~`:1069`·`:1063`(admin_growth_campaign) — 마케팅 성장 캠페인이며 Access Review 캠페인 개념 없음 |
| Review 입력 결합 | ABSENT | grep 0 |
| Decision 입력 결합 | ABSENT | grep 0 |
| Evidence 입력 결합 | ABSENT | grep 0 |
| Snapshot 입력 결합(§26 참조) | ABSENT | §26 자체가 ABSENT이므로 결합 대상 부재 |
| Version 필드 | ABSENT | grep 0. 스키마 버전 개념 자체는 프로젝트 전역에 존재하나(예: DB 마이그레이션), Certification digest 전용 version 필드는 없음 |
| 해시 알고리즘(SHA-256 체인) | PARTIAL(패턴만 존재, 도메인 다름) | `SecurityAudit.php:63`(hash_chain SHA-256)·`:56`(verify)·`:27`(prev_hash)·`:68`(broken_at) — 감사로그 무결성 체인. Certification digest 전용 구현은 아니지만 **동일 알고리즘·검증 절차를 그대로 이식 가능**(ADR D-2 참조) |
| 검증 API(digest 재계산·대조) | ABSENT | grep 0. `SecurityAudit.php:56`(verify)의 검증 절차 구조만 참조 가능 |

### 2.3 KEEP_SEPARATE (해당 시)

- `AdminGrowth.php:1040`~`:1069`(admin_growth_campaign) — "Campaign"이라는 이름이 SPEC §28의 Campaign 입력과 일치해 보이나, 이는 마케팅 성장 캠페인 엔티티이며 Access Review 캠페인(주기적 권한 재검토 라운드)과 무관하다. Digest 입력으로 오흡수 금지.
- `SecurityAudit.php:63`(hash_chain) — 감사 로그 무결성 체인이며 Certification digest 자체가 아니다. **알고리즘·검증 절차만 참조**(ADR D-2), 테이블·클래스는 공유하지 않는다.

## 3. Canonical 설계

- **Digest 계산식**: `digest = SHA256(campaign_id || review_id || decision || evidence_hash || snapshot_id || schema_version || prev_digest)` — `SecurityAudit.php:27`의 prev_hash 체이닝 패턴을 그대로 계승.
- **Evidence는 원문이 아닌 해시로 결합**: evidence_json 원본은 §26 Snapshot에 별도 저장되고, digest에는 그 해시만 포함(용량·재계산 효율).
- **Version 필드**는 digest 스키마 변경 시 하위호환 검증을 가능하게 한다(향후 알고리즘 교체 대비, 무후퇴 원칙).
- **검증(verify)**: `SecurityAudit.php:56`의 verify 구조를 준용 — 저장된 digest를 재계산값과 대조하고 불일치 시 `broken_at`(`SecurityAudit.php:68` 패턴)에 해당하는 위치를 기록.
- **체인 범위**: Certification digest 체인은 SecurityAudit의 감사로그 체인과 **완전히 별도의 체인**(별도 테이블·별도 prev_hash 계열)으로 유지한다 — 두 체인을 병합하면 감사로그 성격이 오염되고 KEEP_SEPARATE 원칙(ADR D-6)에 위배된다.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 해시 알고리즘(SHA-256) | `SecurityAudit.php:63`(hash_chain) | 승격(알고리즘·체이닝 방식 차용, 별도 테이블) |
| prev_hash 체이닝 | `SecurityAudit.php:27`(prev_hash) | 승격(패턴 차용) |
| 검증 절차 구조 | `SecurityAudit.php:56`(verify) | 승격(구조 차용, 별도 함수로 신설) |
| 무결성 단절 기록 | `SecurityAudit.php:68`(broken_at) | 승격(개념 차용) |
| Campaign 결합 | 없음(`AdminGrowth.php:1040` KEEP_SEPARATE) | 신규 |
| Review/Decision/Evidence 결합 | 없음(§26 ABSENT 종속) | 신규 |
| Version 필드 | 없음 | 신규 |

## 5. 무후퇴 · Extend

- `SecurityAudit.php`의 hash_chain·verify·prev_hash·broken_at은 **읽기 참조(패턴 학습)만** 하며 코드 자체는 수정하지 않는다. Certification digest는 별도 테이블·별도 체인으로 신설한다(Golden Rule — Extend, not Replace/Merge).
- `AdminGrowth.php`의 admin_growth_campaign은 그대로 유지하며, "Campaign"이라는 명칭 충돌을 이유로 개명·통합하지 않는다(KEEP_SEPARATE 유지, ADR D-6).
- §26 Snapshot이 먼저 확정되어야 Digest 입력(Snapshot 참조)이 정의될 수 있다 — Part 3-8 내부 순서 의존성을 명시한다.
- 기존 SecurityAudit 소비처(`AdminGrowth.php:1429` integrity=verify, `AdminMenu.php:123` menu_audit_log)는 변경 없이 유지된다.

## 5-A. 타 Part 3-8 엔티티와의 관계

- §26(Snapshot)이 Digest의 1차 입력이며, §26 미확정 상태에서는 Digest 계산식의 `snapshot_id` 항이 정의될 수 없다(강한 선행 의존성, §26 문서 5-A 참조).
- §29(Runtime Guard)의 Expired Cert·Duplicate Review 가드는 Digest의 Version 필드를 참조해 오래된 알고리즘 버전으로 생성된 digest를 재검증 대상으로 표시할 수 있다.
- §31(Error Contract)의 `CERTIFICATION_NOT_FOUND`는 Digest 조회 실패 시에도 발동 가능한 공통 에러로, Digest 계층이 §31과 공유하는 유일한 실행 경로다.
- Digest는 §26 Snapshot의 **파생 계층**이며 독립적으로 존재할 수 없다 — Snapshot 없는 Digest는 무의미하므로 구현 순서상 반드시 §26 이후에 위치한다.

## 5-B. 왜 별도 해시 체인인가 (SecurityAudit과 병합하지 않는 이유)

`SecurityAudit.php`의 hash_chain은 시스템 전역 감사로그(관리자 행위, 보안 이벤트 등)를 대상으로 하며, 그 체인에 Certification 전용 레코드를 섞으면 두 가지 문제가 발생한다.

1. **감사 대상 오염**: SecurityAudit 체인은 "무엇이 발생했는가"를 기록하는 범용 감사 목적이며, Certification digest는 "이 인증 상태가 조작되지 않았는가"를 증명하는 특수 목적이다. 두 목적을 한 체인에 넣으면 각각의 verify 절차가 서로 무관한 레코드까지 스캔해야 해 성능·의미 양쪽에서 손해다.
2. **289차 확정분 재플래그 금지 원칙 위반 위험**: `AdminMenu.php:123`(menu_audit_log)이 SecurityAudit과 별도로 이중 체인을 이룬다는 점(ADR D-8 부수발견)이 이미 지적된 바 있다 — Certification digest까지 SecurityAudit에 합류시키면 이중 체인 문제를 삼중으로 키운다. 따라서 Certification digest는 **처음부터 독립 체인**으로 설계한다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: §26 Snapshot 선행 확정
- [ ] Digest 계산식·해시 입력 순서 최종 확정
- [ ] Version 필드 마이그레이션 정책 확정
- [ ] Certification 전용 hash_chain 테이블 스키마 확정(SecurityAudit 테이블·AdminMenu menu_audit_log 테이블 모두와 물리적으로 분리)
- [ ] 검증(verify) API 계약 확정 및 실패 시 fail-secure 동작 정의
- [ ] 코드 변경 0 유지 확인
- [ ] NOT_CERTIFIED 상태 유지 — 실 구현은 별도 승인 세션

## 7. 반날조 인용 출처

- SPEC §28(Certification Digest)
- ADR D-2(SecurityAudit 참조·흡수아님) · D-6(KEEP_SEPARATE) · D-8(부수발견: menu_audit 이중체인 — 별도 체인 유지 필요성의 근거)
- Ground-Truth ① §(SecurityAudit hash_chain/verify substrate) · ② §(AdminGrowth campaign KEEP_SEPARATE)
- ABSENT 항목(Campaign/Review/Decision/Evidence 결합, Version 필드)은 grep 0 실측 명시 — SecurityAudit 알고리즘은 패턴만 재사용, 도메인·테이블은 공유하지 않음
