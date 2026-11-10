import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Store de scroll compartido.
 *
 * Un único listener pasivo de `scroll` (más `resize` y un ResizeObserver para
 * cuando cambia la altura del contenido, p. ej. al "Cargar más") agenda una
 * medición por frame con requestAnimationFrame. Los componentes se suscriben y
 * escriben estilos directamente en el DOM (transform / opacity / variables CSS),
 * así que el scroll nunca provoca renders de React.
 */
const listeners = new Set();
const state = { y: 0, progress: 0, direction: 'none', velocity: 0 };

let frame = 0;
let lastY = 0;
let resizeObserver = null;

function measure() {
  frame = 0;
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;

  state.velocity = y - lastY;
  if (y > lastY) state.direction = 'down';
  else if (y < lastY) state.direction = 'up';
  lastY = y;

  state.y = y;
  state.progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

  listeners.forEach((listener) => listener(state));
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(measure);
}

function start() {
  lastY = window.scrollY;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(document.body);
}

function stop() {
  window.removeEventListener('scroll', schedule);
  window.removeEventListener('resize', schedule);
  resizeObserver?.disconnect();
  resizeObserver = null;
  cancelAnimationFrame(frame);
  frame = 0;
}

export function subscribeScroll(listener) {
  if (listeners.size === 0) start();
  listeners.add(listener);
  schedule(); // primera medición para pintar el estado inicial
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

/** Ejecuta `callback(state)` una vez por frame mientras haya scroll o cambios de tamaño. */
export function useScrollFrame(callback) {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => subscribeScroll((current) => callbackRef.current(current)), []);
}

const reducedMotionQuery =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

export function prefersReducedMotion() {
  return reducedMotionQuery?.matches ?? false;
}
