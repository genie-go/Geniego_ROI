# DSAR — EAFTAF Index (Part 3-43)

> **거버넌스 상태**: 설계 명세 DSAR 인덱스 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).

Part 3-43 (Enterprise Authorization Future Technology Adoption Framework) 산출 문서 색인.

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/EPIC_06A_PART3_43_FUTURE_TECHNOLOGY_ADOPTION_SPEC.md` | canonical SPEC v1.0(§0~§32) |
| `docs/architecture/ADR_DSAR_AUTHZ_FUTURE_TECHNOLOGY_ADOPTION.md` | 설계 결정(D-1~D-5·중복/조직 경계) |
| `DSAR_APPROVAL_EAFTAF_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `DSAR_APPROVAL_EAFTAF_DUPLICATE_IMPLEMENTATION_AUDIT.md` | GT② 상위 Part(3-27/3-32/3-33) 중복 경계 |
| `DSAR_APPROVAL_EAFTAF_CANONICAL_ENTITIES.md` | §2 20 엔티티 + §3~21 기술채택 도메인 설계·판정 |
| `DSAR_APPROVAL_EAFTAF_GOVERNANCE_MECHANISMS.md` | §22~32 Guard/Lint/Error/API/DB/Test/Gate |
| `DSAR_APPROVAL_EAFTAF_INDEX.md` | 본 색인 |

## 판정 요약
- **★상위 Part 중복(핵심):** §4 Technology Radar/Discovery=Part 3-27 LTER(Future Standards Tracker)·§7~8 POC/Pilot=Part 3-32 EACIF·§12 Architecture Compatibility=Part 3-33 EASALM·§13 Vendor/§16 Lifecycle=Part 3-27. **재정의 금지·통합**.
- **PARTIAL substrate: `composer.json`/`package.json`(Dependency/Technology 목록)·`AbTesting`(POC 패턴·마케팅)·`docs/architecture/`+CHANGE_GATE(Architecture Compat)·CI 스캔(Security Before Adoption)·SecurityAudit / ABSENT-formal(Technology Radar/POC Manager/Vendor Evaluation·통합 Registry/Analytics).**
- **★조직/프로세스(비-코드):** Review Board·Vendor Evaluation·Executive Approval·POC governance는 조직 신설 대상.
- **★KEEP_SEPARATE:** 제품 벤더(채널/PG·`ChannelSync`/`PgSettlement`) ≠ 기술 Vendor Evaluation · 마케팅 A/B(`AbTesting`) = POC 패턴만 참조 · 비즈니스 ROI(`Pnl`) ≠ Technology Business Value.
- **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**(선행 Part1~3-42 인증 + 조직 신설 종속).

## 다음 (SPEC §다음)
Part 3-44 Strategic Sustainability → … → 3-50 Grand Finale & Master Reference Architecture.
