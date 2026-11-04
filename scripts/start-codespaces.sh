#!/usr/bin/env bash
# Starts DocPilot inside a private GitHub Codespace; the Github and AI credentials
# come from Codespaces secrets or a local untracked .env, never the repository.
set -euo pipefail
cd "$(dirname "$0")/.."

# GitHub reserves GITHUB_* secret names. Use a scoped Codespaces secret instead.
if [[ -n "${DOCPILOT_GITHUB_TOKEN:-}" ]]; then
  export GITHUB_TOKEN="$DOCPILOT_GITHUB_TOKEN"
fi

export HOST=0.0.0.0
export PORT="${PORT:-8787}"

if curl -fsS "http://127.0.0.1:${PORT}/api/health" > /dev/null 2>&1; then
  echo "DocPilot is already listening on port ${PORT}."
  exit 0
fi

state_dir="$HOME/.local/state/docpilot"
mkdir -p "$state_dir"
chmod 700 "$state_dir"

if [[ -z "${APP_PASSWORD:-}" ]]; then
  password_file="$state_dir/app-password"
  if [[ ! -f "$password_file" ]]; then
    node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))" > "$password_file"
    chmod 600 "$password_file"
  fi
  export APP_PASSWORD="$(cat "$password_file")"
  echo "DocPilot start met een uniek app-wachtwoord."
  echo "Bekijk het wachtwoord met: cat ~/.local/state/docpilot/app-password"
else
  echo "DocPilot gebruikt APP_PASSWORD uit Codespaces secrets."
fi

nohup node server.mjs > "$state_dir/server.log" 2>&1 < /dev/null &
server_pid=$!
echo "$server_pid" > "$state_dir/server.pid"

for i in {1..20}; do
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" > /dev/null 2>&1; then
    echo "DocPilot draait op poort ${PORT}. Open de privé-forwarded port via Codespaces → Ports."
    echo "Stel DOCPILOT_GITHUB_TOKEN en AI_API_KEY in via GitHub Codespaces secrets of een lokale .env."
    exit 0
  fi
  sleep 1
done

echo "DocPilot start niet. Log: $state_dir/server.log" >&2
exit 1
