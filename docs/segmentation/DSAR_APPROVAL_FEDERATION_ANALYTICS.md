# DSAR — Approval Federation Analytics (Part 3-18 §23)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §23)

**APPROVAL_FEDERATION_ANALYTICS**는 연합 운영 상태를 운영자가 관측하도록 집계하는 지표 계층이다. 6지표(§23):

| 지표 | 의미 |
|------|------|
| Federation Requests | 도메인간 인가 요청 건수·추이 |
| Trust Score Distribution | 참여 도메인 신뢰 점수 분포 |
| Cross-Domain Decisions | 도메인 경계를 넘은 인가 판정 결과 분포 |
| Sync Success | 도메인간 정책·상태 동기화 성공률 |
| Certificate Health | 참여 도메인 인증서 유효·만료 상태 |
| Partner Availability | 연합 파트너 도메인 가용성 |

Analytics는 관측(observation) 전용이며 인가 판정을 내리지 않는다 — 판정은 Snapshot(§20)·Evidence(§21)가 담당.

## 2. Substrate 매핑

| SPEC 요구 | 현존 substrate | file:line | 상태 |
|-----------|----------------|-----------|------|
| Federation 지표 집계기 | 없음(grep 0) | — | **ABSENT** |
| Federation Requests/Cross-Domain Decisions 카운터 | 없음(grep 0) | — | **ABSENT** |
| Sync Success/Certificate Health/Partner Availability | 없음(grep 0) | — | **ABSENT** |
| 감사 이벤트 원천(집계 입력 후보) | SecurityAudit 해시체인 | `backend/src/SecurityAudit.php:14-67` | 원천만 |

Federation 지표 집계는 전면 부재(grep 0). 도메인간 요청·판정·동기화·인증서·파트너 가용성을 세는 카운터가 없다. 유일한 관련 원천은 SecurityAudit 해시체인(`backend/src/SecurityAudit.php:14-67`)의 감사 이벤트로, 향후 집계 입력 후보이나 그 자체는 Federation 지표가 아니다.

## 3. 설계 계약 (순신설)

1. Analytics는 Snapshot(§20)·Evidence(§21) 원장을 읽어 6지표를 파생 집계한다 — 자체 판정·자체 원천 저장 금지(SSOT는 원장).
2. Federation Requests·Cross-Domain Decisions는 감사 이벤트(`:14-67`)를 입력 후보로 삼되, federation 전용 이벤트 발생이 선행되어야 집계 가능.
3. Trust Score Distribution은 federation Trust State(§20 Snapshot 필드)에서만 파생 — DataTrust·GraphScore 지표를 재사용하지 않는다.
4. **선행조건**: Snapshot·Evidence 부재 시 집계 입력이 없어 지표 산출 불가 → BLOCKED_PREREQUISITE.

## 4. KEEP_SEPARATE ★

- **DataTrust**(`backend/src/Handlers/DataPlatform.php:281`) — 데이터 품질 신뢰 지표. Trust Score Distribution과 명칭이 유사하나 도메인·의미가 다르다. 절대 병합·재사용 금지.
- **GraphScore**(`backend/src/Handlers/GraphScore.php:31`) — 마케팅 그래프 점수. Federation Analytics 입력으로 흡수 금지.
- attribution 지표(마케팅 도메인) — Cross-Domain Decisions와 무관. 혼입 금지.

## 5. 판정

**ABSENT** — Federation 지표 집계는 grep 0으로 전면 부재. 6지표(Federation Requests/Trust Score Distribution/Cross-Domain Decisions/Sync Success/Certificate Health/Partner Availability) 모두 순신설. SecurityAudit(`backend/src/SecurityAudit.php:14-67`)은 집계 입력 원천 후보일 뿐이며, DataTrust·GraphScore는 KEEP_SEPARATE. Snapshot·Evidence 선행 부재로 BLOCKED_PREREQUISITE. 코드 변경 0 · NOT_CERTIFIED.
