# GeniegoROI Claude Code Implementation Specification

# CCIS Part039 — Robotics, Warehouse Automation & Autonomous Logistics Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Robotics·Warehouse Automation·WCS·Autonomous Logistics 표준을 수립한다.

> ★**성격(스코프 분리 — "WMS 소프트웨어" 실재 vs "WCS/로보틱스 하드웨어" 사업범위 밖)**: 이 저장소는 **마케팅/
> 커머스 ROI SaaS**이지 **로봇 제어/자동화 설비 시스템이 아니다**. 명세가 다루는 **WCS(Warehouse Control
> System)·Robotics Fleet·AGV/AMR·SLAM·Conveyor·PLC(Modbus/OPC UA/EtherNet-IP)·Robot Task Scheduling·Vision
> AI Picking·Robot Telemetry·Collision Avoidance·Charging·Autonomous Logistics·Warehouse Digital Twin**은
> 이 제품의 **사업 범위 밖(out of scope)**이라 **부재**한다(grep 0·MEA 061 Device weak·MEA 059 Digital Twin
> weak). ★결함이 아니라 정직한 비적용(MEA 064 "out of scope"·Part035~038 어휘 재적용). ★**실재 축(WMS 관리
> 소프트웨어)**: **`Wms`**(205차·창고 관리 SW·**재고/입고/피킹리스트/패킹/출고/재고실사/자동발주/LOT**·7
> 엔티티 `wms_warehouses`/`carriers`/`permissions`/`movements`/`picking`/`supply_orders`/`lots`·테넌트 격리·
> 택배사 키 AES-256-GCM)·**`WmsCctv`**(카메라·Part037)·**바코드 웹캠**(getUserMedia·프론트)·**`RuleEngine`/
> `SupplyChain`**(재고↓→**발주(reorder)** 자동화·Part032) 는 실재한다. ★핵심 구분: **`Wms`=재고 관리
> 소프트웨어이지 로봇/WCS 제어가 아니다**. Part001 §4 에 따라 실측 → 로보틱스/WCS 사업범위 밖 증명 → `Wms`
> 소프트웨어 성문화했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 창고 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Robotics Architecture | ERP→WMS→WCS→Fleet→Robot→PLC | **부분(WMS만)** — `Wms`(재고 관리). WCS→Fleet→Robot→PLC 하드웨어 계층 부재 |
| WMS(재고/입고/피킹/출고) | 물류 업무 관리 | ★**실재** — `Wms`(205차·inventory/receiving/**picking list**/packing/shipping/cycle count·7 엔티티) |
| WCS(로봇/컨베이어/PLC 제어) | 장비 제어 | **부재(out of scope)** — 장비 제어 없음(로봇/컨베이어/PLC 없음) |
| Robotics Fleet Management | Robot ID/Battery/Position | **부재(out of scope)** — 로봇 Fleet 없음 |
| AGV(고정경로/QR/자기유도) | 고정경로 운행 | **부재(out of scope)** — AGV 없음 |
| AMR(SLAM/동적경로) | 실시간 경로 | **부재(out of scope)** — AMR/SLAM 없음 |
| Robot Task Scheduling | Pick/Move/Charge Task | **부분(대응물)** — `Wms` 피킹리스트(사람 작업)·`RuleEngine`(재고↓→발주). 로봇 태스크 아님 |
| Picking Automation | Robot/Vision Picking | **부분(SW)** — `wms_picking`(피킹리스트·**사람** 작업). 로봇 피킹 아님 |
| Conveyor Integration | Start/Stop/Jam | **부재(out of scope)** — 컨베이어 없음 |
| PLC Integration | OPC UA/Modbus/EtherNet-IP | **부재(out of scope)** — PLC 연계 없음 |
| Vision AI Integration | Barcode/Object/Damage | **부분(웹캠)** — 바코드 웹캠(getUserMedia·프론트 스캔). 로봇 Vision AI 아님 |
| Robot Telemetry(시계열) | Position/Battery/Error | **부재(out of scope)** — 로봇 텔레메트리 없음 |
| Collision Avoidance | Safety Zone/E-Stop | **부재(out of scope)** — 충돌회피 없음(로봇 없음) |
| Charging Management | Auto Charging/Battery | **부재(out of scope)** — 충전 관리 없음 |
| Autonomous Logistics | 자율 디스패치/AI 최적화 | **부재(out of scope)** — 자율 물류 없음. 발주=`RuleEngine`/`SupplyChain`(규칙 기반) |
| Warehouse Digital Twin | Layout/Robot/Dock 트윈 | **부재(out of scope)** — Digital Twin 없음(MEA 059 weak) |
| Monitoring | Fleet/Task/Collision/PLC | **부분** — `Wms` 재고/입출고 상태·`WmsCctv`. 로봇/PLC 지표 대상 없음 |
| Logging | Robot/Task/Warehouse ID | **부분** — `wms_movements`(입출고 이력)·`SecurityAudit`. Robot 로그 대상 없음 |
| Security(Robot Auth/mTLS/Command) | 로봇 명령 권한 | ★**부분 준수(WMS)** — `Wms` RBAC·`wms_permissions`·테넌트 격리·택배사 키 AES. 로봇 명령 대상 없음 |
| Compliance(ISO 3691-4/10218) | 산업 로봇 안전 | **부재(out of scope)** — 로봇 안전 인증 대상 아님 |
| Disaster Recovery | Fleet/WCS/PLC 복구 | **부분** — `Wms` DB 백업·재고 대사(`reconcileChannelStock`). 로봇/WCS 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Safety First/Robot First/Real-time Control/Fleet Optimized/Autonomous/Edge Connected) | **부분(WMS축)** | ★Observable Warehouse(`Wms`)·Event Driven(`RuleEngine`)·Tenant Isolated. Robot First/Autonomous/Fleet=out of scope |
| §4 Robotics Architecture | **부분(WMS만)** | `Wms`(재고). WCS→Robot→PLC 계층 부재 |
| §5 WMS | **★실재** | `Wms`(205차·재고/입고/피킹/출고/재고실사/자동발주/LOT·7 엔티티) |
| §6 WCS | **부재(out of scope)** | 장비 제어 없음 |
| §7 Robotics Fleet | **부재(out of scope)** | 로봇 Fleet 없음 |
| §8~§9 AGV/AMR | **부재(out of scope)** | AGV/AMR/SLAM 없음 |
| §10 Robot Task Scheduling | **부분(대응물)** | `Wms` 피킹리스트(사람)·`RuleEngine`(발주). 로봇 태스크 아님 |
| §11 Picking Automation | **부분(SW)** | `wms_picking`(사람 피킹리스트). 로봇 피킹 아님 |
| §12~§13 Conveyor/PLC | **부재(out of scope)** | 컨베이어/PLC 없음 |
| §14 Vision AI | **부분(웹캠)** | 바코드 웹캠(프론트 스캔). 로봇 Vision 아님 |
| §15 Robot Telemetry | **부재(out of scope)** | 로봇 텔레메트리 없음 |
| §16 Collision Avoidance | **부재(out of scope)** | 충돌회피 없음 |
| §17 Charging | **부재(out of scope)** | 충전 관리 없음 |
| §18 Autonomous Logistics | **부재(out of scope)** | 자율 물류 없음. 발주=`RuleEngine`/`SupplyChain` 규칙 |
| §19 Warehouse Digital Twin | **부재(out of scope)** | Digital Twin 없음(MEA 059 weak) |
| §20 Monitoring | **부분** | `Wms` 재고/입출고·`WmsCctv`. 로봇/PLC 대상 없음 |
| §21 Logging | **부분** | `wms_movements`·`SecurityAudit` |
| §22 Security | **부분 준수(WMS)** | `Wms` RBAC·`wms_permissions`·택배사 키 AES·테넌트 격리 |
| §23 Compliance | **부재(out of scope)** | ISO 3691-4/10218 로봇 안전 대상 아님 |
| §24 Disaster Recovery | **부분** | `Wms` 백업·재고 대사. 로봇/WCS 대상 없음 |
| §25~§26 PHP/Claude(Fleet Manager/WCS/PLC/Vision Adapter) | **부분** | ★`Wms`·`WmsCctv`·`RuleEngine`. Fleet/WCS/PLC/Vision Adapter=out of scope |
| §27~§28 검증(fleet:status/plc:health/wcs:health) | **대상 없음** | artisan 없음·로봇 없음. `Wms` API·`reconcileChannelStock` 로 대체 |

---

## 4. 확립된 표준 (신규 창고 코드가 따를 정본)

- ★**창고 관리 정본 = `Wms`**(205차·7 엔티티). 신규 창고 기능은 이 핸들러 확장(중복 신설 금지). 재고 SSOT=`ChannelSync`(inventory)·`wms_movements`(입출고 이력). ★**`wh_id='default'` 폴백이 재고 SSOT 분산 원인**(286차)·**재고 필드=`prdSelQty`(11번가)/`prdSelQty` 채널별 확인**.
- ★**피킹/발주 = SW(사람) + 규칙 자동화**: `wms_picking`(피킹리스트·사람 작업)·`RuleEngine`/`SupplyChain`(재고↓→**발주(reorder)** 자동화·Part032). 로봇 피킹/자율 물류 아님.
- ★**바코드 스캔 = 웹캠(getUserMedia·프론트)**. 로봇 Vision AI 아님. 신규 스캔은 이 방식 재사용.
- ★**카메라 = `WmsCctv`**(Part037·Device 축·Crypto fail-closed·SSRF 재검증). 로봇 텔레메트리 아님.
- ★**보안·정직**: `Wms` RBAC·`wms_permissions`·테넌트 격리(위조 X-Tenant-Id 무시)·택배사 키 AES-256-GCM·재고 대사(`reconcileChannelStock`). 가짜값 금지(288차 정산 zero-out)·정직 미산출.
- ★**사업범위 원칙**: **로봇/WCS/PLC/AGV/AMR/Conveyor/Digital Twin 은 이 제품 범위 밖** — 요구·제품결정 전 선이식 금지. WMS 관리 소프트웨어만 확장한다.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — WMS SW 외 전부 out of scope)

1. **WCS(Warehouse Control System)·Robotics Fleet·AGV/AMR/SLAM** — 안 함. **사업 범위 밖**(로봇 제어 시스템 아님·마케팅/커머스 ROI SaaS). `Wms`=재고 관리 SW이지 로봇 제어 아님.
2. **PLC 연계(OPC UA/Modbus/EtherNet-IP)·Conveyor·Robot Telemetry·Collision Avoidance·Charging** — 안 함. **사업 범위 밖**(자동화 설비 하드웨어 없음).
3. **Autonomous Logistics(자율 디스패치/AI 최적화)·Warehouse Digital Twin** — 안 함. **사업 범위 밖**(MEA 059 weak). 발주=`RuleEngine`/`SupplyChain` 규칙 기반이지 자율 물류 아님.
4. **Vision AI(로봇 Object/Damage Detection)** — 부분. 바코드 웹캠(getUserMedia·프론트)이 대응물이지 로봇 Vision 아님.
5. **로봇 안전 인증(ISO 3691-4/ISO 10218/IEC 62443)** — 안 함. 로봇 대상 없음. `Wms` RBAC/테넌트 격리/AES 는 SW 보안.
6. **artisan `fleet:*`/`plc:*`/`wcs:*` 명령** — 없음(Slim·로봇 없음). `Wms` API·`reconcileChannelStock` 로 대체.

★**준수하는 실 원칙(WMS SW)**: **`Wms`(재고/입출고/피킹/발주/LOT·7 엔티티)·재고 SSOT(ChannelSync·wms_movements·`wh_id` 폴백 주의)·규칙 기반 발주(RuleEngine/SupplyChain)·바코드 웹캠·`WmsCctv` 카메라·RBAC/테넌트 격리·택배사 키 AES·재고 대사·정직 미산출**. ★**out of scope 정직 선언**: 로봇/WCS/PLC/AGV/AMR/Digital Twin 은 이 제품 범위 밖이며 부재는 결함이 아니다.

---

## 6. Claude Code 구현 규칙

1. 창고 기능=`Wms`(205차·7 엔티티) 확장(중복 신설 금지). 재고 SSOT=`ChannelSync`/`wms_movements`. ★`wh_id='default'` 폴백 주의(재고 SSOT 분산·286차).
2. 피킹=`wms_picking`(사람 리스트)·발주=`RuleEngine`/`SupplyChain`(재고↓→reorder). 로봇 태스크/자율 물류 신설 금지.
3. 바코드=웹캠(getUserMedia·프론트). 카메라=`WmsCctv`(Part037). 로봇 Vision/텔레메트리 신설 금지.
4. ★`Wms` RBAC·`wms_permissions`·테넌트 격리(위조 X-Tenant-Id 무시)·택배사 키 AES-256-GCM·재고 대사·가짜값 금지(288차).
5. ★**WCS/PLC/AGV/AMR/Conveyor/Robot Fleet/Digital Twin 을 선이식하지 않는다** — 사업 범위 밖(요구·제품결정 선행). `Wms`=재고 SW이지 로봇 제어 아님.
6. Robotics/자율 물류/PLC 프로토콜을 "명세에 있다"는 이유로 이식하지 않는다(`Wms`+`RuleEngine`+`WmsCctv` 로 커버).

---

## 7. Completion Criteria

- [x] 창고 스택 **실측**(WCS/Robot/AGV/AMR/PLC/Conveyor/Digital Twin 부재·`Wms` 7 엔티티·`RuleEngine` 발주·`WmsCctv`·바코드 웹캠 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(로보틱스/WCS/PLC **out of scope** 증명·WMS 소프트웨어 실재)
- [x] 실 창고(Wms+RuleEngine reorder+WmsCctv+바코드 웹캠) 성문화(§4)
- [x] ★`Wms`=재고 SW(로봇 제어 아님)·재고 SSOT(wh_id 폴백 주의)·규칙 발주·RBAC/테넌트 격리·**out of scope 정직 선언** 명시
- [x] 의도적 미적용 + 사유(§5) — WCS/Robot/AGV/AMR/PLC/Conveyor/Autonomous/Digital Twin(WMS SW 외 전부 out of scope)
- [x] Claude Code 규칙(§6) · `Wms`·`RuleEngine`·`WmsCctv`·`reconcileChannelStock` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **WMS 관리 소프트웨어**(`Wms` 재고/입출고/피킹/발주/LOT +
> `RuleEngine` 규칙 발주 + `WmsCctv` 카메라 + 바코드 웹캠)의 성문화이지 로보틱스/WCS/PLC/AGV/AMR/Digital Twin
> 이식이 아니다. ★핵심 구분: **`Wms`=재고 관리 소프트웨어이지 로봇 제어가 아니다**. ★**out of scope 정직
> 선언(MEA 064 어휘)**: 로봇/자동화 설비 하드웨어는 이 마케팅/커머스 SaaS 의 **사업 범위 밖**이며 부재는
> 결함이 아니다.

---

## 다음 Part

**CCIS Part040 — Enterprise Security Operations (SecOps), SOC, SIEM & Threat Intelligence** — ★사전 실측 예고: 형식 SOC/SOAR/UEBA/EDR/XDR/MITRE ATT&CK 도구는 **부재/부분**이나, 보안운영 실체는 **`SecurityAudit`(tamper-evident 해시체인·유일 정본)·`Compliance`(SIEM 로그 포워더)·`Alerting`(경보)·`AnomalyDetection`(이상탐지)·로그인 rate-limit/OTP 스로틀·`Ssrf` 가드·writeGuard 서버전역·세션 hash-only·high-value 게이트**로 부분 실재. Part040 은 강한 영역(보안=은행급 지향)이라 실측→SOAR/UEBA/EDR 부재증명→SecurityAudit+Compliance SIEM+Alerting+AnomalyDetection 성문화. ★MEA 057 AI Observability·023 Observability 승계·SecurityAudit 재오염 금지.
