import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {prisma} from './prisma';
import {body,fail,json,publicOrigin,text,safely} from './http'; // text اضافه شد
import {passwordHash,verify} from './password';

export type User={userId:string,email:string,displayName:string,isPlatformAdmin:boolean};
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const token=(req:Request)=>req.headers.get('cookie')?.match(/(?:^|;\s*)steril_session=([a-f0-9]{64})(?:;|$)/)?.[1];
const cookie=(value:string,age:number)=>`steril_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${publicOrigin().startsWith('https:')?'; Secure':''}`;
export async function userFor(req:Request):Promise<User|null>{const value=token(req);if(!value)return null;const session=await prisma.authSession.findUnique({where:{tokenHash:hash(value)},include:{user:true}});if(!session||session.expires<=BigInt(Date.now())||!session.user.active)return null;const u=session.user;return {userId:u.id,email:u.email,displayName:u.name,isPlatformAdmin:!!u.platformAdmin}}
export async function requireUser(req:Request){const u=await userFor(req);if(!u)fail('ابتدا وارد حساب شوید',401);return u!}
export async function createUser(email:unknown,name:unknown,password:unknown,platformAdmin=false){const e=text(email).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))fail('ایمیل معتبر وارد کنید');return prisma.authUser.create({data:{id:randomUUID(),email:e,name:text(name),password:await passwordHash(password),platformAdmin:Number(platformAdmin),active:1,created:new Date().toISOString()}})}
const audit=(actor:string,action:string,target='')=>prisma.authAudit.create({data:{actor,action,target,at:new Date().toISOString()}});
async function limit(key:string,max:number){await prisma.$transaction(async tx=>{const now=BigInt(Date.now());await tx.authAttempt.deleteMany({where:{until:{lt:now}}});const record=await tx.authAttempt.findUnique({where:{key}});if(record&&record.count>=max)fail('تلاش‌های متعدد؛ ۱۵ دقیقه بعد دوباره تلاش کنید',429);await tx.authAttempt.upsert({where:{key},create:{key,count:1,until:now+900000n},update:{count:{increment:1}}})})}
export const me=(req:Request)=>safely(async()=>json({user:await requireUser(req)}));
export const login=(req:Request)=>safely(async()=>{
 const b=await body(req),email=text(b.email).toLowerCase();
 await limit('account:'+email,10);
 const u=await prisma.authUser.findUnique({where:{email}});
 const good=await verify(b.password,u?.password||'0'.repeat(32)+':'+ '0'.repeat(128));
 if(!u||!u.active||!good){await audit(email,'login_failed');return json({error:'ایمیل یا رمز عبور نادرست است'},401)}
 await prisma.authAttempt.deleteMany({where:{key:'account:'+email}});await prisma.authSession.deleteMany({where:{expires:{lt:BigInt(Date.now())}}});
 const t=randomBytes(32).toString('hex');await prisma.authSession.create({data:{tokenHash:hash(t),userId:u.id,expires:BigInt(Date.now()+28800000)}});await audit(email,'login');return json({ok:true},200,{'Set-Cookie':cookie(t,28800)});
});
export const logout=(req:Request)=>safely(async()=>{await body(req);const t=token(req);if(t)await prisma.authSession.deleteMany({where:{tokenHash:hash(t)}});return json({ok:true},200,{'Set-Cookie':cookie('',0)})});
export const changePassword=(req:Request)=>safely(async()=>{const b=await body(req),u=await requireUser(req);await limit('password:'+u.userId,10);const account=await prisma.authUser.findUniqueOrThrow({where:{id:u.userId}});if(!await verify(b.currentPassword,account.password))fail('رمز فعلی نادرست است');const password=await passwordHash(b.password);await prisma.$transaction([prisma.authUser.update({where:{id:u.userId},data:{password}}),prisma.authSession.deleteMany({where:{userId:u.userId}})]);await audit(u.email,'password_changed',u.email);return json({ok:true},200,{'Set-Cookie':cookie('',0)})});
export const accounts=(req:Request)=>safely(async()=>{
 const u=await requireUser(req);if(!u.isPlatformAdmin)fail('دسترسی مجاز نیست',403);
 if(req.method==='GET'){const users=await prisma.authUser.findMany({select:{id:true,email:true,name:true,active:true,platformAdmin:true},orderBy:{created:'desc'}});return json({users})}
 const b=await body(req);if(b.action==='create'){await createUser(b.email,b.name,b.password);await audit(u.email,'account_created',b.email);return json({ok:true})}
 const target=await prisma.authUser.findUnique({where:{id:text(b.id)}});if(!target)fail('حساب یافت نشد',404);if(target.id===u.userId)fail('برای حساب خود از تغییر رمز استفاده کنید');
 if(!['reset','toggle'].includes(b.action))fail('عملیات نامعتبر');const data=b.action==='reset'?{password:await passwordHash(b.password)}:{active:target.active?0:1};await prisma.$transaction([prisma.authUser.update({where:{id:target.id},data}),prisma.authSession.deleteMany({where:{userId:target.id}})]);await audit(u.email,b.action,target.email);return json({ok:true})
});