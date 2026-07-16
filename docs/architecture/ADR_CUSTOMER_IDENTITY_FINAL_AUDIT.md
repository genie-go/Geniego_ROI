# ADR — Customer Identity Final Audit & Certification Baseline (EPIC 05-D Part 1)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (최종 감사·Certification Baseline. 비파괴 — 코드변경 0). Canonical Production Certification은 실 구현+Golden+Shadow+Critical 해소 후.
- **근거**: [`../customer-profile/CUSTOMER_IDENTITY_FINAL_AUDIT_REPORT.md`](../customer-profile/CUSTOMER_IDENTITY_FINAL_AUDIT_REPORT.md) + 05-A/B/C + 실코드.

## 결정 (핵심)
1. **부분 실동작·라이브 정직**: crm_customers·Union-Find·확률병합·Unmerge·발송게이트=VALIDATED_LEGACY(운영 중). **Canonical 업그레이드(360 Query Layer/Consumer Enforcement/consent identity 차원/Normalizer/Wrong-target/PII Masking)=BLOCKED_PENDING_IMPLEMENTATION**. Identity Accuracy=라벨 Dataset 부재로 측정 불가. Golden/Shadow=Canonical 층 미구현이라 실행 불가.
2. **양호 확인**: Cross-Tenant Merge/Link 차단(CRM:851)·app_user 분리·**자동 Merge=phone/kakao 정확일치만(Precision 우선)·확률은 승인 전용**·Unmerge 지원·Mock 격리.
3. **★확정 결함(carry-forward)**: ①consent identity 차원 미구현→병합 시 동의확대(CRITICAL)②합성 buyer_email 오병합(HIGH)③Merge evidence/version·Dry Run 미구현(HIGH)④PII Masking 미구현(HIGH)⑤정규화 3종 불일치(HIGH)⑥DSAR 병합형제 누락·AI Memory 연계 미편입(MEDIUM)⑦crosswalk 부재(MEDIUM).
4. **Production Blocker 10**: 위 결함 + Query Layer/Consumer Enforcement/Wrong-target/Identity Accuracy Dataset 미구현.
5. **무후퇴**: 라이브 crm_customers/CRM legacy 계속 운영·즉시삭제 금지. 전체 일괄 Merge·Precision 미검증 자동 Merge 확대 금지.

## 재발 이력 편입
288차 확정 고객 결함=consent 동의확대·합성 buyer_email 오병합·PII 무마스킹·정규화 3종 불일치·DSAR 병합형제 누락 → docs/registry/RepeatedDefectHistory 편입(05-A ADR 등재분과 통합).

## 무후퇴·영구 규칙(§81)
Customer Identity 최종 감사(Identity Accuracy/Scope/Consent/Unmerge/Wrong-target/Golden/회귀) 없이 Identifier Type 활성·Match Rule/Model/Threshold 변경·Auto Merge 활성·Merge/Unmerge Workflow·Golden Record/Consent/Suppression 정책·Query 경로·Segment/Audience/AI/Automation 대상 확대·Store 제거·Production Certification 금지.

## 결과
Customer Identity Final Audit·Baseline 확정(VALIDATED_LEGACY 부분·Blocker 10·Canonical Production 0·Unexplained 0). 다음 **EPIC 05-D Part 2 — Production Readiness·Canary·Rollback·DR** 입력 준비 완료(단 실 구현 선결). 코드변경 0.
