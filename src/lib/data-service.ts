import { randomUUID } from 'node:crypto';
import { prisma } from './prisma';
import { requireUser } from './auth';
import { body, text, fail, json, safely } from './http';
import type { Prisma } from '../generated/prisma/client';

export const dataHandler = (req: Request) =>
  safely(async () => {
    const user = await requireUser(req);
    const email = user.email;
    const b = req.method === 'POST' ? await body(req) : {};

    // ۱. ساخت بیمارستان جدید (فقط توسط مدیر سامانه)
    if (b.action === 'createTenant') {
      if (!user.isPlatformAdmin) fail('ایجاد بیمارستان فقط برای مدیر سامانه مجاز است', 403);
      const id = randomUUID();
      await prisma.tenant.create({
        data: {
          id,
          name: text(b.name),
          owner: user.userId,
          created: new Date().toISOString(),
          members: { create: { email, role: 'admin' } },
        },
      });
      return json({ id });
    }

    const memberships = await prisma.member.findMany({ where: { email }, include: { tenant: true } });
    const tenants = memberships.map((m) => ({ id: m.tenant.id, name: m.tenant.name, role: m.role }));
    const url = new URL(req.url);
    const tenantId =
      req.method === 'GET'
        ? url.searchParams.get('tenantId') || url.searchParams.get('tenantID')
        : b.tenantId || b.tenantID;

    const current = { email, name: user.displayName, isPlatformAdmin: user.isPlatformAdmin };

    if (!tenantId) {
      if (req.method === 'POST') fail('بیمارستان را انتخاب کنید');
      return json({ tenants, user: current });
    }

    const member = memberships.find((m) => m.tenantId === tenantId);
    if (!member) fail('دسترسی به این بیمارستان مجاز نیست', 403);
    const admin = () => {
      if (member.role !== 'admin') fail('این عملیات فقط برای ادمین مجاز است', 403);
    };

    // ۲. خواندن اطلاعات داشبورد (تجهیزات و رویدادها)
    if (req.method === 'GET') {
      const [items, events, members] = await Promise.all([
        prisma.equipment.findMany({ where: { tenantId }, orderBy: { created: 'desc' } }),
        prisma.event.findMany({
          where: { tenantId },
          orderBy: [{ at: 'desc' }, { id: 'desc' }], // جایگزین rowid
        }),
        member.role === 'admin'
          ? prisma.member.findMany({ where: { tenantId }, select: { email: true, role: true } })
          : Promise.resolve([]),
      ]);
      return json({ tenants, items, events, members, role: member.role, user: current });
    }

    // ۳. مدیریت اعضای بیمارستان
    if (b.action === 'member') {
      admin();
      const target = text(b.email).toLowerCase();
      if (!['admin', 'operator'].includes(b.role)) fail('نقش نامعتبر');
      if (target === email) fail('نقش حساب خودتان قابل تغییر نیست');
      if (!(await prisma.authUser.findFirst({ where: { email: target, active: 1 } })))
        fail('ابتدا مدیر سامانه حساب این کاربر را ایجاد کند');
      await prisma.member.upsert({
        where: { tenantId_email: { tenantId, email: target } },
        create: { tenantId, email: target, role: b.role },
        update: { role: b.role },
      });
      return json({ ok: true });
    }

    const now = new Date().toISOString();
    const event = (tx: Prisma.TransactionClient, id: string, kind: string, extra: Record<string, any> = {}) =>
      tx.event.create({
        data: { tenantId, id: randomUUID(), equipmentId: id, kind, actor: email, at: now, ...extra },
      });

    // ۴. ثبت یا ویرایش تجهیز
    if (['create', 'edit'].includes(b.action)) {
      admin();
      const name = text(b.name),
        code = text(b.code),
        category = text(b.category),
        qrInfo = typeof b.qrInfo === 'string' ? b.qrInfo.slice(0, 5000) : '',
        image = typeof b.image === 'string' ? b.image : '';
      if (image && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 700000))
        fail('تصویر باید JPG، PNG یا WebP و کمتر از ۵۰۰ کیلوبایت باشد');

      if (b.action === 'create') {
        const id = randomUUID();
        await prisma.$transaction(async (tx) => {
          await tx.equipment.create({ data: { tenantId, id, name, code, category, qrInfo, image, created: now } });
          await event(tx, id, 'create');
        });
        return json({ id });
      }

      const id = text(b.id);
      await prisma.$transaction(async (tx) => {
        const count = await tx.equipment.updateMany({
          where: { tenantId, id },
          data: { name, code, category, qrInfo, image, version: { increment: 1 } },
        });
        if (!count.count) fail('تجهیز یافت نشد', 404);
        await event(tx, id, 'edit');
      });
      return json({ ok: true });
    }

    // ۵. ثبت رویدادهای خروج، برگشت، استریلیزاسیون و تایید
    const id = text(b.id);
    await prisma.$transaction(async (tx) => {
      const item = await tx.equipment.findUnique({ where: { tenantId_id: { tenantId, id } } });
      if (!item) fail('تجهیز یافت نشد', 404);

      let location = item.location,
        approval = item.approval,
        expiry = item.expiry,
        destination = '',
        reason = '',
        condition = '',
        result = '',
        cycleId: string | null = null;

      // جایگزینی rowid با مرتب‌سازی استاندارد Prisma
      const lastRows = await tx.event.findMany({
        where: {
          tenantId,
          equipmentId: id,
          kind: { in: ['out', 'return', 'steril_start', 'steril_end'] },
        },
        orderBy: [{ at: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { kind: true, destination: true, cycleId: true },
      });

      const last = lastRows[0];
      const away = last && ['out', 'steril_start'].includes(last.kind);

      if (b.action === 'approve') {
        admin();
        if (!['ready', 'pending', 'unusable'].includes(b.approval)) fail('وضعیت نامعتبر');
        approval = b.approval;
        reason = text(b.reason, 2000);
        expiry = b.expiry || null;
        if (expiry && (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || new Date(expiry).toISOString().slice(0, 10) !== expiry))
          fail('تاریخ نامعتبر');
        result = approval;
      } else if (['out', 'steril_start'].includes(b.action)) {
        if (away) fail('ابتدا برگشت تجهیز را ثبت کنید');
        destination = text(b.destination);
        reason = text(b.reason, 2000);
        location = destination;
        approval = 'pending';
        expiry = null;
        if (b.action === 'steril_start') cycleId = randomUUID();
      } else if (['return', 'steril_end'].includes(b.action)) {
        if (!away) fail('خروج باز برای این تجهیز وجود ندارد');
        if ((b.action === 'steril_end') !== (last.kind === 'steril_start'))
          fail('نوع برگشت با خروج ثبت‌شده سازگار نیست');
        destination = text(b.destination);
        condition = text(b.condition, 2000);
        reason = 'مبدأ: ' + last.destination;
        location = destination;
        approval = 'pending';
        expiry = null;
        if (b.action === 'steril_end') {
          if (!['passed', 'failed'].includes(b.result)) fail('نتیجه چرخه را انتخاب کنید');
          result = b.result;
          cycleId = last.cycleId;
        }
      } else {
        fail('عملیات نامعتبر');
      }

      const changed = await tx.equipment.updateMany({
        where: { tenantId, id, version: item.version },
        data: { location, approval, expiry, version: { increment: 1 } },
      });
      if (!changed.count) fail('اطلاعات هم‌زمان تغییر کرد؛ دوباره تلاش کنید', 409);

      await event(tx, id, b.action, { destination, reason, condition, result, cycleId });
    });

    return json({ ok: true });
  });