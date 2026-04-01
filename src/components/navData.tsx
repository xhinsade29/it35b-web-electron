import React from 'react';

// Dashboard Icon (4 squares)
export const DashboardIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#BDE8F5"/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#BDE8F5" opacity="0.5"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#BDE8F5" opacity="0.5"/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#BDE8F5" opacity="0.5"/>
  </svg>
);

// Activity/Historical Data Icon (clock)
export const ActivityIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="#4988C4" strokeWidth="1.4"/>
    <path d="M8 5v3.5l2.5 1.5" stroke="#4988C4" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

// Reports Icon (line chart)
export const ReportsIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M2 12 Q8 8, 14 12" stroke="#8B4513" strokeWidth="1.5" fill="none"/>
    <circle cx="4" cy="11" r="1" fill="#8B4513"/>
    <circle cx="8" cy="10" r="1" fill="#8B4513"/>
    <circle cx="12" cy="11" r="1" fill="#8B4513"/>
  </svg>
);

// Devices Icon (equipment box)
export const DevicesIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="#4988C4" strokeWidth="1.4"/>
    <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="#4988C4" strokeWidth="1.4"/>
    <circle cx="8" cy="8" r="1.5" fill="#4988C4" opacity="0.6"/>
  </svg>
);

// Users Icon (person with plus)
export const UsersIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.2" stroke="#4988C4" strokeWidth="1.4"/>
    <path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#4988C4" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M12 7v4M10 9h4" stroke="#4988C4" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

// Navigation Item Type
export interface NavItem {
  id: string;
  label: string;
  sublabel: string;
  path: string;
  icon: React.FC;
  badge?: number;
}

// Navigation Section Type
export interface NavSection {
  label: string;
  items: NavItem[];
}

// Main Navigation Groups
export const monitorNavItems: NavItem[] = [
  {
    id: 'overview',
    label: 'Dashboard',
    sublabel: 'River health & alerts',
    path: '/',
    icon: DashboardIcon,
  },
  {
    id: 'history',
    label: 'Activity Logs',
    sublabel: 'Trends & past data',
    path: '/activity',
    icon: ActivityIcon,
  },
  {
    id: 'reports',
    label: 'Reports',
    sublabel: 'Particles analysis',
    path: '/reports',
    icon: ReportsIcon,
  },
  {
    id: 'devices',
    label: 'Devices',
    sublabel: 'Equipment status',
    path: '/devices',
    icon: DevicesIcon,
  },
];

// Admin Navigation Group
export const adminNavItems: NavItem[] = [
  {
    id: 'users',
    label: 'User Management',
    sublabel: 'Roles & access',
    path: '/users',
    icon: UsersIcon,
  },
];
