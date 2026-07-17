# DSAR — Optimistic Concurrency (§55)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §55 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

> 🔴 **이 문서의 핵심은 항목 전사가 아니라 "원문 요구 ↔ 현행 설계 제약의 정면 충돌"을 정직하게 기록하는 것이다.**

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Optimistic Lock (`version` 컬럼) | 🔴 **optimistic lock(`version`)·`lock_version` backend/src grep 0** (289차 실측 재확인) | `NOT_APPLICABLE` |
| ETag | **부재** — HTTP ETag / `If-Match` 조건부 요청 처리 부재 | `NOT_APPLICABLE` |
| Stale Update 차단 | ✅ **능력으로는 존재** — **조건부 UPDATE + rowCount CAS** 가 `WHERE` 술어로 **기대 상태를 검증**해 stale 쓰기를 거부한다: Catalog.php:1683 · ChannelSync.php:6136-6153 · JourneyBuilder.php:411-418(`WHERE id=:id AND tenant_id=:t AND status='waiting' AND resume_at <= :now` → `rowCount() !== 1` 이면 skip) | `VALIDATED_LEGACY`(★능력 대조 결과) |
| 비-pending 409 | `Mapping.php:238-294` — 승인 결정 시 **비-pending 이면 409**(상태 게이트) = **승인 도메인의 stale update 차단** | `VALIDATED_LEGACY`(★승인 도메인 직접 선례) |
| 🔴**설계 제약** | **SQLite 폴백 호환이 명시적 설계 제약**(`Db.php` MySQL 불가 시 SQLite 투명 폴백 · `Omnichannel::claimConditional`:427-447 2단 폴백이 그 증거) | **제약 — 위반 금지** |

**★축 주의 — 이름 grep 0 ≠ 능력 부재(8회차 오판의 재현 방지).** `version` 컬럼 grep 0 을 **"Stale Version Update 차단 부재"** 로 읽으면 오판이다. 원문의 **최종 요구 문장은 `Stale Version Update를 차단하라`** 이고, 현행은 **조건부 UPDATE 의 `WHERE` 술어**로 **동일 능력을 실제로 달성**한다. 차이는 **차단 여부**가 아니라 **차단의 일반성**이다:

| | 현행 (조건부 UPDATE CAS) | 원문 (Lock Version / ETag) |
|---|---|---|
| stale 쓰기 차단 | ✅ 달성 | ✅ |
| 차단 술어 | **호출 지점마다 인라인 · 개별 설계** | 선언적 · 엔티티 공통 |
| 감지 대상 | **술어에 넣은 컬럼의 변경만** | **행의 모든 변경** |
| 미검증 변경 | 🔴 **술어에 없는 컬럼이 바뀌면 못 잡는다** | 잡는다 |

→ **판정 = 능력은 `VALIDATED_LEGACY`, 원문이 지정한 기전(Lock Version/ETag)은 `NOT_APPLICABLE`.** 능력을 근거로 "충족"이라 적으면 **일반성 격차가 소멸**하고, 부재를 근거로 "전무"라 적으면 **8회차 오판**이다. **둘 다 기록한다.**

## 1. 🔴 원문 요구 ↔ 설계 제약의 충돌 (정직 기록)

**규율 파일 실측 인용**: *"optimistic lock(`version` 컬럼) grep 0 · **SQLite 폴백 호환이 명시적 설계 제약** → **5-3-2 가 다른 동시성 모델(version 컬럼 등) 도입 시 제약 위반이다.**"*

**충돌의 실체:**

| 축 | 내용 |
|---|---|
| **원문 요구(§55)** | *"다음 Entity에 Lock Version 또는 ETag를 적용하라."* — 8종 엔티티 **전부**에 |
| **현행 제약** | `Db.php` 는 MySQL 불가 시 **SQLite 로 투명 폴백**. `Omnichannel::claimConditional`(:427-447)이 이 제약의 살아있는 증거 — `FOR UPDATE SKIP LOCKED` 미지원 드라이버용 폴백, 나아가 **일부 SQLite 빌드가 `UPDATE..IN(subquery+LIMIT)` 조차 거부**해 2단 폴백까지 내려간다 |
| **충돌 지점** | Lock Version 자체는 SQLite 에서 **동작 가능**하다(`WHERE version=:v` + `SET version=version+1` 은 표준 SQL). **진짜 충돌은 SQL 문법이 아니라 ①전 엔티티 스키마 변경 ②`backend/migrations/` 가 172차에서 멈춰 있고 이후 전부 **핸들러 self-healing `ensureTables`** 로 적용된다는 운영 현실 ③이중 백엔드(MySQL+SQLite) 스키마 동시 정합** |
| **판정** | 🔴 **이 단계에서 도입 결정 금지** → `CONTRACT_ONLY` |

**⚠️ 정직 고지 — 이 충돌은 미해결이다.** 규율은 *"도입 권고 시 SQLite 폴백 영향 명시"* 를 요구한다. 명시한다:
- Lock Version 도입 시 **SQLite 폴백 경로에서도 동일 스키마·동일 CAS 술어가 보장돼야 한다**. 한쪽만 적용하면 **폴백 발동 순간 stale 차단이 무음 소실**된다(MySQL 에선 막히고 SQLite 에선 통과 = **환경별 상이한 정합성** = 가장 위험한 형태의 가짜 녹색).
- **ETag 는 별개 문제다** — HTTP 계층 요구이며 SQLite 와 무관하나, **현행 API 에 조건부 요청(`If-Match`) 처리가 전무**하다. ETag 도입은 **전 승인 엔드포인트의 계약 변경**이다.
- **결론: 도입 여부는 5-3-2 의 권한 밖**(상위 결정). 5-3-2 는 **요구와 제약을 대조해 기록**하는 데서 멈춘다. **"제약이 있으니 요구가 없는 것으로 한다"는 역산이며, "요구가 있으니 제약을 무시한다"는 제약 위반이다. 둘 다 하지 않는다.**

## 2. 원문 전사 + 판정 — 적용 Entity **원문 8종**

원문: **"다음 Entity에 Lock Version 또는 ETag를 적용하라."**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Workflow Instance | 부재(인스턴스 개념 없음) · 인접 stale 차단 = `journey_enrollments` 조건부 UPDATE(JourneyBuilder.php:411-418) — **`status` 술어만 검증** | `LEGACY_ADAPTER`(능력 부분) |
| 2 | Workflow Token | 부재 — Token 개념 전무 → 버전 붙일 대상 없음 | `NOT_APPLICABLE` |
| 3 | Workflow Task | 부재 — Task 개념 전무 | `NOT_APPLICABLE` |
| 4 | Task Claim | 부재(승인) · 인접 = `Omnichannel::claimBatch`(:394-423) `claim_id` + `status='queued'` 가드 — ★**claim_id 는 버전 아님**(단조 증가 아님) | `LEGACY_ADAPTER`(능력 부분) |
| 5 | Workflow Transition | 부재 — **전이 규칙 선언 0**(`UPDATE ... SET status=` 155건/44파일 전부 인라인) · 전이 가드 4곳뿐 | `NOT_APPLICABLE` |
| 6 | Workflow Variable | 부재 — 워크플로 변수 개념 없음 | `NOT_APPLICABLE` |
| 7 | Migration Execution | 부재 · §56 과 짝 | `NOT_APPLICABLE` |
| 8 | Cancellation | 부재 · §51 과 짝 | `NOT_APPLICABLE` |

**실측 개수: 8 / 8 전사.** 커버리지 = 부재 6 · 어댑터 2.

## 3. 필수 필드

**원문에 항목 축 없음.** §55 는 **`APPROVAL_WORKFLOW_*` 엔티티명도, 필수 필드 목록도 제시하지 않는다** — 이 블록(§49~§55)에서 **유일한 예외**다. 원문은 **Entity 8종 + 요구 문장 2개**로만 구성된다. 필드를 지어내지 않는다. **버전 필드의 스키마 형태(`lock_version` 컬럼명 · ETag 산출식 등)는 원문 미정의 → 임의 결정 금지.**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| — | *(원문에 필수 필드 목록 없음)* | — | — |

## 4. 원문 요구 문장 전사

> **"다음 Entity에 Lock Version 또는 ETag를 적용하라."**
> **"Stale Version Update를 차단하라."**

## 5. 규칙

- 🔴 **`version` 컬럼 도입을 5-3-2 에서 단독 결정 금지.** SQLite 폴백 호환이 **명시적 설계 제약**이다. 도입 시 **양 백엔드 동시 적용**이 아니면 **환경별 상이한 정합성**을 낳는다(폴백 발동 시 stale 차단 무음 소실).
- 🔴 **"Lock Version 또는 ETag" 의 `또는` 을 지우지 마라.** 원문은 **택일**을 허용한다. 둘 다 도입하면 **동시성 모델 2벌**이 되어 설계 결론 5(**실행 인프라 = 신설 금지·통일 필요**)와 충돌한다.
- 🔴 **현행 CAS 를 "Optimistic Concurrency 이미 구현됨"으로 계산 금지 = 역산.** 능력은 인접하나 **일반성이 다르다**: CAS 는 **술어에 넣은 컬럼의 변경만** 감지한다. 승인 도메인에서 이 격차는 실재한다 — 예: `status='pending'` 술어만 검증하면 **pending 인 채로 정족수/승인자 목록이 바뀐 것은 통과**한다.
- ✅ **승인 도메인의 stale 차단 참조 구현 = `Mapping.php:238-294` 의 비-pending 409.** 5단 규율(위조불가 신원 fail-closed → 자기승인 차단 → 승인자 dedup → **비-pending 409** → 정족수)의 일부이며, **재작성이 아니라 공용 트레이트/서비스로 위치 이동**하라(설계 결론 3). 🔴 **재작성 시 289차 G-01 이 닫은 우회로(익명 2회 = 정족수)를 다시 연다.**
- 🔴 **`Task Claim` 에 `claim_id` 를 버전으로 재사용 금지.** 단조 증가가 아니므로 **stale 판정 불가**(§54 fencing token 항과 동일 함정).
- 🔴 **버전 없는 엔티티에 "버전 있다고 가정"하고 배선 금지.** 8종 중 6종은 **엔티티 자체가 부재**다 — 버전을 붙일 대상이 없다. §55 는 **해당 엔티티가 신설된 뒤에야 적용 가능** → 현 단계 판정 = `CONTRACT_ONLY`.
- ⚠️ **`Workflow Transition` 은 버전 이전에 선언이 없다**(전이 규칙 선언 0 · 155건 전부 인라인). 전이를 **선언적 정의로 승격하지 않으면** 버전을 붙일 지점 자체가 없다.
