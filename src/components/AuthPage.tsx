import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignIn, SignUp, useAuth } from '@clerk/clerk-react';
import { ArrowLeft, ArrowRight, Network, ListChecks, Sparkles } from 'lucide-react';
import { enableGuestMode, clearGuestMode } from '../constants';
import { restoreGuestDataIfNeeded } from '../store/useStore';
import LavenderDotBackground from './LavenderDotBackground';
import './AuthPage.css';

const appearance = {
    variables: {
        colorPrimary: '#b86cff', colorBackground: '#080609', colorText: '#ffffff',
        colorTextSecondary: '#c9bed4', colorInputBackground: '#000000', colorInputText: '#ffffff',
        colorNeutral: '#ffffff', colorDanger: '#ff8c9b', borderRadius: '0.8rem',
        fontFamily: 'inherit', fontSize: '15px',
    },
    elements: {
        rootBox: 'auth-widget', cardBox: 'auth-widget', card: 'auth-card',
        formButtonPrimary: 'auth-primary', footer: 'auth-footer',
    },
};

export default function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isSignedIn, isLoaded } = useAuth();
    const signingUp = location.pathname === '/auth/sign-up';
    useEffect(() => {
        // Remove legacy prefill, which could contain a password. Never persist credentials.
        try { sessionStorage.removeItem('stratabin-auth-prefill'); } catch { /* Storage may be blocked. */ }
        if (isLoaded && isSignedIn) {
            clearGuestMode();
            if (restoreGuestDataIfNeeded()) { window.location.assign('/dashboard'); return; }
            navigate('/dashboard', { replace: true });
        }
    }, [isLoaded, isSignedIn, navigate]);
    return (
        <div className="auth-page">
            <LavenderDotBackground />
            <header className="auth-header">
                <Link to="/" className="auth-brand"><span className="auth-brand-icon">
                    <img src="/stratabin-icon.svg" alt="" className="auth-original-logo" />
                </span>Stratabin<span className="auth-brand-dot">.</span></Link>
                <Link to="/" className="auth-back"><ArrowLeft size={16} /> Back to home</Link>
            </header>
            <main className="auth-layout">
                <section className="auth-intro" aria-labelledby="auth-heading">
                    <span className="auth-eyebrow">YOUR WORK, CONNECTED</span>
                    <h1 id="auth-heading">Give your ideas<br /><span>somewhere to go.</span></h1>
                    <blockquote className="auth-quote">
                        <span className="auth-quote-mark" aria-hidden="true">“</span>
                        <p>Your best ideas deserve more than a forgotten note. Give them a plan, a team, and a next step.</p>
                        <footer>The idea behind Stratabin</footer>
                    </blockquote>
                    <ul className="auth-benefits" aria-label="Why use Stratabin">
                        <li><Network size={20} aria-hidden="true" /><div><strong>Keep the whole picture</strong><span>Writing, brainstorms, and code in one project.</span></div></li>
                        <li><ListChecks size={20} aria-hidden="true" /><div><strong>Turn plans into progress</strong><span>Connect tasks, dates, and shared responsibilities.</span></div></li>
                        <li><Sparkles size={20} aria-hidden="true" /><div><strong>Bring your own AI</strong><span>Take your project context to the AI tool you choose.</span></div></li>
                    </ul>
                </section>
                <section className="auth-form-section" aria-label={signingUp ? 'Create your account' : 'Sign in to Stratabin'}>
                    {!isLoaded && <p className="auth-loading" role="status">Connecting to secure sign-in…</p>}
                    {signingUp
                        ? <SignUp routing="hash" signInUrl="/auth" fallbackRedirectUrl="/dashboard" appearance={appearance} />
                        : <SignIn routing="hash" signUpUrl="/auth/sign-up" fallbackRedirectUrl="/dashboard" appearance={appearance} />}
                    <div className="auth-guest">
                        <button type="button" onClick={() => { enableGuestMode(); navigate('/dashboard', { replace: true }); }}>Explore without an account <ArrowRight size={16} /></button>
                        <p>Guest projects stay in this browser. Sign in for team features.</p>
                    </div>
                </section>
            </main>
        </div>
    );
}
