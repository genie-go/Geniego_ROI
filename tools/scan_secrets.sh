#!/usr/bin/env bash
# 자격증명 유출 차단 — 규칙 SSOT (289차 승인 세션 ④)
#
# 배경: B4(자격증명 형태 차단) 규칙이 `.githooks/pre-commit` 안에만 있었고, pre-commit 은
#   ㉠ `core.hooksPath` = **클론별 로컬 config** → 새 클론·CI runner 는 아예 미실행
#   ㉡ `git commit --no-verify` 로 우회 가능
#   → **B4 가 사실상 opt-in** 이었다(1-6 G-06 · 5-8 GUARD-GAP-02).
#
# ★이 파일이 존재하는 이유(설계 판단):
#   CI 에 정규식을 복사하면 규칙이 **두 벌**이 되고, 한쪽만 고쳐지면 갈라진다.
#   289차 ②에서 정정한 "351이 문서 15편으로 복제돼 따로 낡은" 사고와 **정확히 같은 클래스**다.
#   그래서 규칙을 여기 **한 벌**로 두고 훅과 CI 가 **둘 다 이 스크립트를 호출**한다.
#
# 사용:
#   bash tools/scan_secrets.sh --staged              # pre-commit(B4): staged diff 검사
#   bash tools/scan_secrets.sh --range <base> <head> # CI: 커밋 범위 검사
#   bash tools/scan_secrets.sh --tree                # 전체 트리(백로그 조사용 · 게이트로 쓰지 말 것)
#
# 종료코드: 0 = 미검출 · 1 = 검출(호출측이 차단) · 2 = 사용법 오류

set -uo pipefail

# ── 규칙 SSOT ────────────────────────────────────────────────────────────────
# 추가 시 사유를 주석으로 남길 것. 훅·CI 양쪽에 자동 반영된다(호출처가 하나이므로).
SECRET_RE='(password\s*=\s*["'\''][^"'\'']{4,}|api[_-]?key\s*=\s*["'\''][^"'\'']{8,}|BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY|aws_secret_access_key|-----BEGIN CERTIFICATE-----)'

# 제외 경로: 훅 자신(규칙 문자열이 곧 매치됨) · 락파일(해시가 오탐) · 본 스크립트(동일 사유).
EXCLUDES=(':!.githooks/' ':!tools/scan_secrets.sh' ':!*lock.json' ':!*.lock')

usage() {
  echo "usage: scan_secrets.sh --staged | --range <base> <head> | --tree" >&2
  exit 2
}

MODE="${1:-}"
case "$MODE" in
  --staged)
    DIFF=$(git diff --cached -U0 -- "${EXCLUDES[@]}")
    SCOPE="staged diff"
    ;;
  --range)
    BASE="${2:-}"; HEAD_REF="${3:-}"
    [ -n "$BASE" ] && [ -n "$HEAD_REF" ] || usage
    # base 가 유효하지 않으면(신규 브랜치 첫 push 등 all-zero SHA) HEAD 단일 커밋으로 축소.
    if ! git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null; then
      echo "[scan_secrets] base '$BASE' 해석 불가 → HEAD 단일 커밋만 검사" >&2
      DIFF=$(git diff -U0 "${HEAD_REF}^" "$HEAD_REF" -- "${EXCLUDES[@]}" 2>/dev/null || echo "")
      SCOPE="${HEAD_REF}^..${HEAD_REF} (base 폴백)"
    else
      DIFF=$(git diff -U0 "$BASE" "$HEAD_REF" -- "${EXCLUDES[@]}")
      SCOPE="${BASE}..${HEAD_REF}"
    fi
    ;;
  --tree)
    # 전체 트리 스냅샷. **게이트 용도 금지** — 기존 백로그까지 잡아 상시 실패한다(283차 리포트 전용 원칙).
    DIFF=$(git ls-files -- "${EXCLUDES[@]}" | while read -r f; do
             [ -f "$f" ] && sed 's/^/+/' "$f" 2>/dev/null
           done)
    SCOPE="working tree (조사용)"
    ;;
  *) usage ;;
esac

# 추가된 라인(+)만 검사. 삭제 라인은 유출이 아니다.
HITS=$(printf '%s\n' "$DIFF" | grep -E '^\+' | grep -inE "$SECRET_RE" || true)

if [ -n "$HITS" ]; then
  echo "✖ 자격증명 형태 라인 검출 — 검사 범위: $SCOPE"
  echo ""
  # ★값 자체를 절대 출력하지 않는다 — CI 콘솔·Actions 아카이브에 평문이 남으면 유출이 확대된다
  #   (자격증명 유출을 잡는 도구가 자격증명을 유출하면 안 된다).
  #   따옴표 안 값 · PEM 본문을 마스킹하고, 어떤 규칙에 걸렸는지만 보인다.
  printf '%s\n' "$HITS" | head -10 \
    | sed -E 's/(["'\''])[^"'\'']*(["'\''])/\1***REDACTED***\2/g' \
    | sed -E 's/(BEGIN [A-Z ]*PRIVATE KEY).*/\1 ***REDACTED***/' \
    | cut -c1-90 | sed 's/^/   /'
  echo ""
  echo "검출 라인 수: $(printf '%s\n' "$HITS" | wc -l)"
  echo "조치: 값을 .env(커밋 제외)로 옮기고 스테이징에서 제거하라. 이미 push 됐다면 자격증명을 회전(rotate)하라."
  exit 1
fi

echo "✓ 자격증명 형태 라인 0건 — 검사 범위: $SCOPE"
exit 0
