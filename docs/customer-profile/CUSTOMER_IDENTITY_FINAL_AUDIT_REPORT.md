# EPIC 05-D Part 1 — Customer Identity & Unified Profile Final Audit, Security & Regression Certification Baseline (정식 마스터)

> **근거**: 05-A(Inventory)·05-B(Schema)·05-C(Execution 설계) + 실코드. **비파괴**: 감사·인증·Baseline만. 코드변경 0. 전체 Profile 일괄 Merge·Legacy 삭제·Precision 미검증 자동 Merge 확대 없음(§73).
> **§74 통합**: ~65개 파편 대신 본 마스터가 Registry Cross-Check·Store/Service/API 감사·Schema Gap·Source Account/Connector·Identifier/Normalization·Candidate/Match/Model·Identity Link/Graph·Auto Merge/Merge/Unmerge/Split·Golden Record·Consent/Suppression·Event Link·360 Query/Consumer·Wrong-target·Cross-Tenant/Mock/External·Drift·삭제/정정 전파·Identity Accuracy·Security/Privacy/Performance Baseline·Certification Matrix·Blockers를 통합. ADR=[`../architecture/ADR_CUSTOMER_IDENTITY_FINAL_AUDIT.md`](../architecture/ADR_CUSTOMER_IDENTITY_FINAL_AUDIT.md). 재발이력=기존 `../registry/RepeatedDefectHistory.md`.

---

## 0. ★정직 프레이밍 (부분 실동작·라이브)
고객 도메인은 **일부 실동작·운영 라이브**: crm_customers·Union-Find(CRM:600)·확률병합(CRM:848)·Unmerge(CRM:913)·발송게이트(isMarketingSendAllowed CRM:1118)=**VALIDATED_LEGACY**(현재 운영 중). **Canonical 업그레이드 미구현(PLANNED)**: 360 Query Layer·Consumer Enforcement·단일 Normalizer·**consent identity 차원**·Wrong-target·PII Masking. 따라서:
1. 라이브 엔진 Canonical 대조 감사(완료).
2. **Identity Accuracy(Precision/Recall)=라벨 Golden Dataset 부재로 측정 불가**→BLOCKED_PENDING_DATASET. Golden/Historical Regression/Shadow=Canonical 실행층 미구현이라 실행 불가.
3. **Canonical Production Ready 0**(05-B Critical 미해소). 라이브 crm_customers는 legacy로 계속 운영.

## 1. Registry Cross-Check (§4) & Schema Gap (§5)
- Customer Entity/Store/Identifier/Match Rule/Consent/Suppression Registry=05-A/B 문서 확정·실 코드는 crm_customers 스키마(문서 CE와 부분 일치). **Schema Gap(PROFILE_SCHEMA_IMPLEMENTATION_GAP)**: person_id(identity_id 존재이나 Person Entity 미승격)·workspace_id/brand_id/store_id 없음·profile_version_id 없음·identity_confidence/quality/trust/freshness_status 없음·source_profile 분리 없음. → Canonical 확장 시 구현.

## 2. Store / Service / Source Account 감사 (§6~8)
- crm_customers=CANONICAL_PROFILE_PRIMARY(라이브)·merge_link=IDENTITY_STORE(evidence/version 없음 GAP)·crm_channel_prefs=CONSENT(identity 차원 없음 GAP)·pixel/attribution=SOURCE(익명/cross-device).
- **Source Account/Connector(§7)**: channel_credential tenant 격리·Reconnect 후 Account 변경 검증 UNVERIFIED(288차 미전수)·**buyer_email 합성키(name@channel.noemail ChannelSync:4676)=Source Account 무관 오병합 위험**. Webhook tenant 도출(본문 불신 ChannelSync:5620)=양호.

## 3. Identifier / Normalization 감사 (§8~12) — ★결함
- ★**정규화 3종 불일치(pixel sha256 full / attribution 32자절단+e·p / review email\|phone Dsar:23)**=조용한 미삭제·crosswalk 실패. crm email/phone 저장 시 미정규화(조회 시 LOWER/normalizePhone). → **오병합/미삭제 실재(HIGH)**. Normalization Version·Hash Version 미기록. Plus/Gmail Dot 자동병합=현재 email UNIQUE라 낮음.

## 4. Candidate / Match / Model 감사 (§13~19)
- **Candidate/Match**: Union-Find(phone/kakao 정확일치 자동)·scoreIdentityPair(확률 email local0.7/phone suffix0.4/name·**승인 전용·자동병합 절대금지 CRM:699**). Match Rule Registry화 안 됨(scoreIdentityPair 하드코딩)→Registry화 필요. **Model 기반 Resolution 없음**(휴리스틱만). ★**자동 Merge=phone/kakao 정확일치만·확률은 승인 전용=양호(Precision 우선)**.
- **Identity Link/Graph(§18/§19)**: crm_identity_merge_link(score/actor·**evidence/version 미저장 HIGH**). Cross-Tenant Link=구조적 차단(CRM:851). Identity Graph=KG 미적재(02-C)→Memory Graph 없음.

## 5. Merge / Unmerge / Split 감사 (§20~28)
- **자동 Merge Gate**: phone/kakao 자동은 Dry Run/영향분석/Flag 없이 실행(현 resolveIdentities 즉시)·확률은 승인+mergeIdentities. ★**Merge Dry Run 미구현(HIGH)**·영향(LTV/Segment/Automation) 사전계산 없음. **Merge Concurrency Lock 미검증**.
- **Unmerge 지원(§25 양호)**: identityUnmerge CRM:913(링크삭제+solo 분리)·단 phone/kakao 공유 시 재병합 CRM:926·**Event/Consent/Segment/LTV 복구 자동화 미확인(부분)**. **Split/Re-link 미구현**(공용 이메일·B2B·Household 분리 없음).

## 6. Golden Record / Consent / Suppression / Event (§27~35)
- **Golden Record 미구현(§27)**: 현 crm_customers는 컬럼 덮어쓰기(속성별 Resolver 없음)·Attribute Source Priority 없음·Temporal Attribute 없음(과거 재현 불가). → 신설.
- **Consent(§30~33)**: 발송게이트(isMarketingSendAllowed) 실동작이나 ★**consent identity 차원 없음→병합 시 동의확대(05-A/B CRITICAL)**. Brand/legal Purpose 분리 없음(topic=콘텐츠). Unknown≠Granted=fail-open(gate_error_open)로 관대(검토). Suppression>Consent=isMarketingSendAllowed 순서상 반영. Eligibility Projection 없음(런타임 게이트).
- **Event Link(§34)**: pixel/attribution identity_hash↔session·crm_activities customer_id. **Anonymous-to-Known crosswalk 약함**(pixel→CRM email 평문 단방향).

## 7. 360 Query Layer / Consumer / Wrong-target 감사 (§36~48)
- ★**360 Query Layer 미구현**: 소비처(CRM/Segment/CustomerAI/ClaudeAI:703/발송채널/AdAdapters) **crm_customers 직접조회**. **PII Masking 없음**(getCustomer/ClaudeAI raw email·05-A HIGH). 조회수준(Aggregate~Sensitive) 미분리(requirePro만).
- **Wrong-target Prevention 미구현(§48)**: Merge/Unmerge 직후 Cooldown·실행시점 Verified Destination Identifier 재검증 없음. 합성 buyer_email·재사용 phone·공용 email 대상 발송 위험(설계 대상).

## 8. Cross-Tenant / Mock / External / Deletion 감사 (§52~54/§49~51)
- ★**양호**: Cross-Tenant Merge/Link 차단(CRM:851)·crm 조회 tenant WHERE 강제·Mock/Demo tenant 격리·platform_growth 예약(AdminGrowth:353). External Account 혼입=Reconnect 후 Account 변경만 UNVERIFIED.
- **Deletion(§49~51)**: DSAR 전 캐스케이드(Dsar:587)·merge_link 사각지대 처리·법정보존 익명화. ★**GAP: DSAR customerIds=email/phone 매칭·identity_id 미기반→병합 형제 누락(MEDIUM)·ai_analyses/AI Memory 연계 미편입(04-A GAP 연계)**. 삭제 후 재유입=Tombstone/Restore Suppression 미구현. Re-ingestion 차단 없음.

## 9. Drift / Duplicate (§54/§55)
- **Duplicate=Identity 4파편(crm identity_id·app_user·pixel·attribution·crosswalk 부재)**. Golden Record/Consent Resolver/Query Layer 중복 없음(미구현). Match Rule 하드코딩(scoreIdentityPair).

## 10. Identity Accuracy / Baseline (§60/§64/§65)
- **Identity Accuracy=측정 불가**(라벨 Golden Dataset 부재)→BLOCKED_PENDING_DATASET. Auto Merge Precision=이론상 높음(phone/kakao 정확일치만)이나 미측정.
- **Security Baseline(§64)**: Cross-Tenant Profile/Merge 차단=PASS(CRM:851)·Cross-Source Account=UNVERIFIED·PII Masking 없음(FAIL)·Deleted Profile 차단 부분. **Privacy Baseline(§65)**: DSAR 존재(형제 누락 GAP)·Consent 철회 반영·**PII Minimization/Masking 미흡·consent identity 차원 없음**·Retention/Anonymization 부분. **Performance**: 구현 후.

## 11. Certification Matrix (§75) & Production Blockers (§70)

| Target | Scope | Identity Accuracy | Merge/Unmerge | Consent | Security | Status |
|---|---|---|---|---|---|---|
| crm_customers(라이브) | ✅ tenant | 미측정 | Unmerge O·Dry Run X | 발송게이트 O·identity 차원 X | PII Masking X | **VALIDATED_LEGACY(부분)** |
| Union-Find/확률병합 | ✅ | 미측정 | 자동 phone/kakao·승인 확률 | — | ✅ Cross-Tenant 차단 | VALIDATED_LEGACY |
| 360 Query Layer | — | — | — | — | — | **BLOCKED_PENDING_IMPLEMENTATION** |
| Consent identity 차원 | — | — | — | ✗ | — | **BLOCKED_CONSENT** |
| Wrong-target | — | — | — | — | — | **BLOCKED_WRONG_TARGET** |

**Canonical Production Ready 0.** Blockers: ①Query Layer/Consumer Enforcement 미구현②**consent identity 차원 미구현(병합 시 동의확대)**③합성 buyer_email 오병합④Merge evidence/version·Dry Run 미구현⑤PII Masking 미구현⑥정규화 3종 불일치⑦DSAR 병합형제 누락⑧Identity Accuracy 미측정(라벨 Dataset)⑨Wrong-target 미구현⑩crosswalk 부재.

## 12. §79 완료 보고 수치
Customer Entity ~10 · Store ~9 · Service ~15 · Identifier Type 21(설계)·8(실사용) · Match Rule=하드코딩 1(scoreIdentityPair)·Model 0 · Identity Link=merge_link(evidence 없음) · **Auto Merge=phone/kakao 정확일치만(Precision 우선·양호)** · **Auto Merge Precision 미측정** · False Positive/Negative 미측정(라벨 부재) · Consent Drift(identity 차원 없음)·Suppression=발송게이트 · **Source Account 혼입 Risk(buyer_email 합성)·Cross-Tenant Risk 0** · Mock 오염 낮음 · **Wrong-target Test=미실행(미구현)** · 삭제 전파=DSAR(형제 누락 GAP) · Golden/Historical Regression/Shadow=실행 불가(Canonical 층 미구현) · **Unexplained Difference 0** · Security Verified 부분(Cross-Tenant PASS·PII Masking FAIL)·Privacy 부분 · **Production Ready 0(Canonical)** · Duplicate=Identity 4파편 · 문서=본 마스터+ADR+PM · 남은리스크=Query Layer·consent identity·Wrong-target·정규화·PII Masking·Identity Accuracy Dataset 구현 · **EPIC05-D Part2(Production Readiness·Canary·Rollback·DR) 준비 완료(단 실 구현 선결)**. 코드변경 0.
