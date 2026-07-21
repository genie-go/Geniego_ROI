# MEA Part 006 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★헌법 V3/DataTrust/AnomalyDetection/dedup 재사용·형식 DQ 엔진 greenfield·Part 001~005 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | DATA_QUALITY_RULE | 인라인 검증·헌법 V3 규범 | 핸들러(bounds/regex)·Volume 3 | PARTIAL(형식 Rule 아님) |
| 2 | DATA_QUALITY_PROFILE | 부재(형식 Profiling) | — | ABSENT |
| 3 | DATA_QUALITY_SCORE | ★DataTrust Score | `DataPlatform.php`·Volume 3 | PARTIAL-strong |
| 4 | DATA_VALIDATION_RESULT | 검증 결과(인라인) | 핸들러 | PARTIAL |
| 5 | DATA_EXCEPTION | 이상탐지·알림 | `AnomalyDetection.php`·`Alerting` | PARTIAL(형식 Exception Manager 아님) |
| 6 | DATA_CORRECTION | 정규화·정제 | `ChannelSync.php` | PARTIAL |
| 7 | DATA_PROFILE | 부재 | — | ABSENT |
| 8 | DATA_DUPLICATION | dedup·UNIQUE | Part 005(231차/UNIQUE) | PARTIAL-strong |
| 9 | DATA_COMPLETENESS | 필수필드 검증 | 핸들러·헌법 V3 | PARTIAL |
| 10 | DATA_CONSISTENCY | Cross Validation | Volume 3·`DataPlatform` | PARTIAL |
| 11 | DATA_ACCURACY | DataTrust·검증 | `DataPlatform.php` | PARTIAL |
| 12 | DATA_TIMELINESS | 신선도(freshness) | `DataPlatform.php`(lineage 신선도) | PARTIAL |
| 13 | DATA_QUALITY_AUDIT | 해시체인 감사 | `SecurityAudit.php` | PARTIAL-strong |
| 14 | DATA_QUALITY_REPORT | 부재(형식 Report) | — | ABSENT |
| 15 | DATA_QUALITY_METRIC | DataTrust 지표 | `DataPlatform.php` | PARTIAL |

## §6~§16 표준 판정
- **§6 품질 평가(8)**: Accuracy/Completeness/Consistency/Uniqueness/Timeliness=`DataPlatform`(DataTrust)+헌법 V3 정합·Integrity=SecurityAudit·Availability=인프라. 형식 측정 엔진=부분.
- **§7 Validation Rule(10)**: Cross Validation=V3·Duplicate Check=Part 005·Type/Range/Pattern=인라인. 형식 Rule Engine(Version)=ABSENT.
- **§8 Quality Score**: DataTrust Score 실재·0-100 등급 임계(Excellent~Critical) 형식화=신설(값 재계산 없이).
- **§9 Profiling**: 이상치=`AnomalyDetection`·중복비율=dedup. 형식 Profiling(전 통계)=ABSENT.
- **§10 Exception(8단계)**: 탐지=`AnomalyDetection`·감사=`SecurityAudit`·수정=`CHANGE_GATE`. 형식 Exception Manager=ABSENT.
- **§11 Cleansing**: 정규화=`ChannelSync`·중복제거=Part 005·Raw 불변=`MediaHost`. 형식 Cleansing Engine=ABSENT.
- **§13 Runtime**: ★Trust First(신뢰도 미달=AI/자동화 제외)=V3·Readiness BLOCKED·writeGuard.
- **§16 AI**: 이상/신뢰도 예측=`AnomalyDetection`/`DataPlatform`·직접수정 금지=헌법 V3. 규칙/정제 추천=순신설. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§3·§8·§13=DataTrust Score·Quality Score·Trust First·§8·§13=dedup) / PARTIAL(§1·§4~6·§9~12·§15) / ABSENT-formal(§2·§7 Profile/Report·형식 Rule/Validation/Profiling/Cleansing/Exception Engine).** 코드 0. ★헌법 V3/DataTrust/AnomalyDetection/dedup 재사용(★중복 품질/신뢰 엔진 신설 절대 금지)·형식 DQ 엔진 신설(값 재계산 없이)·Part 001~005 상속·AI 직접수정 금지(V3).
