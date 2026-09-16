import { API_URL, MOCK_MODE } from '../config/env';
import { mockRequest } from './mockRequest';

export const apiRequest = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const url = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  
  const token = localStorage.getItem('token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (MOCK_MODE) {
    return mockRequest(url, { ...init, headers });
  }

  const response = await fetch(url, { ...init, headers });
  
  if (response.status === 401) {
    // Optionally trigger a logout event here so the UI can redirect
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  return response;
};

export const apiJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await apiRequest(path, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }
  return payload as T;
};

export const apiBlob = async (path: string, init: RequestInit = {}): Promise<Blob> => {
  const response = await apiRequest(path, init);
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.blob();
};
