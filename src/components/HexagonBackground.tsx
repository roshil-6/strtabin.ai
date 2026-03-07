import { useEffect, useRef } from 'react';

export default function HexagonBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', resize);
        resize();

        const hexSize = 40;
        const hexHeight = hexSize * 2;
        const hexWidth = Math.sqrt(3) * hexSize;
        const vertDist = hexHeight * 0.75;
        const horizDist = hexWidth;

        const drawHexagon = (x: number, y: number, opacity: number) => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + Math.PI / 6;
                const hX = x + hexSize * Math.cos(angle);
                const hY = y + hexSize * Math.sin(angle);
                if (i === 0) ctx.moveTo(hX, hY);
                else ctx.lineTo(hX, hY);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(218, 119, 86, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        };

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            const cols = Math.ceil(width / horizDist) + 1;
            const rows = Math.ceil(height / vertDist) + 1;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    let x = c * horizDist;
                    const y = r * vertDist;
                    if (r % 2 === 1) x += horizDist / 2;

                    const dx = x - mouseRef.current.x;
                    const dy = y - mouseRef.current.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    const maxDist = 250;
                    let opacity = 0.03;

                    if (dist < maxDist) {
                        const effect = 1 - dist / maxDist;
                        opacity = 0.03 + 0.15 * effect;
                    }

                    drawHexagon(x, y, opacity);
                }
            }
            animationFrameId = requestAnimationFrame(render);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches[0]) {
                mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);

        render();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" />;
}
