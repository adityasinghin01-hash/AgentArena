'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ReCAPTCHA from 'react-google-recaptcha';
import { signupUser, loginUser, checkVerificationStatus, updateRole } from '@/lib/api';
import { saveTokens, saveUser } from '@/lib/auth';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [dots, setDots] = useState('.');
  const recaptchaRef = useRef(null);
  const pollingRef = useRef(null);

  // ── Verification polling after signup ───────────────────
  // ── Auto-login after verification ────────────────────────
  const autoLogin = async () => {
    try {
      const data = await checkVerificationStatus(email);
      if (data.isVerified) {
        try {
          const loginData = await loginUser({ email, password, rememberMe: false });
          saveTokens(loginData.accessToken, loginData.refreshToken);
          let finalUser = loginData.user;
          const pendingRole = sessionStorage.getItem('selectedRole');
          if (pendingRole && ['user', 'deployer'].includes(pendingRole) && pendingRole !== finalUser.role) {
            try {
              const rd = await updateRole(pendingRole);
              finalUser.role = rd.role;
              sessionStorage.removeItem('selectedRole');
            } catch (_e) { /* silent */ }
          }
          saveUser(finalUser);
          router.push(finalUser.role === 'deployer' ? '/deployer' : '/arena');
        } catch {
          router.push(`/login?verified=true&email=${encodeURIComponent(email)}`);
        }
        return true; // verified
      }
    } catch {
      // polling error — keep trying
    }
    return false;
  };

  useEffect(() => {
    if (!success) return;

    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'));
    }, 500);

    // Poll every 3s
    pollingRef.current = setInterval(() => autoLogin(), 3000);

    // Immediately check when user returns to tab (browser throttles intervals in background)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') autoLogin();
    };
    const handleFocus = () => autoLogin();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(pollingRef.current);
      clearInterval(dotsInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [success, email, password, router]);



  // ── Form submit ─────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const recaptchaToken = recaptchaRef.current?.getValue() || 'dev-bypass';

    setLoading(true);
    try {
      const data = await signupUser({ name, email, password, recaptchaToken });
      if (data.accessToken) saveTokens(data.accessToken, data.refreshToken);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
      recaptchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  // ── Success: verification waiting screen ────────────────
  if (success) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-surface">
        <div className="fixed inset-0 z-0">
          <Beams beamWidth={3} beamHeight={30} beamNumber={20} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
        </div>
        <div className="noise-overlay"></div>
        <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6">
          <div className="flex w-full max-w-[480px] animate-in fade-in duration-700 flex-col items-center text-center rounded-2xl border border-green-500/20 bg-white/[0.02] p-10">
            <div className="mb-6 text-green-400 text-5xl">✓</div>
            <h2 className="font-serif text-3xl font-bold text-white mb-3">Account Created!</h2>
            <p className="font-body text-[15px] text-[#999] mb-2 leading-relaxed">
              We sent a verification email to <strong className="text-white">{email}</strong>.
            </p>
            <p className="font-body text-[14px] text-[#666] mb-6 leading-relaxed">
              Click the link in the email — this page will automatically take you to the Arena once verified.
            </p>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-400 rounded-full animate-spin" />
              <span className="font-body text-sm text-[#888]">Waiting for verification{dots}</span>
            </div>
          </div>
        </main>
        <div className="fixed inset-0 z-50 m-4 pointer-events-none border border-white/5"></div>
      </div>
    );
  }

  // ── Signup form ─────────────────────────────────────────
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0">
        <Beams beamWidth={3} beamHeight={30} beamNumber={20} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay"></div>

      {/* Sign In button (top right) */}
      <div className="fixed top-8 right-8 z-50">
        <button onClick={() => router.push('/login')} className="glow-button group h-10 transition-transform active:scale-95" style={{ borderRadius: '999px' }}>
          <div className="glow-button-track" style={{ borderRadius: '999px' }}></div>
          <div className="glow-button-inner px-8" style={{ borderRadius: '999px' }}>
            <span className="font-headline text-xs font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
              Sign In
            </span>
          </div>
        </button>
      </div>

      {/* Back button */}
      <button onClick={() => router.back()} className="fixed top-8 left-8 z-50 flex items-center gap-1 text-white/40 hover:text-white transition-colors text-sm font-body">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back
      </button>

      <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6 py-20">
        <div className="flex w-full max-w-[520px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 flex-col items-center justify-center">
          <h2 className="font-serif text-6xl md:text-7xl font-bold tracking-tight text-white mb-2 text-center leading-tight w-full whitespace-nowrap">
            Join the Arena
          </h2>

          <p className="font-body text-[16px] text-[#ccc] max-w-[380px] text-center leading-relaxed mb-8">
            Create your account and start competing with AI agents.
          </p>

          <form className="flex w-full px-4 flex-col gap-5" onSubmit={handleSignup}>
            {error && (
              <div className="text-red-400 text-sm font-body text-center bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold tracking-[0.2em] text-[#aaa] uppercase">Full Name</label>
              <input
                type="text"
                placeholder="Aditya Singh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-[#333] pb-3 text-white placeholder-white/50 outline-none transition-colors focus:border-white/60 font-body text-[15px]"
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold tracking-[0.2em] text-[#aaa] uppercase">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-[#333] pb-3 text-white placeholder-white/50 outline-none transition-colors focus:border-white/60 font-body text-[15px]"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold tracking-[0.2em] text-[#aaa] uppercase">Password</label>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-transparent border-b border-[#333] pb-3 pr-8 text-white placeholder-white/50 ${showPassword ? 'tracking-normal' : 'tracking-[0.3em]'} outline-none transition-colors focus:border-white/60 font-body text-lg`}
                  required
                  minLength={8}
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
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-0 bottom-3 text-[#777] hover:text-[#aaa] transition-colors focus:outline-none flex items-center justify-center p-1">
                  <span className="material-symbols-outlined text-[18px]">
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* reCAPTCHA */}
            <div className="flex justify-center mt-1">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6Lfv25wsAAAAAD9Dtmb4Mh6GkhORHT3IsKX8mw_2'}
                theme="dark"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !name || !email || !password || !confirmPassword}
              className={`glow-button group h-12 w-full max-w-[340px] mx-auto mt-2 transition-transform active:scale-95 ${loading || !name || !email || !password || !confirmPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ borderRadius: '999px' }}
            >
              <div className="glow-button-track" style={{ borderRadius: '999px' }}></div>
              <div className="glow-button-inner px-8" style={{ borderRadius: '998px' }}>
                <span className="font-headline flex w-full items-center justify-center gap-2 text-[13px] font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
                  {loading ? 'Creating…' : 'Create Account'}
                  {!loading && <span className="material-symbols-outlined text-base">north_east</span>}
                </span>
              </div>
            </button>
          </form>



        </div>
      </main>

      <div className="fixed inset-0 z-50 m-4 pointer-events-none border border-white/5"></div>
    </div>
  );
}
