/**
 * Sidebar Component
 *
 * Navigation sidebar for dashboard
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  email: string;
  role: string;
}

interface SidebarProps {
  user: User;
}

export default function Sidebar({ user }: SidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      await fetch(`${apiBaseUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <aside className="w-60 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col">
      {/* User Info */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <h2 className="font-semibold text-[var(--color-text-main)]">{user.email}</h2>
        <span className="text-sm text-gray-500">{user.role}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <Link
              href="/dashboard"
              className="block px-3 py-2 rounded hover:bg-gray-100 transition-colors"
            >
              Início
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/subscription"
              className="block px-3 py-2 rounded hover:bg-gray-100 transition-colors"
            >
              Assinatura
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/telegram"
              className="block px-3 py-2 rounded hover:bg-gray-100 transition-colors"
            >
              Telegram
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/branding"
              className="block px-3 py-2 rounded hover:bg-gray-100 transition-colors"
            >
              Branding
            </Link>
          </li>
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
