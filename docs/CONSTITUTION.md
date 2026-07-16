# GeniegoROI Project Constitution (프로젝트 헌법)

> **자매 헌법**: 데이터 영역은 [`DATA_INTELLIGENCE_CONSTITUTION.md`](DATA_INTELLIGENCE_CONSTITUTION.md)(최상위 데이터 헌법)가 동등한 최상위 지위로 규율한다 — 데이터 수집·검증·통합·AI·자동화는 그 문서를 우선한다.
>
> **Volume 1 — 원칙(Principles).** 이 문서는 GeniegoROI의 최상위 개발 원칙만 명문화한다.
> **실행 메커니즘(게이트·레지스트리)은 여기서 재서술하지 않는다.** 아래 §11 SSOT 링크를 정본으로 따른다.
> 이 문서 자체가 헌법 제2조(동일 기능을 다른 이름으로 재구현 금지)를 준수하기 위한 것이다.

---

## 1. Mission — 프로젝트 사명

GeniegoROI는 단순한 마케팅 분석 도구가 아니다. 다음으로 발전하는 것을 목표로 한다.

- Enterprise Marketing Intelligence Platform
- Enterprise Growth OS
- Enterprise Marketing Automation Platform
- Enterprise Attribution Platform
- Enterprise AI Decision Platform
- Enterprise Revenue Intelligence Platform

모든 개발은 **"세계 최고 수준의 Enterprise SaaS"**를 기준으로 수행한다. "작동만 하면 된다" 식의 개발은 하지 않는다. 모든 구현은 운영·확장성·유지보수성·보안·성능·정확성·자동화·품질까지 고려한다.

---

## 2. Golden Rule — 최상위 원칙

GeniegoROI는 새로운 프로젝트가 아니라, 이미 지속적으로 성장하고 있는 Enterprise SaaS이다.

따라서 **모든 변경은 Replace가 아니라 Extend이다.** 새로 만드는 것이 아니라 기존 구현을 확장한다.

---

## 3. 절대 금지 (Absolute Prohibitions)

다음은 어떠한 경우에도 허용하지 않는다.

**재구현 금지 — 이미 구현된 것을 다시 만들지 않는다.**
1. 이미 구현된 기능을 다시 구현하지 않는다.
2. 동일 기능을 다른 이름으로 다시 구현하지 않는다.
3~14. 동일한 API · Component · Service · Hook · Store · Context · Utility · Scheduler · Queue · Automation · Analytics Engine · DB 구조를 다시 만들지 않는다.

**후퇴 금지 — 기존 기능을 훼손하지 않는다.**
15~20. 기존 기능을 삭제·축소·단순화·후퇴·우회 구현·중복 구현하지 않는다.

> 위반 여부의 판정과 실행 차단은 **[CHANGE_GATE](CHANGE_GATE.md)의 Duplicate Prevention Gate**가 담당한다.

---

## 4. Enterprise Development Philosophy — 개발 순서

```
Search → Understand → Reuse → Extend → Integrate → Validate → Test → Audit → Document → Deploy
```

절대로 `Search → Create → Commit` 형태로 개발하지 않는다.

---

## 5. Existing Code First — 기존 코드 우선

새로운 코드보다 기존 코드가, 새로운 구현보다 기존 구현의 확장이, 새로운 API/Service/Component보다 기존 것의 개선이 항상 우선한다.

---

## 6. One Source of Truth — 단일 구현 원칙

동일 기능은 반드시 하나의 구현만 존재한다. `UserService` / `UserManager` / `UserCore` / `UserEngine`가 같은 기능이라면 하나로 통합한다.

---

## 7. Duplicate Consolidation — 중복 통합 절차

중복 구현이 발견되면 **즉시 삭제하지 않는다.** 다음 절차 후에만 제거한다.

① 모든 중복 검색 → ② 기능 비교 → ③ 사용 위치 분석 → ④ 영향 분석 → ⑤ 최고 완성도 구현 선정 → ⑥ 부족 기능 병합 → ⑦ 단일 구현으로 통합 → ⑧ 모든 호출부 변경 → ⑨ Regression Test → ⑩ 중복 제거 → ⑪ Registry 갱신 → ⑫ Change History 기록

> 실행 절차·기록 의무는 **[CHANGE_GATE](CHANGE_GATE.md)** 및 **[registry/DuplicatePreventionLog](registry/DuplicatePreventionLog.md)**를 따른다.

---

## 8. No Regression — 기능 후퇴 금지

기능 후퇴는 버그보다 심각한 결함이다. 기능·UI·버튼·API·DB·Service·분석·Automation·채널·로그·권한·테스트의 삭제를 허용하지 않는다.

> 수정 후 회귀 검증은 **[CHANGE_GATE](CHANGE_GATE.md)의 Regression Prevention Gate** + **[registry/RegressionHistory](registry/RegressionHistory.md)**로 기록·검증한다.

---

## 9. Enterprise Quality Standard — 품질 기준

모든 구현은 다음을 **Enterprise Grade**로 만족해야 한다.

Functional(100%) · Performance · Security · Scalability · Maintainability · Testability · Auditability · Observability · Reliability · Documentation.

---

## 10. Evidence-Based Completion — 완료의 정의

"완료"는 다음이 **모두** 충족될 때만 성립한다. 하나라도 누락되면 완료가 아니다.

코드 존재 · UI 연결 · API 연결 · DB 연결 · 권한 검증 · 로그 기록 · 예외 처리 · 테스트 통과 · 문서 업데이트 · PM 변경 이력 기록.

> 핸들러 미배선(빈 스텁)은 완료가 아니다. 실배선·라이브 검증까지 확인한다.

---

## 11. Execution Mechanisms (SSOT) — 실행 메커니즘 정본

이 헌법은 **원칙**이다. 원칙을 강제하는 **실행 규칙과 기록은 아래 문서가 단일 소스(SSOT)이며, 본 문서는 이를 재서술하지 않고 참조한다.**

| 목적 | 정본 문서 |
|------|-----------|
| 수정 전/후 필수 게이트 (10단계 + Duplicate/Repeat-Modification/Change-Impact/Regression 5중 게이트) | **[docs/CHANGE_GATE.md](CHANGE_GATE.md)** |
| 기능·도메인 구현 상태 정본 (재플래그·중복구현 방지) | **[docs/IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** |
| 감사 정본 | **[docs/PROJECT_AUDIT_REPORT.md](PROJECT_AUDIT_REPORT.md)** |
| 레지스트리 시스템 19종 (Feature/Architecture/Dependency/Component/API/DB/Analytics/Automation/Channel/Integration + 이력 로그) | **[docs/registry/README.md](registry/README.md)** |
| 레지스트리 표준 규약 (Feature ID 불변·Lifecycle 상태기계·필드 스키마·Registry-Complete 게이트) | **[docs/registry/README.md](registry/README.md)** §표준 규약 |

**핵심 규칙(정본에서 발췌·중복 아님):** 절대로 기억에 의존하지 않는다. 모든 변경은 착수 전 해당 레지스트리로 존재/이력을 확인하고, 완료 후 정본을 갱신한다.

---

## 12. Living Constitution — 살아있는 헌법

이 문서는 일회성 프롬프트가 아니라 GeniegoROI의 최상위 개발 헌법이다. 새로운 기능·AI 에이전트·개발자·PM 모두 이 헌법을 따른다. 원칙 자체의 개정은 §11의 [registry/DecisionLog](registry/DecisionLog.md)에 사유와 함께 기록한다.
