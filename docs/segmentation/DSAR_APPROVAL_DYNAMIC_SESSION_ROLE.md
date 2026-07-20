# DSAR — Approval Session Role (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Session Role)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN은 Permit하지 않음(fail-closed) · Dynamic ≠ 정적 role · 마케팅 Rule Engine 오흡수 금지(KEEP_SEPARATE) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Session Role은 **세션에만 존재하며 세션 종료 시 자동 삭제되는 Role**이다(스펙 §12 "Session에만 존재. 세션 종료 시 자동 삭제."). 목적은 로그인 세션 기간 한정으로만 유효한 권한 확장/축소를 부여하고, 세션이 만료되면 별도 정리 작업 없이 그 Role도 함께 소멸하도록 하는 것이다. 이는 현행 `user_session`이 세션 자체의 만료만 관리하고 role 부여와는 무관하다는 점과 근본적으로 다르다.

## 2. Canonical 필드

스펙 §12·§2 Canonical Entity `APPROVAL_DYNAMIC_ROLE_SESSION`·§11(Expiration: Session End) 근거 설계 필드(코드 0·미확정):

- `session_role_id` · `session_ref`(→ `user_session`, 외래키로 세션 생명주기에 결속) · `role_definition_ref` · `activated_at` · `activation_trigger`(§10: Login/MFA Success/Session Created 등) · `auto_expire_on_session_end`(true 고정) · `tenant_id`

## 3. 열거형 / 타입

- 본 문서는 Dynamic Role Type(자매편 `DSAR_APPROVAL_DYNAMIC_ROLE_TYPE.md`)의 유형 2번 "Session Role"에 대한 상세 명세다. 별도 하위 열거형은 없음(단일 유형 심화).

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **Session Role = ABSENT**: `dynamic/runtime/session/conditional/context role` grep 0(전수조사 §1). "세션에 결속된 role" 개념이 코드베이스에 없다.
- **세션 자체는 실재하나 role과 결합되지 않음**: `user_session` 테이블(`Db.php:1111-1119`)은 세션 자체의 `created_at`/`last_seen`만 관리하고 role 컬럼을 갖지 않는다(전수조사 §4 "session age" 행: 실재하나 "role 활성 입력?"=✗, `/auth/sessions` 표시만 `UserAuth.php:4254-4281`). ALTER로 추가된 `ip/ua/last_seen`(`UserAuth.php:4237`) 역시 표시·감사 목적이며 role 부여와 무관.
- **user_session은 "만료"만 담당**: 세션 만료 시 세션 레코드 자체가 무효화되는 로직은 있으나(로그인/로그아웃 흐름), 그에 결속된 **role을 함께 자동 삭제하는 로직**은 애초에 role이 세션에 결속되지 않으므로 존재할 수 없다(구조적 ABSENT — 참조할 대상이 없어 "삭제"할 것도 없음).
- **정적 role과의 결정적 차이**: `team_role`/`admin_level`(`UserAuth.php:1019,191,1022`)은 세션이 아니라 **DB persisted 사용자 속성**이며 세션 종료와 무관하게 유지된다 — Session Role이 도입되어야 비로소 "세션 한정 권한"이라는 축이 생긴다.

## 5. 설계 원칙

- **세션 생명주기 결속을 외래키로 강제**: `session_role_id`는 반드시 `session_ref`(user_session)를 가지며, 세션 삭제 시 CASCADE 삭제(또는 애플리케이션 레벨 자동 정리)로 고아 Session Role이 남지 않도록 한다(스펙 §11 Session End 트리거).
- **정적 role 위에 얹는 additive 설계**: Session Role은 team_role/admin_level을 대체하지 않고 세션 기간 한정으로 권한을 추가/제한하는 오버레이로 설계(Golden Rule Extend).
- **Activation Trigger는 스펙 §10 목록 재사용**: Login·MFA Success·Session Created·Organization Changed·Context Changed·Project Changed·Risk Changed·Manual Refresh 중 세션 생성과 직접 연관된 항목(Login/MFA Success/Session Created)을 Session Role 활성 트리거 우선순위로 설계.

## 6. Gap / BLOCKED_PREREQUISITE

- `user_session`에 role 참조 컬럼/연결 테이블 자체가 없음(순신규 스키마 필요) — 전수조사·중복 감사 어디에도 세션-role 결합 substrate 언급 없음.
- **BLOCKED_PREREQUISITE(RP-002)**: Session Role이 부여할 Permission/Scope가 선행 Permission Engine(Part 2, 코드 0) 확정 전에는 "무엇을 부여하는가"를 구체화할 수 없음.
- 세션 종료 트리거의 정확한 시점(명시적 로그아웃 vs `last_seen` 타임아웃 vs 관리자 강제 종료) 별로 Session Role 삭제 로직이 달라질 수 있음 — 세션 만료 판정 로직 자체의 정본 확인이 별도 선행 필요.
