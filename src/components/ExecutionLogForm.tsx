import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Save, RotateCcw } from 'lucide-react';
import useStore from '../store/useStore';

type Log = { executed: string; blocking: string; tomorrowAction: string };

/** Daily execution entry with an explicit submit step, so progress is recorded intentionally. */
export default function ExecutionLogForm({ dateKey, todayKey, strategyId }: { dateKey: string; todayKey: string; strategyId?: string }) {
    const logKey = strategyId ? `${dateKey}_${strategyId}` : dateKey;
    const saved = useStore(state => state.dailyExecutionLogs?.[logKey]);
    const setDailyExecutionLog = useStore(state => state.setDailyExecutionLog);
    const stored: Log = { executed: saved?.executed ?? '', blocking: saved?.blocking ?? '', tomorrowAction: saved?.tomorrowAction ?? '' };
    const [edit, setEdit] = useState<{ key: string; values: Partial<Log> } | null>(null);
    const [savedKey, setSavedKey] = useState<string | null>(null);

    const currentEdits = edit?.key === logKey ? edit.values : null;
    const draft: Log = {
        executed: currentEdits?.executed ?? stored.executed,
        blocking: currentEdits?.blocking ?? stored.blocking,
        tomorrowAction: currentEdits?.tomorrowAction ?? stored.tomorrowAction,
    };
    const dirty = draft.executed !== stored.executed || draft.blocking !== stored.blocking || draft.tomorrowAction !== stored.tomorrowAction;
    const empty = !draft.executed.trim() && !draft.blocking.trim() && !draft.tomorrowAction.trim();
    const justSaved = savedKey === logKey && !dirty;
    const dayLabel = dateKey === todayKey ? 'today' : dateKey;

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!dirty || empty) return;
        setDailyExecutionLog(dateKey, { executed: draft.executed.trim(), blocking: draft.blocking.trim(), tomorrowAction: draft.tomorrowAction.trim() }, strategyId);
        setEdit(null);
        setSavedKey(logKey);
        toast.success(`Progress recorded for ${dayLabel}`);
    };
    const change = (field: keyof Log) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSavedKey(null);
        setEdit(prev => ({ key: logKey, values: { ...(prev?.key === logKey ? prev.values : {}), [field]: value } }));
    };
    const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none transition-colors';

    return (
        <form onSubmit={submit} className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                <div>
                    <label htmlFor={`exec-executed-${logKey}`} className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">Executed</label>
                    <input id={`exec-executed-${logKey}`} type="text" maxLength={500} value={draft.executed} onChange={change('executed')} placeholder="e.g. Finished draft, called 3 leads" className={`${inputClass} focus:border-primary/30`} />
                </div>
                <div>
                    <label htmlFor={`exec-blocking-${logKey}`} className="text-[9px] font-semibold uppercase tracking-wider text-amber-600 block mb-1.5">What&apos;s blocking me?</label>
                    <input id={`exec-blocking-${logKey}`} type="text" maxLength={500} value={draft.blocking} onChange={change('blocking')} placeholder="e.g. Waiting on design" className={`${inputClass} focus:border-amber-500/30`} />
                </div>
                <div>
                    <label htmlFor={`exec-tomorrow-${logKey}`} className="text-[9px] font-semibold uppercase tracking-wider text-emerald-600 block mb-1.5">Top action for tomorrow</label>
                    <input id={`exec-tomorrow-${logKey}`} type="text" maxLength={500} value={draft.tomorrowAction} onChange={change('tomorrowAction')} placeholder="e.g. Ship v1 to beta" className={`${inputClass} focus:border-emerald-500/30`} />
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-[var(--text-muted)]" role="status" aria-live="polite">
                    {dirty
                        ? <span className="text-amber-500 font-semibold">Unsaved changes for {dayLabel}</span>
                        : justSaved || saved
                            ? <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold"><CheckCircle2 size={13} />Recorded for {dayLabel}{saved?.createdAt ? ` · ${new Date(saved.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                            : <>Recording for <strong>{dayLabel}</strong></>}
                </p>
                <div className="flex items-center gap-2">
                    {dirty && <button type="button" onClick={() => setEdit(null)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors"><RotateCcw size={13} />Discard</button>}
                    <button type="submit" disabled={!dirty || empty} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all">
                        <Save size={15} />{saved ? 'Update progress' : 'Record progress'}
                    </button>
                </div>
            </div>
        </form>
    );
}
