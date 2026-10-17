import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('--- شروع تست اجزا ---');

  // ۱. تست اتصال به دیتابیس
  try {
    console.log('1. تست اتصال به دیتابیس...');
    await prisma.$connect();
    console.log('✅ اتصال به دیتابیس موفق بود.');
  } catch (error) {
    console.error('❌ خطا در اتصال به دیتابیس:', error.message);
    process.exit(1);
  }

  // ۲. تست خواندن کاربر
  try {
    console.log('\n2. تست خواندن کاربر از دیتابیس...');
    const user = await prisma.authUser.findUnique({
      where: { email: 'admin@example.com' },
    });
    if (user) {
      console.log('✅ کاربر پیدا شد:', user.email);
    } else {
      console.log('⚠️ کاربر پیدا نشد. آیا سید اجرا شده است؟');
    }
  } catch (error) {
    console.error('❌ خطا در خواندن کاربر:', error.message);
  }

  // ۳. تست خواندن تجهیزات
  try {
    console.log('\n3. تست خواندن تجهیزات...');
    const equipment = await prisma.equipment.findMany({
      take: 1,
    });
    console.log('✅ کوئری تجهیزات اجرا شد. تعداد:', equipment.length);
  } catch (error) {
    console.error('❌ خطا در کوئری تجهیزات:', error.message);
  }

  // ۴. تست خواندن رویدادها
  try {
    console.log('\n4. تست خواندن رویدادها...');
    const events = await prisma.event.findMany({
      take: 1,
    });
    console.log('✅ کوئری رویدادها اجرا شد. تعداد:', events.length);
  } catch (error) {
    console.error('❌ خطا در کوئری رویدادها:', error.message);
  }

  await prisma.$disconnect();
  console.log('\n--- پایان تست ---');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});