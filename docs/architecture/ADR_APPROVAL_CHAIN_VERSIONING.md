# ADR — Approval Chain Versioning · Effective Dating · Snapshot

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §10·§11·§12·§14·§16·§19 · §46~§50 · §51~§54
> 상위 결정: [`ADR_APPROVAL_CHAIN_CANONICAL_SOURCE.md`](ADR_APPROVAL_CHAIN_CANONICAL_SOURCE.md)
> 전사 정본: `docs/approval/APPROVAL_CHAIN_VERSIONING.md`(100행) · `_TEMPLATE.md`(45) · `_EFFECTIVE_DATING.md`(54) · `_SNAPSHOT.md`(46) · `_CHANGE_IMPACT.md`(47) · `_RECONCILIATION.md`(70)
> 상태: **결정** · 289차(10회차) · **코드 변경 0**
> 경로: §71 은 `docs/adr/` 을 지정했으나 `docs/architecture/`(ADR 정본 83편)로 통합 — 근거는 §71 자신.

## Context

362행 **전량 ABSENT**(cover 0). 그러나 **부재의 깊이가 축마다 다르다** — 이 차이를 잃으면 "전부 신설"이라는 잘못된 균질화가 일어난다.

---

## D-1. **부재의 깊이가 3층이다** — 교정 계층이 다르므로 비용도 다르다

| 축 | 상태 | 교정 계층 |
|---|---|---|
| **세율** `kr_fee_rule.effective_from`(`Db.php:898`) | **컬럼 有 · 질의 無** — `WHERE effective_from <= :as_of` **전역 0** · 읽기 **4개소 전부 최신승**(`Pnl.php:454` · `KrChannel.php:102`,`:151`,`:459` — 전부 `ORDER BY effective_from DESC`) | **질의 계층**만 고치면 됨 |
| **환율** `fxToKrw`(`Connectors.php:1749`) | **컬럼도 이력도 無** — `app_setting` KV **단일행 덮어쓰기**(`:1804-1805`) | **저장 계층 신설** |
| **Approval Chain** | **엔티티 자체가 無** | **도메인 신설** |

∴ *"effective dating 이 레포에 없다"* 는 **부정확하다.** 있다 — **질의가 없을 뿐이다.** `kr_fee_rule` 은 **as-of 질의 계층의 착상 선례**로 유효하다(스키마는 아니다).

**부재 확정**: `effective_to`/`valid_to`/`valid_from` **grep 0** · optimistic lock `version` **grep 0**. ★오탐: `valid_to` 유일 히트 = `Onsite.php:396` **`in`valid_to`ken`**.

## D-2. ★**엔티티 `version` 컬럼은 6개이며 전부 하드코딩 시드다** (PM 브리핑 정정)

초판 브리핑은 *"3컬럼뿐"* 이라 했다. **최소 6개다** — `menu_defaults.version` · `ml_models.version` · `risk_model_registry.model_version` · **`risk_prediction.model_version`(`Db.php:463`)** · **`normalizer_version`(`Db.php:1088`)** · **`agent_version`(`WmsCctv.php:160`)**.

**결론은 불변**: 6개 전부 **모델/룰셋/빌드 태그**이며 **계보·증분·구조해시가 없다**. 대표 실측 = **`menu_defaults.version` 은 리터럴 `'baseline'` 고정**(`AdminMenu.php:309`).

∴ **레포에 "버전 관리된 엔티티"의 선례는 0이다.** `APPROVAL_CHAIN_VERSION` 은 **순수 신설**이며 참조할 패턴이 없다.

## D-3. **불변 해시 선례 = `SecurityAudit` 단 하나** · `menu_audit_log` 인용 금지

★**정본**: `backend/src/SecurityAudit.php` — `:27` `hash('sha256', $prev.'|'.$tenant.'|'.$actor.'|'.$action.'|'.$dj.'|'.$now)` **tenant 포함** · `:45-52` DDL(`tenant_id`/`prev_hash`/`hash_chain`) · **`verify():56-68` `hash_equals` 실 검증기**. 보조 = `schema_migrations.checksum`(`Migrate.php:50`).

🔴 **`menu_audit_log.hash_chain` 은 검증 불가능한 장식이다 — 인용 금지**:
- DDL(`AdminMenu.php:123-131`)에 **`prev_hash` 컬럼 자체가 없고 `tenant_id` 도 없다**.
- preimage 는 `'ts'=>date('c')`(`:195`)인데 저장은 `created_at DEFAULT CURRENT_TIMESTAMP`(`:129`) → **preimage 2요소가 모두 미저장 → 재구성 불가**.
- `hash_equals` 는 레포 24히트지만 **`AdminMenu` 엔 0건** = **검증기 없음**.

→ 🔴**289차 문서 ~60편이 이것을 잘못 인용했다 — ⓔ 정정 대상.** `hash_chain` 이라는 **이름이 능력을 보증하지 않는다**(규칙 2).

## D-4. **Snapshot 선례는 있으나 Chain 도메인엔 0** · `captured_at` 함정

선례: `menu_defaults(snapshot_data JSON, version)`(`AdminMenu.php:119-120`) · `pm_baseline(snapshot_json, **created_at**)`(`PM/Enterprise.php:53-57`).
★**함정**: **`captured_at` 은 DB 컬럼이 아니라 JSON 키다**(`PM/Enterprise.php:360`). 스키마로 착각하면 인덱스·as-of 질의를 전제하게 된다.
★**오탐**: `snapshot` 최다 히트 = **CCTV JPEG**(`routes.php:271`).

## D-5. **`Actor Authorization Snapshot` = ABSENT** — 4경로 어디도 승인 시점 권한을 보존하지 않는다

| 경로 | 보존 형태 |
|---|---|
| `Mapping:285` `approvals_json` | **`["user"=>$actor, "ts"=>gmdate('c')]` 정확히 2키** |
| `Alerting:591` | `{actor, decision, ts}` **3키**(형태 상이) |
| `AdminGrowth` | `decided_by`/`decided_at` **2컬럼** |

**셋 다 승인 시점의 권한·역할·플랜을 보존하지 않는다** → **as-of 질의 불가** · JSON 이라 **인덱스도 불가**.

∴ §49 `APPROVAL_CHAIN_SNAPSHOT` 은 **"어느 Chain Version 으로 승인했나"뿐 아니라 "그때 그 행위자가 무슨 권한이었나"까지** 고정해야 한다. 현행 3형태 중 **어느 것도 확장 기반이 아니다** — 순수 신설.

## D-6. 🔴 **§48 Retroactive 집행 수단이 없다**

- `backend/migrations/` = **21파일 · `20260527_172_002` 정지**(172차 이후 전부 `ensureTables` 자가치유). approval/chain/route/workflow 마이그레이션 **0**.
- ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다.**
- ★**`Migrate` 이름 겹침 주의** — DDL 적용기이지 **도메인 이행기가 아니다**. `PM/Shared.php:37-53` 도 예외가 아니다(존재검사 후 DDL .sql 적용 = 테이블 생성기).

∴ **§48 은 이행 수단부터 신설해야 한다.** "마이그레이션으로 소급 정정하면 된다"는 이 레포에서 **거짓**이다.

## D-7. 🔴 **§48 정면 반례가 레포에 살아 있다** — 복제 금지

**`AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이전 해지 시각을 소거한다** → **이력이 물리적으로 소멸** → **as-of 재구성 불가**. 재활성화를 "필드 초기화"로 구현한 결과다.

∴ `APPROVAL_CHAIN` 의 활성/비활성 전이는 **행 갱신이 아니라 이력 추가**로. **`NULL` 로 되돌리는 패턴 금지.**

## D-8. **§10 상태 16종을 §11/§12/§14/§16/§19 에 복사하지 마라** — 날조다

원문 **비대칭**: §10 만 상태 16종을 열거하고, §14·§16·§19·§11·§12 는 `status` 를 **필수로 요구하면서 허용 값을 열거하지 않는다**.

**결정**: 각 엔티티의 `status` 허용 값은 **이 블록에서 정하지 않는다**(원문에 없음). §10 을 복사해 채우면 **원문에 없는 요구를 만들어내는 것**이다. → **U-1 로 이연.**

## D-9. **§49 필드 vs 산문 충돌** → 참조 컬럼만 두고 이연이 유일 정합

§49 는 `organization version`·`reporting line version` 을 **이번 단계 필수 필드**로 요구하는데, 같은 §49 의 산문은 *"Hierarchy Snapshot 심화는 5-3-3-11"* 로 **이연을 지시**한다.

**실측상 두 축은 표현 자체가 불가능하다** — `parent_user_id` 는 **전 4 생성경로가 owner 로 하드고정**(상위 ADR D-14/D-15)이라 reporting line version 이라는 개념이 성립하지 않는다.

**결정**: **nullable 참조 컬럼만 두고 값은 채우지 않는다.** 채우면 `IMPLEMENTATION_STATUS.md:130` 과 같은 **가짜 완료 기록**이 된다(§72-25).

## D-10. **§46 요청측 필드가 원문에 없다** — 미결로 명시

§46 의 14필드는 **전부 `APPROVAL_CHAIN_EFFECTIVE_PERIOD` 저장측**이다. **`resolution_time_basis`(해석 시각 기준)를 전달할 요청측 필드가 §46 에 정의되지 않았다.** §53 `effective date` 가 유일한 인접 축이다. → **U-2.**

이것이 중요한 이유: **Business Time 과 System Time 을 구분하지 않으면** "언제 기준으로 이 Chain 이 유효했나"에 답이 두 개가 된다.

## D-11. **§11 #14 `platform template 여부`는 `tenant_id IS NULL` 로 구현하지 마라**

레포엔 **Tenant 마스터 테이블이 없다** — `api_key.tenant_id` 는 **FK 없는 VARCHAR(100)**(`Db.php:944`)이고 테넌트 열거는 `SELECT DISTINCT tenant_id` **19개소 역추론**이다.

🔴 `tenant_id IS NULL` 을 Platform 센티넬로 쓰면 **`effectiveScope:256`(스코프 미설정 → NULL → 무제한)과 같은 사고 패턴**이 재발한다. **명시 플래그**(`is_platform BOOLEAN NOT NULL DEFAULT 0`)를 쓰라. **NULL 에 의미를 싣지 마라.**

## D-12. **§36 Template = `NAME_ONLY`** · `$defaultNodes` 를 템플릿 선례로 오인하지 마라

`createJourney:120-126` 의 `$defaultNodes`/`$defaultEdges` 는 **PHP 리터럴 시드 그래프**로 **생성 시 1회 복사**된다. **레지스트리·버전·재적용이 전무**하다 → 템플릿이 아니라 기본값이다.

★**오탐 3건**: `template_code`/`template_name` → **카카오 알림톡 사전승인 템플릿**(`KakaoChannel.php:47`,`:50`,`:150-161` · UNIQUE + 409) · `template_id` → **발송 템플릿 FK**(`Line.php:186` · `EmailMarketing.php:56` · `Omnichannel.php:497`) · `JourneyBuilder.php:122` `'template_id'=>null` → **이메일 노드 config 키**.

## D-13. **§51/§53 은 피연산자가 없다** · §52 Case 개념 자체가 ABSENT

Chain 이 없으므로 영향분석·조정의 **대상이 없다**(규칙 7 — 현행이 이를 "위반하지 않는" 것은 대상 부재 때문이며 준수로 계산하지 않는다).

🔴 **§52 In-flight Case** — `Approval Case` 개념이 **ABSENT**다: 요청 1행 = 결정 1행 = 종결이며 **재개·이관 코드 0**. 그리고 **승인 4경로 중 어느 것도 "자신이 어떤 정의로 만들어졌는지"를 기록하지 않는다** → §10 `affected active cases` **산출 불가**.

∴ **`APPROVAL_CASE` 는 Chain Version 을 역참조로 고정**해야 한다. 이것이 없으면 §51/§52/§53 전체가 성립하지 않는다.

## D-14. **§54 상태머신 = ABSENT** · 전이 가드가 있다고 상태머신이 아니다

`SET status *=` **128건/42파일**(PM 브리핑 *"155건/44파일"* 은 **패턴 의존 과대** — 정밀 측정 128/42). **합법 전이 집합 선언 0.** 전이 가드는 **최소 8곳**(PM 브리핑 *"4곳뿐"* 은 **과소**): `FeedTemplate:239`,`:258`,`:285` · `CustomerAI:469` · `Dsar:555` · `AdminGrowth:1327` · `LiveCommerce:530` · `Mapping:264`.

★**그러나 결론은 불변**: `FeedTemplate::transition(…, string $from, string $to)`(`:249`)이 **전이 쌍을 호출자 인자로 받아** `:258` 이 "현재 status == 넘겨받은 from"만 검사한다 → **합법 전이 집합을 알지 못한다**. 128건 중 대부분이 무가드다.

---

## 무후퇴

1. **`menu_audit_log` 를 감사·해시 선례로 인용 금지**(D-3).
2. **`revoked_at=NULL` 소거 패턴 복제 금지**(D-7).
3. **`tenant_id IS NULL` 을 Platform 센티넬로 쓰지 마라**(D-11) — NULL 에 의미 싣기 금지.
4. **§10 상태 16종을 타 엔티티에 복사 금지**(D-8) — 날조.
5. **§49 organization/reporting line version 에 값을 채우지 마라**(D-9) — 가짜 완료 기록.
6. **`captured_at` 을 DB 컬럼으로 착각 금지**(D-4).
7. **"마이그레이션으로 소급 정정" 전제 금지**(D-6) — `ensureTables` 는 백필하지 않는다.

## 미결

| # | 미결 | 사유 |
|---|---|---|
| U-1 | §11/§12/§14/§16/§19 의 `status` 허용 값 | 원문 미열거(D-8). §10 복사는 날조 |
| U-2 | §46 `resolution_time_basis` 요청측 필드 | 원문 미정의(D-10) |
| U-3 | §49 organization/reporting line version 실 구현 | 5-3-3-11 이연 · 선행조건 0%(D-9) |
| U-4 | §12 `compatibility range` 비교 의미론 | 레포 version 값이 전부 문자열 태그이고 비교 코드 0(D-2) — 비교 대상 부재 |
