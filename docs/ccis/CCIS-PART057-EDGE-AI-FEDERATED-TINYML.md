# GeniegoROI Claude Code Implementation Specification

# CCIS Part057 — Enterprise Edge AI, Federated Learning, TinyML & Distributed Intelligence Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Edge AI·Federated Learning·TinyML·Distributed Intelligence 표준을 수립한다.

> ★**성격(★Part027/037/054 중복 — Edge AI 전면 부재·중앙 AI 실재)**: 본 Part 는 ★**CCIS Part027(MLOps·자체 ML
> 학습 부재)·037(IoT/Edge/디바이스 out of scope)·054(AI Agent·중앙)와 중복**되며 그 판정을 승계한다. 이
> 저장소의 AI 는 **중앙(외부 LLM + 통계모델)**이지 **Edge/On-Device 가 아니다**. 명세가 다루는 **Edge AI(Edge
> Runtime/Edge Inference)·Federated Learning(local training/secure aggregation)·TinyML(microcontroller/
> quantized)·On-Device Learning·AI Model Synchronization·Edge Model Registry·Distributed Intelligence**는
> **전면 부재**한다(grep 0). ★결함이 아니라 **구조적 부재**: **자체 ML 학습이 없어(Part027) Federated/On-Device
> Learning 은 대상 자체가 없고**, **물리 디바이스가 없어(Part037 out of scope) Edge Device/Runtime 이 없다**.
> ★**실재 축(중앙 AI)**: **`ClaudeAI` Gateway**(외부 LLM 추론·**중앙**·MEA 053)·**통계모델**(`Mmm`/
> `AttributionEngine`/`DemandForecast`·**중앙 계산**)·**`ModelMonitor`**(모델 감시·Part027)·**`WmsCctv`**(엣지
> 카메라이나 **서버측 RTSP→HLS 리먹스**·Part037) 는 실재한다. ★★**핵심 오흡수 차단**: **`WmsCctv`=엣지 카메라
> 장비이나 AI 처리·추론은 서버측이지 On-Device/Edge AI 추론이 아님**(Edge=서버측 처리≠On-Device) · **중앙
> LLM/통계=중앙 추론이지 Edge Inference 아님** · **PII 미저장(집계 코호트)=privacy-by-design이나 Federated
> Learning 아님**(원본 미이동 목적은 겹치나 방식 다름). Part001 §4 에 따라 실측 → Edge AI/Federated/TinyML
> 부재증명 → 중앙 AI 성문화했다. ★정본=**Part027/037/054·MEA 061(Edge weak)** 승계·재판정 금지. (문서 차수 —
> 코드 무변경.)

---

## 2. 실측 — 현행 AI 배치 구조 (중앙 vs Edge)

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Edge AI Architecture | Device→Edge Runtime→Gateway→Sync→중앙 | **부재(구조적)** — Edge 계층 없음. **중앙 AI**(외부 LLM/통계) |
| Edge AI Runtime | Edge Inference/Task Scheduler | **부재** — Edge Runtime 없음. 추론=중앙(`ClaudeAI` Gateway) |
| Edge Device Management | Registration/Provisioning/Firmware | **부재(out of scope)** — 디바이스 관리 없음(Part037). `WmsCctv`=카메라 자격등록(디바이스 fleet 아님) |
| Federated Learning | Local Training/Secure Aggregation | **부재(구조적)** — ★**자체 ML 학습 없음(Part027)** → local training 대상 자체 없음 |
| TinyML | Microcontroller/Quantized/Embedded | **부재** — 임베디드 AI 없음(마이크로컨트롤러 없음) |
| Distributed Intelligence | Distributed Decision/Edge Collaboration | **부재** — 분산 지능 없음. 중앙 `Decisioning`(단일) |
| On-Device Learning | Incremental/Personalized/Adaptive | **부재(구조적)** — On-Device 학습 없음(디바이스 없음·자체 학습 없음) |
| AI Model Synchronization | Distribution/Version/Differential/Rollback | **부분(대응물)** — `ModelMonitor`(ml_models 메타·Part027). Edge 모델 동기화 아님(외부 LLM은 provider) |
| Edge Model Registry | Catalog/Signature/Deployment History | **부분(대응물)** — `ModelMonitor`(ml_models·중앙). Edge 배포 이력 아님 |
| AI Deployment Pipeline | Staging/Canary/Blue-Green | **부재** — 모델 배포 파이프라인 없음(Part027·외부 LLM은 provider 관리) |
| Device Health Monitoring | CPU/Memory/Temp/Connectivity | **부분(카메라)** — `WmsCctv` 재생 상태·`SystemMetrics`(서버). Edge 디바이스 헬스 아님 |
| Edge Governance | Device/AI/Deployment Policy | **부재** — Edge 거버넌스 없음. 중앙 AI 거버넌스=V4/V5(Part042) |
| Edge Security | Secure Boot/Device Cert/Model Integrity | **부분(카메라)** — `WmsCctv`(Crypto AES fail-closed·SSRF·Part037). Secure Boot/Model Integrity 대상 없음 |
| Edge Analytics | Device Perf/Inference Accuracy/Sync | **부분** — `WmsCctv` 상태·`ModelMonitor`. Edge 추론 정확도 대상 없음 |
| Distributed AI Coordination | Multi-Edge/Regional/Cooperative | **부재** — 분산 Edge 없음(단일 중앙) |
| Monitoring | Device/Model Accuracy/Sync/Inference | **부분** — `ModelMonitor`·`SystemMetrics`·`ai_call_log`. Edge 지표 대상 없음 |
| Logging | Device/Model/Deployment ID | **부분** — `ai_call_log`·`SecurityAudit`. Device/Deployment ID 부분 |
| Security(mTLS/Model Encrypt/Device Auth/격리) | Edge 통신 보안 | ★**부분 준수(중앙)** — TLS·`Crypto`·`api_key`(device identity·Part037)·테넌트 격리. mTLS/Model Encrypt 대상 없음 |
| Compliance(IEC 62443/NIST AI RMF) | Edge 보안 표준 | **부재(out of scope)** — Edge/산업 IoT 인증 대상 아님 |
| Disaster Recovery | Model/Device/Firmware/Sync 복구 | **부분** — 중앙 DB 백업·`WmsCctv` 재등록. Edge 모델/펌웨어 대상 없음 |
| Performance(Compression/Quantization/HW Accel) | Edge 최적화 | **부재** — Edge 최적화 대상 없음(중앙 추론) |

---

## 3. 명세 vs 현실 — 섹션별 판정 (전면 부재 + 오흡수 경계)

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Edge First/Privacy by Design/Low Latency/Distributed/Offline First/Continuous Learning/Tenant Isolated) | **부분(중앙축)** | ★Privacy by Design(PII 미저장)·Tenant Isolated·Explainable(V4). Edge First/Distributed/Offline/On-Device Learning=부재 |
| §4 Edge AI Architecture | **부재(구조적)** | Edge 계층 없음. 중앙 AI |
| §5 Edge AI Runtime | **부재** | 추론=중앙(`ClaudeAI`) |
| §6 Edge Device Management | **부재(out of scope)** | 디바이스 관리 없음(Part037). `WmsCctv`=카메라 자격등록 |
| §7 Federated Learning | **부재(구조적)** | ★자체 ML 학습 없음(Part027)→대상 없음 |
| §8 TinyML | **부재** | 임베디드 AI 없음 |
| §9 Distributed Intelligence | **부재** | 분산 지능 없음. 중앙 `Decisioning` |
| §10 On-Device Learning | **부재(구조적)** | 디바이스·자체 학습 없음 |
| §11 AI Model Synchronization | **부분(대응물)** | `ModelMonitor`(중앙 메타). Edge 동기화 아님 |
| §12 Edge Model Registry | **부분(대응물)** | `ModelMonitor`(ml_models·중앙) |
| §13 AI Deployment Pipeline | **부재** | 모델 배포 파이프라인 없음(외부 LLM=provider) |
| §14 Device Health Monitoring | **부분(카메라)** | `WmsCctv`·`SystemMetrics`(서버) |
| §15 Edge Governance | **부재** | 중앙 AI 거버넌스=V4/V5 |
| §16 Edge Security | **부분(카메라)** | `WmsCctv`(Crypto/SSRF). Secure Boot 대상 없음 |
| §17 Edge Analytics | **부분** | `WmsCctv`·`ModelMonitor` |
| §18 Distributed AI Coordination | **부재** | 단일 중앙 |
| §19 Monitoring | **부분** | `ModelMonitor`·`SystemMetrics`·`ai_call_log` |
| §20 Logging | **부분** | `ai_call_log`·`SecurityAudit` |
| §21 Security | **부분 준수(중앙)** | TLS·`Crypto`·`api_key`·테넌트 격리 |
| §22 Compliance | **부재(out of scope)** | Edge/산업 IoT 인증 대상 아님 |
| §23 Disaster Recovery | **부분** | 중앙 DB 백업·`WmsCctv` 재등록 |
| §24 Performance | **부재** | Edge 최적화 대상 없음 |
| §25~§26 PHP/Claude(Edge Device/Model Registry/Federated Coordinator/Deployment/Sync Service) | **부분** | ★중앙 `ClaudeAI`·`ModelMonitor`·`WmsCctv`. Edge Runtime/Federated/Sync Service 부재 |
| §27~§28 검증(edge:health/federated:validate/edge:sync) | **대상 없음** | artisan 없음·Edge AI 없음. `ModelMonitor`·`WmsCctv`·`ai_call_log` 로 대체 |

---

## 4. 확립된 표준 (신규 AI 배치 코드가 따를 정본)

- ★**AI 추론 = 중앙**(`ClaudeAI` Gateway 외부 LLM·MEA 053 + 통계모델 `Mmm`/`AttributionEngine`/`DemandForecast`). Edge Runtime/On-Device 추론 신설 금지(디바이스·자체 학습 없음). `ModelMonitor`(모델 메타 감시).
- ★★**Federated/On-Device Learning 구조적 부재**: ★**자체 ML 학습이 없어(Part027) local training 대상 자체가 없다**. Federated Learning 신설 전 **자체 ML 학습 파이프라인 선행**(Part027 판정). TinyML=마이크로컨트롤러 없음.
- ★**카메라 = `WmsCctv`**(Part037·Device 축). ★★**엣지 카메라 장비이나 처리는 서버측(RTSP→HLS 리먹스)**·Crypto AES fail-closed·SSRF. **On-Device 추론 신설 금지**(서버측 처리 유지).
- ★★**오흡수 차단**: **`WmsCctv`(엣지 카메라·서버측 처리)≠Edge AI 추론** · **중앙 LLM/통계≠Edge Inference** · **PII 미저장(privacy-by-design)≠Federated Learning**(목적 겹쳐도 방식 다름) · **`ModelMonitor`(중앙 메타)≠Edge Model Registry**. 이름·개념 겹쳐도 Edge 실체 아님.
- ★**Privacy by Design(대응물)**: Federated 없이 **PII 미저장(집계 코호트)·해시 식별자·테넌트 격리**로 원본 보호 달성. 이것이 Federated 대체이지 Federated 자체 아님(정직 표기).
- ★**사업범위 원칙**: **Edge AI/Federated/TinyML/On-Device Learning/Distributed Intelligence 는 제품 범위 밖/구조적 부재** — 물리 디바이스·자체 ML 학습·엣지 인프라 선행 없이 선이식 금지.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 구조적 부재·Part027/037 중복)

1. **Edge AI(Edge Runtime/Edge Inference)·Distributed Intelligence** — 안 함. **물리 디바이스 없음(Part037 out of scope)**·AI 추론=중앙(외부 LLM/통계). Edge=서버 인프라·디바이스 선행.
2. **Federated Learning·On-Device Learning** — 안 함. ★**자체 ML 학습이 없어(Part027) local training 대상 자체가 없다**(구조적 부재). Federated=ML 학습 파이프라인 선행.
3. **TinyML(microcontroller/quantized/embedded)** — 안 함. 임베디드/마이크로컨트롤러 없음.
4. **AI Model Sync/Edge Model Registry/Deployment Pipeline(Canary/Blue-Green)** — 부분. `ModelMonitor`(중앙 메타)가 대응물. 외부 LLM은 provider 관리(자체 배포 없음·Part027).
5. **`WmsCctv`/중앙 LLM/PII 미저장/`ModelMonitor` 를 Edge AI/Federated/Edge Registry 로 오흡수 금지** — 서버측 처리/중앙 추론/privacy-by-design/중앙 메타이지 Edge 실체 아님.
6. **artisan `edge:*`/`federated:validate`/`edge:sync` 명령** — 없음(Slim·Edge AI 없음). `ModelMonitor`·`WmsCctv`·`ai_call_log` 로 대체.

★**준수하는 실 원칙**: **중앙 AI(ClaudeAI Gateway·통계모델·ModelMonitor)·`WmsCctv`(카메라·서버측 처리·Crypto/SSRF)·Privacy by Design(PII 미저장·집계 코호트)·테넌트 격리·V4 Explainable**. ★★**오흡수 차단**: Edge 카메라≠Edge AI 추론·중앙 추론≠Edge Inference·PII 미저장≠Federated Learning. ★**구조적 부재 정직 선언**: Edge AI/Federated/TinyML 은 물리 디바이스·자체 ML 학습 부재로 대상 자체가 없으며 결함이 아니다.

---

## 6. Claude Code 구현 규칙

1. AI 추론=중앙(`ClaudeAI` Gateway·통계모델). Edge Runtime/On-Device 추론 신설 금지(디바이스·자체 학습 없음). 모델 감시=`ModelMonitor`.
2. ★★Federated/On-Device Learning 신설 전 **자체 ML 학습 파이프라인 선행**(Part027). TinyML=대상 없음(임베디드 없음).
3. 카메라=`WmsCctv`(서버측 처리·Crypto/SSRF·Part037). ★On-Device 추론 신설 금지(서버측 유지).
4. ★★**오흡수 금지**: `WmsCctv`(서버측 처리)·중앙 LLM(중앙 추론)·PII 미저장(privacy-by-design)·`ModelMonitor`(중앙 메타)를 Edge AI/Federated/Edge Registry 로 표기하지 않는다.
5. Privacy=PII 미저장(집계 코호트·해시)·테넌트 격리(Federated 대체이지 Federated 아님·정직 표기).
6. ★★Edge AI/Federated/TinyML/On-Device Learning 을 선이식하지 않는다 — 물리 디바이스·자체 ML 학습·엣지 인프라 선행. Part027/037 판정=정본(재판정 금지).

---

## 7. Completion Criteria

- [x] AI 배치 스택 **실측**(Edge AI/Federated/TinyML/On-Device Learning/Distributed Intelligence 전면 부재·grep 0·중앙 `ClaudeAI` Gateway·통계모델·`ModelMonitor`·`WmsCctv` 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(Edge AI **구조적 부재**(디바이스·자체 학습 없음·Part027/037) 증명·중앙 AI 실재)
- [x] 실 AI(중앙 ClaudeAI+통계모델+ModelMonitor+WmsCctv 서버측) 성문화(§4)
- [x] ★★오흡수 차단(WmsCctv 서버측 처리≠Edge AI·중앙 추론≠Edge Inference·PII 미저장≠Federated)·구조적 부재(자체 학습 없음)·Privacy by Design 대응물 명시
- [x] 의도적 미적용 + 사유(§5) — Edge AI/Federated/TinyML/On-Device Learning/Distributed Intelligence/Edge Registry(구조적 부재·Part027/037 중복)
- [x] Claude Code 규칙(§6) · 중앙 `ClaudeAI`·`ModelMonitor`·`WmsCctv`·`ai_call_log` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **Part027/037/054 승계** — AI 는 **중앙(외부 LLM `ClaudeAI` Gateway +
> 통계모델 + `ModelMonitor`)**이지 Edge/On-Device 가 아니다. ★**구조적 부재**: **자체 ML 학습이 없어(Part027)
> Federated/On-Device Learning 대상 자체가 없고, 물리 디바이스가 없어(Part037) Edge Runtime 이 없다**. ★★**오흡수
> 차단**: **`WmsCctv`는 엣지 카메라이나 처리는 서버측이지 Edge AI 추론이 아니고, PII 미저장은 Federated Learning
> 이 아니다**. Part027/037 판정=정본(재판정 금지).

---

## 다음 Part

**CCIS Part058 — Enterprise Data Privacy, Consent Management, Data Residency & Sovereign Cloud** — ★사전 실측 예고: ★**Part012(보안)·034(거버넌스)·049(MDM)와 중복** — 형식 Consent Management Platform(OneTrust)·Data Residency/Sovereign Cloud(지역 데이터 상주)는 **부분/부재**(단일 VPS·단일 리전)이나, 프라이버시 실체는 **`GdprConsent`(동의)·`Dsar`(삭제/이동/익명화·삭제vs익명화)·`PreferenceCenter`(수신동의)·PII 미저장(집계 코호트)·`Crypto` AES·Masking·테넌트 격리·email_suppression**로 강하게 실재(Part034 승계). Part058 도 실측→Consent Platform/Data Residency/Sovereign Cloud 부재증명→GdprConsent+Dsar+PII 미저장 성문화. ★강한 영역(프라이버시=은행급 지향)·Part012/034 중복 명시·"삭제vs익명화·수집≠사용" 재확인.
