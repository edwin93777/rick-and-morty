import { useState } from 'react';
import { getGenderLabel, getStatusClass, getStatusLabel, orUnknown } from '../utils/labels.js';

function CharacterCard({ character, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { name, status, species, type, gender, origin, location, image } = character;

  return (
    <article className={`card ${getStatusClass(status)}`}>
      <div className="card__media">
        {imageFailed || !image ? (
          <div className="card__fallback" role="img" aria-label={`Imagen no disponible de ${name}`}>
            {name?.charAt(0) ?? '?'}
          </div>
        ) : (
          <img
            src={image}
            alt={`Retrato de ${name}`}
            loading="lazy"
            width="300"
            height="300"
            onError={() => setImageFailed(true)}
          />
        )}
        <span className="card__status">
          <span className="status-dot" aria-hidden="true" />
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="card__body">
        <h3 className="card__name">{name}</h3>
        <p className="card__species">
          {orUnknown(species)}
          {type ? ` · ${type}` : ''}
        </p>

        <dl className="card__facts">
          <div>
            <dt>Género</dt>
            <dd>{getGenderLabel(gender)}</dd>
          </div>
          <div>
            <dt>Origen</dt>
            <dd>{orUnknown(origin?.name)}</dd>
          </div>
          <div>
            <dt>Ubicación actual</dt>
            <dd>{orUnknown(location?.name)}</dd>
          </div>
        </dl>

        <button type="button" className="card__more" onClick={() => onSelect(character)}>
          Ver detalles<span className="visually-hidden"> de {name}</span>
        </button>
      </div>
    </article>
  );
}

export default CharacterCard;
