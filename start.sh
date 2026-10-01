#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Start Laravel API (8001: port 8000 is used by another local project)
cd "$ROOT/backend"
php artisan serve --host=127.0.0.1 --port=8001 &
BACKEND_PID=$!

# Start Angular (preview port)
cd "$ROOT/frontend"
npm start -- --host 0.0.0.0 --port 4201 --disable-host-check

trap "kill $BACKEND_PID" EXIT
