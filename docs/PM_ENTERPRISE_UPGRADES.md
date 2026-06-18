# PM_ENTERPRISE_UPGRADES

231차 프로젝트 관리(PM) 메뉴 초엔터프라이즈/글로벌급 초고도화. **기존 PM-Core(Projects/Tasks/Gantt/Milestones/Dependencies/Assignees/Comments/Attachments/Audit/SSE) 위에 추가 — 중복 신설 없음.**

## 추가된 엔터프라이즈 도메인

| 도메인 | 내용 | 백엔드 | 프론트 |
|---|---|---|---|
| 포트폴리오/프로그램 | 프로젝트를 묶어 진척·예산·EVM 롤업 | `pm_portfolio`(+`pm_projects.portfolio_id`) | `/pm/portfolio` (PMPortfolio) |
| EVM(획득가치) | PV/EV/AC/SV/CV/SPI/CPI/EAC/VAC 계산 | `Enterprise::projectEvm/computeEvm` | `/pm/projects/:id/evm` (PMEvm) |
| RAID 등록부 | Risk/Issue/Assumption/Dependency, 확률×영향=심각도 | `pm_raid` | `/pm/projects/:id/raid` (PMRaid) |
| 타임시트 | 실투입 시간·청구 가능 추적(EVM AC 소스) | `pm_time_log` | (EVM/태스크 연계) |
| 베이스라인 | 일정·예산 스냅샷 | `pm_baseline` | PMEvm 내 |
| 리소스 가용량 | 담당자별 워크로드·부하율(주 40h) | `Enterprise::resourceCapacity` | `/pm/resources` (PMResources) |

## 백엔드
- 신규 핸들러 `backend/src/Handlers/PM/Enterprise.php` (extends `PM\Shared` — 기존 게이트/감사/ID 재사용).
- 신규 테이블 3종 + `pm_projects.portfolio_id`(additive). 런타임 `ensure()`(IF NOT EXISTS, MySQL/SQLite). DROP/삭제 0.
- 라우트 17종 × (`/v425/pm/*` + `/api/` alias) — `$custom` 맵 + `$register` 쌍. 기존 `/v425/pm/` bypass·`Shared::gate`(tenant 격리, read=viewer/write=analyst) 상속.
- 감사: 모든 mutation `pm_audit_log` 기록(기존 SSOT).

## EVM 계산식
- BAC = `pm_projects.budget_amount`(미설정 시 추정시간×단가 대체).
- EV% = Σ(estimate_hours 가중 × progress/100) / Σweight. PV% = 오늘까지 due 도래한 태스크 가중 비율.
- AC = Σ(`pm_time_log.hours`) × `metadata.hourly_rate`(단가 미설정 시 시간 합).
- SPI=EV/PV, CPI=EV/AC, EAC=BAC/CPI, VAC=BAC−EAC. (PV/AC=0 시 해당 지표 null 처리.)

## 프론트
- 사이드바 `pm` 그룹 확장: Overview + **포트폴리오** + **리소스**.
- 프로젝트 상세 탭 확장: 보드/작업/Gantt/마일스톤 + **RAID** + **EVM** + 활동/설정.
- 신규 페이지 4종(PMPortfolio/PMResources/PMRaid/PMEvm) + 서비스 `services/pmApi.js`. 기존 PM fetch 패턴(Bearer genie_token, /api/v425/pm/*) 통일.
- i18n: `pmx` 신규 ns + `gNav` 2키 × 15개국. (SPI/CPI/EVM/RAID 등 약어는 전 언어 공통.)

## 검증
- React/Vite 빌드 PASS. PHP 구조(brace) 균형. ★서버 `php -l`·운영 e2e·배포는 사용자 승인 후.

## 잔여(후속 후보)
변경관리(CR) 워크플로우·커스텀 필드·간트 드래그 리스케줄·EVM 추세 차트·알림 엔진·포트폴리오 PDF 리포트·태스크 단위 타임시트 UI.
