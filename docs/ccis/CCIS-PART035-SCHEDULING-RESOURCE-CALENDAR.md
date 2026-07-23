# GeniegoROI Claude Code Implementation Specification

# CCIS Part035 — Enterprise Scheduling, Resource Management & Calendar Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Scheduling·Resource Management·Calendar·Capacity Planning 표준을 수립한다.

> ★**성격(축 분리 — "Job/캠페인 스케줄링" 실재 vs "Human Calendar/Resource/Workforce" 대체로 사업범위 밖)**:
> 이 저장소는 **마케팅/커머스 ROI SaaS**다. 명세가 다루는 **사람 캘린더(Personal/Team Calendar)·예약
> (Appointment/Meeting Room/Vehicle Reservation)·인력배치(Workforce/Shift Scheduling)·RFC 5545 반복일정·
> CalDAV/Google/Outlook 동기화·Conflict Detection·Capacity Planning**은 이 제품의 **사업 범위 밖(out of
> scope)**이라 **부재**한다(grep 0). ★이는 결함(gap)이 아니라 **정직한 비적용**(MEA 064 판정어휘 제5항 "out
> of scope"). ★**실재 축(Job/캠페인 스케줄링)**: **cron 스케줄러 34종**(`backend/bin/*_cron.php`·Part019·
> 발송/집계/정산/AI/attribution/repricer 워커)·**`omni_outbox` STO**(개인 최적 발송시각)·**daypart**
> (`RuleEngine`·`withinAdSchedule`·KST `Asia/Seoul`)·**예약 발송**(email/sms/kakao 큐·scheduled_at)·
> **reminder**(마케팅 알림)·**UTC 저장**(`gmdate`) 은 실재한다. Part001 §4 에 따라 실측 → Calendar/Resource/
> Workforce 사업범위 밖 증명 → 실 Job 스케줄링 성문화했다. ★상세 배치/스케줄러 정본은 **CCIS Part019
> (Scheduler/Batch/Workflow)**. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 스케줄링 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Scheduling Architecture | Request→Engine→Availability→Reservation | **부분(Job 중심)** — cron/큐 스케줄러(발송/집계). 사람 예약 Availability→Reservation 아님 |
| Calendar Management | Personal/Team/Org Calendar | **부재(out of scope)** — 사람 캘린더 없음. 마케팅/커머스 SaaS |
| Calendar Event | Event/Organizer/Participants | **부재(out of scope)** — 회의/약속 이벤트 없음 |
| Resource Management | Vehicle/Room/Equipment/Dock | **부재(out of scope)** — 물리 리소스 예약 없음. `Wms`(창고작업)는 재고/이동이지 dock 예약 아님 |
| Resource Reservation | Reserve/Release/원자적 | **부재(out of scope)** — 리소스 예약 lock 없음 |
| Availability Management | Available/Busy/Holiday | **부재(out of scope)** — 사람/리소스 가용성 계산 없음 |
| Workforce Scheduling | Shift/Rotation/Leave | **부재(out of scope)** — 인력 배치/근무표 없음 |
| Shift Management | Day/Night/Split Shift | **부재(out of scope)** — 근무조 관리 없음 |
| Capacity Planning | Max/Reserved/Utilization | **부분(대응물)** — `PlanLimits`(플랜 쿼터)·php-fpm 풀(Part006). 리소스 capacity/overbooking 아님 |
| Time Zone Management | IANA/UTC 저장/DST | ★**부분 준수** — **UTC 저장**(`gmdate`)·daypart KST(`Asia/Seoul`). 사용자별 IANA 캘린더 표시/DST 부분 |
| RFC 5545 Recurrence | iCalendar 반복규칙 | **부재** — RFC 5545 파서 없음. 반복=cron 표현식(crontab)·저니 반복 트리거 |
| Holiday Calendar | 국가/Tenant 휴일 | **부재** — 휴일 캘린더 없음(발송 quiet-hours 는 개인 방해금지시간) |
| Conflict Detection | Time/Resource/Capacity 충돌 | **부재(out of scope)** — 예약 충돌 검사 없음. Job 멱등/dedup 은 존재 |
| Scheduling Optimization | Distance/Skill/Priority 배정 | **부재(out of scope)** — 배정 알고리즘 없음. STO(발송 최적시각)는 대응물 |
| Reminder | Email/SMS/Push/In-App | ★**대응물** — 마케팅 reminder(`Omnichannel`·저니 리마인드·큐 발송) |
| Calendar Synchronization | Google/Outlook/CalDAV | **부재(out of scope)** — 캘린더 양방향 동기화 없음(채널 데이터 sync 는 별개·Part028) |
| Scheduling API(Idempotent) | Create/Update/Query/Availability | **부분(Job)** — cron/큐 스케줄 API·예약 발송. 사람 예약 API 아님 |
| Monitoring | Reservation/Conflict/Capacity | **부분** — cron 상태·큐 상태·`SystemMetrics`. 예약/충돌 지표 대상 없음 |
| Logging | Event/Reservation/Resource ID | **부분** — cron 로그·`omni_outbox`·`SecurityAudit`. Reservation ID 대상 없음 |
| Security(RBAC/격리) | 일정 접근 권한 | ★**준수(Job)** — cron SSOT·RBAC·테넌트 격리·`Crypto`. 캘린더 공유 정책 대상 없음 |
| Compliance | GDPR/개인정보 | **부분** — PII 미저장. 개인 일정 정보=대상 없음 |
| Disaster Recovery | Calendar/Reservation 복구 | **부분(Job)** — `omni_outbox` 재큐·DLQ replay·cron 재실행. 캘린더 복구 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Calendar First/Resource Aware/Conflict Free/Time Zone Safe/Capacity/Event/Tenant Isolated) | **부분(Job축만)** | ★Time Zone Safe(UTC 저장)·Event Driven(트리거)·Tenant Isolated 준수. Calendar/Resource/Capacity=out of scope |
| §4 Scheduling Architecture | **부분(Job 중심)** | cron/큐 스케줄러. 사람 예약 계층 아님 |
| §5~§6 Calendar Management/Event | **부재(out of scope)** | 사람 캘린더/이벤트 없음(마케팅/커머스 SaaS) |
| §7~§9 Resource/Reservation/Availability | **부재(out of scope)** | 물리 리소스 예약/가용성 없음. `Wms`=재고이지 dock 예약 아님 |
| §10~§11 Workforce/Shift | **부재(out of scope)** | 인력 배치/근무조 없음 |
| §12 Capacity Planning | **부분(대응물)** | `PlanLimits`/php-fpm 풀. 리소스 overbooking 아님 |
| §13 Time Zone | **★부분 준수** | UTC 저장(`gmdate`)·daypart KST. 사용자별 IANA/DST 부분 |
| §14 RFC 5545 Recurrence | **부재** | iCalendar 파서 없음. 반복=crontab·저니 트리거 |
| §15 Holiday Calendar | **부재** | 휴일 캘린더 없음(quiet-hours=개인 방해금지) |
| §16 Conflict Detection | **부재(out of scope)** | 예약 충돌 검사 없음. Job 멱등/dedup 존재 |
| §17 Scheduling Optimization | **부재(out of scope)** | 배정 알고리즘 없음. STO=발송 최적시각 대응물 |
| §18 Reminder | **★대응물** | 마케팅 reminder(`Omnichannel`·저니·큐) |
| §19 Calendar Sync | **부재(out of scope)** | Google/Outlook/CalDAV 동기화 없음 |
| §20 Scheduling API | **부분(Job)** | cron/큐 스케줄·예약 발송. 사람 예약 API 아님 |
| §21 Monitoring | **부분** | cron/큐 상태·`SystemMetrics`. 예약/충돌 지표 대상 없음 |
| §22 Logging | **부분** | cron 로그·`omni_outbox`·`SecurityAudit`. Reservation ID 대상 없음 |
| §23 Security | **★준수(Job)** | cron SSOT·RBAC·테넌트 격리·`Crypto` |
| §24 Compliance | **부분** | PII 미저장. 개인 일정 대상 없음 |
| §25 Disaster Recovery | **부분(Job)** | `omni_outbox` 재큐·DLQ·cron 재실행. 캘린더 복구 대상 없음 |
| §26~§27 PHP/Claude(Scheduling Engine/RFC5545 Parser/Calendar Adapter/Conflict Engine) | **부분(Job)** | ★cron·큐·STO·daypart·UTC. RFC5545 Parser/Calendar Adapter/Conflict Engine=out of scope |
| §28~§29 검증(calendar:health/schedule:conflicts 등) | **대상 없음** | artisan 없음·사람 캘린더 없음. cron 상태·`install_crontab.sh`·`check_cron_ssot.sh` 로 대체 |

---

## 4. 확립된 표준 (신규 스케줄링 코드가 따를 정본)

- ★**Job/배치 스케줄링 정본 = cron 스케줄러**(`backend/bin/*_cron.php` 34종·**CCIS Part019**). 신규 주기작업은 cron 워커 추가·`install_crontab.sh`·**`check_cron_ssot.sh`(cron SSOT 검증)** 준수. 중복 스케줄러 신설 금지.
- ★**발송 스케줄링 = `omni_outbox` STO**(개인 최적 발송시각)·**daypart**(`RuleEngine`·`withinAdSchedule`·KST `Asia/Seoul`)·예약 발송(scheduled_at). 발송 정본=`Omnichannel`(Part033).
- ★**시간 저장 = UTC(`gmdate`)**. 표시/스케줄 계산 시 타임존 명시(daypart 기본 KST). **로컬타임 raw 저장 금지**.
- ★**멱등·재시도**: Job/발송은 `omni_outbox`(attempts+backoff)·DLQ replay·cron 재실행. 중복 실행 방지(dedup).
- ★**테넌트 격리·정직 미산출**: 모든 스케줄/발송은 위조 불가 권위 tenant 격리. 데이터 없음=빈결과+사유(가짜값 금지).
- ★**사업범위 원칙**: **사람 캘린더/예약/인력배치(Appointment/Workforce/Resource Reservation)는 이 제품 범위 밖** — 요구 발생 전 선이식 금지. Job/캠페인 스케줄링만 확장한다.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 대부분 out of scope)

1. **사람 Calendar(Personal/Team/Org)·Calendar Event·CalDAV/Google/Outlook 동기화** — 안 함. **사업 범위 밖**(마케팅/커머스 ROI SaaS·회의/약속 캘린더 제품 아님). 요구 발생 시 별도 도메인.
2. **Resource Reservation(Meeting Room/Vehicle/Dock)·Availability·Conflict Detection** — 안 함. **사업 범위 밖**(물리 리소스 예약 시스템 아님). `Wms`는 재고/이동이지 dock 예약 아님.
3. **Workforce/Shift Scheduling·Scheduling Optimization(배정 알고리즘)** — 안 함. **사업 범위 밖**(인력 배치 제품 아님).
4. **RFC 5545(iCalendar) Recurrence·Holiday Calendar** — 안 함. 반복=crontab 표현식·저니 트리거. 휴일=quiet-hours(개인 방해금지)로 부분 대응.
5. **Capacity Planning(리소스 overbooking)** — 대응물. `PlanLimits`(플랜 쿼터)·php-fpm 풀(Part006)이 유사. 리소스 예약 capacity 아님.
6. **artisan `calendar:*`/`schedule:conflicts`/`resource:*` 명령** — 없음(Slim·사람 캘린더 없음). cron 상태·`install_crontab.sh`·`check_cron_ssot.sh` 로 대체.

★**준수하는 실 원칙(Job축)**: **cron 스케줄러(SSOT 검증)·발송 STO/daypart(KST)·예약 발송·UTC 저장·멱등/재시도(omni_outbox·DLQ)·테넌트 격리·정직 미산출**. ★**out of scope 정직 선언**: 사람 캘린더/리소스/인력 스케줄링은 이 제품 범위 밖이며 부재는 결함이 아니다.

---

## 6. Claude Code 구현 규칙

1. 주기작업=cron 워커(`backend/bin/*_cron.php`·Part019) 추가·`check_cron_ssot.sh` 준수(중복 스케줄러 금지).
2. 발송 스케줄=`omni_outbox` STO·daypart(`RuleEngine`·KST)·예약 발송(`Omnichannel`·Part033).
3. ★시간=UTC 저장(`gmdate`)·타임존 명시. 로컬타임 raw 저장 금지.
4. 멱등/재시도=`omni_outbox`(attempts+backoff)·DLQ replay·cron 재실행·dedup. 테넌트 격리 절대.
5. ★**사람 Calendar/Resource Reservation/Workforce/RFC5545/CalDAV 를 선이식하지 않는다** — 이 제품 사업 범위 밖(요구·제품결정 선행). Job/캠페인 스케줄링만 확장.
6. 정직 미산출(데이터 없음=빈결과+사유·가짜값 금지)·`SecurityAudit` 기록.

---

## 7. Completion Criteria

- [x] 스케줄링 스택 **실측**(Calendar/Resource/Workforce/RFC5545/CalDAV 부재·cron 34종·`omni_outbox` STO·daypart KST·예약발송·UTC 저장 실재)
- [x] 명세 §3~§29 **섹션별 매핑·판정**(사람 캘린더/예약/인력 스케줄링 **out of scope** 증명·Job 스케줄링 실재)
- [x] 실 Job 스케줄링(cron+STO+daypart+예약+UTC) 성문화(§4·상세=Part019)
- [x] ★cron SSOT·발송 STO/daypart(KST)·UTC 저장·멱등/재시도·테넌트 격리·**out of scope 정직 선언** 명시
- [x] 의도적 미적용 + 사유(§5) — Calendar/Resource/Workforce/RFC5545/CalDAV/Optimization(대부분 out of scope)
- [x] Claude Code 규칙(§6) · cron·`omni_outbox`·`Omnichannel`·`check_cron_ssot.sh` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **Job/캠페인 스케줄링**(cron 34종 + `omni_outbox` STO +
> daypart KST + 예약 발송 + UTC 저장)의 성문화이지 사람 캘린더/RFC5545/CalDAV/리소스 예약 이식이 아니다.
> ★**out of scope 정직 선언(MEA 064 어휘)**: Calendar/Appointment/Workforce/Resource Reservation 은 이
> 마케팅/커머스 SaaS 의 **사업 범위 밖**이며 부재는 결함이 아니다 — 요구·제품결정 없이 선이식하지 않는다.

---

## 다음 Part

**CCIS Part036 — Document Management, ECM, OCR & Digital Signature** — ★사전 실측 예고: 형식 ECM/DMS·OCR/IDP 엔진·전자서명(PAdES/XAdES/CAdES)은 **부재/부분**이나, 문서 실체는 **`MediaHost`/`ChannelImage`(미디어 저장·278차)·`DataExport`(csv/xlsx PDF)·`LegalDoc`(약관/법적문서)·`Dsar`(문서 보존/legal hold)·크리에이티브 자산(`CreativeStudio`/`CreativeStore`)·상품 이미지 아키텍처**로 부분 실재. Part036 도 실측→ECM/OCR/전자서명 부재증명→MediaHost+DataExport+LegalDoc 성문화. ★주의: 전자계약/전자서명은 대체로 사업범위 밖(035 out of scope 어휘 재적용 가능)·문서 보존은 Part034 Dsar 승계.
