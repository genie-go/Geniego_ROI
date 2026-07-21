# DSAR — EAERPC Ground-Truth ② Duplicate Implementation Audit (Part 3-36)

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★목적 = 본 Part는 상위 Part 3-25/3-28/3-29와 **인증 영역 대거 중복**. 엔진 재정의 금지·상위 참조 경계 확정.

## ★상위 Part 중복(핵심) — 엔진 재정의 금지
| EAERPC 개념 | 상위 Part | 판정 |
|---|---|---|
| Functional/Security/Performance/Compliance Certification | Part 3-29 Validation Suite Validator | Validator 실행·집계 계층만·재정의 금지 |
| Production Certification | Part 3-25 Production Certification Engine | 참조·재정의 금지 |
| Certification Readiness | Part 3-28 Certification Readiness Engine(Maturity) | 참조·단 성숙도≠합격판정 |
| Availability/DR Certification | Part 3-25 DR·Part 3-30 Availability | 참조 |

## 동음이의(코드베이스) — 오흡수 vs 재사용
| EAERPC 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Certification Status | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | 재사용(형식화) |
| Compliance Certification | control inventory | `Compliance.php` | 재사용 |
| Functional/Security 검증 | E2E smoke·CI scan | `tools/e2e`·`security-scan.yml` | 재사용(3-29 공유) |
| Product Certification | kc_cert·채널 인증 | `PriceOpt.php`·채널 어댑터 | KEEP_SEPARATE(제품 ≠ Platform Reference) |
| Signature | deploy artifact(서명 부재) | `deploy.yml` | 순신설(SBOM/signing) |
| AI Governance Cert | ModelMonitor | `ModelMonitor` | KEEP_SEPARATE(모니터 ≠ 인증) |
| Evidence/Snapshot | 메뉴/저니 snapshot | `AdminMenu`·journey_decision_log | KEEP_SEPARATE(★정본 `SecurityAudit::verify`) |

## 확장 대상(중복 신설 금지·기존 승격)
- Functional/Security/Performance Certification=Part 3-29 Validator 실행 계층. Compliance=`Compliance.php` 승격. Status=NOT_CERTIFIED 라벨 형식화. Approval=pending_approval/handoff approval. Evidence=`SecurityAudit::verify`. Isolation=`Db.php`.

## 판정
**중복 위험 높음(상위 Part 3-25/3-28/3-29 인증 영역 대거 겹침).** 본 Part 고유 순신설=통합 Certification Lifecycle/Renewal/Dashboard·Reference Signature(SBOM/signing) 뿐. 나머지는 상위 Part Validator/엔진 실행·집계 계층으로 **참조**. 제품 인증(kc_cert)·ModelMonitor는 오흡수 금지. 새 인증 엔진/Validator/해시체인 신설 금지. ★06-A 자체 미인증이라 "Certified" 표기 금지.
