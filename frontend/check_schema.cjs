const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('php -r "$pdo = new PDO(\'sqlite:/home/wwwroot/roi.geniego.com/backend/database.sqlite\'); print_r($pdo->query(\'PRAGMA table_info(user_session)\')->fetchAll(PDO::FETCH_ASSOC)); print_r($pdo->query(\'SELECT * FROM user_session ORDER BY id DESC LIMIT 1\')->fetchAll(PDO::FETCH_ASSOC));"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', d => console.log(''+d)).stderr.on('data', d => console.log(''+d));
  });
}).connect({
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!'
});
