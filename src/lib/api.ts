import axios from 'axios';
import { orgPageKeyFromPathname, orgPlanPath } from './orgRoutes';
import {
  clearSessionForPath,
  getActiveOrgUser,
  getTokenForPath,
  isSuperAdminArea,
} from './session';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getTokenForPath(window.location.pathname);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const path = window.location.pathname;
      const hadAuthHeader = Boolean(error.config?.headers?.Authorization);
      if (!hadAuthHeader) {
        return Promise.reject(error);
      }
      if (
        path !== '/login' &&
        path !== '/superadmin/login' &&
        path !== '/create-account' &&
        !path.startsWith('/g/') &&
        !path.startsWith('/h/')
      ) {
        clearSessionForPath(path);
        if (isSuperAdminArea(path) && path !== '/superadmin/login') {
          window.location.assign(`/superadmin/login?next=${encodeURIComponent(path)}`);
        } else {
          window.location.assign('/login');
        }
      }
    }
    if (axios.isAxiosError(error) && error.response?.status === 402) {
      const path = window.location.pathname;
      const pageKey = orgPageKeyFromPathname(path);
      if (
        pageKey !== '/plan' &&
        path !== '/create-account' &&
        path !== '/login' &&
        !isSuperAdminArea(path)
      ) {
        const userId = getActiveOrgUser(path)?.id;
        window.location.assign(userId ? orgPlanPath(userId) : '/login');
      }
    }
    return Promise.reject(error);
  }
);

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiError = {
  success: false;
  message: string;
  details?: string[];
};

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiError | undefined;
    if (payload?.message) return payload.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function publicUploadUrl(filename: string | null | undefined): string | null {
  if (!filename) return null;
  if (/^https?:\/\//i.test(filename) || filename.startsWith('/')) return filename;
  return `/uploads/${filename}`;
}
