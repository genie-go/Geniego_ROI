# DSAR — Authorization Federation Revalidation Governance (Part 3-18 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_REVALIDATION(§26)

Federation Revalidation Governance는 **연합 상태를 변화시키는 이벤트가 발생했을 때, 기존에 유효하다고 판정된 인가 관계를 다시 검증**하는 계약이다. 최초 페더레이션 수립 시 한 번 검증하고 끝나는 게 아니라, 상태가 바뀌면 이전 판정을 무효화하고 재검증한다. §26은 5개 트리거를 정의한다.

- **Partner 변경** — 연합 파트너 도메인의 신원/엔드포인트/역할 카탈로그 변경.
- **Trust 변경** — 파트너 Trust Score 강등/승격.
- **Policy 변경** — 공유 정책 스냅샷 리비전 갱신.
- **Certificate 변경** — 상호 인증서 회전/폐기/만료 임박.
- **Metadata 변경** — 공유 role/scope/capability 카탈로그 변동.

계약상 Revalidation은 **트리거 → 영향 받는 인가 관계 집합 재계산 → 재검증 판정(VALID/REVOKED/PENDING) → 감사 기록**의 파이프라인이며, §24 Drift·§25 Simulation 결과를 우선순위 입력으로 받는다.

## 2. Substrate 매핑

| SPEC 개념(§26) | 현행 substrate | 상태 |
|---|---|---|
| 변경 이벤트 proto(상태 전이) | `AgencyPortal.php:367`·`:390`·`:404`(대행사 상태 전이) | **참고만** — 로컬 단일 워크플로우 전이, federation 트리거 아님 |
| 재검증 판정 기록 | `SecurityAudit.php:14-67` | 감사 채널 재사용 가능 |
| Partner/Trust/Policy/Cert/Metadata 트리거 엔진 | 부재 | **ABSENT** |
| 영향 관계 재계산기 | 부재 | **ABSENT** |

## 3. 설계 계약

- **RevalidationTrigger** — `{source, changed_entity, previous_state, new_state, detected_at}`. source는 위 5개 enum.
- **RevalidationJob** — 트리거로부터 영향 받는 인가 관계 집합을 도출, 각 관계를 현행 정책으로 재판정. 결과 `{relation, verdict∈{VALID,REVOKED,PENDING}, reason}`.
- **이벤트 소스 설계** — `AgencyPortal.php:367`·`:390`·`:404`의 상태 전이 패턴을 **개념 proto로만 참조**(연합 파트너 변경 이벤트가 어떻게 emit되는지의 형태 참고). 실제 트리거 발생원·재검증 로직은 순신설.
- **감사·무후퇴** — 모든 재검증 판정을 `SecurityAudit.php:14-67`에 append. REVOKED 판정은 즉시 로컬 PDP에 반영되어야 하며(fail-closed), 재검증 실패(원격 미응답)는 PENDING으로 두고 접근 보수적 차단.

## 4. KEEP_SEPARATE

- DataTrust(`DataPlatform.php:281`) — 데이터 신뢰 재평가와 federation 관계 재검증은 별개 도메인. 통합 금지.
- `AgencyPortal.php`의 상태 전이는 **재사용 대상이 아니라 형태 참조 대상**. 대행사 승인 워크플로우를 federation revalidation 엔진으로 전용(轉用)하지 말 것.

## 5. 판정

**ABSENT** — federation 재검증 엔진(5 트리거 → 관계 재계산 → 판정) grep 0. `AgencyPortal.php:367`·`:390`·`:404` 상태 전이는 변경 이벤트 proto 참고에 그치며 재검증 개념 부재. §26 전체 순신설. **NOT_CERTIFIED · BLOCKED_PREREQUISITE**(원격 파트너·연합 토폴로지 부재로 재검증 대상 관계 미완).
