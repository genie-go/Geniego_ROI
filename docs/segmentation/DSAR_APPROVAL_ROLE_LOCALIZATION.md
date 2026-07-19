# DSAR — Role Localization (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [ADR_DSAR_ROLE_REGISTRY_FOUNDATION](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **GROUND_TRUTH 인용원**: [DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) — 반날조: `file:line`은 본 GROUND_TRUTH·상위 ADR에 실재하는 것만, 없으면 **ABSENT**.

---

## ① 목적

Canonical Role의 **언어별 현지화 표시(Localization)** 를 정의한다. GeniegoROI는 15개국 i18n 제품이므로 Role의 사용자 대면 명칭·설명·책임 서술이 로케일별로 현지화되어야 한다. Localization은 UI/리포트에서 사람에게 보여줄 **표시 텍스트**만 담당한다.

★**Canonical Role Code는 Locale 불변(locale-invariant)이다.** 현지화되는 것은 표시 텍스트뿐이며, 저장·인가·감사·매핑의 식별자인 Canonical Code는 어떤 로케일에서도 동일하다. 현지화 문자열을 Runtime authz Identifier로 사용 금지(Alias 규율과 동일 계열).

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_ref` | 대상 Canonical Role(코드+버전) 참조 |
| `locale` | 로케일(③ — 제품 15개국 집합) |
| `localized_name` | 현지화된 Role 표시명 |
| `localized_short` | 현지화된 축약명(메뉴·배지용) |
| `localized_description` | 현지화된 설명 |
| `localized_responsibility` | 현지화된 책임 서술(Owner responsibilities 표시용) |
| `source_of_truth` | 원문(ko) 기준 여부·번역 파생 표시 |
| `review_status` | 번역 검토 상태(원문 대비 최신/stale) |

## ③ 열거형

- **`locale`**: 제품 표준 15개국 — `ko`(원문 SoT) · `en` · `ja` · `zh` · `zh-TW` · `de` · `th` · `vi` · `id` · `ar` · `es` · `fr` · `hi` · `pt` · `ru`.
- **`review_status`**: `CURRENT` · `STALE`(원문 변경 후 미갱신) · `MACHINE_DRAFT`(자동 번역·미검증) · `MISSING`(해당 로케일 부재→fallback).

## ④ substrate 매핑 (§5.2 + file:line·없으면 ABSENT)

| Canonical 요소 | 실존 substrate | file:line | 판정 |
|---|---|---|---|
| Role 표시명 현지화 전반 | — | **ABSENT** | Role별 로케일 표시 텍스트 저장 개념 전무(Role Registry 자체 ABSENT) |
| localized_name/short/description | — | **ABSENT** | Role 다국어 표시 구조 없음 |
| localized_responsibility | — | **ABSENT** | Owner responsibilities 자체가 ABSENT(Part 3-1 Owner) → 현지화 대상 없음 |
| (인접) 제품 i18n 인프라 | frontend i18n 15 로케일 · FE role 정규화 | 참조: GROUND_TRUTH §1.7 `teamRolePolicy.js`(FE SSOT) | 제품 i18n·team_role FE 정규화는 실재하나 **Role 엔티티 현지화 저장소 아님**(메뉴/UI 문자열용) |

→ Role Localization은 **순신규**. 제품 15개국 i18n 인프라는 실재하나 Canonical Role 엔티티의 로케일별 표시를 담는 저장소는 부재.

## ⑤ 설계원칙

- **Canonical Code는 Locale 불변**: 인가·저장·감사 식별자는 로케일 무관 동일. Localization은 표시 전용. 현지화 문자열로 authz 판정 금지.
- **Golden Rule**: Role 표시 현지화는 제품 15개국 i18n 파이프라인(ko=SoT·나머지 미러)과 **정합**하되, Role 엔티티 텍스트는 거대 로케일 파일에 산개시키지 말고 Role Registry에 구조화 저장(검색·거버넌스 결합). 별도 병렬 i18n 시스템 신설 금지.
- **ko = Source of Truth**: 원문 한국어 기준, 14개 언어 미러. 원문 변경 시 `review_status=STALE` 전이로 미갱신 노출(가짜 최신 금지).
- **Role≠Permission≠Authority≠JobTitle≠Plan**: 현지화된 표시명이 직책처럼 보여도(예: "관리자") Role의 인가 의미는 Canonical Code로만 결정. 표시명이 권한을 부여하지 않는다.
- **Fallback 정직**: `MISSING` 로케일은 ko/en fallback을 쓰되 그 사실을 표시(현지화 완료로 위장 금지).

## ⑥ Gap

- **엔진 전무**: Role별 로케일 표시 저장·SoT 파생·stale 탐지·fallback 미구현(코드 0).
- **BLOCKED_PREREQUISITE (RP-002)**: 현지화 대상인 Canonical Role Registry/Definition·Owner responsibilities(Part 3-1 본체·Owner ABSENT) 선행. 현지화할 Role 텍스트 원본이 아직 없다.
- **cover: 0** — 설계 명세·NOT_CERTIFIED. 제품 i18n 인프라는 있으나 Role 엔티티 현지화 소비처 없음.
- **289차 재플래그 금지**: `teamRolePolicy.js` FE 정규화는 정책 미러(별건). Role 현지화 부재를 그 코드의 결함으로 재플래그하지 않는다.

관련: [[DSAR_APPROVAL_ROLE_ALIAS]] · [[DSAR_APPROVAL_ROLE_METADATA]] · [[DSAR_APPROVAL_ROLE_OWNER]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]].
