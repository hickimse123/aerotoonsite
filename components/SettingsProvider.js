'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SettingsContext = createContext(null);

async function isAdminSession() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return false;
        const data = await res.json();
        return data?.user?.role === 'admin';
    } catch {
        return false;
    }
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({});
    const [loaded, setLoaded] = useState(false);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.settings) {
                    setSettings(data.settings);
                    // Check maintenance mode on client-side navigation
                    if (data.settings.maintenance_mode === '1') {
                        const isBypass = window.location.pathname === '/login'
                            || window.location.pathname === '/maintenance'
                            || window.location.pathname.startsWith('/api/');
                        if (!isBypass) {
                            // Admin kullanıcılar bakım modunda da siteye erişebilir
                            const admin = await isAdminSession();
                            if (!admin) {
                                const currentPath = window.location.pathname;
                                if (currentPath !== '/login' && currentPath !== '/maintenance' && !currentPath.startsWith('/api/')) {
                                    window.location.href = '/maintenance';
                                }
                            }
                        }
                    }
                }
            }
        } catch {
            // Network error — keep previous settings
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        // Periodic check for maintenance mode (every 30 seconds)
        const interval = setInterval(fetchSettings, 30000);
        return () => clearInterval(interval);
    }, [fetchSettings]);

    return (
        <SettingsContext.Provider value={{ settings, loaded, refetch: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsContext);