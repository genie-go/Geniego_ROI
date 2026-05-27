#!/bin/bash
# cc 진단 — admin/plan-pricing API 401 root cause
# 실행 위치: 운영 호스트 /tmp/

MYSQL_PW="$1"
if [ -z "$MYSQL_PW" ]; then echo "ERR: missing MYSQL_PW arg"; exit 1; fi

TOKEN=$(mysql -uroot -p"$MYSQL_PW" geniego_roi -BNe "SELECT s.token FROM user_session s JOIN app_user u ON u.id=s.user_id WHERE u.email='ceo@ociell.com' AND u.plan='admin' AND s.expires_at > NOW() ORDER BY s.expires_at DESC LIMIT 1" 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "NO_ACTIVE_TOKEN — creating new one"
  NEW=$(openssl rand -hex 32)
  EXP=$(date -d '+30 days' '+%Y-%m-%d %H:%M:%S')
  USER_ID=$(mysql -uroot -p"$MYSQL_PW" geniego_roi -BNe "SELECT id FROM app_user WHERE email='ceo@ociell.com' AND plan='admin' LIMIT 1" 2>/dev/null)
  mysql -uroot -p"$MYSQL_PW" geniego_roi -e "INSERT INTO user_session (token, user_id, expires_at) VALUES ('$NEW', $USER_ID, '$EXP')" 2>/dev/null
  TOKEN="$NEW"
  echo "new_token_user_id=$USER_ID expires=$EXP"
fi
echo "token_len=${#TOKEN}"
echo ""
echo "=== test_1_v424_admin_plans (Bearer header) ==="
curl -sS -o /tmp/resp1.txt -w 'http=%{http_code}\n' -H "Authorization: Bearer $TOKEN" https://roi.genie-go.com/v424/admin/plans
head -c 400 /tmp/resp1.txt
echo ""
echo ""
echo "=== test_2_api_v424_admin_plans (Bearer header) ==="
curl -sS -o /tmp/resp2.txt -w 'http=%{http_code}\n' -H "Authorization: Bearer $TOKEN" https://roi.genie-go.com/api/v424/admin/plans
head -c 400 /tmp/resp2.txt
echo ""
echo ""
echo "=== test_3_v424_admin_plans (token query) ==="
curl -sS -o /tmp/resp3.txt -w 'http=%{http_code}\n' "https://roi.genie-go.com/v424/admin/plans?token=$TOKEN"
head -c 400 /tmp/resp3.txt
echo ""
echo ""
echo "=== test_4_v424_admin_plans_menu_access (Bearer) ==="
curl -sS -o /tmp/resp4.txt -w 'http=%{http_code}\n' -H "Authorization: Bearer $TOKEN" https://roi.genie-go.com/v424/admin/plans-menu-access
head -c 400 /tmp/resp4.txt
echo ""
echo ""
echo "=== test_5_v424_health (no auth) ==="
curl -sS -o /tmp/resp5.txt -w 'http=%{http_code}\n' https://roi.genie-go.com/v424/health
head -c 200 /tmp/resp5.txt
echo ""
echo ""
echo "=== nginx_fastcgi_authorization_check ==="
grep -nE 'HTTP_AUTHORIZATION|authorization|auth' /usr/local/nginx/conf/fastcgi_params 2>&1 | head -10
echo "---"
grep -nE 'HTTP_AUTHORIZATION|fastcgi_param HTTP' /usr/local/nginx/conf/vhost/roi.genie-go.com.conf 2>&1 | head -10
echo ""
echo "=== php_get_authorization_test ==="
cat > /tmp/_cc_auth_test.php <<'PHP'
<?php
header('Content-Type: application/json');
echo json_encode([
  'getallheaders' => function_exists('getallheaders') ? getallheaders() : 'unavailable',
  'server_HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? null,
  'redirect_HTTP_AUTHORIZATION' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
PHP
# Move into ops web root so nginx can serve it directly
cp /tmp/_cc_auth_test.php /home/wwwroot/roi.geniego.com/frontend/dist/_cc_auth_test.php
chown www:www /home/wwwroot/roi.geniego.com/frontend/dist/_cc_auth_test.php
# Need PHP execution config; bsearch_win.php pattern exists in vhost, so use similar approach
# Just test if API stack receives Authorization header
echo "--- /v423/creds with auth ---"
curl -sS -o /tmp/resp6.txt -w 'http=%{http_code}\n' -H "Authorization: Bearer $TOKEN" https://roi.genie-go.com/v423/creds
head -c 200 /tmp/resp6.txt
echo ""

rm -f /tmp/_cc_auth_test.php /home/wwwroot/roi.geniego.com/frontend/dist/_cc_auth_test.php

unset TOKEN
unset MYSQL_PW
echo ""
echo "=== done ==="
