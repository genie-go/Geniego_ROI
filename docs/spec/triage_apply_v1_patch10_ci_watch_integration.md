# patch10 — ci_watch.sh 와 production_smoke.sh 통합 (DRY)

> **세션**: 160
> **트랙**: patch09 후속 (보강 메모 #28 마무리)
> **외부 의존**: 0
> **i18n 데이터 변경**: 0
> **사전 상태**: HEAD `4c1b083`

---

## 1. 목적

ci_watch.sh 의 embedded smoke 블록 (line 195-208) 을 production_smoke.sh 호출로 대체. DRY 확보 + 도구 단일 진입점 유지.

**의미론 보존**: ci_watch 의 lang≠ko soft-warn 정책은 보존. production_smoke.sh 에 `--soft-lang` flag 추가하여 lang fail 시 warning print + exit 0 으로 변환.

## 2. 사전 조건 (CC 진입 전 grep — §6 Spec drafting standards 준수)

### 2.1 ci_watch.sh smoke 블록 정확 위치

```bash
sed -n '195,208p' tools/ci_watch.sh
```
기대: hard-coded `https://roi.genie-go.com/`, lang≠ko 시 `⚠️ soft warn` 메시지 + exit 0 유지.

### 2.2 production_smoke.sh 의 lang exit code

```bash
grep -n 'FAIL_LANG\|exit 2' tools/production_smoke.sh
```
기대: FAIL_LANG > 0 시 `exit 2`.

### 2.3 production_smoke.sh 호출 시 set -e 친화성

```bash
grep -n 'set -e' tools/ci_watch.sh
```
ci_watch 가 `set -e` 환경이면 production_smoke 의 exit 2 가 ci_watch abort 유발. invoke 후 명시적 분기 필요.

## 3. 변경 사항

### 3.1 `tools/production_smoke.sh` — `--soft-lang` flag

#### 3.1.1 옵션 파싱 추가

기존 `while [[ $# -gt 0 ]]` 블록의 `case` 안에 1 case 추가:

```bash
--soft-lang) SOFT_LANG=1; shift ;;
```

#### 3.1.2 변수 초기화

`MODE="single"` 라인 인근에 추가:

```bash
SOFT_LANG=0
```

#### 3.1.3 종합 판정 부분 보정

기존:
```bash
if (( FAIL_LANG > 0 )); then
  echo "[FAIL] ${FAIL_LANG} lang mismatch"
  exit 2
fi
```

변경 후:
```bash
if (( FAIL_LANG > 0 )); then
  if (( SOFT_LANG == 1 )); then
    echo "[WARN] ${FAIL_LANG} lang mismatch (soft mode, exit 0)"
  else
    echo "[FAIL] ${FAIL_LANG} lang mismatch"
    exit 2
  fi
fi
```

### 3.2 `tools/ci_watch.sh` — embedded smoke 제거 + 위임

기존 line 195-208 의 smoke 블록을 다음으로 교체:

```bash
# patch10: production_smoke.sh 위임 (DRY, --soft-lang 으로 기존 의미론 보존)
if bash tools/production_smoke.sh --soft-lang; then
  echo "[OK] production smoke pass"
else
  smoke_ec=$?
  if [[ $smoke_ec -eq 1 ]]; then
    echo "[FAIL] production smoke HTTP fail"
    exit 1
  fi
  # exit 3 (diff) / 4 (usage) 는 ci_watch context 에서 N/A — 발생 시 그대로 abort
  echo "[FAIL] production smoke unknown ec=$smoke_ec"
  exit 1
fi
```

**주의**: ci_watch.sh 가 `set -e` 환경이면 `if cmd; then` 패턴이 안전 (cmd 실패가 if 분기로 처리되어 set -e 비발동).

## 4. 회귀 검증

| # | 검증 | 기대 |
|---|---|---|
| T1 | `bash tools/production_smoke.sh --soft-lang` (정상 prod) | HTTP 200 / lang=ko / `[PASS]` / exit 0 |
| T2 | `bash tools/production_smoke.sh --soft-lang --domain https://invalid.example.com` | HTTP 000 / FAIL_HTTP / exit 1 (soft-lang 은 lang 만 영향, HTTP 는 hard) |
| T3 | `bash tools/production_smoke.sh` (--soft-lang 없이) | 기존 동작 (lang≠ko 시 exit 2). 정상 prod 는 그대로 PASS |
| T4 | `bash -n tools/production_smoke.sh` | SYNTAX_OK |
| T5 | `bash -n tools/ci_watch.sh` | SYNTAX_OK |
| T6 | ci_watch 통합 후 직접 invoke (CI 트리거 없이 smoke 부분만): `bash tools/ci_watch.sh --commit 4c1b083 --skip-poll` (해당 flag 존재 시) 또는 production_smoke 단독 invoke 로 대체 검증 | smoke 위임 성공 |
| T7 | Sacred SHA + ko leaves | 변동 0 |

## 5. Commit

```
refactor(tools): ci_watch.sh ↔ production_smoke.sh 통합 (DRY, #28 마무리)

- production_smoke.sh: --soft-lang flag 추가 (lang fail 시 WARN + exit 0)
- ci_watch.sh: embedded smoke 14줄 제거 → production_smoke.sh --soft-lang 위임
- 의미론 보존: ci_watch 의 lang soft-warn 정책 유지, HTTP hard-fail 유지
- DRY: 단일 smoke 도구로 일원화

T1-T7 PASS
```

## 6. 종결 조건

- T1~T7 PASS
- 1 commit push
- production self-smoke 자기검증

---

**spec 종결.**