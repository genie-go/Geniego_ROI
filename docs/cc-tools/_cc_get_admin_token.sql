SELECT s.token FROM user_session s JOIN app_user u ON u.id=s.user_id WHERE u.email='ceo@ociell.com' AND u.plan='admin' AND s.expires_at > NOW() ORDER BY s.expires_at DESC LIMIT 1;
