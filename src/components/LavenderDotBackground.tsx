import { useEffect, useRef } from 'react';
import { useTheme } from '../context/useTheme';
import './LavenderDotBackground.css';

/** Decorative projected mesh; never intercepts input or enters the accessibility tree. */
export default function LavenderDotBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { resolved } = useTheme();
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        // One small shaded texture gives every dot a reflective surface without bloom.
        const bead = document.createElement('canvas'); bead.width = 48; bead.height = 48;
        const beadContext = bead.getContext('2d');
        if (!beadContext) return;
        const finish = beadContext.createRadialGradient(16, 13, 1, 24, 24, 22);
        finish.addColorStop(0, resolved === 'light' ? '#f1d0ff' : '#ffffff');
        finish.addColorStop(.16, '#f1ccff');
        finish.addColorStop(.38, '#c26dff');
        finish.addColorStop(.72, '#8d27c9');
        finish.addColorStop(1, '#3d095d');
        beadContext.fillStyle = finish; beadContext.beginPath(); beadContext.arc(24, 24, 22, 0, Math.PI * 2); beadContext.fill();
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const pointer = { x: 0, y: 0 };
        let yaw = 0, pitch = 0, phase = 0, frame = 0, last = 0, width = 1, height = 1, visible = true;
        const rows = 27, columns = 42;
        // An open rectangular fabric grid, with free edges rather than a closed sphere.
        const mesh = Array.from({ length: rows * columns }, (_, index) => ({
            u: (index % columns) / (columns - 1) * 2 - 1,
            v: Math.floor(index / columns) / (rows - 1) * 2 - 1,
        }));
        function draw(now: number) {
            frame = 0;
            if (document.hidden || !visible) return;
            if (!motion.matches && now - last < 32) { frame = requestAnimationFrame(draw); return; }
            const elapsed = last ? Math.min(now - last, 64) : 32;
            last = now;
            if (!motion.matches) { phase += elapsed * .00032; yaw += (pointer.x * .18 - yaw) * .055; pitch += (pointer.y * .14 - pitch) * .055; }
            const turn = -.18 + yaw, tilt = -.38 + pitch;
            const size = Math.min(width, height) * .39;
            const points = mesh.map(point => {
                const sheetX = point.u * 1.65 + point.v * .24;
                const sheetY = point.v * 1.05 + point.u * .12 + .24 * Math.sin(point.u * 2.8 - phase);
                const wave = .56 * Math.sin(point.u * 3.2 + point.v * 1.6 - phase)
                    + .20 * Math.cos(point.v * 4.4 + point.u - phase * .65);
                const x = sheetX * Math.cos(turn) + wave * Math.sin(turn);
                const z = -sheetX * Math.sin(turn) + wave * Math.cos(turn);
                const y = sheetY * Math.cos(tilt) - z * Math.sin(tilt);
                const depth = sheetY * Math.sin(tilt) + z * Math.cos(tilt);
                const perspective = 3.8 / (3.8 - depth);
                return { x: width * .54 + x * size * perspective, y: height * .54 + y * size * perspective, depth, radius: (1.7 + (depth + 1) * .4) * perspective };
            });
            context!.clearRect(0, 0, width, height);
            const color = resolved === 'light' ? '129,35,191' : '191,95,255';
            for (let index = 0; index < points.length; index++) {
                const point = points[index];
                const alpha = Math.max(.04, (point.depth + 1.3) / 2.6);
                const adjacent = [index % columns < columns - 1 ? index + 1 : -1, index + columns];
                context!.strokeStyle = `rgba(${color},${alpha * .12})`;
                context!.lineWidth = .55;
                for (const next of adjacent) {
                    if (!points[next]) continue;
                    context!.beginPath(); context!.moveTo(point.x, point.y); context!.lineTo(points[next].x, points[next].y); context!.stroke();
                }
            }
            // Back-to-front shading keeps the near surface crisp.
            for (const point of points.slice().sort((a, b) => a.depth - b.depth)) {
                context!.globalAlpha = Math.max(.08, (point.depth + 1.3) / 2.6) * .95;
                context!.drawImage(bead, point.x - point.radius, point.y - point.radius, point.radius * 2, point.radius * 2);
            }
            context!.globalAlpha = 1;
            if (!motion.matches) frame = requestAnimationFrame(draw);
        }
        function start() { if (!frame && visible && !document.hidden) { last = 0; frame = requestAnimationFrame(draw); } }
        function resize() {
            const bounds = canvas!.getBoundingClientRect(); width = bounds.width; height = bounds.height;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas!.width = Math.round(width * ratio); canvas!.height = Math.round(height * ratio);
            context!.setTransform(ratio, 0, 0, ratio, 0, 0); start();
        }
        const move = (event: PointerEvent) => { if (event.pointerType === 'touch' || motion.matches) return; pointer.x = event.clientX / window.innerWidth * 2 - 1; pointer.y = event.clientY / window.innerHeight * 2 - 1; };
        const reset = () => { pointer.x = 0; pointer.y = 0; };
        const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else start(); };
        const preference = () => { cancelAnimationFrame(frame); frame = 0; start(); };
        const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
        const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; if (visible) start(); else { cancelAnimationFrame(frame); frame = 0; } }); observer.observe(canvas);
        window.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', reset);
        document.addEventListener('visibilitychange', visibility); motion.addEventListener('change', preference);
        resize();
        return () => { cancelAnimationFrame(frame); resizeObserver.disconnect(); observer.disconnect(); window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', reset); document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', preference); };
    }, [resolved]);
    return <canvas ref={canvasRef} className="lavender-dot-background" aria-hidden="true" />;
}
