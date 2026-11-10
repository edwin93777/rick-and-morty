import { useEffect, useRef } from 'react';
import { prefersReducedMotion, useScrollFrame } from '../hooks/useScrollFrame.js';

// Distancia (px) a partir de la cual el blur alcanza su intensidad máxima.
const FULL_AT = 220;
// Al subir, el blur se reduce a esta fracción del máximo.
const UP_FACTOR = 0.25;
// Suavizado exponencial por frame (0-1): más alto = más rápido.
const EASE = 0.1;

/**
 * Capa fija bajo el header con varias capas de `backdrop-filter` enmascaradas
 * en degradado: el blur es máximo pegado al header y se desvanece hacia el
 * centro de la pantalla. La intensidad (variable --fx, aplicada como opacity)
 * sube al hacer scroll hacia abajo y baja suavemente al subir.
 */
function ScrollBlur() {
  const rootRef = useRef(null);
  const anim = useRef({ current: 0, target: 0, raf: 0 });

  function paint(value) {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty('--fx', value.toFixed(3));
    el.style.visibility = value < 0.005 ? 'hidden' : 'visible';
  }

  function tick() {
    const a = anim.current;
    a.current += (a.target - a.current) * EASE;
    if (Math.abs(a.target - a.current) < 0.002) {
      a.current = a.target;
      a.raf = 0;
    } else {
      a.raf = requestAnimationFrame(tick);
    }
    paint(a.current);
  }

  useScrollFrame(({ y, direction }) => {
    const a = anim.current;
    const depth = Math.min(1, y / FULL_AT);
    a.target = depth * (direction === 'up' ? UP_FACTOR : 1);

    if (prefersReducedMotion()) {
      a.current = a.target;
      paint(a.current);
      return;
    }
    if (!a.raf) a.raf = requestAnimationFrame(tick);
  });

  useEffect(() => () => cancelAnimationFrame(anim.current.raf), []);

  return (
    <div ref={rootRef} className="scroll-blur" aria-hidden="true">
      <div className="scroll-blur__layer" />
      <div className="scroll-blur__layer" />
      <div className="scroll-blur__layer" />
      <div className="scroll-blur__layer" />
      <div className="scroll-blur__tint" />
    </div>
  );
}

export default ScrollBlur;
