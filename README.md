# استریل‌ترک ۳.۰ — Next.js App Router + Prisma

این نسخه جایگزین ساختار نسخه ۲.۰ است. رابط موجود، فونت محلی وزیرمتن، تقویم شمسی، بارکدخوان HID و گردش کار تجهیزات حفظ شده‌اند. سرور HTTP سفارشی، Vite و Drizzle در برنامه اجرایی وجود ندارند.

## پشته و ساختار

- Next.js 16.4.2 با App Router و TypeScript؛ اجرا با next dev / next build / next start.
- Prisma 7.10.1 و adapter رسمی SQLite؛ نسخه آزمایشی Prisma 8 استفاده نشده است.
- Tailwind CSS 4.3.3 با PostCSS و utility class در رابط؛ استایل اختصاصی ظاهر قبلی داخل لایه components حفظ شده است.
- TanStack React Query 5.104.3: QueryClientProvider، کش نشست و داده‌های بیمارستان، useMutation و invalidation پس از تغییر داده. کلید کش بیمارستان شامل userId و tenantId است و هنگام خروج کش پاک می‌شود.
- Node.js 24 LTS و pnpm 11.25.0؛ dependencyها در pnpm-lock.yaml قفل شده‌اند.

| مسیر | کاربرد |
|---|---|
| src/app/page.tsx و layout.tsx | صفحه و layout Next.js |
| src/app/providers.tsx | React Query provider |
| src/app/api/**/route.ts | همه API Route Handlerها |
| src/components | رابط، فرم‌ها، بارکدخوان و تقویم |
| src/lib/prisma.ts | Prisma Client مشترک |
| src/lib/data-service.ts | عملیات تجهیزات و کنترل tenant |
| src/lib/auth.ts | احراز هویت، نشست و نقش‌ها |
| prisma/schema.prisma | مدل‌های دیتابیس |
| prisma/migrations | migration نسخه‌بندی‌شده |
| prisma/seed/index.ts | ورودی seed |
| prisma/seed/admin.ts | ساخت ادمین بدون رمز پیش‌فرض |
| prisma/seed/demo.ts | داده آزمایشی اختیاری و idempotent |
| scripts/baseline-v2.ts | پذیرش دیتابیس قبلی در Prisma |
| tests | تست production HTTP، تقویم و ارتقای دیتابیس |

## نصب تازه

Node.js 24 و pnpm 11.25.0 را نصب کنید. ZIP را استخراج کنید. برای نصب pnpm می‌توانید از `npm install -g pnpm@11.25.0` استفاده کنید.

```text
pnpm install --frozen-lockfile
pnpm db:generate
pnpm setup
pnpm build
pnpm start
```

setup تنظیمات محلی را ایجاد، migration را اجرا و اطلاعات مدیر را تعاملی دریافت می‌کند. رمز نمایش داده نمی‌شود؛ حداقل ۱۲ کاراکتر است. سپس دقیقاً `http://localhost:3000` را باز کنید.

در ویندوز، پس از نصب Node و pnpm، فایل Setup-Windows.cmd همین مراحل را انجام می‌دهد. سپس Start-Windows.cmd را اجرا کنید.

برای توسعه: `pnpm dev`.

## اجرای مستقل seed

تنظیم DATABASE_URL در .env الزامی نیست؛ پیش‌فرض file:./data/steril-track.sqlite است. برای سرور واقعی آن را صریح تنظیم کنید. در .env یا متغیرهای محیطی ADMIN_EMAIL و ADMIN_PASSWORD و در صورت نیاز ADMIN_NAME را تعیین کنید، سپس:

```text
pnpm db:migrate
pnpm db:seed
```

ادمین موجود دوباره ساخته نمی‌شود و رمز او با اجرای مجدد seed تغییر نمی‌کند. پس از seed متغیر ADMIN_PASSWORD را از تنظیمات حذف کنید. ساخت حساب با رمز پیش‌فرض یا انتشار رمز داخل سورس انجام نمی‌شود.

داده آزمایشی فقط با SEED_DEMO=true ساخته می‌شود و در NODE_ENV=production ممنوع است. اجرای دوباره demo داده تکراری تولید نمی‌کند.

## tenantId و سازگاری داده‌ها

نام فیلد در مدل Prisma و API جدید `tenantId` است؛ با `@map("tenantID")` به ستون موجود دیتابیس متصل می‌شود. نام جدول‌ها با @@map حفظ شده است. پارامتر قدیمی tenantID نیز برای سازگاری API پذیرفته می‌شود.

کد تجهیز در هر بیمارستان یکتا است. کلیدهای مرکب tenantId/id و رابطه مرکب تاریخچه/تجهیز پابرجا هستند. تمام CRUDهای تجهیزات پس از بررسی نشست و عضویت بیمارستان با tenantId محدود می‌شوند. tenantId ارسالی به‌تنهایی مجوز نیست.

محل تجهیز و تأیید آمادگی دو وضعیت مستقل هستند. تغییر وضعیت و افزودن رویداد در تراکنش Prisma انجام می‌شود. برای ترتیب صحیح رویدادهای قدیمی با timestamp مساوی، دو خواندن تاریخچه از queryRaw پارامتری Prisma و rowid استفاده می‌کنند؛ سایر CRUDها با مدل Prisma هستند. backup و بررسی schema نیز از APIهای Prisma انجام می‌شوند. ORM دوم یا اتصال مستقیم دیتابیس در کد اجرایی برنامه وجود ندارد.

## ارتقا از نسخه مستقل ۲.۰، بدون حذف داده

۱. سرویس قبلی را متوقف و با ابزار backup نسخه قبلی snapshot تهیه کنید.
۲. فایل دیتابیس قبلی را در محل داده نسخه جدید قرار دهید. .env را با DATABASE_URL همان فایل تنظیم کنید. مثال ویندوز: `DATABASE_URL=file:C:/SterilTrack/data/steril-track.sqlite`.
۳. ابتدا dependencyها و Prisma Client را آماده کنید:

```text
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:baseline
pnpm db:migrate
pnpm build
pnpm start
```

baseline فقط schema شناخته‌شده نسخه ۲ را می‌پذیرد، روابط را کنترل می‌کند، snapshot می‌سازد و migration اولیه را applied علامت می‌زند. رکوردهای بیمارستان، تجهیز، تاریخچه و حساب‌ها بازنویسی نمی‌شوند. جدول قدیمی schema_migrations حفظ می‌شود؛ Prisma تاریخچه خود را جداگانه در _prisma_migrations نگه می‌دارد.

اگر بررسی schema خطا داد، عملیات را متوقف و تفاوت را بررسی کنید. برای رفع خطا از migrate reset یا db push --accept-data-loss استفاده نکنید. این baseline برای دیتابیس نسخه ۲ است؛ انتقال از D1 نسخه میزبانی‌شده قدیمی ابتدا نیازمند خروجی گرفتن داده و بررسی جداگانه است.

## استقرار production

در .env:

```text
DATABASE_URL=file:/absolute/path/to/data/steril-track.sqlite
PUBLIC_URL=https://steril.example.com
```

دامنه را جایگزین کنید. مبدأ مرورگر باید با PUBLIC_URL یکسان باشد. برای دامنه‌های عمومی HTTPS الزامی است؛ HTTP تنها برای localhost/127.0.0.1 در تست محلی مجاز است. Next.js همچنان به محیط Node.js نیاز دارد و روی هاست صرفاً PHP یا static اجرا نمی‌شود.

با IIS reverse proxy، Nginx یا Caddy، HTTPS را جلوی Next روی localhost:3000 قرار دهید. نمونه Caddy و systemd داخل deploy موجود است. محدودیت تلاش ورود بر پایه حساب در برنامه فعال است؛ rate limit بر پایه IP را روی reverse proxy مورد اعتماد اعمال کنید.

SQLite را روی دیسک پایدار محلی نگهداری کنید. نصب چندبیمارستانی روی یک instance پشتیبانی می‌شود. چند replica، دیسک موقت serverless یا اشتراک دیتابیس روی SMB/NFS با این تنظیم مناسب نیست؛ برای آن سناریو باید provider و migrationها به PostgreSQL تبدیل شوند. صرف استفاده از Prisma این محدودیت را حذف نمی‌کند.

### Docker

PUBLIC_URL را در .env تنظیم کنید:

```text
docker compose build
docker compose run --rm app pnpm setup
docker compose up -d
```

Dockerfile هنگام build dependency بومی SQLite و Next را برای محیط مقصد می‌سازد. فایل .next و node_modules یک سیستم‌عامل را به سیستم‌عامل دیگر منتقل نکنید. دیتابیس و backup در volume پایدار قرار دارند. سرویس پشت reverse proxy میزبان اجرا می‌شود.

### ویندوز و اجرای خودکار

Task Scheduler را با حساب سرویس اختصاصی و مسیر واقعی node.exe تنظیم کنید. Arguments:

```text
C:\SterilTrack\node_modules\next\dist\bin\next start --hostname 127.0.0.1 --port 3000
```

Start in باید C:\SterilTrack باشد. مسیرها را با محل نصب هماهنگ کنید؛ برای مسیر دارای فاصله از کوتیشن استفاده کنید. فایل .env، data و backups باید فقط در اختیار حساب مجاز باشند.

## حساب‌ها، backup و بازیابی

مدیر سامانه بیمارستان و حساب‌ها را ایجاد می‌کند. حساب جدید تا دریافت عضویت به بیمارستان دسترسی ندارد. ادمین بیمارستان نقش‌های همان بیمارستان را مدیریت می‌کند. رمزها scrypt هستند، توکن نشست به‌صورت hash ذخیره می‌شود و کوکی HttpOnly/SameSite و در HTTPS دارای Secure است. تغییر رمز یا غیرفعال‌سازی حساب، نشست‌های قبلی را لغو می‌کند.

```text
pnpm backup
pnpm setup --reset
```

فرمان اول snapshot سازگار SQLite در backups می‌سازد. فرمان دوم برای بازیابی رمز مدیر از کنسول است. برای بازیابی دیتابیس، سرویس را متوقف کنید، نسخه فعلی و فایل‌های احتمالی -wal/-shm را نگه دارید، snapshot را در مسیر DATABASE_URL جایگزین و سرویس را روشن کنید. ابتدا در محیط آزمایشی تمرین کنید.

## آزمون

```text
pnpm build
pnpm test
pnpm exec tsx tests/upgrade.ts
```

تست‌ها از دیتابیس موقت استفاده می‌کنند؛ تست HTTP خودِ Next production را اجرا می‌کند. تست baseline از نمونه ساختار نسخه ۲ استفاده می‌کند و فایل tests/fixtures/v2-schema.sql فقط fixture سازگاری است، نه ORM یا migration فعال قدیمی.

پوشه generated با pnpm db:generate تولید می‌شود. node_modules، فایل‌های داده واقعی، رمزها و build وابسته به سیستم‌عامل داخل ZIP نیستند.

محدودیت تأیید: اجرای واقعی ویندوز، Docker، مرورگر و بارکدخوان فیزیکی در این محیط انجام نشده است. تست backend و build روی لینوکس انجام می‌شود.

مستندات مرجع:
- https://nextjs.org/docs/app/getting-started/route-handlers
- https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding
- https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/sqlite
