import { useEffect, useRef } from 'react';
import type { VoiceState } from '../lib/liveVoiceClient';

/** Decorative canvas inside the agent's single, keyboard-accessible talk button. */
export default function AssistantPresence({ state, level, paused = false }: { state: VoiceState; level: number; paused?: boolean }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const motion = useRef({ state, level });
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
                const phase = moving ? now / 5500 : 0;
                const radius = Math.min(width, height) * .39;
                const energy = moving ? motion.current.level * .09 + (motion.current.state === 'speaking' ? .035 : 0) : 0;
                ctx.clearRect(0, 0, width, height);
                const points: { x: number; y: number; z: number; size: number }[] = [];
                // Fibonacci sphere: evenly spaced points with depth-sorted specular highlights.
                for (let i = 0; i < 620; i++) {
                    const y = 1 - 2 * (i + .5) / 620;
                    const ring = Math.sqrt(1 - y * y);
                    const angle = i * 2.399963 + phase + (moving ? pointer * .3 : 0);
                    const ripple = 1 + Math.sin(y * 9 + phase * 4) * (.025 + energy);
                    const x = Math.cos(angle) * ring * ripple;
                    const z = Math.sin(angle) * ring * ripple;
                    const tiltY = y * .96 - z * .28;
                    const depth = y * .28 + z * .96;
                    const scale = 3.8 / (3.8 - depth);
                    points.push({ x: width / 2 + x * radius * scale, y: height / 2 + tiltY * radius * scale, z: depth, size: Math.max(.5, width / 150 * scale * .8) });
                }
                points.sort((a, b) => a.z - b.z);
                for (const point of points) {
                    ctx.globalAlpha = .22 + (point.z + 1.1) / 2.2 * .78;
                    const gradient = ctx.createRadialGradient(point.x - point.size * .3, point.y - point.size * .4, 0, point.x, point.y, point.size);
                    gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.3, '#d8a2ff'); gradient.addColorStop(1, '#7330b1');
                    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
            if (!document.hidden && !paused && !reduced.matches) frame = requestAnimationFrame(draw);
        };
        const restart = () => { cancelAnimationFrame(frame); last = 0; draw(performance.now()); };
        const resize = new ResizeObserver(() => {
            const rect = el.getBoundingClientRect(); width = rect.width; height = rect.height;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            el.width = width * ratio; el.height = height * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); restart();
        });
        const move = (event: PointerEvent) => { const rect = el.getBoundingClientRect(); pointer = (event.clientX - rect.left) / Math.max(rect.width, 1) - .5; };
        resize.observe(el); el.addEventListener('pointermove', move); reduced.addEventListener('change', restart); document.addEventListener('visibilitychange', restart);
        return () => { cancelAnimationFrame(frame); resize.disconnect(); el.removeEventListener('pointermove', move); reduced.removeEventListener('change', restart); document.removeEventListener('visibilitychange', restart); };
    }, [paused]);
    return <canvas className="agent-particle-sphere" ref={canvas} aria-hidden="true" />;
}
