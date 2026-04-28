<?php
$pdo = new PDO('sqlite:/home/wwwroot/roi.geniego.com/backend/database.sqlite');
echo "user_session table info:\n";
print_r($pdo->query('PRAGMA table_info(user_session)')->fetchAll(PDO::FETCH_ASSOC));
echo "last session row:\n";
print_r($pdo->query('SELECT * FROM user_session ORDER BY id DESC LIMIT 1')->fetchAll(PDO::FETCH_ASSOC));
