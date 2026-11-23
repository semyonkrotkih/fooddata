// Override with EXPO_PUBLIC_API_URL in .env when running on a device/emulator,
// where "localhost" refers to the phone itself, not the dev machine.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5242';

export async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const response = await fetch(`${API_BASE_URL}${path}?${query}`);

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}
