# 288차 세션 종결 인계서 (Enterprise Engineering Handbook EPIC 00~05 거버넌스 완결)

> **성격**: 288차는 **전면 정밀감사 확정 수정(운영·데모 배포 완료)** 이후, Enterprise Engineering Handbook EPIC 01~05를 **비파괴 문서·거버넌스**로 수행. **문서 이후 산출물 코드변경 0**(배포 payload 없음). 커밋/푸시는 사용자 승인 후.

---

## 0. 이번 세션 배포 상태
- **초반 6도메인 전수감사 확정 19건 수정 + 데이터 헌법 5권 + TikTok Shop OAuth**: ★**운영(genieroi.com)+데모(demo.genieroi.com) 배포완료·검증**(health200·fatal0·데모격리). [[project_n288_full_audit]] 참조.
- **EPIC 01~05 산출물**: **전부 `docs/` 문서·ADR·PM·메모리** — **코드/프론트/백엔드 변경 0**. → **dist swap 배포 대상 아님**(docs/는 프론트 빌드·백엔드 배포에 미포함). 커밋/푸시만 유효.

## 1. EPIC 01~05 완결 요약 (전부 비파괴·코드변경 0)
| EPIC | 산출물 위치 | 결론 |
|---|---|---|
| 00 Ch1 | docs/metadata/EPIC00_CH1_DISCOVERY.md | Metadata Registry 이미 존재(docs/registry 19개)·발견만 |
| 01-A~D | docs/entities/·docs/architecture/ADR_ENTITY_* | Entity Foundation APPROVED(조건부). ★OrderItem 부재(다품목 CRITICAL)·재고 이중차감·ROAS/LTV 이원 |
| 02-A~D | docs/knowledge-graph/·docs/kg/·ADR_KNOWLEDGE_GRAPH_* | KG=graph_node/edge 확장(중복엔진 금지)·자동 인제스천 갭. Production 설계만 |
| 03-A~D | docs/semantic/·docs/semantic-layer/·ADR_SEMANTIC_* | Metric Contract 23. ★ROAS 3+ 산식·채널 정규화 방향 상충. Governance SIGNED_OFF·Production BLOCKED_PENDING_IMPLEMENTATION |
| 04-A~D | docs/ai-memory/·ADR_AI_MEMORY_* | AI Memory Engine 미구현(챗봇 stateless·벡터 부재). Governance SIGNED_OFF·Production BLOCKED |
| 05-A~D | docs/customer-profile/·ADR_CUSTOMER_* | crm_customers CDP 라이브(일부 L2-3). Governance SIGNED_OFF·Canonical Production BLOCKED |

각 EPIC 정본 마스터 1개+ADR로 §통합(파편 문서 신설 금지 준수). 상세=docs/pm/PM_CHANGE_HISTORY.md 288차 항목.

## 2. ★다음 차수 우선순위 (구현 EPIC — 실코드 백로그 우선)
문서 EPIC은 완결. **실 가치는 아래 확정 결함 구현**(라이브검증/자격증명 필요). RepeatedDefectHistory 편입분:

### P0 (실 데이터 오염·정확도·개인정보 — 최우선)
1. **ROAS 프론트 avg-of-ratios 버그**(GlobalDataContext:1796) → ratio-of-sums 정정 + 공용헬퍼(회귀 baseline 후). [03-B/D]
2. **채널 정규화 방향 상충**(ChannelSync:5119 meta→meta_ads vs Connectors:888 meta_ads→meta) → 단일 canonical 방향 SSOT+어댑터. [03-A]
3. **병합 시 동의 확대**(발송게이트 customer_id 단위 vs merge identity_id) → consent를 person_id(identity) 차원 승격. [05]
4. **PII 무마스킹**(getCustomer CRM:212·ClaudeAI:703 raw email 프롬프트) → column-level PII RBAC/Masking. [05]
5. **DSAR 삭제경로 누락**: ai_analyses/ai_generate_log/business_profile/rule_engine(AI Memory) + 병합형제(email/phone 매칭·identity_id 미기반) → Dsar.php erase 편입·identity_id 기반. [04/05]

### P1 (정합·안전장치)
6. **합성 buyer_email 오병합**(ChannelSync:4676 name@channel.noemail 동명이인) → 약한 Signal 취급·자동 Merge 금지·Manual Review. [05]
7. **라이브 phone/kakao 자동병합 Kill Switch 부재**(resolveIdentitiesForTenant 즉시실행) → Kill Switch·Daily Limit·Sampling·Dry Run 소급. [05]
8. **식별자 정규화 3종 불일치**(pixel/attribution/review 해시 상이) → 단일 Normalizer(email lower·phone E.164·Hash Version). [05]
9. **Merge evidence(reasons)/version 미저장**(crm_identity_merge_link score/actor만). [05]
10. **채널 웹훅 HMAC 부재**(ChannelSync:5612 토큰만) → 신뢰경로 HMAC. [02-C]

### P2 (제품결정·라이브검증 선결 — 블라인드 구현 금지)
11. **OrderItem 신설**(다품목 COGS/귀속 유실·채널 어댑터 line_items 전체수집 라이브검증 선결). [01-D]
12. EventNorm(normalized_activity_event)·action_request 고아 파이프라인(라이브검증/제품결정). [287차 이월]
13. TikTok Shop OAuth 활성화(관리자 service_id/app_key/app_secret 등록 필요).

### 다음 문서 EPIC (구현과 병행 가능)
- **EPIC 06-A — Enterprise Segmentation, Audience & Cohort Inventory, Eligibility, Consent, Channel Mapping & Data Isolation Baseline**(정식 스펙 수령 시).

## 3. 영구 규칙 배선 대기 (EPIC 03/04/05 §영구규칙)
각 EPIC이 **CLAUDE.md/CONSTITUTION/docs/registry/README 배선 대상**으로 지정한 영구 규칙(신규 Metric/Memory/Customer 작업 전 Registry 조회 의무)은 **문서에 명시·미배선**. 후속 세션에서 CLAUDE.md 헌법 링크 추가 검토.

## 4. 무후퇴·재구현 금지
- 288차 문서는 **정직 인증**(허구 통과 보고 없음·미구현은 BLOCKED_PENDING_IMPLEMENTATION 명시). 재감사 시 확정양호(Cross-Tenant 격리·app_user 분리·Unmerge·Mock 격리 등) 재플래그 금지.
- 라이브 crm_customers/CRM·기존 계산엔진(Rollup/Pnl/AutoCampaign)은 **legacy 계속 운영**·즉시삭제 금지. Canonical은 확장.

[[project_n288_full_audit]] [[feedback_no_regression_value_unification]] [[reference_audit_false_positives]]
