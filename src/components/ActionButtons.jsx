// Configuración de los tres botones de acción. `value` coincide con el
// atributo `status` de la API; `all` significa que no se filtra.
export const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'Alive', label: 'Vivos' },
  { value: 'Dead', label: 'Muertos' },
];

function ActionButtons({ activeFilter, onFilterChange, counts, disabled }) {
  return (
    <div className="filters" role="group" aria-label="Filtrar por estado">
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.value;

        return (
          <button
            key={filter.value}
            type="button"
            className={`filter filter--${filter.value.toLowerCase()}${isActive ? ' is-active' : ''}`}
            aria-pressed={isActive}
            onClick={() => onFilterChange(filter.value)}
            disabled={disabled}
          >
            <span className="filter__label">{filter.label}</span>
            <span className="filter__count" aria-label={`${counts[filter.value]} personajes`}>
              {counts[filter.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ActionButtons;
