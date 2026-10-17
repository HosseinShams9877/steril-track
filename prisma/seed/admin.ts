import {prisma} from '../../src/lib/prisma';
import {createUser} from '../../src/lib/auth';
export async function seedAdmin(input?:{email:string,name:string,password:string}){
 const email=(input?.email||process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 const existing=email?await prisma.authUser.findUnique({where:{email}}):await prisma.authUser.findFirst({where:{platformAdmin:1}});
 if(existing){if(!existing.platformAdmin)throw Error('Seed will not promote an existing non-admin account');console.log('Administrator already exists; password and data unchanged.');return existing}
 if(!email)throw Error('Set ADMIN_EMAIL and ADMIN_PASSWORD, or run pnpm setup. No default password is provided.');
 return createUser(email,input?.name||process.env.ADMIN_NAME||'مدیر سامانه',input?.password||process.env.ADMIN_PASSWORD,true);
}
