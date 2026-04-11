'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { forgotPassword } from '@/lib/api';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.includes('@')) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    try {
      await forgotPassword({ email });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  // ── Success state ──────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-surface">
        <div className="fixed inset-0 z-0">
          <Beams beamWidth={3} beamHeight={30} beamNumber={20} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
        </div>
        <div className="noise-overlay"></div>

        <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6">
          <div className="flex w-full max-w-[480px] animate-in fade-in duration-700 flex-col items-center text-center rounded-2xl border border-green-500/20 bg-white/[0.02] p-10">
            <div className="mb-6 text-green-400 text-5xl">✉️</div>
            <h2 className="font-serif text-3xl font-bold text-white mb-3">Check Your Email</h2>
            <p className="font-body text-[15px] text-[#999] mb-2 leading-relaxed">
              If an account exists for <strong className="text-white">{email}</strong>, we&apos;ve sent a password reset link.
            </p>
            <p className="font-body text-[13px] text-[#666] mb-8 leading-relaxed">
              Didn&apos;t receive it? Check your spam folder or try again.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/login')}
                className="glow-button group h-11 transition-transform active:scale-95"
                style={{ borderRadius: '999px' }}
              >
                <div className="glow-button-track" style={{ borderRadius: '999px' }}></div>
                <div className="glow-button-inner px-8" style={{ borderRadius: '999px' }}>
                  <span className="font-headline flex items-center gap-2 text-xs font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Back to Login
                  </span>
                </div>
              </button>

              <button
                onClick={() => { setStatus('idle'); setEmail(''); }}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-6 py-3 text-xs font-body text-white/50 hover:text-white hover:border-white/20 transition-all"
              >
                Try again
              </button>
            </div>
          </div>
        </main>

        <div className="fixed inset-0 z-50 m-4 pointer-events-none border border-white/5"></div>
      </div>
    );
  }

  // ── Form state ─────────────────────────────────────────
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0">
        <Beams beamWidth={3} beamHeight={30} beamNumber={20} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay"></div>

      {/* Back button */}
      <button
        onClick={() => router.push('/login')}
        className="fixed top-8 left-8 z-50 flex items-center gap-1 text-white/40 hover:text-white transition-colors text-sm font-body"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back to Login
      </button>

      <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6">
        <div className="flex w-full max-w-[520px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 flex-col items-center justify-center">

          <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight text-white mb-2 text-center leading-tight">
            Reset Password
          </h2>

          <p className="font-body text-[16px] text-[#ccc] max-w-[380px] text-center leading-relaxed mb-10">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          <form className="flex w-full px-4 flex-col gap-6" onSubmit={handleSubmit}>
            {status === 'error' && (
              <div className="text-red-400 text-sm font-body text-center bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                {errorMessage}
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold tracking-[0.2em] text-[#aaa] uppercase">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-[#333] pb-3 text-white placeholder-white/50 outline-none transition-colors focus:border-white/60 font-body text-[15px]"
                required
                autoFocus
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className={`glow-button group h-12 w-full max-w-[340px] mx-auto mt-2 transition-transform active:scale-95 ${status === 'loading' || !email ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ borderRadius: '999px' }}
            >
              <div className="glow-button-track" style={{ borderRadius: '999px' }}></div>
              <div className="glow-button-inner px-8" style={{ borderRadius: '998px' }}>
                <span className="font-headline flex w-full items-center justify-center gap-2 text-[13px] font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
                  {status === 'loading' ? (
                    'Sending…'
                  ) : (
                    <>
                      Send Reset Link
                      <span className="material-symbols-outlined text-base">mail</span>
                    </>
                  )}
                </span>
              </div>
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-8 text-center text-sm font-body text-[#666]">
            Remember your password?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-white/70 hover:text-white transition-colors font-medium"
            >
              Sign in
            </button>
          </p>

        </div>
      </main>

      <div className="fixed inset-0 z-50 m-4 pointer-events-none border border-white/5"></div>
    </div>
  );
}
