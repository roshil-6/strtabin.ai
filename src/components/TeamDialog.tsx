import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export default function TeamDialog({ title, close, children, busy = false }: { title: string; close: () => void; children: ReactNode; busy?: boolean }) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => { const previous = document.activeElement as HTMLElement | null; dialog.current?.showModal(); return () => { if (previous?.isConnected) previous.focus(); }; }, []);
    return <dialog ref={dialog} className="team-dialog" aria-labelledby="team-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) close(); }} onClick={event => { if (event.target === event.currentTarget && !busy) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}><header><h2 id="team-dialog-title">{title}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={close}><X size={19} /></button></header>{children}</dialog>;
}
