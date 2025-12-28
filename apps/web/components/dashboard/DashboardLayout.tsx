/**
 * DashboardLayout Component
 *
 * Main layout wrapper for dashboard pages with sidebar
 */

'use client';

import React from 'react';
import Sidebar from './Sidebar';

interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  subscription: null;
  telegram: {
    linked: boolean;
  };
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User;
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar user={user} />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
