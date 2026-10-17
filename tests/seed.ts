import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const temp=mkdtempSync(path.join(tmpdir(),'steril-seed-')),database=path.join(temp,'seed.sqlite');
const env:NodeJS.ProcessEnv={...process.env,DATABASE_URL:'file:'+database,ADMIN_EMAIL:'seed@example.com',ADMIN_NAME:'Seed administrator',ADMIN_PASSWORD:'Seed-test-password-12345',SEED_DEMO:'true',NODE_ENV:'development'};
function run(args:string[]){const r=spawnSync(process.execPath,args,{env,encoding:'utf8'});assert.equal(r.status,0,r.stdout+'\n'+r.stderr)}
try{
 run(['node_modules/prisma/build/index.js','migrate','deploy']);run(['--import','tsx','prisma/seed/index.ts']);
 const before=new DatabaseSync(database);const saved=before.prepare('SELECT password FROM auth_users').get()!.password;before.close();
 run(['--import','tsx','prisma/seed/index.ts']);
 const db=new DatabaseSync(database);assert.equal(db.prepare('SELECT COUNT(*) n FROM tenants').get()!.n,2);assert.equal(db.prepare('SELECT COUNT(*) n FROM equipment').get()!.n,2);assert.equal(db.prepare('SELECT COUNT(*) n FROM events').get()!.n,2);assert.equal(db.prepare('SELECT COUNT(*) n FROM auth_users').get()!.n,1);assert.equal(db.prepare('SELECT password FROM auth_users').get()!.password,saved);db.close();
 const blocked=spawnSync(process.execPath,['--import','tsx','prisma/seed/index.ts'],{env:{...env,NODE_ENV:'production'},encoding:'utf8'});assert.notEqual(blocked.status,0);
 console.log('PASS seed idempotency, two demo tenants, preserved password and production demo rejection.');
}finally{rmSync(temp,{recursive:true,force:true})}
