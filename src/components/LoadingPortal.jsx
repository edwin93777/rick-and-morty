import { useId } from 'react';

/** Contorno irregular ("viscoso") del portal: círculo deformado con varias ondas. */
function blobPath(radius, waves) {
  const steps = 96;
  let d = '';
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const wobble = waves.reduce(
      (sum, [frequency, amplitude, phase]) => sum + amplitude * Math.sin(frequency * angle + phase),
      0
    );
    const r = radius * (1 + wobble);
    d += `${i ? 'L' : 'M'}${(Math.cos(angle) * r).toFixed(2)} ${(Math.sin(angle) * r).toFixed(2)}`;
  }
  return `${d}Z`;
}

/** Brazo de espiral relleno y afilado en las puntas, como los remolinos del portal. */
function spiralBlade(index, arms, { turns, inner, outer, width, twist = 0 }) {
  const steps = 40;
  const forward = [];
  const backward = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = (index / arms) * Math.PI * 2 + twist + t * turns * Math.PI * 2;
    const r = inner + t * (outer - inner);
    const half = width * Math.sin(Math.PI * t) ** 0.8; // grosor: 0 en las puntas
    forward.push(`${(Math.cos(angle + half) * r).toFixed(2)} ${(Math.sin(angle + half) * r).toFixed(2)}`);
    backward.push(`${(Math.cos(angle - half) * r).toFixed(2)} ${(Math.sin(angle - half) * r).toFixed(2)}`);
  }
  return `M${forward.join('L')}L${backward.reverse().join('L')}Z`;
}

const BLOB_BACK = blobPath(43, [
  [3, 0.045, 0.4],
  [5, 0.035, 1.9],
  [9, 0.02, 0.2],
]);
const BLOB_FRONT = blobPath(40, [
  [4, 0.04, 2.1],
  [7, 0.03, 0.7],
  [11, 0.018, 3.0],
]);

const DARK_BLADES = Array.from({ length: 3 }, (_, i) =>
  spiralBlade(i, 3, { turns: 0.8, inner: 7, outer: 39, width: 0.34 })
);
const MID_BLADES = Array.from({ length: 3 }, (_, i) =>
  spiralBlade(i, 3, { turns: 0.85, inner: 5, outer: 35, width: 0.26, twist: Math.PI / 3 })
);
const LIGHT_BLADES = Array.from({ length: 4 }, (_, i) =>
  spiralBlade(i, 4, { turns: 0.9, inner: 3, outer: 27, width: 0.2, twist: 0.5 })
);

// Gotas que salen despedidas del portal (variables CSS de cada una).
const DROPS = [
  { '--a': '12deg', '--d': 0.62, '--z': '26px', '--dur': '1.9s', '--delay': '-0.2s', '--s': '7px' },
  { '--a': '74deg', '--d': 0.7, '--z': '-18px', '--dur': '2.4s', '--delay': '-1.1s', '--s': '5px' },
  { '--a': '131deg', '--d': 0.58, '--z': '34px', '--dur': '2.1s', '--delay': '-0.7s', '--s': '6px' },
  { '--a': '188deg', '--d': 0.72, '--z': '8px', '--dur': '2.7s', '--delay': '-1.9s', '--s': '4px' },
  { '--a': '236deg', '--d': 0.6, '--z': '-26px', '--dur': '2.2s', '--delay': '-0.4s', '--s': '8px' },
  { '--a': '287deg', '--d': 0.68, '--z': '30px', '--dur': '2.5s', '--delay': '-1.5s', '--s': '5px' },
  { '--a': '331deg', '--d': 0.64, '--z': '-8px', '--dur': '2s', '--delay': '-0.9s', '--s': '6px' },
];

/**
 * Portal de carga en 3D: capas SVG a distinta profundidad (translateZ) dentro
 * de un plano que se balancea con perspectiva. Borde viscoso que se deforma,
 * remolinos en tres tonos, núcleo pulsante y gotas despedidas.
 */
function LoadingPortal() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const discId = `loading-disc-${uid}`;

  return (
    <span className="loading-portal" aria-hidden="true">
      <span className="loading-portal__tilt">
        <span className="loading-portal__halo" />

        <svg className="loading-portal__layer loading-portal__layer--blob-back" viewBox="-50 -50 100 100">
          <path d={BLOB_BACK} fill="#1f8f33" />
        </svg>

        <svg className="loading-portal__layer loading-portal__layer--blob-front" viewBox="-50 -50 100 100">
          <path d={BLOB_FRONT} fill="#5fd83c" />
        </svg>

        <svg className="loading-portal__layer loading-portal__layer--disc" viewBox="-50 -50 100 100">
          <defs>
            <radialGradient id={discId}>
              <stop offset="0" stopColor="#fbffc4" />
              <stop offset="0.35" stopColor="#dff766" />
              <stop offset="0.7" stopColor="#8fe04a" />
              <stop offset="1" stopColor="#5fd83c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle r="37" fill={`url(#${discId})`} />
        </svg>

        <svg className="loading-portal__layer loading-portal__layer--dark" viewBox="-50 -50 100 100">
          {DARK_BLADES.map((d) => (
            <path key={d} d={d} fill="#1b7f2e" fillOpacity="0.9" />
          ))}
        </svg>

        <svg className="loading-portal__layer loading-portal__layer--mid" viewBox="-50 -50 100 100">
          {MID_BLADES.map((d) => (
            <path key={d} d={d} fill="#b6f04f" />
          ))}
        </svg>

        <svg className="loading-portal__layer loading-portal__layer--light" viewBox="-50 -50 100 100">
          {LIGHT_BLADES.map((d) => (
            <path key={d} d={d} fill="#f4ff9c" />
          ))}
        </svg>

        <span className="loading-portal__core" />

        <span className="loading-portal__drops">
          {DROPS.map((style) => (
            <span key={style['--a']} className="loading-portal__drop" style={style} />
          ))}
        </span>
      </span>
    </span>
  );
}

export default LoadingPortal;
