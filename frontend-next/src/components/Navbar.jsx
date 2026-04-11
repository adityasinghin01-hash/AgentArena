'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, clearAuth, getRefreshToken } from '@/lib/auth';
import { logoutUser } from '@/lib/api';

// Skills: @glassmorphism @dark-mode-ui @ui-ux-pro-max
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const user = getUser();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try { await logoutUser(refreshToken); } catch { /* logout even if API fails */ }
    }
    clearAuth();
    router.replace('/login');
  };

  const initial = (user?.name || user?.email || '?')[0].toUpperCase();

  const links = [
    { label: 'Arena', href: '/arena' },
    { label: 'Marketplace', href: '/agents' },
    { label: 'Dashboard', href: '/dashboard' },
  ];

  return (
    <nav className="navbar">
      <a href="/arena" className="navbar-logo">AgentArena</a>

      <div className="navbar-links">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className={`navbar-link${pathname === l.href ? ' active' : ''}`}
            onClick={(e) => { e.preventDefault(); router.push(l.href); }}
          >
            {l.label}
          </a>
        ))}
      </div>

      <div className="navbar-user" ref={dropdownRef} onClick={() => setOpen(!open)}>
        <div className="navbar-avatar">{initial}</div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          {user?.name || user?.email?.split('@')[0] || 'User'}
        </span>

        {open && (
          <div className="navbar-dropdown">
            <button className="navbar-dropdown-item" onClick={() => router.push('/dashboard')}>
              Dashboard
            </button>
            <button className="navbar-dropdown-item" onClick={() => router.push('/settings')}>
              Settings
            </button>
            <button className="navbar-dropdown-item danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
