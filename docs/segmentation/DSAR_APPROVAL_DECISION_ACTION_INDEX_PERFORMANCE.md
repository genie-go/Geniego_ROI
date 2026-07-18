# DSAR — Action Index / Performance (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§66 `ACTION_INDEX_PERFORMANCE` — 필수 인덱스/조회 최적화 대상(원문 전사):

1. **Tenant · Action Type · Actor · Decision Slot 별** 액션 조회.
2. **Reason Code · Applicable Reason** 조회(§38 적용성 필터).
3. **Comment(Visibility 별)** 조회(§40).
4. **Attachment Manifest** 조회(§42).
5. **Malware Pending / DLP Blocked** 상태 큐(§44).
6. **Return Target / Return History / Return Count** 조회(§20/§21).
7. **Open Change Request / Unresolved Item** 조회(§23/§24).
8. **Resubmission** 패키지 조회(§30).
9. **Cancelled / Withdrawn / Deferred** 상태 조회(§26/§27/§33).
10. **Action Conflict** 조회(§50).
11. **Snapshot** 조회(§52).
12. **Reconciliation Mismatch** 조회(§55/§56).

## 2. 기존 구현 대조

- **결정 액션 전용 인덱스/성능 계약 부재 → ABSENT.** 위 12개 조회 축 중 대부분은 대응 엔티티(Reason Code·Attachment Manifest·Return Target·Change Request·Resubmission·Conflict·Snapshot·Reconciliation) 자체가 부재하여 인덱싱 대상이 없음.
- 부분 실재(도메인 승인 테이블의 우연적 조회):
  - Tenant/Actor/status 컬럼 기반 조회는 도메인별 테이블에 존재하나(`admin_growth_approval`·Mapping approvals_json·action_request), **표준 인덱스 규격 아님**.
- **★성능 실 위험(라이브 관련)**: N+1/루프 내 외부 API는 이 리포에서 반복 장애 원인(레지스트리: 285차 11번가 상품마다 3MB 재수집→40s 타임아웃). 액션 커밋 경로가 대상 조회에서 인덱스 없이 풀스캔·루프하면 동일 계열 위험. **다만 결정 액션 조회 경로 자체가 미구현이므로 현시점 측정 근거 없음(no hits).**

## 3. 판정

- Verdict: **ABSENT** (액션 인덱스/성능 규격 부재)
- 선행 의존: 조회 축 2~12가 부재 엔티티 참조 → BLOCKED_PREREQUISITE.
- cover: **0** (도메인별 status 컬럼 조회만 우연 존재).

## 4. 확장/구현 방향 (설계)

- 순신규: 액션 커밋 시 12개 조회 축을 커버하는 복합 인덱스 정의. 특히 **(tenant, action_type, decision_slot)**·**(tenant, reason_code)**·**Malware Pending/DLP Blocked 부분 인덱스**·**Open Change Request / Unresolved Item**·**Return Count/History**·**Reconciliation Mismatch** 워크큐 인덱스.
- 성능 안전(레지스트리 반영): 액션 대상 조회·부수효과 적용은 **루프 내 외부 API 호출 금지**·배치/인덱스 조회로 N+1 차단(285차 교훈). 공용 스코프는 읽기도 `__shared__`로 격리.
- Golden Rule(Extend): 기존 도메인 승인 테이블의 tenant/status 조회를 표준 인덱스로 승격·정규화(중복 인덱스 난립 금지).
- 무후퇴: 인덱스 추가는 조회 회귀 없이 성능만 개선.

관련: [[DSAR_APPROVAL_DECISION_ACTION_API_CONTRACT]] · [[DSAR_APPROVAL_DECISION_ACTION_CACHE_POLICY]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
