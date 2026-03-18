#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="$ROOT_DIR/.next/dev/lock"

find_root_next_dev_pids() {
  ps -eo pid=,comm=,args= | awk -v root="$ROOT_DIR" '
    $2 == "node" && index($0, root) && index($0, "next/dist/bin/next dev") { print $1 }
  '
}

find_repo_next_server_pids() {
  local pid cwd

  while read -r pid; do
    [[ -n "$pid" ]] || continue
    cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    if [[ "$cwd" == "$ROOT_DIR" ]]; then
      echo "$pid"
    fi
  done < <(ps -eo pid=,comm= | awk '$2 == "next-server" { print $1 }')
}

collect_descendants() {
  local pid="$1"
  local child

  echo "$pid"
  while read -r child; do
    [[ -n "$child" ]] || continue
    collect_descendants "$child"
  done < <(pgrep -P "$pid" || true)
}

find_repo_pids() {
  local pid

  while read -r pid; do
    [[ -n "$pid" ]] || continue
    collect_descendants "$pid"
  done < <(
    {
      find_root_next_dev_pids
      find_repo_next_server_pids
    } | sort -u
  )
}

stop_next_dev() {
  mapfile -t pids < <(find_repo_pids | sort -u)

  if ((${#pids[@]} > 0)); then
    echo "Stopping Next dev for $ROOT_DIR: ${pids[*]}"
    kill "${pids[@]}" 2>/dev/null || true
    sleep 1

    mapfile -t remaining < <(find_repo_pids | sort -u)
    if ((${#remaining[@]} > 0)); then
      echo "Force stopping remaining processes: ${remaining[*]}"
      kill -9 "${remaining[@]}" 2>/dev/null || true
    fi
  else
    echo "No running Next dev process found for $ROOT_DIR"
  fi

  mapfile -t stale_check < <(find_repo_pids | sort -u)
  if [[ -f "$LOCK_FILE" ]] && ((${#stale_check[@]} == 0)); then
    rm -f "$LOCK_FILE"
    echo "Removed stale lock: $LOCK_FILE"
  fi
}

case "${1:-}" in
  stop)
    stop_next_dev
    ;;
  restart)
    stop_next_dev
    exec pnpm dev
    ;;
  status)
    mapfile -t pids < <(find_repo_pids | sort -u)
    if ((${#pids[@]} > 0)); then
      echo "Running Next dev process IDs: ${pids[*]}"
    else
      echo "No running Next dev process found for $ROOT_DIR"
    fi

    if [[ -f "$LOCK_FILE" ]]; then
      echo "Lock file present: $LOCK_FILE"
    else
      echo "No lock file present"
    fi
    ;;
  *)
    echo "Usage: bash scripts/dev-server.sh {stop|restart|status}"
    exit 1
    ;;
esac
