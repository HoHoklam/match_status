/**
 * 移植主站 apiFetch 客户端规范
 */
export const BASE_URL = '/api/v1';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let msg = `请求失败: HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return response.json();
}
