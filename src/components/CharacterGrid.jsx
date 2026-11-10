import { useEffect, useRef } from 'react';
import CharacterCard from './CharacterCard.jsx';
import { prefersReducedMotion } from '../hooks/useScrollFrame.js';

// Inclinación máxima de la tarjeta (grados) al seguir el puntero.
const MAX_TILT_X = 11;
const MAX_TILT_Y = 14;

const TILT_PROPS = ['--rx', '--ry', '--mx', '--my'];

function CharacterGrid({ characters, onSelect }) {
  const activeCard = useRef(null);
  const frame = useRef(0);

  function resetCard(card) {
    card.classList.remove('is-tilting');
    TILT_PROPS.forEach((prop) => card.style.removeProperty(prop));
  }

  function clearActive() {
    cancelAnimationFrame(frame.current);
    if (activeCard.current) resetCard(activeCard.current);
    activeCard.current = null;
  }

  // Efecto 3D: un único listener delegado en la lista; la tarjeta bajo el
  // puntero rota según su posición (solo variables CSS, sin re-render).
  function handlePointerMove(event) {
    if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;

    const card = event.target.closest('.card');
    if (card !== activeCard.current) {
      clearActive();
      activeCard.current = card;
    }
    if (!card) return;

    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      // Se mide el <li> (sin rotar) para que el cálculo sea estable.
      const rect = card.parentElement.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const py = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));

      card.style.setProperty('--ry', `${((px - 0.5) * 2 * MAX_TILT_Y).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${((0.5 - py) * 2 * MAX_TILT_X).toFixed(2)}deg`);
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      card.classList.add('is-tilting');
    });
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  if (characters.length === 0) return null;

  return (
    <ul className="grid" onPointerMove={handlePointerMove} onPointerLeave={clearActive}>
      {characters.map((character) => (
        <li key={character.id} className="grid__item">
          <CharacterCard character={character} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}

export default CharacterGrid;
