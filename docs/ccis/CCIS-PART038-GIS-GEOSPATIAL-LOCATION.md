# GeniegoROI Claude Code Implementation Specification

# CCIS Part038 — GIS, Mapping, Geospatial Analytics & Location Intelligence Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

GIS·Mapping·Geospatial Analytics·Location Intelligence 표준을 수립한다.

> ★**성격(거의 전부 사업범위 밖 — 좌표 데이터 자체가 없음)**: 이 저장소는 **마케팅/커머스 ROI SaaS**이지
> **GIS/지도 플랫폼이 아니다**. 명세가 다루는 **형식 GIS·PostGIS·Spatial Index·좌표계(WGS84/EPSG)·Geocoding/
> Reverse Geocoding·Vehicle Tracking(lat/long)·Route Optimization·Geofencing·Spatial Query(ST_*)·Heat
> Map·ETA·Fleet Visualization·실시간 GPS 추적**은 이 제품의 **사업 범위 밖(out of scope)**이라 **부재**한다
> — ★**좌표(latitude/longitude/geometry) 저장이 어디에도 없다**(grep 0). 결함이 아니라 정직한 비적용(MEA
> 064 "out of scope"·Part035~037 어휘 재적용). ★**위치 인접 실체(GIS 아님)**: **`Geo`**(접속 IP→국가/언어
> 자동감지·**i18n 용도**·다중제공자 페일오버·IP 해시캐시·원문 미저장·임의 IP 파라미터 불허)·**배송추적**
> (`Logistics`/`logistics_track_cron`·**택배사 운송장 상태 폴링**·GPS 좌표 아님)·**국가/지역 코드**(i18n
> 15개국·`fxToKrw` 통화)·**지역별 성과 집계**(rollup·행정구역 aggregation·공간 아님) 는 부분 실재한다. Part001
> §4 에 따라 실측 → GIS/PostGIS/Route Opt 사업범위 밖 증명 → `Geo`+배송추적+지역 rollup 성문화했다. (문서
> 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 위치 인접 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| GIS Architecture | GPS→Gateway→Geospatial DB→GIS | **부재(out of scope)** — GIS 없음. 좌표 데이터 자체 부재 |
| Geospatial Database(PostGIS) | Point/LineString/Polygon | **부재(out of scope)** — PostGIS 없음(MySQL·SQLite·Part009). geometry 타입 미사용 |
| Coordinate Reference System | WGS84/EPSG/UTM | **부재(out of scope)** — 좌표계 없음(좌표 저장 0) |
| Spatial Index | GiST/SP-GiST/BRIN | **부재(out of scope)** — 공간 인덱스 없음 |
| Geocoding | Address→Coordinate | **부재(out of scope)** — 주소→좌표 변환 없음 |
| Reverse Geocoding | Coordinate→Address | **부분(대응물)** — `Geo` IP→국가(행정구역 아님·좌표 아님). 형식 reverse geocoding 아님 |
| Vehicle Tracking(lat/long) | Vehicle/위경도/Speed | **부재(out of scope)** — 차량 GPS 추적 없음(좌표 0) |
| Route Optimization | Distance/Traffic/Toll 최적 | **부재(out of scope)** — 경로 최적화 없음. (`Mmm`/`Decisioning`=예산/의사결정이지 지리 최적화 아님) |
| Geofencing | Polygon Entry/Exit/Alert | **부재(out of scope)** — Geofence 없음 |
| Spatial Query(ST_*) | PostGIS 공간질의 | **부재(out of scope)** — ST_Contains 등 없음 |
| Heat Map(공간밀도) | Delivery/Customer Density | **부분(비공간)** — 지역별/채널별 집계(rollup·표/차트). 공간 Heat Map 아님 |
| Location Intelligence | 배송효율/드라이버 성과 | **부분(집계)** — 국가/지역별 매출·성과 rollup. 공간 분석 아님 |
| Real-time Tracking | WebSocket/MQTT GPS | **부분(상태)** — 배송 **상태** 추적(`logistics_track_cron`·SSE). GPS 실시간 아님 |
| ETA | Distance/Traffic/Weather | **부분(택배사)** — 택배사 제공 배송예정일. 자체 ETA 계산 아님 |
| Fleet Visualization | Vehicle Marker/Cluster | **부재(out of scope)** — 차량 지도 표시 없음(Part037 Fleet 부재) |
| GIS Monitoring | GPS Delay/Query Time | **부재(out of scope)** — GIS 지표 없음 |
| Logging | Vehicle/위경도/Trace | **부분** — 배송 상태 로그·`SecurityAudit`. 좌표 로깅 대상 없음 |
| Security(Location Encrypt/RBAC/격리) | 위치정보 보호 | ★**부분 준수** — `Geo` IP 해시(원문 미저장)·RBAC·테넌트 격리·PII 미저장. 위치 암호화 대상 없음 |
| Compliance(위치정보법) | 위치 보존 | **부분** — PII 미저장·IP 해시. 위치정보법 대상 데이터 없음(좌표 미수집) |
| Disaster Recovery | Spatial DB/GPS Replay | **부분** — DB 백업(배송상태). Spatial/GPS 대상 없음 |
| Performance(Spatial Index/Tile Cache) | 공간 성능 | **부재(out of scope)** — 공간 성능 대상 없음. 일반 인덱스·HTTP 캐시(Part017) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Location First/Spatial by Design/Real-time Tracking/GIS Native/Route Optimized/Tenant Isolated) | **부분(비공간축)** | ★Tenant Isolated·AI Ready(집계). Location First/Spatial/GIS Native/Route=out of scope(좌표 0) |
| §4 GIS Architecture | **부재(out of scope)** | GIS 없음·좌표 데이터 부재 |
| §5~§7 Geospatial DB/CRS/Spatial Index | **부재(out of scope)** | PostGIS/좌표계/공간인덱스 없음(MySQL·Part009) |
| §8 Geocoding | **부재(out of scope)** | 주소→좌표 없음 |
| §9 Reverse Geocoding | **부분(대응물)** | `Geo` IP→국가(i18n). 형식 reverse geocoding 아님 |
| §10 Vehicle Tracking | **부재(out of scope)** | 차량 GPS 없음(좌표 0) |
| §11 Route Optimization | **부재(out of scope)** | 경로 최적화 없음. `Mmm`/`Decisioning`=지리 최적화 아님 |
| §12~§13 Geofencing/Spatial Query | **부재(out of scope)** | Geofence/ST_* 없음 |
| §14 Heat Map | **부분(비공간)** | 지역/채널 rollup 표·차트. 공간 밀도맵 아님 |
| §15 Location Intelligence | **부분(집계)** | 국가/지역별 rollup. 공간 분석 아님 |
| §16 Real-time Tracking | **부분(상태)** | 배송 상태(`logistics_track_cron`·SSE). GPS 실시간 아님 |
| §17 ETA | **부분(택배사)** | 택배사 배송예정일. 자체 ETA 계산 아님 |
| §18 Fleet Visualization | **부재(out of scope)** | 차량 지도 없음(Part037) |
| §19 GIS Monitoring | **부재(out of scope)** | GIS 지표 없음 |
| §20 Logging | **부분** | 배송상태·`SecurityAudit`. 좌표 로깅 없음 |
| §21 Security | **부분 준수** | `Geo` IP 해시·RBAC·테넌트 격리·PII 미저장 |
| §22 Compliance | **부분** | PII 미저장·좌표 미수집(위치정보법 대상 데이터 없음) |
| §23 Disaster Recovery | **부분** | DB 백업(배송상태). Spatial/GPS 대상 없음 |
| §24 Performance | **부재(out of scope)** | 공간 성능 대상 없음. 일반 인덱스·HTTP 캐시 |
| §25~§26 PHP/Claude(GIS Service/PostGIS Repo/Route Adapter/Geofence Engine) | **부분** | ★`Geo`(IP)·배송추적·지역 rollup. PostGIS/Route/Geofence=out of scope |
| §27~§28 검증(gis:health/geofence:test/route:status) | **대상 없음** | artisan 없음·GIS 없음. `Geo` API·`logistics_track_cron`·rollup 로 대체 |

---

## 4. 확립된 표준 (신규 위치 인접 코드가 따를 정본)

- ★**IP 지오 정본 = `Geo`**(접속 IP→국가/언어·i18n 용도). 신규 지역 감지는 이 핸들러 재사용. ★**원문 IP 미저장(해시 캐시)**·**임의 IP 파라미터 불허**(스캔 악용 차단)·**호출자 연결 IP 에만 lookup**·다중제공자 페일오버·동일출처(/api·광고차단 불가).
- ★**배송추적 정본 = `Logistics`/`logistics_track_cron`**(택배사 운송장 **상태** 폴링). GPS 좌표 아님·상태 기반. 배송예정일=택배사 제공. 신규 배송추적은 이 파이프라인 확장.
- ★**지역 분석 = rollup 집계**(국가/지역별 매출·성과·행정구역 aggregation·Part026). 공간(spatial) 분석 아님. 채널별/지역별 성과=표·차트.
- ★**위치 보안·정직**: IP 해시(원문 미저장)·PII 미저장·테넌트 격리·RBAC. 좌표 미수집(위치정보법 대상 데이터 없음).
- ★**사업범위 원칙**: **GIS/PostGIS/좌표/Route Optimization/Geofencing/차량 GPS 추적은 이 제품 범위 밖** — 요구·제품결정 전 선이식 금지. IP 지오·배송 상태추적·지역 rollup 만 확장.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 거의 전부 out of scope)

1. **형식 GIS·PostGIS·Spatial Index·좌표계(WGS84/EPSG)** — 안 함. **사업 범위 밖**(지도/GIS 플랫폼 아님·마케팅/커머스 ROI SaaS). ★**좌표(lat/long/geometry) 데이터 자체가 없다**(grep 0). GIS 도입=DB(PostGIS)·데이터모델 전면 신설.
2. **Geocoding/Reverse Geocoding(좌표↔주소)·Vehicle Tracking(GPS)·Route Optimization·Geofencing·Spatial Query(ST_*)** — 안 함. **사업 범위 밖**. 좌표를 수집·저장하지 않는다.
3. **Heat Map(공간밀도)·Fleet Visualization·실시간 GPS 추적·자체 ETA 계산** — 안 함/부분. 지역별 rollup(비공간)·배송 상태추적·택배사 배송예정일이 대응물.
4. **`Mmm`/`Decisioning` 는 지리 최적화가 아니다** — 예산 배분(ROI frontier)·마케팅 의사결정이지 경로/공간 최적화와 무관(오탐 방지).
5. **위치정보법 준수 인프라** — 대상 데이터 없음(좌표 미수집). `Geo` IP 해시·PII 미저장이 실효.
6. **artisan `gis:*`/`geofence:*`/`route:*` 명령** — 없음(Slim·GIS 없음). `Geo` API·`logistics_track_cron`·rollup 로 대체.

★**준수하는 실 원칙(위치 인접)**: **`Geo` IP 지오(원문 미저장·임의 IP 불허·페일오버)·배송 상태추적(택배사 운송장)·지역 rollup(행정구역 집계)·PII 미저장·테넌트 격리·정직 미산출**. ★**out of scope 정직 선언**: GIS/좌표/Route/Geofencing/차량 GPS 는 이 제품 범위 밖이며 부재는 결함이 아니다(좌표 데이터 0).

---

## 6. Claude Code 구현 규칙

1. 지역 감지=`Geo`(IP→국가·i18n) 재사용. ★원문 IP 미저장(해시)·임의 IP 파라미터 불허·호출자 IP 에만 lookup.
2. 배송추적=`Logistics`/`logistics_track_cron`(택배사 상태 폴링) 확장. GPS 좌표 수집 금지(범위 밖).
3. 지역 분석=rollup 집계(국가/지역·행정구역·Part026). 공간 분석 신설 금지.
4. ★PII 미저장·테넌트 격리·`SecurityAudit`. 위치 좌표 미수집(위치정보법 표면 최소화).
5. ★**GIS/PostGIS/Geocoding/Route Optimization/Geofencing/차량 GPS 를 선이식하지 않는다** — 사업 범위 밖(요구·제품결정 선행). `Mmm`/`Decisioning`을 지리 최적화로 오용 금지.
6. PostGIS/Spatial Index/Heat Map/Fleet 를 "명세에 있다"는 이유로 이식하지 않는다(`Geo`+배송추적+지역 rollup 로 커버).

---

## 7. Completion Criteria

- [x] 위치 인접 스택 **실측**(PostGIS/좌표계/Geocoding/Route Opt/Geofencing/Vehicle GPS 부재·좌표 데이터 0·`Geo` IP 지오·배송 상태추적·지역 rollup 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(GIS/PostGIS/좌표 **out of scope** 증명·IP 지오/배송추적 실재)
- [x] 실 위치 인접(Geo IP+배송추적+지역 rollup) 성문화(§4)
- [x] ★IP 원문 미저장(해시)·임의 IP 불허·배송 상태추적(택배사)·지역 rollup·PII 미저장·**out of scope 정직 선언** 명시
- [x] 의도적 미적용 + 사유(§5) — GIS/PostGIS/좌표/Geocoding/Route/Geofencing/Vehicle GPS(거의 전부 out of scope)
- [x] Claude Code 규칙(§6) · `Geo`·`logistics_track_cron`·rollup 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 위치 인접 실체(`Geo` IP 지오 + 배송 상태추적 + 지역 rollup)의
> 성문화이지 GIS/PostGIS/Geocoding/Route Optimization/Geofencing 이식이 아니다. ★**out of scope 정직 선언(MEA
> 064 어휘)**: GIS·좌표·차량 GPS·경로 최적화는 이 마케팅/커머스 SaaS 의 **사업 범위 밖**이며 부재는 결함이
> 아니다 — ★**좌표(lat/long) 데이터가 어디에도 없다**(grep 0).

---

## 다음 Part

**CCIS Part039 — Robotics, Warehouse Automation & Autonomous Logistics** — ★사전 실측 예고: 형식 로보틱스(AGV/AMR/WCS/PLC/Conveyor·Robot Fleet)는 **부재**(대체로 사업범위 밖·MEA 061 Device weak)이나, 창고 실체는 **`Wms`(창고 재고/이동/입출고·205차 백엔드)·`WmsCctv`(카메라·Part037)·바코드 웹캠(getUserMedia)·`RuleEngine`(재고↓→발주 자동화)·발주(reorder)**로 부분 실재. Part039 도 실측→AGV/AMR/WCS/PLC 부재증명→Wms+RuleEngine reorder 성문화. ★주의: 물리 로봇/자동화 설비는 사업범위 밖(035~038 out of scope 어휘 재적용)·`Wms`=재고관리 SW이지 로봇 제어 아님.
