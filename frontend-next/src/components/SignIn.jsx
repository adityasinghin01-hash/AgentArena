'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReCAPTCHA from 'react-google-recaptcha';
import { loginUser, googleLogin, updateRole } from '@/lib/api';
import { saveTokens, saveUser } from '@/lib/auth';

const SignIn = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const recaptchaRef = useRef(null);

  // Sync role from sessionStorage (set during onboarding) to backend
  const syncRole = async (user) => {
    const pendingRole = typeof window !== 'undefined' ? sessionStorage.getItem('selectedRole') : null;
    if (pendingRole && ['user', 'deployer'].includes(pendingRole) && pendingRole !== user.role) {
      try {
        const data = await updateRole(pendingRole);
        user.role = data.role;
        sessionStorage.removeItem('selectedRole');
      } catch (_err) { /* silent — role stays default */ }
    }
    return user;
  };

  // ── Google Sign-In setup ────────────────────────────────
  const handleGoogleResponse = useCallback(async (response) => {
    setError(null);
    setLoading(true);
    try {
      const data = await googleLogin(response.credential);
      saveTokens(data.accessToken, data.refreshToken);
      const finalUser = await syncRole(data.user);
      saveUser(finalUser);
      router.push(finalUser.role === 'deployer' ? '/deployer' : '/arena');
    } catch (err) {
      setError(err.message || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });
      const btnEl = document.getElementById('google-signin-btn');
      if (btnEl) {
        window.google?.accounts.id.renderButton(btnEl, {
          theme: 'filled_black',
          size: 'large',
          width: 340,
          text: 'signin_with',
          shape: 'pill',
        });
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [handleGoogleResponse]);

  // ── Email/Password login ────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = recaptchaRef.current?.getValue() || 'dev-bypass';
      const data = await loginUser({ email, password, rememberMe: false, recaptchaToken });
      saveTokens(data.accessToken, data.refreshToken);
      const finalUser = await syncRole(data.user);
      saveUser(finalUser);
      router.push(finalUser.role === 'deployer' ? '/deployer' : '/arena');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      recaptchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed top-8 right-8 z-50">
        <button onClick={() => router.push('/signup')} className="glow-button group h-10 transition-transform active:scale-95" style={{ borderRadius: '999px' }}>
          <div className="glow-button-track" style={{ borderRadius: '999px' }}></div>
          <div className="glow-button-inner px-8" style={{ borderRadius: '999px' }}>
            <span className="font-headline text-xs font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
              Sign Up
            </span>
          </div>
        </button>
      </div>

      <div className="flex w-full max-w-[520px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 flex-col items-center justify-center">
        <h2 className="font-serif text-6xl md:text-7xl font-bold tracking-tight text-white mb-2 text-center leading-tight w-full whitespace-nowrap">
          Welcome Back
        </h2>
        
        <p className="font-body text-[16px] text-[#ccc] max-w-[380px] text-center leading-relaxed mb-8">
          Access the curator's intelligence network and monitor your automated agents.
        </p>

        <form className="flex w-full px-4 flex-col gap-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-400 text-sm font-body text-center bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold tracking-[0.2em] text-[#aaa] uppercase">
              Email Address
            </label>
            <input
              type="email"
              placeholder="curator@agentarena.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-[#333] pb-3 text-white placeholder-white/50 outline-none transition-colors focus:border-white/60 font-body text-[15px]"
              required
            />
          </div>
          
          <div className="flex flex-col gap-3 relative">
            <label className="text-[10px] font-bold tracking-[0.2em] text-[#aaa] uppercase">
              Password
            </label>
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-transparent border-b border-[#333] pb-3 pr-8 text-white placeholder-white/50 ${showPassword ? 'tracking-normal' : 'tracking-[0.3em]'} outline-none transition-colors focus:border-white/60 font-body text-lg`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-3 text-[#777] hover:text-[#aaa] transition-colors focus:outline-none flex items-center justify-center p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border border-[#444] bg-[#111] group-hover:border-[#666] transition-colors focus-within:border-white">
                <input type="checkbox" className="peer opacity-0 absolute inset-0 cursor-pointer" />
                <svg className="w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[13px] font-body text-[#ccc] group-hover:text-white transition-colors">Remember me</span>
            </label>
            
            <button type="button" onClick={() => router.push('/forgot-password')} className="text-[13px] font-body text-[#ccc] hover:text-white transition-opacity font-medium">
              Forgot password?
            </button>
          </div>

          {/* reCAPTCHA */}
          <div className="flex justify-center mt-1">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
              theme="dark"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className={`glow-button group h-12 w-full max-w-[340px] mx-auto mt-2 transition-transform active:scale-95 ${loading || !email || !password ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ borderRadius: '999px' }}
          >
            <div className="glow-button-track" style={{ borderRadius: '999px' }}></div>
            <div className="glow-button-inner px-8" style={{ borderRadius: '998px' }}>
              <span className="font-headline flex w-full items-center justify-center gap-2 text-[13px] font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
                {loading ? 'Signing in…' : 'Sign In'}
                {!loading && <span className="material-symbols-outlined text-base">north_east</span>}
              </span>
            </div>
          </button>
        </form>

        <div className="flex flex-col w-full items-center mt-8">
          <div className="flex items-center w-full mb-8">
            <div className="flex-1 h-px bg-[#252525]"></div>
            <span className="px-4 text-[10px] font-bold tracking-[0.2em] text-[#888] uppercase">OR</span>
            <div className="flex-1 h-px bg-[#252525]"></div>
          </div>

          {/* Google Sign-In — rendered by GSI script */}
          <div id="google-signin-btn" className="flex justify-center" />
        </div>

      </div>
    </>
  );
};

export default SignIn;
