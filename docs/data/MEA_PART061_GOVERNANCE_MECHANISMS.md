# MEA Part 061 — Governance Mechanisms (§7~§17 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★**`WmsCctv`**(카메라 레지스트리·브리지·VENDORS 프로파일·세션·자원통제)·**`tools/cctv-bridge`**(페어링·토큰·heartbeat·ONVIF 발견)·`Crypto`(049 Vault)·`api_key`(EPIC 06-A identity)·`SystemMetrics`(057 관측 정본)·`SecurityAudit`(056 감사 정본)·cron 36·`index.php` 재사용(★중복 디바이스 레지스트리·온프렘 에이전트·identity·관측·감사 신설 절대 금지=헌법 V4)·**Edge AI/Telemetry/Firmware/IoT Governance 순신설**·오흡수 금지·과대주장 금지·**부재 축소 금지**·**★★마케팅 AI/dev AI KEEP_SEPARATE**.
> ★★**`WmsCctv` 스코프 전환**: 054(≠AI Agent)·059(≠Asset Twin) 배제 → **061에서 Device 축 편입**(060 D-2 표준 처리법)·**Device Management 축에만 한정**.

## §7 Device Lifecycle 거버넌스
Registration→Provisioning→Authentication→Configuration→Telemetry Collection→Edge Processing→Firmware Update→Monitoring→Retirement→Archive. 현행=**Registration**(`WmsCctv::saveCamera`:384)·**Provisioning 부분**(브리지 pair_code `bridge.js`:92)·**Authentication 부분**(토큰·`token_hash` `WmsCctv`:152~166·`bridge.js`:202)·**Configuration 부분**(접속 파라미터 저장·**원격 변경 부재**)·**Monitoring 부분**(heartbeat:200~206·`last_seen_at`)·**Retirement 부분**(`deleteCamera`:497). ★**Telemetry Collection·Edge Processing·Firmware Update·Archive**=순신설.
★★"모든 Device는 **Lifecycle 전 과정**을 관리한다" → **미충족**(6/10 부분·핵심 4단계 부재). ★**Lifecycle 확장 시 `wms_cameras`를 device_type 일반화**하는 것이 정본 경로(새 테이블 신설 금지·058~060 Registry 처방과 동일).

## §8 Device Management 거버넌스
Registration·Provisioning·Remote Configuration·Remote Diagnostics·Firmware Management·Device Inventory·Device Health·Device Group Management. 현행=**Registration**(:384)·**Provisioning**(페어링:92)·**Remote Diagnostics**(`testCamera`:739→`test_status`/`test_message`/`last_tested_at` 기록)·**Inventory**(`listCameras`:364)·**Health 부분**(heartbeat·`last_seen_at`)·**Group 부분**(`wh_id` 인덱스). ★**Remote Configuration·Firmware Management**=순신설.
★★**Device Discovery는 실재하나 명세 §8에 항목이 없다(정직 병기)**: `bridge.js`(:21)가 **LAN WS-Discovery 프로브로 ONVIF 장비를 자동발견**해 모델/서비스주소를 `discovered` 컬럼에 보고한다 — **명세보다 앞선 실재분**이므로 신설 시 **반드시 재사용**(중복 발견기 금지).
★**"모든 장치는 중앙 Device Manager에서 관리" → 카메라만 부분 충족**(다른 장치 종류 전무).

## §9 Edge AI Platform 거버넌스
Edge Inference·Analytics·Local Decision·Offline Operation·AI Model Distribution·Edge Synchronization·Edge Monitoring·Edge Optimization. 현행=**전무**(grep 0). ★전 항목 순신설.
★★**오흡수 금지(핵심)**: **`tools/cctv-bridge`는 스트림 릴레이 에이전트이지 Edge Runtime/추론기가 아니다** — LAN 내 RTSP를 서버로 중계할 뿐 **현장에서 분석·판단하지 않는다**(`WmsCctv`:966 주석: 실장비가 표준 스트림 미노출 → LAN 내 RTSP/ONVIF만 노출되므로 브리지가 필수). 054가 `agent_version`≠AI Agent로, 059가 비디오월≠Asset Twin으로 배제한 것과 **동일 계열의 경계**다.
★★**§9 미충족 정직 기술**: "Edge 환경은 **네트워크 장애 시에도 독립적으로 동작**할 수 있어야 한다" → **릴레이가 끊기면 조회 자체가 불가**하므로 미충족.
★**Edge 추론 도입 시 제약**: **GPU/연산 인프라 선행 종속**(051 GPU/클러스터 부재 확정) — **"미구현"이 아니라 "인프라 선행 종속"**으로 기술한다(판정 어witness 4종). 현장 PC 사양·전력·네트워크가 선행 검토 대상이며, 모델 배포(AI Model Distribution)는 **053 Gateway·052 Model Registry 부재**를 함께 해결해야 성립한다.

## §10 Telemetry Platform 거버넌스
Sensor Collection·Event Streaming·Real-Time Telemetry·Time-Series Storage·Threshold Monitoring·Alert Generation·Data Aggregation·Telemetry Analytics. 현행=**전무**. ★전 항목 순신설.
★★**오흡수 금지**: **영상 스트림 릴레이**(`hls`:811·`localSegment`:883·`segment`:902·`snapshot`:922)**≠센서 텔레메트리** · **`telemetry` 3히트=`frontend/src/auth/plans.js`(:7·:156·:207) 주석 "telemetry 가능"**(057 확정·구현 0) · **`time_series` 1히트=`PixelTracking`(:879) 픽셀 이벤트 시계열** · **`sensor` 1히트=`AIInsights.jsx`(:144) "Sensors" UI 라벨**.
★"모든 Telemetry 데이터는 **실시간 처리**" → **수집 대상 자체가 없어 성립 불가**(**"미구현"이 아니라 선행 개념 부재**·059 D-1 어휘 승계).
★**Time-Series Storage 도입 시 제약**: 고빈도 데이터는 **단일호스트 디스크·CPU 제약**을 받는다(044/045/050 승계)·**보존 정책 선행 필수**(059 D-5 `po_simulations` 무한 누적 교훈 승계).

## §11 Intelligent Device Analytics 거버넌스
Device Health Analysis·Predictive Maintenance·Usage Analytics·Failure Prediction·Device Performance·Asset Tracking·Location Analytics·Operational Dashboard. 현행=**전무**. ★전 항목 순신설.
★★"AI는 **장비 이상을 사전에 예측**할 수 있어야 한다" → **예측 계층 전무**. `test_status`(`WmsCctv`:124~151)는 **수동 연결 테스트 결과**이지 예측이 아니다(정직 표기·과대주장 금지).
★★**지표 설계 제약**: Device Health·Predictive Maintenance 지표는 **실 heartbeat·`test_status`·`last_seen_at` 파생만** 허용([[feedback_real_value_autoderive]]). ★**산출 불가 시 0이 아니라 null·명시적 사유** — ★057 `SystemMetrics` null·058 `Mmm` `optimized:false`·059 `PriceOpt` null/422 = **3연속 모범** 승계. **본 Part에서는 특히 위험**: **장비 헬스 0%를 "정상"으로 오독하면 물리 장애를 은폐**한다.

## §12 IoT Governance
Device/Firmware/Security/Communication/Update/Compliance Policy·Lifecycle Validation·Audit Trail. 현행=**전무**(정책 객체 0)·단 **접근 통제 seed 실재**(테넌트 격리 `WmsCctv`:124~166·전역 writeGuard `index.php` 056:72~75). ★**Policy 객체 6종·Lifecycle Validation·Device 전용 Audit Trail**=순신설.
★**정책 원문 재정의 금지**(056 D-1 승계): 헌법 V5·`CHANGE_GATE`가 규범 정본이며 Device Policy는 이를 **기계 집행**할 뿐 새 규범을 만들지 않는다.

## §13 Data Security 거버넌스
Device Authentication·Mutual TLS·RBAC·Secure Boot·Firmware Integrity Validation·Audit Logging. 현행=**Device Authentication 부분**(브리지 **토큰 발급·`token_hash` 저장**·요청 시 토큰 `WmsCctv`:152~166·`bridge.js`:202 — ★**카메라 자체는 user/pass 자격**)·**RBAC**(전역 writeGuard 056:72~75)·**자격 암호화**(`Crypto` AES-256-GCM 049·274차)·**Audit Logging 부분**(`SecurityAudit` 056)·**SSRF 이중검증**(274차). ★**Mutual TLS·Secure Boot·Firmware Integrity Validation**=순신설(grep 0).
★★"모든 Device는 **신뢰 기반 인증**을 수행해야 한다" → **부분 미충족**: 브리지는 토큰 기반이나 **카메라는 평문 프로토콜 자격**이고 **mTLS가 없다**.
★★**테넌트 격리 절대(본 Part 최고 위험도)**: Device 데이터에는 **카메라 자격(user/pass)·현장 IP·창고 배치**가 담긴다 — 교차 노출 시 **물리 보안 침해**로 직결되며, **다른 Part의 영업 기밀보다 위험도가 높다**([[reference_platform_growth_actas_tenant_hijack]]). ★**Device identity는 `api_key` 위에**(EPIC 06-A Part3-6 확정·별도 계정 체계 신설 금지)·자격은 **`Crypto` Vault**(중복 암호화 금지).
★**DEVICE_AUDIT**은 **`SecurityAudit` 확장**이되 **고빈도 텔레메트리를 체인에 직접 넣지 말 것**(체인 붕괴·057 D-4·058 D-6·059 D-6·060 **앵커링** 승계).

## §14 Runtime 규칙 거버넌스
Device Authentication·Telemetry 수집·Edge AI 실행·Local Decision·Event 생성·Cloud Synchronization·Audit 기록. 현행=**Device Authentication 부분**(토큰 검증)·**Cloud Synchronization 부분**(heartbeat·`discovered` 보고 `bridge.js`:200~206)·**Audit 기록 부분**. ★**Telemetry 수집·Edge AI 실행·Local Decision·Event 생성**=순신설.
★★**실재 자원 통제(후퇴 금지 자산)**: 응답 상한 **25MB**(`MAX_BYTES` `WmsCctv`:47)·**무시청 90초 후 ffmpeg 종료**(`IDLE_KILL`:48)·재생토큰 **TTL 3600s**(`TOKEN_TTL`:46)·세션/keepalive(`session`:672·`keepalive`:722). ★이들은 **서버 자원 폭주 방어**이므로 **제거·완화 시 장애 직결**이다(특히 `IDLE_KILL`이 없으면 ffmpeg 프로세스가 무한 누적).
★**성능(§18)**: Device Auth ≤500ms·Telemetry ≤1s·Edge Inference ≤500ms·Device Command ≤1s·99.99%는 **측정 장치 부재** → **"미달"이 아니라 "측정 기반 부재"**(057~060 규율). 계측은 **`SystemMetrics` 확장**(057 D-1·별도 수집기 금지).

## §15 API 거버넌스 (8)
Register Device·Update Firmware·Query Device Status·Execute Device Command·Query Telemetry·Query Edge Status·Query Device Analytics·Query Device Audit. 현행=**Register Device**≈`saveCamera`(:384)·**Query Device Status**≈`listCameras`(:364)/`testCamera`(:739)·브리지 API(`/api/wms/cctv/bridge/pair`·`/heartbeat` `bridge.js`:92·:202). ★나머지 6종=순신설.
★**`/api` 접두 이미 준수**(브리지 API)는 좋은 선례이며 신규 Device API도 **`/api` 변형 동시 등재**([[reference_api_prefix_routing]]) + **인증 필수 접두**(카메라 자격·현장 IP 노출 방지·053 D-5·057 D-7·058 D-6·059 D-6·060 승계).
★★**Execute Device Command 도입 시 최우선 제약**: **물리 제어는 소프트웨어 액션보다 위험이 크다** — PTZ·재부팅·설정 변경은 **승인 게이트(`agent_mode`·2인 정족수) 경유 필수**이며 **킬스위치 종속**이어야 한다(§17 참조).

## §16 Event 거버넌스 (8)
DeviceRegistered·DeviceConnected·TelemetryReceived·EdgeInferenceCompleted·FirmwareUpdated·DeviceAlertTriggered·DeviceDisconnected·DeviceAudited. 현행=DeviceConnected/Disconnected 유사=`last_seen_at` heartbeat 갱신(**이벤트 아님**). ★**Event 표준 8종 전부 순신설**(★DB 갱신≠이벤트 버스 오흡수 금지·Part 046/057 정합).

## §17 AI Integration 거버넌스
Predictive Maintenance·Edge AI Inference·Device Health Prediction·Sensor Anomaly Detection·Asset Tracking Intelligence·Resource Optimization·Autonomous Device Recommendation·Explainable Edge AI. 현행=**전무**. ★전 항목 순신설(Edge 추론은 **인프라 선행 종속**·051).
★★명세 §17 말미 **"AI는 승인 없이 Device Firmware를 자동 변경하거나 제어 명령을 무단 실행하지 않는다" → 현행이 구조적으로 충족**: ⓐ**Firmware 개념 자체가 없다**(`firmware` grep 0 — 변경 대상 부재) ⓑ**제어 명령(DEVICE_COMMAND)이 없다** — 현행은 **조회 전용 스트림 릴레이**이며 카메라를 제어하지 않는다 ⓒAI가 Device에 접근하는 경로 자체가 없다 ⓓ파괴적 액션은 **제안-only+HITL**(054 D-2)·기본값 **approval**(fail-safe).
★★**후퇴 금지 + 최고 수위 게이트**: 향후 **PTZ 제어·펌웨어 OTA·자동 재부팅**을 도입한다면 **승인 게이트를 반드시 앞에 둔다**([[feedback_deploy_approval_mandatory]]). ★**물리 장치 제어는 오작동이 물리 세계에 즉시 반영**되므로 **058(의사결정)·059(시뮬레이션)·060(프로세스)보다 더 엄격한 게이트**를 적용한다 — 승인 정족수·킬스위치·롤백 경로·작업 창(maintenance window)까지 함께 설계할 것.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★**실 Device 거버넌스**=**카메라 레지스트리**(`wms_cameras` vendor/protocol/model/active/test_status:124~151)+**벤더 프로파일**(ONVIF 포함 `VENDORS`:55~79)+**Registration/Inventory/Retirement/Diagnostics**(:384·:364·:497·:739)+**온프렘 브리지**(`wms_cctv_bridges` pair_code/token_hash/status/agent_version/discovered/last_seen_at:152~166)+**페어링·토큰 인증·heartbeat**(`bridge.js`:92·:202·:200~206)+**★LAN WS-Discovery ONVIF 자동발견**(:21)+**세션/재생토큰 TTL**(:46·:672·:722)+**자원 폭주 방어**(25MB:47·**무시청 90초 ffmpeg 종료**:48)+**자격 AES-256-GCM**(`Crypto` 049)+**테넌트 격리·전역 writeGuard·SSRF 이중검증**=**후퇴 금지 자산**. ★**Enterprise Device Registry**(§6 근간)·**IoT Gateway**·**Edge AI Platform 전량**·**Telemetry Platform 전량**·**§11 Analytics 전량**·**§12 Governance 전량**·SENSOR/SENSOR_READING/TELEMETRY/DEVICE_COMMAND/DEVICE_EVENT/DEVICE_POLICY/DEVICE_FIRMWARE/DEVICE_ANALYTICS 엔티티·**IoT 표준 프로토콜**(MQTT/CoAP/LoRaWAN/Zigbee/Modbus/OPC-UA)·**Firmware 전 계층**·**mTLS·Secure Boot**·Remote Configuration·**API 6종·Event 8종**·**§17 AI 8종**·성능 SLA**=순신설**(부재·grep 0·부재증명 완료·Edge 추론은 **GPU/연산 인프라 선행 종속**·051). ★★**본 Part의 성격**=**"IoT가 없다"가 아니라 "CCTV 카메라 한 종류의 Device 관리만 있고 Sensor·Telemetry·Edge AI는 없다"**. ★★**Registry 부재 4연속**(058 Decision·059 Twin·060 Automation·**061 Device**)=**같은 구조적 병리**·처방 동일(**기존 위의 얇은 통합 계층**·`wms_cameras` device_type 일반화). ★★**설계 제약**=ⓐ**Device 레지스트리 이원화 금지**(`wms_cameras` 일반화) ⓑ**온프렘 에이전트 이원화 금지**(`cctv-bridge` 재사용·두 에이전트=현장 설치·보안 표면 이중화) ⓒ**Device identity는 `api_key` 위에**·자격은 `Crypto` Vault ⓓ**관측=`SystemMetrics`·감사=`SecurityAudit`**(고빈도 텔레메트리는 앵커링) ⓔ**Device Discovery는 기존 WS-Discovery 재사용**(명세보다 앞선 실재분) ⓕ**지표는 실 heartbeat/test_status 파생만·산출 불가 시 0 아닌 null·사유**(★**장비 헬스 0%를 "정상"으로 오독하면 물리 장애 은폐**) ⓖ**Time-Series 도입 시 보존 정책 선행**(단일호스트 제약·059 D-5 교훈) ⓗ**테넌트 격리 절대**(카메라 자격·현장 IP·창고 배치=**물리 보안 직결·본 Part 최고 위험도**) ⓘ**Execute Device Command·Firmware OTA는 승인 게이트+킬스위치+롤백+작업창 필수**(물리 제어는 오작동이 물리 세계에 즉시 반영·058~060보다 엄격히). ★오흡수 금지(**`iot` 11=`ioTransferDest`/`ioTypeLabel` 완전 오탐**·**`edge` 18=그래프 엣지+브라우저 Edge 완전 오탐**·**`sensor` 1=UI 라벨**·**`telemetry` 3=주석**·`provisioning`=SCIM SSO·`time_series`=픽셀 시계열·**`device` 81 대부분=크로스디바이스 어트리뷰션(280차)**·**`cctv-bridge`=스트림 릴레이≠Edge Runtime/추론**·**영상 릴레이≠센서 텔레메트리**·`Wms` 재고≠Smart Warehouse Device·`SystemMetrics`≠Device Monitoring·`connector_health`≠Device Health·**`agent_version`≠AI Agent**(054 유지)·**비디오월≠Asset Twin**(059 유지)). 헌법 Volume 4/5·Part 044/045/047/048/049/051/**054**/056/057/**059**/060·EPIC 06-A 상속·**재판정 금지**·재감사 금지(274차 데모검증·운영 미배포 상태 기술만)·★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★AI의 Device Firmware 자동 변경·제어 명령 무단 실행 불가(V5+CHANGE_GATE).
