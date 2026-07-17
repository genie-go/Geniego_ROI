# DSAR — Script Task 제한 (§28)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §28 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Script Task | **부재** — 워크플로 스크립트 노드 grep 0 | `NOT_APPLICABLE` |
| `eval()`·`create_function`·`system()`·`passthru`·`popen` | **backend/src grep 0** | (차단 대상 자체가 미도입) |
| Shell 실행 | **2건뿐** — `WmsCctv.php:564`(`@shell_exec('command -v ffmpeg')`) · `WmsCctv.php:635`(`@proc_open(['/bin/sh','-c',$cmd], ...)`) = **CCTV 브리지 전용**(274차) | `KEEP_SEPARATE_WITH_REASON` |
| ★Sandboxed Expression 선례 | `RuleEngine`(RuleEngine.php:24) — **화이트리스트 연산자 상수** `OPS = ['lt','lte','gt','gte','eq']`(:33) + `switch` 분기(:435-437) · **eval 미사용** · 진입점 `evaluateAll`(:181)/`evaluateTenant`(:194) | `VALIDATED_LEGACY`(**재사용 강제 · 표현식 엔진 신설 금지**) |
| Registered Function 레지스트리 | 부재 — 함수 등록/승인 기전 grep 0 | `NOT_APPLICABLE` |

**★축 주의 — §28은 "부재 = 갭"이 아니라 "부재 = 이미 지켜진 상태"인 드문 절이다.** 원문이 차단을 요구하는 10종 중 대다수(임의 코드 실행·Dynamic Eval·Shell)는 **애초에 도입된 적이 없다**(`eval` grep 0). 🔴 그러나 이것을 **"§28 충족"으로 계산하면 역산이다** — 현행이 안전한 이유는 **차단 장치가 있어서가 아니라 Script Task 자체가 없어서**다. **Script Task를 신설하는 순간 10종 전부가 새로 열린다.** 따라서 §28의 판정은 "차단 장치 `NOT_APPLICABLE`"이며, **원문 §16 "Production 에서 Restricted Script Node 없음"과 짝**을 이룬다 — **프로덕션 차단이 전제되지 않으면 §28의 나머지는 무의미**하다.

## 1. 원문 전사 + 판정 — Production 차단 항목 **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 임의 코드 실행 | 차단 장치 부재 · **현행은 실행 경로 자체가 없음**(Script Task 부재) | `NOT_APPLICABLE` |
| 2 | Secret 원문 접근 | 차단 장치 부재 · 인접 = 자격증명 암호화 저장(`Crypto::decrypt` Alerting.php:914 `nDec`) — **복호 경로는 존재**하므로 스크립트에 노출되면 즉시 유출 | `NOT_APPLICABLE` |
| 3 | 직접 Database Write | 차단 장치 부재 · 🔴 현행 전 핸들러가 `$pdo->prepare(...)->execute()` **직접 write** — 스크립트가 같은 PDO를 잡으면 무제한 | `NOT_APPLICABLE` |
| 4 | Authorization 우회 | 차단 장치 부재 · 🔴 **선례 존재** = `Alerting::executeAction:612` 죽은 읽기(승인 우회 실집행) | `NOT_APPLICABLE` |
| 5 | Approval Status 직접 변경 | 차단 장치 부재 · 🔴 현행 status 전이는 **선언 0 · 155건/44파일 인라인 UPDATE** — 상태 변경을 막을 지점이 없음 | `NOT_APPLICABLE` |
| 6 | 외부 Network 무제한 호출 | 차단 장치 부재(스크립트) · 인접 = **SSRF 방어 선례** `OpenPlatform.php:414-424`(전달 직전 DNS 재검증) | `LEGACY_ADAPTER`(방어 패턴 재사용) |
| 7 | Tenant Context 없는 실행 | 차단 장치 부재 · 인접 = API 미들웨어 `X-Tenant-Id` 주입(index.php) — **스크립트 실행 컨텍스트에는 미적용** | `NOT_APPLICABLE` |
| 8 | Dynamic Eval | `eval`·`create_function` **grep 0** — 도입된 적 없음 | `NOT_APPLICABLE` |
| 9 | Shell 실행 | `WmsCctv.php:564,635` **2건뿐**(ffmpeg CCTV 브리지) — 승인 도메인과 무관 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | 파일 시스템 임의 접근 | 차단 장치 부재 · ⚠️278차 실측 = 쓰기 디렉터리 `www-data` 소유 이슈 이력 | `NOT_APPLICABLE` |

**실측 개수: 10 / 10 전사.** 커버리지 = 차단장치 부재 8 · 어댑터 1 · 별도유지 1 · **현행 충족 0**.

## 2. 규칙

- 🔴 **`eval` grep 0 을 "§28 충족"으로 계산 금지.** 안전의 원인은 차단이 아니라 **부재**다. Script Task를 신설하면 10종이 전부 새로 열린다 — 현행 안전은 **승계되지 않는다.**
- 🔴 **표현식 엔진 신설 금지 — `RuleEngine`(RuleEngine.php:24) 패턴 재사용 강제.** 원문의 **"사전 승인된 Sandboxed Expression 또는 Registered Function만 사용한다"** 는 이미 레포에 선례가 있다: **화이트리스트 연산자 상수**(`OPS` :33) + `switch` 분기(:435-437) + **eval 미사용**. 이 형태를 벗어나 문자열 표현식을 파싱·평가하는 순간 §28 항목 1·8이 동시에 열린다.
  ※ 단 `RuleEngine`의 **연산자 집합(5종)을 승인 도메인에 그대로 강제하지 마라** — 재사용 대상은 **"화이트리스트+switch"라는 안전 형태**이지 연산자 목록이 아니다.
- 🔴 **§16 "Production 에서 Restricted Script Node 없음"이 §28의 전제다.** 프로덕션 차단 없이 나머지 9종을 개별 방어하려 들면 방어 표면이 무한해진다 — **Production 전면 차단이 1차 게이트**, Sandboxed Expression 화이트리스트가 2차다.
- **항목 5(Approval Status 직접 변경)는 현행 구조상 가장 위험하다** — 상태머신 부재(`UPDATE ... SET status=` **155건/44파일** · 전이 규칙 선언 **0** · 전이 가드 **4곳뿐**: `FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155)라 **막을 단일 지점이 없다**. Script Task 도입 시 승인 상태 전이는 **§23 5단 규율 경유 외 경로를 물리적으로 차단**해야 한다.
- **항목 6은 `OpenPlatform.php:414-424` SSRF 방어(전달 직전 DNS 재검증)를 재사용하라** — 신설 금지.
- **`WmsCctv` 의 shell 2건을 §28 위반으로 재플래그 금지** — CCTV 브리지 도메인(274차)이며 승인 워크플로와 무관하다. 단 **Script Task가 이 경로를 재사용하지 못하도록** 격리하라.
