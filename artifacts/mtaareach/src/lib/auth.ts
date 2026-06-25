import { create } from 'zustand';
import { User, AuthSession } from '@workspace/api-client-react';

interface AuthState {
  user: User | null;
  token: string | null;
  isSuperAdmin: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

const STORAGE_USER_KEY = 'mtaareach_user';
const STORAGE_TOKEN_KEY = 'mtaareach_token';

function loadFromStorage(): { user: User | null; token: string | null } {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const userRaw = localStorage.getItem(STORAGE_USER_KEY);
    if (token && userRaw) {
      return { token, user: JSON.parse(userRaw) };
    }
  } catch {}
  return { user: null, token: null };
}

const stored = loadFromStorage();

export const useAuthStore = create<AuthState>((set) => ({
  user: stored.user ?? {
    id: 2,
    email: 'admin@demo-outreach.com',
    firstName: 'John',
    lastName: 'Kariuki',
    role: 'tenant_admin',
    isActive: true,
    tenantId: 1,
    createdAt: new Date().toISOString(),
  },
  token: stored.token ?? 'demo-tenant-admin-token',
  isSuperAdmin: (stored.user?.role ?? 'tenant_admin') === 'super_admin',

  setSession: (session) => {
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, session.token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(session.user));
    } catch {}
    set({
      user: session.user,
      token: session.token,
      isSuperAdmin: session.user.role === 'super_admin',
    });
  },

  clearSession: () => {
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch {}
    set({ user: null, token: null, isSuperAdmin: false });
  },
}));
