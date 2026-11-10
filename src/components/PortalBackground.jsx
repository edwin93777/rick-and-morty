import { useId, useRef } from 'react';
import { prefersReducedMotion, useScrollFrame } from '../hooks/useScrollFrame.js';
import { spiralArm } from '../utils/spiral.js';

/** PRNG determinista (mulberry32): las partículas son iguales en cada render. */
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BACK_ARMS = Array.from({ length: 7 }, (_, i) => ({
  d: spiralArm(i, 7, { turns: 1.15, radius: 44 }),
  width: 3.2 - (i % 3) * 0.8,
  opacity: 0.45 + (i % 2) * 0.3,
}));

const FRONT_ARMS = Array.from({ length: 5 }, (_, i) => ({
  d: spiralArm(i, 5, { turns: 0.85, radius: 36, twist: 0.5 }),
  width: 1.6 - (i % 2) * 0.5,
  opacity: 0.6 + (i % 3) * 0.15,
}));

const random = seeded(137);
const SPARKS = Array.from({ length: 28 }, () => ({
  '--a': `${(random() * 360).toFixed(1)}deg`,
  '--d': (0.26 + random() * 0.44).toFixed(3),
  '--z': `${((random() - 0.5) * 140).toFixed(0)}px`,
  '--dur': `${(4 + random() * 5).toFixed(2)}s`,
  '--delay': `${(-random() * 9).toFixed(2)}s`,
  '--s': `${(2 + random() * 4).toFixed(1)}px`,
  '--c': random() > 0.65 ? '#00ff41' : '#d4ff9a',
}));

/**
 * Portal 3D de fondo (CSS + SVG, sin dependencias).
 * Capas a distintas profundidades (translateZ) dentro de un plano inclinado con
 * perspectiva: halo, disco, anillo giratorio, dos espirales en contra-rotación,
 * núcleo pulsante y partículas. El parallax se aplica por scroll con transform.
 */
function PortalBackground() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const glowId = `portal-glow-${uid}`;
  const parallaxRef = useRef(null);

  useScrollFrame(({ y, progress }) => {
    const el = parallaxRef.current;
    if (prefersReducedMotion()) {
      el.style.transform = '';
      return;
    }
    const shift = -Math.min(y * 0.12, 220);
    const scale = 1 + progress * 0.12;
    el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
  });

  return (
    <div className="portal-bg" aria-hidden="true">
      <div ref={parallaxRef} className="portal-bg__parallax">
        <div className="portal-bg__scene">
          <div className="portal-bg__tilt">
            <div className="portal-bg__halo" />
            <div className="portal-bg__disc" />
            <div className="portal-bg__rim" />

            <svg className="portal-bg__swirl portal-bg__swirl--back" viewBox="-50 -50 100 100">
              <defs>
                <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="1.1" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g filter={`url(#${glowId})`} fill="none" stroke="#97ce4c" strokeLinecap="round">
                {BACK_ARMS.map((arm) => (
                  <path key={arm.d} d={arm.d} strokeWidth={arm.width} strokeOpacity={arm.opacity} />
                ))}
              </g>
            </svg>

            <svg className="portal-bg__swirl portal-bg__swirl--front" viewBox="-50 -50 100 100">
              <g filter={`url(#${glowId})`} fill="none" stroke="#d9ffb0" strokeLinecap="round">
                {FRONT_ARMS.map((arm) => (
                  <path key={arm.d} d={arm.d} strokeWidth={arm.width} strokeOpacity={arm.opacity} />
                ))}
              </g>
            </svg>

            <div className="portal-bg__core" />

            <div className="portal-bg__sparks">
              {SPARKS.map((style, i) => (
                <span key={i} className="portal-bg__spark" style={style} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortalBackground;
