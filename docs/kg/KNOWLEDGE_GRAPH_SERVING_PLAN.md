# Knowledge Graph Query & Intelligence Serving (forward-looking 설계서)

> **시퀀스 정정(288차)**: 핸드북 정식 순서는 02-A(Baseline)→02-B(Node/Edge Schema Design)→인제스천→서빙이다. 본 문서는 초기 예단으로 "02-C"로 선작성됐으나 **서빙 EPIC**용 forward-looking 설계다(비파괴 보존). 정식 정본=[`../knowledge-graph/KNOWLEDGE_GRAPH_ARCHITECTURE_BASELINE.md`](../knowledge-graph/KNOWLEDGE_GRAPH_ARCHITECTURE_BASELINE.md).


> **근거**: 02-A [`KNOWLEDGE_GRAPH_INVENTORY_AND_BASELINE.md`](KNOWLEDGE_GRAPH_INVENTORY_AND_BASELINE.md) · 02-B [`KNOWLEDGE_GRAPH_INGESTION_PLAN.md`](KNOWLEDGE_GRAPH_INGESTION_PLAN.md) + 기존 GraphScore 조회 API·소비처(실코드).
> **비파괴 설계 단계**: 실행 계획·게이트 확정. 코드변경 0. 실 서빙 배선은 **02-B 인제스천 라이브검증 통과 + 빌드 + 배포 승인 후**.
> **상위 헌법**: `../UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`(Explainable AI·근거없는 결론 금지·중복엔진 금지) · `../MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md`(Safety Rule·승인정책). ADR=[`../architecture/ADR_KNOWLEDGE_GRAPH_BASELINE.md`](../architecture/ADR_KNOWLEDGE_GRAPH_BASELINE.md).

---

## 1. 목표
02-B가 적재한 KG(graph_node/graph_edge)를 **질의·추론·서빙** 계층으로 확장. 인제스천(엣지 공급)에 이어 **소비(인사이트·추천·검색·챗봇)**를 완결하되, 모든 서빙은 **근거(노드/엣지/경로)·신뢰도 표기**와 **테넌트 격리·승인정책**을 준수한다.

## 2. Query 계층 (기존 GraphScore 확장 — 병렬 서비스 금지)
현행 조회 API를 **확장**(신규 그래프 질의 엔진 신설 금지):
- 기존: `GET /v419/graph/summary|edges|nodes|score/{type}/{id}` (GraphScore scoreInfluencer/Creative/Sku/Order — 3홉 가중전파 + **paths + confidence 반환**).
- 확장(안): REL 기반 **범용 순회**(node_type=CE 카탈로그·edge_label=REL ID 필터), N-홉 경로질의, 이웃 서브그래프, 역추적 귀속체인. 기존 3홉 스코어러는 보존(무후퇴).
- **격리**: 모든 질의 `WHERE tenant_id=?` fail-closed(02-A 승계). Demo/운영 분리.

## 3. Intelligence Serving 계층 (Vol4 — Explainable)
KG를 인사이트/추천으로 변환. **기존 엔진 확장**(중복 금지):
| 소비처 | 현행 | KG 서빙 확장 |
|---|---|---|
| GraphScore.jsx(/graph-score) | score/summary GET | 범용 서브그래프 시각화·경로 근거 |
| DashOverview 타일(:425)·GlobalSearch(:34) | 요약 소비 | 엔티티 이웃/영향 요약 |
| AutoRecommend(채널배분) | 벤치마크+bandit | KG 신호(creator→sku→order 기여)를 **입력 피처로 추가**(대체 아님) |
| Decisioning/Insights | 규칙/통계 | KG 경로 근거를 추천 evidence로 첨부 |
| ClaudeAI 코파일럿/챗봇(:224) | keyword 규칙 | **GraphRAG**(KG 경로 + 문서검색 결합) — §5 |

**Explainable AI 필수**: 모든 서빙 결과에 근거(기여 노드/엣지/경로)·confidence·데이터 신뢰도(Vol3 Readiness) 병기. **근거 없는 결론 금지**. 낮은 신뢰도는 추천 대신 경고.

## 4. Safety / 승인정책 (Vol5)
- KG 기반 자동집행(예: 예산이동·광고중지) = **검증데이터(READY)+승인정책+로그+롤백** 준수. 신뢰도/통계신뢰 부족 시 자동집행 금지→경고(기존 AutoCampaign adj_roas 안전장치 승계).
- 서빙은 **advisory 우선**. 자동 결정은 사용자 승인정책 범위 내에서만.

## 5. GraphRAG (챗봇 keyword→근거기반 업그레이드)
- 현행 챗봇=keyword 토큰 스코어링(ClaudeAI:224)+GeniegoKnowledge heredoc. **부정확·근거 약함**.
- 설계: 사용자 질의 → (a) KG 순회로 관련 엔티티/경로 추출 + (b) 지식문서 검색 → Claude 프롬프트에 **근거 컨텍스트** 주입 → 답변에 출처 표기. 벡터/임베딩은 02-A에서 부재 확인 → **신규 도입(중복 아님)**, 단 그래프 근거를 1차·벡터를 보강으로.
- Explainable: 답변마다 참조 노드/문서 인용.

## 6. 노드/엣지 소비 범위(1차 — VERIFIED만)
- Order/Customer/SKU/Creator/Campaign 노드 + REL-ORD-000001·CUS-000001·MKT-000006·CRT 엣지(02-B 적재분). BLOCKED(OrderItem/normalized/action_request)은 서빙 제외.

## 7. 회귀 테스트 매트릭스
- Query: 타테넌트 노드/경로 반환 0·READY 미달 엣지 서빙 제외·기존 score/summary/nodes/edges API 응답 필드 무변경(무후퇴).
- Serving: 모든 추천/인사이트에 근거·confidence 존재(근거 누락 시 실패)·낮은 신뢰도 경고 처리.
- GraphRAG: 답변 출처 인용 존재·환각(근거 없는 주장) 차단·기존 챗봇 폴백 보존.
- Safety: 자동집행 승인정책 게이트·롤백 로그.

## 8. ★착수 선결 게이트
1. **02-B 인제스천 라이브검증 통과**(graph_edge에 실 운영 데이터 적재 확인) — 서빙은 빈 그래프 위에서 무의미.
2. 벡터 레이어 도입 시 Vol3/Vol4 근거요건·비용·격리 검토.
→ 통과 전 프로덕션 서빙 활성 금지(빈 KG 위 서빙 = 가짜녹색 위험).

## 9. 현재 상태
**설계 확정·코드변경 0·상태 PLANNED.** 의존: 02-B 인제스천 실사용화(자격증명 등록→라이브). 이후 **EPIC 02-D — Vector/Embedding & GraphRAG Deep**(선택) 또는 EPIC 03(상위 Intelligence OS) 연결.

## 10. KG 3부작(02-A/B/C) 요약
- **02-A**: 유일 그래프 저장소=graph_node/graph_edge, 자동 인제스천 갭 확정, 단일저장소 확장 원칙.
- **02-B**: Edge Writer(주문/귀속/CRM 훅)·비파괴 스키마 진화·Trust/격리 게이트·라이브검증 선결.
- **02-C**: Query 범용순회·Explainable Serving·GraphRAG·Safety 승인정책.
- 공통: 기존 확장(중복엔진 금지)·tenant fail-closed·READY만·근거표시·무후퇴·라이브검증 후 실배선(블라인드 금지). **커밋/배포=전체 EPIC 완료 후 일괄(사용자 지시).**
