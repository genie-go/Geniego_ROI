# DSAR — Approval Crypto Revalidation (Part 3-23 §22)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

**Crypto Revalidation**은 인가 경로가 의존하는 암호 자산의 유효성 판정을 "한 번 승인 = 영구 신뢰"가 아니라, 정의된 트리거 발생 시 재검증(revalidate)하도록 강제하는 거버넌스 계약이다. Part 3-23은 PQC 전환기에 암호 상태가 유동적임을 전제로, 특정 이벤트가 발생하면 관련 인가 crypto 인벤토리 항목의 승인을 무효화(invalidate)하고 재승인 절차를 요구한다.

Revalidation 트리거 5종:
- **Algorithm 변경** — 알고리즘/모드/파라미터 baseline 갱신.
- **Key 변경** — KEK 회전·키 소재 교체·버전 증가.
- **Certificate 변경** — 인증서 갱신·폐기·발급자 변경.
- **PQC 표준 변경** — 표준 채택/개정(마이그레이션 경로 확정).
- **Policy 변경** — 승인 정책·규제 요구·위험 등급 변경.

## 2. Substrate 매핑 (Revalidation 트리거의 실제 원천)

| 트리거 | 현행 SOURCE(이벤트 원천) | 인용 |
|---|---|---|
| Key 변경 | **KEK 회전 = key 변경 이벤트 원천** | `Crypto.php:133-148` |
| Algorithm | AES-256-GCM envelope 구현 | `Crypto.php:108-126` |
| Algorithm/Key | 비대칭 키 자산 | `EnterpriseAuth.php:536` |
| Secret(hash) | api_key SHA-256 저장 | `Keys.php:40` |
| Credential | bcrypt 패스워드 해시 | `UserAuth.php:498` |
| 의존성 갱신 | crypto 라이브러리 버전 | `composer.json:5-13` |

핵심: 현행에서 **재검증을 촉발할 수 있는 유일하게 관측 가능한 실 이벤트는 KEK 회전(`Crypto.php:133-148`)** 이다. 그러나 회전이 발생해도 이를 revalidation 트리거로 소비하여 인벤토리 승인을 무효화하는 계층은 부재하다.

## 3. 설계 계약 (Design Contract)

- **트리거 → 무효화 → 재승인**: 트리거 발생 시 영향받는 인벤토리 항목의 승인 상태를 `REVALIDATION_REQUIRED`로 전이. 재검증 전까지 해당 crypto에 의존하는 인가는 정책상 열등(degraded) 신뢰로 취급.
- **Inventory 의존**: 무엇을 재검증할지는 §2 Inventory 카탈로그가 지정. Inventory 부재 → **BLOCKED_PREREQUISITE**.
- **Drift 연동**: §21 Drift가 발견한 이탈도 revalidation 트리거로 승격 가능(Drift signal → Revalidation event).
- **감사 append-only**: 트리거·무효화·재승인은 `SecurityAudit.php:27`·`:56-68` 해시체인에 기록. 신규 감사 저장소 신설 금지.
- **비파괴**: KEK 회전 로직(`Crypto.php:133-148`) 자체는 수정하지 않고 **이벤트를 구독**만 한다(dual-read 무중단 원칙 유지).

## 4. KEEP_SEPARATE

- **ML 모델 재검증/모니터링**: `ModelMonitor.php:18-19`·`:42-43` 의 모델 재평가는 통계적 성능 재검증으로 암호 revalidation과 별개. 트리거 의미(알고리즘/키/인증서)가 상이하므로 통합 금지.

## 5. 판정

**ABSENT** — Crypto Revalidation 엔진은 grep 0. 트리거 원천은 실재하나(특히 KEK 회전 `Crypto.php:133-148` = key 변경 이벤트 원천), 이를 소비해 인벤토리 승인을 무효화·재승인하는 계층이 전무하다. §2 Inventory 선행 부재로 **BLOCKED_PREREQUISITE**. 순신설 대상. 코드 변경 0 · NOT_CERTIFIED.
