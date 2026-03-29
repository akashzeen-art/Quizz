#!/usr/bin/env bash
# Loads backend/.env into the environment, then starts Spring Boot (run from backend/).
# Prefers JDK 21 on macOS — JDK 25+ often fails TLS to MongoDB Atlas (SSLException: internal_error).
set -euo pipefail
cd "$(dirname "$0")"

pick_jdk21() {
  if [[ "$(uname)" != "Darwin" ]]; then
    return 0
  fi
  local j21
  if j21="$(/usr/libexec/java_home -v 21 2>/dev/null)"; then
    export JAVA_HOME="$j21"
    return 0
  fi
  for candidate in \
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
    "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"; do
    if [[ -d "$candidate" ]]; then
      export JAVA_HOME="$candidate"
      return 0
    fi
  done
}

pick_jdk21
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
exec mvn spring-boot:run "$@"
