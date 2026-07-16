# Segmentation / Audience — Risk Register & Production Blockers

> **EPIC 06-A Part 1** · 289차 (2026-07-16) · 비파괴(코드변경 0) — 본 문서는 **기록**이며 자동 수정 아님.
> 근거: [`SEGMENTATION_PLATFORM_INVENTORY.md`](SEGMENTATION_PLATFORM_INVENTORY.md). 모든 항목 `file:line` 재증명 완료.
> **처리 원칙**: CRITICAL/HIGH는 **별도 승인 구현세션의 P0 백로그**. 발송 게이트·Removal 등 행위변경은 검증(verify)+배포승인 필수 → 본 baseline 단계에서 코드 미변경.

---

## 위험 매트릭스

| Risk ID | 영역 | Scope | 시나리오 | 심각도 | 고객영향 | 자동화영향 | Blocker | 근거 | 해소방향(Part 2/구현세션) |
|---|---|---|---|---|---|---|---|---|---|
| **SEG-C1** | 발송 게이트 우회 | SMS 단건 | `/sms/send` 가 consent/suppression/freq **전무**로 임의 번호 무조건 발송 | CRITICAL | 동의철회·suppressed 번호 도달 | 자동/수동 발송 | **YES** | `SmsMarketing.php:429-464`(재증명) | 발송 전 `isMarketingSendAllowed('sms')` 강제 + phone-키 DNC 조회 |
| **SEG-C2** | 발송 게이트 우회 | WhatsApp 단건/프로그램 | `/whatsapp/send`·`sendOne` 무게이트 | CRITICAL | 동의철회 번호 도달 | Journey/프로그램 발송 | **YES** | `WhatsApp.php:198-227,402`(재증명) | 동일 게이트 강제 |
| **SEG-C3** | 발송 게이트 부분우회 | SMS 브로드캐스트 | `/sms/broadcast` 가 freq cap만·**opt-out/suppression 미적용** | CRITICAL | 동의철회 번호 대량 도달 | 대량발송 | **YES** | `SmsMarketing.php:467-528`(재증명, 288차 주석이 freq만 추가) | broadcast 루프에 consent 게이트 추가 |
| **SEG-C4** | phone DNC 부재 | SMS/WhatsApp 전역 | phone 이 consent lookup key 아님 → 미매핑 번호 `return true`(fail-open) + 인바운드 STOP(무료거부) 처리 전무 | CRITICAL | opt-out 무효화(정통망법 위반소지) | 전 phone 채널 | **YES** | `PreferenceCenter.php:112-134`(115 fail-open), STOP grep 무매치 | phone-키 suppression 스토어 + 인바운드 STOP 웹훅 |
| **SEG-H1** | Audience 업로드 consent | Meta/Google/TikTok | 업로드 시 consent/suppression 재검증 전무 → 동의철회 고객 해시업로드 | HIGH | GDPR/PIPA(제3자 광고 공유) | 광고 오디언스 | **YES** | `AdAdapters.php:1772-1791`(opt/consent grep 무매치) | collectHashedEmails 에 consent 술어 + suppression 조인 |
| **SEG-H2** | Audience Removal 부재 | Meta/Google/TikTok | 세그먼트 이탈·동의철회·삭제가 목적지에 전파 안 됨(Google 540일 잔존) | HIGH | 철회 후 잔존 타겟팅 | 광고 오디언스 | **YES** | `AdAdapters.php`(users_remove/삭제op grep 무매치) | Removal orchestrator(Meta users_remove·Google remove op·TikTok delete) |
| **SEG-H3** | DSAR 미도달 채널 | push/line/instagram/onsite/popup | 삭제 대상이 web push 등에서 도달가능(키 없어 미삭제) | HIGH | 삭제고객 잔존 발송 | push/journey | **YES** | `Dsar.php:734-746` | 채널별 삭제키 연결 또는 endpoint→customer 링크 |
| **SEG-H4** | Membership 스냅샷 부재 | crm_segment_members | version/evaluated_at/snapshot 없음 → 과거 캠페인 대상 재현·감사 불가; on-send 재물질화가 검토본과 상이 가능 | HIGH | 감사·분쟁대응 불가 | 리포트·재현 | — | `CRM.php:1530-1619`(컬럼 부재) | Definition Version + Membership Snapshot(Part 2 핵심) |
| **SEG-H5** | Audience Snapshot/Reconciliation 부재 | 전 목적지 | 내부 대상수↔목적지 보고수 대조 없음·매치율 불가시 | HIGH | drift 무관측 | 광고 예산정확도 | — | `AdAdapters.php:1899`(num_received 미대조) | Snapshot + Reconciliation(내부/exported/matched/removed) |
| **SEG-M1** | Consent 기본허용 fail-open | 전 채널 | opt-out 모델·게이트 오류/미매핑 시 발송허용(absence=allow) | MEDIUM | 미동의 발송소지 | 전 발송 | — | `PreferenceCenter.php:112-134`, `CRM.php:1170` | 목적별 legal-basis·민감채널 fail-closed 정책 |
| **SEG-M2** | Cohort 재현성 | cohortRetention | TZ 정규화·환불 netting·버전 없음 | MEDIUM | 리텐션 왜곡 | 리포트 | — | `CRM.php:1221-1270` | TZ 고정·refund netting·as_of 스냅샷 |
| **SEG-M3** | LTV 임계 불일치 | ltvSegments vs crm_segments | gold/VIP 컷오프 상이(동일고객 상충표시) | MEDIUM | 사용자 혼란 | 표시·타겟 | — | `CustomerAI.php:339-343` vs `CRM.php:1432` | Semantic Metric SSOT 단일 티어 정의 |
| **SEG-M4** | Predictive drift | 세그먼트 SQL 근사 | BG/NBD 실모델과 세그먼트 근사 divergence | MEDIUM | 예측세그 부정확 | 예측타겟 | — | `CRM.php:1548-1552` vs `398-445` | 실모델 점수 영속→세그먼트가 참조 |
| **SEG-M5** | Omni consent 지연 | Omnichannel | enqueue 시 미검증→worker 지연 적용 | MEDIUM | 큐 재처리 시 오발송 소지 | 옴니발송 | — | `Omnichannel.php:178-213` | enqueue 시점 consent 스냅샷 |
| **SEG-L1** | 고아 엔드포인트 | /ai/generate/segment | 실 AI 호출이나 프론트 호출자 0·미영속 | LOW | 없음(사용 안 됨) | 없음 | — | `AiGenerate.php:186-220` | UI 배선 또는 executable 브릿지(Part 2) |
| **SEG-L2** | Journey 느슨결합 | JourneyBuilder segment | 자유텍스트↔이름 정확매칭(오타 시 무발송) | LOW | 무발송(안전측) | Journey | — | `JourneyBuilder.php:368-369` | 세그먼트 드롭다운(id 바인딩) |
| **SEG-L3** | 소비자 코드 4중복 | Kakao/SMS/Email/Omni | 동일 JOIN 복붙 | LOW | 유지보수 | — | — | 각 핸들러 | 공유 멤버해석 헬퍼 |
| **SEG-L4** | Audience 고아누적 | Meta/Google/TikTok | refresh마다 신규생성·이전 audience 미정리 | LOW | 목적지 audience 누적 | 광고정리 | — | `AdAdapters.php:1816-1840` | upsert(기존 audience 갱신)+정리 |

---

## Production Blockers (운영 차단 등급 — 별도 승인 구현세션 P0)

**즉시 P0 (컴플라이언스·wrong-target)**: SEG-C1·C2·C3·C4 — 무게이트/우회 발송 경로 + phone DNC. 동의철회/suppressed 고객에게 실제 발송 가능한 경로. **발송 게이트 표준화가 최우선 구현 대상**.

**P1 (프라이버시·정확성)**: SEG-H1(업로드 consent)·H2(Removal)·H3(DSAR 채널)·H4(Membership 스냅샷)·H5(Reconciliation).

**설계 선결(Part 2)**: H4/H5/M1~M5 는 Canonical Segment Schema·Versioning·Snapshot·Consent projection 설계로 근본해소.

---

## 이번 단계에서 하지 않은 것 (§72 준수)
전체 Segment Engine 교체·Membership 재생성·Audience 재업로드·기존 Store 삭제·DSL 전면전환·실시간 세그먼트 활성화·발송 게이트 코드수정 **전부 미실행**. 본 문서는 근거기록·베이스라인이며, 위 블로커의 실제 수정은 **verify + 배포승인** 후 별도 세션.
