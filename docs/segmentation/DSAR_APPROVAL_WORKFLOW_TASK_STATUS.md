# DSAR — Workflow Task Status (§36 Status 축)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §36 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 🔴 0. 원문 실측 — **원문에 Status 항목 축 없음**

**§36(원문 1584-1616줄)은 `status` 를 필수 필드 목록의 25번째 항목으로 나열할 뿐, Status 값 목록(enum)을 정의하지 않는다.** 원문 §36 은 `필수 필드:` 블록 하나로 끝나고 곧바로 `---` 구분선 뒤 §37 로 넘어간다. 대조 대상인 형제 §들과 비교하면 이 부재는 의도적이다:

| § | 필드 목록 | 값 목록(enum) |
|---|---|---|
| §36 Workflow Task | 27종 | **없음** ← 본 문서 대상 |
| §37 Task Assignment | 21종 | `Assignment Type:` **14종 명시** |
| §41 Task Result | 13종 | `Result Type:` **14종 명시** |
| §43 Wait State | — | `Wait Type:` 명시 |

즉 원문은 값 목록이 필요한 축에는 **`<축이름> Type:` 헤더로 명시**하는 일관된 형식을 쓰며, §36 에는 그 헤더가 없다.

**따라서 전사할 항목이 없다. 표는 비운다.**

## 1. 원문 전사 + 판정 — **원문 0종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| — | *(원문에 항목 축 없음)* | — | — |

**실측 개수: 0 / 0 전사.** 커버리지 = **산정 불가**(분모 0).

## 2. 규칙

- 🔴 **Task Status 값 목록을 여기서 지어내지 마라.** 원문이 정의하지 않은 것을 `PENDING`/`ASSIGNED`/`CLAIMED`/`IN_PROGRESS`/`COMPLETED` 같은 "자명해 보이는" 값으로 채우면, 그 순간 **분모를 산출물이 만들고 분자도 산출물이 채우는 동어반복**이 된다(289차 5-3-1 `REQUIREMENT_SOURCE` 에 원문에 없는 `SYSTEM_DEFAULT` 를 지어내 현행 하드코딩을 담았고, 그 결과 갭이 정의상 소멸했다 = 역산). **개수 20/20 이 맞아도 축 자체가 날조면 전부 무효**라는 것이 5-3-1 `REQUIREMENT_TYPE` 의 교훈이다.
- **Status 값의 정본은 원문 다른 §에서 온다.** §36 `status` 필드가 취할 값은 이 문서가 아니라 인접 §들이 규정한다:
  - **§42 Task Completion** — 완료 전 검증 11항 중 `Task가 Active 상태인가`·`이미 완료된 Task가 아닌가` → **Active / 완료** 두 상태의 존재가 원문에 실재한다.
  - **§39 Task Release·Reassignment** — `Release 이후 Task 상태와 Assignment Candidate를 재평가한다` · `완료된 Task는 일반 Release 대상으로 사용하지 않는다` → **Release 후 재평가 상태**·**완료 상태의 Release 면제**가 원문에 실재한다.
  - **§41 Result Type 14종** — Task 의 status 가 아니라 **Result 의 type** 이다. **이 둘을 혼동해 §41 값을 §36 status 로 복사하는 것이 가장 유혹적인 날조 경로다.** Result 는 Attempt 의 산출이고 Task status 는 Task 의 생명주기다 — 축이 다르다.
  - **§36 필드 목록의 타임스탬프 5종**(`created_at`·`assigned_at`·`claimed_at`·`started_at`·`completed_at`)이 생명주기 단계를 **암시**하나, **암시는 정의가 아니다.** 이를 근거로 status 값을 역산하는 것도 금지한다.
- **후속 § 전사에서 Status 값 목록이 발견되면 그때 이 문서를 갱신하라.** 현 시점(§36~§42 범위) 기준으로 원문에 값 목록은 존재하지 않는다.
- **현행 대조도 수행하지 않는다.** 대조할 원문 요구가 없으므로 현행 코드를 조회해 표를 채우면 그것이 곧 **현행에서 요구를 역산하는 것**이다. (참고: 레포 전역 `UPDATE ... SET status=` 155건/44파일 · **전이 규칙 선언 0** — 이 사실은 §36 본문의 `status` 필드 판정에 이미 기록했다.)
