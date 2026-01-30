"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiClient, User } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { sidebarItems } from '@/config/sidebar';
import { cn } from '@/lib/utils';

export function GlobalSidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const checkAuth = async () => {
            // Optimistic load
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) setUser(JSON.parse(storedUser));
            } catch (e) { }

            try {
                // Verify with API
                const response = await apiClient.getMe();

                // Handle response where data IS the user (has role)
                if (response && response.data) {
                    if ((response.data as any).role) {
                        setUser(response.data as any);
                    } else if ((response.data as any).user) {
                        setUser((response.data as any).user);
                    }
                } else if ((response as any).user) {
                    setUser((response as any).user);
                }

            } catch (err) {
                // Not authenticated

            }
        };
        checkAuth();
    }, []);

    if (!mounted) return null;
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
    if (!hasToken && !user) return null;

    // Check if user has ANY role that matches at least one sidebar item?
    // For now, if logged in, show sidebar. Items will filter themselves.


    return (
        <aside className="hidden border-r bg-muted/40 md:block md:w-[220px] lg:w-[240px] shrink-0">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex-1">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4 py-4">
                        {sidebarItems.map((item, index) => {
                            // Safe access to roles
                            const itemRoles = (item as any).roles;

                            // If user is not loaded yet but we have token, hide protected items?
                            // Or better: valid users usually load fast. 
                            // If user is null here, it means we have token but getMe hasn't finished.
                            // We should probably show nothing or skeletons. 
                            // But to avoid "flashing", let's show items without roles, or wait.
                            if (!user) return null;

                            if (itemRoles && !itemRoles.includes(user.role)) {
                                return null;
                            }

                            const Icon = item.icon;
                            return (
                                <Link
                                    key={index}
                                    href={item.href}
                                >
                                    <span
                                        className={cn(
                                            "group flex items-center rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground mb-1",
                                            pathname === item.href ? "bg-accent text-accent-foreground" : "transparent"
                                        )}
                                    >
                                        <Icon className="mr-2 h-4 w-4" />
                                        <span>{item.title}</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </aside>
    );
}
