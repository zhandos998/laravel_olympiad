import { DEFAULT_LOCALE, LOCALE_KEY } from '../constants/locale';

export async function api(path, { method = 'GET', body, token, keepalive = false } = {}) {
    const locale = localStorage.getItem(LOCALE_KEY) || DEFAULT_LOCALE;

    const response = await fetch(`/api${path}`, {
        method,
        keepalive,
        headers: {
            'Content-Type': 'application/json',
            'X-Locale': locale,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}
