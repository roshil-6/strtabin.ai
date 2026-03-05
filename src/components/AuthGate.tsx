import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            console.log('User not signed in, redirecting to home...');
            navigate('/', { replace: true });
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

    if (!isSignedIn) return null;

    return <>{children}</>;
}
