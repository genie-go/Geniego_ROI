// upload_backend.cjs
const Client = require('ssh2-sftp-client');
const path = require('path');

const sshConfig = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 15000,
};

async function upload() {
  const sftp = new Client();
  try {
    await sftp.connect(sshConfig);
    console.log('Connected to server via SFTP.');

    const localAuth = path.join(__dirname, '..', 'backend', 'src', 'Handlers', 'UserAuth.php');
    const remoteAuth = '/home/wwwroot/roi.geniego.com/backend/src/Handlers/UserAuth.php';
    await sftp.fastPut(localAuth, remoteAuth);
    console.log('Uploaded UserAuth.php');

    const localRoutes = path.join(__dirname, '..', 'backend', 'src', 'routes.php');
    const remoteRoutes = '/home/wwwroot/roi.geniego.com/backend/src/routes.php';
    await sftp.fastPut(localRoutes, remoteRoutes);
    console.log('Uploaded routes.php');

  } catch (err) {
    console.error('Error during upload:', err);
  } finally {
    sftp.end();
    console.log('Done uploading backend files.');
  }
}

upload();
