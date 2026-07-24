# CWIS Part004-04 SP02-TK002 — 계열 종결 기록

| 항목 | 값 |
|---|---|
| 계열 | `CWIS-P004-U04-WS01-SP02-TK002` (Favorites 서버 지속화 6계층) |
| **종결 판정** | **CLOSED (Option A — UI 프리퍼런스)** |
| 종결 결정 | 사용자 확정 (2026-07-24) — "계열 종료하고 신규 Part로 이동" |
| 종결 리비전 | `93d65986d3f` |

---

## 1. 계열 전체 판정 요약

| Step | 대상 | 판정 | 커밋 |
|---|---|---|---|
| ST01 | Domain Layer | **NOT_IMPLEMENTED** (사용자확정) | `d7c1aafeaa1` |
| ST02 | Application Layer | **BLOCKED** | `1234a6f0957`* |
| ST03 | Infrastructure & Persistence | **BLOCKED** | `1234a6f0957`* |
| ST04 | Database Migration & Schema | **BLOCKED (불필요)** | `db0968cc457` |
| ST05 | API & HTTP Layer | **BLOCKED (불필요)** | `93d65986d3f` |
| ST06+ | (후속) | 사전 답변됨 — 미투입 | — |

\* ST02·ST03 판정 산출물은 `1234a6f0957`(Option A 구현 커밋)에 함께 포함.

---

## 2. 단일 근본 원인

5개 Step 이 각각 다른 이유로 막힌 것이 아니다. **하나의 뿌리**다.

```
PHASE_1 결정(사용자 4회 확정) = "즐겨찾기 = UI 프리퍼런스(device-local)"
  → 서버 지속화 축(Domain·Application·Infra·Schema·API) 전체가 요구사항에서 소멸
  → 로드맵이 PHASE_2 를 conditional_on="PHASE_1 정의 = MEMBER_DATA" 로 명시했고
     그 조건이 거짓이므로 SP02-TK002 전 계층이 조건 미충족

+ 저장소 구조적 사실(불변):
  · DDD/CQRS/ORM 스트라텀 0건 — 실재=Slim 4 + raw PDO 절차형
  · §허용 코드경로(app/·src/·modules/·Shared/·Http/·Presentation/·routes/) 전부 부재
  · 마이그레이션 dir 세션172 정지 — 정본=ensureTables 자가치유
  · Workspace 엔티티·멤버십 부재(principal 다중축 없음)
```

즉 spec 은 성숙한 DDD/Laravel 저장소를 전제로 작성됐고, 실제 저장소는 그렇지 않다. 서버 지속화를 강행했다면 **호출부 없는 죽은 코드**(ST02~ST04) 또는 **도달 가능한 죽은 공격면**(ST05)을 생산했을 것이다 — `67dee1fe46a` 가 고친 "도달 불가" 결함의 재생산.

---

## 3. 실제로 완료·배포된 것 (UI 프리퍼런스 축)

즐겨찾기의 실질 잔여 작업은 PHASE_3(프론트엔드)에 있었고 전부 처리·운영/데모 배포 완료(커밋 `1234a6f0957`):

| 항목 | 결과 |
|---|---|
| CAP-04 aria-pressed | 이미 해소돼 있었음(`67dee1fe46a`)·라이브 77개 확인 |
| BACKLOG-1 (6개↑ 열람) | `slice(0,5)` 제거 + 스크롤 컨테이너 |
| BACKLOG-2 (모바일 터치) | 별표·해제 버튼 44×44 (WCAG 2.5.5) |
| 부수 선재결함 | 데스크톱 패널 소멸(`flexShrink:0`) 수정 |
| 회귀 가드 | `npm run fav:test` 18/18 · `nav:test` 36/36 |

검증: Playwright 모바일 390 / 데스크톱 1440 실측 + 운영·데모 분리빌드 dist swap + 라이브 소스 바이트 확인.

**미구현(의도적):** BACKLOG-3 드래그 순서(CAP-05) — 요구 미확인·LOW/P3.

---

## 4. Option B 재개 시 재사용 자산 (보존됨)

즐겨찾기를 **기기 간 동기화 회원데이터**로 재정의하기로 결정이 바뀌면, 아래 설계 자산을 그대로 조립한다(재작성 불필요):

| 자산 | 내용 |
|---|---|
| `favorites-persistence-schema-requirements.json` | 테이블 스키마 — ★MySQL 부분 유니크 미지원 우회(`active_key`), status+removed_at, 인덱스 |
| `favorites-api-contract.json` | 9개 엔드포인트 — 저장소 관용(`/api/v{NNN}`·`Handlers\Favorites`·`PM\Shared::gate`·`['ok'=>bool]`) |
| `favorites-application-implementation-summary.json` | Convention 조사 13축 + 판정 근거 |
| `favorites-infrastructure-implementation-summary.json` | 동시성·Soft Delete·중복방지 전략 |

**구현 형태(중요):** DDD/Controller/Migration 이 아니라 저장소 native —
`ensureFavoriteTable(PDO,$isDemo)` + `Handlers\Favorites` + `routes.php`(/api 접두, `index.php` 공개경로 bypass) + `PM\Shared::gate` 재사용. principal=user 단일축, 기존 localStorage 무후퇴 유지 + 클라이언트 1회 병합(서버 백필 불가).

---

## 5. 종결

**SP02-TK002 계열 = CLOSED.** 후속 Step(ST06+)은 Option A 결정에 의해 사전 답변됐으므로 투입하지 않는다. 즐겨찾기 CWIS 의 남은 실질 항목은 BACKLOG-3(요구 미확인) 뿐이다.

→ 신규 Part 로 이동.
