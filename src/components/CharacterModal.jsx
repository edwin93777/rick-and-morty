import { useEffect, useRef } from 'react';
import { getGenderLabel, getStatusClass, getStatusLabel, orUnknown } from '../utils/labels.js';

const dateFormatter = new Intl.DateTimeFormat('es', { dateStyle: 'long' });

// Modal de detalles (mejora opcional). Usa el elemento nativo <dialog>,
// que ya gestiona el foco y el cierre con la tecla Escape.
function CharacterModal({ character, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (character && dialog && !dialog.open) dialog.showModal();
  }, [character]);

  if (!character) return null;

  const { name, status, species, type, gender, origin, location, image, episode, created } =
    character;

  function handleBackdropClick(event) {
    // Un clic fuera del contenido (en el fondo del diálogo) lo cierra.
    if (event.target === dialogRef.current) dialogRef.current.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${getStatusClass(status)}`}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <div className="modal__content">
        <img className="modal__image" src={image} alt={`Retrato de ${name}`} width="300" height="300" />

        <div className="modal__info">
          <h2 id="modal-title" className="modal__title">{name}</h2>
          <p className="card__status card__status--inline">
            <span className="status-dot" aria-hidden="true" />
            {getStatusLabel(status)}
          </p>

          <dl className="modal__facts">
            <div><dt>Especie</dt><dd>{orUnknown(species)}</dd></div>
            <div><dt>Tipo</dt><dd>{type || 'Sin especificar'}</dd></div>
            <div><dt>Género</dt><dd>{getGenderLabel(gender)}</dd></div>
            <div><dt>Origen</dt><dd>{orUnknown(origin?.name)}</dd></div>
            <div><dt>Ubicación actual</dt><dd>{orUnknown(location?.name)}</dd></div>
            <div><dt>Episodios</dt><dd>Aparece en {episode?.length ?? 0}</dd></div>
            {created && (
              <div><dt>Registrado en la API</dt><dd>{dateFormatter.format(new Date(created))}</dd></div>
            )}
          </dl>

          <button
            type="button"
            className="button button--primary"
            onClick={() => dialogRef.current.close()}
            autoFocus
          >
            Cerrar
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default CharacterModal;
