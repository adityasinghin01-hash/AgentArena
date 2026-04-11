'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getAccessToken, getUser, clearAuth, getRefreshToken } from '@/lib/auth';
import { logoutUser } from '@/lib/api';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

export default function ArenaPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setUser(getUser());
    setLoading(false);
  }, [router]);

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try { await logoutUser(refreshToken); } catch { /* logout even if API fails */ }
    }
    clearAuth();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-white/40 font-body text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0">
        <Beams beamWidth={3} beamHeight={30} beamNumber={20} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay"></div>

      <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6">
        <div className="flex w-full max-w-[600px] animate-in fade-in slide-in-from-bottom-8 duration-1000 flex-col items-center text-center">

          {/* Status Badge */}
          <div className="mb-8 flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-body text-xs text-green-400 tracking-wide">AUTHENTICATED</span>
          </div>

          <h1 className="text-glow font-headline text-5xl font-bold tracking-tight text-white md:text-6xl mb-4">
            Arena
          </h1>

          <p className="font-body text-lg text-white/50 mb-2">
            Demo placeholder — testing auth flow
          </p>

          {/* User Info Card */}
          <div className="mt-8 w-full max-w-[400px] rounded-xl border border-white/10 bg-white/[0.02] p-6 text-left">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#888] uppercase mb-3">Logged in as</p>
            <p className="font-body text-white text-lg font-medium">{user?.email || '—'}</p>
            <div className="mt-4 flex gap-4 text-xs text-white/30">
              <span>ID: {user?.id?.slice(-8) || '—'}</span>
              <span>Role: {user?.role || '—'}</span>
              <span>Verified: {user?.isVerified ? '✓' : '✗'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-10 flex gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-6 py-3 text-sm font-body text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Logout
            </button>

            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-6 py-3 text-sm font-body text-white/50 hover:text-white hover:border-white/20 transition-all"
            >
              <span className="material-symbols-outlined text-base">home</span>
              Home
            </button>
          </div>

        </div>
      </main>

      <div className="fixed inset-0 z-50 m-4 pointer-events-none border border-white/5"></div>
    </div>
  );
}
