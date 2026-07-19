# DSAR — Authorization Action Contract (06-A-03-02-03-04 · §17)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §17 Action Contract · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§17 Action Contract (Canonical Code) — CODE enum (원문 전사, 40종):
`VIEW` / `LIST` / `SEARCH` / `CREATE` / `UPDATE` / `DELETE` / `ARCHIVE` / `RESTORE` / `SUBMIT` / `WITHDRAW` / `CLAIM` / `RELEASE` / `ASSIGN` / `REASSIGN` / `DELEGATE` / `APPROVE` / `REJECT` / `RETURN` / `REQUEST_CHANGE` / `HOLD` / `RESUME` / `CANCEL` / `OVERRIDE` / `CORRECT` / `SUPERSEDE` / `ESCALATE` / `DOWNLOAD` / `EXPORT` / `PRINT` / `SHARE` / `EXECUTE` / `RETRY` / `REOPEN` / `CLOSE` / `CONFIGURE` / `ADMINISTER` / `SIMULATE` / `RECONCILE` / `CERTIFY` / `CUSTOM`.

필수 필드 (원문 전사):
- `domain` · `category` · `risk level`
- `interactive` / `decision action` / `administrative` / `destructive` / `irreversible` / `financial impact`
- `requires fresh authorization` / `commit revalidation` / `evidence` / `step-up`

의미: Action Contract는 "무슨 행위(action)"를 인가하는지를 **테넌트 무관 정규 코드(Canonical Code) 40종**으로 통일한다. §5.6(Action 명시)의 실체. 동일 의미의 행위가 도메인마다 다른 이름(approve/decide/confirm)으로 흩어지는 것을 막고(§59 "동일 Action 다른 이름"), risk/destructive/irreversible/financial 속성을 코드에 결합해 프로파일(§14)·정책(§10)이 위험도별로 fresh authorization/commit revalidation/step-up을 요구한다.

## 2. 기존 구현 대조

- **acl_permission 8동작 = substrate**:
  - `TeamPermissions.php:39,152-159,325-336` — subject_type×menu×**8action** 매트릭스(manage=슈퍼셋). §17 40종 Canonical Code의 부분 대응(예: view/create/update/delete류)이나, 8동작은 메뉴 CRUD 축이고 `APPROVE`/`REJECT`/`DELEGATE`/`OVERRIDE`/`SUPERSEDE`/`CERTIFY`/`RECONCILE` 같은 decision/administrative action은 미포함.
  - write 메서드 게이트 `index.php:568-578`(POST/PUT/PATCH/DELETE=write) = HTTP 메서드 축의 조잡한 action 분류 — CRUD 4종 수준, 40 canonical code와 무관.
- **approve/decide 도메인 명명 (Canonical 통일 부재)**:
  - Maker-Checker approve `:238-292`(Mapping·자기승인차단/dedup/정족수)·decideAction `:598-658`(Alerting·정족수2) = `APPROVE`/`REJECT` action의 실 substrate이나, **도메인 로컬 이름**(approve/decideAction)으로 흩어져 canonical `APPROVE`/`REJECT`/`RETURN` 코드로 통일되지 않음. §59 "동일 Action 다른 이름" 사례.
- **★Canonical Action Code 통일 부재**:
  - `domain`·`category`·`risk level`·`destructive`·`irreversible`·`financial impact`·`requires fresh authorization`·`step-up`을 action 코드에 결합하는 계약 → **no hits**. 현재 action 위험도는 write=analyst+(`index.php:568-578`)의 단일 임계뿐 — DELETE/OVERRIDE(고위험·irreversible)와 UPDATE(중위험)를 구분 못함.
  - `SIMULATE`/`RECONCILE`/`CERTIFY`/`ESCALATE`/`SUPERSEDE` 같은 거버넌스 action → 인가 계층에 canonical code로 부재.
- **하위 도메인 permission 예시**(action 축 산재): `Wms.php:72,114` wms_permissions·`AdminPlans.php:393` plan_menu_access·`UserAuth.php:170,1433,1465-1489`(`AdminMenu.php:361`) subMenuAllowed — 전부 도메인 로컬 action/menu 판정, canonical code 미통일.

## 3. 판정

- Verdict: **PARTIAL** — acl_permission 8동작(`TeamPermissions.php:39`)·write 게이트(`index.php:568-578`)·Maker-Checker approve/decide(`:238-292`·`:598-658`)가 action **substrate**로 실재, Canonical Action Code 40종 통일·risk/destructive/irreversible/financial 속성 결합은 부재.
- cover: **substrate ~20%** (CRUD/write/approve 축의 도메인 로컬 판정은 실재. 40 canonical code·위험 속성 결합·decision/administrative action 통일은 0).
- ★핵심 갭: action이 canonical code로 통일되지 않아 위험도별 차등 인가(destructive→step-up·financial→fresh authorization)가 불가. 동일 action 다른 이름(approve/decideAction)=정책 드리프트·중복(§59).
- 선행 의존: `commit revalidation`·`requires fresh authorization`은 §3.2 Decision Foundation(Validation/Commit)·§39 Commit Binding에 종속 — 부재.

## 4. 확장/구현 방향 (설계)

- Action Contract 순신규 — 40 Canonical Code enum을 SoT로 선언, 각 코드에 `domain`·`risk level`·`destructive`/`irreversible`/`financial impact`/`requires fresh authorization`/`commit revalidation`/`step-up`을 결합. Policy(§10)/Profile(§14)이 코드 속성으로 위험도별 강제.
- Golden Rule=Extend:
  - `TeamPermissions.php:39,152-159,325-336` acl 8동작 = CRUD계열 canonical code(VIEW/LIST/CREATE/UPDATE/DELETE/ARCHIVE 등) 초기 매핑 입력 — 재구현 금지, canonical code로 정규화.
  - Maker-Checker approve(`:238-292`)·decideAction(`:598-658`) = `APPROVE`/`REJECT`/`RETURN` canonical code로 통일(도메인 로컬 이름 → canonical 매핑 어댑터). §59 중복 action 이름 해소.
- ★위험 속성 결합: `DELETE`/`OVERRIDE`/`SUPERSEDE`=destructive+irreversible→`requires fresh authorization`+`step-up`; `APPROVE`(financial impact)=`commit revalidation`. write=analyst+ 단일 임계(`index.php:568-578`)를 action 위험도 차등으로 대체.
- §54 Lint 연계: "동일 Action 다른 이름"·"동일 Resource 다른 Type Code" 탐지로 canonical code 미준수 회귀방지.
- 실 canonical code 배선·위험 속성 강제 = §3.2 Decision Foundation 신설 후 별도 승인세션(이번 Part=코드 enum·계약 명세·코드 0).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_RESOURCE_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_ENVIRONMENT_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_CONTEXT]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
