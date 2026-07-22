# MEA Part 061 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 061 SPEC/ADR. ★부재증명 완료·과대주장 금지·**부재 축소 금지**·**뭉뚱그린 평가절하 금지**·정직 표기(**CCTV 카메라 Device 관리 실재 / Sensor·Telemetry·Edge AI 전무**).
> ★★**`WmsCctv` 스코프 전환(054·059 배제 → 061 편입)**: 054는 **`agent_version`≠AI Agent**, 059는 **비디오월≠Asset Twin**으로 배제했다. **본 Part(IoT/Device)에서는 CCTV 카메라가 정당한 Device 스코프**이므로 **편입**하되 **Device Management 축에만 한정**하고 **Edge AI·Telemetry·Predictive Maintenance로 확대 해석하지 않는다**(오흡수 경계 재설정·060 D-2 "스코프 분리" 표준 처리법 적용).
> **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## 전수조사 방법
① **형식 용어 grep(★단어경계 `\b`** · 범위=`backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src`, `i18n/**`·`*.json` 제외): `device_group`/`device_profile`/**`sensor_reading`**/**`edge_node`**/**`edge_model`**/**`device_command`**/`device_event`/`device_policy`/`device_status`/**`device_firmware`**/`device_analytics`/`device_audit`/`device_registry`/**`edge_inference`**/**`edge_ai`**/**`mqtt`**/**`coap`**/**`lorawan`**/**`zigbee`**/**`modbus`**/**`opcua`**/**`secure_boot`**/**`mutual_tls`**/**`predictive_maintenance`**/**`firmware`** = **전부 0**.
② **광의 히트 파일 단위 전수 분류**: `rtsp` 102 · `device` 81 · `onvif` 18 · `edge` 18 · `iot` 11 · `telemetry` 3 · `provisioning` 2 · `sensor` 1 · `time_series` 1 → 아래 ③.
③ **실 substrate 판독**: **`WmsCctv`**(`wms_cameras`:124~151·`wms_cctv_bridges`:152~166·PROTOCOLS:45·TOKEN_TTL:46·MAX_BYTES:47·IDLE_KILL:48·VENDORS:55~79·`vendors`:350·`listCameras`:364·`saveCamera`:384·`deleteCamera`:497·`session`:672·`keepalive`:722·`testCamera`:739·`hls`:811·`localSegment`:883·`segment`:902·`snapshot`:922·:966)·**`tools/cctv-bridge/bridge.js`**(ONVIF WS-Discovery:21·VERSION:36·pair:92·heartbeat:200~206)·`frontend/src/components/CctvPlayer.jsx`·`Wms`(창고)·`SystemMetrics`(057)·`Crypto`(049).

### ★동음이의 배제(오흡수 방지 — 본 Part 광의 히트 대부분 오탐)
| 히트 | 실체 | 판정 |
|---|---|---|
| **형식 IoT 프로토콜 0** | `mqtt`/`coap`/`lorawan`/`zigbee`/`modbus`/`opcua` **전부 0** | ★IoT 표준 프로토콜 **전무** |
| **`firmware` 0 · `secure_boot` 0 · `mutual_tls` 0** | 단어 자체 없음 | ★펌웨어·보안부팅·mTLS **전무** |
| **`iot` 11히트** | **전량 `ioTransferDest`(10)·`ioTypeLabel`(10)** = `WmsManager.jsx` **WMS 입출고 유형 i18n 키** | ★**완전 오탐**(`ioT`가 단어 안에 우연 포함) |
| **`edge` 18히트** | `GraphScore`(그래프 **edge** :18·:19·:23·:105·:137·:433)·`WebPush`(**브라우저 Edge** :163·:166)·`CctvPlayer.jsx`(:12 브라우저)·`graphScoreGuideI18n.js`(그래프) | ★**완전 오탐**(그래프 엣지·브라우저 이름) |
| **`sensor` 1히트** | `AIInsights.jsx`(:144) `t('aiInsights.connectedChannels', 'Sensors')` = **"연결 채널" UI 라벨** | ★**오탐**(라벨≠SENSOR 엔티티) |
| **`telemetry` 3히트** | `frontend/src/auth/plans.js`(:7·:156·:207) **주석 내 "telemetry 가능"** | ★**오탐**(057 확정과 동일·구현 0) |
| **`provisioning` 2히트** | `AuthPage.jsx`(:444) **SCIM provisioning(SSO 계정)** | ★오흡수 금지(계정 프로비저닝≠Device Provisioning) |
| **`time_series` 1히트** | `PixelTracking.php`(:879) **픽셀 이벤트 시계열** | ★오흡수 금지(마케팅 시계열≠Time-Series Storage) |
| `device` 81히트 | `Attribution.php`(12 **크로스디바이스 식별**·280차)·`Onsite`·`Reviews`·매뉴얼 템플릿 라벨·`WmsCctv`(2) | ★대부분 오흡수 금지(**크로스디바이스 어트리뷰션≠IoT Device**) |
| `rtsp` 102 · `onvif` 18 | **`WmsCctv` + `cctv-bridge` 실 substrate** | ★**본 Part 정당 스코프** |

## 실존 substrate (★CCTV 카메라 Device 축에 한정)

### A. DEVICE 레지스트리·프로파일 (§5·§8)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **DEVICE** | `wms_cameras`(tenant·**wh_id**·name·place·**vendor**·**protocol**·host·port·rtsp_port·channel·direct_url·**model**·info_json·active·sort_order·**source**·**bridge_id**) | `WmsCctv`(:124~151) | **PARTIAL-strong**(카메라 한정) |
| **DEVICE_PROFILE** | 벤더별 접속 프로파일(포트·RTSP/스냅샷 템플릿) — **ONVIF 표준 포함** | `WmsCctv::VENDORS`(:55~79·ONVIF :76~79)·`vendors`(:350) | PARTIAL |
| **DEVICE_GROUP** | 창고(`wh_id`) 단위 그룹·인덱스 | `WmsCctv`(:124~151 `idx_wms_cam_wh`) | PARTIAL-weak |
| **DEVICE_STATUS** | `active`·**`test_status`**·`test_message`·**`last_tested_at`** | `WmsCctv`(:124~151) | PARTIAL |
| **Device Registration** | 카메라 등록/수정 | `WmsCctv::saveCamera`(:384) | PARTIAL-strong |
| **Device Inventory** | 카메라 목록 | `WmsCctv::listCameras`(:364) | PARTIAL |
| **Remote Diagnostics** | 연결 테스트→상태·메시지 기록 | `WmsCctv::testCamera`(:739) | PARTIAL-strong |
| Retirement | 삭제 | `WmsCctv::deleteCamera`(:497) | PARTIAL-weak |
| 자격 암호화 | username/password TEXT + AES-256-GCM | `WmsCctv`(:124~151)·`Crypto`(049·274차) | PARTIAL-strong |

### B. EDGE_NODE(온프렘 브리지) — ★Edge Runtime 아님·정직 구분
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **온프렘 브리지 등록** | `wms_cctv_bridges`(name·place·**pair_code**·**token_hash**·**status**·**agent_version**·**discovered**·**last_seen_at**) | `WmsCctv`(:152~166) | PARTIAL |
| **Device Provisioning(페어링)** | pair_code로 브리지 페어링 + 버전 보고 | `tools/cctv-bridge/bridge.js`(:92 `/api/wms/cctv/bridge/pair`) | PARTIAL-strong |
| **Device Authentication** | token 발급·`token_hash` 저장·요청 시 토큰 | `WmsCctv`(:152~166)·`bridge.js`(:202) | PARTIAL-strong |
| **Device Health / Monitoring** | **heartbeat**(version+discovered 보고)·`last_seen_at` | `bridge.js`(:200~206)·`WmsCctv`(:152~166) | PARTIAL |
| **★Device Discovery** | **LAN WS-Discovery 프로브로 ONVIF 장비 자동발견**(모델/서비스주소) | `bridge.js`(:21)·`discovered` 컬럼(`WmsCctv`:152~166) | PARTIAL-strong |
| 에이전트 버전 | `VERSION = '1.0.0'` 보고 | `bridge.js`(:36)·`agent_version` | PARTIAL-weak |
| 온프렘 필요성(정직 기술) | 실장비가 표준 스트림 미노출 → LAN 내 RTSP/ONVIF만 노출 | `WmsCctv`(:966) | — |

### C. 스트림 릴레이·자원 통제 (★Telemetry 아님)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 프로토콜 지원 | rtsp/hls/snapshot/webrtc/iframe | `WmsCctv::PROTOCOLS`(:45) | PARTIAL |
| 세션·재생토큰 | 세션 발급·TTL 3600s·keepalive | `WmsCctv::session`(:672)·`keepalive`(:722)·`TOKEN_TTL`(:46) | PARTIAL-strong |
| **자원 폭주 방어** | 응답 상한 25MB·**무시청 90초 후 ffmpeg 종료** | `WmsCctv::MAX_BYTES`(:47)·`IDLE_KILL`(:48) | PARTIAL-strong |
| 스트림 전달 | HLS·세그먼트·스냅샷 | `WmsCctv::hls`(:811)·`localSegment`(:883)·`segment`(:902)·`snapshot`(:922) | PARTIAL |
| 프론트 플레이어 | hls.js 동적 import·Safari 네이티브 HLS | `CctvPlayer.jsx`(:12) | PARTIAL |

### D. 보안·감사 (상속)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Tenant Isolation | 전 테이블 tenant 키·인덱스 | `WmsCctv`(:124~166) | PARTIAL-strong |
| RBAC | 전역 writeGuard | `index.php`(056:72~75) | PARTIAL-strong |
| 자격 암호화 | AES-256-GCM | `Crypto`(049) | PARTIAL-strong |
| Audit Logging | 해시체인 정본 | `SecurityAudit`(056) | PARTIAL |
| SSRF 이중검증 | 274차 확정 | (274차) | PARTIAL |

## 부재(ABSENT — 부재증명 완료·grep 0)
★★**Edge AI 전 계층 부재**(§9 8항목 전량): **Edge Inference**·Edge Analytics·**Local Decision**·**Offline Operation**·**AI Model Distribution**·Edge Synchronization·Edge Monitoring·Edge Optimization(grep 0: `edge_ai`/`edge_inference`/`edge_model`/`edge_node`). ★**`tools/cctv-bridge`는 스트림 릴레이 에이전트이지 Edge Runtime/추론기가 아니다**(정직 표기·명세 §9 "네트워크 장애 시에도 독립 동작"은 **릴레이가 끊기면 조회 불가**이므로 미충족).
★**Telemetry Platform 전 계층 부재**(§10 8항목): **Sensor Collection**·**Event Streaming**·**Real-Time Telemetry**·**Time-Series Storage**·**Threshold Monitoring**·Alert Generation(디바이스)·Data Aggregation·Telemetry Analytics(★`telemetry` 3히트=주석·`sensor` 1히트=UI 라벨·`time_series` 1히트=픽셀 이벤트).
★**SENSOR·SENSOR_READING·TELEMETRY 엔티티**·**DEVICE_COMMAND**(제어 명령 부재·**조회 전용**)·**DEVICE_EVENT**·**DEVICE_POLICY**·**DEVICE_FIRMWARE**(grep 0)·**DEVICE_ANALYTICS**·**DEVICE_AUDIT**(전용).
★**Enterprise Device Registry**(§6 근간·★**058 Decision·059 Twin·060 Automation에 이은 Registry 부재 4연속**)·Enterprise IoT Platform·**Edge AI Platform**·**IoT Gateway**·Telemetry Platform·Device Monitoring Service(형식)·**IoT Governance Manager**·Device Analytics Dashboard·IoT Audit Service·Edge Intelligence Advisor.
★**§6 Domain 대부분**: **Smart Fleet·Smart Vehicle·Smart Logistics·Smart Asset·Smart Facility·Smart Environment·Edge AI·Device Intelligence·Enterprise IoT**(★Smart Warehouse는 **CCTV만** 부분).
★**§7 Lifecycle 미보유**: **Firmware Update**·형식 Configuration(원격)·Archive(★Registration/Provisioning/Authentication/Monitoring/Retirement는 부분 실재).
★**§8 미보유**: **Remote Configuration**(원격 설정 변경)·**Firmware Management**·형식 Device Health·형식 Device Group Management.
★**§11 Intelligent Device Analytics 전량**: Device Health Analysis·**Predictive Maintenance**·Usage Analytics·**Failure Prediction**·Device Performance·**Asset Tracking**·**Location Analytics**·Operational Dashboard(★"AI는 장비 이상을 **사전에 예측**할 수 있어야 한다" → **예측 계층 전무**).
★**§12 IoT Governance 전량**: Device/Firmware/Security/Communication/Update/Compliance **Policy 객체**·Lifecycle Validation·Audit Trail(전용).
★**§13 Security 미보유**: **Mutual TLS**·**Secure Boot**·**Firmware Integrity Validation**(★Device Authentication은 **브리지 토큰**으로 부분 실재·카메라 자체는 **user/pass 자격**이지 신뢰 기반 인증 아님).
★**§14 Runtime 미보유**: **Telemetry 수집**·**Edge AI 실행**·**Local Decision**·**Event 생성**·Cloud Synchronization(형식).
★**§15 API 미보유**: **Update Firmware**·**Execute Device Command**·**Query Telemetry**·**Query Edge Status**·Query Device Analytics/Audit(★Register Device≈`saveCamera`:384·Query Device Status≈`listCameras`:364/`testCamera`:739는 부분 실재).
★**§16 Event 표준 8종 전량**(DeviceRegistered/DeviceConnected/TelemetryReceived/EdgeInferenceCompleted/FirmwareUpdated/DeviceAlertTriggered/DeviceDisconnected/DeviceAudited).
★**§17 AI 8종 전량**: Predictive Maintenance·Edge AI Inference·Device Health Prediction·**Sensor Anomaly Detection**·Asset Tracking Intelligence·Resource Optimization·Autonomous Device Recommendation·Explainable Edge AI.
★**성능 SLA(§18)**: Device Auth ≤500ms·Telemetry ≤1s·Edge Inference ≤500ms·Device Command ≤1s·**99.99%**=측정 장치 부재(★057~060 규율: **"미달"이 아니라 "측정 기반 부재"**).

★**부수 관찰(신규 결함 주장 아님·재감사 금지)**: ⓐ **274차가 착수 전 자체 부재증명을 남겼다** — `WmsCctv`(:13) "착수 전 부재증명(CHANGE_GATE): `cctv|rtsp|nvr|onvif|m3u8|hls` 소스 전수 grep 매치 0건". **`CHANGE_GATE` 준수의 모범 사례**(상태 기술). ⓑ 274차 산출물은 **데모 검증·운영 미배포** 상태다([[project_n274_wms_cctv_bridge]]) — 본 Part는 상태 기술만. ⓒ 실장비(JWC/NETUS/이지피스 등)가 **표준 스트림을 노출하지 않아 브리지가 필수**라는 현장 제약이 코드 주석에 명시(:966)·정직 표기.

## 판정
**PARTIAL-weak (CCTV 카메라 도메인 Device Management는 실재 / ★Sensor·Telemetry·Edge AI·Firmware·Device Command·Predictive Maintenance = 전면 ABSENT).**
★**실재(정직 인정·평가절하 금지)**: **카메라 한 도메인에 한정되지만 Device Management 축은 실질적으로 동작한다** — **DEVICE 레지스트리**(`wms_cameras` vendor/protocol/host/port/model/bridge_id/active/test_status:124~151)·**DEVICE_PROFILE**(벤더별 접속 프로파일 + **ONVIF 표준** `VENDORS`:55~79)·**Device Registration/Inventory/Retirement**(`saveCamera`:384·`listCameras`:364·`deleteCamera`:497)·**Remote Diagnostics**(`testCamera`:739→`test_status`/`test_message`/`last_tested_at`)·**온프렘 브리지 EDGE_NODE 유사**(`wms_cctv_bridges` **pair_code·token_hash·status·agent_version·discovered·last_seen_at**:152~166)·**Device Provisioning(페어링)**(`bridge.js`:92)·**Device Authentication(토큰)**(:202)·**Device Health(heartbeat)**(:200~206)·**★Device Discovery(LAN WS-Discovery ONVIF 자동발견)**(:21)·**세션/재생토큰 TTL**(`session`:672·`keepalive`:722·`TOKEN_TTL`:46)·**자원 폭주 방어**(응답 25MB 상한:47·**무시청 90초 후 ffmpeg 종료**:48)·**자격 AES-256-GCM 암호화**(`Crypto` 049)·테넌트 격리·전역 writeGuard·SSRF 이중검증(274차).
★**부재(grep 0·부재증명 완료·축소 금지)**: ★★**Edge AI 전 계층**(§9 8항목·`edge_ai`/`edge_inference`/`edge_model`/`edge_node` 전부 0)·**Telemetry Platform 전 계층**(§10 8항목)·**SENSOR/SENSOR_READING/TELEMETRY/DEVICE_COMMAND/DEVICE_EVENT/DEVICE_POLICY/DEVICE_FIRMWARE/DEVICE_ANALYTICS/DEVICE_AUDIT 엔티티**·**Enterprise Device Registry**(§6 근간)·**IoT Gateway**·**IoT 표준 프로토콜 전무**(`mqtt`/`coap`/`lorawan`/`zigbee`/`modbus`/`opcua` 0)·**Firmware 전 계층**(`firmware` 0)·**Mutual TLS·Secure Boot·Firmware Integrity**·**§11 Intelligent Device Analytics 전량**(Predictive Maintenance·Failure Prediction·Asset/Location Analytics)·**§12 IoT Governance 전량**·**§16 Event 8종·§17 AI 8종**·성능 SLA.
★★**핵심 판별(정직 기술)**: **"IoT가 없다"가 아니라 "CCTV 카메라 한 종류의 Device 관리만 있고 Sensor·Telemetry·Edge AI는 없다"**이다. 현행은 **조회 전용 스트림 릴레이**이며 **제어 명령(DEVICE_COMMAND)·펌웨어·센서 수집이 전무**하다. 명세 §9 "Edge 환경은 **네트워크 장애 시에도 독립 동작**"은 **릴레이가 끊기면 조회 불가**이므로 미충족이고, §11 "AI는 **장비 이상을 사전에 예측**"은 예측 계층 자체가 없다.
★★**Registry 부재 4연속**: 058 Decision · 059 Twin · 060 Automation · **061 Device** — **같은 구조적 병리**.
★**오흡수 금지**: **`iot` 11히트=`ioTransferDest`/`ioTypeLabel` WMS 입출고 i18n 키 = 완전 오탐** · **`edge` 18히트=`GraphScore` 그래프 엣지 + `WebPush`/`CctvPlayer` 브라우저 Edge = 완전 오탐** · **`sensor` 1히트=`AIInsights.jsx`(:144) "Sensors" UI 라벨** · **`telemetry` 3히트=`plans.js` 주석**(057 확정) · **`provisioning` 2히트=SCIM SSO 계정 프로비저닝**≠Device Provisioning · **`time_series` 1히트=`PixelTracking` 픽셀 시계열** · **`device` 81 대부분=`Attribution` 크로스디바이스 식별(280차)·매뉴얼 라벨**≠IoT Device · **`tools/cctv-bridge`=스트림 릴레이 에이전트≠Edge Runtime/추론기** · **CCTV 스트림 릴레이≠Telemetry Platform** · `Wms` 창고 재고 테이블≠Smart Warehouse Device · `SystemMetrics`(057 플랫폼 관측)≠Device Monitoring · `connector_health`(데이터 커넥터)≠Device Health. 코드 변경 0.
