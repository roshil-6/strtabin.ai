import { useEffect, useRef, useState, type ReactNode } from 'react';
import useModalStore from '../store/useModalStore';
function ModalFrame({ title, message, cancel, children }: { title: string; message: string; cancel: () => void; children: ReactNode }) {
    const dialog = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        dialog.current?.querySelector<HTMLElement>('input,button')?.focus();
        return () => { if (previous?.isConnected) previous.focus(); };
    }, []);
    return <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) cancel(); }}>
        <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="global-modal-title" aria-describedby="global-modal-message" className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl shadow-2xl p-6 w-full max-w-sm text-[var(--text)]" onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); cancel(); }
            if (event.key === 'Tab') {
                const fields = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input:not(:disabled),button:not(:disabled)') || []);
                const first = fields[0], last = fields[fields.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        }}>
            <h3 id="global-modal-title" className="text-lg font-semibold mb-2">{title}</h3><p id="global-modal-message" className="text-[var(--text-muted)] text-sm mb-5">{message}</p>{children}
        </div>
    </div>;
}
const button = 'px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-strong)] hover:bg-[var(--input-bg)]';
function PromptDialog({ config }: { config: NonNullable<ReturnType<typeof useModalStore.getState>['promptConfig']> }) {
    const [value, setValue] = useState(config.defaultValue || '');
    const resolve = useModalStore(state => state.resolvePrompt);
    return <ModalFrame title="Input required" message={config.message} cancel={() => resolve(null)}><form onSubmit={event => { event.preventDefault(); resolve(value); }}><input aria-label={config.message} value={value} onChange={event => setValue(event.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-base outline-none focus:border-primary mb-5" /><div className="flex justify-end gap-3"><button type="button" className={button} onClick={() => resolve(null)}>Cancel</button><button type="submit" className={`${button} bg-primary/15 text-primary`}>Submit</button></div></form></ModalFrame>;
}
export default function GlobalModals() {
    const { confirmConfig, promptConfig, resolveConfirm } = useModalStore();
    if (promptConfig) return <PromptDialog key={promptConfig.id} config={promptConfig} />;
    if (confirmConfig) return <ModalFrame key={confirmConfig.id} title="Confirmation" message={confirmConfig.message} cancel={() => resolveConfirm(false)}><div className="flex justify-end gap-3"><button className={button} onClick={() => resolveConfirm(false)}>Cancel</button><button className={`${button} text-red-400`} onClick={() => resolveConfirm(true)}>Confirm</button></div></ModalFrame>;
    return null;
}
