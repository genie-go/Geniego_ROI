# REPEAT PROBLEM HISTORY — 반복 문제·재발 방지 이력

> 목적: **동일 실수의 2회 이상 재발을 영구 차단**. 각 항목은 ①증상 ②실측 원인 ③재발 방지 규칙 ④검증 방법을 반드시 포함한다.
> 관련 정본: [`docs/CHANGE_GATE.md`](../CHANGE_GATE.md)(5중 게이트·§5 Repeat-Modification Escalation) · [`PM_CHANGE_HISTORY.md`](PM_CHANGE_HISTORY.md) · 메모리 `reference_audit_false_positives`.
> 등재 기준: **1차=기록 / 2차=PM 승인 필요 / 3차=RCA 의무 / 4차+=근본원인 제거 전 착수 금지**(CHANGE_GATE §5).

---

## RP-001 — 후속 파트 착수 전 정본 로드맵 미확인 (문서 거버넌스)

- **차수**: 289차 (2026-07-17) · **발생 1회** · 심각도: MED(문서 정합·코드 영향 0)
- **증상**: EPIC 06-A Rebate 정본 9분할의 Part 1-5 이후 파트명을 **임의 추정**해 5개 파트(Rule/Tier·Eligibility·Accrual/Ledger·Claim/Settlement/Payout·Recovery/Dispute)를 `Part 3-3-3-3-3-3-3-3-4-5-3-1-5~9`로 명명·커밋했고, PM 이력에 **"Rebate 9분할 완결"로 오보고**했다. 실제 사용자 정본 로드맵의 1-5는 **Permission·Approval·Operational Governance**였다.
- **실측 원인**: **착수 전 선행 파트 문서에 이미 기록된 로드맵을 확인하지 않음**. 정본 로드맵은 전 세션 산출물 [`docs/segmentation/CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7`](../segmentation/CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md)에 명시돼 있었다 — **"후속 4-5-3-1-2~9 Type/Funding/Lifecycle/Permission/Coverage/Lint/Golden/Legacy"**(동 파일 :34 `후속 블록(4-5-3-1-2~9)`도 동일). 즉 **자료는 있었고 읽지 않았다**(추정으로 대체).
- **영향**: 코드변경 0(설계 문서 전용)·실측 근거/내용 자체는 유효. 라벨·이력 정합만 손상 → 289차에 **선행설계 R1~R5로 재표기 + PM 이력 오보고 정정**으로 해소. 정본 진척 정정: **1-1~1-4 완료(4/9)**.
- **재발 방지 규칙(영구)**:
  1. **다분할(N분할) EPIC의 후속 파트 착수 전, 해당 EPIC의 Part 1 문서 `§범위`·`§1 후속 블록`을 필독**하고 로드맵을 인용해 착수 보고에 명시한다.
  2. **파트 번호·파트명을 추정으로 부여 금지.** 사용자 스펙이 없으면 번호를 붙이지 말고 중립 라벨(예: `선행설계 R{n}`)로 산출한 뒤, 정본 스펙 수령 시 편입한다.
  3. **"완결/완료" 보고는 정본 슬롯 대비로만 한다.** 자체 생성 산출물 수를 정본 진척으로 환산 금지(임의 숫자 금지 원칙 정합).
- **검증 방법**: 후속 파트 착수 시 `grep -n "후속\|범위" docs/segmentation/CANONICAL_DSAR_<EPIC>_*_REGISTRY.md | head` 로 로드맵 실측 → 착수 보고에 인용. 완료 보고 전 `grep -rn "완결\|N/N" docs/pm/PM_CHANGE_HISTORY.md` 로 과대 주장 자가검사.
- **상태**: 정정 완료(289차) · **2차 재발 시 PM 승인 필요**(CHANGE_GATE §5).
