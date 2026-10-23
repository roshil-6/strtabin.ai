import { useEffect, useRef, useState } from 'react';
import type { VoiceState } from '../lib/liveVoiceClient';

export default function AssistantPresence({ state, level }: { state: VoiceState; level: number }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const motion = useRef({ state, level });
    const [paused, setPaused] = useState(false);
    useEffect(() => { motion.current = { state, level }; }, [state, level]);
    useEffect(() => {
        const el = canvas.current;
        const ctx = el?.getContext('2d');
        if (!el || !ctx) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        let frame = 0, width = 0, height = 0, last = 0;
        let pointer = 0;
        const draw = (now: number) => {
            if (now - last >= 40 || !last) {
                last = now;
                const moving = !paused && !reduced.matches;
                const phase = moving ? now / 1600 : 0;
                const amplitude = 12 + motion.current.level * 22 + (motion.current.state === 'speaking' ? 10 : 0);
                ctx.clearRect(0, 0, width, height);
                const points: { x: number; y: number; scale: number; row: number; col: number }[] = [];
                for (let row = 0; row < 17; row++) for (let col = 0; col < 40; col++) {
                    const x = (col - 19.5) * 11;
                    const z = (row - 8) * 14;
                    const y = Math.sin(col * .17 + row * .22 + phase) * amplitude + Math.cos(row * .36 - phase) * 9;
                    const angle = -.22 + (moving ? pointer * .16 : 0);
                    const rotatedX = x * Math.cos(angle) + z * Math.sin(angle);
                    const depth = z * Math.cos(angle) - x * Math.sin(angle);
                    const scale = 420 / (480 + depth);
                    points.push({ x: width / 2 + rotatedX * scale * Math.min(1, width / 410), y: height / 2 + (y + depth * .3) * scale, scale, row, col });
                }
                for (let i = 0; i < points.length; i++) {
                    const p = points[i];
                    if (p.col < 39) { const next = points[i + 1]; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(next.x, next.y); ctx.strokeStyle = 'rgba(170,95,230,.17)'; ctx.lineWidth = .6; ctx.stroke(); }
                    const radius = Math.max(.8, p.scale * 1.55);
                    const gradient = ctx.createRadialGradient(p.x - radius * .35, p.y - radius * .4, 0, p.x, p.y, radius);
                    gradient.addColorStop(0, '#f3ddff'); gradient.addColorStop(.35, '#c183f0'); gradient.addColorStop(1, '#4e1b75');
                    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
                }
            }
            if (!document.hidden && !paused && !reduced.matches) frame = requestAnimationFrame(draw);
        };
        const restart = () => { cancelAnimationFrame(frame); last = 0; draw(performance.now()); };
        const resize = new ResizeObserver(() => {
            const rect = el.getBoundingClientRect(); width = rect.width; height = rect.height;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            el.width = width * ratio; el.height = height * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); restart();
        });
        const move = (event: PointerEvent) => { const rect = el.getBoundingClientRect(); pointer = (event.clientX - rect.left) / rect.width - .5; };
        resize.observe(el); el.addEventListener('pointermove', move); reduced.addEventListener('change', restart); document.addEventListener('visibilitychange', restart);
        return () => { cancelAnimationFrame(frame); resize.disconnect(); el.removeEventListener('pointermove', move); reduced.removeEventListener('change', restart); document.removeEventListener('visibilitychange', restart); };
    }, [paused]);
    return <div className="assistant-presence"><canvas ref={canvas} aria-hidden="true" /><div className="assistant-presence-caption"><span className={`assistant-live-status ${state}`} role="status">{state === 'idle' ? 'Ready when you are' : state === 'connecting' ? 'Connecting securely…' : state === 'muted' ? 'Microphone muted' : state === 'speaking' ? 'Speaking' : 'Listening'}</span><button aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Animate' : 'Pause visual'}</button></div></div>;
}
