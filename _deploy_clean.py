import paramiko, os

HOST = '1.201.177.46'
USER = 'root'
PASSWD = 'vot@Wlroi6!'
REMOTE_FE = '/home/wwwroot/roi.geniego.com/frontend/dist'
REMOTE_BE = '/home/wwwroot/roi.geniego.com/backend/src'
LOCAL_FE = 'd:/project/GeniegoROI/frontend/dist'
LOCAL_BE = 'd:/project/GeniegoROI/backend/src'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("Connecting...")
ssh.connect(HOST, username=USER, password=PASSWD, timeout=30)
print("Connected!")

sftp = ssh.open_sftp()

print("[1/5] Purging ALL old frontend assets...")
stdin, stdout, stderr = ssh.exec_command(f'rm -rf {REMOTE_FE}/assets/*')
stdout.read()

print("[2/5] Uploading new frontend dist...")
fe_count = 0
for root, dirs, files in os.walk(LOCAL_FE):
    for f in files:
        local = os.path.join(root, f).replace('\\', '/')
        rel = os.path.relpath(local, LOCAL_FE).replace('\\', '/')
        remote = f'{REMOTE_FE}/{rel}'
        remote_dir = os.path.dirname(remote)
        try:
            sftp.stat(remote_dir)
        except:
            parts = remote_dir.split('/')
            for i in range(2, len(parts)+1):
                d = '/'.join(parts[:i])
                try: sftp.stat(d)
                except: sftp.mkdir(d)
        sftp.put(local, remote)
        fe_count += 1
print(f"  Frontend: {fe_count} files")

print("[3/5] Uploading backend PHP...")
be_count = 0
for root, dirs, files in os.walk(LOCAL_BE):
    for f in files:
        local = os.path.join(root, f).replace('\\', '/')
        rel = os.path.relpath(local, LOCAL_BE).replace('\\', '/')
        remote = f'{REMOTE_BE}/{rel}'
        remote_dir = os.path.dirname(remote)
        try:
            sftp.stat(remote_dir)
        except:
            parts = remote_dir.split('/')
            for i in range(2, len(parts)+1):
                d = '/'.join(parts[:i])
                try: sftp.stat(d)
                except: sftp.mkdir(d)
        sftp.put(local, remote)
        be_count += 1
print(f"  Backend: {be_count} files")

print("[4/5] Setting permissions + nginx reload...")
ssh.exec_command(f'chmod -R 755 {REMOTE_FE} && chmod -R 755 {REMOTE_BE}')
stdin, stdout, stderr = ssh.exec_command('nginx -s reload 2>/dev/null || true')
stdout.read()

print("[5/5] Verifying no mock data on server...")
stdin, stdout, stderr = ssh.exec_command(f'grep -rl "Wireless Headphones" {REMOTE_FE}/ 2>/dev/null | wc -l')
wh = stdout.read().decode().strip()
print(f"  Wireless Headphones: {wh} files (should be 0)")
stdin, stdout, stderr = ssh.exec_command(f'grep -rl "_RETURNS" {REMOTE_FE}/ 2>/dev/null | wc -l')
mr = stdout.read().decode().strip()
print(f"  _RETURNS mock: {mr} files (should be 0)")

sftp.close()
ssh.close()
print(f"\nDeployment complete! https://roi.genie-go.com")
