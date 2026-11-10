function SearchBar({ value, onChange, onSearch, onClear, isSearching, activeQuery }) {
  const isEmpty = value.trim() === '';

  function handleSubmit(event) {
    event.preventDefault();
    // Se evita enviar búsquedas vacías a la API.
    if (isEmpty) return;
    onSearch(value.trim());
  }

  return (
    <form className="search" role="search" onSubmit={handleSubmit}>
      <label className="search__label" htmlFor="character-search">
        Buscar personaje por nombre
      </label>

      <div className="search__row">
        <input
          id="character-search"
          className="search__input"
          type="search"
          placeholder="Ejemplo: Rick, Morty, Birdperson…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          className="button button--primary search__submit"
          type="submit"
          disabled={isEmpty || isSearching}
        >
          {isSearching ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {/* La línea de estado existe siempre para que el panel no cambie de altura. */}
      <p className="search__status">
        {activeQuery ? (
          <>
            <span className="search__query">
              Resultados para <strong>“{activeQuery}”</strong>.
            </span>{' '}
            <button type="button" className="link-button" onClick={onClear}>
              Volver al listado inicial
            </button>
          </>
        ) : (
          'Escribe un nombre y pulsa Buscar o Enter.'
        )}
      </p>
    </form>
  );
}

export default SearchBar;
