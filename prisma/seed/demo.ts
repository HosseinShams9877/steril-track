import {prisma} from '../../src/lib/prisma';
export async function seedDemo(admin:{id:string,email:string}){
 if(process.env.SEED_DEMO!=='true')return;
 if(process.env.NODE_ENV==='production')throw Error('Demo seed is disabled in production');
 for(const [id,name] of [['demo-hospital-a','بیمارستان آزمایشی الف'],['demo-hospital-b','بیمارستان آزمایشی ب']]){
  await prisma.tenant.upsert({where:{id},update:{},create:{id,name,owner:admin.id,created:new Date().toISOString()}});
  await prisma.member.upsert({where:{tenantId_email:{tenantId:id,email:admin.email}},update:{},create:{tenantId:id,email:admin.email,role:'admin'}});
  await prisma.$transaction(async tx=>{const key={tenantId:id,id:'demo-equipment-1'};if(!await tx.equipment.findUnique({where:{tenantId_id:key}})){await tx.equipment.create({data:{...key,code:'DEMO-001',name:'قیچی جراحی آزمایشی',category:'آزمایشی',created:new Date().toISOString()}});await tx.event.create({data:{tenantId:id,id:'demo-event-1',equipmentId:key.id,kind:'create',actor:admin.email,at:new Date().toISOString()}})}});
 }
 console.log('Optional demo tenants seeded idempotently.');
}
