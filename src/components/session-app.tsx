'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { ShieldCheck, LogIn, Activity, LockKeyhole, Users, X } from 'lucide-react';
import App from './equipment-app';

export default function SessionApp() {
  const qc = useQueryClient();

  const session = useQuery({
    queryKey: ['session'],
    queryFn: ({ signal }) => api('/service/auth/me', undefined, signal),
  });

  const user = session.data?.user || null;
  const loading = session.isPending;

  const setUser = (user: any) => {
    if (!user) qc.clear();
    qc.setQueryData(['session'], { user });
  };

  const mutation = useMutation({
    mutationFn: ({ path, body }: { path: string; body: any }) => api(path, body),
  });

  const mutate = (path: string, body: any) => mutation.mutateAsync({ path, body });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});

  async function login(e: any) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await mutate('/service/auth/login', { email, password });
      setPassword('');
      const res = await api<{ user: any }>('/service/auth/me');
      setUser(res.user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function open(p: string) {
    setError('');
    setForm({});
    setPanel(p);
    if (p === 'accounts') {
      try {
        const res = await api<{ users: any[] }>('/service/admin/accounts');
        setAccounts(res.users);
      } catch (e: any) {
        setError(e.message);
      }
    }
  }

  async function save(e: any) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (panel === 'password') {
        await mutate('/service/auth/password', form);
        setUser(null);
        setPanel('');
        setPassword('');
      } else {
        await mutate('/service/admin/accounts', { ...form, action: form.id ? 'reset' : 'create' });
        setForm({});
        const res = await api<{ users: any[] }>('/service/admin/accounts');
        setAccounts(res.users);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string) {
    setBusy(true);
    try {
      await mutate('/service/admin/accounts', { id, action: 'toggle' });
      const res = await api<{ users: any[] }>('/service/admin/accounts');
      setAccounts(res.users);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="auth-page min-h-screen flex flex-col items-center justify-center p-6">
        <ShieldCheck size={40} />
        <p>در حال بررسی نشست…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-page min-h-screen flex flex-col items-center justify-center p-6">
        <form
          className="auth-card w-full max-w-[440px] rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9"
          onSubmit={login}
        >
          <div className="auth-logo">
            <Activity size={30} />
          </div>
          <span className="eyebrow">STERIL TRACK · NEXT.JS</span>
          <h1>به استریل‌ترک خوش آمدید</h1>
          <p>با حساب سازمانی خود وارد سامانه مدیریت تجهیزات شوید.</p>

          <label>
            ایمیل
            <input
              required
              type="email"
              dir="ltr"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            رمز عبور
            <input
              required
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          <button disabled={busy}>
            <LogIn size={18} />
            {busy ? 'در حال ورود…' : 'ورود به سامانه'}
          </button>
          <small>برای ایجاد حساب یا بازیابی رمز با مدیر سامانه تماس بگیرید.</small>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="account-bar flex flex-wrap items-center gap-2">
        <span>{user.displayName}</span>
        {user.isPlatformAdmin && (
          <button onClick={() => open('accounts')}>
            <Users size={15} />
            حساب‌های سامانه
          </button>
        )}
        <button onClick={() => open('password')}>
          <LockKeyhole size={15} />
          تغییر رمز
        </button>
        <button
          onClick={async () => {
            await mutate('/service/auth/logout', {});
            setUser(null);
          }}
        >
          خروج
        </button>
      </div>

      <App sessionId={user.userId} />

      {panel && (
        <div className="overlay">
          <section className="modal wide">
            <div className="section-head">
              <h2>{panel === 'password' ? 'تغییر رمز عبور' : 'مدیریت حساب‌های مستقل'}</h2>
              <button
                className="icon"
                onClick={() => {
                  setPanel('');
                  setError('');
                }}
              >
                <X />
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form onSubmit={save}>
              {panel === 'password' ? (
                <label>
                  رمز فعلی
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  />
                </label>
              ) : (
                !form.id && (
                  <div className="form-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label>
                      نام
                      <input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </label>
                    <label>
                      ایمیل
                      <input
                        required
                        type="email"
                        dir="ltr"
                        value={form.email || ''}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </label>
                  </div>
                )
              )}

              {form.id && <p>تنظیم رمز جدید برای {form.email}</p>}

              <label>
                رمز جدید (حداقل ۱۲ کاراکتر)
                <input
                  required
                  minLength={12}
                  maxLength={128}
                  type="password"
                  autoComplete="new-password"
                  value={form.password || ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>

              <button disabled={busy}>
                {panel === 'password' ? 'تغییر رمز و خروج' : form.id ? 'ثبت رمز جدید' : 'ایجاد حساب'}
              </button>
            </form>

            {panel === 'accounts' && (
              <>
                <p className="hint">
                  پس از ایجاد حساب، در بخش «کاربران و دسترسی» بیمارستان، عضویت و نقش آن را تعیین کنید. حساب تازه تا دریافت
                  عضویت به هیچ بیمارستانی دسترسی ندارد.
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>نام / ایمیل</th>
                        <th>وضعیت</th>
                        <th>عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((a) => (
                        <tr key={a.id}>
                          <td>
                            {a.name}
                            <small dir="ltr"> {a.email}</small>
                          </td>
                          <td>{a.active ? 'فعال' : 'غیرفعال'}</td>
                          <td>
                            {a.id !== user.userId && (
                              <>
                                <button
                                  disabled={busy}
                                  className="secondary"
                                  onClick={() => setForm({ id: a.id, email: a.email })}
                                >
                                  تغییر رمز
                                </button>{' '}
                                <button disabled={busy} className="secondary" onClick={() => toggle(a.id)}>
                                  {a.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}