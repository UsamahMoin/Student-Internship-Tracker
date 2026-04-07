#!/bin/bash
# Start Student Tracker — run both servers

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Add Node to PATH (using system node or downloaded)
export PATH="/tmp/node-v20.15.0-darwin-arm64/bin:$PATH"

echo "Starting Python backend on http://localhost:8000..."
cd "$PROJECT_DIR/backend" && python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

echo "Starting React frontend on http://localhost:5173..."
cd "$PROJECT_DIR/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
