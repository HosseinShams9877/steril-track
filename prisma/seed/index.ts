import 'dotenv/config';
import {prisma} from '../../src/lib/prisma';
import {seedAdmin} from './admin';
import {seedDemo} from './demo';
try{if(process.env.SEED_DEMO==='true'&&process.env.NODE_ENV==='production')throw Error('Demo seed disabled in production');const admin=await seedAdmin();await seedDemo(admin);console.log('Seed completed.')}finally{await prisma.$disconnect()}
