# DSAR — Function Regression Gate (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 근거: §GROUND_TRUTH(ⓑ 전수조사) + §CONTRACTS §70 FUNCTION_REGRESSION_GATE. file:line 인용은 허용목록만.
> 원칙(CONSTITUTION): **무후퇴 — Replace가 아니라 Extend.** 통합/신설이 기존 동작을 후퇴시키면 완료 아님.

## 1. 원문 전사 (Canonical Contract §70)

무회귀(No-Regression) 보장 대상 — 다음 기존 기능이 Decision Core 도입/통합 후에도 **동일하게 동작**해야 한다:
- 기존 Approval Workflow / Chain
- Authority / Delegation
- Assignment / Sequential
- Rebate / Claim / Settlement
- Payment-Payout
- ERP / Notification
- Audit

## 2. 기존 구현 대조 — 실존 무후퇴 자산 (회귀 감시 대상)

정본 Approval Workflow/Chain/Authority/Delegation/Sequential은 **부재**(§3.1~§3.5 ABSENT)이므로 §70의 그 항목들은 "보호할 기존 구현이 없음". **실제 회귀 감시 대상 = 현행 동작하는 승인 인접 기능**:

| # | 무후퇴 자산 | file:line | 보존해야 할 동작 |
|---|---|---|---|
| 1 | `Mapping::approve` **정족수 maker-checker** | `Handlers/Mapping.php:238-293` | 정족수(:287)·자기승인차단(:268)·dedup(:278)·actorId fail-closed(:36-53·:247 403). ★통합 후에도 정족수 규칙·자기승인 차단·중복 방지 **동일 결과** |
| 2 | `AdminGrowth::approvalDecide` | `Handlers/AdminGrowth.php:1313-1344` | 이미처리 409(:1327)·pending 중복방지(:1292)·enum 화이트리스트(:1321)·audit(:1342) |
| 3 | `Catalog::approveQueue` | `Handlers/Catalog.php:2383-2407` | bulk 승인→processWritebackQueue(:2404) writeback 파이프라인 연결·CAS-lite WHERE status(:2397) |
| 4 | `Alerting::decideAction`/`executeAction` | `Handlers/Alerting.php:572-599`/`:601-665` | decide→execute(AdAdapters::pause :631)→UPDATE(:653)·dry_run_diff 프리뷰(:564)·audit(:597,655). ★단 actor 위조(:33-35)는 **치유 대상**(무후퇴 예외 — 결함 보존 아님) |
| 5 | **Paddle 웹훅 멱등** | `Paddle.php:343-368` | UNIQUE(notification_id) 멱등·paddle_events 중복 흡수 |
| 6 | **omni_outbox** claim/lease/lock | `Omnichannel.php:390-448` | claim_id(:392)·15분 리스·SKIP LOCKED 발송 신뢰성 |
| 7 | **SecurityAudit::verify** | `SecurityAudit.php:56-68` | 해시체인 검증가능성(created_at preimage 보존)·감사 무결 정본 |

★부수 무후퇴: Tenant Guard(index.php auth_tenant·49핸들러 WHERE tenant_id) 격리·`app_user` 신원(`UserAuth.php:155-157,296`)·parent_user_id owner 상속(286차 치유 `UserAuth.php:403-406`).

## 3. 판정

- **Verdict**: 무후퇴 게이트 = **정의됨(설계)**. 보호 대상 7자산(+substrate) 모두 현행 실동작 → 통합/신설 시 회귀 금지.
- **선행 의존**: §70 원문의 Authority/Delegation/Sequential/Chain 항목은 **보호할 구현 부재**(ABSENT) → 그 축은 "회귀 방지"가 아니라 "신설". 실 게이트 대상 = §2 표 7자산.
- **cover**: 회귀 감시 자산 7건 실존. 정본 Approval Workflow/Chain cover = 0(신설 영역).
- ★예외 명시: `Alerting::actor` 위조(:33-35)는 무후퇴 대상 **아님** — 결함이므로 치유가 개선(무후퇴 원칙은 정상 동작 보존이지 결함 동결 아님).

## 4. 확장/구현 방향 (설계) — 무후퇴 게이트 규약

- **G1 Mapping 정족수 무회귀**: 통합 후 동일 입력에 대해 정족수 충족/미충족·자기승인 차단·dedup 결과가 **비트 단위 동일**. actorId fail-closed(미확인→403) 유지. 회귀 테스트 = 정족수 경계 케이스.
- **G2 AdminGrowth 무회귀**: 이미처리 409·pending 중복방지·enum 화이트리스트·audit 로깅 보존. enum 검증은 정본으로 **승격**(축소 아님).
- **G3 Catalog approveQueue 무회귀**: bulk 승인→writeback 큐 연결 유지. 통합으로 승인자 기록 **추가**(현행 미기록보다 강화·후퇴 아님).
- **G4 Alerting 무회귀 + 보안 개선**: decide→execute 흐름·dry_run_diff·audit 보존. **단** actor 위조는 canonical actor로 치유(개선). 집행(AdAdapters::pause) 부작용 동일.
- **G5 Paddle 멱등 무회귀**: 웹훅 UNIQUE 멱등 그대로 유지. Decision Idempotency로 일반화하되 웹훅 경로 동작 불변.
- **G6 omni_outbox 무회귀**: 발송 claim/lease/SKIP LOCKED 그대로. Decision Outbox는 별도(KEEP_SEPARATE)로 신설·발송 경로 미간섭.
- **G7 SecurityAudit::verify 무회귀**: 해시체인 검증 정본 보존. Decision Audit은 이 위에 확장(대체 아님).
- **게이트 통과 조건**: 위 G1~G7 + Tenant 격리 + 배포 전후 E2E 회귀(`npm run e2e`·`e2e:render`) 0 회귀. 미통과 시 통합 미완료.
- **실 통합 = 선행 6군 신설 후 별도 승인세션**(Golden Rule + verify + 배포승인). 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_DUPLICATE_IMPLEMENTATION_AUDIT]] · [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
