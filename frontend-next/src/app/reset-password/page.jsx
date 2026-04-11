'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api/v1';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid or missing reset token. Please request a new link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setStatus('error');
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setStatus('error');
      setErrorMessage('Passwords do not match.');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch(`${BASE_URL}/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password, confirmPassword: password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Reset failed.');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  // ── Success ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="flex w-full max-w-[480px] animate-in fade-in duration-700 flex-col items-center text-center rounded-2xl border border-green-500/20 bg-white/[0.02] p-10">
        <div className="mb-6 text-green-400 text-5xl">✅</div>
        <h2 className="font-serif text-3xl font-bold text-white mb-3">Password Reset!</h2>
        <p className="font-body text-[15px] text-[#999] mb-8 leading-relaxed">
          Your password has been successfully updated. You can now sign in with your new password.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="glow-button group h-11 transition-transform active:scale-95"
          style={{ borderRadius: '999px' }}
        >
          <div className="glow-button-track" style={{ borderRadius: '999px' }}></div>
          <div className="glow-button-inner px-8" style={{ borderRadius: '999px' }}>
            <span className="font-headline flex items-center gap-2 text-xs font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
              Sign In
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        </button>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────
  return (
    <div className="flex w-full max-w-[520px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 flex-col items-center justify-center">
      <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight text-white mb-2 text-center leading-tight">
        New Password
      </h2>

      <p className="font-body text-[16px] text-[#ccc] max-w-[380px] text-center leading-relaxed mb-10">
        Choose a strong password for your account.
      </p>

      <form className="flex w-full px-4 flex-col gap-6" onSubmit={handleSubmit}>
        {status === 'error' && (
          <div className="text-red-400 text-sm font-body text-center bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
            {errorMessage}
          </div>
        )}

        {/* New Password */}
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-bold tracking-[0.2em] text-[#aaa] uppercase">New Password</label>
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-transparent border-b border-[#333] pb-3 pr-8 text-white placeholder-white/50 ${showPassword ? 'tracking-normal' : 'tracking-[0.3em]'} outline-none transition-colors focus:border-white/60 font-body text-lg`}
              required
              minLength={8}
              disabled={!token}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 bottom-3 text-[#777] hover:text-[#aaa] transition-colors focus:outline-none flex items-center justify-center p-1">
              <span className="material-symbols-outlined text-[18px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-bold tracking-[0.2em] text-[#aaa] uppercase">Confirm Password</label>
          <div className="relative w-full">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full bg-transparent border-b border-[#333] pb-3 pr-8 text-white placeholder-white/50 ${showConfirm ? 'tracking-normal' : 'tracking-[0.3em]'} outline-none transition-colors focus:border-white/60 font-body text-lg`}
              required
              disabled={!token}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-0 bottom-3 text-[#777] hover:text-[#aaa] transition-colors focus:outline-none flex items-center justify-center p-1">
              <span className="material-symbols-outlined text-[18px]">
                {showConfirm ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'loading' || !token || !password || !confirmPassword}
          className={`glow-button group h-12 w-full max-w-[340px] mx-auto mt-2 transition-transform active:scale-95 ${status === 'loading' || !token ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ borderRadius: '999px' }}
        >
          <div className="glow-button-track" style={{ borderRadius: '999px' }}></div>
          <div className="glow-button-inner px-8" style={{ borderRadius: '998px' }}>
            <span className="font-headline flex w-full items-center justify-center gap-2 text-[13px] font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
              {status === 'loading' ? 'Resetting…' : 'Reset Password'}
              {status !== 'loading' && <span className="material-symbols-outlined text-base">lock_reset</span>}
            </span>
          </div>
        </button>
      </form>

      <p className="mt-8 text-center text-sm font-body text-[#666]">
        <button onClick={() => router.push('/login')} className="text-white/70 hover:text-white transition-colors font-medium">
          ← Back to Login
        </button>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0">
        <Beams beamWidth={3} beamHeight={30} beamNumber={20} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay"></div>

      <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6">
        <Suspense fallback={<p className="text-white/40 font-body text-sm">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </main>

      <div className="fixed inset-0 z-50 m-4 pointer-events-none border border-white/5"></div>
    </div>
  );
}
