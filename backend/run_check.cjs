const { Client } = require('ssh2');

const conn = new Client();
const fs = require('fs');
conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) throw err;
        sftp.fastPut('d:/project/GeniegoROI/backend/check_schema.php', '/home/wwwroot/roi.geniego.com/backend/check_schema.php', err => {
            if (err) throw err;
            conn.exec('php /home/wwwroot/roi.geniego.com/backend/check_schema.php', (err, stream) => {
                if (err) throw err;
                stream.on('close', () => conn.end()).on('data', d => console.log(''+d)).stderr.on('data', d => console.log(''+d));
            });
        });
    });
}).connect({
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!'
});
