# DSAR — Workflow Variable (§35)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §35 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

원문 말미 제약: **"Immutable Approval Snapshot 관련 Variable은 수정하지 못하게 한다."**

**★원문에 Type 축 없음.** §35 는 `value type` 을 **필수 필드**로 요구하나 **그 열거를 제시하지 않는다**(§31 Status · §32 Execution Type · §33 Token Type · §34 Transition Type 과 달리). 따라서 이 문서는 **필드 축 19종만 전사**한다. 값 타입 목록을 지어내지 않았다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 워크플로 변수 테이블 | `variable_id`·`variable_name`·`value_type` **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 최근접 = 노드 config | `journeys.nodes` JSON 내 `$node['config']`(JourneyBuilder.php:615,:549) — **정의에 매장된 상수**(인스턴스 변수 아님) | `KEEP_SEPARATE_WITH_REASON` |
| 실행 중 상태값 | `journey_enrollments` 컬럼(`revenue`·`converted`·`resume_at`·`wait_until` :45,:80-83) — **고정 컬럼**(임의 변수 불가) | `NOT_APPLICABLE` |
| 스코프(인스턴스/토큰/노드) | **부재** — Token 개념 grep 0(§33) · 변수 자체 부재 | `NOT_APPLICABLE` |
| 🔴 암호화 | **`Genie\Crypto`(Crypto.php:19) REAL** — AES-256-GCM(:121) · **키 버전**(`keyForVersion` :121) · **은행급 fail-closed**(openssl 부재/키 미가용 시 **예외 throw · 평문 저장 거부** :113-114) · 실배선 `Connectors.php:154,:157` · `Line.php:113-114` · `Alerting.php:966` | `VALIDATED_LEGACY`(재사용 강제) |
| 마스킹 | 전용 엔진 부재 · 인접 = `Alerting.php:966` `strpos($v,'•')` **쓰기측 센티널**(마스크된 값이 되돌아오면 기존값 유지) — **표시 관례**이지 마스킹 축 아님 | `LEGACY_ADAPTER`(패턴만) |
| 익명화/삭제 | `Dsar.php:91-97` 테이블별 정책(`redact`/`pseudo_email`/`json_erase`) + `applyAnon`(:765-773) | `LEGACY_ADAPTER` |
| 불변 스냅샷 | 인접 = `menu_defaults`(AdminMenu.php:120,:139) `snapshot_data`+`version`+`created_at` — **INSERT 후 최신행 조회**(:308,:584) = **append-only 스냅샷 실선례** | `LEGACY_ADAPTER`(패턴 채택) |
| 변수 버전 | **부재** | `NOT_APPLICABLE` |

**★축 주의 — `$node['config']` ≠ Variable.** `config`(:615,:549)는 **워크플로 정의에 박힌 상수**다(작성자가 캔버스에서 설정 → `journeys.nodes` JSON 에 매장). §35 Variable 은 **인스턴스 실행 중 생성·갱신되는 값**이며 스코프·버전·불변성·암호화를 개별로 갖는다. `config` 를 Variable 로 계산하면 **읽기 전용 상수를 실행 상태로 위장**하는 것이다 = 역산.

## 1. 원문 전사 + 판정 — **원문 19종**(필수 필드)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_variable_id | **grep 0** | `NOT_APPLICABLE` |
| 2 | workflow_instance_id | 부재 · 인접 = `journey_enrollments.id`(:43) | `LEGACY_ADAPTER` |
| 3 | workflow_token_id | **Token 개념 grep 0**(§33) | `NOT_APPLICABLE` |
| 4 | node reference | 부재(변수) · 인접 = `journey_node_logs.node_id`(:50) | `LEGACY_ADAPTER` |
| 5 | task reference | Task 개념 grep 0(§36) | `NOT_APPLICABLE` |
| 6 | variable definition | **부재** — 변수 정의 축 전무(**워크플로 정의 테이블 자체가 grep 0**) | `NOT_APPLICABLE` |
| 7 | variable name | **grep 0** | `NOT_APPLICABLE` |
| 8 | variable value reference | **부재** — 값을 **참조**로 두는 개념 없음(현행은 전부 직접 매장) | `NOT_APPLICABLE` |
| 9 | value type | **grep 0** · ★원문이 **열거를 제시하지 않음**(지어내지 않았다) | `NOT_APPLICABLE` |
| 10 | scope | **부재** — 인스턴스/토큰/노드 스코프 구분 없음 | `NOT_APPLICABLE` |
| 11 | source | **부재** | `NOT_APPLICABLE` |
| 12 | version | 부재(변수) · 인접 = `menu_defaults.version`(AdminMenu.php:120,:139) **스냅샷 버전** | `LEGACY_ADAPTER` |
| 13 | immutable 여부 | **부재** — 🔴 현행 관행은 **destructive UPDATE**(`UPDATE ... SET status=` 155건/44파일) | `NOT_APPLICABLE` |
| 14 | encrypted 여부 | 부재(플래그 축) · ★**암호화 능력은 REAL** = `Genie\Crypto::encrypt`(Crypto.php:108-121) AES-256-GCM·키버전·fail-closed | `VALIDATED_LEGACY` |
| 15 | masked 여부 | **부재**(플래그 축) · 인접 = `Alerting.php:966` `•` 센티널 **관례** | `LEGACY_ADAPTER` |
| 16 | created_at | 부재(변수) · 인접 = `menu_defaults.created_at`(:139) · `journey_node_logs.executed_at`(:51) | `LEGACY_ADAPTER` |
| 17 | updated_at | 부재(변수) · 인접 = `notification_channel.updated_at`(Alerting.php:966) | `LEGACY_ADAPTER` |
| 18 | status | 부재(변수 단위) | `NOT_APPLICABLE` |
| 19 | evidence | 부재 · 인접 = `journey_node_logs`(:48-52) | `LEGACY_ADAPTER` |

**실측 개수: 19 / 19 전사.** 커버리지 = 부재 11 · `LEGACY_ADAPTER` 7 · `VALIDATED_LEGACY` 1(`encrypted 여부`).

★ **유일한 `VALIDATED_LEGACY` 가 `encrypted 여부` 인 것은 우연이 아니다** — 레포는 **비밀 취급(자격증명 암호화)** 을 은행급으로 풀었고(`Crypto` fail-closed), **실행 상태 취급(변수)** 은 통째로 비어 있다. §35 는 후자를 신설하되 전자를 **반드시 재사용**해야 한다.

## 2. 규칙

- 🔴 **`encrypted 여부`(#14) 배선 시 `Genie\Crypto`(Crypto.php:19) 재사용 강제 — 신규 암호화 경로 신설 절대 금지.**
  실측 근거: AES-256-GCM(:121) · **키 버전**(`keyForVersion` :121 — 키 회전 대응) · **은행급 fail-closed**(:113-114 — openssl 부재·키 미가용 시 **예외를 던져 평문 저장을 거부**). 실배선 3개소(`Connectors.php:154,:157` · `Line.php:113-114` · `Alerting.php:966`).
  두 번째 암호화 유틸을 만들면 ① 키 회전이 갈라지고 ② fail-closed 규율이 재작성되며 ③ 승인 변수가 **평문으로 샐 수 있다**.
- 🔴 **`immutable 여부`(#13) + 원문 말미 제약("Immutable Approval Snapshot 관련 Variable은 수정하지 못하게 한다")은 현행 관행과 정면 충돌한다.**
  레포 기본값이 **destructive UPDATE**(`UPDATE ... SET status=` **155건/44파일**)다. 불변 변수를 **애플리케이션 `if` 로만 지키면 155건의 관행이 언젠가 이긴다.**
  → **`menu_defaults` 패턴 채택 권고**(AdminMenu.php:120,:139,:308,:584): `snapshot_data`+`version`+`created_at` 를 **INSERT only · 최신행 조회**로 다룬다 = 레포에 이미 있는 **append-only 스냅샷 실선례**. 승인 스냅샷도 **UPDATE 경로를 아예 만들지 않는 것**이 유일하게 신뢰할 수 있는 불변성이다.
  ★ 단 `menu_defaults` 는 **tenant 축이 없다**(:120 `id`+`snapshot_data`+`version`+`created_at`) — 패턴만 가져오고 **`tenant_id NOT NULL` 을 반드시 추가**하라. `admin_growth_approval` 의 tenant 결번(**tenant_id 없음·전역 조회** `AdminGrowth.php:1324`)을 되풀이하지 마라.
- 🔴 **`masked 여부`(#15) 를 `•` 센티널(Alerting.php:966)로 구현 금지.** 그것은 **쓰기측 관례**(마스크된 값이 되돌아오면 기존값 유지)이지 마스킹 축이 아니다. `masked` 는 **행의 플래그**여야 조회·감사가 가능하다. 센티널에 의존하면 **사용자가 실제로 `•` 를 포함한 값을 넣는 순간 값이 조용히 무시된다**(현행 실 위험).
- 🔴 **`variable value reference`(#8) 를 직접 매장으로 대체 금지** — 원문은 값을 **참조**로 요구한다. 큰 값·암호화 값·PII 를 변수 행에 인라인하면 `Dsar.php:91-97`(`redact`/`pseudo_email`/`json_erase`) **삭제 정책이 워크플로 변수에 도달하지 못한다**(DSAR 정책 테이블에 등재되지 않은 새 테이블이므로). 신설 시 **`Dsar.php:91` 정책 맵에 등재**가 완료 조건이다.
- 🔴 **`scope`(#10) 는 §33 Token 선행 필수** — 토큰 스코프 변수는 토큰 행이 없으면 걸 곳이 없다. Token(§33) 없이 `scope` 만 배선하면 **인스턴스 스코프 하나로 퇴화**한다.
- 🔴 **`$node['config']`(:615,:549) 를 Variable 로 재사용 금지** — 정의 상수와 실행 변수의 혼동. `config` 는 **존치**(무후퇴)하고 Variable 은 별 축으로 신설.
- **`version`(#12) 은 `lock version`(§31 #23)과 다른 것이다** — 전자는 **값 이력**, 후자는 **동시성 CAS**. 한 컬럼으로 겸하지 마라(현행 `journey_enrollments.status` 가 `current state`+`status` 를 겸해 생긴 미분화를 되풀이하게 된다).
