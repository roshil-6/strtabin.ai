/**
 * Particle burst overlay when switching between project sections (Writing, Tasks, Timeline, Calendar, STRAB).
 * Works on both desktop and mobile.
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';

const PROJECT_PATHS = ['/strategy/', '/canvas/', '/todo/', '/timeline/', '/calendar/', '/strab/'];

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
  const animRef = useRef<number>(0);

  useEffect(() => {
    const curr = location.pathname;
    const prev = prevPathRef.current;
    prevPathRef.current = curr;

    const currIsProject = isProjectSection(curr);
    const prevIsProject = isProjectSection(prev);

    if (currIsProject && prevIsProject && curr !== prev) {
      setActive(true);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const centerX = w / 2;
      const centerY = h / 2;
      const count = 80;
      const particles: Particle[] = [];
      const colors = [
        'rgba(249, 115, 22, 0.95)',
        'rgba(249, 115, 22, 0.7)',
        'rgba(255, 255, 255, 0.85)',
        'rgba(255, 255, 255, 0.6)',
      ];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
        const speed = 4 + Math.random() * 10;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 50 + Math.random() * 40,
          size: 2.5 + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      particlesRef.current = particles;

      const startAnim = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = w;
        canvas.height = h;

        const animate = () => {
          if (particlesRef.current.length === 0) {
            setActive(false);
            return;
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          let alive = 0;
          for (const p of particlesRef.current) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life += 1;
            if (p.life < p.maxLife) {
              alive++;
              const alpha = 1 - (p.life / p.maxLife) * (p.life / p.maxLife);
              ctx.globalAlpha = alpha;
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
          if (alive > 0) {
            animRef.current = requestAnimationFrame(animate);
          } else {
            setActive(false);
          }
        };
        animRef.current = requestAnimationFrame(animate);
      };
      requestAnimationFrame(startAnim);
      return () => cancelAnimationFrame(animRef.current);
    }
  }, [location.pathname]);

  const showCanvas = active || isProjectSection(location.pathname);
  if (!showCanvas) return null;

  const canvasEl = (
    <canvas
      ref={canvasRef}
      width={typeof window !== 'undefined' ? window.innerWidth : 800}
      height={typeof window !== 'undefined' ? window.innerHeight : 600}
      className="fixed inset-0 pointer-events-none"
      style={{
        width: '100vw',
        height: '100vh',
        left: 0,
        top: 0,
        opacity: active ? 1 : 0,
        zIndex: 2147483647,
      }}
    />
  );

  return typeof document !== 'undefined'
    ? createPortal(canvasEl, document.body)
    : null;
}
