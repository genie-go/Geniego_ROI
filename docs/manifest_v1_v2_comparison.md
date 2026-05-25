# Resolver consumer manifest v1 vs v2 비교 (session 159)

> 생성: 2026-05-25 (P4-depth3 후속, manifest v2 AST 도입)
> 도구: `tools/build_resolver_manifest_v2.mjs` (babel-parser + traverse)

---

## 1. 산출량 비교

| 항목 | v1 (regex) | v2 (AST) | 차이 |
|---|---:|---:|---:|
| direct | 7,542 | 5,272 | -2,270 (-30%) |
| prefix | 98 | 53 | -45 (-46%) |
| dynamic | 3 | 3 | 0 |
| scan_files | 300 | 247 | -53 (locale 제외) |
| parse_errors | n/a | 43 | n/a |
| manifest size | ~175 KB | ~124 KB | ~-30% |

## 2. set 비교 (intersection / only)

| Category | v1 ∩ v2 | v1-only | v2-only |
|---|---:|---:|---:|
| direct | 5,272 | 2,270 | **0** |
| prefix | 53 | 45 | **0** |
| dynamic | 3 | 0 | 0 |

**관찰**: v2 ⊊ v1 (strict subset). v2-only entries 가 없다는 것은 v1 의 regex 가 모든 실제 consumer 를 잡았다는 뜻 (false-negative 없음). v1-only entries 는 v1 의 false-positive.

## 3. v1-only entries 원인 분석

v1 의 SKIP_DIRS 가 `node_modules/dist/build/.git/.next/coverage` 만 포함 — **locale data 디렉토리 (frontend/src/i18n/locales/) 자체를 스캔**. ko.js 등의 value 문자열이 `t('...')` 매칭에 걸려 false positive 생성.

v1-only direct 샘플:
- `Data.` (앞에 dot 만 있는 비정상 entry)
- `alertAuto.active`, `alertAuto.activeCount`, ... (locale value 가 path-like 모양일 때)

v1-only prefix 샘플:
- `campaignMgr.*`, `caseStudy.*` 등 (locale 의 `\`...\${...}\`` 비슷한 패턴)

v2 의 SKIP_PATH_SUBSTRINGS 에 `i18n/locales`, `i18n/locales_backup` 추가하여 해결.

## 4. P4 apply 영향 비교

manifest v1 vs v2 로 P4-depth2/depth3 dry-run 재실행:

| Test | Manifest | delete | skip - prefix block | skip - verdict not dead | est Δ leaves |
|---|---|---:|---:|---:|---:|
| depth=2 | v1 | 73 | 26 | 21 | -11,390 |
| depth=2 | v2 | **73** | **26** | 21 | -11,390 |
| depth=3 | v1 | 115 | 23 | 18 | -6,770 |
| depth=3 | v2 | **115** | **23** | 18 | -6,770 |

**완전 동일** — v1 의 false-positive direct entries 가 현 depth=2/3 candidate 들의 root_path 와 겹치지 않아 protection 영향 0.

## 5. 시나리오 판정: **C (v1 ≈ v2 in apply outcome)**

- spec §5 시나리오 A (v2 더 정밀 → delete 증가) 가 manifest 산출량에서는 성립하지만
- 실제 dead-subtree apply outcome 에서는 v1 ≈ v2 (Scenario C)
- 이유: v1 false-positive direct entries (locale self-references) 는 현 P4 candidate root paths 와 무관

## 6. 권장사항

1. **manifest v2 를 default 로 승격** — 의미상 정확하고 size 30% 작음. 향후 트랙에서 사용
2. **v1 보존** (compat) — 도구/JSON 모두 보존, 비교 가능 상태 유지
3. **현 P4-depth2/3 결과 신뢰 유지** — manifest 변경이 결과 영향 0 이므로 기존 SUMMARY 그대로 사용자 review 진행 가능
4. **다음 manifest 트랙**:
   - parse_errors 43건 분석 (어떤 파일이 babel-parser 로도 실패하는지)
   - wrapper 함수 추적 (예: `const tx = useT(); tx('foo')`) — 현재 v2 패턴은 직접 `t/$t/.t` 만 매칭
   - conditional require / dynamic import 추적 (현 spec §1 한계 잔존)
