import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useSignIn, useSignUp, useAuth } from '@clerk/clerk-react';
import { Zap, ArrowRight, Mail, User, Lock } from 'lucide-react';
import { restoreGuestDataIfNeeded } from '../store/useStore';
import HexagonBackground from './HexagonBackground';
import ThemeToggle from './ThemeToggle';

const LAST_LOGIN_EMAIL_KEY = 'strtabin-last-email';

export default function AuthPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const modeParam = searchParams.get('mode');
    const { isSignedIn, isLoaded: authLoaded } = useAuth();
    const { signIn, isLoaded: signInLoaded, setActive: setSignInActive } = useSignIn();
    const { signUp, isLoaded: signUpLoaded, setActive: setSignUpActive } = useSignUp();
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [authStep, setAuthStep] = useState<'email' | 'code'>('email');
    const [authMode, setAuthMode] = useState<'email' | 'username'>(modeParam === 'email' ? 'email' : 'username');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUpFlow, setIsSignUpFlow] = useState(false);

    const isLoaded = signInLoaded && signUpLoaded;

    useEffect(() => {
        if (authLoaded && isSignedIn) {
            navigate('/dashboard', { replace: true });
        }
    }, [authLoaded, isSignedIn, navigate]);

    useEffect(() => {
        const lastEmail = localStorage.getItem(LAST_LOGIN_EMAIL_KEY);
        if (lastEmail && authMode === 'email' && authStep === 'email') {
            setEmail(lastEmail);
        }
    }, [authMode, authStep]);

    /** Prefill from landing page “Get started” form */
    useEffect(() => {
        const raw = sessionStorage.getItem('stratabin-auth-prefill');
        if (!raw) return;
        try {
            const p = JSON.parse(raw) as { email?: string; username?: string; password?: string };
            sessionStorage.removeItem('stratabin-auth-prefill');
            if (p.email) setEmail(p.email);
            if (p.username) setUsername(p.username);
            if (p.password) setPassword(p.password);
            if (p.username?.trim() && p.password) {
                setAuthMode('username');
            }
        } catch {
            sessionStorage.removeItem('stratabin-auth-prefill');
        }
    }, []);

    const sendCodeToEmail = async (emailToUse: string) => {
        if (!isLoaded || !signIn || !signUp) return;
        setLoading(true);
        setAuthError(null);
        setEmail(emailToUse);
        try {
            const result = await signIn.create({ identifier: emailToUse, strategy: 'email_code' });
            if (result.status === 'needs_first_factor') {
                setIsSignUpFlow(false);
                setAuthStep('code');
            }
        } catch (err: unknown) {
            const clerkErr = err as { errors?: Array<{ code?: string; longMessage?: string }> };
            const errCode = clerkErr?.errors?.[0]?.code;
            if (errCode === 'form_identifier_not_found') {
                try {
                    await signUp.create({ emailAddress: emailToUse });
                    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
                    setIsSignUpFlow(true);
                    setAuthStep('code');
                } catch (signUpErr: unknown) {
                    const signUpClerkErr = signUpErr as { errors?: Array<{ longMessage?: string }> };
                    setAuthError(signUpClerkErr?.errors?.[0]?.longMessage || 'Sign-up failed. Please try again.');
                }
            } else {
                setAuthError(clerkErr?.errors?.[0]?.longMessage || 'Sign-in failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendCodeToEmail(email);
    };

    const handleUsernamePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !signIn) return;
        setLoading(true);
        setAuthError(null);
        try {
            const result = await signIn.create({ identifier: username.trim(), strategy: 'password', password });
            if (result.status === 'complete' && result.createdSessionId) {
                await setSignInActive({ session: result.createdSessionId });
                navigate('/dashboard', { replace: true });
            } else {
                setAuthError('Sign-in could not be completed. Please try again.');
            }
        } catch (err: unknown) {
            const clerkErr = err as { errors?: Array<{ longMessage?: string; code?: string }> };
            const errCode = clerkErr?.errors?.[0]?.code;
            const msg = clerkErr?.errors?.[0]?.longMessage || 'Invalid username or password.';
            if (errCode === 'form_identifier_not_found') {
                setAuthError('No account with this username. Sign up with email first.');
            } else if (msg.toLowerCase().includes('password') && msg.toLowerCase().includes('strategy')) {
                setAuthError('Password sign-in not available. Use email sign-in above, or enable Username + Password in Clerk Dashboard → User & Authentication.');
            } else {
                setAuthError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !signIn || !signUp) return;
        setLoading(true);
        setAuthError(null);
        try {
            if (isSignUpFlow) {
                const result = await signUp.attemptEmailAddressVerification({ code });
                if (result.status === 'complete') {
                    try { localStorage.setItem(LAST_LOGIN_EMAIL_KEY, email); } catch { /* ignore */ }
                    await setSignUpActive({ session: result.createdSessionId });
                    if (restoreGuestDataIfNeeded()) {
                        window.location.href = '/dashboard';
                        return;
                    }
                    navigate('/dashboard', { replace: true });
                }
            } else {
                const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
                if (result.status === 'complete') {
                    try { localStorage.setItem(LAST_LOGIN_EMAIL_KEY, email); } catch { /* ignore */ }
                    await setSignInActive({ session: result.createdSessionId });
                    if (restoreGuestDataIfNeeded()) {
                        window.location.href = '/dashboard';
                        return;
                    }
                    navigate('/dashboard', { replace: true });
                }
            }
        } catch (err: unknown) {
            const clerkErr = err as { errors?: Array<{ longMessage?: string }> };
            setAuthError(clerkErr?.errors?.[0]?.longMessage || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen theme-page font-sans flex items-center justify-center">
                <HexagonBackground />
                <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                    <span className="text-sm font-bold text-white/40 uppercase tracking-widest">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen theme-page font-sans selection:bg-white/20 relative overflow-x-hidden">
            <HexagonBackground />
            <header className="fixed top-0 w-full z-50 border-b border-[var(--border)] theme-panel backdrop-blur-2xl">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg border-2 border-white/10">
                            <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xl md:text-2xl font-black tracking-tighter text-white">Stratabin<span className="text-primary">.</span></span>
                    </Link>
                    <nav className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link to="/" className="text-sm font-bold text-white/35 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/5">
                            Back to Home
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="pt-32 md:pt-40 pb-16 px-4 md:px-6 flex flex-col items-center justify-center min-h-screen">
                <div className="w-full max-w-md mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white mb-2">
                            Sign in or create an account
                        </h1>
                        <p className="text-white/40 text-sm">
                            Sign in with username and password, or use email for a one-time code
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-4 w-full">
                        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 backdrop-blur-sm">
                            <div className="flex gap-2 p-1 bg-white/[0.04] rounded-xl border border-white/10 w-full mb-4">
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode('email'); setAuthError(null); setAuthStep('email'); }}
                                    className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${authMode === 'email' ? 'bg-primary text-black' : 'text-white/50 hover:text-white/80'}`}
                                >
                                    <Mail size={14} className="inline mr-1.5 -mt-0.5" />
                                    Email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode('username'); setAuthError(null); }}
                                    className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${authMode === 'username' ? 'bg-primary text-black' : 'text-white/50 hover:text-white/80'}`}
                                >
                                    <User size={14} className="inline mr-1.5 -mt-0.5" />
                                    Username
                                </button>
                            </div>

                        {authMode === 'email' ? (
                            authStep === 'email' ? (
                                <form onSubmit={handleEmailSubmit} className="flex flex-col items-center gap-3 w-full">
                                    <div className="relative w-full">
                                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            className="w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-white placeholder-white/25 text-sm font-medium focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || !email}
                                        className="group w-full flex items-center justify-center gap-3 px-7 py-3.5 bg-white text-black font-black rounded-2xl hover:bg-primary hover:text-white transition-all shadow-[0_4px_30px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50 text-sm"
                                    >
                                        <Zap size={16} fill="currentColor" />
                                        {loading ? 'Sending code...' : 'Get Started Free'}
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleCodeSubmit} className="flex flex-col items-center gap-3 w-full">
                                    <p className="text-white/40 text-xs font-medium">
                                        We sent a 6-digit code to <span className="text-white/70 font-bold">{email}</span>
                                    </p>
                                    <input
                                        type="text"
                                        required
                                        value={code}
                                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="Enter 6-digit code"
                                        maxLength={6}
                                        className="w-full text-center tracking-[0.5em] px-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-white placeholder-white/25 text-lg font-black focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || code.length < 6}
                                        className="group w-full flex items-center justify-center gap-3 px-7 py-3.5 bg-primary text-black font-black rounded-2xl hover:bg-white transition-all shadow-[0_4px_30px_rgba(255,119,86,0.3)] active:scale-95 disabled:opacity-50 text-sm"
                                    >
                                        {loading ? 'Verifying...' : 'Verify & Continue'}
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setAuthStep('email'); setCode(''); setAuthError(null); }}
                                        className="text-white/25 text-xs hover:text-white/50 transition-colors"
                                    >
                                        Use a different email
                                    </button>
                                </form>
                            )
                        ) : (
                            <form onSubmit={handleUsernamePasswordSubmit} className="flex flex-col items-center gap-3 w-full">
                                <div className="relative w-full">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={e => setUsername(e.target.value.trim())}
                                        placeholder="Username"
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-white placeholder-white/25 text-sm font-medium focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all"
                                    />
                                </div>
                                <div className="relative w-full">
                                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Password"
                                        minLength={8}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-white placeholder-white/25 text-sm font-medium focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !username || !password}
                                    className="group w-full flex items-center justify-center gap-3 px-7 py-3.5 bg-primary text-black font-black rounded-2xl hover:bg-white transition-all shadow-[0_4px_30px_rgba(255,119,86,0.3)] active:scale-95 disabled:opacity-50 text-sm"
                                >
                                    <Zap size={16} fill="currentColor" />
                                    {loading ? 'Signing in...' : 'Sign in'}
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                <p className="text-[10px] text-white/30 text-center">
                                    After email sign-up, you can add a username and password in your profile
                                </p>
                            </form>
                        )}

                            {authMode === 'username' && (
                                <p className="text-xs text-center text-white/45 mt-5 pt-4 border-t border-white/10">
                                    New user?{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuthMode('email');
                                            setAuthError(null);
                                            setAuthStep('email');
                                        }}
                                        className="text-primary font-semibold hover:underline"
                                    >
                                        Create account
                                    </button>
                                </p>
                            )}
                        </div>

                        {authError && (
                            <p className="text-red-400 text-sm font-bold text-center">{authError}</p>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
}
