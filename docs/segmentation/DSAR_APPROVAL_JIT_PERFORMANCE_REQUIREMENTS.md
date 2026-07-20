# DSAR — JIT Access Governance: 성능 요구사항 (Part 3-9 §35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §35는 JIT 수명주기 6개 임계경로의 지연 상한을 규정한다.

| 경로 | 상한 | 대응 SPEC 단계 |
|---|---|---|
| Request 생성 | ≤ 100ms | §3 Privilege Elevation Request |
| Risk 평가 | ≤ 300ms | §6 Risk Evaluation |
| Approval 처리 | ≤ 200ms | §7 Approval Workflow |
| Runtime Validation | ≤ 50ms | §12 Continuous Validation·§28 Runtime Guard |
| Auto Revocation | ≤ 30초 | §14 Auto Revocation |
| Monitoring Latency | ≤ 5초 | §13 Runtime Monitoring |

Runtime Validation(≤50ms)은 매 요청 hot-path이므로 가장 엄격하며, §28 Runtime Guard의 만료·미승인 차단 판정이 이 예산 안에서 완료되어야 한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| §35 경로 | 실존 근사 substrate | 판정 |
|---|---|---|
| Request 생성 ≤100ms | elevation request 생성경로 ABSENT(GT② §2) | **ABSENT** |
| Risk 평가 ≤300ms | 권한상승 risk scoring 0(GT② §2) | **ABSENT** |
| Approval 처리 ≤200ms | maker-checker 결정 `Alerting.php:598`·정족수 `:642-650`(마케팅용, 재활용 substrate) | **PARTIAL(재활용)** |
| Runtime Validation ≤50ms | 세션 만료 lazy 게이트 `UserAuth.php:249-284`(`WHERE expires_at > ?`)·api_key 401 `index.php:518` | **PARTIAL(세션/키축)** |
| Auto Revocation ≤30s | 능동 만료회수 워커 ABSENT — 만료는 요청시점 lazy(`UserAuth.php:989`·`Keys.php:141`), cron 3종만(`alerts_cron`·`optimize_cron`·`oauth_refresh_cron`, GT② B-9) | **ABSENT(능동회수)** |
| Monitoring Latency ≤5s | 상승세션 실시간 감시 ABSENT(`AnomalyDetection.php`=마케팅, GT② §2·B-8) | **ABSENT** |

핵심: hot-path 검증 substrate는 세션/키 lazy 만료게이트(`UserAuth.php:249-284`·`index.php:518`)만 실존하며 권한 grant 축은 미적용. **능동 Auto-Revocation(≤30s)은 cron 워커 자체가 ABSENT**(GT② B-9)이므로 신설 대상이다.

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| 경로 | 상한 | 설계 접근(무날조) | 근거 |
|---|---|---|---|
| Request 생성 | ≤100ms | grant 원장 단건 insert + §34 idx_jit_request_id | §35·§34 |
| Risk 평가 | ≤300ms | §6 9요소 파생(임의값 금지·AccessReview 파생분류 `AccessReview.php:87-122` 패턴 재사용) | §35·§6 |
| Approval 처리 | ≤200ms | maker-checker 상태전이(`Alerting.php:642-650` 재활용) 별도 테이블 | §35·§7·ADR D-2 |
| Runtime Validation | ≤50ms | `expires_at > now` lazy gate(`UserAuth.php:249-284` 패턴)+세션 인덱스 | §35·§12·§28 |
| Auto Revocation | ≤30초 | 신규 Auto-Expiry cron(현행 lazy `UserAuth.php:989`를 능동화) | §35·§14·GT② B-9 |
| Monitoring | ≤5초 | 신규 Runtime Monitoring 스트림(SecurityAudit 체인 참조) | §35·§13 |

- **부하 목표**(§36 연계): 100K Active Sessions·1M Requests·10M Runtime Events 하에서 위 상한 유지 — §34 인덱스 전제.
- **fail-secure**: 지연 예산 초과 시 grant 미부여·차단(ADR D-3), 성능을 이유로 검증 skip 금지.

## 4. KEEP_SEPARATE / 선행의존

- Approval 처리 지연 substrate(`Alerting.php:598,:642-650`)는 마케팅 결재 성능 — elevation 성능으로 개명 금지(GT② B-1·ADR D-6).
- Runtime Validation lazy 게이트(`UserAuth.php:249-284`·`index.php:518`)는 세션/자격증명 수명 검증 — grant TTL 검증 아님(GT② B-4·B-5).
- 선행: §35 성능 벤치는 grant 원장·Auto-Expiry cron·Runtime Monitoring 신설(ADR §4) 후에만 측정 가능.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **NOT_CERTIFIED · 코드 0**. §35 6개 지연 상한은 **실 구현(RP-track) 조건**이며 현 단계 측정 불가(대상 엔진 ABSENT).
- Auto Revocation(≤30s)·Monitoring(≤5s)은 능동 워커/스트림이 ABSENT(cron 3종만, GT② B-9)이므로 신설 필수. Runtime Validation은 세션 lazy 게이트(`UserAuth.php:249-284`)를 grant 축으로 확장(재활용).
- BLOCKED_PREREQUISITE(Part 1~3-8 인증 선행 후 성능 벤치 수행).
