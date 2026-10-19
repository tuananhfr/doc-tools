#!/usr/bin/env bash
# Safe frontend deploy: build into .next-new, swap only after a green build, keep .next-prev for rollback.
#   bash scripts/deploy.sh             build, swap, restart, health-check (auto rollback on failure)
#   bash scripts/deploy.sh --dry-run   print every step, change nothing
#   bash scripts/deploy.sh --rollback  put .next-prev back live and restart
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

frontend_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
app_dir="${DEPLOY_DIR:-$frontend_dir}"
cd -- "$app_dir"

live=.next
staging=.next-new
prev=.next-prev
parked=.next-failed
health_url="${DEPLOY_HEALTH_URL:-http://localhost:3002}"
health_tries="${DEPLOY_HEALTH_TRIES:-30}"
health_sleep="${DEPLOY_HEALTH_SLEEP:-1}"
min_free_mb="${DEPLOY_MIN_FREE_MB:-1024}"
auto_rollback="${DEPLOY_AUTO_ROLLBACK:-1}"
restart_cmd="${DEPLOY_RESTART_CMD:-sudo systemctl restart doc-tools-frontend}"

select_node() {
  [[ -r .nvmrc ]] || fail 'Missing .nvmrc; cannot select the deployment runtime.'
  node_version="$(tr -d '\r\n' < .nvmrc)"
  [[ "$node_version" =~ ^24\.[0-9]+\.[0-9]+$ ]] || fail 'Expected an exact Node 24 version in .nvmrc.'
  export NVM_DIR="${DOC_TOOLS_NVM_DIR:-$HOME/.nvm-doc-tools}"
  [[ -r "$NVM_DIR/nvm.sh" ]] || fail "nvm was not found at $NVM_DIR/nvm.sh. Set up the DocTools runtime first."
  # Parent npm lifecycle exports a prefix that nvm rejects; clear it only in this subprocess.
  unset npm_config_prefix NPM_CONFIG_PREFIX PREFIX
  source "$NVM_DIR/nvm.sh" --no-use || fail "Could not load nvm from $NVM_DIR/nvm.sh."
  nvm use --silent "$node_version" || fail "Could not select Node $node_version from $NVM_DIR."
  local node_executable
  node_executable="$(nvm which "$node_version")" || fail "Could not resolve Node $node_version from nvm."
  local node_bin
  node_bin="$(dirname -- "$node_executable")"
  npm_executable="$node_bin/npm"
  [[ -x "$node_executable" && -x "$npm_executable" ]] || fail "Node or npm is missing from $node_bin."
  export PATH="$node_bin:$PATH"
  hash -r
  [[ "$("$node_executable" --version)" == "v$node_version" ]] || fail "Expected Node v$node_version."
  say "Deploy runtime: Node v$node_version ($node_executable), npm $("$npm_executable" --version)"
}

# In --dry-run every mutating step is printed instead of executed.
act() {
  if [[ $mode == dry-run ]]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
}

publish_manifest() {
  if [[ -f $live/offline-manifest.json ]]; then cp "$live/offline-manifest.json" public/offline-manifest.json; fi
}

health() {
  local build_id=$1 path try
  if [[ -n "${DEPLOY_HEALTH_CMD:-}" ]]; then
    bash -c "$DEPLOY_HEALTH_CMD"
    return
  fi
  for path in / /gioi-thieu "/_next/static/$build_id/_buildManifest.js"; do
    for ((try = 1; ; try++)); do
      if curl -fsS -o /dev/null --max-time 10 "$health_url$path"; then break; fi
      if ((try >= health_tries)); then
        printf 'Health check failed: %s%s\n' "$health_url" "$path" >&2
        return 1
      fi
      sleep "$health_sleep"
    done
  done
}

deploy() {
  [[ -f package.json ]] || fail "No package.json in $app_dir."
  local free_mb
  free_mb="$(df -Pm . | awk 'NR == 2 { print $4 }')"
  ((free_mb >= min_free_mb)) || fail "Only ${free_mb} MB free; a second build needs ${min_free_mb} MB."
  say "Plan: build into $staging, then $live -> $prev, $staging -> $live, restart, health-check $health_url"
  act rm -rf "$staging"
  # Reuse the webpack cache so building into a second directory is not a cold build.
  if [[ -d $live/cache ]]; then
    act mkdir -p "$staging"
    act cp -a "$live/cache" "$staging/cache"
  fi
  local build_cmd="${DEPLOY_BUILD_CMD:-${npm_executable:-npm} run build}"
  if [[ $mode == dry-run ]]; then
    say "[dry-run] NEXT_DIST_DIR=$staging OFFLINE_MANIFEST_OUT=$staging/offline-manifest.json $build_cmd"
  else
    # Next rewrites next-env.d.ts / tsconfig.json for the build directory; put back what git had.
    local restore_tracked=0
    if git rev-parse --is-inside-work-tree > /dev/null 2>&1 && git diff --quiet -- next-env.d.ts tsconfig.json 2> /dev/null; then restore_tracked=1; fi
    set +e
    NEXT_DIST_DIR="$staging" OFFLINE_MANIFEST_OUT="$staging/offline-manifest.json" bash -c "$build_cmd"
    local status=$?
    set -e
    if ((restore_tracked)); then git checkout -- next-env.d.ts tsconfig.json; fi
    if ((status != 0)); then
      rm -rf "$staging"
      fail "build failed (exit $status); the live build and the service were not touched." "$status"
    fi
    [[ -s $staging/BUILD_ID ]] || fail "$staging/BUILD_ID is missing after the build; the live build was not touched."
  fi
  act rm -rf "$prev"
  if [[ -d $live ]]; then act mv "$live" "$prev"; fi
  act mv "$staging" "$live"
  if [[ $mode == dry-run ]]; then
    say "[dry-run] cp $live/offline-manifest.json public/offline-manifest.json"
    say "[dry-run] $restart_cmd"
    say '[dry-run] health check skipped'
    say 'Dry run finished: nothing was changed.'
    return
  fi
  publish_manifest
  bash -c "$restart_cmd"
  local build_id
  build_id="$(< "$live/BUILD_ID")"
  if health "$build_id"; then
    say "Deploy OK: build $build_id is live; the previous build is kept in $prev (bash scripts/deploy.sh --rollback)."
    return
  fi
  if [[ $auto_rollback == 1 && -d $prev ]]; then
    say 'Health check failed: rolling back to the previous build.' >&2
    rm -rf "$parked"
    mv "$live" "$parked"
    mv "$prev" "$live"
    publish_manifest
    bash -c "$restart_cmd"
    health "$(< "$live/BUILD_ID")" || fail 'The rolled-back build is not healthy either; check journalctl -u doc-tools-frontend.'
    fail "the new build failed its health check; rolled back, the failed build is kept in $parked."
  fi
  fail 'the new build failed its health check; no rollback was performed.'
}

rollback() {
  [[ -s $prev/BUILD_ID ]] || fail "No previous build in $prev; nothing to roll back to."
  rm -rf "$parked"
  if [[ -d $live ]]; then mv "$live" "$parked"; fi
  mv "$prev" "$live"
  publish_manifest
  bash -c "$restart_cmd"
  health "$(< "$live/BUILD_ID")" || fail 'Rolled back, but the health check failed; check journalctl -u doc-tools-frontend.'
  say "Rolled back to build $(< "$live/BUILD_ID"); the replaced build is kept in $parked."
}

if [[ ${DEPLOY_SKIP_NVM:-0} != 1 ]]; then select_node; fi
if [[ $mode == rollback ]]; then rollback; else deploy; fi
