// @ts-nocheck
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const temp=mkdtempSync(path.join(tmpdir(),'steril-upgrade-')),file=path.join(temp,'legacy.sqlite');
const db=new DatabaseSync(file);
db.exec(readFileSync('tests/fixtures/v2-schema.sql','utf8'));
db.prepare('INSERT INTO tenants VALUES(?,?,?,?)').run('legacy-hospital','داده قبلی','legacy-owner','2026-01-01');
db.prepare('INSERT INTO equipment(tenantID,id,code,name,category,created) VALUES(?,?,?,?,?,?)').run('legacy-hospital','legacy-item','OLD-001','تجهیز قبلی','جراحی','2026-01-01');
db.prepare('INSERT INTO events(tenantID,id,equipmentID,kind,actor,at) VALUES(?,?,?,?,?,?)').run('legacy-hospital','legacy-event','legacy-item','create','legacy@example.com','2026-01-01');
db.close();
const env={...process.env,DATABASE_URL:'file:'+file};
try{const r=spawnSync(process.execPath,['--import','tsx','scripts/baseline-v2.ts'],{env,encoding:'utf8'});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);const migrate=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env,encoding:'utf8'});assert.equal(migrate.status,0,migrate.stderr);const v=new DatabaseSync(file);assert.equal(v.prepare('SELECT name FROM equipment').get().name,'تجهیز قبلی');assert.equal(v.prepare('SELECT COUNT(*) n FROM events').get().n,1);assert.equal(v.prepare('SELECT COUNT(*) n FROM _prisma_migrations WHERE finished_at IS NOT NULL').get().n,1);v.close();console.log('PASS v2 baseline, migration deploy and preservation of tenant, equipment and event records.')}finally{rmSync(temp,{recursive:true,force:true})}
