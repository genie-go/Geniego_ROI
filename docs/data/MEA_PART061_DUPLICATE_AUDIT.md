# MEA Part 061 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 목적 = IoT/Edge AI/Device 계층 신설이 기존 **`WmsCctv`**(카메라 레지스트리·브리지 페어링·토큰·발견·진단)·**`tools/cctv-bridge`**(온프렘 에이전트)·`Wms`(창고)·`SystemMetrics`(057 관측 정본)·`SecurityAudit`(056)·`Crypto`(049)·`api_key`(EPIC 06-A 비인간 identity)와 **중복 재정의하지 않도록** 경계 확정. ★헌법 V4. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★★**`WmsCctv` 스코프 전환**: 054(≠AI Agent)·059(≠Asset Twin) **배제** → **061에서 Device 축으로 편입**(060 D-2 "스코프 분리해 둘 다 참으로" 표준 처리법). **단 Device Management 축에만 한정**.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| **AI Agent(`agent_version` 배제)** | ★MEA Part 054(**`WmsCctv.agent_version`≠AI Agent** 확정) | ★**재판정 금지**(본 Part는 **Device 축으로만** 편입) |
| **Asset Twin(비디오월 배제)** | ★MEA Part 059(**CCTV 비디오월≠Asset Twin** 확정) | ★**재판정 금지** |
| GPU/클러스터/분산컴퓨팅 | ★MEA Part 051(**부재 확정**) | ★재판정 금지(Edge 추론=**인프라 선행 종속**) |
| **플랫폼 관측·메트릭** | ★MEA Part 057(`SystemMetrics` 정본) | ★재정의 금지(Device Monitoring은 그 위에) |
| AI Governance·감사 | ★MEA Part 056(`SecurityAudit` 정본) | ★재정의 금지(IoT Audit은 그 위에) |
| 자동화·워크플로 | ★MEA Part 054/060(`JourneyBuilder`·cron 36) | ★재정의 금지(Device 스케줄은 그 위에) |
| **비인간 identity** | ★EPIC 06-A Part3-6(**`api_key`가 유일**) | ★재정의 금지(**Device/Bridge 계정은 그 위에**) |
| 자격 암호화 | ★MEA Part 049(`Crypto` AES-256-GCM) | ★재정의 금지·재사용 |
| 가용성·SLA | ★MEA Part 044/045/050 | ★재정의 금지(99.99% 미보증 승계) |
| 테넌트·RBAC | ★MEA Part 047/048 | ★재정의 금지·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| **DEVICE** | `wms_cameras`(vendor·protocol·host·model·active·test_status) | `WmsCctv`(:124~151) | ★**재사용·승격**(중복 디바이스 테이블 금지) |
| **DEVICE_PROFILE** | 벤더 접속 프로파일(ONVIF 포함) | `WmsCctv::VENDORS`(:55~79) | ★재사용·확장 |
| **EDGE_NODE 유사** | `wms_cctv_bridges`(pair_code·token_hash·agent_version·discovered·last_seen_at) | `WmsCctv`(:152~166) | ★재사용·★**오흡수 금지**(릴레이 브리지≠Edge Runtime) |
| Device Provisioning | pair_code 페어링 | `bridge.js`(:92) | ★재사용(중복 페어링 금지) |
| Device Authentication | 토큰 발급·`token_hash` | `WmsCctv`(:152~166)·`bridge.js`(:202) | ★재사용·★오흡수 금지(브리지 토큰≠mTLS) |
| Device Health | heartbeat·`last_seen_at` | `bridge.js`(:200~206) | ★재사용 |
| **Device Discovery** | LAN WS-Discovery ONVIF 자동발견 | `bridge.js`(:21)·`discovered` | ★**재사용**(중복 발견기 금지) |
| Remote Diagnostics | 연결 테스트 | `WmsCctv::testCamera`(:739) | ★재사용 |
| Edge Runtime/추론 | Node 무의존 릴레이 에이전트 | `tools/cctv-bridge/bridge.js` | ★**오흡수 금지**(스트림 릴레이≠Edge AI) |
| Telemetry | 스트림 릴레이(HLS/세그먼트) | `WmsCctv`(:811·:902·:922) | ★**오흡수 금지**(영상 릴레이≠센서 텔레메트리) |
| TELEMETRY(용어) | `plans.js` 주석 "telemetry 가능" | `frontend/src/auth/plans.js`(:7·:156·:207) | ★**오탐**(057 확정) |
| SENSOR | "Sensors" UI 라벨 | `AIInsights.jsx`(:144) | ★**오탐** |
| EDGE | 그래프 엣지·브라우저 Edge | `GraphScore`(:18·:19·:23)·`WebPush`(:163·:166)·`CctvPlayer.jsx`(:12) | ★**완전 오탐** |
| IoT | `ioTransferDest`/`ioTypeLabel` | `WmsManager.jsx`(:751·:753) | ★**완전 오탐**(WMS 입출고 i18n 키) |
| Device Provisioning(계정) | SCIM SSO | `AuthPage.jsx`(:444) | ★오흡수 금지(계정≠장치) |
| Time-Series Storage | 픽셀 이벤트 시계열 | `PixelTracking`(:879) | ★오흡수 금지 |
| Device(어트리뷰션) | 크로스디바이스 식별 | `Attribution.php`(280차·12히트) | ★**오흡수 금지**(브라우저/단말 식별≠IoT Device) |
| Smart Warehouse | 창고 재고 8테이블 | `Wms`(060 확정) | ★오흡수 금지(재고 상태≠Device) |
| Device Monitoring | 플랫폼 메트릭 | `SystemMetrics`(057 정본) | ★재사용(중복 수집기 금지·057 D-1) |
| Device Health(커넥터) | `connector_health` | `Db`(057 확정) | ★오흡수 금지(데이터 커넥터≠장치) |
| Device Audit | 해시체인 | `SecurityAudit`(056 정본) | ★재사용(체인 정본 하나) |
| 자격 Vault | `Crypto` AES-256-GCM | (049·274차 적용) | ★재사용 |

## ★★신설 시 발생할 내부 중복 — 사전 차단
1. **Device 레지스트리 이원화 금지**: `wms_cameras`가 **이미 벤더·프로토콜·모델·상태를 가진 실 레지스트리**다. Enterprise Device Registry는 **새 테이블이 아니라 `wms_cameras`를 device_type 확장으로 일반화**하는 것이 1순위 검토(★058·059·060 Registry 처방과 동일 — **기존 위의 얇은 통합 계층**).
2. **브리지/에이전트 이원화 금지**: 페어링(pair_code)·토큰·heartbeat·발견이 **이미 `cctv-bridge`에 있다**. 새 Edge Agent를 만들면 **두 개의 온프렘 에이전트**가 되어 현장 설치·보안 표면이 이중화된다.
3. **Device identity 이원화 금지**: Device/Bridge 계정은 **`api_key` 위에**(EPIC 06-A Part3-6 확정·별도 계정 체계 금지)·자격은 **`Crypto` Vault**(049·중복 암호화 금지).
4. **관측 이원화 금지**: Device Monitoring은 **`SystemMetrics` 확장**(057 D-1·별도 수집기 금지).
5. **감사 이원화 금지**: DEVICE_AUDIT은 **`SecurityAudit` 확장**이되 **고빈도 텔레메트리는 체인 직접 유입 금지**(057 D-4·058 D-6·059 D-6·060 앵커링 승계).
6. **스케줄 이원화 금지**: Device 작업 스케줄은 **cron 36 재사용**(060 확정).

## ★교훈 반영
- ★★[[feedback_no_duplicate_features]]: 착수 전 grep 전수 완료. **카메라 Device 레지스트리·브리지 페어링·토큰·발견·진단이 실재** → **중복 신설 금지·기존 심화**. 헌법 V4.
- ★★[[reference_platform_growth_actas_tenant_hijack]]: Device 데이터는 **테넌트 격리 절대** — **카메라 자격(user/pass)·현장 IP·창고 배치**가 담겨 교차 노출 시 **물리 보안 침해**로 직결된다(다른 Part의 영업 기밀보다 위험도가 높다).
- ★★[[feedback_no_regression_value_unification]]: **자격 AES-256-GCM 암호화·재생토큰 TTL·무시청 90초 ffmpeg 종료·응답 25MB 상한·SSRF 이중검증**은 약화 시 즉시 회귀. 특히 **IDLE_KILL·MAX_BYTES는 서버 자원 폭주 방어**라 제거 시 장애 직결. **후퇴 금지 자산.**
- ★[[feedback_minimize_new_menus]]: Device Analytics Dashboard는 신규 사이드바가 아니라 **기존 WMS 메뉴**(`WmsManager.jsx`·비디오월) 편입 우선.
- ★★[[feedback_real_value_autoderive]]: Device Health·Predictive Maintenance 지표는 **실 heartbeat·test_status·last_seen_at 파생만**. ★**산출 불가 시 0이 아니라 null·명시적 사유**(057·058·059 **3연속 모범** 승계 — **0은 "정상"으로 오독**되어 **장비 장애를 은폐**한다·본 Part에서는 특히 위험).
- ★[[feedback_competitive_gap_verify]]: Edge AI·Telemetry·Firmware·IoT 프로토콜·Event 8종 부재=grep 0 부재증명 완료. **동시에 카메라 레지스트리·페어링·토큰 인증·ONVIF 자동발견·원격 진단은 실재분으로 인정**(뭉뚱그린 감점 금지).
- ★[[feedback_audit_reference_past_fixes]]: 274차 산출물은 **데모 검증·운영 미배포** 상태([[project_n274_wms_cctv_bridge]])·상태 기술만·재플래그 금지. ★**274차가 착수 전 자체 부재증명을 남긴 것**(`WmsCctv`:13)은 **`CHANGE_GATE` 준수 모범 사례**.
- ★[[reference_api_prefix_routing]]: 브리지 API는 **`/api/wms/cctv/bridge/*`**(`bridge.js`:92·:202)로 **이미 `/api` 접두 준수**. 신규 Device API도 동일 + **인증 필수 접두**.
- ★헌법 V5+[[feedback_deploy_approval_mandatory]]: **AI는 승인 없이 Device Firmware를 자동 변경하거나 제어 명령을 무단 실행 불가**(명세 §17)·배포 승인 필수.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- **승격(기존 확장)**: DEVICE=**`wms_cameras` device_type 일반화** · DEVICE_PROFILE=`VENDORS` 확장 · DEVICE_GROUP=`wh_id` 그룹 승격 · DEVICE_STATUS=`active`/`test_status`/`last_tested_at` · EDGE_NODE seed=`wms_cctv_bridges` · Provisioning=pair_code · Authentication=token_hash(+`api_key` 상속) · Health=heartbeat/`last_seen_at` · **Discovery=WS-Discovery ONVIF** · Diagnostics=`testCamera` · 자원 통제=`MAX_BYTES`/`IDLE_KILL` · 자격=`Crypto` Vault · Monitoring=`SystemMetrics`(057) · Audit=`SecurityAudit`(056) · 스케줄=cron 36 · 테넌트/RBAC=`Db`/`index.php`.
- **순신설(부재·grep 0)**: ★**Enterprise Device Registry**(§6 근간)·**IoT Gateway**·**Edge AI Platform 전량**(Inference·Analytics·Local Decision·Offline·Model Distribution·Sync·Monitoring·Optimization)·**Telemetry Platform 전량**(Sensor Collection·Event Streaming·Real-Time·**Time-Series Storage**·Threshold·Alert·Aggregation·Analytics)·**SENSOR/SENSOR_READING/TELEMETRY/DEVICE_COMMAND/DEVICE_EVENT/DEVICE_POLICY/DEVICE_FIRMWARE/DEVICE_ANALYTICS/DEVICE_AUDIT 엔티티**·**IoT 표준 프로토콜**(MQTT/CoAP/LoRaWAN/Zigbee/Modbus/OPC-UA)·**Firmware 전 계층**(Management·Update·Integrity Validation)·**Mutual TLS·Secure Boot**·**§11 Intelligent Device Analytics 전량**(Predictive Maintenance·Failure Prediction·Asset/Location Analytics)·**§12 IoT Governance 전량**·Remote Configuration·**API 6종·Event 8종**·§17 AI 8종.

## 판정
**중복 위험 中(카메라 Device 축은 실재·나머지 축은 오흡수 대상조차 없음) + ★신설 시 발생할 내부 중복 6종 사전 차단 + ★★`WmsCctv` 스코프 전환 명시.** ★핵심=**`WmsCctv`**(`wms_cameras` 레지스트리·`wms_cctv_bridges` 브리지·VENDORS 프로파일·세션/토큰·자원 통제)·**`tools/cctv-bridge`**(페어링·토큰·heartbeat·**ONVIF WS-Discovery**)·`Crypto`(049 Vault)·`api_key`(EPIC 06-A identity)·`SystemMetrics`(057)·`SecurityAudit`(056)·cron 36·`index.php`는 **재사용/승격**(★중복 디바이스 레지스트리·온프렘 에이전트·identity·관측·감사·스케줄 신설 절대 금지=헌법 V4). 헌법 V4/V5·Part 044/045/047/048/049/051/**054**/056/057/**059**/060·EPIC 06-A **재정의 금지·재판정 금지**. 본 Part 고유 순신설=★**Enterprise Device Registry**·**IoT Gateway**·**Edge AI 전량**·**Telemetry 전량**·엔티티 9종·**IoT 표준 프로토콜**·**Firmware 전 계층**·**mTLS·Secure Boot**·§11 Analytics 전량·§12 Governance 전량·API 6종·Event 8종뿐. ★★**본 Part의 성격**=**"IoT가 없다"가 아니라 "CCTV 카메라 한 종류의 Device 관리만 있고 Sensor·Telemetry·Edge AI는 없다"**. ★★**Registry 부재 4연속**(058 Decision·059 Twin·060 Automation·**061 Device**)=같은 구조적 병리·처방 동일. ★오흡수 금지(**`iot` 11=`ioTransferDest`/`ioTypeLabel` 완전 오탐** · **`edge` 18=그래프 엣지+브라우저 Edge 완전 오탐** · **`sensor` 1=UI 라벨** · **`telemetry` 3=주석** · `provisioning`=SCIM SSO · `time_series`=픽셀 시계열 · **`device` 81 대부분=크로스디바이스 어트리뷰션(280차)·매뉴얼 라벨** · **`cctv-bridge`=스트림 릴레이≠Edge Runtime/추론** · **영상 릴레이≠센서 텔레메트리** · `Wms` 재고≠Smart Warehouse Device · `SystemMetrics`≠Device Monitoring · `connector_health`≠Device Health). ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★AI의 Device Firmware 자동 변경·제어 명령 무단 실행 불가(V5+CHANGE_GATE).
