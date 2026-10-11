#!/usr/bin/env bash
set -eo pipefail

fail() {
  printf 'Deploy error: %s\n' "$1" >&2
  exit 1
}

frontend_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$frontend_dir"

[[ -r .nvmrc ]] || fail 'Missing .nvmrc; cannot select the deployment runtime.'
node_version="$(tr -d '\r\n' < .nvmrc)"
[[ "$node_version" =~ ^24\.[0-9]+\.[0-9]+$ ]] || fail 'Expected an exact Node 24 version in .nvmrc.'

export NVM_DIR="${DOC_TOOLS_NVM_DIR:-$HOME/.nvm-doc-tools}"
[[ -r "$NVM_DIR/nvm.sh" ]] || fail "nvm was not found at $NVM_DIR/nvm.sh. Set up the DocTools runtime first."
# Parent npm lifecycle exports a prefix that nvm rejects; clear it only in this subprocess.
unset npm_config_prefix NPM_CONFIG_PREFIX PREFIX
if ! source "$NVM_DIR/nvm.sh" --no-use; then
  fail "Could not load nvm from $NVM_DIR/nvm.sh."
fi
if ! nvm use --silent "$node_version"; then
  fail "Could not select Node $node_version from $NVM_DIR. Check that version is installed and resolve the nvm error above."
fi
if ! node_executable="$(nvm which "$node_version")"; then
  fail "Could not resolve Node $node_version from nvm."
fi
node_bin="$(dirname -- "$node_executable")"
npm_executable="$node_bin/npm"
[[ -x "$node_executable" && -x "$npm_executable" ]] || fail "Node or npm is missing from $node_bin."

export PATH="$node_bin:$PATH"
hash -r
actual_node_version="$("$node_executable" --version)"
[[ "$actual_node_version" == "v$node_version" ]] || fail "Expected Node v$node_version, got $actual_node_version."
npm_version="$("$npm_executable" --version)"
printf 'Deploy runtime: Node %s (%s), npm %s\n' "$actual_node_version" "$node_executable" "$npm_version"

if "$npm_executable" run build; then
  sudo systemctl restart doc-tools-frontend
else
  build_status=$?
  printf 'Deploy error: build failed (exit %s); service was not restarted.\n' "$build_status" >&2
  exit "$build_status"
fi
