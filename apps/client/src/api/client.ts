import ky from 'ky';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('auth');
    if (!raw) return null;
    return (JSON.parse(raw) as { state?: { token?: string } }).state?.token ?? null;
  } catch {
    return null;
  }
}

export const api = ky.create({
  prefixUrl: '/api',
  hooks: {
    beforeRequest: [
      request => {
        const token = getToken();
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (_req, _opts, response) => {
        if (response.status === 401) {
          localStorage.removeItem('auth');
          window.location.href = '/login';
        }
      },
    ],
  },
});
