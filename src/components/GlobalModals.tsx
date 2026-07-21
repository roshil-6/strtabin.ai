import { useEffect, useRef, useState } from 'react';
import useModalStore from '../store/useModalStore';

export default function GlobalModals() {
    const { confirmConfig, promptConfig, resolveConfirm, resolvePrompt } = useModalStore();

    // Focus input when prompt mounts
    const inputRef = useRef<HTMLInputElement>(null);
    const [promptValue, setPromptValue] = useState('');

    useEffect(() => {
        if (promptConfig) {
            setPromptValue(promptConfig.defaultValue || '');
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [promptConfig]);

    if (!confirmConfig && !promptConfig) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            {confirmConfig && (
                <div className="bg-[#121212] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-white mb-2">Confirmation</h3>
                    <p className="text-white/70 text-sm mb-6">{confirmConfig.message}</p>
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={() => resolveConfirm(false)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => resolveConfirm(true)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}

            {promptConfig && (
                <div className="bg-[#121212] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-white mb-2">Input Required</h3>
                    <p className="text-white/70 text-sm mb-4">{promptConfig.message}</p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={promptValue}
                        onChange={(e) => setPromptValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') resolvePrompt(promptValue);
                            if (e.key === 'Escape') resolvePrompt(null);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 text-white mb-6"
                    />
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={() => resolvePrompt(null)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => resolvePrompt(promptValue)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 transition-all"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
