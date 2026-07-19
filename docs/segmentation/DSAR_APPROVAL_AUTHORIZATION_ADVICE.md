# DSAR — Authorization Advice (06-A-03-02-03-04 Part 1 · §28)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★인용은 GROUND_TRUTH([DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract)

§28 ADVICE (권고·Permit 불변) — 원문 전사:
- 유형(7종): `DISPLAY_WARNING` / `SHOW_POLICY_NOTICE` / `RECOMMEND_STEP_UP` / `MANUAL_REVIEW` / `ADDITIONAL_EVIDENCE` / `LIMITED_SCOPE` / `CUSTOM`.
- **Obligation과 혼동 금지.**

의미: Advice는 Authorization Decision이 **PERMIT(또는 조건충족 CONDITIONAL_PERMIT)로 확정된 뒤에도 그 Permit 효력을 바꾸지 않는 순수 권고**다. Obligation(§27)은 미이행 시 Commit을 막는 강제 후속의무인 반면, Advice는 이행하지 않아도 Permit이 유효하다. 즉 "경고 표시·정책 고지·스텝업 권장·수동검토 권장·추가증빙 권장·범위축소 권장"을 결정 결과에 부착하되, 부착·미부착·이행·미이행 어느 경우에도 Effect(§23)와 Decision(§24)은 불변이다. Advice는 Decision Snapshot(§34)의 `advice` 슬롯에 기록되고, Reason(§26)·Obligation(§27)·Constraint(§29)와는 분리된 별도 참조 집합이다.

## 2. 기존 구현 대조

- **Authorization 결정에 부착되는 권고(Advice) 선언 구조체는 부재** — Decision을 산출한 뒤 그 결정에 "권고"를 데이터로 부착·기록하는 개념 자체가 없다. 애초에 Authorization Decision을 불변 레코드로 산출하는 구조가 부재(§24·§34 ABSENT)하므로, 그에 딸리는 Advice도 연쇄 부재다.
- 실존하는 유사·인접 자산(권고 아님):
  - FE `writeGuard.js`(`writeGuard.js:13,61-90,73`) — member 쓰기차단 UI 인터셉터. 사용자에게 표시되는 안내이지만 **UI-only·fail-open**(자인 "Phase3b 후속" `writeGuard.js:15`)이며, 서버 Authorization 결정과 결합된 권고가 아니라 클라이언트 힌트다. §5.4 UI Control ≠ Authorization에 해당.
  - `index.php`의 write 메서드 게이트(`index.php:568-578`)·admin:keys scope 게이트(`index.php:564-567`) — 통과/차단(허용/거부) 이분 결과만 있고, "허용하되 경고를 권고한다"는 중간 권고 층이 없다.
- `DISPLAY_WARNING`/`SHOW_POLICY_NOTICE`/`RECOMMEND_STEP_UP`/`ADDITIONAL_EVIDENCE`/`LIMITED_SCOPE`를 결정 결과에 부착하는 필드 → **no hits**.
- Advice ↔ Obligation 구분(권고 vs 강제) 자체가 코드에 없다 — 현재 인가는 allow/deny 이진이라 권고/의무를 구분할 필요조차 발생하지 않았다.

## 3. 판정

- Verdict: **ABSENT (순신규)**
- substrate: **없음(무의미 수준)**. writeGuard UI 힌트는 클라이언트 통제이지 서버 인가결정 부착 권고가 아니므로 Advice substrate로 계상 금지(KEEP_SEPARATE·UI_ONLY_CONTROL).
- 선행 의존: Advice는 Decision(§24)·Decision Result(§25)·Decision Snapshot(§34)에 부착되는 종속 엔티티 — 상위 Decision Foundation 부재(GROUND_TRUTH §3.2 상당수 부재)로 연쇄 BLOCKED_PREREQUISITE.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authorization_advice` — Authorization Decision에 부착되는 **비강제 권고** 컬렉션. 필드: `advice_id`·`decision_id`·`advice_type`(7종)·`message_key`(로컬라이즈드·§26 REASON `localized message key` 정책 준용)·`parameters`·`sequence`·`captured_at`. **Effect/Permit 불변 불변식**을 스키마·런타임에서 강제: Advice 부착·미이행이 Decision Result(§25)를 절대 변경하지 못하도록 Advice는 read-only 부착만.
- **Obligation과의 경계선(§27 vs §28) 명문화**: Obligation은 `mandatory`·`failure behavior`가 있고 미충족 시 Commit Binding(§39) 차단; Advice는 그런 게이트가 없다. 두 엔티티를 동일 테이블/동일 코드로 합치는 것 금지(§59 중복 방지) — 권고를 의무로 오승격하면 Permit을 부당 차단, 의무를 권고로 오강등하면 무단접근이 된다.
- `RECOMMEND_STEP_UP` Advice는 Challenge(§31)의 강제 STEP_UP과 구분: 권고는 미이행해도 Permit 유효, Challenge는 완료 전까지 Permit 미확정. 두 경로가 같은 상황에 동시 등장할 수 있으므로 Policy(§10)의 `challenge policy`/`advice policy`에서 어느 쪽으로 라우팅할지 정책버전화.
- Golden Rule=Extend: 기존 FE `writeGuard.js` UI 힌트는 폐기하지 않고, 향후 서버 Decision이 산출한 `LIMITED_SCOPE`/`DISPLAY_WARNING` Advice를 소비해 표시하는 **표시 계층**으로 재배선(서버가 SoT·FE는 렌더). 실 배선/수정은 후속 enforcement Part.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_CONSTRAINT]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION_SNAPSHOT]] · [[DSAR_AUTHORIZATION_OBLIGATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
