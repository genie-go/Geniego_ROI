# DSAR — Retroactive Change (§46)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §46 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Retroactive 개념 | `retroactive` **backend/src grep 0** | `ABSENT`(이름·능력 양쪽) |
| 과거 시점 조회 | 🔴 **`effective_from *<=` 술어 = 전역 0건**(PM 재검증) → **"과거 어느 날의 상태"를 물을 수단이 없다** | `ABSENT` |
| Version 축 | **엔티티 `version` = `menu_defaults.version` 단 1건**(`AdminMenu.php:120`·`:139`) · **optimistic lock `version` grep 0** · `crm_segments` version/snapshot/evaluated_at **전무**(`CRM.php:64-70`) | `ABSENT` |
| ★**재계산 집행 수단** | **`ensureTables` 는 테이블 생성만 · 데이터 변환·백필 없음**(ⓑ §20 제약 2) · `backend/migrations/` **172차 정지** | **집행 수단 부재** |
| Original Version 보존 | 인접 = `menu_defaults` 스냅샷(`AdminMenu.php:119-122`) — **단 전역 1행 · tenant 없음 · 최신 1건만 조회**(`:584`) | `PARTIAL` |
| 정정(Correction) 축 | `correction` 개념 전무 · 인접 = **OrderHub 수동취소 역분개**(268차) — 회계 도메인 | `KEEP_SEPARATE_WITH_REASON` |
| 감사 증적 | **3계층 병존** — `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128`, SHA-256 prev-chain 실구현 `:182-197`·`lastHash():214-219`) · `pm_audit_log`(tenant+entity+diff_json+3인덱스, migration `20260526_168_008`) · 전역 `audit_log` **4컬럼·tenant 없음·해시체인 없음**(`Db.php:540-545`) | `LEGACY_ADAPTER` |

### ★§46 은 **집행 수단이 없다** — 가장 정직한 판정이 `CONTRACT_ONLY`

§46 은 *"과거 날짜부터 조직 구조를 수정하고 **재계산(Reconciliation)** 한다"* 를 요구한다. 이 요구의 핵심은 **소급 후 영향받은 과거 데이터를 다시 계산하는 것**이다. 그런데:

- **레포의 유일한 스키마 진화 경로 = `ensureTables`** (마이그레이션은 172차 정지).
- ★**`ensureTables` 는 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` 로 구조만 만들고, 기존 행을 변환하거나 백필하지 않는다**(ⓑ §20 제약 2).

→ **소급 재계산을 수행할 집행기가 레포에 존재하지 않는다.** 스키마를 아무리 잘 설계해도 **§46 Reconciliation 은 신규 런타임 워커 없이는 계약으로만 남는다.** 🔴 **정직하게 `CONTRACT_ONLY` 로 등재한다.**

### ⚠️ 관찰 사실 — 현행은 소급의 **정반대**로 동작한다 (**등급 미부여**)

`Pnl.php:449` 가 조회 기간을 받고도 `:454` 가 `ORDER BY effective_from DESC LIMIT 1`(최신승)로 읽으므로, **요율을 바꾸면 과거 기간 P&L 이 자동으로 새 값으로 재계산된다** — 즉 **모든 변경이 이미 무조건 소급 적용된다.**

이는 §46 이 요구하는 통제된 소급(정당성·승인·원본보존·정정버전)과 **정반대**다. §46 은 *"과거 Version 과 Snapshot 을 덮어쓰지 마라"* 를 요구하는데, 현행은 **과거 버전이라는 개념 자체가 없어서 항상 덮어쓴 결과만 보인다.**

🔴 **단 등급을 매기지 않는다.** `:451` 주석이 *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 로 **의도를 명시**하므로 설계 선택일 수 있다(§44 문서와 동일 판단). **라이브 확인 전 P0/P1 금지**(287차 블라인드 지양). → **관찰 사실로만 등재.**

## 1. 원문 전사 + 판정 — **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Business Justification | 부재(조직) · 인접 = `menu_audit_log.reason TEXT`(`AdminMenu.php:127`) — **감사 사유 필드 선례**(단 메뉴 도메인 · 강제성 미확인) | `LEGACY_ADAPTER` |
| 2 | Authorized Requester | 부재 · 인접 = `menu_audit_log.changed_by`+`changed_by_role`(`AdminMenu.php:126`) · `pm_audit_log` actor(migration `20260526_168_008`) — **행위자 기록은 있으나 "소급 권한"이라는 별도 권한 축 없음** | `PARTIAL` |
| 3 | Approval Reference | 부재 — 승인 엔티티 자체가 부재(5-3-2 확정) → 참조할 대상 없음 | `ABSENT` |
| 4 | Affected Historical Period | 부재 — 🔴 **`effective_from <=` 0건 → 과거 기간을 지목할 술어가 없다** | `ABSENT` |
| 5 | Affected Approval Cases | 부재 — Case 개념 전무 | `ABSENT` |
| 6 | Affected Audit Evidence | 부재 · 인접 = 감사 3계층(`menu_audit_log`/`pm_audit_log`/전역 `audit_log`) — **단 "소급이 기존 증적을 무효화한다"는 연결 없음** | `LEGACY_ADAPTER` |
| 7 | Original Version Preservation | ★**최근접 선례 = `menu_defaults`**(`AdminMenu.php:119-122` MySQL/`:138-139` SQLite) — 스냅샷 보존. **단 ⓐ 전역 1행(tenant 없음) ⓑ 최신 1건만 조회(`:584` `ORDER BY created_at DESC LIMIT 1`) ⓒ immutable_hash 없음 ⓓ 유일 생산자 `:308` 이 `version` 에 **리터럴 `'baseline'` 고정** → 버전 계열 아님 | `PARTIAL` |
| 8 | Correction Version | 부재 — 정정 버전 축 전무 · **엔티티 version 자체가 1건뿐** | `ABSENT` |
| 9 | Reconciliation | ★**부재 · 집행 수단 없음**(`ensureTables` 백필 불가 · 마이그레이션 172차 정지) — **재계산기 순수 신규** | `ABSENT` |
| 10 | Manual Review for Financial Impact | 부재 · 인접 = 안전장치 패턴(헌법 Vol5 Safety Rule) — **조직 소급의 재무영향 검토 절차 없음** | `ABSENT` |

**실측 개수: 10 / 10 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 2 · `LEGACY_ADAPTER` 3 · `ABSENT` 5.

> ⚠️ **규율 5 준수 확인**: §46 의 원문 목록은 **`evidence` 로 끝나지 않는다**(`Manual Review for Financial Impact` 가 마지막). **관례에 맞추려 없는 `evidence` 를 추가하지 않았다.**

> 원문 말미 명령: *"과거 조직 Version과 Snapshot을 덮어쓰지 마라."* → **현행에 과거 Version 자체가 없으므로 이 명령은 신규 모델에 대한 설계 제약으로만 성립.**

## 2. 규칙

- ★**§46 판정 = `CONTRACT_ONLY`.** 10개 강제항 중 **`VALIDATED_LEGACY` 0** · **`Reconciliation` 은 집행 수단 부재로 순수 신규**. 🔴 **"감사로그가 있으니 소급 추적된다"로 밀면 역산** — 감사로그는 *"누가 언제 바꿨나"* 이지 *"과거 시점의 조직이 무엇이었나"* 가 아니다(규율 9).
- 🔴 **★"과거 Version 을 덮어쓰지 마라"를 구현하려면 먼저 Version 이 있어야 한다.** 현행 엔티티 version = **`menu_defaults.version` 단 1건이고, 그마저 유일 생산자(`AdminMenu.php:308`)가 리터럴 `'baseline'` 을 넣는다** = **버전 계열이 아니라 라벨**. → **Version 축은 순수 신규**이며 §46 은 §44(Effective Period)·§48(Snapshot) 없이는 **착수 불가**. **선행 의존을 명시하라.**
- ★**Original Version Preservation 은 `menu_defaults` 패턴 확장**이되 **4개 결함을 반드시 교정**하라: ⓐ **`tenant_id` 추가**(현행 전역 1행 = 테넌트 격리 위반 · 헌법 절대) ⓑ **최신 1건 조회(`:584`) → as-of 조회로 대체** ⓒ **`immutable_hash` 추가**(선례 = `schema_migrations.checksum` `Migrate.php:50` `hash('sha256',$sql)` · `:63-64` INSERT) ⓓ **`version` 에 리터럴 상수 금지** — 단조 증가 또는 불변 식별자.
- ★**Reconciliation 집행기는 신규 워커로 설계하라.** 🔴 **`ensureTables` 에 백필 로직을 넣지 마라** — `ensureTables` 는 **모든 요청 경로에서 호출되는 멱등 스키마 보장기**다. 여기에 데이터 변환을 넣으면 **매 요청마다 재계산이 돌거나(성능 붕괴), 조건 분기가 자가치유 멱등성을 깬다.** **관심사를 분리하라.**
- 🔴 **소급 재계산에서 N+1 금지** — 285차 트랩(*"루프 내 외부API N+1 = 즉시장애"*)의 DB판이 `GraphScore::scoreInfluencer:207-219`(hop3∈hop2∈hop1)에 실재한다. 소급은 **본질상 대량 과거 행 대상**이므로 **행별 순회 = 장애**. **집합 연산 또는 배치로 설계하라.**
- ★**감사 기록은 `menu_audit_log`/`pm_audit_log` 패턴 확장**(ⓑ §8). 🔴 **"해시체인 선례 없음"을 전역 명제로 인용하면 오염이다** — 참인 것은 **전역 `audit_log`(`Db.php:540-545`)에 한해서**다. `menu_audit_log.hash_chain`(`AdminMenu.php:128`)은 **SHA-256 prev-chain 실구현**(`:182-197`)이다.
- ⚠️ **`Pnl.php:454` 무조건 소급은 관찰 사실 · 등급 미부여.** 착수 전 라이브 확인: `SELECT tenant_id, channel_key, COUNT(*) FROM kr_fee_rule GROUP BY 1,2 HAVING COUNT(*)>1`. **결과 확인 후에만 등급을 매겨라.**
- **스키마 도입 = `ensureTables` 경로 + MySQL/SQLite 양 방언 동시 작성**(ⓑ §20 제약 1·3).
