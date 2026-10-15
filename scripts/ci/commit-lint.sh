#!/usr/bin/env bash
# commit-lint.sh — 커밋 메시지 규칙 검사
#
#   bash scripts/ci/commit-lint.sh --file <메시지파일>   commit-msg 훅에서 사용
#   bash scripts/ci/commit-lint.sh --range <rev...>      CI 에서 push 된 커밋 검사 (git rev-list 인자)
#     예) --range <after> ^<before> ^origin/main
#
# 규칙
#   1줄: "type: 제목"   type = feat|fix|refactor|chore|docs|style|test
#   2줄: 본문이 있다면 빈 줄
#   Merge / Revert 커밋은 검사하지 않는다.
set -uo pipefail

TYPES="feat|fix|refactor|chore|docs|style|test"
PATTERN="^($TYPES): [^ ].*"

check() { # $1=메시지 전체  $2=표시용 이름 → 실패 시 1
  local msg subject second
  msg=$(printf '%s\n' "$1" | sed '/^#/d')
  subject=$(printf '%s\n' "$msg" | sed -n 1p | tr -d '\r')
  second=$(printf '%s\n' "$msg" | sed -n 2p | tr -d '\r')

  case "$subject" in Merge\ *|Revert\ *) return 0;; esac

  if ! printf '%s' "$subject" | grep -Eq "$PATTERN"; then
    echo "✖ $2: 제목이 'type: 제목' 형식이 아닙니다"
    echo "    → $subject"
    echo "    type: feat | fix | refactor | chore | docs | style | test"
    return 1
  fi
  if [ -n "$second" ]; then
    echo "✖ $2: 제목과 본문 사이에 빈 줄이 필요합니다"
    return 1
  fi
  return 0
}

case "${1:-}" in
  --file)
    if ! check "$(cat "$2")" "커밋 메시지"; then
      echo
      echo "예) feat: 참가곡 제출 폼 및 수정 PIN 해시 저장 추가"
      exit 1
    fi
    ;;
  --range)
    fail=0
    shift
    for sha in $(git rev-list --no-merges "$@"); do
      check "$(git log -1 --format=%B "$sha")" "$(git log -1 --format='%h' "$sha")" || fail=1
    done
    [ $fail -eq 0 ] && echo "✔ 커밋 메시지 규칙 통과"
    exit $fail
    ;;
  *)
    echo "사용: $0 --file <파일> | --range <rev...>" >&2; exit 2;;
esac
