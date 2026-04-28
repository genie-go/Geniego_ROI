/**
 * _deploy_demo.cjs — SFTP-based demo server deployment
 * Deploys frontend/dist → roidemo.geniego.com
 */
const{Client}=require('ssh2');const fs=require('fs');const path=require('path');
const R={host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'};
const L=path.join(__dirname,'frontend/dist');
const RD='/home/wwwroot/roidemo.geniego.com/frontend/dist';
let uc=0,tf=0;
function af(d,b=''){const r=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const rel=b?b+'/'+e.name:e.name;if(e.isDirectory())r.push(...af(path.join(d,e.name),rel));else r.push(rel);}return r;}
function ed(s,p){return new Promise((r,j)=>{s.stat(p,e=>{if(e)s.mkdir(p,{mode:0o755},me=>{if(me&&me.code!==4)j(me);else r();});else r();});});}
async function eds(s,fp){const ds=new Set();for(const f of fp){const p=f.split('/');for(let i=1;i<p.length;i++)ds.add(p.slice(0,i).join('/'));}for(const d of[...ds].sort())await ed(s,RD+'/'+d);}
function uf(s,lp,rp){return new Promise((r,j)=>{s.fastPut(lp,rp,e=>{if(e)j(e);else{uc++;if(uc%20===0||uc===tf)console.log(`  📤 ${uc}/${tf}`);r();}});});}
async function deploy(){const files=af(L);tf=files.length;console.log(`\n🎪 DEMO DEPLOY: ${tf} files → ${R.host} (${RD})\n`);const c=new Client();return new Promise((r,j)=>{c.on('ready',()=>{console.log('✅ SSH');c.sftp(async(e,s)=>{if(e){j(e);return;}try{await ed(s,RD);console.log('📁 dirs');await eds(s,files);console.log('📤 upload');for(let i=0;i<files.length;i+=5){const b=files.slice(i,i+5);await Promise.all(b.map(f=>uf(s,path.join(L,f),RD+'/'+f)));}console.log(`\n🎉 Demo Deploy Done! ${uc} files`);console.log('🌐 https://roidemo.genie-go.com\n');c.end();r();}catch(e){j(e);c.end();}});});c.on('error',j);c.connect(R);});}
deploy().catch(e=>{console.error('❌',e.message);process.exit(1);});
