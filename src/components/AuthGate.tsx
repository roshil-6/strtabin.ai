import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverWarmup } from '../services/serverWarmup';

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            navigate('/', { replace: true });
            serverWarmup.reset();
        }
        // Start warming up the backend the moment the user is authenticated
        if (isLoaded && isSignedIn) {
            serverWarmup.start();
        }
    }, [isLoaded, isSignedIn, navigate]);

    // While Clerk is loading, show a premium full-screen spinner
    if (!isLoaded) {
        return (
            <div className="w-screen h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white/10 animate-pulse">
                        <img src="/favicon.png" alt="Stratabin" className="w-full h-full object-contain" />
                    </div>
                    <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    // Keep the spinner visible during the one-frame gap before navigate() fires
    if (!isSignedIn) return (
        <div className="w-screen h-screen bg-[#0a0a0a] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
        </div>
    );

    return <>{children}</>;
}
