#!/usr/bin/env bash
# Exercises scripts/deploy.sh in throwaway directories with stub build/restart/health commands.
set -uo pipefail

script="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/deploy.sh"
passed=0
failed=0
check() {
  if eval "$2"; then passed=$((passed + 1)); else failed=$((failed + 1)); printf 'FAIL: %s\n' "$1" >&2; fi
}
sandbox() {
  local dir
  dir="$(mktemp -d)"
  mkdir -p "$dir/dist"
  echo old > "$dir/dist/main.js"
  echo '{}' > "$dir/package.json"
  printf '%s' "$dir"
}
good_build='mkdir -p "$DIST_DIR" && echo new > "$DIST_DIR/main.js"'
run_deploy() {
  local dir=$1
  shift
  DEPLOY_DIR="$dir" DEPLOY_SKIP_NVM=1 DEPLOY_HEALTH_TRIES=1 DEPLOY_HEALTH_SLEEP=0 \
    DEPLOY_BUILD_CMD="${BUILD:-$good_build}" DEPLOY_RESTART_CMD="echo restart >> '$dir/restarts.log'" \
    DEPLOY_HEALTH_CMD="${HEALTH:-true}" bash "$script" "$@" > "$dir/out.log" 2>&1
}
listing() { (cd "$1" && find . -path ./out.log -prune -o -print | sort && cat dist/main.js); }

dir=$(sandbox); before=$(listing "$dir")
run_deploy "$dir" --dry-run; status=$?
check 'dry-run exits 0' '[[ $status -eq 0 ]]'
check 'dry-run changes nothing' '[[ "$(listing "$dir")" == "$before" ]]'
check 'dry-run prints steps' 'grep -q "\[dry-run\]" "$dir/out.log"'

dir=$(sandbox)
run_deploy "$dir"; status=$?
check 'deploy exits 0' '[[ $status -eq 0 ]]'
check 'new dist is live' '[[ $(cat "$dir/dist/main.js") == new ]]'
check 'previous dist kept' '[[ $(cat "$dir/dist-prev/main.js") == old ]]'
check 'restarted once' '[[ $(wc -l < "$dir/restarts.log") -eq 1 ]]'
run_deploy "$dir" --rollback; status=$?
check 'rollback exits 0' '[[ $status -eq 0 ]]'
check 'old dist live again' '[[ $(cat "$dir/dist/main.js") == old ]]'

dir=$(sandbox)
BUILD='exit 2' run_deploy "$dir"; status=$?
check 'failed build exits non-zero' '[[ $status -ne 0 ]]'
check 'live dist untouched' '[[ $(cat "$dir/dist/main.js") == old ]]'
check 'no restart after failed build' '[[ ! -e $dir/restarts.log ]]'

dir=$(sandbox)
HEALTH='grep -q old dist/main.js' run_deploy "$dir"; status=$?
check 'unhealthy deploy exits non-zero' '[[ $status -ne 0 ]]'
check 'auto rollback restored old dist' '[[ $(cat "$dir/dist/main.js") == old ]]'
check 'unhealthy dist parked' '[[ $(cat "$dir/dist-failed/main.js") == new ]]'

dir=$(sandbox)
run_deploy "$dir" --rollback; status=$?
check 'rollback without prev exits non-zero' '[[ $status -ne 0 ]]'

printf 'deploy.test: %s passed, %s failed\n' "$passed" "$failed"
[[ $failed -eq 0 ]]
