import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen theme-page text-white flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                    <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                </div>
                <div>
                    <p className="text-6xl font-black tracking-tighter text-white/10 mb-4">404</p>
                    <h1 className="text-2xl font-black tracking-tighter mb-2">Page not found</h1>
                    <p className="text-white/40 text-sm leading-relaxed">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-5 py-2.5 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all text-sm"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-5 py-2.5 bg-primary text-black font-black rounded-xl hover:bg-white transition-all text-sm"
                    >
                        Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
