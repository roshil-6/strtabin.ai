import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Check, Zap, Shield, Globe, ArrowRight, Chrome, CreditCard, Bot } from 'lucide-react';

const HexagonBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', resize);
        resize();

        const hexSize = 40;
        const hexHeight = hexSize * 2;
        const hexWidth = Math.sqrt(3) * hexSize;
        const vertDist = hexHeight * 0.75;
        const horizDist = hexWidth;

        const drawHexagon = (x: number, y: number, opacity: number) => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + Math.PI / 6;
                const hX = x + hexSize * Math.cos(angle);
                const hY = y + hexSize * Math.sin(angle);
                if (i === 0) ctx.moveTo(hX, hY);
                else ctx.lineTo(hX, hY);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(218, 119, 86, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        };

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            const cols = Math.ceil(width / horizDist) + 1;
            const rows = Math.ceil(height / vertDist) + 1;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    let x = c * horizDist;
                    let y = r * vertDist;
                    if (r % 2 === 1) x += horizDist / 2;

                    const dx = x - mouseRef.current.x;
                    const dy = y - mouseRef.current.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    const maxDist = 250;
                    let opacity = 0.03; // Base subtle opacity

                    if (dist < maxDist) {
                        const effect = 1 - dist / maxDist;
                        opacity = 0.03 + 0.15 * effect; // Reactive glow
                    }

                    drawHexagon(x, y, opacity);
                }
            }
            animationFrameId = requestAnimationFrame(render);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches[0]) {
                mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);

        render();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

export default function LandingPage() {
    const navigate = useNavigate();
    const setAuthenticated = useStore(state => state.setAuthenticated);
    const setPaid = useStore(state => state.setPaid);
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = () => {
        setLoading(true);
        // Simulate Google Auth
        setTimeout(() => {
            setAuthenticated(true);
            setLoading(false);
        }, 1500);
    };

    const handlePayment = (plan: 'monthly' | 'yearly') => {
        setLoading(true);
        console.log(`Processing ${plan} payment...`);
        // Simulate Razorpay
        setTimeout(() => {
            setPaid(true);
            navigate('/dashboard');
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-primary/30 relative overflow-hidden">
            <HexagonBackground />

            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#121212]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-white/10">
                            <img src="/favicon.png" alt="Logo" className="w-6 h-6 object-contain" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tighter">Stratabin<span className="text-primary">.</span></h1>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-sm font-bold text-white/40 hover:text-white transition-colors"
                    >
                        Demo Access
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Zap size={14} />
                        Next-Gen Strategy Workspace
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        Map your vision. <br />
                        <span className="text-white/40">Execute with clarity.</span>
                    </h2>

                    {/* Student Highlight Tag */}
                    <div className="flex items-center justify-center gap-2 mb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
                        <div className="px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Zap size={10} fill="currentColor" />
                            For Students
                        </div>
                        <p className="text-sm font-medium text-white/60 italic">
                            Conquer complicated, scattered topics with ease.
                        </p>
                    </div>
                    <p className="text-xl text-white/40 max-w-2xl mx-auto mb-12 leading-relaxed">
                        The all-in-one workspace for strategy, flow, and execution.
                        Simplified for speed, powered by STRAB AI.
                    </p>

                    <button
                        onClick={handleGoogleLogin}
                        className="group relative flex items-center gap-3 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-primary hover:text-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-95 mx-auto"
                    >
                        <Chrome size={20} />
                        Get Started with Google
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 px-6 relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl font-black mb-4">Simple, transparent pricing</h3>
                        <p className="text-white/40">Choose the plan that fits your strategy.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Monthly Plan */}
                        <div className="group bg-white/[0.03] border border-white/5 rounded-[32px] p-10 hover:border-primary/50 transition-all hover:bg-white/[0.05]">
                            <div className="mb-8">
                                <h4 className="text-white/40 font-bold uppercase tracking-widest text-xs mb-4">Monthly Plan</h4>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-white">₹39</span>
                                    <span className="text-white/20 font-bold">/ month</span>
                                </div>
                                <p className="text-white/40 text-sm mt-2">Perfect for creators getting started.</p>
                            </div>

                            <div className="space-y-4 mb-10">
                                {[
                                    "Unlimited Strategy Canvases",
                                    "STRAB AI Intelligence",
                                    "Visual ASCII Branching",
                                    "Razorpay Secured Payments",
                                    "Cloud Sync (Any device)"
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm font-medium text-white/60">
                                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handlePayment('monthly')}
                                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
                            >
                                <CreditCard size={18} />
                                Start Monthly
                            </button>
                        </div>

                        {/* Yearly Plan */}
                        <div className="group relative bg-[#141414] border border-primary/30 rounded-[32px] p-10 shadow-2xl overflow-hidden">
                            <div className="absolute top-6 right-6 px-3 py-1 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-full">
                                Best Value
                            </div>

                            <div className="mb-8">
                                <h4 className="text-primary font-bold uppercase tracking-widest text-xs mb-4">Yearly Plan</h4>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-white">₹399</span>
                                    <span className="text-white/20 font-bold">/ year</span>
                                </div>
                                <p className="text-white/40 text-sm mt-2 text-primary/60">Save 15% with yearly billing.</p>
                            </div>

                            <div className="space-y-4 mb-10">
                                {[
                                    "Everything in Monthly",
                                    "Priority STRAB AI access",
                                    "Future Tool Beta Access",
                                    "Exclusive Premium Themes",
                                    "Dedicated Support"
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm font-medium text-white/80">
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-black shrink-0">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handlePayment('yearly')}
                                className="w-full py-4 bg-primary text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-[0_10px_30px_rgba(218,119,86,0.3)] flex items-center justify-center gap-2"
                            >
                                <Zap size={18} fill="currentColor" />
                                Start Yearly
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features (Subtle) */}
            <section className="py-20 border-t border-white/5 bg-white/[0.01]">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Student Specific Card */}
                    <div className="flex flex-col gap-4 p-8 bg-white/[0.03] border border-white/5 rounded-3xl hover:border-primary/30 transition-all group">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                            <Bot size={24} />
                        </div>
                        <h5 className="text-lg font-bold text-primary">STRAB AI for Studies</h5>
                        <p className="text-white/40 text-sm leading-relaxed">
                            Turn scattered research and complex topics into structured strategy flows. Perfect for organizing difficult subjects.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 p-8 bg-white/[0.03] border border-white/5 rounded-3xl hover:border-primary/30 transition-all group">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Shield size={24} />
                        </div>
                        <h5 className="text-lg font-bold">Encrypted Workspace</h5>
                        <p className="text-white/20 text-sm leading-relaxed">Your strategies are yours. Securely synced and encrypted across all your devices.</p>
                    </div>

                    <div className="flex flex-col gap-4 p-8 bg-white/[0.03] border border-white/5 rounded-3xl hover:border-primary/30 transition-all group">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Globe size={24} />
                        </div>
                        <h5 className="text-lg font-bold">Global Infrastructure</h5>
                        <p className="text-white/20 text-sm leading-relaxed">Powered by STRAB AI, running on global reliable infrastructure for zero downtime.</p>
                    </div>

                    <div className="flex flex-col gap-4 p-8 bg-white/[0.03] border border-white/5 rounded-3xl hover:border-primary/30 transition-all group">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <CreditCard size={24} />
                        </div>
                        <h5 className="text-lg font-bold">Razorpay Secured</h5>
                        <p className="text-white/20 text-sm leading-relaxed">Industry standard payment gateway. We never store your card details.</p>
                    </div>
                </div>
            </section>

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-primary font-black uppercase text-xs tracking-widest animate-pulse">Processing...</p>
                </div>
            )}
        </div>
    );
}
