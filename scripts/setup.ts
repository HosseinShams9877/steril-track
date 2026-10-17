import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
let input:{email:string,name:string,password:string};
if(process.argv.includes('--stdin'))input=JSON.parse(readFileSync(0,'utf8'));else{
 let muted=false;const output=new Writable({write(chunk,_enc,done){if(!muted)process.stdout.write(chunk);done()}});const rl=createInterface({input:process.stdin,output,terminal:!!process.stdin.isTTY});
 try{const email=await rl.question('Administrator email: '),name=await rl.question('Display name: ');process.stdout.write('Password (hidden, 12+ chars): ');muted=true;const password=await rl.question('');muted=false;process.stdout.write('\nConfirm password: ');muted=true;const again=await rl.question('');muted=false;process.stdout.write('\n');if(password!==again)throw Error('Passwords do not match');input={email,name,password}}finally{rl.close()}
}
if(!existsSync('.env')&&!process.env.DATABASE_URL)writeFileSync('.env','DATABASE_URL=file:./data/steril-track.sqlite\nPUBLIC_URL=http://localhost:3000\n',{mode:0o600});
await import('dotenv/config');
const migration=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{stdio:'inherit',env:process.env});if(migration.status!==0)throw Error('Migration failed. Existing v2 databases require pnpm db:baseline first.');
const {prisma}=await import('../src/lib/prisma');
try{
 if(process.argv.includes('--reset')){const {passwordHash}=await import('../src/lib/password');const u=await prisma.authUser.findFirst({where:{email:input.email.toLowerCase(),platformAdmin:1}});if(!u)throw Error('Administrator not found');await prisma.$transaction([prisma.authUser.update({where:{id:u.id},data:{password:await passwordHash(input.password),active:1}}),prisma.authSession.deleteMany({where:{userId:u.id}})]);console.log('Password reset; prior sessions revoked.');}
 else{const {seedAdmin}=await import('../prisma/seed/admin');await seedAdmin(input);console.log('Ready. Run pnpm build and pnpm start.');}
}finally{await prisma.$disconnect()}
