import { useEffect, useState } from 'react';
import Portal3D from './Portal3D.jsx';
import { RICK_QUOTES, nextQuoteIndex } from '../utils/rickQuotes.js';

const QUOTE_INTERVAL_MS = 2500;

function Loading({ message = 'Cargando...', duration = 5000 }) {
  const [quoteIndex, setQuoteIndex] = useState(() => nextQuoteIndex());

  // Cambia de frase cada 2,5 s mientras dure la carga.
  useEffect(() => {
    const timer = setInterval(
      () => setQuoteIndex((current) => nextQuoteIndex(current)),
      QUOTE_INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loading" style={{ '--loading-duration': `${duration}ms` }}>
      <Portal3D />

      <p className="loading__text" role="status" aria-live="polite">
        {message}
      </p>

      <div className="loading__bar" aria-hidden="true">
        <span className="loading__bar-fill" />
      </div>

      {/* `key` reinicia la animación de entrada en cada frase */}
      <p key={quoteIndex} className="loading__quote">
        <span className="loading__quote-mark" aria-hidden="true">
          “
        </span>
        {RICK_QUOTES[quoteIndex]}
        <span className="loading__quote-author"> — Rick</span>
      </p>
    </div>
  );
}

export default Loading;
