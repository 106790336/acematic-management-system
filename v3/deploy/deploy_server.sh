#!/bin/bash
cd /home/ubuntu
echo "[1] Extracting frontend..."
unzip -o frontend-pkg.zip -d /tmp/fp
cp -rf /tmp/fp/frontend/dist/* /home/ubuntu/acematic/frontend/dist/
rm -rf /tmp/fp frontend-pkg.zip
echo "Frontend dist updated at: $(date)"

echo "[2] Extracting backend..."
unzip -o backend-pkg.zip -d /tmp/bp
cp -rf /tmp/bp/backend/* /home/ubuntu/acematic/backend-src/
rm -rf /tmp/bp backend-pkg.zip
echo "Backend updated at: $(date)"

echo "[3] Installing deps..."
cd /home/ubuntu/acematic/backend-src
npm install --silent

echo "[4] Restarting backend..."
pkill -f "tsx src/index" || true
sleep 1
cd /home/ubuntu/acematic/backend-src
nohup npx tsx src/index.ts > backend.log 2>&1 &
echo "Backend PID: $!"
sleep 3
curl -s http://localhost:3000/api/health || cat backend.log | tail -30
echo "Done at: $(date)"
