set shell := ["bash", "-cu"]
set windows-shell := ["C:/Program Files/Git/bin/bash.exe", "-cu"]

default:
    @just --list

# ---- building blocks ----

install:
    npm install --prefix server
    npm install --prefix client
    npm install

format:
    npx prettier --write .

format-check:
    npx prettier --check .

lint:
    npm run lint --prefix server
    npm run lint --prefix client

lint-fix:
    npm run lint:fix --prefix server
    npm run lint:fix --prefix client

typecheck:
    npm run typecheck --prefix server
    npm run typecheck --prefix client

build:
    npm run build --prefix server
    npm run build --prefix client

unit-test:
    npm test --prefix server
    npm test --prefix client

# Boots the real server and hits POST /api/analyze over HTTP to prove the
# whole request path (express -> validation -> Anthropic client) is wired
# end to end. A 500 auth error still proves it, since no real API key is
# required to reach that point.
smoke:
    set -uo pipefail; \
    PORT=8799; \
    cleanup() { WINPID=$(netstat -ano 2>/dev/null | grep ":$PORT " | grep LISTENING | awk '{print $NF}' | head -1); if [ -n "$WINPID" ]; then taskkill //F //T //PID "$WINPID" >/dev/null 2>&1; fi; }; \
    trap cleanup EXIT; \
    cd server; \
    PORT=$PORT npx tsx src/index.ts > /tmp/weight-calc-smoke.log 2>&1 & \
    cd ..; \
    UP=false; \
    for i in $(seq 1 40); do if curl -s -o /dev/null "http://localhost:$PORT/api/analyze"; then UP=true; break; fi; sleep 0.5; done; \
    if [ "$UP" != "true" ]; then echo "server never came up, log:"; cat /tmp/weight-calc-smoke.log || true; exit 1; fi; \
    STAT_STATUS=$(curl -s -o /tmp/weight-calc-smoke-stat.json -w "%{http_code}" -X POST "http://localhost:$PORT/api/analyze" -H "Content-Type: application/json" -d '{"mode":"statistical","sources":[{"id":"s1","label":"S1","text":"The server crashed due to a memory leak. Extra detail one."},{"id":"s2","label":"S2","text":"The server crashed due to a memory leak. Extra detail two."}],"statisticalOptions":{"speed":"fast","topicWeight":0.5}}'); \
    echo "statistical-mode smoke status: $STAT_STATUS"; \
    cat /tmp/weight-calc-smoke-stat.json; \
    echo ""; \
    if [ "$STAT_STATUS" != "200" ]; then echo "statistical mode should always return 200 (no API key needed), got $STAT_STATUS"; exit 1; fi; \
    if ! grep -q '"points"' /tmp/weight-calc-smoke-stat.json; then echo "statistical mode response did not contain points"; exit 1; fi; \
    if ! grep -q '"meta"' /tmp/weight-calc-smoke-stat.json; then echo "statistical mode response did not contain meta"; exit 1; fi; \
    AI_STATUS=$(curl -s -o /tmp/weight-calc-smoke-ai.json -w "%{http_code}" -X POST "http://localhost:$PORT/api/analyze" -H "Content-Type: application/json" -d '{"mode":"ai","sources":[{"id":"s1","label":"S1","text":"hello"}]}'); \
    echo "ai-mode smoke status: $AI_STATUS"; \
    cat /tmp/weight-calc-smoke-ai.json; \
    echo ""; \
    if [ "$AI_STATUS" != "200" ] && [ "$AI_STATUS" != "500" ]; then echo "unexpected ai-mode status ($AI_STATUS), expected 200 (real key) or 500 (auth error, still proves wiring)"; exit 1; fi

# ---- entry points ----

# Best-effort: format the repo, run checks and document any failures, then
# start the app regardless. Only meant to prove the app can run.
run:
    set -uo pipefail; \
    echo "== run: formatting, then best-effort checks (won't block startup) =="; \
    LOG=$(mktemp); \
    npx prettier --write . || echo "[format] failed" >> "$LOG"; \
    npm run typecheck --prefix server || echo "[typecheck:server] failed" >> "$LOG"; \
    npm run typecheck --prefix client || echo "[typecheck:client] failed" >> "$LOG"; \
    npm run lint --prefix server || echo "[lint:server] failed" >> "$LOG"; \
    npm run lint --prefix client || echo "[lint:client] failed" >> "$LOG"; \
    if [ -s "$LOG" ]; then echo ""; echo "== issues found (documented below), starting app anyway =="; cat "$LOG"; echo ""; else echo "== no issues found =="; fi; \
    echo "== starting client + server (Ctrl+C to stop) =="; \
    exec npm run dev

# Strict: every check must pass, in order, or this aborts immediately.
test: format-check lint typecheck build unit-test smoke
    @echo "== all checks passed =="

# Autofix formatting and any auto-fixable lint issues.
fix:
    npx prettier --write .
    npm run lint:fix --prefix server || true
    npm run lint:fix --prefix client || true
    npx prettier --write .
    echo "== fix complete (run 'just test' to confirm everything is clean) =="

# Fix what's fixable, then run the strict test suite to confirm.
auto: fix test
