
import {
    LayoutDashboard,
    FileText,
    BookOpen,
    Settings,
    Users,
    BarChart3,
    Mail
} from 'lucide-react';

export const sidebarItems = [
    {
        title: 'Home',
        href: '/',
        icon: LayoutDashboard, // Reuse icon or change to HomeIcon if available
    },
    {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
    },
    {
        title: 'Articles',
        href: '/admin/articles',
        icon: FileText,
    },
    {
        title: 'Papers',
        href: '/admin/papers',
        icon: BookOpen,
        roles: ['ADMIN'],
    },
    {
        title: 'Users',
        href: '/admin/users',
        icon: Users,
        roles: ['ADMIN'], // Already implied but good to be explicit
    },
    {
        title: 'Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
        roles: ['ADMIN'],
    },
    {
        title: 'Settings',
        href: '/admin/settings',
        icon: Settings,
        roles: ['ADMIN'],
    },
    {
        title: 'Newsletter',
        href: '/admin/subscribers',
        icon: Mail,
        roles: ['ADMIN'],
    },
    {
        title: 'Edit About',
        href: '/admin/about-editor',
        icon: FileText,
        roles: ['ADMIN'],
    },
];
