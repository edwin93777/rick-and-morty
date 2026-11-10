import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from './components/Navbar.jsx';
import SearchBar from './components/SearchBar.jsx';
import ActionButtons from './components/ActionButtons.jsx';
import CharacterGrid from './components/CharacterGrid.jsx';
import CharacterModal from './components/CharacterModal.jsx';
import Loading from './components/Loading.jsx';
import ErrorMessage from './components/ErrorMessage.jsx';
import {
  getCharacters,
  getPageByUrl,
  searchCharactersByName,
} from './services/characterService.js';
import PortalBackground from './components/PortalBackground.jsx';
import ScrollBlur from './components/ScrollBlur.jsx';
import { wait } from './utils/wait.js';
import './App.css';
import './styles/effects.css';
import './styles/cards-3d.css';

// Número de tarjetas que se muestran al cargar y en cada "Cargar más".
const CARDS_PER_STEP = 10;

// Duración mínima obligatoria del estado de carga (ms).
const MIN_LOADING_MS = 5000;

const FILTER_LABELS = { all: '', Alive: 'vivos', Dead: 'muertos' };

function App() {
  // ---- Estados principales (useState) ----
  const [characters, setCharacters] = useState([]); // personajes que vienen de la API
  const [loading, setLoading] = useState(true); // carga inicial o búsqueda en curso
  const [error, setError] = useState(null); // { type: 'network' | 'notFound', message }
  const [searchTerm, setSearchTerm] = useState(''); // texto del buscador
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'Alive' | 'Dead'

  // ---- Estados complementarios ----
  const [activeQuery, setActiveQuery] = useState(''); // búsqueda aplicada ('' = listado inicial)
  const [totalCount, setTotalCount] = useState(0); // total de coincidencias en la API
  const [hasMore, setHasMore] = useState(false); // quedan personajes por mostrar
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  // ---- Referencias (useRef) que no necesitan volver a renderizar ----
  const controllerRef = useRef(null); // AbortController de la petición en curso
  const bufferRef = useRef([]); // personajes recibidos pero aún no mostrados
  const nextPageUrlRef = useRef(null); // `info.next` de la API

  /** Cancela la petición anterior y prepara una nueva señal. */
  function startRequest() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller;
  }

  /** Guarda una página nueva: diez tarjetas visibles y el resto en reserva. */
  function applyFirstPage(page) {
    setCharacters(page.results.slice(0, CARDS_PER_STEP));
    bufferRef.current = page.results.slice(CARDS_PER_STEP);
    nextPageUrlRef.current = page.nextPageUrl;
    setTotalCount(page.totalCount);
    setHasMore(bufferRef.current.length > 0 || Boolean(page.nextPageUrl));
  }

  /**
   * Ejecuta una consulta a la API y actualiza los estados de carga y error.
   * `fetchPage` recibe la señal de cancelación y devuelve una página.
   */
  async function loadCharacters(fetchPage) {
    const controller = startRequest();
    setLoading(true);
    setError(null);

    // La carga dura como mínimo MIN_LOADING_MS aunque la API responda antes.
    const minimumWait = wait(MIN_LOADING_MS, controller.signal);
    minimumWait.catch(() => {}); // la cancelación se gestiona abajo

    try {
      const page = await fetchPage(controller.signal);
      await minimumWait;
      applyFirstPage(page);
    } catch (err) {
      if (err.name === 'AbortError') return; // petición sustituida por otra
      try {
        await minimumWait;
      } catch {
        return; // cancelada durante la espera
      }
      setCharacters([]);
      setTotalCount(0);
      setHasMore(false);
      setError({ type: err.isNotFound ? 'notFound' : 'network', message: err.message });
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  }

  // ---- Petición inicial (useEffect) ----
  // Se ejecuta una sola vez al montar App. La limpieza cancela la petición
  // si el componente se desmonta antes de recibir la respuesta.
  useEffect(() => {
    loadCharacters((signal) => getCharacters({ signal }));
    return () => controllerRef.current?.abort();
  }, []);

  // La búsqueda se lanza directamente desde el evento del usuario,
  // no desde un useEffect.
  function handleSearch(name) {
    setActiveQuery(name);
    loadCharacters((signal) => searchCharactersByName(name, { signal }));
  }

  function handleClearSearch() {
    setSearchTerm('');
    setActiveQuery('');
    loadCharacters((signal) => getCharacters({ signal }));
  }

  function handleRetry() {
    if (activeQuery) handleSearch(activeQuery);
    else handleClearSearch();
  }

  /** Muestra diez personajes más (paginación de la API, mejora opcional). */
  async function handleLoadMore() {
    setLoadingMore(true);
    const controller = startRequest();

    try {
      // Si la reserva no alcanza para diez tarjetas, se pide la página siguiente.
      while (bufferRef.current.length < CARDS_PER_STEP && nextPageUrlRef.current) {
        const page = await getPageByUrl(nextPageUrlRef.current, { signal: controller.signal });
        bufferRef.current = [...bufferRef.current, ...page.results];
        nextPageUrlRef.current = page.nextPageUrl;
      }

      const nextCharacters = bufferRef.current.slice(0, CARDS_PER_STEP);
      bufferRef.current = bufferRef.current.slice(CARDS_PER_STEP);

      setCharacters((current) => {
        const knownIds = new Set(current.map((character) => character.id));
        return [...current, ...nextCharacters.filter((character) => !knownIds.has(character.id))];
      });
      setHasMore(bufferRef.current.length > 0 || Boolean(nextPageUrlRef.current));
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError({ type: 'network', message: err.message });
      }
    } finally {
      setLoadingMore(false);
    }
  }

  // ---- Datos derivados (useMemo) ----
  // El filtro se aplica sobre la lista actual, por lo que se combina con la búsqueda.
  const visibleCharacters = useMemo(() => {
    if (activeFilter === 'all') return characters;
    return characters.filter((character) => character.status === activeFilter);
  }, [characters, activeFilter]);

  const counts = useMemo(
    () => ({
      all: characters.length,
      Alive: characters.filter((character) => character.status === 'Alive').length,
      Dead: characters.filter((character) => character.status === 'Dead').length,
    }),
    [characters]
  );

  function renderResults() {
    if (loading) {
      return (
        <Loading
          message={activeQuery ? `Buscando “${activeQuery}”...` : 'Cargando personajes...'}
          duration={MIN_LOADING_MS}
        />
      );
    }

    if (error?.type === 'network') {
      return (
        <ErrorMessage
          title="No se pudo cargar la información"
          message={error.message}
          actionLabel="Intentar de nuevo"
          onAction={handleRetry}
        />
      );
    }

    if (error?.type === 'notFound') {
      return (
        <ErrorMessage
          variant="empty"
          title={`Ningún personaje se llama “${activeQuery}”`}
          message="Revisa la ortografía o prueba con una parte del nombre, por ejemplo “Smith”."
          actionLabel="Volver al listado inicial"
          onAction={handleClearSearch}
        />
      );
    }

    if (visibleCharacters.length === 0) {
      return (
        <ErrorMessage
          variant="empty"
          title={`No hay personajes ${FILTER_LABELS[activeFilter]} en esta lista`}
          message="Elige otro filtro o busca otro nombre."
          actionLabel="Mostrar todos"
          onAction={() => setActiveFilter('all')}
        />
      );
    }

    return (
      <>
        <CharacterGrid characters={visibleCharacters} onSelect={setSelectedCharacter} />
        {hasMore && (
          <div className="load-more">
            <button
              type="button"
              className="button button--ghost"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Cargando...' : 'Cargar 10 personajes más'}
            </button>
          </div>
        )}
      </>
    );
  }

  const showSummary = !loading && !error;

  return (
    <>
      <PortalBackground />
      <Navbar />
      <ScrollBlur />

      <main id="explorar" className="main container">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__portal" aria-hidden="true" />
          <h1 id="hero-title" className="hero__title">
            Encuentra a cualquier personaje del multiverso
          </h1>
          <p className="hero__lead">
            Datos en vivo de Rick and Morty API: busca por nombre y filtra por quién sigue con
            vida.
          </p>
        </section>

        <section className="controls" aria-label="Búsqueda y filtros">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            isSearching={loading && Boolean(activeQuery)}
            activeQuery={activeQuery}
          />
          <ActionButtons
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
            disabled={loading}
          />
        </section>

        <section className="results" aria-labelledby="results-title" aria-busy={loading}>
          <h2 id="results-title" className="visually-hidden">
            Personajes
          </h2>
          {showSummary && (
            <p className="results__summary" aria-live="polite">
              Mostrando <strong>{visibleCharacters.length}</strong>{' '}
              {visibleCharacters.length === 1 ? 'personaje' : 'personajes'}
              {activeFilter !== 'all' && ` ${FILTER_LABELS[activeFilter]}`} de{' '}
              {totalCount} {activeQuery ? 'coincidencias' : 'en total'}
            </p>
          )}
          {renderResults()}
        </section>
      </main>

      <footer className="footer container">
        <p>
          Información e imágenes de{' '}
          <a href="https://rickandmortyapi.com" target="_blank" rel="noreferrer">
            rickandmortyapi.com
          </a>
          . Proyecto académico con React y Vite.
        </p>
      </footer>

      <CharacterModal
        character={selectedCharacter}
        onClose={() => setSelectedCharacter(null)}
      />
    </>
  );
}

export default App;
