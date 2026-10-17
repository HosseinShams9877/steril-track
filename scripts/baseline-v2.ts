import 'dotenv/config';
import {prisma} from '../src/lib/prisma';
import {spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
// Read-only schema verification precedes any baseline write. SQL is a fixed local migration, never user input.
const expected:Record<string,string[]>={tenants:['id','name','owner','created'],members:['tenantID','email','role'],equipment:['tenantID','id','code','name','category','qrInfo','image','location','approval','expiry','created','version'],events:['tenantID','id','equipmentID','kind','destination','reason','condition','result','cycleID','actor','at'],auth_users:['id','email','name','password','platform_admin','active','created'],auth_sessions:['token_hash','user_id','expires'],auth_attempts:['key','count','until'],auth_audit:['id','actor','action','target','at'],schema_migrations:['name','hash','applied']};
const canon=(value:unknown)=>JSON.stringify(value,(_k,v)=>typeof v==='bigint'?Number(v):v);
try{
 const migrations=await prisma.$queryRaw<Array<{name:string}>>`SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'`;
 if(migrations.length)throw Error('Prisma migration history already exists; use pnpm db:migrate.');
 for(const [table,columns] of Object.entries(expected)){const rows=await prisma.$queryRawUnsafe<Array<{name:string}>>(`PRAGMA table_info("${table}")`);if(rows.map(r=>r.name).sort().join()!==columns.sort().join())throw Error('Schema mismatch in '+table+'; baseline refused.');}
 const fk=await prisma.$queryRaw<Array<unknown>>`PRAGMA foreign_key_check`;if(fk.length)throw Error('Foreign key violations; baseline refused.');
 // Compare real foreign keys, indexes and column constraints with an ephemeral database created from the exact Prisma migration.
 const {PrismaClient}=await import('../src/generated/prisma/client');const {PrismaBetterSqlite3}=await import('@prisma/adapter-better-sqlite3');
 const reference=new PrismaClient({adapter:new PrismaBetterSqlite3({url:'file::memory:'})});
 try{
  const sql=readFileSync('prisma/migrations/20261017000000_initial/migration.sql','utf8');for(const part of sql.split(';').map(s=>s.trim()).filter(Boolean))await reference.$executeRawUnsafe(part);
  for(const table of Object.keys(expected)){
   const clean=(rows:any[])=>rows.map(({cid,...r})=>({...r,dflt_value:r.dflt_value===undefined?undefined:String(r.dflt_value??'').replaceAll("'",'').replaceAll('"','')})).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
   const original=await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info("${table}")`),fresh=await reference.$queryRawUnsafe<any[]>(`PRAGMA table_info("${table}")`);
   // SQLite text primary keys in v2 may report notnull=0; Prisma treats their non-null persisted values identically.
   const comparable=(rows:any[])=>clean(rows).map(r=>({...r,type:r.type==='BIGINT'?'INTEGER':r.type,notnull:r.pk?1:r.notnull}));
   if(canon(comparable(original))!==canon(comparable(fresh)))throw Error('Column constraints differ: '+table);
   const keys=(rows:any[])=>rows.map(({id,...r})=>r).sort((a,b)=>canon(a).localeCompare(canon(b)));
   const oldKeys=await prisma.$queryRawUnsafe<any[]>(`PRAGMA foreign_key_list("${table}")`),newKeys=await reference.$queryRawUnsafe<any[]>(`PRAGMA foreign_key_list("${table}")`);
   if(canon(keys(oldKeys))!==canon(keys(newKeys)))throw Error('Relations differ: '+table);
   const indexes=async(client:any)=>{const list=await client.$queryRawUnsafe(`PRAGMA index_list("${table}")`);const result=[];for(const index of list){if(index.origin==='pk')continue;const safe=String(index.name).replaceAll('"','""');const columns=await client.$queryRawUnsafe(`PRAGMA index_info("${safe}")`);result.push([Number(index.unique),columns.map((c:any)=>c.name)])}return result.sort((a,b)=>canon(a).localeCompare(canon(b)))};
   if(canon(await indexes(prisma))!==canon(await indexes(reference)))throw Error('Indexes differ: '+table);

  }
 }finally{await reference.$disconnect()}
 mkdirSync('backups',{recursive:true});const backup=path.resolve('backups','before-prisma-'+Date.now()+'.sqlite');await prisma.$executeRaw`VACUUM INTO ${backup}`;
 await prisma.$disconnect();const r=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','resolve','--applied','20261017000000_initial'],{stdio:'inherit'});if(r.status!==0)throw Error('Baseline failed');console.log('Baseline completed; no application data rewritten. Backup: '+backup);
}finally{await prisma.$disconnect()}
