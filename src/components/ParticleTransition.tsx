/**
 * Particle burst overlay when switching between project sections (Writing, Tasks, Timeline, Calendar, STRAB).
 * Works on both desktop and mobile.
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PROJECT_PATHS = ['/strategy/', '/todo/', '/timeline/', '/calendar/', '/strab/'];

function isProjectSection(path: string): boolean {
  return PROJECT_PATHS.some(p => path.startsWith(p) && path.length > p.length);
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export default function ParticleTransition() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const curr = location.pathname;
    const prev = prevPathRef.current;
    prevPathRef.current = curr;

    const currIsProject = isProjectSection(curr);
    const prevIsProject = isProjectSection(prev);

    if (currIsProject && prevIsProject && curr !== prev) {
      setActive(true);
      const run = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const count = 50;
        const particles: Particle[] = [];

        const colors = [
        'rgba(249, 115, 22, 0.8)',  // primary orange
        'rgba(249, 115, 22, 0.5)',
        'rgba(255, 255, 255, 0.6)',
        'rgba(255, 255, 255, 0.4)',
        ];

        for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 2 + Math.random() * 6;
          particles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            maxLife: 30 + Math.random() * 25,
            size: 1.5 + Math.random() * 2,
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }

        particlesRef.current = particles;

        const animate = () => {
          const ctx = canvas.getContext('2d');
          if (!ctx || particlesRef.current.length === 0) {
            setActive(false);
            return;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          let alive = 0;
          for (const p of particlesRef.current) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life += 1;

            if (p.life < p.maxLife) {
              alive++;
              const alpha = 1 - p.life / p.maxLife;
              ctx.globalAlpha = alpha;
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;

          if (alive > 0) {
            frameRef.current = requestAnimationFrame(animate);
          } else {
            setActive(false);
          }
        };

        frameRef.current = requestAnimationFrame(animate);
      };
      requestAnimationFrame(run);
      return () => cancelAnimationFrame(frameRef.current);
    }
  }, [location.pathname]);

  const showCanvas = active || isProjectSection(location.pathname);
  if (!showCanvas) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ width: '100%', height: '100%', opacity: active ? 1 : 0 }}
    />
  );
}
