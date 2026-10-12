#!/usr/bin/env bash
# Exercises scripts/deploy.sh in throwaway directories with stub build/restart/health commands.
# Never touches the real .next, systemd or the network.
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
  mkdir -p "$dir/.next/cache" "$dir/public"
  echo old > "$dir/.next/BUILD_ID"
  echo '{}' > "$dir/package.json"
  printf '%s' "$dir"
}
good_build='mkdir -p "$NEXT_DIST_DIR" && echo new > "$NEXT_DIST_DIR/BUILD_ID" && echo "{\"version\":\"new\"}" > "$OFFLINE_MANIFEST_OUT"'
run_deploy() {
  local dir=$1
  shift
  DEPLOY_DIR="$dir" DEPLOY_SKIP_NVM=1 DEPLOY_MIN_FREE_MB=1 DEPLOY_HEALTH_TRIES=1 DEPLOY_HEALTH_SLEEP=0 \
    DEPLOY_BUILD_CMD="${BUILD:-$good_build}" DEPLOY_RESTART_CMD="echo restart >> '$dir/restarts.log'" \
    DEPLOY_HEALTH_CMD="${HEALTH:-true}" DEPLOY_AUTO_ROLLBACK="${AUTO:-1}" bash "$script" "$@" > "$dir/out.log" 2>&1
}
listing() { (cd "$1" && find . -path ./out.log -prune -o -print | sort && cat .next/BUILD_ID); }

# 1. --dry-run prints the plan and changes nothing.
dir=$(sandbox); before=$(listing "$dir")
run_deploy "$dir" --dry-run; status=$?
check 'dry-run exits 0' '[[ $status -eq 0 ]]'
check 'dry-run changes nothing' '[[ "$(listing "$dir")" == "$before" ]]'
check 'dry-run prints steps' 'grep -q "\[dry-run\]" "$dir/out.log"'
check 'dry-run does not restart' '[[ ! -e $dir/restarts.log ]]'

# 2. Good deploy swaps builds and keeps the previous one.
dir=$(sandbox)
run_deploy "$dir"; status=$?
check 'deploy exits 0' '[[ $status -eq 0 ]]'
check 'new build is live' '[[ $(cat "$dir/.next/BUILD_ID") == new ]]'
check 'previous build kept' '[[ $(cat "$dir/.next-prev/BUILD_ID") == old ]]'
check 'staging dir gone' '[[ ! -e $dir/.next-new ]]'
check 'offline manifest published' 'grep -q new "$dir/public/offline-manifest.json"'
check 'restarted once' '[[ $(wc -l < "$dir/restarts.log") -eq 1 ]]'

# 3. Rollback after a good deploy.
run_deploy "$dir" --rollback; status=$?
check 'rollback exits 0' '[[ $status -eq 0 ]]'
check 'old build is live again' '[[ $(cat "$dir/.next/BUILD_ID") == old ]]'
check 'replaced build parked' '[[ $(cat "$dir/.next-failed/BUILD_ID") == new ]]'
check 'restarted twice in total' '[[ $(wc -l < "$dir/restarts.log") -eq 2 ]]'

# 4. Failing build leaves the live build and the service alone.
dir=$(sandbox)
BUILD='exit 3' run_deploy "$dir"; status=$?
check 'failed build exits non-zero' '[[ $status -ne 0 ]]'
check 'live build untouched after failed build' '[[ $(cat "$dir/.next/BUILD_ID") == old ]]'
check 'no restart after failed build' '[[ ! -e $dir/restarts.log ]]'
check 'no staging left after failed build' '[[ ! -e $dir/.next-new ]]'

# 5. Failing health check rolls back automatically (health only passes for the old build).
dir=$(sandbox)
HEALTH='grep -q old .next/BUILD_ID' run_deploy "$dir"; status=$?
check 'unhealthy deploy exits non-zero' '[[ $status -ne 0 ]]'
check 'auto rollback restored old build' '[[ $(cat "$dir/.next/BUILD_ID") == old ]]'
check 'unhealthy build parked' '[[ $(cat "$dir/.next-failed/BUILD_ID") == new ]]'
check 'restarted for deploy and rollback' '[[ $(wc -l < "$dir/restarts.log") -eq 2 ]]'

# 6. Auto rollback can be switched off.
dir=$(sandbox)
AUTO=0 HEALTH=false run_deploy "$dir"; status=$?
check 'no-auto-rollback exits non-zero' '[[ $status -ne 0 ]]'
check 'no-auto-rollback keeps new build live' '[[ $(cat "$dir/.next/BUILD_ID") == new ]]'

# 7. Rollback without a previous build refuses.
dir=$(sandbox)
run_deploy "$dir" --rollback; status=$?
check 'rollback without prev exits non-zero' '[[ $status -ne 0 ]]'
check 'rollback without prev keeps live build' '[[ $(cat "$dir/.next/BUILD_ID") == old ]]'

# 8. Unknown argument refuses before doing anything.
dir=$(sandbox); before=$(listing "$dir")
run_deploy "$dir" --bogus; status=$?
check 'unknown argument exits non-zero' '[[ $status -ne 0 ]]'
check 'unknown argument changes nothing' '[[ "$(listing "$dir")" == "$before" ]]'

printf 'deploy.test: %s passed, %s failed\n' "$passed" "$failed"
[[ $failed -eq 0 ]]
