import { useEffect, useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';
import { cleanDictation } from '../lib/dictation';

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
    lang: string; continuous: boolean; interimResults: boolean;
    onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export default function VoiceTyping({ onInsert }: { onInsert: (text: string) => void }) {
    const [open, setOpen] = useState(false);
    const [listening, setListening] = useState(false);
    const [draft, setDraft] = useState('');
    const [message, setMessage] = useState('');
    const [cleanup, setCleanup] = useState(true);
    const [language, setLanguage] = useState('en-IN');
    const engine = useRef<Recognition | null>(null);
    const insert = useRef(onInsert);
    useEffect(() => { insert.current = onInsert; }, [onInsert]);
    useEffect(() => () => { if (engine.current) { engine.current.onend = null; engine.current.onresult = null; engine.current.onerror = null; engine.current.abort(); } }, []);
    const start = () => {
        if (engine.current) return;
        const Speech = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
        if (!Speech) { setMessage('Voice typing is not supported in this browser. Open Stratabin in Chrome or Edge and allow microphone access.'); return; }
        const recognition = new Speech();
        engine.current = recognition;
        let finalText = '';
        let failed = false;
        recognition.lang = language;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = event => {
            const results = Array.from(event.results);
            finalText = results.filter(result => result.isFinal).map(result => result[0].transcript).join(' ');
            setDraft(results.map(result => result[0].transcript).join(' '));
        };
        recognition.onerror = event => {
            failed = true;
            setMessage(event.error === 'not-allowed' ? 'Microphone access was denied. Allow it in your browser’s site settings, then try again.' : event.error === 'no-speech' ? 'No speech was detected. Try again when you are ready.' : `Voice typing stopped (${event.error}). Check your microphone and internet connection.`);
        };
        recognition.onend = () => {
            engine.current = null; setListening(false);
            // On an error, preserve the draft for manual recovery instead of inserting partial text silently.
            if (failed) return;
            const text = cleanup ? cleanDictation(finalText) : finalText.trim();
            if (text) { insert.current(text); setDraft(''); setMessage('Added to your writing.'); }
            else setMessage('No speech was captured. Try again.');
        };
        setDraft(''); setMessage('');
        try { recognition.start(); setListening(true); }
        catch { engine.current = null; setMessage('Could not start the microphone. Check browser permissions and try again.'); }
    };
    const cancel = () => {
        if (engine.current) { engine.current.onend = null; engine.current.onresult = null; engine.current.onerror = null; engine.current.abort(); engine.current = null; }
        setListening(false); setOpen(false); setDraft(''); setMessage('');
    };
    return <div className="voice-typing">
        <button type="button" aria-expanded={open} onClick={() => setOpen(true)} title="Voice typing" aria-label="Voice typing"><Mic size={17} /><span>Dictate</span></button>
        {open && <section className="voice-panel" aria-label="Voice typing controls">
            <div className="flex justify-between items-center gap-4"><strong>Voice typing</strong><button onClick={cancel} aria-label="Cancel dictation and close"><X size={18} /></button></div>
            <p>Speak, then stop to add text at the end of this page. Your browser’s speech service may process audio online.</p>
            <label>Language <select value={language} onChange={event => setLanguage(event.target.value)} disabled={listening}><option value="en-IN">English (India)</option><option value="en-US">English (US)</option><option value="hi-IN">Hindi</option><option value="ml-IN">Malayalam</option></select></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={cleanup} disabled={listening} onChange={event => setCleanup(event.target.checked)} />Clean common English fillers and repeated function words</label>
            {draft && <p className="voice-draft">{draft}</p>}
            <p role="status">{listening ? 'Listening… nothing is added until listening stops.' : message}</p>
            <button onClick={listening ? () => engine.current?.stop() : start} className="voice-action">{listening ? <Square size={16} /> : <Mic size={16} />}{listening ? 'Stop & insert' : 'Start listening'}</button>
            {!listening && draft && <button onClick={() => { insert.current(cleanup ? cleanDictation(draft) : draft); setDraft(''); setMessage('Draft added.'); }}>Insert captured draft</button>}
        </section>}
    </div>;
}
