import { useId } from 'react';
import { spiralArm } from '../utils/spiral.js';

const CENTER = { cx: 32, cy: 32 };

const LIGHT_ARMS = Array.from({ length: 4 }, (_, i) =>
  spiralArm(i, 4, { ...CENTER, turns: 0.9, radius: 23, inner: 3 })
);
const DARK_ARMS = Array.from({ length: 4 }, (_, i) =>
  spiralArm(i, 4, { ...CENTER, turns: 0.9, radius: 22, inner: 5, twist: Math.PI / 4 })
);

// Gotas que salpican alrededor del portal: [cx, cy, r]
const DROPS = [
  [7, 14, 1.8],
  [58, 20, 1.4],
  [54, 55, 2],
  [10, 50, 1.3],
  [33, 2.5, 1.2],
];

/** Logo: portal con espiral giratoria, borde irregular y núcleo pulsante. */
function PortalLogo({ className = '' }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const discId = `logo-disc-${uid}`;
  const coreId = `logo-core-${uid}`;

  return (
    <svg
      className={`portal-logo ${className}`}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={discId}>
          <stop offset="0" stopColor="#f6ffd9" />
          <stop offset="0.3" stopColor="#c4f56f" />
          <stop offset="0.62" stopColor="#6fbf3a" />
          <stop offset="0.88" stopColor="#1f7a33" />
          <stop offset="1" stopColor="#0c3d1c" />
        </radialGradient>
        <radialGradient id={coreId}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#eaffb8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#c4f56f" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="portal-logo__drops" fill="#97ce4c">
        {DROPS.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>

      <circle cx="32" cy="32" r="26" fill={`url(#${discId})`} />

      <g className="portal-logo__swirl" fill="none" strokeLinecap="round">
        {DARK_ARMS.map((d) => (
          <path key={d} d={d} stroke="#17692c" strokeWidth="2.4" strokeOpacity="0.7" />
        ))}
        {LIGHT_ARMS.map((d) => (
          <path key={d} d={d} stroke="#f1ffd0" strokeWidth="1.9" strokeOpacity="0.9" />
        ))}
      </g>

      {/* Borde irregular: dos trazos discontinuos que giran en sentidos opuestos */}
      <circle
        className="portal-logo__rim"
        cx="32"
        cy="32"
        r="26.5"
        fill="none"
        stroke="#d6ff8a"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="11 5 4 6 15 4"
      />
      <circle
        className="portal-logo__rim portal-logo__rim--outer"
        cx="32"
        cy="32"
        r="29.5"
        fill="none"
        stroke="#00ff41"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeOpacity="0.75"
        strokeDasharray="3 9 7 12"
      />

      <circle className="portal-logo__core" cx="32" cy="32" r="9" fill={`url(#${coreId})`} />
    </svg>
  );
}

export default PortalLogo;
