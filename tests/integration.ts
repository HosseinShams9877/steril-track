// @ts-nocheck
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:net';
import {DatabaseSync} from 'node:sqlite';
const root=path.resolve(import.meta.dirname,'..'),tmp=mkdtempSync(path.join(tmpdir(),'steril-test-'));
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const base='http://127.0.0.1:'+port,env={...process.env,DATABASE_URL:'file:'+path.join(tmp,'db.sqlite'),PUBLIC_URL:base,PORT:String(port),HOST:'127.0.0.1',NODE_ENV:'production',BACKUP_DIR:path.join(tmp,'backups')};
const pass='Test-password-12345';
const init=spawnSync(process.execPath,['--import','tsx','scripts/setup.ts','--stdin'],{cwd:root,env,input:JSON.stringify({email:'admin@example.com',name:'مدیر',password:pass}),encoding:'utf8'});assert.equal(init.status,0,init.stderr);
const seed=spawnSync(process.execPath,['--import','tsx','prisma/seed/index.ts'],{cwd:root,env,encoding:'utf8'});assert.equal(seed.status,0,seed.stderr);
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port),'-H','127.0.0.1'],{cwd:root,env,stdio:['ignore','pipe','pipe']});let logs='';server.stderr.on('data',b=>logs+=b);server.stdout.on('data',b=>logs+=b);
let cookie='';
async function call(route,body,status=200,token=cookie,origin=base){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json',origin}:{}),...(token?{cookie:token}:{})},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return {d,r}}
try{
 for(let i=0;i<400;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,50))}
 await call('/api/data',null,401);
 const forged=await fetch(base+'/api/data',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'admin@example.com'}});assert.equal(forged.status,401);
 await call('/api/auth/login',{email:'admin@example.com',password:'wrong'},401);
 let login=await call('/api/auth/login',{email:'admin@example.com',password:pass});cookie=login.r.headers.get('set-cookie').split(';')[0];assert(login.r.headers.get('set-cookie').includes('HttpOnly'));assert(login.r.headers.get('set-cookie').includes('SameSite=Strict'));
 const adminCookie=cookie;
 const a=(await call('/api/data',{action:'createTenant',name:'الف'})).d.id;
 const b=(await call('/api/data',{action:'createTenant',name:'ب'})).d.id;
 const item={action:'create',name:'قیچی',category:'جراحی',code:'Q-1',tenantId:a};const id=(await call('/api/data',item)).d.id;
 await call('/api/data',item,409);await call('/api/data',{...item,tenantId:b});
 await call('/api/data',{action:'out',tenantId:b,id,destination:'اتاق عمل',reason:'عمل'},404);
 await call('/api/admin/accounts',{action:'create',email:'operator@example.com',name:'کاربر',password:pass});
 await call('/api/data',{action:'member',tenantId:a,email:'operator@example.com',role:'operator'});
 login=await call('/api/auth/login',{email:'operator@example.com',password:pass});cookie=login.r.headers.get('set-cookie').split(';')[0];
 await call('/api/data?tenantId='+b,null,403);await call('/api/admin/accounts',null,403);await call('/api/data',{action:'createTenant',name:'غیرمجاز'},403);
 await call('/api/data',{action:'approve',tenantId:a,id,approval:'ready',reason:'تأیید'},403);
 for(const body of [{action:'out',destination:'اتاق عمل',reason:'عمل'},{action:'return',destination:'انبار',condition:'سالم'},{action:'steril_start',destination:'استریل',reason:'پاکسازی'},{action:'steril_end',destination:'انبار',condition:'سالم',result:'passed'}])await call('/api/data',{tenantId:a,id,...body});
 const state=(await call('/api/data?tenantId='+a)).d;assert.equal(state.items[0].approval,'pending');assert.equal(state.events.filter(e=>e.kind==='steril_end').length,1);
 await call('/api/data',{action:'out',tenantId:a,id,destination:'اتاق عمل',reason:'عمل'},403,cookie,'http://evil.local');
 await call('/api/auth/password',{currentPassword:pass,password:'Changed-password-9876'});await call('/api/auth/me',null,401);
 login=await call('/api/auth/login',{email:'operator@example.com',password:'Changed-password-9876'});const opCookie=login.r.headers.get('set-cookie').split(';')[0];
 cookie=adminCookie;const users=(await call('/api/admin/accounts')).d.users;await call('/api/admin/accounts',{action:'toggle',id:users.find(u=>u.email==='operator@example.com').id});await call('/api/auth/me',null,401,opCookie);
 await call('/api/data',{action:'approve',tenantId:a,id,approval:'ready',reason:'بررسی ادمین'});
 const html=await fetch(base+'/');assert.equal(html.status,200);assert((await html.text()).includes('استریل'));assert(html.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
 assert.equal((await fetch(base+'/fonts/Vazirmatn-Variable.woff2')).status,200);
 const backup=spawnSync(process.execPath,['--import','tsx','scripts/backup.ts'],{cwd:root,env,encoding:'utf8'});assert.equal(backup.status,0,backup.stderr);const snapshot=new DatabaseSync(backup.stdout.trim());assert.equal(snapshot.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(snapshot.prepare('SELECT COUNT(*) AS n FROM equipment').get().n,2);snapshot.close();
 await call('/api/auth/logout',{});await call('/api/auth/me',null,401);
 for(let i=0;i<10;i++)await call('/api/auth/login',{email:'missing@example.com',password:'wrong'},401);await call('/api/auth/login',{email:'missing@example.com',password:'wrong'},429);
 console.log('PASS Next.js production + Prisma HTTP: setup, login, cookies, forged-header rejection, tenant isolation, roles, full workflow, password change, revocation, CSRF, static assets, backup integrity, logout, rate limiting.');
}catch(e){console.error(logs);throw e}finally{server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));rmSync(tmp,{recursive:true,force:true})}
