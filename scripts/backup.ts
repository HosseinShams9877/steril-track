import 'dotenv/config';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {prisma} from '../src/lib/prisma';
const dir=path.resolve(process.env.BACKUP_DIR||'backups');mkdirSync(dir,{recursive:true});
const target=path.join(dir,'steril-track-'+new Date().toISOString().replaceAll(':','-')+'.sqlite');
try{await prisma.$executeRaw`VACUUM INTO ${target}`;console.log(target)}finally{await prisma.$disconnect()}
