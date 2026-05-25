# CONTRIBUTING.md §7 patch — 159 신규 trap 2건

> **세션**: 160
> **트랙**: 159 잔여 영구화 (보강 메모, §7 누적)
> **외부 의존**: 0

---

## 적용 위치

CONTRIBUTING.md §7 (line 209 시작, MSYS path / Node ESM cache / Heredoc backslash 3개 서브섹션 뒤) **마지막 서브섹션 다음**에 추가.

## 추가 내용 (CC Edit tool 로 append)

기존 §7 마지막 trap 서브섹션 (Heredoc backslash) 끝 라인 뒤에 다음 블록을 정확히 삽입:

```markdown

### Detector CSV columns ≠ spec 추정 (159 patch06/07 학습)

**Symptom**: spec §3 "데이터 입력" 에 detector 의 CSV 컬럼 가정 (e.g. `ch_orig`, `ch_replace`, `resolver_refs`) 작성 후 실 detector 출력이 다른 컬럼 (`verdict`, `ref_count`, `from_locale_only`) 만 산출. apply 진입 시 컬럼 미스매치로 즉시 중단.

**Root cause**: detector 산출 schema 와 spec 작성자의 추측이 분기. 159 patch06 (wronglang) / patch07 (dead-subtree) 양쪽 동일 패턴 발생.

**Mitigation**:
- 모든 detector 트랙 spec 의 §3 (또는 등가 절) 에 다음 명시 의무: "CC 가 spec 진입 전 `head -5 <detector_output.csv>` 로 실제 columns 확인".
- 검수자는 spec draft 작성 후 사용자 저장 전 CC 에게 detector 출력 sample grep 1회 명령 발행.
- spec ↔ 출력 불일치 발견 시 즉시 spec 재설계, commit 전 사용자 재확인.

**Recovery**: 159 patch06 은 외부 매핑 JSON (`wrong_language_replacement_map.json`) 도입으로, patch07 은 7-col verdict + conservative skip 모드로 우회. spec 재설계 후 진입 즉시 PASS.

### paths-ignore 정상 동작 인지 (159 학습)

**Symptom**: docs/* + tools/* + *.md 만 변경된 commit push 후 GitHub Actions CI workflow 가 트리거되지 않음. 159 후반 다수 commit (manifest v2 spec / SUMMARY 등) 가 CI status 미노출.

**Root cause**: `.github/workflows/deploy.yml` 의 `paths-ignore` 가 `**.md`, `**.txt`, `docs/**`, `.claude/**` 매칭 → workflow 자체 skip. **production 영향 0** (정상 의도된 동작).

**Mitigation**:
- paths-ignore 매칭 commit 의 CI status check 은 최대 1회 curl. 미노출 시 즉시 정상 처리, 60s polling loop 금지.
- workflow 트리거 필요 시 (e.g. `src/**` 또는 `package.json` 변경 포함) 동일 commit 에 묶거나 별도 commit.

**Recovery**: 불필요. paths-ignore commit 은 의도된 CI skip. paranoia 금지.
```

## 회귀 검증

```bash
t bash -c "cd /e/project/GeniegoROI && wc -l CONTRIBUTING.md"
# 기대: 305 + 추가 라인 (~40)

t bash -c "cd /e/project/GeniegoROI && grep -n 'Detector CSV columns\|paths-ignore 정상 동작' CONTRIBUTING.md"
# 기대: 2 매치 (각 서브섹션 헤더)

t bash -c "cd /e/project/GeniegoROI && grep -c '^###' CONTRIBUTING.md"
# 기대: 기존 ### 카운트 + 2
```

## Commit

```
docs(contributing): §7 신규 trap 2건 — detector CSV columns / paths-ignore 정상 인지 (159 학습)
```

paths-ignore 매칭 commit (CI 트리거 없음, 정상).

---

**patch 종결.**
