/**
 * 现场记录操作台 HTTP 基础请求封装
 */
export const API_BASE = '/api/v1';

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
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
