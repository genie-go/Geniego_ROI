# ADR — Enterprise Authorization Future Technology Adoption Framework (Part 3-43)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_43_FUTURE_TECHNOLOGY_ADOPTION_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EAFTAF_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EAFTAF_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-43은 미래 기술 탐색~채택~운영 거버넌스를 규정한다. ★특이점: Part 3-27/3-32/3-33 대거 중복 + 조직/프로세스(Review Board/Vendor) + composer/npm substrate. 본 ADR이 그 경계를 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (상위 Part 통합·재정의 금지)**: Technology Radar/Discovery=Part 3-27(Future Standards Tracker)·POC/Pilot=Part 3-32(EACIF)·Architecture Compatibility=Part 3-33(EASALM)·Vendor Strategy/Lifecycle=Part 3-27. 새 엔진 재정의 금지·통합.
- **D-2 (substrate 재사용·발명 금지)**:
  - Dependency/Technology 목록=`composer.json`·`package.json`(실 기술 스택). POC/Pilot 패턴=`AbTesting.php`(실험·마케팅≠기술). Architecture Compatibility=`docs/architecture/`·CHANGE_GATE.
  - Investment=Part 3-27/3-34. Evidence=`SecurityAudit::verify`. Isolation=`Db.php`.
- **D-3 (조직/프로세스=비-코드)**: Review Board·Vendor Evaluation·Executive Approval·POC governance는 조직/프로세스 신설(코드 아님).
- **D-4 (Immutable Technology History)**: 기술평가/POC/채택 이력=append-only `SecurityAudit::verify`·git.
- **D-5 (Runtime Guard=Unauthorized Adoption 차단)**: 무단 기술 채택/배포 차단=CHANGE_GATE·`deploy.yml`·`index.php` RBAC 위 배치(신규 게이트 신설 금지). Security Before Adoption=CI 스캔·보안검증 게이트.

## KEEP_SEPARATE (오흡수 금지)
- 제품 벤더(채널/PG·`ChannelSync`/`PgSettlement`) ≠ 기술 Vendor Evaluation(플랫폼 기술 벤더).
- 마케팅 A/B(`AbTesting`)=POC 패턴만 참조(도메인 상이) · 비즈니스 ROI(`Pnl`) ≠ Technology Business Value.

## 결과 (Consequences)
- 판정 = PARTIAL(composer/npm·AbTesting·docs/architecture·SecurityAudit substrate·상위 Part 참조) / ABSENT-formal(Technology Radar/POC Manager/Vendor Evaluation·통합 Registry 순신설) + 조직/프로세스.
- 실행 순서: 선행 Part 인증 + 조직(Review Board) 신설 → Technology Registry 신설 → 상위 Part/composer 통합 → Radar/POC/Vendor 프로세스. 코드 0.
