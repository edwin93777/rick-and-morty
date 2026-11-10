import { useEffect, useRef } from 'react';
import PortalLogo from './PortalLogo.jsx';
import { useScrollFrame } from '../hooks/useScrollFrame.js';

const API_DOCS_URL = 'https://rickandmortyapi.com/documentation';
const RING_LENGTH = 2 * Math.PI * 7; // circunferencia del anillo (r = 7)

function Navbar() {
  const headerRef = useRef(null);
  const barRef = useRef(null);
  const ringRef = useRef(null);
  const percentRef = useRef(null);
  const lastPercent = useRef(-1);

  // Altura real del header -> variable CSS para colocar la capa de blur justo debajo.
  useEffect(() => {
    const header = headerRef.current;
    const observer = new ResizeObserver(([entry]) => {
      const height = Math.round(entry.borderBoxSize?.[0]?.blockSize ?? header.offsetHeight);
      document.documentElement.style.setProperty('--header-h', `${height}px`);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // Barra + porcentaje: se escriben directamente en el DOM, sin re-render.
  useScrollFrame(({ y, progress }) => {
    barRef.current.style.transform = `scaleX(${progress})`;
    ringRef.current.style.strokeDashoffset = String(RING_LENGTH * (1 - progress));

    const percent = Math.round(progress * 100);
    if (percent !== lastPercent.current) {
      lastPercent.current = percent;
      percentRef.current.textContent = `${percent}%`;
    }

    const scrolled = y > 8 ? 'true' : 'false';
    if (headerRef.current.dataset.scrolled !== scrolled) {
      headerRef.current.dataset.scrolled = scrolled;
    }
  });

  return (
    <header ref={headerRef} className="navbar" data-scrolled="false">
      <nav className="navbar__inner container" aria-label="Navegación principal">
        <a className="navbar__brand" href="#explorar">
          <span className="navbar__logo" aria-hidden="true">
            <PortalLogo />
          </span>
          <span className="navbar__name">
            Rick and Morty
            <span className="navbar__subtitle">Explorador de personajes</span>
          </span>
        </a>

        <div className="navbar__right">
          <ul className="navbar__links">
            <li>
              <a href="#explorar">Explorar</a>
            </li>
            <li>
              <a href={API_DOCS_URL} target="_blank" rel="noreferrer">
                <span className="navbar__hide-sm">Documentación de la </span>API
              </a>
            </li>
          </ul>

          <div className="navbar__progress" aria-hidden="true">
            <svg className="navbar__ring" viewBox="0 0 18 18" width="18" height="18">
              <circle className="navbar__ring-track" cx="9" cy="9" r="7" />
              <circle
                ref={ringRef}
                className="navbar__ring-value"
                cx="9"
                cy="9"
                r="7"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH}
              />
            </svg>
            <span ref={percentRef} className="navbar__percent">
              0%
            </span>
          </div>
        </div>
      </nav>

      <div className="navbar__track" aria-hidden="true">
        <span ref={barRef} className="navbar__bar" />
      </div>
    </header>
  );
}

export default Navbar;
