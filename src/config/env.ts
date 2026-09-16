const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const env = {
  mockMode: import.meta.env.VITE_MOCK_MODE === 'true',
  apiUrl: apiUrl.replace(/\/$/, ''),
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
} as const;

export const MOCK_MODE = env.mockMode;
export const API_URL = env.apiUrl;
