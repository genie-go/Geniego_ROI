# MEA Part 061 — Enterprise IoT, Edge AI & Intelligent Device Platform Architecture · SPEC v1.0 (원문 verbatim 영속)

> **거버넌스 상태**: **✅ 7문서 세트 완결 · ground-truth 전수조사 완료 · 판정 완료** · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> **판정 = PARTIAL-weak (CCTV 카메라 도메인 Device Management는 실재 / ★Sensor·Telemetry·Edge AI·Firmware·Device Command·Predictive Maintenance = 전면 ABSENT).** 인덱스 = [`docs/data/MEA_PART061_INDEX.md`](../data/MEA_PART061_INDEX.md) · 결정 = [`ADR`](../architecture/ADR_MEA_IOT_EDGE_AI_INTELLIGENT_DEVICE_ARCHITECTURE.md)(D-1~D-7) · 근거지 = [`GT① EXISTING`](../data/MEA_PART061_EXISTING_IMPLEMENTATION.md) / [`GT② DUPLICATE`](../data/MEA_PART061_DUPLICATE_AUDIT.md).
> ★★**성격 규정(D-2)**: **"IoT가 없다"가 아니라 "CCTV 카메라 한 종류의 Device 관리만 있고 Sensor·Telemetry·Edge AI는 없다."** 현행은 **조회 전용 스트림 릴레이**(제어 명령·펌웨어·센서 수집 전무). `mqtt`/`coap`/`lorawan`/`zigbee`/`modbus`/`opcua`/`firmware`/`edge_ai`/`edge_inference` **전부 0**.
> ★★**`WmsCctv` 스코프 전환(D-1)**: 054(≠AI Agent)·059(≠Asset Twin) **배제** → **061에서 Device 축 편입**(Device Management 축에만 한정). 054·059 판정은 **각자 스코프에서 유효·재판정 금지** — **060 D-2 "스코프 분리해 둘 다 참으로"의 두 번째 적용 사례**.
> ★**실재 요지**: `wms_cameras` 레지스트리(:124~151)·`VENDORS` 프로파일(ONVIF 포함:55~79)·`wms_cctv_bridges`(pair_code·token_hash·agent_version·discovered·last_seen_at:152~166)·**페어링·토큰·heartbeat·LAN WS-Discovery ONVIF 자동발견**(`bridge.js`:92·:202·:200~206·:21)·`testCamera`(:739)·**자원 폭주 방어**(25MB:47·**무시청 90초 ffmpeg 종료**:48)·자격 AES-256-GCM.
> ★★**설계 제약 9종**(ADR): ①Device 레지스트리 이원화 금지(**`wms_cameras` device_type 일반화**·**Registry 부재 4연속** 동일 처방) ②온프렘 에이전트 이원화 금지 ③Device identity는 **`api_key` 위에** ④관측=`SystemMetrics`·감사=`SecurityAudit`(**고빈도 텔레메트리 앵커링**) ⑤**Device Discovery는 기존 WS-Discovery 재사용**(명세에 없으나 실재) ⑥지표는 실 heartbeat 파생·**산출 불가 시 0 아닌 null**(★**장비 헬스 0%를 "정상"으로 오독하면 물리 장애 은폐**) ⑦Time-Series 도입 시 **보존 정책 선행** ⑧**★★테넌트 격리 절대 — 본 Part 최고 위험도**(카메라 자격·현장 IP·창고 배치=**물리 보안 직결**) ⑨**★★Device Command·Firmware OTA는 최고 수위 게이트**(물리 제어는 오작동이 물리 세계에 즉시 반영 → 058·059·060보다 엄격히·**승인 정족수+킬스위치+롤백+작업창**).
> ★적용 원칙: **반날조**·**부재증명 후에만 ABSENT**(★**단어경계 `\b` + 광의 히트 파일 단위 전수 분류**)·**과대주장 금지**·**부재 축소 금지**·**뭉뚱그린 평가절하 금지**·**오흡수 금지**·**정직 표기**(★판정 어휘 4종)·**중복 엔진 절대 금지**(헌법 V4)·**★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE**·AI는 승인 없이 Device Firmware를 자동 변경하거나 제어 명령을 무단 실행 불가(헌법 V5 + `CHANGE_GATE`).
> ★상속: **051~060 전체** — 특히 **051(GPU/클러스터 부재 확정)·057(`SystemMetrics` 관측 정본)·059(Twin 개념 전무)·060(Automation Registry 부재)**. **재판정 금지**(056 cross-cutting 규율). ★**상충 판정 시 스코프 분리해 둘 다 참으로**(060 D-2 표준 처리법).
> ★★**`WmsCctv` 취급 주의(3연속 오흡수 후보 → 본 Part에서 스코프 전환)**: 054는 **`agent_version`≠AI Agent**로, 059는 **비디오월≠Asset Twin**으로 배제했다. **그러나 본 Part(IoT/Device)에서는 CCTV 카메라가 정당한 Device 스코프**다 — **배제가 아니라 편입**하되, **Device Management 축에만 한정**하고 **Edge AI·Telemetry Platform·Predictive Maintenance로 확대 해석하지 말 것**(오흡수 경계 재설정·판정 기준 차이 명시).
> ★**추가 오흡수 금지 사전 주입**: `tools/cctv-bridge`(Node 무의존 온프렘 에이전트)≠**Edge Runtime/Edge AI** · CCTV 스트림 릴레이≠Telemetry Platform · `Wms` 창고 재고 테이블≠Smart Warehouse Device · `SystemMetrics`(057 플랫폼 관측)≠Device Monitoring · `connector_health`(데이터 커넥터)≠Device Health.

---

## ※ 이하 = 사용자 제공 원문(verbatim). 가감·해석·판정 없음.

# GeniegoROI Master Enterprise Architecture v1.0

# MEA Part 061 — Enterprise IoT, Edge AI & Intelligent Device Platform Architecture

Version 1.0

---

# 1. 작업 목적

Enterprise IoT, Edge AI & Intelligent Device Platform Architecture는 GeniegoROI의 물류, 커머스, 제조, 창고, 차량, 센서 및 다양한 스마트 디바이스를 실시간으로 연결하고 Edge AI를 활용하여 현장에서 즉시 분석·판단·제어할 수 있는 Enterprise IoT Platform의 표준 아키텍처를 정의한다.

본 문서는 Enterprise AI Platform Foundation, Enterprise Digital Twin Platform, Enterprise Logistics Platform, Enterprise Security Platform, Enterprise Data Platform 및 Enterprise Hyperautomation Platform과 연계되는 Enterprise IoT & Edge Intelligence Framework의 기준 문서이다.

---

# 2. 구현 범위

본 Part에서 구현하는 영역

* Enterprise IoT Platform
* Edge AI
* Intelligent Device
* Device Management
* Sensor Network
* Telemetry Platform
* Edge Computing
* IoT Security
* Device Analytics
* IoT Operations

---

# 3. 구현 목표

구축 대상

1. Enterprise IoT Platform
2. Edge AI Platform
3. Device Management Platform
4. IoT Gateway
5. Telemetry Platform
6. Device Monitoring Service
7. IoT Governance Manager
8. Device Analytics Dashboard
9. IoT Audit Service
10. Enterprise Edge Intelligence Advisor

---

# 4. 아키텍처 원칙

* Edge First
* Real-Time Processing
* Device by Design
* Secure by Default
* AI Assisted
* Event Driven
* Cloud Native
* Metadata Driven
* Enterprise Standard
* Audit by Default

---

# 5. Canonical Entity

정의

* DEVICE
* DEVICE_GROUP
* DEVICE_PROFILE
* SENSOR
* SENSOR_READING
* EDGE_NODE
* EDGE_MODEL
* TELEMETRY
* DEVICE_COMMAND
* DEVICE_EVENT
* DEVICE_POLICY
* DEVICE_STATUS
* DEVICE_FIRMWARE
* DEVICE_ANALYTICS
* DEVICE_AUDIT

---

# 6. IoT Platform Domain

Enterprise IoT Platform은 다음 Domain을 지원한다.

* Smart Warehouse
* Smart Fleet
* Smart Vehicle
* Smart Logistics
* Smart Asset
* Smart Facility
* Smart Environment
* Edge AI
* Device Intelligence
* Enterprise IoT

모든 Device는 Enterprise Device Registry를 기준으로 관리한다.

---

# 7. Device Lifecycle

표준 Lifecycle

1. Device Registration
2. Device Provisioning
3. Authentication
4. Configuration
5. Telemetry Collection
6. Edge Processing
7. Firmware Update
8. Monitoring
9. Retirement
10. Archive

모든 Device는 Lifecycle 전 과정을 관리한다.

---

# 8. Device Management

지원 기능

* Device Registration
* Device Provisioning
* Remote Configuration
* Remote Diagnostics
* Firmware Management
* Device Inventory
* Device Health
* Device Group Management

모든 장치는 중앙 Device Manager에서 관리한다.

---

# 9. Edge AI Platform

지원 기능

* Edge Inference
* Edge Analytics
* Local Decision
* Offline Operation
* AI Model Distribution
* Edge Synchronization
* Edge Monitoring
* Edge Optimization

Edge 환경은 네트워크 장애 시에도 독립적으로 동작할 수 있어야 한다.

---

# 10. Telemetry Platform

지원 기능

* Sensor Collection
* Event Streaming
* Real-Time Telemetry
* Time-Series Storage
* Threshold Monitoring
* Alert Generation
* Data Aggregation
* Telemetry Analytics

모든 Telemetry 데이터는 실시간으로 처리한다.

---

# 11. Intelligent Device Analytics

지원 기능

* Device Health Analysis
* Predictive Maintenance
* Usage Analytics
* Failure Prediction
* Device Performance
* Asset Tracking
* Location Analytics
* Operational Dashboard

AI는 장비 이상을 사전에 예측할 수 있어야 한다.

---

# 12. IoT Governance

관리 항목

* Device Policy
* Firmware Policy
* Security Policy
* Communication Policy
* Update Policy
* Compliance Policy
* Lifecycle Validation
* Audit Trail

---

# 13. Data Security

필수 정책

* Device Authentication
* Mutual TLS
* RBAC
* Secure Boot
* Firmware Integrity Validation
* Audit Logging

모든 Device는 신뢰 기반 인증을 수행해야 한다.

---

# 14. Runtime 규칙

Runtime에서는

* Device Authentication
* Telemetry 수집
* Edge AI 실행
* Local Decision 수행
* Event 생성
* Cloud Synchronization
* Audit 기록

을 반드시 수행한다.

---

# 15. API 표준

지원 API

* Register Device
* Update Firmware
* Query Device Status
* Execute Device Command
* Query Telemetry
* Query Edge Status
* Query Device Analytics
* Query Device Audit

---

# 16. Event 표준

공통 Event

* DeviceRegistered
* DeviceConnected
* TelemetryReceived
* EdgeInferenceCompleted
* FirmwareUpdated
* DeviceAlertTriggered
* DeviceDisconnected
* DeviceAudited

---

# 17. AI Integration

AI 플랫폼은 다음 AI 기능을 지원한다.

* Predictive Maintenance
* Edge AI Inference
* Device Health Prediction
* Sensor Anomaly Detection
* Asset Tracking Intelligence
* Resource Optimization
* Autonomous Device Recommendation
* Explainable Edge AI

AI는 승인 없이 Device Firmware를 자동 변경하거나 제어 명령을 무단 실행하지 않는다.

---

# 18. 성능 요구사항

* Device Authentication ≤ 500ms
* Telemetry 수집 ≤ 1초
* Edge AI Inference ≤ 500ms
* Device Command ≤ 1초
* Dashboard 조회 ≤ 2초
* Platform Availability ≥ 99.99%

---

# 19. Completion Criteria

다음 조건을 모두 만족해야 완료로 인정한다.

* Enterprise IoT Platform 구축
* Edge AI Platform 구현
* Device Management 구현
* Telemetry Platform 구현
* Intelligent Device Analytics 구현
* IoT Governance 구현
* Security 정책 적용
* Runtime 규칙 구현
* API/Event 구현
* Enterprise IoT & Edge Intelligence 구현

---

# AI Platform 진행 현황

완료된 문서

* Part 051 : Enterprise AI Platform Foundation Architecture
* Part 052 : Enterprise Machine Learning & MLOps Architecture
* Part 053 : Enterprise Generative AI, LLM & Prompt Engineering Architecture
* Part 054 : Enterprise AI Agent, Multi-Agent & Autonomous Workflow Architecture
* Part 055 : Enterprise Knowledge Graph, Vector Database & RAG Architecture
* Part 056 : Enterprise AI Governance, Responsible AI & Model Risk Management Architecture
* Part 057 : Enterprise AI Analytics, AI Observability & AI Operations Architecture
* Part 058 : Enterprise AI Decision Intelligence & Autonomous Business Architecture
* Part 059 : Enterprise Digital Twin, Simulation & Scenario Intelligence Architecture
* Part 060 : Enterprise Cognitive Enterprise, Hyperautomation & Autonomous Enterprise Architecture
* Part 061 : Enterprise IoT, Edge AI & Intelligent Device Platform Architecture

---

# 다음 Part

**MEA Part 062 — Enterprise Blockchain, Distributed Ledger & Smart Contract Architecture**

---

## ※ 원문 끝.
