import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { Check, Zap, ArrowRight, Chrome, Bot, X, Compass, Target, Rocket } from 'lucide-react';

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
    const [showHowTo, setShowHowTo] = useState(false);

    const handleGoogleLogin = () => {
        setLoading(true);
        // Simulate Google Auth
        setTimeout(() => {
            setAuthenticated(true);
            setLoading(false);
        }, 1500);
    };

    const handlePayment = (plan: 'monthly' | 'yearly' | 'lifetime') => {
        setLoading(true);
        console.log(`Processing ${plan} payment...`);
        // Simulate Razorpay
        setTimeout(() => {
            setPaid(true);
            navigate('/dashboard');
        }, 2000);
    };

    return (
        <div className={`min-h-screen bg-[#121212] text-white font-sans selection:bg-white/20 relative ${showHowTo ? 'overflow-hidden' : 'overflow-x-hidden'}`}>
            <HexagonBackground />

            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#121212]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg border-2 border-white/10">
                            <img src="/favicon.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tighter text-white">Stratabin<span className="text-primary">.</span></h1>
                    </div>
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => setShowHowTo(true)}
                            className="text-sm font-bold text-white/40 hover:text-white transition-colors"
                        >
                            How it Works
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-sm font-bold text-white/40 hover:text-white transition-colors"
                        >
                            Demo Access
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    {/* Prominent Logo */}
                    <div className="mb-12 flex justify-center animate-in fade-in zoom-in duration-1000">
                        <div className="relative">
                            <div className="relative w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white/5">
                                <img src="/favicon.png" alt="Stratabin Logo" className="w-full h-full object-contain" />
                            </div>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-primary text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        <Zap size={14} />
                        Next-Gen Strategy Workspace
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        Map your vision. <br />
                        <span className="text-white/40">Execute with clarity.</span>
                    </h2>

                    <div className="flex items-center justify-center gap-2 mb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Zap size={10} fill="currentColor" />
                            For Students & Professionals
                        </div>
                    </div>
                    <p className="text-xl text-white/40 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
                        The all-in-one workspace for strategy, flow, and execution.
                        Simplified for speed, powered by STRAB AI.
                    </p>

                    <button
                        onClick={handleGoogleLogin}
                        className="group relative flex items-center gap-3 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-primary hover:text-white transition-all shadow-[0_4px_30px_rgba(255,255,255,0.1)] active:scale-95 mx-auto"
                    >
                        <Chrome size={20} />
                        Get Started with Google
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </section>

            {/* Problem Solving Quote Section */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-8">
                        <Zap size={12} fill="currentColor" />
                        The Stratabin Method
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight mb-10">
                        "Visualize and plan your <span className="text-primary italic">scattered thoughts</span>, then execute them with precision using a <span className="italic underline underline-offset-8 decoration-primary/30">structured roadmap</span> built for speed."
                    </h2>
                    <button
                        onClick={() => setShowHowTo(true)}
                        className="group inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary hover:text-white transition-all"
                    >
                        Learn the Methodology
                        <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                    <div className="w-24 h-1 bg-white/5 mx-auto rounded-full mt-12" />
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="max-w-3xl mx-auto relative z-10">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl font-black mb-4">Simple, one-time pricing</h3>
                        <p className="text-white/40 font-medium italic">Pay once. Use forever. No subscriptions, no surprises.</p>
                    </div>

                    <div className="group relative bg-[#141414] border border-primary/30 rounded-[32px] p-10 md:p-14 shadow-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-6 right-6 px-3 py-1 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-full">
                            One-Time
                        </div>

                        <div className="mb-10 flex flex-col md:flex-row md:items-center md:gap-12">
                            <div>
                                <h4 className="text-primary font-bold uppercase tracking-widest text-xs mb-4">Full Access — Lifetime</h4>
                                <div className="flex items-baseline gap-3 mb-2">
                                    <span className="text-6xl font-black text-white">₹64</span>
                                    <div className="flex flex-col">
                                        <span className="text-white/20 font-bold text-sm">India</span>
                                        <span className="text-white/40 text-xs">One-time payment</span>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-3 mt-4">
                                    <span className="text-3xl font-black text-white/60">$2</span>
                                    <div className="flex flex-col">
                                        <span className="text-white/20 font-bold text-sm">International</span>
                                        <span className="text-white/40 text-xs">USD, one-time</span>
                                    </div>
                                </div>
                            </div>
                            <div className="hidden md:block w-px h-32 bg-white/10 shrink-0" />
                            <div className="space-y-4 mt-8 md:mt-0 flex-1">
                                {[
                                    "Unlimited Strategy Canvases",
                                    "STRAB AI Intelligence — Full Access",
                                    "Folder Workflow Maps",
                                    "Writing, Tasks & Calendar",
                                    "Install on Phone (PWA)",
                                    "All Future Updates Included",
                                    "Cloud Sync across devices",
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm font-medium text-white/80">
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-black shrink-0">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => handlePayment('lifetime')}
                            className="w-full py-5 bg-primary text-black rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-white transition-all shadow-[0_10px_40px_rgba(218,119,86,0.2)] flex items-center justify-center gap-3"
                        >
                            <Zap size={20} fill="currentColor" />
                            Get Full Access — ₹64 / $2
                        </button>
                        <p className="text-center text-white/20 text-xs mt-5">
                            Secured by Razorpay · No recurring charges · Cancel anytime
                        </p>
                    </div>
                </div>
            </section>

            {/* How to Use Overlay */}
            {showHowTo && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl overflow-y-auto animate-in fade-in zoom-in duration-500">
                    <button
                        onClick={() => setShowHowTo(false)}
                        className="fixed top-8 right-8 z-[110] w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-primary hover:text-black transition-all group active:scale-95"
                    >
                        <X size={24} className="group-hover:rotate-90 transition-transform" />
                    </button>

                    <div className="max-w-6xl mx-auto px-6 py-24">
                        {/* Why Section */}
                        <div className="mb-40">
                            <div className="flex items-center gap-4 mb-12">
                                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                                    <Target size={32} />
                                </div>
                                <div>
                                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Why Stratabin?</h2>
                                    <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">The Problem We Resolve</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    {
                                        title: "Mental Clarity",
                                        desc: "Scattered thoughts lead to wasted potential. Stratabin provides the visual canvas to offload your brain and see the connections you've been missing.",
                                        icon: Compass
                                    },
                                    {
                                        title: "Structured Execution",
                                        desc: "Ideas are cheap; execution is everything. We turn abstract strategies into technical roadmaps and actionable task lists automatically.",
                                        icon: Target
                                    },
                                    {
                                        title: "Accelerated Growth",
                                        desc: "Built for speed. With STRAB AI intelligence, you can map out complex topics in minutes that used to take hours of manual research.",
                                        icon: Rocket
                                    }
                                ].map((item, i) => (
                                    <div key={i} className="p-10 bg-white/[0.03] border border-white/5 rounded-[40px] hover:border-primary/30 transition-all group">
                                        <item.icon size={40} className="text-primary mb-8 group-hover:scale-125 transition-transform" />
                                        <h4 className="text-2xl font-black mb-4">{item.title}</h4>
                                        <p className="text-white/40 leading-relaxed italic">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* How it Works / Steps */}
                        <div className="mb-40">
                            <div className="text-center mb-24">
                                <h3 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">The Methodology</h3>
                                <div className="w-32 h-1.5 bg-primary mx-auto rounded-full shadow-[0_4px_20px_rgba(218,119,86,0.4)]" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                {[
                                    {
                                        step: "01",
                                        title: "Capture & Flow",
                                        description: "Map out your initial thoughts using our fluid canvas. Create nodes, link ideas, and visualize the big picture without friction.",
                                        icon: Zap,
                                    },
                                    {
                                        step: "02",
                                        title: "Organize Intelligence",
                                        description: "STRAB AI automatically categorizes and structures your data. Merge related canvases or group them into dedicated workspaces.",
                                        icon: Bot,
                                    },
                                    {
                                        step: "03",
                                        title: "Execute with Clarity",
                                        description: "Convert strategies into actionable task lists and timelines. Sync across all devices and track progress in real-time.",
                                        icon: Check,
                                    }
                                ].map((item, idx) => (
                                    <div key={idx} className="relative group">
                                        <div className="absolute -top-10 -left-6 text-9xl font-black text-white/[0.03] pointer-events-none group-hover:text-primary/10 transition-colors">
                                            {item.step}
                                        </div>
                                        <div className="p-10 pb-14 bg-white/[0.02] border border-white/5 rounded-[48px] hover:border-primary/30 transition-all relative z-10 h-full flex flex-col">
                                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-primary mb-10 group-hover:bg-primary group-hover:text-black transition-all">
                                                <item.icon size={32} />
                                            </div>
                                            <h4 className="text-2xl font-black mb-6">{item.title}</h4>
                                            <p className="text-white/40 leading-relaxed italic text-lg">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Feature Directory */}
                        <div className="p-10 md:p-20 bg-primary/5 border border-primary/20 rounded-[64px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-20 opacity-5">
                                <Compass size={400} />
                            </div>
                            <div className="relative z-10">
                                <div className="mb-16">
                                    <h3 className="text-4xl font-black mb-4">Complete Directory</h3>
                                    <p className="text-white/40 uppercase tracking-widest text-xs font-bold">Every Tool at Your Fingertips</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {[
                                        { name: "Project Merging", desc: "Combine two separate strategy canvases into a unified intelligence node." },
                                        { name: "Folder Workspaces", desc: "Create unlimited custom folders to segment your professional and personal life." },
                                        { name: "STRAB Intelligence", desc: "Our house-built AI provides context-aware insights on your strategy flows." },
                                        { name: "PWA Mobile", desc: "Install Stratabin on your iOS or Android device for native-like performance." },
                                        { name: "Global Cloud Sync", desc: "All your data is securely synced and available on any browser, anywhere." },
                                        { name: "Interactive Canvas", desc: "High-performance drag and drop canvas for lightning fast mapping." },
                                        { name: "Writing Mode", desc: "Distraction-free markdown editor for deep thought and documentation." },
                                        { name: "Timeline Mapping", desc: "Visual gantt-style timelines to track project milestones and deadlines." },
                                        { name: "Task Ecosystem", desc: "Deeply integrated todo lists that link directly to your strategy nodes." }
                                    ].map((feat, i) => (
                                        <div key={i} className="p-8 bg-black/20 border border-white/5 rounded-3xl hover:bg-black/40 transition-all">
                                            <h5 className="text-primary font-black text-sm uppercase tracking-[0.2em] mb-3">{feat.name}</h5>
                                            <p className="text-white/40 text-sm leading-relaxed italic">{feat.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-primary font-black uppercase text-xs tracking-widest animate-pulse">Processing...</p>
                </div>
            )}
        </div>
    );
}
