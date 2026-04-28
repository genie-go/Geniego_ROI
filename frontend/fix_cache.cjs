const {Client}=require('ssh2');
const conn=new Client();
conn.on('ready',()=>{
  const cmd = `
for d in /home/wwwroot/roi.genie-go.com/frontend/dist /home/wwwroot/roi.geniego.com/frontend/dist /home/wwwroot/roidemo.genie-go.com/frontend/dist; do
cat > "\$d/.htaccess" << 'EOF'
Options -MultiViews
RewriteEngine On
RewriteBase /

<IfModule mod_headers.c>
<FilesMatch "^index\\.html$">
Header set Cache-Control "no-cache, no-store, must-revalidate"
Header set Pragma "no-cache"
Header set Expires "0"
</FilesMatch>
</IfModule>

RewriteRule ^(api|auth|v[0-9]+)(/.*)?$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
EOF
echo "OK: \$d"
done
`;
  conn.exec(cmd,(err,stream)=>{
    if(err)throw err;
    let o='';
    stream.on('data',d=>o+=d.toString());
    stream.stderr.on('data',d=>o+=d.toString());
    stream.on('close',()=>{console.log(o);conn.end();});
  });
}).connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'});
