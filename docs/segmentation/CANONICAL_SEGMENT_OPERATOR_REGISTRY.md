# Canonical Segment Operator Registry & Semantics

> **EPIC 06-A Part 2** (3/5) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1 인벤토리(현행 6 operator gte/lte/gt/lt/eq/ne `CRM.php:1563`) · 형제: [`CANONICAL_SEGMENT_DSL.md`](CANONICAL_SEGMENT_DSL.md) · [`CANONICAL_SEGMENT_RULE_ENGINE.md`](CANONICAL_SEGMENT_RULE_ENGINE.md)
> **성격**: Operator 계약 정본. **동일 Operator·Time Window 는 Batch/Streaming/Preview/Count/실 Membership 에서 같은 의미**(§3.3). 실 어댑터별 구현+Conformance Test 는 후속 승인 세션.

---

## 0. 현행→Canonical (무후퇴)

현행 6 operator 는 Canonical 로 **정확 매핑**(회귀 0):

| 현행 | Canonical | Null 기본 | 경계 |
|---|---|---|---|
| gte | GREATER_THAN_OR_EQUAL | EXCLUDE_NULL | inclusive |
| lte | LESS_THAN_OR_EQUAL | EXCLUDE_NULL | inclusive |
| gt | GREATER_THAN | EXCLUDE_NULL | exclusive |
| lt | LESS_THAN | EXCLUDE_NULL | exclusive |
| eq | EQUALS | NULL_IS_FALSE | — |
| ne | NOT_EQUALS | NULL_IS_UNKNOWN(주의) | — |

**★ne 주의**: 현행 SQL `!=` 는 NULL 행을 제외한다(3-value logic) → Canonical 은 `null_policy` 를 명시(NULL_IS_UNKNOWN 기본, 필요시 INCLUDE_NULL). 이 미세의미차이는 Semantic Equivalence Test 의 `EXPECTED_NULL_SEMANTIC_CORRECTION` 로 문서화(Governance §79).

---

## 1. Operator Registry 필드 (§18)

각 operator 등록:
```
operator_id, name, supported_data_types, operand_count,
null_behavior, timezone_behavior, case_sensitivity, normalization_policy,
batch_support, stream_support, preview_support,
sql_adapter, search_adapter, graph_adapter,
cost_class, security_risk, version, status, owner, test_suite
```

**status**: ACTIVE / DEPRECATED / BLOCKED / EXPERIMENTAL. **Deprecated operator 는 신규 정의 사용 금지**(기존 버전 호환만).

---

## 2. Operator Matrix (§88)

| Operator | Data Types | Null 기본 | TZ | Batch | Stream | Preview | Cost | 현행 |
|---|---|---|---|---|---|---|---|---|
| EQUALS/NOT_EQUALS | 대부분 | FALSE/UNKNOWN | — | ✔ | ✔ | ✔ | LOW | ✔(eq/ne) |
| IN/NOT_IN | STRING/INT/ENUM/ID | EXCLUDE | — | ✔ | ✔ | ✔ | LOW | 신규 |
| EXISTS/NOT_EXISTS | any | — | — | ✔ | ✔ | ✔ | LOW | 신규 |
| GT/GTE/LT/LTE | INT/DEC/DATE/DATETIME/CURRENCY/PERCENT | EXCLUDE | — | ✔ | ✔ | ✔ | LOW | ✔ |
| BETWEEN/OUTSIDE_RANGE | 수치/시간 | EXCLUDE | — | ✔ | ✔ | ✔ | LOW | 신규 |
| CONTAINS/NOT_CONTAINS/STARTS_WITH/ENDS_WITH/EXACT_MATCH | STRING | EXCLUDE | — | ✔ | ✔ | ✔ | LOW-MED | 신규 |
| REGEX_MATCH | STRING | EXCLUDE | — | ✔ | △ | ✔ | **MED-HIGH** | 신규(Guard 필수) |
| ANY/ALL/NONE_MATCH·ARRAY_CONTAINS·ARRAY_OVERLAPS·SET_EQUALS·COUNT_OF | ARRAY/SET | 빈배열≠null | — | ✔ | ✔ | ✔ | MED | 신규 |
| BEFORE/AFTER/ON/BETWEEN_TIME/WITHIN_LAST/OLDER_THAN/DAYS_SINCE/HOURS_SINCE | DATE/DATETIME | EXCLUDE | **필수** | ✔ | ✔ | ✔ | LOW-MED | recency 특수사례 |
| OCCURRED/NOT_OCCURRED/OCCURRED_WITHIN/NOT_OCCURRED_WITHIN | EVENT | — | 필수 | ✔ | ✔ | ✔ | MED | frequency 특수사례 |
| OCCURRED_COUNT/AT_LEAST/AT_MOST/FIRST/LAST/SEQUENCE/PROPERTY_MATCH/DISTINCT_PROPERTY_COUNT | EVENT | — | 필수 | ✔ | △ | ✔ | MED-HIGH | 신규 |
| COUNT/DISTINCT_COUNT/SUM/AVG/MIN/MAX/FIRST/LAST/MEDIAN/PERCENTILE | 집계 | — | 필수 | ✔ | △근사 | ✔ | MED-HIGH | SUM/COUNT 존재 |

△=제약/근사 표시 필요. 근사는 운영 Targeting 사용제한(§24).

---

## 3. 비교 Operator 경계 (§19)
- BETWEEN: **inclusive 양단**(명시). OUTSIDE_RANGE=exclusive 여집합.
- GTE/LTE inclusive, GT/LT exclusive. 모든 수치/시간 비교는 **타입 일치 강제**(STRING↔INT 암묵비교 금지).

## 4. 문자열 Operator (§20)
CONTAINS/NOT_CONTAINS/STARTS_WITH/ENDS_WITH/EXACT_MATCH/REGEX_MATCH.
- **case_sensitivity·normalization** operator·field별 명시(이메일 lower·공백 trim — EPIC05 정규화 정합).
- **REGEX Guard(§20 필수)**: 허용문법 subset · 실행시간 제한 · **ReDoS 방지**(catastrophic backtracking 차단) · length 제한 · 엔진 제한(PCRE 특정옵션 금지) · 권한 · Static Validation. REGEX security_risk=HIGH.

## 5. Collection Operator (§21)
ANY/ALL/NONE_MATCH·ARRAY_CONTAINS·ARRAY_OVERLAPS·SET_EQUALS·COUNT_OF. **빈 배열 ≠ Null**(§6 DSL Null semantics) — ALL_MATCH(빈배열)=true(vacuous) vs Null=UNKNOWN 구분.

## 6. 시간 Operator (§22)
모든 상대시간(WITHIN_LAST/OLDER_THAN/DAYS_SINCE...)은 **Evaluation Time + Timezone 명시**. "최근 30일"이 어느 TZ·기준시각인지 결정론적(현행 미명세 SEG-M2 해소). AS_OF 지원(과거시점 평가).

## 7. Event Operator (§23)
OCCURRED/NOT_OCCURRED/COUNT/AT_LEAST/AT_MOST/FIRST/LAST/SEQUENCE/PROPERTY_MATCH/DISTINCT_PROPERTY_COUNT. Event Reference Contract(DSL §4.2)의 event_time·dedup·late_event 정책 준수. **NOT_OCCURRED 는 관측창(window) 필수**(무한 부정 금지).

## 8. Aggregation Operator (§24)
COUNT/DISTINCT_COUNT/SUM/AVG/MIN/MAX/FIRST/LAST/MEDIAN/PERCENTILE.
- **미지원 엔진 무단 근사 금지**. Streaming 에서 DISTINCT_COUNT/PERCENTILE 은 근사(HLL/t-digest)일 수 있음 → **approximate=true 명시** + 운영 Targeting 사용가능 여부 제한(§53).
- 현행 SUM(amount 취소차감)·COUNT(purchase)는 정확계산(배치 SQL) → 정확 표기.

---

## 9. Operator Conformance Test (§77)

**동일 (입력·Definition·Evaluation Time·Timezone·Null Policy) → 동일 결과**를 전 어댑터에서 검증:
SQL · Search · Graph · Streaming · Preview · Batch.

| 검증 | 기준 |
|---|---|
| 동일 결과 | 멤버 집합 일치(허용차이 명시) |
| 허용 차이 | Streaming 근사·late event 창 내 재조정 |
| Explain | 포함/제외 사유 동일 |
| Performance | 어댑터별 cost 기록 |

**게이트**: 어느 어댑터든 conformance 불일치 → 해당 operator 를 그 어댑터에서 BLOCKED(무단 의미분기 금지 §3.3). Golden Dataset(Governance §Golden)로 실행.

---

## 10. Type Contract (§43 연계)
Operator×DataType 매트릭스(§2)가 허용조합 정본. Implicit conversion 금지 — 명시 Conversion Rule 만(예: CURRENCY↔DECIMAL 단위검증, DATE↔DATETIME 절단명시). Unsupported 조합은 Validation 단계 INVALID_OPERATOR/OPERATOR_TYPE_MISMATCH(Rule Engine §Error).

---

## 11. 완료 조건 대응
§93의 6(Operator Registry·Type Semantics)·부분 22(Conformance Test 준비). **코드변경 0** — Registry 데이터·어댑터 구현·Conformance 스위트는 후속 승인 세션. 현행 6 operator 무후퇴 보존을 Semantic Equivalence 로 증명(Governance §78).
