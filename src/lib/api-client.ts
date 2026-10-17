export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = any>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    signal,
    ...(body !== undefined
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });

  const contentType = response.headers.get('content-type');
  let data: any = {};
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    throw new ApiError(`خطای سرور: پاسخ نامعتبر (${response.status})`, response.status);
  }

  if (!response.ok) {
    throw new ApiError(data.error || 'خطای ارتباط با سرور', response.status);
  }

  return data;
}