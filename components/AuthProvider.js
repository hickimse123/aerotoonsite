'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    // Keep a ref so authFetch always has the latest token without stale closures
    const tokenRef = useRef(null);

    const clearSession = useCallback(async (callApi = true) => {
        setUser(null);
        setToken(null);
        tokenRef.current = null;
        if (callApi) {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        }
    }, []);

    // On mount: validate session via server (uses httpOnly cookie automatically)
    useEffect(() => {
        async function restoreSession() {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.user && data.token) {
                        tokenRef.current = data.token;
                        setToken(data.token);
                        setUser(data.user);
                    }
                }
            } catch {
                // Network error — leave session empty
            } finally {
                setLoading(false);
            }
        }
        restoreSession();
    }, []);

    // Periodic re-validation every 30 min to catch bans / role changes
    useEffect(() => {
        if (!token) return;
        let cancelled = false;

        async function validateWithServer() {
            try {
                const res = await fetch('/api/auth/me', {
                    credentials: 'include',
                    headers: { Authorization: `Bearer ${tokenRef.current}` },
                });
                if (cancelled) return;
                if (res.status === 401 || res.status === 403) {
                    clearSession(true);
                    return;
                }
                if (res.ok) {
                    const data = await res.json();
                    if (data.user && !cancelled) setUser(data.user);
                }
            } catch {
                // Network error — keep session, will retry
            }
        }

        const interval = setInterval(validateWithServer, 30 * 60 * 1000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [token, clearSession]);

    const login = useCallback(async (email, password, turnstileToken = '') => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, turnstileToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        tokenRef.current = data.token;
        setToken(data.token);
        setUser(data.user);
        return data;
    }, []);

    const register = useCallback(async (username, email, password, turnstileToken = '') => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, turnstileToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        tokenRef.current = data.token;
        setToken(data.token);
        setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(async () => {
        await clearSession(true);
    }, [clearSession]);

    // authFetch: attaches Bearer token and handles 401 by logging out
    const authFetch = useCallback(async (url, options = {}) => {
        const currentToken = tokenRef.current;
        const res = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
                ...options.headers,
                ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
            },
        });
        if (res.status === 401) {
            await clearSession(true);
        }
        return res;
    }, [clearSession]);

    const updateUser = useCallback((newUser) => {
        setUser(newUser);
    }, []);

    const refreshUser = useCallback(async () => {
        const currentToken = tokenRef.current;
        if (!currentToken) return;
        try {
            const res = await fetch('/api/auth/me', {
                credentials: 'include',
                headers: { Authorization: `Bearer ${currentToken}` },
            });
            if (res.status === 401) {
                await clearSession(true);
                return;
            }
            if (res.ok) {
                const data = await res.json();
                if (data.user) setUser(data.user);
            }
        } catch {}
    }, [clearSession]);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, authFetch, updateUser, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);