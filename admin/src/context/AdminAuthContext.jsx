import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { adminClient, ADMIN_SESSION_KEY, ADMIN_SESSION_META_KEY } from '../api/http';

const AdminAuthContext = createContext(null);
export const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function readSessionMeta() {
  const raw = localStorage.getItem(ADMIN_SESSION_META_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    localStorage.removeItem(ADMIN_SESSION_META_KEY);
    return null;
  }
}

function writeSessionMeta(meta) {
  localStorage.setItem(ADMIN_SESSION_META_KEY, JSON.stringify(meta));
}

function buildSessionMeta() {
  const now = Date.now();

  return {
    issuedAt: now,
    lastActivityAt: now,
    expiresAt: now + ADMIN_SESSION_MAX_AGE_MS
  };
}

function isSessionExpired(meta) {
  if (!meta) {
    return true;
  }

  const now = Date.now();
  const lastActivityAt = Number(meta.lastActivityAt || meta.issuedAt || 0);
  const expiresAt = Number(meta.expiresAt || 0);

  return !expiresAt || now >= expiresAt || now - lastActivityAt >= ADMIN_IDLE_TIMEOUT_MS;
}

export function AdminAuthProvider({ children }) {
  const [initialized, setInitialized] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  const clearSession = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_META_KEY);
    setAdminUser(null);
    setInitialized(true);
  };

  const touchSession = () => {
    const token = localStorage.getItem(ADMIN_SESSION_KEY);
    const meta = readSessionMeta();

    if (!token) {
      return;
    }

    if (!meta) {
      writeSessionMeta(buildSessionMeta());
      return;
    }

    const now = Date.now();

    if (now - Number(meta.lastActivityAt || 0) < 15_000) {
      return;
    }

    writeSessionMeta({
      ...meta,
      lastActivityAt: now
    });
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem(ADMIN_SESSION_KEY);
    const meta = readSessionMeta();

    if (!token) {
      clearSession();
      return;
    }

    const sessionMeta = meta || buildSessionMeta();

    if (!meta) {
      writeSessionMeta(sessionMeta);
    }

    if (isSessionExpired(sessionMeta)) {
      clearSession();
      return;
    }

    try {
      writeSessionMeta({
        ...sessionMeta,
        lastActivityAt: Date.now()
      });
      const { data } = await adminClient.me();
      setAdminUser(data.adminUser);
    } catch (_error) {
      clearSession();
    } finally {
      setInitialized(true);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    const handleStorageSync = (event) => {
      if (event.key && ![ADMIN_SESSION_KEY, ADMIN_SESSION_META_KEY].includes(event.key)) {
        return;
      }

      const token = localStorage.getItem(ADMIN_SESSION_KEY);
      const meta = readSessionMeta();

      if (!token) {
        clearSession();
        return;
      }

      const sessionMeta = meta || buildSessionMeta();

      if (!meta) {
        writeSessionMeta(sessionMeta);
      }

      if (isSessionExpired(sessionMeta)) {
        clearSession();
        return;
      }

      refreshProfile();
    };

    const handleSessionExpired = () => {
      clearSession();
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('litflow-admin-session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('litflow-admin-session-expired', handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    if (!adminUser) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        touchSession();
      }
    };

    const handleActivity = () => {
      touchSession();
    };

    const intervalId = window.setInterval(() => {
      const token = localStorage.getItem(ADMIN_SESSION_KEY);
      const meta = readSessionMeta();

      if (token && isSessionExpired(meta)) {
        clearSession();
      }
    }, 60_000);

    window.addEventListener('pointerdown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('focus', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('focus', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [adminUser]);

  const login = async (payload) => {
    const { data } = await adminClient.login(payload);
    localStorage.setItem(ADMIN_SESSION_KEY, data.token);
    writeSessionMeta(buildSessionMeta());
    setAdminUser(data.adminUser);
    setInitialized(true);
    return data;
  };

  const logout = () => {
    clearSession();
  };

  const value = useMemo(
    () => ({
      initialized,
      adminUser,
      login,
      logout,
      refreshProfile
    }),
    [initialized, adminUser]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider.');
  }

  return context;
}
