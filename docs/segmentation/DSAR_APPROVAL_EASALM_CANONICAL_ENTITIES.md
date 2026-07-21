# DSAR — EASALM Canonical Entities Design & Judgment (Part 3-33 §2~§22)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조).

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_ARCHITECTURE_REGISTRY | 부재(문서 산재) | `docs/architecture/` | ABSENT-formal(통합 레지스트리 신설) |
| 2 | APPROVAL_ARCHITECTURE_DOMAIN | 부재 | — | ABSENT |
| 3 | APPROVAL_ARCHITECTURE_PRINCIPLE | Golden Rule "Extend not Replace" | `docs/CONSTITUTION.md` | PARTIAL(형식화) |
| 4 | APPROVAL_ARCHITECTURE_STANDARD | 코딩/i18n/배포 표준·registry | `CLAUDE.md`·`docs/registry/` | PARTIAL |
| 5 | APPROVAL_ARCHITECTURE_PATTERN | 부재(Pattern Catalog 없음) | — | ABSENT |
| 6 | APPROVAL_ARCHITECTURE_DECISION | ADR 리포지토리(수십편·git 불변) | `docs/architecture/`(`ADR_DSAR_*`) | PARTIAL-strong(문서형 정본·재사용) |
| 7 | APPROVAL_ARCHITECTURE_REVIEW | 본 DSAR 파이프라인·CHANGE_GATE | `docs/CHANGE_GATE.md`·`DSAR_APPROVAL_*` | PARTIAL(수동/문서형) |
| 8 | APPROVAL_ARCHITECTURE_BASELINE | Reference Architecture(Part3-26) | `docs/spec/EPIC_06A_PART3_26_*`(설계) | ABSENT-formal(런타임 baseline) |
| 9 | APPROVAL_ARCHITECTURE_DEPENDENCY | DFS 순환검출 | `PM/Dependencies.php`·`AdminMenu.php` | PARTIAL(알고리즘·아키텍처용 신설) |
| 10 | APPROVAL_ARCHITECTURE_IMPACT | 부재(수동 grep 영향분석) | — | ABSENT-formal |
| 11 | APPROVAL_ARCHITECTURE_COMPLIANCE | CHANGE_GATE·pre-commit | `docs/CHANGE_GATE.md`·`.githooks/` | PARTIAL |
| 12 | APPROVAL_ARCHITECTURE_SNAPSHOT | 부재 | — | ABSENT |
| 13 | APPROVAL_ARCHITECTURE_EVIDENCE | append-only 정본·git | `SecurityAudit.php`·git | PARTIAL(체인 재사용) |
| 14 | APPROVAL_ARCHITECTURE_DIGEST | 부재 | — | ABSENT |
| 15 | APPROVAL_ARCHITECTURE_ANALYTICS | 부재 | — | ABSENT |
| 16 | APPROVAL_ARCHITECTURE_VERSION | git·문서 버전 | git | PARTIAL |
| 17 | APPROVAL_ARCHITECTURE_STATUS | NOT_CERTIFIED 라벨(문서) | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 18 | APPROVAL_ARCHITECTURE_CERTIFICATION | 부재 | — | ABSENT |
| 19 | APPROVAL_ARCHITECTURE_EXCEPTION | 부재 | — | ABSENT |
| 20 | APPROVAL_ARCHITECTURE_WAIVER | 부재(--no-verify 우회=비형식) | `.githooks/` | ABSENT-formal |

## 도메인 설계 계약(§3~§22 요지)
- **§3 Lifecycle(Strategy~Retirement)**: 11단계 상태머신 순신설. 현 아키텍처=Slim 모놀리식(`public/index.php`)·문서형 거버넌스.
- **§5 ARB·§6 ADR**: `docs/architecture/` ADR·CHANGE_GATE·본 DSAR 파이프라인이 **수동 ARB/ADR 인스턴스**. 형식 런타임 CRUD/Review 워크플로 신설.
- **§9 Security Architecture**: 실 substrate 강함 — Identity/Authorization(RBAC/writeGuard)·Encryption(Crypto AES-256-GCM)·Secret(P5 세션해시)·Zero Trust(부분). Manager는 이 실 구현을 **문서화/추적**.
- **§15 Runtime Architecture(PDP/PEP/PIP)**: index.php RBAC=PEP·TeamPermissions=PDP substrate(Part3-7 ERRE 정합)·통합 PDP/Decision Cache 부재.
- **§16 Dependency Graph**: `PM/Dependencies.php` DFS·`AdminMenu` wouldCycle 알고리즘 재사용(태스크/메뉴용→아키텍처용 신설).

## 판정
**PARTIAL(§3~4·§6~7·§9·§11·§13·§16=ADR/Constitution/CHANGE_GATE/registry/Dependencies/SecurityAudit substrate) / ABSENT-formal(런타임 ARB/Lifecycle/Impact/Compliance Engine·Pattern Catalog·Analytics·Certification).** 코드 0. BLOCKED_PREREQUISITE. 실행 시 문서형 거버넌스 형식화(중복 ADR 저장소/원칙 신설 금지·Golden Rule 정합).
