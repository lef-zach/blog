'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

const AUTO_LOGOUT_TIME = 2 * 60 * 60 * 1000; // 2 hours

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const initialized = useRef(false);

    const [isLoading, setIsLoading] = useState(true);

    // 1. Silent Refresh on Mount (Restore Session from Cookie)
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const restoreSession = async () => {
            try {
                // Try to get a fresh access token from cookie
                await apiClient.refreshAccessToken();
                // Session restored via cookie
            } catch (err) {
                // No session. That's fine.
                // No active session
            } finally {
                // Whether we succeeded or failed, we are done checking.
                setIsLoading(false);
            }
        };

        restoreSession();
    }, []);

    // 2. Auto Logout & Activity Tracking
    useEffect(() => {
        if (isLoading) return; // Wait for initialization

        let activityTimer: NodeJS.Timeout;

        const logout = () => {
            // ... existing logout logic
            if (apiClient.isLoggedIn()) {
                apiClient.logout();
                router.push('/');
            }
        };

        const resetTimer = () => {
            if (!apiClient.isLoggedIn()) return;

            const lastActivity = localStorage.getItem('lastActivity');
            const now = Date.now();

            if (lastActivity && now - parseInt(lastActivity) > AUTO_LOGOUT_TIME) {
                logout();
                return;
            }

            localStorage.setItem('lastActivity', now.toString());
            if (activityTimer) clearTimeout(activityTimer);
            activityTimer = setTimeout(logout, AUTO_LOGOUT_TIME);
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        resetTimer();

        return () => {
            if (activityTimer) clearTimeout(activityTimer);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [pathname, router, isLoading]);

    // 3. Clear storage on login page visit (Cleanup)
    useEffect(() => {
        if (pathname === '/login') {
            localStorage.removeItem('lastActivity');
        }
    }, [pathname]);

    const isProtectedRoute = pathname.startsWith('/admin');

    if (isLoading && isProtectedRoute) {
        return null;
    }

    return <>{children}</>;
}
