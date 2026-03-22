/**
 * Particle burst overlay when switching between project sections.
 * Uses DOM elements (not canvas) for reliable React compatibility.
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PROJECT_PATHS = ['/strategy/', '/canvas/', '/todo/', '/timeline/', '/calendar/', '/strab/'];

function isProjectSection(path: string): boolean {
  return PROJECT_PATHS.some(p => path.startsWith(p) && path.length > p.length);
}

export default function ParticleTransition() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; angle: number; speed: number }>>([]);

  useEffect(() => {
    const curr = location.pathname;
    const prev = prevPathRef.current;
    prevPathRef.current = curr;

    const currIsProject = isProjectSection(curr);
    const prevIsProject = isProjectSection(prev);

    if (currIsProject && prevIsProject && curr !== prev) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const count = 60;
      const newParticles: Array<{ id: number; x: number; y: number; angle: number; speed: number }> = [];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
        const speed = 6 + Math.random() * 12;
        newParticles.push({ id: i, x: centerX, y: centerY, angle, speed });
      }
      setParticles(newParticles);
      const t = setTimeout(() => setParticles([]), 900);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  const showOverlay = particles.length > 0 || isProjectSection(location.pathname);
  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2147483647 }}>
      {particles.map((p) => (
        <ParticleDot key={p.id} initialX={p.x} initialY={p.y} angle={p.angle} speed={p.speed} />
      ))}
    </div>
  );
}

function ParticleDot({ initialX, initialY, angle, speed }: { initialX: number; initialY: number; angle: number; speed: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    let x = 0;
    let y = 0;
    let vyCurrent = vy;
    let frame = 0;
    const maxFrames = 40;

    const animate = () => {
      frame++;
      x += vx * 0.96;
      y += vyCurrent;
      vyCurrent += 0.2;
      const progress = frame / maxFrames;
      const opacity = Math.max(0, 1 - progress * 1.2);
      if (el) {
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.style.opacity = String(opacity);
      }
      if (frame < maxFrames) requestAnimationFrame(animate);
    };
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [initialX, initialY, angle, speed]);

  return (
    <div
      ref={ref}
      className="absolute w-3 h-3 rounded-full -ml-1.5 -mt-1.5"
      style={{
        left: initialX,
        top: initialY,
        background: 'rgba(249, 115, 22, 0.95)',
        boxShadow: '0 0 12px 2px rgba(249,115,22,0.8)',
      }}
    />
  );
}
