import { useEffect, useRef } from 'react';
import { useTheme } from '../context/useTheme';
import './LavenderDotBackground.css';

/** Decorative particle dot-grid field beneath project cards; never intercepts input or enters the accessibility tree. */
export default function LavenderDotBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { resolved } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;

        // Pre-render a soft glowing dot sprite for crisp, high-DPI particle rendering
        const bead = document.createElement('canvas');
        bead.width = 32;
        bead.height = 32;
        const beadContext = bead.getContext('2d');
        if (!beadContext) return;

        const finish = beadContext.createRadialGradient(16, 16, 0.5, 16, 16, 14);
        if (resolved === 'light') {
            finish.addColorStop(0, 'rgba(133, 23, 204, 0.95)');
            finish.addColorStop(0.35, 'rgba(133, 23, 204, 0.55)');
            finish.addColorStop(0.7, 'rgba(133, 23, 204, 0.16)');
            finish.addColorStop(1, 'rgba(133, 23, 204, 0)');
        } else {
            finish.addColorStop(0, 'rgba(216, 192, 255, 1)');
            finish.addColorStop(0.3, 'rgba(178, 153, 246, 0.85)');
            finish.addColorStop(0.65, 'rgba(142, 98, 235, 0.28)');
            finish.addColorStop(1, 'rgba(142, 98, 235, 0)');
        }
        beadContext.fillStyle = finish;
        beadContext.beginPath();
        beadContext.arc(16, 16, 14, 0, Math.PI * 2);
        beadContext.fill();

        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const pointer = { x: -9999, y: -9999 };
        let phase = 0;
        let frame = 0;
        let last = 0;
        let width = 1;
        let height = 1;
        let visible = true;

        const spacing = 24;

        function draw(now: number) {
            frame = 0;
            if (document.hidden || !visible) return;
            if (!motion.matches && now - last < 36) {
                frame = requestAnimationFrame(draw);
                return;
            }
            const elapsed = last ? Math.min(now - last, 64) : 32;
            last = now;
            if (!motion.matches) {
                phase += elapsed * 0.00045;
            }

            context!.clearRect(0, 0, width, height);

            const cols = Math.ceil(width / spacing) + 1;
            const rows = Math.ceil(height / spacing) + 1;

            for (let r = 0; r < rows; r++) {
                const y = r * spacing + 12;
                const vNorm = y / Math.max(height, 1);
                // Stronger presence under the project cards and lower canvas area
                const verticalWeight = 0.28 + 0.72 * Math.pow(Math.min(1, Math.max(0, (vNorm - 0.08) / 0.82)), 0.85);

                for (let c = 0; c < cols; c++) {
                    const x = c * spacing + 12;
                    const uNorm = x / Math.max(width, 1);

                    const wave =
                        0.5 +
                        0.32 * Math.sin(uNorm * 5.2 + vNorm * 3.6 - phase * 2.1) +
                        0.18 * Math.cos(uNorm * 3.4 - vNorm * 4.8 + phase * 1.4);

                    let proximityBoost = 0;
                    if (pointer.x > -1000) {
                        const dx = x - pointer.x;
                        const dy = y - pointer.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < 48400) {
                            proximityBoost = (1 - Math.sqrt(distSq) / 220) * 0.45;
                        }
                    }

                    const baseAlpha = resolved === 'light' ? 0.22 : 0.36;
                    const alpha = Math.min(
                        0.88,
                        Math.max(0.06, (baseAlpha * (0.45 + 0.55 * wave) + proximityBoost) * verticalWeight)
                    );
                    const radius = 2.1 + (wave * 0.65 + proximityBoost * 1.3);

                    context!.globalAlpha = alpha;
                    context!.drawImage(bead, x - radius, y - radius, radius * 2, radius * 2);
                }
            }

            context!.globalAlpha = 1;
            if (!motion.matches) {
                frame = requestAnimationFrame(draw);
            }
        }

        function start() {
            if (!frame && visible && !document.hidden) {
                last = 0;
                frame = requestAnimationFrame(draw);
            }
        }

        function resize() {
            const bounds = canvas!.getBoundingClientRect();
            width = Math.max(1, bounds.width);
            height = Math.max(1, bounds.height);
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas!.width = Math.round(width * ratio);
            canvas!.height = Math.round(height * ratio);
            context!.setTransform(ratio, 0, 0, ratio, 0, 0);
            last = 0;
            draw(performance.now());
            start();
        }

        const move = (event: PointerEvent) => {
            if (event.pointerType === 'touch' || motion.matches) return;
            const bounds = canvas!.getBoundingClientRect();
            pointer.x = event.clientX - bounds.left;
            pointer.y = event.clientY - bounds.top;
        };
        const reset = () => {
            pointer.x = -9999;
            pointer.y = -9999;
        };
        const visibility = () => {
            if (document.hidden) {
                cancelAnimationFrame(frame);
                frame = 0;
            } else {
                start();
            }
        };
        const preference = () => {
            cancelAnimationFrame(frame);
            frame = 0;
            last = 0;
            draw(performance.now());
            start();
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
        const observer = new IntersectionObserver(entries => {
            visible = entries[0]?.isIntersecting ?? false;
            if (visible) start();
            else {
                cancelAnimationFrame(frame);
                frame = 0;
            }
        });
        observer.observe(canvas);

        window.addEventListener('pointermove', move, { passive: true });
        document.addEventListener('pointerleave', reset);
        document.addEventListener('visibilitychange', visibility);
        motion.addEventListener('change', preference);
        resize();

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            observer.disconnect();
            window.removeEventListener('pointermove', move);
            document.removeEventListener('pointerleave', reset);
            document.removeEventListener('visibilitychange', visibility);
            motion.removeEventListener('change', preference);
        };
    }, [resolved]);

    return <canvas ref={canvasRef} className="lavender-dot-background" aria-hidden="true" />;
}
