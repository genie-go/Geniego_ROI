import os
import sys
import subprocess
import glob as glob_module
import anthropic
from anthropic import beta_tool

# Windows 콘솔 한글 출력 설정
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stdin.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
client = anthropic.Anthropic()


# ─────────────────────────────────────────
# 파일 관련 툴
# ─────────────────────────────────────────

@beta_tool
def read_file(path: str) -> str:
    """파일 내용을 읽습니다. 상대 경로는 프로젝트 루트 기준입니다.

    Args:
        path: 파일 경로 (예: frontend/src/App.jsx 또는 절대 경로)
    """
    full_path = path if os.path.isabs(path) else os.path.join(PROJECT_ROOT, path)
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        with open(full_path, "r", encoding="cp949", errors="replace") as f:
            return f.read()
    except Exception as e:
        return f"오류: {e}"


@beta_tool
def write_file(path: str, content: str) -> str:
    """파일을 생성하거나 덮어씁니다. 상대 경로는 프로젝트 루트 기준입니다.

    Args:
        path: 저장할 파일 경로
        content: 저장할 내용
    """
    full_path = path if os.path.isabs(path) else os.path.join(PROJECT_ROOT, path)
    try:
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"저장 완료: {full_path}"
    except Exception as e:
        return f"오류: {e}"


@beta_tool
def list_files(directory: str = "", pattern: str = "*") -> str:
    """폴더의 파일 목록을 반환합니다. 상대 경로는 프로젝트 루트 기준입니다.

    Args:
        directory: 조회할 폴더 (기본값: 프로젝트 루트)
        pattern: 파일 패턴 (예: *.jsx, *.php)
    """
    base = os.path.join(PROJECT_ROOT, directory) if directory else PROJECT_ROOT
    try:
        matches = glob_module.glob(os.path.join(base, "**", pattern), recursive=True)
        rel = [os.path.relpath(m, PROJECT_ROOT) for m in matches[:100]]
        return "\n".join(rel) if rel else "(없음)"
    except Exception as e:
        return f"오류: {e}"


@beta_tool
def search_in_files(keyword: str, directory: str = "", extension: str = "") -> str:
    """프로젝트 파일에서 키워드를 검색합니다.

    Args:
        keyword: 검색할 단어 또는 코드
        directory: 검색 범위 폴더 (기본값: 프로젝트 루트)
        extension: 파일 확장자 필터 (예: jsx, php, js)
    """
    base = os.path.join(PROJECT_ROOT, directory) if directory else PROJECT_ROOT
    pattern = f"*.{extension}" if extension else "*.*"
    results = []
    try:
        for filepath in glob_module.glob(os.path.join(base, "**", pattern), recursive=True):
            if os.path.isfile(filepath):
                try:
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        for i, line in enumerate(f, 1):
                            if keyword.lower() in line.lower():
                                rel = os.path.relpath(filepath, PROJECT_ROOT)
                                results.append(f"{rel}:{i}: {line.rstrip()}")
                                if len(results) >= 50:
                                    break
                except Exception:
                    pass
            if len(results) >= 50:
                break
        return "\n".join(results) if results else f"'{keyword}' 검색 결과 없음"
    except Exception as e:
        return f"오류: {e}"


# ─────────────────────────────────────────
# 프로젝트 빌드/실행 툴
# ─────────────────────────────────────────

@beta_tool
def run_command(command: str) -> str:
    """프로젝트 루트에서 명령어를 실행합니다.

    Args:
        command: 실행할 명령어 (예: npm run build, git status, node script.js)
    """
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
        output = result.stdout + result.stderr
        return output[:5000] if output else "(출력 없음)"
    except subprocess.TimeoutExpired:
        return "타임아웃 (120초 초과)"
    except Exception as e:
        return f"오류: {e}"


@beta_tool
def git_status() -> str:
    """현재 git 상태 및 최근 커밋 내역을 확인합니다."""
    try:
        status = subprocess.run(
            "git status", shell=True, cwd=PROJECT_ROOT,
            capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
        log = subprocess.run(
            "git log --oneline -10", shell=True, cwd=PROJECT_ROOT,
            capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
        diff = subprocess.run(
            "git diff --stat", shell=True, cwd=PROJECT_ROOT,
            capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
        return (
            f"=== git status ===\n{status.stdout}\n"
            f"=== 변경된 파일 ===\n{diff.stdout}\n"
            f"=== 최근 커밋 10개 ===\n{log.stdout}"
        )
    except Exception as e:
        return f"오류: {e}"


# ─────────────────────────────────────────
# 메인 대화 루프
# ─────────────────────────────────────────

SYSTEM_PROMPT = f"""당신은 GeniegoROI 프로젝트 전담 AI 개발 어시스턴트입니다.

프로젝트 경로: {PROJECT_ROOT}

프로젝트 구조:
- frontend/src/      → React (Vite) 프론트엔드 (JSX, i18n 15개 언어)
- frontend/src/pages → 페이지 컴포넌트
- frontend/src/components → 공통 컴포넌트
- frontend/src/i18n  → 다국어 번역 파일
- backend/src/       → PHP 백엔드 API
- server/            → Node.js 서버

기술 스택:
- React + Vite, Tailwind CSS
- i18n 다국어 (15개 언어: ko, en, ja, zh, zh-TW, th, vi, id, de 등)
- PHP 백엔드 API
- 배포: SSH/SCP

작업 규칙:
- 파일 수정 전 반드시 현재 내용을 먼저 읽으세요
- 코드 변경 시 변경 이유를 명확히 설명하세요
- 상대 경로는 프로젝트 루트({PROJECT_ROOT}) 기준입니다
- 한국어로 답변하세요
"""


def main():
    print("=" * 60)
    print("  GeniegoROI 프로젝트 전담 Claude Sonnet 4.6 에이전트")
    print(f"  프로젝트: {PROJECT_ROOT}")
    print("  종료: 'quit' 또는 '종료' 입력")
    print("=" * 60)
    print("\n사용 예시:")
    print("  - 'frontend/src/App.jsx 파일 읽어줘'")
    print("  - 'Topbar 컴포넌트에서 버그 찾아줘'")
    print("  - 'git 상태 확인해줘'")
    print("  - 'npm run build 실행해줘'")
    print()

    messages = []

    while True:
        try:
            user_input = input("나: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n종료합니다.")
            break

        if user_input.lower() in ["quit", "exit", "종료", "q"]:
            print("종료합니다.")
            break

        if not user_input:
            continue

        messages.append({"role": "user", "content": user_input})
        print("\nClaude: ", end="", flush=True)

        try:
            runner = client.beta.messages.tool_runner(
                model="claude-sonnet-4-6",
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                thinking={"type": "adaptive"},
                output_config={"effort": "high"},
                tools=[read_file, write_file, list_files, search_in_files, run_command, git_status],
                messages=messages,
            )

            full_response = ""
            for message in runner:
                for block in message.content:
                    if hasattr(block, "text") and block.text:
                        print(block.text, end="", flush=True)
                        full_response += block.text

            print("\n")
            if full_response:
                messages.append({"role": "assistant", "content": full_response})

        except anthropic.AuthenticationError:
            print("\n[오류] API 키가 올바르지 않습니다.")
            break
        except Exception as e:
            print(f"\n[오류] {e}")


if __name__ == "__main__":
    main()
