# CHANGE GATE — 모든 수정 전 필수 10단계 절차 (사용자 지시 265차)

> **모든 코드 수정·신규 구현 착수 전 반드시 이 게이트를 통과한다.**
> 목적: 중복 구현 방지 + 기능 후퇴/버그 재발 방지. 이 문서는 각 단계의 **정본 소스를 가리키는 단일 진입점(인덱스)** 이며, 내용을 중복 보관하지 않는다.
> 관련: `feedback_no_duplicate_features`(Absolute Constitution 15조) · `docs/IMPLEMENTATION_STATUS.md` · `reference_audit_false_positives`(메모리).

## 10단계 게이트

| # | 단계 | 실행 방법 / 정본 소스 |
|---|------|------------------------|
| 1 | **전체 스캔** | `Grep`/`Glob` 로 관련 도메인 전수: `backend/src/Handlers/`, `frontend/src/pages/` + `components/`, `backend/src/routes.php`($custom+$register), 사이드바/라우트 매니페스트 |
| 2 | **동일 기능 검색** | 기능명·EP·핸들러·컴포넌트·훅·Context·테이블을 grep. **존재/부재를 코드로 증명**(추측 금지) |
| 3 | **Architecture Registry 확인** | `docs/IMPLEMENTATION_STATUS.md`(도메인 정본 이력) + 도메인별 `docs/*_ARCHITECTURE.md`(ADMIN_GROWTH_AUTOMATION·TEAM_PERMISSION·AI_PROFIT_OS) |
| 4 | **PM Change History 확인** | `NEXT_SESSION.md`(세션별 작업로그) · `docs/PM_CURRENT_STATUS.md` · `docs/PM_PRIORITY_PLAN.md` · `API_CHANGELOG.md`/`docs/*_CHANGELOG.md` · `git log` |
| 5 | **Audit History 확인** | `docs/PROJECT_AUDIT_REPORT.md` · `docs/SECURITY_AUDIT_REPORT.md` · `docs/DUPLICATE_AUDIT_REPORT.md`/`docs/*_DUPLICATE_AUDIT.md` · FP 레지스트리(사용자 메모리 `reference_audit_false_positives`) · `project_n*` 메모리 |
| 6 | **과거 수정 이력 확인** | `git log --all -- <경로>` + `NEXT_SESSION.md` 최근 차수 + 관련 `project_n*` 메모리 |
| 7 | **동일 기능 수정 여부 확인** | 위 3~6에서 같은 기능이 이미 수정·구현됐는지 대조. "✅ 구현됨"·"재플래그 금지" 항목 재확인 |
| 8 | **동일 기능 존재 시 재구현 금지** | 존재하면 **절대 신설/재구현 금지** |
| 9 | **기존 확장 가능성 먼저 검토** | 데모전용→운영배선·얕음→심화·미배선→배선·미노출→노출. 기존 인프라(Db/UserAuth/apiClient/ClaudeAI/ad_design 등) 재사용 |
| 10 | **확장 불가 시에만 신설 허용** | 진짜 부재(존재증명 완료) + 도메인 구분 명시 시에만. **신설은 기존보다 우수·기존과 무중복 필수** |

## 판정 원칙
- **핸들러 미배선 ≠ 미배선 실백엔드**: 존재증명 시 응답이 **실데이터인지 빈 스텁/데모전용인지**까지 확인. 스텁 배선은 철칙(운영 목데이터 금지) 위반이므로 배선 대상 아님(265차 CustomerAI 사례).
- **"배선 존재 ≠ 필드 정합"**: 배선돼 있어도 프론트/백엔드 필드 키 불일치가 잠복할 수 있음(265차 geo readiness 사례).
- **스키마 판정은 라이브 `SHOW COLUMNS`만 정본**(덤프/메모리 프로즈 맹신 금지·263/265차 Paddle 사례).
- **도메인 구분 명시**: 유사해 보여도 다른 엔티티면 신설 정당(예: 머천트 프로모션 ≠ 플랫폼 구독쿠폰·키워드SoS ≠ SKU가격경쟁).

## 신규 구현 시 기록 의무 (게이트 통과 후)
신규/확장 완료 시 즉시 반영: `docs/IMPLEMENTATION_STATUS.md`(구현 이력) + `NEXT_SESSION.md`(차수 로그) + 해당 `project_n*` 메모리. 다음 세션이 같은 것을 다시 만들지 않도록 이력을 남긴다.
