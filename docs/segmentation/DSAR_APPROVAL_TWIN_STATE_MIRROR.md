# DSAR — Runtime State Mirror (Part 3-22 §7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC 요약)
Runtime State Mirror(§7)는 운영 authz 평면의 **살아있는 런타임 상태를 저지연(≤5s)으로 반영한 읽기 전용 미러**를 유지하는 계약을 정의한다.

- **미러 대상 6종**: Active Session State(활성 세션), Policy Cache State(정책 캐시), Decision Cache State(결정 캐시), Federation State(연합 상태), Trust State(신뢰), Compliance State(컴플라이언스).
- **신선도 SLA**: 미러 지연 ≤ 5초.

계약 원칙: State Mirror는 운영 상태의 **수동적 반영**이며 소스 오브 트루스가 아니다. 미러는 예측 거버넌스(§8+)의 입력 평면으로만 소비되고 운영으로 되돌려 쓰지 않는다.

## 2. Substrate 매핑 (현행 코드 → SPEC 미러 대상)
| SPEC 미러 대상 | 현행 substrate | 위치 | 판정 |
|---|---|---|---|
| Decision/Policy 상태 소스 | write-PEP(정책 강제 지점) | `UserAuth.php:1167` | PARTIAL 소스 |
| Compliance State 소스 | SecurityAudit append-only | `SecurityAudit.php:27` | PARTIAL 소스 |
| Active Session / Policy Cache / Decision Cache / Federation / Trust State Mirror | 없음(grep 0) | — | ABSENT |
| ≤5s 미러 파이프라인 | 없음 | — | ABSENT |

State Mirror 계층 자체는 **grep 0**으로 부재하다. 상태의 소스가 되는 지점은 PARTIAL로 존재한다: 쓰기 정책 강제 지점(`UserAuth.php:1167`)과 감사 append-only 로그(`SecurityAudit.php:27`). 그러나 이 소스들을 저지연 미러 평면으로 투영·유지하는 메커니즘은 없다.

## 3. 설계 계약 (신설 시)
- **read-only 미러 원칙**: State Mirror는 write-PEP(`UserAuth.php:1167`)의 결정·SecurityAudit(`SecurityAudit.php:27`)의 감사 상태를 소스로 반영만 하며 운영 평면에 write-back 금지.
- **≤5s 신선도**: streaming/incremental 동기화 substrate(§4 계약)를 전제로 하므로 브로커 부재 하에서는 **BLOCKED_PREREQUISITE**. 과도기 near-real-time 폴백은 SLA 미충족으로 명시.
- **6 상태 미러 순신설**: Active Session/Policy Cache/Decision Cache/Federation/Trust/Compliance State 미러 모두 순신설. 기존 캐시/세션 저장소를 SoT로 오인해 미러로 승격 금지.
- **신규 엔드포인트 배선**: 미러 상태 조회 엔드포인트 신설 시 `/api` 접두·라우트 등록 파일에 `$register` 배선 필수.
- **테넌트 격리**: 미러 평면도 테넌트별 격리.

## 4. KEEP_SEPARATE (혼동 금지)
- **demo 형제 env**(`Db.php:20-21`·`:63-87`) = demo/운영 **별개의 라이브 실행 환경**(별도 DB 접속·격리)이며 운영 상태를 **read-only로 반영하는 state mirror 아님**. 두 개의 살아있는 SoT일 뿐 미러-소스 관계가 아니다 — 흡수/혼동 금지.

## 5. 판정
**ABSENT.** 6 상태 미러·≤5s 미러 파이프라인 모두 grep 0. 미러의 소스가 될 지점은 PARTIAL로만 존재(write-PEP `UserAuth.php:1167`·SecurityAudit `SecurityAudit.php:27`). demo 형제 env(`Db.php:20-21`·`:63-87`)는 별개 라이브 env로 read-only state mirror가 아님을 재확인. 저지연 미러는 §4 streaming substrate(브로커) 전제이므로 선행 미충족. → **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
