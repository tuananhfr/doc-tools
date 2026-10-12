#!/usr/bin/env bash
# Safe backend deploy: compile into dist-new, swap only after a green build, keep dist-prev for rollback.
#   bash scripts/deploy.sh             build, swap, restart, health-check (auto rollback on failure)
#   bash scripts/deploy.sh --dry-run   print every step, change nothing
#   bash scripts/deploy.sh --rollback  put dist-prev back live and restart
# Code resolves data/ and agent/ from __dirname/../.., so renaming the output directory is safe.
set -eo pipefail

fail() {
  printf 'Deploy error: %s\n' "$1" >&2
  exit "${2:-1}"
}
say() { printf '%s\n' "$*"; }

mode=deploy
[[ $# -le 1 ]] || fail 'Only one argument is allowed (--dry-run or --rollback).'
case "${1:-}" in
  '') ;;
  --dry-run) mode=dry-run ;;
  --rollback) mode=rollback ;;
  *) fail "Unknown argument: $1 (use --dry-run or --rollback)." ;;
esac

backend_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
app_dir="${DEPLOY_DIR:-$backend_dir}"
cd -- "$app_dir"

live=dist
staging=dist-new
prev=dist-prev
parked=dist-failed
health_url="${DEPLOY_HEALTH_URL:-http://127.0.0.1:3003/api/v1/tools/stats}"
health_tries="${DEPLOY_HEALTH_TRIES:-30}"
health_sleep="${DEPLOY_HEALTH_SLEEP:-1}"
auto_rollback="${DEPLOY_AUTO_ROLLBACK:-1}"
restart_cmd="${DEPLOY_RESTART_CMD:-sudo systemctl restart doc-tools-backend}"

select_node() {
  [[ -r .nvmrc ]] || fail 'Missing .nvmrc; cannot select the deployment runtime.'
  node_version="$(tr -d '\r\n' < .nvmrc)"
  [[ "$node_version" =~ ^24\.[0-9]+\.[0-9]+$ ]] || fail 'Expected an exact Node 24 version in .nvmrc.'
  export NVM_DIR="${DOC_TOOLS_NVM_DIR:-$HOME/.nvm-doc-tools}"
  [[ -r "$NVM_DIR/nvm.sh" ]] || fail "nvm was not found at $NVM_DIR/nvm.sh."
  unset npm_config_prefix NPM_CONFIG_PREFIX PREFIX
  source "$NVM_DIR/nvm.sh" --no-use || fail "Could not load nvm from $NVM_DIR/nvm.sh."
  nvm use --silent "$node_version" || fail "Could not select Node $node_version from $NVM_DIR."
  local node_executable node_bin
  node_executable="$(nvm which "$node_version")" || fail "Could not resolve Node $node_version from nvm."
  node_bin="$(dirname -- "$node_executable")"
  npm_executable="$node_bin/npm"
  export PATH="$node_bin:$PATH"
  hash -r
  say "Deploy runtime: Node $("$node_executable" --version) ($node_executable)"
}

act() {
  if [[ $mode == dry-run ]]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
}

health() {
  if [[ -n "${DEPLOY_HEALTH_CMD:-}" ]]; then
    bash -c "$DEPLOY_HEALTH_CMD"
    return
  fi
  local try
  for ((try = 1; ; try++)); do
    if curl -fsS -o /dev/null --max-time 10 "$health_url"; then return 0; fi
    if ((try >= health_tries)); then
      printf 'Health check failed: %s\n' "$health_url" >&2
      return 1
    fi
    sleep "$health_sleep"
  done
}

deploy() {
  [[ -f package.json ]] || fail "No package.json in $app_dir."
  say "Plan: compile into $staging, then $live -> $prev, $staging -> $live, restart, health-check $health_url"
  act rm -rf "$staging"
  local build_cmd="${DEPLOY_BUILD_CMD:-${npm_executable:-npm} exec -- tsc -p tsconfig.json --outDir \"\$DIST_DIR\"}"
  if [[ $mode == dry-run ]]; then
    say "[dry-run] DIST_DIR=$staging $build_cmd"
  else
    set +e
    DIST_DIR="$staging" bash -c "$build_cmd"
    local status=$?
    set -e
    if ((status != 0)); then
      rm -rf "$staging"
      fail "build failed (exit $status); the live dist and the service were not touched." "$status"
    fi
    [[ -s $staging/main.js ]] || fail "$staging/main.js is missing after the build; the live dist was not touched."
  fi
  act rm -rf "$prev"
  if [[ -d $live ]]; then act mv "$live" "$prev"; fi
  act mv "$staging" "$live"
  if [[ $mode == dry-run ]]; then
    say "[dry-run] $restart_cmd"
    say '[dry-run] health check skipped'
    say 'Dry run finished: nothing was changed.'
    return
  fi
  bash -c "$restart_cmd"
  if health; then
    say "Deploy OK; the previous dist is kept in $prev (bash scripts/deploy.sh --rollback)."
    return
  fi
  if [[ $auto_rollback == 1 && -d $prev ]]; then
    say 'Health check failed: rolling back to the previous dist.' >&2
    rm -rf "$parked"
    mv "$live" "$parked"
    mv "$prev" "$live"
    bash -c "$restart_cmd"
    health || fail 'The rolled-back dist is not healthy either; check journalctl -u doc-tools-backend.'
    fail "the new dist failed its health check; rolled back, the failed dist is kept in $parked."
  fi
  fail 'the new dist failed its health check; no rollback was performed.'
}

rollback() {
  [[ -s $prev/main.js ]] || fail "No previous dist in $prev; nothing to roll back to."
  rm -rf "$parked"
  if [[ -d $live ]]; then mv "$live" "$parked"; fi
  mv "$prev" "$live"
  bash -c "$restart_cmd"
  health || fail 'Rolled back, but the health check failed; check journalctl -u doc-tools-backend.'
  say "Rolled back; the replaced dist is kept in $parked."
}

if [[ ${DEPLOY_SKIP_NVM:-0} != 1 ]]; then select_node; fi
if [[ $mode == rollback ]]; then rollback; else deploy; fi
