#!/bin/bash
# SSH 포트 스캔 & 접속 테스트
echo "=== SSH Port Scan ==="
for p in 22 2022 2222 8022 22222 443 80; do
  timeout 5 bash -c "echo >/dev/tcp/1.201.177.46/$p" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "Port $p: OPEN"
  else
    echo "Port $p: closed/timeout"
  fi
done

echo ""
echo "=== SSH Connection Test (port 22) ==="
ssh -v -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes root@1.201.177.46 "echo connection_ok" 2>&1 | head -30
